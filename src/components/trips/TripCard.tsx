import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { Illustration, resolveIllustration } from '@/components/icons/Illustration'
import { Badge, Card } from '@/components/ui'
import { TRIP_STATUS_TONES } from '@/config/visuals'
import { TRIP_STATUS_LABELS, type Trip } from '@/models'
import { tripDetailPath } from '@/navigation/routes'
import { formatCountdown, formatDateRange } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { nightCount } from '@/utils/tripRules'

/** Indicateurs synthetiques, calcules une fois par la page pour toute la liste. */
export interface TripIndicators {
  /** Avancement des taches, `null` si aucune tache. */
  taskPercent: number | null
  transports: number
  stays: number
  activities: number
  documents: number
  budgetPercent: number | null
  budgetOver: boolean
  /** Nuits sans hebergement, mises en avant car c'est le trou le plus couteux. */
  uncoveredNights: number
}

export interface TripCardProps {
  trip: Trip
  currency?: string
  indicators?: TripIndicators
  /** Carte mise en avant (prochain voyage). */
  highlight?: boolean
}

export function TripCard({ trip, currency = 'EUR', indicators, highlight = false }: TripCardProps) {
  const nights = nightCount(trip.startDate, trip.endDate)
  const upcoming = trip.status !== 'termine' && trip.status !== 'annule'

  return (
    <Card className={['trip-card', highlight ? 'trip-card--highlight' : ''].filter(Boolean).join(' ')}>
      <Link className="trip-card__link" to={tripDetailPath(trip.id)}>
        <div className="trip-card__banner">
          <Illustration
            name={resolveIllustration(trip.imageKey ?? trip.destination)}
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

          {trip.description ? <p className="entity-card__description">{trip.description}</p> : null}

          {indicators ? (
            <div className="badge-row">
              {indicators.taskPercent !== null ? (
                <Badge tone={indicators.taskPercent === 100 ? 'sage' : 'apricot'}>
                  Preparation {indicators.taskPercent} %
                </Badge>
              ) : null}
              {indicators.transports > 0 ? (
                <Badge tone="sky">
                  {indicators.transports} transport{indicators.transports > 1 ? 's' : ''}
                </Badge>
              ) : null}
              {indicators.stays > 0 ? (
                <Badge tone="mint">
                  {indicators.stays} hebergement{indicators.stays > 1 ? 's' : ''}
                </Badge>
              ) : null}
              {indicators.activities > 0 ? (
                <Badge tone="lavender">
                  {indicators.activities} activite{indicators.activities > 1 ? 's' : ''}
                </Badge>
              ) : null}
              {indicators.budgetPercent !== null ? (
                <Badge tone={indicators.budgetOver ? 'blush' : 'sage'}>
                  Budget {indicators.budgetPercent} %
                </Badge>
              ) : null}
              {indicators.documents > 0 ? (
                <Badge tone="neutral">
                  {indicators.documents} document{indicators.documents > 1 ? 's' : ''}
                </Badge>
              ) : null}
              {upcoming && indicators.uncoveredNights > 0 ? (
                <Badge tone="blush">
                  {indicators.uncoveredNights} nuit{indicators.uncoveredNights > 1 ? 's' : ''} sans
                  hebergement
                </Badge>
              ) : null}
            </div>
          ) : null}

          <div className="entity-card__footer">
            <Badge tone="apricot">
              {upcoming ? formatCountdown(trip.startDate) : `${nights} nuit${nights > 1 ? 's' : ''}`}
            </Badge>
            {typeof trip.budget === 'number' ? (
              <span className="text-muted">Budget estime {formatCurrency(trip.budget, currency)}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </Card>
  )
}
