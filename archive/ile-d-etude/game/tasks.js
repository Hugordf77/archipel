import * as THREE from 'three';
import { Builder, G } from '../scene/builder.js';
import { toonMaterial } from '../shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../scene/globals.js';
import { coastRadius, heightAt } from '../scene/terrain.js';
import { uid, todayKey, dayKeyOf } from './state.js';

// Tâches du jour : chacune arrive dans une bouteille échouée sur la plage.
// Cochée, la bouteille repart au large. Rien ne presse : les tâches non faites
// restent simplement sur le sable.

export function newTask(text) {
  return { id: uid('tk'), text, createdAt: Date.now(), doneAt: null };
}

export function visibleTasks(tasks) {
  const k = todayKey();
  return tasks.filter((t) => !t.doneAt || dayKeyOf(t.doneAt) === k);
}

function bottleMesh() {
  const id = nextId();
  const b = new Builder(id);
  b.add(G.capsule(0.11, 0.2, 6, 12), '#a8e3d4', { p: [0, 0, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cyl(0.05, 0.07, 0.14, 10), '#a8e3d4', { p: [0.24, 0, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.cyl(0.045, 0.045, 0.07, 8), '#c98f5f', { p: [0.33, 0, 0], r: [0, 0, Math.PI / 2] });
  // message roulé visible à travers le verre
  b.add(G.cyl(0.05, 0.05, 0.22, 10), '#fff4dc', { p: [-0.02, 0.0, 0], r: [0, 0, Math.PI / 2] });
  b.add(G.torus(0.052, 0.012, 4, 10), '#f4a28c', { p: [-0.02, 0, 0], r: [0, Math.PI / 2, 0] });
  const m = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, id, rim: 1.6, emissive: 0x0b2a24 }));
  m.layers.enable(LAYER_SHADOW);
  m.scale.setScalar(1.7);
  const g = new THREE.Group();
  g.add(m);
  g.userData.mesh = m;
  return g;
}

const SPOT_ANGLES = [1.35, 1.52, 1.69, 1.86, 2.03, 2.2, 2.37, 2.54, 2.71, 2.88, 1.18, 3.05];

export class Bottles {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'bouteilles';
    game.scene.add(this.group);
    this.views = new Map();
    this.leaving = [];
    this.t = 0;
  }

  spot(i) {
    const a = SPOT_ANGLES[i % SPOT_ANGLES.length] + Math.floor(i / SPOT_ANGLES.length) * 0.07;
    const rr = 26.35;
    const r = rr - coastRadius(a);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, z, a, y: Math.max(heightAt(x, z), -0.02) };
  }

  sync(arrivingId = null) {
    const tasks = this.game.state.tasks.filter((t) => !t.doneAt);
    const alive = new Set(tasks.map((t) => t.id));
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        this.group.remove(v.obj);
        this.game.interactions.remove(`bottle_${id}`);
        this.views.delete(id);
      }
    }
    tasks.slice(0, 12).forEach((task, i) => {
      let v = this.views.get(task.id);
      const s = this.spot(i);
      if (!v) {
        const obj = bottleMesh();
        obj.rotation.y = -s.a + 0.4 + (i % 3) * 0.3;
        this.group.add(obj);
        v = { obj, task, arrive: task.id === arrivingId ? 1 : 0, phase: Math.random() * 6 };
        this.views.set(task.id, v);
        this.game.interactions.add({
          id: `bottle_${task.id}`,
          pos: new THREE.Vector3(s.x, s.y + 0.6, s.z),
          approach: { x: s.x - Math.cos(s.a) * 0.9, z: s.z - Math.sin(s.a) * 0.9 },
          radius: 1.5,
          promptHeight: 0.6,
          label: 'Lire le message',
          enabled: () => this.game.mode !== 'focus',
          action: () => this.game.openTasks(task.id),
        });
      }
      v.spot = s;
      const it = this.game.interactions.get(`bottle_${task.id}`);
      if (it) {
        it.pos.set(s.x, s.y + 0.6, s.z);
        it.approach = { x: s.x - Math.cos(s.a) * 0.9, z: s.z - Math.sin(s.a) * 0.9 };
      }
    });
  }

  // La bouteille d'une tâche cochée repart au large
  sendAway(taskId) {
    const v = this.views.get(taskId);
    if (!v) return;
    this.views.delete(taskId);
    this.game.interactions.remove(`bottle_${taskId}`);
    this.leaving.push({ obj: v.obj, t: 0, from: v.obj.position.clone(), a: v.spot.a });
  }

  update(dt) {
    this.t += dt;
    for (const v of this.views.values()) {
      const s = v.spot;
      if (!s) continue;
      let x = s.x;
      let z = s.z;
      let y = s.y + 0.12;
      if (v.arrive > 0) {
        // dérive depuis le large jusqu'à la plage
        v.arrive = Math.max(0, v.arrive - dt / 4.5);
        const k = v.arrive * v.arrive;
        x += Math.cos(s.a) * k * 14;
        z += Math.sin(s.a) * k * 14;
        y = THREE.MathUtils.lerp(s.y + 0.06, 0.02, Math.min(1, v.arrive * 3)) + Math.sin(this.t * 2 + v.phase) * 0.05 * v.arrive;
      }
      v.obj.position.set(x, y, z);
      // petit roulis dans le ressac
      v.obj.rotation.x = Math.sin(this.t * 1.3 + v.phase) * 0.12;
      v.obj.rotation.z = Math.sin(this.t * 0.9 + v.phase) * 0.06;
    }
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const l = this.leaving[i];
      l.t += dt / 5;
      const k = l.t * l.t;
      l.obj.position.set(l.from.x + Math.cos(l.a) * k * 16, 0.03 + Math.sin(this.t * 2.2) * 0.05 - Math.max(0, l.t - 0.75) * 0.6, l.from.z + Math.sin(l.a) * k * 16);
      l.obj.rotation.x = Math.sin(this.t * 2) * 0.25;
      if (l.t >= 1) {
        this.group.remove(l.obj);
        this.leaving.splice(i, 1);
      }
    }
  }
}
