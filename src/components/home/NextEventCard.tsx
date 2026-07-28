import { Icon } from '@/components/icons/Icon'
import { Illustration, resolveIllustration } from '@/components/icons/Illustration'
import { Badge, Button, Card } from '@/components/ui'
import { EVENT_TYPE_LABELS, type AppEvent } from '@/models'
import { formatCountdown, formatDateRange, formatTime } from '@/utils/date'
import { pluralize } from '@/utils/format'

export interface NextEventCardProps {
  event: AppEvent
  onOpenDetail: (event: AppEvent) => void
}

/** Carte principale de l'accueil : le prochain evenement mis en avant. */
export function NextEventCard({ event, onOpenDetail }: NextEventCardProps) {
  const illustration = resolveIllustration(event.type)

  return (
    <Card className="next-event">
      <div className="next-event__banner">
        <Illustration name={illustration} className="next-event__illustration" />
        <div className="next-event__banner-top">
          <Badge className="next-event__countdown">{formatCountdown(event.startDate)}</Badge>
          <Badge className="next-event__countdown">{EVENT_TYPE_LABELS[event.type]}</Badge>
        </div>
      </div>

      <div className="next-event__body">
        <h3 className="next-event__title">{event.title}</h3>

        <div className="next-event__meta">
          <p className="meta-row">
            <Icon name="calendrier" size={18} className="meta-row__icon" />
            <span className="meta-row__text">
              {formatDateRange(event.startDate, event.endDate)} · {formatTime(event.startDate)}
            </span>
          </p>
          {event.location ? (
            <p className="meta-row">
              <Icon name="localisation" size={18} className="meta-row__icon" />
              <span className="meta-row__text">{event.location}</span>
            </p>
          ) : null}
          {typeof event.participants === 'number' ? (
            <p className="meta-row">
              <Icon name="participants" size={18} className="meta-row__icon" />
              <span className="meta-row__text">
                {pluralize(event.participants, 'participant')}
              </span>
            </p>
          ) : null}
        </div>

        <Button
          variant="primary"
          block
          className="next-event__cta"
          onClick={() => onOpenDetail(event)}
        >
          Voir le detail
        </Button>
      </div>
    </Card>
  )
}
