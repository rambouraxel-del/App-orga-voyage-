import { describe, expect, it } from 'vitest'
import {
  combineDateTime,
  hasErrors,
  toEventDraft,
  validateEventForm,
  type EventFormValues,
} from '../eventValidation'

function makeValues(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return {
    title: 'Soiree jeux',
    category: 'soiree',
    startDay: '2026-08-10',
    startTime: '20:00',
    endDay: '2026-08-10',
    endTime: '23:00',
    allDay: false,
    location: 'Vincennes',
    description: 'Apporter a grignoter',
    imageKey: '',
    status: 'planifie',
    ...overrides,
  }
}

describe('combineDateTime', () => {
  it('combine jour et heure en date locale', () => {
    const result = combineDateTime('2026-08-10', '20:30', false)
    expect(result?.getFullYear()).toBe(2026)
    expect(result?.getMonth()).toBe(7)
    expect(result?.getDate()).toBe(10)
    expect(result?.getHours()).toBe(20)
    expect(result?.getMinutes()).toBe(30)
  })

  it('force minuit en mode « toute la journee »', () => {
    const result = combineDateTime('2026-08-10', '20:30', true)
    expect(result?.getHours()).toBe(0)
    expect(result?.getMinutes()).toBe(0)
  })

  it('renvoie null sans jour', () => {
    expect(combineDateTime('', '20:30', false)).toBeNull()
  })
})

describe('validation du formulaire', () => {
  it('accepte un formulaire correct', () => {
    expect(hasErrors(validateEventForm(makeValues()))).toBe(false)
  })

  it('refuse un titre vide ou seulement des espaces', () => {
    expect(validateEventForm(makeValues({ title: '' })).title).toBeDefined()
    expect(validateEventForm(makeValues({ title: '   ' })).title).toBeDefined()
  })

  it('exige une date de debut', () => {
    expect(validateEventForm(makeValues({ startDay: '' })).startDate).toBeDefined()
  })

  it('refuse une fin anterieure au debut', () => {
    const errors = validateEventForm(
      makeValues({ endDay: '2026-08-09', endTime: '23:00' }),
    )
    expect(errors.endDate).toBe('La fin ne peut pas preceder le debut.')
  })

  it('refuse une fin anterieure au debut le meme jour', () => {
    const errors = validateEventForm(makeValues({ endTime: '18:00' }))
    expect(errors.endDate).toBeDefined()
  })

  it('accepte une fin egale au debut', () => {
    expect(hasErrors(validateEventForm(makeValues({ endTime: '20:00' })))).toBe(false)
  })

  it('accepte l’absence de date de fin', () => {
    expect(hasErrors(validateEventForm(makeValues({ endDay: '', endTime: '' })))).toBe(false)
  })

  it('signale une heure de fin sans jour de fin', () => {
    expect(validateEventForm(makeValues({ endDay: '', endTime: '23:00' })).endDate).toBeDefined()
  })

  it('accepte un evenement « toute la journee » sur plusieurs jours', () => {
    const values = makeValues({
      allDay: true,
      startDay: '2026-08-14',
      endDay: '2026-08-16',
      startTime: '',
      endTime: '',
    })
    expect(hasErrors(validateEventForm(values))).toBe(false)
  })
})

describe('conversion en brouillon', () => {
  it('nettoie les champs textuels et conserve les valeurs utiles', () => {
    const draft = toEventDraft(makeValues({ location: '  Vincennes  ', description: '  ' }))
    expect(draft.title).toBe('Soiree jeux')
    expect(draft.location).toBe('Vincennes')
    // Une description vide ne doit pas etre stockee comme chaine vide.
    expect(draft.description).toBeUndefined()
    expect(draft.allDay).toBe(false)
    expect(draft.endDate).toBeDefined()
  })

  it('omet la date de fin quand elle n’est pas saisie', () => {
    const draft = toEventDraft(makeValues({ endDay: '', endTime: '' }))
    expect(draft.endDate).toBeUndefined()
  })

  it('omet l’illustration quand aucune n’est choisie', () => {
    expect(toEventDraft(makeValues()).imageKey).toBeUndefined()
    expect(toEventDraft(makeValues({ imageKey: 'mer' })).imageKey).toBe('mer')
  })
})
