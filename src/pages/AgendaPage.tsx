import { EventCard } from '@/components/events/EventCard'
import { ComingSoon, SkeletonBlock, StateBlock } from '@/components/ui'
import { eventsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import type { AppEvent } from '@/models'

/** Regroupe les evenements par mois (`septembre 2026`). */
function groupByMonth(events: AppEvent[]): Array<[string, AppEvent[]]> {
  const groups = new Map<string, AppEvent[]>()
  for (const event of events) {
    const label = new Date(event.startDate).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
    const bucket = groups.get(label)
    if (bucket) bucket.push(event)
    else groups.set(label, [event])
  }
  return [...groups.entries()]
}

export function AgendaPage() {
  const { data, loading, error } = useLiveData(() => eventsRepository.listUpcoming())

  return (
    <>
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Toutes tes echeances a venir, de la plus proche a la plus lointaine.
          </p>
        </div>
      </header>

      <ComingSoon
        icon="calendrier"
        title="Le calendrier interactif arrive bientot"
        text="La V0.1 affiche une liste chronologique. La vue mensuelle, la creation d’evenements et les rappels seront ajoutes dans une prochaine version."
        tags={['Vue mois', 'Creation', 'Rappels']}
      />

      {loading ? (
        <div className="section stack--lg stack">
          <SkeletonBlock height={110} />
          <SkeletonBlock height={110} />
        </div>
      ) : error ? (
        <div className="section">
          <StateBlock error title="Agenda indisponible" text={error} />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="section">
          <StateBlock
            icon="calendrier"
            title="Aucune echeance a venir"
            text="Ton agenda est vide. Les evenements planifies s’afficheront ici."
          />
        </div>
      ) : (
        groupByMonth(data).map(([label, events]) => (
          <section key={label} className="agenda-group">
            <h2 className="agenda-group__label">{label}</h2>
            <div className="stack--lg stack">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
