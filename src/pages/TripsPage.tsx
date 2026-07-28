import { TripCard } from '@/components/trips/TripCard'
import { ComingSoon, SkeletonBlock, StateBlock } from '@/components/ui'
import { settingsRepository, tripsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'

export function TripsPage() {
  const { data, loading, error } = useLiveData(async () => {
    const [trips, settings] = await Promise.all([
      tripsRepository.listAll(),
      settingsRepository.get(),
    ])
    return { trips, currency: settings.currency }
  })

  return (
    <>
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="page-title">Voyages</h1>
          <p className="page-subtitle">Tes destinations, leurs dates et leur avancement.</p>
        </div>
      </header>

      {loading ? (
        <div className="stack--lg stack">
          <SkeletonBlock height={230} />
          <SkeletonBlock height={230} />
        </div>
      ) : error ? (
        <StateBlock error title="Voyages indisponibles" text={error} />
      ) : !data || data.trips.length === 0 ? (
        <StateBlock
          icon="avion"
          title="Aucun voyage"
          text="Les voyages enregistres apparaitront ici avec leurs dates et leur statut."
        />
      ) : (
        <div className="stack--lg stack">
          {data.trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} currency={data.currency} />
          ))}
        </div>
      )}

      <div className="section">
        <ComingSoon
          icon="valise"
          title="Le gestionnaire de voyage arrive plus tard"
          text="Itineraires, hebergements, checklists de bagages et partage entre participants sont prevus apres la V0.1."
          tags={['Itineraire', 'Bagages', 'Depenses']}
        />
      </div>
    </>
  )
}
