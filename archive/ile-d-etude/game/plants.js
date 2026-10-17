import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, G } from '../scene/builder.js';
import { toonMaterial } from '../shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../scene/globals.js';
import { LAYOUT, heightAt, pathMask, vnoise } from '../scene/terrain.js';
import { groundAt, blockedByObstacle, waterDepth } from './navigation.js';
import { SPECIES, todayKey, dayKeyOf } from './state.js';

const STEM = '#7cc283';
const LEAF = '#8fd08a';
const LEAF_DARK = '#6fbb84';
const damp = (k, dt) => 1 - Math.exp(-k * dt);

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Croissance : une session plante une pousse ; les jours et l'arrosage la font grandir.
// ---------------------------------------------------------------------------
export function growthOf(plant, now = Date.now()) {
  const days = Math.max(0, (now - plant.plantedAt) / 86400000);
  const g = 0.16 + Math.min(0.5, (plant.minutes || 25) / 100) + days * 0.11 + (plant.waterings?.length || 0) * 0.09;
  return Math.min(1, g);
}

export function stageOf(g) {
  if (g < 0.45) return 0;
  if (g < 0.65) return 1;
  if (g < 0.85) return 2;
  return 3;
}

export const STAGE_NAMES = ['pousse', 'jeune plante', 'belle plante', 'en fleurs'];

// ---------------------------------------------------------------------------
// Construction des espèces (formes rondes, jouet)
// ---------------------------------------------------------------------------
function leafPair(b, y, size, color = LEAF, rot = 0) {
  b.add(G.sphere(size, 10, 6), color, { p: [Math.cos(rot) * size * 0.9, y, Math.sin(rot) * size * 0.9], s: [1.25, 0.32, 0.65], r: [0, -rot, 0.45] });
  b.add(G.sphere(size, 10, 6), color, { p: [-Math.cos(rot) * size * 0.9, y - 0.01, -Math.sin(rot) * size * 0.9], s: [1.25, 0.32, 0.65], r: [0, -rot, -0.45] });
}

function sprout(b, color) {
  b.add(G.cyl(0.022, 0.028, 0.2, 6), STEM, { p: [0, 0.1, 0] });
  leafPair(b, 0.19, 0.075);
  b.add(G.sphere(0.032, 8, 6), color, { p: [0, 0.22, 0] });
}

// rosette de feuilles rondes à la base (volume « jouet »)
function rosette(b, n, size, r) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.6;
    b.add(G.sphere(size, 10, 8), i % 2 ? LEAF : LEAF_DARK, { p: [Math.cos(a) * size * 0.9, size * 0.35, Math.sin(a) * size * 0.9], s: [1.2, 0.45, 0.8], r: [0, -a, 0.25] });
  }
}

