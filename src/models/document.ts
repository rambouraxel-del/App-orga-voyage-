import type { EntityId, IsoDateTime, Timestamped } from './common'

/**
 * Fiche "Documents & billets".
 *
 * V0.1 : METADONNEES uniquement. Le stockage des fichiers (PDF, images, billets)
 * est explicitement hors perimetre ; le champ `fileRef` est reserve pour une
 * version ulterieure (reference vers un Blob en IndexedDB).
 */
export const DOCUMENT_KINDS = ['billet', 'reservation', 'identite', 'assurance', 'autre'] as const

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export interface TravelDocument extends Timestamped {
  id: EntityId
  title: string
  kind: DocumentKind
  /** Date pertinente du document (depart du train, nuit d'hotel...). */
  date?: IsoDateTime
  eventId?: EntityId
  tripId?: EntityId
  /** Reserve V0.2 : reference du fichier joint. Toujours absent en V0.1. */
  fileRef?: string
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  billet: 'Billet',
  reservation: 'Reservation',
  identite: 'Identite',
  assurance: 'Assurance',
  autre: 'Autre',
}
