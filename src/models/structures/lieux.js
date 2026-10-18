// Modèles des lieux générés (village, moulins, épaves, tour de guet, ponts…).
// Chaque élément renvoie, en coordonnées locales (pied à l'origine, face vers +Z) :
//   { solid: Builder, glow?: Builder, anim?: [{ geo, pivot, axis, speed }],
//     obstacles: [[x, z, r]], decks: [{ x0, z0, x1, z1, w, y0, y1, sag }] }
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { WOOD, WOOD_L, WOOD_D, STONE, STONE_D, MOSS, CREAM, ROPE, GLASS, bx, seg } from '../kit/lieux.js';
import { maison } from '../batiments/maison-village/index.js';
import { moulin } from '../batiments/moulin/index.js';
import { moulinEau } from '../batiments/moulin-eau/index.js';
import { etal } from '../batiments/etal-marche/index.js';
import { tourGuet } from '../batiments/tour-guet/index.js';
import { observatoire } from '../batiments/observatoire/index.js';
import { phare } from '../batiments/phare/index.js';
import { temple } from '../batiments/temple/index.js';
import { cabane } from '../batiments/cabane-ermite/index.js';
import { ruines } from '../monuments/ruines/index.js';
import { grotte } from '../monuments/grotte/index.js';
import { cerclePierres } from '../monuments/cercle-pierres/index.js';
import { statue } from '../monuments/statue-geante/index.js';
import { totem, autel, cairn } from '../monuments/curiosites/index.js';
import { mulberry32 } from '../../core/random.js';
import { TABLES } from '../kit/tables.js';

