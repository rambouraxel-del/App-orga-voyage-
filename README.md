# Mes Aventures — v0.5

Application mobile personnelle pour organiser ses **sorties, soirées, événements,
week-ends et voyages**.

Pensée pour l'iPhone : elle s'installe depuis Safari sur l'écran d'accueil, s'ouvre
en plein écran comme une application native, et fonctionne **hors connexion**.

Tout est **100 % local** : pas de compte, pas de serveur, pas d'API externe. Les
données vivent dans le stockage du navigateur (IndexedDB) et ne quittent jamais
l'appareil, sauf par un export volontaire.

> **V0.1 → V0.5** : la V0.1 posait le socle technique, la V0.2 a rendu la gestion
> d'événements réellement utilisable, la V0.3 a ajouté quatre modules facultatifs
> par événement, la V0.4 a rendu le module **Documents** pleinement fonctionnel.
> La V0.5 transforme l'onglet **Voyages** en véritable gestionnaire : itinéraire,
> programme jour par jour, transports, hébergements, budget consolidé et
> checklists.
>
> **Principe structurant de la V0.5** : un voyage est un **événement enrichi**,
> pas un système parallèle. Chaque voyage possède un événement porteur de
> catégorie « voyage » — il apparaît donc naturellement dans l'agenda, et les
> modules de la V0.3/V0.4 (tâches, participants, dépenses, objets, documents)
> sont réutilisés tels quels, sans aucune duplication.

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

## Nouveautés de la V0.3

### Quatre modules facultatifs par événement

Chaque événement peut être enrichi — ou pas. **Une sortie simple se crée toujours
en deux gestes**, sans jamais ouvrir un seul module : ils n'affichent alors qu'un
état vide discret.

| Module | Contenu |
| --- | --- |
| **Organisation** | Tâches avec échéance et priorité, cochables, réordonnables ; progression globale ; distinction en retard / aujourd'hui / à venir / terminée |
| **Participants** | Nom, coordonnées libres, statut (invité, confirmé, incertain, absent), note ; répartition par statut |
| **Budget** | Enveloppe prévue, dépenses par catégorie, statut payé ; totaux, reste, écart, répartition, pourcentage consommé, alerte de dépassement |
| **À ramener** | Cadeaux à acheter et objets à emporter ; quantité, prix estimé, personne concernée, statut ; prix intégrable au budget |

### Fiche événement réorganisée

Cinq sections ancrées, navigables par des puces en haut de page : **Aperçu**,
**Organisation**, **Participants**, **Budget**, **À ramener**. Chacune affiche un
résumé, un état vide explicite et un bouton d'ajout rapide qui ouvre une feuille
de saisie sans quitter la fiche.

L'aperçu porte des indicateurs synthétiques (préparation, participants confirmés,
budget consommé), repris sur les cartes de la liste.

### Accueil enrichi

Progression de préparation du prochain événement, dépenses du mois, tâches
arrivant bientôt (retards en tête) et éléments à ne pas oublier — tous calculés
depuis IndexedDB.

### Navigation et Paramètres

- L'onglet **Sauvegarde** devient **Documents** : page de destination avec état
  vide soigné. *Le stockage réel des fichiers reste hors périmètre.*
- L'avatar aux initiales, en haut à droite de l'accueil, ouvre une page
  **Paramètres** contenant profil, préférences (à venir), informations
  d'application et **l'intégralité du module Sauvegarde**, à fonctionnalités
  constantes.
- L'ancienne route `/sauvegarde` **redirige** vers `/parametres#sauvegarde` :
  aucun lien existant n'est cassé.

### Calculs budgétaires

**Aucun total n'est stocké.** Tout est recalculé à la lecture par `computeBudget`
à partir des dépenses et de l'enveloppe prévue — pas de doublon à resynchroniser.

```
total dépensé  = Σ dépenses + Σ (prix estimé × quantité) des éléments marqués « compter au budget »
reste          = enveloppe prévue − total dépensé          (négatif = dépassement)
écart          = total dépensé − enveloppe prévue          (positif = dépassement)
% consommé     = total dépensé ÷ enveloppe prévue × 100    (0 si aucune enveloppe)
```

