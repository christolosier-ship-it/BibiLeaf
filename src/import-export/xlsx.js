// src/import-export/xlsx.js — Import / Export Excel

import { createPlant } from '../models/plant.js';
import { parseDate, toISO, today, diffDays } from '../utils/date.js';

const COLS = [
  'id', 'nom', 'espece', 'piece', 'photoURL',
  'freqEau', 'volumeEau', 'derniereEau',
  'engraisActif', 'freqEngrais', 'quantiteEngrais', 'dernierEngrais',
  'notes', 'profilPlante', 'healthStatus', 'soinsActifs'
];

const COL_LABELS = {
  id: 'ID',
  nom: 'Nom',
  espece: 'Espèce',
  piece: 'Pièce',
  photoURL: 'Photo URL',
  freqEau: 'Fréquence eau (jours)',
  volumeEau: 'Volume eau',
  derniereEau: 'Dernière eau (YYYY-MM-DD)',
  engraisActif: 'Engrais activé (oui/non)',
  freqEngrais: 'Fréquence engrais (jours)',
  quantiteEngrais: 'Quantité engrais',
  dernierEngrais: 'Dernier engrais (YYYY-MM-DD)',
  notes: 'Notes',
  profilPlante: 'Profil plante',
  healthStatus: 'État santé',
  soinsActifs: 'Soins actifs'
};

/** Exporte la liste des plantes en fichier XLSX */
export function exportXLSX(plants) {
  const XLSX = window.XLSX;
  const rows = [COLS.map(c => COL_LABELS[c])];

  plants.forEach(p => {
    rows.push([
      p.id,
      p.nom,
      p.espece,
      p.piece,
      '',                        // photo non exportée
      p.freqEau,
      p.volumeEau,
      p.derniereEau || '',
      p.engraisActif ? 'oui' : 'non',
      p.freqEngrais,
      p.quantiteEngrais,
      p.dernierEngrais || '',
      p.notes,
      p.profilPlante || 'custom',
      p.healthStatus || 'unknown',
      (p.careTasks || []).filter(t => t.enabled).map(t => t.type).join(', ')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BibiLeaf');
  XLSX.writeFile(wb, 'bibileaf-export.xlsx');
}

/** Importe un fichier XLSX et retourne un tableau de plantes */
export function importXLSX(file) {
  return new Promise((resolve, reject) => {
    const XLSX = window.XLSX;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Ignore la ligne d'en-tête
        const plants = rows.slice(1).filter(r => r.length > 1 && r[1]).map(r => {
          return createPlant({
            id: r[0] || undefined,
            nom: r[1] || '',
            espece: r[2] || '',
            piece: r[3] || '',
            // r[4] = photo URL ignorée
            freqEau: Number(r[5]) || 7,
            volumeEau: r[6] || '',
            derniereEau: normalizeImportedDate(r[7], XLSX),
            engraisActif: String(r[8]).toLowerCase() === 'oui',
            freqEngrais: Number(r[9]) || 30,
            quantiteEngrais: r[10] || '',
            dernierEngrais: normalizeImportedDate(r[11], XLSX),
            notes: r[12] || '',
            profilPlante: r[13] || 'custom',
            healthStatus: r[14] || 'unknown',
          });
        });
        resolve(plants);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeImportedDate(value, XLSX) {
  if (!value) return null;

  if (value instanceof Date) {
    return clampPastDate(toISO(value));
  }

  if (typeof value === 'number' && XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return clampPastDate(toISO(new Date(parsed.y, parsed.m - 1, parsed.d)));
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return parseDate(text) ? clampPastDate(text) : null;
  }

  return null;
}

/** Génère un template vide XLSX */
export function downloadTemplate() {
  const XLSX = window.XLSX;
  const rows = [COLS.map(c => COL_LABELS[c])];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BibiLeaf');
  XLSX.writeFile(wb, 'bibileaf-template.xlsx');
}

function clampPastDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return diffDays(parsed, today()) > 0 ? toISO(today()) : value;
}
