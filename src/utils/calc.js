// src/utils/calc.js — Moteur générique de soins modulaires V2

import { addDays, diffDays, parseDate, today, toISO } from './date.js';
import { CARE_TASK_DEFS, normalizeCareTasks } from '../models/plant.js';

export const CARE_STATUS = {
  late:   { rank: 6, iconName: 'late', label: 'Retard', cls: 'urgent-red' },
  today:  { rank: 5, iconName: 'today', label: "Aujourd’hui", cls: 'urgent-orange' },
  setup:  { rank: 4, iconName: 'setup', label: 'À configurer', cls: 'urgent-setup' },
  soon:   { rank: 3, iconName: 'soon', label: 'Bientôt', cls: 'urgent-soon' },
  ok:     { rank: 2, iconName: 'ok', label: 'OK', cls: 'urgent-green' },
  paused: { rank: 1, iconName: 'paused', label: 'Pause', cls: 'urgent-none' },
  disabled: { rank: 0, iconName: 'paused', label: 'Désactivé', cls: 'urgent-none' },
  none:   { rank: 0, iconName: 'plant', label: '—', cls: 'urgent-none' },
};

export function effectiveFreq(freq, winterMode, task = {}) {
  const safeFreq = Number(freq);
  if (!Number.isFinite(safeFreq) || safeFreq <= 0) return null;
  if (winterMode && task.winterSensitive) return Math.max(1, Math.floor(safeFreq * 1.5));
  return safeFreq;
}

export function getCareTaskStatus(task, settings = {}, currentToday = today()) {
  const def = CARE_TASK_DEFS[task?.type] || {};
  const normalized = { ...task, label: task?.label || def.label, iconName: task?.iconName || def.iconName };
  if (!normalized.enabled) return buildStatus(normalized, null, null, 'disabled', 'Désactivé');
  if (settings.vacationMode) return buildStatus(normalized, null, null, 'paused', 'Pause vacances');

  const freq = effectiveFreq(normalized.frequencyDays, !!settings.winterMode, normalized);
  const last = parseDate(normalized.lastDoneAt);
  if (!freq || !last) return buildStatus(normalized, null, null, 'setup', 'À configurer');

  const due = addDays(last, freq);
  const dueDate = toISO(due);
  const diff = diffDays(due, currentToday);
  let taskStatus = 'ok';
  if (diff < 0) taskStatus = 'late';
  else if (diff === 0) taskStatus = 'today';
  else if (diff <= 2) taskStatus = 'soon';

  return buildStatus(normalized, dueDate, diff, taskStatus, careLabel(taskStatus, diff, normalized.type));
}

function buildStatus(task, dueDate, diffDaysValue, status, labelText) {
  const statusBase = { late: 0, today: 1000, setup: 1800, soon: 2200, ok: 4000, paused: 8000, disabled: 9000, none: 9999 }[status] ?? 9999;
  const sortScore = status === 'late' ? diffDaysValue : statusBase + (diffDaysValue ?? 999);
  return {
    taskId: task.id || task.type,
    type: task.type,
    label: task.label,
    iconName: task.iconName,
    enabled: !!task.enabled,
    dueDate,
    diffDays: diffDaysValue,
    status,
    labelText,
    label: labelText,
    sortScore,
    quantity: task.quantity || '',
    notes: task.notes || '',
    frequencyDays: task.frequencyDays,
  };
}

export function careLabel(status, diff, type = '') {
  if (status === 'paused') return 'Pause vacances';
  if (status === 'setup') return 'À configurer';
  if (status === 'disabled') return 'Désactivé';
  if (status === 'late') {
    if (type === 'repotting') return `Rempotage conseillé · ${Math.abs(diff)} j`;
    return `Retard de ${Math.abs(diff)} j`;
  }
  if (status === 'today') return "Aujourd’hui";
  if (diff === 1) return 'Demain';
  return `Dans ${diff} j`;
}

export function getPlantCareStatus(plant, options = {}) {
  const tasks = normalizeCareTasks(plant);
  const statuses = tasks.map(task => getCareTaskStatus(task, options));
  const activeTasks = statuses.filter(task => task.enabled && task.status !== 'disabled');
  const dueTasks = activeTasks.filter(task => ['late', 'today'].includes(task.status));
  const lateTasks = activeTasks.filter(task => task.status === 'late');
  const todayTasks = activeTasks.filter(task => task.status === 'today');
  const soonTasks = activeTasks.filter(task => task.status === 'soon');
  const setupTasks = activeTasks.filter(task => task.status === 'setup');
  const sortedActive = [...activeTasks].sort(compareTaskStatus);
  const mainTask = sortedActive[0] || null;
  const water = statuses.find(task => task.type === 'water') || getCareTaskStatus({ type: 'water', enabled: false }, options);
  const fertilizer = statuses.find(task => task.type === 'fertilizer') || getCareTaskStatus({ type: 'fertilizer', enabled: false }, options);
  return {
    plantId: plant.id,
    plantName: plant.nom || 'Sans nom',
    tasks: statuses,
    activeTasks,
    dueTasks,
    lateTasks,
    todayTasks,
    soonTasks,
    setupTasks,
    mainStatus: options.vacationMode ? 'paused' : (mainTask?.status || 'none'),
    mainTask,
    mainAction: mainTask?.type || null,
    sortScore: options.vacationMode ? 8000 : (mainTask?.sortScore ?? 9999),
    water,
    fertilizer,
  };
}

