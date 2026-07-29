import { useId, useState } from 'react'
import { Alert, Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { eventsRepository, expensesRepository } from '@/db/repositories'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type EventItem,
  type Expense,
  type ExpenseCategory,
  type ExpenseDraft,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { computeBudget } from '@/utils/budgetRules'
import { formatShortDate, toDayInput } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { ModuleSection } from './ModuleSection'

interface ExpenseForm {
  label: string
  amount: string
  category: string
  day: string
  note: string
  paid: boolean
}

const emptyExpense = (): ExpenseForm => ({
  label: '',
  amount: '',
  category: 'autre',
  day: '',
  note: '',
  paid: false,
})

/** Accepte « 12,50 » comme « 12.50 » — le clavier francais produit une virgule. */
function parseAmount(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export function BudgetSection({
  eventId,
  planned,
  expenses,
  items,
}: {
  eventId: string
  planned: number | undefined
  expenses: Expense[]
  items: EventItem[]
}) {
  const [editing, setEditing] = useState<Expense | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ExpenseForm>(emptyExpense)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editingPlan, setEditingPlan] = useState(false)
  const [planValue, setPlanValue] = useState('')

  const ids = {
    label: useId(),
    amount: useId(),
    category: useId(),
    day: useId(),
    note: useId(),
    paid: useId(),
    plan: useId(),
  }

  const budget = computeBudget(planned, expenses, items)

  function startCreate() {
    setForm(emptyExpense())
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(expense: Expense) {
    setForm({
      label: expense.label,
      amount: String(expense.amount),
      category: expense.category,
      day: toDayInput(expense.date),
      note: expense.note ?? '',
      paid: expense.paid,
    })
    setCreating(false)
    setError(null)
    setEditing(expense)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.label.trim().length === 0) {
      setError('Donne un intitule a cette depense.')
      return
    }
    const amount = parseAmount(form.amount)
    if (amount === null || amount < 0) {
      setError('Saisis un montant valide, en euros.')
      return
    }

    setBusy(true)
    try {
      const draft: ExpenseDraft = {
        label: form.label.trim(),
        amount,
        category: form.category as ExpenseCategory,
        paid: form.paid,
        ...(form.day ? { date: new Date(`${form.day}T12:00:00`).toISOString() } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }
      if (editing) {
        await expensesRepository.update(editing.id, {
          ...draft,
          date: draft.date,
          note: draft.note,
        })
      } else {
        await expensesRepository.create(eventId, draft)
      }
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('depense')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await expensesRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_DELETE('depense')))
    } finally {
      setBusy(false)
    }
  }

  async function handleSavePlan() {
    const trimmed = planValue.trim()
    // Champ vide = pas d'enveloppe definie, ce qui est un etat valide.
    const amount = trimmed ? parseAmount(trimmed) : undefined
    if (trimmed && (amount === null || amount === undefined || amount < 0)) {
      setError('Saisis un budget valide, en euros.')
      return
    }
    setBusy(true)
    try {
      await eventsRepository.setBudget(eventId, amount ?? undefined)
      setEditingPlan(false)
      setError(null)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.EVENT_UPDATE))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="budget"
        title="Budget"
        icon="portefeuille"
        addLabel="Ajouter une depense"
        onAdd={startCreate}
        isEmpty={expenses.length === 0 && !budget.hasPlan && budget.fromItems === 0}
        emptyText="Aucun budget defini. Fixe une enveloppe ou note une premiere depense."
        summary={
          budget.hasPlan || budget.spent > 0 ? (
            <>
              <div className="budget-figures">
                <div className="budget-figure">
                  <span className="budget-figure__label">Prevu</span>
                  <span className="budget-figure__value">
                    {budget.hasPlan ? formatCurrency(budget.planned) : '—'}
                  </span>
                </div>
                <div className="budget-figure">
                  <span className="budget-figure__label">Depense</span>
                  <span className="budget-figure__value">{formatCurrency(budget.spent)}</span>
                </div>
                <div className="budget-figure">
                  <span className="budget-figure__label">
                    {budget.remaining < 0 ? 'Depassement' : 'Reste'}
                  </span>
                  <span
                    className={[
                      'budget-figure__value',
                      budget.overBudget ? 'budget-figure__value--over' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {budget.hasPlan ? formatCurrency(Math.abs(budget.remaining)) : '—'}
                  </span>
                </div>
              </div>

              {budget.hasPlan ? (
                <>
                  <div className="progress">
                    <div
                      className={[
                        'progress__fill',
                        budget.overBudget ? 'progress__fill--over' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
                      role="img"
                      aria-label={`${budget.percentUsed} % du budget consomme`}
                    />
                  </div>
                  <p className="module__summary-text">{budget.percentUsed} % consommes</p>
                </>
              ) : null}

              {budget.overBudget ? (
                <Alert tone="error">
                  Budget depasse de {formatCurrency(budget.gap)}.
                </Alert>
              ) : null}

              {budget.breakdown.length > 0 ? (
                <div className="badge-row">
                  {budget.breakdown.map((entry) => (
                    <Badge key={entry.category} tone="neutral">
                      {EXPENSE_CATEGORY_LABELS[entry.category]} {formatCurrency(entry.amount)} (
                      {entry.share} %)
                    </Badge>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setPlanValue(budget.hasPlan ? String(budget.planned) : '')
                  setError(null)
                  setEditingPlan(true)
                }}
              >
                {budget.hasPlan ? 'Modifier l’enveloppe prevue' : 'Definir une enveloppe'}
              </button>
            </>
          ) : null
        }
      >
        <ul className="row-list">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <button type="button" className="row" onClick={() => startEdit(expense)}>
                <span className="row__body">
                  <span className="row__title">{expense.label}</span>
                  <span className="row__meta">
                    {EXPENSE_CATEGORY_LABELS[expense.category]}
                    {expense.date ? ` · ${formatShortDate(expense.date)}` : ''}
                  </span>
                </span>
                <span className="row__trailing">
                  <span className="row__amount">{formatCurrency(expense.amount)}</span>
                  <Badge tone={expense.paid ? 'sage' : 'apricot'}>
                    {expense.paid ? 'Paye' : 'A payer'}
                  </Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {!budget.hasPlan && expenses.length > 0 ? (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setPlanValue('')
              setError(null)
              setEditingPlan(true)
            }}
          >
            Definir une enveloppe prevue
          </button>
        ) : null}
      </ModuleSection>

      {/* --- Depense ------------------------------------------------------- */}
      <EditSheet
        open={creating || editing !== null}
        title={editing ? 'Modifier la depense' : 'Nouvelle depense'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Intitule" htmlFor={ids.label}>
          <input
            id={ids.label}
            className="field__input"
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Billets de train"
            autoComplete="off"
          />
        </SheetField>

        <div className="field-row">
          <SheetField label="Montant" htmlFor={ids.amount} hint="€">
            <input
              id={ids.amount}
              className="field__input"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="49,90"
            />
          </SheetField>

          <SheetField label="Date" htmlFor={ids.day} hint="facultative">
            <input
              id={ids.day}
              className="field__input"
              type="date"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            />
          </SheetField>
        </div>

        <SheetField label="Categorie" htmlFor={ids.category}>
          <select
            id={ids.category}
            className="field__input field__input--select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </SheetField>

        <div className="field field--switch">
          <label className="switch" htmlFor={ids.paid}>
            <input
              id={ids.paid}
              type="checkbox"
              checked={form.paid}
              onChange={(e) => setForm({ ...form, paid: e.target.checked })}
            />
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            <span className="switch__label">Deja payee</span>
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

      {/* --- Enveloppe prevue ------------------------------------------------ */}
      <EditSheet
        open={editingPlan}
        title="Budget previsionnel"
        error={error}
        busy={busy}
        submitLabel="Enregistrer"
        onSubmit={handleSavePlan}
        onCancel={() => {
          setEditingPlan(false)
          setError(null)
        }}
      >
        <SheetField
          label="Enveloppe prevue"
          htmlFor={ids.plan}
          hint="€ — laisse vide pour ne pas fixer de budget"
        >
          <input
            id={ids.plan}
            className="field__input"
            type="text"
            inputMode="decimal"
            value={planValue}
            onChange={(e) => setPlanValue(e.target.value)}
            placeholder="420"
          />
        </SheetField>
      </EditSheet>
    </>
  )
}
