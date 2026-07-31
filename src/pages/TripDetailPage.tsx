import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentsSection } from '@/components/events/DocumentsSection'
import { ParticipantsSection } from '@/components/events/ParticipantsSection'
import { TasksSection } from '@/components/events/TasksSection'
import { Icon } from '@/components/icons/Icon'
import { Illustration, resolveIllustration } from '@/components/icons/Illustration'
import { ProgramSection } from '@/components/trips/ProgramSection'
import { StagesSection } from '@/components/trips/StagesSection'
import { StaysSection } from '@/components/trips/StaysSection'
import { TransportsSection } from '@/components/trips/TransportsSection'
import { TripBudgetSection } from '@/components/trips/TripBudgetSection'
import { TripChecklistSection } from '@/components/trips/TripChecklistSection'
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
import { TRIP_STATUS_TONES } from '@/config/visuals'
import { db } from '@/db/database'
import { tripsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { useTripPlan } from '@/hooks/useTripPlan'
import { TRIP_STATUSES, TRIP_STATUS_LABELS, type TripStatus } from '@/models'
import { ROUTES, tripEditPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatCountdown, formatDateRange, formatShortDate, formatTime } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { daysUntilDeparture, nightCount } from '@/utils/tripRules'

/** Ancres des sections, pour la navigation interne de la fiche. */
const SECTIONS = [
  { id: 'apercu', label: 'Apercu' },
  { id: 'itineraire', label: 'Itineraire' },
  { id: 'programme', label: 'Programme' },
  { id: 'transports', label: 'Transports' },
  { id: 'hebergements', label: 'Hebergements' },
  { id: 'budget', label: 'Budget' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'participants', label: 'Participants' },
  { id: 'documents', label: 'Documents' },
] as const

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  /** Par defaut on CONSERVE les documents : ne jamais effacer un fichier par surprise. */
  const [deleteDocuments, setDeleteDocuments] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error } = useTripPlan(id)
  // Les selecteurs d'association de documents ont besoin de tous les evenements.
  const { data: allEvents } = useLiveData(() => db.events.toArray())

  const nextActions = useMemo(() => {
    if (!data) return []
    const actions: Array<{ label: string; anchor: string }> = []
    if (data.transports.length === 0) {
      actions.push({ label: 'Ajouter un premier trajet', anchor: 'transports' })
    } else if (data.transports.some((t) => t.status === 'a-reserver')) {
      const count = data.transports.filter((t) => t.status === 'a-reserver').length
      actions.push({ label: `Reserver ${count} trajet${count > 1 ? 's' : ''}`, anchor: 'transports' })
    }
    if (data.uncoveredNights.length > 0) {
      actions.push({
        label: `${data.uncoveredNights.length} nuit${data.uncoveredNights.length > 1 ? 's' : ''} sans hebergement`,
        anchor: 'hebergements',
      })
    }
    if (data.progress.overdue > 0) {
      actions.push({
        label: `${data.progress.overdue} tache${data.progress.overdue > 1 ? 's' : ''} en retard`,
        anchor: 'organisation',
      })
    }
    const toBook = data.activities.filter((a) => a.bookingRequired && a.status === 'idee').length
    if (toBook > 0) {
      actions.push({ label: `${toBook} activite${toBook > 1 ? 's' : ''} a reserver`, anchor: 'programme' })
    }
    if (data.budget.overBudget) {
      actions.push({ label: 'Budget depasse', anchor: 'budget' })
    }
    return actions.slice(0, 4)
  }, [data])

  async function handleStatus(status: TripStatus) {
    if (!id) return
    setActionError(null)
    setBusy(true)
    try {
      await tripsRepository.setStatus(id, status)
      setNotice(`Statut mis a jour : ${TRIP_STATUS_LABELS[status].toLocaleLowerCase('fr-FR')}.`)
    } catch (cause) {
      setActionError(toUserMessage(cause, ERROR_MESSAGES.TRIP_SAVE))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setBusy(true)
    try {
      await tripsRepository.remove(id, deleteDocuments ? 'supprimer' : 'conserver')
      setConfirmDelete(false)
      navigate(ROUTES.trips, {
        replace: true,
        state: { flash: `« ${data?.trip.title ?? 'Voyage'} » a ete supprime.` },
      })
    } catch (cause) {
      setConfirmDelete(false)
      setActionError(toUserMessage(cause, ERROR_MESSAGES.TRIP_DELETE))
      setBusy(false)
    }
  }

  function scrollTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Voyage" onBack={() => navigate(-1)} />
        <SkeletonBlock height={280} />
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Voyage" onBack={() => navigate(ROUTES.trips)} />
        <StateBlock
          error={Boolean(error)}
          icon="attention"
          title={error ? 'Voyage illisible' : 'Voyage introuvable'}
          text={error ?? ERROR_MESSAGES.TRIP_NOT_FOUND}
          action={
            <Button variant="secondary" onClick={() => navigate(ROUTES.trips)}>
              Voir tous les voyages
            </Button>
          }
        />
      </>
    )
  }

  const { trip, budget, progress, days, currency } = data
  const countdown = daysUntilDeparture(trip.startDate)
  const nights = nightCount(trip.startDate, trip.endDate)
  const ongoing = trip.status === 'en-cours' || (countdown <= 0 && new Date(trip.endDate) >= new Date())
  /** Prochain trajet a venir : l'information la plus utile a l'approche du depart. */
  const nextTransport = data.transports.find(
    (transport) => transport.status !== 'annule' && new Date(transport.departure) >= new Date(),
  )

  return (
    <>
      <PageHeader title="Fiche voyage" onBack={() => navigate(-1)} />

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <nav className="chip-row" aria-label="Sections de la fiche">
        {SECTIONS.map((section) => (
          <button key={section.id} type="button" className="chip" onClick={() => scrollTo(section.id)}>
            {section.label}
          </button>
        ))}
      </nav>

      {/* --- Apercu --------------------------------------------------------- */}
      <div id="apercu">
        <Card className="detail-card">
          <div className="detail-card__banner">
            <Illustration
              name={resolveIllustration(trip.imageKey ?? trip.destination)}
              className="detail-card__illustration"
            />
            <div className="detail-card__banner-badges">
              <Badge tone={TRIP_STATUS_TONES[trip.status]} className="detail-card__banner-badge">
                {TRIP_STATUS_LABELS[trip.status]}
              </Badge>
              {ongoing ? <Badge className="detail-card__banner-badge">En cours</Badge> : null}
            </div>
          </div>

          <div className="detail-card__body">
            <h2 className="detail-card__title">{trip.title}</h2>

            <div className="trip-countdown">
              <span className="trip-countdown__value">
                {trip.status === 'termine' || trip.status === 'annule'
                  ? TRIP_STATUS_LABELS[trip.status]
                  : formatCountdown(trip.startDate)}
              </span>
              <span className="trip-countdown__meta">
                {days.length} journee{days.length > 1 ? 's' : ''} · {nights} nuit
                {nights > 1 ? 's' : ''}
              </span>
            </div>

            <div className="badge-row detail-card__indicators">
              {progress.total > 0 ? (
                <Badge tone={progress.complete ? 'sage' : 'apricot'}>
                  Preparation {progress.percent} %
                </Badge>
              ) : null}
              {data.participants.length > 0 ? (
                <Badge tone="sky">
                  {data.confirmedCount}/{data.participants.length} confirmes
                </Badge>
              ) : null}
              {budget.hasPlan ? (
                <Badge tone={budget.overBudget ? 'blush' : 'mint'}>Budget {budget.percentUsed} %</Badge>
              ) : budget.spent > 0 ? (
                <Badge tone="mint">{formatCurrency(budget.spent, currency)} engages</Badge>
              ) : null}
              {data.documents.length > 0 ? (
                <Badge tone="sage">
                  {data.documents.length} document{data.documents.length > 1 ? 's' : ''}
                </Badge>
              ) : null}
            </div>

            <dl className="detail-list">
              <div className="detail-list__row">
                <dt>
                  <Icon name="calendrier" size={17} />
                  <span>Dates</span>
                </dt>
                <dd>{formatDateRange(trip.startDate, trip.endDate)}</dd>
              </div>

              <div className="detail-list__row">
                <dt>
                  <Icon name="localisation" size={17} />
                  <span>Destination</span>
                </dt>
                <dd>{trip.destination}</dd>
              </div>

              {trip.origin ? (
                <div className="detail-list__row">
                  <dt>
                    <Icon name="boussole" size={17} />
                    <span>Depart de</span>
                  </dt>
                  <dd>{trip.origin}</dd>
                </div>
              ) : null}

              {nextTransport ? (
                <div className="detail-list__row">
                  <dt>
                    <Icon name="avion" size={17} />
                    <span>Prochain trajet</span>
                  </dt>
                  <dd>
                    {nextTransport.from} → {nextTransport.to} ·{' '}
                    {formatShortDate(nextTransport.departure)} a {formatTime(nextTransport.departure)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {nextActions.length > 0 ? (
              <div className="next-actions">
                <h3 className="next-actions__title">Prochaines actions</h3>
                <ul className="next-actions__list">
                  {nextActions.map((action) => (
                    <li key={action.anchor + action.label}>
                      <button type="button" className="next-actions__item" onClick={() => scrollTo(action.anchor)}>
                        <Icon name="chevron" size={14} />
                        <span>{action.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {trip.description ? (
              <div className="detail-card__notes">
                <h3 className="detail-card__notes-title">Notes</h3>
                <p>{trip.description}</p>
              </div>
            ) : null}

            {/* Changement rapide de statut, sans passer par le formulaire. */}
            <div className="chip-row" role="group" aria-label="Changer le statut du voyage">
              {TRIP_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={['chip', trip.status === status ? 'is-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={trip.status === status}
                  disabled={busy || trip.status === status}
                  onClick={() => handleStatus(status)}
                >
                  {TRIP_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* --- Contenu du voyage ------------------------------------------------ */}
      <StagesSection trip={trip} stages={data.stages} />
      <ProgramSection trip={trip} activities={data.activities} days={days} currency={currency} />
      <TransportsSection
        trip={trip}
        transports={data.transports}
        links={data.links}
        documents={data.documents}
        currency={currency}
      />
      <StaysSection
        trip={trip}
        stays={data.stays}
        uncoveredNights={data.uncoveredNights}
        links={data.links}
        documents={data.documents}
        currency={currency}
      />
      <TripBudgetSection
        trip={trip}
        budget={budget}
        expenses={data.expenses}
        currency={currency}
      />

      {/* --- Modules reutilises de la V0.3 / V0.4 ------------------------------ */}
      <TasksSection eventId={trip.eventId} tasks={data.tasks} />
      <TripChecklistSection eventId={trip.eventId} items={data.items} />
      <ParticipantsSection eventId={trip.eventId} participants={data.participants} />
      <DocumentsSection
        eventId={trip.eventId}
        documents={data.documents}
        available={data.availableDocuments}
        events={allEvents ?? []}
      />

      {/* --- Actions ----------------------------------------------------------- */}
      <div className="detail-actions">
        <Button variant="primary" icon="crayon" block onClick={() => navigate(tripEditPath(trip.id))}>
          Modifier le voyage
        </Button>
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
        title="Supprimer ce voyage ?"
        description={
          <>
            « <strong>{trip.title}</strong> » sera definitivement supprime, ainsi que son itineraire,
            son programme, ses transports, ses hebergements, ses taches, ses participants, ses
            depenses et l’evenement correspondant dans l’agenda. Cette action est irreversible.
            {data.documents.length > 0 ? (
              <span className="confirm-choice">
                <label className="switch" htmlFor="supprimer-documents-voyage">
                  <input
                    id="supprimer-documents-voyage"
                    type="checkbox"
                    checked={deleteDocuments}
                    onChange={(e) => setDeleteDocuments(e.target.checked)}
                  />
                  <span className="switch__track" aria-hidden="true">
                    <span className="switch__thumb" />
                  </span>
                  <span className="switch__label">
                    Supprimer aussi {data.documents.length} document
                    {data.documents.length > 1 ? 's' : ''} et leurs fichiers
                  </span>
                </label>
                <span className="confirm-choice__hint">
                  {deleteDocuments
                    ? 'Les fichiers seront definitivement effaces.'
                    : 'Les documents resteront dans ta bibliotheque, sans voyage associe.'}
                </span>
              </span>
            ) : null}
          </>
        }
        details={
          <dl>
            <dt>Etapes</dt>
            <dd>{data.stages.length}</dd>
            <dt>Activites</dt>
            <dd>{data.activities.length}</dd>
            <dt>Transports</dt>
            <dd>{data.transports.length}</dd>
            <dt>Hebergements</dt>
            <dd>{data.stays.length}</dd>
            <dt>Taches</dt>
            <dd>{data.tasks.length}</dd>
            <dt>Depenses</dt>
            <dd>{data.expenses.length}</dd>
          </dl>
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
