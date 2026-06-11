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

export function confirmModal(message, okLabel = 'Supprimer') {
  return new Promise(resolve => {
    const overlay = createModal(`
      <div class="modal-confirm">
        <p>${message}</p>
        <div class="modal-btns">
          <button class="btn btn-secondary" id="modal-cancel">Annuler</button>
          <button class="btn btn-danger" id="modal-ok">${okLabel}</button>
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

export function toastMsg(msg, type = 'success', opts = {}) {
  document.querySelectorAll('.toast').forEach(existing => existing.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const text = document.createElement('span');
  text.textContent = msg;
  toast.appendChild(text);

  if (opts.actionLabel && typeof opts.onAction === 'function') {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'toast-action';
    action.textContent = opts.actionLabel;
    action.addEventListener('click', () => {
      opts.onAction();
      toast.remove();
    });
    toast.appendChild(action);
  }

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  const duration = opts.duration ?? 2500;
  const timer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);

  return toast;
}
