# Mes Aventures — v0.2

Application mobile personnelle pour organiser ses **sorties, soirées, événements,
week-ends et voyages**.

Pensée pour l'iPhone : elle s'installe depuis Safari sur l'écran d'accueil, s'ouvre
en plein écran comme une application native, et fonctionne **hors connexion**.

Tout est **100 % local** : pas de compte, pas de serveur, pas d'API externe. Les
données vivent dans le stockage du navigateur (IndexedDB) et ne quittent jamais
l'appareil, sauf par un export volontaire.

> **V0.1 → V0.2** : la V0.1 posait le socle technique. La V0.2 le rend réellement
> utilisable — création, modification, duplication, suppression, recherche,
> filtres et véritable agenda mensuel.

---

## Technologies

| Domaine        | Choix                                         |
| -------------- | --------------------------------------------- |
| Interface      | React 18 + TypeScript (strict)                |
| Build          | Vite 5                                        |
| Base locale    | IndexedDB via Dexie 4 (schéma versionné)      |
| Navigation     | React Router 6 (`HashRouter`)                 |
| Tests          | Vitest (logique métier)                       |
| PWA            | `vite-plugin-pwa` (Workbox, `generateSW`)     |
| Styles         | CSS personnalisé, variables CSS, mobile-first |
| Hébergement    | GitHub Pages (GitHub Actions)                 |

Aucune bibliothèque de composants graphiques : palette, cartes, icônes et
illustrations sont écrites à la main en SVG intégré — rien à télécharger, donc
un fonctionnement hors ligne intégral.

---

## Démarrage

```bash
npm install          # installation des dépendances

npm run dev          # serveur de développement (http://localhost:5173/App-orga-voyage-/)
npm run build        # build de production (sortie dans dist/)
npm run preview      # prévisualise le build — obligatoire pour tester le hors ligne
npm test             # suite de tests Vitest
npm run test:watch   # tests en mode veille
npx tsc -b           # vérification TypeScript seule
npm run icons        # régénère les icônes PWA
```

> Le service worker n'est actif qu'en build. Pour tester l'installation et le
> mode hors ligne : `npm run build && npm run preview`.

### Base path

Le site est servi depuis un sous-chemin sur GitHub Pages. La valeur par défaut est
`/App-orga-voyage-/`, surchargeable via `BASE_PATH` :

```bash
BASE_PATH=/ npm run build            # racine d'un domaine dédié
BASE_PATH=/autre-nom/ npm run build  # dépôt renommé
```

---

## Fonctionnalités de la V0.2

### Gestion complète des événements

- **Créer** depuis l'accueil, l'agenda ou la liste (bouton « Ajouter » partout).
- **Consulter** une fiche détaillée : illustration, catégorie, dates, horaires,
  durée, lieu, notes, statut, dates de création et de dernière modification.
- **Modifier** — le formulaire est prérempli, l'identifiant et la date de création
  sont conservés, `updatedAt` est rafraîchi.
- **Dupliquer** — ouvre le formulaire prérempli avec un titre suffixé ; l'original
  n'est jamais touché, la copie reçoit un nouvel identifiant.
- **Supprimer** — confirmation explicite nommant l'événement, puis message de
  réussite et retour à la liste.
- **Marquer comme terminé** — statut manuel, distinct du caractère « passé ».

### Agenda

Deux modes, permutables par un sélecteur :

- **Vue mensuelle** — grille complète, jours des mois voisins atténués, pastilles
  colorées par catégorie sur les jours occupés, cerclage du jour courant,
  navigation mois précédent/suivant, bouton « Aujourd'hui ». Sélectionner un jour
  affiche ses événements dessous.
- **Vue liste** — événements à venir groupés par jour, en ordre chronologique.

Un événement sur plusieurs jours apparaît sur **chacun** des jours qu'il couvre.

### Liste des événements

- Recherche plein texte sur le **titre**, le **lieu** et la **description**,
  insensible à la casse et aux accents (« soiree » trouve « soirée »).
- Filtre par catégorie et filtre temporel **À venir / Passés / Tous**.
- Recherche et filtres se combinent ; l'état vit dans l'URL, donc les raccourcis
  de l'accueil ouvrent la page avec le filtre déjà actif.
- État vide distinct selon qu'il n'y a aucun événement ou aucun résultat.

### Accueil

Plus aucune donnée en dur : prochain événement, trois suivants, nombre
d'événements du mois en cours et prochain voyage viennent tous d'IndexedDB.
Sans aucun événement, un message d'accueil chaleureux propose de créer le premier.

### Statut « passé »

Un événement est **automatiquement** considéré comme passé quand sa fin est
dépassée — sa date de début si aucune fin n'est renseignée. Pour un événement
« toute la journée », le basculement a lieu à la fin de la journée, pas à minuit.

Le caractère passé n'est **jamais stocké** : il est calculé à la lecture, ce qui
évite d'avoir à recalculer la base à chaque ouverture. Les événements passés
restent consultables, modifiables, duplicables et supprimables.

---

## Structure d'un événement

