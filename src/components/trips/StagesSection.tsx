import { useId, useMemo, useState } from 'react'
import { ModuleSection } from '@/components/events/ModuleSection'
import { Icon } from '@/components/icons/Icon'
import { Alert, Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { stagesRepository } from '@/db/repositories'
import {
  STAGE_STATUSES,
  STAGE_STATUS_LABELS,
  type StageDraft,
  type Trip,
  type TripStage,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatShortDate, toDayInput } from '@/utils/date'
import { checkPeriod, overlappingStages } from '@/utils/tripRules'
import { END_OF_DAY_SUFFIX, START_OF_DAY_SUFFIX } from '@/utils/tripValidation'

interface FormState {
  place: string
  address: string
  startDay: string
  endDay: string
  status: string
  note: string
}

const emptyForm = (): FormState => ({
  place: '',
  address: '',
  startDay: '',
  endDay: '',
  status: 'prevu',
  note: '',
})

const STAGE_TONES: Record<string, 'lavender' | 'sky' | 'sage' | 'neutral'> = {
  idee: 'lavender',
  prevu: 'sky',
  reserve: 'sage',
  fait: 'neutral',
}

/**
 * Itineraire : la suite ordonnee des lieux du voyage.
 *
 * L'ordre est manuel et non deduit des dates : une etape peut n'etre qu'une
 * intention encore sans date, et doit malgre tout se placer dans la sequence.
 */
export function StagesSection({ trip, stages }: { trip: Trip; stages: TripStage[] }) {
  const [editing, setEditing] = useState<TripStage | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = { place: useId(), address: useId(), start: useId(), end: useId(), status: useId(), note: useId() }

  const overlaps = useMemo(() => overlappingStages(stages), [stages])
  const open = creating || editing !== null

  // Avertissements de coherence, recalcules pendant la saisie.
  const issues = form.startDay
    ? checkPeriod(form.startDay, form.endDay || undefined, trip, 'de cette etape')
    : []

  function startCreate() {
    setForm(emptyForm())
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(stage: TripStage) {
    setForm({
      place: stage.place,
      address: stage.address ?? '',
      startDay: toDayInput(stage.startDate),
      endDay: toDayInput(stage.endDate),
      status: stage.status,
      note: stage.note ?? '',
    })
    setCreating(false)
    setError(null)
    setEditing(stage)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.place.trim().length === 0) {
      setError('Indique le lieu de cette etape.')
      return
    }
    if (issues.some((issue) => issue.level === 'erreur')) {
      setError(issues.find((issue) => issue.level === 'erreur')!.message)
      return
    }
    setBusy(true)
    try {
      const draft: StageDraft = {
        place: form.place.trim(),
        status: form.status as StageDraft['status'],
        address: form.address.trim() || undefined,
        startDate: form.startDay
          ? new Date(`${form.startDay}${START_OF_DAY_SUFFIX}`).toISOString()
          : undefined,
        endDate: form.endDay ? new Date(`${form.endDay}${END_OF_DAY_SUFFIX}`).toISOString() : undefined,
        note: form.note.trim() || undefined,
      }
      if (editing) await stagesRepository.update(editing.id, draft)
      else await stagesRepository.create(trip.id, draft)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('etape')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await stagesRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_DELETE('etape')))
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= stages.length) return
    const next = [...stages]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    try {
      await stagesRepository.reorder(next)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('etape')))
    }
  }

  return (
    <>
      <ModuleSection
        id="itineraire"
        title="Itineraire"
        icon="boussole"
        addLabel="Ajouter une etape"
        onAdd={startCreate}
        isEmpty={stages.length === 0}
        emptyText="Aucune etape. Ajoute les villes ou les lieux que tu comptes enchainer."
        summary={
          stages.length > 0 ? (
            <p className="module__summary-text">
              {stages.length} etape{stages.length > 1 ? 's' : ''}
              {overlaps.length > 0 ? (
                <span className="module__summary-alert">
                  {' '}
                  · {overlaps.length} chevauchement{overlaps.length > 1 ? 's' : ''} de dates
                </span>
              ) : null}
            </p>
          ) : null
        }
      >
        <ol className="stage-list">
          {stages.map((stage, index) => (
            <li key={stage.id} className="stage">
              <span className="stage__rank" aria-hidden="true">
                {index + 1}
              </span>
              <button type="button" className="stage__body" onClick={() => startEdit(stage)}>
                <span className="row__title">{stage.place}</span>
                <span className="row__meta">
                  {stage.startDate
                    ? `${formatShortDate(stage.startDate)}${
                        stage.endDate ? ` → ${formatShortDate(stage.endDate)}` : ''
                      }`
                    : 'Sans date'}
                  {stage.address ? ` · ${stage.address}` : ''}
                </span>
              </button>
              <Badge tone={STAGE_TONES[stage.status] ?? 'neutral'}>
                {STAGE_STATUS_LABELS[stage.status]}
              </Badge>
              <span className="task__move">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`Remonter ${stage.place}`}
                >
                  <Icon name="monter" size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === stages.length - 1}
                  aria-label={`Descendre ${stage.place}`}
                >
                  <Icon name="descendre" size={15} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </ModuleSection>

      <EditSheet
        open={open}
        title={editing ? 'Modifier l’etape' : 'Nouvelle etape'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Lieu" htmlFor={ids.place}>
          <input
            id={ids.place}
            className="field__input"
            type="text"
            value={form.place}
            onChange={(e) => setForm({ ...form, place: e.target.value })}
            placeholder="Porto"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Adresse" htmlFor={ids.address} hint="facultative">
          <input
            id={ids.address}
            className="field__input"
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            autoComplete="off"
          />
        </SheetField>

        <div className="field-row">
          <SheetField label="Du" htmlFor={ids.start} hint="facultatif">
            <input
              id={ids.start}
              className="field__input"
              type="date"
              value={form.startDay}
              onChange={(e) => setForm({ ...form, startDay: e.target.value })}
            />
          </SheetField>
          <SheetField label="Au" htmlFor={ids.end} hint="facultatif">
            <input
              id={ids.end}
              className="field__input"
              type="date"
              value={form.endDay}
              min={form.startDay || undefined}
              onChange={(e) => setForm({ ...form, endDay: e.target.value })}
            />
          </SheetField>
        </div>

        {issues.map((issue) => (
          <Alert key={issue.message} tone={issue.level === 'erreur' ? 'error' : 'info'}>
            {issue.message}
          </Alert>
        ))}

        <SheetField label="Statut" htmlFor={ids.status}>
          <select
            id={ids.status}
            className="field__input field__input--select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STAGE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STAGE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </SheetField>

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
