import { describe, expect, it } from 'vitest'
import {
  bytesToText,
  createZip,
  crc32,
  looksLikeZip,
  readZip,
  textToBytes,
  ZipError,
} from '../zip'

describe('CRC-32', () => {
  it('correspond aux valeurs de reference', () => {
    // Vecteurs de test standard du CRC-32 (IEEE 802.3).
    expect(crc32(textToBytes(''))).toBe(0)
    expect(crc32(textToBytes('123456789'))).toBe(0xcbf43926)
    expect(crc32(textToBytes('a'))).toBe(0xe8b7be43)
  })
})

describe('aller-retour ZIP', () => {
  it('restitue une entree texte a l’identique', () => {
    const archive = createZip([{ path: 'sauvegarde.json', data: textToBytes('{"a":1}') }])
    const entries = readZip(archive)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.path).toBe('sauvegarde.json')
    expect(bytesToText(entries[0]!.data)).toBe('{"a":1}')
  })

  it('restitue plusieurs entrees, dans l’ordre', () => {
    const archive = createZip([
      { path: 'sauvegarde.json', data: textToBytes('json') },
      { path: 'documents/a.pdf', data: new Uint8Array([1, 2, 3]) },
      { path: 'documents/b.png', data: new Uint8Array([9, 8, 7, 6]) },
    ])
    const entries = readZip(archive)
    expect(entries.map((e) => e.path)).toEqual([
      'sauvegarde.json',
      'documents/a.pdf',
      'documents/b.png',
    ])
    expect([...entries[1]!.data]).toEqual([1, 2, 3])
    expect([...entries[2]!.data]).toEqual([9, 8, 7, 6])
  })

  it('restitue des donnees binaires arbitraires sans les alterer', () => {
    // Toutes les valeurs d'octet possibles : detecte tout probleme d'encodage.
    const data = new Uint8Array(256)
    for (let i = 0; i < 256; i++) data[i] = i
    const entries = readZip(createZip([{ path: 'documents/x.bin', data }]))
    expect([...entries[0]!.data]).toEqual([...data])
  })

  it('gere une entree vide', () => {
    const entries = readZip(createZip([{ path: 'vide.txt', data: new Uint8Array(0) }]))
    expect(entries[0]?.data.length).toBe(0)
  })

  it('gere une archive sans aucune entree', () => {
    expect(readZip(createZip([]))).toEqual([])
  })

  it('conserve les noms de fichier non ASCII', () => {
    const entries = readZip(createZip([{ path: 'documents/réservation été.pdf', data: textToBytes('x') }]))
    expect(entries[0]?.path).toBe('documents/réservation été.pdf')
  })

  it('supporte un contenu plus gros que quelques octets', () => {
    const data = new Uint8Array(200_000).fill(0x41)
    const entries = readZip(createZip([{ path: 'gros.bin', data }]))
    expect(entries[0]?.data.length).toBe(200_000)
    expect(entries[0]?.data[199_999]).toBe(0x41)
  })
})

describe('detection et robustesse', () => {
  it('reconnait la signature d’une archive', () => {
    expect(looksLikeZip(createZip([{ path: 'a', data: textToBytes('b') }]))).toBe(true)
  })

  it('ne confond pas du JSON avec une archive', () => {
    expect(looksLikeZip(textToBytes('{"signature":"mes-aventures-backup"}'))).toBe(false)
  })

  it('refuse un contenu trop court', () => {
    expect(() => readZip(new Uint8Array([1, 2, 3]))).toThrow(ZipError)
  })

  it('refuse un contenu sans repertoire central', () => {
    expect(() => readZip(new Uint8Array(64))).toThrow(ZipError)
  })

  it('refuse une archive tronquee', () => {
    const archive = createZip([{ path: 'a.txt', data: textToBytes('contenu') }])
    // On coupe le milieu : le repertoire central pointe alors dans le vide.
    expect(() => readZip(archive.slice(0, archive.length - 30))).toThrow(ZipError)
  })
})
