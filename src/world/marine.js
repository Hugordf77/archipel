import * as THREE from 'three';
import { Builder, G } from '../scene/builder.js';
import { toonMaterial } from '../shaders/materials.js';
import { nextId } from '../scene/globals.js';
import { waterDepth } from '../game/navigation.js';
import { MARINE_CELL_SIZE, marineCellKey, marineCellSeed } from './marineSeed.js';

// Éléments marins procéduraux. Les positions sont calculées par cellule et par
// graine : le streaming peut donc détruire/recréer les cellules sans modifier
// l'archipel ni la sauvegarde.
const CELL = MARINE_CELL_SIZE;
const RANGE = 560;
const KEEP = 720;
function rng(seed) {
  let h = seed >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function meshFor(type, rnd) {
  const b = new Builder();
  if (type === 'algue') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(G.cyl(0.025, 0.04, 0.7 + rnd() * 0.35, 5), ['#73c9aa', '#4fae9e', '#9ad4a4'][i % 3], {
        p: [Math.cos(a) * 0.12, -0.28, Math.sin(a) * 0.12],
        r: [0, a, (rnd() - 0.5) * 0.35],
      });
    }
  } else if (type === 'recif') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(G.sphere(0.2 + rnd() * 0.12, 8, 6), ['#e5a3bd', '#e6c27a', '#a9c7df'][i % 3], {
        p: [Math.cos(a) * 0.3, -0.45, Math.sin(a) * 0.22],
        s: [1, 0.65 + rnd() * 0.5, 1],
      });
    }
  } else if (type === 'bouee') {
    b.add(G.cyl(0.17, 0.2, 0.12, 12), '#f4a28c', { p: [0, 0.02, 0] });
    b.add(G.cyl(0.025, 0.03, 0.42, 6), '#fff1dc', { p: [0, 0.25, 0] });
    b.add(G.sphere(0.08, 8, 6), '#f6d27a', { p: [0, 0.47, 0] });
  } else if (type === 'bouteille') {
    b.add(G.cyl(0.07, 0.08, 0.32, 8), '#9fdcc8', { p: [0, 0.06, 0], r: [0, 0, 0.4] });
    b.add(G.cyl(0.035, 0.04, 0.08, 8), '#d6a879', { p: [0, 0.25, 0], r: [0, 0, 0.4] });
  } else if (type === 'caisse') {
    b.add(G.box(0.34, 0.25, 0.3, 0.04), '#b98a64', { p: [0, 0.1, 0] });
    b.add(G.box(0.38, 0.035, 0.035, 0.02), '#e2bb83', { p: [0, 0.1, 0.16] });
    b.add(G.box(0.035, 0.26, 0.035, 0.02), '#e2bb83', { p: [0, 0.1, 0] });
  } else {
    for (let i = 0; i < 4; i++) {
      b.add(G.sphere(0.08, 8, 6), i % 2 ? '#f6d27a' : '#9fdcc8', {
        p: [(i - 1.5) * 0.18, 0, Math.sin(i) * 0.12],
        s: [1.4, 0.45, 0.8],
      });
    }
  }
  const mat = toonMaterial({ vertexColors: true, aId: true, id: nextId(), rim: type === 'recif' ? 0.45 : 0.9, wind: type === 'algue' ? 0.25 : 0 });
  const mesh = new THREE.Mesh(b.build(), mat);
  mesh.layers.enable(1);
  return mesh;
}

function markerFor(type, x, z, rnd) {
  const depth = Math.max(0.3, waterDepth(x, z));
  const y = type === 'recif' || type === 'algue' ? -Math.min(0.65, depth * 0.18) : 0.08;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rnd() * Math.PI * 2;
  root.add(meshFor(type, rnd));
  return root;
}

export class MarineManager {
  constructor({ root, interactions, seed = '', taken = [], onCollect = null }) {
    this.root = root;
    this.interactions = interactions;
    this.seed = String(seed);
    this.taken = new Set(taken);
    this.onCollect = onCollect;
    this.cells = new Map();
    this.group = new THREE.Group();
    this.group.name = 'elements-marins';
    root.add(this.group);
    this.t = 0;
    this.last = { x: Infinity, z: Infinity };
  }