Sans enveloppe définie, aucun dépassement n'est jamais signalé : on ne peut pas
dépasser un budget qui n'existe pas. Les montants sont en euros, arrondis au
centime pour éviter les artefacts de virgule flottante.

---

## Nouveautés de la V0.4

### Documents & billets

Import depuis l'iPhone (app Fichiers, photothèque) de **PDF, JPEG, PNG, WebP et
fichiers texte**, limités à **15 Mo** par fichier — seuil configurable dans
`src/config/documents.ts`. Un format ou une taille refusés donnent un message
explicite, jamais un échec silencieux.

Chaque document porte : titre, catégorie, événement associé (facultatif), date
utile ou d'expiration, note, nom/type/taille du fichier, dates d'ajout et de
modification.

Catégories : transport · hébergement · réservation · billet · identité ·
assurance · programme · autre.

### Bibliothèque

Recherche par titre, note ou événement · filtres par catégorie et par événement ·
tri par date utile, nom ou ajout récent · vues **À venir / Tous / Archivés** ·
taille totale occupée et estimation de l'espace utilisé.

> « Tous » affiche les documents **actifs**. Les archivés ont leur propre vue,
> pour ne pas encombrer la consultation courante.

### Fiche document

Prévisualisation des images et des PDF quand le navigateur le permet, avec repli
propre sinon (ouverture ou téléchargement). Modification des informations,
changement d'événement associé, duplication des métadonnées avec un nouveau
fichier, archivage, suppression après confirmation.

### Intégration aux événements

Une section **Documents** dans chaque fiche événement : consultation, import
direct avec l'événement pré-sélectionné, rattachement d'un document existant,
retrait de l'association. Le nombre de documents apparaît dans l'aperçu et sur
les cartes de la liste.

**Supprimer un événement n'efface jamais silencieusement ses fichiers.** Une
case à cocher, décochée par défaut, propose de les supprimer ; sinon ils restent
dans la bibliothèque, simplement dissociés.

### Stockage local

Les **métadonnées** vivent dans `documents`, le **contenu binaire** dans
`documentFiles`, sous forme de `Blob`. Cette séparation est structurante :
Dexie renvoie l'enregistrement complet, donc mélanger les deux ferait charger
des dizaines de mégaoctets en mémoire au simple affichage de la liste.

Aucun fichier n'est jamais encodé en Base64 dans les données applicatives. Les
URLs temporaires (`URL.createObjectURL`) sont **systématiquement révoquées** au
démontage du composant — sans quoi chaque ouverture de fiche laisserait un Blob
entier en mémoire.

---

## Nouveautés de la V0.5

### Un voyage est un événement enrichi

Chaque `Trip` porte un `eventId` qui pointe vers un `AppEvent` de catégorie
« voyage ». Conséquences directes, et c'est tout l'intérêt du choix :

- le voyage apparaît **dans l'agenda et sur l'accueil** sans code spécifique ;
- les modules de la V0.3/V0.4 se rattachent à l'**événement porteur** et sont
  donc réutilisés tels quels : tâches, participants, dépenses, objets, documents ;
- titre, dates, destination, statut et budget sont **recopiés sur l'événement** à
  chaque écriture, dans une transaction — un voyage modifié ne peut pas devenir
  incohérent dans l'agenda.

Créer un voyage crée son événement ; le supprimer supprime l'événement et tout
son contenu en cascade.

### Itinéraire

Suite ordonnée de lieux, réordonnable par flèches. Une étape peut n'être qu'une
intention : les dates sont **facultatives**, et l'ordre est manuel plutôt que
déduit des dates — sinon une étape sans date n'aurait pas de place. Les
chevauchements de périodes sont signalés, jamais bloqués.

### Programme jour par jour

Les journées sont **générées** à partir des dates du voyage : la trame existe
avant toute saisie, et une journée vide reste visible — c'est justement
l'information utile quand on prépare. Chaque activité porte une catégorie, un
horaire facultatif, un coût prévu/réel, un statut et un indicateur
« réservation nécessaire ».

