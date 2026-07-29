import { useEffect, useState } from 'react'
import { documentsRepository } from '@/db/repositories'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'

export interface DocumentFileState {
  /** URL temporaire du fichier, ou `null` s'il est absent / en cours de lecture. */
  url: string | null
  blob: Blob | null
  loading: boolean
  error: string | null
}

/**
 * Charge le fichier d'un document et expose une URL temporaire.
 *
 * L'URL est SYSTEMATIQUEMENT revoquee au demontage ou au changement de
 * document : sans cela, chaque ouverture de fiche laisserait un Blob entier en
 * memoire jusqu'au rechargement de la page — vite fatal sur un iPhone avec
 * quelques PDF.
 */
export function useDocumentFile(documentId: string | undefined): DocumentFileState {
  const [state, setState] = useState<DocumentFileState>({
    url: null,
    blob: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    if (!documentId) {
      setState({ url: null, blob: null, loading: false, error: null })
      return
    }

    setState({ url: null, blob: null, loading: true, error: null })

    void (async () => {
      try {
        const blob = await documentsRepository.getBlob(documentId)
        if (!active) return

        if (!blob) {
          setState({
            url: null,
            blob: null,
            loading: false,
            error: ERROR_MESSAGES.DOCUMENT_FILE_MISSING,
          })
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setState({ url: objectUrl, blob, loading: false, error: null })
      } catch (cause) {
        if (active) {
          setState({
            url: null,
            blob: null,
            loading: false,
            error: toUserMessage(cause, ERROR_MESSAGES.DB_READ),
          })
        }
      }
    })()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId])

  return state
}

/**
 * Declenche le telechargement d'un blob sous un nom donne.
 * L'URL est revoquee apres un delai : Safari a besoin du blob quelques
 * instants apres le clic.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'document'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
