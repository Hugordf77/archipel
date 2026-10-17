// Animaux des îles générées : 23 espèces dessinées par pièces (corps, tête, pattes, ailes, queue).
// Chaque pièce : { geo, pivot [x, y, z], anim, side, phase } ; le jeu les instancie (IslandFauna).
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';

// ---------------------------------------------------------------------------
// Gabarits de silhouettes. Chaque pièce : { geo, pivot [x,y,z], anim, side, phase }
// anim : 'leg' (balancier), 'head' (hoche), 'wing' (bat), 'tail' (remue), 'hop' (rien : tout le corps saute)
export function part(build, pivot, anim = 'none', side = 1, phase = 0) {
  const b = new Builder();
  build(b);
  return { geo: b.build(), pivot, anim, side, phase };
}

export function quad(o) {
  const { body, bodyS, head, headS, headAt, leg, legLen = 0.35, legR = 0.05, legX = 0.18, legZ = 0.25, extra, tail } = o;
  const y = legLen;
  const parts = [
    part((b) => {
      b.add(G.sphere(0.5, 12, 9), body, { p: [0, y + bodyS[1] * 0.5, 0], s: bodyS });
      extra?.(b, y);
    }, [0, 0, 0]),
    part((b) => {
      b.add(G.sphere(0.5, 10, 8), head, { p: [0, 0, headS[2] * 0.35], s: headS });
      o.ears?.(b);
    }, [0, y + bodyS[1] * 0.7 + (headAt?.[1] ?? 0), bodyS[2] * 0.48 + (headAt?.[2] ?? 0)], 'head'),
  ];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    parts.push(part((b) => b.add(G.cyl(legR, legR * 0.9, legLen, 5), leg, { p: [0, -legLen / 2, 0] }), [sx * legX, legLen, sz * legZ], 'leg', 1, ph));
  }
  if (tail) parts.push(part(tail, [0, y + bodyS[1] * 0.55, -bodyS[2] * 0.48], 'tail'));
  return parts;
}

// ---------------------------------------------------------------------------
// Ongulés : pièces dessinées à la main. Le pelage est teinté par animal (tint 1, sommets clairs
// multipliés par la couleur de la robe) ; yeux, museau, sabots, cornes et bois ne le sont pas.
const EYE = '#3d3049';
const _up = new THREE.Vector3(0, 1, 0);
const _z = new THREE.Vector3(0, 0, 1);

// cylindre effilé entre deux points [x, y, z]
function bone(b, color, a, c, r0, r1, sides = 8, tint = 1) {
  const va = new THREE.Vector3(...a);
  const vc = new THREE.Vector3(...c);
  const dir = vc.clone().sub(va);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir.clone().normalize()));
  const m = va.add(vc).multiplyScalar(0.5);
  b.add(G.cyl(r1, r0, dir.length(), sides), color, { p: [m.x, m.y, m.z], r: [e.x, e.y, e.z], tint });
}

// ellipsoïde (rayons rx, ry, rz)
const blob = (b, color, p, rad, opts = {}, w = 9, h = 7) => b.add(G.sphere(1, w, h), color, { p, s: rad, ...opts });

// œil rond et brillant, tourné vers l'avant et l'extérieur ; ring : liseré clair sur un visage sombre
function eye(b, x, y, z, r, ring = null) {
  const sx = Math.sign(x) || 1;
  const rot = [0, sx * 0.55, 0];
  if (ring) b.add(G.sphere(r * 1.45, 7, 5), ring, { p: [x - sx * r * 0.15, y, z - r * 0.2], s: [1, 1.1, 0.55], r: rot, tint: 0 });
  b.add(G.sphere(r, 6, 4), EYE, { p: [x, y, z], s: [1, 1.15, 0.7], r: rot, tint: 0 });
  b.add(G.sphere(r * 0.34, 5, 3), '#ffffff', { p: [x + sx * r * 0.2, y + r * 0.42, z + r * 0.62], tint: 0 });
}

