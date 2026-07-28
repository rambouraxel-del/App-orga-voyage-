import {
  documentsRepository,
  eventsRepository,
  remindersRepository,
  settingsRepository,
  tripsRepository,
} from '@/db/repositories'
import type { AppEvent, AppSettings, Reminder, TravelDocument, Trip } from '@/models'
import { useLiveData, type LiveDataState } from './useLiveData'

export interface MonthBudget {
  /** Somme des budgets previsionnels des evenements du mois en cours. */
  total: number
  eventCount: number
  label: string
}

export interface DashboardData {
  settings: AppSettings
  nextEvent: AppEvent | null
  /** Prochains evenements, hors evenement mis en avant. */
  agenda: AppEvent[]
  nextTrip: Trip | null
  budget: MonthBudget
  reminders: Reminder[]
  pendingReminderCount: number
  documents: TravelDocument[]
  documentCount: number
  /** Vrai si la base ne contient aucune donnee exploitable. */
  isEmpty: boolean
}

function computeMonthBudget(events: AppEvent[], reference = new Date()): MonthBudget {
  const inMonth = events.filter((event) => {
    const start = new Date(event.startDate)
    return (
      start.getFullYear() === reference.getFullYear() &&
      start.getMonth() === reference.getMonth() &&
      event.status !== 'annule'
    )
  })

  return {
    total: inMonth.reduce((sum, event) => sum + (event.budget ?? 0), 0),
    eventCount: inMonth.length,
    label: reference.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  }
}

/**
 * Charge, depuis la base locale, l'ensemble des donnees affichees sur
 * l'accueil. Aucune valeur n'est ecrite en dur dans les composants.
 */
export function useDashboard(): LiveDataState<DashboardData> {
  return useLiveData<DashboardData>(async () => {
    const [settings, upcomingEvents, allEvents, nextTrip, reminders, documents] = await Promise.all([
      settingsRepository.get(),
      eventsRepository.listUpcoming(4),
      eventsRepository.listAll(),
      tripsRepository.findNext(),
      remindersRepository.listPending(),
      documentsRepository.listSorted(),
    ])

    const [nextEvent, ...rest] = upcomingEvents

    return {
      settings,
      nextEvent: nextEvent ?? null,
      agenda: rest.slice(0, 3),
      nextTrip,
      budget: computeMonthBudget(allEvents),
      reminders: reminders.slice(0, 3),
      pendingReminderCount: reminders.length,
      documents: documents.slice(0, 2),
      documentCount: documents.length,
      isEmpty: allEvents.length === 0 && nextTrip === null,
    }
  })
}