  cellKey(cx, cz) {
    return marineCellKey(cx, cz);
  }

  createCell(cx, cz) {
    const key = this.cellKey(cx, cz);
    if (this.cells.has(key)) return;
    const seed = marineCellSeed(this.seed, cx, cz);
    const rnd = rng(seed);
    const group = new THREE.Group();
    group.name = `mer-${key}`;
    const records = [];
    const count = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 12 + rnd() * (CELL * 0.45);
      const x = cx * CELL + Math.cos(a) * r;
      const z = cz * CELL + Math.sin(a) * r;
      if (waterDepth(x, z) < 0.35) continue;
      const roll = rnd();
      const type = roll < 0.28 ? 'algue' : roll < 0.48 ? 'recif' : roll < 0.62 ? 'poissons' : roll < 0.74 ? 'bouee' : roll < 0.87 ? 'bouteille' : 'caisse';
      const id = `marin_${this.seed}_${cx}_${cz}_${i}`;
      if (this.taken.has(id)) continue;
      const obj = markerFor(type, x, z, rnd);
      group.add(obj);
      const rec = { id, type, x, z, obj, phase: rnd() * 8, baseY: obj.position.y, radius: type === 'poissons' ? 2.4 : 1.3 };
      records.push(rec);
      if (type === 'bouteille' || type === 'caisse' || type === 'bouee') {
        this.interactions?.add({
          id,
          pos: new THREE.Vector3(x, 0.55, z),
          radius: 2.4,
          pickRadius: 45,
          label: type === 'bouee' ? 'Observer la bouée' : type === 'caisse' ? 'Récupérer la caisse' : 'Ramasser la bouteille',
          priority: 0.15,
          action: () => this.collect(rec),
        });
      }
    }
    this.group.add(group);
    this.cells.set(key, { group, records });
  }

  collect(rec) {
    if (!rec || this.taken.has(rec.id)) return;
    this.taken.add(rec.id);
    this.interactions?.remove(rec.id);
    rec.obj.visible = false;
    this.onCollect?.(rec);
  }

  dropCell(key) {
    const cell = this.cells.get(key);
    if (!cell) return;
    for (const rec of cell.records) this.interactions?.remove(rec.id);
    this.group.remove(cell.group);
    cell.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material && !Array.isArray(obj.material)) obj.material.dispose();
    });
    this.cells.delete(key);
  }

  update(dt, px, pz, { wind = 0, storm = false } = {}) {
    this.t += dt;
    const cx = Math.floor(px / CELL);
    const cz = Math.floor(pz / CELL);
    if (Math.hypot(px - this.last.x, pz - this.last.z) > CELL * 0.35) {
      this.last.x = px;
      this.last.z = pz;
      const span = Math.ceil(RANGE / CELL);
      for (let x = cx - span; x <= cx + span; x++) {
        for (let z = cz - span; z <= cz + span; z++) {
          if (Math.hypot(x * CELL - px, z * CELL - pz) < RANGE) this.createCell(x, z);
        }
      }
      for (const [key] of this.cells) {
        const [x, z] = key.split(',').map(Number);
        if (Math.hypot(x * CELL - px, z * CELL - pz) > KEEP) this.dropCell(key);
      }
    }
    for (const { records } of this.cells.values()) {
      for (const rec of records) {
        if (rec.type === 'poissons') {
          const phase = this.t * (storm ? 0.45 : 0.8) + rec.phase;
          rec.obj.position.x = rec.x + Math.sin(phase) * 1.8;
          rec.obj.position.z = rec.z + Math.cos(phase * 0.7) * 1.5;
          rec.obj.rotation.y += dt * (0.15 + wind * 0.03);
        } else if (rec.type === 'bouee' || rec.type === 'bouteille' || rec.type === 'caisse') {
          rec.obj.position.y = rec.baseY + Math.sin(this.t * 1.7 + rec.phase) * (storm ? 0.09 : 0.04);
          rec.obj.rotation.z = Math.sin(this.t * 1.3 + rec.phase) * (storm ? 0.09 : 0.035);
        }
      }
    }
  }

  serializeTaken() {
    return [...this.taken];
  }
}
