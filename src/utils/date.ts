import type { IsoDateTime } from '@/models'

/** Date/heure courante au format ISO. */
export const nowIso = (): IsoDateTime => new Date().toISOString()

/** Ajoute `days` jours a une date et renvoie la chaine ISO correspondante. */
export function addDays(base: Date | IsoDateTime, days: number): IsoDateTime {
  const d = typeof base === 'string' ? new Date(base) : new Date(base.getTime())
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/** Positionne l'heure locale (h:m) sur une date puis renvoie l'ISO. */
export function atTime(iso: IsoDateTime, hours: number, minutes = 0): IsoDateTime {
  const d = new Date(iso)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

/** `2026-07-28` (fuseau local) — utilise pour nommer le fichier de sauvegarde. */
export function toDateSlug(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const isValid = (d: Date) => !Number.isNaN(d.getTime())

const capitalize = (s: string) => (s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s)

/** `sam. 12 sept.` */
export function formatShortDate(iso: IsoDateTime): string {
  const d = new Date(iso)
  if (!isValid(d)) return '—'
  return capitalize(
    d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
  )
}

/** `12 septembre 2026` */
export function formatLongDate(iso: IsoDateTime): string {
  const d = new Date(iso)
  if (!isValid(d)) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** `20:30` */
export function formatTime(iso: IsoDateTime): string {
  const d = new Date(iso)
  if (!isValid(d)) return '—'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** `12 sept. 2026 a 20:30` — utilise pour la derniere sauvegarde. */
export function formatDateTime(iso: IsoDateTime): string {
  const d = new Date(iso)
  if (!isValid(d)) return '—'
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${date} a ${formatTime(iso)}`
}

/**
 * Plage de dates lisible :
 * - meme jour        -> `12 septembre 2026`
 * - meme mois/annee  -> `12 – 14 septembre 2026`
 * - sinon            -> `28 dec. 2026 – 3 janv. 2027`
 */
export function formatDateRange(startIso: IsoDateTime, endIso: IsoDateTime): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (!isValid(start) || !isValid(end)) return '—'

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  if (sameDay) return formatLongDate(startIso)

  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${start.getDate()} – ${end.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`
  }

  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${start.toLocaleDateString('fr-FR', opts)} – ${end.toLocaleDateString('fr-FR', opts)}`
}

/** Nombre de jours (arrondi au superieur) entre aujourd'hui et `iso`. */
export function daysUntil(iso: IsoDateTime, from: Date = new Date()): number {
  const target = new Date(iso)
  if (!isValid(target)) return 0
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((startOfDay(target) - startOfDay(from)) / 86_400_000)
}

/** `Dans 12 jours`, `Demain`, `Aujourd'hui`, `Il y a 3 jours`. */
export function formatCountdown(iso: IsoDateTime): string {
  const days = daysUntil(iso)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  if (days === -1) return 'Hier'
  if (days > 1) return `Dans ${days} jours`
  return `Il y a ${Math.abs(days)} jours`
}

/** `JUIL.` / `12` — pour la pastille de date de l'agenda. */
export function splitDateBadge(iso: IsoDateTime): { day: string; month: string } {
  const d = new Date(iso)
  if (!isValid(d)) return { day: '--', month: '---' }
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
  }
}
