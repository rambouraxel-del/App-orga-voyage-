import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TripForm } from '@/components/trips/TripForm'
import { Button, PageHeader, SkeletonBlock, StateBlock } from '@/components/ui'
import { tripsRepository } from '@/db/repositories'
import type { TripDraft } from '@/models'
import { ROUTES, tripDetailPath } from '@/navigation/routes'
import { ERROR_MESSAGES, toUserMessage } from '@/services/errors'
import { emptyTripValues, tripValuesFrom, type TripFormValues } from '@/utils/tripValidation'

/**
 * Page de saisie d'un voyage : creation (`/voyages/nouveau`) et modification
 * (`/voyages/<id>/modifier`). L'evenement porteur est cree ou synchronise par
 * le repository, jamais ici.
 */
export function TripFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [initialValues, setInitialValues] = useState<TripFormValues | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        if (id) {
          const trip = await tripsRepository.getByIdOrFail(id)
          if (active) setInitialValues(tripValuesFrom(trip))
        } else if (active) {
          setInitialValues(emptyTripValues())
        }
      } catch (cause) {
        if (active) setLoadError(toUserMessage(cause, ERROR_MESSAGES.TRIP_NOT_FOUND))
      }
    })()

    return () => {
      active = false
    }
  }, [id])

  async function handleSubmit(draft: TripDraft) {
    setSubmitError(null)
    setBusy(true)
    try {
      const saved = id
        ? await tripsRepository.update(id, draft)
        : await tripsRepository.create(draft)
      navigate(tripDetailPath(saved.id), { replace: true })
    } catch (cause) {
      setSubmitError(toUserMessage(cause, ERROR_MESSAGES.TRIP_SAVE))
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Voyage introuvable" onBack={() => navigate(ROUTES.trips)} />
        <StateBlock
          error
          title="Impossible d’ouvrir ce voyage"
          text={loadError}
          action={
            <Button variant="secondary" onClick={() => navigate(ROUTES.trips)}>
              Voir tous les voyages
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={id ? 'Modifier le voyage' : 'Nouveau voyage'}
        subtitle={
          id
            ? 'Les dates et le titre sont repercutes sur l’agenda.'
            : 'Titre, destination et dates suffisent pour commencer.'
        }
        onBack={() => navigate(-1)}
      />
      {initialValues ? (
        <TripForm
          initialValues={initialValues}
          submitLabel={id ? 'Enregistrer les modifications' : 'Creer le voyage'}
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
