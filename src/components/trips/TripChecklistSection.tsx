import { useId, useState } from 'react'
import { ModuleSection } from '@/components/events/ModuleSection'
import { Icon } from '@/components/icons/Icon'
import { Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { TRAVEL_CHECKLISTS } from '@/config/checklists'
import { itemsRepository } from '@/db/repositories'
import { ITEM_STATUS_LABELS, type EventItem, type ItemDraft } from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { normalize } from '@/utils/eventRules'

interface FormState {
  label: string
  quantity: string
  note: string
}

const emptyForm = (): FormState => ({ label: '', quantity: '1', note: '' })

export interface TripChecklistSectionProps {
  /** Evenement porteur : les objets sont ceux du module V0.3, reutilise tel quel. */
  eventId: string
  items: EventItem[]
}

/**
 * Checklist de bagages.
 *
 * Reutilise le module « objets a ramener » de la V0.3 plutot que d'introduire
 * une table concurrente ; la valeur ajoutee du voyage tient dans les modeles
 * pre-remplis (papiers, vetements, hygiene, electronique, sante, autres).
 */
export function TripChecklistSection({ eventId, items }: TripChecklistSectionProps) {
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [templates, setTemplates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = { label: useId(), quantity: useId(), note: useId() }

  const packed = items.filter((item) => item.status !== 'a-prevoir').length
  const open = creating || editing !== null

  function startCreate() {
    setForm(emptyForm())
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(item: EventItem) {
    setForm({ label: item.label, quantity: String(item.quantity), note: item.note ?? '' })
    setCreating(false)
    setError(null)
    setEditing(item)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.label.trim().length === 0) {
      setError('Nomme cet element.')
      return
    }
    const quantity = Number(form.quantity)
    setBusy(true)
    try {
      const draft: ItemDraft = {
        label: form.label.trim(),
        kind: 'a-ramener',
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        status: editing?.status ?? 'a-prevoir',
        countInBudget: editing?.countInBudget ?? false,
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }
      if (editing) await itemsRepository.update(editing.id, { ...draft, note: draft.note })
      else await itemsRepository.create(eventId, draft)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('objet')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await itemsRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_DELETE('objet')))
    } finally {
      setBusy(false)
    }
  }

  /** Coche / decoche : `pret` signifie « dans la valise ». */
  async function handleToggle(item: EventItem) {
    try {
      await itemsRepository.update(item.id, {
        label: item.label,
        kind: item.kind,
        quantity: item.quantity,
        countInBudget: item.countInBudget,
        status: item.status === 'a-prevoir' ? 'pret' : 'a-prevoir',
      })
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('objet')))
    }
  }

  /**
   * Ajoute un modele complet. Les libelles deja presents sont ignores : on peut
   * donc appliquer un modele plusieurs fois sans creer de doublons.
   */
  async function applyTemplate(key: string) {
    const template = TRAVEL_CHECKLISTS.find((entry) => entry.key === key)
    if (!template) return
    const existing = new Set(items.map((item) => normalize(item.label)))
    const missing = template.items.filter((label) => !existing.has(normalize(label)))
    if (missing.length === 0) {
      setTemplates(false)
      return
    }
    setBusy(true)
    try {
      for (const label of missing) {
        await itemsRepository.create(eventId, {
          label,
          kind: 'a-ramener',
          quantity: 1,
          status: 'a-prevoir',
          countInBudget: false,
        })
      }
      setTemplates(false)
      setError(null)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_CREATE('objet')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="checklist"
        title="Checklist"
        icon="cases"
        addLabel="Ajouter un element"
        onAdd={startCreate}
        isEmpty={items.length === 0}
        emptyText="Rien a preparer pour l’instant. Pars d’un modele, ou ajoute tes propres elements."
        footer={
          <div className="module__links">
            <button type="button" className="link-button" onClick={() => setTemplates(true)}>
              Partir d’un modele
            </button>
            {error ? <Badge tone="blush">{error}</Badge> : null}
          </div>
        }
        summary={
          items.length > 0 ? (
            <>
              <div className="progress">
                <div
                  className="progress__fill"
                  style={{ width: `${Math.round((packed / items.length) * 100)}%` }}
                  role="img"
                  aria-label={`${packed} element${packed > 1 ? 's' : ''} prepare${packed > 1 ? 's' : ''} sur ${items.length}`}
                />
              </div>
              <p className="module__summary-text">
                {packed}/{items.length} prepares
              </p>
            </>
          ) : null
        }
      >
        <ul className="task-list">
          {items.map((item) => (
            <li key={item.id} className={['task', item.status !== 'a-prevoir' ? 'task--done' : ''].filter(Boolean).join(' ')}>
              <button
                type="button"
                className="task__check"
                onClick={() => handleToggle(item)}
                aria-pressed={item.status !== 'a-prevoir'}
                aria-label={
                  item.status !== 'a-prevoir' ? `Decocher ${item.label}` : `Cocher ${item.label}`
                }
              >
                {item.status !== 'a-prevoir' ? <Icon name="valide" size={18} /> : null}
              </button>
              <button type="button" className="task__body" onClick={() => startEdit(item)}>
                <span className="task__title">{item.label}</span>
                <span className="task__meta">
                  {item.quantity > 1 ? `x${item.quantity}` : ITEM_STATUS_LABELS[item.status]}
                  {item.note ? ` · ${item.note}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ModuleSection>

      <EditSheet
        open={open}
        title={editing ? 'Modifier l’element' : 'Nouvel element'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Element" htmlFor={ids.label}>
          <input
            id={ids.label}
            className="field__input"
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Adaptateur de prise"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Quantite" htmlFor={ids.quantity}>
          <input
            id={ids.quantity}
            className="field__input"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
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

      {/* --- Modeles ---------------------------------------------------------- */}
      <EditSheet
        open={templates}
        title="Modeles de checklist"
        busy={busy}
        submitLabel="Fermer"
        onSubmit={() => setTemplates(false)}
        onCancel={() => setTemplates(false)}
      >
        <p className="sheet__hint">
          Chaque modele ajoute ses elements a ta checklist. Les elements deja presents ne sont pas
          dupliques.
        </p>
        <div className="template-list">
          {TRAVEL_CHECKLISTS.map((template) => (
            <button
              key={template.key}
              type="button"
              className="template-option"
              disabled={busy}
              onClick={() => applyTemplate(template.key)}
            >
              <span className="template-option__label">{template.label}</span>
              <span className="template-option__count">{template.items.length} elements</span>
            </button>
          ))}
        </div>
      </EditSheet>
    </>
  )
}
