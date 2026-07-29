import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BudgetSection } from '@/components/events/BudgetSection'
import { DocumentsSection } from '@/components/events/DocumentsSection'
import { ItemsSection } from '@/components/events/ItemsSection'
import { ParticipantsSection } from '@/components/events/ParticipantsSection'
import { TasksSection } from '@/components/events/TasksSection'
import { Icon } from '@/components/icons/Icon'
import { Illustration } from '@/components/icons/Illustration'
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
import { EVENT_STATUS_TONES, illustrationFor } from '@/config/visuals'
import { documentsRepository, eventsRepository } from '@/db/repositories'
import { useEventModules } from '@/hooks/useEventModules'
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '@/models'
import { ROUTES, eventEditPath, eventNewPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatDateTime, formatDuration, formatLongDate, formatTime } from '@/utils/date'
import { dayCount, isMultiDay, isOngoingEvent, isPastEvent } from '@/utils/eventRules'

/** Ancres des sections, pour la navigation interne de la fiche. */
const SECTIONS = [
  { id: 'apercu', label: 'Apercu' },
  { id: 'organisation', label: 'Organisation' },
  { id: 'participants', label: 'Participants' },
  { id: 'budget', label: 'Budget' },
  { id: 'a-ramener', label: 'A ramener' },
  { id: 'documents', label: 'Documents' },
] as const

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  /**
   * Sort des documents rattaches lors de la suppression de l'evenement.
   * Par defaut on CONSERVE : effacer silencieusement des fichiers importes par
   * l'utilisateur serait la pire des surprises.
   */
  const [deleteDocuments, setDeleteDocuments] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useEventModules(id)

  async function handleMarkDone() {
    if (!id) return
    setActionError(null)
    setBusy(true)
    try {
      await eventsRepository.setStatus(id, 'termine')
      setNotice('Evenement marque comme termine.')
    } catch (cause) {
      setActionError(toUserMessage(cause, ERROR_MESSAGES.EVENT_UPDATE))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setBusy(true)
    try {
      // Les documents sont traites AVANT la cascade, selon le choix explicite
      // de l'utilisateur : suppression du fichier, ou simple dissociation.
      await documentsRepository.handleEventDeletion(
        id,
        deleteDocuments ? 'supprimer' : 'conserver',
      )
      // Supprime aussi taches, participants, objets et depenses (cascade).
      await eventsRepository.remove(id)
      setConfirmDelete(false)
      navigate(ROUTES.events, {
        replace: true,
        state: { flash: `« ${data?.event.title ?? 'Evenement'} » a ete supprime.` },
      })
    } catch (cause) {
      setConfirmDelete(false)
      setActionError(toUserMessage(cause, ERROR_MESSAGES.EVENT_DELETE))
      setBusy(false)
    }
  }

  function scrollTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Evenement" onBack={() => navigate(-1)} />
        <SkeletonBlock height={260} />
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Evenement" onBack={() => navigate(ROUTES.events)} />
        <StateBlock
          error={Boolean(error)}
          icon="attention"
          title={error ? 'Evenement illisible' : 'Evenement introuvable'}
          text={error ?? ERROR_MESSAGES.EVENT_NOT_FOUND}
          action={
            <Button variant="secondary" onClick={() => navigate(ROUTES.events)}>
              Voir tous les evenements
            </Button>
          }
        />
      </>
    )
  }

  const {
    event,
    tasks,
    participants,
    items,
    expenses,
    documents,
    availableDocuments,
    allEvents,
    progress,
    budget,
    confirmedCount,
  } = data
  const past = isPastEvent(event)
  const ongoing = isOngoingEvent(event)
  const days = dayCount(event)

  return (
    <>
      <PageHeader title="Fiche evenement" onBack={() => navigate(-1)} />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {/* --- Navigation interne ------------------------------------------- */}
      <nav className="chip-row" aria-label="Sections de la fiche">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className="chip"
            onClick={() => scrollTo(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {/* --- Apercu --------------------------------------------------------- */}
      <div id="apercu">
        <Card className="detail-card">
          <div className="detail-card__banner">
            <Illustration name={illustrationFor(event)} className="detail-card__illustration" />
            <div className="detail-card__banner-badges">
              <Badge className="detail-card__banner-badge">
                {EVENT_CATEGORY_LABELS[event.category]}
              </Badge>
              {ongoing ? <Badge className="detail-card__banner-badge">En cours</Badge> : null}
              {past ? <Badge className="detail-card__banner-badge">Passe</Badge> : null}
            </div>
          </div>

          <div className="detail-card__body">
            <h2 className="detail-card__title">{event.title}</h2>

            {/* Indicateurs synthetiques des modules renseignes. */}
            {progress.total > 0 ||
            participants.length > 0 ||
            budget.spent > 0 ||
            documents.length > 0 ? (
              <div className="badge-row detail-card__indicators">
                {progress.total > 0 ? (
                  <Badge tone={progress.complete ? 'sage' : 'apricot'}>
                    Preparation {progress.percent} %
                  </Badge>
                ) : null}
                {participants.length > 0 ? (
                  <Badge tone="sky">
                    {confirmedCount}/{participants.length} confirmes
                  </Badge>
                ) : null}
                {budget.hasPlan ? (
                  <Badge tone={budget.overBudget ? 'blush' : 'mint'}>
                    Budget {budget.percentUsed} %
                  </Badge>
                ) : null}
                {documents.length > 0 ? (
                  <Badge tone="sage">
                    {documents.length} document{documents.length > 1 ? 's' : ''}
                  </Badge>
                ) : null}
              </div>
            ) : null}

            <dl className="detail-list">
              <div className="detail-list__row">
                <dt>
                  <Icon name="calendrier" size={17} />
                  <span>Debut</span>
                </dt>
                <dd>
                  {formatLongDate(event.startDate)}
                  {event.allDay ? '' : ` · ${formatTime(event.startDate)}`}
                </dd>
              </div>

              {event.endDate ? (
                <div className="detail-list__row">
                  <dt>
                    <Icon name="calendrier" size={17} />
                    <span>Fin</span>
                  </dt>
                  <dd>
                    {formatLongDate(event.endDate)}
                    {event.allDay ? '' : ` · ${formatTime(event.endDate)}`}
                  </dd>
                </div>
              ) : null}

              <div className="detail-list__row">
                <dt>
                  <Icon name="horloge" size={17} />
                  <span>Duree</span>
                </dt>
                <dd>
                  {formatDuration(event.startDate, event.endDate, event.allDay, days)}
                  {isMultiDay(event) ? ' (plusieurs jours)' : ''}
                </dd>
              </div>

              {event.location ? (
                <div className="detail-list__row">
                  <dt>
                    <Icon name="localisation" size={17} />
                    <span>Lieu</span>
                  </dt>
                  <dd>{event.location}</dd>
                </div>
              ) : null}

              <div className="detail-list__row">
                <dt>
                  <Icon name="etoiles" size={17} />
                  <span>Statut</span>
                </dt>
                <dd>
                  <Badge tone={EVENT_STATUS_TONES[event.status]}>
                    {EVENT_STATUS_LABELS[event.status]}
                  </Badge>
                </dd>
              </div>
            </dl>

            {event.description ? (
              <div className="detail-card__notes">
                <h3 className="detail-card__notes-title">Notes</h3>
                <p>{event.description}</p>
              </div>
            ) : null}

            <p className="detail-card__stamps">
              Cree le {formatDateTime(event.createdAt)}
              <br />
              Derniere modification le {formatDateTime(event.updatedAt)}
            </p>
          </div>
        </Card>
      </div>

      {/* --- Modules facultatifs --------------------------------------------- */}
      <TasksSection eventId={event.id} tasks={tasks} />
      <ParticipantsSection eventId={event.id} participants={participants} />
      <BudgetSection
        eventId={event.id}
        planned={event.budget}
        expenses={expenses}
        items={items}
      />
      <ItemsSection eventId={event.id} items={items} />
      <DocumentsSection
        eventId={event.id}
        documents={documents}
        available={availableDocuments}
        events={allEvents}
      />

      {/* --- Actions ---------------------------------------------------------- */}
      <div className="detail-actions">
        <Button
          variant="primary"
          icon="crayon"
          block
          onClick={() => navigate(eventEditPath(event.id))}
        >
          Modifier
        </Button>
        <div className="detail-actions__row">
          <Button
            variant="secondary"
            icon="copier"
            onClick={() => navigate(eventNewPath({ duplicateOf: event.id }))}
          >
            Dupliquer
          </Button>
          <Button
            variant="secondary"
            icon="valide"
            disabled={busy || event.status === 'termine'}
            onClick={handleMarkDone}
          >
            {event.status === 'termine' ? 'Termine' : 'Marquer termine'}
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

      <ConfirmSheet
        open={confirmDelete}
        busy={busy}
        title="Supprimer cet evenement ?"
        description={
          <>
            « <strong>{event.title}</strong> » sera definitivement supprime de cet appareil, ainsi
            que ses taches, participants, depenses et objets a ramener. Cette action est
            irreversible.
            {documents.length > 0 ? (
              <span className="confirm-choice">
                <label className="switch" htmlFor="supprimer-documents">
                  <input
                    id="supprimer-documents"
                    type="checkbox"
                    checked={deleteDocuments}
                    onChange={(e) => setDeleteDocuments(e.target.checked)}
                  />
                  <span className="switch__track" aria-hidden="true">
                    <span className="switch__thumb" />
                  </span>
                  <span className="switch__label">
                    Supprimer aussi {documents.length} document
                    {documents.length > 1 ? 's' : ''} et leurs fichiers
                  </span>
                </label>
                <span className="confirm-choice__hint">
                  {deleteDocuments
                    ? 'Les fichiers seront definitivement effaces.'
                    : 'Les documents resteront dans ta bibliotheque, sans evenement associe.'}
                </span>
              </span>
            ) : null}
          </>
        }
        details={
          tasks.length + participants.length + items.length + expenses.length > 0 ? (
            <dl>
              <dt>Taches</dt>
              <dd>{tasks.length}</dd>
              <dt>Participants</dt>
              <dd>{participants.length}</dd>
              <dt>Depenses</dt>
              <dd>{expenses.length}</dd>
              <dt>A ramener</dt>
              <dd>{items.length}</dd>
            </dl>
          ) : null
        }
        confirmLabel="Supprimer definitivement"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmDelete(false)
          setDeleteDocuments(false)
        }}
      />
    </>
  )
}
