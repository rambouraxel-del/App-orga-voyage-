import { APP_VERSION, BACKUP_FILE_PREFIX } from '@/config/app'
import { db } from '@/db/database'
import { settingsRepository } from '@/db/repositories'
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SIGNATURE,
  type BackupFile,
  type BackupFileEntry,
} from '@/models'
import { nowIso, toDateSlug } from '@/utils/date'
import { fileExtension } from '@/utils/fileRules'
import { AppError, ERROR_MESSAGES } from './errors'
import { createZip, textToBytes, type ZipEntry } from './zip'

/** Nom du fichier JSON a l'interieur de l'archive. */
export const BACKUP_JSON_NAME = 'sauvegarde.json'
/** Dossier des fichiers dans l'archive. */
export const BACKUP_FILES_DIR = 'documents'

/** Construit l'objet de sauvegarde a partir du contenu actuel de la base. */
export async function buildBackup(): Promise<BackupFile> {
  const [
    events,
    trips,
    reminders,
    documents,
    tasks,
    participants,
    items,
    expenses,
    tripStages,
    tripActivities,
    tripTransports,
    tripStays,
    documentLinks,
    settings,
  ] = await Promise.all([
    db.events.toArray(),
    db.trips.toArray(),
    db.reminders.toArray(),
    db.documents.toArray(),
    db.tasks.toArray(),
    db.participants.toArray(),
    db.items.toArray(),
    db.expenses.toArray(),
    db.tripStages.toArray(),
    db.tripActivities.toArray(),
    db.tripTransports.toArray(),
    db.tripStays.toArray(),
    db.documentLinks.toArray(),
    settingsRepository.get(),
  ])

  return {
    signature: BACKUP_SIGNATURE,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    createdAt: nowIso(),
    data: {
      events,
      trips,
      reminders,
      documents,
      tasks,
      participants,
      items,
      expenses,
      tripStages,
      tripActivities,
      tripTransports,
      tripStays,
      documentLinks,
      settings: {
        displayName: settings.displayName,
        lastBackupAt: settings.lastBackupAt,
        appVersion: settings.appVersion,
        currency: settings.currency,
      },
    },
  }
}

/** `mes-aventures-sauvegarde-2026-07-28.zip` */
export function buildBackupFileName(date: Date = new Date(), extension = 'zip'): string {
  return `${BACKUP_FILE_PREFIX}-${toDateSlug(date)}.${extension}`
}

/**
 * Chemin d'un fichier dans l'archive.
 * On utilise l'identifiant du document, pas son nom d'origine : deux billets
 * peuvent parfaitement s'appeler `billet.pdf`.
 */
export function backupFilePath(documentId: string, fileName: string): string {
  const extension = fileExtension(fileName)
  return `${BACKUP_FILES_DIR}/${documentId}${extension ? `.${extension}` : ''}`
}

export interface ExportResult {
  fileName: string
  /** Nombre total d'enregistrements exportes. */
  itemCount: number
  /** Nombre de fichiers joints inclus dans l'archive. */
  fileCount: number
  /** Taille de l'archive produite, en octets. */
  archiveSize: number
  backedUpAt: string
}

export interface ExportProgress {
  /** Etape en cours, deja lisible par l'utilisateur. */
  step: string
  /** Avancement de 0 a 1, ou `null` si indeterminable. */
  ratio: number | null
}

/**
 * Produit l'archive de sauvegarde et declenche son telechargement.
 *
 * Sur iOS/Safari, `<a download>` avec une URL blob ouvre la feuille de partage
 * (« Enregistrer dans Fichiers »), ce qui est le comportement attendu.
 */
export async function exportBackup(
  onProgress?: (progress: ExportProgress) => void,
): Promise<ExportResult> {
  const report = (step: string, ratio: number | null) => onProgress?.({ step, ratio })

  let backup: BackupFile
  try {
    report('Lecture des donnees…', 0)
    backup = await buildBackup()
  } catch (cause) {
    throw new AppError('EXPORT_FAILED', ERROR_MESSAGES.EXPORT_FAILED, { cause })
  }

  const fileName = buildBackupFileName()
  let url: string | null = null

  try {
    // --- Fichiers joints ---------------------------------------------------
    const documents = backup.data.documents ?? []
    const withFiles = documents.filter((document) => document.size > 0)
    const manifest: BackupFileEntry[] = []
    const zipEntries: ZipEntry[] = []

    for (const [index, document] of withFiles.entries()) {
      report(
        `Ajout des fichiers… (${index + 1}/${withFiles.length})`,
        withFiles.length === 0 ? null : index / withFiles.length,
      )

      const record = await db.documentFiles.get(document.id)
      if (!record?.blob) {
        // Fiche sans fichier retrouvable : on l'exporte quand meme, sans
        // entree de manifeste. L'import signalera le fichier manquant.
        console.warn(`[Mes Aventures] Fichier absent pour le document ${document.id}`)
        continue
      }

      const path = backupFilePath(document.id, document.fileName)
      zipEntries.push({ path, data: new Uint8Array(await record.blob.arrayBuffer()) })
      manifest.push({
        documentId: document.id,
        path,
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.size,
      })
    }

    backup.files = manifest

    report('Creation de l’archive…', 0.9)
    // Le JSON est place en premier : un lecteur peut le trouver sans tout lire.
    const archive = createZip([
      { path: BACKUP_JSON_NAME, data: textToBytes(JSON.stringify(backup, null, 2)) },
      ...zipEntries,
    ])

    // `archive.buffer` : evite l'incompatibilite de typage Uint8Array/BlobPart
    // introduite par les lib DOM recentes.
    const blob = new Blob([archive.buffer as ArrayBuffer], { type: 'application/zip' })
    url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()

    report('Termine', 1)

    const backedUpAt = nowIso()
    try {
      await settingsRepository.markBackedUp(backedUpAt)
    } catch (cause) {
      // L'export a reussi : on ne fait pas echouer l'operation pour autant.
      console.error('[Mes Aventures] Date de sauvegarde non mise a jour', cause)
    }

    return {
      fileName,
      itemCount:
        backup.data.events.length +
        backup.data.trips.length +
        (backup.data.reminders?.length ?? 0) +
        documents.length +
        (backup.data.tasks?.length ?? 0) +
        (backup.data.participants?.length ?? 0) +
        (backup.data.items?.length ?? 0) +
        (backup.data.expenses?.length ?? 0) +
        (backup.data.tripStages?.length ?? 0) +
        (backup.data.tripActivities?.length ?? 0) +
        (backup.data.tripTransports?.length ?? 0) +
        (backup.data.tripStays?.length ?? 0) +
        (backup.data.documentLinks?.length ?? 0),
      fileCount: manifest.length,
      archiveSize: blob.size,
      backedUpAt,
    }
  } catch (cause) {
    throw new AppError('EXPORT_FAILED', ERROR_MESSAGES.EXPORT_FAILED, { cause })
  } finally {
    // Laisse a Safari le temps de recuperer le blob avant de le revoquer.
    if (url) setTimeout(() => URL.revokeObjectURL(url!), 60_000)
  }
}
