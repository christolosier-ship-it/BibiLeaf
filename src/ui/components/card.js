// src/ui/components/card.js — Carte plante

import { urgency, nextWaterDate, nextFertDate } from '../../utils/calc.js';
import { formatDate } from '../../utils/date.js';

const URGENCY_CONFIG = {
  red:    { emoji: '🚨', label: 'En retard !',    cls: 'urgent-red' },
  orange: { emoji: '💧', label: 'À arroser',      cls: 'urgent-orange' },
  green:  { emoji: '✅', label: 'OK',             cls: 'urgent-green' },
  none:   { emoji: '😴', label: 'Vacances',       cls: 'urgent-none' },
};

export function renderCard(plant, winterMode, vacationMode, handlers) {
  const u = urgency(plant, winterMode, vacationMode);
  const cfg = URGENCY_CONFIG[u];
  const nextWater = nextWaterDate(plant, winterMode);
  const nextFert  = nextFertDate(plant, winterMode);

  const card = document.createElement('div');
  card.className = `plant-card ${cfg.cls}`;
  card.dataset.id = plant.id;

  const photo = plant.photo
    ? `<img src="${plant.photo}" alt="${plant.nom}" class="card-photo">`
    : `<div class="card-photo card-photo--empty">🪴</div>`;

  card.innerHTML = `
    <div class="card-left">
      ${photo}
    </div>
    <div class="card-body">
      <div class="card-header">
        <span class="card-name">${plant.nom || 'Sans nom'}</span>
        <span class="urgency-badge ${cfg.cls}">${cfg.emoji}</span>
      </div>
      ${plant.espece ? `<div class="card-species">${plant.espece}</div>` : ''}
      ${plant.piece ? `<div class="card-room">📍 ${plant.piece}</div>` : ''}
      <div class="card-next">
        <span class="card-water">💧 ${formatDate(nextWater)}</span>
        ${plant.engraisActif ? `<span class="card-fert">🌿 ${formatDate(nextFert)}</span>` : ''}
      </div>
    </div>
    <div class="card-actions">
      <button class="btn-water btn-action" title="Arroser" data-id="${plant.id}">💧</button>
      ${plant.engraisActif ? `<button class="btn-fert btn-action" title="Engrais" data-id="${plant.id}">🌿</button>` : ''}
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