```ts
interface AppEvent {
  id: string
  title: string
  category: 'sortie' | 'soiree' | 'anniversaire' | 'concert'
          | 'restaurant' | 'weekend' | 'voyage' | 'autre'
  startDate: string          // ISO 8601 — seule date obligatoire
  endDate?: string           // ISO 8601 — facultative
  allDay: boolean
  location?: string
  description?: string
  imageKey?: string          // 'mer' | 'ville' | 'fete' | 'montagne'
  status: 'idee' | 'planifie' | 'confirme' | 'termine' | 'annule'
  createdAt: string
  updatedAt: string

  // Champs hérités de la V0.1, hors périmètre V0.2 (conservés, non exposés)
  participants?: number
  tripId?: string
  budget?: number
}
```

Les dates sont stockées en **chaînes ISO** et non en objets `Date` : sérialisables
telles quelles à l'export, indexables par Dexie, et le tri lexicographique
correspond au tri chronologique.

---

## Routes

| Chemin                          | Écran                                  |
| ------------------------------- | -------------------------------------- |
| `/`                             | Accueil                                |
| `/agenda`                       | Agenda (mois / liste)                  |
| `/evenements`                   | Liste, recherche et filtres            |
| `/evenements?categorie=concert` | Liste filtrée par catégorie            |
| `/evenements?quand=passes`      | Liste des événements passés            |
| `/evenements/nouveau`           | Création                               |
| `/evenements/nouveau?copie=ID`  | Duplication (formulaire prérempli)     |
| `/evenements/nouveau?jour=DATE` | Création à une date pré-sélectionnée   |
| `/evenements/:id`               | Fiche détaillée                        |
| `/evenements/:id/modifier`      | Modification                           |
| `/voyages`                      | Voyages (inchangé depuis la V0.1)      |
| `/sauvegarde`                   | Export / import                        |

L'application utilise `HashRouter` : GitHub Pages ne sait pas réécrire les URL
profondes vers `index.html`, le hash garantit donc qu'un **rechargement ou un lien
partagé fonctionne toujours**, y compris depuis un sous-chemin.

---

## Migration de la base

La base Dexie passe de la **version 1** à la **version 2**. La migration s'exécute
automatiquement au premier lancement de la V0.2, **sans perte de données** :

| V0.1                     | V0.2                                        |
| ------------------------ | ------------------------------------------- |
| `type`                   | → `category` (index `type` remplacé)        |
| `status: 'passe'`        | → `status: 'termine'`                       |
| *(absent)*               | → `allDay: false`                           |
| *(absent)*               | → `imageKey` (facultatif)                   |
| `endDate` obligatoire    | → facultative ; supprimée si égale au début |
| `location`/`description` | → chaînes vides supprimées (champs optionnels) |

La conversion est portée par `migrateEventToV2` (`src/db/database.ts`), fonction
**pure et idempotente** — réutilisée telle quelle par l'import de sauvegarde,
puisqu'un fichier v1 contient exactement la même forme de données.

Les données de démonstration ne sont insérées qu'au **tout premier lancement**,
et jamais recréées ensuite : si l'utilisateur les supprime, elles ne reviennent pas.

---

## Format de sauvegarde

Le format passe en **version 2**. Les sauvegardes V0.1 (v1) restent importables :
elles sont migrées à la volée, sans erreur ni perte.

```jsonc
{
  "signature": "mes-aventures-backup",
  "formatVersion": 2,
  "appVersion": "0.2.0",
  "createdAt": "2026-07-29T06:00:00.000Z",
  "data": {
    "events":    [ /* nouveaux champs inclus : category, allDay, imageKey */ ],
    "trips":     [ /* ... */ ],
    "reminders": [ /* ... */ ],
    "documents": [ /* ... */ ],
    "settings":  { "displayName": "Axel", "lastBackupAt": null,
                   "appVersion": "0.2.0", "currency": "EUR" }
  }
}
```

Un fichier produit par une version **plus récente** est refusé avec un message
explicite plutôt qu'importé partiellement. L'import demande toujours une
confirmation avant de remplacer les données, et s'exécute dans une transaction
unique : en cas d'échec, les données précédentes restent intactes.

---

## Structure du projet

```
src/
├── main.tsx                    # point d'entrée + service worker
├── App.tsx                     # amorçage de la base + routes
├── config/                     # constantes, raccourcis, correspondances visuelles
├── models/                     # types (event, trip, reminder, document, settings, backup)
├── db/
│   ├── database.ts             # schéma Dexie versionné + migrateEventToV2
│   ├── seed.ts / seedData.ts   # données de démonstration (premier lancement)
│   └── repositories/           # accès aux données — une façade par table
├── services/                   # export, import, validation, erreurs utilisateur
├── hooks/                      # useLiveData, useDashboard, useDatabaseBootstrap
├── navigation/                 # routes, barre inférieure, coquille
├── pages/                      # une page par écran (dont EventFormPage, EventDetailPage)
├── components/
│   ├── ui/                     # briques réutilisables (Card, Button, Alert, PageHeader…)
│   ├── icons/                  # jeu d'icônes et illustrations SVG
│   ├── agenda/                 # MonthCalendar
│   ├── events/                 # EventCard, EventForm
│   └── home/                   # sections du tableau de bord
├── styles/                     # thème, reset, base, composants, formulaires, agenda, pages
└── utils/
    ├── eventRules.ts           # règles métier pures (passé, tri, chevauchement, recherche)
    ├── eventValidation.ts      # validation du formulaire
    ├── eventForm.ts            # valeurs initiales (création / édition / duplication)
    ├── calendar.ts             # génération de la grille mensuelle
    └── date.ts                 # formatage et conversions
```

