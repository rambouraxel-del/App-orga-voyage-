import type { IconName } from '@/components/icons/paths'

/** Chemins de l'application, centralises pour eviter les chaines en dur. */
export const ROUTES = {
  home: '/',
  agenda: '/agenda',
  events: '/evenements',
  trips: '/voyages',
  backup: '/sauvegarde',
  eventDetail: '/evenements/:id',
} as const

export const eventDetailPath = (id: string) => `/evenements/${encodeURIComponent(id)}`

export interface TabDefinition {
  /** Chemin cible. */
  to: string
  label: string
  icon: IconName
  /** Libelle long pour les lecteurs d'ecran. */
  ariaLabel: string
}

/** Les cinq onglets de la barre inferieure, dans l'ordre d'affichage. */
export const TABS: TabDefinition[] = [
  { to: ROUTES.home, label: 'Accueil', icon: 'maison', ariaLabel: 'Accueil' },
  { to: ROUTES.agenda, label: 'Agenda', icon: 'calendrier', ariaLabel: 'Agenda' },
  { to: ROUTES.events, label: 'Evenements', icon: 'etoiles', ariaLabel: 'Evenements' },
  { to: ROUTES.trips, label: 'Voyages', icon: 'avion', ariaLabel: 'Voyages' },
  { to: ROUTES.backup, label: 'Sauvegarde', icon: 'sauvegarde', ariaLabel: 'Sauvegarde' },
]
