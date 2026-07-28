import type { ReactElement } from 'react'

/**
 * Illustrations de bandeau, 100% vectorielles et embarquees.
 * Aucune image externe : l'application reste utilisable hors connexion et le
 * poids du bundle ne bouge pas.
 */

export type IllustrationName = 'mer' | 'ville' | 'fete' | 'montagne'

export interface IllustrationProps {
  name?: IllustrationName
  className?: string
}

/** Deduit une illustration a partir d'un champ libre (`illustration:mer`, type d'evenement...). */
export function resolveIllustration(hint?: string): IllustrationName {
  const value = (hint ?? '').toLowerCase()
  if (value.includes('mer') || value.includes('weekend') || value.includes('plage')) return 'mer'
  if (value.includes('ville') || value.includes('voyage')) return 'ville'
  if (value.includes('montagne')) return 'montagne'
  if (
    value.includes('fete') ||
    value.includes('soiree') ||
    value.includes('concert') ||
    value.includes('anniversaire')
  ) {
    return 'fete'
  }
  return 'mer'
}

const SCENES: Record<IllustrationName, ReactElement> = {
  mer: (
    <>
      <defs>
        <linearGradient id="ill-mer-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5D9B3" />
          <stop offset="100%" stopColor="#F2E9DD" />
        </linearGradient>
      </defs>
      <rect width="320" height="140" fill="url(#ill-mer-ciel)" />
      <circle cx="248" cy="44" r="24" fill="#F2CD9F" />
      <path d="M0 96c34-12 58 8 92 0s52-16 84-8 60 20 88 12 56-16 56-16v56H0z" fill="#B6CDD2" />
      <path d="M0 116c40-10 62 8 100 2s58-14 92-6 62 16 88 8 40-10 40-10v30H0z" fill="#9FBEC5" />
      {/* Parasol */}
      <path d="M64 62V98" stroke="#8C6A4F" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 68c0-13 11-22 24-22s24 9 24 22z" fill="#ECC3B7" />
      <path d="M52 68c0-14 5-22 12-22s12 8 12 22z" fill="#FFFDF9" opacity="0.75" />
      <circle cx="128" cy="86" r="7" fill="#ECC3B7" />
      <circle cx="150" cy="90" r="5" fill="#FFFDF9" opacity="0.8" />
    </>
  ),
  ville: (
    <>
      <rect width="320" height="140" fill="#EDE3F0" />
      <circle cx="60" cy="40" r="20" fill="#F2CD9F" opacity="0.85" />
      <g fill="#CBC2DD">
        <rect x="18" y="70" width="42" height="70" rx="5" />
        <rect x="196" y="58" width="38" height="82" rx="5" />
        <rect x="264" y="82" width="40" height="58" rx="5" />
      </g>
      <g fill="#8C6A4F" opacity="0.85">
        <rect x="72" y="46" width="52" height="94" rx="6" />
        <rect x="136" y="86" width="48" height="54" rx="6" />
        <rect x="240" y="66" width="20" height="74" rx="4" />
      </g>
      <g fill="#FAF5EE" opacity="0.75">
        <rect x="84" y="60" width="10" height="12" rx="2" />
        <rect x="102" y="60" width="10" height="12" rx="2" />
        <rect x="84" y="84" width="10" height="12" rx="2" />
        <rect x="102" y="84" width="10" height="12" rx="2" />
        <rect x="148" y="100" width="10" height="12" rx="2" />
        <rect x="166" y="100" width="10" height="12" rx="2" />
      </g>
      <path d="M0 128h320v12H0z" fill="#9A8574" opacity="0.35" />
    </>
  ),
  fete: (
    <>
      <rect width="320" height="140" fill="#F6E7E1" />
      <path
        d="M0 26c26 16 52-16 78 0s52 16 78 0 52-16 78 0 60 8 86-4"
        fill="none"
        stroke="#D9BBAE"
        strokeWidth="3"
      />
      <g>
        <path d="M32 26l-8 20h16z" fill="#BCD0B8" />
        <path d="M88 26l-8 22h16z" fill="#F2CD9F" />
        <path d="M144 26l-8 20h16z" fill="#B6CDD2" />
        <path d="M200 26l-8 22h16z" fill="#CBC2DD" />
        <path d="M256 26l-8 20h16z" fill="#ECC3B7" />
      </g>
      <g fill="#8C6A4F" opacity="0.6">
        <rect x="44" y="96" width="8" height="8" rx="2" transform="rotate(18 48 100)" />
        <rect x="128" y="76" width="7" height="7" rx="2" transform="rotate(-24 131 79)" />
        <rect x="222" y="94" width="8" height="8" rx="2" transform="rotate(35 226 98)" />
      </g>
      {/* Verres leves */}
      <g stroke="#6B4A34" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8">
        <path d="M138 132v-14" />
        <path d="M126 132h24" />
        <path d="M124 92h28l-14 26z" fill="#F2CD9F" fillOpacity="0.55" />
        <path d="M186 132v-14" />
        <path d="M174 132h24" />
        <path d="M172 96h28l-14 22z" fill="#ECC3B7" fillOpacity="0.6" />
      </g>
      <circle cx="86" cy="112" r="12" fill="#F2CD9F" opacity="0.7" />
      <circle cx="264" cy="118" r="16" fill="#BCD0B8" opacity="0.55" />
    </>
  ),
  montagne: (
    <>
      <rect width="320" height="140" fill="#E4EDE9" />
      <circle cx="252" cy="38" r="18" fill="#F2CD9F" opacity="0.9" />
      <path d="M0 140 88 44l58 62 34-30 60 64z" fill="#9A8574" opacity="0.55" />
      <path d="M52 140 148 40l96 100z" fill="#6B4A34" opacity="0.75" />
      <path d="M126 68l22 -28 22 28-16-6-12 8z" fill="#FFFDF9" />
      <path d="M0 132h320v8H0z" fill="#C4DBCD" />
    </>
  ),
}

/** Bandeau illustre, recadre en `slice` pour remplir n'importe quel format. */
export function Illustration({ name = 'mer', className }: IllustrationProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 140"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {SCENES[name]}
    </svg>
  )
}
