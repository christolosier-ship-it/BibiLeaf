// src/ui/components/form.js — Formulaire plante

import { createModal, closeModal, toastMsg } from './modal.js';
import { todayISO } from '../../utils/date.js';
import { esc } from '../../utils/html.js';

export function openPlantForm(plant, onSave) {
  const isEdit = !!plant.nom;
  const today = todayISO();

  const overlay = createModal(`
    <div class="form-header">
      <button class="btn-back" id="form-close">←</button>
      <h2>${isEdit ? 'Modifier' : 'Nouvelle plante'}</h2>
    </div>

    <div class="form-photo-zone" id="form-photo-zone">
      ${plant.photo
        ? `<img src="${esc(plant.photo)}" id="form-photo-preview" alt="photo">`
        : `<div id="form-photo-preview" class="photo-placeholder">🪴<br><small>Ajouter une photo</small></div>`
      }
      <input type="file" id="form-photo-input" accept="image/*" capture="environment" style="display:none">
      ${plant.photo ? `<button class="btn-remove-photo" id="form-remove-photo">✕ Supprimer la photo</button>` : ''}
    </div>

    <div class="form-body">
      <label>Nom *
        <input type="text" id="f-nom" value="${esc(plant.nom)}" placeholder="Mon ficus" required>
      </label>
      <label>Espèce
        <input type="text" id="f-espece" value="${esc(plant.espece)}" placeholder="Ficus lyrata">
      </label>
      <label>Pièce
        <input type="text" id="f-piece" value="${esc(plant.piece)}" placeholder="Salon">
      </label>

      <div class="form-section-title">💧 Arrosage</div>
      <label>Fréquence (jours)
        <input type="number" id="f-freqEau" value="${esc(plant.freqEau || 7)}" min="1" max="365">
      </label>
      <label>Volume d'eau
        <input type="text" id="f-volumeEau" value="${esc(plant.volumeEau)}" placeholder="200ml">
      </label>
      <label>Dernier arrosage
        <input type="date" id="f-derniereEau" value="${esc(plant.derniereEau || today)}">
      </label>

      <div class="form-section-title">🌿 Engrais</div>
      <label class="label-toggle">
        <span>Engrais activé</span>
        <input type="checkbox" id="f-engraisActif" ${plant.engraisActif ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <div id="engrais-fields" style="${plant.engraisActif ? '' : 'display:none'}">
        <label>Fréquence engrais (jours)
          <input type="number" id="f-freqEngrais" value="${esc(plant.freqEngrais || 30)}" min="1">
        </label>
        <label>Quantité engrais
          <input type="text" id="f-quantiteEngrais" value="${esc(plant.quantiteEngrais)}" placeholder="5ml">
        </label>
        <label>Dernier engrais
          <input type="date" id="f-dernierEngrais" value="${esc(plant.dernierEngrais || today)}">
        </label>
      </div>

      <div class="form-section-title">📝 Notes</div>
      <label>
        <textarea id="f-notes" rows="3" placeholder="Exposition, particularités...">${esc(plant.notes)}</textarea>
      </label>

      <div class="form-actions">
        <button class="btn btn-primary" id="form-save">
          ${isEdit ? '💾 Enregistrer' : '🌱 Ajouter la plante'}
        </button>
      </div>
    </div>
  `);

  // Photo
  const photoZone = overlay.querySelector('#form-photo-zone');
  const photoInput = overlay.querySelector('#form-photo-input');
  let photoData = plant.photo || null;

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

    const currentPreview = overlay.querySelector('#form-photo-preview');
    currentPreview.outerHTML = `<div id="form-photo-preview" class="photo-placeholder">🪴<br><small>Préparation de la photo...</small></div>`;

    try {
      photoData = await compressImageFile(file);
      overlay.querySelector('#form-photo-preview').outerHTML = `<img src="${esc(photoData)}" id="form-photo-preview" alt="photo">`;
    } catch (error) {
      console.warn('Compression photo impossible', error);
      toastMsg('Photo impossible à importer. Essaie avec une autre image.', 'error');
      overlay.querySelector('#form-photo-preview').outerHTML = plant.photo
        ? `<img src="${esc(plant.photo)}" id="form-photo-preview" alt="photo">`
        : `<div id="form-photo-preview" class="photo-placeholder">🪴<br><small>Ajouter une photo</small></div>`;
    }
    photoInput.value = '';
  });

  const removePhotoBtn = overlay.querySelector('#form-remove-photo');
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', e => {
      e.stopPropagation();
      photoData = null;
      overlay.querySelector('#form-photo-preview').outerHTML =
        `<div id="form-photo-preview" class="photo-placeholder">🪴<br><small>Ajouter une photo</small></div>`;
    });
  }

  // Toggle engrais
  overlay.querySelector('#f-engraisActif').addEventListener('change', e => {
    overlay.querySelector('#engrais-fields').style.display = e.target.checked ? '' : 'none';
  });

  // Fermer
  overlay.querySelector('#form-close').addEventListener('click', () => closeModal(overlay));

  // Sauvegarder
  overlay.querySelector('#form-save').addEventListener('click', () => {
    const nom = overlay.querySelector('#f-nom').value.trim();
    if (!nom) { overlay.querySelector('#f-nom').focus(); return; }

    const updated = {
      ...plant,
      nom,
      espece: overlay.querySelector('#f-espece').value.trim(),
      piece: overlay.querySelector('#f-piece').value.trim(),
      photo: photoData,
      freqEau: parseInt(overlay.querySelector('#f-freqEau').value) || 7,
      volumeEau: overlay.querySelector('#f-volumeEau').value.trim(),
      derniereEau: overlay.querySelector('#f-derniereEau').value || null,
      engraisActif: overlay.querySelector('#f-engraisActif').checked,
      freqEngrais: parseInt(overlay.querySelector('#f-freqEngrais').value) || 30,
      quantiteEngrais: overlay.querySelector('#f-quantiteEngrais').value.trim(),
      dernierEngrais: overlay.querySelector('#f-dernierEngrais').value || null,
      notes: overlay.querySelector('#f-notes').value.trim(),
    };

    closeModal(overlay);
    onSave(updated);
  });
}


export async function compressImageFile(file, options = {}) {
  const maxSize = options.maxSize ?? 1024;
  const quality = options.quality ?? 0.78;

  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Fichier image invalide');
  }

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

  const type = canvas.toDataURL('image/webp', quality).startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';
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
