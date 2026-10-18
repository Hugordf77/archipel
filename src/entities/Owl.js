import * as THREE from 'three';
import { nextId } from '../core/globals.js';
import { buildHibou } from '../models/animaux/index.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);

// Hibou bibliothécaire : tout rond, lunettes rondes, plumes en écailles.
export class Owl {
  constructor(spot) {
    this.spot = spot;
    this.id = nextId();
    const h = buildHibou(this.id);
    Object.assign(this, { root: h.root, body: h.body, torso: h.torso, head: h.head, headMesh: h.headMesh, eyes: h.eyes, wings: h.wings });
    this.root.position.copy(spot.perch);
    this.root.rotation.y = 0.15;

    this.t = Math.random() * 10;
    this.blink = 2;
    this.flap = 0;
    this.look = 0;
    this.hop = 0;
  }

  cheer() {
    this.flap = 1.2;
    this.hop = 1;
  }

  update(dt, playerPos) {
    this.t += dt;
    const near = playerPos ? Math.hypot(playerPos.x - this.root.position.x, playerPos.z - this.root.position.z) < 5 : false;
    // tourne la tête vers le joueur quand il approche
    let target = Math.sin(this.t * 0.4) * 0.35;
    if (near) {
      const a = Math.atan2(playerPos.x - this.root.position.x, playerPos.z - this.root.position.z) - this.root.rotation.y;
      target = THREE.MathUtils.clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1.2, 1.2);
    }
    this.look += (target - this.look) * damp(4, dt);
    this.head.rotation.set(0, this.look, Math.sin(this.t * 0.7) * 0.12);
    // respiration + petit saut
    this.hop = Math.max(0, this.hop - dt * 2);
    const hopY = Math.sin(this.hop * Math.PI) * 0.15;
    this.body.position.y = hopY + Math.sin(this.t * 2) * 0.01;
    this.body.scale.set(1 + Math.sin(this.t * 2) * 0.012, 1 - Math.sin(this.t * 2) * 0.012, 1);
    // ailes
    this.flap = Math.max(0, this.flap - dt);
    const fl = this.flap > 0 ? Math.sin(this.t * 22) * 0.9 * Math.min(1, this.flap) : 0;
    this.wings[0].rotation.z = -0.05 - Math.max(0, fl);
    this.wings[1].rotation.z = 0.05 + Math.max(0, fl);
    // clignement
    this.blink -= dt;
    let s = 1;
    if (this.blink < 0.13) s = 0.1;
    if (this.blink < 0) this.blink = 2.5 + Math.random() * 3;
    this.eyes.scale.y += (s - this.eyes.scale.y) * damp(30, dt);
  }
}
