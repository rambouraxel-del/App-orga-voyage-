import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { Badge, IconChip } from '@/components/ui'
import { EVENT_STATUS_TONES, EVENT_VISUALS } from '@/config/visuals'
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS, type AppEvent } from '@/models'
import { eventDetailPath } from '@/navigation/routes'
import { formatDateRange, formatTime } from '@/utils/date'
import { dayCount, isMultiDay, isOngoingEvent, isPastEvent } from '@/utils/eventRules'

export interface EventIndicators {
  /** Progression des taches, en pourcentage. `null` si aucune tache. */
  taskPercent: number | null
  /** Participants confirmes / total. `null` si aucun participant. */
  participants: { confirmed: number; total: number } | null
  /** Pourcentage du budget consomme. `null` si aucune enveloppe definie. */
  budgetPercent: number | null
  budgetOver: boolean
}

export interface EventCardProps {
  event: AppEvent
  /** Indicateurs synthetiques des modules. Absents = rien a afficher. */
  indicators?: EventIndicators
  /** Masque la date (la vue liste l'affiche deja en en-tete de groupe). */
  hideDate?: boolean
}

/** Carte d'evenement cliquable, menant a la fiche detaillee. */
export function EventCard({ event, hideDate = false, indicators }: EventCardProps) {
  const visual = EVENT_VISUALS[event.category]
  const past = isPastEvent(event)
  const ongoing = isOngoingEvent(event)
  const multiDay = isMultiDay(event)

  return (
    <Link
      to={eventDetailPath(event.id)}
      className={['entity-card', 'entity-card--link', past ? 'entity-card--past' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label={`Ouvrir ${event.title}`}
    >
      <div className="entity-card__head">
        <IconChip icon={visual.icon} tone={visual.tone} />
        <div className="entity-card__heading">
          <h3 className="entity-card__title">{event.title}</h3>
          <p className="entity-card__subtitle">
            {hideDate
              ? event.allDay
                ? 'Toute la journee'
                : formatTime(event.startDate)
              : `${formatDateRange(event.startDate, event.endDate ?? event.startDate)}${
                  event.allDay ? '' : ` · ${formatTime(event.startDate)}`
                }`}
          </p>
        </div>
        <Icon name="chevron" size={17} className="entity-card__chevron" />
      </div>

      {event.location ? (
        <p className="meta-row meta-row--compact">
          <Icon name="localisation" size={16} className="meta-row__icon" />
          <span className="meta-row__text">{event.location}</span>
        </p>
      ) : null}

      <div className="entity-card__footer">
        <Badge tone={visual.tone === 'neutral' ? 'neutral' : 'leather'}>
          {EVENT_CATEGORY_LABELS[event.category]}
        </Badge>
        {multiDay ? <Badge tone="apricot">{dayCount(event)} jours</Badge> : null}
        {event.allDay ? <Badge tone="sky">Journee entiere</Badge> : null}
        {ongoing ? <Badge tone="sage">En cours</Badge> : null}
        {past ? <Badge>Passe</Badge> : null}
        {indicators?.taskPercent !== null && indicators?.taskPercent !== undefined ? (
          <Badge tone={indicators.taskPercent === 100 ? 'sage' : 'apricot'}>
            Prep. {indicators.taskPercent} %
          </Badge>
        ) : null}
        {indicators?.participants ? (
          <Badge tone="sky">
            {indicators.participants.confirmed}/{indicators.participants.total} confirmes
          </Badge>
        ) : null}
        {indicators?.budgetPercent !== null && indicators?.budgetPercent !== undefined ? (
          <Badge tone={indicators.budgetOver ? 'blush' : 'mint'}>
            Budget {indicators.budgetPercent} %
          </Badge>
        ) : null}
        {event.status === 'annule' || event.status === 'termine' ? (
          <Badge tone={EVENT_STATUS_TONES[event.status]}>
            {EVENT_STATUS_LABELS[event.status]}
          </Badge>
        ) : null}
      </div>
    </Link>
  )
}
