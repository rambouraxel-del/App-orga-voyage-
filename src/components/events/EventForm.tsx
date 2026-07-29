import { useId, useState, type FormEvent } from 'react'
import { Illustration } from '@/components/icons/Illustration'
import { Alert, Button } from '@/components/ui'
import { ILLUSTRATION_CHOICES } from '@/config/visuals'
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  type EventDraft,
} from '@/models'
import {
  hasErrors,
  toEventDraft,
  validateEventForm,
  type EventFormErrors,
  type EventFormValues,
} from '@/utils/eventValidation'

export interface EventFormProps {
  initialValues: EventFormValues
  submitLabel: string
  /** Message d'erreur global (echec d'enregistrement en base). */
  submitError?: string | null
  busy?: boolean
  onSubmit: (draft: EventDraft) => void
  onCancel: () => void
}

/**
 * Formulaire d'evenement, partage par la creation, la modification et la
 * duplication. Il ne connait pas la base : il produit un `EventDraft` et
 * laisse la page appelante decider quoi en faire.
 */
export function EventForm({
  initialValues,
  submitLabel,
  submitError = null,
  busy = false,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>(initialValues)
  const [errors, setErrors] = useState<EventFormErrors>({})
  /** Tant que le formulaire n'a pas ete soumis, on n'affiche aucune erreur. */
  const [submitted, setSubmitted] = useState(false)

  const ids = {
    title: useId(),
    category: useId(),
    startDay: useId(),
    startTime: useId(),
    endDay: useId(),
    endTime: useId(),
    allDay: useId(),
    location: useId(),
    description: useId(),
    status: useId(),
  }

  function update<K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) {
    const next = { ...values, [field]: value }
    setValues(next)
    // Apres une premiere soumission, la validation devient continue : l'erreur
    // disparait des que le champ est corrige.
    if (submitted) setErrors(validateEventForm(next))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const found = validateEventForm(values)
    setErrors(found)
    // En cas d'erreur, `values` est conserve tel quel : rien n'est perdu.
    if (hasErrors(found)) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    onSubmit(toEventDraft(values))
  }

  const fieldError = (field: keyof EventFormErrors) => (submitted ? errors[field] : undefined)

  return (
    <form className="event-form" onSubmit={handleSubmit} noValidate>
      {submitError ? <Alert tone="error">{submitError}</Alert> : null}

      {/* --- Titre ------------------------------------------------------ */}
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
          placeholder="Soiree chez Camille"
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

      {/* --- Categorie --------------------------------------------------- */}
      <div className="field">
        <label className="field__label" htmlFor={ids.category}>
          Categorie
        </label>
        <select
          id={ids.category}
          className="field__input field__input--select"
          value={values.category}
          onChange={(e) => update('category', e.target.value)}
        >
          {EVENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {EVENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      {/* --- Toute la journee -------------------------------------------- */}
      <div className="field field--switch">
        <label className="switch" htmlFor={ids.allDay}>
          <input
            id={ids.allDay}
            type="checkbox"
            checked={values.allDay}
            onChange={(e) => update('allDay', e.target.checked)}
          />
          <span className="switch__track" aria-hidden="true">
            <span className="switch__thumb" />
          </span>
          <span className="switch__label">Toute la journee</span>
        </label>
      </div>

      {/* --- Debut -------------------------------------------------------- */}
      <fieldset className="field-group">
        <legend className="field-group__legend">Debut</legend>
        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor={ids.startDay}>
              Date <span aria-hidden="true">*</span>
            </label>
            <input
              id={ids.startDay}
              className={['field__input', fieldError('startDate') ? 'field__input--invalid' : '']
                .filter(Boolean)
                .join(' ')}
              type="date"
              value={values.startDay}
              onChange={(e) => update('startDay', e.target.value)}
              aria-invalid={fieldError('startDate') ? 'true' : undefined}
              aria-describedby={fieldError('startDate') ? `${ids.startDay}-error` : undefined}
            />
          </div>
          {!values.allDay ? (
            <div className="field field--time">
              <label className="field__label" htmlFor={ids.startTime}>
                Heure
              </label>
              <input
                id={ids.startTime}
                className="field__input"
                type="time"
                value={values.startTime}
                onChange={(e) => update('startTime', e.target.value)}
              />
            </div>
          ) : null}
        </div>
        {fieldError('startDate') ? (
          <p className="field__error" id={`${ids.startDay}-error`} role="alert">
            {fieldError('startDate')}
          </p>
        ) : null}
      </fieldset>

      {/* --- Fin ---------------------------------------------------------- */}
      <fieldset className="field-group">
        <legend className="field-group__legend">
          Fin <span className="field-group__hint">facultative</span>
        </legend>
        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor={ids.endDay}>
              Date
            </label>
            <input
              id={ids.endDay}
              className={['field__input', fieldError('endDate') ? 'field__input--invalid' : '']
                .filter(Boolean)
                .join(' ')}
              type="date"
              value={values.endDay}
              min={values.startDay || undefined}
              onChange={(e) => update('endDay', e.target.value)}
              aria-invalid={fieldError('endDate') ? 'true' : undefined}
              aria-describedby={fieldError('endDate') ? `${ids.endDay}-error` : undefined}
            />
          </div>
          {!values.allDay ? (
            <div className="field field--time">
              <label className="field__label" htmlFor={ids.endTime}>
                Heure
              </label>
              <input
                id={ids.endTime}
                className="field__input"
                type="time"
                value={values.endTime}
                onChange={(e) => update('endTime', e.target.value)}
              />
            </div>
          ) : null}
        </div>
        {fieldError('endDate') ? (
          <p className="field__error" id={`${ids.endDay}-error`} role="alert">
            {fieldError('endDate')}
          </p>
        ) : null}
      </fieldset>

      {/* --- Lieu ---------------------------------------------------------- */}
      <div className="field">
        <label className="field__label" htmlFor={ids.location}>
          Lieu
        </label>
        <input
          id={ids.location}
          className="field__input"
          type="text"
          value={values.location}
          onChange={(e) => update('location', e.target.value)}
          placeholder="Chez Camille, Montreuil"
          autoComplete="off"
        />
      </div>

      {/* --- Notes ---------------------------------------------------------- */}
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
          placeholder="Apporter le gateau et la playlist."
        />
      </div>

      {/* --- Illustration ----------------------------------------------------- */}
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
            <span className="illustration-option__label">Selon la categorie</span>
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

      {/* --- Statut ------------------------------------------------------------ */}
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
          {EVENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {/* --- Actions ------------------------------------------------------------ */}
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
