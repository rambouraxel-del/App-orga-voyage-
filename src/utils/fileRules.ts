import {
  ACCEPTED_MIME_TYPES,
  EXTENSION_TO_MIME,
  MAX_FILE_SIZE,
  type AcceptedMimeType,
} from '@/config/documents'
import type { DocumentCategory } from '@/models'

/** Description minimale d'un fichier — evite de dependre du type `File` du DOM. */
export interface FileDescriptor {
  name: string
  type: string
  size: number
}

export type FileRejectionReason = 'vide' | 'trop-volumineux' | 'type-non-supporte'

export type FileValidation =
  | { ok: true; mimeType: AcceptedMimeType }
  | { ok: false; reason: FileRejectionReason; message: string }

/** Extension en minuscules, sans le point. Chaine vide si absente. */
export function fileExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 && index < name.length - 1 ? name.slice(index + 1).toLowerCase() : ''
}

/**
 * Determine le type MIME reel.
 *
 * Safari iOS renvoie parfois `''` ou `application/octet-stream` pour un fichier
 * choisi dans l'app Fichiers : on retombe alors sur l'extension, sans quoi des
 * PDF parfaitement valides seraient refuses sur le seul appareil vise.
 */
export function resolveMimeType(file: FileDescriptor): string {
  const declared = (file.type || '').toLowerCase().split(';')[0]!.trim()
  if (declared && declared !== 'application/octet-stream') return declared
  return EXTENSION_TO_MIME[fileExtension(file.name)] ?? declared
}

const isAccepted = (mime: string): mime is AcceptedMimeType =>
  (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime)

/** Taille lisible : `2,4 Mo`, `812 Ko`. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  const mo = bytes / (1024 * 1024)
  return `${mo.toFixed(mo < 10 ? 1 : 0).replace('.', ',')} Mo`
}

/**
 * Valide un fichier avant import.
 * Renvoie un message deja lisible par l'utilisateur en cas de refus.
 */
export function validateFile(file: FileDescriptor, maxSize = MAX_FILE_SIZE): FileValidation {
  if (file.size <= 0) {
    return {
      ok: false,
      reason: 'vide',
      message: 'Ce fichier est vide. Choisis-en un autre.',
    }
  }

  if (file.size > maxSize) {
    return {
      ok: false,
      reason: 'trop-volumineux',
      message: `Ce fichier fait ${formatFileSize(file.size)}. La limite est de ${formatFileSize(maxSize)} par document.`,
    }
  }

  const mimeType = resolveMimeType(file)
  if (!isAccepted(mimeType)) {
    return {
      ok: false,
      reason: 'type-non-supporte',
      message:
        'Format non pris en charge. Choisis un PDF, une image (JPEG, PNG, WebP) ou un fichier texte.',
    }
  }

  return { ok: true, mimeType }
}

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

/** Vrai si le navigateur sait afficher ce type dans une balise `<img>`. */
export const isPreviewableImage = (mimeType: string): boolean => mimeType.startsWith('image/')

/** Vrai si une prévisualisation intégrée est envisageable. */
export const isPreviewable = (mimeType: string): boolean =>
  isPreviewableImage(mimeType) || mimeType === 'application/pdf' || mimeType === 'text/plain'

/** Categorie proposee par defaut d'apres le nom du fichier. */
export function guessCategory(fileName: string): DocumentCategory {
  const name = fileName.toLowerCase()
  if (/billet|ticket|boarding|embarq/.test(name)) return 'billet'
  if (/train|vol|flight|avion|bus/.test(name)) return 'transport'
  if (/hotel|airbnb|logement|hebergement/.test(name)) return 'hebergement'
  if (/reserv|booking|confirm/.test(name)) return 'reservation'
  if (/passeport|identite|carte-id|cni/.test(name)) return 'identite'
  if (/assur|insurance/.test(name)) return 'assurance'
  if (/programme|planning|itiner/.test(name)) return 'programme'
  return 'autre'
}

/** Titre propose par defaut : le nom du fichier sans son extension. */
export function titleFromFileName(fileName: string): string {
  const extension = fileExtension(fileName)
  const base = extension ? fileName.slice(0, -(extension.length + 1)) : fileName
  return base.replace(/[_-]+/g, ' ').trim() || fileName
}
