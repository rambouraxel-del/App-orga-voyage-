import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons/Icon'
import { Badge, IconChip } from '@/components/ui'
import { DOCUMENT_VISUALS } from '@/config/visuals'
import { DOCUMENT_CATEGORY_LABELS, type TravelDocument } from '@/models'
import { documentDetailPath } from '@/navigation/routes'
import { formatShortDate } from '@/utils/date'
import { formatFileSize } from '@/utils/fileRules'

export interface DocumentCardProps {
  document: TravelDocument
  /** Titre de l'evenement associe, s'il existe. */
  eventTitle?: string
}

export function DocumentCard({ document, eventTitle }: DocumentCardProps) {
  const visual = DOCUMENT_VISUALS[document.category]
  const hasFile = document.size > 0

  return (
    <Link
      to={documentDetailPath(document.id)}
      className={['entity-card', 'entity-card--link', document.archived ? 'entity-card--past' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label={`Ouvrir ${document.title}`}
    >
      <div className="entity-card__head">
        <IconChip icon={visual.icon} tone={visual.tone} />
        <div className="entity-card__heading">
          <h3 className="entity-card__title">{document.title}</h3>
          <p className="entity-card__subtitle">
            {DOCUMENT_CATEGORY_LABELS[document.category]}
            {hasFile ? ` · ${formatFileSize(document.size)}` : ' · sans fichier'}
          </p>
        </div>
        <Icon name="chevron" size={17} className="entity-card__chevron" />
      </div>

      {eventTitle ? (
        <p className="meta-row meta-row--compact">
          <Icon name="etoiles" size={16} className="meta-row__icon" />
          <span className="meta-row__text">{eventTitle}</span>
        </p>
      ) : null}

      <div className="entity-card__footer">
        {document.usefulDate ? (
          <Badge tone="sky">{formatShortDate(document.usefulDate)}</Badge>
        ) : null}
        {document.archived ? <Badge>Archive</Badge> : null}
        {/* Une fiche sans fichier vient d'une version anterieure ou d'une
            restauration incomplete : on le signale plutot que de le taire. */}
        {!hasFile ? <Badge tone="blush">Fichier manquant</Badge> : null}
      </div>
    </Link>
  )
}
