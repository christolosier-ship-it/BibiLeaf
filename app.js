// app.js — Orchestrateur principal BibiLeaf
import { plants as db, settings } from './src/storage/idb.js';
import { APP_VERSION, SCHEMA_VERSION, CARE_TASK_DEFS, createPlant, duplicatePlant, migratePlantToV2, plantWithoutPhoto } from './src/models/plant.js';
import { getPlantCareStatus, getAllCareEvents, sortByUrgency, status } from './src/utils/calc.js';
import { addDays, diffDays, parseDate, today, todayISO, toISO } from './src/utils/date.js';
import { renderCard } from './src/ui/components/card.js';
import { openPlantForm } from './src/ui/components/form.js';
import { openPlantSheet } from './src/ui/components/sheet.js';
import { renderCalendar } from './src/ui/components/calendar.js';
import { icon } from './src/ui/icons.js';
import { toastMsg, confirmModal, createModal, closeModal } from './src/ui/components/modal.js';
import { exportXLSX, importXLSX, downloadTemplate } from './src/import-export/xlsx.js';
import { esc } from './src/utils/html.js';

// ============================================================
// État global
// ============================================================
let state = {
  plants: [],
  winterMode: false,
  winterAutoEnabled: false,
  winterAutoStart: '11-01',
  winterAutoEnd: '03-31',
  vacationMode: false,
  currentScreen: 'today', // today | home | calendar | rooms | settings
  filter: 'all',         // all | late | today | soon | ok
  roomFilter: 'all',     // all | room:<name> | __no_room__
  searchQuery: '',
  vacationStartedAt: null,
};

let latestRegistration = null;
let activeUndo = null;
let searchRenderTimer = null;

async function migrateExistingData() {
  const migrationDone = await settings.get('schemaVersion');
  const existing = await db.getAll();
  const needsMigration = migrationDone !== SCHEMA_VERSION || existing.some(plant => plant.schemaVersion !== SCHEMA_VERSION || !Array.isArray(plant.careTasks));
  if (!needsMigration) return;

  try {
    await settings.set('preV2MigrationBackup', {
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      plants: existing.map(plant => ({ ...plant, photo: plant.photo ? '[local-photo-preserved]' : null })),
    });

    for (const plant of existing) {
      await db.put(migratePlantToV2(plant));
    }
    await settings.set('schemaVersion', SCHEMA_VERSION);
    await settings.set('lastMigrationVersion', APP_VERSION);
  } catch (error) {
    console.error('Migration V2 impossible, données V1 conservées.', error);
    throw error;
  }
}

// ============================================================
// Init
// ============================================================
async function init() {
  // Récupérer paramètres
  state.winterMode = (await settings.get('winterMode')) || false;
  state.winterAutoEnabled = (await settings.get('winterAutoEnabled')) || false;
  state.winterAutoStart = (await settings.get('winterAutoStart')) || '11-01';
  state.winterAutoEnd = (await settings.get('winterAutoEnd')) || '03-31';
  state.vacationMode = (await settings.get('vacationMode')) || false;
  state.vacationStartedAt = (await settings.get('vacationStartedAt')) || null;
  state.roomFilter = (await settings.get('roomFilter')) || 'all';

  // Charger les plantes et migrer V1.3.0 -> V2.0.0 sans toucher aux photos
  await migrateExistingData();
  state.plants = await db.getAll();

  // Afficher l'app et laisser le splash HTML/SVG se masquer sans bloquer l'usage.
  document.getElementById('app').style.display = 'flex';
  setupSplashScreen();

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
  const winterActive = effectiveWinterMode();
  winter.className = `mode-pill mode-pill--winter ${winterActive ? 'mode-pill--active' : 'mode-pill--inactive'}`;
  winter.innerHTML = `${icon('winter', { size: 'small' })}<span>${winterActive && !state.winterMode ? 'Hiver auto' : 'Hiver'}</span>`;
  winter.title = winterActive && !state.winterMode ? 'Activé automatiquement' : 'Basculer le mode hiver manuel';
  vacation.className = `mode-pill mode-pill--vacation ${state.vacationMode ? 'mode-pill--active' : 'mode-pill--inactive'}`;
  vacation.innerHTML = `${icon('vacation', { size: 'small' })}<span>Vacances</span>`;
}

function renderNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('nav-btn--active', btn.dataset.screen === state.currentScreen);
  });
}

function renderScreen() {
  const main = document.getElementById('main-content');
  switch (state.currentScreen) {
    case 'today':    return renderToday(main);
    case 'home':     return renderHome(main);
    case 'calendar': return renderCalendarScreen(main);
    case 'rooms':    return renderRooms(main);
    case 'settings': return renderSettings(main);
  }
}


function isWinterAutoActive(date = today(), start = '11-01', end = '03-31') {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (!/^\d{2}-\d{2}$/.test(start) || !/^\d{2}-\d{2}$/.test(end)) return false;
  return start <= end ? (mmdd >= start && mmdd <= end) : (mmdd >= start || mmdd <= end);
}

