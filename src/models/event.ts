import type { EntityId, IsoDateTime, Timestamped } from './common'

/** Categorie d'un evenement. Sert au picto et a la couleur d'accent. */
export const EVENT_TYPES = [
  'sortie',
  'soiree',
  'concert',
  'weekend',
  'voyage',
  'anniversaire',
  'restaurant',
  'autre',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

/** Cycle de vie d'un evenement. */
export const EVENT_STATUSES = ['idee', 'planifie', 'confirme', 'passe', 'annule'] as const

export type EventStatus = (typeof EVENT_STATUSES)[number]

export interface AppEvent extends Timestamped {
  id: EntityId
  title: string
  type: EventType
  /** Debut (ISO). Index principal de tri de l'agenda. */
  startDate: IsoDateTime
  /** Fin (ISO). Egale a `startDate` pour un evenement ponctuel. */
  endDate: IsoDateTime
  location: string
  description: string
  status: EventStatus
  /** Nombre de participants attendus. Optionnel : renseigne par la V0.1 fictive. */
  participants?: number
  /** Rattachement facultatif a un voyage (prepare la V0.2). */
  tripId?: EntityId
  /** Budget previsionnel en euros (prepare la rubrique Budget). */
  budget?: number
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sortie: 'Sortie',
  soiree: 'Soiree',
  concert: 'Concert',
  weekend: 'Week-end',
  voyage: 'Voyage',
  anniversaire: 'Anniversaire',
  restaurant: 'Restaurant',
  autre: 'Autre',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  idee: 'Idee',
  planifie: 'Planifie',
  confirme: 'Confirme',
  passe: 'Passe',
  annule: 'Annule',
}
