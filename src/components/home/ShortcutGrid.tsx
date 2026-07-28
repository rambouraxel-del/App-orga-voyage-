import { useNavigate } from 'react-router-dom'
import { IconChip } from '@/components/ui'
import { SHORTCUTS, type Shortcut } from '@/config/shortcuts'

export interface ShortcutGridProps {
  /** Appele quand la rubrique n'existe pas encore (raccourci sans destination). */
  onUnavailable: (shortcut: Shortcut) => void
}

export function ShortcutGrid({ onUnavailable }: ShortcutGridProps) {
  const navigate = useNavigate()

  return (
    <div className="shortcut-grid">
      {SHORTCUTS.map((shortcut) => (
        <button
          key={shortcut.id}
          type="button"
          className="shortcut-card"
          onClick={() => (shortcut.to ? navigate(shortcut.to) : onUnavailable(shortcut))}
        >
          <IconChip icon={shortcut.icon} tone={shortcut.tone} />
          <span>
            <span className="shortcut-card__label">{shortcut.label}</span>
            <span className="shortcut-card__hint">{shortcut.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
