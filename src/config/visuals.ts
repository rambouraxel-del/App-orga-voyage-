import type { IconName } from '@/components/icons/paths'
import type { BadgeTone } from '@/components/ui/Badge'
import type { ChipTone } from '@/components/ui/IconChip'
import type { DocumentKind, EventStatus, EventType, TripStatus } from '@/models'

/** Correspondance type d'evenement -> picto + teinte pastel. */
export const EVENT_VISUALS: Record<EventType, { icon: IconName; tone: ChipTone }> = {
  sortie: { icon: 'boussole', tone: 'sage' },
  soiree: { icon: 'cocktail', tone: 'lavender' },
  concert: { icon: 'musique', tone: 'blush' },
  weekend: { icon: 'valise', tone: 'apricot' },
  voyage: { icon: 'avion', tone: 'sky' },
  anniversaire: { icon: 'cadeau', tone: 'blush' },
  restaurant: { icon: 'cocktail', tone: 'apricot' },
  autre: { icon: 'etoiles', tone: 'mint' },
}

export const EVENT_STATUS_TONES: Record<EventStatus, BadgeTone> = {
  idee: 'lavender',
  planifie: 'sky',
  confirme: 'sage',
  passe: 'neutral',
  annule: 'blush',
}

export const TRIP_STATUS_TONES: Record<TripStatus, BadgeTone> = {
  idee: 'lavender',
  planifie: 'sky',
  confirme: 'sage',
  'en-cours': 'apricot',
  termine: 'neutral',
}

export const DOCUMENT_VISUALS: Record<DocumentKind, { icon: IconName; tone: ChipTone }> = {
  billet: { icon: 'ticket', tone: 'apricot' },
  reservation: { icon: 'document', tone: 'sky' },
  identite: { icon: 'document', tone: 'lavender' },
  assurance: { icon: 'cadenas', tone: 'mint' },
  autre: { icon: 'document', tone: 'neutral' },
}
