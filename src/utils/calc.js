// src/utils/calc.js — Calculs métier

import { today, parseDate, addDays, diffDays, toISO } from './date.js';

/**
 * Calcule la fréquence effective selon les modes globaux
 */
export function effectiveFreq(freq, winterMode) {
  if (winterMode) return Math.floor(freq * 1.5);
  return freq;
}

/**
 * Retourne la prochaine date d'arrosage (ISO string)
 */
export function nextWaterDate(plant, winterMode) {
  if (!plant.derniereEau) return null;
  const last = parseDate(plant.derniereEau);
  if (!last) return null;
  const freq = effectiveFreq(plant.freqEau, winterMode);
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
  return toISO(addDays(last, freq));
}

/**
 * Calcule l'urgence d'arrosage
 * Retourne : 'red' | 'orange' | 'green' | 'none'
 */
export function urgency(plant, winterMode, vacationMode) {
  if (vacationMode) return 'none';
  const nextDate = nextWaterDate(plant, winterMode);
  if (!nextDate) return 'none';
  const diff = diffDays(parseDate(nextDate), today());
  if (diff < 0) return 'red';      // en retard
  if (diff === 0) return 'orange'; // aujourd'hui
  if (diff <= 2) return 'orange';  // dans 1-2 jours
  return 'green';
}

/**
 * Score pour le tri (plus bas = plus urgent)
 */
export function urgencyScore(plant, winterMode, vacationMode) {
  const nextDate = nextWaterDate(plant, winterMode);
  if (!nextDate) return 9999;
  if (vacationMode) return 9998;
  return diffDays(parseDate(nextDate), today());
}

/**
 * Trie les plantes par urgence
 */
export function sortByUrgency(plants, winterMode, vacationMode) {
  return [...plants].sort((a, b) =>
    urgencyScore(a, winterMode, vacationMode) - urgencyScore(b, winterMode, vacationMode)
  );
}