function winterAutoActive() {
  return !!state.winterAutoEnabled && isWinterAutoActive(today(), state.winterAutoStart, state.winterAutoEnd);
}

function effectiveWinterMode() {
  return !!state.winterMode || winterAutoActive();
}

function formatMonthDay(value) {
  const labels = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const match = String(value || '').match(/^(\d{2})-(\d{2})$/);
  if (!match) return value;
  const day = Number(match[2]);
  return `${day === 1 ? '1er' : day} ${labels[Number(match[1]) - 1] || ''}`;
}


// ============================================================
// Écran Aujourd’hui
// ============================================================
function renderToday(container) {
  const winterActive = effectiveWinterMode();
  const careOptions = { winterMode: winterActive, vacationMode: state.vacationMode };
  const events = getAllCareEvents(state.plants, careOptions, { horizonDays: 2, includeSetup: true });
  const counts = {
    late: events.filter(e => e.status === 'late').length,
    today: events.filter(e => e.status === 'today').length,
    setup: events.filter(e => e.status === 'setup').length,
    soon: events.filter(e => e.status === 'soon').length,
  };

  if (state.vacationMode) {
    container.innerHTML = `<div class="today-hero">${icon('vacation', { size: 'large' })}<h1>Aujourd’hui</h1><p>Mode vacances actif : les soins sont suspendus jusqu’à ton retour.</p></div>`;
    return;
  }

  const sections = [
    ['late', 'En retard', events.filter(e => e.status === 'late')],
    ['today', 'À faire aujourd’hui', events.filter(e => e.status === 'today')],
    ['setup', 'À configurer', events.filter(e => e.status === 'setup')],
    ['soon', 'Bientôt', events.filter(e => e.status === 'soon')],
  ];
  const total = counts.late + counts.today + counts.setup;

  container.innerHTML = `
    <section class="today-hero">
      ${icon('today', { size: 'large' })}
      <h1>Aujourd’hui</h1>
      <p>${total ? `${total} soin(s) attendent tes plantes.` : 'Tout va bien aujourd’hui. Les feuilles respirent.'}</p>
    </section>
    <div class="dash-summary dash-summary--today">
      ${todayStat('late', 'Retard', counts.late)}
      ${todayStat('today', 'Aujourd’hui', counts.today)}
      ${todayStat('setup', 'À configurer', counts.setup)}
      ${todayStat('soon', 'Bientôt', counts.soon)}
    </div>
    <div class="today-sections">
      ${sections.map(([key, title, items]) => renderTodaySection(key, title, items)).join('')}
    </div>
    ${renderSuggestionCard()}
  `;

  container.querySelectorAll('[data-today-task]').forEach(button => {
    button.addEventListener('click', () => markTaskDone(button.dataset.plantId, button.dataset.todayTask));
  });
  container.querySelectorAll('[data-edit-date]').forEach(button => {
    button.addEventListener('click', () => openCorrectDateModal(button.dataset.plantId, button.dataset.editDate));
  });
}

function todayStat(key, label, value) {
  return `<div class="dash-stat dash-stat--${esc(key)}"><div class="dash-stat-val">${value}</div><div class="dash-stat-label">${icon(key === 'late' ? 'late' : key, { size: 'small' })}${esc(label)}</div></div>`;
}

function renderTodaySection(key, title, items) {
  if (!items.length) return '';
  return `<section class="today-section today-section--${esc(key)}"><h2>${esc(title)}</h2><div class="today-list">${items.map(renderTodayItem).join('')}</div></section>`;
}

function renderTodayItem(event) {
  const def = CARE_TASK_DEFS[event.taskType] || { label: event.taskLabel, actionLabel: 'Fait' };
  const info = event.status === 'setup' ? 'Dernière date à renseigner' : (event.diffDays < 0 ? `Retard de ${Math.abs(event.diffDays)} j` : event.labelText);
  return `<article class="today-item today-item--${esc(event.status)}">
    <div class="today-item-icon">${icon(event.iconName, { size: 'badge' })}</div>
    <div class="today-item-main">
      <strong>${esc(event.plantName)}</strong>
      <span>${esc(def.label)}${event.quantity ? ` · ${esc(event.quantity)}` : ''}</span>
      <small>${event.room ? `${esc(event.room)} · ` : ''}${esc(info)}</small>
    </div>
    <div class="today-item-actions">
      <button class="btn btn-primary" data-today-task="${esc(event.taskType)}" data-plant-id="${esc(event.plantId)}">${esc(def.actionLabel || 'Fait')}</button>
      <button class="btn btn-secondary" data-edit-date="${esc(event.taskType)}" data-plant-id="${esc(event.plantId)}">Modifier date</button>
    </div>
  </article>`;
}

