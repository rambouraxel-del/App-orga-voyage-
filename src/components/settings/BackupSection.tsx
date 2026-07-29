import { useRef, useState, type ChangeEvent } from 'react'
import { Icon } from '@/components/icons/Icon'
import { Alert, Button, ConfirmSheet, IconChip, SkeletonBlock, StateBlock } from '@/components/ui'
import { db } from '@/db/database'
import { settingsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { BACKUP_SECTION_ID } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { exportBackup } from '@/services/exportService'
import { applyImport, prepareImport, type BackupPreview } from '@/services/importService'
import { formatDateTime } from '@/utils/date'

type Feedback = { tone: 'success' | 'error'; message: string } | null

/**
 * Module de sauvegarde complet, deplace depuis l'ancienne page Sauvegarde vers
 * les Parametres. Le comportement est strictement identique a la V0.2 :
 * export JSON, import valide avec confirmation, refus propre des fichiers
 * incorrects, horodatage de la derniere sauvegarde.
 */
export function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [feedback, setFeedback] = useState<Feedback>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingImport, setPendingImport] = useState<BackupPreview | null>(null)

  const { data, loading, error } = useLiveData(async () => {
    const [settings, events, tasks, participants, items, expenses] = await Promise.all([
      settingsRepository.get(),
      db.events.count(),
      db.tasks.count(),
      db.participants.count(),
      db.items.count(),
      db.expenses.count(),
    ])
    return { settings, counts: { events, tasks, participants, items, expenses } }
  })

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

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reinitialise tout de suite : reselectionner le meme fichier doit
    // redeclencher l'evenement `change`.
    event.target.value = ''
    if (!file) return

    setFeedback(null)
    setImporting(true)
    try {
      setPendingImport(await prepareImport(file))
    } catch (cause) {
      setFeedback({ tone: 'error', message: toUserMessage(cause, ERROR_MESSAGES.IMPORT_READ) })
    } finally {
      setImporting(false)
    }
  }

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

  return (
    <section className="settings-section" id={BACKUP_SECTION_ID}>
      <div className="section-header">
        <h2 className="section-title">Sauvegarde</h2>
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : null}

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
              <p className="backup-stat__value">{data.counts.tasks}</p>
              <p className="backup-stat__label">Taches</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.participants}</p>
              <p className="backup-stat__label">Participants</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.items}</p>
              <p className="backup-stat__label">A ramener</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.expenses}</p>
              <p className="backup-stat__label">Depenses</p>
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
              <dt>Taches</dt>
              <dd>{pendingImport.counts.tasks}</dd>
              <dt>Participants</dt>
              <dd>{pendingImport.counts.participants}</dd>
              <dt>A ramener</dt>
              <dd>{pendingImport.counts.items}</dd>
              <dt>Depenses</dt>
              <dd>{pendingImport.counts.expenses}</dd>
            </dl>
          ) : null
        }
        confirmLabel="Remplacer et restaurer"
        cancelLabel="Annuler"
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </section>
  )
}
