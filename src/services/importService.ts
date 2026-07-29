import { APP_VERSION } from '@/config/app'
import { db } from '@/db/database'
import { SETTINGS_KEY, type AppSettings, type BackupFile } from '@/models'
import { nowIso } from '@/utils/date'
import { parseBackupText } from './backupValidation'
import { AppError, ERROR_MESSAGES } from './errors'

/** Lit un fichier selectionne et renvoie son contenu texte. */
async function readFileAsText(file: File): Promise<string> {
  try {
    // `File.text()` est disponible sur iOS 15+ ; repli FileReader sinon.
    if (typeof file.text === 'function') return await file.text()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.readAsText(file)
    })
  } catch (cause) {
    throw new AppError('IMPORT_READ', ERROR_MESSAGES.IMPORT_READ, { cause })
  }
}

export interface BackupPreview {
  backup: BackupFile
  createdAt: string
  appVersion: string
  counts: {
    events: number
    trips: number
    reminders: number
    documents: number
    tasks: number
    participants: number
    items: number
    expenses: number
  }
}

/**
 * Etape 1 : lecture + validation, SANS rien ecrire.
 * Permet d'afficher un recapitulatif et de demander confirmation avant
 * le remplacement des donnees.
 */
export async function prepareImport(file: File): Promise<BackupPreview> {
  const text = await readFileAsText(file)
  const backup = parseBackupText(text)

  return {
    backup,
    createdAt: backup.createdAt,
    appVersion: backup.appVersion,
    counts: {
      events: backup.data.events.length,
      trips: backup.data.trips.length,
      reminders: backup.data.reminders?.length ?? 0,
      documents: backup.data.documents?.length ?? 0,
      tasks: backup.data.tasks?.length ?? 0,
      participants: backup.data.participants?.length ?? 0,
      items: backup.data.items?.length ?? 0,
      expenses: backup.data.expenses?.length ?? 0,
    },
  }
}

export interface ImportResult {
  itemCount: number
}

/**
 * Etape 2 : remplacement effectif, apres confirmation explicite.
 *
 * Tout se joue dans une transaction unique : en cas d'erreur, IndexedDB annule
 * le vidage des tables et les donnees precedentes restent intactes.
 */
export async function applyImport(backup: BackupFile): Promise<ImportResult> {
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

  try {
    await db.transaction(
      'rw',
      [
        db.events,
        db.trips,
        db.reminders,
        db.documents,
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
          db.documents.bulkPut(documents),
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
      documents.length +
      tasks.length +
      participants.length +
      items.length +
      expenses.length,
  }
}
