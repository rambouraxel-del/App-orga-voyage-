import type { ReactNode } from 'react'
import { Icon } from '@/components/icons/Icon'
import type { IconName } from '@/components/icons/paths'

export interface ModuleSectionProps {
  id: string
  title: string
  icon: IconName
  /** Resume court affiche sous le titre (progression, totaux...). */
  summary?: ReactNode
  /** Libelle du bouton d'ajout rapide. */
  addLabel: string
  onAdd: () => void
  /** Etat vide, affiche quand `isEmpty` est vrai. */
  emptyText: string
  isEmpty: boolean
  children?: ReactNode
}

/**
 * Enveloppe commune des quatre modules de la fiche evenement.
 *
 * Garantit la meme structure partout : titre, resume, ajout rapide, etat vide
 * explicite. Chaque module reste entierement facultatif — une sortie simple
 * n'affiche que des etats vides et se cree sans jamais les ouvrir.
 */
export function ModuleSection({
  id,
  title,
  icon,
  summary,
  addLabel,
  onAdd,
  emptyText,
  isEmpty,
  children,
}: ModuleSectionProps) {
  return (
    <section className="module" id={id} aria-labelledby={`${id}-titre`}>
      <header className="module__header">
        <div className="module__heading">
          <Icon name={icon} size={18} className="module__icon" />
          <h2 className="module__title" id={`${id}-titre`}>
            {title}
          </h2>
        </div>
        <button type="button" className="module__add" onClick={onAdd} aria-label={addLabel}>
          <Icon name="plus" size={16} />
          <span>Ajouter</span>
        </button>
      </header>

      {summary ? <div className="module__summary">{summary}</div> : null}

      {isEmpty ? (
        <p className="module__empty">{emptyText}</p>
      ) : (
        <div className="module__body">{children}</div>
      )}
    </section>
  )
}
