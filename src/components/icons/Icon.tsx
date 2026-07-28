import { ICONS, type IconName, type IconShape } from './paths'

export interface IconProps {
  name: IconName
  /** Taille en pixels (carre). */
  size?: number
  strokeWidth?: number
  className?: string
  /** Libelle accessible. Sans lui, l'icone est purement decorative. */
  title?: string
}

function renderShape(shape: IconShape, index: number) {
  switch (shape.kind) {
    case 'path':
      return <path key={index} d={shape.d} />
    case 'circle':
      return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} />
    case 'rect':
      return (
        <rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} />
      )
    case 'dot':
      return (
        <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r ?? 1} fill="currentColor" stroke="none" />
      )
  }
}

/** Icone vectorielle monochrome, coloree par `currentColor`. */
export function Icon({ name, size = 22, strokeWidth = 1.7, className, title }: IconProps) {
  const shapes: readonly IconShape[] = ICONS[name]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {shapes.map(renderShape)}
    </svg>
  )
}
