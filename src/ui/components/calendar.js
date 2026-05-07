// src/ui/components/calendar.js — Vue calendrier légère

import { nextWaterDate } from '../../utils/calc.js';
import { parseDate, toISO, addDays } from '../../utils/date.js';

export function renderCalendar(plants, winterMode, container) {
  const today = new Date();
  today.setHours(0,0,0,0);

  // Construire un index date → plantes
  const events = {};
  plants.forEach(p => {
    const nextDate = nextWaterDate(p, winterMode);
    if (!nextDate) return;
    if (!events[nextDate]) events[nextDate] = [];
    events[nextDate].push(p);
  });

  // Afficher 14 jours
  const days = [];
  for (let i = -1; i < 14; i++) {
    const d = addDays(today, i);
    days.push(d);
  }

  container.innerHTML = `<div class="calendar-grid">
    ${days.map(d => {
      const iso = toISO(d);
      const dayPlants = events[iso] || [];
      const isToday = iso === toISO(today);
      const isPast = d < today;
      return `
        <div class="cal-day ${isToday ? 'cal-today' : ''} ${isPast ? 'cal-past' : ''}">
          <div class="cal-day-label">${d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric' })}</div>
          <div class="cal-events">
            ${dayPlants.map(p => `
              <div class="cal-event ${isPast ? 'cal-event--late' : ''}">
                ${p.photo ? `<img src="${p.photo}" class="cal-event-photo">` : '💧'}
                <span>${p.nom}</span>
              </div>
            `).join('')}
            ${dayPlants.length === 0 ? `<div class="cal-empty">—</div>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>`;
}
