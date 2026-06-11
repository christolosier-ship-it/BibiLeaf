// app.js — Orchestrateur principal BibiLeaf
import { plants as db, settings } from './src/storage/idb.js';
import { createPlant, duplicatePlant } from './src/models/plant.js';
import { getPlantCareStatus, sortByUrgency, status } from './src/utils/calc.js';
import { addDays, diffDays, parseDate, today, todayISO, toISO } from './src/utils/date.js';
import { renderCard } from './src/ui/components/card.js';
import { openPlantForm } from './src/ui/components/form.js';
import { openPlantSheet } from './src/ui/components/sheet.js';
import { renderCalendar } from './src/ui/components/calendar.js';
import { toastMsg, confirmModal } from './src/ui/components/modal.js';
import { exportXLSX, importXLSX, downloadTemplate } from './src/import-export/xlsx.js';
import { esc } from './src/utils/html.js';

// ============================================================
// État global
// ============================================================
let state = {
  plants: [],
  winterMode: false,
  vacationMode: false,
  currentScreen: 'home', // home | calendar | settings
  filter: 'all',         // all | late | today | soon | ok
  vacationStartedAt: null,
};

let latestRegistration = null;
let activeUndo = null;

// ============================================================
// Init
// ============================================================
async function init() {
  // Récupérer paramètres
  state.winterMode  = (await settings.get('winterMode'))  || false;
  state.vacationMode = (await settings.get('vacationMode')) || false;
  state.vacationStartedAt = (await settings.get('vacationStartedAt')) || null;

  // Charger les plantes
  state.plants = await db.getAll();

  // Cacher l'écran de chargement
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  renderAll();

  // Programmer les notifications seulement si l’utilisateur les a déjà autorisées.
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
  const careById = new Map(sorted.map(p => [p.id, getPlantCareStatus(p, { winterMode: state.winterMode, vacationMode: state.vacationMode })]));

  const counts = { late: 0, today: 0, soon: 0, ok: 0, paused: 0 };
  sorted.forEach(p => {
    const mainStatus = careById.get(p.id).mainStatus;
    if (mainStatus in counts) counts[mainStatus] += 1;
  });

  let filtered = sorted;
  if (state.filter !== 'all') filtered = sorted.filter(p => careById.get(p.id).mainStatus === state.filter);

  const vacationNotice = state.vacationMode
    ? `<div class="settings-section" style="margin-bottom:14px"><strong>🌴 Pause vacances active</strong><br><span style="color:var(--text-soft);font-size:.85rem">Le décompte est suspendu depuis ${esc(state.vacationStartedAt || 'aujourd’hui')}.</span></div>`
    : '';

  container.innerHTML = `
    ${vacationNotice}
    <div class="dash-summary">
      <div class="dash-stat dash-stat--red">
        <div class="dash-stat-val">${counts.late}</div>
        <div class="dash-stat-label">🚨 Retard</div>
      </div>
      <div class="dash-stat dash-stat--orange">
        <div class="dash-stat-val">${counts.today}</div>
        <div class="dash-stat-label">💧 Aujourd'hui</div>
      </div>
      <div class="dash-stat dash-stat--soon">
        <div class="dash-stat-val">${counts.soon}</div>
        <div class="dash-stat-label">🟡 Bientôt</div>
      </div>
      <div class="dash-stat dash-stat--green">
        <div class="dash-stat-val">${state.vacationMode ? counts.paused : counts.ok}</div>
        <div class="dash-stat-label">${state.vacationMode ? '🌴 Pause' : '✅ OK'}</div>
      </div>
    </div>
    <div class="filter-bar" id="filter-bar">
      <button class="filter-chip ${state.filter === 'all' ? 'filter-chip--active' : ''}" data-filter="all">Toutes (${sorted.length})</button>
      <button class="filter-chip ${state.filter === 'late' ? 'filter-chip--active' : ''}" data-filter="late">🚨 Retard (${counts.late})</button>
      <button class="filter-chip ${state.filter === 'today' ? 'filter-chip--active' : ''}" data-filter="today">💧 Aujourd'hui (${counts.today})</button>
      <button class="filter-chip ${state.filter === 'soon' ? 'filter-chip--active' : ''}" data-filter="soon">🟡 Bientôt (${counts.soon})</button>
      <button class="filter-chip ${state.filter === 'ok' ? 'filter-chip--active' : ''}" data-filter="ok">✅ OK (${counts.ok})</button>
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
  renderCalendar(state.plants, state.winterMode, container.querySelector('#cal-container'), state.vacationMode);
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
      <button class="btn-settings-action" id="btn-reload-latest">🔄 Recharger la dernière version</button>
      <button class="btn-settings-action danger" id="btn-reset">🗑️ Supprimer toutes les plantes</button>
    </div>

    <div style="text-align:center;padding:20px;color:var(--text-light);font-size:0.75rem">
      BibiLeaf v1.1.0 · Les données restent stockées localement sur cet appareil 🌿
    </div>
  `;

  container.querySelector('#toggle-winter').addEventListener('change', async e => {
    state.winterMode = e.target.checked;
    await settings.set('winterMode', state.winterMode);
    renderAll();
  });

  container.querySelector('#toggle-vacation').addEventListener('change', async e => {
    await setVacationMode(e.target.checked);
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
    if (!('Notification' in window)) {
      toastMsg('Notifications non disponibles sur cet appareil ou ce navigateur.', 'error');
      return;
    }

    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') testNotification();
        else toastMsg('Notifications refusées', 'error');
      });
    } else {
      testNotification();
    }
  });

  container.querySelector('#btn-reload-latest').addEventListener('click', async () => {
    const ok = await confirmModal('Recharger la dernière version ?<br>Tes plantes et réglages seront conservés.', 'Recharger');
    if (!ok) return;
    await reloadLatestVersion();
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
  if (!plant) return;
  const previous = { ...plant };
  const updated = { ...plant, derniereEau: todayISO() };
  await db.put(updated);
  state.plants = await db.getAll();
  activeUndo = { plant: previous };
  toastMsg(`💧 ${plant.nom || 'Plante'} arrosée.`, 'success', {
    actionLabel: 'Annuler',
    duration: 5000,
    onAction: undoLastQuickAction,
  });
  renderAll();
}

async function markFert(id) {
  const plant = getPlant(id);
  if (!plant) return;
  const previous = { ...plant };
  const updated = { ...plant, dernierEngrais: todayISO() };
  await db.put(updated);
  state.plants = await db.getAll();
  activeUndo = { plant: previous };
  toastMsg(`🌿 Engrais noté pour ${plant.nom || 'Plante'}.`, 'success', {
    actionLabel: 'Annuler',
    duration: 5000,
    onAction: undoLastQuickAction,
  });
  renderAll();
}

async function undoLastQuickAction() {
  if (!activeUndo?.plant) return;
  await db.put(activeUndo.plant);
  activeUndo = null;
  state.plants = await db.getAll();
  toastMsg('Action annulée.');
  renderAll();
}

async function savePlant(plant) {
  await db.put(plant);
  state.plants = await db.getAll();
  toastMsg(plant.nom ? `🌱 ${plant.nom} sauvegardée !` : 'Plante sauvegardée !');
  renderAll();
  scheduleNotifications();
}

async function deletePlant(id) {
  const plant = getPlant(id);
  await db.delete(id);
  state.plants = await db.getAll();
  toastMsg(`🗑️ ${plant.nom || 'Plante'} supprimée`);
  renderAll();
}

function getPlant(id) {
  return state.plants.find(p => p.id === id);
}

async function setVacationMode(enabled) {
  if (enabled === state.vacationMode) return;

  if (enabled) {
    state.vacationMode = true;
    state.vacationStartedAt = todayISO();
    await settings.set('vacationMode', true);
    await settings.set('vacationStartedAt', state.vacationStartedAt);
    toastMsg('🌴 Mode vacances activé : décompte suspendu.');
    renderAll();
    return;
  }

  const startedAt = parseDate(state.vacationStartedAt);
  const pauseDays = startedAt ? Math.max(0, diffDays(today(), startedAt)) : 0;

  if (pauseDays > 0) {
    for (const plant of state.plants) {
      const updated = { ...plant };
      let changed = false;

      if (parseDate(updated.derniereEau)) {
        updated.derniereEau = toISO(addDays(parseDate(updated.derniereEau), pauseDays));
        changed = true;
      }

      if (updated.engraisActif && parseDate(updated.dernierEngrais)) {
        updated.dernierEngrais = toISO(addDays(parseDate(updated.dernierEngrais), pauseDays));
        changed = true;
      }

      if (changed) await db.put(updated);
    }
  }

  state.vacationMode = false;
  state.vacationStartedAt = null;
  await settings.set('vacationMode', false);
  await settings.set('vacationStartedAt', null);
  state.plants = await db.getAll();
  toastMsg(startedAt ? 'Mode vacances désactivé : décompte repris.' : 'Mode vacances désactivé.');
  renderAll();
  scheduleNotifications();
}

async function reloadLatestVersion() {
  if (latestRegistration?.update) {
    try {
      await latestRegistration.update();
      if (latestRegistration.waiting) {
        latestRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.warn('Mise à jour SW impossible', error);
    }
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('bibileaf-'))
        .map(key => caches.delete(key))
    );
  }
  toastMsg('Rechargement de la dernière version…');
  setTimeout(() => window.location.reload(), 400);
}

