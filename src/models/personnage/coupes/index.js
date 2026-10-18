// Coupes de cheveux du personnage (PER-002 à PER-007), présentées sur l'avatar.
import { G } from '../../../render/builder.js';
import { FACE } from '../../../entities/character/face.js';
import { HAIRS } from '../../../entities/character/avatar.js';
import { HC, B, ID } from '../commun.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

// ---------------------------------------------------------------------------
// Cheveux : une calotte + des mèches en gouttes ; les éléments secondaires
// (queue, macarons, pans, épi) suivent les os HAIR_A / HAIR_B montés sur ressort.
// ---------------------------------------------------------------------------
// calotte nettement décentrée (vers le haut et l'arrière) : son intersection avec
// le crâne est franche, la ligne des cheveux ne fait pas de dents de scie
const CAP_C = [0, HC + 0.075, -0.08];
const CAP_SY = 0.93;

function cap(b, c, extra = 0.034) {
  b.add(G.sphere(FACE.R + extra, 22, 14), c, { p: CAP_C, s: [FACE.SX, CAP_SY, 1.05] });
}

// point sur la calotte : azimut a (0 = devant), hauteur dy, poussé de `out`
export function onCap(a, dy, out = 0.012, extra = 0.034) {
  const R = FACE.R + extra;
  const hr = Math.sqrt(Math.max(0, R * R - (dy / CAP_SY) ** 2)) + out;
  return [Math.sin(a) * hr * FACE.SX, CAP_C[1] + dy, CAP_C[2] + Math.cos(a) * hr * 1.05];
}

function drop(b, c, p, r = 0.05, len = 1.5, rot = [0, 0, 0], flat = 0.62) {
  b.add(G.sphere(r, 8, 6), c, { p, r: rot, s: [1, len, flat] });
}

// frange : quelques larges mèches qui se fondent en une seule masse
function fringe(b, c, n = 4, spread = 0.25) {
  for (let k = 0; k < n; k++) {
    const a = (k - (n - 1) / 2) * spread;
    drop(b, c, onCap(a, 0.085, -0.012), 0.082, 1.12, [-0.24, a, 0], 0.46);
  }
}

export const RIBBON = '#ef9bb5';

