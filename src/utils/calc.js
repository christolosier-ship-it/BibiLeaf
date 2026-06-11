// src/utils/calc.js — Calculs métier

import { today, parseDate, addDays, diffDays, toISO } from './date.js';

export const CARE_STATUS = {
  late:   { rank: 4, emoji: '🚨', label: 'Retard', cls: 'urgent-red' },
  today:  { rank: 3, emoji: '💧', label: "Aujourd'hui", cls: 'urgent-orange' },
  soon:   { rank: 2, emoji: '🟡', label: 'Bientôt', cls: 'urgent-soon' },
  ok:     { rank: 1, emoji: '✅', label: 'OK', cls: 'urgent-green' },
  paused: { rank: 0, emoji: '🌴', label: 'Pause vacances', cls: 'urgent-none' },
  none:   { rank: 0, emoji: '😴', label: '—', cls: 'urgent-none' },
};

/**
 * Calcule la fréquence effective selon les modes globaux
 */
export function effectiveFreq(freq, winterMode) {
  const safeFreq = Number(freq);
  if (!Number.isFinite(safeFreq) || safeFreq <= 0) return null;
  if (winterMode) return Math.max(1, Math.floor(safeFreq * 1.5));
  return safeFreq;
}

/**
 * Retourne la prochaine date d'arrosage (ISO string)
 */
export function nextWaterDate(plant, winterMode) {
  if (!plant.derniereEau) return null;
  const last = parseDate(plant.derniereEau);
  if (!last) return null;
  const freq = effectiveFreq(plant.freqEau, winterMode);
  if (!freq) return null;
  return toISO(addDays(last, freq));
}

/**
 * Retourne la prochaine date d'engrais (ISO string)
 */
export function nextFertDate(plant, winterMode) {
  if (!plant.engraisActif || !plant.dernierEngrais) return null;
  const last = parseDate(plant.dernierEngrais);
  if (!last) return null;
  const freq = effectiveFreq(plant.freqEngrais, winterMode);
  if (!freq) return null;
  return toISO(addDays(last, freq));
}

export function getDueStatus(dueDate, vacationMode = false) {
  if (vacationMode) return 'paused';
  const parsed = parseDate(dueDate);
  if (!parsed) return 'none';
  const diff = diffDays(parsed, today());
  if (diff < 0) return 'late';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'soon';
  return 'ok';
}

export function careLabel(status, diff, action = 'water') {
  if (status === 'paused') return 'Pause vacances';
  if (status === 'none') return '—';
  if (status === 'late') return `Retard de ${Math.abs(diff)} j`;
  if (status === 'today') return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return `Dans ${diff} j`;
}

function buildCareItem({ enabled, dueDate, action, vacationMode }) {
  if (!enabled) {
    return { enabled: false, dueDate: null, diffDays: null, status: 'none', label: '—' };
  }

  if (vacationMode) {
    return { enabled: true, dueDate, diffDays: null, status: 'paused', label: 'Pause vacances' };
  }

  const parsed = parseDate(dueDate);
  if (!parsed) {
    return { enabled: false, dueDate: null, diffDays: null, status: 'none', label: '—' };
  }

  const diff = diffDays(parsed, today());
  const status = getDueStatus(dueDate, false);
  return { enabled: true, dueDate, diffDays: diff, status, label: careLabel(status, diff, action) };
}

function actionSortScore(item) {
  if (!item.enabled) return 9999;
  if (item.status === 'late') return item.diffDays; // négatif : gros retards avant petits retards
  if (item.status === 'today') return 0;
  if (item.status === 'soon') return item.diffDays;
  if (item.status === 'ok') return 100 + item.diffDays;
  return 9998;
}

function pickMainAction(water, fertilizer) {
  const enabled = [
    { action: 'water', item: water },
    { action: 'fertilizer', item: fertilizer },
  ].filter(({ item }) => item.enabled);

  if (enabled.length === 0) return null;

  enabled.sort((a, b) => {
    const rankDiff = CARE_STATUS[b.item.status].rank - CARE_STATUS[a.item.status].rank;
    if (rankDiff !== 0) return rankDiff;
    return actionSortScore(a.item) - actionSortScore(b.item);
  });

  return enabled[0].action;
}

export function getPlantCareStatus(plant, options = {}) {
  const winterMode = !!options.winterMode;
  const vacationMode = !!options.vacationMode;
  const waterDue = nextWaterDate(plant, winterMode);
  const fertDue = nextFertDate(plant, winterMode);

  if (vacationMode) {
    return {
      water: buildCareItem({ enabled: !!waterDue, dueDate: waterDue, action: 'water', vacationMode: true }),
      fertilizer: buildCareItem({ enabled: !!fertDue, dueDate: fertDue, action: 'fertilizer', vacationMode: true }),
      mainStatus: 'paused',
      mainAction: null,
      sortScore: 9000,
    };
  }

  const water = buildCareItem({ enabled: !!waterDue, dueDate: waterDue, action: 'water', vacationMode: false });
  const fertilizer = buildCareItem({ enabled: !!fertDue, dueDate: fertDue, action: 'fertilizer', vacationMode: false });
  const mainAction = pickMainAction(water, fertilizer);
  const mainItem = mainAction === 'fertilizer' ? fertilizer : water;
  const mainStatus = mainAction ? mainItem.status : 'none';

  let sortScore = 9999;
  if (mainAction) {
    const statusBase = { late: 0, today: 1000, soon: 2000, ok: 3000, none: 9999 }[mainStatus] ?? 9999;
    sortScore = statusBase + actionSortScore(mainItem);
  }

  return { water, fertilizer, mainStatus, mainAction, sortScore };
}

/**
 * Calcule l'urgence principale.
 * Retourne : 'late' | 'today' | 'soon' | 'ok' | 'paused' | 'none'
 */
export function status(plant, winterMode, vacationMode) {
  return getPlantCareStatus(plant, { winterMode, vacationMode }).mainStatus;
}

/**
 * Compatibilité V1.0.x : retourne les anciennes couleurs d'urgence.
 */
export function urgency(plant, winterMode, vacationMode) {
  const current = status(plant, winterMode, vacationMode);
  if (current === 'late') return 'red';
  if (current === 'today' || current === 'soon') return 'orange';
  if (current === 'ok') return 'green';
  return 'none';
}

/**
 * Score pour le tri (plus bas = plus urgent)
 */
export function urgencyScore(plant, winterMode, vacationMode) {
  return getPlantCareStatus(plant, { winterMode, vacationMode }).sortScore;
}

/**
 * Trie les plantes par urgence combinée eau + engrais
 */
export function sortByUrgency(plants, winterMode, vacationMode) {
  return [...plants].sort((a, b) => {
    if (vacationMode) {
      return String(a.nom || '').localeCompare(String(b.nom || ''), 'fr');
    }
    const diff = urgencyScore(a, winterMode, vacationMode) - urgencyScore(b, winterMode, vacationMode);
    if (diff !== 0) return diff;
    return String(a.nom || '').localeCompare(String(b.nom || ''), 'fr');
  });
}
