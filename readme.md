# 🪴 BibiLeaf

> Suivi doux et minimaliste de vos plantes d’intérieur.  
> PWA mobile · Offline-first · Zéro backend · Zéro compte

-----

## ✨ Présentation

BibiLeaf est une application web progressive (PWA) conçue pour suivre simplement l’arrosage et l’entretien de vos plantes d’intérieur. Elle fonctionne entièrement hors ligne, s’installe sur l’écran d’accueil de votre iPhone ou Android, et ne stocke aucune donnée dans le cloud.

**Philosophie :** ouvrir → voir → agir → fermer.

-----

## 🚀 Fonctionnalités

### Suivi des plantes

- Ajouter, modifier, dupliquer et supprimer une plante
- Une photo par plante (prise directe ou galerie)
- Champs : nom, espèce, pièce, notes
- Suivi de l’arrosage (fréquence, volume, dernière date)
- Suivi de l’engrais optionnel (fréquence, quantité, dernière date)

### Urgences & tri automatique

- Calcul automatique de la prochaine date d’arrosage et d’engrais
- Tri des plantes par urgence dès l’ouverture
- Indicateurs visuels : 🚨 en retard · 💧 aujourd’hui · ✅ OK
- Dashboard avec compteurs par statut

### Modes globaux

|Mode          |Effet                                                    |
|--------------|---------------------------------------------------------|
|❄️ **Hiver**   |Multiplie toutes les fréquences × 1,5 (arrondi inférieur)|
|🌴 **Vacances**|Suspend le décompte et met les notifications en pause    |

### Calendrier

- Vue sur 14 jours des prochains arrosages
- Affichage des retards en rouge

### Import / Export Excel

- Export en `.xlsx` (une ligne = une plante)
- Import depuis un fichier `.xlsx` compatible
- Template vide téléchargeable

### PWA & Offline

- Installable sur l’écran d’accueil (iPhone Safari, Android Chrome)
- Fonctionnement 100 % hors ligne après la première ouverture
- Notifications locales pour les rappels d’arrosage

-----

## 🏗️ Architecture

```
bibileaf/
├── index.html                    ← App shell, meta PWA
├── styles.css                    ← Design kawaii complet
├── app.js                        ← Orchestrateur principal
├── manifest.json                 ← Config PWA (icône, couleurs, orientation)
├── service-worker.js             ← Cache offline assets
├── icons/
│   ├── icon-192.png              ← Icône PWA
│   └── icon-512.png              ← Icône haute résolution
└── src/
    ├── storage/
    │   └── idb.js                ← Couche IndexedDB (plants + settings)
    ├── models/
    │   └── plant.js              ← Modèle de données plante
    ├── utils/
    │   ├── date.js               ← Utilitaires dates (format FR, diff, ISO)
    │   └── calc.js               ← Calculs urgence, tri, modes hiver/vacances
    ├── import-export/
    │   └── xlsx.js               ← Import / Export / Template Excel
    └── ui/components/
        ├── card.js               ← Carte plante (liste principale)
        ├── form.js               ← Formulaire ajout / modification
        ├── sheet.js              ← Fiche détail d'une plante
        ├── modal.js              ← Modales, confirmations, toasts
        └── calendar.js           ← Vue calendrier 14 jours
```

-----

## 📦 Modèle de données

Chaque plante est un objet JSON stocké dans IndexedDB :

```json
{
  "id": "uuid-généré",
  "nom": "Mon Ficus",
  "espece": "Ficus lyrata",
  "piece": "Salon",
  "photo": "data:image/jpeg;base64,...",
  "freqEau": 7,
  "volumeEau": "200ml",
  "derniereEau": "2025-05-01",
  "engraisActif": true,
  "freqEngrais": 30,
  "quantiteEngrais": "5ml",
  "dernierEngrais": "2025-04-15",
  "notes": "Exposition lumière indirecte",
  "createdAt": "2025-01-10T10:00:00.000Z"
}
```

Les champs `prochaine date`, `prochaine date engrais` et `urgence` sont **calculés à la volée** — ils ne sont jamais stockés.

-----

## 🧮 Logique de calcul

### Prochaine date d’arrosage

```
prochaine = derniereEau + freqEau
```

En mode hiver :

```
freqEffective = floor(freqEau × 1.5)
prochaine     = derniereEau + freqEffective
```

### Urgence

