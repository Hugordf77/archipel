// Personnage joueur : géométrie du corps, du visage (calotte), des 6 coupes de cheveux et des
// pièces de tenue, à partir d'un avatar. Un seul maillage à liaison rigide (une pièce = un os) ;
// le squelette, l'animation et les poses vivent dans entities/character/Character.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Builder, G } from '../../render/builder.js';
import { CHAR_IDS } from '../../core/globals.js';
import { SKINS, HAIR_COLORS, CLOTH_COLORS, SHOE_COLORS } from '../../entities/character/avatar.js';
import { FACE } from '../../entities/character/face.js';

export const HC = 1.12; // centre du crâne
const CREAM = '#f6ead2';
const JOINT_BLEND_RADIUS = 0.055;

export const B = { HIPS: 0, TORSO: 1, HEAD: 2, ARM_L: 3, FORE_L: 4, ARM_R: 5, FORE_R: 6, THIGH_L: 7, SHIN_L: 8, THIGH_R: 9, SHIN_R: 10, HAIR_A: 11, HAIR_B: 12, NECK: 13, HAND_L: 14, HAND_R: 15, FOOT_L: 16, FOOT_R: 17, SKIRT: 18, SCARF: 19 };
export const PARENT = [-1, 0, B.NECK, 1, 3, 1, 5, 0, 7, 0, 9, 2, 2, 1, B.FORE_L, B.FORE_R, B.SHIN_L, B.SHIN_R, B.HIPS, B.TORSO];
// positions de repos absolues (repère du personnage, pieds en 0)
export const REST = [
  [0, 0.46, 0], [0, 0.52, 0], [0, 0.85, 0],
  [-0.17, 0.775, 0], [-0.17, 0.62, 0], [0.17, 0.775, 0], [0.17, 0.62, 0],
  [-0.085, 0.42, 0], [-0.085, 0.27, 0], [0.085, 0.42, 0], [0.085, 0.27, 0],
  [0, HC + 0.2, -0.2], [0, HC + 0.2, -0.2],
  [0, 0.82, 0], [-0.17, 0.455, 0], [0.17, 0.455, 0], [-0.085, 0.12, 0.03], [0.085, 0.12, 0.03],
  [0, 0.44, 0], [0.075, 0.74, 0.14],
];

export const ID = CHAR_IDS;
// boîte arrondie économe (1 segment d'arrondi : ~100 triangles au lieu de ~600)
const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 1, Math.min(r, Math.min(w, h, d) * 0.49));

export const tint = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
const mixHex = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

// Pièces regroupées par os, puis fusionnées avec leurs poids de peau
class Parts {
  constructor() {
    this.by = new Map();
  }

  // un Builder par (os, masse) : l'id de contour suit la masse
  on(bone, id = ID.body) {
    const key = `${bone}|${id}`;
    let b = this.by.get(key);
    if (!b) {
      b = new Builder(id);
      b.bone = bone;
      this.by.set(key, b);
    }
    return b;
  }

