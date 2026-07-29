import type { EventTask, TaskPriority } from '@/models'
import { startOfDay } from './eventRules'

/**
 * Regles des taches d'organisation — pures et sans dependance a Dexie ni React.
 */

/** Etat d'affichage deduit d'une tache. */
export type TaskState = 'terminee' | 'en-retard' | 'aujourdhui' | 'a-venir' | 'sans-echeance'

/**
 * Une tache est en retard si son echeance est passee ET qu'elle n'est pas
 * cochee. L'echeance est comparee a la JOURNEE : une tache due aujourd'hui
 * n'est pas en retard avant demain.
 */
export function taskState(task: EventTask, now: Date = new Date()): TaskState {
  if (task.done) return 'terminee'
  if (!task.dueDate) return 'sans-echeance'

  const due = new Date(task.dueDate)
  if (Number.isNaN(due.getTime())) return 'sans-echeance'

  const dueDay = startOfDay(due).getTime()
  const today = startOfDay(now).getTime()
  if (dueDay < today) return 'en-retard'
  if (dueDay === today) return 'aujourdhui'
  return 'a-venir'
}

export function isOverdue(task: EventTask, now: Date = new Date()): boolean {
  return taskState(task, now) === 'en-retard'
}

export interface TaskProgress {
  total: number
  done: number
  remaining: number
  overdue: number
  /** Pourcentage de taches terminees (0 quand il n'y a aucune tache). */
  percent: number
  /** Vrai si toutes les taches sont cochees et qu'il y en a au moins une. */
  complete: boolean
}

export function computeProgress(tasks: EventTask[], now: Date = new Date()): TaskProgress {
  const total = tasks.length
  const done = tasks.filter((task) => task.done).length
  const overdue = tasks.filter((task) => isOverdue(task, now)).length

  return {
    total,
    done,
    remaining: total - done,
    overdue,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  }
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { haute: 0, normale: 1, basse: 2 }

/**
 * Ordre d'affichage : les taches actives d'abord (par rang manuel), les
 * terminees repoussees en fin de liste.
 */
export function compareTasks(a: EventTask, b: EventTask): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.order !== b.order) return a.order - b.order
  return a.createdAt.localeCompare(b.createdAt)
}

/**
 * Tri « importance » utilise sur l'accueil : retards d'abord, puis echeance la
 * plus proche, puis priorite.
 */
export function compareByUrgency(a: EventTask, b: EventTask, now: Date = new Date()): number {
  const aLate = isOverdue(a, now)
  const bLate = isOverdue(b, now)
  if (aLate !== bLate) return aLate ? -1 : 1

  const aDue = a.dueDate ?? ''
  const bDue = b.dueDate ?? ''
  if (aDue !== bDue) {
    // Une tache sans echeance passe apres celles qui en ont une.
    if (!aDue) return 1
    if (!bDue) return -1
    return aDue.localeCompare(bDue)
  }

  return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
}

/**
 * Deplace une tache d'une position et renvoie la liste reordonnee avec des
 * rangs recalcules de 0 a n-1.
 *
 * Renvoie la liste inchangee si le deplacement sort des bornes — le composant
 * n'a donc pas a se soucier des cas limites.
 */
export function moveTask(tasks: EventTask[], id: string, direction: -1 | 1): EventTask[] {
  const ordered = [...tasks].sort(compareTasks)
  const index = ordered.findIndex((task) => task.id === id)
  const target = index + direction

  if (index === -1 || target < 0 || target >= ordered.length) return ordered

  const moved = [...ordered]
  const [taken] = moved.splice(index, 1)
  moved.splice(target, 0, taken!)

  return moved.map((task, position) => ({ ...task, order: position }))
}

/** Rang a attribuer a une nouvelle tache : toujours en fin de liste. */
export function nextOrder(tasks: EventTask[]): number {
  return tasks.reduce((max, task) => Math.max(max, task.order), -1) + 1
}
