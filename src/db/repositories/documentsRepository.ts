import { db } from '../database'
import type { TravelDocument } from '@/models'

export const documentsRepository = {
  async listAll(): Promise<TravelDocument[]> {
    return db.documents.toArray()
  },

  /** Documents tries par date pertinente croissante (les sans-date en dernier). */
  async listSorted(limit?: number): Promise<TravelDocument[]> {
    const sorted = (await db.documents.toArray()).sort((a, b) =>
      (a.date ?? '9999').localeCompare(b.date ?? '9999'),
    )
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
  },

  async count(): Promise<number> {
    return db.documents.count()
  },
}
