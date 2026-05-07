// src/ui/components/form.js — Formulaire plante

import { createModal, closeModal } from './modal.js';
import { todayISO } from '../../utils/date.js';

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
        ? `<img src="${plant.photo}" id="form-photo-preview" alt="photo">`
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
        <input type="number" id="f-freqEau" value="${plant.freqEau || 7}" min="1" max="365">
      </label>
      <label>Volume d'eau
        <input type="text" id="f-volumeEau" value="${esc(plant.volumeEau)}" placeholder="200ml">
      </label>
      <label>Dernier arrosage
        <input type="date" id="f-derniereEau" value="${plant.derniereEau || today}">
      </label>

      <div class="form-section-title">🌿 Engrais</div>
      <label class="label-toggle">
        <span>Engrais activé</span>
        <input type="checkbox" id="f-engraisActif" ${plant.engraisActif ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <div id="engrais-fields" style="${plant.engraisActif ? '' : 'display:none'}">
        <label>Fréquence engrais (jours)
          <input type="number" id="f-freqEngrais" value="${plant.freqEngrais || 30}" min="1">
        </label>
        <label>Quantité engrais
          <input type="text" id="f-quantiteEngrais" value="${esc(plant.quantiteEngrais)}" placeholder="5ml">
        </label>
        <label>Dernier engrais
          <input type="date" id="f-dernierEngrais" value="${plant.dernierEngrais || today}">
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
  const photoPreview = overlay.querySelector('#form-photo-preview');
  let photoData = plant.photo || null;

  photoZone.addEventListener('click', e => {
    if (!e.target.closest('#form-remove-photo')) photoInput.click();
  });

  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      photoData = ev.target.result;
      photoPreview.outerHTML = `<img src="${photoData}" id="form-photo-preview" alt="photo">`;
    };
    reader.readAsDataURL(file);
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

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
