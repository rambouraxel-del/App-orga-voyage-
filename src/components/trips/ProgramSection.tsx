import { useId, useMemo, useState } from 'react'
import { ModuleSection } from '@/components/events/ModuleSection'
import { Icon } from '@/components/icons/Icon'
import { Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { activitiesRepository } from '@/db/repositories'
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_LABELS,
  type ActivityDraft,
  type Trip,
  type TripActivity,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatDayHeading } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { compareActivities } from '@/utils/tripRules'
import { START_OF_DAY_SUFFIX } from '@/utils/tripValidation'

interface FormState {
  title: string
  day: string
  time: string
  place: string
  category: string
  bookingRequired: boolean
  plannedCost: string
  actualCost: string
  status: string
  note: string
}

const emptyForm = (day: string): FormState => ({
  title: '',
  day,
  time: '',
  place: '',
  category: 'visite',
  bookingRequired: false,
  plannedCost: '',
  actualCost: '',
  status: 'idee',
  note: '',
})

const STATUS_TONES: Record<string, 'lavender' | 'sky' | 'sage' | 'mint' | 'blush'> = {
  idee: 'lavender',
  prevu: 'sky',
  reserve: 'sage',
  realise: 'mint',
  annule: 'blush',
}

const toAmount = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const amount = Number(trimmed.replace(',', '.'))
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

export interface ProgramSectionProps {
  trip: Trip
  activities: TripActivity[]
  /** Journees generees a partir des dates du voyage. */
  days: string[]
  currency: string
}

/**
 * Programme jour par jour.
 *
 * Les journees sont GENEREES a partir des dates du voyage : la trame existe
 * avant toute saisie, et une journee vide reste visible — c'est justement
 * l'information utile quand on prepare.
 */
