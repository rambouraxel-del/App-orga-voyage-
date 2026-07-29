/**
 * Erreurs applicatives portant un message DEJA lisible par l'utilisateur.
 *
 * Regle : le `message` est affichable tel quel dans l'interface ; le detail
 * technique reste dans `cause` et part en console pour le debogage.
 */
export class AppError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

export const ERROR_MESSAGES = {
  DB_OPEN:
    "Impossible d'ouvrir la base de donnees locale. Verifie que la navigation privee est desactivee, puis relance l'application.",
  DB_READ: 'Impossible de lire les donnees enregistrees sur cet appareil.',
  EXPORT_FAILED: "La sauvegarde n'a pas pu etre creee. Reessaie dans un instant.",
  IMPORT_READ: "Ce fichier n'a pas pu etre lu. Verifie qu'il est bien accessible sur l'appareil.",
  IMPORT_PARSE: "Ce fichier n'est pas un JSON valide. Choisis un fichier de sauvegarde genere par l'application.",
  IMPORT_INVALID:
    "Ce fichier ne correspond pas au format de sauvegarde de Mes Aventures. Aucune donnee n'a ete modifiee.",
  IMPORT_VERSION:
    'Cette sauvegarde a ete creee avec une version plus recente de l’application. Mets a jour Mes Aventures avant de la restaurer.',
  EVENT_NOT_FOUND:
    "Cet evenement est introuvable. Il a peut-etre ete supprime depuis un autre onglet.",
  EVENT_CREATE: "L'evenement n'a pas pu etre enregistre. Reessaie dans un instant.",
  EVENT_UPDATE: "Les modifications n'ont pas pu etre enregistrees. Reessaie dans un instant.",
  EVENT_DELETE: "L'evenement n'a pas pu etre supprime. Reessaie dans un instant.",
  MODULE_NOT_FOUND: (label: string) =>
    `Cet element (${label}) est introuvable. Il a peut-etre ete supprime depuis un autre onglet.`,
  MODULE_CREATE: (label: string) => `Cet element (${label}) n'a pas pu etre ajoute. Reessaie.`,
  MODULE_UPDATE: (label: string) => `Cet element (${label}) n'a pas pu etre modifie. Reessaie.`,
  MODULE_DELETE: (label: string) => `Cet element (${label}) n'a pas pu etre supprime. Reessaie.`,
  DOCUMENT_NOT_FOUND:
    'Ce document est introuvable. Il a peut-etre ete supprime depuis un autre onglet.',
  DOCUMENT_SAVE:
    "Le document n'a pas pu etre enregistre. Si le probleme persiste, l'espace de stockage est peut-etre sature.",
  DOCUMENT_DELETE: "Le document n'a pas pu etre supprime. Reessaie dans un instant.",
  DOCUMENT_FILE_MISSING:
    'Le fichier de ce document est introuvable sur cet appareil. La fiche est conservee, mais le fichier doit etre reimporte.',
  DOCUMENT_STORAGE_FULL:
    "L'espace de stockage est sature. Supprime des documents ou libere de la place, puis reessaie.",
  ZIP_INVALID:
    "Cette archive n'a pas pu etre lue. Verifie qu'il s'agit bien d'une sauvegarde ZIP generee par l'application.",
  MIGRATION_FAILED:
    "La mise a jour de la base locale a echoue. Tes donnees sont conservees : exporte une sauvegarde depuis l'onglet Sauvegarde, puis relance l'application.",
  IMPORT_WRITE:
    "La restauration a echoue. Tes donnees precedentes ont ete conservees autant que possible.",
} as const

/**
 * Transforme une erreur inconnue en message lisible.
 * Trace systematiquement le detail technique en console (pas d'erreur silencieuse).
 */
export function toUserMessage(error: unknown, fallback: string): string {
  console.error('[Mes Aventures]', error)
  if (error instanceof AppError) return error.message
  return fallback
}
