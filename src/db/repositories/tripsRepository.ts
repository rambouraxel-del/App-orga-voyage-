import { db } from '../database'
import type { IsoDateTime, Trip } from '@/models'

export const tripsRepository = {
  async listAll(): Promise<Trip[]> {
    return db.trips.orderBy('startDate').toArray()
  },

  async listUpcoming(limit?: number, from: IsoDateTime = new Date().toISOString()) {
    const upcoming = await db.trips
      .orderBy('startDate')
      .filter((trip) => trip.endDate >= from && trip.status !== 'termine')
      .toArray()
    return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming
  },

  async findNext(from?: IsoDateTime): Promise<Trip | null> {
    const [next] = await this.listUpcoming(1, from)
    return next ?? null
  },

  async getById(id: string): Promise<Trip | undefined> {
    return db.trips.get(id)
  },

  async count(): Promise<number> {
    return db.trips.count()
  },
}
