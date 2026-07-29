import type { ReactNode } from 'react'
import { Icon } from '@/components/icons/Icon'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Affiche un bouton retour a gauche du titre. */
  onBack?: () => void
  /** Action principale affichee a droite (bouton « Ajouter » par exemple). */
  action?: ReactNode
}

/** En-tete commun aux pages secondaires : retour, titre, action. */
export function PageHeader({ title, subtitle, onBack, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Revenir en arriere">
          <Icon name="retour" size={20} />
        </button>
      ) : null}

      <div className="page-header__text">
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>

      {action}
    </header>
  )
}
