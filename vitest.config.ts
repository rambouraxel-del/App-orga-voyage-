import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Les tests portent sur la logique metier pure (regles d'evenements,
 * validation, migrations de sauvegarde). Aucun rendu React n'est teste ici :
 * l'interface est verifiee par le parcours navigateur documente dans le README.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
