import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentSheet } from '@/components/documents/DocumentSheet'
import { Icon } from '@/components/icons/Icon'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmSheet,
  PageHeader,
  SkeletonBlock,
  StateBlock,
} from '@/components/ui'
import { DOCUMENT_VISUALS } from '@/config/visuals'
import { documentsRepository, eventsRepository } from '@/db/repositories'
import { downloadBlob, useDocumentFile } from '@/hooks/useDocumentFile'
import { useLiveData } from '@/hooks/useLiveData'
import { DOCUMENT_CATEGORY_LABELS } from '@/models'
import { ROUTES, eventDetailPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatDateTime, formatLongDate } from '@/utils/date'
import { formatFileSize, isPreviewableImage } from '@/utils/fileRules'

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useLiveData(async () => {
    if (!id) return null
    const document = await documentsRepository.getById(id)
    if (!document) return null
    const events = await eventsRepository.listAll()
    return {
      document,
      events,
      eventTitle: document.eventId
        ? (events.find((event) => event.id === document.eventId)?.title ?? null)
        : null,
    }
  }, [id])

  // Le fichier n'est charge qu'ici, jamais dans les listes.
  const file = useDocumentFile(data?.document.size ? id : undefined)

  async function handleArchive() {
    if (!data) return
    setBusy(true)
    setActionError(null)
    try {
      const next = !data.document.archived
      await documentsRepository.setArchived(data.document.id, next)
      setNotice(next ? 'Document archive.' : 'Document restaure dans la bibliotheque.')
    } catch (cause) {
      setActionError(toUserMessage(cause, ERROR_MESSAGES.DOCUMENT_SAVE))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setBusy(true)
    try {
      await documentsRepository.remove(id)
      setConfirmDelete(false)
      navigate(ROUTES.documents, {
        replace: true,
        state: { flash: `« ${data?.document.title ?? 'Document'} » a ete supprime.` },
      })
    } catch (cause) {
      setConfirmDelete(false)
      setActionError(toUserMessage(cause, ERROR_MESSAGES.DOCUMENT_DELETE))
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Document" onBack={() => navigate(-1)} />
        <SkeletonBlock height={240} />
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Document" onBack={() => navigate(ROUTES.documents)} />
        <StateBlock
          error={Boolean(error)}
          icon="attention"
          title={error ? 'Document illisible' : 'Document introuvable'}
          text={error ?? ERROR_MESSAGES.DOCUMENT_NOT_FOUND}
          action={
            <Button variant="secondary" onClick={() => navigate(ROUTES.documents)}>
              Voir la bibliotheque
            </Button>
          }
        />
      </>
    )
  }

  const { document: doc, eventTitle } = data
  const visual = DOCUMENT_VISUALS[doc.category]
  const hasFile = doc.size > 0

  return (
    <>
      <PageHeader title="Document" onBack={() => navigate(-1)} />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card className="detail-card">
        {/* --- Previsualisation ------------------------------------------- */}
        <div className="doc-preview">
          {!hasFile ? (
            <div className="doc-preview__fallback">
              <Icon name={visual.icon} size={36} />
              <p>Aucun fichier joint</p>
            </div>
          ) : file.loading ? (
            <SkeletonBlock height={200} />
          ) : file.error || !file.url ? (
            <div className="doc-preview__fallback">
              <Icon name="attention" size={32} />
              <p>{file.error ?? ERROR_MESSAGES.DOCUMENT_FILE_MISSING}</p>
            </div>
          ) : isPreviewableImage(doc.mimeType) ? (
            <img src={file.url} alt={doc.title} className="doc-preview__image" />
          ) : doc.mimeType === 'application/pdf' ? (
            /* Safari iOS n'affiche pas toujours un PDF en <object> : le repli
               interne garantit qu'on propose au moins l'ouverture. */
            <object data={file.url} type="application/pdf" className="doc-preview__pdf">
              <div className="doc-preview__fallback">
                <Icon name="document" size={32} />
                <p>La previsualisation n’est pas disponible ici. Ouvre le fichier pour le lire.</p>
              </div>
            </object>
          ) : (
            <div className="doc-preview__fallback">
              <Icon name="document" size={32} />
              <p>Ce format ne se previsualise pas. Ouvre ou telecharge le fichier.</p>
            </div>
          )}
        </div>

        <div className="detail-card__body">
          <h2 className="detail-card__title">{doc.title}</h2>

          <div className="badge-row detail-card__indicators">
            <Badge tone="leather">{DOCUMENT_CATEGORY_LABELS[doc.category]}</Badge>
            {doc.archived ? <Badge>Archive</Badge> : null}
            {!hasFile ? <Badge tone="blush">Fichier manquant</Badge> : null}
          </div>

          <dl className="detail-list">
            {hasFile ? (
              <div className="detail-list__row">
                <dt>
                  <Icon name="dossier" size={17} />
                  <span>Fichier</span>
                </dt>
                <dd>
                  {doc.fileName}
                  <br />
                  <span className="text-faint">
                    {formatFileSize(doc.size)} · {doc.mimeType || 'type inconnu'}
                  </span>
                </dd>
              </div>
            ) : null}

            {doc.usefulDate ? (
              <div className="detail-list__row">
                <dt>
                  <Icon name="calendrier" size={17} />
                  <span>Date utile</span>
                </dt>
                <dd>{formatLongDate(doc.usefulDate)}</dd>
              </div>
            ) : null}

            <div className="detail-list__row">
              <dt>
                <Icon name="etoiles" size={17} />
                <span>Evenement</span>
              </dt>
              <dd>
                {eventTitle && doc.eventId ? (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => navigate(eventDetailPath(doc.eventId!))}
                  >
                    {eventTitle}
                  </button>
                ) : (
                  <span className="text-faint">Aucun</span>
                )}
              </dd>
            </div>
          </dl>

          {doc.note ? (
            <div className="detail-card__notes">
              <h3 className="detail-card__notes-title">Note</h3>
              <p>{doc.note}</p>
            </div>
          ) : null}

          <p className="detail-card__stamps">
            Ajoute le {formatDateTime(doc.createdAt)}
            <br />
            Derniere modification le {formatDateTime(doc.updatedAt)}
          </p>
        </div>
      </Card>

      {/* --- Actions ---------------------------------------------------------- */}
      <div className="detail-actions">
        {hasFile && file.url ? (
          <div className="detail-actions__row">
            <Button
              variant="primary"
              icon="dossier"
              onClick={() => window.open(file.url!, '_blank', 'noopener')}
            >
              Ouvrir
            </Button>
            <Button
              variant="secondary"
              icon="telecharger"
              onClick={() => file.blob && downloadBlob(file.blob, doc.fileName)}
            >
              Telecharger
            </Button>
          </div>
        ) : null}

        <Button variant="secondary" icon="crayon" block onClick={() => setEditing(true)}>
          Modifier
        </Button>

        <div className="detail-actions__row">
          <Button variant="secondary" icon="copier" onClick={() => setDuplicating(true)}>
            Dupliquer
          </Button>
          <Button variant="secondary" icon="sauvegarde" disabled={busy} onClick={handleArchive}>
            {doc.archived ? 'Desarchiver' : 'Archiver'}
          </Button>
        </div>

        <Button
          variant="ghost"
          icon="corbeille"
          block
          className="btn--danger"
          onClick={() => setConfirmDelete(true)}
        >
          Supprimer
        </Button>
      </div>

      <DocumentSheet
        open={editing}
        document={doc}
        events={data.events}
        onClose={() => setEditing(false)}
      />

      <DocumentSheet
        open={duplicating}
        duplicateOf={doc}
        events={data.events}
        onClose={() => setDuplicating(false)}
        onSaved={(created) => navigate(`/documents/${created.id}`, { replace: true })}
      />

      <ConfirmSheet
        open={confirmDelete}
        busy={busy}
        title="Supprimer ce document ?"
        description={
          <>
            « <strong>{doc.title}</strong> » et son fichier seront definitivement supprimes de cet
            appareil. Cette action est irreversible.
          </>
        }
        confirmLabel="Supprimer definitivement"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
