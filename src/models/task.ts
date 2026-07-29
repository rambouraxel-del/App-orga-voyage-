import type { EntityId, IsoDateTime, Timestamped } from './common'

/** Priorite d'une tache d'organisation. */
export const TASK_PRIORITIES = ['basse', 'normale', 'haute'] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]

/**
 * Tache de preparation rattachee a un evenement.
 *
 * Le module est facultatif : un evenement sans tache reste parfaitement
 * valide et n'affiche qu'un etat vide.
 */
export interface EventTask extends Timestamped {
  id: EntityId
  /** Evenement parent. Supprime en cascade avec lui. */
  eventId: EntityId
  title: string
  done: boolean
  /** Echeance facultative — sert a detecter les retards. */
  dueDate?: IsoDateTime
  priority: TaskPriority
  /**
   * Rang d'affichage. Entier croissant, reattribue a chaque reordonnancement.
   * On ne s'appuie pas sur `createdAt` : l'utilisateur doit pouvoir remonter
   * une tache creee en dernier.
   */
  order: number
  note?: string
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

/** Donnees saisies au formulaire, avant creation ou mise a jour. */
export type TaskDraft = Pick<EventTask, 'title' | 'priority' | 'done'> &
  Partial<Pick<EventTask, 'dueDate' | 'note'>>
