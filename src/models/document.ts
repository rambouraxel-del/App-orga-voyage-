import type { EntityId, IsoDateTime, Timestamped } from './common'

/**
 * Categorie d'un document (V0.4 : renomme depuis `kind` en V0.1-V0.3, et
 * enrichi de `transport`, `hebergement` et `programme`).
 */
export const DOCUMENT_CATEGORIES = [
  'transport',
  'hebergement',
  'reservation',
  'billet',
  'identite',
  'assurance',
  'programme',
  'autre',
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]

/**
 * METADONNEES d'un document.
 *
 * Le fichier lui-meme vit dans une table separee (`documentFiles`) : lister la
 * bibliotheque ne doit jamais charger des dizaines de mega-octets de Blob en
 * memoire. Dexie renvoyant l'enregistrement complet, melanger les deux
 * ferait s'ecrouler la page Documents des le premier PDF un peu lourd.
 */
export interface TravelDocument extends Timestamped {
  id: EntityId
  title: string
  category: DocumentCategory
  /** Evenement associe. L'association est facultative et modifiable. */
  eventId?: EntityId
  /** Date utile ou d'expiration (depart du train, fin de validite...). */
  usefulDate?: IsoDateTime
  note?: string

  /* --- Fichier ---------------------------------------------------------- */
  /** Nom d'origine du fichier, tel que choisi sur l'appareil. */
  fileName: string
  /** Type MIME declare par le navigateur. */
  mimeType: string
  /** Taille en octets. */
  size: number

  /** Document range : masque des vues courantes sans etre supprime. */
  archived: boolean

  /** Rattachement a un voyage, herite de la V0.1. */
  tripId?: EntityId
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  transport: 'Transport',
  hebergement: 'Hebergement',
  reservation: 'Reservation',
  billet: 'Billet',
  identite: 'Identite',
  assurance: 'Assurance',
  programme: 'Programme',
  autre: 'Autre',
}

/**
 * Contenu binaire d'un document, dans sa propre table.
 * `id` reprend l'identifiant du document : relation 1-1, pas d'index a gerer.
 */
export interface DocumentFile {
  id: EntityId
  blob: Blob
}

/** Metadonnees saisies au formulaire. */
export type DocumentDraft = Pick<TravelDocument, 'title' | 'category' | 'archived'> &
  Partial<Pick<TravelDocument, 'eventId' | 'usefulDate' | 'note'>>

/* ------------------------------------------------------------------ */
/* Compatibilite V0.1 - V0.3                                           */
/* ------------------------------------------------------------------ */

/** Anciennes valeurs de `kind` vers les nouvelles categories. */
export const LEGACY_KIND_TO_CATEGORY: Record<string, DocumentCategory> = {
  billet: 'billet',
  reservation: 'reservation',
  identite: 'identite',
  assurance: 'assurance',
  autre: 'autre',
}