La journée est stockée comme une chaîne `AAAA-MM-JJ`, pas comme un instant :
déplacer une activité vers une autre date ne dépend d'aucun fuseau horaire, et
le regroupement devient une simple égalité de clé. Si les dates du voyage sont
raccourcies, les activités devenues hors période sont affichées à part plutôt
que perdues silencieusement.

### Transports

Aller, retour et déplacements sur place : mode, trajet, horaires, compagnie,
référence, prix prévu/payé et statut de réservation. Les billets se rattachent
directement au trajet concerné.

### Hébergements

Le point clé est la **couverture des nuits**. Une nuit va du jour J au jour J+1 :
un séjour du 2 au 5 couvre les nuits du 2, 3 et 4 — pas celle du 5, jour du
départ. Les nuits sans hébergement sont listées explicitement et proposent un
ajout en un geste : c'est l'oubli le plus coûteux d'un voyage.

### Budget consolidé, sans double compte

Le budget d'un voyage agrège quatre sources, **chacune comptée une seule fois** :

| Source | Montant retenu |
| --- | --- |
| Transports | prix payé s'il existe, sinon prix prévu |
| Hébergements | idem |
| Activités | idem |
| Dépenses libres | montant saisi |
| Objets à ramener | uniquement si « compter dans le budget » est coché |

Deux règles rendent le total fiable : un élément **annulé** ne compte pas, et
pour un même élément on retient le réel **ou** le prévisionnel, jamais les deux.
Le détail par source est affiché sous le total, pour qu'il reste vérifiable à
l'œil. Aucun total n'est stocké : tout est recalculé à la lecture.

### Checklist de bagages

Réutilise le module « objets à ramener » de la V0.3 plutôt que d'introduire une
table concurrente. La valeur ajoutée tient dans six **modèles pré-remplis** —
papiers, vêtements, hygiène, électronique, santé, autres. Un modèle peut être
appliqué plusieurs fois : les libellés déjà présents ne sont pas dupliqués.

### Documents rattachés à un élément

Un billet peut être associé à un **trajet, un hébergement, une activité ou une
étape** via une table de liaison `documentLinks`. Table de liaison plutôt que
champ sur le document : un même billet peut concerner plusieurs éléments, et
**retirer une association ne touche jamais au fichier**.

La bibliothèque de documents se filtre par voyage : elle réunit les documents de
l'événement porteur et ceux liés à l'un de ses éléments.

### Accueil et agenda

- **Accueil** : carte « prochain voyage » avec compte à rebours, avancement des
  préparatifs, prochain trajet, nuits sans hébergement, tâches urgentes et
  documents importants.
- **Agenda** : la période du voyage vient de l'événement porteur ; la journée
  sélectionnée affiche en plus les trajets du jour, l'hébergement de la nuit et
  les principales activités.

### Liste des voyages

Prochain voyage mis en avant, avancement global des préparatifs, recherche,
filtres par période et par statut, et cartes riches (préparation, transports,
hébergements, activités, budget, documents, nuits non couvertes).

### Suppression d'un voyage

La confirmation détaille ce qui va disparaître (étapes, activités, transports,
hébergements, tâches, dépenses) et **demande explicitement** ce qu'il advient des
documents : les supprimer avec leurs fichiers, ou seulement retirer
l'association. Le défaut est **conserver** — effacer silencieusement des fichiers
importés par l'utilisateur serait la pire des surprises.

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

## Structure d'un voyage

```ts
interface Trip {
  id: string
  eventId: string            // événement porteur — jamais absent depuis la V0.5
  title: string
  destination: string
  origin?: string
  startDate: string          // ISO 8601
  endDate: string            // ISO 8601
  status: 'idee' | 'preparation' | 'reserve' | 'en-cours' | 'termine' | 'annule'
  description?: string
  imageKey?: string
  budget?: number            // miroir de AppEvent.budget
  createdAt: string
  updatedAt: string
}
```

Le contenu du voyage vit dans quatre tables reliées par `tripId`, plus une table
de liaison pour les documents :

