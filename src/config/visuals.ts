import type { IconName } from '@/components/icons/paths'
import type { IllustrationName } from '@/components/icons/Illustration'
import type { BadgeTone } from '@/components/ui/Badge'
import type { ChipTone } from '@/components/ui/IconChip'
import type { DocumentCategory, EventCategory, EventStatus, TripStatus } from '@/models'

/** Correspondance categorie d'evenement -> picto + teinte pastel. */
export const EVENT_VISUALS: Record<EventCategory, { icon: IconName; tone: ChipTone }> = {
  sortie: { icon: 'boussole', tone: 'sage' },
  soiree: { icon: 'cocktail', tone: 'lavender' },
  anniversaire: { icon: 'cadeau', tone: 'blush' },
  concert: { icon: 'musique', tone: 'blush' },
  restaurant: { icon: 'cocktail', tone: 'apricot' },
  weekend: { icon: 'valise', tone: 'apricot' },
  voyage: { icon: 'avion', tone: 'sky' },
  autre: { icon: 'etoiles', tone: 'mint' },
}

/** Illustration de bandeau par defaut, selon la categorie. */
export const CATEGORY_ILLUSTRATION: Record<EventCategory, IllustrationName> = {
  sortie: 'ville',
  soiree: 'fete',
  anniversaire: 'fete',
  concert: 'fete',
  restaurant: 'ville',
  weekend: 'mer',
  voyage: 'mer',
  autre: 'montagne',
}

export const EVENT_STATUS_TONES: Record<EventStatus, BadgeTone> = {
  idee: 'lavender',
  planifie: 'sky',
  confirme: 'sage',
  termine: 'neutral',
  annule: 'blush',
}

export const TRIP_STATUS_TONES: Record<TripStatus, BadgeTone> = {
  idee: 'lavender',
  planifie: 'sky',
  confirme: 'sage',
  'en-cours': 'apricot',
  termine: 'neutral',
}

export const DOCUMENT_VISUALS: Record<DocumentCategory, { icon: IconName; tone: ChipTone }> = {
  transport: { icon: 'avion', tone: 'sky' },
  hebergement: { icon: 'valise', tone: 'apricot' },
  reservation: { icon: 'document', tone: 'sky' },
  billet: { icon: 'ticket', tone: 'apricot' },
  identite: { icon: 'document', tone: 'lavender' },
  assurance: { icon: 'cadenas', tone: 'mint' },
  programme: { icon: 'liste', tone: 'sage' },
  autre: { icon: 'dossier', tone: 'neutral' },
}

/**
 * Illustrations proposees dans le formulaire.
 * Volontairement limitees aux scenes embarquees : aucune image externe, donc
 * rien a telecharger et un fonctionnement hors ligne preserve.
 */
export const ILLUSTRATION_CHOICES: Array<{ key: IllustrationName; label: string }> = [
  { key: 'mer', label: 'Mer & soleil' },
  { key: 'ville', label: 'Ville' },
  { key: 'fete', label: 'Fete' },
  { key: 'montagne', label: 'Montagne' },
]

/** Illustration d'un evenement : choix explicite, sinon repli sur la categorie. */
export function illustrationFor(event: {
  imageKey?: string
  category: EventCategory
}): IllustrationName {
  const chosen = ILLUSTRATION_CHOICES.find((choice) => choice.key === event.imageKey)
  return chosen ? chosen.key : CATEGORY_ILLUSTRATION[event.category]
}