export function ProgramSection({ trip, activities, days, currency }: ProgramSectionProps) {
  const [editing, setEditing] = useState<TripActivity | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(() => emptyForm(days[0] ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const ids = {
    title: useId(),
    day: useId(),
    time: useId(),
    place: useId(),
    category: useId(),
    planned: useId(),
    actual: useId(),
    status: useId(),
    note: useId(),
  }

  /**
   * Activites regroupees par journee. Les activites dont la journee est sortie
   * de la periode (dates du voyage raccourcies) sont conservees et affichees a
   * part : jamais de perte silencieuse.
   */
  const { byDay, orphans } = useMemo(() => {
    const map = new Map<string, TripActivity[]>()
    for (const day of days) map.set(day, [])
    const outside: TripActivity[] = []
    for (const activity of activities) {
      const bucket = map.get(activity.day)
      if (bucket) bucket.push(activity)
      else outside.push(activity)
    }
    for (const bucket of map.values()) bucket.sort(compareActivities)
    return { byDay: map, orphans: outside.sort(compareActivities) }
  }, [activities, days])

  const open = creating || editing !== null
  const planned = activities.filter((a) => a.status !== 'annule').length
  const toBook = activities.filter((a) => a.bookingRequired && a.status === 'idee').length

  function startCreate(day: string) {
    setForm(emptyForm(day))
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(activity: TripActivity) {
    setForm({
      title: activity.title,
      day: activity.day,
      time: activity.time ?? '',
      place: activity.place ?? '',
      category: activity.category,
      bookingRequired: activity.bookingRequired,
      plannedCost: typeof activity.plannedCost === 'number' ? String(activity.plannedCost) : '',
      actualCost: typeof activity.actualCost === 'number' ? String(activity.actualCost) : '',
      status: activity.status,
      note: activity.note ?? '',
    })
    setCreating(false)
    setError(null)
    setEditing(activity)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.title.trim().length === 0) {
      setError('Donne un titre a cette activite.')
      return
    }
    if (!form.day) {
      setError('Choisis la journee de cette activite.')
      return
    }
    setBusy(true)
    try {
      const draft: ActivityDraft = {
        title: form.title.trim(),
        day: form.day,
        category: form.category as ActivityDraft['category'],
        bookingRequired: form.bookingRequired,
        status: form.status as ActivityDraft['status'],
        time: form.time || undefined,
        place: form.place.trim() || undefined,
        plannedCost: toAmount(form.plannedCost),
        actualCost: toAmount(form.actualCost),
        note: form.note.trim() || undefined,
      }
      if (editing) {
        // Un changement de journee passe par `moveToDay` : il replace
        // l'activite en fin de la journee cible plutot que de conserver un
        // rang qui n'a plus de sens.
        const dayChanged = editing.day !== form.day
        await activitiesRepository.update(editing.id, draft)
        if (dayChanged) await activitiesRepository.moveToDay(editing.id, form.day)
      } else {
        await activitiesRepository.create(trip.id, draft)
      }
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('activite')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await activitiesRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_DELETE('activite')))
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(dayActivities: TripActivity[], index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= dayActivities.length) return
    const next = [...dayActivities]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    try {
      await activitiesRepository.reorder(next)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('activite')))
    }
  }

  function renderActivity(activity: TripActivity, index: number, list: TripActivity[]) {
    const cost = activity.actualCost ?? activity.plannedCost
    return (
      <li key={activity.id} className="row row--split">
        <button type="button" className="row__main" onClick={() => startEdit(activity)}>
          <span className="activity__time">{activity.time || '—'}</span>
          <span className="row__body">
            <span className="row__title">{activity.title}</span>
            <span className="row__meta">
              {ACTIVITY_CATEGORY_LABELS[activity.category]}
              {activity.place ? ` · ${activity.place}` : ''}
              {typeof cost === 'number' ? ` · ${formatCurrency(cost, currency)}` : ''}
              {activity.bookingRequired ? ' · a reserver' : ''}
            </span>
          </span>
        </button>
        <Badge tone={STATUS_TONES[activity.status] ?? 'neutral'}>
          {ACTIVITY_STATUS_LABELS[activity.status]}
        </Badge>
        <span className="task__move">
          <button
            type="button"
            onClick={() => handleMove(list, index, -1)}
            disabled={index === 0}
            aria-label={`Remonter ${activity.title}`}
          >
            <Icon name="monter" size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleMove(list, index, 1)}
            disabled={index === list.length - 1}
            aria-label={`Descendre ${activity.title}`}
          >
            <Icon name="descendre" size={15} />
          </button>
        </span>
      </li>
    )
  }

  return (
    <>
      <ModuleSection
        id="programme"
        title="Programme"
        icon="liste"
        addLabel="Ajouter une activite"
        onAdd={() => startCreate(days[0] ?? '')}
        isEmpty={days.length === 0 && orphans.length === 0}
        emptyText="Les journees apparaitront ici des que les dates du voyage seront renseignees."
        summary={
          <p className="module__summary-text">
            {days.length} journee{days.length > 1 ? 's' : ''} · {planned} activite
            {planned > 1 ? 's' : ''}
            {toBook > 0 ? (
              <span className="module__summary-alert"> · {toBook} a reserver</span>
            ) : null}
          </p>
        }
      >
        {days.length > 3 ? (
          <button
            type="button"
            className="link-button"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? 'Afficher toutes les journees' : 'Masquer les journees vides'}
          </button>
        ) : null}

        <div className="program">
          {days.map((day, index) => {
            const dayActivities = byDay.get(day) ?? []
            if (collapsed && dayActivities.length === 0) return null
            return (
              <section className="program__day" key={day}>
                <header className="program__day-header">
                  <h3 className="program__day-title">
                    <span className="program__day-index">J{index + 1}</span>
                    {formatDayHeading(`${day}${START_OF_DAY_SUFFIX}`)}
                  </h3>
                  <button
                    type="button"
                    className="program__day-add"
                    onClick={() => startCreate(day)}
                    aria-label={`Ajouter une activite le ${formatDayHeading(`${day}${START_OF_DAY_SUFFIX}`)}`}
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </header>
                {dayActivities.length === 0 ? (
                  <p className="program__day-empty">Journee libre</p>
                ) : (
                  <ul className="row-list">
                    {dayActivities.map((activity, i) =>
                      renderActivity(activity, i, dayActivities),
                    )}
                  </ul>
                )}
              </section>
            )
          })}

          {orphans.length > 0 ? (
            <section className="program__day program__day--orphan">
              <header className="program__day-header">
                <h3 className="program__day-title">Hors periode</h3>
              </header>
              <p className="program__day-empty">
                Ces activites sont datees en dehors des dates actuelles du voyage. Deplace-les vers
                une journee, ou ajuste les dates du voyage.
              </p>
              <ul className="row-list">
                {orphans.map((activity, i) => renderActivity(activity, i, orphans))}
              </ul>
            </section>
          ) : null}
        </div>
      </ModuleSection>

      <EditSheet
        open={open}
        title={editing ? 'Modifier l’activite' : 'Nouvelle activite'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Titre" htmlFor={ids.title}>
          <input
            id={ids.title}
            className="field__input"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Tour du Belem"
            autoComplete="off"
          />
        </SheetField>

        <div className="field-row">
          <SheetField label="Journee" htmlFor={ids.day}>
            <select
              id={ids.day}
              className="field__input field__input--select"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            >
              {days.map((day, index) => (
                <option key={day} value={day}>
                  J{index + 1} — {formatDayHeading(`${day}${START_OF_DAY_SUFFIX}`)}
                </option>
              ))}
              {/* Journee hors periode : proposee pour ne pas bloquer l'edition. */}
              {form.day && !days.includes(form.day) ? (
                <option value={form.day}>
                  {formatDayHeading(`${form.day}${START_OF_DAY_SUFFIX}`)} (hors periode)
                </option>
              ) : null}
            </select>
          </SheetField>
          <SheetField label="Heure" htmlFor={ids.time} hint="facultative">
            <input
              id={ids.time}
              className="field__input"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </SheetField>
        </div>

        <SheetField label="Lieu" htmlFor={ids.place} hint="facultatif">
          <input
            id={ids.place}
            className="field__input"
            type="text"
            value={form.place}
            onChange={(e) => setForm({ ...form, place: e.target.value })}
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Categorie" htmlFor={ids.category}>
          <select
            id={ids.category}
            className="field__input field__input--select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {ACTIVITY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {ACTIVITY_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </SheetField>

        <div className="field-row">
          <SheetField label="Cout prevu" htmlFor={ids.planned} hint="facultatif">
            <input
              id={ids.planned}
              className="field__input"
              type="text"
              inputMode="decimal"
              value={form.plannedCost}
              onChange={(e) => setForm({ ...form, plannedCost: e.target.value })}
            />
          </SheetField>
          <SheetField label="Cout reel" htmlFor={ids.actual} hint="facultatif">
            <input
              id={ids.actual}
              className="field__input"
              type="text"
              inputMode="decimal"
              value={form.actualCost}
              onChange={(e) => setForm({ ...form, actualCost: e.target.value })}
            />
          </SheetField>
        </div>

        <SheetField label="Statut" htmlFor={ids.status}>
          <select
            id={ids.status}
            className="field__input field__input--select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {ACTIVITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ACTIVITY_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </SheetField>

        <div className="field field--switch">
          <label className="switch">
            <input
              type="checkbox"
              checked={form.bookingRequired}
              onChange={(e) => setForm({ ...form, bookingRequired: e.target.checked })}
            />
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            <span className="switch__label">Reservation necessaire</span>
          </label>
        </div>

        <SheetField label="Note" htmlFor={ids.note} hint="facultative">
          <textarea
            id={ids.note}
            className="field__input field__input--textarea"
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </SheetField>
      </EditSheet>
    </>
  )
}
