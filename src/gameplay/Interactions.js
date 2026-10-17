import * as THREE from 'three';
import { projectCurved } from '../world/navigation.js';

// Registre des objets avec lesquels on peut interagir.
// Entrée : { id, pos (Vector3, point d'ancrage de l'invite), approach {x,z} (où se placer),
//            radius (distance d'activation), label (texte ou fonction), action(), enabled() }
export class Interactions {
  constructor() {
    this.items = new Map();
    this._v = new THREE.Vector3();
  }

  add(item) {
    const it = { radius: 1.7, promptHeight: 1.6, enabled: () => true, priority: 0, ...item };
    if (!it.approach) it.approach = { x: it.pos.x, z: it.pos.z };
    this.items.set(it.id, it);
    return it;
  }

  remove(id) {
    this.items.delete(id);
  }

  get(id) {
    return this.items.get(id);
  }

  labelOf(it) {
    return typeof it.label === 'function' ? it.label() : it.label;
  }

  // Objet le plus proche du joueur, en privilégiant ce qui est devant lui
  nearest(pos, facing) {
    let best = null;
    let bestScore = Infinity;
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    for (const it of this.items.values()) {
      if (!it.enabled()) continue;
      const dx = it.pos.x - pos.x;
      const dz = it.pos.z - pos.z;
      const ax = it.approach.x - pos.x;
      const az = it.approach.z - pos.z;
      const d = Math.min(Math.hypot(dx, dz), Math.hypot(ax, az));
      if (d > it.radius) continue;
      const front = d > 0.01 ? (dx * fx + dz * fz) / Math.hypot(dx, dz) : 1;
      const score = d - front * 0.5 - it.priority;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  // Objet sous le curseur (projection écran de son ancre)
  pick(sx, sy, camera, width, height) {
    let best = null;
    let bestD = 64;
    for (const it of this.items.values()) {
      if (!it.enabled()) continue;
      const p = projectCurved(it.pos, camera, width, height, this._v);
      if (!p.visible) continue;
      const r = it.pickRadius ?? 58;
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < Math.min(bestD, r)) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }
}
