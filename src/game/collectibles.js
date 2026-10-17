import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, G } from '../scene/builder.js';
import { toonMaterial, glowMaterial } from '../shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../scene/globals.js';
import { coastRadius, heightAt } from '../scene/terrain.js';
import { groundAt, blockedByObstacle } from './navigation.js';

// Petits trésors qui apparaissent chaque jour (positions tirées selon la date)
export const KINDS = {
  coquillage: { name: 'coquillage', label: 'Ramasser le coquillage', value: 1 },
  etoile: { name: 'étoile de mer', label: "Ramasser l'étoile de mer", value: 3 },
  verre: { name: 'verre poli', label: 'Ramasser le verre poli', value: 2 },
  perle: { name: 'perle', label: 'Ramasser la perle !', value: 8 },
  peche: { name: 'pêche', label: 'Cueillir la pêche', value: 2 },
};

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function buildMesh(kind, rnd) {
  const id = nextId();
  const b = new Builder(id);
  if (kind === 'coquillage') {
    const c = ['#ffd7c4', '#f9c0cf', '#fff1dc'][Math.floor(rnd() * 3)];
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * 1.5;
      b.add(G.sphere(0.07, 8, 6), c, { p: [Math.sin(a) * 0.08, 0.035, Math.cos(a) * 0.06 - 0.02], s: [0.45, 0.45, 1.5], r: [0, a, 0] });
    }
    b.add(G.sphere(0.05, 8, 6), '#e9a991', { p: [0, 0.03, -0.07], s: [1.4, 0.7, 0.8] });
  } else if (kind === 'etoile') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(G.sphere(0.06, 8, 6), '#f6a96f', { p: [Math.sin(a) * 0.09, 0.025, Math.cos(a) * 0.09], s: [0.7, 0.4, 1.9], r: [0, a, 0] });
    }
    b.add(G.sphere(0.06, 8, 6), '#f39a63', { p: [0, 0.035, 0], s: [1, 0.55, 1] });
  } else if (kind === 'verre') {
    const c = ['#9fdcc8', '#9cc8ec', '#c7b2e6'][Math.floor(rnd() * 3)];
    b.add(G.box(0.16, 0.06, 0.12, 0.03), c, { p: [0, 0.03, 0], r: [0, rnd() * 3, 0] });
  } else if (kind === 'perle') {
    b.add(G.sphere(0.12, 12, 8), '#f4dfe8', { p: [0, 0.03, 0], s: [1, 0.3, 1] });
    b.add(G.sphere(0.06, 12, 10), '#fffaf6', { p: [0, 0.08, 0.02] });
  } else if (kind === 'peche') {
    b.add(G.sphere(0.12, 12, 10), '#f7b48a', { p: [0, 0.11, 0] });
    b.add(G.sphere(0.05, 6, 4), '#9fd08a', { p: [0.05, 0.22, 0], s: [1, 0.4, 0.6] });
  }
  const mesh = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, id, rim: 1.3 }));
  mesh.layers.enable(LAYER_SHADOW);
  return mesh;
}

