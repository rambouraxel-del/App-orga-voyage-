import type { AppEvent } from '@/models'
import { formatTime, splitDateBadge } from '@/utils/date'

export interface AgendaPreviewProps {
  events: AppEvent[]
}

/** Trois prochaines echeances : date, nom, lieu, horaire. */
export function AgendaPreview({ events }: AgendaPreviewProps) {
  return (
    <ul className="agenda-list">
      {events.map((event) => {
        const badge = splitDateBadge(event.startDate)
        return (
          <li key={event.id} className="agenda-row">
            <div className="date-badge" aria-hidden="true">
              <span className="date-badge__month">{badge.month}</span>
              <span className="date-badge__day">{badge.day}</span>
            </div>

            <div className="agenda-row__body">
              <p className="agenda-row__title">{event.title}</p>
              <p className="agenda-row__meta">{event.location || 'Lieu a definir'}</p>
            </div>

            <span className="agenda-row__time">{formatTime(event.startDate)}</span>
          </li>
        )
      })}
    </ul>
  )
}