// tache aplatie posée sur un ellipsoïde (centre c, rayons rad), dans la direction d
function spot(b, color, c, rad, d, size, tint = 1) {
  const dir = new THREE.Vector3(...d).normalize();
  const p = new THREE.Vector3(c[0] + rad[0] * dir.x, c[1] + rad[1] * dir.y, c[2] + rad[2] * dir.z);
  const n = new THREE.Vector3(dir.x / rad[0], dir.y / rad[1], dir.z / rad[2]).normalize();
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_z, n));
  p.addScaledVector(n, -0.012);
  b.add(G.sphere(1, 6, 4), color, { p: [p.x, p.y, p.z], s: [size[0], size[1], 0.035], r: [e.x, e.y, e.z], tint });
}

// quatre pattes (avant gauche, avant droite, arrière gauche, arrière droite, en diagonale) :
// pivot de hanche caché dans le corps, sabot posé au sol
function legs(o) {
  const { x, zf, zb, hip, color, tint = 0, r0, r1, hoof, hoofH = 0.06, front = null, back = null, joint = null } = o;
  const out = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    const pts = (sz > 0 ? front : back) || [[0, 0, 0], [0, -hip + hoofH, 0]];
    out.push(part((b) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const t0 = i / (pts.length - 1);
        const t1 = (i + 1) / (pts.length - 1);
        bone(b, color, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, 8, tint);
        if (joint === (sz > 0 ? 'front' : 'back') && i > 0) b.add(G.sphere(r0 + (r1 - r0) * t0, 5, 3), color, { p: pts[i], tint });
      }
      const f = pts[pts.length - 1];
      b.add(G.cyl(r1 * 1.12, r1 * 1.22, hoofH, 8), hoof, { p: [f[0], -hip + hoofH / 2, f[2]], tint: 0 });
    }, [sx * x, hip, sz * (sz > 0 ? zf : zb)], 'leg', 1, ph));
  }
  return out;
}

// Mouton : laine en grappe (teintée), visage et pattes ardoise, petites oreilles horizontales
function mouton() {
  const SLATE = '#4d4766';
  const body = part((b) => {
    blob(b, '#f6f1ea', [0, 0.56, -0.02], [0.37, 0.25, 0.46]);
    const wool = [[0, 0.78, 0.18, 0.16], [0, 0.8, -0.12, 0.17], [0.25, 0.72, 0.16, 0.16], [-0.25, 0.72, 0.16, 0.16], [0.26, 0.72, -0.2, 0.16], [-0.26, 0.72, -0.2, 0.16],
      [0.33, 0.54, -0.02, 0.16], [-0.33, 0.54, -0.02, 0.16], [0, 0.62, -0.4, 0.16], [0, 0.6, 0.34, 0.15]];
    wool.forEach(([x, y, z, r], i) => b.add(G.sphere(r, 6, 4), i % 2 ? '#ffffff' : '#f1ece5', { p: [x, y, z] }));
  }, [0, 0, 0]);
  const head = part((b) => {
    b.add(G.sphere(0.15, 7, 5), '#f4efe8', { p: [0, 0.04, 0.12] }); // collerette de laine
    blob(b, SLATE, [0, -0.01, 0.32], [0.15, 0.16, 0.2], { tint: 0 });
    blob(b, '#5f5672', [0, -0.08, 0.47], [0.11, 0.09, 0.09], { tint: 0 }, 7, 5);
    b.add(G.sphere(0.12, 7, 5), '#ffffff', { p: [0, 0.13, 0.27] }); // toupet
    for (const sx of [-1, 1]) {
      blob(b, SLATE, [sx * 0.18, 0.05, 0.26], [0.11, 0.035, 0.06], { tint: 0 }, 6, 4);
      eye(b, sx * 0.1, 0.03, 0.43, 0.032, '#efe6da');
    }
  }, [0, 0.62, 0.3], 'head');
  // pas de queue : une boule détourée sur la laine se lisait comme un anneau
  return [body, head, ...legs({ x: 0.17, zf: 0.24, zb: -0.24, hip: 0.43, color: SLATE, r0: 0.055, r1: 0.045, hoof: '#3a3346' })];
}

