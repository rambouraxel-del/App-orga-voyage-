import type { ReactNode } from 'react'
import { IconChip } from '@/components/ui'
import { DOCUMENT_VISUALS } from '@/config/visuals'
import type { MonthBudget } from '@/hooks/useDashboard'
import type { Reminder, TravelDocument, Trip } from '@/models'
import { formatCountdown, formatDateRange } from '@/utils/date'
import { formatCurrency, pluralize } from '@/utils/format'

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

export function UpcomingTripPreview({ trip }: { trip: Trip | null }) {
  return (
    <PreviewCard title="Voyage a venir" icon="avion" tone="sky">
      {trip ? (
        <div>
          <p className="preview-card__primary">{trip.destination || trip.title}</p>
          <p className="preview-card__secondary">
            {formatDateRange(trip.startDate, trip.endDate)} · {formatCountdown(trip.startDate)}
          </p>
        </div>
      ) : (
        <p className="preview-card__secondary">Aucun voyage prevu pour le moment.</p>
      )}
    </PreviewCard>
  )
}

/* --- Budget du mois ------------------------------------------------------- */

export function MonthBudgetPreview({
  budget,
  currency,
}: {
  budget: MonthBudget
  currency: string
}) {
  // Repere visuel indicatif : la gestion detaillee du budget arrive plus tard.
  const REFERENCE = 600
  const ratio = Math.min(1, budget.total / REFERENCE)

  return (
    <PreviewCard title="Budget du mois" icon="portefeuille" tone="mint">
      <div>
        <p className="preview-card__primary">{formatCurrency(budget.total, currency)}</p>
        <p className="preview-card__secondary">
          {budget.eventCount > 0
            ? `${pluralize(budget.eventCount, 'sortie')} en ${budget.label}`
            : `Rien de prevu en ${budget.label}`}
        </p>
      </div>
      <div
        className="budget-bar"
        role="img"
        aria-label={`Budget previsionnel : ${formatCurrency(budget.total, currency)}`}
      >
        <div className="budget-bar__fill" style={{ width: `${Math.max(6, ratio * 100)}%` }} />
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
