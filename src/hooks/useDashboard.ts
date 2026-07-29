import {
  documentsRepository,
  eventsRepository,
  remindersRepository,
  settingsRepository,
  tripsRepository,
} from '@/db/repositories'
import type { AppEvent, AppSettings, Reminder, TravelDocument, Trip } from '@/models'
import { isUpcoming, overlapsRange } from '@/utils/eventRules'
import { useLiveData, type LiveDataState } from './useLiveData'

export interface MonthSummary {
  /** Nombre d'evenements du mois en cours. */
  count: number
  /** Somme des budgets previsionnels (champ hors perimetre V0.2, conserve). */
  total: number
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
  reminders: Reminder[]
  pendingReminderCount: number
  documents: TravelDocument[]
  documentCount: number
  /** Vrai si l'utilisateur n'a aucun evenement — declenche l'ecran d'accueil vide. */
  hasNoEvents: boolean
}

function summarizeMonth(events: AppEvent[], reference = new Date()): MonthSummary {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)

  // Un evenement a cheval sur deux mois compte pour le mois courant s'il le
  // recouvre, meme partiellement.
  const inMonth = events.filter(
    (event) => event.status !== 'annule' && overlapsRange(event, from, to),
  )

  return {
    count: inMonth.length,
    total: inMonth.reduce((sum, event) => sum + (event.budget ?? 0), 0),
    label: reference.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  }
}

/**
 * Charge depuis la base locale l'ensemble des donnees affichees sur l'accueil.
 * Aucune valeur n'est ecrite en dur dans les composants.
 */
export function useDashboard(): LiveDataState<DashboardData> {
  return useLiveData<DashboardData>(async () => {
    const [settings, allEvents, nextTrip, reminders, documents] = await Promise.all([
      settingsRepository.get(),
      eventsRepository.listAll(),
      tripsRepository.findNext(),
      remindersRepository.listPending(),
      documentsRepository.listSorted(),
    ])

    const now = new Date()
    const upcoming = allEvents.filter((event) => isUpcoming(event, now))
    const [nextEvent, ...rest] = upcoming

    return {
      settings,
      nextEvent: nextEvent ?? null,
      agenda: rest.slice(0, 3),
      nextTripEvent: upcoming.find((event) => event.category === 'voyage') ?? null,
      nextTrip,
      month: summarizeMonth(allEvents, now),
      reminders: reminders.slice(0, 3),
      pendingReminderCount: reminders.length,
      documents: documents.slice(0, 2),
      documentCount: documents.length,
      hasNoEvents: allEvents.length === 0,
    }
  })
}
