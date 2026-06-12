// src/models/plant.js — Modèle de données plante + routines V2

import { parseDate, today, todayISO, diffDays } from '../utils/date.js';

export const APP_VERSION = '2.0.1';
export const SCHEMA_VERSION = 2;

export const CARE_TASK_DEFS = {
  water: { label: 'Arrosage', iconName: 'water', defaultFrequencyDays: 7, quantityLabel: 'Volume', actionLabel: 'Arrosée', winterSensitive: true },
  fertilizer: { label: 'Engrais', iconName: 'fertilizer', defaultFrequencyDays: 30, quantityLabel: 'Quantité', actionLabel: 'Engrais fait', winterSensitive: false },
  rotation: { label: 'Rotation du pot', iconName: 'rotation', defaultFrequencyDays: 30, quantityLabel: 'Note', actionLabel: 'Rotation faite', winterSensitive: false },
  leaf_cleaning: { label: 'Nettoyage feuilles', iconName: 'leafCleaning', defaultFrequencyDays: 30, quantityLabel: 'Note', actionLabel: 'Nettoyage fait', winterSensitive: false },
  repotting: { label: 'Rempotage', iconName: 'repotting', defaultFrequencyDays: 730, quantityLabel: 'Note', actionLabel: 'Rempotage fait', winterSensitive: false },
  misting: { label: 'Brumisation', iconName: 'misting', defaultFrequencyDays: 3, quantityLabel: 'Note', actionLabel: 'Brumisation faite', winterSensitive: false },
  health_check: { label: 'Inspection santé', iconName: 'healthCheck', defaultFrequencyDays: 14, quantityLabel: 'Note', actionLabel: 'Inspection faite', winterSensitive: false },
  pruning: { label: 'Taille légère', iconName: 'pruning', defaultFrequencyDays: 90, quantityLabel: 'Note', actionLabel: 'Taille faite', winterSensitive: false },
};

const PROFILE_TASKS = {
  custom: null,
  classic: [
    ['water', true, 7, '200 ml'], ['fertilizer', true, 30, '5 ml'], ['rotation', false, 30, ''], ['leaf_cleaning', false, 30, ''], ['repotting', true, 730, ''], ['misting', false, 3, ''], ['health_check', false, 14, ''], ['pruning', false, 90, ''],
  ],
  tropical: [
    ['water', true, 5, '250 ml'], ['fertilizer', true, 21, '5 ml'], ['rotation', true, 30, ''], ['leaf_cleaning', true, 30, ''], ['repotting', true, 545, ''], ['misting', false, 3, ''], ['health_check', false, 14, ''], ['pruning', false, 90, ''],
  ],
  succulent: [
    ['water', true, 14, '80 ml'], ['fertilizer', false, 45, ''], ['rotation', true, 30, ''], ['leaf_cleaning', false, 30, ''], ['repotting', true, 730, ''], ['misting', false, 7, ''], ['health_check', false, 14, ''], ['pruning', false, 120, ''],
  ],
  cactus: [
    ['water', true, 21, '50 ml'], ['fertilizer', false, 60, ''], ['rotation', false, 30, ''], ['leaf_cleaning', false, 45, ''], ['repotting', true, 730, ''], ['misting', false, 7, ''], ['health_check', false, 21, ''], ['pruning', false, 180, ''],
  ],
  thirsty: [
    ['water', true, 3, '300 ml'], ['fertilizer', true, 21, '5 ml'], ['rotation', false, 30, ''], ['leaf_cleaning', false, 30, ''], ['repotting', true, 365, ''], ['misting', false, 3, ''], ['health_check', true, 14, ''], ['pruning', false, 90, ''],
  ],
  delicate: [
    ['water', true, 4, '120 ml'], ['fertilizer', false, 45, ''], ['rotation', false, 30, ''], ['leaf_cleaning', true, 30, ''], ['repotting', true, 545, ''], ['misting', false, 3, ''], ['health_check', true, 7, ''], ['pruning', false, 90, ''],
  ],
  large_leaf: [
    ['water', true, 7, '220 ml'], ['fertilizer', true, 30, '5 ml'], ['rotation', true, 30, ''], ['leaf_cleaning', true, 21, ''], ['repotting', true, 545, ''], ['misting', false, 3, ''], ['health_check', false, 14, ''], ['pruning', false, 90, ''],
  ],
  flowering: [
    ['water', true, 6, '180 ml'], ['fertilizer', true, 21, '5 ml'], ['rotation', false, 30, ''], ['leaf_cleaning', false, 30, ''], ['repotting', true, 545, ''], ['misting', false, 4, ''], ['health_check', true, 14, ''], ['pruning', false, 90, ''],
  ],
};

