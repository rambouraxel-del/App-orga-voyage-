import type { IsoDateTime } from './common'

/**
 * Les parametres tiennent dans une ligne unique, identifiee par une cle
 * constante. Cela evite de gerer un "singleton" implicite et reste extensible.
 */
export const SETTINGS_KEY = 'app-settings' as const

export type SettingsKey = typeof SETTINGS_KEY

export interface AppSettings {
  key: SettingsKey
  /** Prenom affiche dans l'en-tete de l'accueil. */
  displayName: string
  /** Date/heure du dernier export reussi. `null` tant qu'aucun export n'a eu lieu. */
  lastBackupAt: IsoDateTime | null
  /** Version applicative ayant ecrit ces parametres. */
  appVersion: string
  /** Date du tout premier lancement (utilisee pour ne pas rejouer le seed). */
  installedAt: IsoDateTime
  /** Devise utilisee pour les montants affiches. */
  currency: string
}
