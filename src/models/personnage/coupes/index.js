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
// tiennent à la tête ; la couronne suit l'os HAIR_A, l'arrière l'os HAIR_B, montés sur ressort
// (entities/character/cheveux.js).
// ---------------------------------------------------------------------------
// calotte nettement décentrée (vers le haut et l'arrière) : son intersection avec
// le crâne est franche, la ligne des cheveux ne fait pas de dents de scie
export const CAP_C = [0, HC + 0.075, -0.08];
export const CAP_SY = 0.93;
export const CAP_EXTRA = 0.034;

function cap(b, c, extra = CAP_EXTRA) {
  b.add(G.sphere(FACE.R + extra, 22, 14), c, { p: CAP_C, s: [FACE.SX, CAP_SY, 1.05] });
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
// enfoncement du pied sous la calotte et profil (rayon au pied, au ventre, aux deux tiers, à la
// pointe, en part de la demi-largeur) : mèches couchées larges dès le pied, pics dressés en feuille
const COUCHEE = { sink: 0.03, profile: [0.9, 1, 0.62, 0.1] };
const DRESSEE = { sink: 0.045, profile: [0.55, 1, 0.6, 0.1] };
export const SPIKES = {
  // frange : mèches couchées sur le front, qui dépassent la ligne des cheveux en zigzag ; pointes
  // au-dessus des sourcils
  frange: [
    [-0.68, 0.12, 0.15, 0.06, [-0.45, -1, 0], 0.12, 0.05],
    [-0.34, 0.15, 0.165, 0.064, [-0.22, -1, 0], 0.1, 0.05],
    [0.0, 0.16, 0.17, 0.066, [0.03, -1, 0], 0.1, 0.05],
    [0.34, 0.15, 0.165, 0.064, [0.24, -1, 0], 0.1, 0.05],
    [0.68, 0.12, 0.15, 0.06, [0.45, -1, 0], 0.12, 0.05],
  ],
  // côtés : balayés vers l'arrière au-dessus des oreilles
  cotes: [
    [-1.15, 0.1, 0.15, 0.07, [0, -0.35, -1], 0.32, 0.05],
    [1.15, 0.1, 0.15, 0.07, [0, -0.35, -1], 0.32, 0.05],
    [-1.6, -0.02, 0.13, 0.064, [0, -0.6, -1], 0.3, 0.05],
    [1.6, -0.02, 0.13, 0.064, [0, -0.6, -1], 0.3, 0.05],
  ],
  // couronne : les grands pics du dessus, dressés vers le haut et l'arrière
  couronne: [
    [-0.5, 0.25, 0.15, 0.082, [-0.25, 0.4, -1], 0.5, 0],
    [0.0, 0.27, 0.16, 0.088, [0, 0.4, -1], 0.55, 0],
    [0.5, 0.25, 0.15, 0.082, [0.25, 0.4, -1], 0.5, 0],
    [-1.0, 0.2, 0.15, 0.076, [-0.4, 0.2, -1], 0.48, 0],
    [1.0, 0.2, 0.15, 0.076, [0.4, 0.2, -1], 0.48, 0],
    [Math.PI - 0.55, 0.25, 0.15, 0.078, [-0.2, 0.3, -1], 0.5, 0],
    [Math.PI + 0.55, 0.25, 0.15, 0.078, [0.2, 0.3, -1], 0.5, 0],
  ],
  // arrière : une rangée vers l'arrière et le bas, une rangée sur la nuque
  arriere: [
    [Math.PI - 0.95, 0.1, 0.16, 0.075, [-0.3, -0.6, -1], 0.42, 0.05],
    [Math.PI - 0.32, 0.12, 0.17, 0.078, [-0.1, -0.5, -1], 0.45, 0.05],
    [Math.PI + 0.32, 0.12, 0.17, 0.078, [0.1, -0.5, -1], 0.45, 0.05],
    [Math.PI + 0.95, 0.1, 0.16, 0.075, [0.3, -0.6, -1], 0.42, 0.05],
    [Math.PI - 0.55, -0.08, 0.13, 0.068, [-0.2, -1, -0.3], 0.35, 0.05],
    [Math.PI, -0.07, 0.14, 0.07, [0, -1, -0.3], 0.38, 0.05],
    [Math.PI + 0.55, -0.08, 0.13, 0.068, [0.2, -1, -0.3], 0.35, 0.05],
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

function spikes(b, list, c, { sink, profile } = DRESSEE) {
  for (const s of list) {
    const [, , len, r, , , bend] = s;
    const f = spikeFrame(s, sink);
    _m.makeBasis(f.x, f.dir, f.z).scale(new THREE.Vector3(1, 1, FLAT)).setPosition(f.base);
    const L = len + sink;
    // axe courbé dans le plan de l'épaisseur (bend > 0 : la pointe revient vers le crâne)
    const pts = [0, 0.3, 0.65, 1].map((t) => [0, L * t, -bend * L * t * t]);
    const at = { add: (g, col, opts) => b.add(g.applyMatrix4(_m), col, opts) };
    limb(at, c, pts, profile.map((k) => k * r), { sides: 7, rings: 3, end: 'round' });
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
      a: { dir: [0, 0.74, -0.67], lever: 0.13, x: [-0.3, 0.32], z: 0.26 },
      b: { dir: [0, -0.25, -0.97], lever: 0.12, x: [-0.16, 0.4], z: 0.24 },
    },
    build(P, c, d) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c);
      // la frange recouvre la calotte : identifiant de contour à part, le trait d'encre la détache
      spikes(P.on(B.HEAD, ID.limb), SPIKES.frange, c, COUCHEE);
      spikes(H, SPIKES.cotes, d, COUCHEE);
      spikes(P.on(B.HAIR_A, ID.hair), SPIKES.couronne, c);
      spikes(P.on(B.HAIR_B, ID.hair), SPIKES.arriere, d);
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
