import type { IsoDateTime } from './common'
import type { AppEvent } from './event'
import type { EventTask } from './task'
import type { Participant } from './participant'
import type { EventItem } from './item'
import type { Expense } from './expense'
import type { Trip } from './trip'
import type { Reminder } from './reminder'
import type { TravelDocument } from './document'
import type { AppSettings } from './settings'

/**
 * Version du FORMAT de sauvegarde (independante de la version applicative).
 *
 * v1 (V0.1) : evenements avec `type`, `endDate` obligatoire, statut `passe`.
 * v2 (V0.2) : evenements avec `category`, `endDate` facultative, `allDay`,
 *             `imageKey`, statut `termine`.
 * v3 (V0.3) : ajout des taches, participants, objets/cadeaux et depenses.
 *
 * Les fichiers v1 et v2 restent importables : les collections absentes sont
 * simplement vides apres import, et les evenements sont migres a la volee.
 */
export const BACKUP_FORMAT_VERSION = 3

/** Marqueur permettant de reconnaitre un fichier produit par l'application. */
export const BACKUP_SIGNATURE = 'mes-aventures-backup'

/** Parametres exportes (on exclut les champs non pertinents a la restauration). */
export type BackupSettings = Pick<
  AppSettings,
  'displayName' | 'lastBackupAt' | 'appVersion' | 'currency'
>

export interface BackupFile {
  /** Doit valoir `BACKUP_SIGNATURE`. */
  signature: typeof BACKUP_SIGNATURE
  /** Version du format de sauvegarde. */
  formatVersion: number
  /** Version de l'application ayant genere le fichier. */
  appVersion: string
  /** Date de creation du fichier. */
  createdAt: IsoDateTime
  data: {
    events: AppEvent[]
    trips: Trip[]
    /** Optionnels : absents des fichiers produits par une version anterieure. */
    reminders?: Reminder[]
    documents?: TravelDocument[]
    /** Modules V0.3 — absents des sauvegardes v1 et v2. */
    tasks?: EventTask[]
    participants?: Participant[]
    items?: EventItem[]
    expenses?: Expense[]
    settings: BackupSettings
  }
}
