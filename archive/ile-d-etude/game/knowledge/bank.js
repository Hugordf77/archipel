// Banque de questions : un fichier JSON par domaine, chargé à la demande
// (Vite en fait des morceaux séparés : rien n'alourdit le premier chargement).
import { DOMAIN_IDS } from './domains.js';

const LOADERS = import.meta.glob('./bank/*.json', { import: 'default' });
const cache = new Map();

export function loadDomain(id) {
  if (!cache.has(id)) {
    const loader = LOADERS[`./bank/${id}.json`];
    cache.set(id, loader ? loader() : Promise.resolve([]));
  }
  return cache.get(id);
}

export async function loadDomains(ids = DOMAIN_IDS) {
  const lists = await Promise.all(ids.map(loadDomain));
  return lists.flat();
}

// nombre de questions par domaine, sans tout charger (pour l'Encyclopédie)
export const loaded = (id) => cache.has(id);
