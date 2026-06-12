// src/ui/components/form.js — Formulaire plante V2

import { createModal, closeModal, toastMsg, confirmModal } from './modal.js';
import { todayISO, parseDate, diffDays, today } from '../../utils/date.js';
import { esc } from '../../utils/html.js';
import { icon } from '../icons.js';
import { PLANT_PROFILES, HEALTH_STATUSES, CARE_TASK_DEFS, applyPlantProfile, createPlant, normalizePlantProfile, normalizeHealthStatus, normalizeCareTasks } from '../../models/plant.js';

const NO_QUANTITY = new Set(['rotation', 'repotting', 'health_check', 'pruning', 'leaf_cleaning', 'misting']);

export function openPlantForm(plantInput, onSave) {
  const plant = createPlant(plantInput || {});
  const isEdit = !!plantInput?.nom;
  const todayValue = todayISO();
  let careTasks = normalizeCareTasks(plant);
  const currentProfile = normalizePlantProfile(plant.profilPlante);
  const currentHealth = normalizeHealthStatus(plant.healthStatus);

  const overlay = createModal(`
    <div class="form-header">
      <button class="btn-back" id="form-close">←</button>
      <h2>${isEdit ? 'Modifier' : 'Nouvelle plante'}</h2>
    </div>

    <div class="form-photo-zone" id="form-photo-zone">
      ${plant.photo
        ? `<img src="${esc(plant.photo)}" id="form-photo-preview" alt="photo">`
        : `<div id="form-photo-preview" class="photo-placeholder">${icon('plant', { size: 'large' })}<br><small>Ajouter une photo</small></div>`
      }
      <input type="file" id="form-photo-input" accept="image/*" capture="environment" style="display:none">
      ${plant.photo ? `<button class="btn-remove-photo" id="form-remove-photo">✕ Supprimer la photo</button>` : ''}
    </div>

    <div class="form-body">
      <label>Nom *<input type="text" id="f-nom" value="${esc(plant.nom)}" placeholder="Mon ficus" required></label>
      <label>Espèce<input type="text" id="f-espece" value="${esc(plant.espece)}" placeholder="Ficus lyrata"></label>
      <label>Profil de plante
        <select id="f-profilPlante">
          ${Object.entries(PLANT_PROFILES).map(([key, profile]) => `<option value="${esc(key)}" ${currentProfile === key ? 'selected' : ''}>${esc(profile.label)} — ${esc(profile.description || '')}</option>`).join('')}
        </select>
      </label>
      <label>Pièce<input type="text" id="f-piece" value="${esc(plant.piece)}" placeholder="Salon"></label>

      <div class="form-section-title">${icon('setup', { size: 'small' })} Routines de soins</div>
      <div id="care-task-editor" class="care-task-editor">${renderCareTaskFields(careTasks, todayValue)}</div>

      <div class="form-section-title">${icon('healthCheck', { size: 'small' })} État actuel</div>
      <label>État santé
        <select id="f-healthStatus">
          ${Object.entries(HEALTH_STATUSES).map(([key, health]) => `<option value="${esc(key)}" ${currentHealth === key ? 'selected' : ''}>${esc(health.label)}</option>`).join('')}
        </select>
      </label>

      <div class="form-section-title">Notes</div>
      <label class="form-notes">Notes<textarea id="f-notes" rows="3" placeholder="Exposition, particularités...">${esc(plant.notes)}</textarea></label>

      <div class="form-actions"><button class="btn btn-primary" id="form-save">${isEdit ? 'Enregistrer' : 'Ajouter la plante'}</button></div>
    </div>
  `);

  const photoZone = overlay.querySelector('#form-photo-zone');
  const photoInput = overlay.querySelector('#form-photo-input');
  let photoData = plant.photo || null;

  function ensureRemovePhotoButton() {
    if (overlay.querySelector('#form-remove-photo')) return;
    photoZone.insertAdjacentHTML('beforeend', '<button class="btn-remove-photo" id="form-remove-photo">✕ Supprimer la photo</button>');
  }

  function bindRemovePhotoButton() {
    overlay.querySelector('#form-remove-photo')?.addEventListener('click', e => {
      e.stopPropagation();
      photoData = null;
      overlay.querySelector('#form-photo-preview').outerHTML = `<div id="form-photo-preview" class="photo-placeholder">${icon('plant', { size: 'large' })}<br><small>Ajouter une photo</small></div>`;
      overlay.querySelector('#form-remove-photo')?.remove();
    });
  }

  bindRemovePhotoButton();

  photoZone.addEventListener('click', e => {
    if (!e.target.closest('#form-remove-photo')) photoInput.click();
  });

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      toastMsg('Photo impossible à importer. Essaie avec une autre image.', 'error');
      photoInput.value = '';
      return;
    }
    overlay.querySelector('#form-photo-preview').outerHTML = `<div id="form-photo-preview" class="photo-placeholder">${icon('plant', { size: 'large' })}<br><small>Préparation de la photo...</small></div>`;
    try {
      photoData = await compressImageFile(file);
      overlay.querySelector('#form-photo-preview').outerHTML = `<img src="${esc(photoData)}" id="form-photo-preview" alt="photo">`;
      ensureRemovePhotoButton();
      bindRemovePhotoButton();
    } catch (error) {
      console.warn('Compression photo impossible', error);
      toastMsg('Photo impossible à importer. Essaie avec une autre image.', 'error');
      overlay.querySelector('#form-photo-preview').outerHTML = plant.photo
        ? `<img src="${esc(plant.photo)}" id="form-photo-preview" alt="photo">`
        : `<div id="form-photo-preview" class="photo-placeholder">${icon('plant', { size: 'large' })}<br><small>Ajouter une photo</small></div>`;
    }
    photoInput.value = '';
  });

  const profileSelect = overlay.querySelector('#f-profilPlante');
  const taskEditor = overlay.querySelector('#care-task-editor');

  profileSelect.addEventListener('change', async e => {
    const selected = e.target.value;
    if (selected === 'custom') return;
    if (isEdit) {
      const ok = await confirmModal('Appliquer ce profil ?<br>Les routines de soins actuelles seront remplacées par les recommandations du profil.', 'Appliquer');
      if (!ok) {
        profileSelect.value = normalizePlantProfile(plant.profilPlante);
        return;
      }
    }
    careTasks = applyPlantProfile({ ...plant, careTasks }, selected).careTasks;
    taskEditor.innerHTML = renderCareTaskFields(careTasks, todayValue);
  });

  taskEditor.addEventListener('input', () => {
    if (profileSelect.value !== 'custom') profileSelect.value = 'custom';
  });
  taskEditor.addEventListener('change', () => {
    if (profileSelect.value !== 'custom') profileSelect.value = 'custom';
  });

  overlay.querySelector('#form-close').addEventListener('click', () => closeModal(overlay));

  overlay.querySelector('#form-save').addEventListener('click', () => {
    const nom = overlay.querySelector('#f-nom').value.trim();
    if (!nom) { overlay.querySelector('#f-nom').focus(); return; }

    const collectedTasks = collectCareTasks(overlay);
    if (!collectedTasks) return;

    const newHealth = normalizeHealthStatus(overlay.querySelector('#f-healthStatus').value);
    const healthHistory = Array.isArray(plant.healthHistory) ? [...plant.healthHistory] : [];
    if (isEdit && newHealth !== currentHealth) {
      const note = window.prompt('Note santé optionnelle (courte) :', '') || '';
      healthHistory.push({ date: todayValue, status: newHealth, note: note.trim() });
    }

    const water = collectedTasks.find(t => t.type === 'water');
    const fertilizer = collectedTasks.find(t => t.type === 'fertilizer');
    const updated = createPlant({
      ...plant,
      nom,
      espece: overlay.querySelector('#f-espece').value.trim(),
      piece: overlay.querySelector('#f-piece').value.trim(),
      profilPlante: normalizePlantProfile(profileSelect.value),
      healthStatus: newHealth,
      healthHistory: healthHistory.slice(-20),
      photo: photoData,
      careTasks: collectedTasks,
      freqEau: water?.frequencyDays || 7,
      volumeEau: water?.quantity || '',
      derniereEau: water?.lastDoneAt || null,
      engraisActif: !!fertilizer?.enabled,
      freqEngrais: fertilizer?.frequencyDays || 30,
      quantiteEngrais: fertilizer?.quantity || '',
      dernierEngrais: fertilizer?.lastDoneAt || null,
      notes: overlay.querySelector('#f-notes').value.trim(),
      updatedAt: new Date().toISOString(),
    });

    closeModal(overlay);
    onSave(updated);
  });
}

