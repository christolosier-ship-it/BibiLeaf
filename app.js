// app.js — Orchestrateur principal BibiLeaf
import { plants as db, settings } from './src/storage/idb.js';
import { createPlant, duplicatePlant } from './src/models/plant.js';
import { sortByUrgency, urgency, nextWaterDate, nextFertDate } from './src/utils/calc.js';
import { todayISO, formatDate } from './src/utils/date.js';
import { renderCard } from './src/ui/components/card.js';
import { openPlantForm } from './src/ui/components/form.js';
import { openPlantSheet } from './src/ui/components/sheet.js';
import { renderCalendar } from './src/ui/components/calendar.js';
import { toastMsg, confirmModal } from './src/ui/components/modal.js';
import { exportXLSX, importXLSX, downloadTemplate } from './src/import-export/xlsx.js';

// ============================================================
// État global
// ============================================================
let state = {
  plants: [],
  winterMode: false,
  vacationMode: false,
  currentScreen: 'home', // home | calendar | settings
  filter: 'all',         // all | late | today | soon
};

// ============================================================
// Init
// ============================================================
async function init() {
  // Récupérer paramètres
  state.winterMode  = (await settings.get('winterMode'))  || false;
  state.vacationMode = (await settings.get('vacationMode')) || false;

  // Charger les plantes
  state.plants = await db.getAll();

  // Cacher l'écran de chargement
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Enregistrer le service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }

  renderAll();

  // Demander permissions notifications au premier démarrage
  if (Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission(), 3000);
  }

  // Programmer les notifications
  scheduleNotifications();
}

// ============================================================
// Rendu principal
// ============================================================
function renderAll() {
  renderHeader();
  renderScreen();
  renderNav();
}

function renderHeader() {
  const winter   = document.getElementById('mode-winter');
  const vacation = document.getElementById('mode-vacation');
  winter.className   = `mode-pill mode-pill--winter ${state.winterMode ? 'mode-pill--active' : 'mode-pill--inactive'}`;
  vacation.className = `mode-pill mode-pill--vacation ${state.vacationMode ? 'mode-pill--active' : 'mode-pill--inactive'}`;
}

function renderNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('nav-btn--active', btn.dataset.screen === state.currentScreen);
  });
}

function renderScreen() {
  const main = document.getElementById('main-content');
  switch (state.currentScreen) {
    case 'home':     return renderHome(main);
    case 'calendar': return renderCalendarScreen(main);
    case 'settings': return renderSettings(main);
  }
}

// ============================================================
// Écran Accueil
// ============================================================
function renderHome(container) {
  const sorted = sortByUrgency(state.plants, state.winterMode, state.vacationMode);

  const late  = sorted.filter(p => urgency(p, state.winterMode, state.vacationMode) === 'red').length;
  const today = sorted.filter(p => urgency(p, state.winterMode, state.vacationMode) === 'orange').length;
  const ok    = sorted.filter(p => urgency(p, state.winterMode, state.vacationMode) === 'green').length;

  let filtered = sorted;
  if (state.filter === 'late')  filtered = sorted.filter(p => urgency(p, state.winterMode, state.vacationMode) === 'red');
  if (state.filter === 'today') filtered = sorted.filter(p => urgency(p, state.winterMode, state.vacationMode) === 'orange');
  if (state.filter === 'soon')  filtered = sorted.filter(p => urgency(p, state.winterMode, state.vacationMode) === 'green');

  container.innerHTML = `
    <div class="dash-summary">
      <div class="dash-stat dash-stat--red">
        <div class="dash-stat-val">${late}</div>
        <div class="dash-stat-label">🚨 En retard</div>
      </div>
      <div class="dash-stat dash-stat--orange">
        <div class="dash-stat-val">${today}</div>
        <div class="dash-stat-label">💧 Aujourd'hui</div>
      </div>
      <div class="dash-stat dash-stat--green">
        <div class="dash-stat-val">${ok}</div>
        <div class="dash-stat-label">✅ OK</div>
      </div>
    </div>
    <div class="filter-bar" id="filter-bar">
      <button class="filter-chip ${state.filter === 'all' ? 'filter-chip--active' : ''}" data-filter="all">Toutes (${sorted.length})</button>
      <button class="filter-chip ${state.filter === 'late' ? 'filter-chip--active' : ''}" data-filter="late">🚨 Retard (${late})</button>
      <button class="filter-chip ${state.filter === 'today' ? 'filter-chip--active' : ''}" data-filter="today">💧 Aujourd'hui (${today})</button>
      <button class="filter-chip ${state.filter === 'soon' ? 'filter-chip--active' : ''}" data-filter="soon">✅ OK (${ok})</button>
    </div>
    <div class="plant-list" id="plant-list"></div>
    ${state.plants.length === 0 ? emptyState() : ''}
  `;

  // Filtres
  container.querySelector('#filter-bar').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (chip) { state.filter = chip.dataset.filter; renderAll(); }
  });

  // Cartes
  const list = container.querySelector('#plant-list');
  const handlers = {
    onOpen:  id => { const p = getPlant(id); openPlantSheet(p, state.winterMode, state.vacationMode, sheetHandlers()); },
    onWater: id => markWater(id),
    onFert:  id => markFert(id),
  };
  filtered.forEach(p => list.appendChild(renderCard(p, state.winterMode, state.vacationMode, handlers)));
}

