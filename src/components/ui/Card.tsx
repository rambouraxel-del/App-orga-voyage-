import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tinted?: boolean
  flat?: boolean
  children: ReactNode
}

/** Conteneur de base : coins arrondis, ombre legere, fond creme. */
export function Card({ tinted = false, flat = false, className, children, ...rest }: CardProps) {
  const classes = ['card', tinted ? 'card--tinted' : '', flat ? 'card--flat' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
