import type { EntityId, IsoDateTime, Timestamped } from './common'

/** Cycle de vie d'un voyage. */
export const TRIP_STATUSES = ['idee', 'planifie', 'confirme', 'en-cours', 'termine'] as const

export type TripStatus = (typeof TRIP_STATUSES)[number]

export interface Trip extends Timestamped {
  id: EntityId
  title: string
  destination: string
  startDate: IsoDateTime
  endDate: IsoDateTime
  status: TripStatus
  /**
   * Illustration facultative.
   * V0.1 : identifiant d'illustration interne (ex. `illustration:plage`).
   * Les images importees par l'utilisateur sont hors perimetre.
   */
  image?: string
  /** Notes libres. */
  notes?: string
  /** Budget previsionnel en euros (prepare la rubrique Budget). */
  budget?: number
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  idee: 'Idee',
  planifie: 'Planifie',
  confirme: 'Confirme',
  'en-cours': 'En cours',
  termine: 'Termine',
}
