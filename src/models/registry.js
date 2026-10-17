// Registre des modèles 3D du jeu. Chaque modèle a un identifiant stable : préfixe de catégorie
// et trois chiffres, attribués dans l'ordre de l'inventaire et jamais réattribués (un modèle
// retiré garde son numéro, au statut « retire »). Jeu et catalogue construisent les modèles
// avec les mêmes constructeurs (src/models/*), sans copie.
//   build(params) → { object3d, anim?(dt, t) }
//   variants : [{ label, params }] ; params : { nom: 'color' | 'bool' | [min, max] | ['a', 'b'] }
//   size : [largeur, hauteur, profondeur] en mètres (boîte englobante, ±25 % vérifiés en test)
//   usedIn : où le jeu l'emploie ; status : 'valide' | 'a-retravailler' | 'brouillon' | 'retire'
import * as THREE from 'three';
import { glowMaterial } from '../render/shaders/materials.js';
import { nextId } from '../core/globals.js';
import { mulberry32 } from '../core/random.js';
import { PAL } from './palette.js';
import { assembleKind, assemblePart, assembleBuilder, assembleCreature, assembleMesh, materiaux } from './assemble.js';
import * as ILE from './buildings/ileDepart.js';
import { buildBoat, BOATS } from './boats/bateaux.js';
import { CATALOG } from './decor/catalogue.js';
import { collectibleMesh, marineMesh } from './props/objets.js';
import { outilGeometry, crayonGeometry, flotteurGeometry, OUTILS } from './props/outils.js';
import { SPECIES } from './animals/especes.js';
import { gullGeometry, crabGeometry, butterflyGeometry, GULL_PIVOTS, CRAB_LEG_PIVOTS, BUTTERFLY_PIVOTS } from './animals/ileDepart.js';
import { buildHibou } from './animals/hibou.js';
import { buildAlbatros } from './animals/albatros.js';
import { Character } from '../entities/character/Character.js';
import { defaultAvatar, HAIRS, PIECES } from '../entities/character/avatar.js';

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
const CAT_OF = Object.fromEntries(CATEGORIES.map((c) => [c.prefix, c.id]));

const SRC = {
  veg: 'src/models/vegetation/especes.js',
  lieux: 'src/models/structures/lieux.js',
  gabarits: 'src/models/buildings/gabarits.js',
  ile: 'src/models/buildings/ileDepart.js',
  bateaux: 'src/models/boats/bateaux.js',
  decor: 'src/models/decor/catalogue.js',
  objets: 'src/models/props/objets.js',
  outils: 'src/models/props/outils.js',
  especes: 'src/models/animals/especes.js',
  faune: 'src/models/animals/ileDepart.js',
  hibou: 'src/models/animals/hibou.js',
  albatros: 'src/models/animals/albatros.js',
  perso: 'src/models/character/personnage.js',
};
const GABARITS = new Set(['phare', 'ruines', 'temple', 'grotte', 'cabane']);
const ILE_DEPART = ['île de départ'];

// --- fabriques par famille de constructeurs -------------------------------------------
const kind = (k) => ({ source: SRC.veg, ref: `kind:${k}`, build: (q = {}) => assembleKind(k, q) });
const part = (t, base = {}) => ({ source: GABARITS.has(t) ? SRC.gabarits : SRC.lieux, ref: `part:${t}`, build: (q = {}) => assemblePart({ t, ...base, ...q }) });
const ile = (name, draw, mat) => ({ source: SRC.ile, ref: `ile:${name}`, usedIn: ILE_DEPART, build: () => assembleBuilder(draw, mat) });
function boat(type) {
  return {
    source: SRC.bateaux, ref: `boat:${type}`, usedIn: ['chantier naval', 'mer'],
    build() {
      const bt = buildBoat(type);
      return {
        object3d: bt.group,
        anim: (dt, t) => {
          bt.body.rotation.z = Math.sin(t * 1.3) * 0.04;
          bt.body.rotation.x = Math.sin(t * 0.9) * 0.025;
          for (const s of [bt.sail || []].flat()) s.rotation.y = Math.sin(t * 0.5) * 0.15;
        },
      };
    },
  };
}
function decor(k) {
  return {
    source: SRC.decor, ref: `decor:${k}`, usedIn: ['échoppe de l\'île de départ'],
    build() {
      const o = CATALOG[k].build();
      return { object3d: o, anim: o.userData.anim ? (dt, t) => o.userData.anim(dt, t) : undefined };
    },
  };
}
const collect = (k) => ({ source: SRC.objets, ref: `collect:${k}`, usedIn: ['plages de l\'île de départ'], params: { v: [0, 5] }, build: ({ v = 0 } = {}) => assembleMesh(collectibleMesh(k, mulberry32(7 + v))) });
const marine = (t) => ({ source: SRC.objets, ref: `marine:${t}`, usedIn: ['mer'], params: { v: [0, 5] }, build: ({ v = 0 } = {}) => assembleMesh(marineMesh(t, mulberry32(11 + v))) });
function species(sp) {
  return {
    source: SRC.especes, ref: `species:${sp}`, tags: ['animé'],
    build() {
      const d = SPECIES[sp];
      if (d.insect === 'glow') {
        // insecte lumineux : simple halo qui pulse (comme en jeu, la nuit)
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(...d.glow));
        m.renderOrder = 10;
        m.scale.setScalar(0.3);
        return { object3d: m, anim: (dt, t) => m.scale.setScalar(0.25 + 0.15 * Math.sin(t * 3)) };
      }
      return assembleCreature(d.parts(), { scale: d.scale || 1, pace: Math.max(0.4, d.speed || 1) });
    },
  };
}
// animaux de l'île de départ : corps + pièces mobiles aux pivots du jeu
function homeCreature(name, geos, pivots, matKey, anim, scale = 1) {
  return {
    source: SRC.faune, ref: `faune:${name}`, usedIn: ILE_DEPART, tags: ['animé'],
    build() {
      const [body, ...rest] = geos(nextId());
      const parts = [{ geo: body, pivot: [0, 0, 0] }];
      pivots.forEach((pv, i) => parts.push({ geo: rest[Math.floor((i * rest.length) / pivots.length)], pivot: pv, anim, side: i < pivots.length / 2 ? -1 : 1, phase: i * 1.7 }));
      return assembleCreature(parts, { mat: materiaux()[matKey], scale });
    },
  };
}
function perso(over = {}, ref = 'avatar') {
  return {
    source: SRC.perso, ref, usedIn: ['personnage joueur'], tags: ['animé'],
    params: { skin: [0, 5], hairColor: [0, 7] },
    build(q = {}) {
      const c = new Character({ ...defaultAvatar(), ...over, ...q });
      return { object3d: c.root, anim: (dt) => c.update(dt, 0) };
    },
  };
}
const outil = (o) => ({ source: SRC.outils, ref: o.ref, usedIn: ['main du personnage'], build: o.build });

