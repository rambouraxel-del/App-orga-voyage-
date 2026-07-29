import type { EventDraft } from '@/models'

/** Erreurs indexees par nom de champ, pour un affichage sous le champ fautif. */
export type EventFormErrors = Partial<Record<'title' | 'startDate' | 'endDate', string>>

/** Etat brut du formulaire : dates et heures restent separees comme a l'ecran. */
export interface EventFormValues {
  title: string
  category: string
  /** `AAAA-MM-JJ` (valeur native d'un `<input type="date">`). */
  startDay: string
  /** `HH:MM` (valeur native d'un `<input type="time">`). Ignore si `allDay`. */
  startTime: string
  endDay: string
  endTime: string
  allDay: boolean
  location: string
  description: string
  imageKey: string
  status: string
}

/** `AAAA-MM-JJ` + `HH:MM` -> Date locale. */
export function combineDateTime(day: string, time: string, allDay: boolean): Date | null {
  if (!day) return null
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return null

  let hours = 0
  let minutes = 0
  if (!allDay && time) {
    const [h, m] = time.split(':').map(Number)
    hours = Number.isFinite(h) ? h! : 0
    minutes = Number.isFinite(m) ? m! : 0
  }

  const result = new Date(year, month - 1, date, hours, minutes, 0, 0)
  return Number.isNaN(result.getTime()) ? null : result
}

/**
 * Valide les valeurs saisies.
 * Retourne un objet vide quand tout est correct — les donnees deja saisies ne
 * sont jamais perdues, la validation ne fait que decrire les problemes.
 */
export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = 'Donne un titre a ton evenement.'
  }

  const start = combineDateTime(values.startDay, values.startTime, values.allDay)
  if (!values.startDay) {
    errors.startDate = 'Choisis une date de debut.'
  } else if (!start) {
    errors.startDate = 'Cette date de debut n’est pas valide.'
  }

  // La date de fin est facultative ; on ne la controle que si elle est saisie.
  if (values.endDay) {
    const end = combineDateTime(values.endDay, values.endTime, values.allDay)
    if (!end) {
      errors.endDate = 'Cette date de fin n’est pas valide.'
    } else if (start && end.getTime() < start.getTime()) {
      errors.endDate = 'La fin ne peut pas preceder le debut.'
    }
  } else if (values.endTime && !values.allDay) {
    errors.endDate = 'Precise aussi le jour de fin.'
  }

  return errors
}

export const hasErrors = (errors: EventFormErrors): boolean => Object.keys(errors).length > 0

/**
 * Convertit les valeurs du formulaire en brouillon pret pour la base.
 * A n'appeler qu'apres une validation reussie.
 */
export function toEventDraft(values: EventFormValues): EventDraft {
  const start = combineDateTime(values.startDay, values.startTime, values.allDay)
  const end = values.endDay
    ? combineDateTime(values.endDay, values.endTime, values.allDay)
    : null

  const trimmedLocation = values.location.trim()
  const trimmedDescription = values.description.trim()

  return {
    title: values.title.trim(),
    category: values.category as EventDraft['category'],
    startDate: (start ?? new Date()).toISOString(),
    ...(end ? { endDate: end.toISOString() } : {}),
    allDay: values.allDay,
    ...(trimmedLocation ? { location: trimmedLocation } : {}),
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    ...(values.imageKey ? { imageKey: values.imageKey } : {}),
    status: values.status as EventDraft['status'],
  }
}
