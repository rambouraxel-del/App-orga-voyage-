import { db } from '../database'
import type { Reminder } from '@/models'

export const remindersRepository = {
  async listAll(): Promise<Reminder[]> {
    return db.reminders.toArray()
  },

  /** Pense-betes non coches, les plus recents d'abord. */
  async listPending(limit?: number): Promise<Reminder[]> {
    const pending = (await db.reminders.toArray())
      .filter((reminder) => !reminder.done)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return typeof limit === 'number' ? pending.slice(0, limit) : pending
  },

  async count(): Promise<number> {
    return db.reminders.count()
  },
}
