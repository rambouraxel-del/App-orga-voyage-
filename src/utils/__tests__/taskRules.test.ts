import { describe, expect, it } from 'vitest'
import type { EventTask } from '@/models'
import {
  compareByUrgency,
  compareTasks,
  computeProgress,
  isOverdue,
  moveTask,
  nextOrder,
  taskState,
} from '../taskRules'

const NOW = new Date(2026, 7, 10, 12, 0) // 10 aout 2026, midi

function makeTask(overrides: Partial<EventTask> = {}): EventTask {
  return {
    id: `task-${Math.random()}`,
    eventId: 'evt-1',
    title: 'Reserver le train',
    done: false,
    priority: 'normale',
    order: 0,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('etat d’une tache', () => {
  it('est « sans echeance » quand aucune date n’est posee', () => {
    expect(taskState(makeTask(), NOW)).toBe('sans-echeance')
  })

  it('est « en retard » quand l’echeance est depassee', () => {
    const task = makeTask({ dueDate: new Date(2026, 7, 9).toISOString() })
    expect(taskState(task, NOW)).toBe('en-retard')
    expect(isOverdue(task, NOW)).toBe(true)
  })

  it('n’est PAS en retard le jour meme de l’echeance', () => {
    // Une tache due aujourd'hui a encore toute la journee devant elle.
    const task = makeTask({ dueDate: new Date(2026, 7, 10, 8, 0).toISOString() })
    expect(taskState(task, NOW)).toBe('aujourdhui')
    expect(isOverdue(task, NOW)).toBe(false)
  })

  it('est « a venir » pour une echeance future', () => {
    expect(taskState(makeTask({ dueDate: new Date(2026, 7, 12).toISOString() }), NOW)).toBe(
      'a-venir',
    )
  })

  it('n’est jamais en retard une fois cochee', () => {
    const task = makeTask({ dueDate: new Date(2026, 7, 1).toISOString(), done: true })
    expect(taskState(task, NOW)).toBe('terminee')
    expect(isOverdue(task, NOW)).toBe(false)
  })

  it('tolere une date illisible sans planter', () => {
    expect(taskState(makeTask({ dueDate: 'pas-une-date' }), NOW)).toBe('sans-echeance')
  })
})

describe('progression', () => {
  it('renvoie zero sur une liste vide, sans division par zero', () => {
    const progress = computeProgress([], NOW)
    expect(progress).toMatchObject({ total: 0, done: 0, percent: 0, complete: false })
  })

  it('calcule le pourcentage termine', () => {
    const tasks = [makeTask({ done: true }), makeTask({ done: true }), makeTask(), makeTask()]
    expect(computeProgress(tasks, NOW)).toMatchObject({ total: 4, done: 2, percent: 50 })
  })

  it('signale l’achevement complet', () => {
    expect(computeProgress([makeTask({ done: true })], NOW).complete).toBe(true)
  })

  it('compte les taches en retard', () => {
    const tasks = [
      makeTask({ dueDate: new Date(2026, 7, 1).toISOString() }),
      makeTask({ dueDate: new Date(2026, 7, 5).toISOString() }),
      makeTask({ dueDate: new Date(2026, 7, 20).toISOString() }),
    ]
    expect(computeProgress(tasks, NOW).overdue).toBe(2)
  })
})

describe('ordre d’affichage', () => {
  it('respecte le rang manuel', () => {
    const a = makeTask({ id: 'a', order: 2 })
    const b = makeTask({ id: 'b', order: 0 })
    const c = makeTask({ id: 'c', order: 1 })
    expect([a, b, c].sort(compareTasks).map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('repousse les taches terminees en fin de liste', () => {
    const done = makeTask({ id: 'done', order: 0, done: true })
    const todo = makeTask({ id: 'todo', order: 5 })
    expect([done, todo].sort(compareTasks).map((t) => t.id)).toEqual(['todo', 'done'])
  })
})

describe('tri par urgence (accueil)', () => {
  it('place les retards en premier', () => {
    const late = makeTask({ id: 'late', dueDate: new Date(2026, 7, 1).toISOString() })
    const soon = makeTask({ id: 'soon', dueDate: new Date(2026, 7, 11).toISOString() })
    expect([soon, late].sort((a, b) => compareByUrgency(a, b, NOW)).map((t) => t.id)).toEqual([
      'late',
      'soon',
    ])
  })

  it('repousse les taches sans echeance apres celles qui en ont une', () => {
    const withDate = makeTask({ id: 'avec', dueDate: new Date(2026, 8, 1).toISOString() })
    const without = makeTask({ id: 'sans' })
    expect(
      [without, withDate].sort((a, b) => compareByUrgency(a, b, NOW)).map((t) => t.id),
    ).toEqual(['avec', 'sans'])
  })

  it('departage a echeance egale par la priorite', () => {
    const due = new Date(2026, 7, 15).toISOString()
    const low = makeTask({ id: 'basse', dueDate: due, priority: 'basse' })
    const high = makeTask({ id: 'haute', dueDate: due, priority: 'haute' })
    expect([low, high].sort((a, b) => compareByUrgency(a, b, NOW)).map((t) => t.id)).toEqual([
      'haute',
      'basse',
    ])
  })
})

describe('reordonnancement', () => {
  const tasks = [
    makeTask({ id: 'a', order: 0 }),
    makeTask({ id: 'b', order: 1 }),
    makeTask({ id: 'c', order: 2 }),
  ]

  it('remonte une tache', () => {
    expect(moveTask(tasks, 'c', -1).map((t) => t.id)).toEqual(['a', 'c', 'b'])
  })

  it('descend une tache', () => {
    expect(moveTask(tasks, 'a', 1).map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })

  it('renumerote les rangs de 0 a n-1', () => {
    expect(moveTask(tasks, 'c', -1).map((t) => t.order)).toEqual([0, 1, 2])
  })

  it('ne fait rien au-dela des bornes', () => {
    expect(moveTask(tasks, 'a', -1).map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(moveTask(tasks, 'c', 1).map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('ne fait rien pour un identifiant inconnu', () => {
    expect(moveTask(tasks, 'inexistant', 1).map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('rang de la prochaine tache', () => {
  it('vaut 0 sur une liste vide', () => {
    expect(nextOrder([])).toBe(0)
  })

  it('se place apres le rang le plus eleve', () => {
    expect(nextOrder([makeTask({ order: 0 }), makeTask({ order: 7 })])).toBe(8)
  })
})
