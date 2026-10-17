import * as THREE from 'three';
import { Builder, G } from '../render/builder.js';
import { toonMaterial } from '../render/shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../core/globals.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);

// Hibou bibliothécaire : tout rond, lunettes rondes, plumes en écailles.
export class Owl {
  constructor(spot) {
    this.spot = spot;
    this.id = nextId();
    const mat = toonMaterial({ vertexColors: true, id: this.id, rim: 1.1, pigment: 0.7 });
    const eyeMat = toonMaterial({ color: '#3d3049', id: this.id, rim: 0, pigment: 0 });
    const shine = toonMaterial({ color: 0xffffff, emissive: 0xffffff, id: this.id, rim: 0, pigment: 0 });

    this.root = new THREE.Group();
    this.root.name = 'hibou';
    this.root.position.copy(spot.perch);
    this.root.rotation.y = 0.15;
    this.body = new THREE.Group();
    this.root.add(this.body);

    const brown = '#c49a77';
    const dark = '#a77d5c';
    const cream = '#f8e8cc';
    const b = new Builder(this.id);
    b.add(G.sphere(0.3, 20, 16), brown, { p: [0, 0.3, 0], s: [1, 1.08, 0.95] });
    b.add(G.sphere(0.22, 18, 14), cream, { p: [0, 0.27, 0.13], s: [0.95, 1.05, 0.55] });
    // plumes en écailles sur le ventre
    for (let r = 0; r < 3; r++) {
      for (let c = -1; c <= 1; c++) {
        if (r === 2 && c !== 0) continue;
        b.add(G.sphere(0.035, 8, 6), '#e6c9a2', { p: [c * 0.08 + (r % 2) * 0.04, 0.34 - r * 0.08, 0.245 - Math.abs(c) * 0.025], s: [1, 0.6, 0.4] });
      }
    }
    // pattes
    for (const sx of [-1, 1]) b.add(G.sphere(0.055, 10, 8), '#f3b36e', { p: [sx * 0.09, 0.02, 0.07], s: [1.2, 0.5, 1.4] });
    this.torso = new THREE.Mesh(b.build(), mat);
    this.body.add(this.torso);

    // tête
    this.head = new THREE.Group();
    this.head.position.set(0, 0.52, 0);
    this.body.add(this.head);
    const hb = new Builder(this.id);
    hb.add(G.sphere(0.27, 20, 16), brown, { p: [0, 0.08, 0], s: [1.08, 0.95, 0.95] });
    for (const sx of [-1, 1]) {
      hb.add(G.sphere(0.12, 14, 10), '#f3dcc0', { p: [sx * 0.1, 0.09, 0.19], s: [1, 1, 0.45] });
      hb.add(G.cone(0.07, 0.17, 10), dark, { p: [sx * 0.19, 0.31, -0.02], r: [0, 0, -sx * 0.45] });
    }
    hb.add(G.cone(0.04, 0.09, 8), '#f6c46d', { p: [0, 0.02, 0.27], r: [Math.PI / 2 + 0.5, 0, 0] });
    // lunettes rondes
    for (const sx of [-1, 1]) hb.add(G.torus(0.085, 0.014, 6, 20), '#7a6a8a', { p: [sx * 0.1, 0.1, 0.27] });
    hb.add(G.cyl(0.012, 0.012, 0.05, 6), '#7a6a8a', { p: [0, 0.11, 0.28], r: [0, 0, Math.PI / 2] });
    this.headMesh = new THREE.Mesh(hb.build(), mat);
    this.head.add(this.headMesh);
    this.eyes = new THREE.Group();
    this.eyes.position.set(0, 0.1, 0.25);
    this.head.add(this.eyes);
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), eyeMat);
      e.position.set(sx * 0.1, 0, 0);
      e.scale.set(1, 1, 0.5);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), shine);
      s.position.set(sx * 0.1 + 0.016, 0.02, 0.025);
      this.eyes.add(e, s);
    }

    // ailes (pivot à l'épaule)
    this.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.26, 0.42, -0.02);
      const wb = new Builder(this.id);
      wb.add(G.sphere(0.16, 14, 10), dark, { p: [sx * 0.03, -0.14, 0], s: [0.45, 1.05, 0.85] });
      pivot.add(new THREE.Mesh(wb.build(), mat));
      this.body.add(pivot);
      this.wings.push(pivot);
    }
    this.root.traverse((o) => o.isMesh && o.layers.enable(LAYER_SHADOW));

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
