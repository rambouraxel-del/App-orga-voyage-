import type { EntityId } from '@/models'

/**
 * Identifiant unique.
 * `crypto.randomUUID` n'est disponible qu'en contexte securise (https / localhost) :
 * on prevoit un repli pour les tests sur reseau local en http.
 */
export function createId(): EntityId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
