/**
 * Types transverses partages par les differents modeles.
 */

/** Identifiant unique d'une entite (UUID v4 ou fallback aleatoire). */
export type EntityId = string

/**
 * Les dates sont stockees en chaine ISO 8601 (UTC) et non en objet `Date` :
 * - serialisable tel quel en JSON pour l'export ;
 * - stable a travers les versions d'IndexedDB ;
 * - indexable par Dexie (tri lexicographique == tri chronologique).
 */
export type IsoDateTime = string

/** Champs d'audit communs a toutes les entites persistees. */
export interface Timestamped {
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}
