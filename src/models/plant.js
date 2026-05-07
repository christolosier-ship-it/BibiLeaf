// src/models/plant.js — Modèle de données plante

export function createPlant(data = {}) {
  return {
    id: data.id || crypto.randomUUID(),
    nom: data.nom || '',
    espece: data.espece || '',
    piece: data.piece || '',
    photo: data.photo || null,          // base64 string ou null
    freqEau: data.freqEau || 7,         // jours
    volumeEau: data.volumeEau || '',    // ex: "200ml"
    derniereEau: data.derniereEau || null, // ISO date string
    engraisActif: data.engraisActif || false,
    freqEngrais: data.freqEngrais || 30,
    quantiteEngrais: data.quantiteEngrais || '',
    dernierEngrais: data.dernierEngrais || null,
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export function duplicatePlant(plant) {
  return createPlant({
    ...plant,
    id: crypto.randomUUID(),
    nom: plant.nom + ' (copie)',
    createdAt: new Date().toISOString(),
  });
}
