import type { EntityId, IsoDateTime, Timestamped } from './common'

/**
 * Contenu d'un voyage : etapes, activites, transports, hebergements.
 *
 * Tout est relie au voyage par `tripId` et supprime en cascade avec lui.
 * Aucun total n'est stocke : les cumuls budgetaires sont recalcules a la
 * lecture (cf. `computeTripBudget`).
 */

/* ------------------------------------------------------------------ */
/* Etapes de l'itineraire                                              */
/* ------------------------------------------------------------------ */

export const STAGE_STATUSES = ['idee', 'prevu', 'reserve', 'fait'] as const
export type StageStatus = (typeof STAGE_STATUSES)[number]

export interface TripStage extends Timestamped {
  id: EntityId
  tripId: EntityId
  /** Ville ou lieu de l'etape. */
  place: string
  address?: string
  /** Dates facultatives : une etape peut n'etre qu'une intention. */
  startDate?: IsoDateTime
  endDate?: IsoDateTime
  note?: string
  status: StageStatus
  /** Rang dans l'itineraire, reattribue a chaque reordonnancement. */
  order: number
}

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  idee: 'Idee',
  prevu: 'Prevu',
  reserve: 'Reserve',
  fait: 'Fait',
}

export type StageDraft = Pick<TripStage, 'place' | 'status'> &
  Partial<Pick<TripStage, 'address' | 'startDate' | 'endDate' | 'note'>>

/* ------------------------------------------------------------------ */
/* Programme quotidien                                                 */
/* ------------------------------------------------------------------ */

export const ACTIVITY_CATEGORIES = [
  'visite',
  'restaurant',
  'nature',
  'culture',
  'detente',
  'shopping',
  'sortie',
  'autre',
] as const
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]

export const ACTIVITY_STATUSES = ['idee', 'prevu', 'reserve', 'realise', 'annule'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export interface TripActivity extends Timestamped {
  id: EntityId
  tripId: EntityId
  /**
   * Journee de rattachement au format `AAAA-MM-JJ` (heure locale).
   *
   * Volontairement une chaine de JOUR et non un instant : deplacer une
   * activite vers une autre date ne doit pas dependre d'un fuseau horaire,
   * et le regroupement par journee devient une simple egalite de cle.
   */
  day: string
  /** `HH:MM`. Absent pour une activite sans horaire precis. */
  time?: string
  title: string
  place?: string
  category: ActivityCategory
  /** Reservation necessaire. */
  bookingRequired: boolean
  plannedCost?: number
  actualCost?: number
  note?: string
  status: ActivityStatus
  /** Rang dans la journee. */
  order: number
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  visite: 'Visite',
  restaurant: 'Restaurant',
  nature: 'Nature',
  culture: 'Culture',
  detente: 'Detente',
  shopping: 'Shopping',
  sortie: 'Sortie',
  autre: 'Autre',
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  idee: 'Idee',
  prevu: 'Prevu',
  reserve: 'Reserve',
  realise: 'Realise',
  annule: 'Annule',
}

export type ActivityDraft = Pick<
  TripActivity,
  'title' | 'day' | 'category' | 'bookingRequired' | 'status'
> &
  Partial<Pick<TripActivity, 'time' | 'place' | 'plannedCost' | 'actualCost' | 'note'>>

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

export const TRANSPORT_MODES = [
  'avion',
  'train',
  'voiture',
  'bus',
  'bateau',
  'local',
  'autre',
] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

export const BOOKING_STATUSES = ['a-reserver', 'reserve', 'paye', 'effectue', 'annule'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export interface TripTransport extends Timestamped {
  id: EntityId
  tripId: EntityId
  mode: TransportMode
  from: string
  to: string
  departure: IsoDateTime
  arrival?: IsoDateTime
  company?: string
  reference?: string
  plannedPrice?: number
  actualPrice?: number
  status: BookingStatus
  note?: string
}

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  avion: 'Avion',
  train: 'Train',
  voiture: 'Voiture',
  bus: 'Bus',
  bateau: 'Bateau',
  local: 'Transport local',
  autre: 'Autre',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  'a-reserver': 'A reserver',
  reserve: 'Reserve',
  paye: 'Paye',
  effectue: 'Effectue',
  annule: 'Annule',
}

export type TransportDraft = Pick<
  TripTransport,
  'mode' | 'from' | 'to' | 'departure' | 'status'
> &
  Partial<
    Pick<
      TripTransport,
      'arrival' | 'company' | 'reference' | 'plannedPrice' | 'actualPrice' | 'note'
    >
  >

/* ------------------------------------------------------------------ */
/* Hebergements                                                        */
/* ------------------------------------------------------------------ */

export const STAY_KINDS = ['hotel', 'location', 'chez-lami', 'camping', 'auberge', 'autre'] as const
export type StayKind = (typeof STAY_KINDS)[number]

export interface TripStay extends Timestamped {
  id: EntityId
  tripId: EntityId
  name: string
  kind: StayKind
  address?: string
  /** Nuit d'arrivee (`AAAA-MM-JJ`). */
  checkIn: string
  /** Jour de depart (`AAAA-MM-JJ`). La derniere nuit est la veille. */
  checkOut: string
  checkInTime?: string
  checkOutTime?: string
  contact?: string
  reference?: string
  plannedPrice?: number
  actualPrice?: number
  status: BookingStatus
  note?: string
}

export const STAY_KIND_LABELS: Record<StayKind, string> = {
  hotel: 'Hotel',
  location: 'Location',
  'chez-lami': 'Chez des amis',
  camping: 'Camping',
  auberge: 'Auberge',
  autre: 'Autre',
}

export type StayDraft = Pick<TripStay, 'name' | 'kind' | 'checkIn' | 'checkOut' | 'status'> &
  Partial<
    Pick<
      TripStay,
      | 'address'
      | 'checkInTime'
      | 'checkOutTime'
      | 'contact'
      | 'reference'
      | 'plannedPrice'
      | 'actualPrice'
      | 'note'
    >
  >

/* ------------------------------------------------------------------ */
/* Associations de documents                                           */
/* ------------------------------------------------------------------ */

export const DOCUMENT_LINK_TARGETS = ['transport', 'stay', 'activity', 'stage'] as const
export type DocumentLinkTarget = (typeof DOCUMENT_LINK_TARGETS)[number]

/**
 * Rattache un document a un element precis du voyage.
 *
 * Table de liaison plutot qu'un champ sur le document : un meme billet peut
 * concerner plusieurs elements, et retirer une association ne doit jamais
 * toucher au fichier.
 */
export interface DocumentLink {
  id: EntityId
  documentId: EntityId
  targetType: DocumentLinkTarget
  targetId: EntityId
  createdAt: IsoDateTime
}
