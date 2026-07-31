import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons/Icon'
import { documentLinksRepository } from '@/db/repositories'
import type { DocumentLink, DocumentLinkTarget, TravelDocument } from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'

export interface LinkedDocumentsProps {
  targetId: string
  targetType: DocumentLinkTarget
  /** Toutes les liaisons du voyage, filtrees ici : evite une requete par ligne. */
  links: DocumentLink[]
  /** Documents du voyage, seuls candidats a l'association. */
  documents: TravelDocument[]
}

/**
 * Billets et reservations rattaches a un element precis (vol, hotel, activite).
 *
 * Le rattachement passe par une table de liaison : retirer l'association ne
 * supprime jamais le fichier, qui reste dans la bibliotheque.
 */
export function LinkedDocuments({ targetId, targetType, links, documents }: LinkedDocumentsProps) {
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attached = useMemo(() => {
    const ids = new Set(links.filter((link) => link.targetId === targetId).map((l) => l.documentId))
    return documents.filter((document) => ids.has(document.id))
  }, [links, targetId, documents])

  const available = useMemo(() => {
    const ids = new Set(attached.map((document) => document.id))
    return documents.filter((document) => !ids.has(document.id))
  }, [attached, documents])

  async function handleLink(documentId: string) {
    setAdding(false)
    try {
      await documentLinksRepository.link(documentId, targetType, targetId)
      setError(null)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('document')))
    }
  }

  async function handleUnlink(documentId: string) {
    try {
      await documentLinksRepository.unlink(documentId, targetId)
      setError(null)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_DELETE('document')))
    }
  }

  if (attached.length === 0 && available.length === 0) return null

  return (
    <div className="linked-docs">
      {attached.map((document) => (
        <span className="linked-docs__tag" key={document.id}>
          <Icon name="document" size={13} />
          <span>{document.title}</span>
          <button
            type="button"
            onClick={() => handleUnlink(document.id)}
            aria-label={`Detacher ${document.title}`}
          >
            <Icon name="fermer" size={12} />
          </button>
        </span>
      ))}

      {available.length > 0 ? (
        adding ? (
          <select
            className="linked-docs__select"
            defaultValue=""
            aria-label="Rattacher un document"
            onChange={(e) => {
              if (e.target.value) void handleLink(e.target.value)
            }}
            onBlur={() => setAdding(false)}
          >
            <option value="">Choisir un document…</option>
            {available.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
        ) : (
          <button type="button" className="linked-docs__add" onClick={() => setAdding(true)}>
            <Icon name="plus" size={12} />
            <span>Billet</span>
          </button>
        )
      ) : null}

      {error ? <span className="linked-docs__error">{error}</span> : null}
    </div>
  )
}
