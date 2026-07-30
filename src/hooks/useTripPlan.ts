import {
  activitiesRepository,
  documentLinksRepository,
  documentsRepository,
  eventsRepository,
  expensesRepository,
  itemsRepository,
  participantsRepository,
  settingsRepository,
  stagesRepository,
  staysRepository,
  tasksRepository,
  transportsRepository,
  tripsRepository,
} from '@/db/repositories'
import type {
  AppEvent,
  DocumentLink,
  EventItem,
  EventTask,
  Expense,
  Participant,
  TravelDocument,
  Trip,
  TripActivity,
  TripStage,
  TripStay,
  TripTransport,
} from '@/models'
import { computeProgress, type TaskProgress } from '@/utils/taskRules'
import {
  computeTripBudget,
  nightsWithoutStay,
  tripDays,
  type TripBudgetSummary,
} from '@/utils/tripRules'
import { useLiveData, type LiveDataState } from './useLiveData'

export interface TripPlan {
  trip: Trip
  /** Evenement porteur : c'est lui qui porte les modules V0.3/V0.4. */
  event: AppEvent
  stages: TripStage[]
  activities: TripActivity[]
  transports: TripTransport[]
  stays: TripStay[]
  tasks: EventTask[]
  participants: Participant[]
  items: EventItem[]
  expenses: Expense[]
  documents: TravelDocument[]
  /** Documents libres, proposes a l'association. */
  availableDocuments: TravelDocument[]
  /** Liaisons document -> element du voyage. */
  links: DocumentLink[]
  /** Journees `AAAA-MM-JJ` couvertes par le voyage, bornes comprises. */
  days: string[]
  /** Nuits sans hebergement enregistre. */
  uncoveredNights: string[]
  progress: TaskProgress
  budget: TripBudgetSummary
  confirmedCount: number
  currency: string
}

/**
 * Charge un voyage et TOUT son contenu en une seule requete reactive.
 *
 * Meme parti pris que `useEventModules` : une ecriture dans n'importe quelle
 * table rafraichit la fiche entiere, ce qui evite a chaque section de gerer son
 * propre abonnement et garantit des totaux toujours coherents entre elles.
 */
export function useTripPlan(tripId: string | undefined): LiveDataState<TripPlan | null> {
  return useLiveData<TripPlan | null>(async () => {
    if (!tripId) return null

    const trip = await tripsRepository.getById(tripId)
    if (!trip) return null

    const event = await eventsRepository.getById(trip.eventId)
    if (!event) return null

    const [
      stages,
      activities,
      transports,
      stays,
      tasks,
      participants,
      items,
      expenses,
      allDocuments,
      links,
      settings,
    ] = await Promise.all([
      stagesRepository.listByTrip(tripId),
      activitiesRepository.listByTrip(tripId),
      transportsRepository.listByTrip(tripId),
      staysRepository.listByTrip(tripId),
      tasksRepository.listByEvent(trip.eventId),
      participantsRepository.listByEvent(trip.eventId),
      itemsRepository.listByEvent(trip.eventId),
      expensesRepository.listByEvent(trip.eventId),
      documentsRepository.listSorted(),
      documentLinksRepository.listAll(),
      settingsRepository.get(),
    ])

    const documents = allDocuments.filter((document) => document.eventId === trip.eventId)

    return {
      trip,
      event,
      stages,
      activities,
      transports,
      stays,
      tasks,
      participants,
      items,
      expenses,
      documents,
      availableDocuments: allDocuments.filter((document) => !document.eventId && !document.archived),
      links,
      days: tripDays(trip.startDate, trip.endDate),
      uncoveredNights: nightsWithoutStay(trip.startDate, trip.endDate, stays),
      progress: computeProgress(tasks),
      budget: computeTripBudget(trip.budget, { transports, stays, activities, expenses, items }),
      confirmedCount: participants.filter((p) => p.status === 'confirme').length,
      currency: settings.currency,
    }
  }, [tripId])
}
