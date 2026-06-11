// src/ui/components/calendar.js — Vue calendrier légère

import { getPlantCareStatus } from '../../utils/calc.js';
import { today, toISO, addDays } from '../../utils/date.js';
import { esc } from '../../utils/html.js';

export function renderCalendar(plants, winterMode, container, vacationMode = false) {
  const start = today();

  if (vacationMode) {
    container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🌴</div><h3>Pause vacances</h3><p>Le calendrier est suspendu jusqu'à la reprise du suivi.</p></div>`;
    return;
  }

  // Construire un index date → actions plantes
  const events = {};
  plants.forEach(p => {
    const care = getPlantCareStatus(p, { winterMode, vacationMode });
    if (care.water.enabled && care.water.dueDate) {
      if (!events[care.water.dueDate]) events[care.water.dueDate] = [];
      events[care.water.dueDate].push({ plant: p, icon: '💧' });
    }
    if (care.fertilizer.enabled && care.fertilizer.dueDate) {
      if (!events[care.fertilizer.dueDate]) events[care.fertilizer.dueDate] = [];
      events[care.fertilizer.dueDate].push({ plant: p, icon: '🌿' });
    }
  });

  // Afficher 14 jours
  const days = [];
  for (let i = -1; i < 14; i++) {
    const d = addDays(start, i);
    days.push(d);
  }

  container.innerHTML = `<div class="calendar-grid">
    ${days.map(d => {
      const iso = toISO(d);
      const dayEvents = events[iso] || [];
      const isToday = iso === toISO(start);
      const isPast = d < start;
      return `
        <div class="cal-day ${isToday ? 'cal-today' : ''} ${isPast ? 'cal-past' : ''}">
          <div class="cal-day-label">${d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric' })}</div>
          <div class="cal-events">
            ${dayEvents.map(({ plant, icon }) => `
              <div class="cal-event ${isPast ? 'cal-event--late' : ''}">
                ${plant.photo ? `<img src="${esc(plant.photo)}" class="cal-event-photo" alt="">` : icon}
                <span>${icon} ${esc(plant.nom)}</span>
              </div>
            `).join('')}
            ${dayEvents.length === 0 ? `<div class="cal-empty">—</div>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>`;
}
