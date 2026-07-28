import { db } from '../database'
import { APP_VERSION } from '@/config/app'
import type { AppSettings, IsoDateTime } from '@/models'
import { SETTINGS_KEY } from '@/models'
import { nowIso } from '@/utils/date'

/** Valeurs de repli si la ligne de parametres est absente ou corrompue. */
export const FALLBACK_SETTINGS: AppSettings = {
  key: SETTINGS_KEY,
  displayName: 'Axel',
  lastBackupAt: null,
  appVersion: APP_VERSION,
  installedAt: '1970-01-01T00:00:00.000Z',
  currency: 'EUR',
}

export const settingsRepository = {
  /** Parametres courants, jamais `undefined` : on retombe sur les valeurs par defaut. */
  async get(): Promise<AppSettings> {
    const stored = await db.settings.get(SETTINGS_KEY)
    return stored ? { ...FALLBACK_SETTINGS, ...stored, key: SETTINGS_KEY } : FALLBACK_SETTINGS
  },

  async update(patch: Partial<Omit<AppSettings, 'key'>>): Promise<AppSettings> {
    const current = await this.get()
    const next: AppSettings = { ...current, ...patch, key: SETTINGS_KEY }
    await db.settings.put(next)
    return next
  },

  /** Horodate la derniere sauvegarde reussie. */
  async markBackedUp(at: IsoDateTime = nowIso()): Promise<AppSettings> {
    return this.update({ lastBackupAt: at })
  },
}