// Chèvre : dos droit, cornes recourbées vers l'arrière, barbichette, oreilles tombantes
function chevre() {
  const HORN = '#9c8a74';
  const body = part((b) => {
    b.add(G.box(0.5, 0.34, 0.78, 0.12, 1), '#ffffff', { p: [0, 0.63, -0.02] });
    blob(b, '#ffffff', [0, 0.6, 0.3], [0.21, 0.17, 0.16], {}, 7, 5);
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.16, 0.2], 0.1, 0.075);
    blob(b, '#ffffff', [0, 0.18, 0.33], [0.11, 0.12, 0.16], { r: [0.3, 0, 0] });
    blob(b, '#f1ebe3', [0, 0.11, 0.47], [0.075, 0.07, 0.09], {}, 7, 5);
    b.add(G.cone(0.035, 0.12, 6), '#ece6dd', { p: [0, 0.0, 0.44], r: [Math.PI + 0.25, 0, 0] }); // barbichette
    for (const sx of [-1, 1]) {
      const h = [[sx * 0.045, 0.28, 0.32], [sx * 0.06, 0.39, 0.27], [sx * 0.075, 0.45, 0.17], [sx * 0.08, 0.43, 0.08]];
      for (let i = 0; i < 3; i++) bone(b, HORN, h[i], h[i + 1], 0.026 - i * 0.006, 0.02 - i * 0.006, 6, 0);
      blob(b, '#ffffff', [sx * 0.2, 0.18, 0.29], [0.14, 0.035, 0.05], { r: [0, 0, sx * -0.6] }, 6, 4);
      eye(b, sx * 0.075, 0.22, 0.42, 0.028);
    }
  }, [0, 0.6, 0.3], 'head');
  const tail = part((b) => b.add(G.cone(0.04, 0.13, 6), '#ffffff', { p: [0, 0.05, -0.02], r: [-0.5, 0, 0] }), [0, 0.76, -0.41], 'tail');
  return [body, head, ...legs({ x: 0.14, zf: 0.27, zb: -0.28, hip: 0.52, color: '#e9e2d8', tint: 1, r0: 0.042, r1: 0.034, hoof: '#4a3f3a',
    front: [[0, 0, 0], [0, -0.25, 0.02], [0, -0.46, 0]], back: [[0, 0, 0], [0, -0.22, -0.06], [0, -0.46, 0]] }), tail];
}

// Vache : corps massif crème, taches (teintées), museau rose poudré, cornes courtes, clochette
function vache() {
  const CREAM = '#f4e7cf';
  const C = [0, 0.6, -0.02];
  const R = [0.36, 0.25, 0.55];
  const body = part((b) => {
    blob(b, CREAM, C, R, { tint: 0 });
    const spots = [[[0.85, 0.45, 0.25], [0.2, 0.14]], [[-0.9, 0.3, -0.25], [0.18, 0.16]], [[0.25, 0.92, -0.35], [0.17, 0.13]], [[-0.4, 0.7, 0.55], [0.14, 0.12]], [[0.7, 0.15, -0.7], [0.15, 0.12]]];
    for (const [d, sz] of spots) spot(b, '#ffffff', C, R, d, sz);
    blob(b, '#f1b9b0', [0, 0.37, -0.24], [0.11, 0.08, 0.12], { tint: 0 }, 6, 4); // pis
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, CREAM, [0, 0, 0], [0, 0, 0.18], 0.17, 0.15, 8, 0);
    blob(b, CREAM, [0, 0.02, 0.3], [0.2, 0.19, 0.24], { tint: 0 });
    blob(b, '#f2c7bd', [0, -0.08, 0.5], [0.16, 0.11, 0.1], { tint: 0 }, 7, 5);
    spot(b, '#ffffff', [0, 0.02, 0.3], [0.2, 0.19, 0.24], [0.55, 0.45, 0.7], [0.08, 0.07]);
    b.add(G.torus(0.16, 0.018, 3, 10), '#9f6b48', { p: [0, -0.03, 0.12], tint: 0 }); // collier
    b.add(G.cyl(0.035, 0.06, 0.08, 8), '#e8b84a', { p: [0, -0.21, 0.13], tint: 0 }); // clochette
    for (const sx of [-1, 1]) {
      b.add(G.sphere(0.022, 6, 4), '#7a5a55', { p: [sx * 0.05, -0.07, 0.595], tint: 0 }); // naseaux
      const h = [[sx * 0.13, 0.17, 0.27], [sx * 0.22, 0.24, 0.28], [sx * 0.25, 0.32, 0.24]];
      for (let i = 0; i < 2; i++) bone(b, '#f3e6c8', h[i], h[i + 1], 0.03 - i * 0.01, 0.02 - i * 0.008, 6, 0);
      blob(b, CREAM, [sx * 0.22, 0.08, 0.25], [0.11, 0.045, 0.07], { tint: 0 }, 6, 4);
      eye(b, sx * 0.13, 0.07, 0.44, 0.035);
    }
  }, [0, 0.66, 0.46], 'head');
  const tail = part((b) => {
    bone(b, CREAM, [0, 0, 0], [0, -0.38, -0.06], 0.02, 0.016, 6, 0);
    b.add(G.sphere(0.05, 6, 4), '#ffffff', { p: [0, -0.42, -0.065], s: [1, 1.6, 1] });
  }, [0, 0.74, -0.56], 'tail');
  return [body, head, ...legs({ x: 0.18, zf: 0.3, zb: -0.32, hip: 0.5, color: '#ecdcbf', r0: 0.075, r1: 0.065, hoof: '#4a3f3a', hoofH: 0.07 }), tail];
}

