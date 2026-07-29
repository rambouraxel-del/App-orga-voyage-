import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Alert } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { FILE_ACCEPT_ATTRIBUTE, MAX_FILE_SIZE } from '@/config/documents'
import { documentsRepository } from '@/db/repositories'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  type AppEvent,
  type DocumentDraft,
  type TravelDocument,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { toDayInput } from '@/utils/date'
import {
  formatFileSize,
  guessCategory,
  titleFromFileName,
  validateFile,
} from '@/utils/fileRules'

interface FormState {
  title: string
  category: string
  eventId: string
  usefulDay: string
  note: string
}

const emptyForm = (): FormState => ({
  title: '',
  category: 'autre',
  eventId: '',
  usefulDay: '',
  note: '',
})

export interface DocumentSheetProps {
  open: boolean
  /** Document a modifier. Absent = creation. */
  document?: TravelDocument | null
  /** Evenement pre-selectionne (ajout depuis une fiche evenement). */
  defaultEventId?: string
  /** Liste des evenements proposes pour l'association. */
  events: AppEvent[]
  /**
   * Duplication : les metadonnees sont pre-remplies mais un NOUVEAU fichier
   * est requis — on ne copie jamais le binaire.
   */
  duplicateOf?: TravelDocument | null
  onClose: () => void
  onSaved?: (document: TravelDocument) => void
}

export function DocumentSheet({
  open,
  document: editing = null,
  defaultEventId,
  events,
  duplicateOf = null,
  onClose,
  onSaved,
}: DocumentSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const ids = { title: useId(), category: useId(), event: useId(), date: useId(), note: useId() }

  /** Un fichier n'est exige qu'a la creation et a la duplication. */
  const requiresFile = editing === null

  // Reinitialise le formulaire a chaque ouverture.
  useEffect(() => {
    if (!open) return
    const source = editing ?? duplicateOf
    setForm(
      source
        ? {
            title: duplicateOf ? `${source.title} (copie)` : source.title,
            category: source.category,
            eventId: source.eventId ?? defaultEventId ?? '',
            usefulDay: toDayInput(source.usefulDate),
            note: source.note ?? '',
          }
        : { ...emptyForm(), eventId: defaultEventId ?? '' },
    )
    setFile(null)
    setError(null)
  }, [open, editing, duplicateOf, defaultEventId])

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0]
    // Reinitialise : reselectionner le meme fichier doit redeclencher `change`.
    event.target.value = ''
    if (!chosen) return

    const validation = validateFile(chosen)
    if (!validation.ok) {
      setError(validation.message)
      setFile(null)
      return
    }

    setError(null)
    setFile(chosen)
    // Titre et categorie proposes d'apres le nom, seulement si l'utilisateur
    // n'a rien saisi : on ne surcharge jamais une saisie manuelle.
    setForm((current) => ({
      ...current,
      title: current.title.trim() || titleFromFileName(chosen.name),
      category:
        current.category === 'autre' ? guessCategory(chosen.name) : current.category,
    }))
  }

  async function handleSubmit() {
    if (form.title.trim().length === 0) {
      setError('Donne un titre a ce document.')
      return
    }
    if (requiresFile && !file) {
      setError('Choisis un fichier a importer.')
      return
    }

    setBusy(true)
    try {
      const draft: DocumentDraft = {
        title: form.title.trim(),
        category: form.category as DocumentDraft['category'],
        archived: editing?.archived ?? false,
        ...(form.eventId ? { eventId: form.eventId } : {}),
        ...(form.usefulDay
          ? { usefulDate: new Date(`${form.usefulDay}T12:00:00`).toISOString() }
          : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }

      let saved: TravelDocument
      if (editing) {
        saved = await documentsRepository.update(editing.id, draft)
      } else {
        // Revalide juste avant l'ecriture : le fichier a pu etre retire de
        // l'appareil entre la selection et la validation.
        const validation = validateFile(file!)
        if (!validation.ok) {
          setError(validation.message)
          return
        }
        saved = await documentsRepository.create(draft, {
          blob: file!,
          fileName: file!.name,
          mimeType: validation.mimeType,
          size: file!.size,
        })
      }

      onSaved?.(saved)
      onClose()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.DOCUMENT_SAVE))
    } finally {
      setBusy(false)
    }
  }

  const title = editing ? 'Modifier le document' : duplicateOf ? 'Dupliquer le document' : 'Nouveau document'

  return (
    <EditSheet
      open={open}
      title={title}
      error={error}
      busy={busy}
      submitLabel={editing ? 'Enregistrer' : 'Importer'}
      onSubmit={handleSubmit}
      onCancel={onClose}
    >
      {requiresFile ? (
        <SheetField label="Fichier">
          <button type="button" className="file-picker" onClick={() => fileInputRef.current?.click()}>
            {file ? (
              <>
                <span className="file-picker__name">{file.name}</span>
                <span className="file-picker__meta">
                  {formatFileSize(file.size)} · toucher pour changer
                </span>
              </>
            ) : (
              <>
                <span className="file-picker__name">Choisir un fichier</span>
                <span className="file-picker__meta">
                  PDF, JPEG, PNG, WebP ou texte · {formatFileSize(MAX_FILE_SIZE)} maximum
                </span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT_ATTRIBUTE}
            className="visually-hidden"
            onChange={handleFileChosen}
            aria-label="Choisir un fichier a importer"
          />
        </SheetField>
      ) : (
        <Alert tone="info">
          Le fichier joint n’est pas modifiable. Pour le remplacer, duplique le document et importe
          le nouveau fichier.
        </Alert>
      )}

      <SheetField label="Titre" htmlFor={ids.title}>
        <input
          id={ids.title}
          className="field__input"
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Billet de train Paris → Nice"
          autoComplete="off"
        />
      </SheetField>

      <SheetField label="Categorie" htmlFor={ids.category}>
        <select
          id={ids.category}
          className="field__input field__input--select"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {DOCUMENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </SheetField>

      <SheetField label="Evenement associe" htmlFor={ids.event} hint="facultatif">
        <select
          id={ids.event}
          className="field__input field__input--select"
          value={form.eventId}
          onChange={(e) => setForm({ ...form, eventId: e.target.value })}
        >
          <option value="">Aucun</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </SheetField>

      <SheetField label="Date utile" htmlFor={ids.date} hint="ou d’expiration, facultative">
        <input
          id={ids.date}
          className="field__input"
          type="date"
          value={form.usefulDay}
          onChange={(e) => setForm({ ...form, usefulDay: e.target.value })}
        />
      </SheetField>

      <SheetField label="Note" htmlFor={ids.note} hint="facultative">
        <textarea
          id={ids.note}
          className="field__input field__input--textarea"
          rows={2}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </SheetField>
    </EditSheet>
  )
}