function puits() {
  const b = new Builder();
  b.add(G.cyl(0.85, 0.95, 0.85, 14), STONE, { p: [0, 0.42, 0] });
  b.add(G.cyl(0.62, 0.62, 0.05, 14), '#7fb3c2', { p: [0, 0.8, 0] });
  for (const sx of [-1, 1]) b.add(G.cyl(0.06, 0.07, 1.5, 6), WOOD_D, { p: [sx * 0.75, 1.3, 0] });
  b.add(G.cyl(0.05, 0.05, 1.6, 6), WOOD, { p: [0, 1.85, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cone(1.1, 0.6, 4), '#f19b86', { p: [0, 2.25, 0], r: [0, Math.PI / 4, 0] });
  b.add(G.cyl(0.14, 0.11, 0.22, 8), WOOD, { p: [0, 1.4, 0] });
  return { solid: b, obstacles: [[0, 0, 1.0]] };
}

function banc() {
  const b = new Builder();
  b.add(bx(1.6, 0.08, 0.45, 0.03), WOOD_L, { p: [0, 0.45, 0] });
  b.add(bx(1.6, 0.35, 0.06, 0.03), WOOD_L, { p: [0, 0.75, -0.2] });
  for (const sx of [-1, 1]) b.add(bx(0.08, 0.45, 0.4, 0.02), WOOD_D, { p: [sx * 0.7, 0.22, 0] });
  return { solid: b, obstacles: [[0, 0, 0.6]] };
}

function lanterne() {
  const b = new Builder();
  const g = new Builder();
  b.add(G.cyl(0.05, 0.07, 2.2, 6), WOOD_D, { p: [0, 1.1, 0] });
  b.add(bx(0.45, 0.05, 0.05, 0.02), WOOD_D, { p: [0.18, 2.15, 0] });
  g.add(G.sphere(0.18, 10, 8), '#ffd2a0', { p: [0.36, 1.92, 0], s: [1, 1.2, 1] });
  b.add(G.cone(0.2, 0.15, 8), '#f19b86', { p: [0.36, 2.12, 0] });
  return { solid: b, glow: g, obstacles: [[0, 0, 0.2]], light: [0.36, 1.92, 0] };
}

function linge(p) {
  const b = new Builder();
  const len = Math.max(2, p.len || 4);
  for (const sx of [-1, 1]) b.add(G.cyl(0.04, 0.05, 2.0, 6), WOOD_D, { p: [sx * len / 2, 1.0, 0] });
  b.add(G.cyl(0.01, 0.01, len, 4), ROPE, { p: [0, 1.85, 0], r: [0, 0, Math.PI / 2] });
  const cols = ['#f4a2b4', '#9cc8ec', '#fffaf0', '#f6d27a', '#a6d98f'];
  for (let k = 0; k < Math.floor(len / 0.8); k++) b.add(bx(0.45, 0.55, 0.02, 0.01), cols[k % 5], { p: [-len / 2 + 0.5 + k * 0.8, 1.55, 0], sway: 0.6 });
  return { solid: b, obstacles: [] };
}

function jetee(p) {
  const b = new Builder();
  const len = p.len || 12;
  const y = 0.85;
  b.add(bx(2.2, 0.14, len, 0.03), WOOD_L, { p: [0, y, len / 2] });
  for (let z = 0.8; z < len; z += 2.2) for (const sx of [-1, 1]) b.add(G.cyl(0.12, 0.12, 3.2, 8), WOOD_D, { p: [sx * 1.05, y - 1.2, z] });
  for (let z = 1.5; z < len; z += 4) b.add(G.cyl(0.13, 0.13, 0.7, 8), WOOD_D, { p: [1.05, y + 0.35, z] });
  b.add(G.torus(0.3, 0.06, 6, 14), '#f19b86', { p: [-1.12, y + 0.45, len * 0.6], r: [0, Math.PI / 2, 0] });
  return { solid: b, obstacles: [], decks: [{ x0: 0, z0: -0.5, x1: 0, z1: len, w: 2.2, y0: y + 0.07, y1: y + 0.07 }] };
}

function barque(p, stranded = false) {
  const b = new Builder();
  const cols = ['#86c6bb', '#f19b86', '#f6d27a', '#c7b2e6'];
  const c = cols[(p.v || 0) % cols.length];
  b.add(G.sphere(1, 16, 10), c, { p: [0, stranded ? 0.15 : 0.05, 0], s: [0.75, 0.42, 1.9] });
  b.add(G.sphere(1, 16, 10), '#f6ead2', { p: [0, stranded ? 0.32 : 0.22, 0], s: [0.62, 0.18, 1.7] });
  b.add(bx(1.2, 0.06, 0.32, 0.02), WOOD_L, { p: [0, stranded ? 0.42 : 0.32, 0.1] });
  return b;
}

function barqueEchouee(p) {
  const v = p.v || 0;
  if (v === 2) {
    // radeau démonté : rondins épars, mât couché
    const b = new Builder();
    for (let k = 0; k < 5; k++) b.add(G.cyl(0.18, 0.18, 2.6 - (k % 2) * 0.6, 10), k % 2 ? WOOD : WOOD_L, { p: [(k - 2) * 0.45 + (k % 3) * 0.2, 0.15, (k % 2) * 0.4], r: [Math.PI / 2, 0.2 * (k - 2), 0] });
    b.add(G.cyl(0.05, 0.05, 2.2, 6), WOOD_D, { p: [1.3, 0.1, -0.6], r: [Math.PI / 2, 0.8, 0] });
    b.add(G.torus(0.5, 0.04, 5, 12), ROPE, { p: [-1.2, 0.08, 0.8], r: [Math.PI / 2, 0, 0] });
    return { solid: b, obstacles: [[0, 0, 1.4]] };
  }
  const b = new Builder();
  if (v === 1) {
    // coque retournée
    b.add(G.sphere(1, 16, 10), '#9cc8ec', { p: [0, 0.05, 0], s: [0.8, 0.5, 2.0], r: [Math.PI, 0, 0] });
    b.add(bx(0.08, 0.06, 3.6, 0.02), WOOD_D, { p: [0, 0.55, 0] });
  } else {
    // barque échouée, penchée sur le sable (réparable si v = 0)
    b.addBuilt(barque(p, true).build(), { r: [0, 0, 0.35] });
    b.add(G.cyl(0.04, 0.04, 2.2, 6), WOOD, { p: [0.9, 0.12, 0.4], r: [Math.PI / 2, 0.5, 0] });
    if (v === 3) b.add(bx(0.8, 0.08, 0.6, 0.02), WOOD_D, { p: [-0.4, 0.5, -0.6], r: [0.4, 0.3, 0] });
  }
  return { solid: b, obstacles: [[0, 0, 1.3]] };
}

function casiers() {
  const b = new Builder();
  for (let k = 0; k < 3; k++) {
    b.add(bx(0.6, 0.45, 0.45, 0.04), WOOD_L, { p: [k * 0.65, 0.22 + (k === 2 ? 0 : 0), (k % 2) * 0.1] });
    b.add(G.torus(0.15, 0.025, 4, 10), ROPE, { p: [k * 0.65, 0.46, 0], r: [Math.PI / 2, 0, 0] });
  }
  b.add(G.sphere(0.18, 10, 8), '#f19b86', { p: [-0.5, 0.18, 0.4] });
  return { solid: b, obstacles: [[0.6, 0, 0.8]] };
}

function potager() {
  const b = new Builder();
  b.add(bx(2.4, 0.25, 1.4, 0.05), WOOD, { p: [0, 0.12, 0] });
  b.add(bx(2.2, 0.08, 1.2, 0.03), '#9f7a5a', { p: [0, 0.26, 0] });
  for (let k = 0; k < 8; k++) b.add(G.sphere(0.13, 6, 4), k % 3 ? '#86c98f' : '#f39c4a', { p: [-0.9 + (k % 4) * 0.6, 0.36, k < 4 ? -0.3 : 0.3], s: [1, 0.7, 1] });
  return { solid: b, obstacles: [[0, 0, 1.0]] };
}

function clotureChamp(p) {
  const b = new Builder();
  const w = p.w || 16;
  const d = p.d || 10;
  const posts = [];
  const side = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.2));
    for (let k = 0; k <= n; k++) posts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    seg(b, WOOD, ax, 0.55, az, bx, 0.55, bz, 0.035, 0.035, 5);
    seg(b, WOOD, ax, 0.3, az, bx, 0.3, bz, 0.035, 0.035, 5);
  };
  // une ouverture sur le petit côté (accès au champ)
  side(-w / 2, -d / 2, w / 2, -d / 2);
  side(w / 2, -d / 2, w / 2, d / 2);
  side(w / 2, d / 2, -w / 2, d / 2);
  side(-w / 2, d / 2, -w / 2, 1);
  side(-w / 2, -1, -w / 2, -d / 2);
  for (const [x, z] of posts) b.add(G.cyl(0.06, 0.07, 0.8, 6), WOOD_D, { p: [x, 0.4, z] });
  return { solid: b, obstacles: [] };
}