// Cerf : cou long dressé, museau allongé, bois ramifiés, croupe blanche, jarrets marqués
function cerf() {
  const BONE = '#ead7b4';
  const body = part((b) => {
    blob(b, '#ffffff', [0, 0.78, -0.02], [0.21, 0.2, 0.44]);
    blob(b, '#f3e6cf', [0, 0.69, 0], [0.17, 0.12, 0.34], { tint: 0 }, 7, 5); // ventre clair
    blob(b, '#fbf3e6', [0, 0.8, -0.43], [0.15, 0.15, 0.08], { tint: 0 }, 7, 5); // croupe blanche
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.3, 0.32], 0.11, 0.07);
    blob(b, '#ffffff', [0, 0.36, 0.45], [0.1, 0.11, 0.15], { r: [0.25, 0, 0] });
    blob(b, '#efe6dc', [0, 0.31, 0.62], [0.065, 0.065, 0.11], {}, 7, 5);
    b.add(G.sphere(0.03, 6, 4), EYE, { p: [0, 0.31, 0.73], tint: 0 }); // truffe
    for (const sx of [-1, 1]) {
      blob(b, '#ffffff', [sx * 0.13, 0.46, 0.38], [0.1, 0.04, 0.05], { r: [0, 0, sx * 0.5] }, 6, 4);
      eye(b, sx * 0.08, 0.39, 0.53, 0.028);
      // bois : merrain à trois segments et quatre andouillers
      const m = [[sx * 0.05, 0.45, 0.42], [sx * 0.15, 0.6, 0.36], [sx * 0.21, 0.76, 0.27], [sx * 0.23, 0.9, 0.19]];
      for (let i = 0; i < 3; i++) bone(b, BONE, m[i], m[i + 1], 0.024 - i * 0.005, 0.019 - i * 0.005, 5, 0);
      for (const [a, c] of [[m[1], [sx * 0.17, 0.68, 0.5]], [m[2], [sx * 0.29, 0.86, 0.33]], [m[3], [sx * 0.18, 0.99, 0.15]], [m[3], [sx * 0.3, 0.97, 0.14]]]) bone(b, BONE, a, c, 0.014, 0.008, 5, 0);
    }
  }, [0, 0.8, 0.32], 'head');
  const tail = part((b) => b.add(G.sphere(1, 6, 4), '#ffffff', { p: [0, 0, -0.03], s: [0.05, 0.08, 0.04] }), [0, 0.86, -0.46], 'tail');
  return [body, head, ...legs({ x: 0.1, zf: 0.26, zb: -0.28, hip: 0.74, color: '#e3d8cd', tint: 1, r0: 0.046, r1: 0.03, hoof: '#3d3330', hoofH: 0.05, joint: 'back',
    front: [[0, 0, 0], [0, -0.38, 0.02], [0, -0.69, 0]], back: [[0, 0, 0], [0, -0.33, -0.1], [0, -0.69, -0.02]] }), tail];
}

