import { describe, expect, it } from 'vitest'
import {
  emptyTripValues,
  hasTripErrors,
  toTripDraft,
  tripValuesFrom,
  validateTripForm,
  type TripFormValues,
} from '../tripValidation'

const values = (overrides: Partial<TripFormValues> = {}): TripFormValues => ({
  title: 'Escapade a Lisbonne',
  destination: 'Lisbonne',
  origin: 'Paris',
  startDay: '2026-09-12',
  endDay: '2026-09-16',
  status: 'preparation',
  description: '',
  imageKey: '',
  budget: '',
  ...overrides,
})

describe('validateTripForm', () => {
  it('accepte un formulaire complet', () => {
    expect(hasTripErrors(validateTripForm(values()))).toBe(false)
  })

  it('exige un titre', () => {
    expect(validateTripForm(values({ title: '   ' })).title).toBeDefined()
  })

  it('exige une destination', () => {
    expect(validateTripForm(values({ destination: '' })).destination).toBeDefined()
  })

  it('exige les deux dates', () => {
    expect(validateTripForm(values({ startDay: '' })).startDay).toBeDefined()
    expect(validateTripForm(values({ endDay: '' })).endDay).toBeDefined()
  })

  it('refuse un retour anterieur au depart', () => {
    expect(validateTripForm(values({ endDay: '2026-09-11' })).endDay).toBeDefined()
  })

  it('accepte un aller-retour dans la journee', () => {
    expect(hasTripErrors(validateTripForm(values({ endDay: '2026-09-12' })))).toBe(false)
  })

  it('refuse un budget negatif ou non numerique', () => {
    expect(validateTripForm(values({ budget: '-10' })).budget).toBeDefined()
    expect(validateTripForm(values({ budget: 'beaucoup' })).budget).toBeDefined()
  })

  it('accepte un budget vide ou saisi a la francaise', () => {
    expect(validateTripForm(values({ budget: '' })).budget).toBeUndefined()
    expect(validateTripForm(values({ budget: '820,50' })).budget).toBeUndefined()
  })
})

describe('toTripDraft', () => {
  it('borne les dates a la journee complete', () => {
    const draft = toTripDraft(values())
    expect(new Date(draft.startDate).getHours()).toBe(0)
    expect(new Date(draft.endDate).getHours()).toBe(23)
  })

  it('convertit la virgule decimale', () => {
    expect(toTripDraft(values({ budget: '820,50' })).budget).toBe(820.5)
  })

  it('rend effacables les champs facultatifs', () => {
    // `undefined` explicite : c'est ce qui permet a `update` de retirer la
    // valeur precedente au lieu de la conserver.
    const draft = toTripDraft(values({ origin: '', description: '  ', budget: '' }))
    expect(draft.origin).toBeUndefined()
    expect(draft.description).toBeUndefined()
    expect(draft.budget).toBeUndefined()
  })

  it('nettoie les espaces autour du titre et de la destination', () => {
    const draft = toTripDraft(values({ title: '  Lisbonne  ', destination: ' Portugal ' }))
    expect(draft.title).toBe('Lisbonne')
    expect(draft.destination).toBe('Portugal')
  })
})

describe('emptyTripValues / tripValuesFrom', () => {
  it('propose par defaut une periode future coherente', () => {
    const empty = emptyTripValues(new Date('2026-08-01T10:00:00'))
    expect(empty.startDay).toBe('2026-08-31')
    expect(empty.endDay).toBe('2026-09-06')
    expect(hasTripErrors(validateTripForm({ ...empty, title: 'X', destination: 'Y' }))).toBe(false)
  })

  it('fait l’aller-retour depuis un voyage existant', () => {
    const draft = toTripDraft(values({ budget: '420' }))
    const restored = tripValuesFrom({
      id: 'trip-1',
      eventId: 'evt-1',
      ...draft,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    })
    expect(restored.title).toBe('Escapade a Lisbonne')
    expect(restored.startDay).toBe('2026-09-12')
    expect(restored.endDay).toBe('2026-09-16')
    expect(restored.budget).toBe('420')
  })
})