export class Collectibles {
  constructor(scene, interactions, onPick) {
    this.scene = scene;
    this.interactions = interactions;
    this.onPick = onPick;
    this.items = [];
    this.group = new THREE.Group();
    this.group.name = 'tresors';
    scene.add(this.group);
    // tous les scintillements dans un seul maillage instancié
    this.sparks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial(0xfff4c2, 0.45), 16);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 12;
    this.sparks.count = 0;
    scene.add(this.sparks);
    this._m = new THREE.Matrix4();
    // trésors posés fusionnés en un seul maillage ; celui qu'on ramasse redevient un objet à part
    this.baked = new THREE.Mesh(new THREE.BufferGeometry(), toonMaterial({ vertexColors: true, aId: true, rim: 1.3 }));
    this.baked.layers.enable(LAYER_SHADOW);
    this.baked.frustumCulled = false;
    this.group.add(this.baked);
    this.t = 0;
  }

  bake() {
    const list = [];
    for (const it of this.items) {
      it.obj.visible = false;
      it.obj.updateMatrixWorld(true);
      it.obj.traverse((o) => {
        if (o.isMesh) list.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
      });
    }
    this.baked.geometry.dispose();
    this.baked.geometry = list.length ? mergeGeometries(list) : new THREE.BufferGeometry();
    this.baked.visible = list.length > 0;
    for (const g of list) g.dispose();
  }

  // (Re)génère les trésors du jour, sans ceux déjà ramassés
  refresh(day, taken = []) {
    for (const it of this.items) {
      this.interactions.remove(it.id);
      this.group.remove(it.obj);
    }
    this.items = [];
    const rnd = seeded(`ile-${day}`);
    const list = [];
    let guard = 0;
    while (list.length < 9 && guard++ < 400) {
      const ang = rnd() * Math.PI * 2;
      const rr = 22.9 + rnd() * 3.0;
      const r = rr - coastRadius(ang);
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const g = groundAt(x, z);
      if (g.deck || g.y < 0.04 || g.y > 0.62 || blockedByObstacle(x, z, 0.4)) continue;
      if (list.some((p) => Math.hypot(p.x - x, p.z - z) < 3)) continue;
      const roll = rnd();
      const kind = roll < 0.04 ? 'perle' : roll < 0.55 ? 'coquillage' : roll < 0.78 ? 'verre' : 'etoile';
      list.push({ x, z, kind });
    }
    // pêches tombées sous l'arbre fruitier
    for (let i = 0; i < 2; i++) {
      const a = rnd() * Math.PI * 2;
      const x = -15.5 + Math.cos(a) * 1.3;
      const z = 12.5 + Math.sin(a) * 1.3;
      list.push({ x, z, kind: 'peche' });
    }
    list.forEach((p, i) => {
      const id = `tresor_${i}`;
      if (taken.includes(id)) return;
      const obj = new THREE.Group();
      const mesh = buildMesh(p.kind, rnd);
      mesh.rotation.y = rnd() * Math.PI * 2;
      obj.add(mesh);
      const y = groundAt(p.x, p.z).y;
      obj.position.set(p.x, y, p.z);
      this.group.add(obj);
      const item = { id, kind: p.kind, obj, phase: rnd() * 10 };
      this.items.push(item);
      this.interactions.add({
        id,
        pos: new THREE.Vector3(p.x, y + 0.3, p.z),
        radius: 1.3,
        promptHeight: 0.6,
        label: KINDS[p.kind].label,
        priority: 0.3,
        action: () => this.onPick?.(item),
      });
    });
    this.bake();
  }

  remove(item) {
    this.interactions.remove(item.id);
    this.items = this.items.filter((i) => i !== item);
    this.bake();
    // petit envol vers le joueur puis disparition
    const o = item.obj;
    o.visible = true;
    const start = performance.now();
    const y0 = o.position.y;
    const tick = () => {
      const k = (performance.now() - start) / 450;
      if (k >= 1) {
        this.group.remove(o);
        return;
      }
      o.position.y = y0 + Math.sin(k * Math.PI) * 0.8 + k * 0.4;
      o.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.4 - k * 0.8);
      requestAnimationFrame(tick);
    };
    tick();
  }

  update(dt) {
    this.t += dt;
    const m = this._m;
    let n = 0;
    for (const it of this.items) {
      const s = 0.4 + Math.max(0, Math.sin(this.t * 2.2 + it.phase)) * 0.9;
      if (s <= 0.5 || n >= 16) continue;
      const p = it.obj.position;
      m.makeScale(s, s, s).setPosition(p.x, p.y + 0.25, p.z);
      this.sparks.setMatrixAt(n++, m);
    }
    this.sparks.count = n;
    this.sparks.instanceMatrix.needsUpdate = true;
  }
}

export { heightAt };
