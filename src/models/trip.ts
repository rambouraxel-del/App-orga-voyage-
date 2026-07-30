import type { EntityId, IsoDateTime, Timestamped } from './common'

/**
 * Cycle de vie d'un voyage (V0.5 : ajout de `reserve` et `annule`).
 */
export const TRIP_STATUSES = [
  'idee',
  'preparation',
  'reserve',
  'en-cours',
  'termine',
  'annule',
] as const

export type TripStatus = (typeof TRIP_STATUSES)[number]

/**
 * Voyage.
 *
 * PRINCIPE STRUCTURANT : un voyage est un evenement ENRICHI, pas un systeme
 * parallele. Chaque voyage possede un `eventId` pointant vers un `AppEvent` de
 * categorie « voyage ». Consequences :
 * - le voyage apparait naturellement dans l'agenda et les listes ;
 * - les modules V0.3/V0.4 (participants, taches, depenses, objets, documents)
 *   se rattachent a l'EVENEMENT et sont donc reutilises tels quels, sans
 *   aucune duplication ;
 * - titre, dates et budget sont synchronises dans les deux sens par
 *   `tripsRepository`.
 */
export interface Trip extends Timestamped {
  id: EntityId
  /** Evenement portant ce voyage dans l'agenda. */
  eventId: EntityId
  title: string
  /** Destination principale. */
  destination: string
  /** Lieu de depart. */
  origin?: string
  startDate: IsoDateTime
  endDate: IsoDateTime
  status: TripStatus
  description?: string
  /** Illustration choisie parmi la selection locale. */
  imageKey?: string
  /** Budget global previsionnel, en euros. Miroir de `AppEvent.budget`. */
  budget?: number
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  idee: 'Idee',
  preparation: 'En preparation',
  reserve: 'Reserve',
  'en-cours': 'En cours',
  termine: 'Termine',
  annule: 'Annule',
}

export type TripDraft = Pick<Trip, 'title' | 'destination' | 'startDate' | 'endDate' | 'status'> &
  Partial<Pick<Trip, 'origin' | 'description' | 'imageKey' | 'budget'>>

/* ------------------------------------------------------------------ */
/* Compatibilite V0.1 - V0.4                                           */
/* ------------------------------------------------------------------ */

/** Anciens statuts (`planifie`, `confirme`) vers les nouveaux. */
export const LEGACY_TRIP_STATUS: Record<string, TripStatus> = {
  idee: 'idee',
  planifie: 'preparation',
  confirme: 'reserve',
  'en-cours': 'en-cours',
  termine: 'termine',
  annule: 'annule',
}
