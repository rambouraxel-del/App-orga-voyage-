import { liveQuery } from 'dexie'
import { useEffect, useMemo, useState } from 'react'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'

export interface LiveDataState<T> {
  data: T | undefined
  loading: boolean
  /** Message deja lisible par l'utilisateur, ou `null`. */
  error: string | null
}

/**
 * Abonne un composant a une requete Dexie.
 *
 * Interet par rapport a un simple `await` dans un `useEffect` :
 * toute ecriture en base (import d'une sauvegarde, futures creations)
 * declenche automatiquement un nouveau rendu — les ecrans restent a jour
 * sans rechargement manuel.
 *
 * @param query  Fonction de lecture. Doit etre stable ou dependre de `deps`.
 * @param deps   Dependances qui invalident la requete.
 */
export function useLiveData<T>(query: () => Promise<T>, deps: unknown[] = []): LiveDataState<T> {
  const [state, setState] = useState<LiveDataState<T>>({
    data: undefined,
    loading: true,
    error: null,
  })

  // La requete est memoisee sur `deps` : eslint ne peut pas verifier ce
  // tableau dynamique, c'est assume et documente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const observable = useMemo(() => liveQuery(query), deps)

  useEffect(() => {
    let active = true
    setState((previous) => ({ ...previous, loading: true }))

    const subscription = observable.subscribe({
      next: (value) => {
        if (active) setState({ data: value, loading: false, error: null })
      },
      error: (cause: unknown) => {
        if (!active) return
        setState({
          data: undefined,
          loading: false,
          error: toUserMessage(cause, ERROR_MESSAGES.DB_READ),
        })
      },
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [observable])

  return state
}
