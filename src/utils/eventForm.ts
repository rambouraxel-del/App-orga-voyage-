import type { AppEvent } from '@/models'
import { nextRoundHour, toDayInput, toTimeInput } from './date'
import type { EventFormValues } from './eventValidation'

/**
 * Valeurs par defaut d'une creation.
 *
 * Objectif : pouvoir enregistrer en deux gestes. On pre-remplit la date du
 * jour (ou celle selectionnee dans l'agenda) et la prochaine heure pleine, avec
 * une fin une heure plus tard.
 *
 * @param day Jour pre-selectionne au format `AAAA-MM-JJ`.
 */
export function emptyFormValues(day?: string): EventFormValues {
  const start = nextRoundHour()
  if (day) {
    const [year, month, date] = day.split('-').map(Number)
    if (year && month && date) start.setFullYear(year, month - 1, date)
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  return {
    title: '',
    category: 'sortie',
    startDay: toDayInput(start.toISOString()),
    startTime: toTimeInput(start.toISOString()),
    endDay: toDayInput(end.toISOString()),
    endTime: toTimeInput(end.toISOString()),
    allDay: false,
    location: '',
    description: '',
    imageKey: '',
    status: 'planifie',
  }
}

/** Pre-remplit le formulaire a partir d'un evenement existant. */
export function formValuesFromEvent(event: AppEvent): EventFormValues {
  return {
    title: event.title,
    category: event.category,
    startDay: toDayInput(event.startDate),
    startTime: toTimeInput(event.startDate),
    endDay: toDayInput(event.endDate),
    endTime: toTimeInput(event.endDate),
    allDay: event.allDay,
    location: event.location ?? '',
    description: event.description ?? '',
    imageKey: event.imageKey ?? '',
    status: event.status,
  }
}

/**
 * Pre-remplit le formulaire pour une DUPLICATION.
 *
 * Identique a l'original, titre suffixe, statut ramene a « planifie » : la
 * copie est un nouvel evenement a organiser. L'original n'est pas touche —
 * c'est une simple lecture.
 */
export function formValuesFromDuplicate(event: AppEvent): EventFormValues {
  return {
    ...formValuesFromEvent(event),
    title: `${event.title} (copie)`,
    status: 'planifie',
  }
}
