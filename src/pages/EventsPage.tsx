import { EventCard } from '@/components/events/EventCard'
import { SkeletonBlock, StateBlock } from '@/components/ui'
import { eventsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'

export function EventsPage() {
  const { data, loading, error } = useLiveData(() => eventsRepository.listAll())

  const events = data ?? []
  const upcoming = events.filter((event) => event.status !== 'passe')
  const past = events.filter((event) => event.status === 'passe')

  return (
    <>
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="page-title">Evenements</h1>
          <p className="page-subtitle">
            Sorties, soirees, concerts et week-ends enregistres sur cet appareil.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="stack--lg stack">
          <SkeletonBlock height={130} />
          <SkeletonBlock height={130} />
          <SkeletonBlock height={130} />
        </div>
      ) : error ? (
        <StateBlock error title="Evenements indisponibles" text={error} />
      ) : events.length === 0 ? (
        <StateBlock
          icon="etoiles"
          title="Aucun evenement"
          text="La creation d’evenements arrive dans une prochaine version. En attendant, restaure une sauvegarde depuis l’onglet Sauvegarde."
        />
      ) : (
        <>
          <section>
            <div className="section-header">
              <h2 className="section-title">A venir</h2>
              <span className="section-action">{upcoming.length}</span>
            </div>
            <div className="stack--lg stack">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>

          {past.length > 0 ? (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Deja vecus</h2>
                <span className="section-action">{past.length}</span>
              </div>
              <div className="stack--lg stack">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
