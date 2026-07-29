import {
  documentsRepository,
  eventsRepository,
  expensesRepository,
  itemsRepository,
  participantsRepository,
  tasksRepository,
} from '@/db/repositories'
import type {
  AppEvent,
  EventItem,
  EventTask,
  Expense,
  Participant,
  TravelDocument,
} from '@/models'
import { computeBudget, type BudgetSummary } from '@/utils/budgetRules'
import { computeProgress, type TaskProgress } from '@/utils/taskRules'
import { useLiveData, type LiveDataState } from './useLiveData'

export interface EventModules {
  event: AppEvent
  tasks: EventTask[]
  participants: Participant[]
  items: EventItem[]
  expenses: Expense[]
  /** Documents rattaches a cet evenement. */
  documents: TravelDocument[]
  /** Documents non rattaches, proposes a l'association. */
  availableDocuments: TravelDocument[]
  /** Tous les evenements, pour les selecteurs d'association. */
  allEvents: AppEvent[]
  progress: TaskProgress
  budget: BudgetSummary
  confirmedCount: number
}

/**
 * Charge un evenement et l'ensemble de ses modules en une seule requete
 * reactive : toute ecriture dans l'une des tables rafraichit la fiche entiere,
 * sans que chaque section ait a s'abonner separement.
 */
export function useEventModules(eventId: string | undefined): LiveDataState<EventModules | null> {
  return useLiveData<EventModules | null>(async () => {
    if (!eventId) return null

    const event = await eventsRepository.getById(eventId)
    if (!event) return null

    const [tasks, participants, items, expenses, allDocuments, allEvents] = await Promise.all([
      tasksRepository.listByEvent(eventId),
      participantsRepository.listByEvent(eventId),
      itemsRepository.listByEvent(eventId),
      expensesRepository.listByEvent(eventId),
      documentsRepository.listSorted(),
      eventsRepository.listAll(),
    ])

    const documents = allDocuments.filter((document) => document.eventId === eventId)

    return {
      event,
      tasks,
      participants,
      items,
      expenses,
      documents,
      availableDocuments: allDocuments.filter(
        (document) => !document.eventId && !document.archived,
      ),
      allEvents,
      progress: computeProgress(tasks),
      budget: computeBudget(event.budget, expenses, items),
      confirmedCount: participants.filter((p) => p.status === 'confirme').length,
    }
  }, [eventId])
}
