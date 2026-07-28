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