function epouvantail() {
  const b = new Builder();
  b.add(G.cyl(0.05, 0.05, 2.0, 6), WOOD_D, { p: [0, 1.0, 0] });
  b.add(G.cyl(0.04, 0.04, 1.4, 6), WOOD_D, { p: [0, 1.45, 0], r: [0, 0, Math.PI / 2] });
  b.add(bx(0.7, 0.75, 0.3, 0.08), '#e8705f', { p: [0, 1.3, 0] });
  b.add(G.sphere(0.24, 10, 8), '#f6ead2', { p: [0, 1.95, 0] });
  b.add(G.cone(0.42, 0.35, 12), '#e0b07e', { p: [0, 2.2, 0] });
  b.add(G.cyl(0.42, 0.42, 0.03, 12), '#e0b07e', { p: [0, 2.05, 0] });
  return { solid: b, obstacles: [[0, 0, 0.3]] };
}

function epave(p, big = false) {
  const b = new Builder();
  const L = (p.len || 14) / 14;
  const tilt = p.sunk ? 0.15 : 0.32;
  b.add(G.sphere(1, 20, 12), WOOD, { p: [0, -0.2 * L, 0], r: [0, 0, tilt], s: [1.9 * L, 1.1 * L, 7 * L] });
  b.add(G.sphere(1, 20, 12), '#8a6a5c', { p: [0.1, 0.25 * L, 0], r: [0, 0, tilt], s: [1.55 * L, 0.6 * L, 6.4 * L] });
  for (let k = 0; k < 9; k++) b.add(G.torus(1.75 * L, 0.11 * L, 6, 14, Math.PI), WOOD_D, { p: [0, 0.1, (-5.2 + k * 1.3) * L], r: [0, 0, tilt] });
  // mâts brisés, cordages, voile en lambeaux
  seg(b, WOOD_D, 0.6 * L, 0.5 * L, 1.5 * L, 2.2 * L, 4.4 * L, 2.2 * L, 0.16 * L, 0.11 * L, 8);
  seg(b, WOOD_D, -0.3 * L, 0.5 * L, -2 * L, 0.8 * L, 2.6 * L, -2.6 * L, 0.14 * L, 0.1 * L, 8);
  b.add(bx(1.6 * L, 0.06, 1.2 * L, 0.03), '#f6ead2', { p: [2.1 * L, 3.6 * L, 2.4 * L], r: [0.25, 0.5, -0.6], sway: 0.5 });
  seg(b, ROPE, 2.2 * L, 4.3 * L, 2.2 * L, 3.5 * L, 0, 5 * L, 0.025, 0.025, 4);
  b.add(bx(1.0 * L, 0.6 * L, 0.8 * L, 0.06), WOOD_D, { p: [-2.4 * L, 0.3, 5.4 * L], r: [0, 0.5, 0.2] });
  if (big) {
    b.add(bx(2.2 * L, 1.4 * L, 2.4 * L, 0.1), WOOD_L, { p: [0.4 * L, 1.2 * L, -4.2 * L], r: [0, 0, tilt] });
    b.add(G.cone(0.5 * L, 1.4 * L, 6), '#f6d27a', { p: [0, 0.8 * L, 7.3 * L], r: [Math.PI / 2, 0, 0] });
  }
  return { solid: b, obstacles: [[0, -4 * L, 1.8 * L], [0, 0, 2 * L], [0, 4 * L, 1.8 * L]] };
}

function coffre() {
  const b = new Builder();
  const g = new Builder();
  b.add(bx(0.8, 0.45, 0.55, 0.05), '#c98f5f', { p: [0, 0.23, 0] });
  b.add(G.cyl(0.28, 0.28, 0.8, 12, 1, false, 0, Math.PI), '#b07a50', { p: [0, 0.45, 0], r: [0, 0, Math.PI / 2] });
  b.add(bx(0.84, 0.06, 0.06, 0.02), '#f6d27a', { p: [0, 0.3, 0.28] });
  g.add(bx(0.14, 0.16, 0.05, 0.02), '#f6d27a', { p: [0, 0.38, 0.29] });
  return { solid: b, glow: g, obstacles: [[0, 0, 0.5]] };
}