export const HAIR_STYLES = {
  bol: {
    a: [0, HC + 0.3, -0.12],
    b: [0, HC + 0.3, -0.12],
    build(P, c, d) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c);
      fringe(H, c);
      for (const sx of [-1, 1]) for (const a of [1.0, 1.32]) drop(H, c, onCap(sx * a, -0.02, 0.0), 0.062, 1.55, [0, sx * a, 0], 0.5);
      H.add(G.sphere(0.25, 14, 10), c, { p: [0, HC + 0.0, -0.1], s: [1.14, 0.78, 0.86] });
      for (const a of [Math.PI - 0.5, Math.PI, Math.PI + 0.5]) drop(H, d, onCap(a, -0.13, -0.01), 0.07, 1.15, [0, a, 0], 0.45);
      // épi qui rebondit
      drop(P.on(B.HAIR_A, ID.hair), c, [0, HC + 0.37, -0.1], 0.036, 1.8, [-0.55, 0, 0]);
    },
  },
  carre: {
    hideEars: true,
    a: [-0.28, HC + 0.08, 0.02],
    b: [0.28, HC + 0.08, 0.02],
    build(P, c, d) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c);
      fringe(H, c);
      // volume arrière arrondi jusqu'à la nuque
      H.add(G.sphere(0.26, 14, 10), c, { p: [0, HC - 0.035, -0.1], s: [1.16, 1.0, 0.86] });
      H.add(G.sphere(0.2, 12, 8), c, { p: [0, HC - 0.17, -0.13], s: [1.25, 0.42, 0.9] });
      // pans latéraux d'un seul tenant, montés sur ressort, pointe vers la joue
      for (const [sx, bone] of [[-1, B.HAIR_A], [1, B.HAIR_B]]) {
        const S = P.on(bone, ID.hair);
        S.add(G.sphere(0.12, 12, 10), c, { p: onCap(sx * 1.3, -0.075, -0.035), r: [0, sx * 1.3, 0], s: [0.62, 1.42, 0.5] });
        drop(S, d, onCap(sx * 1.05, -0.17, 0.0), 0.05, 1.3, [0.2, sx * 1.05, -sx * 0.35], 0.5);
      }
    },
  },
  queue: {
    a: [0, HC + 0.21, -0.31],
    b: [0, HC + 0.21, -0.31],
    build(P, c, d) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c, 0.01);
      fringe(H, c, 3, 0.27);
      for (const sx of [-1, 1]) drop(H, c, onCap(sx * 1.2, 0.02, 0.0, 0.01), 0.05, 1.5, [0, sx * 1.2, 0]);
      H.add(G.torus(0.042, 0.016, 6, 14), RIBBON, { p: [0, HC + 0.22, -0.31], r: [-0.9, 0, 0] });
      const A = P.on(B.HAIR_A, ID.hair);
      drop(A, c, [0, HC + 0.17, -0.38], 0.07, 1.45, [0.7, 0, 0], 0.8);
      drop(A, c, [0, HC + 0.05, -0.41], 0.066, 1.6, [0.25, 0, 0], 0.8);
      drop(A, d, [0, HC - 0.07, -0.4], 0.05, 1.5, [-0.1, 0, 0], 0.8);
    },
  },
  macarons: {
    a: [-0.17, HC + 0.25, -0.08],
    b: [0.17, HC + 0.25, -0.08],
    build(P, c) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c);
      fringe(H, c);
      for (const sx of [-1, 1]) drop(H, c, onCap(sx * 1.25, -0.02, 0.01), 0.055, 1.7, [0, sx * 1.25, 0]);
      for (const [sx, bone] of [[-1, B.HAIR_A], [1, B.HAIR_B]]) {
        const S = P.on(bone, ID.hair);
        S.add(G.sphere(0.088, 10, 8), c, { p: [sx * 0.2, HC + 0.3, -0.08] });
        S.add(G.torus(0.06, 0.014, 6, 14), RIBBON, { p: [sx * 0.175, HC + 0.245, -0.075], r: [Math.PI / 2, 0, sx * 0.6] });
      }
    },
  },
  boucles: {
    a: [0, HC + 0.33, -0.04],
    b: [0, HC + 0.33, -0.04],
    build(P, c, d) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c, 0.05);
      const curl = (S, a, dy, r, col) => S.add(G.sphere(r, 8, 6), col, { p: onCap(a, dy, r * 0.2, 0.05) });
      for (let k = 0; k < 6; k++) curl(H, (k / 6) * Math.PI * 2 + 0.3, 0.15, 0.09, k % 2 ? c : d);
      for (let k = 0; k < 7; k++) curl(H, 1.0 + (k / 6) * (Math.PI * 2 - 2.0), 0.02, 0.092, k % 2 ? d : c);
      for (let k = 0; k < 5; k++) curl(H, 1.35 + (k / 4) * (Math.PI * 2 - 2.7), -0.12, 0.085, k % 2 ? c : d);
      for (const a of [-0.36, 0, 0.36]) curl(H, a, 0.09, 0.075, c);
      const A = P.on(B.HAIR_A, ID.hair);
      for (const a of [0, 2.1, 4.2]) curl(A, a, 0.25, 0.085, c);
    },
  },
  longs: {
    hideEars: true,
    a: [0, HC - 0.02, -0.24],
    b: [0, HC + 0.05, 0],
    build(P, c, d) {
      const H = P.on(B.HEAD, ID.hair);
      cap(H, c);
      for (const sx of [-1, 1]) drop(H, c, onCap(sx * 0.72, 0.07, 0.012), 0.065, 1.9, [-0.2, sx * 0.72, sx * 0.32]);
      for (const sx of [-1, 1]) drop(H, c, onCap(sx * 1.3, -0.02, 0.012), 0.06, 1.9, [0, sx * 1.3, 0]);
      const A = P.on(B.HAIR_A, ID.hair);
      A.add(G.sphere(0.2, 12, 10), c, { p: [0, 0.9, -0.24], s: [1.3, 1.9, 0.45] });
      for (let k = 0; k < 4; k++) drop(A, d, [(k - 1.5) * 0.085, 0.56, -0.25], 0.055, 1.5, [0.1, 0, 0], 0.6);
      const S = P.on(B.HAIR_B, ID.hair);
      for (const sx of [-1, 1]) drop(S, c, [sx * 0.26, 0.9, 0.1], 0.06, 2.6, [0, sx * 1.3, -sx * 0.06], 0.65);
    },
  },
};

// fiches du registre : l'avatar coiffé de chaque coupe
export default ['bol', 'carre', 'queue', 'macarons', 'boucles', 'longs'].map((k, i) => fiche(`PER-${String(i + 2).padStart(3, '0')}`, `coupe-${k}`, `Coupe : ${HAIRS[k]}`, perso(() => Character, { hair: k }, `hair:${k}`), { tags: ['coupe'] }));
