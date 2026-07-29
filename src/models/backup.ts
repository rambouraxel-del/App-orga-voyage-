import type { IsoDateTime } from './common'
import type { AppEvent } from './event'
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
 *
 * Les fichiers v1 restent importables : ils sont migres a la volee vers v2.
 */
export const BACKUP_FORMAT_VERSION = 2

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
    settings: BackupSettings
  }
}