function registerServiceWorkerUpdateFlow() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      latestRegistration = registration;

      try { await registration.update(); } catch (error) { console.warn('Recherche de mise à jour impossible', error); }

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem('bibileaf-sw-reloaded') === '1') return;
        sessionStorage.setItem('bibileaf-sw-reloaded', '1');
        window.location.reload();
      });

      setTimeout(() => sessionStorage.removeItem('bibileaf-sw-reloaded'), 10000);
    } catch (error) {
      console.warn('Service worker non disponible ou mise à jour impossible', error);
    }
  });
}

// ============================================================
// Notifications locales
// ============================================================
function scheduleNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || state.vacationMode) return;
  // Pas de vrai scheduling possible en Safari sans push server
  // On programme une notification immédiate pour les retards
  const late = state.plants.filter(p => status(p, state.winterMode, false) === 'late');
  if (late.length > 0) {
    new Notification('BibiLeaf 🪴', {
      body: `${late.length} plante(s) en attente d'arrosage !`,
      icon: './icons/icon-192.png',
    });
  }
}

function testNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    toastMsg('Notifications non disponibles sur cet appareil ou ce navigateur.', 'error');
    return;
  }

  new Notification('BibiLeaf 🪴', {
    body: 'Les notifications fonctionnent ! 🌿',
    icon: './icons/icon-192.png',
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
    await setVacationMode(!state.vacationMode);
  });

  // FAB : ajouter une plante
  document.getElementById('fab-add').addEventListener('click', () => {
    openPlantForm(createPlant(), plant => savePlant(plant));
  });
}

// ============================================================
// Démarrage
// ============================================================
registerServiceWorkerUpdateFlow();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  init();
});
