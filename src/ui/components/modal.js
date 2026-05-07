// src/ui/components/modal.js — Système de modales

export function createModal(content, opts = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = content;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Fermer au clic hors modal
  if (!opts.preventClose) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay);
    });
  }

  // Animation d'entrée
  requestAnimationFrame(() => overlay.classList.add('modal-visible'));

  return overlay;
}

export function closeModal(overlay) {
  overlay.classList.remove('modal-visible');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
}

export function confirmModal(message) {
  return new Promise(resolve => {
    const overlay = createModal(`
      <div class="modal-confirm">
        <p>${message}</p>
        <div class="modal-btns">
          <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
          <button class="btn btn-danger" id="modal-ok">Supprimer</button>
        </div>
      </div>
    `);
    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
      closeModal(overlay);
      resolve(false);
    });
    overlay.querySelector('#modal-ok').addEventListener('click', () => {
      closeModal(overlay);
      resolve(true);
    });
  });
}

export function toastMsg(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2500);
}
