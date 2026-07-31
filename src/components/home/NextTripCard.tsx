import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { Illustration, resolveIllustration } from '@/components/icons/Illustration'
import { Badge, Card } from '@/components/ui'
import { TRIP_STATUS_TONES } from '@/config/visuals'
import type { NextTripSummary } from '@/hooks/useDashboard'
import { TRIP_STATUS_LABELS } from '@/models'
import { documentDetailPath, tripDetailPath } from '@/navigation/routes'
import { formatDateRange, formatShortDate, formatTime } from '@/utils/date'

/**
 * Carte « prochain voyage » de l'accueil.
 *
 * Repond a quatre questions dans l'ordre ou elles se posent avant un depart :
 * dans combien de temps, ou en sont les preparatifs, quel est le prochain
 * trajet, et qu'est-ce qui manque encore.
 */
export function NextTripCard({ summary }: { summary: NextTripSummary }) {
  const { trip, daysLeft, preparationPercent, nextTransport, uncoveredNights } = summary

  const countdown =
    daysLeft > 1
      ? `J-${daysLeft}`
      : daysLeft === 1
        ? 'Depart demain'
        : daysLeft === 0
          ? "Depart aujourd'hui"
          : 'En cours'

  return (
    <Card className="next-trip">
      <Link className="next-trip__link" to={tripDetailPath(trip.id)}>
        <div className="next-trip__banner">
          <Illustration
            name={resolveIllustration(trip.imageKey ?? trip.destination)}
            className="next-trip__illustration"
          />
          <span className="next-trip__countdown">{countdown}</span>
        </div>

        <div className="next-trip__body">
          <div>
            <h3 className="next-trip__title">{trip.title}</h3>
            <p className="next-trip__dates">{formatDateRange(trip.startDate, trip.endDate)}</p>
          </div>

          <p className="meta-row">
            <Icon name="localisation" size={17} className="meta-row__icon" />
            <span className="meta-row__text">{trip.destination}</span>
          </p>

          {preparationPercent !== null ? (
            <div>
              <div className="progress">
                <div
                  className="progress__fill"
                  style={{ width: `${preparationPercent}%` }}
                  role="img"
                  aria-label={`Preparation a ${preparationPercent} %`}
                />
              </div>
              <p className="next-trip__meta">Preparation {preparationPercent} %</p>
            </div>
          ) : null}

          <div className="badge-row">
            <Badge tone={TRIP_STATUS_TONES[trip.status]}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
            {uncoveredNights > 0 ? (
              <Badge tone="blush">
                {uncoveredNights} nuit{uncoveredNights > 1 ? 's' : ''} sans hebergement
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>

      {nextTransport ? (
        <p className="next-trip__row">
          <Icon name="avion" size={16} />
          <span>
            {nextTransport.from} → {nextTransport.to} ·{' '}
            {formatShortDate(nextTransport.departure)} a {formatTime(nextTransport.departure)}
          </span>
        </p>
      ) : null}

      {summary.urgentTasks.length > 0 ? (
        <ul className="next-trip__list">
          {summary.urgentTasks.map((task) => (
            <li key={task.id}>
              <Icon name="cases" size={14} />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {summary.documents.length > 0 ? (
        <ul className="next-trip__list">
          {summary.documents.map((document) => (
            <li key={document.id}>
              <Icon name="document" size={14} />
              <Link to={documentDetailPath(document.id)}>{document.title}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}
