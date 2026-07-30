import { useId, useState } from 'react'
import { ModuleSection } from '@/components/events/ModuleSection'
import { Alert, Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { staysRepository } from '@/db/repositories'
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  STAY_KINDS,
  STAY_KIND_LABELS,
  type DocumentLink,
  type StayDraft,
  type TravelDocument,
  type Trip,
  type TripStay,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatShortDate, toDayInput } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { checkPeriod, effectiveCost, nightCount } from '@/utils/tripRules'
import { START_OF_DAY_SUFFIX } from '@/utils/tripValidation'
import { LinkedDocuments } from './LinkedDocuments'
import { BOOKING_TONES } from './TransportsSection'

interface FormState {
  name: string
  kind: string
  address: string
  checkIn: string
  checkOut: string
  checkInTime: string
  checkOutTime: string
  contact: string
  reference: string
  plannedPrice: string
  actualPrice: string
  status: string
  note: string
}

const emptyForm = (checkIn: string, checkOut: string): FormState => ({
  name: '',
  kind: 'hotel',
  address: '',
  checkIn,
  checkOut,
  checkInTime: '',
  checkOutTime: '',
  contact: '',
  reference: '',
  plannedPrice: '',
  actualPrice: '',
  status: 'a-reserver',
  note: '',
})

const toAmount = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  const amount = Number(trimmed.replace(',', '.'))
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

export interface StaysSectionProps {
  trip: Trip
  stays: TripStay[]
  /** Nuits `AAAA-MM-JJ` sans hebergement, calculees par la page. */
  uncoveredNights: string[]
  links: DocumentLink[]
  documents: TravelDocument[]
  currency: string
}

/**
 * Hebergements.
 *
 * Le point cle est la couverture des nuits : une nuit sans toit est l'oubli le
 * plus couteux d'un voyage, elle est donc signalee explicitement plutot que
 * laissee a la vigilance de l'utilisateur.
 */
