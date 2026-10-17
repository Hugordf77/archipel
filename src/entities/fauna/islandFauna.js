// Faune des îles générées : 23 espèces dessinées par pièces instanciées (une
// géométrie par pièce, un appel de dessin par pièce et par espèce). Comportements
// simples et paisibles : errer, brouter, s'écarter du joueur, dormir, voler, nager.
// Coordonnées absolues (les maillages vivent dans le groupe racine du monde).
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial, glowMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW, U } from '../../core/globals.js';
import { mulberry32 } from '../../core/random.js';
import { SPECIES_LABEL } from '../../world/islands/gen/spawns.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------------------------------------------------------------------------
// Gabarits de silhouettes. Chaque pièce : { geo, pivot [x,y,z], anim, side, phase }
// anim : 'leg' (balancier), 'head' (hoche), 'wing' (bat), 'tail' (remue), 'hop' (rien : tout le corps saute)
function part(build, pivot, anim = 'none', side = 1, phase = 0) {
  const b = new Builder();
  build(b);
  return { geo: b.build(), pivot, anim, side, phase };
}

function quad(o) {
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

const SPECIES = {
  mouton: {
    speed: 0.6, scale: 1, shadow: true,
    parts: () => quad({
      body: '#fbf7f2', bodyS: [0.75, 0.6, 1.0], head: '#4d4766', headS: [0.32, 0.34, 0.42], leg: '#4d4766', legLen: 0.32,
      extra: (b, y) => { for (let k = 0; k < 8; k++) b.add(G.sphere(0.22, 7, 5), '#ffffff', { p: [Math.cos(k * 0.8) * 0.26, y + 0.48 + (k % 2) * 0.08, Math.sin(k * 1.3) * 0.38] }); },
      ears: (b) => { for (const sx of [-1, 1]) b.add(G.sphere(0.07, 6, 4), '#4d4766', { p: [sx * 0.18, 0.05, 0.1], s: [1.6, 0.6, 0.8] }); },
    }),
  },
  chevre: {
    speed: 0.9, scale: 0.9, shadow: true,
    parts: () => quad({
      body: '#e8dcc8', bodyS: [0.55, 0.5, 0.95], head: '#e8dcc8', headS: [0.26, 0.3, 0.42], leg: '#b59a7a', legLen: 0.42, headAt: [0, 0.12, 0],
      ears: (b) => { for (const sx of [-1, 1]) b.add(G.cone(0.04, 0.25, 5), '#8a7a6a', { p: [sx * 0.08, 0.2, 0.02], r: [-0.5, 0, sx * 0.3] }); b.add(G.cone(0.04, 0.12, 5), '#fbf7f2', { p: [0, -0.18, 0.18], r: [Math.PI, 0, 0] }); },
      tail: (b) => b.add(G.cone(0.05, 0.14, 5), '#e8dcc8', { p: [0, 0.05, 0], r: [-2.2, 0, 0] }),
    }),
  },
  vache: {
    speed: 0.45, scale: 1.4, shadow: true,
    parts: () => quad({
      body: '#fbf7f2', bodyS: [0.7, 0.62, 1.25], head: '#fbf7f2', headS: [0.36, 0.38, 0.48], leg: '#fbf7f2', legLen: 0.45, legZ: 0.38,
      extra: (b, y) => { b.add(G.sphere(0.22, 8, 6), '#8a6a5c', { p: [0.3, y + 0.4, 0.15], s: [0.4, 1, 1.4] }); b.add(G.sphere(0.2, 8, 6), '#8a6a5c', { p: [-0.32, y + 0.35, -0.3], s: [0.4, 1, 1.2] }); },
      ears: (b) => { for (const sx of [-1, 1]) b.add(G.cone(0.035, 0.16, 5), '#f6ead2', { p: [sx * 0.14, 0.2, 0.0], r: [0, 0, sx * -0.9] }); b.add(G.sphere(0.13, 8, 6), '#f4b4c6', { p: [0, -0.05, 0.38], s: [1.2, 0.8, 0.6] }); },
      tail: (b) => b.add(G.cyl(0.02, 0.02, 0.5, 4), '#8a6a5c', { p: [0, -0.25, -0.02] }),
    }),
  },
  cerf: {
    speed: 1.4, scale: 1.2, shadow: true, shy: 7,
    parts: () => quad({
      body: '#c98f5f', bodyS: [0.5, 0.55, 1.05], head: '#c98f5f', headS: [0.26, 0.3, 0.44], leg: '#9f6b48', legLen: 0.62, headAt: [0, 0.25, 0.05],
      extra: (b, y) => b.add(G.sphere(0.18, 8, 6), '#fbf3e6', { p: [0, y + 0.4, -0.5], s: [1, 1, 0.5] }),
      ears: (b) => { for (const sx of [-1, 1]) { b.add(G.cyl(0.025, 0.03, 0.45, 5), '#e0b07e', { p: [sx * 0.12, 0.35, -0.02], r: [0, 0, sx * -0.35] }); b.add(G.cyl(0.02, 0.025, 0.2, 5), '#e0b07e', { p: [sx * 0.22, 0.48, 0.05], r: [0.6, 0, sx * -0.8] }); } },
    }),
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
  luciole: { speed: 0.6, scale: 1, insect: 'glow', height: 1.4, night: true, parts: () => [] },
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

function birdParts(body, wing, beak, wing2 = null) {
  return [
    part((b) => { b.add(G.sphere(0.22, 10, 8), body, { s: [0.8, 0.75, 1.5] }); b.add(G.sphere(0.15, 8, 6), body, { p: [0, 0.1, 0.28] }); b.add(G.cone(0.05, 0.14, 5), beak, { p: [0, 0.08, 0.45], r: [Math.PI / 2, 0, 0] }); b.add(G.cone(0.12, 0.25, 4), wing, { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.3] }); }, [0, 0, 0]),
    part((b) => b.add(G.sphere(0.5, 10, 6), wing, { p: [0.42, 0, 0], s: [1, 0.08, 0.32] }), [0.12, 0.02, 0], 'wing', 1),
    part((b) => b.add(G.sphere(0.5, 10, 6), wing2 || wing, { p: [-0.42, 0, 0], s: [1, 0.08, 0.32] }), [-0.12, 0.02, 0], 'wing', -1),
  ];
}

// ---------------------------------------------------------------------------
export class IslandFauna {
  constructor(game) {
    this.game = game;
    this.root = game.world.root;
    this.mat = toonMaterial({ vertexColors: true, aId: true, rim: 1.0, outline: 0.6 });
    this.glow = glowMaterial(0xe9f5a0, 0.5);
    this.kinds = new Map(); // espèce → { def, meshes, count, capacity }
    this.animals = [];
    this.byIsland = new Map();
    this._m = new THREE.Matrix4();
    this._p = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this.hearts = [];
    this.t = 0;
  }

  kind(sp) {
    let k = this.kinds.get(sp);
    if (k) return k;
    const def = SPECIES[sp];
    if (!def) return null;
    const parts = def.parts();
    const capacity = 64;
    k = { def, parts, capacity, meshes: [], count: 0 };
    if (def.insect === 'glow') {
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.glow, capacity);
      im.frustumCulled = false;
      im.count = 0;
      im.renderOrder = 10;
      this.root.add(im);
      k.meshes.push(im);
    } else {
      for (const p of parts) {
        const im = new THREE.InstancedMesh(p.geo, this.mat, capacity);
        im.frustumCulled = false;
        im.count = 0;
        if (def.shadow) im.layers.enable(LAYER_SHADOW);
        this.root.add(im);
        k.meshes.push(im);
      }
    }
    this.kinds.set(sp, k);
    return k;
  }

  // arrivée d'une île au premier plan : ses animaux apparaissent autour de leurs points d'apparition
  addIsland(entry) {
    if (this.byIsland.has(entry.desc.id)) return;
    const plan = entry.plan;
    const list = [];
    const rng = mulberry32(entry.desc.seed ^ 0xa11);
    for (const sp of plan.spawners) {
      const def = SPECIES[sp.sp];
      if (!def) continue;
      for (let i = 0; i < sp.count; i++) {
        const a = rng() * Math.PI * 2;
        const d = rng() * sp.r * 0.6;
        const hx = entry.desc.x + sp.x;
        const hz = entry.desc.z + sp.z;
        const an = {
          sp: sp.sp, def, entry, home: { x: hx, z: hz, r: sp.r },
          x: hx + Math.cos(a) * d, z: hz + Math.sin(a) * d, y: 0, heading: rng() * 6.28,
          state: 'idle', t: rng() * 3, target: null, phase: rng() * 10, speed: 0, petT: 0, hop: 0,
          angle: rng() * 6.28, radius: sp.r * (0.5 + rng() * 0.5), seed: rng(),
        };
        an.y = this.groundY(an);
        list.push(an);
        this.animals.push(an);
      }
    }
    this.byIsland.set(entry.desc.id, list);
  }

  removeIsland(id) {
    const list = this.byIsland.get(id);
    if (!list) return;
    const set = new Set(list);
    this.animals = this.animals.filter((a) => !set.has(a));
    this.byIsland.delete(id);
  }

  groundY(an) {
    const im = this.game.islands;
    const g = im.heightAt(an.x, an.z) ?? -16;
    if (an.def.swim || an.def.fish) {
      const w = im.waterLevelAt(an.x, an.z);
      return an.def.fish ? Math.max(g + 0.2, w - 0.45) : w;
    }
    return g;
  }

  // peut-on se poser là ? (terre ferme pour les marcheurs, eau pour les nageurs)
  okAt(an, x, z) {
    const im = this.game.islands;
    const g = im.heightAt(x, z);
    if (g === null) return false;
    const w = im.waterLevelAt(x, z);
    if (an.def.swim || an.def.fish) return w - g > (an.def.fish ? 0.5 : 0.25);
    if (an.def.wade) return w - g < 0.5;
    return g > 0.35 && w - g < 0.05;
  }

  update(dt, player) {
    this.t += dt;
    const night = U.uNight.value > 0.55;
    const P = player.pos;
    for (const k of this.kinds.values()) k.count = 0;
    for (const an of this.animals) {
      const dx = an.x - P.x;
      const dz = an.z - P.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 200) continue;
      const full = dist < 80;
      // simplifié au loin : un pas de simulation sur quatre
      if (full || ((this.t * 60) | 0) % 4 === 0) this.behave(an, full ? dt : dt * 4, dist, dx, dz, night);
      this.draw(an, full);
    }
    for (const k of this.kinds.values()) {
      for (const im of k.meshes) {
        im.count = k.count;
        im.instanceMatrix.needsUpdate = true;
      }
    }
    this.updateHearts(dt);
  }

  behave(an, dt, dist, dx, dz, night) {
    const def = an.def;
    an.t -= dt;
    an.phase += dt * (1 + an.speed * 3);
    if (def.fly || def.insect) {
      // vol : cercle autour du point d'attache, légère houle
      const dir = an.seed > 0.5 ? 1 : -1;
      an.angle += dt * (def.speed / Math.max(2, an.radius)) * dir;
      const cx = an.home.x;
      const cz = an.home.z;
      const wob = def.insect ? Math.sin(this.t * 2.3 + an.seed * 20) * 0.6 : 0;
      an.x = cx + Math.cos(an.angle) * (an.radius + wob);
      an.z = cz + Math.sin(an.angle) * (an.radius + wob);
      const g = this.game.islands.heightAt(an.x, an.z) ?? 0;
      an.y = Math.max(0, g) + (def.height || 6) + Math.sin(this.t * 0.8 + an.seed * 9) * (def.insect ? 0.3 : 1.2);
      an.heading = an.angle + (dir > 0 ? 0 : Math.PI);
      an.speed = 1;
      return;
    }
    // la nuit, les animaux de jour dorment (sauf les nocturnes)
    if (night && !def.night && an.state !== 'flee') {
      an.state = 'sleep';
      an.speed = 0;
      return;
    }
    if (an.state === 'sleep' && !night) an.state = 'idle';
    // s'écarter doucement si le joueur arrive trop vite ou trop près
    const shy = def.shy || 2.4;
    if (dist < shy && an.petT <= 0 && this.game.player.vel.lengthSq() > 2) {
      an.state = 'flee';
      an.t = 1.5;
      const l = dist || 1;
      an.target = { x: an.x + (dx / l) * 6, z: an.z + (dz / l) * 6 };
    }
    if (an.petT > 0) {
      an.petT -= dt;
      an.speed = 0;
      return;
    }
    if (an.state === 'idle' && an.t <= 0) {
      // nouvelle balade dans le rayon d'errance
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * an.home.r;
      const tx = an.home.x + Math.cos(a) * d;
      const tz = an.home.z + Math.sin(a) * d;
      if (this.okAt(an, tx, tz)) {
        an.target = { x: tx, z: tz };
        an.state = 'walk';
      }
      an.t = 2 + Math.random() * 4;
    }
    if ((an.state === 'walk' || an.state === 'flee') && an.target) {
      const tx = an.target.x - an.x;
      const tz = an.target.z - an.z;
      const d = Math.hypot(tx, tz);
      const sp = def.speed * (an.state === 'flee' ? 1.8 : 1);
      if (d < 0.3 || an.t <= -6) {
        an.state = 'idle';
        an.t = 1.5 + Math.random() * 4;
        an.speed = 0;
      } else {
        const step = Math.min(d, sp * dt);
        const nx = an.x + (tx / d) * step;
        const nz = an.z + (tz / d) * step;
        if (this.okAt(an, nx, nz)) {
          an.x = nx;
          an.z = nz;
          an.speed += (sp - an.speed) * damp(6, dt);
        } else {
          an.state = 'idle';
          an.t = 1;
        }
        const want = def.sideways ? Math.atan2(tx, tz) + Math.PI / 2 : Math.atan2(tx, tz);
        let dh = ((want - an.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        an.heading += dh * damp(5, dt);
      }
    } else an.speed *= 1 - damp(6, dt);
    const gy = this.groundY(an);
    an.y += (gy - an.y) * damp(10, dt);
    if (def.hop && an.speed > 0.2) an.hop = Math.abs(Math.sin(an.phase * 3.2)) * 0.18;
    else an.hop *= 0.8;
  }

  draw(an, full) {
    const k = this.kind(an.sp);
    if (!k || k.count >= k.capacity) return;
    const i = k.count++;
    const def = an.def;
    const sc = def.scale;
    const m = this._m;
    if (def.insect === 'glow') {
      const on = U.uNight.value;
      const s = (0.25 + 0.15 * Math.sin(this.t * 3 + an.seed * 20)) * on;
      m.makeScale(s, s, s).setPosition(an.x, an.y, an.z);
      k.meshes[0].setMatrixAt(i, m);
      return;
    }
    const sleep = an.state === 'sleep';
    const bank = def.fly ? (an.seed > 0.5 ? -0.3 : 0.3) : 0;
    const roll = def.waddle && an.speed > 0.05 ? Math.sin(an.phase * 4) * 0.15 : 0;
    this._e.set(0, an.heading, bank + roll + (sleep ? 0 : 0));
    this._q.setFromEuler(this._e);
    m.compose(this._v.set(an.x, an.y + an.hop - (sleep ? 0.06 : 0), an.z), this._q, this._s.set(sc, sleep ? sc * 0.85 : sc, sc));
    k.parts.forEach((p, pi) => {
      let a = 0;
      if (full) {
        const t = this.t;
        if (p.anim === 'leg') a = Math.sin(an.phase * 6 + p.phase) * Math.min(1, an.speed) * 0.6;
        else if (p.anim === 'head') a = sleep ? 0.4 : an.speed < 0.1 ? 0.25 + Math.sin(t * 1.3 + an.seed * 10) * 0.25 : Math.sin(an.phase * 3) * 0.08;
        else if (p.anim === 'wing') a = def.insect ? Math.sin(t * 28 + an.seed * 10) * 0.9 : Math.sin(t * (def.fly ? 5 : 10) + an.seed * 10) * 0.55;
        else if (p.anim === 'tail') a = Math.sin(t * (def.fish ? 8 : 4) + an.seed * 10) * 0.3;
      }
      const pm = this._p.makeTranslation(p.pivot[0], p.pivot[1], p.pivot[2]);
      if (a) {
        const r = new THREE.Matrix4();
        if (p.anim === 'wing') r.makeRotationZ(a * p.side);
        else if (p.anim === 'tail') r.makeRotationY(a);
        else r.makeRotationX(a);
        pm.multiply(r);
      }
      k.meshes[pi].setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, pm));
    });
  }

  // animal le plus proche (pour le caresser)
  nearest(x, z, r = 2.2) {
    let best = null;
    let bd = r;
    for (const an of this.animals) {
      if (an.def.fly || an.def.insect || an.def.fish) continue;
      const d = Math.hypot(an.x - x, an.z - z);
      if (d < bd) {
        bd = d;
        best = an;
      }
    }
    return best;
  }

  label(an) {
    return SPECIES_LABEL[an.sp] || an.sp;
  }

  pet(an) {
    an.petT = 2.2;
    an.state = 'idle';
    an.hop = 0.25;
    this.heart(an.x, an.y + 1.0 * an.def.scale + 0.4, an.z);
  }

  heart(x, y, z) {
    if (!this.heartMesh) {
      const b = new Builder();
      b.add(G.sphere(0.12, 10, 8), '#f4a2b4', { p: [-0.08, 0, 0] });
      b.add(G.sphere(0.12, 10, 8), '#f4a2b4', { p: [0.08, 0, 0] });
      b.add(G.cone(0.16, 0.22, 10), '#f4a2b4', { p: [0, -0.15, 0], r: [Math.PI, 0, 0] });
      this.heartMesh = new THREE.InstancedMesh(b.build(), toonMaterial({ vertexColors: true, aId: true, emissiveVColor: 0.4 }), 12);
      this.heartMesh.frustumCulled = false;
      this.heartMesh.count = 0;
      this.root.add(this.heartMesh);
    }
    this.hearts.push({ x, y, z, t: 0 });
  }

  updateHearts(dt) {
    if (!this.heartMesh) return;
    const m = this._m;
    this.hearts = this.hearts.filter((h) => (h.t += dt) < 1.6);
    this.hearts.forEach((h, i) => {
      const k = h.t / 1.6;
      const s = Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * (1 - k * 0.3);
      m.makeRotationY(h.t * 2).scale(this._s.set(s, s, s)).setPosition(h.x, h.y + k * 0.8, h.z);
      this.heartMesh.setMatrixAt(i, m);
    });
    this.heartMesh.count = this.hearts.length;
    this.heartMesh.instanceMatrix.needsUpdate = true;
  }
}

export { SPECIES };
