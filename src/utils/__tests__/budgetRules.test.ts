import { describe, expect, it } from 'vitest'
import type { EventItem, Expense, ExpenseCategory } from '@/models'
import { computeBudget, itemEstimatedTotal, round2 } from '../budgetRules'

function makeExpense(amount: number, category: ExpenseCategory = 'autre', paid = false): Expense {
  return {
    id: `exp-${Math.random()}`,
    eventId: 'evt-1',
    label: 'Depense',
    amount,
    category,
    paid,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  }
}

function makeItem(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: `item-${Math.random()}`,
    eventId: 'evt-1',
    label: 'Cadeau',
    kind: 'cadeau',
    quantity: 1,
    status: 'a-prevoir',
    countInBudget: false,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('budget sans enveloppe definie', () => {
  it('renvoie un etat neutre quand rien n’est saisi', () => {
    const budget = computeBudget(undefined, [])
    expect(budget.hasPlan).toBe(false)
    expect(budget.planned).toBe(0)
    expect(budget.spent).toBe(0)
    expect(budget.percentUsed).toBe(0)
    expect(budget.overBudget).toBe(false)
    expect(budget.breakdown).toEqual([])
  })

  it('ne signale jamais de depassement sans enveloppe', () => {
    const budget = computeBudget(undefined, [makeExpense(500)])
    expect(budget.spent).toBe(500)
    expect(budget.overBudget).toBe(false)
    expect(budget.percentUsed).toBe(0)
  })

  it('traite un budget de 0 comme une absence d’enveloppe', () => {
    expect(computeBudget(0, [makeExpense(10)]).hasPlan).toBe(false)
  })
})

describe('totaux et reste', () => {
  const expenses = [
    makeExpense(120, 'transport', true),
    makeExpense(200, 'hebergement', false),
    makeExpense(80, 'restauration', true),
  ]

  it('additionne toutes les depenses', () => {
    expect(computeBudget(500, expenses).spent).toBe(400)
  })

  it('distingue paye et non paye', () => {
    const budget = computeBudget(500, expenses)
    expect(budget.paid).toBe(200)
    expect(budget.unpaid).toBe(200)
  })

  it('calcule le reste disponible', () => {
    expect(computeBudget(500, expenses).remaining).toBe(100)
  })

  it('calcule le pourcentage consomme', () => {
    expect(computeBudget(500, expenses).percentUsed).toBe(80)
  })

  it('donne un ecart negatif quand on reste sous le budget', () => {
    expect(computeBudget(500, expenses).gap).toBe(-100)
  })
})

describe('depassement de budget', () => {
  it('signale le depassement et un reste negatif', () => {
    const budget = computeBudget(300, [makeExpense(250), makeExpense(120)])
    expect(budget.spent).toBe(370)
    expect(budget.overBudget).toBe(true)
    expect(budget.remaining).toBe(-70)
    expect(budget.gap).toBe(70)
    expect(budget.percentUsed).toBeCloseTo(123.33, 1)
  })

  it('ne signale pas de depassement a l’euro pres', () => {
    const budget = computeBudget(100, [makeExpense(100)])
    expect(budget.overBudget).toBe(false)
    expect(budget.remaining).toBe(0)
    expect(budget.percentUsed).toBe(100)
  })
})

describe('repartition par categorie', () => {
  it('regroupe, trie du plus gros au plus petit et exclut les postes vides', () => {
    const budget = computeBudget(1000, [
      makeExpense(100, 'transport'),
      makeExpense(50, 'transport'),
      makeExpense(300, 'hebergement'),
    ])
    expect(budget.breakdown.map((entry) => entry.category)).toEqual(['hebergement', 'transport'])
    expect(budget.breakdown[0]?.amount).toBe(300)
    expect(budget.breakdown[1]?.amount).toBe(150)
  })

  it('donne des parts qui totalisent 100 %', () => {
    const budget = computeBudget(1000, [makeExpense(250, 'transport'), makeExpense(750, 'activites')])
    const totalShare = budget.breakdown.reduce((sum, entry) => sum + entry.share, 0)
    expect(totalShare).toBeCloseTo(100, 5)
  })
})

describe('cadeaux integres au budget', () => {
  it('ignore les elements non marques', () => {
    const budget = computeBudget(200, [], [makeItem({ estimatedPrice: 50 })])
    expect(budget.fromItems).toBe(0)
    expect(budget.spent).toBe(0)
  })

  it('compte prix unitaire x quantite pour les elements marques', () => {
    const budget = computeBudget(
      200,
      [],
      [makeItem({ estimatedPrice: 25, quantity: 3, countInBudget: true })],
    )
    expect(budget.fromItems).toBe(75)
    expect(budget.spent).toBe(75)
  })

  it('alimente le poste « cadeaux » de la repartition', () => {
    const budget = computeBudget(
      200,
      [makeExpense(25, 'cadeaux')],
      [makeItem({ estimatedPrice: 50, countInBudget: true })],
    )
    const cadeaux = budget.breakdown.find((entry) => entry.category === 'cadeaux')
    expect(cadeaux?.amount).toBe(75)
  })

  it('peut declencher un depassement a lui seul', () => {
    const budget = computeBudget(
      50,
      [],
      [makeItem({ estimatedPrice: 40, quantity: 2, countInBudget: true })],
    )
    expect(budget.overBudget).toBe(true)
    expect(budget.gap).toBe(30)
  })

  it('ignore un element sans prix estime', () => {
    expect(itemEstimatedTotal(makeItem({ countInBudget: true }))).toBe(0)
  })
})

describe('robustesse des montants', () => {
  it('ignore un montant non numerique plutot que de propager NaN', () => {
    const broken = { ...makeExpense(10), amount: Number.NaN }
    expect(computeBudget(100, [broken]).spent).toBe(0)
  })

  it('arrondit au centime', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(computeBudget(10, [makeExpense(0.1), makeExpense(0.2)]).spent).toBe(0.3)
  })
})