export function StaysSection({
  trip,
  stays,
  uncoveredNights,
  links,
  documents,
  currency,
}: StaysSectionProps) {
  const [editing, setEditing] = useState<TripStay | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(toDayInput(trip.startDate), toDayInput(trip.endDate)),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = {
    name: useId(),
    kind: useId(),
    address: useId(),
    checkIn: useId(),
    checkOut: useId(),
    checkInTime: useId(),
    checkOutTime: useId(),
    contact: useId(),
    reference: useId(),
    planned: useId(),
    actual: useId(),
    status: useId(),
    note: useId(),
  }

  const open = creating || editing !== null
  const active = stays.filter((s) => s.status !== 'annule')
  const total = active.reduce((sum, s) => sum + effectiveCost(s.plannedPrice, s.actualPrice), 0)
  const totalNights = nightCount(trip.startDate, trip.endDate)

  const issues = checkPeriod(form.checkIn, form.checkOut || undefined, trip, 'du sejour')

  function startCreate(checkIn?: string) {
    setForm(emptyForm(checkIn ?? toDayInput(trip.startDate), toDayInput(trip.endDate)))
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(stay: TripStay) {
    setForm({
      name: stay.name,
      kind: stay.kind,
      address: stay.address ?? '',
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      checkInTime: stay.checkInTime ?? '',
      checkOutTime: stay.checkOutTime ?? '',
      contact: stay.contact ?? '',
      reference: stay.reference ?? '',
      plannedPrice: typeof stay.plannedPrice === 'number' ? String(stay.plannedPrice) : '',
      actualPrice: typeof stay.actualPrice === 'number' ? String(stay.actualPrice) : '',
      status: stay.status,
      note: stay.note ?? '',
    })
    setCreating(false)
    setError(null)
    setEditing(stay)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.name.trim().length === 0) {
      setError('Donne un nom a cet hebergement.')
      return
    }
    if (!form.checkIn || !form.checkOut) {
      setError('Indique les dates d’arrivee et de depart.')
      return
    }
    if (form.checkOut < form.checkIn) {
      setError('Le depart ne peut pas preceder l’arrivee.')
      return
    }
    setBusy(true)
    try {
      const draft: StayDraft = {
        name: form.name.trim(),
        kind: form.kind as StayDraft['kind'],
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        status: form.status as StayDraft['status'],
        address: form.address.trim() || undefined,
        checkInTime: form.checkInTime || undefined,
        checkOutTime: form.checkOutTime || undefined,
        contact: form.contact.trim() || undefined,
        reference: form.reference.trim() || undefined,
        plannedPrice: toAmount(form.plannedPrice),
        actualPrice: toAmount(form.actualPrice),
        note: form.note.trim() || undefined,
      }
      if (editing) await staysRepository.update(editing.id, draft)
      else await staysRepository.create(trip.id, draft)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_SAVE('hebergement')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await staysRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.TRIP_ITEM_DELETE('hebergement')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="hebergements"
        title="Hebergements"
        icon="valise"
        addLabel="Ajouter un hebergement"
        onAdd={() => startCreate()}
        isEmpty={stays.length === 0}
        emptyText="Aucun hebergement. Ajoute ou tu dors, nuit par nuit."
        summary={
          totalNights > 0 ? (
            <p className="module__summary-text">
              {totalNights - uncoveredNights.length}/{totalNights} nuit
              {totalNights > 1 ? 's' : ''} couverte{totalNights > 1 ? 's' : ''}
              {total > 0 ? ` · ${formatCurrency(total, currency)}` : ''}
              {uncoveredNights.length > 0 ? (
                <span className="module__summary-alert">
                  {' '}
                  · {uncoveredNights.length} sans hebergement
                </span>
              ) : null}
            </p>
          ) : null
        }
      >
        {uncoveredNights.length > 0 ? (
          <Alert tone="info">
            Nuits sans hebergement :{' '}
            {uncoveredNights.map((night) => formatShortDate(`${night}${START_OF_DAY_SUFFIX}`)).join(', ')}.
            <button
              type="button"
              className="link-button"
              onClick={() => startCreate(uncoveredNights[0])}
            >
              Ajouter un hebergement pour la premiere
            </button>
          </Alert>
        ) : null}

        <ul className="row-list">
          {stays.map((stay) => {
            const price = stay.actualPrice ?? stay.plannedPrice
            const nights = nightCount(
              `${stay.checkIn}${START_OF_DAY_SUFFIX}`,
              `${stay.checkOut}${START_OF_DAY_SUFFIX}`,
            )
            return (
              <li key={stay.id} className="trip-row">
                <div className="row row--split">
                  <button type="button" className="row__main" onClick={() => startEdit(stay)}>
                    <span className="row__body">
                      <span className="row__title">{stay.name}</span>
                      <span className="row__meta">
                        {STAY_KIND_LABELS[stay.kind]} ·{' '}
                        {formatShortDate(`${stay.checkIn}${START_OF_DAY_SUFFIX}`)} →{' '}
                        {formatShortDate(`${stay.checkOut}${START_OF_DAY_SUFFIX}`)} · {nights} nuit
                        {nights > 1 ? 's' : ''}
                        {typeof price === 'number' ? ` · ${formatCurrency(price, currency)}` : ''}
                      </span>
                    </span>
                  </button>
                  <Badge tone={BOOKING_TONES[stay.status] ?? 'neutral'}>
                    {BOOKING_STATUS_LABELS[stay.status]}
                  </Badge>
                </div>
                <LinkedDocuments
                  targetId={stay.id}
                  targetType="stay"
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
        title={editing ? 'Modifier l’hebergement' : 'Nouvel hebergement'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Nom" htmlFor={ids.name}>
          <input
            id={ids.name}
            className="field__input"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Hotel do Chiado"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Type" htmlFor={ids.kind}>
          <select
            id={ids.kind}
            className="field__input field__input--select"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            {STAY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {STAY_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
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
          <SheetField label="Date d’arrivee" htmlFor={ids.checkIn}>
            <input
              id={ids.checkIn}
              className="field__input"
              type="date"
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
          </SheetField>
          <SheetField label="Date de depart" htmlFor={ids.checkOut}>
            <input
              id={ids.checkOut}
              className="field__input"
              type="date"
              value={form.checkOut}
              min={form.checkIn || undefined}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
          </SheetField>
        </div>

        {issues.map((issue) => (
          <Alert key={issue.message} tone={issue.level === 'erreur' ? 'error' : 'info'}>
            {issue.message}
          </Alert>
        ))}

        <div className="field-row">
          <SheetField label="Heure d’arrivee" htmlFor={ids.checkInTime} hint="facultative">
            <input
              id={ids.checkInTime}
              className="field__input"
              type="time"
              value={form.checkInTime}
              onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
            />
          </SheetField>
          <SheetField label="Heure de depart" htmlFor={ids.checkOutTime} hint="facultative">
            <input
              id={ids.checkOutTime}
              className="field__input"
              type="time"
              value={form.checkOutTime}
              onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
            />
          </SheetField>
        </div>

        <div className="field-row">
          <SheetField label="Contact" htmlFor={ids.contact} hint="facultatif">
            <input
              id={ids.contact}
              className="field__input"
              type="text"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
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
