// src/ui/components/card.js — Carte plante V2

import { CARE_STATUS, getPlantCareStatus } from '../../utils/calc.js';
import { esc } from '../../utils/html.js';
import { PLANT_PROFILES, HEALTH_STATUSES, CARE_TASK_DEFS, normalizePlantProfile, normalizeHealthStatus } from '../../models/plant.js';
import { icon } from '../icons.js';

function mainBadge(care) {
  const cfg = CARE_STATUS[care.mainStatus] || CARE_STATUS.none;
  return `${icon(cfg.iconName, { size: 'small' })}<span>${esc(cfg.label)}</span>`;
}

function taskLine(task) {
  if (!task?.enabled || task.status === 'disabled') return '';
  const label = CARE_TASK_DEFS[task.type]?.label || task.type;
  const extra = task.quantity ? ` · ${esc(task.quantity)}` : '';
  return `<span class="card-task card-task--${esc(task.status)}">${icon(task.iconName, { size: 'small' })}<span>${esc(label)} · ${esc(task.statusLabel || task.labelText || task.taskLabel)}${extra}</span></span>`;
}

export function renderCard(plant, winterMode, vacationMode, handlers) {
  const care = getPlantCareStatus(plant, { winterMode, vacationMode });
  const cfg = CARE_STATUS[care.mainStatus] || CARE_STATUS.none;
  const profile = PLANT_PROFILES[normalizePlantProfile(plant.profilPlante)];
  const healthKey = normalizeHealthStatus(plant.healthStatus);
  const health = HEALTH_STATUSES[healthKey];
  const healthBadge = healthKey === 'unknown' ? '' : `<span class="card-health card-health--${esc(healthKey)}">${icon(healthKey === 'good' ? 'ok' : 'healthCheck', { size: 'small' })}${esc(health.shortLabel)}</span>`;
  const previewTasks = care.activeTasks.filter(t => t.status !== 'disabled').slice(0, 2);
  const mainTask = care.mainTask || care.activeTasks[0] || care.water;

  const card = document.createElement('div');
  card.className = `plant-card plant-card--v2 ${cfg.cls}`;
  card.dataset.id = plant.id;

  const photo = plant.photo
    ? `<img src="${esc(plant.photo)}" alt="${esc(plant.nom)}" class="card-photo">`
    : `<div class="card-photo card-photo--empty">${icon('plant', { size: 'large' })}</div>`;

  card.innerHTML = `
    <div class="card-left">${photo}</div>
    <div class="card-body">
      <div class="card-header">
        <span class="card-name">${esc(plant.nom || 'Sans nom')}</span>
        <span class="urgency-badge ${cfg.cls}">${mainBadge(care)}</span>
      </div>
      ${plant.espece ? `<div class="card-species">${esc(plant.espece)}</div>` : ''}
      <div class="card-tags">
        ${plant.piece ? `<span class="card-room">${icon('room', { size: 'small' })}${esc(plant.piece)}</span>` : ''}
        ${profile && normalizePlantProfile(plant.profilPlante) !== 'custom' ? `<span class="card-profile">${icon('plant', { size: 'small' })}${esc(profile.label)}</span>` : ''}
        ${healthBadge}
      </div>
      <div class="card-next">${previewTasks.map(taskLine).join('')}</div>
    </div>
    <div class="card-actions">
      ${mainTask?.enabled ? `<button class="btn-task btn-action" title="${esc(CARE_TASK_DEFS[mainTask.type]?.actionLabel || 'Fait')}" data-task="${esc(mainTask.type)}" data-id="${esc(plant.id)}">${icon(mainTask.iconName, { size: 'normal' })}</button>` : ''}
      <button class="btn-correct btn-action btn-action--quiet" title="Corriger une date" data-id="${esc(plant.id)}">${icon('calendar', { size: 'normal' })}</button>
    </div>
  `;

  card.querySelector('.card-body').addEventListener('click', () => handlers.onOpen(plant.id));
  card.querySelector('.card-left').addEventListener('click', () => handlers.onOpen(plant.id));

  const taskBtn = card.querySelector('.btn-task');
  if (taskBtn) {
    taskBtn.addEventListener('click', e => {
      e.stopPropagation();
      handlers.onTaskDone?.(plant.id, taskBtn.dataset.task);
    });
  }

  card.querySelector('.btn-correct').addEventListener('click', e => {
    e.stopPropagation();
    handlers.onCorrectDate?.(plant.id, mainTask?.type || 'water');
  });

  return card;
}
