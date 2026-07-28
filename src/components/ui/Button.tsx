import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from '@/components/icons/Icon'
import type { IconName } from '@/components/icons/paths'

type Variant = 'primary' | 'secondary' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Occupe toute la largeur disponible (par defaut sur mobile). */
  block?: boolean
  icon?: IconName
  /** Affiche un indicateur d'activite et desactive le bouton. */
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  block = false,
  icon,
  loading = false,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    block ? 'btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {!loading && icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  )
}
