import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { AgendaPreview } from '@/components/home/AgendaPreview'
import { HomeHeader } from '@/components/home/HomeHeader'
import { NextEventCard } from '@/components/home/NextEventCard'
import {
  MonthSummaryPreview,
  PendingItemsPreview,
  PreparationPreview,
  UpcomingTasksPreview,
  UpcomingTripPreview,
} from '@/components/home/PreviewCards'
import { ShortcutGrid } from '@/components/home/ShortcutGrid'
import { Button, SkeletonBlock, StateBlock } from '@/components/ui'
import { useDashboard } from '@/hooks/useDashboard'
import { ROUTES, eventDetailPath, eventNewPath } from '@/navigation/routes'
import { formatDateTime } from '@/utils/date'

export function HomePage() {
  const { data, loading, error } = useDashboard()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="stack--lg stack">
        <SkeletonBlock height={64} />
        <SkeletonBlock height={280} />
        <SkeletonBlock height={180} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <StateBlock
        error
        title="Donnees indisponibles"
        text={error ?? "Les donnees locales n'ont pas pu etre chargees."}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reessayer
          </Button>
        }
      />
    )
  }

  const { settings, nextEvent, agenda, nextTripEvent, month } = data

  return (
    <>
      <HomeHeader displayName={settings.displayName} onNotificationsClick={() => {}} />

      {data.hasNoEvents ? (
        /* --- Premier lancement sans donnees ------------------------------ */
        <section className="section">
          <StateBlock
            icon="etoiles"
            title="Bienvenue dans tes aventures !"
            text="Tu n’as encore rien de prevu. Ajoute ta premiere sortie, soiree ou escapade : elle apparaitra ici, dans ton agenda et dans ta liste."
            action={
              <Button variant="primary" icon="plus" onClick={() => navigate(eventNewPath())}>
                Creer mon premier evenement
              </Button>
            }
          />
        </section>
      ) : (
        <>
          {/* --- Prochain evenement ------------------------------------- */}
          <section className="section" aria-labelledby="titre-prochain">
            <div className="section-header">
              <h2 className="section-title" id="titre-prochain">
                Prochain evenement
              </h2>
              <Button variant="secondary" icon="plus" onClick={() => navigate(eventNewPath())}>
                Ajouter
              </Button>
            </div>

            {nextEvent ? (
              <NextEventCard
                event={nextEvent}
                onOpenDetail={(event) => navigate(eventDetailPath(event.id))}
              />
            ) : (
              <StateBlock
                icon="calendrier"
                title="Rien a venir pour l’instant"
                text="Tous tes evenements sont passes. Prevois la suite !"
                action={
                  <Button variant="primary" icon="plus" onClick={() => navigate(eventNewPath())}>
                    Creer un evenement
                  </Button>
                }
              />
            )}
          </section>

          {/* --- Agenda a venir ----------------------------------------- */}
          {agenda.length > 0 ? (
            <section className="section" aria-labelledby="titre-agenda">
              <div className="section-header">
                <h2 className="section-title" id="titre-agenda">
                  Agenda a venir
                </h2>
                <Link to={ROUTES.agenda} className="section-action">
                  Tout voir
                </Link>
              </div>
              <AgendaPreview events={agenda} />
            </section>
          ) : null}
        </>
      )}

      {/* --- Raccourcis ---------------------------------------------------- */}
      <section className="section" aria-labelledby="titre-raccourcis">
        <div className="section-header">
          <h2 className="section-title" id="titre-raccourcis">
            Raccourcis
          </h2>
        </div>
        <ShortcutGrid />
      </section>

      {/* --- Apercus complementaires --------------------------------------- */}
      <section className="section" aria-labelledby="titre-apercus">
        <div className="section-header">
          <h2 className="section-title" id="titre-apercus">
            En un coup d’oeil
          </h2>
        </div>
        <div className="preview-grid">
          <PreparationPreview
            progress={data.nextEventProgress}
            eventTitle={nextEvent?.title ?? null}
          />
          <UpcomingTasksPreview tasks={data.upcomingTasks} />
          <MonthSummaryPreview month={month} />
          <PendingItemsPreview items={data.pendingItems} />
          <UpcomingTripPreview tripEvent={nextTripEvent} trip={data.nextTrip} />
        </div>
      </section>

      {/* --- Derniere sauvegarde -------------------------------------------- */}
      <Link to={ROUTES.settings} className="backup-note">
        <Icon name="sauvegarde" size={16} />
        {settings.lastBackupAt
          ? `Derniere sauvegarde : ${formatDateTime(settings.lastBackupAt)}`
          : 'Aucune sauvegarde effectuee — pense a exporter tes donnees'}
      </Link>
    </>
  )
}