export const SPECIES = {
  // Ongulés refaits (catalogue ANI-001 à ANI-004) : visage, cou porté par la pièce « head »,
  // pattes à sabots, robes teintées par animal. graze : angle de broutage (rad), muzzle : bout du
  // museau dans le repère de la tête, top : haut de la tête (m, avant l'échelle) pour le cœur.
  mouton: {
    speed: 0.6, scale: 1, shadow: true, graze: 1.0, muzzle: [0, -0.1, 0.55], top: 1.0,
    coats: [['Blanc', '#fbf7f2'], ['Noir', '#5a5160']],
    parts: () => mouton(),
  },
  chevre: {
    speed: 0.9, scale: 0.9, shadow: true, graze: 1.2, muzzle: [0, 0.1, 0.56], top: 1.2,
    coats: [['Crème', '#f3ead9'], ['Alpine brune', '#a9784f'], ['Noire', '#544a4e']],
    parts: () => chevre(),
  },
  vache: {
    speed: 0.45, scale: 1.4, shadow: true, graze: 1.12, muzzle: [0, -0.1, 0.6], top: 1.0,
    coats: [['Pie brune', '#7a5440'], ['Pie noire', '#3b3340'], ['Pie rouge', '#b8643c']],
    parts: () => vache(),
  },
  cerf: {
    speed: 1.4, scale: 1.2, shadow: true, shy: 7, graze: 1.2, muzzle: [0, 0.3, 0.74], top: 1.85,
    coats: [["Fauve d'été", '#c98f5f'], ["Brun d'hiver", '#8d6a52']],
    parts: () => cerf(),
  },
  renard: {
    speed: 1.2, scale: 0.75, shadow: true, shy: 6,
    parts: () => quad({
      body: '#f39c4a', bodyS: [0.42, 0.42, 0.9], head: '#f39c4a', headS: [0.3, 0.28, 0.38], leg: '#5b4a63', legLen: 0.28,
      ears: (b) => { for (const sx of [-1, 1]) b.add(G.cone(0.07, 0.18, 4), '#f39c4a', { p: [sx * 0.1, 0.17, 0] }); b.add(G.sphere(0.08, 6, 4), '#fbf7f2', { p: [0, -0.05, 0.2], s: [1, 0.7, 1] }); },
      tail: (b) => { b.add(G.sphere(0.16, 8, 6), '#f39c4a', { p: [0, 0.05, -0.25], s: [0.9, 0.9, 2] }); b.add(G.sphere(0.1, 6, 4), '#fbf7f2', { p: [0, 0.08, -0.55] }); },
    }),
  },
  lapin: {
    speed: 1.6, scale: 0.5, hop: true, shy: 5,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 10, 8), '#e6d6c2', { p: [0, 0.32, 0], s: [0.5, 0.48, 0.66] }); b.add(G.sphere(0.12, 6, 4), '#fffaf0', { p: [0, 0.38, -0.33] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.2, 10, 8), '#e6d6c2', { p: [0, 0, 0.08] }); for (const sx of [-1, 1]) b.add(G.sphere(0.08, 6, 5), '#e6d6c2', { p: [sx * 0.08, 0.27, 0], s: [0.6, 2.1, 0.5] }); }, [0, 0.55, 0.28], 'head'),
    ],
  },
  herisson: {
    speed: 0.35, scale: 0.6,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 10, 7), '#8a6a5c', { p: [0, 0.18, 0], s: [0.5, 0.36, 0.62] }); for (let k = 0; k < 14; k++) b.add(G.cone(0.05, 0.16, 4), '#5b4a5a', { p: [Math.cos(k * 1.7) * 0.18, 0.3 + (k % 3) * 0.04, Math.sin(k * 2.3) * 0.22], r: [Math.sin(k) * 0.6, 0, Math.cos(k) * 0.6] }); }, [0, 0, 0]),
      part((b) => { b.add(G.cone(0.12, 0.22, 8), '#e6d6c2', { p: [0, 0, 0.08], r: [Math.PI / 2, 0, 0] }); b.add(G.sphere(0.03, 5, 4), '#3d3049', { p: [0, 0, 0.2] }); }, [0, 0.16, 0.3], 'head'),
    ],
  },
  ecureuil: {
    speed: 1.5, scale: 0.4, hop: true, shy: 5,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 10, 8), '#d4734a', { p: [0, 0.35, 0], s: [0.42, 0.55, 0.5] }); b.add(G.sphere(0.24, 8, 6), '#d4734a', { p: [0, 0.75, -0.35], s: [0.8, 1.6, 0.9] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.17, 10, 8), '#d4734a', {}); for (const sx of [-1, 1]) b.add(G.cone(0.05, 0.12, 4), '#d4734a', { p: [sx * 0.08, 0.16, 0] }); }, [0, 0.72, 0.15], 'head'),
    ],
  },
  tortue: {
    speed: 0.2, scale: 0.8,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 12, 8), '#7fb88a', { p: [0, 0.18, 0], s: [0.75, 0.42, 0.95] }); for (let k = 0; k < 5; k++) b.add(G.sphere(0.12, 6, 4), '#9fd09a', { p: [Math.cos(k * 1.25) * 0.15, 0.36, Math.sin(k * 1.25) * 0.2], s: [1, 0.3, 1] }); for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(G.sphere(0.08, 6, 4), '#c6d6a0', { p: [sx * 0.3, 0.08, sz * 0.32], s: [1.2, 0.6, 1.4] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.11, 8, 6), '#c6d6a0', { p: [0, 0, 0.06] }); }, [0, 0.15, 0.45], 'head'),
    ],
  },
  crabe: {
    speed: 0.7, scale: 0.6, sideways: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.2, 10, 7), '#f49d86', { p: [0, 0.14, 0], s: [1.25, 0.62, 1] }); for (const sx of [-1, 1]) { b.add(G.cyl(0.018, 0.018, 0.12, 5), '#f49d86', { p: [sx * 0.07, 0.25, 0.1] }); b.add(G.sphere(0.035, 6, 4), '#fffaf0', { p: [sx * 0.07, 0.32, 0.1] }); b.add(G.sphere(0.08, 8, 6), '#f49d86', { p: [sx * 0.3, 0.15, 0.14], s: [1, 0.7, 1.2] }); } }, [0, 0, 0]),
      ...[-1, 1].flatMap((sx) => [0, 1, 2].map((k) => part((b) => b.add(G.cyl(0.015, 0.012, 0.18, 4), '#e07a64', { p: [sx * 0.09, -0.04, 0], r: [0, 0, sx * 1.0] }), [sx * 0.18, 0.12, -0.08 + k * 0.08], 'leg', sx, k * 1.7))),
    ],
  },
  mouette: {
    speed: 4, scale: 0.9, fly: 'circle', height: 9,
    parts: () => birdParts('#fbf7f2', '#d8dce8', '#f6b45e'),
  },
  perroquet: {
    speed: 3.5, scale: 0.7, fly: 'circle', height: 7,
    parts: () => birdParts('#e8705f', '#5b9fd8', '#f6d27a', '#7fc48b'),
  },
  flamant: {
    speed: 0.3, scale: 1.1, wade: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.25, 10, 8), '#f4a2b4', { p: [0, 1.05, 0], s: [0.9, 0.7, 1.4] }); b.add(G.cyl(0.02, 0.02, 0.9, 4), '#f08aa0', { p: [0, 0.48, 0] }); b.add(G.cyl(0.02, 0.02, 0.5, 4), '#f08aa0', { p: [0.06, 0.8, 0.05], r: [1.2, 0, 0] }); }, [0, 0, 0]),
      part((b) => { b.add(G.cyl(0.03, 0.035, 0.7, 5), '#f4a2b4', { p: [0, 0.35, 0], r: [0.25, 0, 0] }); b.add(G.sphere(0.08, 8, 6), '#f4a2b4', { p: [0, 0.72, 0.12] }); b.add(G.cone(0.03, 0.12, 5), '#3d3049', { p: [0, 0.68, 0.22], r: [2.2, 0, 0] }); }, [0, 1.12, 0.25], 'head'),
    ],
  },
  canard: {
    speed: 0.6, scale: 0.6, swim: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.3, 10, 8), '#f6ead2', { p: [0, 0.1, 0], s: [0.8, 0.6, 1.2] }); b.add(G.cone(0.08, 0.14, 4), '#f6ead2', { p: [0, 0.2, -0.33], r: [-1.2, 0, 0] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.13, 8, 6), '#3f8f8a', {}); b.add(G.cone(0.05, 0.14, 6), '#f6b45e', { p: [0, -0.02, 0.15], r: [Math.PI / 2, 0, 0], s: [1.3, 1, 0.6] }); }, [0, 0.38, 0.22], 'head'),
    ],
  },
  grenouille: {
    speed: 1.2, scale: 0.35, hop: true,
    parts: () => [part((b) => { b.add(G.sphere(0.3, 10, 8), '#8fc79a', { p: [0, 0.18, 0], s: [1, 0.65, 1.1] }); for (const sx of [-1, 1]) { b.add(G.sphere(0.08, 8, 6), '#fffaf0', { p: [sx * 0.12, 0.38, 0.12] }); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [sx * 0.12, 0.4, 0.18] }); b.add(G.sphere(0.12, 6, 4), '#7fbf86', { p: [sx * 0.24, 0.08, -0.1], s: [0.8, 0.5, 1.4] }); } }, [0, 0, 0])],
  },
  poisson: {
    speed: 1.0, scale: 0.6, fish: true,
    parts: () => [part((b) => { b.add(G.sphere(0.25, 8, 6), '#f39c6b', { s: [0.6, 0.8, 1.4] }); b.add(G.cone(0.14, 0.2, 4), '#f6c08a', { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [0.3, 1, 1] }); }, [0, 0, 0], 'tail')],
  },
  papillon: {
    speed: 1.2, scale: 1, insect: 'flutter', height: 1.1,
    parts: () => [
      part((b) => b.add(G.cyl(0.015, 0.015, 0.12, 4), '#5b4a63', { r: [Math.PI / 2, 0, 0] }), [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.07, 6, 4), '#f6d27a', { p: [0.07, 0, 0.02], s: [1.2, 0.1, 1] }); b.add(G.sphere(0.05, 6, 4), '#f4a2b4', { p: [0.06, 0, -0.05], s: [1, 0.1, 1] }); }, [0.01, 0, 0], 'wing', 1),
      part((b) => { b.add(G.sphere(0.07, 6, 4), '#f6d27a', { p: [-0.07, 0, 0.02], s: [1.2, 0.1, 1] }); b.add(G.sphere(0.05, 6, 4), '#f4a2b4', { p: [-0.06, 0, -0.05], s: [1, 0.1, 1] }); }, [-0.01, 0, 0], 'wing', -1),
    ],
  },
  abeille: {
    speed: 1.6, scale: 1, insect: 'buzz', height: 1.0,
    parts: () => [
      part((b) => { b.add(G.sphere(0.05, 6, 4), '#f6c46d', { s: [0.9, 0.9, 1.3] }); b.add(G.torus(0.045, 0.012, 4, 8), '#5b4a63', { r: [0, 0, 0] }); }, [0, 0, 0]),
      part((b) => b.add(G.sphere(0.035, 5, 3), '#fbfbff', { p: [0.03, 0.02, 0], s: [1.2, 0.2, 0.8] }), [0.02, 0.03, 0], 'wing', 1),
      part((b) => b.add(G.sphere(0.035, 5, 3), '#fbfbff', { p: [-0.03, 0.02, 0], s: [1.2, 0.2, 0.8] }), [-0.02, 0.03, 0], 'wing', -1),
    ],
  },
  luciole: { speed: 0.6, scale: 1, insect: 'glow', glow: [0xe9f5a0, 0.5], height: 1.4, night: true, parts: () => [] },
  phoque: {
    speed: 0.3, scale: 1,
    parts: () => [
      part((b) => { b.add(G.sphere(0.4, 12, 8), '#bcc8d8', { p: [0, 0.28, 0], s: [0.9, 0.7, 1.9] }); b.add(G.cone(0.2, 0.3, 6), '#a9b6c8', { p: [0, 0.18, -0.85], r: [-Math.PI / 2, 0, 0], s: [1.4, 1, 0.4] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.24, 10, 8), '#bcc8d8', {}); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [0.09, 0.06, 0.2] }); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [-0.09, 0.06, 0.2] }); }, [0, 0.5, 0.65], 'head'),
    ],
  },
  pingouin: {
    speed: 0.5, scale: 0.8, waddle: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.3, 10, 8), '#4d4766', { p: [0, 0.4, 0], s: [0.85, 1.4, 0.8] }); b.add(G.sphere(0.27, 10, 8), '#fbf7f2', { p: [0, 0.38, 0.06], s: [0.75, 1.25, 0.7] }); for (const sx of [-1, 1]) b.add(G.sphere(0.07, 6, 4), '#f6b45e', { p: [sx * 0.1, 0.02, 0.08], s: [1, 0.4, 1.6] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.17, 10, 8), '#4d4766', {}); b.add(G.cone(0.04, 0.14, 5), '#f6b45e', { p: [0, -0.02, 0.17], r: [Math.PI / 2, 0, 0] }); }, [0, 0.85, 0.02], 'head'),
    ],
  },
  lezard: {
    speed: 1.0, scale: 0.6,
    parts: () => [part((b) => { b.add(G.sphere(0.2, 8, 6), '#9fd09a', { p: [0, 0.08, 0], s: [0.7, 0.4, 1.6] }); b.add(G.cone(0.08, 0.5, 5), '#9fd09a', { p: [0, 0.06, -0.5], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.5] }); b.add(G.sphere(0.1, 8, 6), '#9fd09a', { p: [0, 0.1, 0.36], s: [1, 0.7, 1.3] }); for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(G.sphere(0.04, 5, 4), '#7fbf86', { p: [sx * 0.15, 0.04, sz * 0.15], s: [1.6, 0.5, 0.6] }); }, [0, 0, 0], 'tail')],
  },
  escargot: {
    speed: 0.12, scale: 1,
    parts: () => [part((b) => { b.add(G.sphere(0.2, 8, 6), '#e6d6c2', { p: [0, 0.08, 0.1], s: [0.8, 0.5, 2] }); b.add(G.torus(0.18, 0.1, 8, 14), '#c7b2e6', { p: [0, 0.32, -0.05], r: [0, Math.PI / 2, 0] }); b.add(G.sphere(0.12, 8, 6), '#e2a5c9', { p: [0, 0.32, -0.05] }); for (const sx of [-1, 1]) b.add(G.cyl(0.012, 0.012, 0.18, 4), '#e6d6c2', { p: [sx * 0.05, 0.2, 0.42], r: [0.4, 0, 0] }); }, [0, 0, 0])],
  },
};

export function birdParts(body, wing, beak, wing2 = null) {
  return [
    part((b) => { b.add(G.sphere(0.22, 10, 8), body, { s: [0.8, 0.75, 1.5] }); b.add(G.sphere(0.15, 8, 6), body, { p: [0, 0.1, 0.28] }); b.add(G.cone(0.05, 0.14, 5), beak, { p: [0, 0.08, 0.45], r: [Math.PI / 2, 0, 0] }); b.add(G.cone(0.12, 0.25, 4), wing, { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.3] }); }, [0, 0, 0]),
    part((b) => b.add(G.sphere(0.5, 10, 6), wing, { p: [0.42, 0, 0], s: [1, 0.08, 0.32] }), [0.12, 0.02, 0], 'wing', 1),
    part((b) => b.add(G.sphere(0.5, 10, 6), wing2 || wing, { p: [-0.42, 0, 0], s: [1, 0.08, 0.32] }), [-0.12, 0.02, 0], 'wing', -1),
  ];
}
