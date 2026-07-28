# Mes Aventures — v0.1

Application mobile personnelle pour organiser ses **sorties, soirées, événements,
week-ends et voyages**.

Pensée pour l'iPhone : elle s'installe depuis Safari sur l'écran d'accueil, s'ouvre
en plein écran comme une application native, et fonctionne **hors connexion**.

Tout est **100 % local** : pas de compte, pas de serveur, pas d'API externe. Les
données vivent dans le stockage du navigateur (IndexedDB) et ne quittent jamais
l'appareil, sauf par un export volontaire.

---

## Technologies

| Domaine        | Choix                                       |
| -------------- | ------------------------------------------- |
| Interface      | React 18 + TypeScript (strict)              |
| Build          | Vite 5                                      |
| Base locale    | IndexedDB via Dexie 4                       |
| Navigation     | React Router 6 (`HashRouter`)               |
| PWA            | `vite-plugin-pwa` (Workbox, `generateSW`)   |
| Styles         | CSS personnalisé, variables CSS, mobile-first |
| Hébergement    | GitHub Pages (GitHub Actions)               |

Aucune bibliothèque de composants graphiques : la palette, les cartes, les icônes
et les illustrations sont écrites à la main (SVG intégré, zéro image externe).

---

## Démarrage

```bash
# Installation des dépendances
npm install

# Serveur de développement (http://localhost:5173/App-orga-voyage-/)
npm run dev

# Build de production (sortie dans dist/)
npm run build

# Prévisualiser le build exactement comme en production
npm run preview
```

Scripts complémentaires :

```bash
npx tsc -b        # vérification TypeScript seule
npm run icons     # régénère les icônes PWA dans public/icons/
```

> Le service worker n'est actif qu'en build (`npm run build` + `npm run preview`).
> C'est le mode à utiliser pour tester l'installation et le fonctionnement hors ligne.

### Base path

Le site est servi depuis un sous-chemin sur GitHub Pages. La valeur par défaut est
`/App-orga-voyage-/`, surchargeable via la variable d'environnement `BASE_PATH` :

```bash
BASE_PATH=/ npm run build            # racine d'un domaine dédié
BASE_PATH=/autre-nom/ npm run build  # dépôt renommé
```

---

## Déploiement sur GitHub Pages

Le déploiement est automatique via `.github/workflows/deploy.yml`.

1. Sur GitHub : **Settings → Pages → Source = GitHub Actions** (à faire une fois).
2. Fusionner (ou pousser) sur `main`.
3. Le workflow vérifie les types, construit le site avec le bon `BASE_PATH`
   (déduit du nom du dépôt) et publie `dist/`.
4. Le site est disponible sur `https://<utilisateur>.github.io/<dépôt>/`.

Le workflow est aussi déclenchable à la main depuis l'onglet **Actions**.

---

## Installation sur iPhone

1. Ouvrir l'URL du site dans **Safari** (Chrome iOS ne sait pas installer de PWA).
2. Toucher le bouton **Partager** (carré avec une flèche).
3. Choisir **Sur l'écran d'accueil**, puis **Ajouter**.
4. Lancer l'application depuis l'icône : elle s'ouvre sans barre d'adresse.

Après ce premier lancement, tout le nécessaire est mis en cache : l'application
démarre et s'utilise **sans connexion**.

> ⚠️ Les données sont stockées dans le navigateur. Effacer les données de Safari
> ou supprimer l'application les efface aussi. **Exporte régulièrement** depuis
> l'onglet Sauvegarde.

---

## Structure du projet

