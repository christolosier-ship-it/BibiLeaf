// src/models/plant.js — Modèle de données plante

export const APP_VERSION = '1.3.0';

export const PLANT_PROFILES = {
  custom: { label: 'Personnalisé' },
  classic: { label: 'Plante classique', freqEau: 7, volumeEau: '200ml', engraisActif: true, freqEngrais: 30, quantiteEngrais: '5ml' },
  tropical: { label: 'Tropicale', freqEau: 5, volumeEau: '250ml', engraisActif: true, freqEngrais: 21, quantiteEngrais: '5ml' },
  succulent: { label: 'Succulente', freqEau: 14, volumeEau: '80ml', engraisActif: false, freqEngrais: 45, quantiteEngrais: '' },
  cactus: { label: 'Cactus', freqEau: 21, volumeEau: '50ml', engraisActif: false, freqEngrais: 60, quantiteEngrais: '' },
  thirsty: { label: 'Grande soiffarde', freqEau: 3, volumeEau: '300ml', engraisActif: true, freqEngrais: 21, quantiteEngrais: '5ml' },
  delicate: { label: 'Délicate', freqEau: 4, volumeEau: '120ml', engraisActif: false, freqEngrais: 45, quantiteEngrais: '' },
};

export const HEALTH_STATUSES = {
  unknown: { label: '— Non renseigné', shortLabel: 'Non renseigné' },
  good: { label: '😊 Belle forme', shortLabel: '😊 Belle forme' },
  watch: { label: '😐 À surveiller', shortLabel: '😐 À surveiller' },
  bad: { label: '🥀 En difficulté', shortLabel: '🥀 En difficulté' },
};

export function normalizePlantProfile(value) {
  return Object.prototype.hasOwnProperty.call(PLANT_PROFILES, value) ? value : 'custom';
}

export function normalizeHealthStatus(value) {
  return Object.prototype.hasOwnProperty.call(HEALTH_STATUSES, value) ? value : 'unknown';
}

export function applyPlantProfile(data, profileKey) {
  const preset = PLANT_PROFILES[normalizePlantProfile(profileKey)];
  if (!preset || profileKey === 'custom') return { ...data, profilPlante: 'custom' };
  return {
    ...data,
    profilPlante: profileKey,
    freqEau: preset.freqEau,
    volumeEau: preset.volumeEau,
    engraisActif: preset.engraisActif,
    freqEngrais: preset.freqEngrais,
    quantiteEngrais: preset.quantiteEngrais,
  };
}

export function createPlant(data = {}) {
  return {
    id: data.id || crypto.randomUUID(),
    nom: data.nom || '',
    espece: data.espece || '',
    piece: data.piece || '',
    profilPlante: normalizePlantProfile(data.profilPlante),
    healthStatus: normalizeHealthStatus(data.healthStatus),
    photo: data.photo || null,          // base64 string ou null
    freqEau: data.freqEau || 7,         // jours
    volumeEau: data.volumeEau || '',    // ex: "200ml"
    derniereEau: data.derniereEau || null, // ISO date string
    engraisActif: data.engraisActif || false,
    freqEngrais: data.freqEngrais || 30,
    quantiteEngrais: data.quantiteEngrais || '',
    dernierEngrais: data.dernierEngrais || null,
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export function duplicatePlant(plant) {
  return createPlant({
    ...plant,
    id: crypto.randomUUID(),
    nom: plant.nom + ' (copie)',
    createdAt: new Date().toISOString(),
  });
}
