// Modèles des îles générées : végétation et ressources (une géométrie par espèce,
// instanciée), structures (gabarits fusionnés par île). Fil principal (THREE).
import * as THREE from 'three';
import { Builder, G } from '../render/builder.js';
import { buildClumpGeometry } from '../render/foliage.js';
import { palmFrondGeometry } from '../world/home/props.js';
import { tuftGeometry } from '../render/grass.js';
import { mulberry32 } from '../core/random.js';

const UP = new THREE.Vector3(0, 1, 0);
function segment(b, color, a, c, r0, r1, sides = 10, opts = {}) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
  b.add(G.cyl(r1, r0, len, sides), color, { p: [mid.x, mid.y, mid.z], r: [e.x, e.y, e.z], ...opts });
}

const BARK = '#b98a64';
const col = (c) => new THREE.Color(c);

// ---------------------------------------------------------------------------
// Végétation : { solid, clumps, crowns } en coordonnées locales (pied à l'origine)
//   solid  : géométrie fusionnée (Builder) — tronc, fruits, rochers…
//   clumps : touffes de billboards (feuillages peints)
//   crowns : sphères d'ombre portée [x, y, z, r, aplatissement]
//   grass / flower : rendus spéciaux (herbe, fleurs teintées par instance)
// ---------------------------------------------------------------------------
function treeTrunk(b, h, r0, r1, bend = 0.25) {
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    pts.push(new THREE.Vector3(Math.sin(t * 2.2) * bend, t * h, Math.sin(t * 1.7) * bend * 0.6));
  }
  for (let i = 0; i < 4; i++) segment(b, BARK, pts[i], pts[i + 1], THREE.MathUtils.lerp(r0, r1, i / 4), THREE.MathUtils.lerp(r0, r1, (i + 1) / 4), 10);
  return pts[4];
}

