import type { AppEvent, IsoDateTime } from '@/models'

/**
 * Regles metier des evenements — volontairement pures et sans dependance a
 * Dexie ni a React, pour rester testables et reutilisables (accueil, agenda,
 * liste, fiche).
 */

/** Fin effective : `endDate` si presente, sinon `startDate`. */
export function effectiveEnd(event: Pick<AppEvent, 'startDate' | 'endDate'>): IsoDateTime {
  return event.endDate ?? event.startDate
}

/**
 * Instant a partir duquel l'evenement est reellement termine.
 *
 * Pour un evenement « toute la journee », l'heure stockee vaut 00:00 : il ne
 * doit pas basculer en « passe » des le matin, mais a la fin de sa journee.
 */
export function endInstant(event: Pick<AppEvent, 'startDate' | 'endDate' | 'allDay'>): Date {
  const end = new Date(effectiveEnd(event))
  if (event.allDay) end.setHours(23, 59, 59, 999)
  return end
}

/** Vrai si l'evenement est termine d'apres ses dates. */
export function isPastEvent(
  event: Pick<AppEvent, 'startDate' | 'endDate' | 'allDay'>,
  now: Date = new Date(),
): boolean {
  return endInstant(event).getTime() < now.getTime()
}

/** Vrai si l'evenement est en cours (commence et pas encore termine). */
export function isOngoingEvent(
  event: Pick<AppEvent, 'startDate' | 'endDate' | 'allDay'>,
  now: Date = new Date(),
): boolean {
  return new Date(event.startDate).getTime() <= now.getTime() && !isPastEvent(event, now)
}

/** Vrai si l'evenement s'etale sur plusieurs jours calendaires. */
export function isMultiDay(event: Pick<AppEvent, 'startDate' | 'endDate'>): boolean {
  const start = new Date(event.startDate)
  const end = new Date(effectiveEnd(event))
  return !isSameDay(start, end)
}

/** Nombre de journees calendaires couvertes (1 minimum). */
export function dayCount(event: Pick<AppEvent, 'startDate' | 'endDate'>): number {
  const start = startOfDay(new Date(event.startDate))
  const end = startOfDay(new Date(effectiveEnd(event)))
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
}

/**
 * Vrai si l'evenement est « a venir » au sens de l'application : ni passe,
 * ni annule. Un evenement en cours reste a venir tant qu'il n'est pas fini.
 */
export function isUpcoming(event: AppEvent, now: Date = new Date()): boolean {
  return event.status !== 'annule' && !isPastEvent(event, now)
}

/** Tri chronologique croissant, puis par titre pour un ordre stable. */
export function compareByStart(a: AppEvent, b: AppEvent): number {
  const delta = a.startDate.localeCompare(b.startDate)
  return delta !== 0 ? delta : a.title.localeCompare(b.title, 'fr')
}

/** Tri chronologique decroissant — utilise pour les evenements passes. */
export function compareByStartDesc(a: AppEvent, b: AppEvent): number {
  return -compareByStart(a, b)
}

/**
 * Vrai si l'evenement recouvre le jour donne, bornes comprises.
 * Un week-end du 2 au 4 aout occupe donc les 2, 3 et 4.
 */
export function occursOnDay(
  event: Pick<AppEvent, 'startDate' | 'endDate'>,
  day: Date,
): boolean {
  const target = startOfDay(day).getTime()
  const start = startOfDay(new Date(event.startDate)).getTime()
  const end = startOfDay(new Date(effectiveEnd(event))).getTime()
  return target >= start && target <= end
}

/** Vrai si l'evenement recouvre au moins un jour de l'intervalle [from, to]. */
export function overlapsRange(
  event: Pick<AppEvent, 'startDate' | 'endDate'>,
  from: Date,
  to: Date,
): boolean {
  const start = startOfDay(new Date(event.startDate)).getTime()
  const end = startOfDay(new Date(effectiveEnd(event))).getTime()
  return end >= startOfDay(from).getTime() && start <= startOfDay(to).getTime()
}

/**
 * Recherche plein texte sur titre, lieu et description.
 * Insensible a la casse et aux accents, pour que « soiree » trouve « soirée ».
 */
export function matchesQuery(event: AppEvent, query: string): boolean {
  const needle = normalize(query)
  if (needle.length === 0) return true
  return [event.title, event.location ?? '', event.description ?? '']
    .map(normalize)
    .some((haystack) => haystack.includes(needle))
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Minuscules sans diacritiques. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
