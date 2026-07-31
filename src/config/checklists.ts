/**
 * Modeles de checklist de voyage.
 *
 * Ce sont des points de depart, pas des obligations : chaque groupe s'ajoute
 * separement, et les elements restent ensuite modifiables ou supprimables un a
 * un. Les listes sont volontairement courtes — une checklist de trente lignes
 * ne se coche jamais.
 */
export interface ChecklistTemplate {
  key: string
  label: string
  items: string[]
}

export const TRAVEL_CHECKLISTS: ChecklistTemplate[] = [
  {
    key: 'papiers',
    label: 'Papiers',
    items: [
      "Carte d'identite ou passeport",
      'Permis de conduire',
      'Carte bancaire',
      'Carte europeenne d’assurance maladie',
      'Attestation d’assurance voyage',
      'Billets et reservations imprimes',
    ],
  },
  {
    key: 'vetements',
    label: 'Vetements',
    items: [
      'Hauts',
      'Pantalons',
      'Sous-vetements',
      'Chaussettes',
      'Pyjama',
      'Veste ou pull',
      'Chaussures de marche',
      'Maillot de bain',
    ],
  },
  {
    key: 'hygiene',
    label: 'Hygiene',
    items: [
      'Brosse a dents et dentifrice',
      'Gel douche et shampoing',
      'Deodorant',
      'Serviette',
      'Rasoir',
      'Creme solaire',
    ],
  },
  {
    key: 'electronique',
    label: 'Electronique',
    items: [
      'Telephone et chargeur',
      'Batterie externe',
      'Adaptateur de prise',
      'Ecouteurs',
      'Appareil photo',
    ],
  },
  {
    key: 'sante',
    label: 'Sante',
    items: [
      'Traitement en cours',
      'Trousse de premiers secours',
      'Anti-douleur',
      'Pansements',
      'Repulsif anti-moustiques',
    ],
  },
  {
    key: 'autres',
    label: 'Autres',
    items: ['Lunettes de soleil', 'Bouteille reutilisable', 'Sac a dos de journee', 'Livre'],
  },
]
