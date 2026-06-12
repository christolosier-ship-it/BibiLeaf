# BibiLeaf V2.0.0

BibiLeaf est une application locale de routines de soins pour plantes : simple, douce, mobile-first et utilisable hors ligne.

La V2.0.0 transforme BibiLeaf en petit carnet de soins végétal modulaire avec une identité visuelle maison, sans compte, sans cloud, sans publicité et sans backend.

## Nouveautés V2

- **Moteur de soins modulaires** : chaque plante possède des `careTasks` activables.
- **Soins disponibles** : arrosage, engrais, rotation du pot, nettoyage des feuilles, rempotage, brumisation, inspection santé et taille légère.
- **Profils enrichis** : les profils préconfigurent une routine complète, modifiable ensuite.
- **Vue Aujourd’hui** : écran central avec retards, soins du jour, routines à configurer et soins bientôt prévus.
- **Timeline unifiée stylisée** : carnet de soins végétal sur 30 jours avec actions rapides et correction de date.
- **Vue Pièces** : résumé par pièce avec plantes, soins en retard, soins du jour et plantes à surveiller.
- **Icônes SVG/CSS maison** : goutte, feuille, pot, calendrier, réglages et statuts cohérents sur iPhone, Android, tablette et desktop.
- **Carnet santé minimal** : un historique léger est ajouté quand l’état santé change.
- **Suggestions locales** : petites suggestions discrètes, calculées sur l’appareil, sans IA externe.
- **Export calendrier ICS** : export manuel des soins à venir vers un calendrier standard.
- **Sauvegarde JSON V2** : conserve les routines complètes et le carnet santé, sans photos.
- **Excel compatible** : import/export simple conservé, avec colonnes V2 légères.
- **Responsive renforcé** : téléphone, tablette portrait et tablette paysage.

## Modèle de données V2

Les plantes gardent leurs informations principales : nom, espèce, pièce, profil, état santé, notes et photo locale.

La nouveauté est le tableau `careTasks` :

```json
{
  "id": "water",
  "type": "water",
  "label": "Arrosage",
  "iconName": "water",
  "enabled": true,
  "frequencyDays": 7,
  "lastDoneAt": "2026-06-11",
  "quantity": "200 ml",
  "winterSensitive": true
}
```

Les anciens champs V1 (`freqEau`, `derniereEau`, `engraisActif`, `freqEngrais`, etc.) restent présents pour compatibilité temporaire, mais le moteur V2 calcule les urgences depuis `careTasks`.

## Migration depuis V1.3.0

Au démarrage, BibiLeaf migre les plantes existantes vers `schemaVersion: 2` :

- l’arrosage V1 devient le soin `water` ;
- l’engrais V1 devient le soin `fertilizer` ;
- les autres soins sont ajoutés désactivés ou selon profil ;
- les photos IndexedDB restent intactes ;
- les réglages utilisateur sont conservés ;
- une sauvegarde locale légère pré-migration est stockée en interne ;
- les dates futures importées sont corrigées vers la date locale du jour.

## Confidentialité

BibiLeaf reste une PWA locale :

- aucun compte ;
- aucun cloud ;
- aucune publicité ;
- aucun backend ;
- données stockées localement dans IndexedDB ;
- photos stockées localement uniquement ;
- les exports JSON, Excel et ICS n’incluent jamais les photos.

## Installation PWA

1. Ouvrir BibiLeaf dans un navigateur mobile compatible.
2. Ajouter l’application à l’écran d’accueil.
3. Après le premier chargement, l’application fonctionne hors ligne grâce au service worker.

## Sauvegardes

- **JSON V2** : recommandé pour conserver les routines complètes et le carnet santé, sans photos.
- **Excel** : prévu pour une édition simple et compatible avec les anciens fichiers.
- **ICS** : export manuel des soins à venir, sans synchronisation automatique.

## Limites assumées

- Les notifications dépendent du navigateur, du système et de l’installation PWA.
- BibiLeaf ne fait pas de diagnostic automatique des maladies.
- BibiLeaf ne modifie pas automatiquement les fréquences via suggestions.
- L’export calendrier est manuel : il ne synchronise pas un agenda externe.

## Stack

- HTML / CSS / JavaScript vanilla.
- IndexedDB.
- Service worker offline-first.
- Compatible GitHub Pages.
- Aucune dépendance lourde ni framework.