  build() {
    const geos = [];
    for (const builder of this.by.values()) {
      const bone = builder.bone;
      const g = builder.build();
      if (!g.attributes.position) continue;
      const n = g.attributes.position.count;
      const si = new Uint16Array(n * 4);
      const sw = new Float32Array(n * 4);
      const neighbors = [];
      if (PARENT[bone] >= 0) neighbors.push({ bone: PARENT[bone], pivot: REST[bone] });
      for (let child = 0; child < PARENT.length; child++) {
        if (PARENT[child] === bone) neighbors.push({ bone: child, pivot: REST[child] });
      }
      const pos = g.attributes.position;
      for (let i = 0; i < n; i++) {
        si[i * 4] = bone;
        let neighborWeight = 0;
        let neighborBone = bone;
        let nearestSq = JOINT_BLEND_RADIUS * JOINT_BLEND_RADIUS;
        for (const neighbor of neighbors) {
          const dx = pos.getX(i) - neighbor.pivot[0];
          const dy = pos.getY(i) - neighbor.pivot[1];
          const dz = pos.getZ(i) - neighbor.pivot[2];
          const distanceSq = dx * dx + dy * dy + dz * dz;
          if (distanceSq < nearestSq) {
            nearestSq = distanceSq;
            neighborBone = neighbor.bone;
          }
        }
        if (neighborBone !== bone) {
          const blend = 1 - THREE.MathUtils.smoothstep(Math.sqrt(nearestSq), 0, JOINT_BLEND_RADIUS);
          neighborWeight = blend * 0.5;
          si[i * 4 + 1] = neighborBone;
        }
        sw[i * 4] = 1 - neighborWeight;
        sw[i * 4 + 1] = neighborWeight;
      }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    return merged;
  }
}

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
function onCap(a, dy, out = 0.012, extra = 0.034) {
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

// ---------------------------------------------------------------------------
// Corps et vêtements
// ---------------------------------------------------------------------------
// profil du torse en goutte : [y, rayon]
const TORSO = [[0.42, 0.0], [0.423, 0.11], [0.44, 0.158], [0.48, 0.183], [0.55, 0.192], [0.62, 0.187], [0.69, 0.172], [0.75, 0.15], [0.8, 0.118], [0.835, 0.08], [0.851, 0.04], [0.856, 0.0]];

function torsoRadius(y) {
  for (let i = 1; i < TORSO.length; i++) {
    const [y1, r1] = TORSO[i];
    if (y <= y1) {
      const [y0, r0] = TORSO[i - 1];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
  }
  return 0;
}

// tranche du torse entre y0 et y1 (les rayures sont des tranches de couleurs différentes)
function torsoBand(b, y0, y1, color, colorFn = null) {
  const pts = [[torsoRadius(y0), y0]];
  for (const [y, r] of TORSO) if (y > y0 + 1e-4 && y < y1 - 1e-4) pts.push([r, y]);
  pts.push([torsoRadius(y1), y1]);
  b.add(G.lathe(pts, 12), color, { s: [1, 1, 0.82], colorFn });
}

export function buildAvatarGeometry(av) {
  const P = new Parts();
  const skin = SKINS[av.skin];
  const skinWarm = mixHex(skin, '#e07a6a', 0.16);
  const hair = HAIR_COLORS[av.hairColor];
  const hairDark = tint(hair, 0.86);
  const top = CLOTH_COLORS[av.topColor];
  const bot = CLOTH_COLORS[av.bottomColor];
  const shoe = SHOE_COLORS[av.shoesColor];
  const dress = av.top === 'robe';
  const pants = !dress && (av.bottom === 'pantalon' || av.bottom === 'salopette');
  const overalls = !dress && av.bottom === 'salopette';

  // --- tête ---
  const H = P.on(B.HEAD, ID.head);
  H.add(G.sphere(FACE.R, 22, 14), skin, { p: [0, HC, 0], s: [FACE.SX, FACE.SY, 1] });
  if (!HAIR_STYLES[av.hair].hideEars) for (const sx of [-1, 1]) H.add(G.sphere(0.062, 8, 6), skinWarm, { p: [sx * 0.292, HC - 0.02, 0.005], s: [0.55, 1, 0.8] });
  const Acc = P.on(B.HEAD, ID.limb);
  HAIR_STYLES[av.hair].build(P, hair, hairDark);

  // --- torse ---
  const T = P.on(B.TORSO);
  T.add(G.cyl(0.055, 0.06, 0.1, 10), skin, { p: [0, 0.86, 0] });
  const bands = [];
  const waist = overalls ? 0.5 : 0.42;
  if (overalls) bands.push([0.42, 0.5, bot]);
  if (av.top === 'pull') {
    const y0 = Math.max(waist, 0.47);
    if (y0 > waist) bands.push([waist, y0, top]);
    let y = y0;
    let k = 0;
    while (y < 0.8 - 1e-4) {
      const y1 = Math.min(0.8, y + 0.042);
      bands.push([y, y1, k % 2 ? CREAM : top]);
      y = y1;
      k++;
    }
    bands.push([0.8, 0.856, top]);
  } else {
    bands.push([waist, 0.856, top]);
  }
  for (const [y0, y1, color] of bands) torsoBand(T, y0, y1, color);
  if (av.top === 'gilet') {
    // gilet ouvert sur un t-shirt crème
    T.add(box(0.08, 0.27, 0.03, 0.012), CREAM, { p: [0, 0.645, 0.152], r: [-0.12, 0, 0] });
    for (let i = 0; i < 3; i++) T.add(G.sphere(0.013, 6, 4), '#f2c14e', { p: [0.058, 0.72 - i * 0.07, 0.162 - i * 0.004] });
  }
  // col
  const collar = av.top === 'pull' ? tint(top, 0.88) : av.top === 'robe' ? CREAM : mixHex(top, CREAM, 0.45);
  T.add(G.torus(0.068, 0.016, 5, 14), collar, { p: [0, 0.836, 0], r: [Math.PI / 2, 0, 0] });

  // salopette : bavette, poche, boutons, bretelles (visibles de dos)
  if (overalls) {
    T.add(box(0.2, 0.15, 0.05, 0.02), bot, { p: [0, 0.625, 0.148], r: [-0.1, 0, 0] });
    T.add(box(0.08, 0.05, 0.012, 0.005), tint(bot, 0.86), { p: [0, 0.61, 0.176], r: [-0.1, 0, 0] });
    for (const sx of [-1, 1]) {
      T.add(G.sphere(0.016, 6, 4), '#f2c14e', { p: [sx * 0.075, 0.69, 0.172] });
      T.add(box(0.034, 0.14, 0.02, 0.008), bot, { p: [sx * 0.072, 0.755, 0.118], r: [-0.55, 0, 0] });
      T.add(box(0.034, 0.27, 0.02, 0.008), bot, { p: [sx * 0.074, 0.665, -0.142], r: [0.2, 0, -sx * 0.12] });
    }
  }

  // --- bassin, jupe, robe ---
  const Hp = P.on(B.HIPS);
  Hp.add(G.sphere(0.16, 12, 8), dress ? top : bot, { p: [0, 0.45, 0], s: [1.05, 0.62, 0.88] });
  if (dress) {
    const Sk = P.on(B.SKIRT);
    Sk.add(G.lathe([[0.17, 0.58], [0.19, 0.52], [0.22, 0.44], [0.255, 0.35], [0.27, 0.29], [0.262, 0.275]], 16), top, { s: [1, 1, 0.86] });
  } else if (av.bottom === 'jupe') {
    const Sk = P.on(B.SKIRT);
    Sk.add(G.lathe([[0.165, 0.53], [0.18, 0.48], [0.215, 0.4], [0.24, 0.33], [0.236, 0.315]], 16), bot, { s: [1, 1, 0.88] });
  }

  // --- bras ---
  for (const sx of [-1, 1]) {
    const A = P.on(sx < 0 ? B.ARM_L : B.ARM_R, ID.limb);
    const F = P.on(sx < 0 ? B.FORE_L : B.FORE_R, ID.limb);
    const W = P.on(sx < 0 ? B.HAND_L : B.HAND_R, ID.limb);
    const x = sx * 0.17;
    if (dress) {
      A.add(G.sphere(0.072, 10, 8), top, { p: [sx * 0.175, 0.765, 0], s: [1, 0.85, 1] });
      A.add(G.capsule(0.05, 0.09, 3, 8), skin, { p: [x, 0.7, 0] });
    } else {
      A.add(G.sphere(0.052, 8, 6), top, { p: [x, 0.762, 0] });
      const short = av.top === 'tshirt' ? (c, px, y) => { if (y < 0.68) c.set(skin); } : null;
      A.add(G.capsule(0.05, 0.09, 3, 8), top, { p: [x, 0.7, 0], colorFn: short });
    }
    const longSleeve = av.top === 'pull' || av.top === 'gilet';
    F.add(G.capsule(0.047, 0.09, 3, 8), longSleeve ? top : skin, { p: [x, 0.56, 0] });
    if (av.top === 'pull') F.add(G.torus(0.047, 0.016, 5, 12), CREAM, { p: [x, 0.505, 0], r: [Math.PI / 2, 0, 0] });
    W.add(G.sphere(0.058, 8, 6), skin, { p: [x, 0.455, 0.008], s: [0.9, 1.05, 0.95] });
  }

  // --- jambes et chaussures ---
  for (const sx of [-1, 1]) {
    const Th = P.on(sx < 0 ? B.THIGH_L : B.THIGH_R, ID.limb);
    const Sh = P.on(sx < 0 ? B.SHIN_L : B.SHIN_R, ID.limb);
    const Fo = P.on(sx < 0 ? B.FOOT_L : B.FOOT_R, ID.limb);
    const x = sx * 0.085;
    const bare = dress || av.bottom === 'jupe';
    const shortFn = av.bottom === 'short' && !dress ? (c, px, y) => { if (y < 0.33) c.set(skin); } : null;
    Th.add(G.capsule(0.06, 0.1, 3, 8), bare ? skin : bot, { p: [x, 0.355, 0], colorFn: shortFn });
    Sh.add(G.capsule(0.057, 0.1, 3, 8), pants ? bot : skin, { p: [x, 0.2, 0] });
    if (pants) Sh.add(G.torus(0.064, 0.02, 5, 12), mixHex(bot, CREAM, 0.3), { p: [x, 0.125, 0], r: [Math.PI / 2, 0, 0] });
    if (av.shoes === 'baskets') {
      Fo.add(G.sphere(0.078, 10, 7), shoe, { p: [x, 0.07, 0.03], s: [0.95, 0.62, 1.38] });
      Fo.add(G.sphere(0.082, 10, 5), shoe === CREAM ? '#e2d3b4' : '#fffaf0', { p: [x, 0.032, 0.03], s: [1, 0.3, 1.45] });
      Fo.add(G.sphere(0.014, 6, 4), '#fffaf0', { p: [x, 0.112, 0.08] });
    } else if (av.shoes === 'bottes') {
      Sh.add(G.cyl(0.07, 0.075, 0.16, 10), shoe, { p: [x, 0.17, 0] });
      Sh.add(G.torus(0.071, 0.016, 5, 12), tint(shoe, 0.85), { p: [x, 0.25, 0], r: [Math.PI / 2, 0, 0] });
      Fo.add(G.sphere(0.078, 10, 7), shoe, { p: [x, 0.07, 0.03], s: [0.98, 0.65, 1.4] });
      Fo.add(G.sphere(0.082, 10, 5), tint(shoe, 0.72), { p: [x, 0.03, 0.03], s: [1, 0.28, 1.45] });
    } else {
      Fo.add(G.sphere(0.066, 10, 8), skin, { p: [x, 0.06, 0.03], s: [0.92, 0.55, 1.35] });
      Fo.add(box(0.13, 0.024, 0.22, 0.01), shoe, { p: [x, 0.014, 0.03] });
      Fo.add(G.torus(0.056, 0.014, 6, 12), shoe, { p: [x, 0.07, 0.05], r: [Math.PI / 2 - 0.4, 0, 0], s: [1, 1.2, 1] });
    }
  }

  // --- accessoire (teinte au choix) ---
  const acc = av.accessory;
  const ac = CLOTH_COLORS[av.accessoryColor];
  const TA = P.on(B.TORSO, ID.limb);
  if (acc === 'echarpe') {
    TA.add(G.torus(0.1, 0.042, 6, 16), ac, { p: [0, 0.83, 0.01], r: [Math.PI / 2, 0, 0], s: [1, 0.88, 1] });
    const Sc = P.on(B.SCARF, ID.limb);
    Sc.add(box(0.075, 0.17, 0.035, 0.02), ac, { p: [0.075, 0.73, 0.15], r: [0.25, 0, 0.2] });
    Sc.add(box(0.076, 0.03, 0.037, 0.01), '#f6d78a', { p: [0.093, 0.65, 0.17], r: [0.25, 0, 0.2] });
  } else if (acc === 'bob') {
    Acc.add(G.cyl(0.36, 0.38, 0.03, 18), ac, { p: [0, HC + 0.17, -0.02], r: [-0.12, 0, 0], s: [FACE.SX, 1, 1] });
    Acc.add(G.sphere(0.27, 12, 6), ac, { p: [0, HC + 0.2, -0.04], s: [1.12, 0.72, 1.12] });
    Acc.add(G.torus(0.285, 0.022, 5, 20), CREAM, { p: [0, HC + 0.22, -0.035], r: [Math.PI / 2 - 0.12, 0, 0], s: [1.1, 1.1, 1] });
  } else if (acc === 'barrette') {
    const p = onCap(0.62, 0.17, 0.02);
    Acc.add(G.sphere(0.036, 8, 6), ac, { p: [p[0] - 0.03, p[1], p[2]], s: [1.3, 0.8, 0.5], r: [0, 0.6, 0.2] });
    Acc.add(G.sphere(0.036, 8, 6), ac, { p: [p[0] + 0.03, p[1] - 0.012, p[2] - 0.02], s: [1.3, 0.8, 0.5], r: [0, 0.6, -0.2] });
    Acc.add(G.sphere(0.018, 6, 4), '#fffaf0', { p: [p[0], p[1] - 0.006, p[2] + 0.004] });
  } else if (acc === 'lunettes') {
    const R = FACE.R + 0.026;
    for (const sx of [-1, 1]) {
      const phi = (sx * 0.098) / (FACE.R * FACE.SX);
      const ex = Math.sin(phi) * R * FACE.SX;
      const ez = Math.cos(phi) * R;
      Acc.add(G.torus(0.052, 0.008, 6, 18), tint(ac, 0.8), { p: [ex, HC - 0.012, ez], r: [0, phi, 0] });
      // branche : du bord du verre jusqu'au-dessus de l'oreille
      const a = new THREE.Vector3(sx * 0.152, HC - 0.006, 0.262);
      const b = new THREE.Vector3(sx * 0.302, HC + 0.004, -0.02);
      const len = a.distanceTo(b);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      Acc.add(G.cyl(0.006, 0.006, len, 5), tint(ac, 0.8), { p: a.clone().add(b).multiplyScalar(0.5).toArray(), r: [e.x, e.y, e.z] });
    }
    Acc.add(G.cyl(0.006, 0.006, 0.05, 5), tint(ac, 0.8), { p: [0, HC - 0.0, R + 0.002], r: [0, 0, Math.PI / 2] });
  } else if (acc === 'sac') {
    TA.add(box(0.25, 0.27, 0.12, 0.05), ac, { p: [0, 0.64, -0.205] });
    TA.add(box(0.2, 0.1, 0.03, 0.02), tint(ac, 0.85), { p: [0, 0.6, -0.27] });
    TA.add(box(0.25, 0.08, 0.13, 0.03), tint(ac, 1.12), { p: [0, 0.75, -0.2], r: [0.15, 0, 0] });
    for (const sx of [-1, 1]) TA.add(box(0.03, 0.2, 0.02, 0.008), tint(ac, 0.9), { p: [sx * 0.09, 0.71, 0.135], r: [-0.35, 0, 0] });
  }

  return P.build();
}
