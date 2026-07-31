import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { TripCard, type TripIndicators } from '@/components/trips/TripCard'
import { Alert, Button, PageHeader, SkeletonBlock, StateBlock } from '@/components/ui'
import { db } from '@/db/database'
import { settingsRepository, tripsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { TRIP_STATUSES, TRIP_STATUS_LABELS, type Trip, type TripStatus } from '@/models'
import { ROUTES } from '@/navigation/routes'
import { normalize } from '@/utils/eventRules'
import { computeProgress } from '@/utils/taskRules'
import { computeTripBudget, nightsWithoutStay } from '@/utils/tripRules'

/** Perimetre temporel, calque sur celui des evenements. */
const SCOPES = [
  { key: 'a-venir', label: 'A venir' },
  { key: 'passes', label: 'Passes' },
  { key: 'tous', label: 'Tous' },
] as const

type Scope = (typeof SCOPES)[number]['key']

const isScope = (value: string | null): value is Scope => SCOPES.some((s) => s.key === value)

const isStatus = (value: string | null): value is TripStatus =>
  (TRIP_STATUSES as readonly string[]).includes(value ?? '')

/** Un voyage est « passe » quand il est termine, annule, ou deja fini. */
function isFinished(trip: Trip, now: Date): boolean {
  if (trip.status === 'termine' || trip.status === 'annule') return true
  return new Date(trip.endDate).getTime() < now.getTime()
}

function matchesQuery(trip: Trip, query: string): boolean {
  const needle = normalize(query.trim())
  if (needle.length === 0) return true
  return [trip.title, trip.destination, trip.origin, trip.description]
    .filter(Boolean)
    .some((field) => normalize(field as string).includes(needle))
}

export function TripsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const scope: Scope = isScope(searchParams.get('quand'))
    ? (searchParams.get('quand') as Scope)
    : 'a-venir'
  const status = isStatus(searchParams.get('statut'))
    ? (searchParams.get('statut') as TripStatus)
    : null

  const [query, setQuery] = useState('')

  const [flash] = useState<string | null>((location.state as { flash?: string } | null)?.flash ?? null)
  useEffect(() => {
    if (flash) navigate(location.pathname + location.search, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash])

  // Une seule requete pour la liste ET les indicateurs de chaque carte : sans
  // cela, chaque voyage declencherait six lectures supplementaires.
  const { data, loading, error } = useLiveData(async () => {
    const [trips, settings, tasks, transports, stays, activities, expenses, items, documents] =
      await Promise.all([
        tripsRepository.listAll(),
        settingsRepository.get(),
        db.tasks.toArray(),
        db.tripTransports.toArray(),
        db.tripStays.toArray(),
        db.tripActivities.toArray(),
        db.expenses.toArray(),
        db.items.toArray(),
        db.documents.toArray(),
      ])

    const indicators = new Map<string, TripIndicators>()
    for (const trip of trips) {
      const tripTasks = tasks.filter((t) => t.eventId === trip.eventId)
      const tripTransports = transports.filter((t) => t.tripId === trip.id)
      const tripStays = stays.filter((s) => s.tripId === trip.id)
      const tripActivities = activities.filter((a) => a.tripId === trip.id)
      const budget = computeTripBudget(trip.budget, {
        transports: tripTransports,
        stays: tripStays,
        activities: tripActivities,
        expenses: expenses.filter((e) => e.eventId === trip.eventId),
        items: items.filter((i) => i.eventId === trip.eventId),
      })
      indicators.set(trip.id, {
        taskPercent: tripTasks.length > 0 ? computeProgress(tripTasks).percent : null,
        transports: tripTransports.length,
        stays: tripStays.length,
        activities: tripActivities.length,
        documents: documents.filter((d) => d.eventId === trip.eventId).length,
        budgetPercent: budget.hasPlan ? budget.percentUsed : null,
        budgetOver: budget.overBudget,
        uncoveredNights: nightsWithoutStay(trip.startDate, trip.endDate, tripStays).length,
      })
    }

    return { trips, indicators, currency: settings.currency }
  })

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const trips = useMemo(() => data?.trips ?? [], [data])

  const visible = useMemo(() => {
    const now = new Date()
    return trips
      .filter((trip) => {
        if (scope === 'a-venir' && isFinished(trip, now)) return false
        if (scope === 'passes' && !isFinished(trip, now)) return false
        if (status && trip.status !== status) return false
        return matchesQuery(trip, query)
      })
      .sort((a, b) =>
        scope === 'passes'
          ? b.startDate.localeCompare(a.startDate)
          : a.startDate.localeCompare(b.startDate),
      )
  }, [trips, scope, status, query])

  /** Prochain voyage : le premier a venir, mis en avant en tete de liste. */
  const next = useMemo(() => {
    const now = new Date()
    return trips
      .filter((trip) => !isFinished(trip, now))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  }, [trips])

  /**
   * Avancement global : moyenne des taches de TOUS les voyages a venir.
   * Repond a « ou en suis-je dans mes preparatifs ? » d'un seul coup d'oeil.
   */
  const overall = useMemo(() => {
    const now = new Date()
    const active = trips.filter((trip) => !isFinished(trip, now))
    const percents = active
      .map((trip) => data?.indicators.get(trip.id)?.taskPercent)
      .filter((percent): percent is number => typeof percent === 'number')
    if (percents.length === 0) return null
    return {
      count: active.length,
      percent: Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length),
    }
  }, [trips, data])

  const filtersActive = status !== null || query.trim().length > 0
  const highlightId = scope === 'passes' ? undefined : next?.id

  return (
    <>
      <PageHeader
        title="Voyages"
        subtitle="Itineraires, transports, hebergements et budget, au meme endroit."
        action={
          <Button variant="primary" icon="plus" onClick={() => navigate(ROUTES.tripNew)}>
            Ajouter
          </Button>
        }
      />

      {flash ? <Alert tone="success">{flash}</Alert> : null}

      {overall ? (
        <section className="trip-overview" aria-label="Avancement global des preparatifs">
          <div className="progress">
            <div
              className="progress__fill"
              style={{ width: `${overall.percent}%` }}
              role="img"
              aria-label={`Preparation globale : ${overall.percent} %`}
            />
          </div>
          <p className="trip-overview__text">
            {overall.count} voyage{overall.count > 1 ? 's' : ''} en cours de preparation ·{' '}
            {overall.percent} % des taches terminees
          </p>
        </section>
      ) : null}

      <div className="search-field">
        <Icon name="recherche" size={18} className="search-field__icon" />
        <input
          type="search"
          className="search-field__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une destination, un titre…"
          aria-label="Rechercher un voyage"
          enterKeyHint="search"
        />
        {query ? (
          <button
            type="button"
            className="search-field__clear"
            onClick={() => setQuery('')}
            aria-label="Effacer la recherche"
          >
            <Icon name="fermer" size={16} />
          </button>
        ) : null}
      </div>

      <div className="segmented" role="group" aria-label="Periode">
        {SCOPES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={['segmented__option', scope === item.key ? 'is-active' : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={scope === item.key}
            onClick={() => updateParam('quand', item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="chip-row" role="group" aria-label="Filtrer par statut">
        <button
          type="button"
          className={['chip', status === null ? 'is-active' : ''].filter(Boolean).join(' ')}
          aria-pressed={status === null}
          onClick={() => updateParam('statut', null)}
        >
          Tous
        </button>
        {TRIP_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={['chip', status === item ? 'is-active' : ''].filter(Boolean).join(' ')}
            aria-pressed={status === item}
            onClick={() => updateParam('statut', status === item ? null : item)}
          >
            {TRIP_STATUS_LABELS[item]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack--lg stack section">
          <SkeletonBlock height={230} />
          <SkeletonBlock height={230} />
        </div>
      ) : error ? (
        <div className="section">
          <StateBlock error title="Voyages indisponibles" text={error} />
        </div>
      ) : visible.length === 0 ? (
        <div className="section">
          {trips.length === 0 ? (
            <StateBlock
              icon="avion"
              title="Aucun voyage pour l’instant"
              text="Cree ton premier voyage : il apparaitra ici et dans ton agenda, avec son itineraire et son budget."
              action={
                <Button variant="primary" icon="plus" onClick={() => navigate(ROUTES.tripNew)}>
                  Creer un voyage
                </Button>
              }
            />
          ) : (
            <StateBlock
              icon="recherche"
              title="Aucun resultat"
              text={
                filtersActive
                  ? 'Aucun voyage ne correspond a ta recherche et a tes filtres.'
                  : scope === 'passes'
                    ? 'Tu n’as pas encore de voyage passe.'
                    : 'Aucun voyage a venir pour le moment.'
              }
              action={
                filtersActive ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      updateParam('statut', null)
                    }}
                  >
                    Effacer les filtres
                  </Button>
                ) : (
                  <Button variant="primary" icon="plus" onClick={() => navigate(ROUTES.tripNew)}>
                    Creer un voyage
                  </Button>
                )
              }
            />
          )}
        </div>
      ) : (
        <section className="section">
          <p className="result-count" aria-live="polite">
            {visible.length} voyage{visible.length > 1 ? 's' : ''}
          </p>
          <div className="stack--lg stack">
            {visible.map((trip) => {
              const indicators = data?.indicators.get(trip.id)
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  currency={data?.currency ?? 'EUR'}
                  highlight={trip.id === highlightId}
                  {...(indicators ? { indicators } : {})}
                />
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
