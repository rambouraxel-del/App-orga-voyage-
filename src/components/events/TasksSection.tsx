import { useId, useState } from 'react'
import { Icon } from '@/components/icons/Icon'
import { Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { tasksRepository } from '@/db/repositories'
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type EventTask, type TaskDraft } from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { formatShortDate, toDayInput } from '@/utils/date'
import { computeProgress, moveTask, taskState } from '@/utils/taskRules'
import { ModuleSection } from './ModuleSection'

interface FormState {
  title: string
  dueDay: string
  priority: string
  note: string
}

const emptyForm = (): FormState => ({ title: '', dueDay: '', priority: 'normale', note: '' })

const STATE_LABELS: Record<string, string> = {
  'en-retard': 'En retard',
  aujourdhui: "Aujourd'hui",
}

export function TasksSection({ eventId, tasks }: { eventId: string; tasks: EventTask[] }) {
  const [editing, setEditing] = useState<EventTask | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = { title: useId(), due: useId(), priority: useId(), note: useId() }

  const progress = computeProgress(tasks)
  const open = creating || editing !== null

  function startCreate() {
    setForm(emptyForm())
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(task: EventTask) {
    setForm({
      title: task.title,
      dueDay: toDayInput(task.dueDate),
      priority: task.priority,
      note: task.note ?? '',
    })
    setCreating(false)
    setError(null)
    setEditing(task)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.title.trim().length === 0) {
      setError('Donne un titre a cette tache.')
      return
    }
    setBusy(true)
    try {
      const draft: TaskDraft = {
        title: form.title.trim(),
        priority: form.priority as TaskDraft['priority'],
        done: editing?.done ?? false,
        // Une echeance a la journee : minuit local suffit, l'heure n'a pas de sens ici.
        ...(form.dueDay ? { dueDate: new Date(`${form.dueDay}T00:00:00`).toISOString() } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }
      if (editing) {
        // `dueDate` et `note` doivent pouvoir etre EFFACES : on les passe
        // explicitement, sinon le spread laisserait l'ancienne valeur.
        await tasksRepository.update(editing.id, {
          ...draft,
          dueDate: draft.dueDate,
          note: draft.note,
        })
      } else {
        await tasksRepository.create(eventId, draft)
      }
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('tache')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await tasksRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_DELETE('tache')))
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(task: EventTask) {
    try {
      await tasksRepository.toggle(task.id)
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('tache')))
    }
  }

  async function handleMove(task: EventTask, direction: -1 | 1) {
    try {
      await tasksRepository.reorder(moveTask(tasks, task.id, direction))
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('tache')))
    }
  }

  return (
    <>
      <ModuleSection
        id="organisation"
        title="Organisation"
        icon="cases"
        addLabel="Ajouter une tache"
        onAdd={startCreate}
        isEmpty={tasks.length === 0}
        emptyText="Aucune tache pour l’instant. Ajoute ce qu’il reste a preparer."
        summary={
          progress.total > 0 ? (
            <>
              <div className="progress">
                <div
                  className="progress__fill"
                  style={{ width: `${progress.percent}%` }}
                  role="img"
                  aria-label={`${progress.done} tache${progress.done > 1 ? 's' : ''} terminee${progress.done > 1 ? 's' : ''} sur ${progress.total}`}
                />
              </div>
              <p className="module__summary-text">
                {progress.done}/{progress.total} terminees · {progress.percent} %
                {progress.overdue > 0 ? (
                  <span className="module__summary-alert"> · {progress.overdue} en retard</span>
                ) : null}
              </p>
            </>
          ) : null
        }
      >
        <ul className="task-list">
          {tasks.map((task, index) => {
            const state = taskState(task)
            return (
              <li
                key={task.id}
                className={['task', task.done ? 'task--done' : '', state === 'en-retard' ? 'task--late' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="task__check"
                  onClick={() => handleToggle(task)}
                  aria-pressed={task.done}
                  aria-label={task.done ? `Decocher ${task.title}` : `Cocher ${task.title}`}
                >
                  {task.done ? <Icon name="valide" size={18} /> : null}
                </button>

                <button type="button" className="task__body" onClick={() => startEdit(task)}>
                  <span className="task__title">{task.title}</span>
                  <span className="task__meta">
                    {task.dueDate ? formatShortDate(task.dueDate) : 'Sans echeance'}
                    {task.priority === 'haute' ? ' · Priorite haute' : ''}
                  </span>
                </button>

                {STATE_LABELS[state] ? (
                  <Badge tone={state === 'en-retard' ? 'blush' : 'apricot'}>
                    {STATE_LABELS[state]}
                  </Badge>
                ) : null}

                <span className="task__move">
                  <button
                    type="button"
                    onClick={() => handleMove(task, -1)}
                    disabled={index === 0}
                    aria-label={`Remonter ${task.title}`}
                  >
                    <Icon name="monter" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(task, 1)}
                    disabled={index === tasks.length - 1}
                    aria-label={`Descendre ${task.title}`}
                  >
                    <Icon name="descendre" size={15} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </ModuleSection>

      <EditSheet
        open={open}
        title={editing ? 'Modifier la tache' : 'Nouvelle tache'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Titre" htmlFor={ids.title}>
          <input
            id={ids.title}
            className="field__input"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Reserver le train"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Echeance" htmlFor={ids.due} hint="facultative">
          <input
            id={ids.due}
            className="field__input"
            type="date"
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
          />
        </SheetField>

        <SheetField label="Priorite" htmlFor={ids.priority}>
          <select
            id={ids.priority}
            className="field__input field__input--select"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
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
    </>
  )
}
