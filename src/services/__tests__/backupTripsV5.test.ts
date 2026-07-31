import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT_VERSION, BACKUP_SIGNATURE } from '@/models'
import { validateBackup } from '../backupValidation'

const settings = {
  displayName: 'Axel',
  lastBackupAt: null,
  appVersion: '0.5.0',
  currency: 'EUR',
}

function makeBackup(data: Record<string, unknown>, formatVersion = BACKUP_FORMAT_VERSION) {
  return {
    signature: BACKUP_SIGNATURE,
    formatVersion,
    appVersion: '0.5.0',
    createdAt: '2026-08-01T10:00:00.000Z',
    data: { events: [], trips: [], settings, ...data },
  }
}

const stamps = { createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:00:00.000Z' }

describe('sauvegarde v5 — contenu des voyages', () => {
  it('restaure etapes, activites, transports, hebergements et liaisons', () => {
    const backup = validateBackup(
      makeBackup({
        tripStages: [
          { id: 'sg-1', tripId: 'trip-1', place: 'Porto', status: 'prevu', order: 0, ...stamps },
        ],
        tripActivities: [
          {
            id: 'ac-1',
            tripId: 'trip-1',
            day: '2026-09-12',
            title: 'Belem',
            category: 'visite',
            bookingRequired: true,
            status: 'prevu',
            order: 0,
            ...stamps,
          },
        ],
        tripTransports: [
          {
            id: 'tr-1',
            tripId: 'trip-1',
            mode: 'avion',
            from: 'Paris',
            to: 'Lisbonne',
            departure: '2026-09-12T06:45:00.000Z',
            status: 'reserve',
            plannedPrice: 180,
            ...stamps,
          },
        ],
        tripStays: [
          {
            id: 'st-1',
            tripId: 'trip-1',
            name: 'Hotel do Chiado',
            kind: 'hotel',
            checkIn: '2026-09-12',
            checkOut: '2026-09-16',
            status: 'reserve',
            ...stamps,
          },
        ],
        documentLinks: [
          {
            id: 'lk-1',
            documentId: 'doc-1',
            targetType: 'transport',
            targetId: 'tr-1',
            createdAt: '2026-08-01T10:00:00.000Z',
          },
        ],
      }),
    )

    expect(backup.data.tripStages).toHaveLength(1)
    expect(backup.data.tripActivities?.[0]?.day).toBe('2026-09-12')
    expect(backup.data.tripTransports?.[0]?.plannedPrice).toBe(180)
    expect(backup.data.tripStays?.[0]?.checkOut).toBe('2026-09-16')
    expect(backup.data.documentLinks?.[0]?.targetId).toBe('tr-1')
  })

  it('ramene une valeur d’enumeration inconnue vers un repli', () => {
    const backup = validateBackup(
      makeBackup({
        tripTransports: [
          {
            id: 'tr-1',
            tripId: 'trip-1',
            mode: 'teleportation',
            from: 'A',
            to: 'B',
            departure: '2026-09-12T06:45:00.000Z',
            status: 'inconnu',
            ...stamps,
          },
        ],
      }),
    )
    expect(backup.data.tripTransports?.[0]?.mode).toBe('autre')
    expect(backup.data.tripTransports?.[0]?.status).toBe('a-reserver')
  })

  it('refuse une activite sans journee exploitable', () => {
    expect(() =>
      validateBackup(
        makeBackup({
          tripActivities: [
            {
              id: 'ac-1',
              tripId: 'trip-1',
              day: '12 septembre',
              title: 'Belem',
              category: 'visite',
              bookingRequired: false,
              status: 'prevu',
              order: 0,
              ...stamps,
            },
          ],
        }),
      ),
    ).toThrow()
  })

  it('refuse un element d’itineraire orphelin', () => {
    expect(() =>
      validateBackup(
        makeBackup({
          tripStages: [{ id: 'sg-1', place: 'Porto', status: 'prevu', order: 0, ...stamps }],
        }),
      ),
    ).toThrow()
  })

  it('accepte une sauvegarde v4 sans contenu de voyage', () => {
    const backup = validateBackup(
      makeBackup(
        {
          trips: [
            {
              id: 'trip-1',
              title: 'Nice',
              destination: 'Nice',
              startDate: '2026-09-12T08:00:00.000Z',
              endDate: '2026-09-14T20:00:00.000Z',
              status: 'confirme',
              ...stamps,
            },
          ],
        },
        4,
      ),
    )
    expect(backup.data.tripStages).toEqual([])
    expect(backup.data.documentLinks).toEqual([])
    // Le statut herite est migre, et `eventId` reste a retablir a l'import.
    expect(backup.data.trips[0]?.status).toBe('reserve')
    expect(backup.data.trips[0]?.eventId).toBe('')
  })

  it('refuse une sauvegarde issue d’une version future', () => {
    expect(() => validateBackup(makeBackup({}, BACKUP_FORMAT_VERSION + 1))).toThrow()
  })
})
