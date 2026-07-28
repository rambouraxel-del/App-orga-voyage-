import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { AgendaPreview } from '@/components/home/AgendaPreview'
import { HomeHeader } from '@/components/home/HomeHeader'
import { NextEventCard } from '@/components/home/NextEventCard'
import {
  DocumentsPreview,
  MonthBudgetPreview,
  RemindersPreview,
  UpcomingTripPreview,
} from '@/components/home/PreviewCards'
import { ShortcutGrid } from '@/components/home/ShortcutGrid'
import { Alert, SkeletonBlock, StateBlock } from '@/components/ui'
import { useDashboard } from '@/hooks/useDashboard'
import { ROUTES, eventDetailPath } from '@/navigation/routes'
import { formatDateTime } from '@/utils/date'

export function HomePage() {
  const { data, loading, error } = useDashboard()
  const navigate = useNavigate()
  /** Message temporaire pour les rubriques prevues mais non implementees. */
  const [notice, setNotice] = useState<string | null>(null)

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
      />
    )
  }

  const { settings, nextEvent, agenda, nextTrip, budget, reminders, documents } = data

  return (
    <>
      <HomeHeader
        displayName={settings.displayName}
        onNotificationsClick={() =>
          setNotice('Les notifications arriveront dans une prochaine version.')
        }
      />

      {notice ? (
        <Alert tone="info" className="section">
          {notice}
        </Alert>
      ) : null}

      {/* --- Prochain evenement ------------------------------------------- */}
      <section className="section" aria-labelledby="titre-prochain">
        <div className="section-header">
          <h2 className="section-title" id="titre-prochain">
            Prochain evenement
          </h2>
        </div>
        {nextEvent ? (
          <NextEventCard
            event={nextEvent}
            onOpenDetail={(event) => navigate(eventDetailPath(event.id))}
          />
        ) : (
          <StateBlock
            icon="calendrier"
            title="Rien de prevu pour l’instant"
            text="Tes prochaines aventures apparaitront ici des qu’elles seront planifiees."
          />
        )}
      </section>

      {/* --- Agenda a venir ----------------------------------------------- */}
      <section className="section" aria-labelledby="titre-agenda">
        <div className="section-header">
          <h2 className="section-title" id="titre-agenda">
            Agenda a venir
          </h2>
          <Link to={ROUTES.agenda} className="section-action">
            Tout voir
          </Link>
        </div>
        {agenda.length > 0 ? (
          <AgendaPreview events={agenda} />
        ) : (
          <StateBlock
            icon="calendrier"
            title="Agenda vide"
            text="Aucune autre echeance apres ton prochain evenement."
          />
        )}
      </section>

      {/* --- Raccourcis ---------------------------------------------------- */}
      <section className="section" aria-labelledby="titre-raccourcis">
        <div className="section-header">
          <h2 className="section-title" id="titre-raccourcis">
            Raccourcis
          </h2>
        </div>
        <ShortcutGrid
          onUnavailable={(shortcut) =>
            setNotice(`« ${shortcut.label} » arrive dans une prochaine version.`)
          }
        />
      </section>

      {/* --- Apercus complementaires --------------------------------------- */}
      <section className="section" aria-labelledby="titre-apercus">
        <div className="section-header">
          <h2 className="section-title" id="titre-apercus">
            En un coup d’oeil
          </h2>
        </div>
        <div className="preview-grid">
          <UpcomingTripPreview trip={nextTrip} />
          <MonthBudgetPreview budget={budget} currency={settings.currency} />
          <RemindersPreview reminders={reminders} total={data.pendingReminderCount} />
          <DocumentsPreview documents={documents} total={data.documentCount} />
        </div>
      </section>

      {/* --- Derniere sauvegarde -------------------------------------------- */}
      <Link to={ROUTES.backup} className="backup-note">
        <Icon name="sauvegarde" size={16} />
        {settings.lastBackupAt
          ? `Derniere sauvegarde : ${formatDateTime(settings.lastBackupAt)}`
          : 'Aucune sauvegarde effectuee — pense a exporter tes donnees'}
      </Link>
    </>
  )
}
