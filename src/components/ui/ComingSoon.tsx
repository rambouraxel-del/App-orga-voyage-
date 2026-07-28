import { Badge } from './Badge'
import { IconChip } from './IconChip'
import type { IconName } from '@/components/icons/paths'

export interface ComingSoonProps {
  icon?: IconName
  title: string
  text: string
  /** Fonctionnalites annoncees pour les versions suivantes. */
  tags?: string[]
}

/** Encart « arrive prochainement » — pages provisoires de la V0.1. */
export function ComingSoon({ icon = 'etoiles', title, text, tags = [] }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <IconChip icon={icon} tone="apricot" />
      <p className="coming-soon__title">{title}</p>
      <p className="coming-soon__text">{text}</p>
      {tags.length > 0 ? (
        <div className="coming-soon__tags">
          {tags.map((tag) => (
            <Badge key={tag} tone="leather">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
