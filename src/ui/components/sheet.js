// src/ui/components/sheet.js — Fiche détail plante V2

import { createModal, closeModal, confirmModal } from './modal.js';
import { openPlantForm } from './form.js';
import { CARE_STATUS, getPlantCareStatus } from '../../utils/calc.js';
import { formatDate } from '../../utils/date.js';
import { esc } from '../../utils/html.js';
import { icon } from '../icons.js';
import { PLANT_PROFILES, HEALTH_STATUSES, CARE_TASK_DEFS, normalizePlantProfile, normalizeHealthStatus } from '../../models/plant.js';

export function openPlantSheet(plant, winterMode, vacationMode, handlers) {
  const care = getPlantCareStatus(plant, { winterMode, vacationMode });
  const cfg = CARE_STATUS[care.mainStatus] || CARE_STATUS.none;
  const profile = PLANT_PROFILES[normalizePlantProfile(plant.profilPlante)];
  const healthKey = normalizeHealthStatus(plant.healthStatus);
  const health = HEALTH_STATUSES[healthKey];
  const history = Array.isArray(plant.healthHistory) ? plant.healthHistory.slice(-3).reverse() : [];

  const overlay = createModal(`
    <div class="sheet-header sheet-header--${esc(care.mainStatus)}">
      <button class="btn-back" id="sheet-close">←</button>
      <h2>${esc(plant.nom || 'Plante')}</h2>
      <div class="sheet-header-actions">
        <button class="btn-icon" id="sheet-edit" title="Modifier">${icon('edit')}</button>
        <button class="btn-icon" id="sheet-duplicate" title="Dupliquer">${icon('plus')}</button>
        <button class="btn-icon btn-danger-icon" id="sheet-delete" title="Supprimer">${icon('trash')}</button>
      </div>
    </div>

    <div class="sheet-body">
      ${plant.photo ? `<img src="${esc(plant.photo)}" class="sheet-photo" alt="${esc(plant.nom)}">` : `<div class="sheet-photo sheet-photo--empty">${icon('plant', { size: 'large' })}</div>`}

      <div class="sheet-meta-grid">
        ${plant.espece ? `<div class="sheet-meta">${icon('plant', { size: 'small' })}${esc(plant.espece)}</div>` : ''}
        ${plant.piece ? `<div class="sheet-meta">${icon('room', { size: 'small' })}${esc(plant.piece)}</div>` : ''}
        <div class="sheet-meta">${icon('setup', { size: 'small' })}Profil : ${esc(profile.label)}</div>
        <div class="sheet-meta">${icon('healthCheck', { size: 'small' })}Santé : ${esc(health.label)}</div>
        <div class="sheet-meta">${icon(cfg.iconName, { size: 'small' })}${esc(cfg.label)}</div>
      </div>

      <div class="sheet-cards sheet-cards--v2">
        ${care.activeTasks.map(task => renderTaskCard(task, winterMode)).join('') || '<p class="settings-note">Aucune routine active.</p>'}
      </div>

      <button class="btn btn-secondary btn-full" id="sheet-correct-date">${icon('calendar', { size: 'small' })} Modifier date</button>

      ${history.length ? `<div class="sheet-notes"><strong>Carnet santé</strong>${history.map(item => `<p>${esc(formatDate(item.date))} · ${esc(HEALTH_STATUSES[item.status]?.shortLabel || item.status)}${item.note ? ` — ${esc(item.note)}` : ''}</p>`).join('')}</div>` : ''}
      ${plant.notes ? `<div class="sheet-notes"><strong>Notes :</strong><p>${esc(plant.notes)}</p></div>` : ''}
    </div>
  `);

  overlay.querySelector('#sheet-close').addEventListener('click', () => closeModal(overlay));

  overlay.querySelectorAll('[data-sheet-task]').forEach(button => {
    button.addEventListener('click', () => {
      closeModal(overlay);
      handlers.onTaskDone?.(plant.id, button.dataset.sheetTask);
    });
  });

  overlay.querySelector('#sheet-correct-date').addEventListener('click', () => {
    closeModal(overlay);
    handlers.onCorrectDate?.(plant.id, care.mainTask?.type || 'water');
  });

  overlay.querySelector('#sheet-edit').addEventListener('click', () => {
    closeModal(overlay);
    openPlantForm(plant, updated => handlers.onEdit(updated));
  });

  overlay.querySelector('#sheet-duplicate').addEventListener('click', () => {
    closeModal(overlay);
    handlers.onDuplicate(plant.id);
  });

  overlay.querySelector('#sheet-delete').addEventListener('click', async () => {
    const ok = await confirmModal(`Supprimer <strong>${esc(plant.nom)}</strong> ?`);
    if (ok) {
      closeModal(overlay);
      handlers.onDelete(plant.id);
    }
  });
}

function renderTaskCard(task, winterMode) {
  const def = CARE_TASK_DEFS[task.type] || { label: task.type, actionLabel: 'Fait' };
  return `<div class="sheet-card sheet-card--task sheet-card--${esc(task.status)}">
    <div class="sheet-card-icon">${icon(task.iconName, { size: 'badge' })}</div>
    <div class="sheet-card-info">
      <div class="sheet-card-label">${esc(def.label)}</div>
      <div class="sheet-card-value">${esc(task.statusLabel || task.labelText || task.taskLabel)}</div>
      <div class="sheet-card-sub">Prochain : ${formatDate(task.dueDate)}</div>
      <div class="sheet-card-sub">Tous les ${esc(task.frequencyDays)} j${winterMode && task.type === 'water' ? ' (hiver effectif)' : ''}${task.quantity ? ' · ' + esc(task.quantity) : ''}</div>
    </div>
    <button class="btn btn-primary sheet-action-btn" data-sheet-task="${esc(task.type)}">${esc(def.actionLabel || 'Fait')}</button>
  </div>`;
}
