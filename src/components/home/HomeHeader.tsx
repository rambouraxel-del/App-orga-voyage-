import { Icon } from '@/components/icons/Icon'

export interface HomeHeaderProps {
  displayName: string
  /** Callback du bouton de notifications (non fonctionnel en V0.1). */
  onNotificationsClick: () => void
}

/** Initiales affichees dans l'avatar de profil. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

export function HomeHeader({ displayName, onNotificationsClick }: HomeHeaderProps) {
  return (
    <header className="home-header">
      <div className="home-header__text">
        {/* Espace insecable : l'emoji ne se retrouve jamais seul sur une ligne. */}
        <h1 className="home-header__greeting">{`Bonjour ${displayName} 👋`}</h1>
        <p className="home-header__subtitle">Pret pour tes prochaines aventures ?</p>
      </div>

      <div className="home-header__actions">
        <button
          type="button"
          className="bell-btn"
          onClick={onNotificationsClick}
          aria-label="Notifications"
        >
          <Icon name="cloche" size={21} />
          <span className="bell-btn__dot" aria-hidden="true" />
        </button>

        <div className="avatar" role="img" aria-label={`Profil de ${displayName}`}>
          {initials(displayName)}
        </div>
      </div>
    </header>
  )
}
