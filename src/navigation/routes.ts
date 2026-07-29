import type { IconName } from '@/components/icons/paths'

/** Chemins de l'application, centralises pour eviter les chaines en dur. */
export const ROUTES = {
  home: '/',
  agenda: '/agenda',
  events: '/evenements',
  eventNew: '/evenements/nouveau',
  eventDetail: '/evenements/:id',
  eventEdit: '/evenements/:id/modifier',
  trips: '/voyages',
  documents: '/documents',
  settings: '/parametres',
  /** Route historique V0.1/V0.2 — redirige vers la section Sauvegarde. */
  legacyBackup: '/sauvegarde',
} as const

/** Ancre de la section Sauvegarde dans les Parametres. */
export const BACKUP_SECTION_ID = 'sauvegarde'

export const eventDetailPath = (id: string) => `/evenements/${encodeURIComponent(id)}`
export const eventEditPath = (id: string) => `/evenements/${encodeURIComponent(id)}/modifier`

/**
 * Creation d'un evenement.
 * `duplicateOf` pre-remplit le formulaire a partir d'un evenement existant,
 * sans jamais toucher a l'original.
 */
export const eventNewPath = (options?: { duplicateOf?: string; day?: string }) => {
  const params = new URLSearchParams()
  if (options?.duplicateOf) params.set('copie', options.duplicateOf)
  if (options?.day) params.set('jour', options.day)
  const query = params.toString()
  return query ? `${ROUTES.eventNew}?${query}` : ROUTES.eventNew
}

/** Liste des evenements, avec filtres pre-actives depuis les raccourcis. */
export const eventsPath = (options?: { category?: string; scope?: string }) => {
  const params = new URLSearchParams()
  if (options?.category) params.set('categorie', options.category)
  if (options?.scope) params.set('quand', options.scope)
  const query = params.toString()
  return query ? `${ROUTES.events}?${query}` : ROUTES.events
}

export interface TabDefinition {
  to: string
  label: string
  icon: IconName
  ariaLabel: string
}

/** Les cinq onglets de la barre inferieure, dans l'ordre d'affichage. */
export const TABS: TabDefinition[] = [
  { to: ROUTES.home, label: 'Accueil', icon: 'maison', ariaLabel: 'Accueil' },
  { to: ROUTES.agenda, label: 'Agenda', icon: 'calendrier', ariaLabel: 'Agenda' },
  { to: ROUTES.events, label: 'Evenements', icon: 'etoiles', ariaLabel: 'Evenements' },
  { to: ROUTES.trips, label: 'Voyages', icon: 'avion', ariaLabel: 'Voyages' },
  { to: ROUTES.documents, label: 'Documents', icon: 'dossier', ariaLabel: 'Documents' },
]
