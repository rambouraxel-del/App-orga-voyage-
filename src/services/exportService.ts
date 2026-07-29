import { APP_VERSION, BACKUP_FILE_PREFIX } from '@/config/app'
import { db } from '@/db/database'
import { settingsRepository } from '@/db/repositories'
import { BACKUP_FORMAT_VERSION, BACKUP_SIGNATURE, type BackupFile } from '@/models'
import { nowIso, toDateSlug } from '@/utils/date'
import { AppError, ERROR_MESSAGES } from './errors'

/** Construit l'objet de sauvegarde a partir du contenu actuel de la base. */
export async function buildBackup(): Promise<BackupFile> {
  const [events, trips, reminders, documents, tasks, participants, items, expenses, settings] =
    await Promise.all([
      db.events.toArray(),
      db.trips.toArray(),
      db.reminders.toArray(),
      db.documents.toArray(),
      db.tasks.toArray(),
      db.participants.toArray(),
      db.items.toArray(),
      db.expenses.toArray(),
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
      settings: {
        displayName: settings.displayName,
        lastBackupAt: settings.lastBackupAt,
        appVersion: settings.appVersion,
        currency: settings.currency,
      },
    },
  }
}

/** `mes-aventures-sauvegarde-2026-07-28.json` */
export function buildBackupFileName(date: Date = new Date()): string {
  return `${BACKUP_FILE_PREFIX}-${toDateSlug(date)}.json`
}

export interface ExportResult {
  fileName: string
  /** Nombre total d'enregistrements exportes. */
  itemCount: number
  /** Horodatage enregistre comme "derniere sauvegarde". */
  backedUpAt: string
}

/**
 * Declenche le telechargement du fichier de sauvegarde.
 *
 * Sur iOS/Safari, `<a download>` avec une URL blob ouvre la feuille de partage
 * ("Enregistrer dans Fichiers"), ce qui est le comportement attendu.
 */
export async function exportBackup(): Promise<ExportResult> {
  let backup: BackupFile
  try {
    backup = await buildBackup()
  } catch (cause) {
    throw new AppError('EXPORT_FAILED', ERROR_MESSAGES.EXPORT_FAILED, { cause })
  }

  const fileName = buildBackupFileName()
  let url: string | null = null

  try {
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (cause) {
    throw new AppError('EXPORT_FAILED', ERROR_MESSAGES.EXPORT_FAILED, { cause })
  } finally {
    // Laisse a Safari le temps de recuperer le blob avant de le revoquer.
    if (url) setTimeout(() => URL.revokeObjectURL(url!), 60_000)
  }

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
      (backup.data.documents?.length ?? 0) +
      (backup.data.tasks?.length ?? 0) +
      (backup.data.participants?.length ?? 0) +
      (backup.data.items?.length ?? 0) +
      (backup.data.expenses?.length ?? 0),
    backedUpAt,
  }
}