function renderCareTaskFields(tasks, todayValue) {
  return tasks.map(task => {
    const def = CARE_TASK_DEFS[task.type];
    const hasQuantity = !NO_QUANTITY.has(task.type) || ['water', 'fertilizer'].includes(task.type);
    return `<section class="care-task-block" data-task-type="${esc(task.type)}">
      <label class="label-toggle care-task-toggle">
        <span class="care-task-title">${icon(def.iconName, { size: 'normal' })}${esc(def.label)}</span>
        <input type="checkbox" class="task-enabled" ${task.enabled ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <div class="care-task-grid">
        <label>Fréquence (jours)<input type="number" class="task-frequency" value="${esc(task.frequencyDays || def.defaultFrequencyDays)}" min="1" max="1000"></label>
        <label>Dernière date<input type="date" class="task-last" value="${esc(task.lastDoneAt || '')}" max="${esc(todayValue)}"></label>
        ${hasQuantity ? `<label>${esc(def.quantityLabel)}<input type="text" class="task-quantity" value="${esc(task.quantity || '')}" placeholder="${task.type === 'water' ? '200 ml' : task.type === 'fertilizer' ? '5 ml' : 'Note'}"></label>` : `<label>Note courte<input type="text" class="task-quantity" value="${esc(task.quantity || '')}" placeholder="Optionnel"></label>`}
      </div>
    </section>`;
  }).join('');
}

