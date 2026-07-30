import { useId, useState, type FormEvent } from 'react'
import { Illustration } from '@/components/icons/Illustration'
import { Alert, Button } from '@/components/ui'
import { ILLUSTRATION_CHOICES } from '@/config/visuals'
import { TRIP_STATUSES, TRIP_STATUS_LABELS, type TripDraft } from '@/models'
import { nightCount } from '@/utils/tripRules'
import {
  END_OF_DAY_SUFFIX,
  START_OF_DAY_SUFFIX,
  hasTripErrors,
  toTripDraft,
  validateTripForm,
  type TripFormErrors,
  type TripFormValues,
} from '@/utils/tripValidation'

export interface TripFormProps {
  initialValues: TripFormValues
  submitLabel: string
  submitError?: string | null
  busy?: boolean
  onSubmit: (draft: TripDraft) => void
  onCancel: () => void
}

/**
 * Formulaire de voyage, partage par la creation et la modification.
 *
 * Il ne connait pas la base : il produit un `TripDraft`. C'est le repository
 * qui se charge de creer ou mettre a jour l'evenement porteur.
 */
export function TripForm({
  initialValues,
  submitLabel,
  submitError = null,
  busy = false,
  onSubmit,
  onCancel,
}: TripFormProps) {
  const [values, setValues] = useState<TripFormValues>(initialValues)
  const [errors, setErrors] = useState<TripFormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const ids = {
    title: useId(),
    destination: useId(),
    origin: useId(),
    startDay: useId(),
    endDay: useId(),
    status: useId(),
    budget: useId(),
    description: useId(),
  }

  function update<K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) {
    const next = { ...values, [field]: value }
    setValues(next)
    if (submitted) setErrors(validateTripForm(next))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const found = validateTripForm(values)
    setErrors(found)
    if (hasTripErrors(found)) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    onSubmit(toTripDraft(values))
  }

  const fieldError = (field: keyof TripFormErrors) => (submitted ? errors[field] : undefined)

  // Apercu de la duree, mis a jour en direct : la saisie de dates devient
  // verifiable sans attendre l'enregistrement.
  const nights =
    values.startDay && values.endDay && values.endDay >= values.startDay
      ? nightCount(
          `${values.startDay}${START_OF_DAY_SUFFIX}`,
          `${values.endDay}${END_OF_DAY_SUFFIX}`,
        )
      : null

  return (
    <form className="event-form" onSubmit={handleSubmit} noValidate>
      {submitError ? <Alert tone="error">{submitError}</Alert> : null}

      <div className="field">
        <label className="field__label" htmlFor={ids.title}>
          Titre <span aria-hidden="true">*</span>
          <span className="visually-hidden">(obligatoire)</span>
        </label>
        <input
          id={ids.title}
          className={['field__input', fieldError('title') ? 'field__input--invalid' : '']
            .filter(Boolean)
            .join(' ')}
          type="text"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Escapade a Lisbonne"
          autoComplete="off"
          enterKeyHint="next"
          aria-invalid={fieldError('title') ? 'true' : undefined}
          aria-describedby={fieldError('title') ? `${ids.title}-error` : undefined}
        />
        {fieldError('title') ? (
          <p className="field__error" id={`${ids.title}-error`} role="alert">
            {fieldError('title')}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor={ids.destination}>
          Destination <span aria-hidden="true">*</span>
        </label>
        <input
          id={ids.destination}
          className={['field__input', fieldError('destination') ? 'field__input--invalid' : '']
            .filter(Boolean)
            .join(' ')}
          type="text"
          value={values.destination}
          onChange={(e) => update('destination', e.target.value)}
          placeholder="Lisbonne, Portugal"
          autoComplete="off"
          aria-invalid={fieldError('destination') ? 'true' : undefined}
          aria-describedby={fieldError('destination') ? `${ids.destination}-error` : undefined}
        />
        {fieldError('destination') ? (
          <p className="field__error" id={`${ids.destination}-error`} role="alert">
            {fieldError('destination')}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor={ids.origin}>
          Ville de depart <span className="field-group__hint">facultative</span>
        </label>
        <input
          id={ids.origin}
          className="field__input"
          type="text"
          value={values.origin}
          onChange={(e) => update('origin', e.target.value)}
          placeholder="Paris"
          autoComplete="off"
        />
      </div>

      <fieldset className="field-group">
        <legend className="field-group__legend">Dates</legend>
        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor={ids.startDay}>
              Date de depart <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.startDay}
              className={['field__input', fieldError('startDay') ? 'field__input--invalid' : '']
                .filter(Boolean)
                .join(' ')}
              type="date"
              value={values.startDay}
              onChange={(e) => update('startDay', e.target.value)}
              aria-invalid={fieldError('startDay') ? 'true' : undefined}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={ids.endDay}>
              Date de retour <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.endDay}
              className={['field__input', fieldError('endDay') ? 'field__input--invalid' : '']
                .filter(Boolean)
                .join(' ')}
              type="date"
              value={values.endDay}
              min={values.startDay || undefined}
              onChange={(e) => update('endDay', e.target.value)}
              aria-invalid={fieldError('endDay') ? 'true' : undefined}
            />
          </div>
        </div>
        {fieldError('startDay') ?? fieldError('endDay') ? (
          <p className="field__error" role="alert">
            {fieldError('startDay') ?? fieldError('endDay')}
          </p>
        ) : nights !== null ? (
          <p className="field-group__hint">
            {nights + 1} journee{nights + 1 > 1 ? 's' : ''} · {nights} nuit{nights > 1 ? 's' : ''}
          </p>
        ) : null}
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor={ids.status}>
          Statut
        </label>
        <select
          id={ids.status}
          className="field__input field__input--select"
          value={values.status}
          onChange={(e) => update('status', e.target.value)}
        >
          {TRIP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TRIP_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={ids.budget}>
          Budget previsionnel <span className="field-group__hint">facultatif</span>
        </label>
        <input
          id={ids.budget}
          className={['field__input', fieldError('budget') ? 'field__input--invalid' : '']
            .filter(Boolean)
            .join(' ')}
          type="text"
          inputMode="decimal"
          value={values.budget}
          onChange={(e) => update('budget', e.target.value)}
          placeholder="850"
          aria-invalid={fieldError('budget') ? 'true' : undefined}
        />
        {fieldError('budget') ? (
          <p className="field__error" role="alert">
            {fieldError('budget')}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor={ids.description}>
          Notes
        </label>
        <textarea
          id={ids.description}
          className="field__input field__input--textarea"
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          placeholder="Trois jours entre tramways, belvederes et pasteis."
        />
      </div>

      <fieldset className="field-group">
        <legend className="field-group__legend">
          Illustration <span className="field-group__hint">facultative</span>
        </legend>
        <div className="illustration-picker">
          <button
            type="button"
            className={['illustration-option', values.imageKey === '' ? 'is-selected' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => update('imageKey', '')}
            aria-pressed={values.imageKey === ''}
          >
            <span className="illustration-option__auto">Auto</span>
            <span className="illustration-option__label">Selon la destination</span>
          </button>
          {ILLUSTRATION_CHOICES.map((choice) => (
            <button
              key={choice.key}
              type="button"
              className={['illustration-option', values.imageKey === choice.key ? 'is-selected' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => update('imageKey', choice.key)}
              aria-pressed={values.imageKey === choice.key}
            >
              <Illustration name={choice.key} className="illustration-option__preview" />
              <span className="illustration-option__label">{choice.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="event-form__actions">
        <Button type="submit" variant="primary" block loading={busy}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" block disabled={busy} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