function arche(p) {
  const b = new Builder();
  const s = p.size || 1.2;
  // deux piliers rocheux et un linteau voûté (rochers déformés)
  for (const sz of [-1, 1]) {
    for (let k = 0; k < 3; k++) b.add(G.rock(1.6 * s, 30 + k + (sz > 0 ? 5 : 0)), k % 2 ? '#cfc3d4' : '#bfb4c8', { p: [0, k * 2.2 * s, sz * 3.2 * s], s: [1, 1.1, 0.9] });
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 4) * Math.PI;
    b.add(G.rock(1.3 * s, 40 + k), k % 2 ? '#cfc3d4' : '#c6b9cc', { p: [0, 6.2 * s + Math.sin(a) * 1.4 * s, -Math.cos(a) * 3.2 * s] });
  }
  b.add(G.sphere(1.6 * s, 10, 6), MOSS, { p: [0, 8.3 * s, 0], s: [1, 0.3, 2] });
  return { solid: b, obstacles: [[0, -3.2 * s, 1.8 * s], [0, 3.2 * s, 1.8 * s]] };
}

function boisPile() {
  const b = new Builder();
  for (let k = 0; k < 6; k++) b.add(G.cyl(0.14, 0.14, 1.2, 8), k % 2 ? WOOD : WOOD_L, { p: [(k % 3) * 0.3 - 0.3, 0.15 + Math.floor(k / 3) * 0.26, 0], r: [Math.PI / 2, 0, 0] });
  return { solid: b, obstacles: [[0, 0, 0.6]] };
}

function feuCamp() {
  const b = new Builder();
  const g = new Builder();
  for (let k = 0; k < 8; k++) b.add(G.rock(0.22, 60 + k), '#bfb4c8', { p: [Math.cos(k * 0.785) * 0.7, 0.08, Math.sin(k * 0.785) * 0.7] });
  for (let k = 0; k < 4; k++) seg(b, WOOD_D, Math.cos(k * 1.57) * 0.45, 0.05, Math.sin(k * 1.57) * 0.45, 0, 0.55, 0, 0.06, 0.04, 6);
  g.add(G.cone(0.3, 0.7, 8), '#f6b45e', { p: [0, 0.45, 0] });
  g.add(G.cone(0.16, 0.45, 8), '#ffe08a', { p: [0, 0.45, 0] });
  return { solid: b, glow: g, obstacles: [[0, 0, 0.8]], light: [0, 0.6, 0] };
}

function tente(p) {
  const b = new Builder();
  const c = (p.v || 0) % 2 ? '#86c6bb' : '#f19b86';
  b.add(G.cone(1.5, 1.9, 4), c, { p: [0, 0.95, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 1.3] });
  b.add(G.cone(0.5, 1.0, 3), '#5b4a63', { p: [0, 0.5, 1.0], r: [0, Math.PI, 0], s: [1, 1, 0.25] });
  b.add(G.cyl(0.03, 0.03, 0.6, 5), WOOD_D, { p: [0, 2.1, 0] });
  return { solid: b, obstacles: [[0, 0, 1.3]] };
}

