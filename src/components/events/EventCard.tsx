import { Badge, IconChip } from '@/components/ui'
import { EVENT_STATUS_TONES, EVENT_VISUALS } from '@/config/visuals'
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, type AppEvent } from '@/models'
import { formatDateRange, formatTime } from '@/utils/date'
import { pluralize } from '@/utils/format'

export interface EventCardProps {
  event: AppEvent
}

/** Carte d'evenement reutilisee par la liste et l'agenda. */
export function EventCard({ event }: EventCardProps) {
  const visual = EVENT_VISUALS[event.type]

  return (
    <article className="entity-card">
      <div className="entity-card__head">
        <IconChip icon={visual.icon} tone={visual.tone} />
        <div className="entity-card__heading">
          <h3 className="entity-card__title">{event.title}</h3>
          <p className="entity-card__subtitle">
            {formatDateRange(event.startDate, event.endDate)} · {formatTime(event.startDate)}
          </p>
        </div>
      </div>

      {event.description ? <p className="entity-card__description">{event.description}</p> : null}

      <div className="entity-card__footer">
        <Badge tone={EVENT_STATUS_TONES[event.status]}>{EVENT_STATUS_LABELS[event.status]}</Badge>
        <Badge>{EVENT_TYPE_LABELS[event.type]}</Badge>
        {event.location ? <span className="text-muted">{event.location}</span> : null}
        {typeof event.participants === 'number' ? (
          <span className="text-faint">{pluralize(event.participants, 'participant')}</span>
        ) : null}
      </div>
    </article>
  )
}
