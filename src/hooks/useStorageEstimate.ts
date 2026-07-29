import { useEffect, useState } from 'react'

export interface StorageEstimate {
  /** Octets utilises d'apres le navigateur, ou `null` si l'API est absente. */
  usage: number | null
  /** Quota total annonce, ou `null`. */
  quota: number | null
  /** Part du quota consommee, de 0 a 1, ou `null`. */
  ratio: number | null
}

/**
 * Estime l'espace de stockage utilise.
 *
 * `navigator.storage.estimate()` n'est pas disponible partout (et Safari en
 * donne une valeur approximative) : on renvoie `null` plutot que d'inventer un
 * chiffre, et l'interface se rabat alors sur la somme des tailles de fichiers.
 *
 * @param deps Valeurs dont la variation doit declencher une nouvelle mesure.
 */
export function useStorageEstimate(deps: unknown[] = []): StorageEstimate {
  const [estimate, setEstimate] = useState<StorageEstimate>({
    usage: null,
    quota: null,
    ratio: null,
  })

  useEffect(() => {
    let active = true

    void (async () => {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return
      try {
        const result = await navigator.storage.estimate()
        if (!active) return
        const usage = result.usage ?? null
        const quota = result.quota ?? null
        setEstimate({
          usage,
          quota,
          ratio: usage !== null && quota ? usage / quota : null,
        })
      } catch (cause) {
        // Estimation indisponible : ce n'est pas une erreur bloquante.
        console.warn('[Mes Aventures] Estimation du stockage indisponible', cause)
      }
    })()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return estimate
}
