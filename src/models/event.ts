import type { EntityId, IsoDateTime, Timestamped } from './common'

/**
 * Categorie d'un evenement (V0.2 : renomme depuis `type` en V0.1).
 * Sert au picto, a la couleur d'accent et au filtre de la page Evenements.
 */
export const EVENT_CATEGORIES = [
  'sortie',
  'soiree',
  'anniversaire',
  'concert',
  'restaurant',
  'weekend',
  'voyage',
  'autre',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

/**
 * Statut MANUEL d'un evenement.
 *
 * Attention : « passe » n'est pas un statut. Le caractere passe d'un evenement
 * se DEDUIT de ses dates (cf. `isPastEvent`), il n'est jamais stocke — sinon il
 * faudrait le recalculer en base a chaque ouverture de l'application.
 * Le statut `termine` est celui que l'utilisateur pose lui-meme.
 */
export const EVENT_STATUSES = ['idee', 'planifie', 'confirme', 'termine', 'annule'] as const

export type EventStatus = (typeof EVENT_STATUSES)[number]

export interface AppEvent extends Timestamped {
  id: EntityId
  title: string
  category: EventCategory
  /** Debut (ISO). Seul champ de date obligatoire. */
  startDate: IsoDateTime
  /** Fin (ISO). Absente pour un evenement ponctuel. */
  endDate?: IsoDateTime
  /** Journee entiere : les heures sont ignorees a l'affichage. */
  allDay: boolean
  location?: string
  description?: string
  /** Illustration choisie parmi la selection locale (cf. `ILLUSTRATION_CHOICES`). */
  imageKey?: string
  status: EventStatus

  /* --- Champs conserves depuis la V0.1, hors perimetre V0.2 --------------- */
  /** Nombre de participants. La gestion des participants arrivera plus tard. */
  participants?: number
  /** Rattachement a un voyage. Le gestionnaire de voyage arrivera plus tard. */
  tripId?: EntityId
  /** Budget previsionnel. La rubrique Budget arrivera plus tard. */
  budget?: number
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  sortie: 'Sortie',
  soiree: 'Soiree',
  anniversaire: 'Anniversaire',
  concert: 'Concert',
  restaurant: 'Restaurant',
  weekend: 'Week-end',
  voyage: 'Voyage',
  autre: 'Autre',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  idee: 'Idee',
  planifie: 'Planifie',
  confirme: 'Confirme',
  termine: 'Termine',
  annule: 'Annule',
}

/** Donnees saisies dans le formulaire, avant creation/mise a jour. */
export type EventDraft = Pick<AppEvent, 'title' | 'category' | 'startDate' | 'allDay' | 'status'> &
  Partial<Pick<AppEvent, 'endDate' | 'location' | 'description' | 'imageKey'>>

/* ------------------------------------------------------------------ */
/* Compatibilite V0.1                                                  */
/* ------------------------------------------------------------------ */

/**
 * Categories telles que nommees en V0.1 (champ `type`).
 * `weekend` et `voyage` existaient deja a l'identique.
 */
export const LEGACY_TYPE_TO_CATEGORY: Record<string, EventCategory> = {
  sortie: 'sortie',
  soiree: 'soiree',
  concert: 'concert',
  weekend: 'weekend',
  voyage: 'voyage',
  anniversaire: 'anniversaire',
  restaurant: 'restaurant',
  autre: 'autre',
}

/**
 * Statuts V0.1 -> V0.2.
 * `passe` disparait : il devient `termine`, le caractere passe etant desormais
 * calcule a partir des dates.
 */
export const LEGACY_STATUS_TO_STATUS: Record<string, EventStatus> = {
  idee: 'idee',
  planifie: 'planifie',
  confirme: 'confirme',
  passe: 'termine',
  annule: 'annule',
}
