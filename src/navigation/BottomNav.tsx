import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { ROUTES, TABS } from './routes'

/**
 * Barre de navigation fixe.
 * Le retrait sous la barre est gere par `--nav-total` (voir `.app-main`) :
 * le contenu n'est jamais masque, y compris sur les iPhone a encoche.
 */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <ul className="bottom-nav__list">
        {TABS.map((tab) => (
          <li key={tab.to} className="bottom-nav__item">
            <NavLink
              to={tab.to}
              // `end` uniquement sur l'accueil : les autres onglets restent
              // actifs sur leurs sous-pages (ex. detail d'un evenement).
              end={tab.to === ROUTES.home}
              className={({ isActive }) =>
                ['bottom-nav__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
              }
              aria-label={tab.ariaLabel}
            >
              {({ isActive }) => (
                <>
                  <span className="bottom-nav__icon-wrap">
                    <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2 : 1.6} />
                  </span>
                  <span className="bottom-nav__label">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
