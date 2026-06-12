// src/ui/icons.js — mini-bibliothèque SVG maison BibiLeaf V2

const paths = {
  water: '<path d="M12 3 C8 8 6 11 6 15a6 6 0 0 0 12 0c0-4-2-7-6-12z" fill="var(--icon-water)"/><path d="M9 15c.4 1.8 1.6 2.8 3.5 3" fill="none" stroke="var(--icon-cream)" stroke-width="1.8" stroke-linecap="round"/>',
  fertilizer: '<path d="M6 15c5-8 11-8 14-4-3 6-9 7-14 4z" fill="var(--icon-green)"/><circle cx="8" cy="8" r="2" fill="var(--icon-terracotta)"/><circle cx="14" cy="6" r="1.7" fill="var(--icon-warning)"/>',
  rotation: '<path d="M7 11h10l-1 8H8z" fill="var(--icon-terracotta)"/><path d="M8 8a7 7 0 0 1 10 1" fill="none" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/><path d="M18 5v4h-4" fill="none" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  leafCleaning: '<path d="M5 15c5-9 12-8 15-4-3 7-10 8-15 4z" fill="var(--icon-green)"/><path d="M8 14c3-1 6-2 9-3" stroke="var(--icon-cream)" stroke-width="1.5" stroke-linecap="round"/><path d="M17 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="var(--icon-warning)"/>',
  repotting: '<path d="M6 10h12l-2 9H8z" fill="var(--icon-terracotta)"/><path d="M5 8h14v3H5z" fill="var(--icon-terracotta)" opacity=".75"/><path d="M15 5l4 4" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/><path d="M18 8l-2 2" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/>',
  misting: '<path d="M7 8h7v4H7z" fill="var(--icon-water)"/><path d="M5 12h7l-1 6H6z" fill="var(--icon-green-soft)"/><circle cx="18" cy="8" r="1.2" fill="var(--icon-water)"/><circle cx="20" cy="12" r="1" fill="var(--icon-water)"/>',
  healthCheck: '<path d="M5 14c4-7 10-7 13-3-3 6-9 7-13 3z" fill="var(--icon-green)"/><circle cx="15" cy="8" r="4" fill="none" stroke="var(--icon-terracotta)" stroke-width="2"/><path d="M18 11l3 3" stroke="var(--icon-terracotta)" stroke-width="2" stroke-linecap="round"/>',
  pruning: '<circle cx="7" cy="16" r="2.2" fill="none" stroke="var(--icon-terracotta)" stroke-width="2"/><circle cx="12" cy="16" r="2.2" fill="none" stroke="var(--icon-terracotta)" stroke-width="2"/><path d="M9 14l8-8M11 14l6 4" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/>',
  late: '<circle cx="12" cy="12" r="9" fill="var(--icon-warning)"/><path d="M12 7v6" stroke="var(--icon-cream)" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="var(--icon-cream)"/>',
  today: '<circle cx="12" cy="12" r="5" fill="var(--icon-warning)"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" stroke="var(--icon-warning)" stroke-width="1.8" stroke-linecap="round"/>',
  soon: '<circle cx="12" cy="12" r="8" fill="none" stroke="var(--icon-green-soft)" stroke-width="2"/><path d="M12 7v5l3 2" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  ok: '<path d="M5 13l4 4L19 7" fill="none" stroke="var(--icon-green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9c4-5 9-4 12-1-2 5-7 7-12 5" fill="var(--icon-green-soft)" opacity=".55"/>',
  paused: '<path d="M7 11h10l-1 8H8z" fill="var(--icon-terracotta)"/><path d="M8 7c4-2 7-2 9 1" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/><path d="M10 13v3M14 13v3" stroke="var(--icon-cream)" stroke-width="2" stroke-linecap="round"/>',
  setup: '<circle cx="12" cy="12" r="8" fill="var(--icon-muted)" opacity=".25"/><path d="M12 7v10M7 12h10" stroke="var(--icon-muted)" stroke-width="2" stroke-linecap="round"/>',
  winter: '<path d="M12 3v18M5 7l14 10M19 7L5 17" stroke="var(--icon-water)" stroke-width="1.8" stroke-linecap="round"/><path d="M7 14c4-5 8-5 11-2-2 5-7 6-11 2z" fill="var(--icon-green-soft)"/>',
  vacation: '<path d="M12 5c4 1 7 4 8 8H4c1-4 4-7 8-8z" fill="var(--icon-warning)"/><path d="M12 13v7" stroke="var(--icon-terracotta)" stroke-width="2" stroke-linecap="round"/>',
  room: '<path d="M4 11l8-6 8 6v9H6v-7" fill="var(--icon-cream)" stroke="var(--icon-green)" stroke-width="2" stroke-linejoin="round"/><path d="M9 20v-5h6v5" fill="var(--icon-green-soft)"/>',
  plant: '<path d="M7 12h10l-1 8H8z" fill="var(--icon-terracotta)"/><path d="M12 13V6" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/><path d="M12 8C8 5 6 7 5 10c3 1 5 1 7-2zM12 8c4-3 6-1 7 2-3 1-5 1-7-2z" fill="var(--icon-green)"/>',
  backup: '<path d="M6 5h10l3 3v11H6z" fill="var(--icon-cream)" stroke="var(--icon-green)" stroke-width="2"/><path d="M9 15h6M12 8v6M9 11l3 3 3-3" stroke="var(--icon-terracotta)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar: '<rect x="5" y="6" width="14" height="14" rx="3" fill="var(--icon-cream)" stroke="var(--icon-green)" stroke-width="2"/><path d="M8 4v4M16 4v4M5 10h14" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="var(--icon-green)"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="var(--icon-terracotta)" stroke-width="2" stroke-linecap="round"/>',
  search: '<circle cx="10" cy="10" r="5" fill="none" stroke="var(--icon-green)" stroke-width="2"/><path d="M14 14l5 5" stroke="var(--icon-terracotta)" stroke-width="2" stroke-linecap="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
  edit: '<path d="M5 17l1 3 3-1 9-9-4-4z" fill="var(--icon-terracotta)"/><path d="M13 7l4 4" stroke="var(--icon-cream)" stroke-width="1.5"/>',
  trash: '<path d="M7 8h10l-1 12H8z" fill="var(--icon-terracotta)"/><path d="M5 8h14M9 8V5h6v3" stroke="var(--icon-terracotta)" stroke-width="2" stroke-linecap="round"/>',
  undo: '<path d="M8 8H4V4" fill="none" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 8a8 8 0 1 1 2 8" fill="none" stroke="var(--icon-green)" stroke-width="2" stroke-linecap="round"/>',
};

export function icon(name, options = {}) {
  const size = options.size || 'normal';
  const title = options.title ? `<title>${escapeAttr(options.title)}</title>` : '';
  const extra = options.className ? ` ${escapeAttr(options.className)}` : '';
  return `<svg class="bl-icon bl-icon--${escapeAttr(size)}${extra}" viewBox="0 0 24 24" aria-hidden="${options.title ? 'false' : 'true'}" focusable="false">${title}${paths[name] || paths.plant}</svg>`;
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
