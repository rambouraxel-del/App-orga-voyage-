import type {
  EventItem,
  Expense,
  TripActivity,
  TripStage,
  TripStay,
  TripTransport,
} from '@/models'
import { round2 } from './budgetRules'
import { dayKey } from './calendar'
import { startOfDay } from './eventRules'

/* ------------------------------------------------------------------ */
/* Journees du voyage                                                  */
/* ------------------------------------------------------------------ */

/**
 * Genere la liste des journees couvertes par le voyage, bornes comprises.
 *
 * Renvoie des cles `AAAA-MM-JJ` : le programme se regroupe alors par simple
 * egalite de chaine, sans piege de fuseau horaire.
 */
export function tripDays(startIso: string, endIso: string): string[] {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const cursor = startOfDay(start)
  const last = startOfDay(end)
  if (last.getTime() < cursor.getTime()) return []

  const days: string[] = []
  // Garde-fou : un voyage de plus de deux ans releve d'une saisie erronee, on
  // ne genere pas des milliers de journees pour autant.
  const MAX_DAYS = 731
  while (cursor.getTime() <= last.getTime() && days.length < MAX_DAYS) {
    days.push(dayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/** Nombre de nuits du voyage (journees - 1, jamais negatif). */
export function nightCount(startIso: string, endIso: string): number {
  return Math.max(0, tripDays(startIso, endIso).length - 1)
}

/**
 * Nuits sans hebergement enregistre.
 *
 * Une nuit va du jour J au jour J+1 : un sejour du 2 au 5 couvre les nuits du
 * 2, 3 et 4 — pas celle du 5, jour du depart.
 */
export function nightsWithoutStay(
  startIso: string,
  endIso: string,
  stays: TripStay[],
): string[] {
  const nights = tripDays(startIso, endIso).slice(0, -1)
  if (nights.length === 0) return []

  const covered = new Set<string>()
  for (const stay of stays) {
    if (stay.status === 'annule') continue
    for (const night of tripDays(`${stay.checkIn}T12:00:00`, `${stay.checkOut}T12:00:00`).slice(
      0,
      -1,
    )) {
      covered.add(night)
    }
  }

  return nights.filter((night) => !covered.has(night))
}

/* ------------------------------------------------------------------ */
/* Coherence des dates                                                 */
/* ------------------------------------------------------------------ */

export interface DateIssue {
  /** Gravite : `erreur` bloque l'enregistrement, `avertissement` informe. */
  level: 'erreur' | 'avertissement'
  message: string
}

/** Verifie qu'une periode est coherente et tient dans celle du voyage. */
export function checkPeriod(
  startDay: string | undefined,
  endDay: string | undefined,
  trip: { startDate: string; endDate: string },
  label: string,
): DateIssue[] {
  const issues: DateIssue[] = []
  if (!startDay) return issues

  if (endDay && endDay < startDay) {
    issues.push({ level: 'erreur', message: `La fin ${label} precede son debut.` })
    return issues
  }

  // Hors periode : simple avertissement. On ne bloque pas — un vol de retour
  // le lendemain, ou une nuit d'avant-depart, sont des cas legitimes.
  const tripStart = dayKey(new Date(trip.startDate))
  const tripEnd = dayKey(new Date(trip.endDate))
  if (startDay < tripStart || (endDay ?? startDay) > tripEnd) {
    issues.push({
      level: 'avertissement',
      message: `Cette periode deborde des dates du voyage (${tripStart} → ${tripEnd}).`,
    })
  }

  return issues
}

/** Etapes dont les periodes se chevauchent, signalees sans blocage. */
export function overlappingStages(stages: TripStage[]): Array<[TripStage, TripStage]> {
  const dated = stages
    .filter((stage) => stage.startDate)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))

  const overlaps: Array<[TripStage, TripStage]> = []
  for (let i = 0; i < dated.length - 1; i++) {
    const current = dated[i]!
    const next = dated[i + 1]!
    const currentEnd = current.endDate ?? current.startDate!
    if (next.startDate! < currentEnd) overlaps.push([current, next])
  }
  return overlaps
}

/* ------------------------------------------------------------------ */
/* Budget du voyage                                                    */
/* ------------------------------------------------------------------ */

export interface TripBudgetLine {
  label: string
  amount: number
}

export interface TripBudgetSummary {
  planned: number
  hasPlan: boolean
  /** Total engage, toutes sources confondues, sans double compte. */
  spent: number
  remaining: number
  gap: number
  percentUsed: number
  overBudget: boolean
  /** Detail par source, pour rendre le total verifiable a l'oeil. */
  lines: TripBudgetLine[]
}

/** Montant retenu : le reel s'il existe, sinon le previsionnel. */
export function effectiveCost(planned?: number, actual?: number): number {
  if (typeof actual === 'number' && Number.isFinite(actual)) return actual
  if (typeof planned === 'number' && Number.isFinite(planned)) return planned
  return 0
}

/**
 * Budget consolide d'un voyage.
 *
 * REGLE ANTI-DOUBLON : chaque element n'est compte qu'une fois, depuis une
 * source unique.
 * - transports, hebergements et activites portent leur propre prix ;
 * - les `expenses` generiques couvrent tout le reste ;
 * - un element annule ne compte pas.
 *
 * Pour un element donne on retient le montant REEL s'il est saisi, sinon le
 * previsionnel — jamais les deux.
 */
export function computeTripBudget(
  planned: number | undefined,
  parts: {
    transports: TripTransport[]
    stays: TripStay[]
    activities: TripActivity[]
    expenses: Expense[]
    items: EventItem[]
  },
): TripBudgetSummary {
  const hasPlan = typeof planned === 'number' && Number.isFinite(planned) && planned > 0
  const plannedTotal = hasPlan ? planned! : 0

  const transports = parts.transports
    .filter((t) => t.status !== 'annule')
    .reduce((sum, t) => sum + effectiveCost(t.plannedPrice, t.actualPrice), 0)

  const stays = parts.stays
    .filter((s) => s.status !== 'annule')
    .reduce((sum, s) => sum + effectiveCost(s.plannedPrice, s.actualPrice), 0)

  const activities = parts.activities
    .filter((a) => a.status !== 'annule')
    .reduce((sum, a) => sum + effectiveCost(a.plannedCost, a.actualCost), 0)

  const expenses = parts.expenses.reduce(
    (sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0),
    0,
  )

  const items = parts.items
    .filter((item) => item.countInBudget)
    .reduce((sum, item) => {
      const price = typeof item.estimatedPrice === 'number' ? item.estimatedPrice : 0
      const quantity = item.quantity > 0 ? item.quantity : 1
      return sum + price * quantity
    }, 0)

  const spent = round2(transports + stays + activities + expenses + items)

  const lines: TripBudgetLine[] = [
    { label: 'Transports', amount: round2(transports) },
    { label: 'Hebergements', amount: round2(stays) },
    { label: 'Activites', amount: round2(activities) },
    { label: 'Autres depenses', amount: round2(expenses) },
    { label: 'Cadeaux & objets', amount: round2(items) },
  ].filter((line) => line.amount > 0)

  return {
    planned: plannedTotal,
    hasPlan,
    spent,
    remaining: round2(plannedTotal - spent),
    gap: round2(spent - plannedTotal),
    percentUsed: hasPlan ? round2((spent / plannedTotal) * 100) : 0,
    overBudget: hasPlan && spent > plannedTotal,
    lines,
  }
}

/* ------------------------------------------------------------------ */
/* Divers                                                              */
/* ------------------------------------------------------------------ */

/** Jours restants avant le depart. Negatif si le voyage a commence. */
export function daysUntilDeparture(startIso: string, now: Date = new Date()): number {
  const start = startOfDay(new Date(startIso)).getTime()
  return Math.round((start - startOfDay(now).getTime()) / 86_400_000)
}

/** Tri chronologique des transports. */
export const compareTransports = (a: TripTransport, b: TripTransport): number =>
  a.departure.localeCompare(b.departure)

/** Tri des hebergements par date d'arrivee. */
export const compareStays = (a: TripStay, b: TripStay): number => a.checkIn.localeCompare(b.checkIn)

/** Tri des activites d'une journee : horaires d'abord, puis rang manuel. */
export function compareActivities(a: TripActivity, b: TripActivity): number {
  if (a.day !== b.day) return a.day.localeCompare(b.day)
  if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time)
  if (Boolean(a.time) !== Boolean(b.time)) return a.time ? -1 : 1
  return a.order - b.order
}

/** Tri des etapes par rang d'itineraire. */
export const compareStages = (a: TripStage, b: TripStage): number => a.order - b.order
