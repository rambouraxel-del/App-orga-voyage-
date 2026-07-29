import { Link } from 'react-router-dom'
import { IconChip } from '@/components/ui'
import { SHORTCUTS } from '@/config/shortcuts'

/**
 * Grille de raccourcis.
 * Chaque carte ouvre la liste des evenements avec le filtre correspondant deja
 * actif — le filtre etant porte par l'URL (cf. `eventsPath`).
 */
export function ShortcutGrid() {
  return (
    <div className="shortcut-grid">
      {SHORTCUTS.map((shortcut) => (
        <Link key={shortcut.id} to={shortcut.to} className="shortcut-card">
          <IconChip icon={shortcut.icon} tone={shortcut.tone} />
          <span>
            <span className="shortcut-card__label">{shortcut.label}</span>
            <span className="shortcut-card__hint">{shortcut.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