|Condition                                    |Couleur            |
|---------------------------------------------|-------------------|
|`prochaine < aujourd'hui`                    |🔴 Rouge — en retard|
|`prochaine = aujourd'hui` ou `dans ≤ 2 jours`|🟠 Orange — bientôt |
|`prochaine > aujourd'hui + 2`                |🟢 Vert — OK        |
|Mode vacances actif                          |⚪ Suspendu         |

-----

## 📊 Format Excel (Import / Export)

Le fichier `.xlsx` comporte une feuille `BibiLeaf` avec ces colonnes dans l’ordre :

|Colonne                  |Description                                                |
|-------------------------|-----------------------------------------------------------|
|ID                       |Identifiant interne (laisser vide pour une nouvelle plante)|
|Nom                      |Nom de la plante                                           |
|Espèce                   |Nom botanique                                              |
|Pièce                    |Localisation dans le logement                              |
|Photo URL                |Non utilisé à l’export (photos non exportées)              |
|Fréquence eau (jours)    |Nombre de jours entre chaque arrosage                      |
|Volume eau               |Ex : `200ml`                                               |
|Dernière eau             |Format `YYYY-MM-DD`                                        |
|Engrais activé           |`oui` ou `non`                                             |
|Fréquence engrais (jours)|Nombre de jours entre chaque engrais                       |
|Quantité engrais         |Ex : `5ml`                                                 |
|Dernier engrais          |Format `YYYY-MM-DD`                                        |
|Notes                    |Texte libre                                                |


> ⚠️ Les photos ne sont pas exportées. Elles restent stockées localement dans IndexedDB.

-----

## 🛠️ Déploiement

BibiLeaf est un site statique. Aucun serveur, aucune base de données distante.

### Prérequis

- Hébergement **HTTPS** (obligatoire pour PWA et Service Worker)
- Aucune dépendance serveur

### Étapes

1. **Dézipper** l’archive `bibileaf.zip`
1. **Déposer** les fichiers à la racine de votre hébergeur statique
1. **Vérifier** que `manifest.json` et `service-worker.js` sont accessibles à la racine

### Hébergeurs compatibles (gratuits)

|Service                                         |URL                                         |
|------------------------------------------------|--------------------------------------------|
|[Netlify](https://netlify.com)                  |Glisser-déposer le dossier dans le dashboard|
|[Vercel](https://vercel.com)                    |`vercel deploy` depuis le dossier           |
|[GitHub Pages](https://pages.github.com)        |Push dans un repo public                    |
|[Cloudflare Pages](https://pages.cloudflare.com)|Connexion repo Git                          |

### Installation sur iPhone

1. Ouvrir l’URL dans **Safari**
1. Appuyer sur **Partager** (icône carré avec flèche)
1. Choisir **« Sur l’écran d’accueil »**
1. Valider → BibiLeaf apparaît comme une app native

-----

## 🔔 Notifications

Les notifications sont locales (sans serveur push). Elles sont déclenchées au chargement de l’application si des plantes sont en retard.

> **Note Safari / iOS :** les notifications push en arrière-plan ne sont pas supportées avant iOS 16.4. L’application affiche les alertes à chaque ouverture.

Pour activer les notifications :

1. Aller dans **Réglages → App → Notifications**
1. Ou appuyer sur **🔔 Tester les notifications** dans l’écran Réglages de l’app

-----

## 🎨 Stack technique

|Technologie                                            |Usage                               |
|-------------------------------------------------------|------------------------------------|
|HTML / CSS / JS vanilla                                |Interface, logique, pas de framework|
|IndexedDB                                              |Stockage local persistant           |
|PWA (manifest + service worker)                        |Installation, cache offline         |
|[XLSX.js](https://github.com/SheetJS/sheetjs) `v0.18.5`|Import / Export Excel               |
|Google Fonts — Nunito                                  |Typographie arrondie et douce       |

-----

## 📋 Contraintes respectées

- ✅ Zéro backend
- ✅ Zéro compte utilisateur
- ✅ Zéro cloud
- ✅ Fonctionnement hors ligne complet
- ✅ Compatible iPhone Safari
- ✅ Installable comme PWA
- ✅ Une seule photo par plante
- ✅ Pas d’historique complet des actions
- ✅ Export / Import via un unique template Excel

-----

## 📄 Licence

Usage personnel libre. Projet privé, non destiné à la distribution commerciale.

-----

*Fait avec 🌿 et beaucoup d’amour pour les plantes.*
