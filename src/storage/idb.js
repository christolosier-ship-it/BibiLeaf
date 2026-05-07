// src/storage/idb.js — Couche IndexedDB

const DB_NAME = 'bibileaf';
const DB_VERSION = 1;
const STORE_PLANTS = 'plants';
const STORE_SETTINGS = 'settings';

let db = null;

export function openDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_PLANTS)) {
        d.createObjectStore(STORE_PLANTS, { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains(STORE_SETTINGS)) {
        d.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return openDB().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// --- Plants ---
export const plants = {
  getAll: () => tx(STORE_PLANTS, 'readonly', s => s.getAll()),
  get: id => tx(STORE_PLANTS, 'readonly', s => s.get(id)),
  put: plant => tx(STORE_PLANTS, 'readwrite', s => s.put(plant)),
  delete: id => tx(STORE_PLANTS, 'readwrite', s => s.delete(id)),
};

// --- Settings ---
export const settings = {
  get: key => tx(STORE_SETTINGS, 'readonly', s => s.get(key)).then(r => r?.value),
  set: (key, value) => tx(STORE_SETTINGS, 'readwrite', s => s.put({ key, value })),
};
