import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DocumentSheet } from '@/components/documents/DocumentSheet'
import { Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { DOCUMENT_VISUALS } from '@/config/visuals'
import { documentsRepository } from '@/db/repositories'
import { DOCUMENT_CATEGORY_LABELS, type AppEvent, type TravelDocument } from '@/models'
import { documentDetailPath, documentsPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatShortDate } from '@/utils/date'
import { formatFileSize } from '@/utils/fileRules'
import { IconChip } from '@/components/ui'
import { ModuleSection } from './ModuleSection'

export interface DocumentsSectionProps {
  eventId: string
  documents: TravelDocument[]
  /** Documents non rattaches, proposes a l'association. */
  available: TravelDocument[]
  events: AppEvent[]
}

export function DocumentsSection({
  eventId,
  documents,
  available,
  events,
}: DocumentsSectionProps) {
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [linking, setLinking] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const totalSize = documents.reduce((sum, document) => sum + (document.size || 0), 0)

  async function handleLink() {
    if (!selectedId) {
      setError('Choisis un document a rattacher.')
      return
    }
    setBusy(true)
    try {
      await documentsRepository.setEvent(selectedId, eventId)
      setLinking(false)
      setSelectedId('')
      setError(null)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.DOCUMENT_SAVE))
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlink(document: TravelDocument) {
    setBusy(true)
    try {
      // On retire seulement l'association : le document reste dans la
      // bibliotheque, jamais supprime a l'insu de l'utilisateur.
      await documentsRepository.setEvent(document.id, undefined)
      setError(null)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.DOCUMENT_SAVE))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="documents"
        title="Documents"
        icon="dossier"
        addLabel="Ajouter un document"
        onAdd={() => setAdding(true)}
        isEmpty={documents.length === 0}
        emptyText="Aucun document rattache. Importe un billet ou une reservation pour l’avoir sous la main le jour J."
        summary={
          documents.length > 0 ? (
            <p className="module__summary-text">
              {documents.length} document{documents.length > 1 ? 's' : ''} ·{' '}
              {formatFileSize(totalSize)}
            </p>
          ) : null
        }
      >
        <ul className="row-list">
          {documents.map((document) => (
            <li key={document.id}>
              <div className="row row--split">
                <button
                  type="button"
                  className="row__main"
                  onClick={() => navigate(documentDetailPath(document.id))}
                >
                  <IconChip
                    icon={DOCUMENT_VISUALS[document.category].icon}
                    tone={DOCUMENT_VISUALS[document.category].tone}
                    small
                  />
                  <span className="row__body">
                    <span className="row__title">{document.title}</span>
                    <span className="row__meta">
                      {DOCUMENT_CATEGORY_LABELS[document.category]}
                      {document.size > 0 ? ` · ${formatFileSize(document.size)}` : ' · sans fichier'}
                      {document.usefulDate ? ` · ${formatShortDate(document.usefulDate)}` : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="row__action"
                  onClick={() => handleUnlink(document)}
                  disabled={busy}
                  aria-label={`Retirer ${document.title} de cet evenement`}
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="module__links">
          {available.length > 0 ? (
            <button type="button" className="link-button" onClick={() => setLinking(true)}>
              Rattacher un document existant
            </button>
          ) : null}
          {documents.length > 0 ? (
            <button
              type="button"
              className="link-button"
              onClick={() => navigate(documentsPath({ eventId }))}
            >
              Voir dans la bibliotheque
            </button>
          ) : null}
        </div>

        {error ? <Badge tone="blush">{error}</Badge> : null}
      </ModuleSection>

      {/* Import direct, avec l'evenement deja pre-selectionne. */}
      <DocumentSheet
        open={adding}
        events={events}
        defaultEventId={eventId}
        onClose={() => setAdding(false)}
      />

      {/* Rattachement d'un document deja present dans la bibliotheque. */}
      <EditSheet
        open={linking}
        title="Rattacher un document"
        error={error}
        busy={busy}
        submitLabel="Rattacher"
        onSubmit={handleLink}
        onCancel={() => {
          setLinking(false)
          setSelectedId('')
          setError(null)
        }}
      >
        <SheetField label="Document">
          <select
            className="field__input field__input--select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Choisir…</option>
            {available.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
        </SheetField>
      </EditSheet>
    </>
  )
}