// entrée : id, slug, nom, constructeur, compléments (variantes, paramètres, usage, étiquettes…)
function M(id, slug, name, src, more = {}) {
  return {
    id, slug, name, category: CAT_OF[id.slice(0, 3)],
    variants: [], params: {}, size: TAILLES[id] || [0, 0, 0], usedIn: [], tags: [], status: 'valide',
    ...src, ...more,
    tags: [...(src.tags || []), ...(more.tags || [])],
  };
}
// boîtes englobantes relevées (m) : npm run modeles:tailles les régénère après un changement voulu
// <tailles>
const TAILLES = {
  'ARB-001': [1.96, 3.88, 2.16],
  'ARB-002': [2.68, 3.68, 2.5],
  'ARB-003': [2.28, 3.87, 2.44],
  'ARB-004': [1.94, 4.01, 2.07],
  'ARB-005': [2.18, 4.02, 1.91],
  'ARB-006': [1.9, 4.11, 1.79],
  'ARB-007': [4.74, 4.5, 4.86],
  'ARB-008': [1.62, 4.31, 1.34],
  'ARB-009': [3.68, 3.59, 3.81],
  'ARB-010': [2.6, 4.14, 2.25],
  'ARB-011': [1.25, 4.63, 1.4],
  'ARB-012': [3.06, 2.74, 3.06],
  'ARB-013': [3.2, 3.33, 3.17],
  'ARB-014': [6.93, 8.66, 6.93],
  'ARB-015': [13.17, 16.45, 13.03],
  'PLA-001': [1.57, 0.87, 1.14],
  'PLA-002': [1.66, 0.91, 1.64],
  'PLA-003': [1.39, 0.93, 1.35],
  'PLA-004': [1.18, 2.07, 0.6],
  'PLA-005': [0.89, 2.07, 0.56],
  'PLA-006': [1.61, 0.52, 1.4],
  'PLA-007': [0.61, 0.68, 0.61],
  'PLA-008': [0.6, 1.91, 0.28],
  'PLA-009': [0.19, 1.02, 0.21],
  'PLA-010': [0.38, 1.4, 0.4],
  'PLA-011': [1.21, 0.17, 0.88],
  'PLA-012': [0.88, 0.47, 0.59],
  'PLA-013': [0.75, 0.43, 0.56],
  'PLA-014': [0.66, 0.48, 0.71],
  'PLA-015': [0.18, 0.41, 0.17],
  'PLA-016': [0.39, 0.36, 0.33],
  'PLA-017': [1.94, 2.6, 1.81],
  'PLA-018': [1.29, 1.25, 1.22],
  'PLA-019': [0.71, 3.66, 2.82],
  'ROC-001': [1.89, 1.02, 1.43],
  'ROC-002': [1.5, 1.17, 1.46],
  'ROC-003': [1.03, 1.48, 0.85],
  'ROC-004': [1.79, 1.23, 1.56],
  'ROC-005': [1.79, 1.23, 1.56],
  'ROC-006': [1.2, 0.99, 0.96],
  'ROC-007': [0.86, 0.44, 0.88],
  'ROC-008': [1.15, 1.84, 0.37],
  'ROC-009': [0.88, 0.54, 1.2],
  'ROC-010': [2.02, 0.57, 0.6],
  'BAT-001': [3.8, 3.82, 3.41],
  'BAT-002': [5.77, 5.22, 5.85],
  'BAT-003': [8.05, 6.31, 7.91],
  'BAT-004': [7.66, 10.43, 4.6],
  'BAT-005': [4.2, 3.81, 3.2],
  'BAT-006': [6.35, 10.76, 4.8],
  'BAT-007': [3.39, 10.26, 3.54],
  'BAT-008': [7, 5.5, 7],
  'BAT-009': [2.8, 3.37, 3.09],
  'BAT-010': [4.73, 5.46, 4.8],
  'BAT-011': [2, 2.21, 1.11],
  'BAT-012': [1.62, 3.2, 3.43],
  'STR-001': [2.35, 3.6, 12],
  'STR-002': [2.9, 3.54, 11.18],
  'STR-003': [5.1, 0.87, 1.82],
  'STR-004': [12.38, 2.04, 1.76],
  'STR-005': [3.08, 1.73, 1.6],
  'STR-006': [1.85, 2.55, 1.9],
  'STR-007': [16.12, 0.8, 10.14],
  'STR-008': [2.4, 0.46, 1.4],
  'STR-009': [1.4, 2.38, 0.84],
  'STR-010': [3.24, 1.85, 3.2],
  'STR-011': [3.92, 12.64, 11.27],
  'STR-012': [2.52, 3.66, 0.42],
  'STR-013': [1.49, 2, 0.99],
  'STR-014': [4.09, 2, 0.1],
  'STR-015': [0.62, 2.2, 0.4],
  'STR-016': [0.68, 1.77, 0.68],
  'STR-017': [1.6, 0.93, 0.45],
  'STR-018': [1.6, 0.93, 0.45],
  'STR-019': [2.28, 0.49, 0.8],
  'STR-020': [3.02, 2.39, 2.6],
  'STR-021': [4.06, 1.42, 3.06],
  'STR-022': [5.1, 1, 1.54],
  'STR-023': [3.65, 1.35, 1.22],
  'STR-024': [1.53, 1.7, 0.83],
  'STR-025': [1.43, 0.88, 1.07],
  'STR-026': [0.53, 2.14, 0.56],
  'STR-027': [7.89, 1.33, 8.12],
  'MON-001': [7, 3.33, 5.5],
  'MON-002': [9.6, 6.83, 7.8],
  'MON-003': [7.77, 5.48, 4.82],
  'MON-004': [8.73, 2.73, 8.8],
  'MON-005': [3.2, 5.1, 3.2],
  'MON-006': [1.68, 2.15, 0.71],
  'MON-007': [1.2, 1.06, 0.7],
  'MON-008': [0.63, 1.52, 0.62],
  'NAV-001': [2.14, 2.39, 4.1],
  'NAV-002': [4.8, 1.1, 4.45],
  'NAV-003': [2.01, 6.35, 5.72],
  'NAV-004': [2.76, 7.95, 8.72],
  'NAV-005': [1.5, 0.84, 3.8],
  'NAV-006': [1.71, 0.95, 3.8],
  'NAV-007': [6.56, 5.84, 14],
  'NAV-008': [6.56, 5.84, 15],
  'NAV-009': [1.36, 0.14, 1.88],
  'NAV-010': [0.4, 0.59, 0.4],
  'NAV-011': [0.94, 0.37, 0.92],
  'DEC-001': [1.52, 0.14, 0.9],
  'DEC-002': [0.58, 0.62, 0.58],
  'DEC-003': [1.56, 0.88, 0.16],
  'DEC-004': [1, 1.62, 0.39],
  'DEC-005': [1, 1, 0.68],
  'DEC-006': [0.42, 1.99, 0.47],
  'DEC-007': [1.4, 0.89, 0.48],
  'DEC-008': [2.32, 1.7, 0.12],
  'DEC-009': [2.58, 1.5, 0.7],
  'DEC-010': [0.54, 1.39, 0.81],
  'DEC-011': [1.59, 2.3, 1],
  'DEC-012': [1.74, 2.68, 0.35],
  'DEC-013': [0.7, 1.49, 0.7],
  'DEC-014': [1.35, 1.15, 0.72],
  'DEC-015': [1.26, 1.1, 1.37],
  'DEC-016': [1.2, 1.17, 0.68],
  'DEC-017': [1.8, 1.37, 0.82],
  'DEC-018': [2, 1.37, 2],
  'OBJ-001': [0.84, 0.73, 0.59],
  'OBJ-002': [0.84, 0.73, 0.59],
  'OBJ-003': [2.11, 0.8, 0.99],
  'OBJ-004': [2.81, 1.29, 1.34],
  'OBJ-005': [1.8, 0.96, 1.87],
  'OBJ-006': [2.76, 2.4, 2.76],
  'OBJ-007': [0.68, 1.61, 0.68],
  'OBJ-008': [0.94, 0.25, 0.92],
  'OBJ-009': [2.44, 0.35, 2.47],
  'OBJ-010': [2.59, 1.2, 2.53],
  'OBJ-011': [0.48, 0.59, 0.47],
  'OBJ-012': [0.25, 0.07, 0.25],
  'OBJ-013': [0.39, 0.07, 0.37],
  'OBJ-014': [0.24, 0.25, 0.24],
  'OBJ-015': [0.24, 0.15, 0.24],
  'OBJ-016': [0.17, 0.06, 0.14],
  'OBJ-017': [0.26, 0.42, 0.16],
  'OBJ-018': [0.38, 0.26, 0.33],
  'OBJ-019': [0.3, 1, 0.31],
  'OBJ-020': [0.18, 0.27, 0.17],
  'OBJ-021': [1.11, 0.56, 0.96],
  'OBJ-022': [0.76, 0.07, 0.24],
  'OBJ-023': [0.51, 2.4, 0.51],
  'ANI-001': [0.92, 1.1, 1.37],
  'ANI-002': [0.49, 1.08, 1.18],
  'ANI-003': [1.1, 1.59, 2.38],
  'ANI-004': [0.73, 2.19, 1.81],
  'ANI-005': [0.34, 0.63, 1.36],
  'ANI-006': [0.25, 0.45, 0.49],
  'ANI-007': [0.31, 0.27, 0.5],
  'ANI-008': [0.17, 0.42, 0.35],
  'ANI-009': [0.63, 0.34, 0.88],
  'ANI-010': [0.46, 0.2, 0.25],
  'ANI-011': [1.87, 0.37, 0.92],
  'ANI-012': [1.46, 0.29, 0.72],
  'ANI-013': [0.49, 2.08, 0.94],
  'ANI-014': [0.29, 0.35, 0.5],
  'ANI-015': [0.24, 0.17, 0.22],
  'ANI-016': [0.18, 0.24, 0.5],
  'ANI-017': [0.33, 0.03, 0.17],
  'ANI-018': [0.17, 0.11, 0.11],
  'ANI-019': [0.3, 0.3, 0],
  'ANI-020': [0.72, 0.74, 1.88],
  'ANI-021': [0.41, 0.83, 0.39],
  'ANI-022': [0.25, 0.1, 0.74],
  'ANI-023': [0.32, 0.61, 0.83],
  'ANI-024': [2.28, 0.41, 1.05],
  'ANI-025': [0.66, 0.3, 0.4],
  'ANI-026': [0.46, 0.04, 0.28],
  'ANI-027': [0.72, 0.93, 0.59],
  'ANI-028': [7.5, 1.48, 4.38],
  'PER-001': [0.67, 1.48, 0.69],
  'PER-002': [0.71, 1.54, 0.69],
  'PER-003': [0.67, 1.48, 0.69],
  'PER-004': [0.65, 1.46, 0.75],
  'PER-005': [0.72, 1.5, 0.69],
  'PER-006': [0.91, 1.52, 0.88],
  'PER-007': [0.74, 1.48, 0.69],
  'PER-008': [0.67, 1.48, 0.69],
  'PER-009': [0.67, 1.48, 0.69],
  'PER-010': [0.67, 1.48, 0.69],
  'PER-011': [0.67, 1.48, 0.69],
  'PER-012': [0.67, 1.48, 0.69],
  'PER-013': [0.67, 1.48, 0.69],
  'PER-014': [0.67, 1.48, 0.69],
  'PER-015': [0.67, 1.48, 0.69],
  'PER-016': [0.67, 1.48, 0.69],
  'PER-017': [0.67, 1.48, 0.69],
  'PER-018': [0.67, 1.49, 0.69],
  'PER-019': [0.67, 1.48, 0.69],
  'PER-020': [0.79, 1.51, 0.77],
  'PER-021': [0.67, 1.48, 0.69],
  'PER-022': [0.67, 1.48, 0.72],
  'PER-023': [0.67, 1.48, 0.69],
  'PER-024': [0.02, 0.16, 0.02],
  'PER-025': [0.03, 0.53, 0.16],
};
// </tailles>

