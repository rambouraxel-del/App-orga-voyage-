import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SIGNATURE,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  EXPENSE_CATEGORIES,
  ITEM_KINDS,
  ITEM_STATUSES,
  PARTICIPANT_STATUSES,
  TASK_PRIORITIES,
  TRIP_STATUSES,
  REMINDER_CATEGORIES,
  DOCUMENT_CATEGORIES,
  type AppEvent,
  type BackupFile,
  type EventItem,
  type EventTask,
  type Expense,
  type Participant,
  type Reminder,
  type TravelDocument,
  type Trip,
} from '@/models'
import { migrateDocumentToV4, migrateEventToV2 } from '@/db/database'
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

  // Un fichier v1 porte `type` et un statut `passe` : on le ramene au format
  // v2 AVANT de valider, pour n'avoir qu'une seule forme a controler ensuite.
  const event = migrateEventToV2({ ...raw })

  if (!isNonEmptyString(event.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(event.title)) invalid(`${path}.title`, 'titre manquant')
  if (!isIsoDate(event.startDate)) invalid(`${path}.startDate`, 'date de debut invalide')
  if (event.endDate !== undefined && !isIsoDate(event.endDate)) {
    invalid(`${path}.endDate`, 'date de fin invalide')
  }

  return {
    id: event.id,
    title: event.title,
    // Les valeurs d'enumeration inconnues sont ramenees a un repli : un fichier
    // issu d'une version future ne doit pas faire echouer l'import.
    category: isOneOf(event.category, EVENT_CATEGORIES) ? event.category : 'autre',
    startDate: event.startDate,
    ...(isIsoDate(event.endDate) ? { endDate: event.endDate } : {}),
    allDay: event.allDay === true,
    ...(isNonEmptyString(event.location) ? { location: event.location } : {}),
    ...(isNonEmptyString(event.description) ? { description: event.description } : {}),
    ...(isNonEmptyString(event.imageKey) ? { imageKey: event.imageKey } : {}),
    status: isOneOf(event.status, EVENT_STATUSES) ? event.status : 'planifie',
    ...(typeof event.participants === 'number' ? { participants: event.participants } : {}),
    ...(isNonEmptyString(event.tripId) ? { tripId: event.tripId } : {}),
    ...(typeof event.budget === 'number' ? { budget: event.budget } : {}),
    createdAt: isIsoDate(event.createdAt) ? event.createdAt : event.startDate,
    updatedAt: isIsoDate(event.updatedAt) ? event.updatedAt : event.startDate,
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

  // Un fichier v1-v3 porte `kind` et `date` : on le ramene au format v4 avant
  // de valider, pour n'avoir qu'une seule forme a controler.
  const document = migrateDocumentToV4({ ...raw })

  if (!isNonEmptyString(document.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(document.title)) invalid(`${path}.title`, 'titre manquant')

  const stamp = isIsoDate(document.createdAt) ? document.createdAt : new Date(0).toISOString()
  return {
    id: document.id,
    title: document.title,
    category: isOneOf(document.category, DOCUMENT_CATEGORIES) ? document.category : 'autre',
    ...(isIsoDate(document.usefulDate) ? { usefulDate: document.usefulDate } : {}),
    ...(isNonEmptyString(document.eventId) ? { eventId: document.eventId } : {}),
    ...(isNonEmptyString(document.tripId) ? { tripId: document.tripId } : {}),
    ...(isNonEmptyString(document.note) ? { note: document.note } : {}),
    fileName: typeof document.fileName === 'string' ? document.fileName : '',
    mimeType: typeof document.mimeType === 'string' ? document.mimeType : '',
    size:
      typeof document.size === 'number' && Number.isFinite(document.size) ? document.size : 0,
    archived: document.archived === true,
    createdAt: stamp,
    updatedAt: isIsoDate(document.updatedAt) ? document.updatedAt : stamp,
  }
}

/* ------------------------------------------------------------------ */
/* Modules V0.3 : taches, participants, objets, depenses               */
/* ------------------------------------------------------------------ */

/** Champs communs a toutes les entites rattachees a un evenement. */
function parseChildBase(raw: Record<string, unknown>, path: string) {
  if (!isNonEmptyString(raw.id)) invalid(`${path}.id`, 'identifiant manquant')
  if (!isNonEmptyString(raw.eventId)) invalid(`${path}.eventId`, 'evenement parent manquant')
  const stamp = isIsoDate(raw.createdAt) ? raw.createdAt : new Date(0).toISOString()
  return {
    id: raw.id,
    eventId: raw.eventId,
    createdAt: stamp,
    updatedAt: isIsoDate(raw.updatedAt) ? raw.updatedAt : stamp,
  }
}

/** Nombre fini, ou repli. Protege des `NaN` et `Infinity` d'un fichier bricole. */
const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

function parseTask(raw: unknown, index: number): EventTask {
  const path = `data.tasks[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.title)) invalid(`${path}.title`, 'titre manquant')
  return {
    ...parseChildBase(raw, path),
    title: raw.title,
    done: raw.done === true,
    ...(isIsoDate(raw.dueDate) ? { dueDate: raw.dueDate } : {}),
    priority: isOneOf(raw.priority, TASK_PRIORITIES) ? raw.priority : 'normale',
    order: finiteOr(raw.order, index),
    ...(isNonEmptyString(raw.note) ? { note: raw.note } : {}),
  }
}

function parseParticipant(raw: unknown, index: number): Participant {
  const path = `data.participants[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.name)) invalid(`${path}.name`, 'nom manquant')
  return {
    ...parseChildBase(raw, path),
    name: raw.name,
    ...(isNonEmptyString(raw.contact) ? { contact: raw.contact } : {}),
    status: isOneOf(raw.status, PARTICIPANT_STATUSES) ? raw.status : 'invite',
    ...(isNonEmptyString(raw.note) ? { note: raw.note } : {}),
  }
}

function parseItem(raw: unknown, index: number): EventItem {
  const path = `data.items[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.label)) invalid(`${path}.label`, 'libelle manquant')
  return {
    ...parseChildBase(raw, path),
    label: raw.label,
    kind: isOneOf(raw.kind, ITEM_KINDS) ? raw.kind : 'a-ramener',
    ...(isNonEmptyString(raw.forWhom) ? { forWhom: raw.forWhom } : {}),
    quantity: Math.max(1, Math.round(finiteOr(raw.quantity, 1))),
    ...(typeof raw.estimatedPrice === 'number' && Number.isFinite(raw.estimatedPrice)
      ? { estimatedPrice: raw.estimatedPrice }
      : {}),
    status: isOneOf(raw.status, ITEM_STATUSES) ? raw.status : 'a-prevoir',
    ...(isNonEmptyString(raw.note) ? { note: raw.note } : {}),
    countInBudget: raw.countInBudget === true,
  }
}

function parseExpense(raw: unknown, index: number): Expense {
  const path = `data.expenses[${index}]`
  if (!isObject(raw)) invalid(path, 'objet attendu')
  if (!isNonEmptyString(raw.label)) invalid(`${path}.label`, 'libelle manquant')
  return {
    ...parseChildBase(raw, path),
    label: raw.label,
    amount: finiteOr(raw.amount, 0),
    category: isOneOf(raw.category, EXPENSE_CATEGORIES) ? raw.category : 'autre',
    ...(isIsoDate(raw.date) ? { date: raw.date } : {}),
    ...(isNonEmptyString(raw.note) ? { note: raw.note } : {}),
    paid: raw.paid === true,
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
  // Verifications explicites plutot qu'une boucle : TypeScript ne sait pas
  // reduire le type d'un acces indexe dynamique, et on perdrait le typage.
  if (data.tasks !== undefined && !Array.isArray(data.tasks)) invalid('data.tasks', 'tableau attendu')
  if (data.participants !== undefined && !Array.isArray(data.participants)) {
    invalid('data.participants', 'tableau attendu')
  }
  if (data.items !== undefined && !Array.isArray(data.items)) invalid('data.items', 'tableau attendu')
  if (data.expenses !== undefined && !Array.isArray(data.expenses)) {
    invalid('data.expenses', 'tableau attendu')
  }
  if (!isObject(data.settings)) invalid('data.settings', 'objet attendu')

  // Manifeste des fichiers (v4+). Une entree incomplete est ignoree plutot que
  // de faire echouer tout l'import : la fiche sera simplement signalee comme
  // ayant un fichier manquant.
  const files = Array.isArray(raw.files)
    ? raw.files.flatMap((entry: unknown) => {
        if (!isObject(entry)) return []
        if (!isNonEmptyString(entry.documentId) || !isNonEmptyString(entry.path)) return []
        return [
          {
            documentId: entry.documentId,
            path: entry.path,
            fileName: typeof entry.fileName === 'string' ? entry.fileName : '',
            mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : '',
            size: typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : 0,
          },
        ]
      })
    : []

  const settings = data.settings
  return {
    signature: BACKUP_SIGNATURE,
    formatVersion,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'inconnue',
    createdAt: isIsoDate(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    files,
    data: {
      events: data.events.map(parseEvent),
      trips: data.trips.map(parseTrip),
      reminders: (data.reminders ?? []).map(parseReminder),
      documents: (data.documents ?? []).map(parseDocument),
      // Absents des sauvegardes v1 et v2 : la collection est alors vide, ce qui
      // est exactement l'etat d'un evenement sans module.
      tasks: (data.tasks ?? []).map(parseTask),
      participants: (data.participants ?? []).map(parseParticipant),
      items: (data.items ?? []).map(parseItem),
      expenses: (data.expenses ?? []).map(parseExpense),
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
