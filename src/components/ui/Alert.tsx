import type { ReactNode } from 'react'
import { Icon } from '@/components/icons/Icon'
import type { IconName } from '@/components/icons/paths'

export type AlertTone = 'success' | 'error' | 'info'

const TONE_ICON: Record<AlertTone, IconName> = {
  success: 'valide',
  error: 'attention',
  info: 'info',
}

export interface AlertProps {
  tone: AlertTone
  children: ReactNode
  className?: string
}

/** Message de retour utilisateur, annonce aux lecteurs d'ecran. */
export function Alert({ tone, children, className }: AlertProps) {
  return (
    <div
      className={['alert', `alert--${tone}`, className ?? ''].filter(Boolean).join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={TONE_ICON[tone]} size={19} className="alert__icon" />
      <div>{children}</div>
    </div>
  )
}
