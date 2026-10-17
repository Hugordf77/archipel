// Animaux des îles générées : 23 espèces dessinées par pièces (corps, tête, pattes, ailes, queue).
// Chaque pièce : { geo, pivot [x, y, z], anim, side, phase } ; le jeu les instancie (IslandFauna).
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

export const SPECIES = {
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
