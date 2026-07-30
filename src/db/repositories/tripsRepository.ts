import { db, TRIP_TO_EVENT_STATUS } from '../database'
import type { AppEvent, EntityId, Trip, TripDraft } from '@/models'
import { AppError, ERROR_MESSAGES } from '@/services/errors'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/id'

/**
 * Voyages.
 *
 * Un voyage et son evenement porteur sont ecrits ENSEMBLE, dans une
 * transaction. Le titre, les dates, la destination et le budget sont
 * systematiquement recopies sur l'evenement : c'est ce qui garantit qu'un
 * voyage modifie reste correct dans l'agenda, sans avoir a y penser ailleurs
 * dans l'application.
 */
export const tripsRepository = {
  /* --- Lecture ---------------------------------------------------------- */

  async listAll(): Promise<Trip[]> {
    return (await db.trips.toArray()).sort((a, b) => a.startDate.localeCompare(b.startDate))
  },

  async getById(id: EntityId): Promise<Trip | undefined> {
    return db.trips.get(id)
  },

  async getByIdOrFail(id: EntityId): Promise<Trip> {
    const trip = await db.trips.get(id)
    if (!trip) {
      throw new AppError('TRIP_NOT_FOUND', ERROR_MESSAGES.TRIP_NOT_FOUND, {
        cause: new Error(`Voyage introuvable : ${id}`),
      })
    }
    return trip
  },

  /** Voyage porte par un evenement donne, s'il existe. */
  async findByEvent(eventId: EntityId): Promise<Trip | undefined> {
    return db.trips.where('eventId').equals(eventId).first()
  },

  /** Voyages a venir ou en cours, du plus proche au plus lointain. */
  async listUpcoming(limit?: number, now: Date = new Date()): Promise<Trip[]> {
    const today = now.toISOString()
    const upcoming = (await this.listAll()).filter(
      (trip) => trip.status !== 'annule' && trip.status !== 'termine' && trip.endDate >= today,
    )
    return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming
  },

  async findNext(now?: Date): Promise<Trip | null> {
    const [next] = await this.listUpcoming(1, now)
    return next ?? null
  },

  async count(): Promise<number> {
    return db.trips.count()
  },

  /* --- Ecriture ---------------------------------------------------------- */

  /** Champs de l'evenement derives du voyage. Source unique de la synchro. */
  eventFieldsFrom(trip: Trip): Partial<AppEvent> {
    return {
      title: trip.title,
      category: 'voyage',
      startDate: trip.startDate,
      endDate: trip.endDate,
      location: trip.destination,
      status: TRIP_TO_EVENT_STATUS[trip.status] ?? 'planifie',
      tripId: trip.id,
      ...(typeof trip.budget === 'number' ? { budget: trip.budget } : { budget: undefined }),
      ...(trip.description ? { description: trip.description } : { description: undefined }),
      ...(trip.imageKey ? { imageKey: trip.imageKey } : {}),
    }
  },

  /** Cree le voyage ET son evenement porteur, en une transaction. */
  async create(draft: TripDraft): Promise<Trip> {
    const timestamp = nowIso()
    const tripId = createId()
    const eventId = createId()

    const trip: Trip = { ...draft, id: tripId, eventId, createdAt: timestamp, updatedAt: timestamp }

    const event: AppEvent = {
      id: eventId,
      title: trip.title,
      category: 'voyage',
      startDate: trip.startDate,
      endDate: trip.endDate,
      allDay: false,
      location: trip.destination,
      status: TRIP_TO_EVENT_STATUS[trip.status] ?? 'planifie',
      tripId,
      ...(trip.description ? { description: trip.description } : {}),
      ...(trip.imageKey ? { imageKey: trip.imageKey } : {}),
      ...(typeof trip.budget === 'number' ? { budget: trip.budget } : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    try {
      await db.transaction('rw', [db.trips, db.events], async () => {
        await db.events.add(event)
        await db.trips.add(trip)
      })
    } catch (cause) {
      throw new AppError('TRIP_SAVE', ERROR_MESSAGES.TRIP_SAVE, { cause })
    }
    return trip
  },

  /** Met a jour le voyage et repercute titre, dates, lieu et budget. */
  async update(id: EntityId, draft: TripDraft): Promise<Trip> {
    const existing = await this.getByIdOrFail(id)
    const updated: Trip = {
      ...existing,
      ...draft,
      // Champs devant pouvoir etre effaces.
      origin: draft.origin,
      description: draft.description,
      imageKey: draft.imageKey,
      budget: draft.budget,
      id: existing.id,
      eventId: existing.eventId,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    }

    try {
      await db.transaction('rw', [db.trips, db.events], async () => {
        await db.trips.put(updated)
        const event = await db.events.get(updated.eventId)
        if (event) {
          await db.events.put({
            ...event,
            ...this.eventFieldsFrom(updated),
            id: event.id,
            createdAt: event.createdAt,
            updatedAt: nowIso(),
          } as AppEvent)
        }
      })
    } catch (cause) {
      throw new AppError('TRIP_SAVE', ERROR_MESSAGES.TRIP_SAVE, { cause })
    }
    return updated
  },

  /** Change uniquement le statut, en synchronisant celui de l'evenement. */
  async setStatus(id: EntityId, status: Trip['status']): Promise<Trip> {
    const existing = await this.getByIdOrFail(id)
    return this.update(id, { ...existing, status })
  },

  async setBudget(id: EntityId, budget: number | undefined): Promise<Trip> {
    const existing = await this.getByIdOrFail(id)
    return this.update(id, { ...existing, budget })
  },

  /**
   * Supprime un voyage et tout son contenu.
   *
   * @param documentsMode sort des documents rattaches : `supprimer` efface
   *        fiches et fichiers, `conserver` ne retire que l'association.
   *
   * L'evenement porteur, ses modules (taches, participants, depenses, objets)
   * et le contenu d'itineraire partent en cascade, dans une transaction unique.
   */
  async remove(id: EntityId, documentsMode: 'supprimer' | 'conserver'): Promise<void> {
    const trip = await this.getByIdOrFail(id)

    try {
      await db.transaction(
        'rw',
        [
          db.trips,
          db.events,
          db.tripStages,
          db.tripActivities,
          db.tripTransports,
          db.tripStays,
          db.tasks,
          db.participants,
          db.items,
          db.expenses,
          db.documents,
          db.documentFiles,
          db.documentLinks,
        ],
        async () => {
          const stageIds = (await db.tripStages.where('tripId').equals(id).primaryKeys()) as string[]
          const activityIds = (await db.tripActivities
            .where('tripId')
            .equals(id)
            .primaryKeys()) as string[]
          const transportIds = (await db.tripTransports
            .where('tripId')
            .equals(id)
            .primaryKeys()) as string[]
          const stayIds = (await db.tripStays.where('tripId').equals(id).primaryKeys()) as string[]

          // Liaisons de documents pointant vers un element de ce voyage.
          const targetIds = new Set([...stageIds, ...activityIds, ...transportIds, ...stayIds])
          const staleLinks = (await db.documentLinks.toArray()).filter((link) =>
            targetIds.has(link.targetId),
          )
          await db.documentLinks.bulkDelete(staleLinks.map((link) => link.id))

          // Documents rattaches a l'evenement du voyage.
          const attached = await db.documents.where('eventId').equals(trip.eventId).toArray()
          if (attached.length > 0) {
            const ids = attached.map((document) => document.id)
            if (documentsMode === 'supprimer') {
              await db.documentFiles.bulkDelete(ids)
              await db.documents.bulkDelete(ids)
              await db.documentLinks.bulkDelete(
                (await db.documentLinks.toArray())
                  .filter((link) => ids.includes(link.documentId))
                  .map((link) => link.id),
              )
            } else {
              const timestamp = nowIso()
              await db.documents.bulkPut(
                attached.map((document) => ({
                  ...document,
                  eventId: undefined,
                  updatedAt: timestamp,
                })),
              )
            }
          }

          await Promise.all([
            db.tripStages.bulkDelete(stageIds),
            db.tripActivities.bulkDelete(activityIds),
            db.tripTransports.bulkDelete(transportIds),
            db.tripStays.bulkDelete(stayIds),
            db.tasks.where('eventId').equals(trip.eventId).delete(),
            db.participants.where('eventId').equals(trip.eventId).delete(),
            db.items.where('eventId').equals(trip.eventId).delete(),
            db.expenses.where('eventId').equals(trip.eventId).delete(),
          ])

          await db.events.delete(trip.eventId)
          await db.trips.delete(id)
        },
      )
    } catch (cause) {
      throw new AppError('TRIP_DELETE', ERROR_MESSAGES.TRIP_DELETE, { cause })
    }
  },
}
