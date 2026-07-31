import { useRef, useState, type ChangeEvent } from 'react'
import { Icon } from '@/components/icons/Icon'
import { Alert, Button, ConfirmSheet, IconChip, SkeletonBlock, StateBlock } from '@/components/ui'
import { db } from '@/db/database'
import { settingsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { BACKUP_SECTION_ID } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { exportBackup, type ExportProgress } from '@/services/exportService'
import { applyImport, prepareImport, type BackupPreview } from '@/services/importService'
import { formatDateTime } from '@/utils/date'
import { formatFileSize } from '@/utils/fileRules'

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
  /** Etape en cours d'un export long (archive avec fichiers). */
  const [progress, setProgress] = useState<ExportProgress | null>(null)

  const { data, loading, error } = useLiveData(async () => {
    const [
      settings,
      events,
      trips,
      tasks,
      participants,
      items,
      expenses,
      documents,
      allDocuments,
      stages,
      activities,
      transports,
      stays,
    ] = await Promise.all([
      settingsRepository.get(),
      db.events.count(),
      db.trips.count(),
      db.tasks.count(),
      db.participants.count(),
      db.items.count(),
      db.expenses.count(),
      db.documents.count(),
      db.documents.toArray(),
      db.tripStages.count(),
      db.tripActivities.count(),
      db.tripTransports.count(),
      db.tripStays.count(),
    ])
    return {
      settings,
      counts: {
        events,
        trips,
        tasks,
        participants,
        items,
        expenses,
        documents,
        tripContent: stages + activities + transports + stays,
      },
      filesSize: allDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0),
    }
  })

  async function handleExport() {
    setFeedback(null)
    setExporting(true)
    try {
      const result = await exportBackup(setProgress)
      setFeedback({
        tone: 'success',
        message: `Archive creee : ${result.fileName} — ${result.itemCount} elements et ${result.fileCount} fichier${result.fileCount > 1 ? 's' : ''} (${formatFileSize(result.archiveSize)}). Enregistre-la dans Fichiers ou envoie-la vers iCloud.`,
      })
    } catch (cause) {
      setFeedback({ tone: 'error', message: toUserMessage(cause, ERROR_MESSAGES.EXPORT_FAILED) })
    } finally {
      setExporting(false)
      setProgress(null)
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
      const result = await applyImport(pendingImport)
      setPendingImport(null)
      // Les fichiers absents sont signales explicitement : la restauration
      // reussit, mais l'utilisateur doit savoir ce qui manque.
      const missing =
        result.missingFiles.length > 0
          ? ` ${result.missingFiles.length} fichier${result.missingFiles.length > 1 ? "s n'ont" : " n'a"} pas pu etre restaure${result.missingFiles.length > 1 ? 's' : ''} : ${result.missingFiles.slice(0, 3).join(', ')}${result.missingFiles.length > 3 ? '…' : ''}.`
          : ''
      setFeedback({
        tone: result.missingFiles.length > 0 ? 'error' : 'success',
        message: `Restauration terminee : ${result.itemCount} elements et ${result.fileCount} fichier${result.fileCount > 1 ? 's rechargés' : ' rechargé'}.${missing}`,
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
              <p className="backup-stat__value">{data.counts.trips}</p>
              <p className="backup-stat__label">Voyages</p>
            </div>
            <div className="backup-stat">
              <p className="backup-stat__value">{data.counts.tripContent}</p>
              <p className="backup-stat__label">Itineraire</p>
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

            {progress ? (
              <div className="progress-note" aria-live="polite">
                <p className="progress-note__label">{progress.step}</p>
                <div className="progress">
                  <div
                    className="progress__fill"
                    style={{ width: `${Math.round((progress.ratio ?? 0) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

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
              supprimerait tout. L’export produit une <strong>archive ZIP</strong> contenant tes
              donnees et tes {data.counts.documents} document
              {data.counts.documents > 1 ? 's' : ''} ({formatFileSize(data.filesSize)}).
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
            {pendingImport && pendingImport.missingFiles.length > 0 ? (
              <span className="confirm-choice">
                <span className="confirm-choice__hint">
                  ⚠ {pendingImport.missingFiles.length} fichier
                  {pendingImport.missingFiles.length > 1 ? 's sont introuvables' : ' est introuvable'}{' '}
                  dans l’archive. Les fiches correspondantes seront restaurees sans piece jointe.
                </span>
              </span>
            ) : null}
            {pendingImport && !pendingImport.fromArchive ? (
              <span className="confirm-choice">
                <span className="confirm-choice__hint">
                  Cette sauvegarde est un fichier JSON d’une version anterieure : elle ne contient
                  aucun fichier joint.
                </span>
              </span>
            ) : null}
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
              <dt>Itineraire</dt>
              <dd>{pendingImport.counts.tripContent}</dd>
              <dt>Taches</dt>
              <dd>{pendingImport.counts.tasks}</dd>
              <dt>Participants</dt>
              <dd>{pendingImport.counts.participants}</dd>
              <dt>A ramener</dt>
              <dd>{pendingImport.counts.items}</dd>
              <dt>Depenses</dt>
              <dd>{pendingImport.counts.expenses}</dd>
              <dt>Documents</dt>
              <dd>{pendingImport.counts.documents}</dd>
              <dt>Fichiers joints</dt>
              <dd>{pendingImport.counts.files}</dd>
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
