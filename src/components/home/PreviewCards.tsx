import type { ReactNode } from 'react'
import { IconChip } from '@/components/ui'
import { DOCUMENT_VISUALS } from '@/config/visuals'
import type { MonthSummary } from '@/hooks/useDashboard'
import type { AppEvent, EventItem, TravelDocument, Trip } from '@/models'
import type { UpcomingTask } from '@/hooks/useDashboard'
import type { TaskProgress } from '@/utils/taskRules'
import { formatShortDate } from '@/utils/date'
import { isOverdue } from '@/utils/taskRules'
import { Alert, Badge } from '@/components/ui'
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
      {month.spent > 0 ? (
        <p className="preview-card__secondary">
          <strong>{formatCurrency(month.spent)}</strong> depenses ce mois-ci
        </p>
      ) : null}
    </PreviewCard>
  )
}

/* --- Prochains billets & reservations ------------------------------------- */

export function DocumentsPreview({
  documents,
  expiring,
}: {
  documents: TravelDocument[]
  /** Documents dont la date utile approche — mis en avant. */
  expiring: TravelDocument[]
}) {
  return (
    <PreviewCard title="Billets & documents" icon="ticket" tone="sage">
      {expiring.length > 0 ? (
        <Alert tone="info">
          {expiring.length === 1
            ? `« ${expiring[0]!.title} » arrive a echeance.`
            : `${expiring.length} documents arrivent a echeance.`}
        </Alert>
      ) : null}

      {documents.length > 0 ? (
        <ul className="preview-card__list">
          {documents.map((document) => (
            <li key={document.id} className="preview-card__list-item">
              <IconChip icon={DOCUMENT_VISUALS[document.category].icon} tone="neutral" small />
              <span className="preview-card__list-text">
                {document.title}
                {document.usefulDate ? (
                  <span className="text-faint">{` — ${formatShortDate(document.usefulDate)}`}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="preview-card__secondary">Aucun billet enregistre pour l’instant.</p>
      )}
    </PreviewCard>
  )
}

/* --- Preparation du prochain evenement -------------------------------------- */

export function PreparationPreview({
  progress,
  eventTitle,
}: {
  progress: TaskProgress | null
  eventTitle: string | null
}) {
  return (
    <PreviewCard title="Preparation" icon="cases" tone="lavender">
      {progress && progress.total > 0 ? (
        <>
          <div>
            <p className="preview-card__primary">{progress.percent} %</p>
            <p className="preview-card__secondary">
              {progress.done}/{progress.total} taches pour {eventTitle}
            </p>
          </div>
          <div className="progress">
            <div
              className="progress__fill"
              style={{ width: `${progress.percent}%` }}
              role="img"
              aria-label={`${progress.percent} % de la preparation effectuee`}
            />
          </div>
          {progress.overdue > 0 ? (
            <Badge tone="blush">{progress.overdue} en retard</Badge>
          ) : null}
        </>
      ) : (
        <p className="preview-card__secondary">
          Aucune tache pour l’instant. Ouvre un evenement pour organiser sa preparation.
        </p>
      )}
    </PreviewCard>
  )
}

/* --- Taches a venir ---------------------------------------------------------- */

export function UpcomingTasksPreview({ tasks }: { tasks: UpcomingTask[] }) {
  return (
    <PreviewCard title="A faire bientot" icon="valide" tone="sage">
      {tasks.length > 0 ? (
        <ul className="preview-card__list">
          {tasks.map(({ task, eventTitle }) => (
            <li key={task.id} className="preview-card__list-item">
              <span
                className="preview-card__bullet"
                style={isOverdue(task) ? { background: 'var(--c-danger)' } : undefined}
                aria-hidden="true"
              />
              <span className="preview-card__list-text">
                {task.title}
                <span className="text-faint">
                  {' — '}
                  {task.dueDate ? formatShortDate(task.dueDate) : eventTitle}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="preview-card__secondary">Rien d’urgent. Tout est sous controle.</p>
      )}
    </PreviewCard>
  )
}

/* --- Objets et cadeaux a preparer ---------------------------------------------- */

export function PendingItemsPreview({
  items,
}: {
  items: Array<{ item: EventItem; eventTitle: string }>
}) {
  return (
    <PreviewCard title="A ne pas oublier" icon="cadeau" tone="apricot">
      {items.length > 0 ? (
        <ul className="preview-card__list">
          {items.map(({ item, eventTitle }) => (
            <li key={item.id} className="preview-card__list-item">
              <span className="preview-card__bullet" aria-hidden="true" />
              <span className="preview-card__list-text">
                {item.label}
                <span className="text-faint">{` — ${eventTitle}`}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="preview-card__secondary">Rien a preparer pour le moment.</p>
      )}
    </PreviewCard>
  )
}
