// Coupe de cheveux du personnage (PER-026) : une seule coupe, en pics, présentée sur l'avatar. Les
// anciennes coupes (PER-002 à PER-007) gardent leur numéro, au statut « retire ».
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { FACE } from '../../../entities/character/face.js';
import { HAIRS } from '../../../entities/character/avatar.js';
import { limb } from '../../kit/formes.js';
import { HC, B, ID } from '../commun.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

// ---------------------------------------------------------------------------
// Cheveux : une calotte + des pics effilés à bout rond (tubes `limb`). La frange et les côtés
// tiennent à la tête ; le dessus suit l'os HAIR_A, l'arrière l'os HAIR_B, montés sur ressort
// (entities/character/cheveux.js).
// ---------------------------------------------------------------------------
// calotte nettement décentrée (vers le haut et l'arrière) : son intersection avec
// le crâne est franche, la ligne des cheveux ne fait pas de dents de scie
export const CAP_C = [0, HC + 0.075, -0.08];
export const CAP_SY = 0.93;
export const CAP_EXTRA = 0.034;

function cap(b, c, extra = CAP_EXTRA) {
  b.add(G.sphere(FACE.R + extra, 18, 12), c, { p: CAP_C, s: [FACE.SX, CAP_SY, 1.05] });
}

// point sur la calotte : azimut a (0 = devant), hauteur dy, poussé de `out`
export function onCap(a, dy, out = 0.012, extra = CAP_EXTRA) {
  const R = FACE.R + extra;
  const hr = Math.sqrt(Math.max(0, R * R - (dy / CAP_SY) ** 2)) + out;
  return [Math.sin(a) * hr * FACE.SX, CAP_C[1] + dy, CAP_C[2] + Math.cos(a) * hr * 1.05];
}

// Mèches en pics : [azimut, hauteur sur la calotte, longueur, demi-largeur, sens du coiffé
// (vecteur ramené dans le plan de la calotte), décollement (rad), courbure vers le crâne]. Chaque
// mèche est un tube effilé à bout rond, aplati contre le crâne (épaisseur FLAT de sa largeur) ; son
// pied s'enfonce de 3 à 4,5 cm sous la calotte : il ne se décolle pas quand son os bascule.
const FLAT = 0.5;
// enfoncement du pied sous la calotte, profil (rayon au pied, au ventre, aux deux tiers, à la pointe,
// en part de la demi-largeur) et finesse du tube : mèches couchées larges dès le pied, pics dressés
// en feuille ; la frange, vue de près et de face, a plus de côtés et d'anneaux (aucune facette)
const COUCHEE = { sink: 0.03, profile: [0.9, 1, 0.62, 0.1], sides: 7, rings: 3 };
const FRANGE = { ...COUCHEE, sides: 10, rings: 4 };
const NUQUE = { ...COUCHEE, sides: 6 }; // vue de loin, de dos : 6 côtés suffisent (budget)
const DRESSEE = { sink: 0.045, profile: [0.55, 1, 0.6, 0.1], sides: 7, rings: 3 };
export const SPIKES = {
  // frange : mèches couchées sur le front, de longueurs et de sens inégaux (ébouriffée), qui dépassent
  // la ligne des cheveux en zigzag ; pointes au-dessus des sourcils
  frange: [
    [-0.7, 0.12, 0.13, 0.058, [-0.6, -1, 0], 0.16, 0.05],
    [-0.38, 0.16, 0.17, 0.064, [-0.1, -1, 0], 0.12, 0.05],
    [-0.05, 0.17, 0.14, 0.066, [0.35, -1, 0], 0.14, 0.05],
    [0.3, 0.16, 0.175, 0.064, [-0.05, -1, 0], 0.12, 0.05],
    [0.66, 0.12, 0.12, 0.058, [0.7, -1, 0], 0.18, 0.05],
  ],
  // côtés : balayés vers l'arrière au-dessus des oreilles, assez décollés pour déborder de la silhouette
  cotes: [
    [-1.15, 0.1, 0.15, 0.07, [0, -0.35, -1], 0.5, 0],
    [1.15, 0.1, 0.15, 0.07, [0, -0.35, -1], 0.5, 0],
    [-1.6, -0.02, 0.13, 0.064, [0, -0.6, -1], 0.45, 0],
    [1.6, -0.02, 0.13, 0.064, [0, -0.6, -1], 0.45, 0],
  ],
  // dessus : pics ébouriffés, chacun dans son sens (pas de couronne régulière), longueurs et
  // décollements inégaux, pointes qui rebiquent (courbure négative)
  dessus: [
    [0.25, 0.25, 0.14, 0.076, [0.5, 0, -0.2], 0.62, -0.2],
    [-0.3, 0.27, 0.17, 0.082, [-0.4, 0, -1], 0.7, -0.2],
    [0.75, 0.22, 0.15, 0.076, [1, 0, -0.5], 0.55, -0.18],
    [-0.95, 0.21, 0.16, 0.078, [-1, 0, -0.2], 0.58, -0.2],
    [1.4, 0.17, 0.14, 0.072, [1, 0, -0.8], 0.5, -0.15],
    [-1.6, 0.15, 0.13, 0.07, [-1, 0, -0.9], 0.5, -0.15],
    [Math.PI - 0.35, 0.26, 0.18, 0.082, [-0.5, 0, -1], 0.6, -0.2],
    [Math.PI + 0.6, 0.24, 0.16, 0.08, [0.6, 0, -1], 0.58, -0.18],
  ],
  // arrière : mèches couchées vers la nuque, en deux rangs, pointes en zigzag (vues de dos, elles se
  // lisent comme la frange ; des pics dressés, vus en bout, feraient des taches)
  arriere: [
    [Math.PI - 0.62, 0.13, 0.17, 0.074, [-0.25, -1, 0], 0.24, -0.06],
    [Math.PI + 0.05, 0.15, 0.19, 0.076, [0.1, -1, 0], 0.22, -0.06],
    [Math.PI + 0.68, 0.13, 0.16, 0.074, [0.3, -1, 0], 0.26, -0.06],
    ...[-0.5, 0, 0.5].map((da) => [Math.PI + da, -0.01, 0.16, 0.07, [da * 0.4, -1, 0], 0.24, 0]),
  ],
};