function emptyState() {
  return `<div class="empty-state">
    <div class="empty-emoji">🪴</div>
    <h3>Aucune plante encore !</h3>
    <p>Appuie sur <strong>+</strong> pour ajouter<br>ta première plante.</p>
  </div>`;
}

function sheetHandlers() {
  return {
    onWater:     id => markWater(id),
    onFert:      id => markFert(id),
    onEdit:      updated => savePlant(updated),
    onDuplicate: id => { const copy = duplicatePlant(getPlant(id)); savePlant(copy); },
    onDelete:    id => deletePlant(id),
  };
}

// ============================================================
// Écran Calendrier
// ============================================================
function renderCalendarScreen(container) {
  container.innerHTML = `<div class="screen-title">📅 Calendrier</div><div id="cal-container"></div>`;
  renderCalendar(state.plants, state.winterMode, container.querySelector('#cal-container'));
}

// ============================================================
// Écran Paramètres
// ============================================================
function renderSettings(container) {
  container.innerHTML = `
    <div class="screen-title">⚙️ Réglages</div>

    <div class="settings-section">
      <div class="settings-title">Modes globaux</div>

      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">❄️ Mode hiver</div>
          <div class="settings-row-sub">Multiplie la fréquence d'arrosage × 1,5</div>
        </div>
        <label class="label-toggle" style="margin:0">
          <input type="checkbox" id="toggle-winter" ${state.winterMode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">🌴 Mode vacances</div>
          <div class="settings-row-sub">Suspend le suivi et les notifications</div>
        </div>
        <label class="label-toggle" style="margin:0">
          <input type="checkbox" id="toggle-vacation" ${state.vacationMode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-title">Données</div>
      <button class="btn-settings-action" id="btn-export">📤 Exporter en Excel</button>
      <button class="btn-settings-action" id="btn-import">📥 Importer depuis Excel</button>
      <button class="btn-settings-action" id="btn-template">📋 Télécharger le template</button>
      <input type="file" id="import-file" accept=".xlsx" style="display:none">
    </div>

    <div class="settings-section">
      <div class="settings-title">App</div>
      <button class="btn-settings-action" id="btn-notif">🔔 Tester les notifications</button>
      <button class="btn-settings-action danger" id="btn-reset">🗑️ Supprimer toutes les plantes</button>
    </div>

    <div style="text-align:center;padding:20px;color:var(--text-light);font-size:0.75rem">
      BibiLeaf v1.0 · Données stockées localement 🌿
    </div>
  `;

  container.querySelector('#toggle-winter').addEventListener('change', async e => {
    state.winterMode = e.target.checked;
    await settings.set('winterMode', state.winterMode);
    renderAll();
  });

  container.querySelector('#toggle-vacation').addEventListener('change', async e => {
    state.vacationMode = e.target.checked;
    await settings.set('vacationMode', state.vacationMode);
    renderAll();
  });

  container.querySelector('#btn-export').addEventListener('click', () => {
    if (state.plants.length === 0) { toastMsg('Aucune plante à exporter', 'error'); return; }
    exportXLSX(state.plants);
    toastMsg('Export téléchargé !');
  });

  container.querySelector('#btn-import').addEventListener('click', () => {
    container.querySelector('#import-file').click();
  });

  container.querySelector('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importXLSX(file);
      for (const p of imported) await db.put(p);
      state.plants = await db.getAll();
      toastMsg(`${imported.length} plante(s) importée(s) !`);
      renderAll();
    } catch (err) {
      toastMsg('Erreur lors de l\'import', 'error');
    }
    e.target.value = '';
  });

  container.querySelector('#btn-template').addEventListener('click', () => downloadTemplate());

  container.querySelector('#btn-notif').addEventListener('click', () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') testNotification();
        else toastMsg('Notifications refusées', 'error');
      });
    } else {
      testNotification();
    }
  });

  container.querySelector('#btn-reset').addEventListener('click', async () => {
    const ok = await confirmModal('Supprimer <strong>toutes les plantes</strong> ?<br>Cette action est irréversible.');
    if (!ok) return;
    for (const p of state.plants) await db.delete(p.id);
    state.plants = [];
    toastMsg('Toutes les plantes supprimées');
    renderAll();
  });
}

