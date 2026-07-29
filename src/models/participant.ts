import type { EntityId, Timestamped } from './common'

/**
 * Statut de participation.
 * V0.3 : purement declaratif — aucune invitation reelle n'est envoyee, aucun
 * compte n'est cree. L'utilisateur note simplement qui vient.
 */
export const PARTICIPANT_STATUSES = ['invite', 'confirme', 'incertain', 'absent'] as const

export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number]

export interface Participant extends Timestamped {
  id: EntityId
  /** Evenement parent. Supprime en cascade avec lui. */
  eventId: EntityId
  name: string
  /** Coordonnees libres (telephone, e-mail, pseudo...). Aucun format impose. */
  contact?: string
  status: ParticipantStatus
  note?: string
}

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  invite: 'Invite',
  confirme: 'Confirme',
  incertain: 'Incertain',
  absent: 'Absent',
}

export type ParticipantDraft = Pick<Participant, 'name' | 'status'> &
  Partial<Pick<Participant, 'contact' | 'note'>>
