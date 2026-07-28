import { useNavigate, useParams } from 'react-router-dom'
import { EventCard } from '@/components/events/EventCard'
import { Button, ComingSoon, SkeletonBlock, StateBlock } from '@/components/ui'
import { eventsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { ROUTES } from '@/navigation/routes'

/**
 * Page provisoire du detail d'un evenement.
 * La V0.1 se limite a un rappel des informations connues ; l'edition, les
 * participants, le budget detaille et les documents joints viendront ensuite.
 */
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useLiveData(
    () => (id ? eventsRepository.getById(id) : Promise.resolve(undefined)),
    [id],
  )

  return (
    <>
      <header className="page-header">
        <Button variant="ghost" icon="retour" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </header>

      {loading ? (
        <SkeletonBlock height={160} />
      ) : error ? (
        <StateBlock error title="Evenement illisible" text={error} />
      ) : !data ? (
        <StateBlock
          icon="attention"
          title="Evenement introuvable"
          text="Cet evenement n’existe plus sur cet appareil."
          action={
            <Button variant="secondary" onClick={() => navigate(ROUTES.events)}>
              Voir tous les evenements
            </Button>
          }
        />
      ) : (
        <>
          <EventCard event={data} />
          <div className="section">
            <ComingSoon
              icon="etoiles"
              title="La fiche complete arrive bientot"
              text="Modification de l’evenement, liste des participants, budget partage, billets et documents joints seront disponibles dans une prochaine version."
              tags={['Edition', 'Participants', 'Budget', 'Documents']}
            />
          </div>
        </>
      )}
    </>
  )
}
