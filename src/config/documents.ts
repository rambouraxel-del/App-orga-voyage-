/**
 * Regles d'acceptation des fichiers.
 * Centralisees ici pour rester ajustables sans toucher a l'interface.
 */

/** Taille maximale par fichier, en octets. */
export const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 Mo

/**
 * Types MIME acceptes.
 *
 * Safari iOS renvoie parfois un type vide pour un fichier venant de l'app
 * Fichiers : on retombe alors sur l'extension (cf. `resolveMimeType`).
 */
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

/** Extensions correspondantes, utilisees en repli et pour l'attribut `accept`. */
export const EXTENSION_TO_MIME: Record<string, AcceptedMimeType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  txt: 'text/plain',
}

/** Valeur de l'attribut `accept` d'un `<input type="file">`. */
export const FILE_ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_MIME_TYPES,
  ...Object.keys(EXTENSION_TO_MIME).map((extension) => `.${extension}`),
].join(',')

/**
 * Seuil au-dela duquel on previent l'utilisateur que le stockage devient
 * important, en octets.
 */
export const STORAGE_WARNING_THRESHOLD = 150 * 1024 * 1024 // 150 Mo