```
.
├── .github/workflows/deploy.yml   # publication GitHub Pages
├── scripts/generate-icons.mjs     # génération des icônes PWA (PNG, sans dépendance)
├── public/                        # favicon + icônes copiés tels quels
├── index.html                     # méta iOS, safe-area, écran d'attente
├── vite.config.ts                 # base path, manifeste PWA, Workbox
└── src/
    ├── main.tsx                   # point d'entrée + enregistrement du service worker
    ├── App.tsx                    # amorçage de la base + routes
    ├── config/                    # constantes, raccourcis, correspondances visuelles
    ├── models/                    # types TypeScript (event, trip, reminder, document,
    │                              #   settings, backup)
    ├── db/
    │   ├── database.ts            # schéma Dexie versionné
    │   ├── seed.ts / seedData.ts  # données de démonstration (premier lancement)
    │   └── repositories/          # accès aux données, une façade par table
    ├── services/                  # export, import, validation, erreurs utilisateur
    ├── hooks/                     # useLiveData, useDashboard, useDatabaseBootstrap
    ├── navigation/                # routes, barre inférieure, coquille d'application
    ├── pages/                     # une page par onglet + détail + 404
    ├── components/
    │   ├── ui/                    # briques réutilisables (Card, Button, Alert…)
    │   ├── icons/                 # jeu d'icônes et illustrations SVG
    │   ├── home/                  # sections du tableau de bord
    │   ├── events/ trips/         # cartes métier
    │   └── ErrorBoundary.tsx
    ├── styles/                    # thème, reset, base, composants, pages
    └── utils/                     # dates, formats, identifiants
```

Principe : **aucune donnée affichée n'est écrite en dur dans un composant**. Tout
passe par la base locale, lue via les repositories puis les hooks.

---

## Fonctionnalités de la V0.1

- **Accueil** : salutation, prochain événement mis en avant, agenda à venir,
  six raccourcis, aperçus (voyage, budget du mois, pense-bêtes, documents) et
  date de dernière sauvegarde.
- **Navigation** : cinq onglets fixes en bas d'écran, onglet actif en marron cuir,
  respect des safe-areas iPhone.
- **Agenda** : liste chronologique groupée par mois.
- **Événements** : liste complète, séparée entre « à venir » et « déjà vécus ».
- **Voyages** : cartes illustrées avec dates, destination, statut et budget estimé.
- **Sauvegarde** (pleinement fonctionnelle) :
  - export JSON `mes-aventures-sauvegarde-AAAA-MM-JJ.json` ;
  - import avec validation du fichier et **confirmation avant remplacement** ;
  - refus propre et message clair sur fichier illisible, JSON invalide ou format
    inconnu ;
  - horodatage de la dernière sauvegarde.
- **Base locale** : schéma Dexie versionné (`events`, `trips`, `reminders`,
  `documents`, `settings`), données de démonstration insérées **au premier
  lancement uniquement**.
- **PWA** : manifeste complet, icônes (dont maskable), mode standalone,
  service worker et fonctionnement hors ligne.

### Format de sauvegarde

```jsonc
{
  "signature": "mes-aventures-backup",
  "formatVersion": 1,
  "appVersion": "0.1.0",
  "createdAt": "2026-07-28T09:12:44.000Z",
  "data": {
    "events": [ /* ... */ ],
    "trips": [ /* ... */ ],
    "reminders": [ /* ... */ ],
    "documents": [ /* ... */ ],
    "settings": { "displayName": "Axel", "lastBackupAt": null, "appVersion": "0.1.0", "currency": "EUR" }
  }
}
```

`formatVersion` est indépendant de la version applicative : un fichier produit par
une version plus récente est refusé avec un message explicite plutôt qu'importé
partiellement.

---

## Hors périmètre de la V0.1 (préparé, non implémenté)

L'architecture réserve la place pour ces fonctionnalités, sans les développer :

- création et modification réelles d'événements et de voyages ;
- calendrier interactif (vue mensuelle) ;
- gestion détaillée du budget ;
- pièces jointes (PDF, billets, images) — seules les métadonnées existent ;
- cartes et géolocalisation ;
- notifications (le bouton de l'accueil est décoratif) ;
- synchronisation cloud, comptes utilisateurs, partage entre participants ;
- gestionnaire complet de voyage (itinéraire, bagages, dépenses partagées).

---

## Tests réalisés

Validation sur navigateur mobile émulé (iPhone 13 · 390 px et iPhone SE · 320 px) :

- build de production sans erreur TypeScript ni avertissement ;
- aucune erreur inattendue en console ;
- navigation entre les cinq onglets, onglet actif correct ;
- persistance des données après rechargement complet ;
- export : fichier généré, structure conforme, date de sauvegarde mise à jour ;
- import valide : confirmation demandée puis données remplacées et écrans rafraîchis ;
- import invalide (mauvaise structure et JSON cassé) : refus propre, message clair,
  données conservées ;
- fonctionnement hors ligne après un premier chargement (service worker actif) ;
- absence de défilement horizontal et cibles tactiles ≥ 44 px.