export function getAllCareEvents(plants, settings = {}, options = {}) {
  const horizonDays = options.horizonDays ?? 30;
  const includeSetup = options.includeSetup ?? true;
  const start = options.today || today();
  const events = [];
  plants.forEach(plant => {
    const care = getPlantCareStatus(plant, settings);
    care.activeTasks.forEach(task => {
      if (task.status === 'setup') {
        if (includeSetup) events.push(toEvent(plant, task));
        return;
      }
      if (!task.dueDate || task.status === 'paused') return;
      const due = parseDate(task.dueDate);
      if (!due) return;
      const delta = diffDays(due, start);
      if (delta <= horizonDays) events.push(toEvent(plant, task));
    });
  });
  return events.sort((a, b) => {
    if (a.status !== b.status) return statusOrder(a) - statusOrder(b);
    if ((a.diffDays ?? 9999) !== (b.diffDays ?? 9999)) return (a.diffDays ?? 9999) - (b.diffDays ?? 9999);
    if (a.plantName !== b.plantName) return a.plantName.localeCompare(b.plantName, 'fr');
    return a.taskLabel.localeCompare(b.taskLabel, 'fr');
  });
}

function toEvent(plant, task) {
  return {
    plantId: plant.id,
    plantName: plant.nom || 'Sans nom',
    room: plant.piece || '',
    taskId: task.taskId,
    taskType: task.type,
    taskLabel: task.labelText === 'À configurer' ? (CARE_TASK_DEFS[task.type]?.label || task.type) : (CARE_TASK_DEFS[task.type]?.label || task.type),
    iconName: task.iconName,
    dueDate: task.dueDate,
    diffDays: task.diffDays,
    status: task.status,
    labelText: task.labelText,
    quantity: task.quantity,
    healthStatus: plant.healthStatus || 'unknown',
  };
}

function statusOrder(item) {
  return { late: 0, today: 1, setup: 2, soon: 3, ok: 4, paused: 5, disabled: 6 }[item.status] ?? 9;
}

function compareTaskStatus(a, b) {
  const rankDiff = statusOrder(a) - statusOrder(b);
  if (rankDiff !== 0) return rankDiff;
  if ((a.diffDays ?? 9999) !== (b.diffDays ?? 9999)) return (a.diffDays ?? 9999) - (b.diffDays ?? 9999);
  return String(a.labelText).localeCompare(String(b.labelText), 'fr');
}

export function nextWaterDate(plant, winterMode) {
  return getPlantCareStatus(plant, { winterMode }).water.dueDate;
}

export function nextFertDate(plant, winterMode) {
  return getPlantCareStatus(plant, { winterMode }).fertilizer.dueDate;
}

export function getDueStatus(dueDate, vacationMode = false) {
  if (vacationMode) return 'paused';
  const parsed = parseDate(dueDate);
  if (!parsed) return 'setup';
  const diff = diffDays(parsed, today());
  if (diff < 0) return 'late';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'soon';
  return 'ok';
}

export function status(plant, winterMode, vacationMode) {
  return getPlantCareStatus(plant, { winterMode, vacationMode }).mainStatus;
}

export function urgency(plant, winterMode, vacationMode) {
  const current = status(plant, winterMode, vacationMode);
  if (current === 'late') return 'red';
  if (current === 'today' || current === 'soon') return 'orange';
  if (current === 'ok') return 'green';
  return 'none';
}

export function urgencyScore(plant, winterMode, vacationMode) {
  return getPlantCareStatus(plant, { winterMode, vacationMode }).sortScore;
}

export function sortByUrgency(plants, winterMode, vacationMode) {
  return [...plants].sort((a, b) => {
    const diff = urgencyScore(a, winterMode, vacationMode) - urgencyScore(b, winterMode, vacationMode);
    if (diff !== 0) return diff;
    return String(a.nom || '').localeCompare(String(b.nom || ''), 'fr');
  });
}
