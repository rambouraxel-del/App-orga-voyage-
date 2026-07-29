import {
  EXPENSE_CATEGORIES,
  type EventItem,
  type Expense,
  type ExpenseCategory,
} from '@/models'

/**
 * Calculs budgetaires.
 *
 * Regle structurante : AUCUN total n'est stocke en base. Tout est recalcule a
 * la lecture a partir des depenses et du budget previsionnel de l'evenement.
 * On evite ainsi deux sources de verite qui divergeraient au premier oubli de
 * mise a jour.
 */

export interface CategoryBreakdown {
  category: ExpenseCategory
  amount: number
  /** Part du total depense, en pourcentage (0 si rien n'est depense). */
  share: number
}

export interface BudgetSummary {
  /** Enveloppe prevue, saisie sur l'evenement. 0 si aucun budget defini. */
  planned: number
  /** Vrai si l'utilisateur a reellement defini une enveloppe. */
  hasPlan: boolean
  /** Total de toutes les depenses (payees ou non) + cadeaux comptes au budget. */
  spent: number
  /** Total des seules depenses reglees. */
  paid: number
  /** Total engage mais pas encore regle. */
  unpaid: number
  /** Part des cadeaux/objets estimes, incluse dans `spent`. */
  fromItems: number
  /** Reste disponible. Negatif en cas de depassement. */
  remaining: number
  /** Ecart au budget : positif = depassement, negatif = economie. */
  gap: number
  /** Pourcentage consomme (0 si aucune enveloppe definie). */
  percentUsed: number
  /** Vrai si les depenses depassent l'enveloppe prevue. */
  overBudget: boolean
  /** Repartition par poste, triee du plus gros au plus petit, postes vides exclus. */
  breakdown: CategoryBreakdown[]
  expenseCount: number
}

/** Montant estime d'un element (prix unitaire x quantite). */
export function itemEstimatedTotal(item: Pick<EventItem, 'estimatedPrice' | 'quantity'>): number {
  if (typeof item.estimatedPrice !== 'number' || !Number.isFinite(item.estimatedPrice)) return 0
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
  return item.estimatedPrice * quantity
}

/**
 * Synthese budgetaire d'un evenement.
 *
 * @param planned  Enveloppe prevue (champ `budget` de l'evenement).
 * @param expenses Depenses rattachees.
 * @param items    Cadeaux et objets ; seuls ceux marques `countInBudget` comptent.
 */
export function computeBudget(
  planned: number | undefined,
  expenses: Expense[],
  items: EventItem[] = [],
): BudgetSummary {
  const hasPlan = typeof planned === 'number' && Number.isFinite(planned) && planned > 0
  const plannedTotal = hasPlan ? planned! : 0

  const expenseTotal = expenses.reduce((sum, e) => sum + safeAmount(e.amount), 0)
  const paid = expenses.reduce((sum, e) => (e.paid ? sum + safeAmount(e.amount) : sum), 0)

  const fromItems = items
    .filter((item) => item.countInBudget)
    .reduce((sum, item) => sum + itemEstimatedTotal(item), 0)

  const spent = round2(expenseTotal + fromItems)
  const remaining = round2(plannedTotal - spent)

  const totals = new Map<ExpenseCategory, number>()
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + safeAmount(expense.amount))
  }
  // Les cadeaux comptes au budget alimentent le poste « cadeaux », pour que la
  // repartition additionne bien le total depense.
  if (fromItems > 0) {
    totals.set('cadeaux', (totals.get('cadeaux') ?? 0) + fromItems)
  }

  const breakdown: CategoryBreakdown[] = EXPENSE_CATEGORIES.map((category) => {
    const amount = round2(totals.get(category) ?? 0)
    return { category, amount, share: spent > 0 ? round2((amount / spent) * 100) : 0 }
  })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  return {
    planned: plannedTotal,
    hasPlan,
    spent,
    paid: round2(paid),
    unpaid: round2(expenseTotal - paid),
    fromItems: round2(fromItems),
    remaining,
    gap: round2(spent - plannedTotal),
    percentUsed: hasPlan ? round2((spent / plannedTotal) * 100) : 0,
    overBudget: hasPlan && spent > plannedTotal,
    breakdown,
    expenseCount: expenses.length,
  }
}

/** Ignore les montants non numeriques plutot que de propager un NaN. */
function safeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0
}

/** Arrondi au centime — evite les 0.1 + 0.2 = 0.30000000000000004. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}