| Table | Rôle | Particularité |
| --- | --- | --- |
| `tripStages` | étapes de l'itinéraire | dates facultatives, `order` manuel |
| `tripActivities` | programme | `day` est une chaîne `AAAA-MM-JJ` |
| `tripTransports` | trajets | `departure` en ISO complet (horaires précis) |
| `tripStays` | hébergements | `checkIn`/`checkOut` en `AAAA-MM-JJ` |
| `documentLinks` | billets rattachés | table de liaison, jamais le fichier |

Le mélange assumé de `AAAA-MM-JJ` et d'ISO complet suit l'usage : une activité se
range dans une **journée**, un vol part à une **heure**. Stocker la journée comme
une chaîne rend le regroupement et le déplacement indépendants de tout fuseau
horaire.

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
| `/voyages`                      | Voyages : liste, recherche, filtres    |
| `/voyages?statut=preparation`   | Liste filtrée par statut               |
| `/voyages?quand=passes`         | Voyages passés                         |
| `/voyages/nouveau`              | Création d'un voyage                   |
| `/voyages/:id`                  | Fiche voyage (9 sections)              |
| `/voyages/:id/modifier`         | Modification                           |
| `/documents`                    | Bibliothèque de documents              |
| `/documents?categorie=billet`   | Bibliothèque filtrée par catégorie     |
| `/documents?voyage=ID`          | Documents d'un voyage                  |
| `/documents/:id`                | Fiche document                         |
| `/parametres`                   | Profil, affichage, sauvegarde, à propos |
| `/parametres#sauvegarde`        | Section Sauvegarde (export / import)   |
| `/sauvegarde`                   | **Redirige** vers `/parametres#sauvegarde` |

L'application utilise `HashRouter` : GitHub Pages ne sait pas réécrire les URL
profondes vers `index.html`, le hash garantit donc qu'un **rechargement ou un lien
partagé fonctionne toujours**, y compris depuis un sous-chemin.

---

## Migration de la base

### v4 → v5 (V0.5)

Cinq tables sont ajoutées — `tripStages`, `tripActivities`, `tripTransports`,
`tripStays`, `documentLinks` — et la table `trips` gagne un index `eventId`.

| V0.1 – V0.4 | V0.5 |
| --- | --- |
| `status: 'planifie'` | → `preparation` |
| `status: 'confirme'` | → `reserve` |
| `image: 'illustration:mer'` | → `imageKey: 'mer'` |
| `notes` | → `description` |
| *(absent)* | → `eventId`, `origin` |

**Le point délicat est `eventId`** : un voyage hérité n'en a pas, et sans
événement porteur il resterait invisible dans l'agenda et incapable de porter le
moindre module. La migration en crée donc un pour chaque voyage qui en manque —
sauf si un événement « voyage » pointe déjà vers lui (cas des données de
démonstration), auquel cas il est réutilisé plutôt que dupliqué.

Cette règle vit dans `ensureTripEvents` (`src/utils/tripSync.ts`), **pure et
idempotente**, volontairement hors de Dexie : la migration de schéma **et**
l'import de sauvegarde en ont besoin, les deux doivent produire exactement le
même résultat, et elle se teste sans base.

### v3 → v4 (V0.4)

Ajout de la table `documentFiles` (contenu binaire) et évolution des documents :

| V0.1 – V0.3 | V0.4 |
| --- | --- |
| `kind` | → `category` (+ `transport`, `hebergement`, `programme`) |
| `date` | → `usefulDate` |
| *(absent)* | → `fileName`, `mimeType`, `size`, `archived` |
| `fileRef` | supprimé — jamais utilisé, remplacé par `documentFiles` |

Les fiches créées avant la V0.4 **n'avaient aucun fichier** : elles sont
conservées comme fiches sans pièce jointe, consultables et modifiables, et
signalées par un badge « Fichier manquant ». Elles portent des informations
saisies : les supprimer serait une perte de données.

La conversion est portée par `migrateDocumentToV4` — pure et idempotente, comme
`migrateEventToV2`, et réutilisée par l'import de sauvegarde.