function renderSuggestionCard() {
  const suggestions = [];
  const watchPlant = state.plants.find(p => p.healthStatus === 'bad' || (Array.isArray(p.healthHistory) && p.healthHistory.filter(h => h.status === 'bad').length >= 2));
  if (watchPlant) suggestions.push(`Cette plante est souvent en difficulté : ${esc(watchPlant.nom || 'plante')}. Tu peux vérifier sa fréquence d’arrosage.`);
  const setupPlant = state.plants.find(p => getPlantCareStatus(p, { winterMode: effectiveWinterMode(), vacationMode: state.vacationMode }).setupTasks.length);
  if (setupPlant) suggestions.push(`${esc(setupPlant.nom || 'Une plante')} a besoin d’une dernière date pour entrer dans la routine.`);
  if (!suggestions.length) return '';
  return `<aside class="suggestion-card">${icon('plant', { size: 'badge' })}<div><strong>Suggestion BibiLeaf</strong><p>${suggestions.slice(0, 1).join('</p><p>')}</p><button class="btn btn-secondary" onclick="this.closest('.suggestion-card').remove()">Plus tard</button></div></aside>`;
}

// ============================================================
// Écran Accueil
// ============================================================
function renderHome(container) {
  const winterActive = effectiveWinterMode();
  const sorted = sortByUrgency(state.plants, winterActive, state.vacationMode);
  const careById = new Map(sorted.map(p => [p.id, getPlantCareStatus(p, { winterMode: winterActive, vacationMode: state.vacationMode })]));

  const counts = { late: 0, today: 0, soon: 0, ok: 0, paused: 0 };
  const healthCounts = { watch: 0, bad: 0 };
  sorted.forEach(p => {
    const mainStatus = careById.get(p.id).mainStatus;
    if (mainStatus in counts) counts[mainStatus] += 1;
    if (p.healthStatus === 'watch') healthCounts.watch += 1;
    if (p.healthStatus === 'bad') healthCounts.bad += 1;
  });

  const roomOptions = buildRoomOptions(sorted);
  if (state.roomFilter !== 'all' && !roomOptions.some(option => option.value === state.roomFilter)) {
    state.roomFilter = 'all';
    settings.set('roomFilter', 'all');
  }

  const normalizedQuery = normalizeSearch(state.searchQuery);
  let filtered = sorted;
  if (state.filter !== 'all') filtered = filtered.filter(p => careById.get(p.id).mainStatus === state.filter);
  if (state.roomFilter !== 'all') {
    filtered = filtered.filter(p => roomFilterValue(p) === state.roomFilter);
  }
  if (normalizedQuery) {
    filtered = filtered.filter(p => matchesSearch(p, normalizedQuery));
  }

  const vacationNotice = state.vacationMode
    ? `<div class="settings-section" style="margin-bottom:14px"><strong>🌴 Pause vacances active</strong><br><span style="color:var(--text-soft);font-size:.85rem">Le décompte est suspendu depuis ${esc(state.vacationStartedAt || 'aujourd’hui')}.</span></div>`
    : '';

  const emptyExplorerMessage = state.roomFilter !== 'all' && !normalizedQuery && state.filter === 'all'
    ? 'Aucune plante dans cette pièce.'
    : 'Aucune plante ne correspond à ta recherche.';

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

    ${(healthCounts.watch || healthCounts.bad) ? `<div class="health-summary">${healthCounts.watch ? `<span>😐 ${healthCounts.watch} à surveiller</span>` : ''}${healthCounts.bad ? `<span>🥀 ${healthCounts.bad} en difficulté</span>` : ''}</div>` : ''}

    <section class="explorer-panel" aria-label="Explorer mes plantes">
      <div class="explorer-title">Explorer mes plantes</div>
      <div class="search-box">
        <span aria-hidden="true">🔎</span>
        <input id="plant-search" type="search" placeholder="Rechercher une plante..." value="${esc(state.searchQuery)}" autocomplete="off">
        <button id="clear-search" class="search-clear" aria-label="Effacer la recherche" ${state.searchQuery ? '' : 'hidden'}>×</button>
      </div>
      <div class="room-filter-bar" id="room-filter-bar" aria-label="Filtrer par pièce">
        ${roomOptions.map(option => `
          <button class="room-chip ${state.roomFilter === option.value ? 'room-chip--active' : ''}" data-room-filter="${esc(option.value)}">${esc(option.label)} (${option.count})</button>
        `).join('')}
      </div>
      <div class="filter-bar" id="filter-bar" aria-label="Filtrer par urgence">
        <button class="filter-chip ${state.filter === 'all' ? 'filter-chip--active' : ''}" data-filter="all">Toutes (${sorted.length})</button>
        <button class="filter-chip ${state.filter === 'late' ? 'filter-chip--active' : ''}" data-filter="late">🚨 Retard (${counts.late})</button>
        <button class="filter-chip ${state.filter === 'today' ? 'filter-chip--active' : ''}" data-filter="today">💧 Aujourd'hui (${counts.today})</button>
        <button class="filter-chip ${state.filter === 'soon' ? 'filter-chip--active' : ''}" data-filter="soon">🟡 Bientôt (${counts.soon})</button>
        <button class="filter-chip ${state.filter === 'ok' ? 'filter-chip--active' : ''}" data-filter="ok">✅ OK (${counts.ok})</button>
      </div>
    </section>

    <div class="plant-list" id="plant-list"></div>
    ${state.plants.length === 0 ? emptyState() : ''}
    ${state.plants.length > 0 && filtered.length === 0 ? softEmptyState(emptyExplorerMessage) : ''}
  `;

  container.querySelector('#filter-bar').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (chip) { state.filter = chip.dataset.filter; renderAll(); }
  });

  container.querySelector('#room-filter-bar').addEventListener('click', async e => {
    const chip = e.target.closest('[data-room-filter]');
    if (!chip) return;
    state.roomFilter = chip.dataset.roomFilter;
    await settings.set('roomFilter', state.roomFilter);
    renderAll();
  });

  const searchInput = container.querySelector('#plant-search');
  searchInput.addEventListener('input', e => {
    const cursor = e.target.selectionStart ?? e.target.value.length;
    state.searchQuery = e.target.value;
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = window.setTimeout(() => {
      renderAll();
      requestAnimationFrame(() => {
      const nextInput = document.getElementById('plant-search');
      nextInput?.focus();
        nextInput?.setSelectionRange(cursor, cursor);
      });
    }, 140);
  });
  container.querySelector('#clear-search').addEventListener('click', () => {
    state.searchQuery = '';
    renderAll();
  });

  const list = container.querySelector('#plant-list');
  const handlers = {
    onOpen:  id => { const p = getPlant(id); openPlantSheet(p, effectiveWinterMode(), state.vacationMode, sheetHandlers()); },
    onTaskDone: (id, taskType) => markTaskDone(id, taskType),
    onWater: id => markTaskDone(id, 'water'),
    onFert:  id => markTaskDone(id, 'fertilizer'),
    onCorrectDate: (id, action = 'water') => openCorrectDateModal(id, action),
  };
  filtered.forEach(p => list.appendChild(renderCard(p, winterActive, state.vacationMode, handlers)));
}
function emptyState() {
  return `<div class="empty-state">
    <div class="empty-emoji">🪴</div>
    <h3>Aucune plante encore !</h3>
    <p>Appuie sur <strong>+</strong> pour ajouter<br>ta première plante.</p>
  </div>`;
}


function softEmptyState(message) {
  return `<div class="empty-state empty-state--soft">
    <div class="empty-emoji">🍃</div>
    <h3>${esc(message)}</h3>
    <p>Essaie une autre pièce ou efface la recherche.</p>
  </div>`;
}

function normalizeSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function roomName(plant) {
  return String(plant?.piece || '').trim();
}

function roomFilterValue(plant) {
  const room = roomName(plant);
  return room ? `room:${room}` : '__no_room__';
}

function buildRoomOptions(plants) {
  const counts = new Map();
  plants.forEach(plant => {
    const value = roomFilterValue(plant);
    const label = value === '__no_room__' ? 'Sans pièce' : roomName(plant);
    const current = counts.get(value) || { value, label, count: 0 };
    current.count += 1;
    counts.set(value, current);
  });

  const rooms = [...counts.values()]
    .filter(option => option.value !== '__no_room__')
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  const noRoom = counts.get('__no_room__');
  return [
    { value: 'all', label: 'Toutes', count: plants.length },
    ...rooms,
    ...(noRoom ? [noRoom] : []),
  ];
}

function matchesSearch(plant, query) {
  const haystack = [plant.nom, plant.espece, plant.piece, plant.notes]
    .map(normalizeSearch)
    .join(' ');
  return haystack.includes(query);
}

function sheetHandlers() {
  return {
    onTaskDone:  (id, taskType) => markTaskDone(id, taskType),
    onWater:     id => markTaskDone(id, 'water'),
    onFert:      id => markTaskDone(id, 'fertilizer'),
    onEdit:      updated => savePlant(updated),
    onDuplicate: id => { const copy = duplicatePlant(getPlant(id)); savePlant(copy); },
    onDelete:    id => deletePlant(id),
    onCorrectDate: (id, action = 'water') => openCorrectDateModal(id, action),
  };
}

// ============================================================
// Écran Calendrier
// ============================================================
function renderCalendarScreen(container) {
  container.innerHTML = `<div class="screen-title">🌿 Timeline</div><div id="cal-container"></div>`;
  renderCalendar(state.plants, effectiveWinterMode(), container.querySelector('#cal-container'), state.vacationMode, {
    onTaskDone: (id, taskType) => markTaskDone(id, taskType),
    onWater: id => markTaskDone(id, 'water'),
    onFert: id => markTaskDone(id, 'fertilizer'),
    onCorrectDate: (id, action = 'water') => openCorrectDateModal(id, action),
  });
}


// ============================================================
// Écran Pièces
// ============================================================
function renderRooms(container) {
  const winterActive = effectiveWinterMode();
  const roomMap = new Map();
  state.plants.forEach(plant => {
    const value = roomFilterValue(plant);
    const label = value === '__no_room__' ? 'Sans pièce' : roomName(plant);
    if (!roomMap.has(value)) roomMap.set(value, { value, label, plants: [], late: 0, today: 0, watch: 0 });
    const room = roomMap.get(value);
    room.plants.push(plant);
    const care = getPlantCareStatus(plant, { winterMode: winterActive, vacationMode: state.vacationMode });
    room.late += care.lateTasks.length;
    room.today += care.todayTasks.length;
    if (plant.healthStatus === 'watch' || plant.healthStatus === 'bad') room.watch += 1;
  });
  const rooms = [...roomMap.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  container.innerHTML = `
    <div class="screen-title">${icon('room', { size: 'badge' })} Pièces</div>
    ${rooms.length ? `<div class="room-grid">${rooms.map(renderRoomCard).join('')}</div>` : softEmptyState('Aucune pièce pour le moment.')}
  `;
  container.querySelectorAll('[data-room-open]').forEach(button => {
    button.addEventListener('click', async () => {
      state.roomFilter = button.dataset.roomOpen;
      await settings.set('roomFilter', state.roomFilter);
      state.currentScreen = 'home';
      renderAll();
    });
  });
}

function renderRoomCard(room) {
  const details = [];
  if (room.late) details.push(`${room.late} soin(s) en retard`);
  if (room.today) details.push(`${room.today} soin(s) aujourd’hui`);
  if (room.watch) details.push(`${room.watch} plante(s) à surveiller`);
  return `<article class="room-card">
    <div class="room-card-head">${icon('room', { size: 'badge' })}<strong>${esc(room.label)}</strong></div>
    <p>${room.plants.length} plante(s)</p>
    <small>${details.length ? esc(details.join(' · ')) : 'Tout va bien'}</small>
    <button class="btn btn-secondary" data-room-open="${esc(room.value)}">Voir les plantes</button>
  </article>`;
}

// ============================================================
// Écran Paramètres
// ============================================================
function renderSettings(container) {
  container.innerHTML = `
    <div class="screen-title">${icon('settings', { size: 'badge' })} Réglages</div>

    <div class="settings-layout settings-layout--v2">
      <div class="settings-section settings-card">
        <div class="settings-title">${icon('winter', { size: 'normal' })} Modes</div>
        <div class="settings-row">
          <div class="settings-row-info"><div class="settings-row-label">Mode hiver manuel</div><div class="settings-row-sub">Espace les soins sensibles comme l’arrosage.</div></div>
          <label class="label-toggle" style="margin:0"><input type="checkbox" id="toggle-winter" ${state.winterMode ? 'checked' : ''}><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div class="settings-row-info"><div class="settings-row-label">Mode hiver automatique</div><div class="settings-row-sub">${winterAutoActive() ? 'Activé automatiquement' : 'Inactif actuellement'} · du ${esc(formatMonthDay(state.winterAutoStart))} au ${esc(formatMonthDay(state.winterAutoEnd))}.</div></div>
          <label class="label-toggle" style="margin:0"><input type="checkbox" id="toggle-winter-auto" ${state.winterAutoEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-row">
          <div class="settings-row-info"><div class="settings-row-label">Mode vacances</div><div class="settings-row-sub">Suspend le décompte jusqu’à ton retour.</div></div>
          <label class="label-toggle" style="margin:0"><input type="checkbox" id="toggle-vacation" ${state.vacationMode ? 'checked' : ''}><span class="toggle-slider"></span></label>
        </div>
      </div>

      <div class="settings-section settings-card">
        <div class="settings-title">${icon('today', { size: 'normal' })} Notifications</div>
        <div class="settings-note">Les notifications dépendent du navigateur et de l’installation PWA. Les retards sont notifiés une fois par jour maximum.</div>
        <button class="btn-settings-action" id="btn-notif">Tester les notifications</button>
      </div>

      <div class="settings-section settings-card">
        <div class="settings-title">${icon('backup', { size: 'normal' })} Sauvegardes</div>
        <button class="btn-settings-action" id="btn-export">Exporter en Excel</button>
        <button class="btn-settings-action" id="btn-import">Importer depuis Excel</button>
        <button class="btn-settings-action" id="btn-template">Télécharger le modèle Excel</button>
        <button class="btn-settings-action" id="btn-export-json">Exporter sauvegarde JSON V2</button>
        <button class="btn-settings-action" id="btn-import-json">Importer sauvegarde JSON</button>
        <button class="btn-settings-action" id="btn-export-ics">Exporter calendrier des soins (.ics)</button>
        <div class="settings-note">Excel et JSON n’incluent pas les photos. JSON conserve les routines complètes, sans photos.</div>
        <input type="file" id="import-file" accept=".xlsx" style="display:none">
        <input type="file" id="import-json-file" accept=".json,application/json" style="display:none">
      </div>

      <div class="settings-section settings-card">
        <div class="settings-title">${icon('settings', { size: 'normal' })} Maintenance</div>
        <button class="btn-settings-action" id="btn-reload-latest">Recharger la dernière version</button>
        <div class="settings-note">Version actuelle : BibiLeaf V${APP_VERSION}. Tes plantes, photos et réglages sont conservés.</div>
        <button class="btn-settings-action danger" id="btn-reset">Supprimer toutes les plantes</button>
      </div>

      <div class="settings-section settings-card">
        <div class="settings-title">${icon('plant', { size: 'normal' })} Confidentialité locale / À propos</div>
        <div class="settings-about"><strong>BibiLeaf V${APP_VERSION}</strong><br>Données locales, aucun compte, aucun cloud, aucune publicité.<br>Pas de diagnostic automatique : BibiLeaf t’aide à suivre tes routines.</div>
      </div>
    </div>
  `;

  container.querySelector('#toggle-winter').addEventListener('change', async e => {
    state.winterMode = e.target.checked;
    await settings.set('winterMode', state.winterMode);
    renderAll();
  });
  container.querySelector('#toggle-winter-auto').addEventListener('change', async e => {
    state.winterAutoEnabled = e.target.checked;
    await settings.set('winterAutoEnabled', state.winterAutoEnabled);
    toastMsg(state.winterAutoEnabled ? 'Hiver automatique activé.' : 'Hiver automatique désactivé.');
    renderAll();
  });
  container.querySelector('#toggle-vacation').addEventListener('change', async e => setVacationMode(e.target.checked));

  container.querySelector('#btn-export').addEventListener('click', () => {
    if (state.plants.length === 0) { toastMsg('Aucune plante à exporter', 'error'); return; }
    exportXLSX(state.plants);
    toastMsg('Export téléchargé !');
  });
  container.querySelector('#btn-import').addEventListener('click', () => container.querySelector('#import-file').click());
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
      console.warn(err);
      toastMsg('Erreur lors de l\'import', 'error');
    }
    e.target.value = '';
  });
  container.querySelector('#btn-template').addEventListener('click', () => downloadTemplate());
  container.querySelector('#btn-export-json').addEventListener('click', () => exportJSONBackup());
  container.querySelector('#btn-import-json').addEventListener('click', () => container.querySelector('#import-json-file').click());
  container.querySelector('#import-json-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    await importJSONBackup(file);
    e.target.value = '';
  });
  container.querySelector('#btn-export-ics').addEventListener('click', () => exportICS());

  container.querySelector('#btn-notif').addEventListener('click', () => {
    if (!('Notification' in window)) { toastMsg('Notifications non disponibles sur cet appareil ou ce navigateur.', 'error'); return; }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => p === 'granted' ? testNotification() : toastMsg('Notifications refusées', 'error'));
    } else testNotification();
  });

  container.querySelector('#btn-reload-latest').addEventListener('click', async () => {
    const ok = await confirmModal('Recharger la dernière version ?<br>Tes plantes et réglages seront conservés.', 'Recharger');
    if (ok) await reloadLatestVersion();
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

function exportJSONBackup() {
  const payload = {
    type: 'bibileaf-backup',
    backupVersion: 2,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    containsPhotos: false,
    settings: {
      winterMode: state.winterMode,
      winterAutoEnabled: state.winterAutoEnabled,
      winterAutoStart: state.winterAutoStart,
      winterAutoEnd: state.winterAutoEnd,
      vacationMode: state.vacationMode,
      vacationStartedAt: state.vacationStartedAt,
      roomFilter: state.roomFilter,
    },
    plants: state.plants.map(plantWithoutPhoto),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bibileaf-backup-v${APP_VERSION}-${todayISO()}.json`;
  document.body.appendChild(a);
  const url = a.href;
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  toastMsg('Sauvegarde JSON téléchargée.');
}

function exportICS() {
  const events = getAllCareEvents(state.plants, { winterMode: effectiveWinterMode(), vacationMode: false }, { horizonDays: 30, includeSetup: false })
    .filter(event => event.dueDate && ['late', 'today', 'soon', 'ok'].includes(event.status));
  if (!events.length) { toastMsg('Aucun soin daté à exporter.', 'error'); return; }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BibiLeaf//Care Calendar V2//FR', 'CALSCALE:GREGORIAN'];
  events.forEach(event => {
    const def = CARE_TASK_DEFS[event.taskType] || { label: event.taskLabel };
    const date = String(event.dueDate).replace(/-/g, '');
    const description = [`Pièce : ${event.room || '—'}`, `Soin : ${def.label}`, event.quantity ? `Quantité : ${event.quantity}` : ''].filter(Boolean).join('\\n');
    lines.push('BEGIN:VEVENT', `UID:bibileaf-${event.plantId}-${event.taskType}-${event.dueDate}@local`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${date}`, `SUMMARY:${icsEscape(`BibiLeaf - ${def.label} ${event.plantName}`)}`, `DESCRIPTION:${icsEscape(description)}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  downloadText(`bibileaf-soins-${todayISO()}.ics`, lines.join('\r\n'), 'text/calendar');
  toastMsg('Calendrier des soins téléchargé.');
}

function icsEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  const url = a.href;
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importJSONBackup(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed?.type !== 'bibileaf-backup' || !Array.isArray(parsed.plants)) throw new Error('invalid');
    const ok = await confirmModal('Importer cette sauvegarde ?<br>Les plantes et réglages actuels seront remplacés. Les photos ne seront pas restaurées.', 'Importer');
    if (!ok) return;

    const previousPhotos = new Map(state.plants.filter(p => p.photo).map(p => [p.id, p.photo]));
    for (const plant of state.plants) await db.delete(plant.id);
    for (const importedPlant of parsed.plants) {
      const safe = createPlant({ ...importedPlant, photo: previousPhotos.get(importedPlant.id) || null });
      await db.put(safe);
    }

    const backupSettings = parsed.settings || {};
    const supportedSettings = ['winterMode', 'winterAutoEnabled', 'winterAutoStart', 'winterAutoEnd', 'vacationMode', 'vacationStartedAt', 'roomFilter'];
    for (const key of supportedSettings) {
      if (Object.prototype.hasOwnProperty.call(backupSettings, key)) await settings.set(key, backupSettings[key]);
    }

    state.winterMode = !!backupSettings.winterMode;
    state.winterAutoEnabled = backupSettings.winterAutoEnabled ?? state.winterAutoEnabled;
    state.winterAutoStart = backupSettings.winterAutoStart || '11-01';
    state.winterAutoEnd = backupSettings.winterAutoEnd || '03-31';
    state.vacationMode = !!backupSettings.vacationMode;
    state.vacationStartedAt = backupSettings.vacationStartedAt || null;
    state.roomFilter = backupSettings.roomFilter || 'all';
    state.plants = await db.getAll();
    toastMsg('Sauvegarde JSON importée. Photos non incluses.');
    renderAll();
  } catch (error) {
    console.warn('Import JSON impossible', error);
    toastMsg('Fichier de sauvegarde invalide.', 'error');
  }
}

// ============================================================
// Actions métier
// ============================================================

function openCorrectDateModal(id, defaultAction = 'water') {
  const plant = getPlant(id);
  if (!plant) return;
  const tasks = getPlantCareStatus(plant, { winterMode: effectiveWinterMode(), vacationMode: state.vacationMode }).activeTasks;
  const fallback = tasks[0]?.type || 'water';
  const action = tasks.some(task => task.type === defaultAction) ? defaultAction : fallback;
  const selectedTask = tasks.find(task => task.type === action);
  const currentValue = plant.careTasks?.find(task => task.type === action)?.lastDoneAt || todayISO();

  const overlay = createModal(`
    <div class="form-header"><button class="btn-back" id="correct-close">←</button><h2>Modifier date</h2></div>
    <div class="form-body quick-date-form">
      <div class="quick-date-plant">${esc(plant.nom || 'Plante')}</div>
      <div class="quick-date-actions" role="group" aria-label="Choix action">
        ${tasks.map(task => `<button class="quick-date-choice ${task.type === action ? 'quick-date-choice--active' : ''}" data-action="${esc(task.type)}">${icon(task.iconName, { size: 'small' })}${esc(CARE_TASK_DEFS[task.type]?.label || task.type)}</button>`).join('')}
      </div>
      <label>Date<input type="date" id="correct-date" value="${esc(currentValue)}" max="${esc(todayISO())}"></label>
      <div class="quick-date-shortcuts"><button class="quick-date-shortcut" data-days="0">Aujourd’hui</button><button class="quick-date-shortcut" data-days="-1">Hier</button><button class="quick-date-shortcut" data-days="-2">Avant-hier</button></div>
      <div class="modal-btns"><button class="btn btn-secondary" id="correct-cancel">Annuler</button><button class="btn btn-primary" id="correct-save">Enregistrer</button></div>
    </div>
  `);

  let selectedAction = selectedTask?.type || action;
  const dateInput = overlay.querySelector('#correct-date');
  overlay.querySelector('#correct-close').addEventListener('click', () => closeModal(overlay));
  overlay.querySelector('#correct-cancel').addEventListener('click', () => closeModal(overlay));
  overlay.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      selectedAction = button.dataset.action;
      overlay.querySelectorAll('[data-action]').forEach(btn => btn.classList.toggle('quick-date-choice--active', btn === button));
      dateInput.value = plant.careTasks?.find(task => task.type === selectedAction)?.lastDoneAt || todayISO();
    });
  });
  overlay.querySelectorAll('[data-days]').forEach(button => {
    button.addEventListener('click', () => { dateInput.value = toISO(addDays(today(), Number(button.dataset.days))); });
  });
  overlay.querySelector('#correct-save').addEventListener('click', async () => {
    const selectedDate = dateInput.value;
    const parsed = parseDate(selectedDate);
    if (!parsed) { toastMsg('Choisis une date valide.', 'error'); return; }
    if (diffDays(parsed, today()) > 0) { toastMsg('La date ne peut pas être dans le futur.', 'error'); return; }
    const updated = updatePlantTaskDate(plant, selectedAction, selectedDate);
    await db.put(updated);
    state.plants = await db.getAll();
    closeModal(overlay);
    toastMsg('Date corrigée.');
    renderAll();
    scheduleNotifications();
  });
}

