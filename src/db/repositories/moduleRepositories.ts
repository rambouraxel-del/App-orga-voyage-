import type { Table } from 'dexie'
import { db } from '../database'
import type {
  EntityId,
  EventItem,
  EventTask,
  Expense,
  ItemDraft,
  Participant,
  ParticipantDraft,
  ExpenseDraft,
  TaskDraft,
} from '@/models'
import { AppError, ERROR_MESSAGES } from '@/services/errors'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/id'
import { compareTasks, nextOrder } from '@/utils/taskRules'

/**
 * Fabrique commune aux quatre modules d'evenement (taches, participants,
 * objets, depenses).
 *
 * Ils partagent exactement le meme cycle de vie : lecture par evenement,
 * creation, mise a jour, suppression, et suppression en cascade. Les factoriser
 * evite quatre copies de la meme gestion d'erreurs et d'horodatage.
 */
interface ChildEntity {
  id: EntityId
  eventId: EntityId
  createdAt: string
  updatedAt: string
}

function createChildRepository<T extends ChildEntity, D>(
  table: () => Table<T, string>,
  label: string,
) {
  return {
    async listByEvent(eventId: EntityId): Promise<T[]> {
      return table().where('eventId').equals(eventId).toArray()
    },

    async listAll(): Promise<T[]> {
      return table().toArray()
    },

    async getById(id: EntityId): Promise<T | undefined> {
      return table().get(id)
    },

    async create(eventId: EntityId, draft: D): Promise<T> {
      const timestamp = nowIso()
      const record = {
        ...(draft as object),
        id: createId(),
        eventId,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as T
      try {
        await table().add(record)
      } catch (cause) {
        throw new AppError('MODULE_CREATE', ERROR_MESSAGES.MODULE_CREATE(label), { cause })
      }
      return record
    },

    async update(id: EntityId, draft: Partial<D>): Promise<T> {
      const existing = await table().get(id)
      if (!existing) {
        throw new AppError('MODULE_NOT_FOUND', ERROR_MESSAGES.MODULE_NOT_FOUND(label), {
          cause: new Error(`${label} introuvable : ${id}`),
        })
      }
      const updated = {
        ...existing,
        ...(draft as object),
        id: existing.id,
        eventId: existing.eventId,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      } as T
      try {
        await table().put(updated)
      } catch (cause) {
        throw new AppError('MODULE_UPDATE', ERROR_MESSAGES.MODULE_UPDATE(label), { cause })
      }
      return updated
    },

    async remove(id: EntityId): Promise<void> {
      try {
        await table().delete(id)
      } catch (cause) {
        throw new AppError('MODULE_DELETE', ERROR_MESSAGES.MODULE_DELETE(label), { cause })
      }
    },

    /** Supprime tout le contenu rattache a un evenement (cascade). */
    async removeByEvent(eventId: EntityId): Promise<number> {
      return table().where('eventId').equals(eventId).delete()
    },
  }
}

/* ------------------------------------------------------------------ */
/* Taches                                                              */
/* ------------------------------------------------------------------ */

const tasksBase = createChildRepository<EventTask, TaskDraft>(() => db.tasks, 'tache')

export const tasksRepository = {
  ...tasksBase,

  /** Taches d'un evenement, dans l'ordre d'affichage. */
  async listByEvent(eventId: EntityId): Promise<EventTask[]> {
    return (await tasksBase.listByEvent(eventId)).sort(compareTasks)
  },

  /** Cree une tache en fin de liste. */
  async create(eventId: EntityId, draft: TaskDraft): Promise<EventTask> {
    const siblings = await tasksBase.listByEvent(eventId)
    const timestamp = nowIso()
    const task: EventTask = {
      ...draft,
      id: createId(),
      eventId,
      order: nextOrder(siblings),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    try {
      await db.tasks.add(task)
    } catch (cause) {
      throw new AppError('MODULE_CREATE', ERROR_MESSAGES.MODULE_CREATE('tache'), { cause })
    }
    return task
  },

  /** Coche ou decoche une tache. */
  async toggle(id: EntityId): Promise<EventTask> {
    const existing = await db.tasks.get(id)
    if (!existing) {
      throw new AppError('MODULE_NOT_FOUND', ERROR_MESSAGES.MODULE_NOT_FOUND('tache'), {
        cause: new Error(`Tache introuvable : ${id}`),
      })
    }
    return tasksBase.update(id, { done: !existing.done } as Partial<TaskDraft>)
  },

  /**
   * Enregistre un nouvel ordre.
   * Les rangs sont reecrits en une transaction : soit tout l'ordre est
   * persiste, soit rien, jamais un classement a moitie applique.
   */
  async reorder(tasks: EventTask[]): Promise<void> {
    const timestamp = nowIso()
    try {
      await db.transaction('rw', db.tasks, async () => {
        await db.tasks.bulkPut(
          tasks.map((task, index) => ({ ...task, order: index, updatedAt: timestamp })),
        )
      })
    } catch (cause) {
      throw new AppError('MODULE_UPDATE', ERROR_MESSAGES.MODULE_UPDATE('tache'), { cause })
    }
  },
}

/* ------------------------------------------------------------------ */
/* Participants, objets, depenses                                      */
/* ------------------------------------------------------------------ */

export const participantsRepository = createChildRepository<Participant, ParticipantDraft>(
  () => db.participants,
  'participant',
)

export const itemsRepository = createChildRepository<EventItem, ItemDraft>(
  () => db.items,
  'element',
)

export const expensesRepository = createChildRepository<Expense, ExpenseDraft>(
  () => db.expenses,
  'depense',
)