### v2 → v3 (V0.3)

Quatre tables sont ajoutées : `tasks`, `participants`, `items`, `expenses`.
**Aucune donnée existante n'est modifiée** — Dexie crée simplement les magasins
manquants. Les événements, voyages et paramètres restent intacts.

Chaque enregistrement est relié à son événement par `eventId`, et la suppression
d'un événement efface son contenu **en cascade**, dans une transaction unique :
on ne peut pas se retrouver avec des dépenses orphelines en base.

### v1 → v2 (V0.2)

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

Le format passe en **version 5**. L'archive ZIP de la V0.4 est conservée telle
quelle ; le JSON gagne cinq collections : `tripStages`, `tripActivities`,
`tripTransports`, `tripStays` et `documentLinks`.

À l'import, `ensureTripEvents` **rétablit le lien voyage ↔ événement porteur**
avant toute écriture : une sauvegarde v1 à v4 contient des voyages sans
`eventId`, ils seraient sinon restaurés invisibles. Les liaisons de documents
pointant vers un document disparu sont écartées — une association orpheline
n'affiche rien et fausse les comptes.

Structure de l'archive :

```
mes-aventures-sauvegarde-2026-07-29.zip
├── sauvegarde.json          ← toutes les données + manifeste des fichiers
└── documents/
    ├── <id-document>.pdf
    └── <id-document>.png
```

Le manifeste (`files[]`) relie chaque fichier à son document par identifiant —
et non par nom, puisque deux billets peuvent parfaitement s'appeler `billet.pdf`.

L'archive utilise la méthode **« store » (sans compression)**, écrite à la main
dans `src/services/zip.ts` : le contenu est déjà du PDF et du JPEG compressés,
deflater ne gagnerait quasiment rien tout en coûtant du CPU sur un iPhone. Le
résultat reste une archive ZIP standard, ouvrable par l'app Fichiers d'iOS.

**Les sauvegardes v1 à v4 restent importables** : le format est
détecté par la signature du fichier, les événements et documents sont migrés à
la volée, et les collections absentes deviennent des tableaux vides.

Un fichier annoncé mais introuvable dans l'archive **n'interrompt pas la
restauration** : la fiche est restaurée sans pièce jointe et l'utilisateur est
averti, à la confirmation puis dans le message de résultat.

```jsonc
{
  "signature": "mes-aventures-backup",
  "formatVersion": 4,
  "appVersion": "0.4.0",
  "createdAt": "2026-07-29T06:00:00.000Z",
  "data": {
    "events":    [ /* nouveaux champs inclus : category, allDay, imageKey */ ],
    "trips":     [ /* ... */ ],
    "reminders": [ /* ... */ ],
    "documents": [ /* ... */ ],
    "tasks":        [ /* V0.3 */ ],
    "participants": [ /* V0.3 */ ],
    "items":        [ /* V0.3 */ ],
    "expenses":     [ /* V0.3 */ ],
    "settings":  { "displayName": "Axel", "lastBackupAt": null,
                   "appVersion": "0.4.0", "currency": "EUR" }
  },
  "files": [
    { "documentId": "…", "path": "documents/….pdf",
      "fileName": "billet.pdf", "mimeType": "application/pdf", "size": 20481 }
  ]
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
│   ├── database.ts             # schéma Dexie versionné (v1 → v5) + migrations
│   ├── seed.ts / seedData.ts   # données de démonstration (premier lancement)
│   └── repositories/           # accès aux données — une façade par table
├── services/                   # export ZIP, import, validation, zip.ts, erreurs
├── hooks/                      # useLiveData, useDashboard, useDatabaseBootstrap
├── navigation/                 # routes, barre inférieure, coquille
├── pages/                      # une page par écran (dont TripDetailPage, TripFormPage)
├── components/
│   ├── ui/                     # briques réutilisables (Card, Button, Alert, PageHeader…)
│   ├── icons/                  # jeu d'icônes et illustrations SVG
│   ├── agenda/                 # MonthCalendar, TripDayDetails
│   ├── events/                 # EventCard, EventForm, ModuleSection,
│   │                           #   TasksSection, ParticipantsSection,
│   │                           #   BudgetSection, ItemsSection
│   ├── trips/                  # TripCard, TripForm, StagesSection,
│   │                           #   ProgramSection, TransportsSection,
│   │                           #   StaysSection, TripBudgetSection,
│   │                           #   TripChecklistSection, LinkedDocuments
│   ├── settings/               # BackupSection
│   ├── documents/              # DocumentCard, DocumentSheet
│   └── home/                   # sections du tableau de bord
├── styles/                     # thème, reset, base, composants, formulaires, agenda, pages
└── utils/
    ├── eventRules.ts           # règles métier pures (passé, tri, chevauchement, recherche)
    ├── taskRules.ts            # état, progression, retard, réordonnancement
    ├── budgetRules.ts          # totaux, reste, écart, répartition, dépassement
    ├── tripRules.ts            # journées, nuits, cohérence des dates, budget voyage
    ├── tripSync.ts             # voyage ↔ événement porteur (migration + import)
    ├── tripValidation.ts       # validation du formulaire de voyage
    ├── fileRules.ts            # validation des fichiers, types MIME, tailles
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
npm test        # 212 tests — règles métier, budget, tâches, fichiers, ZIP, migrations, voyages
npx tsc -b      # types
npm run build   # build de production
```

