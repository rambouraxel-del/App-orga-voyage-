import { describe, expect, it } from 'vitest'
import type {
  EventItem,
  Expense,
  TripActivity,
  TripStage,
  TripStay,
  TripTransport,
} from '@/models'
import {
  checkPeriod,
  computeTripBudget,
  compareActivities,
  daysUntilDeparture,
  effectiveCost,
  nightCount,
  nightsWithoutStay,
  overlappingStages,
  tripDays,
} from '../tripRules'

const stamps = { createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:00:00.000Z' }

function makeTransport(overrides: Partial<TripTransport> = {}): TripTransport {
  return {
    id: `tr-${Math.random()}`,
    tripId: 'trip-1',
    mode: 'train',
    from: 'Paris',
    to: 'Nice',
    departure: '2026-09-12T08:30:00.000Z',
    status: 'reserve',
    ...stamps,
    ...overrides,
  }
}

function makeStay(overrides: Partial<TripStay> = {}): TripStay {
  return {
    id: `st-${Math.random()}`,
    tripId: 'trip-1',
    name: 'Hotel',
    kind: 'hotel',
    checkIn: '2026-09-12',
    checkOut: '2026-09-14',
    status: 'reserve',
    ...stamps,
    ...overrides,
  }
}

function makeActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    id: `ac-${Math.random()}`,
    tripId: 'trip-1',
    day: '2026-09-12',
    title: 'Visite',
    category: 'visite',
    bookingRequired: false,
    status: 'prevu',
    order: 0,
    ...stamps,
    ...overrides,
  }
}

function makeStage(overrides: Partial<TripStage> = {}): TripStage {
  return {
    id: `sg-${Math.random()}`,
    tripId: 'trip-1',
    place: 'Nice',
    status: 'prevu',
    order: 0,
    ...stamps,
    ...overrides,
  }
}

function makeExpense(amount: number): Expense {
  return {
    id: `ex-${Math.random()}`,
    eventId: 'evt-1',
    label: 'Depense',
    amount,
    category: 'autre',
    paid: false,
    ...stamps,
  }
}

