import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackupSection } from '@/components/settings/BackupSection'
import { IconChip, PageHeader, StateBlock } from '@/components/ui'
import { APP_NAME, APP_VERSION } from '@/config/app'
import { settingsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { BACKUP_SECTION_ID } from '@/navigation/routes'

/**
 * Parametres — accessibles depuis l'avatar de l'accueil.
 *
 * Regroupe le profil, les preferences, les informations d'application et le
 * module Sauvegarde complet (deplace depuis l'ancien onglet).
 */
export function SettingsPage() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { data } = useLiveData(() => settingsRepository.get())

  // Arrivee depuis l'ancienne route `/sauvegarde` : on descend directement sur
  // la section correspondante plutot que d'atterrir en haut de page.
  useEffect(() => {
    if (hash !== `#${BACKUP_SECTION_ID}`) return
    const target = document.getElementById(BACKUP_SECTION_ID)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, data])

  return (
    <>
      <PageHeader
        title="Parametres"
        subtitle="Ton profil, tes preferences et tes sauvegardes."
        onBack={() => navigate(-1)}
      />

      {/* --- Profil ------------------------------------------------------- */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Profil</h2>
        </div>
        <div className="settings-row">
          <IconChip icon="participants" tone="apricot" />
          <div className="settings-row__text">
            <p className="settings-row__label">Prenom affiche</p>
            <p className="settings-row__value">{data?.displayName ?? 'Axel'}</p>
          </div>
        </div>
        <p className="settings-hint">
          La modification du prenom arrivera dans une prochaine version. Il est restaure tel quel
          lors de l’import d’une sauvegarde.
        </p>
      </section>

      {/* --- Preferences --------------------------------------------------- */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Affichage</h2>
        </div>
        <StateBlock
          icon="etoiles"
          title="Preferences a venir"
          text="Theme, format des dates et devise seront reglables ici dans une prochaine version."
        />
      </section>

      {/* --- Sauvegarde ------------------------------------------------------ */}
      <BackupSection />

      {/* --- A propos --------------------------------------------------------- */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">A propos</h2>
        </div>
        <div className="settings-row">
          <IconChip icon="info" tone="sky" />
          <div className="settings-row__text">
            <p className="settings-row__label">{APP_NAME}</p>
            <p className="settings-row__value">Version {APP_VERSION}</p>
          </div>
        </div>
        <p className="settings-hint">
          Application 100 % locale : aucune donnee ne quitte cet appareil, sauf par un export
          volontaire. Format de sauvegarde JSON v3.
        </p>
      </section>
    </>
  )
}
