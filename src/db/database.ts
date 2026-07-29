import Dexie, { type Table } from 'dexie'
import { DB_NAME } from '@/config/app'
import type {
  AppEvent,
  AppSettings,
  EventItem,
  EventTask,
  Expense,
  Participant,
  Reminder,
  TravelDocument,
  Trip,
} from '@/models'
import { LEGACY_STATUS_TO_STATUS, LEGACY_TYPE_TO_CATEGORY } from '@/models'

/**
 * Base locale IndexedDB.
 *
 * Conventions de versionnage :
 * - chaque evolution de schema ajoute un NOUVEAU bloc `this.version(n).stores(...)` ;
 * - on ne modifie jamais un bloc deja publie ;
 * - une migration de donnees se declare via `.upgrade(tx => ...)` sur le bloc concerne.
 */
export class AppDatabase extends Dexie {
  events!: Table<AppEvent, string>
  trips!: Table<Trip, string>
  tasks!: Table<EventTask, string>
  participants!: Table<Participant, string>
  items!: Table<EventItem, string>
  expenses!: Table<Expense, string>
  reminders!: Table<Reminder, string>
  documents!: Table<TravelDocument, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super(DB_NAME)

    // --- v1 (V0.1) -------------------------------------------------------
    this.version(1).stores({
      events: 'id, startDate, endDate, type, status, tripId',
      trips: 'id, startDate, endDate, status',
      reminders: 'id, category, done, eventId, tripId',
      documents: 'id, kind, date, eventId, tripId',
      settings: 'key',
    })

    // --- v2 (V0.2) -------------------------------------------------------
    // `type` devient `category`, ajout de `allDay` et `imageKey`.
    // L'index `type` est retire et remplace par `category`.
    this.version(2)
      .stores({
        events: 'id, startDate, endDate, category, status, tripId',
        trips: 'id, startDate, endDate, status',
        reminders: 'id, category, done, eventId, tripId',
        documents: 'id, kind, date, eventId, tripId',
        settings: 'key',
      })
      .upgrade(async (tx) => {
        // Migration en place : aucune donnee n'est supprimee, on ne fait
        // qu'ajouter et renommer des champs.
        await tx
          .table('events')
          .toCollection()
          .modify((event: Record<string, unknown>) => {
            migrateEventToV2(event)
          })
      })
    // --- v3 (V0.3) -------------------------------------------------------
    // Quatre nouvelles tables rattachees aux evenements. Aucune donnee
    // existante n'est modifiee : Dexie cree simplement les magasins manquants,
    // les evenements, voyages et parametres restent intacts.
    this.version(3).stores({
      events: 'id, startDate, endDate, category, status, tripId',
      trips: 'id, startDate, endDate, status',
      tasks: 'id, eventId, done, dueDate, order',
      participants: 'id, eventId, status',
      items: 'id, eventId, kind, status',
      expenses: 'id, eventId, category, paid, date',
      reminders: 'id, category, done, eventId, tripId',
      documents: 'id, kind, date, eventId, tripId',
      settings: 'key',
    })
  }
}

/**
 * Convertit un enregistrement d'evenement V0.1 vers le format V0.2.
 *
 * Exportee et pure pour etre testable, et reutilisee par l'import de
 * sauvegarde (une sauvegarde V0.1 contient exactement la meme forme).
 * La fonction est idempotente : appliquee a un evenement deja V0.2, elle ne
 * change rien.
 */
export function migrateEventToV2(event: Record<string, unknown>): Record<string, unknown> {
  // type -> category
  if (event.category === undefined) {
    const legacyType = typeof event.type === 'string' ? event.type : 'autre'
    event.category = LEGACY_TYPE_TO_CATEGORY[legacyType] ?? 'autre'
  }
  delete event.type

  // status : « passe » n'existe plus, il devient « termine »
  if (typeof event.status === 'string' && LEGACY_STATUS_TO_STATUS[event.status]) {
    event.status = LEGACY_STATUS_TO_STATUS[event.status]
  } else if (event.status === undefined) {
    event.status = 'planifie'
  }

  // allDay : absent en V0.1, les evenements y avaient toujours une heure
  if (typeof event.allDay !== 'boolean') event.allDay = false

  // Les chaines vides deviennent des champs absents (desormais optionnels)
  for (const field of ['location', 'description', 'imageKey'] as const) {
    if (typeof event[field] === 'string' && (event[field] as string).trim() === '') {
      delete event[field]
    }
  }

  // endDate devient facultative : on retire une fin identique au debut
  if (typeof event.endDate === 'string' && event.endDate === event.startDate) {
    delete event.endDate
  }

  return event
}

export const db = new AppDatabase()

/**
 * Ouvre explicitement la base pour detecter tot les erreurs (mode navigation
 * privee, quota, IndexedDB desactive, migration impossible) plutot que de
 * laisser echouer une requete au milieu du rendu.
 */
export async function openDatabase(): Promise<void> {
  if (db.isOpen()) return
  await db.open()
}
