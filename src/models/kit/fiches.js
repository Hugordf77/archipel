// Fabriques des fiches du registre. Chaque dossier de modèle décrit sa fiche (export par défaut) :
//   export default fiche('ANI-001', 'mouton', 'Mouton', species('mouton', espece), { budget: { … } })
// La fabrique (kind, part, ile, species…) dit ce que le jeu construit (ref) et comment le catalogue
// assemble le modèle seul : build(params) → { object3d, anim?(dt, t) }. Les compléments ajoutent
// variantes, paramètres, valeurs par défaut, usage, étiquettes et budget de triangles. Le fichier
// source de chaque fiche est relevé par npm run modeles:index (index.gen.js).
import * as THREE from 'three';
import { glowMaterial } from '../../render/shaders/materials.js';
import { nextId } from '../../core/globals.js';
import { assembleKind, assemblePart, assembleBuilder, assembleCreature, materiaux } from './assemble.js';

// préfixe d'identifiant → dossier de catégorie
export const PREFIXES = { ARB: 'arbres', PLA: 'plantes', ROC: 'rochers', BAT: 'batiments', STR: 'ouvrages', MON: 'monuments', NAV: 'bateaux', DEC: 'decor', OBJ: 'objets', ANI: 'animaux', PER: 'personnage' };
export const ILE_DEPART = ['île de départ'];

// fiche : identifiant, slug, nom, fabrique, compléments (variantes, paramètres, usage, étiquettes…)
export function fiche(id, slug, nom, src, more = {}) {
  return {
    id, slug, nom, categorie: PREFIXES[id.slice(0, 3)], ...src, ...more,
    usedIn: [...(src.usedIn || []), ...(more.usedIn || [])],
    tags: [...(src.tags || []), ...(more.tags || [])],
  };
}
// variantes numérotées (paramètre v par défaut) ; étiquette « même modèle que »
export const v3 = (labels, key = 'v') => labels.map((label, i) => ({ label, params: { [key]: i } }));
export const SAME = (other) => ({ tags: [`même modèle que ${other}`] });

// --- fabriques par famille de constructeurs -------------------------------------------
// végétation et ressources des îles (vegetation.js)
export const kind = (k) => ({ ref: `kind:${k}`, defaults: { roche: '#d6cbbd', fleur: '#f7b6c8', v: 0 }, build: (q = {}) => assembleKind(k, q) });
// éléments de lieux des îles (lieux.js) ; base : paramètres fixés par la fiche
export const part = (t, base = {}) => ({ ref: `part:${t}`, defaults: base, build: (q = {}) => assemblePart({ t, ...base, ...q }) });
// pièces de l'île de départ, dessinées dans un Builder : draw(b, vitres) → feuillages éventuels
export const ile = (name, draw, mat) => ({ ref: `ile:${name}`, usedIn: ILE_DEPART, build: () => assembleBuilder(draw, mat) });
// espèce de la faune des îles (sp : nom, d : sa définition, voir animaux/index.js)
export function species(sp, d) {
  const coats = d.coats || [];
  return {
    ref: `species:${sp}`, tags: ['animé'],
    variants: coats.map(([label], i) => ({ label, params: { coat: i } })),
    build({ coat = 0 } = {}) {
      if (d.insect === 'glow') {
        // insecte lumineux : simple halo qui pulse (comme en jeu, la nuit)
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(...d.glow));
        m.renderOrder = 10;
        m.scale.setScalar(0.3);
        return { object3d: m, anim: (dt, t) => m.scale.setScalar(0.25 + 0.15 * Math.sin(t * 3)) };
      }
      return assembleCreature(d.parts(), { scale: d.scale || 1, pace: Math.max(0.4, d.speed || 1), coat: d.coats?.[coat]?.[1], graze: d.graze ?? 0.5, nod: d.nod ?? 0 });
    },
  };
}
// animaux de l'île de départ : corps + pièces mobiles aux pivots du jeu
export function homeCreature(name, geos, pivots, matKey, anim, scale = 1) {
  return {
    ref: `faune:${name}`, usedIn: ILE_DEPART, tags: ['animé'],
    build() {
      const [body, ...rest] = geos(nextId());
      const parts = [{ geo: body, pivot: [0, 0, 0] }];
      pivots.forEach((pv, i) => parts.push({ geo: rest[Math.floor((i * rest.length) / pivots.length)], pivot: pv, anim, side: i < pivots.length / 2 ? -1 : 1, phase: i * 1.7 }));
      return assembleCreature(parts, { mat: materiaux()[matKey], scale });
    },
  };
}
// objet tenu en main
export const outil = (o) => ({ ref: o.ref, usedIn: ['main du personnage'], build: o.build });
