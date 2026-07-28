import { useRef, useState, type ChangeEvent } from 'react'
import { Icon } from '@/components/icons/Icon'
import { Alert, Button, Card, ConfirmSheet, IconChip, SkeletonBlock, StateBlock } from '@/components/ui'
import { APP_VERSION } from '@/config/app'
import { db } from '@/db/database'
import { settingsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { exportBackup } from '@/services/exportService'
import { applyImport, prepareImport, type BackupPreview } from '@/services/importService'
import { formatDateTime } from '@/utils/date'

type Feedback = { tone: 'success' | 'error'; message: string } | null

export function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [feedback, setFeedback] = useState<Feedback>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  /** Sauvegarde lue et validee, en attente de confirmation de l'utilisateur. */
  const [pendingImport, setPendingImport] = useState<BackupPreview | null>(null)

  const { data, loading, error } = useLiveData(async () => {
    const [settings, events, trips, reminders, documents] = await Promise.all([
      settingsRepository.get(),
      db.events.count(),
      db.trips.count(),
      db.reminders.count(),
      db.documents.count(),
    ])
    return { settings, counts: { events, trips, reminders, documents } }
  })

  /* --- Export ---------------------------------------------------------- */

  async function handleExport() {
    setFeedback(null)
    setExporting(true)
    try {
      const result = await exportBackup()
      setFeedback({
        tone: 'success',
        message: `Sauvegarde creee : ${result.fileName} (${result.itemCount} elements). Enregistre-la dans Fichiers ou envoie-la vers iCloud.`,
      })
    } catch (cause) {
      setFeedback({ tone: 'error', message: toUserMessage(cause, ERROR_MESSAGES.EXPORT_FAILED) })
    } finally {
      setExporting(false)
    }
  }

  /* --- Import : etape 1, lecture + validation ---------------------------- */

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Le champ est reinitialise tout de suite : reselectionner le meme fichier
    // doit redeclencher l'evenement `change`.
    event.target.value = ''
    if (!file) return

    setFeedback(null)
    setImporting(true)
    try {
      const preview = await prepareImport(file)
      setPendingImport(preview)
    } catch (cause) {
      setFeedback({ tone: 'error', message: toUserMessage(cause, ERROR_MESSAGES.IMPORT_READ) })
    } finally {
      setImporting(false)
    }
  }

  /* --- Import : etape 2, remplacement confirme ---------------------------- */

  async function handleConfirmImport() {
    if (!pendingImport) return
    setImporting(true)
    try {
      const result = await applyImport(pendingImport.backup)
      setPendingImport(null)
      setFeedback({
        tone: 'success',
        message: `Restauration terminee : ${result.itemCount} elements recharges. Tes ecrans sont a jour.`,
      })
    } catch (cause) {
      setPendingImport(null)
      setFeedback({ tone: 'error', message: toUserMessage(cause, ERROR_MESSAGES.IMPORT_WRITE) })
    } finally {
      setImporting(false)
    }
  }

  /* --- Rendu -------------------------------------------------------------- */

  return (
    <>
      <header className="page-header">
        <div className="page-header__text">
          <h1 className="page-title">Sauvegarde</h1>
          <p className="page-subtitle">
            Exporte un fichier de secours, ou restaure une sauvegarde precedente.
          </p>
        </div>
      </header>

      {feedback ? (
        <Alert tone={feedback.tone} className="section">
          {feedback.message}
        </Alert>
      ) : null}

      {loading ? (
        <SkeletonBlock height={110} />
      ) : error || !data ? (
        <StateBlock error title="Base illisible" text={error ?? ERROR_MESSAGES.DB_READ} />
      ) : (
        <>
          <div className="backup-summary">
            <IconChip icon="horloge" tone="apricot" />
            <div>
              <p className="backup-summary__label">Derniere sauvegarde</p>
              <p className="backup-summary__value">
                {data.settings.lastBackupAt
                  ? formatDateTime(data.settings.lastBackupAt)
                  : 'Jamais effectuee'}
              </p>
            </div>
          </div>

          <div className="backup-stats">
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.events}</p>
              <p className="backup-stat__label">Evenements</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.trips}</p>
              <p className="backup-stat__label">Voyages</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.reminders}</p>
              <p className="backup-stat__label">Pense-betes</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.documents}</p>
              <p className="backup-stat__label">Documents</p>
            </div>
          </div>

          <div className="backup-actions">
            <Button
              variant="primary"
              block
              icon="telecharger"
              loading={exporting}
              onClick={handleExport}
            >
              Exporter mes donnees
            </Button>

            <Button
              variant="secondary"
              block
              icon="importer"
              loading={importing && !pendingImport}
              onClick={() => fileInputRef.current?.click()}
            >
              Importer une sauvegarde
            </Button>

            {/* Sur iOS, `accept` autorise la selection depuis l'app Fichiers. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={handleFileSelected}
              aria-label="Choisir un fichier de sauvegarde"
            />
          </div>

          <div className="backup-info">
            <Icon name="cadenas" size={19} className="backup-info__icon" />
            <p>
              Tes donnees sont conservees <strong>uniquement sur cet appareil</strong>, dans le
              stockage local du navigateur. Aucun compte, aucun serveur, aucun envoi sur Internet.
              Exporte regulierement : effacer les donnees de Safari ou desinstaller l’application
              supprimerait tout.
            </p>
          </div>

          <Card flat className="section">
            <p className="backup-summary__label">A propos</p>
            <p className="preview-card__secondary">
              Mes Aventures v{APP_VERSION} · format de sauvegarde JSON v1
            </p>
          </Card>
        </>
      )}

      <ConfirmSheet
        open={pendingImport !== null}
        busy={importing}
        title="Remplacer les donnees actuelles ?"
        description={
          <>
            La restauration <strong>efface toutes les donnees presentes</strong> sur cet appareil et
            les remplace par le contenu du fichier. Cette action est definitive.
          </>
        }
        details={
          pendingImport ? (
            <dl>
              <dt>Fichier cree le</dt>
              <dd>{formatDateTime(pendingImport.createdAt)}</dd>
              <dt>Version</dt>
              <dd>v{pendingImport.appVersion}</dd>
              <dt>Evenements</dt>
              <dd>{pendingImport.counts.events}</dd>
              <dt>Voyages</dt>
              <dd>{pendingImport.counts.trips}</dd>
              <dt>Pense-betes</dt>
              <dd>{pendingImport.counts.reminders}</dd>
              <dt>Documents</dt>
              <dd>{pendingImport.counts.documents}</dd>
            </dl>
          ) : null
        }
        confirmLabel="Remplacer et restaurer"
        cancelLabel="Annuler"
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </>
  )
}