// ============================================================
// Actions métier
// ============================================================
async function markWater(id) {
  const plant = getPlant(id);
  const updated = { ...plant, derniereEau: todayISO() };
  await db.put(updated);
  state.plants = await db.getAll();
  toastMsg(`💧 ${plant.nom} arrosée !`);
  renderAll();
}

async function markFert(id) {
  const plant = getPlant(id);
  const updated = { ...plant, dernierEngrais: todayISO() };
  await db.put(updated);
  state.plants = await db.getAll();
  toastMsg(`🌿 Engrais noté pour ${plant.nom} !`);
  renderAll();
}

async function savePlant(plant) {
  await db.put(plant);
  state.plants = await db.getAll();
  const isNew = !state.plants.find(p => p.id === plant.id && p.nom !== plant.nom);
  toastMsg(plant.nom ? `🌱 ${plant.nom} sauvegardée !` : 'Plante sauvegardée !');
  renderAll();
  scheduleNotifications();
}

async function deletePlant(id) {
  const plant = getPlant(id);
  await db.delete(id);
  state.plants = await db.getAll();
  toastMsg(`🗑️ ${plant.nom} supprimée`);
  renderAll();
}

function getPlant(id) {
  return state.plants.find(p => p.id === id);
}

// ============================================================
// Notifications locales
// ============================================================
function scheduleNotifications() {
  if (Notification.permission !== 'granted' || state.vacationMode) return;
  // Pas de vrai scheduling possible en Safari sans push server
  // On programme une notification immédiate pour les retards
  const late = state.plants.filter(p => urgency(p, state.winterMode, false) === 'red');
  if (late.length > 0) {
    new Notification('BibiLeaf 🪴', {
      body: `${late.length} plante(s) en attente d'arrosage !`,
      icon: '/icons/icon-192.png',
    });
  }
}

function testNotification() {
  new Notification('BibiLeaf 🪴', {
    body: 'Les notifications fonctionnent ! 🌿',
    icon: '/icons/icon-192.png',
  });
  toastMsg('Notification envoyée !');
}

// ============================================================
// Navigation
// ============================================================
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentScreen = btn.dataset.screen;
      renderAll();
    });
  });

  // Modes dans le header
  document.getElementById('mode-winter').addEventListener('click', async () => {
    state.winterMode = !state.winterMode;
    await settings.set('winterMode', state.winterMode);
    toastMsg(state.winterMode ? '❄️ Mode hiver activé' : '❄️ Mode hiver désactivé');
    renderAll();
  });

  document.getElementById('mode-vacation').addEventListener('click', async () => {
    state.vacationMode = !state.vacationMode;
    await settings.set('vacationMode', state.vacationMode);
    toastMsg(state.vacationMode ? '🌴 Mode vacances activé' : '🌴 Mode vacances désactivé');
    renderAll();
  });

  // FAB : ajouter une plante
  document.getElementById('fab-add').addEventListener('click', () => {
    openPlantForm(createPlant(), plant => savePlant(plant));
  });
}

// ============================================================
// Démarrage
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  init();
});
