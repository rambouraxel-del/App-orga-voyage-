import Dexie, { type Table } from 'dexie'
import { DB_NAME } from '@/config/app'
import type { AppEvent, AppSettings, Reminder, TravelDocument, Trip } from '@/models'

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
  reminders!: Table<Reminder, string>
  documents!: Table<TravelDocument, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super(DB_NAME)

    // --- v1 (V0.1) -------------------------------------------------------
    // Les index secondaires anticipent les ecrans a venir (filtre par type /
    // statut, agenda trie par date, evenements rattaches a un voyage).
    this.version(1).stores({
      events: 'id, startDate, endDate, type, status, tripId',
      trips: 'id, startDate, endDate, status',
      reminders: 'id, category, done, eventId, tripId',
      documents: 'id, kind, date, eventId, tripId',
      settings: 'key',
    })
  }
}

export const db = new AppDatabase()

/**
 * Ouvre explicitement la base pour detecter tot les erreurs (mode navigation
 * privee, quota, IndexedDB desactive...) plutot que de laisser echouer une
 * requete au milieu du rendu.
 */
export async function openDatabase(): Promise<void> {
  if (db.isOpen()) return
  await db.open()
}
