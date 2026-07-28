import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SIGNATURE,
  EVENT_STATUSES,
  EVENT_TYPES,
  TRIP_STATUSES,
  REMINDER_CATEGORIES,
  DOCUMENT_KINDS,
  type AppEvent,
  type BackupFile,
  type Reminder,
  type TravelDocument,
  type Trip,
} from '@/models'
import { AppError, ERROR_MESSAGES } from './errors'

/* ------------------------------------------------------------------ */
/* Primitives de validation                                            */
/* ------------------------------------------------------------------ */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && v.length >= 10 && !Number.isNaN(Date.parse(v))

const isOneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v)

/** Erreur de validation avec le chemin fautif, journalise pour le debogage. */
function invalid(path: string, reason: string): never {
  throw new AppError('IMPORT_INVALID', ERROR_MESSAGES.IMPORT_INVALID, {
    cause: new Error(`Champ invalide : ${path} — ${reason}`),
  })
}

/* ------------------------------------------------------------------ */
/* Validation des entites                                              */
/* ------------------------------------------------------------------ */

function parseEvent(raw: unknown, index: number): AppEvent {
  const path = `data.events[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(raw.title)) invalid(`${path}.title`, 'titre manquant')
  if (!isIsoDate(raw.startDate)) invalid(`${path}.startDate`, 'date de debut invalide')
  if (!isIsoDate(raw.endDate)) invalid(`${path}.endDate`, 'date de fin invalide')

  return {
    id: raw.id,
    title: raw.title,
    // Les valeurs d'enumeration inconnues sont ramenees a un repli sur : un
    // fichier issu d'une version future ne doit pas faire echouer l'import.
    type: isOneOf(raw.type, EVENT_TYPES) ? raw.type : 'autre',
    startDate: raw.startDate,
    endDate: raw.endDate,
    location: typeof raw.location === 'string' ? raw.location : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    status: isOneOf(raw.status, EVENT_STATUSES) ? raw.status : 'planifie',
    ...(typeof raw.participants === 'number' ? { participants: raw.participants } : {}),
    ...(isNonEmptyString(raw.tripId) ? { tripId: raw.tripId } : {}),
    ...(typeof raw.budget === 'number' ? { budget: raw.budget } : {}),
    createdAt: isIsoDate(raw.createdAt) ? raw.createdAt : raw.startDate,
    updatedAt: isIsoDate(raw.updatedAt) ? raw.updatedAt : raw.startDate,
  }
}

function parseTrip(raw: unknown, index: number): Trip {
  const path = `data.trips[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(raw.title)) invalid(`${path}.title`, 'titre manquant')
  if (!isIsoDate(raw.startDate)) invalid(`${path}.startDate`, 'date de debut invalide')
  if (!isIsoDate(raw.endDate)) invalid(`${path}.endDate`, 'date de fin invalide')

  return {
    id: raw.id,
    title: raw.title,
    destination: typeof raw.destination === 'string' ? raw.destination : '',
    startDate: raw.startDate,
    endDate: raw.endDate,
    status: isOneOf(raw.status, TRIP_STATUSES) ? raw.status : 'planifie',
    ...(isNonEmptyString(raw.image) ? { image: raw.image } : {}),
    ...(typeof raw.notes === 'string' ? { notes: raw.notes } : {}),
    ...(typeof raw.budget === 'number' ? { budget: raw.budget } : {}),
    createdAt: isIsoDate(raw.createdAt) ? raw.createdAt : raw.startDate,
    updatedAt: isIsoDate(raw.updatedAt) ? raw.updatedAt : raw.startDate,
  }
}

