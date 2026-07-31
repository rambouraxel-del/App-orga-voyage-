import { describe, expect, it } from 'vitest'
import type { AppEvent } from '@/models'
import { buildCarrierEvent, ensureTripEvents, migrateTripToV5 } from '../tripSync'

const stamps = { createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:00:00.000Z' }

const legacyTrip = (overrides: Record<string, unknown> = {}) => ({
  id: 'trip-1',
  title: 'Week-end a Nice',
  destination: 'Nice',
  startDate: '2026-09-12T08:00:00.000Z',
  endDate: '2026-09-14T20:00:00.000Z',
  status: 'planifie',
  ...stamps,
  ...overrides,
})

describe('migrateTripToV5', () => {
  it('convertit les anciens statuts', () => {
    expect(migrateTripToV5(legacyTrip({ status: 'planifie' })).status).toBe('preparation')
    expect(migrateTripToV5(legacyTrip({ status: 'confirme' })).status).toBe('reserve')
  })

  it('conserve les statuts deja a jour', () => {
    expect(migrateTripToV5(legacyTrip({ status: 'en-cours' })).status).toBe('en-cours')
    expect(migrateTripToV5(legacyTrip({ status: 'annule' })).status).toBe('annule')
  })

  it('applique un statut de repli si absent', () => {
    expect(migrateTripToV5(legacyTrip({ status: undefined })).status).toBe('preparation')
  })

  it('convertit `image` en `imageKey` et retire le prefixe V0.1', () => {
    const trip = migrateTripToV5(legacyTrip({ image: 'illustration:mer' }))
    expect(trip.imageKey).toBe('mer')
    expect(trip.image).toBeUndefined()
  })

  it('convertit `notes` en `description`', () => {
    const trip = migrateTripToV5(legacyTrip({ notes: 'Prendre le train tot' }))
    expect(trip.description).toBe('Prendre le train tot')
    expect(trip.notes).toBeUndefined()
  })

  it('supprime les chaines vides plutot que de les conserver', () => {
    const trip = migrateTripToV5(legacyTrip({ origin: '   ', description: '' }))
    expect('origin' in trip).toBe(false)
    expect('description' in trip).toBe(false)
  })

  it('est idempotente', () => {
    const once = migrateTripToV5(legacyTrip({ image: 'illustration:ville' }))
    const twice = migrateTripToV5({ ...once })
    expect(twice).toEqual(once)
  })
})

describe('buildCarrierEvent', () => {
  it('reprend titre, dates, destination et budget du voyage', () => {
    const event = buildCarrierEvent(
      migrateTripToV5(legacyTrip({ budget: 420, status: 'confirme' })),
      'evt-trip-1',
    )
    expect(event).toMatchObject({
      id: 'evt-trip-1',
      title: 'Week-end a Nice',
      category: 'voyage',
      location: 'Nice',
      status: 'confirme',
      tripId: 'trip-1',
      budget: 420,
    })
  })

  it('n’invente pas de budget quand le voyage n’en a pas', () => {
    const event = buildCarrierEvent(migrateTripToV5(legacyTrip()), 'evt-trip-1')
    expect('budget' in event).toBe(false)
  })
})

describe('ensureTripEvents', () => {
  it('cree l’evenement porteur manquant', () => {
    const { trips, createdEvents } = ensureTripEvents([legacyTrip()], [])
    expect(createdEvents).toHaveLength(1)
    expect(createdEvents[0]!.id).toBe('evt-trip-1')
    expect(trips[0]!.eventId).toBe('evt-trip-1')
    // Le statut herite est migre au passage.
    expect(trips[0]!.status).toBe('preparation')
  })

  it('reutilise un evenement « voyage » pointant deja vers ce voyage', () => {
    const existing: AppEvent = {
      id: 'evt-existant',
      title: 'Week-end a Nice',
      category: 'voyage',
      startDate: '2026-09-12T08:00:00.000Z',
      allDay: false,
      status: 'planifie',
      tripId: 'trip-1',
      ...stamps,
    }
    const { trips, createdEvents } = ensureTripEvents([legacyTrip()], [existing])
    expect(createdEvents).toEqual([])
    expect(trips[0]!.eventId).toBe('evt-existant')
  })

  it('respecte un `eventId` deja valide', () => {
    const existing: AppEvent = {
      id: 'evt-choisi',
      title: 'Nice',
      category: 'voyage',
      startDate: '2026-09-12T08:00:00.000Z',
      allDay: false,
      status: 'planifie',
      ...stamps,
    }
    const { trips, createdEvents } = ensureTripEvents(
      [legacyTrip({ eventId: 'evt-choisi' })],
      [existing],
    )
    expect(createdEvents).toEqual([])
    expect(trips[0]!.eventId).toBe('evt-choisi')
  })

  it('recree l’evenement si le `eventId` designe un evenement disparu', () => {
    const { trips, createdEvents } = ensureTripEvents([legacyTrip({ eventId: 'evt-perdu' })], [])
    expect(createdEvents).toHaveLength(1)
    expect(trips[0]!.eventId).toBe('evt-trip-1')
  })

  it('est idempotente : une seconde passe ne cree rien', () => {
    const first = ensureTripEvents([legacyTrip()], [])
    const second = ensureTripEvents(first.trips, first.createdEvents)
    expect(second.createdEvents).toEqual([])
    expect(second.trips[0]!.eventId).toBe('evt-trip-1')
  })

  it('ne modifie pas les objets d’origine', () => {
    const source = legacyTrip()
    ensureTripEvents([source], [])
    expect('eventId' in source).toBe(false)
    expect(source.status).toBe('planifie')
  })

  it('traite plusieurs voyages en une passe', () => {
    const { trips, createdEvents } = ensureTripEvents(
      [legacyTrip(), legacyTrip({ id: 'trip-2', title: 'Lisbonne' })],
      [],
    )
    expect(createdEvents.map((event) => event.id)).toEqual(['evt-trip-1', 'evt-trip-2'])
    expect(trips.map((trip) => trip.eventId)).toEqual(['evt-trip-1', 'evt-trip-2'])
  })
})