function rondin() {
  const b = new Builder();
  b.add(G.cyl(0.28, 0.3, 2.0, 10), WOOD, { p: [0, 0.27, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cyl(0.26, 0.26, 0.02, 10), '#ecd3a8', { p: [1.01, 0.27, 0], r: [0, 0, Math.PI / 2] });
  return { solid: b, obstacles: [[0, 0, 0.6]] };
}

function ruche() {
  const b = new Builder();
  b.add(bx(0.6, 0.12, 0.6, 0.02), WOOD_D, { p: [0, 0.45, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(G.cyl(0.03, 0.03, 0.45, 5), WOOD_D, { p: [sx * 0.25, 0.22, sz * 0.25] });
  for (let k = 0; k < 3; k++) b.add(bx(0.55 - k * 0.04, 0.24, 0.55 - k * 0.04, 0.04), k % 2 ? '#f6d27a' : '#fbe7a8', { p: [0, 0.63 + k * 0.24, 0] });
  b.add(G.cone(0.48, 0.25, 4), '#f19b86', { p: [0, 1.48, 0], r: [0, Math.PI / 4, 0] });
  b.add(bx(0.18, 0.04, 0.03, 0.01), '#5b4a63', { p: [0, 0.6, 0.28] });
  return { solid: b, obstacles: [[0, 0, 0.45]] };
}

function archeFleurie() {
  const b = new Builder();
  for (const sx of [-1, 1]) b.add(G.cyl(0.07, 0.08, 2.4, 6), WOOD_L, { p: [sx * 1.1, 1.2, 0] });
  b.add(G.torus(1.1, 0.07, 6, 18, Math.PI), WOOD_L, { p: [0, 2.4, 0] });
  const cols = ['#f4a2b4', '#fffaf0', '#f6d27a', '#c7b2e6'];
  for (let k = 0; k < 22; k++) {
    const a = (k / 21) * Math.PI;
    const r = 1.1 + Math.sin(k * 3.1) * 0.08;
    b.add(G.sphere(0.13, 6, 4), k % 4 === 0 ? '#93d28c' : cols[k % 4], { p: [Math.cos(a) * r, 2.4 + Math.sin(a) * r, Math.sin(k) * 0.1], sway: 0.3 });
  }
  for (let k = 0; k < 10; k++) b.add(G.sphere(0.12, 6, 4), k % 2 ? '#93d28c' : cols[k % 4], { p: [(k % 2 ? 1 : -1) * 1.1, 0.3 + k * 0.21, 0.08] });
  return { solid: b, obstacles: [[-1.1, 0, 0.2], [1.1, 0, 0.2]] };
}

function pontCorde(p, lenWorld) {
  const b = new Builder();
  const len = lenWorld;
  const dy = (p.y1 ?? p.y) - p.y;
  const N = Math.max(6, Math.round(len / 0.9));
  const sag = Math.min(2.2, len * 0.06);
  const yAt = (t) => t * dy - Math.sin(t * Math.PI) * sag + 0.3;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    b.add(bx(0.38, 0.06, 1.3, 0.02), k % 2 ? WOOD : WOOD_L, { p: [t * len, yAt(t), 0] });
  }
  for (const sz of [-1, 1]) {
    for (let k = 0; k < N; k++) {
      const t0 = k / N;
      const t1 = (k + 1) / N;
      seg(b, ROPE, t0 * len, yAt(t0) + 0.9, sz * 0.7, t1 * len, yAt(t1) + 0.9, sz * 0.7, 0.025, 0.025, 4);
      if (k % 2 === 0) seg(b, ROPE, t0 * len, yAt(t0), sz * 0.66, t0 * len, yAt(t0) + 0.9, sz * 0.7, 0.015, 0.015, 3);
    }
    for (const t of [0, 1]) b.add(G.cyl(0.11, 0.13, 1.6, 8), WOOD_D, { p: [t * len, yAt(t) + 0.5, sz * 0.75] });
  }
  return { solid: b, obstacles: [], decks: [{ x0: 0, z0: 0, x1: len, z1: 0, w: 1.3, y0: yAt(0) + 0.03, y1: yAt(1) + 0.03, sag }] };
}

function pont(p) {
  const b = new Builder();
  const len = p.len || 5;
  const y = 0.25;
  b.add(bx(len, 0.16, 1.8, 0.04), WOOD_L, { p: [0, y, 0] });
  for (const sz of [-1, 1]) {
    b.add(bx(len, 0.08, 0.08, 0.02), WOOD, { p: [0, y + 0.75, sz * 0.85] });
    for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 3) b.add(G.cyl(0.05, 0.06, 0.8, 6), WOOD_D, { p: [x, y + 0.38, sz * 0.85] });
  }
  return { solid: b, obstacles: [], decks: [{ x0: -len / 2 - 0.6, z0: 0, x1: len / 2 + 0.6, z1: 0, w: 1.8, y0: y + 0.08, y1: y + 0.08, rel: true }] };
}

// marches en boîtes simples (36 sommets) : une montagne peut en compter plusieurs centaines
const STEP = new THREE.BoxGeometry(1, 1, 1);
function escalier(p) {
  const b = new Builder();
  const len = p.len || 3;
  const rise = p.rise || 1.5;
  const steps = Math.max(2, Math.round(rise / 0.22));
  for (let k = 0; k < steps; k++) {
    const t = (k + 0.5) / steps;
    // chaque marche descend sous la suivante : aucun vide visible sous l'escalier
    b.add(STEP, k % 2 ? STONE : STONE_D, { p: [-len / 2 + t * len, -rise / 2 + t * rise - 0.2, 0], s: [len / steps + 0.08, 0.44, 1.6] });
  }
  return { solid: b, obstacles: [] };
}

function panneau() {
  const b = new Builder();
  b.add(G.cyl(0.06, 0.07, 2.0, 6), WOOD_D, { p: [0, 1.0, 0] });
  const cols = ['#f4a28c', '#9fdcc8', '#f6d27a'];
  for (let k = 0; k < 3; k++) b.add(bx(1.0, 0.24, 0.05, 0.03), cols[k], { p: [0.3 * (k % 2 ? -1 : 1), 1.75 - k * 0.32, 0], r: [0, k * 0.7, 0] });
  return { solid: b, obstacles: [[0, 0, 0.2]] };
}

function bassinChaud(p) {
  const b = new Builder();
  const s = p.size || 1;
  for (let k = 0; k < 10; k++) b.add(G.rock(0.4 * s, 80 + k), k % 2 ? '#cfc3d4' : '#bfb4c8', { p: [Math.cos(k * 0.63) * 1.25 * s, 0.05, Math.sin(k * 0.63) * 1.25 * s], s: [1, 0.6, 1] });
  b.add(G.cyl(1.15 * s, 1.15 * s, 0.05, 16), '#9fe0e6', { p: [0, 0.1, 0] });
  const g = new Builder();
  // vapeur : bouffées pâles légèrement lumineuses
  for (let k = 0; k < 3; k++) g.add(G.sphere(0.35 * s, 8, 6), '#ffffff', { p: [Math.cos(k * 2) * 0.4, 0.5 + k * 0.45, Math.sin(k * 2) * 0.4], s: [1, 0.7, 1] });
  return { solid: b, glow: g, obstacles: [] };
}

function arbreGeant(p) {
  const b = new Builder();
  const kind = p.kind || 'chene';
  if (kind === 'champi') {
    b.add(G.cyl(1.0, 1.5, 9, 16), '#f6ecdc', { p: [0, 4.5, 0] });
    b.add(new THREE.SphereGeometry(6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#e9a3c4', { p: [0, 8.6, 0], s: [1, 0.55, 1] });
    for (let k = 0; k < 14; k++) b.add(G.sphere(0.45, 8, 6), '#fffaf0', { p: [Math.cos(k * 1.3) * (1.5 + (k % 4)), 9.0 + Math.sqrt(Math.max(0, 1 - ((1.5 + (k % 4)) / 6) ** 2)) * 3.0, Math.sin(k * 1.3) * (1.5 + (k % 4))], s: [1, 0.4, 1] });
    return { solid: b, obstacles: [[0, 0, 1.6]] };
  }
  const bark = '#a8795a';
  b.add(G.cyl(1.1, 1.8, 7, 14), bark, { p: [0, 3.5, 0] });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    seg(b, bark, Math.cos(a) * 1.2, 0.3, Math.sin(a) * 1.2, Math.cos(a) * 3.2, -0.2, Math.sin(a) * 3.2, 0.55, 0.22, 8);
    seg(b, bark, Math.cos(a) * 0.5, 6.5, Math.sin(a) * 0.5, Math.cos(a) * 4, 9.5, Math.sin(a) * 4, 0.45, 0.2, 8);
  }
  const leaf = kind === 'sapin' ? ['#d6e9e6', '#e9f3f2'] : ['#7fc48b', '#93d28c'];
  for (let k = 0; k < 9; k++) {
    const a = k * 0.8;
    const r = k === 0 ? 0 : 3.5;
    b.add(G.sphere(k === 0 ? 4.2 : 3.1, 14, 10), leaf[k % 2], { p: [Math.cos(a) * r, 11 + (k % 3) * 1.2, Math.sin(a) * r], s: [1, 0.85, 1] });
  }
  return { solid: b, obstacles: [[0, 0, 2.0]] };
}

function recif(p) {
  const b = new Builder();
  const s = p.size || 1;
  const cols = ['#f4a2a0', '#f6b98a', '#c7b2e6', '#9fdcc8'];
  for (let k = 0; k < 6; k++) b.add(G.sphere(0.5 * s, 8, 6), cols[k % 4], { p: [Math.cos(k) * 0.8 * s, 0.2, Math.sin(k * 1.7) * 0.8 * s], s: [1, 0.6 + (k % 3) * 0.3, 1] });
  return { solid: b, obstacles: [] };
}

function cascade(p) {
  const b = new Builder();
  // rochers autour du bassin au pied de la chute
  const w = (p.w || 3) * 0.6 + 1.5;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    b.add(G.rock(0.55 + (k % 3) * 0.2, 90 + k), k % 2 ? '#cfc3d4' : '#bfb4c8', { p: [Math.cos(a) * w, -0.2, Math.sin(a) * w], s: [1, 0.7, 1] });
  }
  b.add(G.sphere(0.5, 8, 6), MOSS, { p: [w * 0.7, 0.2, w * 0.4], s: [1, 0.4, 1] });
  return { solid: b, obstacles: [] };
}

// --- petites découvertes ---
const MICRO = {
  cairn: () => cairn(),
  banc_vue: () => banc(),
  nichoir: () => {
    const b = new Builder();
    b.add(G.cyl(0.05, 0.06, 1.8, 6), WOOD_D, { p: [0, 0.9, 0] });
    b.add(bx(0.4, 0.42, 0.36, 0.05), '#9fdcc8', { p: [0, 1.95, 0] });
    b.add(G.cone(0.36, 0.25, 4), '#f19b86', { p: [0, 2.28, 0], r: [0, Math.PI / 4, 0] });
    b.add(G.cyl(0.07, 0.07, 0.04, 8), '#5b4a63', { p: [0, 2.0, 0.19], r: [Math.PI / 2, 0, 0] });
    return { solid: b, obstacles: [[0, 0, 0.2]] };
  },
  rondin: () => rondin(),
  cercle_champi: () => {
    const b = new Builder();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      b.add(G.cyl(0.05, 0.07, 0.25, 6), '#f6ecdc', { p: [Math.cos(a) * 1.1, 0.12, Math.sin(a) * 1.1] });
      b.add(G.sphere(0.16, 8, 5), k % 2 ? '#e9a3c4' : '#f2b8a0', { p: [Math.cos(a) * 1.1, 0.26, Math.sin(a) * 1.1], s: [1, 0.55, 1] });
    }
    return { solid: b, obstacles: [] };
  },
  lanterne_pierre: () => {
    const b = new Builder();
    const g = new Builder();
    b.add(bx(0.5, 0.6, 0.5, 0.06), STONE_D, { p: [0, 0.3, 0] });
    b.add(G.cyl(0.12, 0.14, 0.4, 8), STONE, { p: [0, 0.8, 0] });
    b.add(bx(0.55, 0.12, 0.55, 0.04), STONE, { p: [0, 1.05, 0] });
    g.add(bx(0.32, 0.3, 0.32, 0.04), '#ffd2a0', { p: [0, 1.26, 0] });
    b.add(G.cone(0.48, 0.35, 4), STONE_D, { p: [0, 1.6, 0], r: [0, Math.PI / 4, 0] });
    return { solid: b, glow: g, obstacles: [[0, 0, 0.35]] };
  },
  ancre: () => {
    const b = new Builder();
    b.add(G.cyl(0.07, 0.07, 1.6, 8), '#8a7a99', { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0.1] });
    b.add(G.torus(0.6, 0.08, 6, 14, Math.PI), '#8a7a99', { p: [0, 0.12, -0.75], r: [Math.PI / 2, 0, 0] });
    b.add(G.torus(0.18, 0.05, 6, 12), '#8a7a99', { p: [0, 0.1, 0.85], r: [Math.PI / 2, 0, 0] });
    return { solid: b, obstacles: [[0, 0, 0.5]] };
  },
  tonneaux: () => {
    const b = new Builder();
    for (let k = 0; k < 3; k++) {
      b.add(G.cyl(0.32, 0.32, 0.8, 12), WOOD, { p: [k * 0.7, 0.4, (k % 2) * 0.3] });
      for (const y of [0.15, 0.65]) b.add(G.torus(0.33, 0.025, 4, 14), '#8a7a99', { p: [k * 0.7, y, (k % 2) * 0.3], r: [Math.PI / 2, 0, 0] });
    }
    return { solid: b, obstacles: [[0.7, 0, 1.0]] };
  },
  autel: () => autel(),
  fleur_geante: () => {
    const b = new Builder();
    b.add(G.cyl(0.08, 0.12, 2.2, 8), '#7fbf86', { p: [0, 1.1, 0], sway: 0.3 });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      b.add(G.sphere(0.45, 10, 6), '#f4a2b4', { p: [Math.cos(a) * 0.5, 2.25, Math.sin(a) * 0.5], s: [1, 0.25, 0.6], r: [0, -a, 0.3], sway: 0.3 });
    }
    b.add(G.sphere(0.3, 10, 8), '#f6d27a', { p: [0, 2.3, 0] });
    b.add(G.sphere(0.5, 8, 4), '#86c98f', { p: [0.4, 0.8, 0], s: [1.4, 0.2, 0.7], sway: 0.2 });
    return { solid: b, obstacles: [[0, 0, 0.3]] };
  },
  charrette: () => {
    const b = new Builder();
    b.add(bx(1.6, 0.5, 1.1, 0.05), WOOD, { p: [0, 0.75, 0] });
    for (const sx of [-1, 1]) b.add(G.torus(0.42, 0.06, 6, 14), WOOD_D, { p: [0, 0.42, sx * 0.62] });
    seg(b, WOOD_D, 0.8, 0.6, -0.3, 2.0, 0.15, -0.3, 0.04, 0.04, 5);
    seg(b, WOOD_D, 0.8, 0.6, 0.3, 2.0, 0.15, 0.3, 0.04, 0.04, 5);
    for (let k = 0; k < 5; k++) b.add(G.sphere(0.16, 8, 6), k % 2 ? '#f39c4a' : '#f6d27a', { p: [-0.4 + (k % 3) * 0.35, 1.08, -0.2 + (k % 2) * 0.35] });
    return { solid: b, obstacles: [[0, 0, 1.0]] };
  },
  nid: () => {
    const b = new Builder();
    b.add(G.torus(0.35, 0.12, 6, 14), '#b89a72', { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 3; k++) b.add(G.sphere(0.1, 8, 6), '#bfe4f2', { p: [Math.cos(k * 2.1) * 0.12, 0.14, Math.sin(k * 2.1) * 0.12], s: [1, 1.25, 1] });
    return { solid: b, obstacles: [] };
  },
  coffre_cache: () => coffre(),
  totem: () => totem(),
  epouvantail: () => epouvantail(),
  bouee_echouee: () => {
    const b = new Builder();
    b.add(G.torus(0.35, 0.12, 8, 16), '#f19b86', { p: [0, 0.1, 0], r: [Math.PI / 2 - 0.2, 0, 0] });
    b.add(G.torus(0.35, 0.125, 8, 4), CREAM, { p: [0, 0.1, 0], r: [Math.PI / 2 - 0.2, 0, 0.4] });
    return { solid: b, obstacles: [] };
  },
};

// sens des rotations : 'face' (rotation.y = rot), 'dirz' (+Z vers l'angle rot), 'dirx' (+X vers l'angle rot)
const DIRZ = new Set(['jetee', 'barque_amarree', 'epave', 'epave_geante', 'barque_echouee', 'phare', 'arche', 'grotte', 'tente', 'etal', 'banc', 'banc_vue', 'statue', 'moulin', 'coffre', 'casiers', 'potager', 'cascade']);
const DIRX = new Set(['pont_corde', 'pont', 'escalier', 'linge', 'cloture_champ', 'moulin_eau', 'rondin']);
export function rotY(t, rot) {
  if (DIRZ.has(t)) return Math.PI / 2 - rot;
  if (DIRX.has(t)) return -rot;
  return rot;
}

// élément → modèle local
export function partModel(p) {
  const t = p.t;
  const rng = mulberry32(Math.round(p.x * 31 + p.z * 17) >>> 0);
  switch (t) {
    case 'maison': return maison(p);
    case 'moulin': return moulin(p);
    case 'moulin_eau': return moulinEau(p);
    case 'puits': return puits(p);
    case 'etal': return etal(p);
    case 'banc': return banc(p);
    case 'lanterne': return lanterne(p);
    case 'linge': return linge(p);
    case 'jetee': return jetee(p);
    case 'barque_amarree': return { solid: barque(p), obstacles: [[0, 0, 1.2]] };
    case 'casiers': return casiers(p);
    case 'potager': return potager(p);
    case 'cloture_champ': return clotureChamp(p);
    case 'epouvantail': return epouvantail(p);
    case 'epave': return epave(p);
    case 'epave_geante': return epave(p, true);
    case 'coffre': return coffre(p);
    case 'barque_echouee': return barqueEchouee(p);
    case 'tour_guet': return tourGuet(p);
    case 'cercle_pierres': return cerclePierres(p);
    case 'arche': return arche(p);
    case 'bois_pile': return boisPile(p);
    case 'feu_camp': return feuCamp(p);
    case 'tente': return tente(p);
    case 'rondin': return rondin(p);
    case 'ruche': return ruche(p);
    case 'arche_fleurie': return archeFleurie(p);
    case 'pont_corde': return pontCorde(p, Math.hypot(p.x1 - p.x, p.z1 - p.z));
    case 'pont': return pont(p);
    case 'escalier': return escalier(p);
    case 'panneau': return panneau(p);
    case 'bassin_chaud': return bassinChaud(p);
    case 'observatoire': return observatoire(p);
    case 'statue': return statue(p);
    case 'arbre_geant': return arbreGeant(p);
    case 'recif': return recif(p);
    case 'cascade': return cascade(p);
    case 'phare': return phare(p, rng);
    case 'ruines': return ruines(p, rng);
    case 'temple': return temple(p, rng);
    case 'grotte': return grotte(p, rng);
    case 'cabane': return cabane(p, rng);
    default:
      return MICRO[t] ? MICRO[t](p) : null;
  }
}

// maisons et moulins sont partagés en blanc : toit (marqueur de teinte 1) et murs (0,5)
// prennent ici la couleur de l'élément, sommets [i0, i1) des tampons color / aTint
const RECOLOR = new Set(['maison', 'moulin']);
const _cr = new THREE.Color();
const _cw = new THREE.Color();
export function recolorPart(p, C, T, i0, i1) {
  if (!RECOLOR.has(p.t)) return;
  const roof = p.t === 'maison' ? p.roof : p.color;
  _cr.set(roof || '#ffffff');
  _cw.set(p.wall || '#ffffff');
  for (let i = i0; i < i1; i++) {
    const c = T[i] > 0.75 ? _cr : T[i] > 0.25 ? _cw : null;
    if (!c) continue;
    C[i * 3] *= c.r;
    C[i * 3 + 1] *= c.g;
    C[i * 3 + 2] *= c.b;
  }
}

// inscription au relais des tables (assemblage d'un lieu seul : catalogue, tests)
TABLES.lieux = { partModel, recolorPart };
