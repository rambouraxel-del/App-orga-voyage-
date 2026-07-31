import { useId, useState } from 'react'
import { ModuleSection } from '@/components/events/ModuleSection'
import { Alert, Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { transportsRepository } from '@/db/repositories'
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  TRANSPORT_MODES,
  TRANSPORT_MODE_LABELS,
  type DocumentLink,
  type TransportDraft,
  type TravelDocument,
  type Trip,
  type TripTransport,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatShortDate, formatTime, toDayInput, toTimeInput } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { checkPeriod, effectiveCost } from '@/utils/tripRules'
import { LinkedDocuments } from './LinkedDocuments'

interface FormState {
  mode: string
  from: string
  to: string
  departureDay: string
  departureTime: string
  arrivalDay: string
  arrivalTime: string
  company: string
  reference: string
  plannedPrice: string
  actualPrice: string
  status: string
  note: string
}

const emptyForm = (defaultDay: string): FormState => ({
  mode: 'train',
  from: '',
  to: '',
  departureDay: defaultDay,
  departureTime: '08:00',
  arrivalDay: '',
  arrivalTime: '',
  company: '',
  reference: '',
  plannedPrice: '',
  actualPrice: '',
  status: 'a-reserver',
  note: '',
})

export const BOOKING_TONES: Record<string, 'apricot' | 'sky' | 'sage' | 'neutral' | 'blush'> = {
  'a-reserver': 'apricot',
  reserve: 'sky',
  paye: 'sage',
  effectue: 'neutral',
  annule: 'blush',
}

const toAmount = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const amount = Number(trimmed.replace(',', '.'))
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

export interface TransportsSectionProps {
  trip: Trip
  transports: TripTransport[]
  links: DocumentLink[]
  documents: TravelDocument[]
  currency: string
}

