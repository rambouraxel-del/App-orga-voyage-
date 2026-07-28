import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'leather' | 'sage' | 'sky' | 'blush' | 'apricot' | 'lavender'

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  const classes = ['badge', tone === 'neutral' ? '' : `badge--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ')
  return <span className={classes}>{children}</span>
}
