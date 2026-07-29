import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE } from '@/config/documents'
import {
  fileExtension,
  formatFileSize,
  guessCategory,
  isPreviewable,
  isPreviewableImage,
  resolveMimeType,
  titleFromFileName,
  validateFile,
  type FileDescriptor,
} from '../fileRules'

const file = (overrides: Partial<FileDescriptor> = {}): FileDescriptor => ({
  name: 'billet.pdf',
  type: 'application/pdf',
  size: 1024,
  ...overrides,
})

describe('extension et type MIME', () => {
  it('extrait l’extension en minuscules', () => {
    expect(fileExtension('Billet.PDF')).toBe('pdf')
    expect(fileExtension('photo.jpeg')).toBe('jpeg')
  })

  it('renvoie une chaine vide sans extension', () => {
    expect(fileExtension('billet')).toBe('')
    expect(fileExtension('.cache')).toBe('')
  })

  it('utilise le type declare quand il est exploitable', () => {
    expect(resolveMimeType(file({ type: 'image/png', name: 'x.pdf' }))).toBe('image/png')
  })

  it('ignore les parametres du type MIME', () => {
    expect(resolveMimeType(file({ type: 'text/plain; charset=utf-8' }))).toBe('text/plain')
  })

  it('retombe sur l’extension quand Safari iOS ne declare rien', () => {
    // Cas reel : un PDF choisi dans l'app Fichiers arrive parfois sans type.
    expect(resolveMimeType(file({ type: '' }))).toBe('application/pdf')
    expect(resolveMimeType(file({ type: 'application/octet-stream', name: 'photo.jpg' }))).toBe(
      'image/jpeg',
    )
  })
})

describe('validation des fichiers', () => {
  it('accepte les formats prevus', () => {
    for (const [name, type] of [
      ['billet.pdf', 'application/pdf'],
      ['photo.jpg', 'image/jpeg'],
      ['capture.png', 'image/png'],
      ['image.webp', 'image/webp'],
      ['notes.txt', 'text/plain'],
    ] as const) {
      expect(validateFile(file({ name, type })).ok).toBe(true)
    }
  })

  it('accepte un PDF sans type declare, grace a son extension', () => {
    expect(validateFile(file({ type: '' })).ok).toBe(true)
  })

  it('refuse un format non prevu avec un message clair', () => {
    const result = validateFile(file({ name: 'video.mp4', type: 'video/mp4' }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('type-non-supporte')
      expect(result.message).toContain('PDF')
    }
  })

  it('refuse un fichier vide', () => {
    const result = validateFile(file({ size: 0 }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('vide')
  })

  it('refuse un fichier trop volumineux et annonce la limite', () => {
    const result = validateFile(file({ size: MAX_FILE_SIZE + 1 }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('trop-volumineux')
      expect(result.message).toContain('15 Mo')
    }
  })

  it('accepte un fichier exactement a la limite', () => {
    expect(validateFile(file({ size: MAX_FILE_SIZE })).ok).toBe(true)
  })

  it('respecte une limite personnalisee', () => {
    expect(validateFile(file({ size: 2048 }), 1024).ok).toBe(false)
    expect(validateFile(file({ size: 512 }), 1024).ok).toBe(true)
  })
})

describe('taille lisible', () => {
  it('formate octets, kilo-octets et mega-octets', () => {
    expect(formatFileSize(512)).toBe('512 o')
    expect(formatFileSize(2048)).toBe('2 Ko')
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2,5 Mo')
  })

  it('tolere une valeur absurde', () => {
    expect(formatFileSize(Number.NaN)).toBe('—')
    expect(formatFileSize(-5)).toBe('—')
  })
})

describe('previsualisation', () => {
  it('reconnait les images', () => {
    expect(isPreviewableImage('image/png')).toBe(true)
    expect(isPreviewableImage('application/pdf')).toBe(false)
  })

  it('considere PDF et texte comme previsualisables', () => {
    expect(isPreviewable('application/pdf')).toBe(true)
    expect(isPreviewable('text/plain')).toBe(true)
    expect(isPreviewable('application/zip')).toBe(false)
  })
})

describe('suggestions a l’import', () => {
  it('devine la categorie d’apres le nom', () => {
    expect(guessCategory('billet-train.pdf')).toBe('billet')
    expect(guessCategory('vol-lisbonne.pdf')).toBe('transport')
    expect(guessCategory('booking-123.pdf')).toBe('reservation')
    expect(guessCategory('assurance-voyage.pdf')).toBe('assurance')
    expect(guessCategory('programme-festival.pdf')).toBe('programme')
    expect(guessCategory('quelquechose.pdf')).toBe('autre')
  })

  it('prefere la categorie la plus specifique en cas d’ambiguite', () => {
    // « reservation-hotel » contient les deux indices : « hebergement » est
    // plus utile a l'utilisateur que le generique « reservation ».
    expect(guessCategory('reservation-hotel.pdf')).toBe('hebergement')
  })

  it('n’est qu’une suggestion : la categorie reste modifiable au formulaire', () => {
    expect(guessCategory('')).toBe('autre')
  })

  it('propose un titre lisible depuis le nom du fichier', () => {
    expect(titleFromFileName('billet_train_nice.pdf')).toBe('billet train nice')
    expect(titleFromFileName('Hotel-Nice.PDF')).toBe('Hotel Nice')
    expect(titleFromFileName('sansextension')).toBe('sansextension')
  })
})