const _n = new THREE.Vector3();
const _t = new THREE.Vector3();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Repère d'une mèche (repère du personnage) : pied enfoncé, axe y = direction de la mèche, axe z =
// normale de la calotte ramenée perpendiculaire à l'axe (épaisseur), axe x = largeur
export function spikeFrame([a, dy, , , sweep, lift], sink = DRESSEE.sink) {
  const base = new THREE.Vector3(...onCap(a, dy, -sink));
  _n.set(Math.sin(a) / FACE.SX, dy / (FACE.R + CAP_EXTRA) / CAP_SY, Math.cos(a) / 1.05).normalize();
  _t.set(...sweep);
  _t.addScaledVector(_n, -_n.dot(_t)).normalize();
  const dir = _t.clone().multiplyScalar(Math.cos(lift)).addScaledVector(_n, Math.sin(lift)).normalize();
  _z.copy(_n).addScaledVector(dir, -_n.dot(dir)).normalize();
  _x.crossVectors(dir, _z);
  return { base, dir, x: _x.clone(), z: _z.clone() };
}

// Pointe d'une mèche (repère du personnage) : sert aux tests (pointes hors de la tête)
export function spikeTip(s, { sink } = DRESSEE) {
  const [, , len, , , , bend] = s;
  const f = spikeFrame(s, sink);
  return f.base.addScaledVector(f.dir, len + sink).addScaledVector(f.z, -bend * (len + sink) * FLAT);
}

function spikes(b, list, c, { sink, profile, sides, rings } = DRESSEE) {
  for (const s of list) {
    const [, , len, r, , , bend] = s;
    const f = spikeFrame(s, sink);
    _m.makeBasis(f.x, f.dir, f.z).scale(new THREE.Vector3(1, 1, FLAT)).setPosition(f.base);
    const L = len + sink;
    // axe courbé dans le plan de l'épaisseur (bend > 0 : la pointe revient vers le crâne)
    const pts = [0, 0.3, 0.65, 1].map((t) => [0, L * t, -bend * L * t * t]);
    const at = { add: (g, col, opts) => b.add(g.applyMatrix4(_m), col, opts) };
    limb(at, c, pts, profile.map((k) => k * r), { sides, rings, end: 'round' });
  }
}

// rose des anciens rubans de cheveux, gardé pour la bague du crayon (../crayon/)
export const RIBBON = '#ef9bb5';

export const HAIR_STYLES = {
  pics: {
    // pivots des os à ressort (repère du personnage)
    a: [0, HC + 0.3, -0.1],
    b: [0, HC + 0.08, -0.3],
    // dynamique de chaque groupe : direction moyenne des pics depuis le pivot (repère de la tête),
    // bras de levier, butées en radians (x : avant + / arrière −, z : roulis), choisies pour que les
    // pointes ne rentrent pas dans la tête (tests/cheveux.test.js)
    dyn: {
      a: { dir: [0, 0.8, -0.6], lever: 0.13, x: [-0.24, 0.18], z: 0.16 },
      b: { dir: [0, -0.9, -0.44], lever: 0.13, x: [-0.08, 0.4], z: 0.24 },
    },
    // av : l'avatar (le bob cache le dessus et le rang haut de l'arrière)
    build(P, c, d, av = {}) {
      cap(P.on(B.HEAD, ID.hair), c);
      // les mèches recouvrent la calotte : identifiant de contour à part, le trait d'encre les détache
      const M = P.on(B.HEAD, ID.limb);
      spikes(M, SPIKES.frange, c, FRANGE);
      spikes(M, SPIKES.cotes, c, COUCHEE);
      // arrière : rang haut clair, rang bas foncé (de la profondeur entre les deux)
      const A = P.on(B.HAIR_B, ID.limb);
      spikes(A, SPIKES.arriere.slice(3), d, NUQUE);
      if (av.accessory === 'bob') return; // le bob couvre le haut de la tête : ni dessus, ni rang haut
      spikes(A, SPIKES.arriere.slice(0, 3), c, NUQUE);
      spikes(P.on(B.HAIR_A, ID.limb), SPIKES.dessus, c);
    },
  },
};

// fiches du registre : l'avatar coiffé de la coupe ; les coupes retirées le 21/10/2026 gardent leur
// numéro et montrent l'avatar d'aujourd'hui (leurs sauvegardes retombent sur la coupe en pics)
const RETIREES = [['bol', 'Bol court'], ['carre', 'Carré frangé'], ['queue', 'Queue haute'], ['macarons', 'Deux macarons'], ['boucles', 'Boucles'], ['longs', 'Longs lisses']];
export default [
  ...RETIREES.map(([k, nom], i) => fiche(`PER-${String(i + 2).padStart(3, '0')}`, `coupe-${k}`, `Coupe : ${nom}`, perso(() => Character, {}, `hair:${k}`), { status: 'retire', tags: ['coupe', 'remplacée par PER-026'] })),
  fiche('PER-026', 'coupe-pics', `Coupe : ${HAIRS.pics}`, perso(() => Character, { hair: 'pics' }, 'hair:pics'), { tags: ['coupe'] }),
];
