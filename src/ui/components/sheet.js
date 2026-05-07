// src/ui/components/sheet.js — Fiche détail plante

import { createModal, closeModal, confirmModal, toastMsg } from './modal.js';
import { openPlantForm } from './form.js';
import { nextWaterDate, nextFertDate, urgency } from '../../utils/calc.js';
import { formatDate, todayISO } from '../../utils/date.js';

export function openPlantSheet(plant, winterMode, vacationMode, handlers) {
  const u = urgency(plant, winterMode, vacationMode);
  const nextWater = nextWaterDate(plant, winterMode);
  const nextFert = nextFertDate(plant, winterMode);

  const urgencyColor = { red: '#ff6b6b', orange: '#ffaa44', green: '#5a9a6f', none: '#aaa' };

  const overlay = createModal(`
    <div class="sheet-header" style="border-bottom: 3px solid ${urgencyColor[u]}">
      <button class="btn-back" id="sheet-close">←</button>
      <h2>${plant.nom || 'Plante'}</h2>
      <div class="sheet-header-actions">
        <button class="btn-icon" id="sheet-edit" title="Modifier">✏️</button>
        <button class="btn-icon" id="sheet-duplicate" title="Dupliquer">📋</button>
        <button class="btn-icon btn-danger-icon" id="sheet-delete" title="Supprimer">🗑️</button>
      </div>
    </div>

    <div class="sheet-body">
      ${plant.photo
        ? `<img src="${plant.photo}" class="sheet-photo" alt="${plant.nom}">`
        : ''}

      ${plant.espece ? `<div class="sheet-meta">🌿 ${plant.espece}</div>` : ''}
      ${plant.piece ? `<div class="sheet-meta">📍 ${plant.piece}</div>` : ''}

      <div class="sheet-cards">
        <div class="sheet-card">
          <div class="sheet-card-icon">💧</div>
          <div class="sheet-card-info">
            <div class="sheet-card-label">Prochain arrosage</div>
            <div class="sheet-card-value">${formatDate(nextWater)}</div>
            <div class="sheet-card-sub">Toutes les ${plant.freqEau} j${winterMode ? ' (❄️ hiver)' : ''}${plant.volumeEau ? ' · ' + plant.volumeEau : ''}</div>
            <div class="sheet-card-sub">Dernier : ${formatDate(plant.derniereEau)}</div>
          </div>
          <button class="btn btn-primary sheet-action-btn" id="sheet-water">Arroser</button>
        </div>

        ${plant.engraisActif ? `
        <div class="sheet-card">
          <div class="sheet-card-icon">🌿</div>
          <div class="sheet-card-info">
            <div class="sheet-card-label">Prochain engrais</div>
            <div class="sheet-card-value">${formatDate(nextFert)}</div>
            <div class="sheet-card-sub">Tous les ${plant.freqEngrais} j${plant.quantiteEngrais ? ' · ' + plant.quantiteEngrais : ''}</div>
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
    const ok = await confirmModal(`Supprimer <strong>${plant.nom}</strong> ?`);
    if (ok) {
      closeModal(overlay);
      handlers.onDelete(plant.id);
    }
  });
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
}