const BUILDERS = {
  arbre_pompon: () => {
    const b = new Builder();
    const top = treeTrunk(b, 1.9, 0.24, 0.15);
    return {
      solid: b.build(),
      clumps: [
        { x: top.x, y: 2.55, z: top.z, r: 1.45, color: col('#8fd08a') },
        { x: top.x + 0.45, y: 3.25, z: top.z - 0.25, r: 0.95, color: col('#b3e39a') },
      ],
      crowns: [[top.x, 2.6, top.z, 1.5, 0.85]],
    };
  },
  arbre_fruitier: () => {
    const b = new Builder();
    const top = treeTrunk(b, 1.9, 0.25, 0.16);
    for (let k = 0; k < 7; k++) {
      const a = k * 1.1;
      b.add(G.sphere(0.15, 10, 8), '#f7b48a', { p: [top.x + Math.cos(a) * 1.2, 2.2 + (k % 2) * 0.5, top.z + Math.sin(a) * 1.2], tint: 0 });
    }
    return {
      solid: b.build(),
      clumps: [{ x: top.x, y: 2.55, z: top.z, r: 1.45, color: col('#93d28c') }],
      crowns: [[top.x, 2.6, top.z, 1.5, 0.85]],
    };
  },
  arbre_cerisier: () => {
    const b = new Builder();
    const top = treeTrunk(b, 1.9, 0.24, 0.15, 0.35);
    return {
      solid: b.build(),
      clumps: [
        { x: top.x, y: 2.55, z: top.z, r: 1.45, color: col('#f6b9c8') },
        { x: top.x + 0.45, y: 3.25, z: top.z - 0.25, r: 0.95, color: col('#f9d3dc') },
      ],
      crowns: [[top.x, 2.6, top.z, 1.5, 0.85]],
    };
  },
  pin: () => pine(['#5fae8e', '#6cbd98', '#7cc8a0', '#8fd4a6']),
  pin_givre: () => pine(['#a9cfc9', '#bfdcd8', '#d4e8e5', '#ecf5f4']),
  palmier: () => {
    const b = new Builder();
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector3(Math.pow(t, 1.6) * 0.75, t * 4.2, 0));
    }
    for (let i = 0; i < 6; i++) {
      segment(b, i % 2 ? '#d8b58b' : '#cfa77c', pts[i], pts[i + 1], 0.2 - i * 0.012, 0.19 - (i + 1) * 0.012, 10);
    }
    const top = pts[6];
    const frond = palmFrondGeometry(2.4, 0.6);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      b.add(frond, k % 2 ? '#7fc98a' : '#8fd393', { p: [top.x, top.y, top.z], r: [0, a, 0.15], sway: 1.2 });
    }
    for (let k = 0; k < 3; k++) b.add(G.sphere(0.15, 10, 8), '#a8794f', { p: [top.x + Math.cos(k * 2.1) * 0.22, top.y - 0.15, top.z + Math.sin(k * 2.1) * 0.22], tint: 0 });
    return { solid: b.build(), crowns: [[top.x, top.y, 0, 1.8, 0.3]] };
  },
  arbuste: () => ({
    clumps: [
      { x: 0, y: 0.55, z: 0, r: 0.85, squash: 0.75, color: col('#8fd08a'), density: 1.3 },
      { x: 0.55, y: 0.42, z: 0.15, r: 0.58, squash: 0.75, color: col('#7cc48a'), density: 1.3 },
    ],
    crowns: [[0.2, 0.5, 0, 0.9, 0.75]],
  }),
  buisson_baies: () => {
    const b = new Builder();
    for (let k = 0; k < 14; k++) {
      const a = k * 2.4;
      b.add(G.sphere(0.06, 7, 5), k % 3 ? '#e9786f' : '#8fa6e6', { p: [Math.cos(a) * 0.78, 0.3 + (k % 4) * 0.15, Math.sin(a) * 0.78], tint: 0 });
    }
    return {
      solid: b.build(),
      clumps: [{ x: 0, y: 0.55, z: 0, r: 0.85, squash: 0.75, color: col('#7fc48b'), density: 1.3 }],
      crowns: [[0, 0.5, 0, 0.85, 0.75]],
    };
  },
  rocher: () => {
    const b = new Builder();
    b.add(G.rock(0.8, 3), '#ffffff', { p: [0, 0.2, 0], s: [1, 0.66, 0.9] });
    b.add(G.rock(0.42, 7), '#f2f0ec', { p: [0.7, 0.05, 0.35], s: [1, 0.7, 1] });
    return { solid: b.build(), shadow: true };
  },
  rocher_mousse: () => {
    const b = new Builder();
    b.add(G.rock(0.8, 5), '#ffffff', { p: [0, 0.2, 0], s: [1, 0.7, 0.95] });
    b.add(G.sphere(0.62, 14, 8), '#9fd09a', { p: [0.05, 0.62, 0], s: [1, 0.34, 0.92], tint: 0 });
    return { solid: b.build(), shadow: true };
  },
  cactus: () => {
    const b = new Builder();
    b.add(G.capsule(0.3, 1.3, 4, 12), '#8fc79a', { p: [0, 0.95, 0] });
    b.add(G.capsule(0.16, 0.5, 4, 10), '#86c093', { p: [0.42, 1.15, 0], r: [0, 0, -0.2] });
    b.add(G.capsule(0.14, 0.35, 4, 10), '#86c093', { p: [-0.38, 0.95, 0.05], r: [0, 0, 0.25] });
    b.add(G.sphere(0.12, 10, 8), '#f4a2b4', { p: [0, 1.95, 0], tint: 0 });
    return { solid: b.build(), shadow: true };
  },
  champi_geant: () => {
    const b = new Builder();
    b.add(G.cyl(0.3, 0.42, 2.6, 14), '#f6ecdc', { p: [0, 1.3, 0], tint: 0 });
    b.add(new THREE.SphereGeometry(1.6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#ffffff', { p: [0, 2.45, 0], s: [1, 0.55, 1] });
    b.add(G.cyl(1.55, 1.2, 0.18, 22), '#fbe9e4', { p: [0, 2.42, 0], tint: 0 });
    for (let k = 0; k < 8; k++) {
      const a = k * 0.8;
      const rr = 0.5 + (k % 3) * 0.32;
      b.add(G.sphere(0.13, 8, 6), '#fffaf0', { p: [Math.cos(a) * rr, 2.45 + Math.sqrt(Math.max(0, 1 - (rr / 1.6) ** 2)) * 0.86, Math.sin(a) * rr], s: [1, 0.45, 1], tint: 0 });
    }
    return { solid: b.build(), crowns: [[0, 2.7, 0, 1.6, 0.5]], shadow: true };
  },
  champi_petit: () => {
    const b = new Builder();
    [[0, 0, 1], [0.3, 0.15, 0.7], [-0.2, 0.25, 0.55]].forEach(([x, z, s]) => {
      b.add(G.cyl(0.05 * s, 0.07 * s, 0.32 * s, 8), '#f6ecdc', { p: [x, 0.16 * s, z], tint: 0 });
      b.add(G.sphere(0.2 * s, 12, 8), '#ffffff', { p: [x, 0.32 * s, z], s: [1, 0.55, 1] });
    });
    return { solid: b.build() };
  },
  cristal: () => {
    const b = new Builder();
    [[0, 0, 1.2, 0], [0.28, 0.12, 0.8, 0.35], [-0.22, 0.18, 0.7, -0.4], [0.05, -0.28, 0.55, 0.2]].forEach(([x, z, h, tilt]) => {
      b.add(G.cyl(0.16, 0.16, h, 6), '#bfe4f2', { p: [x, h / 2, z], r: [tilt * 0.4, 0, tilt] });
      b.add(G.cone(0.16, 0.3, 6), '#e3f4fb', { p: [x + Math.sin(-tilt) * h * 0.5, h + 0.1, z + Math.sin(tilt * 0.4) * h * 0.5], r: [tilt * 0.4, 0, tilt] });
    });
    return { solid: b.build(), glow: true };
  },
  corail: () => {
    const b = new Builder();
    const rand = mulberry32(17);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const l = 0.25 + rand() * 0.35;
      b.add(G.capsule(0.06, l, 3, 8), k % 2 ? '#f4a2a0' : '#f6b98a', { p: [Math.cos(a) * 0.15, l * 0.5, Math.sin(a) * 0.15], r: [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5] });
    }
    return { solid: b.build() };
  },
  fleurs: () => ({ flower: true }),
  herbe: () => ({ grass: true }),
  fougere: () => {
    const b = new Builder();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.add(G.sphere(0.5, 10, 6), k % 2 ? '#86c98f' : '#79bd88', { p: [Math.cos(a) * 0.38, 0.28, Math.sin(a) * 0.38], r: [0, -a, 0.55], s: [1, 0.08, 0.28], sway: 0.8 });
    }
    return { solid: b.build() };
  },
  souche: () => {
    const b = new Builder();
    b.add(G.cyl(0.36, 0.44, 0.42, 14), BARK, { p: [0, 0.21, 0] });
    b.add(G.cyl(0.34, 0.34, 0.03, 14), '#ecd3a8', { p: [0, 0.43, 0], tint: 0 });
    return { solid: b.build(), shadow: true };
  },
  bois_mort: () => {
    const b = new Builder();
    const c = '#b6a596';
    segment(b, c, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 1.6, 0), 0.13, 0.08, 8);
    segment(b, c, new THREE.Vector3(0.1, 0.9, 0), new THREE.Vector3(0.7, 1.4, 0.1), 0.07, 0.04, 6);
    segment(b, c, new THREE.Vector3(0.15, 1.2, 0), new THREE.Vector3(-0.4, 1.8, -0.2), 0.06, 0.035, 6);
    return { solid: b.build(), shadow: true };
  },
  filon_cuivre: () => ore('#e3975a', '#f0b27a'),
  filon_fer: () => ore('#9aa6c4', '#c98a6a'),
  obsidienne: () => {
    const b = new Builder();
    [[0, 0, 0.9, 0], [0.3, 0.1, 0.6, 0.4], [-0.25, 0.15, 0.55, -0.45], [0.05, -0.3, 0.45, 0.25]].forEach(([x, z, h, t]) => {
      b.add(G.cone(0.24, h, 5), '#6c5a80', { p: [x, h / 2, z], r: [t * 0.5, 0, t] });
    });
    b.add(G.rock(0.45, 9), '#8a7a99', { p: [0, 0.08, 0], s: [1, 0.4, 1] });
    return { solid: b.build(), shadow: true };
  },
  // --- espèces v2 ---
  bouleau: () => {
    const b = new Builder();
    b.add(G.cyl(0.13, 0.2, 3.0, 9), '#f4efe6', { p: [0, 1.5, 0] });
    for (let k = 0; k < 6; k++) b.add(G.box(0.05, 0.08, 0.2, 0.01), '#5b4a63', { p: [Math.cos(k * 2.1) * 0.15, 0.5 + k * 0.42, Math.sin(k * 2.1) * 0.15], r: [0, -k * 2.1, 0], tint: 0 });
    return {
      solid: b.build(),
      clumps: [
        { x: 0, y: 3.0, z: 0, r: 1.1, squash: 1.25, color: col('#b8e0a0') },
        { x: 0.3, y: 3.9, z: -0.1, r: 0.75, squash: 1.2, color: col('#cdeab0') },
      ],
      crowns: [[0, 3.2, 0, 1.15, 1.2]],
    };
  },
  saule: () => {
    const b = new Builder();
    const top = treeTrunk(b, 2.2, 0.34, 0.22, 0.4);
    const clumps = [{ x: top.x, y: 2.9, z: top.z, r: 1.6, squash: 0.62, color: col('#9bd18c') }];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      clumps.push({ x: top.x + Math.cos(a) * 1.5, y: 1.9, z: top.z + Math.sin(a) * 1.5, r: 0.62, squash: 1.9, color: col(k % 2 ? '#a9d98e' : '#b6df96'), density: 1.5 });
    }
    return { solid: b.build(), clumps, crowns: [[top.x, 2.4, top.z, 1.9, 0.75]] };
  },
  erable: () => {
    const b = new Builder();
    const top = treeTrunk(b, 2.1, 0.26, 0.16, 0.3);
    return {
      solid: b.build(),
      clumps: [
        { x: top.x, y: 2.8, z: top.z, r: 1.45, color: col('#f2a07a') },
        { x: top.x + 0.5, y: 3.5, z: top.z + 0.2, r: 0.95, color: col('#f6c08a') },
        { x: top.x - 0.6, y: 3.2, z: top.z - 0.3, r: 0.8, color: col('#ee8f78') },
      ],
      crowns: [[top.x, 2.9, top.z, 1.5, 0.85]],
    };
  },
  sapin_neige: () => pine(['#d6e9e6', '#e3f0ee', '#eef6f5', '#f8fcfb']),
  bambou: () => {
    const b = new Builder();
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05;
      const x = Math.cos(a) * 0.35;
      const z = Math.sin(a) * 0.35;
      const h = 3.4 + (k % 3) * 0.6;
      b.add(G.cyl(0.06, 0.07, h, 6), k % 2 ? '#9fd08a' : '#8cc47e', { p: [x, h / 2, z], r: [Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06], sway: 0.6 });
      for (let q = 1; q < 5; q++) b.add(G.cyl(0.075, 0.075, 0.05, 6), '#7aa86e', { p: [x, (h / 5) * q, z], tint: 0, sway: 0.3 });
    }
    return {
      solid: b.build(),
      clumps: [
        { x: 0, y: 3.6, z: 0, r: 0.9, squash: 1.1, color: col('#a7dc94'), density: 0.8 },
        { x: 0.3, y: 4.2, z: 0.2, r: 0.6, squash: 1.1, color: col('#b8e3a0'), density: 0.8 },
      ],
      crowns: [[0, 3.8, 0, 0.9, 1.2]],
    };
  },
  tournesol: () => {
    const b = new Builder();
    b.add(G.cyl(0.03, 0.04, 1.6, 6), '#7fbf86', { p: [0, 0.8, 0], tint: 0, sway: 0.5 });
    b.add(G.sphere(0.16, 6, 4), '#86c98f', { p: [0.12, 0.7, 0], s: [1.4, 0.25, 0.8], tint: 0, sway: 0.4 });
    b.add(G.cyl(0.26, 0.26, 0.06, 14), '#f6c84a', { p: [0, 1.65, 0.05], r: [Math.PI / 2 - 0.3, 0, 0], tint: 0, sway: 0.6 });
    b.add(G.cyl(0.13, 0.13, 0.08, 10), '#9f6b48', { p: [0, 1.66, 0.09], r: [Math.PI / 2 - 0.3, 0, 0], tint: 0, sway: 0.6 });
    return { solid: b.build() };
  },
  lavande: () => {
    const b = new Builder();
    b.add(G.sphere(0.32, 8, 5), '#9fbf98', { p: [0, 0.12, 0], s: [1, 0.5, 1], tint: 0 });
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4;
      const rr = 0.08 + (k % 3) * 0.08;
      b.add(G.cone(0.05, 0.32, 5), '#b49ae0', { p: [Math.cos(a) * rr, 0.42 + (k % 2) * 0.06, Math.sin(a) * rr], r: [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25], sway: 0.5 });
    }
    return { solid: b.build() };
  },
  ble: () => {
    const b = new Builder();
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1;
      const x = Math.cos(a) * 0.08;
      const z = Math.sin(a) * 0.08;
      b.add(G.cyl(0.012, 0.016, 0.85, 3), '#d9c27a', { p: [x, 0.42, z], sway: 0.9 });
      b.add(G.cone(0.035, 0.2, 4), '#f0d58a', { p: [x, 0.92, z], r: [Math.PI, 0, 0], sway: 1 });
    }
    return { solid: b.build() };
  },
  roseau: () => {
    const b = new Builder();
    for (let k = 0; k < 4; k++) {
      const a = k * 1.6;
      const x = Math.cos(a) * 0.12;
      const z = Math.sin(a) * 0.12;
      const h = 1.1 + (k % 2) * 0.3;
      b.add(G.cyl(0.012, 0.02, h, 3), '#9fbf78', { p: [x, h / 2, z], r: [Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1], sway: 0.9 });
      if (k % 2 === 0) b.add(G.cyl(0.035, 0.035, 0.2, 5), '#9a6f50', { p: [x, h - 0.15, z], tint: 0, sway: 1 });
    }
    return { solid: b.build() };
  },
  nenuphar: () => {
    const b = new Builder();
    b.add(G.cyl(0.42, 0.42, 0.03, 10), '#7fc48b', { p: [0, 0, 0] });
    b.add(G.cyl(0.26, 0.26, 0.035, 8), '#93d29a', { p: [0.55, 0.005, 0.2] });
    b.add(G.sphere(0.12, 8, 5), '#f7c6d6', { p: [0.1, 0.08, 0.1], s: [1, 0.6, 1], tint: 0 });
    return { solid: b.build() };
  },
  buisson_fleuri: () => {
    const b = new Builder();
    for (let k = 0; k < 10; k++) {
      const a = k * 2.4;
      b.add(G.sphere(0.08, 6, 4), k % 3 ? '#f4b4c6' : '#fffaf0', { p: [Math.cos(a) * 0.62, 0.35 + (k % 4) * 0.13, Math.sin(a) * 0.62], tint: 0 });
    }
    return {
      solid: b.build(),
      clumps: [{ x: 0, y: 0.5, z: 0, r: 0.75, squash: 0.8, color: col('#93d28c'), density: 1.3 }],
      crowns: [[0, 0.5, 0, 0.75, 0.8]],
    };
  },
  cactus_fleur: () => {
    const b = new Builder();
    b.add(G.capsule(0.28, 1.4, 4, 10), '#8fc79a', { p: [0, 0.95, 0] });
    b.add(G.capsule(0.15, 0.55, 4, 8), '#86c093', { p: [0.4, 1.2, 0], r: [0, 0, -0.25] });
    for (let k = 0; k < 4; k++) b.add(G.sphere(0.09, 8, 6), k % 2 ? '#f4a2b4' : '#f6d27a', { p: [Math.cos(k * 1.6) * 0.18, 1.95, Math.sin(k * 1.6) * 0.18], tint: 0 });
    return { solid: b.build(), shadow: true };
  },
  fougere_arbo: () => {
    const b = new Builder();
    b.add(G.cyl(0.13, 0.2, 2.3, 8), '#8a6a52', { p: [0, 1.15, 0] });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      b.add(G.sphere(0.9, 10, 5), k % 2 ? '#7fc48b' : '#6db87d', { p: [Math.cos(a) * 0.75, 2.35, Math.sin(a) * 0.75], r: [0, -a, 0.45], s: [1, 0.07, 0.3], sway: 1 });
    }
    return { solid: b.build(), crowns: [[0, 2.3, 0, 1.4, 0.4]], shadow: true };
  },
  potiron: () => {
    const b = new Builder();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.add(G.sphere(0.2, 8, 6), '#f39c4a', { p: [Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12], s: [0.8, 0.85, 0.8], tint: 0 });
    }
    b.add(G.cyl(0.03, 0.04, 0.12, 5), '#7a5a3c', { p: [0, 0.42, 0], tint: 0 });
    b.add(G.sphere(0.25, 8, 4), '#86c98f', { p: [0.3, 0.06, 0.1], s: [1.2, 0.2, 0.9], tint: 0 });
    return { solid: b.build() };
  },
  fleur_champ: () => ({ fieldFlower: true }),
};

