import { LEGACY_TRIP_STATUS, type AppEvent } from '@/models'

/**
 * Synchronisation voyage <-> evenement porteur.
 *
 * Regroupe ici, hors de Dexie, tout ce qui sait fabriquer l'evenement d'un
 * voyage : la migration de schema ET l'import de sauvegarde en ont besoin, et
 * les deux doivent produire exactement le meme resultat. Les fonctions sont
 * pures pour rester testables sans base.
 */

/** Statut de voyage -> statut d'evenement. */
export const TRIP_TO_EVENT_STATUS: Record<string, AppEvent['status']> = {
  idee: 'idee',
  preparation: 'planifie',
  reserve: 'confirme',
  'en-cours': 'confirme',
  termine: 'termine',
  annule: 'annule',
}

/**
 * Convertit un voyage V0.1-V0.4 vers le format V0.5.
 * Pure et idempotente, reutilisee par l'import de sauvegarde.
 */
export function migrateTripToV5(trip: Record<string, unknown>): Record<string, unknown> {
  if (typeof trip.status === 'string' && LEGACY_TRIP_STATUS[trip.status]) {
    trip.status = LEGACY_TRIP_STATUS[trip.status]
  } else if (trip.status === undefined) {
    trip.status = 'preparation'
  }

  // `image` (V0.1, prefixe `illustration:`) devient `imageKey`
  if (trip.imageKey === undefined && typeof trip.image === 'string') {
    trip.imageKey = trip.image.replace(/^illustration:/, '')
  }
  delete trip.image

  // `notes` devient `description`
  if (trip.description === undefined && typeof trip.notes === 'string') {
    trip.description = trip.notes
  }
  delete trip.notes

  for (const field of ['origin', 'description', 'imageKey'] as const) {
    if (typeof trip[field] === 'string' && (trip[field] as string).trim() === '') {
      delete trip[field]
    }
  }

  return trip
}

/** Identifiant deterministe de l'evenement porteur d'un voyage herite. */
export const carrierEventId = (tripId: string): string => `evt-${tripId}`

/** Construit l'evenement porteur d'un voyage. */
export function buildCarrierEvent(trip: Record<string, unknown>, eventId: string): AppEvent {
  const stamp = typeof trip.createdAt === 'string' ? trip.createdAt : new Date().toISOString()
  return {
    id: eventId,
    title: typeof trip.title === 'string' ? trip.title : 'Voyage',
    category: 'voyage',
    startDate: trip.startDate as string,
    endDate: trip.endDate as string,
    allDay: false,
    ...(typeof trip.destination === 'string' && trip.destination
      ? { location: trip.destination }
      : {}),
    ...(typeof trip.description === 'string' ? { description: trip.description } : {}),
    ...(typeof trip.imageKey === 'string' ? { imageKey: trip.imageKey } : {}),
    status: TRIP_TO_EVENT_STATUS[trip.status as string] ?? 'planifie',
    tripId: trip.id as string,
    ...(typeof trip.budget === 'number' ? { budget: trip.budget } : {}),
    createdAt: stamp,
    updatedAt: typeof trip.updatedAt === 'string' ? trip.updatedAt : stamp,
  }
}

export interface TripEventLinkResult {
  /** Voyages migres, tous pourvus d'un `eventId` valide. */
  trips: Array<Record<string, unknown>>
  /** Evenements porteurs a creer (vide si tous existaient deja). */
  createdEvents: AppEvent[]
}

/**
 * Garantit que chaque voyage possede un evenement porteur existant.
 *
 * Trois cas, dans cet ordre :
 * 1. le voyage designe un evenement present -> on n'y touche pas ;
 * 2. un evenement « voyage » pointe deja vers ce voyage (`tripId`) -> on le
 *    reutilise, ce qui evite de dupliquer les donnees de demonstration ;
 * 3. sinon -> on fabrique l'evenement manquant.
 *
 * Idempotente : reappliquee, elle ne cree plus rien.
 */
export function ensureTripEvents(
  rawTrips: Array<Record<string, unknown>>,
  events: AppEvent[],
): TripEventLinkResult {
  const byId = new Map(events.map((event) => [event.id, event]))
  const byTripId = new Map(
    events.filter((event) => typeof event.tripId === 'string').map((event) => [event.tripId!, event]),
  )

  const createdEvents: AppEvent[] = []
  const trips = rawTrips.map((raw) => {
    const trip = migrateTripToV5({ ...raw })

    if (typeof trip.eventId === 'string' && byId.has(trip.eventId)) return trip

    const existing = byTripId.get(trip.id as string)
    if (existing && existing.category === 'voyage') {
      trip.eventId = existing.id
      return trip
    }

    const eventId = carrierEventId(trip.id as string)
    const event = buildCarrierEvent(trip, eventId)
    createdEvents.push(event)
    byId.set(eventId, event)
    trip.eventId = eventId
    return trip
  })

  return { trips, createdEvents }
}
