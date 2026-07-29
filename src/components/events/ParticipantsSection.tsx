import { useId, useState } from 'react'
import { Badge } from '@/components/ui'
import { EditSheet, SheetField } from '@/components/ui/EditSheet'
import { participantsRepository } from '@/db/repositories'
import {
  PARTICIPANT_STATUSES,
  PARTICIPANT_STATUS_LABELS,
  type Participant,
  type ParticipantDraft,
  type ParticipantStatus,
} from '@/models'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { ModuleSection } from './ModuleSection'
import type { BadgeTone } from '@/components/ui/Badge'

const STATUS_TONES: Record<ParticipantStatus, BadgeTone> = {
  invite: 'sky',
  confirme: 'sage',
  incertain: 'apricot',
  absent: 'blush',
}

interface FormState {
  name: string
  contact: string
  status: string
  note: string
}

const emptyForm = (): FormState => ({ name: '', contact: '', status: 'invite', note: '' })

/** Repartition par statut, dans l'ordre des statuts declares. */
export function countByStatus(participants: Participant[]): Array<[ParticipantStatus, number]> {
  return PARTICIPANT_STATUSES.map(
    (status) => [status, participants.filter((p) => p.status === status).length] as const,
  ).filter(([, count]) => count > 0) as Array<[ParticipantStatus, number]>
}

export function ParticipantsSection({
  eventId,
  participants,
}: {
  eventId: string
  participants: Participant[]
}) {
  const [editing, setEditing] = useState<Participant | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = { name: useId(), contact: useId(), status: useId(), note: useId() }

  const distribution = countByStatus(participants)

  function startCreate() {
    setForm(emptyForm())
    setEditing(null)
    setError(null)
    setCreating(true)
  }

  function startEdit(participant: Participant) {
    setForm({
      name: participant.name,
      contact: participant.contact ?? '',
      status: participant.status,
      note: participant.note ?? '',
    })
    setCreating(false)
    setError(null)
    setEditing(participant)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit() {
    if (form.name.trim().length === 0) {
      setError('Indique au moins un nom.')
      return
    }
    setBusy(true)
    try {
      const draft: ParticipantDraft = {
        name: form.name.trim(),
        status: form.status as ParticipantStatus,
        ...(form.contact.trim() ? { contact: form.contact.trim() } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }
      if (editing) {
        await participantsRepository.update(editing.id, {
          ...draft,
          contact: draft.contact,
          note: draft.note,
        })
      } else {
        await participantsRepository.create(eventId, draft)
      }
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_UPDATE('participant')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setBusy(true)
    try {
      await participantsRepository.remove(editing.id)
      close()
    } catch (cause) {
      setError(toUserMessage(cause, ERROR_MESSAGES.MODULE_DELETE('participant')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ModuleSection
        id="participants"
        title="Participants"
        icon="participants"
        addLabel="Ajouter un participant"
        onAdd={startCreate}
        isEmpty={participants.length === 0}
        emptyText="Personne d’ajoute. Note qui vient pour garder le compte."
        summary={
          participants.length > 0 ? (
            <>
              <p className="module__summary-text">
                {participants.length} personne{participants.length > 1 ? 's' : ''}
              </p>
              <div className="badge-row">
                {distribution.map(([status, count]) => (
                  <Badge key={status} tone={STATUS_TONES[status]}>
                    {count} {PARTICIPANT_STATUS_LABELS[status].toLowerCase()}
                  </Badge>
                ))}
              </div>
            </>
          ) : null
        }
      >
        <ul className="row-list">
          {participants.map((participant) => (
            <li key={participant.id}>
              <button type="button" className="row" onClick={() => startEdit(participant)}>
                <span className="row__body">
                  <span className="row__title">{participant.name}</span>
                  {participant.contact ? (
                    <span className="row__meta">{participant.contact}</span>
                  ) : null}
                </span>
                <Badge tone={STATUS_TONES[participant.status]}>
                  {PARTICIPANT_STATUS_LABELS[participant.status]}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </ModuleSection>

      <EditSheet
        open={creating || editing !== null}
        title={editing ? 'Modifier le participant' : 'Nouveau participant'}
        error={error}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={close}
        {...(editing ? { onDelete: handleDelete } : {})}
      >
        <SheetField label="Nom" htmlFor={ids.name}>
          <input
            id={ids.name}
            className="field__input"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Camille"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Coordonnees" htmlFor={ids.contact} hint="facultatives">
          <input
            id={ids.contact}
            className="field__input"
            type="text"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="06 12 34 56 78"
            autoComplete="off"
          />
        </SheetField>

        <SheetField label="Statut" htmlFor={ids.status}>
          <select
            id={ids.status}
            className="field__input field__input--select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {PARTICIPANT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PARTICIPANT_STATUS_LABELS[status]}
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