function pine(cols) {
  const b = new Builder();
  const top = treeTrunk(b, 1.0, 0.22, 0.15, 0.08);
  const tiers = [[1.3, 0.55], [1.05, 1.45], [0.8, 2.2], [0.5, 2.8]];
  return {
    solid: b.build(),
    clumps: tiers.map(([r, dy], k) => ({ x: top.x, y: top.y + dy, z: top.z, r, squash: 0.62, color: col(cols[k]), density: 1.2 })),
    crowns: [[top.x, 2.1, top.z, 1.3, 1.5]],
  };
}

function ore(nugget, nugget2) {
  const b = new Builder();
  b.add(G.rock(0.85, 11), '#ffffff', { p: [0, 0.3, 0], s: [1, 0.78, 0.92] });
  for (let k = 0; k < 7; k++) {
    const a = k * 0.95;
    const y = 0.25 + (k % 3) * 0.18;
    b.add(G.sphere(0.13, 8, 6), k % 2 ? nugget : nugget2, { p: [Math.cos(a) * 0.72, y, Math.sin(a) * 0.66], s: [1, 0.8, 1], tint: 0 });
  }
  return { solid: b.build(), shadow: true };
}

const modelCache = new Map();
export function kindModel(kind) {
  let m = modelCache.get(kind);
  if (m) return m;
  m = BUILDERS[kind] ? BUILDERS[kind]() : {};
  if (m.clumps) m.clumpGeo = buildClumpGeometry(m.clumps, kind.length * 7 + 3);
  if (m.grass) m.grassGeo = tuftGeometry();
  if (m.flower) m.flowerGeo = flowerGeometry();
  if (m.fieldFlower) m.flowerGeo = fieldFlowerGeometry();
  modelCache.set(kind, m);
  return m;
}

