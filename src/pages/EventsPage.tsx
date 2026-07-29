import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { EventCard } from '@/components/events/EventCard'
import { Icon } from '@/components/icons/Icon'
import { Alert, Button, PageHeader, SkeletonBlock, StateBlock } from '@/components/ui'
import { db } from '@/db/database'
import { eventsRepository } from '@/db/repositories'
import { computeBudget } from '@/utils/budgetRules'
import { computeProgress } from '@/utils/taskRules'
import type { EventIndicators } from '@/components/events/EventCard'
import { useLiveData } from '@/hooks/useLiveData'
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type EventCategory } from '@/models'
import { eventNewPath } from '@/navigation/routes'
import { compareByStart, compareByStartDesc, isPastEvent, matchesQuery } from '@/utils/eventRules'

/** Perimetre temporel du filtre. */
const SCOPES = [
  { key: 'a-venir', label: 'A venir' },
  { key: 'passes', label: 'Passes' },
  { key: 'tous', label: 'Tous' },
] as const

type Scope = (typeof SCOPES)[number]['key']

const isScope = (value: string | null): value is Scope =>
  SCOPES.some((scope) => scope.key === value)

const isCategory = (value: string | null): value is EventCategory =>
  (EVENT_CATEGORIES as readonly string[]).includes(value ?? '')

export function EventsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Les filtres vivent dans l'URL : les raccourcis de l'accueil peuvent donc
  // ouvrir cette page avec une categorie deja active, et un retour arriere
  // restitue l'etat precedent.
  const scope: Scope = isScope(searchParams.get('quand')) ? (searchParams.get('quand') as Scope) : 'a-venir'
  const category = isCategory(searchParams.get('categorie'))
    ? (searchParams.get('categorie') as EventCategory)
    : null

  const [query, setQuery] = useState('')

  /** Message transmis apres une suppression depuis la fiche. */
  const [flash] = useState<string | null>(
    (location.state as { flash?: string } | null)?.flash ?? null,
  )
  useEffect(() => {
    // On efface l'etat de navigation pour que le message ne revienne pas
    // apres un rafraichissement ou un retour arriere.
    if (flash) navigate(location.pathname + location.search, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash])

  // Une seule requete pour la liste ET les indicateurs : on evite N requetes
  // par carte, ce qui garderait la page fluide meme avec beaucoup de donnees.
  const { data, loading, error } = useLiveData(async () => {
    const [list, tasks, participants, expenses, items] = await Promise.all([
      eventsRepository.listAll(),
      db.tasks.toArray(),
      db.participants.toArray(),
      db.expenses.toArray(),
      db.items.toArray(),
    ])

    const indicators = new Map<string, EventIndicators>()
    for (const event of list) {
      const eventTasks = tasks.filter((t) => t.eventId === event.id)
      const eventParticipants = participants.filter((p) => p.eventId === event.id)
      const budget = computeBudget(
        event.budget,
        expenses.filter((e) => e.eventId === event.id),
        items.filter((i) => i.eventId === event.id),
      )
      indicators.set(event.id, {
        taskPercent: eventTasks.length > 0 ? computeProgress(eventTasks).percent : null,
        participants:
          eventParticipants.length > 0
            ? {
                confirmed: eventParticipants.filter((p) => p.status === 'confirme').length,
                total: eventParticipants.length,
              }
            : null,
        budgetPercent: budget.hasPlan ? budget.percentUsed : null,
        budgetOver: budget.overBudget,
      })
    }

    return { list, indicators }
  })

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const events = useMemo(() => data?.list ?? [], [data])

  const visible = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => {
        if (scope === 'a-venir' && isPastEvent(event, now)) return false
        if (scope === 'passes' && !isPastEvent(event, now)) return false
        if (category && event.category !== category) return false
        return matchesQuery(event, query)
      })
      // Les passes se lisent du plus recent au plus ancien ; le reste dans
      // l'ordre chronologique naturel.
      .sort(scope === 'passes' ? compareByStartDesc : compareByStart)
  }, [events, scope, category, query])

  const filtersActive = category !== null || query.trim().length > 0

  return (
    <>
      <PageHeader
        title="Evenements"
        subtitle="Retrouve, filtre et gere tout ce que tu as prevu."
        action={
          <Button variant="primary" icon="plus" onClick={() => navigate(eventNewPath())}>
            Ajouter
          </Button>
        }
      />

      {flash ? <Alert tone="success">{flash}</Alert> : null}

      {/* --- Recherche ------------------------------------------------------ */}
      <div className="search-field">
        <Icon name="recherche" size={18} className="search-field__icon" />
        <input
          type="search"
          className="search-field__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un titre, un lieu, une note…"
          aria-label="Rechercher un evenement"
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

      {/* --- Perimetre temporel ---------------------------------------------- */}
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

      {/* --- Categories ------------------------------------------------------- */}
      <div className="chip-row" role="group" aria-label="Filtrer par categorie">
        <button
          type="button"
          className={['chip', category === null ? 'is-active' : ''].filter(Boolean).join(' ')}
          aria-pressed={category === null}
          onClick={() => updateParam('categorie', null)}
        >
          Toutes
        </button>
        {EVENT_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={['chip', category === item ? 'is-active' : ''].filter(Boolean).join(' ')}
            aria-pressed={category === item}
            onClick={() => updateParam('categorie', category === item ? null : item)}
          >
            {EVENT_CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>

      {/* --- Resultats --------------------------------------------------------- */}
      {loading ? (
        <div className="stack--lg stack section">
          <SkeletonBlock height={120} />
          <SkeletonBlock height={120} />
        </div>
      ) : error ? (
        <div className="section">
          <StateBlock error title="Evenements indisponibles" text={error} />
        </div>
      ) : visible.length === 0 ? (
        <div className="section">
          {events.length === 0 ? (
            <StateBlock
              icon="etoiles"
              title="Aucun evenement pour l’instant"
              text="Cree ton premier evenement : il apparaitra ici et dans ton agenda."
              action={
                <Button variant="primary" icon="plus" onClick={() => navigate(eventNewPath())}>
                  Creer un evenement
                </Button>
              }
            />
          ) : (
            <StateBlock
              icon="recherche"
              title="Aucun resultat"
              text={
                filtersActive
                  ? 'Aucun evenement ne correspond a ta recherche et a tes filtres.'
                  : scope === 'passes'
                    ? 'Tu n’as pas encore d’evenement passe.'
                    : 'Rien de prevu pour le moment.'
              }
              action={
                filtersActive ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      updateParam('categorie', null)
                    }}
                  >
                    Effacer les filtres
                  </Button>
                ) : (
                  <Button variant="primary" icon="plus" onClick={() => navigate(eventNewPath())}>
                    Creer un evenement
                  </Button>
                )
              }
            />
          )}
        </div>
      ) : (
        <section className="section">
          <p className="result-count" aria-live="polite">
            {visible.length} evenement{visible.length > 1 ? 's' : ''}
          </p>
          <div className="stack--lg stack">
            {visible.map((event) => {
              const indicators = data?.indicators.get(event.id)
              return (
                <EventCard
                  key={event.id}
                  event={event}
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
