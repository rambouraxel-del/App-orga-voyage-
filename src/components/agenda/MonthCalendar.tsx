import { Icon } from '@/components/icons/Icon'
import { EVENT_VISUALS } from '@/config/visuals'
import type { AppEvent } from '@/models'
import { buildMonthGrid, dayKey, WEEKDAY_FULL, WEEKDAY_LABELS } from '@/utils/calendar'
import { formatMonthYear } from '@/utils/date'
import { isSameDay, occursOnDay } from '@/utils/eventRules'

export interface MonthCalendarProps {
  month: Date
  events: AppEvent[]
  selectedDay: Date
  onSelectDay: (day: Date) => void
  onChangeMonth: (month: Date) => void
  onToday: () => void
}

/** Nombre maximal de pastilles affichees sous un jour. */
const MAX_DOTS = 3

export function MonthCalendar({
  month,
  events,
  selectedDay,
  onSelectDay,
  onChangeMonth,
  onToday,
}: MonthCalendarProps) {
  const cells = buildMonthGrid(month)

  return (
    <section className="calendar" aria-label={`Calendrier de ${formatMonthYear(month)}`}>
      <header className="calendar__header">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Mois precedent"
        >
          <Icon name="precedent" size={19} />
        </button>

        <h2 className="calendar__title" aria-live="polite">
          {formatMonthYear(month)}
        </h2>

        <button
          type="button"
          className="icon-btn"
          onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Mois suivant"
        >
          <Icon name="suivant" size={19} />
        </button>
      </header>

      <div className="calendar__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`} className="calendar__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="calendar__grid" role="grid" aria-label="Jours du mois">
        {cells.map((cell) => {
          const dayEvents = events.filter((event) => occursOnDay(event, cell.date))
          const selected = isSameDay(cell.date, selectedDay)
          const label = `${WEEKDAY_FULL[(cell.date.getDay() + 6) % 7]} ${cell.date.getDate()} ${cell.date.toLocaleDateString('fr-FR', { month: 'long' })}`

          return (
            <button
              key={dayKey(cell.date)}
              type="button"
              role="gridcell"
              className={[
                'calendar__day',
                cell.inMonth ? '' : 'calendar__day--outside',
                cell.isToday ? 'calendar__day--today' : '',
                selected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-selected={selected}
              aria-label={
                dayEvents.length > 0
                  ? `${label}, ${dayEvents.length} evenement${dayEvents.length > 1 ? 's' : ''}`
                  : label
              }
              onClick={() => onSelectDay(cell.date)}
            >
              <span className="calendar__day-number">{cell.date.getDate()}</span>

              {/* Pastilles colorees par categorie — l'information reste portee
                  par l'aria-label pour ne pas dependre de la couleur seule. */}
              <span className="calendar__dots" aria-hidden="true">
                {dayEvents.slice(0, MAX_DOTS).map((event) => (
                  <span
                    key={event.id}
                    className={`calendar__dot calendar__dot--${EVENT_VISUALS[event.category].tone}`}
                  />
                ))}
                {dayEvents.length > MAX_DOTS ? (
                  <span className="calendar__dot calendar__dot--more" />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <div className="calendar__footer">
        <button type="button" className="calendar__today" onClick={onToday}>
          Aujourd’hui
        </button>
      </div>
    </section>
  )
}
