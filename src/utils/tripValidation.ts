import type { Trip, TripDraft, TripStatus } from '@/models'
import { toDayInput } from './date'

/**
 * Valeurs du formulaire de voyage.
 *
 * Toutes en `string` : c'est ce que rendent les champs natifs, et cela evite
 * les conversions partielles pendant la saisie.
 */
export interface TripFormValues {
  title: string
  destination: string
  origin: string
  /** `AAAA-MM-JJ`. */
  startDay: string
  /** `AAAA-MM-JJ`. */
  endDay: string
  status: string
  description: string
  imageKey: string
  budget: string
}

export interface TripFormErrors {
  title?: string
  destination?: string
  startDay?: string
  endDay?: string
  budget?: string
}

/** Un voyage se saisit a la journee : debut a minuit, fin en fin de journee. */
export const START_OF_DAY_SUFFIX = 'T00:00:00'
export const END_OF_DAY_SUFFIX = 'T23:59:00'

export function emptyTripValues(today: Date = new Date()): TripFormValues {
  const start = new Date(today)
  start.setDate(start.getDate() + 30)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    title: '',
    destination: '',
    origin: '',
    startDay: toDayInput(start.toISOString()),
    endDay: toDayInput(end.toISOString()),
    status: 'idee',
    description: '',
    imageKey: '',
    budget: '',
  }
}

export function tripValuesFrom(trip: Trip): TripFormValues {
  return {
    title: trip.title,
    destination: trip.destination,
    origin: trip.origin ?? '',
    startDay: toDayInput(trip.startDate),
    endDay: toDayInput(trip.endDate),
    status: trip.status,
    description: trip.description ?? '',
    imageKey: trip.imageKey ?? '',
    budget: typeof trip.budget === 'number' ? String(trip.budget) : '',
  }
}

export function validateTripForm(values: TripFormValues): TripFormErrors {
  const errors: TripFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = 'Donne un titre a ce voyage.'
  }
  if (values.destination.trim().length === 0) {
    errors.destination = 'Indique au moins une destination.'
  }
  if (!values.startDay) {
    errors.startDay = 'La date de depart est obligatoire.'
  }
  if (!values.endDay) {
    errors.endDay = 'La date de retour est obligatoire.'
  } else if (values.startDay && values.endDay < values.startDay) {
    // Regle de coherence centrale : tout le reste (journees, nuits, budget)
    // en depend, on la bloque donc au lieu de la signaler.
    errors.endDay = 'Le retour ne peut pas preceder le depart.'
  }

  if (values.budget.trim().length > 0) {
    const amount = Number(values.budget.replace(',', '.'))
    if (!Number.isFinite(amount) || amount < 0) {
      errors.budget = 'Saisis un montant positif, ou laisse le champ vide.'
    }
  }

  return errors
}

export const hasTripErrors = (errors: TripFormErrors): boolean => Object.keys(errors).length > 0

export function toTripDraft(values: TripFormValues): TripDraft {
  const budget = values.budget.trim().length > 0 ? Number(values.budget.replace(',', '.')) : undefined

  return {
    title: values.title.trim(),
    destination: values.destination.trim(),
    startDate: new Date(`${values.startDay}${START_OF_DAY_SUFFIX}`).toISOString(),
    endDate: new Date(`${values.endDay}${END_OF_DAY_SUFFIX}`).toISOString(),
    status: values.status as TripStatus,
    // Champs effacables : toujours presents dans le brouillon, a `undefined`
    // quand ils sont vides, pour que `update` sache les retirer.
    origin: values.origin.trim() || undefined,
    description: values.description.trim() || undefined,
    imageKey: values.imageKey || undefined,
    budget: typeof budget === 'number' && Number.isFinite(budget) ? budget : undefined,
  }
}
