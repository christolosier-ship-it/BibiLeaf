// src/ui/components/card.js — Carte plante

import { CARE_STATUS, getPlantCareStatus } from '../../utils/calc.js';
import { esc } from '../../utils/html.js';

function mainBadge(care) {
  if (care.mainStatus === 'today') {
    return `${care.mainAction === 'fertilizer' ? '🌿' : '💧'} Aujourd'hui`;
  }
  const cfg = CARE_STATUS[care.mainStatus] || CARE_STATUS.none;
  return `${cfg.emoji} ${cfg.label}`;
}

function careLine(icon, item, suffix = '', className = '') {
  if (!item.enabled) return '';
  const extra = suffix ? ` · ${esc(suffix)}` : '';
  return `<span class="${className}">${icon} ${esc(item.label)}${extra}</span>`;
}

export function renderCard(plant, winterMode, vacationMode, handlers) {
  const care = getPlantCareStatus(plant, { winterMode, vacationMode });
  const cfg = CARE_STATUS[care.mainStatus] || CARE_STATUS.none;

  const card = document.createElement('div');
  card.className = `plant-card ${cfg.cls}`;
  card.dataset.id = plant.id;

  const photo = plant.photo
    ? `<img src="${esc(plant.photo)}" alt="${esc(plant.nom)}" class="card-photo">`
    : `<div class="card-photo card-photo--empty">🪴</div>`;

  card.innerHTML = `
    <div class="card-left">
      ${photo}
    </div>
    <div class="card-body">
      <div class="card-header">
        <span class="card-name">${esc(plant.nom || 'Sans nom')}</span>
        <span class="urgency-badge ${cfg.cls}">${esc(mainBadge(care))}</span>
      </div>
      ${plant.espece ? `<div class="card-species">${esc(plant.espece)}</div>` : ''}
      ${plant.piece ? `<div class="card-room">📍 ${esc(plant.piece)}</div>` : ''}
      <div class="card-next">
        ${careLine('💧', care.water, plant.volumeEau, 'card-water')}
        ${plant.engraisActif ? careLine('🌿', care.fertilizer, plant.quantiteEngrais, 'card-fert') : ''}
      </div>
    </div>
    <div class="card-actions">
      <button class="btn-water btn-action" title="Arroser" data-id="${esc(plant.id)}">💧</button>
      ${plant.engraisActif ? `<button class="btn-fert btn-action" title="Engrais" data-id="${esc(plant.id)}">🌿</button>` : ''}
    </div>
  `;

  // Ouvrir la fiche au clic sur le corps
  card.querySelector('.card-body').addEventListener('click', () => handlers.onOpen(plant.id));
  card.querySelector('.card-left').addEventListener('click', () => handlers.onOpen(plant.id));

  // Bouton arrosage rapide
  card.querySelector('.btn-water').addEventListener('click', e => {
    e.stopPropagation();
    handlers.onWater(plant.id);
  });

  // Bouton engrais rapide
  const fertBtn = card.querySelector('.btn-fert');
  if (fertBtn) {
    fertBtn.addEventListener('click', e => {
      e.stopPropagation();
      handlers.onFert(plant.id);
    });
  }

  return card;
}
