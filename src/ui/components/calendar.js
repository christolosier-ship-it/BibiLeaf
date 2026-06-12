// src/ui/components/calendar.js — Timeline carnet de soins V2

import { getAllCareEvents } from '../../utils/calc.js';
import { today, parseDate, diffDays } from '../../utils/date.js';
import { esc } from '../../utils/html.js';
import { icon } from '../icons.js';
import { CARE_TASK_DEFS } from '../../models/plant.js';

export function renderCalendar(plants, winterMode, container, vacationMode = false, handlers = {}) {
  if (vacationMode) {
    container.innerHTML = `<div class="timeline-vacation-card">${icon('vacation', { size: 'large' })}<strong>Mode vacances actif : les soins sont suspendus jusqu’à ton retour.</strong><span>Le décompte reprendra sans faux retards.</span></div>`;
    return;
  }

  const events = getAllCareEvents(plants, { winterMode, vacationMode }, { horizonDays: 30, includeSetup: true });
  const sections = buildSections(events);

  if (sections.length === 0) {
    container.innerHTML = `<div class="empty-state">${icon('ok', { size: 'splash' })}<h3>Planning tout doux</h3><p>Aucun soin prévu dans les 30 prochains jours.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="timeline-intro">Carnet de soins végétal : retards, aujourd’hui, puis les prochaines routines actives.</div>
    <div class="timeline timeline--v2">
      ${sections.map(section => `<section class="timeline-section timeline-section--${esc(section.key)}"><div class="timeline-section-title">${esc(section.title)}</div><div class="timeline-items">${section.events.map(renderEvent).join('')}</div></section>`).join('')}
    </div>`;

  container.querySelectorAll('[data-timeline-task]').forEach(button => {
    button.addEventListener('click', () => handlers.onTaskDone?.(button.dataset.plantId, button.dataset.timelineTask));
  });

  container.querySelectorAll('[data-edit-date]').forEach(button => {
    button.addEventListener('click', () => handlers.onCorrectDate?.(button.dataset.plantId, button.dataset.editDate));
  });
}

function buildSections(events) {
  const groups = [
    { key: 'late', title: 'En retard', events: events.filter(e => e.status === 'late') },
    { key: 'today', title: 'Aujourd’hui', events: events.filter(e => e.status === 'today') },
    { key: 'setup', title: 'À configurer', events: events.filter(e => e.status === 'setup') },
    { key: 'tomorrow', title: 'Demain', events: events.filter(e => e.diffDays === 1) },
    { key: 'week', title: 'Cette semaine', events: events.filter(e => e.diffDays >= 2 && e.diffDays <= 6) },
  ];
  const futureByDate = new Map();
  events.filter(e => e.diffDays >= 7).forEach(e => {
    if (!futureByDate.has(e.dueDate)) futureByDate.set(e.dueDate, []);
    futureByDate.get(e.dueDate).push(e);
  });
  return [
    ...groups.filter(group => group.events.length),
    ...[...futureByDate.keys()].sort().map(date => ({ key: 'future', title: formatTimelineTitle(date), events: futureByDate.get(date) })),
  ];
}

function renderEvent(event) {
  const def = CARE_TASK_DEFS[event.taskType] || { label: event.taskLabel, actionLabel: 'Fait' };
  const delay = event.status === 'setup' ? 'Dernière date à renseigner' : (event.diffDays < 0 ? `retard de ${Math.abs(event.diffDays)} j` : event.labelText);
  return `<article class="timeline-item timeline-item--${esc(event.status)}">
    <div class="timeline-dot">${icon(event.status === 'late' ? 'late' : event.iconName, { size: 'badge' })}</div>
    <div class="timeline-card">
      <div class="timeline-card-main">
        <strong>${esc(event.plantName)}</strong>
        <span>${icon(event.iconName, { size: 'small' })}${esc(def.label)}${event.quantity ? ` · ${esc(event.quantity)}` : ''}</span>
        <small>${esc(delay)}${event.room ? ` · ${esc(event.room)}` : ''}</small>
      </div>
      <div class="timeline-card-actions">
        <button class="btn btn-primary timeline-action" data-timeline-task="${esc(event.taskType)}" data-plant-id="${esc(event.plantId)}">${esc(def.actionLabel || 'Fait')}</button>
        <button class="btn btn-secondary timeline-action" data-edit-date="${esc(event.taskType)}" data-plant-id="${esc(event.plantId)}">Modifier date</button>
      </div>
    </div>
  </article>`;
}

function formatTimelineTitle(dateStr) {
  const due = parseDate(dateStr);
  if (!due) return dateStr;
  const delta = diffDays(due, today());
  if (delta === 0) return 'Aujourd’hui';
  if (delta === 1) return 'Demain';
  if (delta === 2) return 'Dans 2 jours';
  if (delta > 2 && delta <= 6) return `Dans ${delta} jours`;
  return due.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