export function TransportsSection({
  trip,
  transports,
  links,
  documents,
  currency,
}: TransportsSectionProps) {
  const [editing, setEditing] = useState<TripTransport | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(() => emptyForm(toDayInput(trip.startDate)))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = {
    mode: useId(),
    from: useId(),
    to: useId(),
    depDay: useId(),
    depTime: useId(),
    arrDay: useId(),
    arrTime: useId(),
    company: useId(),
    reference: useId(),
    planned: useId(),
    actual: useId(),
    status: useId(),
    note: useId(),
  }

  const open = creating || editing !== null
  const active = transports.filter((t) => t.status !== 'annule')
  const toBook = active.filter((t) => t.status === 'a-reserver').length
  const total = active.reduce((sum, t) => sum + effectiveCost(t.plannedPrice, t.actualPrice), 0)

  const issues = checkPeriod(
    form.departureDay,
    form.arrivalDay || undefined,
    trip,
    'de ce trajet',
  )

  function startCreate() {
    setForm(emptyForm(toDayInput(trip.startDate)))
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(transport: TripTransport) {
    setForm({
      mode: transport.mode,
      from: transport.from,
      to: transport.to,
      departureDay: toDayInput(transport.departure),
      departureTime: toTimeInput(transport.departure),
      arrivalDay: toDayInput(transport.arrival),
      arrivalTime: toTimeInput(transport.arrival),
      company: transport.company ?? '',
      reference: transport.reference ?? '',
      plannedPrice: typeof transport.plannedPrice === 'number' ? String(transport.plannedPrice) : '',
      actualPrice: typeof transport.actualPrice === 'number' ? String(transport.actualPrice) : '',
      status: transport.status,
      note: transport.note ?? '',
    })
    setCreating(false)
    setError(null)
    setEditing(transport)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.from.trim().length === 0 || form.to.trim().length === 0) {
      setError('Indique le depart et l’arrivee.')
      return
    }
    if (!form.departureDay) {
      setError('La date de depart est obligatoire.')
      return
    }
    if (issues.some((issue) => issue.level === 'erreur')) {
      setError(issues.find((issue) => issue.level === 'erreur')!.message)
      return
    }
    setBusy(true)
    try {
      const draft: TransportDraft = {
        mode: form.mode as TransportDraft['mode'],
        from: form.from.trim(),
        to: form.to.trim(),
        departure: new Date(
          `${form.departureDay}T${form.departureTime || '00:00'}:00`,
        ).toISOString(),
        status: form.status as TransportDraft['status'],
        arrival: form.arrivalDay
          ? new Date(`${form.arrivalDay}T${form.arrivalTime || '00:00'}:00`).toISOString()
          : undefined,
        company: form.company.trim() || undefined,
        reference: form.reference.trim() || undefined,
        plannedPrice: toAmount(form.plannedPrice),
        actualPrice: toAmount(form.actualPrice),
        note: form.note.trim() || undefined,
      }
      if (editing) await transportsRepository.update(editing.id, draft)
      else await transportsRepository.create(trip.id, draft)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('transport')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await transportsRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_DELETE('transport')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="transports"
        title="Transports"
        icon="avion"
        addLabel="Ajouter un trajet"
        onAdd={startCreate}
        isEmpty={transports.length === 0}
        emptyText="Aucun trajet. Ajoute l’aller, le retour et les deplacements sur place."
        summary={
          transports.length > 0 ? (
            <p className="module__summary-text">
              {active.length} trajet{active.length > 1 ? 's' : ''} ·{' '}
              {formatCurrency(total, currency)}
              {toBook > 0 ? (
                <span className="module__summary-alert"> · {toBook} a reserver</span>
              ) : null}
            </p>
          ) : null
        }
      >
        <ul className="row-list">
          {transports.map((transport) => {
            const price = transport.actualPrice ?? transport.plannedPrice
            return (
              <li key={transport.id} className="trip-row">
                <div className="row row--split">
                  <button type="button" className="row__main" onClick={() => startEdit(transport)}>
                    <span className="row__body">
                      <span className="row__title">
                        {transport.from} → {transport.to}
                      </span>
                      <span className="row__meta">
                        {TRANSPORT_MODE_LABELS[transport.mode]} ·{' '}
                        {formatShortDate(transport.departure)} a {formatTime(transport.departure)}
                        {transport.arrival ? ` → ${formatTime(transport.arrival)}` : ''}
                        {transport.company ? ` · ${transport.company}` : ''}
                        {transport.reference ? ` · ${transport.reference}` : ''}
                        {typeof price === 'number' ? ` · ${formatCurrency(price, currency)}` : ''}
                      </span>
                    </span>
                  </button>
                  <Badge tone={BOOKING_TONES[transport.status] ?? 'neutral'}>
                    {BOOKING_STATUS_LABELS[transport.status]}
                  </Badge>
                </div>
                <LinkedDocuments
                  targetId={transport.id}
                  targetType="transport"
                  links={links}
                  documents={documents}
                />
              </li>
            )
          })}
        </ul>
      </ModuleSection>

      <EditSheet
        open={open}
        title={editing ? 'Modifier le trajet' : 'Nouveau trajet'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Mode" htmlFor={ids.mode}>
          <select
            id={ids.mode}
            className="field__input field__input--select"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          >
            {TRANSPORT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {TRANSPORT_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </SheetField>

        <div className="field-row">
          <SheetField label="Depart de" htmlFor={ids.from}>
            <input
              id={ids.from}
              className="field__input"
              type="text"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              placeholder="Paris"
              autoComplete="off"
            />
          </SheetField>
          <SheetField label="Arrivee a" htmlFor={ids.to}>
            <input
              id={ids.to}
              className="field__input"
              type="text"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              placeholder="Lisbonne"
              autoComplete="off"
            />
          </SheetField>
        </div>

        <div className="field-row">
          <SheetField label="Date de depart" htmlFor={ids.depDay}>
            <input
              id={ids.depDay}
              className="field__input"
              type="date"
              value={form.departureDay}
              onChange={(e) => setForm({ ...form, departureDay: e.target.value })}
            />
          </SheetField>
          <SheetField label="Heure" htmlFor={ids.depTime}>
            <input
              id={ids.depTime}
              className="field__input"
              type="time"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
            />
          </SheetField>
        </div>

        <div className="field-row">
          <SheetField label="Date d’arrivee" htmlFor={ids.arrDay} hint="facultative">
            <input
              id={ids.arrDay}
              className="field__input"
              type="date"
              value={form.arrivalDay}
              min={form.departureDay || undefined}
              onChange={(e) => setForm({ ...form, arrivalDay: e.target.value })}
            />
          </SheetField>
          <SheetField label="Heure" htmlFor={ids.arrTime} hint="facultative">
            <input
              id={ids.arrTime}
              className="field__input"
              type="time"
              value={form.arrivalTime}
              onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
            />
          </SheetField>
        </div>

        {issues.map((issue) => (
          <Alert key={issue.message} tone={issue.level === 'erreur' ? 'error' : 'info'}>
            {issue.message}
          </Alert>
        ))}

        <div className="field-row">
          <SheetField label="Compagnie" htmlFor={ids.company} hint="facultative">
            <input
              id={ids.company}
              className="field__input"
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              autoComplete="off"
            />
          </SheetField>
          <SheetField label="Reference" htmlFor={ids.reference} hint="facultative">
            <input
              id={ids.reference}
              className="field__input"
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              autoComplete="off"
            />
          </SheetField>
        </div>

        <div className="field-row">
          <SheetField label="Prix prevu" htmlFor={ids.planned} hint="facultatif">
            <input
              id={ids.planned}
              className="field__input"
              type="text"
              inputMode="decimal"
              value={form.plannedPrice}
              onChange={(e) => setForm({ ...form, plannedPrice: e.target.value })}
            />
          </SheetField>
          <SheetField label="Prix paye" htmlFor={ids.actual} hint="facultatif">
            <input
              id={ids.actual}
              className="field__input"
              type="text"
              inputMode="decimal"
              value={form.actualPrice}
              onChange={(e) => setForm({ ...form, actualPrice: e.target.value })}
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
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_LABELS[status]}
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
