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
  TripTransport,
} from '@/models'
import { round2 } from '@/utils/budgetRules'
import { compareByUrgency, computeProgress, type TaskProgress } from '@/utils/taskRules'
import { isUpcoming, overlapsRange } from '@/utils/eventRules'
import { compareTransports, daysUntilDeparture, nightsWithoutStay } from '@/utils/tripRules'
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

/**
 * Synthese du prochain voyage, telle qu'affichee sur l'accueil.
 * Tout est calcule ici pour que la carte reste un composant de presentation.
 */
export interface NextTripSummary {
  trip: Trip
  /** Jours restants avant le depart. Negatif si le voyage a commence. */
  daysLeft: number
  /** Avancement des taches, `null` si aucune tache. */
  preparationPercent: number | null
  nextTransport: TripTransport | null
  /** Nuits sans hebergement enregistre. */
  uncoveredNights: number
  /** Billets et reservations du voyage, les plus proches d'abord. */
  documents: TravelDocument[]
  /** Taches du voyage non terminees, les plus urgentes d'abord. */
  urgentTasks: EventTask[]
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
  /** Synthese complete du prochain voyage (V0.5). */
  nextTripSummary: NextTripSummary | null
  month: MonthSummary
  /** Progression de preparation du prochain evenement. */
  nextEventProgress: TaskProgress | null
  /** Taches les plus urgentes des evenements a venir. */
  upcomingTasks: UpcomingTask[]
  /** Cadeaux et objets a preparer pour les evenements a venir. */
  pendingItems: Array<{ item: EventItem; eventTitle: string }>
  reminders: Reminder[]
  pendingReminderCount: number
  /** Prochains billets et reservations (documents dates, non archives). */
  documents: TravelDocument[]
  documentCount: number
  /** Documents dont la date utile tombe dans les 7 prochains jours. */
  expiringDocuments: TravelDocument[]
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
    const [
      settings,
      allEvents,
      nextTrip,
      reminders,
      documents,
      allTasks,
      allItems,
      allExpenses,
      allTransports,
      allStays,
    ] = await Promise.all([
      settingsRepository.get(),
      eventsRepository.listAll(),
      tripsRepository.findNext(),
      remindersRepository.listPending(),
      documentsRepository.listSorted(),
      db.tasks.toArray(),
      db.items.toArray(),
      db.expenses.toArray(),
      db.tripTransports.toArray(),
      db.tripStays.toArray(),
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

    // Billets a venir : dates, non archives, echeance pas encore passee.
    const soon = Date.now() + 7 * 86_400_000
    const upcomingDocuments = documents.filter(
      (document) =>
        !document.archived &&
        document.usefulDate !== undefined &&
        new Date(document.usefulDate).getTime() >= Date.now() - 86_400_000,
    )
    const expiringDocuments = upcomingDocuments.filter(
      (document) => new Date(document.usefulDate!).getTime() <= soon,
    )

    const pendingItems = allItems
      .filter((item) => item.status !== 'termine' && upcomingIds.has(item.eventId))
      .slice(0, 3)
      .map((item) => ({ item, eventTitle: titleById.get(item.eventId) ?? 'Evenement' }))

    // --- Prochain voyage --------------------------------------------------
    // Une seule synthese, calculee ici : la carte d'accueil n'a plus qu'a
    // afficher, et les memes regles servent partout (compte a rebours,
    // avancement, nuits sans hebergement).
    let nextTripSummary: NextTripSummary | null = null
    if (nextTrip) {
      const tripTasks = allTasks.filter((task) => task.eventId === nextTrip.eventId)
      const transports = allTransports
        .filter((transport) => transport.tripId === nextTrip.id && transport.status !== 'annule')
        .sort(compareTransports)
      const stays = allStays.filter((stay) => stay.tripId === nextTrip.id)

      nextTripSummary = {
        trip: nextTrip,
        daysLeft: daysUntilDeparture(nextTrip.startDate, now),
        preparationPercent: tripTasks.length > 0 ? computeProgress(tripTasks, now).percent : null,
        nextTransport:
          transports.find(
            (transport) => new Date(transport.departure).getTime() >= now.getTime(),
          ) ?? null,
        uncoveredNights: nightsWithoutStay(nextTrip.startDate, nextTrip.endDate, stays).length,
        documents: documents
          .filter((document) => document.eventId === nextTrip.eventId && !document.archived)
          .slice(0, 3),
        urgentTasks: tripTasks
          .filter((task) => !task.done)
          .sort((a, b) => compareByUrgency(a, b, now))
          .slice(0, 3),
      }
    }

    return {
      settings,
      nextEvent: nextEvent ?? null,
      agenda: rest.slice(0, 3),
      nextTripEvent: upcoming.find((event) => event.category === 'voyage') ?? null,
      nextTrip,
      nextTripSummary,
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
      documents: upcomingDocuments.slice(0, 3),
      documentCount: documents.length,
      expiringDocuments,
      hasNoEvents: allEvents.length === 0,
    }
  })
}