Les tests automatisés couvrent :

- **validation des dates** — titre vide, date de début manquante, fin antérieure
  au début, fin sans jour, événement « toute la journée » multi-jours ;
- **classement des événements** — tri chronologique, départage stable par titre ;
- **détection des événements passés** — avec et sans date de fin, mode « toute la
  journée », événement en cours, événement annulé ;
- **migrations de sauvegarde** — v1 → v2 → v3, idempotence, catégories inconnues,
  rejet des fichiers invalides ou trop récents, imports v1/v2 sans modules ;
- **calculs budgétaires** — totaux, payé/non payé, reste, écart, pourcentage,
  répartition par catégorie, dépassement, absence d'enveloppe, cadeaux intégrés,
  robustesse aux montants illisibles et arrondi au centime ;
- **progression et statut des tâches** — pourcentage, achèvement, comptage des
  retards, tri par urgence, réordonnancement et bornes ;
- **validation des fichiers** — formats acceptés et refusés, taille limite et
  cas exact à la limite, fichier vide, repli sur l'extension quand Safari iOS ne
  déclare pas de type MIME, suggestions de titre et de catégorie ;
- **archives ZIP** — aller-retour sur texte et binaire arbitraire, noms non
  ASCII, entrées vides, gros contenu, détection de signature, refus des archives
  tronquées ou sans répertoire central, vecteurs de test CRC-32 de référence ;
- **manifeste de sauvegarde** — correspondances document/fichier, entrées
  incomplètes ignorées sans faire échouer l'import, migration `kind` → `category`
  et préservation des associations ;
- **journées et nuits d'un voyage** — génération bornes comprises, aller-retour
  dans la journée, fin antérieure au début, date invalide, passage d'année,
  garde-fou sur une saisie aberrante, couverture des nuits par les hébergements
  et exclusion des séjours annulés ;
- **cohérence des dates** — fin avant début bloquée, débordement de la période du
  voyage seulement averti, chevauchement d'étapes détecté ;
- **budget de voyage** — agrégation des quatre sources, règle anti-double-compte
  (réel **ou** prévisionnel, jamais les deux), exclusion des éléments annulés,
  objets comptés seulement si demandé, dépassement et écart, absence
  d'enveloppe, détail par source sans ligne vide ;
- **synchronisation voyage ↔ événement** — création de l'événement porteur
  manquant, réutilisation d'un événement existant, respect d'un `eventId` valide,
  recréation si l'événement a disparu, idempotence, non-mutation des données
  d'origine ;
- **migration des voyages v1–v4** — anciens statuts, `image` → `imageKey`,
  `notes` → `description`, chaînes vides supprimées, idempotence ;