function collectCareTasks(overlay) {
  const tasks = [];
  for (const block of overlay.querySelectorAll('[data-task-type]')) {
    const type = block.dataset.taskType;
    const def = CARE_TASK_DEFS[type];
    const lastDoneAt = block.querySelector('.task-last').value || null;
    const parsed = parseDate(lastDoneAt);
    if (lastDoneAt && (!parsed || diffDays(parsed, today()) > 0)) {
      toastMsg('La date ne peut pas être dans le futur.', 'error');
      block.querySelector('.task-last').focus();
      return null;
    }
    tasks.push({
      id: type,
      type,
      label: def.label,
      iconName: def.iconName,
      enabled: block.querySelector('.task-enabled').checked,
      frequencyDays: parseInt(block.querySelector('.task-frequency').value, 10) || def.defaultFrequencyDays,
      lastDoneAt,
      quantity: block.querySelector('.task-quantity')?.value.trim() || '',
      seasonMode: 'all',
      winterSensitive: !!def.winterSensitive,
      notes: '',
      updatedAt: new Date().toISOString(),
    });
  }
  return tasks;
}

export async function compressImageFile(file, options = {}) {
  const maxSize = options.maxSize ?? 1024;
  const quality = options.quality ?? 0.78;

  if (!file || !file.type?.startsWith('image/')) throw new Error('Fichier image invalide');
  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImage(dataUrl);
  const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(image, 0, 0, width, height);

  const type = canvas.toDataURL('image/webp', quality).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
  return canvas.toDataURL(type, quality);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Lecture photo impossible'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Chargement photo impossible'));
    image.src = src;
  });
}
