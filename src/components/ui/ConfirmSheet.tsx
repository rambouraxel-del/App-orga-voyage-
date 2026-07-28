import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

export interface ConfirmSheetProps {
  open: boolean
  title: string
  description: ReactNode
  /** Recapitulatif optionnel affiche sous la description. */
  details?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Feuille de confirmation ancree en bas d'ecran (pattern iOS).
 * Sert de garde-fou avant toute action destructive — ici le remplacement des
 * donnees lors d'un import.
 */
export function ConfirmSheet({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = 'Annuler',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
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

  return createPortal(
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-sheet-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div className="sheet">
        <h2 className="sheet__title" id="confirm-sheet-title">
          {title}
        </h2>
        <div className="sheet__text">{description}</div>
        {details ? <div className="sheet__summary">{details}</div> : null}
        <div className="sheet__actions">
          <Button variant="primary" block loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" block disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