const BUILDERS = {
  tulipe(b, c, st, r) {
    const H = [0, 0.2, 0.3, 0.36][st];
    rosette(b, 4, 0.08 + st * 0.012, r);
    b.add(G.cyl(0.025, 0.03, H, 6), STEM, { p: [0, H / 2, 0] });
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI + r() * 0.5;
      b.add(G.sphere(0.08, 10, 6), LEAF, { p: [Math.cos(a) * 0.07, H * 0.32, Math.sin(a) * 0.07], s: [0.55, 2.2, 0.35], r: [0, -a, Math.cos(a) * 0.35] });
    }
    if (st === 1) {
      b.add(G.sphere(0.07, 10, 8), '#a9d98f', { p: [0, H + 0.04, 0], s: [0.85, 1.25, 0.85] });
    } else if (st === 2) {
      b.add(G.sphere(0.11, 12, 10), c, { p: [0, H + 0.07, 0], s: [0.9, 1.2, 0.9] });
    } else {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.add(G.sphere(0.1, 10, 8), c, { p: [Math.cos(a) * 0.07, H + 0.1, Math.sin(a) * 0.07], s: [0.72, 1.3, 0.55], r: [Math.sin(a) * 0.35, -a, -Math.cos(a) * 0.35] });
      }
      b.add(G.sphere(0.05, 8, 6), '#fff4d6', { p: [0, H + 0.09, 0] });
    }
  },
  tournesol(b, c, st, r) {
    const H = [0, 0.3, 0.46, 0.56][st];
    rosette(b, 5, 0.09 + st * 0.012, r);
    b.add(G.cyl(0.03, 0.04, H, 7), STEM, { p: [0, H / 2, 0] });
    leafPair(b, H * 0.35, 0.1, LEAF, r() * 3);
    if (st >= 2) leafPair(b, H * 0.62, 0.085, LEAF_DARK, r() * 3);
    if (st === 1) {
      b.add(G.sphere(0.07, 10, 8), '#a9d98f', { p: [0, H + 0.04, 0] });
    } else {
      const n = 11;
      const pr = st === 3 ? 0.15 : 0.09;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        b.add(G.sphere(0.065, 8, 6), c, { p: [Math.cos(a) * pr, H + 0.08 + Math.sin(a) * pr, 0.04], s: [st === 3 ? 1.6 : 1.1, 0.7, 0.35], r: [0, 0, a] });
      }
      b.add(G.sphere(st === 3 ? 0.11 : 0.075, 12, 8), '#a8794f', { p: [0, H + 0.08, 0.06], s: [1, 1, 0.45] });
    }
  },
  champignon(b, c, st, r, glow) {
    const n = [0, 1, 2, 3][st];
    for (let i = 0; i < n; i++) {
      const a = i * 2.1 + r();
      const d = i === 0 ? 0 : 0.14;
      const s = i === 0 ? 1 : 0.65;
      const h = (st === 1 ? 0.18 : 0.3) * s;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      b.add(G.cyl(0.04 * s, 0.05 * s, h, 8), '#fbf0dc', { p: [x, h / 2, z] });
      glow.add(G.sphere(0.13 * s, 14, 10), c, { p: [x, h + 0.02, z], s: [1, 0.62, 1] });
      for (let k = 0; k < 4; k++) {
        const ka = k * 1.6 + a;
        glow.add(G.sphere(0.022 * s, 6, 4), '#fffaf0', { p: [x + Math.cos(ka) * 0.07 * s, h + 0.08 * s, z + Math.sin(ka) * 0.07 * s] });
      }
    }
  },
  cactus(b, c, st) {
    const R = [0, 0.13, 0.18, 0.2][st];
    b.add(G.sphere(R, 16, 12), '#8fcf8f', {
      p: [0, R * 0.95, 0],
      s: [1, 1.15, 1],
      colorFn: (col, x, y, z) => col.multiplyScalar(0.92 + 0.08 * Math.cos(Math.atan2(z, x) * 8)),
    });
    if (st >= 2) {
      b.add(G.sphere(R * 0.45, 12, 8), '#8fcf8f', { p: [R * 1.0, R * 1.2, 0], s: [1, 1.3, 1] });
      b.add(G.sphere(R * 0.38, 12, 8), '#8fcf8f', { p: [-R * 0.95, R * 0.9, 0.04], s: [1, 1.3, 1] });
    }
    if (st === 3) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.add(G.sphere(0.045, 8, 6), c, { p: [Math.cos(a) * 0.045, R * 2.2, Math.sin(a) * 0.045], s: [1, 0.5, 1] });
      }
      b.add(G.sphere(0.03, 6, 6), '#f6d27a', { p: [0, R * 2.25, 0] });
    } else if (st === 2) {
      b.add(G.sphere(0.04, 8, 6), c, { p: [0, R * 2.2, 0] });
    }
  },
  fougere(b, c, st, r) {
    const n = [0, 3, 5, 7][st];
    const L = [0, 0.3, 0.45, 0.55][st];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.4;
      const segs = 6;
      for (let k = 0; k < segs; k++) {
        const t = k / segs;
        const d = t * L * 0.8;
        const y = Math.sin(t * Math.PI * 0.8) * L * 0.9;
        const s = 0.05 * (1 - t * 0.5);
        b.add(G.sphere(s, 8, 6), k % 2 ? LEAF : LEAF_DARK, { p: [Math.cos(a) * d, y + 0.02, Math.sin(a) * d], s: [1.6, 0.5, 1], r: [0, -a, 0.3] });
      }
      // crosse enroulée colorée au bout
      b.add(G.torus(0.035, 0.014, 6, 12, Math.PI * 1.5), c, { p: [Math.cos(a) * L * 0.85, L * 0.55, Math.sin(a) * L * 0.85], r: [0, -a + Math.PI / 2, 0] });
    }
  },
  bambou(b, c, st, r) {
    const n = [0, 1, 2, 3][st];
    for (let i = 0; i < n; i++) {
      const a = i * 2.3;
      const x = i === 0 ? 0 : Math.cos(a) * 0.1;
      const z = i === 0 ? 0 : Math.sin(a) * 0.1;
      const H = [0, 0.4, 0.7, 0.95][st] * (i === 0 ? 1 : 0.75);
      const seg = 4;
      for (let k = 0; k < seg; k++) {
        b.add(G.cyl(0.03, 0.033, H / seg - 0.01, 8), '#a9d47f', { p: [x, (k + 0.5) * (H / seg), z] });
        b.add(G.torus(0.033, 0.01, 4, 10), '#88b86a', { p: [x, (k + 1) * (H / seg), z], r: [Math.PI / 2, 0, 0] });
      }
      b.add(G.sphere(0.06, 8, 6), LEAF, { p: [x + 0.06, H, z], s: [1.6, 0.3, 0.6], r: [0, a, 0.4] });
      b.add(G.sphere(0.05, 8, 6), LEAF_DARK, { p: [x - 0.05, H - 0.05, z], s: [1.6, 0.3, 0.6], r: [0, -a, -0.4] });
    }
    if (st === 3) b.add(G.box(0.05, 0.12, 0.01, 0.005), c, { p: [0.04, 0.55, 0.04], r: [0, 0.4, 0.1] });
  },
  arbuste(b, c, st) {
    const H = [0, 0.3, 0.5, 0.62][st];
    const R = [0, 0.16, 0.24, 0.28][st];
    b.add(G.cyl(0.035, 0.05, H, 7), '#b98a64', { p: [0, H / 2, 0] });
    b.add(G.sphere(R, 14, 10), LEAF, { p: [0, H + R * 0.6, 0] });
    if (st >= 2) {
      b.add(G.sphere(R * 0.7, 12, 8), LEAF_DARK, { p: [R * 0.7, H + R * 0.3, 0.05] });
      b.add(G.sphere(R * 0.65, 12, 8), '#a4dc94', { p: [-R * 0.65, H + R * 0.45, -0.05] });
    }
    if (st === 3) {
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        b.add(G.sphere(0.04, 8, 6), c, { p: [Math.cos(a) * R * 0.95, H + R * (0.4 + (i % 2) * 0.5), Math.sin(a) * R * 0.95] });
      }
    }
  },
  clochette(b, c, st, r) {
    const H = [0, 0.26, 0.38, 0.45][st];
    rosette(b, 4, 0.08 + st * 0.01, r);
    const bells = [0, 1, 3, 5][st];
    // tige arquée
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(new THREE.Vector3(Math.sin(t * 1.6) * H * 0.45, Math.sin(t * Math.PI * 0.62) * H, 0));
    }
    for (let k = 0; k < 6; k++) {
      const p = pts[k];
      const q = pts[k + 1];
      const mid = p.clone().add(q).multiplyScalar(0.5);
      const ang = Math.atan2(q.x - p.x, q.y - p.y);
      b.add(G.cyl(0.018, 0.02, p.distanceTo(q) + 0.01, 5), STEM, { p: [mid.x, mid.y, mid.z], r: [0, 0, -ang] });
    }
    leafPair(b, 0.06, 0.09, LEAF, r() * 3);
    for (let i = 0; i < bells; i++) {
      const p = pts[6 - Math.min(5, i)];
      const x = p.x + (i % 2 ? 0.03 : -0.02);
      b.add(G.cone(0.075, 0.13, 10), c, { p: [x, p.y - 0.09, p.z], r: [0, 0, 0] });
      b.add(G.sphere(0.024, 6, 4), '#fff4d6', { p: [x, p.y - 0.17, p.z] });
    }
  },
};