// fleur des champs très légère (les champs en comptent des milliers) :
// tige, deux feuilles, corolle à six pétales teintée par instance, cœur doré
function fieldFlowerGeometry() {
  const b = new Builder();
  b.add(G.cyl(0.012, 0.016, 0.34, 3), '#7fbf86', { p: [0, 0.17, 0], tint: 0, sway: 0.6 });
  b.add(G.sphere(0.05, 4, 3), '#86c98f', { p: [0.04, 0.1, 0], s: [1.5, 0.3, 0.7], tint: 0, sway: 0.4 });
  b.add(G.cyl(0.085, 0.06, 0.04, 6), '#ffffff', { p: [0, 0.35, 0], sway: 0.7 });
  b.add(G.sphere(0.03, 4, 3), '#f6d27a', { p: [0, 0.38, 0], tint: 0, sway: 0.7 });
  return b.build();
}

// trois fleurs sur tiges : pétales teintés par instance, tiges et cœurs fixes
function flowerGeometry() {
  const b = new Builder();
  [[0, 0, 0.42], [0.22, 0.12, 0.32], [-0.16, 0.2, 0.36], [0.08, -0.22, 0.3]].forEach(([x, z, h]) => {
    b.add(G.cyl(0.016, 0.022, h, 5), '#7fbf86', { p: [x, h / 2, z], tint: 0, sway: 0.6 });
    b.add(G.sphere(0.06, 6, 4), '#86c98f', { p: [x + 0.05, h * 0.4, z], s: [1.4, 0.3, 0.7], tint: 0, sway: 0.4 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      b.add(G.sphere(0.075, 8, 5), '#ffffff', { p: [x + Math.cos(a) * 0.075, h, z + Math.sin(a) * 0.075], s: [1, 0.45, 1], sway: 0.6 });
    }
    b.add(G.sphere(0.045, 6, 5), '#f6d27a', { p: [x, h + 0.015, z], tint: 0, sway: 0.6 });
  });
  return b.build();
}

// ---------------------------------------------------------------------------
// Structures : gabarits construits à l'origine, tournés et posés ensuite
// Retour : { solid: Builder, glow?: Builder, obstacles: [[x, z, r]] }
// ---------------------------------------------------------------------------
const STONE = '#e6dccd';
const STONE_D = '#cfc2b0';
const MOSS = '#a9d4a0';
const WOOD = '#c98f5f';
const WOOD_D = '#9f6b48';

export const STRUCTURES = {
  ruines(rand) {
    const b = new Builder();
    const obs = [];
    b.add(G.box(7, 0.3, 5.5, 0.08), STONE_D, { p: [0, 0.05, 0] });
    for (let k = 0; k < 6; k++) {
      const x = (k % 3 - 1) * 2.6;
      const z = k < 3 ? -2 : 2;
      const h = rand() < 0.4 ? 0.8 + rand() * 0.8 : 2.4 + rand() * 0.6;
      b.add(G.cyl(0.32, 0.36, h, 12), STONE, { p: [x, 0.2 + h / 2, z] });
      if (h > 2) b.add(G.box(0.9, 0.25, 0.9, 0.05), STONE_D, { p: [x, 0.2 + h + 0.12, z] });
      else b.add(G.sphere(0.36, 10, 6), MOSS, { p: [x, 0.2 + h, z], s: [1, 0.3, 1] });
      obs.push([x, z, 0.45]);
    }
    b.add(G.cyl(0.3, 0.3, 2.2, 12), STONE, { p: [1.4, 0.45, 0.2], r: [0, 0.6, Math.PI / 2] });
    b.add(G.box(2.6, 1.1, 0.5, 0.06), STONE_D, { p: [-2.6, 0.75, 0] , r: [0, Math.PI / 2, 0] });
    b.add(G.sphere(0.7, 12, 8), MOSS, { p: [-2.6, 1.3, 0.4], s: [0.5, 0.3, 1] });
    obs.push([-2.6, 0, 0.6], [-2.6, 1, 0.6], [-2.6, -1, 0.6]);
    return { solid: b, obstacles: obs };
  },
  phare(rand) {
    const b = new Builder();
    const g = new Builder();
    b.add(G.cyl(2.2, 2.4, 0.6, 20), STONE_D, { p: [0, 0.3, 0] });
    b.add(G.cyl(1.05, 1.5, 7.6, 20), '#fbf3e6', { p: [0, 4.4, 0] });
    for (const y of [2.2, 4.6, 7.0]) b.add(G.cyl(1.42 - y * 0.055, 1.48 - y * 0.055, 0.8, 20), '#f19b86', { p: [0, y, 0] });
    b.add(G.cyl(1.55, 1.55, 0.2, 20), '#86c6bb', { p: [0, 8.3, 0] });
    b.add(G.torus(1.45, 0.05, 6, 24), '#86c6bb', { p: [0, 8.85, 0], r: [Math.PI / 2, 0, 0] });
    g.add(G.cyl(0.85, 0.85, 1.1, 14), '#ffe6a8', { p: [0, 9.0, 0] });
    b.add(G.cone(1.1, 1.0, 18), '#f19b86', { p: [0, 10.05, 0] });
    b.add(G.sphere(0.16, 10, 8), '#f6d27a', { p: [0, 10.6, 0] });
    b.add(G.box(0.8, 1.3, 0.2, 0.05), WOOD_D, { p: [0, 1.25, 1.42] });
    // petite maison du gardien
    b.add(G.box(2.4, 1.7, 2.0, 0.1), '#f6ead2', { p: [2.6, 0.85, 0.3] });
    b.add(G.box(2.7, 0.18, 1.4, 0.06), '#86c6bb', { p: [2.6, 1.95, -0.3], r: [0.55, 0, 0] });
    b.add(G.box(2.7, 0.18, 1.4, 0.06), '#86c6bb', { p: [2.6, 1.95, 0.9], r: [-0.55, 0, 0] });
    return { solid: b, glow: g, obstacles: [[0, 0, 2.3], [2.6, 0.3, 1.4]] };
  },
  epave(rand) {
    const b = new Builder();
    const tilt = 0.32;
    b.add(G.sphere(1, 18, 12), WOOD, { p: [0, -0.2, 0], r: [0, 0, tilt], s: [1.45, 0.8, 3.4] });
    b.add(G.sphere(1, 18, 12), '#8a6a5c', { p: [0.08, 0.08, 0], r: [0, 0, tilt], s: [1.2, 0.5, 3.1] });
    for (let k = 0; k < 5; k++) {
      b.add(G.torus(1.25, 0.08, 6, 14, Math.PI), WOOD_D, { p: [0, 0.05, -2.2 + k * 1.1], r: [0, 0, tilt] });
    }
    b.add(G.cyl(0.12, 0.15, 3.2, 10), WOOD_D, { p: [0.6, 1.4, 0.4], r: [0.3, 0, -0.6] });
    b.add(G.box(1.2, 0.08, 0.9, 0.03), '#f6ead2', { p: [1.3, 2.4, 0.7], r: [0.2, 0.4, -0.5] });
    b.add(G.box(0.7, 0.5, 0.6, 0.06), WOOD_D, { p: [-1.6, 0.25, 1.9], r: [0, 0.5, 0.2] });
    return { solid: b, obstacles: [[0, -1.8, 1.3], [0, 0, 1.4], [0, 1.8, 1.3]] };
  },
  cabane(rand) {
    const b = new Builder();
    for (const [x, z] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) b.add(G.cyl(0.09, 0.11, 0.9, 8), WOOD_D, { p: [x, 0.45, z] });
    b.add(G.box(2.7, 0.16, 2.3, 0.04), WOOD, { p: [0, 0.9, 0] });
    b.add(G.box(2.3, 1.6, 1.9, 0.06), '#e0b07e', { p: [0, 1.75, 0] });
    b.add(G.box(2.8, 0.14, 1.5, 0.05), '#86c6bb', { p: [0, 2.9, -0.55], r: [0.62, 0, 0] });
    b.add(G.box(2.8, 0.14, 1.5, 0.05), '#86c6bb', { p: [0, 2.9, 0.55], r: [-0.62, 0, 0] });
    b.add(G.box(0.7, 1.15, 0.08, 0.03), WOOD_D, { p: [0.4, 1.55, 0.97] });
    b.add(G.box(0.55, 0.45, 0.06, 0.03), '#ffeab8', { p: [-0.55, 1.95, 0.97] });
    b.add(G.box(0.8, 0.12, 0.9, 0.03), WOOD, { p: [0.4, 0.45, 1.5], r: [-0.5, 0, 0] });
    return { solid: b, obstacles: [[0, 0, 1.55]] };
  },
  temple(rand) {
    const b = new Builder();
    const g = new Builder();
    b.add(G.box(7, 0.5, 7, 0.08), STONE_D, { p: [0, 0.25, 0] });
    b.add(G.box(5.4, 0.5, 5.4, 0.08), STONE, { p: [0, 0.75, 0] });
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
      b.add(G.cyl(0.3, 0.34, 2.6, 12), STONE, { p: [x, 2.3, z] });
      b.add(G.sphere(0.4, 10, 6), MOSS, { p: [x, 1.05, z], s: [1, 0.35, 1] });
    }
    b.add(G.box(5, 0.35, 5, 0.06), STONE_D, { p: [0, 3.75, 0] });
    b.add(G.cone(3.3, 1.6, 4), '#d6c8b4', { p: [0, 4.7, 0], r: [0, Math.PI / 4, 0] });
    b.add(G.cyl(0.5, 0.6, 0.6, 10), STONE_D, { p: [0, 1.3, 0] });
    g.add(G.sphere(0.32, 14, 10), '#9fdcc8', { p: [0, 1.85, 0], s: [1, 1.3, 1] });
    return { solid: b, glow: g, obstacles: [[-1.9, -1.9, 0.45], [1.9, -1.9, 0.45], [-1.9, 1.9, 0.45], [1.9, 1.9, 0.45], [0, 0, 0.7]] };
  },
  grotte(rand) {
    const b = new Builder();
    const rocks = [[-2.2, 0.8, 0, 1.6], [2.2, 0.8, 0, 1.6], [-1.3, 2.4, 0, 1.3], [1.3, 2.4, 0, 1.3], [0, 3.0, 0, 1.3], [-2.6, 0.3, -1.4, 1.2], [2.5, 0.3, -1.5, 1.2], [0, 2.2, -1.6, 1.6]];
    rocks.forEach(([x, y, z, r], k) => b.add(G.rock(r, 20 + k), k % 3 ? '#cfc3d4' : '#bfb4c8', { p: [x, y, z] }));
    b.add(G.sphere(1.5, 16, 10), '#4d4766', { p: [0, 0.6, -0.9], s: [1, 1.15, 0.6] });
    b.add(G.sphere(0.9, 12, 8), MOSS, { p: [0, 3.8, 0], s: [1.6, 0.3, 1] });
    return { solid: b, obstacles: [[-2.2, 0, 1.5], [2.2, 0, 1.5], [0, -1.6, 1.5]] };
  },
};
