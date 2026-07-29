import { APP_VERSION } from '@/config/app'
import { db } from '@/db/database'
import { SETTINGS_KEY, type AppSettings, type BackupFile } from '@/models'
import { nowIso } from '@/utils/date'
import { parseBackupText } from './backupValidation'
import { AppError, ERROR_MESSAGES } from './errors'
import { BACKUP_JSON_NAME } from './exportService'
import { bytesToText, looksLikeZip, readZip, ZipError } from './zip'

/** Fichiers extraits d'une archive, indexes par identifiant de document. */
type ExtractedFiles = Map<string, { blob: Blob; size: number }>

export interface BackupPreview {
  backup: BackupFile
  createdAt: string
  appVersion: string
  /** Vrai si la source etait une archive ZIP (V0.4+). */
  fromArchive: boolean
  counts: {
    events: number
    trips: number
    reminders: number
    documents: number
    tasks: number
    participants: number
    items: number
    expenses: number
    files: number
  }
  /** Documents dont le fichier attendu est absent ou illisible dans l'archive. */
  missingFiles: string[]
  /** Fichiers effectivement extraits, prets a etre ecrits. */
  files: ExtractedFiles
}

export interface ImportResult {
  itemCount: number
  fileCount: number
  missingFiles: string[]
}

/** Lit un fichier selectionne et renvoie son contenu binaire. */
async function readFileBytes(file: File): Promise<Uint8Array> {
  try {
    if (typeof file.arrayBuffer === 'function') {
      return new Uint8Array(await file.arrayBuffer())
    }
    return await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.readAsArrayBuffer(file)
    })
  } catch (cause) {
    throw new AppError('IMPORT_READ', ERROR_MESSAGES.IMPORT_READ, { cause })
  }
}

/**
 * Etape 1 : lecture, extraction et validation, SANS rien ecrire.
 *
 * Accepte indifferemment :
 * - une archive ZIP V0.4 (JSON + dossier `documents/`) ;
 * - un fichier JSON simple V0.1 a V0.3 — les documents n'ont alors pas de
 *   fichier joint, ce qui reste un etat valide.
 */
export async function prepareImport(file: File): Promise<BackupPreview> {
  const bytes = await readFileBytes(file)
  const isArchive = looksLikeZip(bytes)

  let json: string
  const files: ExtractedFiles = new Map()
  /** Contenu de l'archive indexe par chemin. Vide pour un JSON simple. */
  const byPath = new Map<string, Uint8Array>()

  if (isArchive) {
    let entries
    try {
      entries = readZip(bytes)
    } catch (cause) {
      throw new AppError('ZIP_INVALID', ERROR_MESSAGES.ZIP_INVALID, { cause })
    }

    const jsonEntry = entries.find((entry) => entry.path === BACKUP_JSON_NAME)
    if (!jsonEntry) {
      throw new AppError('ZIP_INVALID', ERROR_MESSAGES.ZIP_INVALID, {
        cause: new ZipError(`Entree ${BACKUP_JSON_NAME} absente de l'archive`),
      })
    }
    json = bytesToText(jsonEntry.data)

    // On indexe le contenu de l'archive par chemin pour le rapprocher ensuite
    // du manifeste, plutot que de deviner les noms de fichiers.
    for (const entry of entries) byPath.set(entry.path, entry.data)
  } else {
    json = bytesToText(bytes)
  }

  // Valide la structure. Leve une AppError porteuse d'un message utilisateur.
  const backup = parseBackupText(json)

  const missingFiles: string[] = []
  if (isArchive) {
    const manifest = backup.files ?? []
    const titleById = new Map((backup.data.documents ?? []).map((d) => [d.id, d.title]))

    for (const entry of manifest) {
      const data = byPath.get(entry.path)
      if (!data) {
        missingFiles.push(titleById.get(entry.documentId) ?? entry.fileName)
        continue
      }
      files.set(entry.documentId, {
        // `.buffer` : contourne l'incompatibilite de typage Uint8Array/BlobPart
        // des lib DOM recentes.
        blob: new Blob([data.buffer as ArrayBuffer], {
          type: entry.mimeType || 'application/octet-stream',
        }),
        size: data.length,
      })
    }

    // Un document annonce avec un fichier mais absent du manifeste est
    // signale au lieu d'etre restaure silencieusement sans piece jointe.
    for (const document of backup.data.documents ?? []) {
      if (document.size > 0 && !files.has(document.id)) {
        const alreadyReported = manifest.some((entry) => entry.documentId === document.id)
        if (!alreadyReported) missingFiles.push(document.title)
      }
    }
  }

  return {
    backup,
    createdAt: backup.createdAt,
    appVersion: backup.appVersion,
    fromArchive: isArchive,
    counts: {
      events: backup.data.events.length,
      trips: backup.data.trips.length,
      reminders: backup.data.reminders?.length ?? 0,
      documents: backup.data.documents?.length ?? 0,
      tasks: backup.data.tasks?.length ?? 0,
      participants: backup.data.participants?.length ?? 0,
      items: backup.data.items?.length ?? 0,
      expenses: backup.data.expenses?.length ?? 0,
      files: files.size,
    },
    missingFiles,
    files,
  }
}

