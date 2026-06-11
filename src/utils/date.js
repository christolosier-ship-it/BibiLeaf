// src/utils/date.js — Utilitaires de dates

export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(value) {
  if (!value || typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function toISO(date = new Date()) {
  if (!date) return null;
  const localDate = new Date(date);
  if (Number.isNaN(localDate.getTime())) return null;
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISO(today());
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
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