- **sauvegarde v5** — restauration du contenu d'itinéraire, repli sur les
  énumérations inconnues, refus d'une activité sans journée exploitable ou d'un
  élément orphelin, import d'une sauvegarde v4 sans contenu de voyage ;
- **formulaire de voyage** — champs obligatoires, retour antérieur au départ,
  budget négatif ou illisible, virgule décimale, champs effaçables et
  aller-retour formulaire → voyage → formulaire.

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
10. créer un voyage, vérifier qu'il apparaît dans l'agenda et sur l'accueil ;
11. ajouter un trajet, un hébergement partiel et quelques activités ; vérifier le
    signalement des nuits sans hébergement et le budget consolidé ;
12. déplacer une activité vers une autre journée, réordonner une journée ;
13. appliquer un modèle de checklist deux fois (aucun doublon attendu) ;
14. rattacher un document à un trajet, puis le détacher (le fichier doit rester
    dans la bibliothèque) ;
15. supprimer le voyage en choisissant « conserver les documents », puis vérifier
    que l'événement porteur a bien disparu de l'agenda ;
16. exporter puis réimporter : itinéraire, budget et associations doivent être
    identiques ;
17. couper le réseau et relancer l'application.

---

## Limites connues

- L'installation sur un **iPhone physique** n'a pas pu être testée (environnement
  de développement sans iOS). La configuration PWA est conforme et validée en
  émulation, mais l'ajout à l'écran d'accueil via Safari reste à confirmer.
- Le **réordonnancement** des étapes et des activités se fait par flèches
  haut/bas, pas par glisser-déposer : plus fiable au pouce et accessible au
  clavier.
- Un voyage se saisit **à la journée** : pas d'heure de départ ni de retour sur
  le voyage lui-même. Les horaires précis vivent sur les transports, là où ils
  ont un sens.
- Les **étapes** n'alimentent pas le budget : elles décrivent un parcours, pas
  une dépense. Ce sont les transports, hébergements et activités qui portent les
  montants.
- Le programme est borné à **731 journées** (deux ans) : au-delà, la saisie
  relève de l'erreur, et générer des milliers de journées ne rendrait service à
  personne.
- La **prévisualisation des PDF** dépend du navigateur. Safari iOS n'affiche pas
  toujours un PDF en `<object>` : un repli propose alors l'ouverture ou le
  téléchargement, sans jamais faire planter l'application.
- Le **fichier joint n'est pas remplaçable** sur un document existant : il faut
  dupliquer la fiche et importer le nouveau fichier. C'est un choix assumé, qui
  évite de désynchroniser métadonnées et contenu.
- L'estimation d'espace de `navigator.storage.estimate()` est **approximative**
  sur Safari ; l'application affiche donc aussi la somme exacte des tailles de
  fichiers.
- Dans les **Paramètres**, le prénom affiché et les préférences d'affichage sont
  présentés mais pas encore modifiables — les emplacements sont préparés.
- Le réordonnancement des tâches se fait par **flèches haut/bas**, pas par
  glisser-déposer : plus fiable au pouce et accessible au clavier.
- Les **illustrations** se choisissent dans une sélection embarquée de quatre
  scènes ; l'import d'images personnelles est hors périmètre.
- Aucun **événement récurrent** : chaque occurrence est un événement distinct
  (la duplication rend l'opération rapide).
- La date de dernière sauvegarde reflète le moment où le fichier a été **produit**,
  pas celui où il a été enregistré : iOS ne notifie pas la fin de l'enregistrement
  dans Fichiers.

---

## Hors périmètre (architecture préparée)

Synchronisation cloud · partage entre utilisateurs · envoi par e-mail · OCR ou
lecture automatique du contenu · modification interne des PDF · cartes et
géolocalisation · notifications système · réservation en ligne · import
automatique depuis un e-mail de confirmation.

---

## Prévu pour la V0.6

- Modification du prénom et préférences d'affichage dans les Paramètres.
- Budget consolidé sur plusieurs voyages, et vue budget globale.
- Remplacement du fichier d'un document existant.
- Événements récurrents et rappels.
- Vue semaine dans l'agenda.
- Glisser-déposer pour le programme et l'itinéraire.

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
