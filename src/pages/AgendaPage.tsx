import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthCalendar } from '@/components/agenda/MonthCalendar'
import { EventCard } from '@/components/events/EventCard'
import { Icon } from '@/components/icons/Icon'
import { Button, PageHeader, SkeletonBlock, StateBlock } from '@/components/ui'
import { eventsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import type { AppEvent } from '@/models'
import { eventNewPath } from '@/navigation/routes'
import { dayKey } from '@/utils/calendar'
import { formatDayHeading } from '@/utils/date'
import { compareByStart, isUpcoming, occursOnDay } from '@/utils/eventRules'

type ViewMode = 'mois' | 'liste'

/** Regroupe les evenements par jour de debut, dans l'ordre chronologique. */
function groupByDay(events: AppEvent[]): Array<{ key: string; iso: string; events: AppEvent[] }> {
  const groups = new Map<string, AppEvent[]>()
  for (const event of [...events].sort(compareByStart)) {
    const key = dayKey(new Date(event.startDate))
    const bucket = groups.get(key)
    if (bucket) bucket.push(event)
    else groups.set(key, [event])
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    iso: list[0]!.startDate,
    events: list,
  }))
}

export function AgendaPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('mois')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(() => new Date())

  const { data, loading, error } = useLiveData(() => eventsRepository.listAll())
  const events = useMemo(() => data ?? [], [data])

  const dayEvents = useMemo(
    () => events.filter((event) => occursOnDay(event, selectedDay)).sort(compareByStart),
    [events, selectedDay],
  )

  const upcomingGroups = useMemo(
    () => groupByDay(events.filter((event) => isUpcoming(event))),
    [events],
  )

  const addButton = (
    <Button
      variant="primary"
      icon="plus"
      onClick={() => navigate(eventNewPath({ day: dayKey(selectedDay) }))}
    >
      Ajouter
    </Button>
  )

  if (loading) {
    return (
      <>
        <PageHeader title="Agenda" subtitle="Tes evenements, mois par mois." action={addButton} />
        <SkeletonBlock height={320} />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agenda" subtitle="Tes evenements, mois par mois." action={addButton} />
        <StateBlock error title="Agenda indisponible" text={error} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Tes evenements, mois par mois."
        action={addButton}
      />

      {/* --- Selecteur de vue ------------------------------------------------ */}
      <div className="segmented" role="group" aria-label="Mode d’affichage">
        <button
          type="button"
          className={['segmented__option', view === 'mois' ? 'is-active' : ''].filter(Boolean).join(' ')}
          aria-pressed={view === 'mois'}
          onClick={() => setView('mois')}
        >
          <Icon name="grille" size={16} />
          Mois
        </button>
        <button
          type="button"
          className={['segmented__option', view === 'liste' ? 'is-active' : ''].filter(Boolean).join(' ')}
          aria-pressed={view === 'liste'}
          onClick={() => setView('liste')}
        >
          <Icon name="liste" size={16} />
          Liste
        </button>
      </div>

      {events.length === 0 ? (
        <div className="section">
          <StateBlock
            icon="calendrier"
            title="Ton agenda est vide"
            text="Ajoute un premier evenement : il apparaitra ici, dans la liste et sur l’accueil."
            action={
              <Button variant="primary" icon="plus" onClick={() => navigate(eventNewPath())}>
                Creer un evenement
              </Button>
            }
          />
        </div>
      ) : view === 'mois' ? (
        <>
          <MonthCalendar
            month={month}
            events={events}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onChangeMonth={setMonth}
            onToday={() => {
              const today = new Date()
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              setSelectedDay(today)
            }}
          />

          <section className="section" aria-live="polite">
            <div className="section-header">
              <h2 className="section-title">{formatDayHeading(selectedDay.toISOString())}</h2>
              <span className="section-action">
                {dayEvents.length > 0 ? `${dayEvents.length}` : ''}
              </span>
            </div>

            {dayEvents.length > 0 ? (
              <div className="stack--lg stack">
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} hideDate />
                ))}
              </div>
            ) : (
              <StateBlock
                icon="calendrier"
                title="Rien ce jour-la"
                text="Aucun evenement prevu. Profite-en, ou ajoutes-en un."
                action={
                  <Button
                    variant="secondary"
                    icon="plus"
                    onClick={() => navigate(eventNewPath({ day: dayKey(selectedDay) }))}
                  >
                    Ajouter ce jour-la
                  </Button>
                }
              />
            )}
          </section>
        </>
      ) : (
        <section className="section">
          {upcomingGroups.length > 0 ? (
            upcomingGroups.map((group) => (
              <div key={group.key} className="agenda-group">
                <h2 className="agenda-group__label">{formatDayHeading(group.iso)}</h2>
                <div className="stack--lg stack">
                  {group.events.map((event) => (
                    <EventCard key={event.id} event={event} hideDate />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <StateBlock
              icon="calendrier"
              title="Aucune echeance a venir"
              text="Tous tes evenements sont passes. Consulte-les depuis l’onglet Evenements."
            />
          )}
        </section>
      )}
    </>
  )
}