/**
 * Etape 2 : remplacement effectif, apres confirmation explicite.
 *
 * Tout se joue dans une transaction unique : en cas d'erreur, IndexedDB annule
 * le vidage des tables et les donnees precedentes restent intactes.
 */
export async function applyImport(preview: BackupPreview): Promise<ImportResult> {
  const { backup, files } = preview
  const {
    events,
    trips,
    reminders = [],
    documents = [],
    tasks = [],
    participants = [],
    items = [],
    expenses = [],
    settings,
  } = backup.data

  // Un document dont le fichier n'a pas ete retrouve garde sa fiche, mais ses
  // metadonnees de fichier sont remises a zero : mieux vaut une fiche
  // explicitement sans piece jointe qu'une fiche qui pretend en avoir une.
  const restoredDocuments = documents.map((document) =>
    document.size > 0 && !files.has(document.id)
      ? { ...document, fileName: '', mimeType: '', size: 0 }
      : document,
  )

  try {
    await db.transaction(
      'rw',
      [
        db.events,
        db.trips,
        db.reminders,
        db.documents,
        db.documentFiles,
        db.tasks,
        db.participants,
        db.items,
        db.expenses,
        db.settings,
      ],
      async () => {
        const previous = await db.settings.get(SETTINGS_KEY)

        await Promise.all([
          db.events.clear(),
          db.trips.clear(),
          db.reminders.clear(),
          db.documents.clear(),
          db.documentFiles.clear(),
          db.tasks.clear(),
          db.participants.clear(),
          db.items.clear(),
          db.expenses.clear(),
        ])

        const restored: AppSettings = {
          key: SETTINGS_KEY,
          displayName: settings.displayName,
          // La restauration compte comme une sauvegarde connue : on conserve
          // la date du fichier plutot que de repartir de zero.
          lastBackupAt: settings.lastBackupAt ?? backup.createdAt,
          appVersion: APP_VERSION,
          installedAt: previous?.installedAt ?? nowIso(),
          currency: settings.currency,
        }

        await Promise.all([
          db.events.bulkPut(events),
          db.trips.bulkPut(trips),
          db.reminders.bulkPut(reminders),
          db.documents.bulkPut(restoredDocuments),
          db.documentFiles.bulkPut(
            [...files.entries()].map(([id, entry]) => ({ id, blob: entry.blob })),
          ),
          db.tasks.bulkPut(tasks),
          db.participants.bulkPut(participants),
          db.items.bulkPut(items),
          db.expenses.bulkPut(expenses),
          db.settings.put(restored),
        ])
      },
    )
  } catch (cause) {
    throw new AppError('IMPORT_WRITE', ERROR_MESSAGES.IMPORT_WRITE, { cause })
  }

  return {
    itemCount:
      events.length +
      trips.length +
      reminders.length +
      restoredDocuments.length +
      tasks.length +
      participants.length +
      items.length +
      expenses.length,
    fileCount: files.size,
    missingFiles: preview.missingFiles,
  }
}
