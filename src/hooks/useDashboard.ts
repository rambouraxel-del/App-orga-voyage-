import { db } from '@/db/database'
import {
  documentsRepository,
  eventsRepository,
  remindersRepository,
  settingsRepository,
  tripsRepository,
} from '@/db/repositories'
import type {
  AppEvent,
  AppSettings,
  EventItem,
  EventTask,
  Reminder,
  TravelDocument,
  Trip,
} from '@/models'
import { round2 } from '@/utils/budgetRules'
import { compareByUrgency, computeProgress, type TaskProgress } from '@/utils/taskRules'
import { isUpcoming, overlapsRange } from '@/utils/eventRules'
import { useLiveData, type LiveDataState } from './useLiveData'

/** Tache a venir, accompagnee du nom de son evenement. */
export interface UpcomingTask {
  task: EventTask
  eventId: string
  eventTitle: string
}

export interface MonthSummary {
  /** Nombre d'evenements du mois en cours. */
  count: number
  /** Total reellement depense sur le mois, toutes categories confondues. */
  spent: number
  label: string
}

export interface DashboardData {
  settings: AppSettings
  /** Prochain evenement a venir. */
  nextEvent: AppEvent | null
  /** Les trois suivants, hors evenement mis en avant. */
  agenda: AppEvent[]
  /** Prochain evenement de categorie « voyage ». */
  nextTripEvent: AppEvent | null
  nextTrip: Trip | null
  month: MonthSummary
  /** Progression de preparation du prochain evenement. */
  nextEventProgress: TaskProgress | null
  /** Taches les plus urgentes des evenements a venir. */
  upcomingTasks: UpcomingTask[]
  /** Cadeaux et objets a preparer pour les evenements a venir. */
  pendingItems: Array<{ item: EventItem; eventTitle: string }>
  reminders: Reminder[]
  pendingReminderCount: number
  documents: TravelDocument[]
  documentCount: number
  /** Vrai si l'utilisateur n'a aucun evenement — declenche l'ecran d'accueil vide. */
  hasNoEvents: boolean
}

function summarizeMonth(
  events: AppEvent[],
  expenses: Array<{ eventId: string; amount: number; date?: string }>,
  reference = new Date(),
): MonthSummary {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)

  // Un evenement a cheval sur deux mois compte pour le mois courant s'il le
  // recouvre, meme partiellement.
  const inMonth = events.filter(
    (event) => event.status !== 'annule' && overlapsRange(event, from, to),
  )
  const idsInMonth = new Set(inMonth.map((event) => event.id))

  // Une depense compte pour le mois si elle est datee dans le mois ; sans date,
  // on la rattache au mois de son evenement.
  const spent = expenses.reduce((sum, expense) => {
    if (expense.date) {
      const day = new Date(expense.date)
      const sameMonth =
        day.getFullYear() === reference.getFullYear() && day.getMonth() === reference.getMonth()
      return sameMonth ? sum + expense.amount : sum
    }
    return idsInMonth.has(expense.eventId) ? sum + expense.amount : sum
  }, 0)

  return {
    count: inMonth.length,
    spent: round2(spent),
    label: reference.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  }
}

/**
 * Charge depuis la base locale l'ensemble des donnees affichees sur l'accueil.
 * Aucune valeur n'est ecrite en dur dans les composants.
 */
export function useDashboard(): LiveDataState<DashboardData> {
  return useLiveData<DashboardData>(async () => {
    const [settings, allEvents, nextTrip, reminders, documents, allTasks, allItems, allExpenses] =
      await Promise.all([
        settingsRepository.get(),
        eventsRepository.listAll(),
        tripsRepository.findNext(),
        remindersRepository.listPending(),
        documentsRepository.listSorted(),
        db.tasks.toArray(),
        db.items.toArray(),
        db.expenses.toArray(),
      ])

    const now = new Date()
    const upcoming = allEvents.filter((event) => isUpcoming(event, now))
    const [nextEvent, ...rest] = upcoming

    const titleById = new Map(allEvents.map((event) => [event.id, event.title]))
    const upcomingIds = new Set(upcoming.map((event) => event.id))

    // Taches des seuls evenements a venir : rappeler une tache liee a une
    // sortie deja passee n'aiderait personne.
    const upcomingTasks = allTasks
      .filter((task) => !task.done && upcomingIds.has(task.eventId))
      .sort((a, b) => compareByUrgency(a, b, now))
      .slice(0, 3)
      .map((task) => ({
        task,
        eventId: task.eventId,
        eventTitle: titleById.get(task.eventId) ?? 'Evenement',
      }))

    const pendingItems = allItems
      .filter((item) => item.status !== 'termine' && upcomingIds.has(item.eventId))
      .slice(0, 3)
      .map((item) => ({ item, eventTitle: titleById.get(item.eventId) ?? 'Evenement' }))

    return {
      settings,
      nextEvent: nextEvent ?? null,
      agenda: rest.slice(0, 3),
      nextTripEvent: upcoming.find((event) => event.category === 'voyage') ?? null,
      nextTrip,
      month: summarizeMonth(allEvents, allExpenses, now),
      nextEventProgress: nextEvent
        ? computeProgress(
            allTasks.filter((task) => task.eventId === nextEvent.id),
            now,
          )
        : null,
      upcomingTasks,
      pendingItems,
      reminders: reminders.slice(0, 3),
      pendingReminderCount: reminders.length,
      documents: documents.slice(0, 2),
      documentCount: documents.length,
      hasNoEvents: allEvents.length === 0,
    }
  })
}
