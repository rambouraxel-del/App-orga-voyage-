import { useId, useState } from 'react'
import { Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { itemsRepository } from '@/db/repositories'
import {
  ITEM_KINDS,
  ITEM_KIND_LABELS,
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  type EventItem,
  type ItemDraft,
  type ItemKind,
  type ItemStatus,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { itemEstimatedTotal } from '@/utils/budgetRules'
import { formatCurrency } from '@/utils/format'
import { ModuleSection } from './ModuleSection'
import type { BadgeTone } from '@/components/ui/Badge'

const STATUS_TONES: Record<ItemStatus, BadgeTone> = {
  'a-prevoir': 'apricot',
  pret: 'sky',
  termine: 'sage',
}

interface FormState {
  label: string
  kind: string
  forWhom: string
  quantity: string
  estimatedPrice: string
  status: string
  note: string
  countInBudget: boolean
}

const emptyForm = (): FormState => ({
  label: '',
  kind: 'a-ramener',
  forWhom: '',
  quantity: '1',
  estimatedPrice: '',
  status: 'a-prevoir',
  note: '',
  countInBudget: false,
})

export function ItemsSection({ eventId, items }: { eventId: string; items: EventItem[] }) {
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = {
    label: useId(),
    kind: useId(),
    forWhom: useId(),
    quantity: useId(),
    price: useId(),
    status: useId(),
    note: useId(),
    budget: useId(),
  }

  const remaining = items.filter((item) => item.status !== 'termine').length
  const estimated = items.reduce((sum, item) => sum + itemEstimatedTotal(item), 0)

  function startCreate() {
    setForm(emptyForm())
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(item: EventItem) {
    setForm({
      label: item.label,
      kind: item.kind,
      forWhom: item.forWhom ?? '',
      quantity: String(item.quantity),
      estimatedPrice: item.estimatedPrice === undefined ? '' : String(item.estimatedPrice),
      status: item.status,
      note: item.note ?? '',
      countInBudget: item.countInBudget,
    })
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
      setError('Donne un nom a cet element.')
      return
    }
    const quantity = Number.parseInt(form.quantity, 10)
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('La quantite doit valoir au moins 1.')
      return
    }
    // Virgule decimale acceptee : c'est ce que produit le clavier francais.
    const price = form.estimatedPrice.trim()
      ? Number.parseFloat(form.estimatedPrice.replace(',', '.'))
      : undefined
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      setError('Le prix estime doit etre un montant positif.')
      return
    }

    setBusy(true)
    try {
      const draft: ItemDraft = {
        label: form.label.trim(),
        kind: form.kind as ItemKind,
        quantity,
        status: form.status as ItemStatus,
        countInBudget: form.countInBudget,
        ...(form.forWhom.trim() ? { forWhom: form.forWhom.trim() } : {}),
        ...(price !== undefined ? { estimatedPrice: price } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }
      if (editing) {
        await itemsRepository.update(editing.id, {
          ...draft,
          forWhom: draft.forWhom,
          estimatedPrice: draft.estimatedPrice,
          note: draft.note,
        })
      } else {
        await itemsRepository.create(eventId, draft)
      }
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('element')))
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
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_DELETE('element')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="a-ramener"
        title="A ramener"
        icon="cadeau"
        addLabel="Ajouter un cadeau ou un objet"
        onAdd={startCreate}
        isEmpty={items.length === 0}
        emptyText="Rien a prevoir. Ajoute les cadeaux a acheter et les objets a emporter."
        summary={
          items.length > 0 ? (
            <p className="module__summary-text">
              {remaining > 0 ? `${remaining} a preparer` : 'Tout est pret'}
              {estimated > 0 ? ` · ${formatCurrency(estimated)} estimes` : ''}
            </p>
          ) : null
        }
      >
        <ul className="row-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="row" onClick={() => startEdit(item)}>
                <span className="row__body">
                  <span className="row__title">
                    {item.label}
                    {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                  </span>
                  <span className="row__meta">
                    {ITEM_KIND_LABELS[item.kind]}
                    {item.forWhom ? ` · pour ${item.forWhom}` : ''}
                    {item.estimatedPrice !== undefined
                      ? ` · ${formatCurrency(itemEstimatedTotal(item))}`
                      : ''}
                    {item.countInBudget ? ' · compte au budget' : ''}
                  </span>
                </span>
                <Badge tone={STATUS_TONES[item.status]}>{ITEM_STATUS_LABELS[item.status]}</Badge>
              </button>
            </li>
          ))}
        </ul>
      </ModuleSection>

      <EditSheet
        open={creating || editing !== null}
        title={editing ? 'Modifier l’element' : 'Nouvel element'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Nom" htmlFor={ids.label}>
          <input
            id={ids.label}
            className="field__input"
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Bouteille de limoncello"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Type" htmlFor={ids.kind}>
          <select
            id={ids.kind}
            className="field__input field__input--select"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            {ITEM_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ITEM_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </SheetField>

        <SheetField label="Pour qui" htmlFor={ids.forWhom} hint="facultatif">
          <input
            id={ids.forWhom}
            className="field__input"
            type="text"
            value={form.forWhom}
            onChange={(e) => setForm({ ...form, forWhom: e.target.value })}
            autoComplete="off"
          />
        </SheetField>

        <div className="field-row">
          <SheetField label="Quantite" htmlFor={ids.quantity}>
            <input
              id={ids.quantity}
              className="field__input"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </SheetField>

          <SheetField label="Prix unitaire" htmlFor={ids.price} hint="€">
            <input
              id={ids.price}
              className="field__input"
              type="text"
              inputMode="decimal"
              value={form.estimatedPrice}
              onChange={(e) => setForm({ ...form, estimatedPrice: e.target.value })}
              placeholder="25"
            />
          </SheetField>
        </div>

        <SheetField label="Statut" htmlFor={ids.status}>
          <select
            id={ids.status}
            className="field__input field__input--select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ITEM_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </SheetField>

        <div className="field field--switch">
          <label className="switch" htmlFor={ids.budget}>
            <input
              id={ids.budget}
              type="checkbox"
              checked={form.countInBudget}
              onChange={(e) => setForm({ ...form, countInBudget: e.target.checked })}
            />
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            <span className="switch__label">Compter dans le budget</span>
          </label>
        </div>

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
    </>
  )
}
