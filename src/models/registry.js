// Registre des modèles 3D du jeu. Chaque modèle a un identifiant stable : préfixe de catégorie et trois
// chiffres, attribués dans l'ordre de l'inventaire et jamais réattribués (un modèle retiré garde son
// numéro, au statut « retire »). Chaque modèle vit dans son dossier, src/models/<catégorie>/<modèle>/
// (docs/modeles-arborescence.md) : sa fiche est l'export par défaut de son index.js, relevée par
// npm run modeles:index (index.gen.js). Jeu et catalogue construisent les modèles avec les mêmes
// constructeurs, sans copie.
//   build(params) → { object3d, anim?(dt, t) }
//   variants : [{ label, params }] ; params : { nom: 'color' | 'bool' | [min, max] | ['a', 'b'] }
//   defaults : valeurs des paramètres quand aucune variante ne les fixe
//   size : [largeur, hauteur, profondeur] en mètres (releves.gen.js, ±25 % vérifiés en test)
//   usedIn : où le jeu l'emploie ; status : 'valide' | 'a-retravailler' | 'brouillon' | 'retire'
//   source : fichier de la fiche ; budget : { triangles, lod? } quand la fiche en fixe un
import { FICHES } from './index.gen.js';
import { TAILLES, USAGE } from './releves.gen.js';
// tables du jeu : chargées pour assembler lieux et végétation seuls (kit/tables.js)
import './lieux.js';
import './vegetation.js';

export const CATEGORIES = [
  { id: 'arbres', prefix: 'ARB', label: 'Arbres' },
  { id: 'plantes', prefix: 'PLA', label: 'Plantes, fleurs et cultures' },
  { id: 'rochers', prefix: 'ROC', label: 'Rochers, bois et minerais' },
  { id: 'batiments', prefix: 'BAT', label: 'Bâtiments' },
  { id: 'ouvrages', prefix: 'STR', label: 'Ouvrages et aménagements' },
  { id: 'monuments', prefix: 'MON', label: 'Ruines et monuments' },
  { id: 'bateaux', prefix: 'NAV', label: 'Bateaux et épaves' },
  { id: 'decor', prefix: 'DEC', label: 'Décor achetable' },
  { id: 'objets', prefix: 'OBJ', label: 'Objets et petites découvertes' },
  { id: 'animaux', prefix: 'ANI', label: 'Animaux' },
  { id: 'personnage', prefix: 'PER', label: 'Personnage' },
];
export const STATUTS = { valide: 'Validé', 'a-retravailler': 'À retravailler', brouillon: 'Brouillon', retire: 'Retiré' };

// fiche de chaque dossier, complétée : nom et catégorie, taille relevée, îles qui l'emploient
const ORDRE = new Map(CATEGORIES.map((c, i) => [c.prefix, i]));
function complete(f) {
  return {
    variants: [], params: {}, defaults: {}, tags: [], status: 'valide', ...f,
    name: f.nom, category: f.categorie, size: TAILLES[f.id] || [0, 0, 0],
    usedIn: [...new Set([...(f.usedIn || []), ...(USAGE[f.ref] || [])])],
  };
}
export const MODELS = FICHES.map(complete)
  .sort((a, b) => ORDRE.get(a.id.slice(0, 3)) - ORDRE.get(b.id.slice(0, 3)) || a.id.localeCompare(b.id));

export const BY_ID = new Map(MODELS.map((m) => [m.id, m]));
export const categoryOf = (id) => CATEGORIES.find((c) => c.prefix === id.slice(0, 3));

// paramètres par défaut d'un modèle : première variante s'il y en a
export function defaultParams(m) {
  return { ...(m.variants[0]?.params || {}) };
}

// valeur affichée d'un paramètre (curseurs, couleurs, cases du catalogue)
export function paramValue(m, params, key) {
  if (params[key] !== undefined) return params[key];
  if (m.defaults?.[key] !== undefined) return m.defaults[key];
  const spec = m.params[key];
  if (spec === 'color') return '#ffffff';
  if (spec === 'bool') return false;
  if (Array.isArray(spec) && typeof spec[0] === 'string') return spec[0];
  return Array.isArray(spec) ? spec[0] : undefined;
}
