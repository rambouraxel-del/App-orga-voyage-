import { db } from '../database'
import type { AppEvent, IsoDateTime } from '@/models'

/**
 * Acces en lecture aux evenements.
 * La V0.1 est en lecture seule : les mutations (creation / edition) arriveront
 * en V0.2 et viendront s'ajouter ici, pas dans les composants.
 */
export const eventsRepository = {
  /** Tous les evenements, du plus proche au plus lointain. */
  async listAll(): Promise<AppEvent[]> {
    return db.events.orderBy('startDate').toArray()
  },

  /** Evenements dont la fin est posterieure a `from`, tries chronologiquement. */
  async listUpcoming(limit?: number, from: IsoDateTime = new Date().toISOString()) {
    const upcoming = await db.events
      .orderBy('startDate')
      .filter((event) => event.endDate >= from && event.status !== 'annule')
      .toArray()
    return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming
  },

  /** Prochain evenement a venir, ou `null` si l'agenda est vide. */
  async findNext(from?: IsoDateTime): Promise<AppEvent | null> {
    const [next] = await this.listUpcoming(1, from)
    return next ?? null
  },

  async getById(id: string): Promise<AppEvent | undefined> {
    return db.events.get(id)
  },

  async count(): Promise<number> {
    return db.events.count()
  },
}
