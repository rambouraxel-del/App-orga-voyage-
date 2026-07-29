import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { DocumentSheet } from '@/components/documents/DocumentSheet'
import { Icon } from '@/components/icons/Icon'
import { Alert, Button, PageHeader, SkeletonBlock, StateBlock } from '@/components/ui'
import { STORAGE_WARNING_THRESHOLD } from '@/config/documents'
import { documentsRepository, eventsRepository } from '@/db/repositories'
import { useLiveData } from '@/hooks/useLiveData'
import { useStorageEstimate } from '@/hooks/useStorageEstimate'
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from '@/models'
import { normalize } from '@/utils/eventRules'
import { formatFileSize } from '@/utils/fileRules'

/** Vues proposees. */
const VIEWS = [
  { key: 'a-venir', label: 'A venir' },
  { key: 'tous', label: 'Tous' },
  { key: 'archives', label: 'Archives' },
] as const

type View = (typeof VIEWS)[number]['key']

const SORTS = [
  { key: 'date', label: 'Date utile' },
  { key: 'nom', label: 'Nom' },
  { key: 'recent', label: 'Ajout recent' },
] as const

type Sort = (typeof SORTS)[number]['key']

const isView = (value: string | null): value is View => VIEWS.some((v) => v.key === value)
const isCategory = (value: string | null): value is DocumentCategory =>
  (DOCUMENT_CATEGORIES as readonly string[]).includes(value ?? '')

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('date')
  const [sheetOpen, setSheetOpen] = useState(false)

  const view: View = isView(searchParams.get('vue')) ? (searchParams.get('vue') as View) : 'a-venir'
  const category = isCategory(searchParams.get('categorie'))
    ? (searchParams.get('categorie') as DocumentCategory)
    : null
  const eventFilter = searchParams.get('evenement')

  const { data, loading, error } = useLiveData(async () => {
    const [documents, events] = await Promise.all([
      documentsRepository.listAll(),
      eventsRepository.listAll(),
    ])
    return {
      documents,
      events,
      titleById: new Map(events.map((event) => [event.id, event.title])),
      totalSize: documents.reduce((sum, document) => sum + (document.size || 0), 0),
    }
  })

  // L'estimation est relue a chaque variation du volume stocke.
  const storage = useStorageEstimate([data?.totalSize])

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const visible = useMemo(() => {
    if (!data) return []
    const needle = normalize(query)

    return data.documents
      .filter((document) => {
        if (view === 'archives' && !document.archived) return false
        if (view !== 'archives' && document.archived) return false
        if (view === 'a-venir' && document.usefulDate) {
          // « A venir » masque ce qui est deja passe, mais garde les documents
          // sans date : un passeport n'a pas d'echeance imminente.
          if (new Date(document.usefulDate).getTime() < Date.now() - 86_400_000) return false
        }
        if (category && document.category !== category) return false
        if (eventFilter && document.eventId !== eventFilter) return false
        if (needle.length === 0) return true

        const eventTitle = document.eventId ? (data.titleById.get(document.eventId) ?? '') : ''
        return [document.title, document.note ?? '', eventTitle]
          .map(normalize)
          .some((haystack) => haystack.includes(needle))
      })
      .sort((a, b) => {
        if (sort === 'nom') return a.title.localeCompare(b.title, 'fr')
        if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt)
        return (a.usefulDate ?? '9999').localeCompare(b.usefulDate ?? '9999')
      })
  }, [data, view, category, eventFilter, query, sort])

  const filtersActive = category !== null || eventFilter !== null || query.trim().length > 0

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Billets, reservations et papiers de voyage, disponibles hors connexion."
        action={
          <Button variant="primary" icon="plus" onClick={() => setSheetOpen(true)}>
            Ajouter
          </Button>
        }
      />

      {loading ? (
        <div className="stack--lg stack section">
          <SkeletonBlock height={120} />
          <SkeletonBlock height={120} />
        </div>
      ) : error || !data ? (
        <StateBlock error title="Documents indisponibles" text={error ?? undefined} />
      ) : data.documents.length === 0 ? (
        <StateBlock
          icon="dossier"
          title="Ta bibliotheque est vide"
          text="Importe ton premier billet ou ta premiere reservation : il restera disponible hors connexion, le jour du depart."
          action={
            <Button variant="primary" icon="plus" onClick={() => setSheetOpen(true)}>
              Ajouter un document
            </Button>
          }
        />
      ) : (
        <>
          {/* --- Recherche ------------------------------------------------ */}
          <div className="search-field">
            <Icon name="recherche" size={18} className="search-field__icon" />
            <input
              type="search"
              className="search-field__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un titre, une note, un evenement…"
              aria-label="Rechercher un document"
              enterKeyHint="search"
            />
            {query ? (
              <button
                type="button"
                className="search-field__clear"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
              >
                <Icon name="fermer" size={16} />
              </button>
            ) : null}
          </div>

          {/* --- Vues ------------------------------------------------------- */}
          <div className="segmented" role="group" aria-label="Vue">
            {VIEWS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={['segmented__option', view === item.key ? 'is-active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={view === item.key}
                onClick={() => updateParam('vue', item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* --- Categories --------------------------------------------------- */}
          <div className="chip-row" role="group" aria-label="Filtrer par categorie">
            <button
              type="button"
              className={['chip', category === null ? 'is-active' : ''].filter(Boolean).join(' ')}
              aria-pressed={category === null}
              onClick={() => updateParam('categorie', null)}
            >
              Toutes
            </button>
            {DOCUMENT_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={['chip', category === item ? 'is-active' : ''].filter(Boolean).join(' ')}
                aria-pressed={category === item}
                onClick={() => updateParam('categorie', category === item ? null : item)}
              >
                {DOCUMENT_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>

          {/* --- Evenement + tri ------------------------------------------------ */}
          <div className="filter-row">
            <label className="filter-row__field">
              <span className="visually-hidden">Filtrer par evenement</span>
              <select
                className="field__input field__input--select"
                value={eventFilter ?? ''}
                onChange={(e) => updateParam('evenement', e.target.value || null)}
              >
                <option value="">Tous les evenements</option>
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-row__field">
              <span className="visually-hidden">Trier</span>
              <select
                className="field__input field__input--select"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
              >
                {SORTS.map((item) => (
                  <option key={item.key} value={item.key}>
                    Tri : {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* --- Stockage --------------------------------------------------------- */}
          <p className="result-count" aria-live="polite">
            {visible.length} document{visible.length > 1 ? 's' : ''} ·{' '}
            {formatFileSize(data.totalSize)}
            {storage.usage !== null ? ` · ~${formatFileSize(storage.usage)} utilises` : ''}
          </p>

          {data.totalSize > STORAGE_WARNING_THRESHOLD ? (
            <Alert tone="info">
              Tes documents occupent {formatFileSize(data.totalSize)}. Pense a archiver ou supprimer
              ceux dont tu n’as plus besoin, et a exporter une sauvegarde.
            </Alert>
          ) : null}

          {/* --- Resultats ---------------------------------------------------------- */}
          {visible.length === 0 ? (
            <div className="section">
              <StateBlock
                icon="recherche"
                title="Aucun resultat"
                text={
                  filtersActive
                    ? 'Aucun document ne correspond a ta recherche et a tes filtres.'
                    : view === 'archives'
                      ? 'Aucun document archive.'
                      : 'Aucun document a venir.'
                }
                {...(filtersActive
                  ? {
                      action: (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setQuery('')
                            updateParam('categorie', null)
                            updateParam('evenement', null)
                          }}
                        >
                          Effacer les filtres
                        </Button>
                      ),
                    }
                  : {})}
              />
            </div>
          ) : (
            <section className="section">
              <div className="stack--lg stack">
                {visible.map((document) => {
                  const eventTitle = document.eventId
                    ? data.titleById.get(document.eventId)
                    : undefined
                  return (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      {...(eventTitle ? { eventTitle } : {})}
                    />
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <DocumentSheet
        open={sheetOpen}
        events={data?.events ?? []}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
