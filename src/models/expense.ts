import type { EntityId, IsoDateTime, Timestamped } from './common'

/** Poste de depense. */
export const EXPENSE_CATEGORIES = [
  'transport',
  'hebergement',
  'restauration',
  'activites',
  'cadeaux',
  'autre',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/**
 * Depense rattachee a un evenement.
 *
 * Tous les montants sont en euros. AUCUN total n'est stocke : les cumuls
 * (depense, reste, ecart, repartition) sont recalcules a la lecture par
 * `computeBudget`, pour ne jamais avoir deux sources de verite a synchroniser.
 */
export interface Expense extends Timestamped {
  id: EntityId
  /** Evenement parent. Supprime en cascade avec lui. */
  eventId: EntityId
  label: string
  /** Montant en euros. */
  amount: number
  category: ExpenseCategory
  /** Date de la depense. Facultative — une depense peut etre seulement prevue. */
  date?: IsoDateTime
  note?: string
  /** Depense reglee ou simplement engagee. */
  paid: boolean
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Transport',
  hebergement: 'Hebergement',
  restauration: 'Restauration',
  activites: 'Activites',
  cadeaux: 'Cadeaux',
  autre: 'Autre',
}

export type ExpenseDraft = Pick<Expense, 'label' | 'amount' | 'category' | 'paid'> &
  Partial<Pick<Expense, 'date' | 'note'>>
