import type { Table } from 'dexie'
import { db } from '../database'
import type {
  ActivityDraft,
  DocumentLink,
  DocumentLinkTarget,
  EntityId,
  StageDraft,
  StayDraft,
  TransportDraft,
  TripActivity,
  TripStage,
  TripStay,
  TripTransport,
} from '@/models'
import { AppError, ERROR_MESSAGES } from '@/services/errors'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/id'
import { compareActivities, compareStages, compareStays, compareTransports } from '@/utils/tripRules'

/**
 * Fabrique commune aux quatre collections d'itineraire.
 * Meme cycle de vie partout : les factoriser evite quatre copies de la meme
 * gestion d'erreurs et d'horodatage.
 */
interface TripChild {
  id: EntityId
  tripId: EntityId
  createdAt: string
  updatedAt: string
}

function createTripRepository<T extends TripChild, D>(
  table: () => Table<T, string>,
  label: string,
  sort: (a: T, b: T) => number,
) {
  return {
    async listByTrip(tripId: EntityId): Promise<T[]> {
      return (await table().where('tripId').equals(tripId).toArray()).sort(sort)
    },

    async listAll(): Promise<T[]> {
      return table().toArray()
    },

    async getById(id: EntityId): Promise<T | undefined> {
      return table().get(id)
    },

    async create(tripId: EntityId, draft: D): Promise<T> {
      const timestamp = nowIso()
      const record = {
        ...(draft as object),
        id: createId(),
        tripId,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as T
      try {
        await table().add(record)
      } catch (cause) {
        throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE(label), { cause })
      }
      return record
    },

    async update(id: EntityId, draft: Partial<D>): Promise<T> {
      const existing = await table().get(id)
      if (!existing) {
        throw new AppError('TRIP_ITEM_NOT_FOUND', ERROR_MESSAGES.TRIP_ITEM_NOT_FOUND(label), {
          cause: new Error(`${label} introuvable : ${id}`),
        })
      }
      const updated = {
        ...existing,
        ...(draft as object),
        id: existing.id,
        tripId: existing.tripId,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      } as T
      try {
        await table().put(updated)
      } catch (cause) {
        throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE(label), { cause })
      }
      return updated
    },

    /**
     * Supprime l'element ET les liaisons de documents qui le visaient.
     * Les fichiers eux-memes ne sont jamais touches.
     */
    async remove(id: EntityId): Promise<void> {
      try {
        await db.transaction('rw', [table(), db.documentLinks], async () => {
          const links = (await db.documentLinks.toArray()).filter((link) => link.targetId === id)
          await db.documentLinks.bulkDelete(links.map((link) => link.id))
          await table().delete(id)
        })
      } catch (cause) {
        throw new AppError('TRIP_ITEM_DELETE', ERROR_MESSAGES.TRIP_ITEM_DELETE(label), { cause })
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Etapes                                                              */
/* ------------------------------------------------------------------ */

const stagesBase = createTripRepository<TripStage, StageDraft>(
  () => db.tripStages,
  'etape',
  compareStages,
)

export const stagesRepository = {
  ...stagesBase,

  /** Cree une etape en fin d'itineraire. */
  async create(tripId: EntityId, draft: StageDraft): Promise<TripStage> {
    const siblings = await stagesBase.listByTrip(tripId)
    const order = siblings.reduce((max, stage) => Math.max(max, stage.order), -1) + 1
    const timestamp = nowIso()
    const stage: TripStage = {
      ...draft,
      id: createId(),
      tripId,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    try {
      await db.tripStages.add(stage)
    } catch (cause) {
      throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE('etape'), { cause })
    }
    return stage
  },

  /** Persiste un nouvel ordre. Tout ou rien, via une transaction. */
  async reorder(stages: TripStage[]): Promise<void> {
    const timestamp = nowIso()
    try {
      await db.transaction('rw', db.tripStages, async () => {
        await db.tripStages.bulkPut(
          stages.map((stage, index) => ({ ...stage, order: index, updatedAt: timestamp })),
        )
      })
    } catch (cause) {
      throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE('etape'), { cause })
    }
  },
}

/* ------------------------------------------------------------------ */
/* Activites                                                           */
/* ------------------------------------------------------------------ */

const activitiesBase = createTripRepository<TripActivity, ActivityDraft>(
  () => db.tripActivities,
  'activite',
  compareActivities,
)

export const activitiesRepository = {
  ...activitiesBase,

  /** Cree une activite en fin de journee. */
  async create(tripId: EntityId, draft: ActivityDraft): Promise<TripActivity> {
    const sameDay = (await activitiesBase.listByTrip(tripId)).filter((a) => a.day === draft.day)
    const order = sameDay.reduce((max, a) => Math.max(max, a.order), -1) + 1
    const timestamp = nowIso()
    const activity: TripActivity = {
      ...draft,
      id: createId(),
      tripId,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    try {
      await db.tripActivities.add(activity)
    } catch (cause) {
      throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE('activite'), { cause })
    }
    return activity
  },

  /** Deplace une activite vers une autre journee, en fin de liste. */
  async moveToDay(id: EntityId, day: string): Promise<TripActivity> {
    const existing = await db.tripActivities.get(id)
    if (!existing) {
      throw new AppError('TRIP_ITEM_NOT_FOUND', ERROR_MESSAGES.TRIP_ITEM_NOT_FOUND('activite'), {
        cause: new Error(`Activite introuvable : ${id}`),
      })
    }
    const target = (await activitiesBase.listByTrip(existing.tripId)).filter(
      (a) => a.day === day && a.id !== id,
    )
    const order = target.reduce((max, a) => Math.max(max, a.order), -1) + 1
    return activitiesBase.update(id, { day } as Partial<ActivityDraft>).then(async (moved) => {
      const withOrder = { ...moved, order, updatedAt: nowIso() }
      await db.tripActivities.put(withOrder)
      return withOrder
    })
  },

  /** Persiste l'ordre des activites d'une journee. */
  async reorder(activities: TripActivity[]): Promise<void> {
    const timestamp = nowIso()
    try {
      await db.transaction('rw', db.tripActivities, async () => {
        await db.tripActivities.bulkPut(
          activities.map((activity, index) => ({
            ...activity,
            order: index,
            updatedAt: timestamp,
          })),
        )
      })
    } catch (cause) {
      throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE('activite'), { cause })
    }
  },
}

/* ------------------------------------------------------------------ */
/* Transports et hebergements                                          */
/* ------------------------------------------------------------------ */

export const transportsRepository = createTripRepository<TripTransport, TransportDraft>(
  () => db.tripTransports,
  'transport',
  compareTransports,
)

export const staysRepository = createTripRepository<TripStay, StayDraft>(
  () => db.tripStays,
  'hebergement',
  compareStays,
)

/* ------------------------------------------------------------------ */
/* Liaisons de documents                                               */
/* ------------------------------------------------------------------ */

export const documentLinksRepository = {
  async listAll(): Promise<DocumentLink[]> {
    return db.documentLinks.toArray()
  },

  async listByTarget(targetId: EntityId): Promise<DocumentLink[]> {
    return db.documentLinks.where('targetId').equals(targetId).toArray()
  },

  /** Rattache un document a un element. Sans effet si la liaison existe deja. */
  async link(
    documentId: EntityId,
    targetType: DocumentLinkTarget,
    targetId: EntityId,
  ): Promise<DocumentLink> {
    const existing = (await db.documentLinks.where('targetId').equals(targetId).toArray()).find(
      (link) => link.documentId === documentId,
    )
    if (existing) return existing

    const link: DocumentLink = {
      id: createId(),
      documentId,
      targetType,
      targetId,
      createdAt: nowIso(),
    }
    try {
      await db.documentLinks.add(link)
    } catch (cause) {
      throw new AppError('TRIP_ITEM_SAVE', ERROR_MESSAGES.TRIP_ITEM_SAVE('document'), { cause })
    }
    return link
  },

  /** Retire l'association. Le fichier n'est jamais supprime. */
  async unlink(documentId: EntityId, targetId: EntityId): Promise<void> {
    const links = (await db.documentLinks.where('targetId').equals(targetId).toArray()).filter(
      (link) => link.documentId === documentId,
    )
    await db.documentLinks.bulkDelete(links.map((link) => link.id))
  },
}