function updatePlantTaskDate(plant, taskType, dateValue) {
  const careTasks = (plant.careTasks || []).map(task => task.type === taskType ? { ...task, lastDoneAt: dateValue, updatedAt: new Date().toISOString() } : task);
  const water = careTasks.find(task => task.type === 'water');
  const fertilizer = careTasks.find(task => task.type === 'fertilizer');
  return createPlant({
    ...plant,
    careTasks,
    derniereEau: water?.lastDoneAt || plant.derniereEau || null,
    dernierEngrais: fertilizer?.lastDoneAt || plant.dernierEngrais || null,
    updatedAt: new Date().toISOString(),
  });
}

async function markTaskDone(id, taskType = 'water') {
  const plant = getPlant(id);
  if (!plant) return;
  const previous = createPlant(plant);
  const updated = updatePlantTaskDate(plant, taskType, todayISO());
  await db.put(updated);
  state.plants = await db.getAll();
  activeUndo = { plant: previous };
  const def = CARE_TASK_DEFS[taskType] || { actionLabel: 'Soin fait' };
  toastMsg(`${def.actionLabel || 'Soin fait'} pour ${plant.nom || 'Plante'}.`, 'success', {
    actionLabel: 'Annuler',
    duration: 5000,
    onAction: undoLastQuickAction,
  });
  renderAll();
}