function parseReminder(raw: unknown, index: number): Reminder {
  const path = `data.reminders[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(raw.label)) invalid(`${path}.label`, 'libelle manquant')

  const stamp = isIsoDate(raw.createdAt) ? raw.createdAt : new Date(0).toISOString()
  return {
    id: raw.id,
    label: raw.label,
    category: isOneOf(raw.category, REMINDER_CATEGORIES) ? raw.category : 'a-preparer',
    done: raw.done === true,
    ...(isNonEmptyString(raw.eventId) ? { eventId: raw.eventId } : {}),
    ...(isNonEmptyString(raw.tripId) ? { tripId: raw.tripId } : {}),
    createdAt: stamp,
    updatedAt: isIsoDate(raw.updatedAt) ? raw.updatedAt : stamp,
  }
}

function parseDocument(raw: unknown, index: number): TravelDocument {
  const path = `data.documents[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(raw.title)) invalid(`${path}.title`, 'titre manquant')

  const stamp = isIsoDate(raw.createdAt) ? raw.createdAt : new Date(0).toISOString()
  return {
    id: raw.id,
    title: raw.title,
    kind: isOneOf(raw.kind, DOCUMENT_KINDS) ? raw.kind : 'autre',
    ...(isIsoDate(raw.date) ? { date: raw.date } : {}),
    ...(isNonEmptyString(raw.eventId) ? { eventId: raw.eventId } : {}),
    ...(isNonEmptyString(raw.tripId) ? { tripId: raw.tripId } : {}),
    createdAt: stamp,
    updatedAt: isIsoDate(raw.updatedAt) ? raw.updatedAt : stamp,
  }
}

/* ------------------------------------------------------------------ */
/* Validation du fichier complet                                       */
/* ------------------------------------------------------------------ */

/**
 * Valide la structure d'un contenu JSON deja parse et renvoie un `BackupFile`
 * normalise. Leve une `AppError` porteuse d'un message utilisateur sinon.
 */
export function validateBackup(raw: unknown): BackupFile {
  if (!isObject(raw)) invalid('racine', 'objet JSON attendu')

  if (raw.signature !== BACKUP_SIGNATURE) {
    invalid('signature', `attendu "${BACKUP_SIGNATURE}", recu "${String(raw.signature)}"`)
  }

  const formatVersion = raw.formatVersion
  if (typeof formatVersion !== 'number' || !Number.isFinite(formatVersion)) {
    invalid('formatVersion', 'nombre attendu')
  }
  if (formatVersion > BACKUP_FORMAT_VERSION) {
    throw new AppError('IMPORT_VERSION', ERROR_MESSAGES.IMPORT_VERSION, {
      cause: new Error(
        `Format de sauvegarde v${formatVersion} > v${BACKUP_FORMAT_VERSION} supporte.`,
      ),
    })
  }

  if (!isObject(raw.data)) invalid('data', 'objet attendu')
  const data = raw.data

  if (!Array.isArray(data.events)) invalid('data.events', 'tableau attendu')
  if (!Array.isArray(data.trips)) invalid('data.trips', 'tableau attendu')
  if (data.reminders !== undefined && !Array.isArray(data.reminders)) {
    invalid('data.reminders', 'tableau attendu')
  }
  if (data.documents !== undefined && !Array.isArray(data.documents)) {
    invalid('data.documents', 'tableau attendu')
  }
  if (!isObject(data.settings)) invalid('data.settings', 'objet attendu')

  const settings = data.settings
  return {
    signature: BACKUP_SIGNATURE,
    formatVersion,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'inconnue',
    createdAt: isIsoDate(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    data: {
      events: data.events.map(parseEvent),
      trips: data.trips.map(parseTrip),
      reminders: (data.reminders ?? []).map(parseReminder),
      documents: (data.documents ?? []).map(parseDocument),
      settings: {
        displayName: isNonEmptyString(settings.displayName) ? settings.displayName : 'Axel',
        lastBackupAt: isIsoDate(settings.lastBackupAt) ? settings.lastBackupAt : null,
        appVersion: typeof settings.appVersion === 'string' ? settings.appVersion : 'inconnue',
        currency: isNonEmptyString(settings.currency) ? settings.currency : 'EUR',
      },
    },
  }
}

/** Parse une chaine JSON puis valide sa structure. */
export function parseBackupText(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (cause) {
    throw new AppError('IMPORT_PARSE', ERROR_MESSAGES.IMPORT_PARSE, { cause })
  }
  return validateBackup(parsed)
}
