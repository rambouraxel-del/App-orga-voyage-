import type { ReactNode } from 'react'
import { IconChip } from './IconChip'
import type { IconName } from '@/components/icons/paths'

export interface StateBlockProps {
  icon?: IconName
  title: string
  text?: string
  /** Style d'erreur (fond rouge doux). */
  error?: boolean
  action?: ReactNode
}

/** Bloc d'etat : donnees absentes, erreur de lecture, rubrique vide. */
export function StateBlock({ icon = 'info', title, text, error = false, action }: StateBlockProps) {
  return (
    <div className={['state-block', error ? 'state-block--error' : ''].filter(Boolean).join(' ')}>
      <IconChip icon={error ? 'attention' : icon} tone={error ? 'blush' : 'apricot'} />
      <p className="state-block__title">{title}</p>
      {text ? <p className="state-block__text">{text}</p> : null}
      {action}
    </div>
  )
}

/** Bloc de chargement (squelette) aux dimensions d'une carte. */
export function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />
}
