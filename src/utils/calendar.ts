import { startOfDay } from './eventRules'

/** Libelles des jours, semaine demarrant le lundi (usage francais). */
export const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

export const WEEKDAY_FULL = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const

export interface CalendarCell {
  date: Date
  /** Faux pour les jours du mois precedent ou suivant (affiches attenues). */
  inMonth: boolean
  isToday: boolean
}

/** Index 0..6 du jour dans une semaine commencant le lundi. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/**
 * Construit la grille du mois : semaines completes de 7 jours, debordant sur
 * les mois voisins pour que chaque ligne soit pleine.
 */
export function buildMonthGrid(month: Date, today: Date = new Date()): CalendarCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - mondayIndex(first))

  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = new Date(last)
  end.setDate(last.getDate() + (6 - mondayIndex(last)))

  const cells: CalendarCell[] = []
  const cursor = new Date(start)
  const todayStamp = startOfDay(today).getTime()

  while (cursor.getTime() <= end.getTime()) {
    const date = new Date(cursor)
    cells.push({
      date,
      inMonth: date.getMonth() === month.getMonth(),
      isToday: startOfDay(date).getTime() === todayStamp,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return cells
}

/** Premier et dernier jour affiches par la grille du mois. */
export function monthGridBounds(month: Date): { from: Date; to: Date } {
  const cells = buildMonthGrid(month)
  return { from: cells[0]!.date, to: cells[cells.length - 1]!.date }
}

export function addMonths(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1)
}

/** `AAAA-MM-JJ` local — cle de regroupement et parametre d'URL. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
