import { APP_VERSION } from '@/config/app'
import type {
  AppEvent,
  AppSettings,
  Reminder,
  TravelDocument,
  Trip,
  TripActivity,
  TripStage,
  TripStay,
  TripTransport,
} from '@/models'
import { SETTINGS_KEY } from '@/models'
import { addDays, atTime, nowIso } from '@/utils/date'
import { createId } from '@/utils/id'

/**
 * Donnees fictives inserees au TOUT PREMIER lancement uniquement.
 *
 * Les dates sont calculees relativement au jour d'installation : la
 * demonstration reste coherente (evenements a venir) quelle que soit la date
 * a laquelle l'application est installee.
 */
export interface SeedPayload {
  events: AppEvent[]
  trips: Trip[]
  tripStages: TripStage[]
  tripActivities: TripActivity[]
  tripTransports: TripTransport[]
  tripStays: TripStay[]
  reminders: Reminder[]
  documents: TravelDocument[]
  settings: AppSettings
}

/** `AAAA-MM-JJ` local — cle de journee des activites et des nuits. */
const dayOf = (iso: string): string => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function buildSeedData(displayName = 'Axel'): SeedPayload {
  const now = nowIso()
  const stamps = { createdAt: now, updatedAt: now }

  const niceTripId = createId()
  const lisbonneTripId = createId()
  // Les identifiants d'evenement sont crees d'abord : chaque voyage doit
  // pointer vers son evenement porteur des la creation.
  const niceEventId = createId()
  const lisbonneEventId = createId()

  const trips: Trip[] = [
    {
      id: niceTripId,
      eventId: niceEventId,
      title: 'Week-end a Nice',
      destination: 'Nice, Cote d’Azur',
      origin: 'Paris',
      startDate: atTime(addDays(now, 5), 8, 30),
      endDate: atTime(addDays(now, 7), 19, 0),
      status: 'reserve',
      imageKey: 'mer',
      description: 'Train depuis Paris, hotel a deux pas de la promenade des Anglais.',
      budget: 420,
      ...stamps,
    },
    {
      id: lisbonneTripId,
      eventId: lisbonneEventId,
      title: 'Escapade a Lisbonne',
      destination: 'Lisbonne, Portugal',
      origin: 'Paris',
      startDate: atTime(addDays(now, 63), 6, 45),
      endDate: atTime(addDays(now, 68), 22, 15),
      status: 'preparation',
      imageKey: 'ville',
      description: 'Vol a reserver, quartier de l’Alfama a privilegier.',
      budget: 780,
      ...stamps,
    },
  ]

  const events: AppEvent[] = [
    {
      id: niceEventId,
      title: 'Week-end a Nice',
      category: 'voyage',
      startDate: atTime(addDays(now, 5), 8, 30),
      endDate: atTime(addDays(now, 7), 19, 0),
      allDay: false,
      imageKey: 'mer',
      location: 'Nice, Cote d’Azur',
      description:
        'Trois jours au soleil : vieille ville, plage, et une soiree sur le port avec la bande.',
      status: 'confirme',
      participants: 6,
      tripId: niceTripId,
      budget: 420,
      ...stamps,
    },
    {
      id: createId(),
      title: 'Anniversaire de Camille',
      category: 'anniversaire',
      startDate: atTime(addDays(now, 11), 20, 30),
      endDate: atTime(addDays(now, 12), 2, 0),
      allDay: false,
      imageKey: 'fete',
      location: 'Chez Camille, Montreuil',
      description: 'Apporter le gateau et la playlist.',
      status: 'confirme',
      participants: 12,
      budget: 45,
      ...stamps,
    },
    {
      id: createId(),
      title: 'Concert — Nuits Sonores',
      category: 'concert',
      startDate: atTime(addDays(now, 16), 19, 0),
      endDate: atTime(addDays(now, 16), 23, 45),
      allDay: false,
      location: 'La Cigale, Paris 18e',
      description: 'Billets electroniques deja recus par e-mail.',
      status: 'confirme',
      participants: 4,
      budget: 38,
      ...stamps,
    },
    {
      id: createId(),
      title: 'Brunch au Comptoir',
      category: 'restaurant',
      startDate: atTime(addDays(now, 19), 12, 0),
      endDate: atTime(addDays(now, 19), 14, 30),
      allDay: false,
      location: 'Le Comptoir General, Paris 10e',
      description: 'Table reservee pour 5 personnes.',
      status: 'planifie',
      participants: 5,
      budget: 30,
      ...stamps,
    },
    {
      id: createId(),
      title: 'Soiree jeux chez Theo',
      category: 'soiree',
      startDate: atTime(addDays(now, 26), 19, 30),
      endDate: atTime(addDays(now, 27), 1, 0),
      allDay: false,
      location: 'Theo, Vincennes',
      description: 'Chacun amene quelque chose a grignoter.',
      status: 'planifie',
      participants: 7,
      budget: 15,
      ...stamps,
    },
    {
      id: lisbonneEventId,
      title: 'Escapade a Lisbonne',
      category: 'voyage',
      startDate: atTime(addDays(now, 63), 6, 45),
      endDate: atTime(addDays(now, 68), 22, 15),
      allDay: false,
      imageKey: 'ville',
      location: 'Lisbonne, Portugal',
      description: 'Cinq jours entre tramway 28, pasteis de nata et couchers de soleil.',
      status: 'planifie',
      participants: 3,
      tripId: lisbonneTripId,
      budget: 780,
      ...stamps,
    },
    {
      id: createId(),
      title: 'Expo photo — Grand Palais',
      category: 'sortie',
      startDate: atTime(addDays(now, -9), 15, 0),
      endDate: atTime(addDays(now, -9), 17, 30),
      allDay: false,
      location: 'Grand Palais, Paris 8e',
      description: 'Retrospective argentique.',
      status: 'termine',
      participants: 2,
      budget: 18,
      ...stamps,
    },
  ]

  const reminders: Reminder[] = [
    {
      id: createId(),
      label: 'Reserver le train pour Nice',
      category: 'a-preparer',
      done: true,
      tripId: niceTripId,
      ...stamps,
    },
    {
      id: createId(),
      label: 'Cadeau d’anniversaire pour Camille',
      category: 'cadeau',
      done: false,
      ...stamps,
    },
    {
      id: createId(),
      label: 'Ramener du limoncello de la cote',
      category: 'a-ramener',
      done: false,
      tripId: niceTripId,
      ...stamps,
    },
    {
      id: createId(),
      label: 'Verifier la validite de la carte d’identite',
      category: 'administratif',
      done: false,
      tripId: lisbonneTripId,
      ...stamps,
    },
    {
      id: createId(),
      label: 'Preparer la playlist de la soiree',
      category: 'a-preparer',
      done: false,
      ...stamps,
    },
  ]

  // V0.4 : plus de documents de demonstration. Une fiche sans fichier joint
  // n'aurait pas de sens desormais ; la bibliotheque demarre donc vide, avec
  // son etat d'accueil et son bouton d'ajout.
  const documents: TravelDocument[] = []

  // --- V0.5 : un itineraire minimal pour le week-end a Nice ---------------
  // Juste assez pour que les sections Transports, Hebergements et Programme
  // ne s'ouvrent pas vides au premier lancement, sans transformer la demo en
  // voyage entierement pre-rempli.
  const niceDay1 = dayOf(addDays(now, 5))
  const niceDay3 = dayOf(addDays(now, 7))

  const tripTransports: TripTransport[] = [
    {
      id: createId(),
      tripId: niceTripId,
      mode: 'train',
      from: 'Paris Gare de Lyon',
      to: 'Nice-Ville',
      departure: atTime(addDays(now, 5), 8, 30),
      arrival: atTime(addDays(now, 5), 14, 15),
      company: 'TGV inOui',
      plannedPrice: 89,
      status: 'reserve',
      ...stamps,
    },
    {
      id: createId(),
      tripId: niceTripId,
      mode: 'train',
      from: 'Nice-Ville',
      to: 'Paris Gare de Lyon',
      departure: atTime(addDays(now, 7), 19, 0),
      arrival: atTime(addDays(now, 8), 0, 45),
      company: 'TGV inOui',
      plannedPrice: 89,
      status: 'reserve',
      ...stamps,
    },
  ]

  const tripStays: TripStay[] = [
    {
      id: createId(),
      tripId: niceTripId,
      name: 'Hotel de la Promenade',
      kind: 'hotel',
      checkIn: niceDay1,
      checkOut: niceDay3,
      plannedPrice: 180,
      status: 'reserve',
      ...stamps,
    },
  ]

  const tripActivities: TripActivity[] = [
    {
      id: createId(),
      tripId: niceTripId,
      day: niceDay1,
      time: '19:00',
      title: 'Diner dans le Vieux-Nice',
      category: 'restaurant',
      bookingRequired: false,
      status: 'prevu',
      order: 0,
      ...stamps,
    },
    {
      id: createId(),
      tripId: niceTripId,
      day: dayOf(addDays(now, 6)),
      time: '10:00',
      title: 'Colline du Chateau',
      place: 'Nice',
      category: 'visite',
      bookingRequired: false,
      status: 'idee',
      order: 0,
      ...stamps,
    },
  ]

  const tripStages: TripStage[] = [
    {
      id: createId(),
      tripId: niceTripId,
      place: 'Nice',
      startDate: atTime(addDays(now, 5), 14, 15),
      endDate: atTime(addDays(now, 7), 19, 0),
      status: 'reserve',
      order: 0,
      ...stamps,
    },
  ]

  const settings: AppSettings = {
    key: SETTINGS_KEY,
    displayName,
    lastBackupAt: null,
    appVersion: APP_VERSION,
    installedAt: now,
    currency: 'EUR',
  }

  return {
    events,
    trips,
    tripStages,
    tripActivities,
    tripTransports,
    tripStays,
    reminders,
    documents,
    settings,
  }
}
