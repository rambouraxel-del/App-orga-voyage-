import type { IconName } from '@/components/icons/paths'
import type { ChipTone } from '@/components/ui/IconChip'
import type { EventCategory } from '@/models'
import { ROUTES, eventsPath } from '@/navigation/routes'

export interface Shortcut {
  id: string
  label: string
  hint: string
  icon: IconName
  tone: ChipTone
  /** Destination : la plupart ouvrent la liste avec un filtre deja actif. */
  to: string
  /** Rubrique prevue mais non implementee : le raccourci l'annonce clairement. */
  soon?: boolean
}

const byCategory = (category: EventCategory) => eventsPath({ category })

/** Les six raccourcis de l'accueil. */
export const SHORTCUTS: Shortcut[] = [
  {
    id: 'voyages',
    label: 'Voyages',
    hint: 'Destinations & sejours',
    icon: 'avion',
    tone: 'sky',
    to: byCategory('voyage'),
  },
  {
    id: 'sorties',
    label: 'Soirees & sorties',
    hint: 'Les bons plans',
    icon: 'cocktail',
    tone: 'lavender',
    to: byCategory('soiree'),
  },
  {
    id: 'concerts',
    label: 'Concerts',
    hint: 'Scenes & festivals',
    icon: 'musique',
    tone: 'blush',
    to: byCategory('concert'),
  },
  {
    id: 'weekends',
    label: 'Week-ends',
    hint: 'Escapades courtes',
    icon: 'valise',
    tone: 'apricot',
    to: byCategory('weekend'),
  },
  {
    id: 'passes',
    label: 'Deja vecus',
    hint: 'Tes souvenirs',
    icon: 'horloge',
    tone: 'mint',
    to: eventsPath({ scope: 'passes' }),
  },
  {
    id: 'agenda',
    label: 'Agenda',
    hint: 'Vue mensuelle',
    icon: 'calendrier',
    tone: 'sage',
    to: ROUTES.agenda,
  },
]