export function buildPlantMesh(species, color, stage, seed = 1) {
  const r = rng(seed);
  const id = nextId();
  const b = new Builder(id);
  const glow = new Builder(id);
  if (stage === 0) sprout(b, color);
  else (BUILDERS[species] || BUILDERS.tulipe)(b, color, stage, r, glow);
  const group = new THREE.Group();
  const body = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, id, rim: 1.1, wind: 1.4 }));
  body.userData.kind = 'body';
  body.layers.enable(LAYER_SHADOW);
  group.add(body);
  if (glow.parts.length) {
    const gm = new THREE.Mesh(glow.build(), toonMaterial({ vertexColors: true, id, rim: 1.1, emissive: new THREE.Color(color).multiplyScalar(0.55), emissiveNight: true }));
    gm.userData.kind = 'glow';
    gm.layers.enable(LAYER_SHADOW);
    group.add(gm);
  }
  return group;
}

// Petit monticule de terre sous les plantes poussées hors du potager
function moundMesh() {
  const b = new Builder();
  b.add(G.sphere(0.48, 14, 8), '#b88a66', { s: [1, 0.22, 1] });
  b.add(G.sphere(0.06, 6, 4), '#d9cfc4', { p: [0.27, 0.03, 0.1] });
  b.add(G.sphere(0.05, 6, 4), '#d9cfc4', { p: [-0.22, 0.03, -0.16] });
  const m = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, rim: 0.4 }));
  m.userData.kind = 'mound';
  return m;
}

