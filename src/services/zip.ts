/**
 * Lecture et ecriture d'archives ZIP, methode « store » (aucune compression).
 *
 * Pourquoi pas de bibliotheque ni de compression :
 * - le contenu d'une sauvegarde est essentiellement du PDF et du JPEG/PNG,
 *   deja compresses : deflater ne gagnerait quasiment rien tout en coutant du
 *   temps CPU sur un iPhone ;
 * - la methode « store » tient en quelques dizaines de lignes, sans dependance
 *   ni surface de securite supplementaire ;
 * - le format reste une archive ZIP standard, ouvrable par n'importe quel
 *   outil, y compris l'app Fichiers d'iOS.
 */

export interface ZipEntry {
  /** Chemin dans l'archive, separateurs `/`. */
  path: string
  data: Uint8Array
}

/* ------------------------------------------------------------------ */
/* CRC-32                                                              */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* ------------------------------------------------------------------ */
/* Ecriture                                                            */
/* ------------------------------------------------------------------ */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Construit une archive ZIP a partir d'une liste d'entrees. */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.path)
    const crc = crc32(entry.data)
    const size = entry.data.length

    // En-tete local (30 octets + nom)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true) // signature
    localView.setUint16(4, 20, true) // version minimale
    localView.setUint16(6, 0x0800, true) // drapeau : nom en UTF-8
    localView.setUint16(8, 0, true) // methode : store
    localView.setUint16(10, 0, true) // heure
    localView.setUint16(12, 0x21, true) // date (1980-01-01, deterministe)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, size, true) // taille compressee
    localView.setUint32(22, size, true) // taille reelle
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true) // champ « extra »
    local.set(name, 30)

    locals.push(local, entry.data)

    // Entree du repertoire central (46 octets + nom)
    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true) // version d'origine
    centralView.setUint16(6, 20, true) // version minimale
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0x21, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, size, true)
    centralView.setUint32(24, size, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true) // position de l'en-tete local
    central.set(name, 46)

    centrals.push(central)
    offset += local.length + size
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)

  // Fin du repertoire central (22 octets)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  return concat([...locals, ...centrals, end])
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let position = 0
  for (const part of parts) {
    out.set(part, position)
    position += part.length
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}

/**
 * Lit une archive ZIP (methode « store » uniquement).
 *
 * On parcourt le repertoire central plutot que les en-tetes locaux : c'est la
 * source faisant autorite du format, et cela evite de se perdre si une entree
 * utilise un descripteur de donnees.
 */
export function readZip(buffer: ArrayBuffer | Uint8Array): ZipEntry[] {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  if (bytes.length < 22) throw new ZipError('Archive trop courte')

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  // La fin du repertoire central se trouve dans les 64 derniers Ko au plus.
  let endOffset = -1
  const searchLimit = Math.max(0, bytes.length - 0xffff - 22)
  for (let i = bytes.length - 22; i >= searchLimit; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      endOffset = i
      break
    }
  }
  if (endOffset === -1) throw new ZipError('Repertoire central introuvable')

  const count = view.getUint16(endOffset + 10, true)
  let pointer = view.getUint32(endOffset + 16, true)

  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i++) {
    if (pointer + 46 > bytes.length) throw new ZipError('Repertoire central tronque')
    if (view.getUint32(pointer, true) !== 0x02014b50) {
      throw new ZipError('Entree de repertoire invalide')
    }

    const method = view.getUint16(pointer + 10, true)
    const size = view.getUint32(pointer + 24, true)
    const nameLength = view.getUint16(pointer + 28, true)
    const extraLength = view.getUint16(pointer + 30, true)
    const commentLength = view.getUint16(pointer + 32, true)
    const localOffset = view.getUint32(pointer + 42, true)

    const path = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength))

    if (method !== 0) {
      throw new ZipError(`Entree compressee non supportee : ${path}`)
    }

    // Position des donnees : en-tete local (30) + nom + extra LOCAL, qui peut
    // differer de l'extra du repertoire central.
    if (localOffset + 30 > bytes.length) throw new ZipError(`Entree tronquee : ${path}`)
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength

    if (dataStart + size > bytes.length) throw new ZipError(`Donnees tronquees : ${path}`)
    const data = bytes.slice(dataStart, dataStart + size)

    // Les dossiers sont des entrees vides terminees par `/` : on les ignore.
    if (!path.endsWith('/')) entries.push({ path, data })

    pointer += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

/** Vrai si le contenu commence par la signature d'une archive ZIP. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

export const textToBytes = (text: string): Uint8Array => encoder.encode(text)
export const bytesToText = (bytes: Uint8Array): string => decoder.decode(bytes)