export const PLANT_PROFILES = {
  custom: { label: 'Personnalisé', description: 'Tu ajustes chaque routine à ta façon.' },
  classic: { label: 'Plante classique', description: 'Une routine simple et régulière.' },
  tropical: { label: 'Tropicale', description: 'Aime un suivi régulier et une ambiance douce.' },
  succulent: { label: 'Succulente', description: 'Préfère sécher entre deux arrosages.' },
  cactus: { label: 'Cactus', description: 'Arrosages espacés, surtout en hiver.' },
  thirsty: { label: 'Grande soiffarde', description: 'Demande une attention plus fréquente.' },
  delicate: { label: 'Délicate', description: 'Petite routine attentive, sans excès.' },
  large_leaf: { label: 'Grandes feuilles', description: 'Nettoyage doux et rotation régulière.' },
  flowering: { label: 'Fleurie', description: 'Arrosage régulier et engrais un peu plus présent.' },
};

export const HEALTH_STATUSES = {
  unknown: { label: '— Non renseigné', shortLabel: 'Non renseigné' },
  good: { label: 'Belle forme', shortLabel: 'Belle forme' },
  watch: { label: 'À surveiller', shortLabel: 'À surveiller' },
  bad: { label: 'En difficulté', shortLabel: 'En difficulté' },
};

export function normalizePlantProfile(value) {
  return Object.prototype.hasOwnProperty.call(PLANT_PROFILES, value) ? value : 'custom';
}

export function normalizeHealthStatus(value) {
  return Object.prototype.hasOwnProperty.call(HEALTH_STATUSES, value) ? value : 'unknown';
}

export function sanitizePastDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return diffDays(parsed, today()) > 0 ? todayISO() : value;
}

export function createCareTask(type, data = {}) {
  const def = CARE_TASK_DEFS[type] || CARE_TASK_DEFS.water;
  const now = new Date().toISOString();
  return {
    id: data.id || type,
    type,
    label: data.label || def.label,
    iconName: data.iconName || def.iconName,
    enabled: data.enabled !== undefined ? !!data.enabled : type === 'water',
    frequencyDays: Number(data.frequencyDays) > 0 ? Number(data.frequencyDays) : def.defaultFrequencyDays,
    lastDoneAt: sanitizePastDate(data.lastDoneAt) || null,
    quantity: data.quantity || '',
    seasonMode: data.seasonMode || 'all',
    winterSensitive: data.winterSensitive !== undefined ? !!data.winterSensitive : !!def.winterSensitive,
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  };
}

export function careTasksFromProfile(profileKey, existingPlant = {}) {
  const profile = normalizePlantProfile(profileKey);
  const preset = PROFILE_TASKS[profile] || PROFILE_TASKS.classic;
  const existingTasks = Array.isArray(existingPlant.careTasks) ? existingPlant.careTasks : [];
  const knownLastDone = new Map(existingTasks.map(task => [task.type || task.id, sanitizePastDate(task.lastDoneAt)]));
  const legacyLast = {
    water: sanitizePastDate(existingPlant.derniereEau),
    fertilizer: sanitizePastDate(existingPlant.dernierEngrais),
  };
  return preset.map(([type, enabled, frequencyDays, quantity]) => createCareTask(type, {
    enabled,
    frequencyDays,
    quantity,
    lastDoneAt: knownLastDone.get(type) || legacyLast[type] || null,
  }));
}

