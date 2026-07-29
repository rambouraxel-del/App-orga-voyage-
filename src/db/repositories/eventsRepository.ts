import { db } from '../database'
import type { AppEvent, EntityId, EventDraft } from '@/models'
import { AppError, ERROR_MESSAGES } from '@/services/errors'
import {
  compareByStart,
  compareByStartDesc,
  isPastEvent,
  isUpcoming,
  overlapsRange,
} from '@/utils/eventRules'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/id'

/**
 * Point d'acces unique aux evenements.
 *
 * Aucun composant ne parle a Dexie directement : toute lecture ou ecriture
 * passe par ici. Les erreurs techniques sont converties en `AppError` porteuses
 * d'un message deja lisible par l'utilisateur.
 */
export const eventsRepository = {
  /* --- Lecture --------------------------------------------------------- */

  /** Tous les evenements, du plus proche au plus lointain. */
  async listAll(): Promise<AppEvent[]> {
    return (await db.events.toArray()).sort(compareByStart)
  },

  async getById(id: EntityId): Promise<AppEvent | undefined> {
    return db.events.get(id)
  },

  /**
   * Evenement par identifiant, ou erreur explicite s'il n'existe pas.
   * Utilise par les ecrans qui ne peuvent rien afficher sans lui.
   */
  async getByIdOrFail(id: EntityId): Promise<AppEvent> {
    const event = await db.events.get(id)
    if (!event) {
      throw new AppError('EVENT_NOT_FOUND', ERROR_MESSAGES.EVENT_NOT_FOUND, {
        cause: new Error(`Evenement introuvable : ${id}`),
      })
    }
    return event
  },

  /** Evenements a venir (ni passes ni annules), tries chronologiquement. */
  async listUpcoming(limit?: number, now: Date = new Date()): Promise<AppEvent[]> {
    const upcoming = (await db.events.toArray()).filter((e) => isUpcoming(e, now)).sort(compareByStart)
    return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming
  },

  /** Evenements passes, du plus recent au plus ancien. */
  async listPast(limit?: number, now: Date = new Date()): Promise<AppEvent[]> {
    const past = (await db.events.toArray()).filter((e) => isPastEvent(e, now)).sort(compareByStartDesc)
    return typeof limit === 'number' ? past.slice(0, limit) : past
  },

  /** Evenements recouvrant au moins un jour de l'intervalle (bornes comprises). */
  async listInRange(from: Date, to: Date): Promise<AppEvent[]> {
    return (await db.events.toArray()).filter((e) => overlapsRange(e, from, to)).sort(compareByStart)
  },

  /** Prochain evenement a venir, ou `null`. */
  async findNext(now?: Date): Promise<AppEvent | null> {
    const [next] = await this.listUpcoming(1, now)
    return next ?? null
  },

  async count(): Promise<number> {
    return db.events.count()
  },

  /* --- Ecriture -------------------------------------------------------- */

  /** Cree un evenement et renvoie l'enregistrement complet. */
  async create(draft: EventDraft): Promise<AppEvent> {
    const timestamp = nowIso()
    const event: AppEvent = { ...draft, id: createId(), createdAt: timestamp, updatedAt: timestamp }
    try {
      await db.events.add(event)
    } catch (cause) {
      throw new AppError('EVENT_CREATE', ERROR_MESSAGES.EVENT_CREATE, { cause })
    }
    return event
  },

  /**
   * Met a jour un evenement existant.
   * L'identifiant et la date de creation sont preserves ; `updatedAt` est
   * rafraichi automatiquement.
   */
  async update(id: EntityId, draft: EventDraft): Promise<AppEvent> {
    const existing = await this.getByIdOrFail(id)
    const updated: AppEvent = {
      ...existing,
      ...draft,
      // Un champ vide dans le formulaire doit effacer l'ancienne valeur :
      // le spread ne suffit pas puisque la cle est alors absente du brouillon.
      endDate: draft.endDate,
      location: draft.location,
      description: draft.description,
      imageKey: draft.imageKey,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    }
    try {
      await db.events.put(updated)
    } catch (cause) {
      throw new AppError('EVENT_UPDATE', ERROR_MESSAGES.EVENT_UPDATE, { cause })
    }
    return updated
  },

  /** Change uniquement le statut (action « Marquer comme termine »). */
  async setStatus(id: EntityId, status: AppEvent['status']): Promise<AppEvent> {
    const existing = await this.getByIdOrFail(id)
    const updated: AppEvent = { ...existing, status, updatedAt: nowIso() }
    try {
      await db.events.put(updated)
    } catch (cause) {
      throw new AppError('EVENT_UPDATE', ERROR_MESSAGES.EVENT_UPDATE, { cause })
    }
    return updated
  },

  /**
   * Cree une copie d'un evenement.
   *
   * L'original n'est jamais modifie : la copie recoit un nouvel identifiant et
   * de nouveaux horodatages. Le titre est suffixe pour rester distinguable
   * dans les listes.
   */
  async duplicate(id: EntityId): Promise<AppEvent> {
    const source = await this.getByIdOrFail(id)
    const timestamp = nowIso()
    const copy: AppEvent = {
      ...source,
      id: createId(),
      title: `${source.title} (copie)`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    try {
      await db.events.add(copy)
    } catch (cause) {
      throw new AppError('EVENT_CREATE', ERROR_MESSAGES.EVENT_CREATE, { cause })
    }
    return copy
  },

  /**
   * Supprime un evenement ET tout ce qui lui est rattache (taches,
   * participants, objets, depenses).
   *
   * Le tout dans une transaction unique : on ne peut pas se retrouver avec un
   * evenement supprime mais ses depenses orphelines en base.
   */
  async remove(id: EntityId): Promise<void> {
    try {
      await db.transaction(
        'rw',
        [db.events, db.tasks, db.participants, db.items, db.expenses],
        async () => {
          await Promise.all([
            db.tasks.where('eventId').equals(id).delete(),
            db.participants.where('eventId').equals(id).delete(),
            db.items.where('eventId').equals(id).delete(),
            db.expenses.where('eventId').equals(id).delete(),
          ])
          await db.events.delete(id)
        },
      )
    } catch (cause) {
      throw new AppError('EVENT_DELETE', ERROR_MESSAGES.EVENT_DELETE, { cause })
    }
  },

  /** Met a jour la seule enveloppe budgetaire previsionnelle. */
  async setBudget(id: EntityId, budget: number | undefined): Promise<AppEvent> {
    const existing = await this.getByIdOrFail(id)
    const updated: AppEvent = { ...existing, budget, updatedAt: nowIso() }
    try {
      await db.events.put(updated)
    } catch (cause) {
      throw new AppError('EVENT_UPDATE', ERROR_MESSAGES.EVENT_UPDATE, { cause })
    }
    return updated
  },
}
