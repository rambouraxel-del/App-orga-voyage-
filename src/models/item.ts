import type { EntityId, Timestamped } from './common'

/** Nature de l'element : un cadeau a offrir, ou un objet a emporter/ramener. */
export const ITEM_KINDS = ['cadeau', 'a-ramener'] as const

export type ItemKind = (typeof ITEM_KINDS)[number]

/** Avancement de l'element. */
export const ITEM_STATUSES = ['a-prevoir', 'pret', 'termine'] as const

export type ItemStatus = (typeof ITEM_STATUSES)[number]

export interface EventItem extends Timestamped {
  id: EntityId
  /** Evenement parent. Supprime en cascade avec lui. */
  eventId: EntityId
  label: string
  kind: ItemKind
  /** Personne concernee (destinataire du cadeau, par exemple). */
  forWhom?: string
  quantity: number
  /** Prix unitaire estime en euros. */
  estimatedPrice?: number
  status: ItemStatus
  note?: string
  /**
   * Integrer `estimatedPrice x quantity` au budget previsionnel de l'evenement.
   *
   * Explicite et non deduit : un cadeau deja achete hors budget ne doit pas
   * gonfler artificiellement le total, et l'utilisateur garde la main.
   */
  countInBudget: boolean
}

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  cadeau: 'Cadeau',
  'a-ramener': 'A ramener',
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  'a-prevoir': 'A prevoir',
  pret: 'Achete / prepare',
  termine: 'Termine',
}

export type ItemDraft = Pick<EventItem, 'label' | 'kind' | 'quantity' | 'status' | 'countInBudget'> &
  Partial<Pick<EventItem, 'forWhom' | 'estimatedPrice' | 'note'>>