export function applyPlantProfile(data, profileKey) {
  const profile = normalizePlantProfile(profileKey);
  if (profile === 'custom') return { ...data, profilPlante: 'custom' };
  const careTasks = careTasksFromProfile(profile, data);
  const water = careTasks.find(t => t.type === 'water');
  const fertilizer = careTasks.find(t => t.type === 'fertilizer');
  return {
    ...data,
    profilPlante: profile,
    freqEau: water?.frequencyDays || data.freqEau || 7,
    volumeEau: water?.quantity || data.volumeEau || '',
    engraisActif: !!fertilizer?.enabled,
    freqEngrais: fertilizer?.frequencyDays || data.freqEngrais || 30,
    quantiteEngrais: fertilizer?.quantity || data.quantiteEngrais || '',
    careTasks,
  };
}

export function normalizeCareTasks(data = {}) {
  if (Array.isArray(data.careTasks) && data.careTasks.length) {
    const byType = new Map(data.careTasks.map(task => [task.type || task.id, task]));
    return Object.keys(CARE_TASK_DEFS).map(type => createCareTask(type, byType.get(type) || { enabled: false }));
  }
  const water = createCareTask('water', {
    enabled: true,
    frequencyDays: data.freqEau || 7,
    quantity: data.volumeEau || '',
    lastDoneAt: data.derniereEau,
  });
  const fertilizer = createCareTask('fertilizer', {
    enabled: !!data.engraisActif,
    frequencyDays: data.freqEngrais || 30,
    quantity: data.quantiteEngrais || '',
    lastDoneAt: data.dernierEngrais,
  });
  const rest = Object.keys(CARE_TASK_DEFS)
    .filter(type => !['water', 'fertilizer'].includes(type))
    .map(type => createCareTask(type, { enabled: false }));
  return [water, fertilizer, ...rest];
}

export function createPlant(data = {}) {
  const now = new Date().toISOString();
  const careTasks = normalizeCareTasks(data);
  const water = careTasks.find(t => t.type === 'water');
  const fertilizer = careTasks.find(t => t.type === 'fertilizer');
  return {
    id: data.id || crypto.randomUUID(),
    nom: data.nom || '',
    espece: data.espece || '',
    piece: data.piece || '',
    profilPlante: normalizePlantProfile(data.profilPlante),
    healthStatus: normalizeHealthStatus(data.healthStatus),
    healthHistory: Array.isArray(data.healthHistory) ? data.healthHistory.slice(-20) : [],
    photo: data.photo || null,
    freqEau: water?.frequencyDays || data.freqEau || 7,
    volumeEau: water?.quantity || data.volumeEau || '',
    derniereEau: water?.lastDoneAt || sanitizePastDate(data.derniereEau),
    engraisActif: !!fertilizer?.enabled,
    freqEngrais: fertilizer?.frequencyDays || data.freqEngrais || 30,
    quantiteEngrais: fertilizer?.quantity || data.quantiteEngrais || '',
    dernierEngrais: fertilizer?.lastDoneAt || sanitizePastDate(data.dernierEngrais),
    careTasks,
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function migratePlantToV2(plant) {
  const migrated = createPlant(plant);
  return { ...plant, ...migrated, photo: plant.photo || null, schemaVersion: SCHEMA_VERSION };
}

export function plantWithoutPhoto(plant) {
  const clean = createPlant({ ...plant, photo: null });
  const { photo, ...withoutPhoto } = clean;
  return withoutPhoto;
}

export function duplicatePlant(plant) {
  return createPlant({
    ...plant,
    id: crypto.randomUUID(),
    nom: `${plant.nom || 'Plante'} (copie)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
