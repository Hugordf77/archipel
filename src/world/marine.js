import * as THREE from 'three';
import { waterDepth } from './navigation.js';
import { MARINE_CELL_SIZE, marineCellKey, marineCellSeed } from './marineSeed.js';
import { marineMesh } from '../models/props/objets.js';

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


function markerFor(type, x, z, rnd) {
  const depth = Math.max(0.3, waterDepth(x, z));
  const y = type === 'recif' || type === 'algue' ? -Math.min(0.65, depth * 0.18) : 0.08;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rnd() * Math.PI * 2;
  root.add(marineMesh(type, rnd));
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
