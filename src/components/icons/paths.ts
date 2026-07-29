/**
 * Jeu d'icones maison — traits arrondis, esprit convivial.
 * Chaque entree est une liste d'elements SVG decrits en donnees, dessines dans
 * un viewBox 24x24 par le composant `<Icon />`.
 */

export type IconShape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { kind: 'dot'; cx: number; cy: number; r?: number }

const path = (d: string): IconShape => ({ kind: 'path', d })
const circle = (cx: number, cy: number, r: number): IconShape => ({ kind: 'circle', cx, cy, r })
const rect = (x: number, y: number, w: number, h: number, rx: number): IconShape => ({
  kind: 'rect',
  x,
  y,
  w,
  h,
  rx,
})
const dot = (cx: number, cy: number, r = 1): IconShape => ({ kind: 'dot', cx, cy, r })

export const ICONS = {
  /* --- Navigation --------------------------------------------------- */
  maison: [
    path('M3 10.6 12 3.4l9 7.2'),
    path('M5.6 9.5V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V9.5'),
    path('M9.8 20.6v-5.2a2.2 2.2 0 0 1 4.4 0v5.2'),
  ],
  calendrier: [
    rect(3, 5, 18, 16, 3),
    path('M8 3v4'),
    path('M16 3v4'),
    path('M3 10.4h18'),
    dot(8.2, 14.4, 0.9),
    dot(12, 14.4, 0.9),
    dot(15.8, 14.4, 0.9),
  ],
  etoiles: [
    path('M11.6 3.4 13.4 8l4.6 1.8-4.6 1.8-1.8 4.6-1.8-4.6L5.2 9.8 9.8 8z'),
    path('M18.4 14.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'),
  ],
  avion: [
    path(
      'M17.6 19.4 15.9 11.7l3.3-3.3c1.4-1.4 1.9-3.3 1.4-4.2-.9-.5-2.8 0-4.2 1.4l-3.3 3.3L5.4 7.2c-.5-.1-.9.1-1.1.5l-.2.4c-.2.4-.1.9.3 1.2l4.9 3.5-1.9 2.8H4.6l-1 .9 2.8 1.9 1.9 2.8.9-1v-2.8l2.8-1.9 3.3 5c.3.4.8.5 1.2.3l.4-.2c.4-.2.6-.6.5-1.1z',
    ),
  ],
  sauvegarde: [
    path('M3.2 7.6 4.4 5.3A2 2 0 0 1 6.2 4.2h11.6a2 2 0 0 1 1.8 1.1l1.2 2.3'),
    rect(3.2, 7.6, 17.6, 12.2, 2.6),
    path('M9.6 12.2h4.8'),
  ],

  /* --- Loisirs & voyages -------------------------------------------- */
  valise: [
    rect(2.6, 7.2, 18.8, 13.4, 3),
    path('M8.4 7.2V5.4a2 2 0 0 1 2-2h3.2a2 2 0 0 1 2 2v1.8'),
    path('M2.6 12.6h18.8'),
  ],
  cocktail: [
    path('M4.8 3.6h14.4L12 11.8z'),
    path('M12 11.8v7.6'),
    path('M8.2 20.4h7.6'),
    dot(15.4, 6.6, 1.1),
  ],
  musique: [
    path('M9.2 17.8V5.4l11-2v11.6'),
    circle(6.4, 17.8, 2.8),
    circle(17.4, 15.4, 2.8),
  ],
  cadeau: [
    rect(3, 8.2, 18, 4.4, 1.6),
    path('M12 8.2v12.4'),
    path('M19 12.6v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6'),
    path('M7.6 8.2a2.6 2.6 0 0 1 0-5.2C11.2 3 12 8.2 12 8.2'),
    path('M16.4 8.2a2.6 2.6 0 0 0 0-5.2C12.8 3 12 8.2 12 8.2'),
  ],
  portefeuille: [
    rect(3, 5.8, 18, 14, 3),
    path('M15.6 12.6H21v4.2h-5.4a2.1 2.1 0 0 1 0-4.2z'),
    path('M3 10.2h13'),
  ],
  ticket: [
    path(
      'M3 9.4a2.6 2.6 0 0 1 0 5.2v2.2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.2a2.6 2.6 0 0 1 0-5.2V7.2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z',
    ),
    path('M13.6 5.6v2'),
    path('M13.6 11v2'),
    path('M13.6 16.4v2'),
  ],
  localisation: [
    path('M20 10.4c0 5.8-8 11.8-8 11.8s-8-6-8-11.8a8 8 0 1 1 16 0z'),
    circle(12, 10.2, 2.9),
  ],
  document: [
    path('M14 3.2H7.4a2.2 2.2 0 0 0-2.2 2.2v13.2a2.2 2.2 0 0 0 2.2 2.2h9.2a2.2 2.2 0 0 0 2.2-2.2V8.2z'),
    path('M14 3.2v5h4.8'),
    path('M8.6 13.4h6.8'),
    path('M8.6 17h4.4'),
  ],
  boussole: [
    circle(12, 12, 8.8),
    path('M15.6 8.4l-2.2 5.2-5.2 2.2 2.2-5.2z'),
  ],

  /* --- Interface ------------------------------------------------------ */
  cloche: [
    path('M18 9.6a6 6 0 1 0-12 0c0 5.6-2.4 6.8-2.4 6.8h16.8S18 15.2 18 9.6z'),
    path('M13.7 19.8a2 2 0 0 1-3.4 0'),
  ],
  participants: [
    path('M15.6 20.8v-1.9a3.8 3.8 0 0 0-3.8-3.8H6.4a3.8 3.8 0 0 0-3.8 3.8v1.9'),
    circle(9.1, 7.4, 3.8),
    path('M21.4 20.8v-1.9a3.8 3.8 0 0 0-2.9-3.7'),
    path('M15.6 3.7a3.8 3.8 0 0 1 0 7.4'),
  ],
  horloge: [circle(12, 12, 8.8), path('M12 6.9V12l3.4 2')],
  telecharger: [
    path('M12 3.4v11.4'),
    path('M7.6 10.6 12 15l4.4-4.4'),
    path('M4.2 17v2.4a1.6 1.6 0 0 0 1.6 1.6h12.4a1.6 1.6 0 0 0 1.6-1.6V17'),
  ],
  importer: [
    path('M12 15V3.6'),
    path('M7.6 8 12 3.6 16.4 8'),
    path('M4.2 17v2.4a1.6 1.6 0 0 0 1.6 1.6h12.4a1.6 1.6 0 0 0 1.6-1.6V17'),
  ],
  valide: [circle(12, 12, 8.8), path('M8.2 12.4 10.9 15.1 15.9 9.5')],
  attention: [circle(12, 12, 8.8), path('M12 7.4v5.4'), dot(12, 16.2, 0.95)],
  info: [circle(12, 12, 8.8), path('M12 11.2v5.4'), dot(12, 7.8, 0.95)],
  cadenas: [
    rect(4.6, 10.4, 14.8, 10.2, 2.6),
    path('M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6'),
    dot(12, 15.4, 1.1),
  ],
  ajouter: [circle(12, 12, 8.8), path('M12 8.2v7.6'), path('M8.2 12h7.6')],
  plus: [path('M12 5.2v13.6'), path('M5.2 12h13.6')],
  recherche: [circle(11, 11, 6.8), path('M16.2 16.2 20.8 20.8')],
  crayon: [
    path('M4 20.2h4.2L19.4 9a2.1 2.1 0 0 0 0-3l-1.4-1.4a2.1 2.1 0 0 0-3 0L3.8 15.8V20.2z'),
    path('M14.6 6.2 17.8 9.4'),
  ],
  copier: [
    rect(8.4, 3.2, 12.4, 12.4, 2.4),
    path('M15.6 18.4v2.2a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2V9.4a2 2 0 0 1 2-2h2.2'),
  ],
  corbeille: [
    path('M3.8 6.4h16.4'),
    path('M8.4 6.4V4.8a1.8 1.8 0 0 1 1.8-1.8h3.6a1.8 1.8 0 0 1 1.8 1.8v1.6'),
    path('M6 6.4v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-13'),
    path('M10.2 11v6'),
    path('M13.8 11v6'),
  ],
  dossier: [
    path('M3.2 7.4a2 2 0 0 1 2-2h4l2 2.4h7.6a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2z'),
    path('M3.2 11h17.6'),
  ],
  reglages: [
    circle(12, 12, 3.2),
    path(
      'M19.2 14.4a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.97H3.4a1.9 1.9 0 1 1 0-3.8h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.76.32h.08a1.6 1.6 0 0 0 .97-1.47V3.4a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.46.97z',
    ),
  ],
  monter: [path('M12 19V5'), path('M6.2 10.8 12 5l5.8 5.8')],
  descendre: [path('M12 5v14'), path('M6.2 13.2 12 19l5.8-5.8')],
  cases: [
    path('M4 7.2 6.2 9.4 10 5.6'),
    path('M4 16.4 6.2 18.6 10 14.8'),
    path('M13 7.4h7.2'),
    path('M13 16.6h7.2'),
  ],
  fermer: [path('M6.2 6.2 17.8 17.8'), path('M17.8 6.2 6.2 17.8')],
  filtre: [path('M3.4 5.6h17.2'), path('M6.6 12h10.8'), path('M10 18.4h4')],
  liste: [
    path('M8.6 6.4h11.8'),
    path('M8.6 12h11.8'),
    path('M8.6 17.6h11.8'),
    dot(4.4, 6.4, 1.1),
    dot(4.4, 12, 1.1),
    dot(4.4, 17.6, 1.1),
  ],
  grille: [
    rect(3.6, 3.6, 7, 7, 2),
    rect(13.4, 3.6, 7, 7, 2),
    rect(3.6, 13.4, 7, 7, 2),
    rect(13.4, 13.4, 7, 7, 2),
  ],
  precedent: [path('M14.6 5.4 8 12l6.6 6.6')],
  suivant: [path('M9.4 5.4 16 12l-6.6 6.6')],
  chevron: [path('M9.2 5.2 16 12l-6.8 6.8')],
  retour: [path('M19.4 12H4.6'), path('M10.8 5.8 4.6 12l6.2 6.2')],
} as const

export type IconName = keyof typeof ICONS
