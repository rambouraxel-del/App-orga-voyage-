import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { eventsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '@/models'
import { ROUTES, eventEditPath, eventNewPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatDateTime, formatDuration, formatLongDate, formatTime } from '@/utils/date'
import { dayCount, isMultiDay, isOngoingEvent, isPastEvent } from '@/utils/eventRules'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useLiveData(
    () => (id ? eventsRepository.getById(id) : Promise.resolve(undefined)),
    [id],
  )

  /* --- Actions --------------------------------------------------------- */

  async function handleDuplicate() {
    if (!id) return
    // On passe par le formulaire pre-rempli : l'utilisateur peut ajuster la
    // date avant de valider, et l'original n'est jamais touche.
    navigate(eventNewPath({ duplicateOf: id }))
  }

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
      await eventsRepository.remove(id)
      setConfirmDelete(false)
      navigate(ROUTES.events, {
        replace: true,
        state: { flash: `« ${data?.title ?? 'Evenement'} » a ete supprime.` },
      })
    } catch (cause) {
      setConfirmDelete(false)
      setActionError(toUserMessage(cause, ERROR_MESSAGES.EVENT_DELETE))
      setBusy(false)
    }
  }

  /* --- Rendu ------------------------------------------------------------ */

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

  const event = data
  const past = isPastEvent(event)
  const ongoing = isOngoingEvent(event)
  const days = dayCount(event)

  return (
    <>
      <PageHeader title="Fiche evenement" onBack={() => navigate(-1)} />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

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

      {/* --- Actions -------------------------------------------------------- */}
      <div className="detail-actions">
        <Button variant="primary" icon="crayon" block onClick={() => navigate(eventEditPath(event.id))}>
          Modifier
        </Button>
        <div className="detail-actions__row">
          <Button variant="secondary" icon="copier" onClick={handleDuplicate}>
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
            « <strong>{event.title}</strong> » sera definitivement supprime de cet appareil. Cette
            action est irreversible.
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
