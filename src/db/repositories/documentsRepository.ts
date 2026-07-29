import { db } from '../database'
import type { DocumentDraft, EntityId, TravelDocument } from '@/models'
import { AppError, ERROR_MESSAGES } from '@/services/errors'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/id'

/**
 * Acces aux documents.
 *
 * Les METADONNEES et le CONTENU vivent dans deux tables distinctes : toutes les
 * listes ne touchent que `documents`, et le Blob n'est charge qu'a l'ouverture
 * d'une fiche. C'est ce qui permet d'afficher une bibliotheque de 50 PDF sans
 * saturer la memoire de l'iPhone.
 */
export const documentsRepository = {
  /* --- Lecture (metadonnees uniquement) --------------------------------- */

  async listAll(): Promise<TravelDocument[]> {
    return db.documents.toArray()
  },

  /** Documents actifs (non archives), tries par date utile croissante. */
  async listActive(): Promise<TravelDocument[]> {
    return (await db.documents.toArray())
      .filter((document) => !document.archived)
      .sort(byUsefulDate)
  },

  /** Documents tries par date utile croissante (les sans-date en dernier). */
  async listSorted(limit?: number): Promise<TravelDocument[]> {
    const sorted = (await db.documents.toArray()).sort(byUsefulDate)
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
  },

  async listByEvent(eventId: EntityId): Promise<TravelDocument[]> {
    return (await db.documents.where('eventId').equals(eventId).toArray()).sort(byUsefulDate)
  },

  async countByEvent(eventId: EntityId): Promise<number> {
    return db.documents.where('eventId').equals(eventId).count()
  },

  async getById(id: EntityId): Promise<TravelDocument | undefined> {
    return db.documents.get(id)
  },

  async count(): Promise<number> {
    return db.documents.count()
  },

  /** Somme des tailles de fichier, en octets. */
  async totalSize(): Promise<number> {
    return (await db.documents.toArray()).reduce((sum, document) => sum + (document.size || 0), 0)
  },

  /* --- Contenu du fichier ------------------------------------------------ */

  /** Blob d'un document, ou `null` si la fiche n'a pas (ou plus) de fichier. */
  async getBlob(id: EntityId): Promise<Blob | null> {
    const record = await db.documentFiles.get(id)
    return record?.blob ?? null
  },

  /* --- Ecriture ---------------------------------------------------------- */

  /**
   * Cree un document avec son fichier.
   * Metadonnees et contenu sont ecrits dans une transaction unique : jamais de
   * fiche sans fichier ni de fichier orphelin.
   */
  async create(
    draft: DocumentDraft,
    file: { blob: Blob; fileName: string; mimeType: string; size: number },
  ): Promise<TravelDocument> {
    const timestamp = nowIso()
    const document: TravelDocument = {
      ...draft,
      id: createId(),
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    try {
      await db.transaction('rw', [db.documents, db.documentFiles], async () => {
        await db.documents.add(document)
        await db.documentFiles.add({ id: document.id, blob: file.blob })
      })
    } catch (cause) {
      throw new AppError('DOCUMENT_SAVE', ERROR_MESSAGES.DOCUMENT_SAVE, { cause })
    }
    return document
  },

  /** Met a jour les seules metadonnees. Le fichier n'est pas touche. */
  async update(id: EntityId, draft: DocumentDraft): Promise<TravelDocument> {
    const existing = await this.getByIdOrFail(id)
    const updated: TravelDocument = {
      ...existing,
      ...draft,
      // Ces champs doivent pouvoir etre EFFACES : le spread ne suffit pas
      // puisque la cle est alors absente du brouillon.
      eventId: draft.eventId,
      usefulDate: draft.usefulDate,
      note: draft.note,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    }
    try {
      await db.documents.put(updated)
    } catch (cause) {
      throw new AppError('DOCUMENT_SAVE', ERROR_MESSAGES.DOCUMENT_SAVE, { cause })
    }
    return updated
  },

  async getByIdOrFail(id: EntityId): Promise<TravelDocument> {
    const document = await db.documents.get(id)
    if (!document) {
      throw new AppError('DOCUMENT_NOT_FOUND', ERROR_MESSAGES.DOCUMENT_NOT_FOUND, {
        cause: new Error(`Document introuvable : ${id}`),
      })
    }
    return document
  },

  /** Associe ou dissocie un evenement. */
  async setEvent(id: EntityId, eventId: EntityId | undefined): Promise<TravelDocument> {
    const existing = await this.getByIdOrFail(id)
    const updated: TravelDocument = { ...existing, eventId, updatedAt: nowIso() }
    try {
      await db.documents.put(updated)
    } catch (cause) {
      throw new AppError('DOCUMENT_SAVE', ERROR_MESSAGES.DOCUMENT_SAVE, { cause })
    }
    return updated
  },

  async setArchived(id: EntityId, archived: boolean): Promise<TravelDocument> {
    const existing = await this.getByIdOrFail(id)
    const updated: TravelDocument = { ...existing, archived, updatedAt: nowIso() }
    try {
      await db.documents.put(updated)
    } catch (cause) {
      throw new AppError('DOCUMENT_SAVE', ERROR_MESSAGES.DOCUMENT_SAVE, { cause })
    }
    return updated
  },

  /** Supprime la fiche ET son fichier, en une transaction. */
  async remove(id: EntityId): Promise<void> {
    try {
      await db.transaction('rw', [db.documents, db.documentFiles], async () => {
        await db.documentFiles.delete(id)
        await db.documents.delete(id)
      })
    } catch (cause) {
      throw new AppError('DOCUMENT_DELETE', ERROR_MESSAGES.DOCUMENT_DELETE, { cause })
    }
  },

  /**
   * Traite les documents d'un evenement supprime.
   *
   * @param mode `supprimer` efface fiches et fichiers ; `conserver` ne retire
   *             que l'association, les documents restent dans la bibliotheque.
   */
  async handleEventDeletion(
    eventId: EntityId,
    mode: 'supprimer' | 'conserver',
  ): Promise<number> {
    const attached = await db.documents.where('eventId').equals(eventId).toArray()
    if (attached.length === 0) return 0

    const ids = attached.map((document) => document.id)
    await db.transaction('rw', [db.documents, db.documentFiles], async () => {
      if (mode === 'supprimer') {
        await db.documentFiles.bulkDelete(ids)
        await db.documents.bulkDelete(ids)
      } else {
        const timestamp = nowIso()
        await db.documents.bulkPut(
          attached.map((document) => ({
            ...document,
            eventId: undefined,
            updatedAt: timestamp,
          })),
        )
      }
    })
    return attached.length
  },
}

/** Tri par date utile croissante ; les documents sans date passent en dernier. */
function byUsefulDate(a: TravelDocument, b: TravelDocument): number {
  return (a.usefulDate ?? '9999').localeCompare(b.usefulDate ?? '9999')
}
