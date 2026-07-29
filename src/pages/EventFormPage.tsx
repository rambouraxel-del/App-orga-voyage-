import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EventForm } from '@/components/events/EventForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, SkeletonBlock, StateBlock } from '@/components/ui'
import { eventsRepository } from '@/db/repositories'
import type { EventDraft } from '@/models'
import { ROUTES, eventDetailPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { emptyFormValues, formValuesFromDuplicate, formValuesFromEvent } from '@/utils/eventForm'
import type { EventFormValues } from '@/utils/eventValidation'

type Mode = 'creation' | 'modification' | 'duplication'

/**
 * Page unique de saisie, utilisee pour les trois parcours :
 * - creation           `/evenements/nouveau`
 * - duplication        `/evenements/nouveau?copie=<id>`
 * - modification       `/evenements/<id>/modifier`
 *
 * Le formulaire lui-meme est mutualise ; seule la preparation des valeurs
 * initiales et l'action d'enregistrement changent.
 */
export function EventFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const duplicateOf = searchParams.get('copie')
  const preselectedDay = searchParams.get('jour') ?? undefined
  const mode: Mode = id ? 'modification' : duplicateOf ? 'duplication' : 'creation'

  const [initialValues, setInitialValues] = useState<EventFormValues | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Chargement des valeurs initiales (une seule fois par cible).
  useEffect(() => {
    let active = true

    void (async () => {
      try {
        if (id) {
          const event = await eventsRepository.getByIdOrFail(id)
          if (active) setInitialValues(formValuesFromEvent(event))
        } else if (duplicateOf) {
          const source = await eventsRepository.getByIdOrFail(duplicateOf)
          if (active) setInitialValues(formValuesFromDuplicate(source))
        } else if (active) {
          setInitialValues(emptyFormValues(preselectedDay))
        }
      } catch (cause) {
        if (active) setLoadError(toUserMessage(cause, ERROR_MESSAGES.EVENT_NOT_FOUND))
      }
    })()

    return () => {
      active = false
    }
  }, [id, duplicateOf, preselectedDay])

  async function handleSubmit(draft: EventDraft) {
    setSubmitError(null)
    setBusy(true)
    try {
      const saved = id
        ? await eventsRepository.update(id, draft)
        : await eventsRepository.create(draft)
      // `replace` : le retour arriere ne doit pas ramener sur le formulaire.
      navigate(eventDetailPath(saved.id), { replace: true })
    } catch (cause) {
      setSubmitError(
        toUserMessage(cause, id ? ERROR_MESSAGES.EVENT_UPDATE : ERROR_MESSAGES.EVENT_CREATE),
      )
      setBusy(false)
    }
  }

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    creation: { title: 'Nouvel evenement', subtitle: 'Seuls le titre et la date sont requis.' },
    duplication: {
      title: 'Dupliquer',
      subtitle: 'Ajuste ce que tu veux : l’evenement d’origine reste intact.',
    },
    modification: { title: 'Modifier', subtitle: 'Mets a jour les informations de l’evenement.' },
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Evenement introuvable" onBack={() => navigate(ROUTES.events)} />
        <StateBlock
          error
          title="Impossible d’ouvrir cet evenement"
          text={loadError}
          action={
            <Button variant="secondary" onClick={() => navigate(ROUTES.events)}>
              Voir tous les evenements
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={titles[mode].title}
        subtitle={titles[mode].subtitle}
        onBack={() => navigate(-1)}
      />
      {initialValues ? (
        <EventForm
          initialValues={initialValues}
          submitLabel={mode === 'modification' ? 'Enregistrer les modifications' : 'Creer l’evenement'}
          submitError={submitError}
          busy={busy}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      ) : (
        <div className="stack--lg stack">
          <SkeletonBlock height={72} />
          <SkeletonBlock height={72} />
          <SkeletonBlock height={140} />
        </div>
      )}
    </>
  )
}
