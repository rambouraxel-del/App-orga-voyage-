import { Icon } from '@/components/icons/Icon'
import { Illustration, resolveIllustration } from '@/components/icons/Illustration'
import { Badge, Card } from '@/components/ui'
import { TRIP_STATUS_TONES } from '@/config/visuals'
import { TRIP_STATUS_LABELS, type Trip } from '@/models'
import { formatCountdown, formatDateRange } from '@/utils/date'
import { formatCurrency } from '@/utils/format'

export interface TripCardProps {
  trip: Trip
  currency?: string
}

export function TripCard({ trip, currency = 'EUR' }: TripCardProps) {
  return (
    <Card className="trip-card">
      <div className="trip-card__banner">
        <Illustration
          name={resolveIllustration(trip.image ?? trip.destination)}
          className="trip-card__illustration"
        />
        <Badge tone={TRIP_STATUS_TONES[trip.status]} className="trip-card__banner-badge">
          {TRIP_STATUS_LABELS[trip.status]}
        </Badge>
      </div>

      <div className="trip-card__body">
        <div>
          <h3 className="entity-card__title">{trip.title}</h3>
          <p className="entity-card__subtitle">{formatDateRange(trip.startDate, trip.endDate)}</p>
        </div>

        <p className="meta-row">
          <Icon name="localisation" size={18} className="meta-row__icon" />
          <span className="meta-row__text">{trip.destination || 'Destination a definir'}</span>
        </p>

        {trip.notes ? <p className="entity-card__description">{trip.notes}</p> : null}

        <div className="entity-card__footer">
          <Badge tone="apricot">{formatCountdown(trip.startDate)}</Badge>
          {typeof trip.budget === 'number' ? (
            <span className="text-muted">Budget estime {formatCurrency(trip.budget, currency)}</span>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
