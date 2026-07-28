import { Icon } from '@/components/icons/Icon'
import type { IconName } from '@/components/icons/paths'

export type ChipTone = 'neutral' | 'sage' | 'sky' | 'blush' | 'apricot' | 'lavender' | 'mint'

export interface IconChipProps {
  icon: IconName
  tone?: ChipTone
  small?: boolean
  className?: string
}

/** Pastille arrondie contenant une icone — utilisee dans les cartes et listes. */
export function IconChip({ icon, tone = 'neutral', small = false, className }: IconChipProps) {
  const classes = [
    'icon-chip',
    small ? 'icon-chip--sm' : '',
    tone === 'neutral' ? '' : `icon-chip--${tone}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes}>
      <Icon name={icon} size={small ? 18 : 21} />
    </span>
  )
}
