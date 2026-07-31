<div align="center">
  <img src="icons/icon-512.png" alt="Logo BibiLeaf" width="128" height="128">

  # BibiLeaf

  **Le carnet de soins doux pour vos plantes d’intérieur.**

  Une Progressive Web App locale, simple et installable, pour savoir quoi faire aujourd’hui, suivre chaque plante et ne plus laisser un arrosage disparaître dans la jungle du quotidien.

  [![Version](https://img.shields.io/badge/version-2.0.2-5a9a6f)](manifest.json)
  [![PWA](https://img.shields.io/badge/PWA-installable-6fae7b)](manifest.json)
  [![Offline](https://img.shields.io/badge/offline-ready-3f7f57)](service-worker.js)
  [![Langue](https://img.shields.io/badge/langue-français-8bbd94)](#)
  [![Licence](https://img.shields.io/badge/licence-non%20définie-lightgrey)](#licence)
</div>

---

## À propos

BibiLeaf centralise les routines d’entretien des plantes dans une interface mobile-first. L’application calcule les prochains soins, signale les retards et conserve les données directement dans le navigateur grâce à IndexedDB.

Aucun compte, aucun serveur et aucune synchronisation distante ne sont nécessaires. Une fois chargée, l’application peut continuer à fonctionner hors ligne.

## Fonctionnalités

- Tableau **Aujourd’hui** avec soins en retard, à faire, à configurer et à venir
- Fiches plantes avec nom, espèce, pièce, photo, notes et état de santé
- Suivi de plusieurs routines de soins par plante
- Timeline des événements d’entretien
- Recherche, filtres par statut et regroupement par pièce
- **Mode hiver** manuel ou automatique
- **Mode vacances** pour suspendre temporairement les échéances
- Suggestions de profils de soins
- Import, export et modèle au format Excel
- Sauvegarde locale dans IndexedDB
- Migration automatique des anciennes données
- Installation sur smartphone, tablette ou ordinateur comme une application
- Cache hors ligne via Service Worker
- Notifications locales lorsque le navigateur les autorise

## Captures d’écran

> Les captures d’écran ne sont pas encore versionnées dans le dépôt.
>
> Pour enrichir cette section, ajoutez par exemple des images dans `docs/screenshots/`, puis référencez-les ici.

## Installation

### Utilisation directe

BibiLeaf est une application web statique. Elle peut être publiée sur GitHub Pages, Netlify, Cloudflare Pages ou tout autre hébergement capable de servir des fichiers HTML, CSS et JavaScript.

### Lancement local

Le Service Worker et les modules JavaScript nécessitent un serveur HTTP local. Ouvrir directement `index.html` avec le protocole `file://` peut empêcher certaines fonctions de marcher correctement.

Avec Python :

```bash
git clone https://github.com/christolosier-ship-it/BibiLeaf.git
cd BibiLeaf
python -m http.server 8080
```

Puis ouvrez :

```text
http://localhost:8080
```

Avec Node.js :

```bash
npx serve .
```

## Installation en tant qu’application

1. Ouvrez BibiLeaf dans un navigateur compatible.
2. Utilisez l’action **Installer l’application** ou **Ajouter à l’écran d’accueil**.
3. Lancez ensuite BibiLeaf depuis son icône, comme une application classique.

L’installation repose sur `manifest.json` et `service-worker.js`.

## Données et confidentialité

Les données sont stockées localement dans le navigateur avec IndexedDB.

- Aucun compte utilisateur n’est requis.
- Aucune donnée n’est envoyée vers un serveur applicatif BibiLeaf.
- Les photos restent dans le stockage local du navigateur.
- Effacer les données du site ou changer de navigateur peut supprimer les informations locales.

Il est recommandé d’utiliser régulièrement la fonction d’export pour conserver une sauvegarde externe.

## Structure du projet

```text
BibiLeaf/
├── index.html                 # Point d’entrée et structure de l’interface
├── app.js                     # Orchestrateur principal de l’application
├── styles.css                 # Styles globaux et responsive design
├── manifest.json              # Métadonnées de la PWA
├── service-worker.js          # Cache hors ligne et notifications
├── icons/                     # Icônes de l’application
└── src/
    ├── import-export/
    │   └── xlsx.js            # Import, export et modèle Excel
    ├── models/
    │   └── plant.js           # Modèle de données et migrations
    ├── storage/
    │   └── idb.js             # Accès IndexedDB
    ├── ui/
    │   ├── icons.js           # Icônes SVG de l’interface
    │   └── components/        # Cartes, formulaires, modales, timeline
    └── utils/                 # Dates, calculs de soins et sécurité HTML
```

## Architecture

BibiLeaf utilise une architecture JavaScript modulaire sans framework :

- `app.js` maintient l’état global, orchestre les écrans et relie les événements utilisateur.
- `src/models/plant.js` définit les données métier, les versions de schéma et les migrations.
- `src/storage/idb.js` encapsule la persistance IndexedDB.
- `src/utils/calc.js` calcule l’urgence et les prochaines échéances.
- `src/ui/components/` contient les composants d’interface réutilisables.
- `src/import-export/xlsx.js` gère les échanges avec les fichiers Excel.
- `service-worker.js` assure le fonctionnement hors ligne avec une stratégie réseau prioritaire pour la navigation et cache prioritaire pour les ressources.

## Développement

Aucune étape de compilation n’est nécessaire.

Le projet repose principalement sur :

- HTML5
- CSS3
- JavaScript ES Modules
- IndexedDB
- Service Worker et Web App Manifest
- SheetJS `xlsx` chargé depuis un CDN

### Modifier l’application

1. Créez une branche depuis la branche active du projet.
2. Lancez un serveur local.
3. Effectuez vos modifications.
4. Vérifiez les écrans sur mobile et ordinateur.
5. Testez l’application en ligne et hors ligne.
6. Mettez à jour les numéros de version et le nom du cache si nécessaire.

### Points à vérifier avant une livraison

- Ajout, modification, duplication et suppression d’une plante
- Calcul des soins en retard et à venir
- Modes hiver manuel et automatique
- Activation et sortie du mode vacances
- Filtres, recherche, pièces et timeline
- Import et export Excel
- Conservation des données après rechargement
- Migration des données existantes
- Installation PWA
- Mise à jour du Service Worker
- Navigation hors ligne

## Versionnement

La version courante est **2.0.2**.

Elle apparaît notamment dans :

- le titre de `index.html`
- `manifest.json`
- le modèle de données
- le nom du cache dans `service-worker.js`

Lors d’une nouvelle version, ces références doivent rester cohérentes pour éviter des caches obsolètes ou des migrations incomplètes.

## Contribution

Les contributions sont bienvenues sous forme d’issues ou de pull requests.

Avant de proposer une modification :

- gardez l’application utilisable sans serveur applicatif ;
- préservez les données locales existantes ;
- évitez d’ajouter une dépendance lourde pour une fonction simple ;
- maintenez une expérience mobile-first et accessible ;
- documentez toute modification du schéma de données ;
- actualisez le Service Worker lorsque la liste des ressources change.

## Feuille de route possible

- Captures d’écran et démonstration animée dans le README
- Tests automatisés des calculs de soins
- Export de sauvegarde complet avec stratégie documentée pour les photos
- Audit d’accessibilité
- Documentation détaillée du format d’import Excel
- Internationalisation

## Licence

Aucune licence n’est actuellement déclarée dans le dépôt.

Sans fichier de licence explicite, le code reste soumis au droit d’auteur par défaut. Ajoutez un fichier `LICENSE` avant d’autoriser formellement la réutilisation, la modification ou la redistribution du projet.

---

<div align="center">
  <strong>BibiLeaf</strong><br>
  Des feuilles heureuses, sans tableau de bord façon cockpit d’avion. 🌿
</div>
