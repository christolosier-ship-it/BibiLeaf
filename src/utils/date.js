// src/utils/date.js — Utilitaires de dates

export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  d.setHours(0, 0, 0, 0);
  return isNaN(d) ? null : d;
}

export function toISO(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

export function todayISO() {
  return toISO(today());
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function diffDays(a, b) {
  const ms = a - b;
  return Math.round(ms / 86400000);
}

/** Formatte une date en français lisible */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  if (!d) return '—';
  const diff = diffDays(d, today());
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  if (diff > 1 && diff < 7) return `Dans ${diff} j`;
  if (diff < 0) return `Il y a ${Math.abs(diff)} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