function makeItem(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: `it-${Math.random()}`,
    eventId: 'evt-1',
    label: 'Objet',
    kind: 'a-ramener',
    quantity: 1,
    status: 'a-prevoir',
    countInBudget: false,
    ...stamps,
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */

describe('tripDays', () => {
  it('genere toutes les journees, bornes comprises', () => {
    const days = tripDays('2026-09-12T08:00:00', '2026-09-14T20:00:00')
    expect(days).toEqual(['2026-09-12', '2026-09-13', '2026-09-14'])
  })

  it('renvoie une seule journee pour un aller-retour dans la journee', () => {
    expect(tripDays('2026-09-12T08:00:00', '2026-09-12T23:00:00')).toEqual(['2026-09-12'])
  })

  it('renvoie une liste vide si la fin precede le debut', () => {
    expect(tripDays('2026-09-14T08:00:00', '2026-09-12T08:00:00')).toEqual([])
  })

  it('renvoie une liste vide pour une date invalide', () => {
    expect(tripDays('pas-une-date', '2026-09-12T08:00:00')).toEqual([])
  })

  it('borne la generation pour une saisie aberrante', () => {
    // Plus de deux ans : on ne genere pas des milliers de journees.
    expect(tripDays('2026-01-01T00:00:00', '2040-01-01T00:00:00')).toHaveLength(731)
  })

  it('traverse un changement de mois et d’annee', () => {
    const days = tripDays('2026-12-30T10:00:00', '2027-01-02T10:00:00')
    expect(days).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
  })
})

describe('nightCount', () => {
  it('compte une nuit de moins que de journees', () => {
    expect(nightCount('2026-09-12T08:00:00', '2026-09-14T20:00:00')).toBe(2)
  })

  it('ne descend jamais sous zero', () => {
    expect(nightCount('2026-09-12T08:00:00', '2026-09-12T20:00:00')).toBe(0)
  })
})

describe('nightsWithoutStay', () => {
  it('couvre les nuits d’arrivee jusqu’a la veille du depart', () => {
    // Un sejour du 12 au 14 couvre les nuits du 12 et du 13, pas celle du 14.
    const stays = [makeStay({ checkIn: '2026-09-12', checkOut: '2026-09-14' })]
    expect(nightsWithoutStay('2026-09-12T08:00:00', '2026-09-14T20:00:00', stays)).toEqual([])
  })

  it('signale les nuits non couvertes', () => {
    const stays = [makeStay({ checkIn: '2026-09-12', checkOut: '2026-09-13' })]
    expect(nightsWithoutStay('2026-09-12T08:00:00', '2026-09-15T20:00:00', stays)).toEqual([
      '2026-09-13',
      '2026-09-14',
    ])
  })

  it('ignore un hebergement annule', () => {
    const stays = [makeStay({ status: 'annule' })]
    expect(nightsWithoutStay('2026-09-12T08:00:00', '2026-09-13T20:00:00', stays)).toEqual([
      '2026-09-12',
    ])
  })

  it('ne renvoie rien pour un voyage d’une seule journee', () => {
    expect(nightsWithoutStay('2026-09-12T08:00:00', '2026-09-12T20:00:00', [])).toEqual([])
  })
})

describe('checkPeriod', () => {
  const trip = { startDate: '2026-09-12T00:00:00', endDate: '2026-09-14T23:59:00' }

  it('bloque une fin anterieure au debut', () => {
    const issues = checkPeriod('2026-09-13', '2026-09-12', trip, 'du sejour')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.level).toBe('erreur')
  })

  it('avertit sans bloquer hors de la periode du voyage', () => {
    const issues = checkPeriod('2026-09-10', '2026-09-11', trip, 'du sejour')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.level).toBe('avertissement')
  })

  it('ne signale rien dans la periode', () => {
    expect(checkPeriod('2026-09-12', '2026-09-13', trip, 'du sejour')).toEqual([])
  })

  it('ne signale rien sans date de debut', () => {
    expect(checkPeriod(undefined, undefined, trip, 'du sejour')).toEqual([])
  })
})

describe('overlappingStages', () => {
  it('detecte deux etapes qui se chevauchent', () => {
    const overlaps = overlappingStages([
      makeStage({ startDate: '2026-09-12T00:00:00', endDate: '2026-09-14T00:00:00' }),
      makeStage({ startDate: '2026-09-13T00:00:00', endDate: '2026-09-15T00:00:00' }),
    ])
    expect(overlaps).toHaveLength(1)
  })

  it('ignore les etapes sans date', () => {
    expect(overlappingStages([makeStage(), makeStage()])).toEqual([])
  })
})

describe('effectiveCost', () => {
  it('retient le montant reel quand il existe', () => {
    expect(effectiveCost(100, 120)).toBe(120)
  })

  it('retombe sur le previsionnel', () => {
    expect(effectiveCost(100, undefined)).toBe(100)
  })

  it('vaut zero sans aucun montant', () => {
    expect(effectiveCost(undefined, undefined)).toBe(0)
  })

  it('retient un reel a zero (achat finalement gratuit)', () => {
    expect(effectiveCost(100, 0)).toBe(0)
  })
})

