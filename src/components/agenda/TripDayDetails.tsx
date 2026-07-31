import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import type {
  Trip,
  TripActivity,
  TripStay,
  TripTransport,
} from '@/models'
import { ACTIVITY_CATEGORY_LABELS, STAY_KIND_LABELS, TRANSPORT_MODE_LABELS } from '@/models'
import { tripDetailPath } from '@/navigation/routes'
import { formatTime } from '@/utils/date'
import { compareActivities, compareTransports, tripDays } from '@/utils/tripRules'

export interface TripDayContent {
  trip: Trip
  /** Rang de la journee dans le voyage, a partir de 1. */
  dayIndex: number
  totalDays: number
  transports: TripTransport[]
  stays: TripStay[]
  activities: TripActivity[]
}

/**
 * Detail d'une journee de voyage dans l'agenda.
 *
 * L'evenement porteur donne deja la periode ; ce bloc ajoute ce qui se passe
 * REELLEMENT ce jour-la — le trajet, ou l'on dort, ce qui est prevu.
 */
export function collectTripDay(
  day: string,
  trips: Trip[],
  transports: TripTransport[],
  stays: TripStay[],
  activities: TripActivity[],
): TripDayContent[] {
  return trips.flatMap((trip) => {
    const days = tripDays(trip.startDate, trip.endDate)
    const dayIndex = days.indexOf(day)
    if (dayIndex === -1) return []

    return [
      {
        trip,
        dayIndex: dayIndex + 1,
        totalDays: days.length,
        transports: transports
          .filter((transport) => transport.tripId === trip.id && transport.status !== 'annule')
          .filter((transport) => transport.departure.slice(0, 10) === day)
          .sort(compareTransports),
        // Un sejour couvre la nuit du jour J : il concerne la journee tant que
        // le depart n'a pas eu lieu.
        stays: stays.filter(
          (stay) =>
            stay.tripId === trip.id &&
            stay.status !== 'annule' &&
            stay.checkIn <= day &&
            stay.checkOut > day,
        ),
        activities: activities
          .filter(
            (activity) =>
              activity.tripId === trip.id && activity.day === day && activity.status !== 'annule',
          )
          .sort(compareActivities)
          .slice(0, 4),
      },
    ]
  })
}

export function TripDayDetails({ content }: { content: TripDayContent }) {
  const { trip, dayIndex, totalDays, transports, stays, activities } = content
  if (transports.length === 0 && stays.length === 0 && activities.length === 0) return null

  return (
    <div className="agenda-trip">
      <p className="agenda-trip__line">
        <Icon name="avion" size={14} />
        <Link to={tripDetailPath(trip.id)}>
          {trip.title} — jour {dayIndex}/{totalDays}
        </Link>
      </p>

      {transports.map((transport) => (
        <p className="agenda-trip__line" key={transport.id}>
          <Icon name="boussole" size={14} />
          <span>
            {formatTime(transport.departure)} · {TRANSPORT_MODE_LABELS[transport.mode]}{' '}
            {transport.from} → {transport.to}
          </span>
        </p>
      ))}

      {stays.map((stay) => (
        <p className="agenda-trip__line" key={stay.id}>
          <Icon name="valise" size={14} />
          <span>
            Nuit a {stay.name} ({STAY_KIND_LABELS[stay.kind]})
          </span>
        </p>
      ))}

      {activities.map((activity) => (
        <p className="agenda-trip__line" key={activity.id}>
          <Icon name="etoiles" size={14} />
          <span>
            {activity.time ? `${activity.time} · ` : ''}
            {activity.title} ({ACTIVITY_CATEGORY_LABELS[activity.category]})
          </span>
        </p>
      ))}
    </div>
  )
}
