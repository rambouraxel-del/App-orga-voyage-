import type { IconName } from '@/components/icons/paths'
import type { ChipTone } from '@/components/ui/IconChip'
import { ROUTES } from '@/navigation/routes'

export interface Shortcut {
  id: string
  label: string
  hint: string
  icon: IconName
  tone: ChipTone
  /**
   * Destination.
   * `null` = rubrique prevue mais non implementee en V0.1 : le tap affiche un
   * message « bientot disponible » plutot qu'un ecran vide.
   */
  to: string | null
}

/** Les six raccourcis de l'accueil. */
export const SHORTCUTS: Shortcut[] = [
  {
    id: 'voyages',
    label: 'Voyages',
    hint: 'Destinations & sejours',
    icon: 'avion',
    tone: 'sky',
    to: ROUTES.trips,
  },
  {
    id: 'sorties',
    label: 'Soirees & sorties',
    hint: 'Les bons plans',
    icon: 'cocktail',
    tone: 'lavender',
    to: ROUTES.events,
  },
  {
    id: 'concerts',
    label: 'Concerts',
    hint: 'Scenes & festivals',
    icon: 'musique',
    tone: 'blush',
    to: ROUTES.events,
  },
  {
    id: 'cadeaux',
    label: 'Cadeaux & a ramener',
    hint: 'Ne rien oublier',
    icon: 'cadeau',
    tone: 'apricot',
    to: null,
  },
  {
    id: 'budget',
    label: 'Budget',
    hint: 'Depenses par sortie',
    icon: 'portefeuille',
    tone: 'mint',
    to: null,
  },
  {
    id: 'documents',
    label: 'Documents & billets',
    hint: 'Billets & reservations',
    icon: 'ticket',
    tone: 'sage',
    to: null,
  },
]