describe('computeTripBudget', () => {
  it('additionne chaque source une seule fois', () => {
    const summary = computeTripBudget(1000, {
      transports: [makeTransport({ plannedPrice: 89 }), makeTransport({ plannedPrice: 89 })],
      stays: [makeStay({ plannedPrice: 180 })],
      activities: [makeActivity({ plannedCost: 25 })],
      expenses: [makeExpense(60)],
      items: [],
    })
    expect(summary.spent).toBe(443)
    expect(summary.remaining).toBe(557)
    expect(summary.overBudget).toBe(false)
  })

  it('ne compte jamais previsionnel ET reel pour un meme element', () => {
    const summary = computeTripBudget(undefined, {
      transports: [makeTransport({ plannedPrice: 89, actualPrice: 105 })],
      stays: [],
      activities: [],
      expenses: [],
      items: [],
    })
    expect(summary.spent).toBe(105)
  })

  it('exclut les elements annules', () => {
    const summary = computeTripBudget(undefined, {
      transports: [makeTransport({ plannedPrice: 89, status: 'annule' })],
      stays: [makeStay({ plannedPrice: 180, status: 'annule' })],
      activities: [makeActivity({ plannedCost: 25, status: 'annule' })],
      expenses: [],
      items: [],
    })
    expect(summary.spent).toBe(0)
    expect(summary.lines).toEqual([])
  })

  it('ne compte les objets que s’ils sont marques comme budgetes', () => {
    const summary = computeTripBudget(undefined, {
      transports: [],
      stays: [],
      activities: [],
      expenses: [],
      items: [
        makeItem({ estimatedPrice: 20, quantity: 2, countInBudget: true }),
        makeItem({ estimatedPrice: 50, countInBudget: false }),
      ],
    })
    expect(summary.spent).toBe(40)
  })

  it('signale un depassement et l’ecart', () => {
    const summary = computeTripBudget(100, {
      transports: [makeTransport({ plannedPrice: 150 })],
      stays: [],
      activities: [],
      expenses: [],
      items: [],
    })
    expect(summary.overBudget).toBe(true)
    expect(summary.gap).toBe(50)
    expect(summary.percentUsed).toBe(150)
  })

  it('reste exploitable sans enveloppe definie', () => {
    const summary = computeTripBudget(undefined, {
      transports: [makeTransport({ plannedPrice: 89 })],
      stays: [],
      activities: [],
      expenses: [],
      items: [],
    })
    expect(summary.hasPlan).toBe(false)
    expect(summary.percentUsed).toBe(0)
    expect(summary.overBudget).toBe(false)
    expect(summary.spent).toBe(89)
  })

  it('detaille le total par source, sans ligne vide', () => {
    const summary = computeTripBudget(undefined, {
      transports: [makeTransport({ plannedPrice: 89 })],
      stays: [],
      activities: [],
      expenses: [makeExpense(11)],
      items: [],
    })
    expect(summary.lines).toEqual([
      { label: 'Transports', amount: 89 },
      { label: 'Autres depenses', amount: 11 },
    ])
  })
})

describe('daysUntilDeparture', () => {
  it('compte les jours restants', () => {
    const now = new Date('2026-09-01T18:00:00')
    expect(daysUntilDeparture('2026-09-12T08:00:00', now)).toBe(11)
  })

  it('vaut zero le jour du depart, quelle que soit l’heure', () => {
    const now = new Date('2026-09-12T23:00:00')
    expect(daysUntilDeparture('2026-09-12T08:00:00', now)).toBe(0)
  })

  it('devient negatif une fois le voyage commence', () => {
    const now = new Date('2026-09-14T10:00:00')
    expect(daysUntilDeparture('2026-09-12T08:00:00', now)).toBe(-2)
  })
})

describe('compareActivities', () => {
  it('classe les journees dans l’ordre', () => {
    const a = makeActivity({ day: '2026-09-12' })
    const b = makeActivity({ day: '2026-09-13' })
    expect(compareActivities(a, b)).toBeLessThan(0)
  })

  it('classe par horaire dans une meme journee', () => {
    const a = makeActivity({ time: '09:00' })
    const b = makeActivity({ time: '14:00' })
    expect(compareActivities(a, b)).toBeLessThan(0)
  })

  it('place les activites horodatees avant celles sans horaire', () => {
    const a = makeActivity({ time: '09:00' })
    const b = makeActivity({})
    expect(compareActivities(a, b)).toBeLessThan(0)
  })

  it('retombe sur le rang manuel sans horaire', () => {
    const a = makeActivity({ order: 0 })
    const b = makeActivity({ order: 1 })
    expect(compareActivities(a, b)).toBeLessThan(0)
  })
})
