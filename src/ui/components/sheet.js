// src/ui/components/sheet.js — Fiche détail plante

import { createModal, closeModal, confirmModal } from './modal.js';
import { openPlantForm } from './form.js';
import { CARE_STATUS, getPlantCareStatus } from '../../utils/calc.js';
import { formatDate } from '../../utils/date.js';
import { esc } from '../../utils/html.js';

export function openPlantSheet(plant, winterMode, vacationMode, handlers) {
  const care = getPlantCareStatus(plant, { winterMode, vacationMode });
  const cfg = CARE_STATUS[care.mainStatus] || CARE_STATUS.none;

  const urgencyColor = {
    late: '#ff6b6b',
    today: '#ffaa44',
    soon: '#e7c94b',
    ok: '#5a9a6f',
    paused: '#aaa',
    none: '#aaa',
  };

  const overlay = createModal(`
    <div class="sheet-header" style="border-bottom: 3px solid ${urgencyColor[care.mainStatus]}">
      <button class="btn-back" id="sheet-close">←</button>
      <h2>${esc(plant.nom || 'Plante')}</h2>
      <div class="sheet-header-actions">
        <button class="btn-icon" id="sheet-edit" title="Modifier">✏️</button>
        <button class="btn-icon" id="sheet-duplicate" title="Dupliquer">📋</button>
        <button class="btn-icon btn-danger-icon" id="sheet-delete" title="Supprimer">🗑️</button>
      </div>
    </div>

    <div class="sheet-body">
      ${plant.photo
        ? `<img src="${esc(plant.photo)}" class="sheet-photo" alt="${esc(plant.nom)}">`
        : ''}

      ${plant.espece ? `<div class="sheet-meta">🌿 ${esc(plant.espece)}</div>` : ''}
      ${plant.piece ? `<div class="sheet-meta">📍 ${esc(plant.piece)}</div>` : ''}
      <div class="sheet-meta">${cfg.emoji} ${esc(cfg.label)}</div>

      <div class="sheet-cards">
        <div class="sheet-card">
          <div class="sheet-card-icon">💧</div>
          <div class="sheet-card-info">
            <div class="sheet-card-label">Arrosage</div>
            <div class="sheet-card-value">${esc(care.water.label)}</div>
            <div class="sheet-card-sub">Prochain : ${formatDate(care.water.dueDate)}</div>
            <div class="sheet-card-sub">Toutes les ${esc(plant.freqEau)} j${winterMode ? ' (❄️ hiver)' : ''}${plant.volumeEau ? ' · ' + esc(plant.volumeEau) : ''}</div>
            <div class="sheet-card-sub">Dernier : ${formatDate(plant.derniereEau)}</div>
          </div>
          <button class="btn btn-primary sheet-action-btn" id="sheet-water">Arroser</button>
        </div>

        ${plant.engraisActif ? `
        <div class="sheet-card">
          <div class="sheet-card-icon">🌿</div>
          <div class="sheet-card-info">
            <div class="sheet-card-label">Engrais</div>
            <div class="sheet-card-value">${esc(care.fertilizer.label)}</div>
            <div class="sheet-card-sub">Prochain : ${formatDate(care.fertilizer.dueDate)}</div>
            <div class="sheet-card-sub">Tous les ${esc(plant.freqEngrais)} j${plant.quantiteEngrais ? ' · ' + esc(plant.quantiteEngrais) : ''}</div>
            <div class="sheet-card-sub">Dernier : ${formatDate(plant.dernierEngrais)}</div>
          </div>
          <button class="btn btn-secondary sheet-action-btn" id="sheet-fert">Engrais</button>
        </div>
        ` : ''}
      </div>

      ${plant.notes ? `<div class="sheet-notes"><strong>Notes :</strong><p>${esc(plant.notes)}</p></div>` : ''}
    </div>
  `);

  overlay.querySelector('#sheet-close').addEventListener('click', () => closeModal(overlay));

  overlay.querySelector('#sheet-water').addEventListener('click', () => {
    closeModal(overlay);
    handlers.onWater(plant.id);
  });

  const fertBtn = overlay.querySelector('#sheet-fert');
  if (fertBtn) {
    fertBtn.addEventListener('click', () => {
      closeModal(overlay);
      handlers.onFert(plant.id);
    });
  }

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
