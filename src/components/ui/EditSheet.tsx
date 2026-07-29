import { useEffect, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Alert } from './Alert'
import { Button } from './Button'

export interface EditSheetProps {
  open: boolean
  title: string
  /** Message d'erreur global (echec d'enregistrement). */
  error?: string | null
  busy?: boolean
  submitLabel?: string
  /** Action destructive optionnelle, affichee sous les boutons principaux. */
  onDelete?: () => void
  onSubmit: () => void
  onCancel: () => void
  children: ReactNode
}

/**
 * Feuille de saisie ancree en bas d'ecran, partagee par les quatre modules.
 *
 * Formulaire court et tactile : l'ajout d'une tache ou d'une depense ne doit
 * jamais faire quitter la fiche de l'evenement.
 */
export function EditSheet({
  open,
  title,
  error = null,
  busy = false,
  submitLabel = 'Enregistrer',
  onDelete,
  onSubmit,
  onCancel,
  children,
}: EditSheetProps) {
  // Bloque le defilement de l'arriere-plan tant que la feuille est ouverte.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return createPortal(
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <form className="sheet sheet--form" onSubmit={handleSubmit} noValidate>
        <h2 className="sheet__title">{title}</h2>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="sheet__fields">{children}</div>

        <div className="sheet__actions">
          <Button type="submit" variant="primary" block loading={busy}>
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" block disabled={busy} onClick={onCancel}>
            Annuler
          </Button>
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              block
              icon="corbeille"
              className="btn--danger"
              disabled={busy}
              onClick={onDelete}
            >
              Supprimer
            </Button>
          ) : null}
        </div>
      </form>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ */
/* Champs compacts, utilises uniquement dans les feuilles              */
/* ------------------------------------------------------------------ */

export interface SheetFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}

export function SheetField({ label, htmlFor, error, hint, children }: SheetFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {hint ? <span className="field-group__hint"> {hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
