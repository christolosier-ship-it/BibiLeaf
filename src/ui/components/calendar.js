// src/ui/components/calendar.js — Timeline moderne des soins

import { getPlantCareStatus } from '../../utils/calc.js';
import { today, parseDate, addDays, diffDays, toISO } from '../../utils/date.js';
import { esc } from '../../utils/html.js';

const ACTIONS = {
  water: { icon: '💧', label: 'Arrosage', button: 'Arrosée', amountKey: 'volumeEau' },
  fertilizer: { icon: '🌿', label: 'Engrais', button: 'Engrais fait', amountKey: 'quantiteEngrais' },
};

export function renderCalendar(plants, winterMode, container, vacationMode = false, handlers = {}) {
  if (vacationMode) {
    container.innerHTML = `
      <div class="timeline-vacation-card">
        <div class="timeline-vacation-emoji">🌴</div>
        <strong>Mode vacances actif : le planning est suspendu.</strong>
        <span>Le décompte reprendra à ton retour, sans faux retards.</span>
      </div>`;
    return;
  }

  const events = buildTimelineEvents(plants, winterMode, vacationMode);
  const lateEvents = events.filter(event => event.diff < 0);
  const upcomingEvents = events.filter(event => event.diff >= 0 && event.diff <= 30);
  const sections = [];

  if (lateEvents.length > 0) {
    sections.push({ key: 'late', title: '🚨 En retard', events: lateEvents });
  }

  const byDate = new Map();
  upcomingEvents.forEach(event => {
    if (!byDate.has(event.dueDate)) byDate.set(event.dueDate, []);
    byDate.get(event.dueDate).push(event);
  });

  [...byDate.keys()].sort().forEach(date => {
    sections.push({ key: date, title: formatTimelineTitle(date), events: byDate.get(date) });
  });

  if (sections.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🌱</div><h3>Planning tout doux</h3><p>Aucune action prévue dans les 30 prochains jours.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="timeline-intro">Les retards restent en haut, puis les prochaines échéances eau + engrais sur 30 jours.</div>
    <div class="timeline">
      ${sections.map(section => `
        <section class="timeline-section ${section.key === 'late' ? 'timeline-section--late' : ''}">
          <div class="timeline-section-title">${esc(section.title)}</div>
          <div class="timeline-items">
            ${section.events.map(renderEvent).join('')}
          </div>
        </section>
      `).join('')}
    </div>`;

  container.querySelectorAll('[data-timeline-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.timelineAction;
      const id = button.dataset.plantId;
      if (action === 'water') handlers.onWater?.(id);
      if (action === 'fertilizer') handlers.onFert?.(id);
    });
  });

  container.querySelectorAll('[data-edit-date]').forEach(button => {
    button.addEventListener('click', () => handlers.onCorrectDate?.(button.dataset.plantId, button.dataset.editDate));
  });
}

function buildTimelineEvents(plants, winterMode, vacationMode) {
  const start = today();
  const events = [];
  plants.forEach(plant => {
    const care = getPlantCareStatus(plant, { winterMode, vacationMode });
    addEvent(events, plant, care.water, 'water', start);
    addEvent(events, plant, care.fertilizer, 'fertilizer', start);
  });
  return events.sort((a, b) => {
    if (a.diff !== b.diff) return a.diff - b.diff;
    if (a.action !== b.action) return a.action === 'water' ? -1 : 1;
    return String(a.plant.nom || '').localeCompare(String(b.plant.nom || ''), 'fr');
  });
}

function addEvent(events, plant, careItem, action, start) {
  if (!careItem?.enabled || !careItem.dueDate) return;
  const due = parseDate(careItem.dueDate);
  if (!due) return;
  const diff = diffDays(due, start);
  if (diff > 30) return;
  events.push({ plant, action, dueDate: careItem.dueDate, diff, label: careItem.label });
}

function renderEvent(event) {
  const config = ACTIONS[event.action];
  const amount = event.plant[config.amountKey];
  const delay = event.diff < 0 ? `retard de ${Math.abs(event.diff)} j` : event.label;
  return `
    <article class="timeline-item ${event.diff < 0 ? 'timeline-item--late' : ''}">
      <div class="timeline-dot">${event.diff < 0 ? '🚨' : config.icon}</div>
      <div class="timeline-card">
        <div class="timeline-card-main">
          <strong>${esc(event.plant.nom || 'Sans nom')}</strong>
          <span>${config.icon} ${config.label}${amount ? ` · ${esc(amount)}` : ''}</span>
          <small>${esc(delay)}${event.plant.piece ? ` · 📍 ${esc(event.plant.piece)}` : ''}</small>
        </div>
        <div class="timeline-card-actions">
          <button class="btn btn-primary timeline-action" data-timeline-action="${event.action}" data-plant-id="${esc(event.plant.id)}">${config.button}</button>
          <button class="btn btn-secondary timeline-action" data-edit-date="${event.action}" data-plant-id="${esc(event.plant.id)}">Modifier date</button>
        </div>
      </div>
    </article>`;
}

function formatTimelineTitle(dateStr) {
  const due = parseDate(dateStr);
  if (!due) return dateStr;
  const diff = diffDays(due, today());
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return 'Demain';
  if (diff === 2) return 'Dans 2 jours';
  if (diff > 2 && diff <= 6) return `Dans ${diff} jours`;
  return due.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
