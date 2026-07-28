import { registerSW } from 'virtual:pwa-register'

/**
 * Enregistre le service worker genere par vite-plugin-pwa.
 *
 * Strategie `autoUpdate` : une nouvelle version se met en place au prochain
 * lancement, sans demander confirmation — adapte a une application perso.
 * L'enregistrement est volontairement pilote ici plutot qu'injecte, pour
 * garder la trace des evenements en console.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[Mes Aventures] Pret a fonctionner hors connexion.')
    },
    onNeedRefresh() {
      console.info('[Mes Aventures] Nouvelle version installee, active au prochain lancement.')
    },
    onRegisterError(error) {
      // Sans service worker, l'application reste utilisable : seul le mode
      // hors ligne est perdu. On n'interrompt donc pas l'utilisateur.
      console.error('[Mes Aventures] Service worker non enregistre', error)
    },
  })
}
