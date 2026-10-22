import * as THREE from 'three';
import { waterDepth } from './navigation.js';
import { ARCHIPEL } from './archipel.js';
import { hashString, mulberry32 } from '../core/random.js';
import { marineMesh } from '../models/objets/index.js';

// Éléments de la mer à positions fixes (ARCHIPEL.marine) : algues, récifs, bancs de poissons,
// bouées, bouteilles et caisses. Tous construits au démarrage (une cinquantaine d'objets) ;
// ceux qu'on a ramassés restent dans la sauvegarde (identifiants stables).
const DRIFTING = new Set(['bouee', 'bouteille', 'caisse']);
const LABELS = { bouee: 'Observer la bouée', caisse: 'Récupérer la caisse', bouteille: 'Ramasser la bouteille' };

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
  // list : éléments à poser (ceux de l'archipel par défaut ; vide à l'étape « bases » de l'open world)
  constructor({ root, interactions, taken = [], onCollect = null, list = ARCHIPEL.marine }) {
    this.root = root;
    this.interactions = interactions;
    this.taken = new Set(taken);
    this.onCollect = onCollect;
    this.group = new THREE.Group();
    this.group.name = 'elements-marins';
    root.add(this.group);
    this.t = 0;
    this.records = [];
    for (const m of list) this.create(m);
  }

  create({ id, type, x, z }) {
    if (this.taken.has(id)) return;
    const rnd = mulberry32(hashString(id));
    const obj = markerFor(type, x, z, rnd);
    this.group.add(obj);
    const rec = { id, type, x, z, obj, phase: rnd() * 8, baseY: obj.position.y, radius: type === 'poissons' ? 2.4 : 1.3 };
    this.records.push(rec);
    if (DRIFTING.has(type)) {
      this.interactions?.add({
        id,
        pos: new THREE.Vector3(x, 0.55, z),
        radius: 2.4,
        pickRadius: 45,
        label: LABELS[type],
        priority: 0.15,
        action: () => this.collect(rec),
      });
    }
  }

  collect(rec) {
    if (!rec || this.taken.has(rec.id)) return;
    this.taken.add(rec.id);
    this.interactions?.remove(rec.id);
    rec.obj.visible = false;
    this.onCollect?.(rec);
  }

  update(dt, px, pz, { wind = 0, storm = false } = {}) {
    this.t += dt;
    for (const rec of this.records) {
      if (!rec.obj.visible) continue;
      if (rec.type === 'poissons') {
        const phase = this.t * (storm ? 0.45 : 0.8) + rec.phase;
        rec.obj.position.x = rec.x + Math.sin(phase) * 1.8;
        rec.obj.position.z = rec.z + Math.cos(phase * 0.7) * 1.5;
        rec.obj.rotation.y += dt * (0.15 + wind * 0.03);
      } else if (DRIFTING.has(rec.type)) {
        rec.obj.position.y = rec.baseY + Math.sin(this.t * 1.7 + rec.phase) * (storm ? 0.09 : 0.04);
        rec.obj.rotation.z = Math.sin(this.t * 1.3 + rec.phase) * (storm ? 0.09 : 0.035);
      }
    }
  }

  serializeTaken() {
    return [...this.taken];
  }
}