// ---------------------------------------------------------------------------
// Potager : emplacements, plantes, arrosage
// ---------------------------------------------------------------------------
export class Garden {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.group = new THREE.Group();
    this.group.name = 'potager';
    this.scene.add(this.group);
    this.views = new Map();
    this.slots = this.computeSlots(game.world.spots.plots);
    this.drops = [];
    this.pot = null;
    this.buildFirstTag();
    // plantes au repos fusionnées : deux appels de dessin quel que soit leur nombre
    this.baked = {
      body: new THREE.Mesh(new THREE.BufferGeometry(), toonMaterial({ vertexColors: true, aId: true, rim: 1.1, wind: 1.4, sway: true })),
      glow: new THREE.Mesh(new THREE.BufferGeometry(), toonMaterial({ vertexColors: true, aId: true, rim: 1.1, emissiveVColor: 0.55, emissiveNight: true })),
    };
    for (const m of Object.values(this.baked)) {
      m.layers.enable(LAYER_SHADOW);
      m.frustumCulled = false;
      m.visible = false;
      this.group.add(m);
    }
    this.bakeDirty = false;
  }

  // Fusionne les plantes immobiles ; celles qui s'animent restent des objets à part
  bake() {
    this.bakeDirty = false;
    const parts = { body: [], glow: [] };
    for (const v of this.views.values()) {
      const resting = v.wiggle <= 0;
      v.root.visible = !resting;
      if (!resting) continue;
      v.root.updateMatrixWorld(true);
      v.root.traverse((o) => {
        if (!o.isMesh) return;
        const g = o.geometry.clone();
        if (o.userData.kind !== 'glow') {
          // le vent dépend de la hauteur locale de la plante, comme sur le maillage d'origine
          const pos = g.attributes.position;
          const sway = g.attributes.aSway;
          for (let i = 0; i < pos.count; i++) sway.setX(i, o.userData.kind === 'body' ? Math.max(0, pos.getY(i)) : 0);
        }
        g.applyMatrix4(o.matrixWorld);
        parts[o.userData.kind === 'glow' ? 'glow' : 'body'].push(g);
      });
    }
    for (const [k, list] of Object.entries(parts)) {
      const m = this.baked[k];
      m.geometry.dispose();
      m.geometry = list.length ? mergeGeometries(list) : new THREE.BufferGeometry();
      m.visible = list.length > 0;
      for (const g of list) g.dispose();
    }
  }

  // Petit tuteur et étiquette en bois sur la première parcelle
  buildFirstTag() {
    const slot = this.slots[0];
    const b = new Builder();
    b.add(G.cyl(0.025, 0.03, 0.75, 6), '#b98a64', { p: [0.45, 0.38, 0.45] });
    b.add(G.box(0.36, 0.2, 0.04, 0.03), '#e8c08e', { p: [0.45, 0.62, 0.48], r: [0, 0.3, 0.06] });
    b.add(G.cyl(0.008, 0.008, 0.1, 4), '#9a6f50', { p: [0.45, 0.72, 0.47] });
    this.firstTag = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, aId: true, rim: 0.6 }));
    this.firstTag.position.set(slot.x, slot.y - 0.04, slot.z);
    this.firstTag.layers.enable(LAYER_SHADOW);
    this.firstTag.userData.labelPos = new THREE.Vector3(slot.x + 0.45, slot.y + 0.95, slot.z + 0.48);
    this.group.add(this.firstTag);
  }

  get showFirstTag() {
    return this.game.state.plants.length === 0;
  }

  computeSlots(plots) {
    const slots = plots.map((p) => ({ x: p.x, z: p.z, y: p.y, plot: true }));
    const r = rng(77);
    const wild = [];
    let tries = 0;
    while (wild.length < 160 && tries++ < 8000) {
      const x = (r() * 2 - 1) * 20;
      const z = (r() * 2 - 1) * 22;
      const y = heightAt(x, z);
      const onGrass = (y > 0.88 && y < 1.4) || (y > 3.2 && y < 3.7);
      if (!onGrass || pathMask(x, z) > 0.15 || waterDepth(x, z) > 0) continue;
      if (blockedByObstacle(x, z, 0.8)) continue;
      if (this.game.world.flowers?.near(x, z, 0.75)) continue;
      if (Math.abs(x - LAYOUT.garden.x) < 4.8 && Math.abs(z - LAYOUT.garden.z) < 3.8) continue;
      // pente douce seulement
      const e = 0.4;
      if (Math.abs(heightAt(x + e, z) - heightAt(x - e, z)) > 0.25 || Math.abs(heightAt(x, z + e) - heightAt(x, z - e)) > 0.25) continue;
      if (wild.some((w) => Math.hypot(w.x - x, w.z - z) < 1.7)) continue;
      if (slots.some((w) => Math.hypot(w.x - x, w.z - z) < 1.7)) continue;
      wild.push({ x, z, y: groundAt(x, z).y, plot: false, d: Math.hypot(x - LAYOUT.garden.x, z - LAYOUT.garden.z) + vnoise(x * 0.2, z * 0.2) * 6 });
    }
    wild.sort((a, b) => a.d - b.d);
    return slots.concat(wild);
  }

  freeSlot() {
    const used = new Set(this.game.state.plants.map((p) => p.slot));
    for (let i = 0; i < this.slots.length; i++) if (!used.has(i)) return i;
    return -1;
  }

  subjectOf(plant) {
    return this.game.state.subjects.find((s) => s.id === plant.subjectId);
  }

  wateredToday(plant) {
    return (plant.waterings || []).includes(todayKey());
  }

  // Synchronise les maillages avec la sauvegarde
  sync(animateId = null) {
    const plants = this.game.state.plants;
    const alive = new Set(plants.map((p) => p.id));
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        this.group.remove(v.root);
        this.game.interactions.remove(`plant_${id}`);
        this.views.delete(id);
      }
    }
    for (const p of plants) this.refreshPlant(p, p.id === animateId);
    this.bakeDirty = true;
  }

  refreshPlant(p, animate = false) {
    const slot = this.slots[p.slot];
    if (!slot) return;
    const subject = this.subjectOf(p);
    const color = subject?.color || '#f4a28c';
    const stage = stageOf(growthOf(p));
    let v = this.views.get(p.id);
    if (!v) {
      const root = new THREE.Group();
      root.position.set(slot.x, slot.plot ? slot.y : slot.y - 0.02, slot.z);
      root.rotation.y = (hashStr(p.id) % 628) / 100;
      if (!slot.plot) root.add(moundMesh());
      this.group.add(root);
      v = { root, mesh: null, stage: -1, wiggle: 0, plant: p };
      this.views.set(p.id, v);
      this.game.interactions.add({
        id: `plant_${p.id}`,
        pos: new THREE.Vector3(slot.x, slot.y + 0.9, slot.z),
        approach: { x: slot.x, z: slot.z + 0.95 },
        radius: 1.45,
        promptHeight: 0.8,
        priority: 0.1,
        label: () => `Arroser : ${SPECIES[p.species]?.name || 'plante'}`,
        enabled: () => !this.wateredToday(p) && this.game.mode !== 'focus',
        action: () => this.game.waterPlant(p),
      });
    }
    v.plant = p;
    if (v.stage !== stage || v.color !== color) {
      if (v.mesh) v.root.remove(v.mesh);
      const scale = 0.95 + (hashStr(p.id) % 30) / 100;
      v.mesh = buildPlantMesh(p.species, color, stage, hashStr(p.id) % 1000);
      v.mesh.scale.setScalar(scale * (stage === 0 ? 1.7 : 1.85));
      v.mesh.position.y = slot.plot ? 0.02 : 0.05;
      v.root.add(v.mesh);
      if (v.stage !== -1 || animate) v.wiggle = 1;
      v.stage = stage;
      v.color = color;
      this.bakeDirty = true;
    }
    if (animate) v.wiggle = 1.3;
    if (v.wiggle > 0) this.bakeDirty = true;
  }

  plant(subject, minutes) {
    const slot = this.freeSlot();
    if (slot < 0) return null;
    const rec = {
      id: `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      subjectId: subject.id,
      species: subject.species,
      slot,
      plantedAt: Date.now(),
      minutes: Math.round(minutes),
      waterings: [],
    };
    this.game.state.plants.push(rec);
    this.sync(rec.id);
    return rec;
  }

  water(p) {
    const k = todayKey();
    p.waterings = p.waterings || [];
    if (p.waterings.includes(k)) return false;
    p.waterings.push(k);
    const slot = this.slots[p.slot];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(this.dropGeo || (this.dropGeo = new THREE.SphereGeometry(0.035, 6, 4)), this.dropMat || (this.dropMat = toonMaterial({ color: '#9cd4f0', rim: 0.6, outline: 0 })));
      m.position.set(slot.x + (Math.random() - 0.5) * 0.3, slot.y + 0.9 + Math.random() * 0.2, slot.z + 0.3 + (Math.random() - 0.5) * 0.3);
      m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.5 - Math.random(), -0.5 - Math.random() * 0.3);
      m.userData.life = 0.6 + Math.random() * 0.4;
      m.userData.delay = i * 0.04;
      m.visible = false;
      this.scene.add(m);
      this.drops.push(m);
    }
    setTimeout(() => this.refreshPlant(p, true), 650);
    return true;
  }

  // Petit pot sur le bureau : la pousse grandit pendant la session
  showPot(subject) {
    this.hidePot();
    const d = this.game.world.spots.desk;
    const group = new THREE.Group();
    const b = new Builder();
    b.add(G.cyl(0.09, 0.07, 0.12, 12), '#e8987a', { p: [0, 0.06, 0] });
    b.add(G.torus(0.09, 0.02, 6, 14), '#f0a88a', { p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0] });
    b.add(G.cyl(0.08, 0.08, 0.02, 12), '#9a7052', { p: [0, 0.115, 0] });
    group.add(new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, rim: 0.8 })));
    const sproutGroup = buildPlantMesh(subject.species, subject.color, 0, 3);
    sproutGroup.position.y = 0.12;
    sproutGroup.scale.setScalar(0.01);
    group.add(sproutGroup);
    group.position.copy(d.potPos);
    this.scene.add(group);
    this.pot = { group, sprout: sproutGroup, subject, stage: 0 };
  }

  setPotProgress(p) {
    if (!this.pot) return;
    // la pousse grandit, puis bourgeonne à la fin
    const target = 0.25 + p * 0.95;
    const s = this.pot.sprout;
    s.scale.setScalar(s.scale.x + (target - s.scale.x) * 0.1);
    if (p > 0.66 && this.pot.stage === 0) {
      this.pot.stage = 1;
      this.pot.group.remove(s);
      const ns = buildPlantMesh(this.pot.subject.species, this.pot.subject.color, 1, 3);
      ns.position.y = 0.12;
      ns.scale.setScalar(target * 0.75);
      this.pot.group.add(ns);
      this.pot.sprout = ns;
    }
  }

  hidePot() {
    if (this.pot) this.scene.remove(this.pot.group);
    this.pot = null;
  }

  update(dt) {
    const t = performance.now() / 1000;
    for (const v of this.views.values()) {
      if (v.wiggle > 0) {
        v.wiggle = Math.max(0, v.wiggle - dt * 1.4);
        if (v.wiggle === 0) this.bakeDirty = true;
        const k = v.wiggle;
        const sq = Math.sin(k * Math.PI * 4) * k * 0.25;
        v.root.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
        if (k > 1) v.root.scale.multiplyScalar(Math.max(0.05, 1 - (k - 1) * 3));
      } else {
        v.root.scale.set(1, 1, 1);
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (d.userData.delay > 0) {
        d.userData.delay -= dt;
        continue;
      }
      d.visible = true;
      d.userData.life -= dt;
      d.userData.v.y -= 6 * dt;
      d.position.addScaledVector(d.userData.v, dt);
      if (d.userData.life <= 0) {
        this.scene.remove(d);
        this.drops.splice(i, 1);
      }
    }
    if (this.pot) this.pot.group.rotation.y = Math.sin(t * 0.5) * 0.1;
    if (this.bakeDirty) this.bake();
    if (this.firstTag) this.firstTag.visible = this.showFirstTag;
  }

  // Nombre de jours consécutifs (pour le journal)
  static plantedOn(plants, day) {
    return plants.filter((p) => dayKeyOf(p.plantedAt) === day).length;
  }
}
