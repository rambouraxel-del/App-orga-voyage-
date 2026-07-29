import { PageHeader, StateBlock } from '@/components/ui'

/**
 * Documents & billets.
 *
 * V0.3 : page de destination et etat vide uniquement. Le stockage reel des
 * fichiers (billets, reservations, PDF) est explicitement hors perimetre —
 * seule la place dans la navigation est prise.
 */
export function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Billets, reservations et papiers de voyage, reunis au meme endroit."
      />

      <StateBlock
        icon="dossier"
        title="Bientot tes billets a portee de main"
        text="Tu pourras bientot rattacher ici tes billets de train, confirmations d’hotel et documents de voyage, et les retrouver hors connexion le jour J."
      />

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Ce qui arrive</h2>
        </div>
        <ul className="feature-list">
          <li className="feature-list__item">
            <span className="feature-list__bullet" aria-hidden="true" />
            Ajouter un billet ou une reservation depuis Fichiers ou l’appareil photo
          </li>
          <li className="feature-list__item">
            <span className="feature-list__bullet" aria-hidden="true" />
            Rattacher un document a un evenement ou a un voyage
          </li>
          <li className="feature-list__item">
            <span className="feature-list__bullet" aria-hidden="true" />
            Consulter les documents hors connexion, le jour du depart
          </li>
        </ul>
      </section>
    </>
  )
}
