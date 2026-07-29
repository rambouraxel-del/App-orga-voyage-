import { describe, expect, it } from 'vitest'
import { migrateEventToV2 } from '@/db/database'
import { BACKUP_FORMAT_VERSION, BACKUP_SIGNATURE } from '@/models'
import { parseBackupText, validateBackup } from '../backupValidation'

/** Evenement au format V0.1, tel qu'il figure dans une sauvegarde v1. */
const legacyEvent = {
  id: 'evt-legacy',
  title: 'Week-end a Nice',
  type: 'weekend',
  startDate: '2026-08-02T06:30:00.000Z',
  endDate: '2026-08-04T17:00:00.000Z',
  location: 'Nice',
  description: 'Trois jours au soleil',
  status: 'confirme',
  participants: 6,
  createdAt: '2026-07-28T06:00:00.000Z',
  updatedAt: '2026-07-28T06:00:00.000Z',
}

function makeBackup(formatVersion: number, events: unknown[]) {
  return {
    signature: BACKUP_SIGNATURE,
    formatVersion,
    appVersion: formatVersion === 1 ? '0.1.0' : '0.2.0',
    createdAt: '2026-07-28T06:00:00.000Z',
    data: {
      events,
      trips: [],
      settings: {
        displayName: 'Axel',
        lastBackupAt: null,
        appVersion: '0.1.0',
        currency: 'EUR',
      },
    },
  }
}

describe('migration d’un evenement V0.1 vers V0.2', () => {
  it('convertit `type` en `category`', () => {
    const migrated = migrateEventToV2({ ...legacyEvent })
    expect(migrated.category).toBe('weekend')
    expect(migrated.type).toBeUndefined()
  })

  it('convertit le statut « passe » en « termine »', () => {
    const migrated = migrateEventToV2({ ...legacyEvent, status: 'passe' })
    expect(migrated.status).toBe('termine')
  })

  it('ajoute `allDay` a false', () => {
    expect(migrateEventToV2({ ...legacyEvent }).allDay).toBe(false)
  })

  it('supprime les chaines vides devenues facultatives', () => {
    const migrated = migrateEventToV2({ ...legacyEvent, location: '', description: '   ' })
    expect(migrated.location).toBeUndefined()
    expect(migrated.description).toBeUndefined()
  })

  it('retire une date de fin identique au debut', () => {
    const migrated = migrateEventToV2({
      ...legacyEvent,
      endDate: legacyEvent.startDate,
    })
    expect(migrated.endDate).toBeUndefined()
  })

  it('retombe sur « autre » pour une categorie inconnue', () => {
    expect(migrateEventToV2({ ...legacyEvent, type: 'martien' }).category).toBe('autre')
  })

  it('est idempotente sur un evenement deja V0.2', () => {
    const once = migrateEventToV2({ ...legacyEvent })
    const twice = migrateEventToV2({ ...once })
    expect(twice).toEqual(once)
  })
})

describe('import d’une sauvegarde V0.1', () => {
  it('accepte un fichier v1 et migre ses evenements', () => {
    const backup = validateBackup(makeBackup(1, [legacyEvent]))
    const [event] = backup.data.events
    expect(event?.category).toBe('weekend')
    expect(event?.allDay).toBe(false)
    expect(event?.location).toBe('Nice')
    // Les champs hors perimetre V0.2 sont conserves tels quels.
    expect(event?.participants).toBe(6)
  })

  it('accepte un fichier v2', () => {
    const modernEvent = {
      id: 'evt-modern',
      title: 'Concert',
      category: 'concert',
      startDate: '2026-08-16T17:00:00.000Z',
      allDay: false,
      status: 'confirme',
      createdAt: '2026-07-28T06:00:00.000Z',
      updatedAt: '2026-07-28T06:00:00.000Z',
    }
    const backup = validateBackup(makeBackup(BACKUP_FORMAT_VERSION, [modernEvent]))
    expect(backup.data.events[0]?.category).toBe('concert')
    expect(backup.data.events[0]?.endDate).toBeUndefined()
  })

  it('refuse un fichier dont la signature ne correspond pas', () => {
    expect(() => validateBackup({ ...makeBackup(1, []), signature: 'autre' })).toThrow()
  })

  it('refuse un format plus recent que celui supporte', () => {
    expect(() => validateBackup(makeBackup(BACKUP_FORMAT_VERSION + 1, []))).toThrow()
  })

  it('refuse un evenement sans titre', () => {
    expect(() => validateBackup(makeBackup(1, [{ ...legacyEvent, title: '' }]))).toThrow()
  })

  it('refuse un evenement dont la date de debut est invalide', () => {
    expect(() => validateBackup(makeBackup(1, [{ ...legacyEvent, startDate: 'hier' }]))).toThrow()
  })

  it('refuse un JSON syntaxiquement invalide', () => {
    expect(() => parseBackupText('{ceci nest pas du json')).toThrow()
  })

  it('refuse un JSON valide mais etranger a l’application', () => {
    expect(() => parseBackupText(JSON.stringify({ hello: 'world' }))).toThrow()
  })
})
