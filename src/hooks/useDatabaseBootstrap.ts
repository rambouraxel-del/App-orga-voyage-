import { useEffect, useState } from 'react'
import { openDatabase } from '@/db/database'
import { seedIfEmpty } from '@/db/seed'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'

export type BootstrapStatus = 'loading' | 'ready' | 'error'

export interface BootstrapState {
  status: BootstrapStatus
  error: string | null
  /** Vrai si les donnees de demonstration viennent d'etre creees. */
  seeded: boolean
}

/**
 * Ouvre la base locale puis insere les donnees de demonstration si — et
 * seulement si — c'est le tout premier lancement.
 */
export function useDatabaseBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({
    status: 'loading',
    error: null,
    seeded: false,
  })

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        await openDatabase()
        const seeded = await seedIfEmpty()
        if (active) setState({ status: 'ready', error: null, seeded })
      } catch (cause) {
        if (active) {
          setState({
            status: 'error',
            error: toUserMessage(cause, ERROR_MESSAGES.DB_OPEN),
            seeded: false,
          })
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  return state
}
