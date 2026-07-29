import type { ReactNode } from 'react'
import { IconChip } from '@/components/ui'
import { DOCUMENT_VISUALS } from '@/config/visuals'
import type { MonthSummary } from '@/hooks/useDashboard'
import type { AppEvent, Reminder, TravelDocument, Trip } from '@/models'
import { formatCountdown, formatDateRange } from '@/utils/date'
import { pluralize } from '@/utils/format'

/** Enveloppe commune des petites cartes d'apercu. */
function PreviewCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string
  icon: Parameters<typeof IconChip>[0]['icon']
  tone: Parameters<typeof IconChip>[0]['tone']
  children: ReactNode
}) {
  return (
    <section className="preview-card">
      <div className="preview-card__head">
        <IconChip icon={icon} tone={tone} small />
        <h3 className="preview-card__title">{title}</h3>
      </div>
      {children}
    </section>
  )
}

/* --- Voyage a venir ------------------------------------------------------ */

export function UpcomingTripPreview({
  tripEvent,
  trip,
}: {
  tripEvent: AppEvent | null
  trip: Trip | null
}) {
  // Priorite a un evenement de categorie « voyage » saisi par l'utilisateur ;
  // a defaut, on retombe sur la table `trips` heritee de la V0.1.
  const destination = tripEvent?.location ?? tripEvent?.title ?? trip?.destination ?? trip?.title
  const start = tripEvent?.startDate ?? trip?.startDate
  const end = tripEvent?.endDate ?? tripEvent?.startDate ?? trip?.endDate

  return (
    <PreviewCard title="Voyage a venir" icon="avion" tone="sky">
      {destination && start ? (
        <div>
          <p className="preview-card__primary">{destination}</p>
          <p className="preview-card__secondary">
            {formatDateRange(start, end ?? start)} · {formatCountdown(start)}
          </p>
        </div>
      ) : (
        <p className="preview-card__secondary">Aucun voyage prevu pour le moment.</p>
      )}
    </PreviewCard>
  )
}

/* --- Ce mois-ci ----------------------------------------------------------- */

export function MonthSummaryPreview({ month }: { month: MonthSummary }) {
  return (
    <PreviewCard title="Ce mois-ci" icon="calendrier" tone="mint">
      <div>
        <p className="preview-card__primary">
          {month.count > 0 ? pluralize(month.count, 'evenement') : 'Rien de prevu'}
        </p>
        <p className="preview-card__secondary">
          {month.count > 0 ? `Prevus en ${month.label}` : `Ton mois de ${month.label} est libre`}
        </p>
      </div>
    </PreviewCard>
  )
}

/* --- A ne pas oublier ------------------------------------------------------ */

export function RemindersPreview({
  reminders,
  total,
}: {
  reminders: Reminder[]
  total: number
}) {
  return (
    <PreviewCard title="A ne pas oublier" icon="cadeau" tone="apricot">
      {reminders.length > 0 ? (
        <>
          <ul className="preview-card__list">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="preview-card__list-item">
                <span className="preview-card__bullet" aria-hidden="true" />
                <span className="preview-card__list-text">{reminder.label}</span>
              </li>
            ))}
          </ul>
          {total > reminders.length ? (
            <p className="preview-card__secondary">
              +{total - reminders.length} autre{total - reminders.length > 1 ? 's' : ''}
            </p>
          ) : null}
        </>
      ) : (
        <p className="preview-card__secondary">Tout est a jour, rien en attente.</p>
      )}
    </PreviewCard>
  )
}

/* --- Documents & billets ---------------------------------------------------- */

export function DocumentsPreview({
  documents,
  total,
}: {
  documents: TravelDocument[]
  total: number
}) {
  return (
    <PreviewCard title="Documents & billets" icon="ticket" tone="sage">
      {documents.length > 0 ? (
        <>
          <ul className="preview-card__list">
            {documents.map((document) => (
              <li key={document.id} className="preview-card__list-item">
                <IconChip icon={DOCUMENT_VISUALS[document.kind].icon} tone="neutral" small />
                <span className="preview-card__list-text">{document.title}</span>
              </li>
            ))}
          </ul>
          <p className="preview-card__secondary">
            {pluralize(total, 'document')} conserve{total > 1 ? 's' : ''} sur l’appareil
          </p>
        </>
      ) : (
        <p className="preview-card__secondary">Aucun document enregistre.</p>
      )}
    </PreviewCard>
  )
}