const v3 = (labels, key = 'v') => labels.map((label, i) => ({ label, params: { [key]: i } }));
const SAME = (other) => ({ tags: [`même modèle que ${other}`] });

export const MODELS = [
  // --- ARB : arbres -----------------------------------------------------------------
  M('ARB-001', 'arbre-pompon', 'Arbre pompon', kind('arbre_pompon'), { tags: ['abattable'] }),
  M('ARB-002', 'arbre-fruitier', 'Arbre fruitier', kind('arbre_fruitier'), { tags: ['abattable', 'fruits'] }),
  M('ARB-003', 'cerisier', 'Cerisier', kind('arbre_cerisier'), { tags: ['abattable', 'fleuri'] }),
  M('ARB-004', 'pin', 'Pin', kind('pin'), { tags: ['abattable'] }),
  M('ARB-005', 'pin-givre', 'Pin givré', kind('pin_givre'), { tags: ['abattable', 'glace'] }),
  M('ARB-006', 'sapin-enneige', 'Sapin enneigé', kind('sapin_neige'), { tags: ['abattable', 'glace'] }),
  M('ARB-007', 'palmier', 'Palmier', kind('palmier'), { tags: ['abattable', 'tropical'] }),
  M('ARB-008', 'bouleau', 'Bouleau', kind('bouleau'), { tags: ['abattable'] }),
  M('ARB-009', 'saule', 'Saule', kind('saule'), { tags: ['abattable', 'bord de l\'eau'] }),
  M('ARB-010', 'erable', 'Érable', kind('erable'), { tags: ['abattable', 'automne'] }),
  M('ARB-011', 'bambou', 'Bambou', kind('bambou'), { tags: ['abattable'] }),
  M('ARB-012', 'fougere-arborescente', 'Fougère arborescente', kind('fougere_arbo'), { tags: ['tropical'] }),
  M('ARB-013', 'champignon-geant', 'Champignon géant', kind('champi_geant'), { params: { v: [0, 4] }, variants: v3(['Rose', 'Pêche', 'Lilas', 'Menthe', 'Beurre']) }),
  M('ARB-014', 'grand-arbre', 'Grand arbre de l\'île de départ', ile('grandArbre', (b) => ILE.grandArbreClumps(ILE.grandArbre(b, 0, 0, 0))), { tags: ['repère'] }),
  M('ARB-015', 'arbre-geant', 'Arbre géant (lieu)', part('arbre_geant'), {
    variants: [{ label: 'Chêne', params: { kind: 'chene' } }, { label: 'Sapin', params: { kind: 'sapin' } }, { label: 'Champignon', params: { kind: 'champi' } }],
    params: { kind: ['chene', 'sapin', 'champi'] }, tags: ['repère'],
  }),

  // --- PLA : plantes, fleurs et cultures ------------------------------------------------
  M('PLA-001', 'arbuste', 'Arbuste', kind('arbuste')),
  M('PLA-002', 'buisson-baies', 'Buisson à baies', kind('buisson_baies'), { tags: ['récolte'] }),
  M('PLA-003', 'buisson-fleuri', 'Buisson fleuri', kind('buisson_fleuri')),
  M('PLA-004', 'cactus', 'Cactus', kind('cactus'), { tags: ['dunes'] }),
  M('PLA-005', 'cactus-fleuri', 'Cactus fleuri', kind('cactus_fleur'), { tags: ['dunes'] }),
  M('PLA-006', 'fougere', 'Fougère', kind('fougere')),
  M('PLA-007', 'lavande', 'Lavande', kind('lavande'), { tags: ['champs'] }),
  M('PLA-008', 'tournesol', 'Tournesol', kind('tournesol'), { tags: ['champs'] }),
  M('PLA-009', 'ble', 'Blé', kind('ble'), { tags: ['champs', 'récolte'] }),
  M('PLA-010', 'roseau', 'Roseau', kind('roseau'), { tags: ['bord de l\'eau'] }),
  M('PLA-011', 'nenuphar', 'Nénuphar', kind('nenuphar'), { tags: ['bord de l\'eau'] }),
  M('PLA-012', 'potiron', 'Potiron', kind('potiron'), { tags: ['récolte'] }),
  M('PLA-013', 'petit-champignon', 'Petit champignon', kind('champi_petit'), { params: { v: [0, 4] }, tags: ['récolte'] }),
  M('PLA-014', 'massif-fleurs', 'Massif de fleurs', kind('fleurs'), { params: { fleur: 'color' }, tags: ['teinté par instance'] }),
  M('PLA-015', 'fleur-des-champs', 'Fleur des champs', kind('fleur_champ'), { params: { fleur: 'color' }, tags: ['teinté par instance'] }),
  M('PLA-016', 'herbe', 'Herbe', kind('herbe'), { tags: ['tuiles'] }),
  M('PLA-017', 'fleur-geante', 'Fleur géante', part('fleur_geante'), { tags: ['curiosité'] }),
  M('PLA-018', 'lavande-geante', 'Lavande géante (rareté)', ile('lavandeGeante', (b) => ILE.lavandeGeante(b, 0, 0, 0), 'lavender'), { tags: ['rareté', '10 h d\'étude'] }),
  M('PLA-019', 'arche-glycine', 'Arche de glycine (rareté)', ile('archeGlycine', (b) => ILE.archeGlycine(b, 0, 0, 0), 'wisteria'), { tags: ['rareté', '25 h d\'étude'] }),

  // --- ROC : rochers, bois et minerais --------------------------------------------------
  M('ROC-001', 'rocher', 'Rocher', kind('rocher'), { params: { roche: 'color' }, tags: ['minable'] }),
  M('ROC-002', 'rocher-moussu', 'Rocher moussu', kind('rocher_mousse'), { params: { roche: 'color' }, tags: ['minable'] }),
  M('ROC-003', 'cristal', 'Cristal', kind('cristal'), { tags: ['minable', 'lumineux'] }),
  M('ROC-004', 'filon-cuivre', 'Filon de cuivre', kind('filon_cuivre'), { params: { roche: 'color' }, tags: ['minable'] }),
  M('ROC-005', 'filon-fer', 'Filon de fer', kind('filon_fer'), { params: { roche: 'color' }, tags: ['minable'] }),
  M('ROC-006', 'obsidienne', 'Obsidienne', kind('obsidienne'), { params: { roche: 'color' }, tags: ['minable', 'cratère'] }),
  M('ROC-007', 'souche', 'Souche', kind('souche'), { tags: ['bois'] }),
  M('ROC-008', 'bois-mort', 'Bois mort', kind('bois_mort'), { tags: ['bois'] }),
  M('ROC-009', 'pile-bois', 'Pile de bois', part('bois_pile'), { tags: ['bois'] }),
  M('ROC-010', 'rondin', 'Rondin', part('rondin'), { tags: ['bois', 'assise'] }),

  // --- BAT : bâtiments ------------------------------------------------------------------
  M('BAT-001', 'maison-village', 'Maison de village', part('maison', { roof: '#f19b86', wall: '#fbf3e6' }), {
    variants: [...v3(['Petite', 'Moyenne', 'Grande']), { label: 'Marchand', params: { v: 1, merchant: true } }],
    params: { v: [0, 2], roof: 'color', wall: 'color', merchant: 'bool' }, tags: ['village', 'teinté'],
  }),
  M('BAT-002', 'chaumiere', 'Chaumière du joueur', ile('chaumiere', (b, glass) => ILE.chaumiere(b, glass, 0, 0, 0)), { tags: ['maison'] }),
  M('BAT-003', 'bibliotheque-souche', 'Bibliothèque-souche du hibou', ile('bibliotheque', (b, glass) => ILE.bibliotheque(b, glass, 0, 0, 0)), { tags: ['hibou'] }),
  M('BAT-004', 'moulin', 'Moulin à vent', part('moulin', { color: '#f19b86', wall: '#fbf3e6' }), { params: { color: 'color', wall: 'color' }, tags: ['village', 'animé', 'teinté'] }),
  M('BAT-005', 'moulin-eau', 'Moulin à eau', part('moulin_eau'), { tags: ['village', 'animé', 'rivière'] }),
  M('BAT-006', 'phare', 'Phare', part('phare'), { tags: ['falaises', 'lumineux'] }),
  M('BAT-007', 'tour-guet', 'Tour de guet', part('tour_guet'), {
    variants: [{ label: 'Bois', params: { stone: false } }, { label: 'Pierre', params: { stone: true } }], params: { stone: 'bool' },
  }),
  M('BAT-008', 'temple', 'Temple', part('temple')),
  M('BAT-009', 'cabane-ermite', 'Cabane d\'ermite', part('cabane')),
  M('BAT-010', 'observatoire', 'Observatoire', part('observatoire'), { tags: ['montagne'] }),
  M('BAT-011', 'etal-marche', 'Étal du marché', part('etal'), { variants: v3(['Corail', 'Menthe', 'Beurre']), params: { v: [0, 2] }, tags: ['village'] }),
  M('BAT-012', 'echoppe', 'Échoppe', ile('echoppe', (b) => ILE.echoppe(b, 0, 0, 0)), { tags: ['commerce'] }),

  // --- STR : ouvrages et aménagements ---------------------------------------------------
  M('STR-001', 'jetee', 'Jetée', part('jetee'), { params: { len: [6, 20] }, tags: ['village', 'accostage'] }),
  M('STR-002', 'ponton', 'Ponton', ile('ponton', (b) => ILE.ponton(b, { x: 0, z0: -5.5, z1: 5.5, w: 2.4, h: 0.86 })), { tags: ['accostage'] }),
  M('STR-003', 'pont', 'Pont', part('pont'), { params: { len: [3, 10] }, tags: ['chemins'] }),
  M('STR-004', 'pont-corde', 'Pont de corde', part('pont_corde', { x1: 12, z1: 0, y: 0, y1: 0 }), { params: { x1: [6, 20], y1: [-3, 3] }, tags: ['chemins'] }),
  M('STR-005', 'escalier', 'Escalier', part('escalier'), { params: { len: [2, 6], rise: [0.5, 3] }, tags: ['chemins'] }),
  M('STR-006', 'puits', 'Puits', part('puits'), { tags: ['village'] }),
  M('STR-007', 'cloture-champ', 'Clôture de champ', part('cloture_champ'), { params: { w: [6, 24], d: [4, 16] }, tags: ['champs'] }),
  M('STR-008', 'potager', 'Potager', part('potager'), { tags: ['village'] }),
  M('STR-009', 'epouvantail', 'Épouvantail', part('epouvantail'), { tags: ['champs'] }),
  M('STR-010', 'bassin-chaud', 'Bassin chaud', part('bassin_chaud'), { params: { size: [0.6, 1.6] }, tags: ['cratère'] }),
  M('STR-011', 'arche', 'Arche', part('arche'), { params: { size: [0.8, 2] } }),
  M('STR-012', 'arche-fleurie', 'Arche fleurie', part('arche_fleurie'), { tags: ['champs'] }),
  M('STR-013', 'panneau', 'Panneau', part('panneau'), { tags: ['chemins'] }),
  M('STR-014', 'corde-linge', 'Corde à linge', part('linge'), { params: { len: [2, 8] }, tags: ['village'] }),
  M('STR-015', 'lanterne', 'Lanterne', part('lanterne'), { tags: ['lumineux'] }),
  M('STR-016', 'lanterne-pierre', 'Lanterne de pierre', part('lanterne_pierre'), { tags: ['curiosité', 'lumineux'] }),
  M('STR-017', 'banc', 'Banc', part('banc'), { tags: ['assise'] }),
  M('STR-018', 'banc-vue', 'Banc avec vue', part('banc_vue'), { ...SAME('STR-017'), tags: ['assise', 'curiosité'] }),
  M('STR-019', 'casiers', 'Casiers', part('casiers'), { tags: ['village', 'pêche'] }),
  M('STR-020', 'parasol-transats', 'Parasol et transats', ile('parasol', (b) => {
    ILE.parasolPlage(b, 0, 0, 0);
    ILE.transat(b, -1.2, 0, 0.8, PAL.mint);
    ILE.transat(b, 1.2, 0, 0.6, PAL.sky);
  }), { tags: ['plage'] }),
  M('STR-021', 'bureau-etude', 'Bureau d\'étude', ile('bureauEtude', (b, glass) => ILE.bureauEtude(b, glass, 0, 0, 0)), { tags: ['étude', 'lumineux'] }),
  // compléments de l'inventaire (relevés dans le code)
  M('STR-022', 'pont-riviere', 'Pont de la rivière', ile('pontRiviere', (b) => ILE.pontRiviere(b, -2.4, 2.4, 0, 0)), { tags: ['chemins'] }),
  M('STR-023', 'pupitre-hibou', 'Pupitre et perchoir du hibou', ile('pupitreHibou', (b) => ILE.pupitreHibou(b, { x: 0, z: 0 }, 0)), { tags: ['hibou'] }),
  M('STR-024', 'panneau-place', 'Panneau de la place', ile('panneauPlace', (b) => ILE.panneauPlace(b, 0, 0, 0)), { tags: ['chemins'] }),
  M('STR-025', 'banc-bois', 'Banc de bois', ile('bancBois', (b) => ILE.bancBois(b, 0, 0, 0)), { tags: ['assise'] }),
  M('STR-026', 'lanterne-jardin', 'Lanterne de jardin', ile('lanterneJardin', (b, glass) => ILE.lanterneJardin(b, glass, 0, 0, 0)), { tags: ['lumineux'] }),
  M('STR-027', 'cascade', 'Cascade', part('cascade'), { params: { w: [1, 6] }, tags: ['rivière', 'animé'] }),

  // --- MON : ruines et monuments --------------------------------------------------------
  M('MON-001', 'ruines', 'Ruines', part('ruines')),
  M('MON-002', 'ruines-ensablees', 'Ruines ensablées', part('ruines', { sand: true }), { tags: ['dunes'] }),
  M('MON-003', 'grotte', 'Grotte', part('grotte'), { tags: ['falaises'] }),
  M('MON-004', 'cercle-pierres', 'Cercle de pierres', part('cercle_pierres'), { params: { count: [5, 12] } }),
  M('MON-005', 'statue-geante', 'Statue géante', part('statue'), { tags: ['repère'] }),
  M('MON-006', 'totem', 'Totem', part('totem'), { tags: ['curiosité'] }),
  M('MON-007', 'autel', 'Autel', part('autel'), { tags: ['curiosité'] }),
  M('MON-008', 'cairn', 'Cairn', part('cairn'), { tags: ['curiosité'] }),

  // --- NAV : bateaux et épaves ----------------------------------------------------------
  M('NAV-001', 'radeau', BOATS.radeau.name, boat('radeau'), { tags: ['monture', 'animé'] }),
  M('NAV-002', 'barque', BOATS.barque.name, boat('barque'), { tags: ['monture', 'animé'] }),
  M('NAV-003', 'voilier', BOATS.voilier.name, boat('voilier'), { tags: ['monture', 'animé'] }),
  M('NAV-004', 'goelette', BOATS.goelette.name, boat('goelette'), { tags: ['monture', 'animé'] }),
  M('NAV-005', 'barque-amarree', 'Barque amarrée', part('barque_amarree'), { variants: v3(['Corail', 'Menthe', 'Ciel']), params: { v: [0, 3] }, tags: ['village'] }),
  M('NAV-006', 'barque-echouee', 'Barque échouée', part('barque_echouee'), { params: { v: [0, 2] }, tags: ['épave'] }),
  M('NAV-007', 'epave', 'Épave', part('epave'), { params: { len: [8, 20], sunk: 'bool' }, tags: ['épave'] }),
  M('NAV-008', 'grande-epave', 'Grande épave', part('epave_geante'), { tags: ['épave', 'repère'] }),
  M('NAV-009', 'ancre', 'Ancre', part('ancre'), { tags: ['curiosité'] }),
  M('NAV-010', 'bouee', 'Bouée', marine('bouee'), { tags: ['flotte'] }),
  M('NAV-011', 'bouee-echouee', 'Bouée échouée', part('bouee_echouee'), { tags: ['curiosité'] }),

  // --- DEC : décor achetable --------------------------------------------------------------
  ...['pierre', 'pot', 'cloture', 'lanterne', 'champi', 'nichoir', 'banc', 'fanions', 'hamac', 'telescope', 'moulin', 'arche', 'statue', 'etabli', 'four', 'couture', 'chantier', 'fontaine']
    .map((k, i) => M(`DEC-${String(i + 1).padStart(3, '0')}`, `decor-${k}`, CATALOG[k].name, decor(k), { tags: [CATALOG[k].station ? 'atelier' : 'décor', `${CATALOG[k].price} coquillages`] })),

  // --- OBJ : objets et petites découvertes ----------------------------------------------
  M('OBJ-001', 'coffre', 'Coffre', part('coffre'), { tags: ['trésor'] }),
  M('OBJ-002', 'coffre-cache', 'Coffre caché', part('coffre_cache'), { ...SAME('OBJ-001'), tags: ['trésor', 'curiosité'] }),
  M('OBJ-003', 'tonneaux', 'Tonneaux', part('tonneaux'), { tags: ['curiosité'] }),
  M('OBJ-004', 'charrette', 'Charrette', part('charrette'), { tags: ['curiosité'] }),
  M('OBJ-005', 'feu-camp', 'Feu de camp', part('feu_camp'), { tags: ['lumineux'] }),
  M('OBJ-006', 'tente', 'Tente', part('tente'), { variants: v3(['Corail', 'Menthe']), params: { v: [0, 1] } }),
  M('OBJ-007', 'ruche', 'Ruche', part('ruche'), { tags: ['champs'] }),
  M('OBJ-008', 'nid', 'Nid', part('nid'), { tags: ['curiosité'] }),
  M('OBJ-009', 'cercle-champignons', 'Cercle de champignons', part('cercle_champi'), { tags: ['curiosité'] }),
  M('OBJ-010', 'recif', 'Récif', part('recif'), { params: { size: [0.6, 2] }, tags: ['lagon'] }),
  M('OBJ-011', 'corail', 'Corail', kind('corail'), { tags: ['lagon'] }),
  M('OBJ-012', 'coquillage', 'Coquillage', collect('coquillage'), { tags: ['trésor du jour'] }),
  M('OBJ-013', 'etoile-mer', 'Étoile de mer', collect('etoile'), { tags: ['trésor du jour'] }),
  M('OBJ-014', 'peche', 'Pêche', collect('peche'), { tags: ['trésor du jour'] }),
  M('OBJ-015', 'perle', 'Perle', collect('perle'), { tags: ['trésor du jour'] }),
  M('OBJ-016', 'verre-poli', 'Verre poli', collect('verre'), { tags: ['trésor du jour'] }),
  M('OBJ-017', 'bouteille-mer', 'Bouteille à la mer', marine('bouteille'), { tags: ['flotte'] }),
  M('OBJ-018', 'caisse-flottante', 'Caisse flottante', marine('caisse'), { tags: ['flotte'] }),
  M('OBJ-019', 'algue', 'Algue', marine('algue'), { tags: ['sous l\'eau'] }),
  M('OBJ-020', 'flotteur-peche', 'Flotteur de pêche', outil({ ref: 'flotteur', build: () => assembleMesh(flotteurGeometry(), 'bobber') }), { usedIn: ['pêche'] }),
  // compléments de l'inventaire
  M('OBJ-021', 'recif-marin', 'Récif marin', marine('recif'), { tags: ['sous l\'eau'] }),
  M('OBJ-022', 'banc-poissons', 'Banc de poissons', marine('poissons'), { tags: ['pêche'] }),
  M('OBJ-023', 'nichoir-lieu', 'Nichoir (lieu)', part('nichoir'), { tags: ['curiosité'] }),

  // --- ANI : animaux --------------------------------------------------------------------
  ...[['mouton', 'Mouton'], ['chevre', 'Chèvre'], ['vache', 'Vache'], ['cerf', 'Cerf'], ['renard', 'Renard'], ['lapin', 'Lapin'],
    ['herisson', 'Hérisson'], ['ecureuil', 'Écureuil'], ['tortue', 'Tortue'], ['crabe', 'Crabe'], ['mouette', 'Mouette'], ['perroquet', 'Perroquet'],
    ['flamant', 'Flamant rose'], ['canard', 'Canard'], ['grenouille', 'Grenouille'], ['poisson', 'Poisson'], ['papillon', 'Papillon'], ['abeille', 'Abeille'],
    ['luciole', 'Luciole'], ['phoque', 'Phoque'], ['pingouin', 'Pingouin'], ['lezard', 'Lézard'], ['escargot', 'Escargot géant']]
    .map(([sp, name], i) => M(`ANI-${String(i + 1).padStart(3, '0')}`, sp, name, species(sp))),
  M('ANI-024', 'mouette-depart', 'Mouette (île de départ)', homeCreature('mouette', gullGeometry, GULL_PIVOTS, 'gull', 'wing')),
  M('ANI-025', 'crabe-depart', 'Crabe (île de départ)', homeCreature('crabe', crabGeometry, CRAB_LEG_PIVOTS, 'crab', 'leg', 0.85)),
  M('ANI-026', 'papillon-depart', 'Papillon (île de départ)', homeCreature('papillon', butterflyGeometry, BUTTERFLY_PIVOTS, 'butterfly', 'wing')),
  M('ANI-027', 'hibou', 'Hibou cartographe', {
    source: SRC.hibou, ref: 'hibou', usedIn: ILE_DEPART, tags: ['animé', 'personnage'],
    build() {
      const h = buildHibou();
      return {
        object3d: h.root,
        anim: (dt, t) => {
          h.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.max(0, Math.sin(t * 2)) * 0.3; });
          h.head.rotation.y = Math.sin(t * 0.7) * 0.5;
        },
      };
    },
  }),
  M('ANI-028', 'albatros', 'Grand albatros (monture)', {
    source: SRC.albatros, ref: 'albatros', usedIn: ['vol'], tags: ['animé', 'monture'],
    build() {
      const r = buildAlbatros();
      return {
        object3d: r,
        anim: (dt, t) => {
          const f = Math.sin(t * 3) * 0.45;
          r.userData.wings[0].rotation.z = f;
          r.userData.wings[1].rotation.z = -f;
        },
      };
    },
  }),

  // --- PER : personnage -----------------------------------------------------------------
  M('PER-001', 'corps-visage', 'Corps et visage', perso({}, 'avatar'), {
    variants: [{ label: 'Yeux ovales', params: { eyes: 'ovale' } }, { label: 'Yeux ronds', params: { eyes: 'rond' } }, { label: 'Yeux en amande', params: { eyes: 'amande' } }],
    tags: ['atlas d\'expressions'],
  }),
  ...['bol', 'carre', 'queue', 'macarons', 'boucles', 'longs'].map((k, i) => M(`PER-${String(i + 2).padStart(3, '0')}`, `coupe-${k}`, `Coupe : ${HAIRS[k]}`, perso({ hair: k }, `hair:${k}`), { tags: ['coupe'] })),
  ...['tshirt', 'pull', 'gilet', 'robe', 'short', 'jupe', 'pantalon', 'salopette', 'baskets', 'bottes', 'sandales', 'echarpe']
    .map((k, i) => M(`PER-${String(i + 8).padStart(3, '0')}`, `tenue-${k}`, PIECES[k].name, perso({ [PIECES[k].slot]: k }, `piece:${k}`), { tags: ['tenue', PIECES[k].slot] })),
  ...['bob', 'barrette', 'lunettes', 'sac']
    .map((k, i) => M(`PER-${String(i + 20).padStart(3, '0')}`, `accessoire-${k}`, PIECES[k].name, perso({ accessory: k }, `piece:${k}`), { tags: ['accessoire'] })),
  M('PER-024', 'crayon', 'Crayon d\'étude', outil({ ref: 'crayon', build: () => assembleMesh(crayonGeometry(), 'tool') }), { tags: ['objet tenu'] }),
  M('PER-025', 'outils', 'Outils', outil({ ref: 'outils', build: ({ outil: o = 'hache', tete = '#c9cdd6' } = {}) => assembleMesh(outilGeometry(o, tete), 'tool') }), {
    variants: OUTILS.map((o) => ({ label: o[0].toUpperCase() + o.slice(1), params: { outil: o } })),
    params: { outil: OUTILS, tete: 'color' }, tags: ['objet tenu'],
  }),
];

export const BY_ID = new Map(MODELS.map((m) => [m.id, m]));
export const categoryOf = (id) => CATEGORIES.find((c) => c.prefix === id.slice(0, 3));

// paramètres par défaut d'un modèle : première variante s'il y en a
export function defaultParams(m) {
  return { ...(m.variants[0]?.params || {}) };
}
