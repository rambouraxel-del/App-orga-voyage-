import type { EntityId, Timestamped } from './common'

/**
 * Petit pense-bete ("A ne pas oublier", "Cadeaux & a ramener").
 * V0.1 : lecture seule, alimente par les donnees de demonstration.
 */
export const REMINDER_CATEGORIES = ['a-preparer', 'cadeau', 'a-ramener', 'administratif'] as const

export type ReminderCategory = (typeof REMINDER_CATEGORIES)[number]

export interface Reminder extends Timestamped {
  id: EntityId
  label: string
  category: ReminderCategory
  done: boolean
  /** Rattachement facultatif a un evenement ou un voyage. */
  eventId?: EntityId
  tripId?: EntityId
}

export const REMINDER_CATEGORY_LABELS: Record<ReminderCategory, string> = {
  'a-preparer': 'A preparer',
  cadeau: 'Cadeau',
  'a-ramener': 'A ramener',
  administratif: 'Administratif',
}