async function markWater(id) { return markTaskDone(id, 'water'); }
async function markFert(id) { return markTaskDone(id, 'fertilizer'); }

async function undoLastQuickAction() {
  if (!activeUndo?.plant) return;
  await db.put(activeUndo.plant);
  activeUndo = null;
  state.plants = await db.getAll();
  toastMsg('Action annulée.');
  renderAll();
}

async function savePlant(plant) {
  await db.put(createPlant(plant));
  state.plants = await db.getAll();
  toastMsg(plant.nom ? `${plant.nom} sauvegardée !` : 'Plante sauvegardée !');
  renderAll();
  scheduleNotifications();
}

async function deletePlant(id) {
  const plant = getPlant(id);
  await db.delete(id);
  state.plants = await db.getAll();
  toastMsg(`${plant.nom || 'Plante'} supprimée`);
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
    toastMsg('Mode vacances activé : décompte suspendu.');
    renderAll();
    return;
  }

  const startedAt = parseDate(state.vacationStartedAt);
  const pauseDays = startedAt ? Math.max(0, diffDays(today(), startedAt)) : 0;

  if (pauseDays > 0) {
    for (const plant of state.plants) {
      const careTasks = (plant.careTasks || []).map(task => {
        const parsed = parseDate(task.lastDoneAt);
        if (!task.enabled || !parsed) return task;
        return { ...task, lastDoneAt: toISO(addDays(parsed, pauseDays)), updatedAt: new Date().toISOString() };
      });
      const water = careTasks.find(task => task.type === 'water');
      const fertilizer = careTasks.find(task => task.type === 'fertilizer');
      await db.put(createPlant({
        ...plant,
        careTasks,
        derniereEau: water?.lastDoneAt || plant.derniereEau,
        dernierEngrais: fertilizer?.lastDoneAt || plant.dernierEngrais,
      }));
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


function setupSplashScreen() {
  const splash = document.getElementById('splash-screen') || document.getElementById('loading');
  if (!splash) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const alreadySeen = sessionStorage.getItem('bibileaf-splash-seen') === '1';
  const delay = reduceMotion ? 350 : (alreadySeen ? 250 : 4800);
  if (alreadySeen) splash.classList.add('splash-screen--quick');
  window.setTimeout(() => {
    splash.classList.add('splash-hidden');
    sessionStorage.setItem('bibileaf-splash-seen', '1');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    window.setTimeout(() => splash.remove(), 700);
  }, delay);
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
  const late = state.plants.filter(p => status(p, effectiveWinterMode(), false) === 'late');
  if (late.length > 0) {
    settings.get('lastLateNotificationDate').then(lastDate => {
      const currentDate = todayISO();
      if (lastDate === currentDate) return;
      new Notification('BibiLeaf 🪴', {
        body: `${late.length} soin(s) en retard sur BibiLeaf.`,
        icon: './icons/icon-192.png',
      });
      settings.set('lastLateNotificationDate', currentDate);
    });
  }
}

function testNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    toastMsg('Notifications non disponibles sur cet appareil ou ce navigateur.', 'error');
    return;
  }

  new Notification('BibiLeaf 🪴', {
    body: 'Les notifications de soins fonctionnent !',
    icon: './icons/icon-192.png',
  });
  toastMsg('Notification envoyée !');
}

// ============================================================
// Navigation
// ============================================================
function setupNav() {
  document.querySelectorAll('[data-nav-icon]').forEach(slot => { slot.innerHTML = icon(slot.dataset.navIcon, { size: 'normal' }); });
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
    toastMsg(state.winterMode ? 'Mode hiver activé' : 'Mode hiver désactivé');
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
