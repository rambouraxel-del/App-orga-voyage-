import { describe, expect, it } from 'vitest'
import type { AppEvent } from '@/models'
import {
  compareByStart,
  dayCount,
  isMultiDay,
  isOngoingEvent,
  isPastEvent,
  isUpcoming,
  matchesQuery,
  occursOnDay,
  overlapsRange,
} from '../eventRules'

/** Construit un evenement minimal ; les dates sont exprimees en heure locale. */
function makeEvent(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: 'evt-1',
    title: 'Soiree jeux',
    category: 'soiree',
    startDate: new Date(2026, 7, 10, 20, 0).toISOString(),
    allDay: false,
    status: 'planifie',
    createdAt: new Date(2026, 6, 1).toISOString(),
    updatedAt: new Date(2026, 6, 1).toISOString(),
    ...overrides,
  }
}

const NOW = new Date(2026, 7, 10, 12, 0) // 10 aout 2026, midi

describe('detection des evenements passes', () => {
  it('considere passe un evenement termine avant maintenant', () => {
    const event = makeEvent({
      startDate: new Date(2026, 7, 9, 20, 0).toISOString(),
      endDate: new Date(2026, 7, 9, 23, 0).toISOString(),
    })
    expect(isPastEvent(event, NOW)).toBe(true)
  })

  it('ne considere pas passe un evenement a venir', () => {
    expect(isPastEvent(makeEvent(), NOW)).toBe(false)
  })

  it('utilise la date de debut quand la fin est absente', () => {
    const event = makeEvent({ startDate: new Date(2026, 7, 10, 11, 0).toISOString() })
    expect(event.endDate).toBeUndefined()
    expect(isPastEvent(event, NOW)).toBe(true)
  })

  it('garde un evenement « toute la journee » actif jusqu’a la fin du jour', () => {
    // Stocke a 00:00 : sans traitement particulier il basculerait « passe »
    // des le matin.
    const event = makeEvent({
      allDay: true,
      startDate: new Date(2026, 7, 10, 0, 0).toISOString(),
    })
    expect(isPastEvent(event, NOW)).toBe(false)
    expect(isPastEvent(event, new Date(2026, 7, 11, 0, 1))).toBe(true)
  })

  it('reconnait un evenement en cours', () => {
    const event = makeEvent({
      startDate: new Date(2026, 7, 10, 9, 0).toISOString(),
      endDate: new Date(2026, 7, 10, 18, 0).toISOString(),
    })
    expect(isOngoingEvent(event, NOW)).toBe(true)
    expect(isPastEvent(event, NOW)).toBe(false)
  })

  it('exclut les evenements annules des evenements a venir', () => {
    expect(isUpcoming(makeEvent({ status: 'annule' }), NOW)).toBe(false)
    expect(isUpcoming(makeEvent(), NOW)).toBe(true)
  })
})

describe('evenements sur plusieurs jours', () => {
  const weekend = makeEvent({
    startDate: new Date(2026, 7, 14, 8, 30).toISOString(),
    endDate: new Date(2026, 7, 16, 19, 0).toISOString(),
  })

  it('detecte le caractere multi-jours', () => {
    expect(isMultiDay(weekend)).toBe(true)
    expect(isMultiDay(makeEvent())).toBe(false)
  })

  it('compte les journees bornes comprises', () => {
    expect(dayCount(weekend)).toBe(3)
    expect(dayCount(makeEvent())).toBe(1)
  })

  it('occupe chacun des jours traverses', () => {
    expect(occursOnDay(weekend, new Date(2026, 7, 14))).toBe(true)
    expect(occursOnDay(weekend, new Date(2026, 7, 15))).toBe(true)
    expect(occursOnDay(weekend, new Date(2026, 7, 16))).toBe(true)
    expect(occursOnDay(weekend, new Date(2026, 7, 17))).toBe(false)
    expect(occursOnDay(weekend, new Date(2026, 7, 13))).toBe(false)
  })

  it('recouvre un intervalle meme partiellement', () => {
    // Le week-end deborde sur la periode demandee : il doit compter.
    expect(overlapsRange(weekend, new Date(2026, 7, 16), new Date(2026, 7, 31))).toBe(true)
    expect(overlapsRange(weekend, new Date(2026, 7, 17), new Date(2026, 7, 31))).toBe(false)
  })
})

describe('classement des evenements', () => {
  it('trie par date de debut croissante', () => {
    const a = makeEvent({ id: 'a', startDate: new Date(2026, 7, 12).toISOString() })
    const b = makeEvent({ id: 'b', startDate: new Date(2026, 7, 10).toISOString() })
    const c = makeEvent({ id: 'c', startDate: new Date(2026, 7, 11).toISOString() })
    expect([a, b, c].sort(compareByStart).map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('departage a date egale par le titre, pour un ordre stable', () => {
    const sameDate = new Date(2026, 7, 10, 20, 0).toISOString()
    const zoo = makeEvent({ id: 'z', title: 'Zoo', startDate: sameDate })
    const apero = makeEvent({ id: 'a', title: 'Apero', startDate: sameDate })
    expect([zoo, apero].sort(compareByStart).map((e) => e.id)).toEqual(['a', 'z'])
  })
})

describe('recherche plein texte', () => {
  const event = makeEvent({
    title: 'Soirée chez Camille',
    location: 'Montreuil',
    description: 'Apporter le gâteau',
  })

  it('ignore la casse et les accents', () => {
    expect(matchesQuery(event, 'soiree')).toBe(true)
    expect(matchesQuery(event, 'SOIRÉE')).toBe(true)
    expect(matchesQuery(event, 'gateau')).toBe(true)
  })

  it('cherche dans le lieu et la description', () => {
    expect(matchesQuery(event, 'montreuil')).toBe(true)
    expect(matchesQuery(event, 'apporter')).toBe(true)
  })

  it('renvoie tout pour une recherche vide', () => {
    expect(matchesQuery(event, '   ')).toBe(true)
  })

  it('ne trouve pas ce qui est absent', () => {
    expect(matchesQuery(event, 'concert')).toBe(false)
  })

  it('ne plante pas sur un evenement sans lieu ni description', () => {
    expect(matchesQuery(makeEvent({ title: 'Brunch' }), 'brunch')).toBe(true)
  })
})