**Principe** : aucune donnée affichée n'est écrite en dur dans un composant, et
aucun composant ne parle à Dexie directement. Tout passe par les repositories,
puis par les hooks. La logique métier vit dans `utils/`, pure et testable.

---

## Procédure de test

```bash
npm test        # 47 tests — règles métier, validation, migrations
npx tsc -b      # types
npm run build   # build de production
```

Les tests automatisés couvrent :

- **validation des dates** — titre vide, date de début manquante, fin antérieure
  au début, fin sans jour, événement « toute la journée » multi-jours ;
- **classement des événements** — tri chronologique, départage stable par titre ;
- **détection des événements passés** — avec et sans date de fin, mode « toute la
  journée », événement en cours, événement annulé ;
- **migrations de sauvegarde** — v1 → v2, idempotence, catégories inconnues,
  rejet des fichiers invalides ou trop récents.

### Parcours manuel recommandé

`npm run build && npm run preview`, puis en émulation iPhone :

1. créer un événement (vérifier les messages sous les champs en cas d'erreur) ;
2. le retrouver dans l'agenda mensuel et dans la vue liste ;
3. le modifier, vérifier la date de dernière modification ;
4. le dupliquer, vérifier que l'original subsiste ;
5. le supprimer, vérifier la confirmation nommée ;
6. tester « Toute la journée » et un événement sur plusieurs jours ;
7. tester recherche et filtres combinés ;
8. exporter, puis réimporter le fichier ;
9. importer une sauvegarde V0.1 (migration) et un fichier invalide (refus propre) ;
10. couper le réseau et relancer l'application.

---

## Limites connues

- L'installation sur un **iPhone physique** n'a pas pu être testée (environnement
  de développement sans iOS). La configuration PWA est conforme et validée en
  émulation, mais l'ajout à l'écran d'accueil via Safari reste à confirmer.
- La page **Voyages** reste celle de la V0.1 : elle lit la table `trips` héritée,
  qui n'est pas éditable. Les voyages se saisissent pour l'instant comme des
  événements de catégorie « Voyage ».
- Les **illustrations** se choisissent dans une sélection embarquée de quatre
  scènes ; l'import d'images personnelles est hors périmètre.
- Aucun **événement récurrent** : chaque occurrence est un événement distinct
  (la duplication rend l'opération rapide).
- La date de dernière sauvegarde reflète le moment où le fichier a été **produit**,
  pas celui où il a été enregistré : iOS ne notifie pas la fin de l'enregistrement
  dans Fichiers.

---

## Hors périmètre de la V0.2 (architecture préparée)

Budgets détaillés · dépenses · checklists · tâches d'organisation · cadeaux ·
objets à ramener · participants · documents et billets · géolocalisation · cartes
interactives · notifications · synchronisation cloud · partage entre utilisateurs ·
gestion détaillée des voyages.

Les tables `reminders` et `documents` et les champs `participants`, `tripId`,
`budget` existent déjà et sont préservés par les migrations et les sauvegardes :
les modules correspondants pourront s'y brancher sans nouvelle migration lourde.

---

## Prévu pour la V0.3

- Gestionnaire de voyage complet : itinéraire, hébergements, étapes.
- Édition des pense-bêtes (« à ne pas oublier », cadeaux, objets à ramener).
- Budget par événement et par voyage, avec suivi des dépenses.
- Pièces jointes : billets, réservations, PDF et images stockés localement.
- Événements récurrents et rappels.
- Vue semaine dans l'agenda.

---

## Déploiement sur GitHub Pages

Le déploiement est automatique via `.github/workflows/deploy.yml`.

1. Sur GitHub : **Settings → Pages → Source = GitHub Actions** (à faire une fois).
2. Pousser sur `main`.
3. Le workflow vérifie les types, construit le site avec le bon `BASE_PATH`
   (déduit du nom du dépôt) et publie `dist/`.

> ⚠️ Ne pas ajouter le workflow Jekyll proposé par GitHub : il publierait le code
> source au lieu du build et donnerait une page blanche.

## Installation sur iPhone

1. Ouvrir l'URL du site dans **Safari** (Chrome iOS ne sait pas installer de PWA).
2. Toucher **Partager**, puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Lancer l'application depuis l'icône : elle s'ouvre sans barre d'adresse.

> ⚠️ Les données sont stockées dans le navigateur. Effacer les données de Safari
> ou supprimer l'application les efface aussi. **Exporte régulièrement** depuis
> l'onglet Sauvegarde.
