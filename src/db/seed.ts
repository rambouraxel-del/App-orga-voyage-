import { db } from './database'
import { buildSeedData } from './seedData'
import { SETTINGS_KEY } from '@/models'

/**
 * Insere les donnees de demonstration UNE SEULE FOIS.
 *
 * Le marqueur d'installation est la ligne `settings` : si elle existe, la base
 * appartient deja a l'utilisateur (donnees reelles ou restaurees) et on ne
 * touche a rien. L'ensemble est ecrit dans une transaction pour eviter une
 * base a moitie initialisee si l'onglet est ferme pendant l'operation.
 */
export async function seedIfEmpty(): Promise<boolean> {
  return db.transaction(
    'rw',
    [
      db.events,
      db.trips,
      db.tripStages,
      db.tripActivities,
      db.tripTransports,
      db.tripStays,
      db.reminders,
      db.documents,
      db.settings,
    ],
    async () => {
      const existing = await db.settings.get(SETTINGS_KEY)
      if (existing) return false

      // Base sans parametres mais deja peuplee : on cree seulement les
      // parametres manquants, sans reinjecter de donnees fictives.
      const hasUserData = (await db.events.count()) > 0 || (await db.trips.count()) > 0

      const seed = buildSeedData()
      if (hasUserData) {
        await db.settings.put(seed.settings)
        return false
      }

      await Promise.all([
        db.events.bulkPut(seed.events),
        db.trips.bulkPut(seed.trips),
        db.tripStages.bulkPut(seed.tripStages),
        db.tripActivities.bulkPut(seed.tripActivities),
        db.tripTransports.bulkPut(seed.tripTransports),
        db.tripStays.bulkPut(seed.tripStays),
        db.reminders.bulkPut(seed.reminders),
        db.documents.bulkPut(seed.documents),
        db.settings.put(seed.settings),
      ])
      return true
    },
  )
}
