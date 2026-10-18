import * as THREE from 'three';
import { toonMaterial, glowMaterial } from '../../render/shaders/materials.js';
import { nextId, LAYER_SHADOW, U } from '../../core/globals.js';
import { coastRadius, heightAt, LAYOUT } from '../../world/home/terrain.js';
import { MAT } from '../../models/kit/materials.js';
import { butterflyGeometry, crabGeometry, gullGeometry, GULL_PIVOTS, BUTTERFLY_PIVOTS, CRAB_LEG_PIVOTS } from '../../models/animals/ileDepart.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------
// Les créatures sont dessinées par pièces instanciées : chaque groupe ne sert que
// de squelette invisible (position, ailes, pattes) et ses matrices sont recopiées
// dans un maillage instancié par pièce. Un appel de dessin par pièce, pas par bête.
// ---------------------------------------------------------------------------
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

class Parts {
  constructor(scene, geos, mat, count, shadow = true) {
    this.meshes = geos.map((g) => {
      const m = new THREE.InstancedMesh(g, mat, count);
      m.frustumCulled = false;
      if (shadow) m.layers.enable(LAYER_SHADOW);
      scene.add(m);
      return m;
    });
  }

  // anchors[k] : objet dont la matrice monde place la pièce k de l'instance i
  set(i, anchors, visible) {
    for (let k = 0; k < this.meshes.length; k++) this.meshes[k].setMatrixAt(i, visible ? anchors[k].matrixWorld : _zero);
  }

  color(k, i, c) {
    this.meshes[k].setColorAt(i, c);
  }

  commit(anyVisible = true) {
    for (const m of this.meshes) {
      m.visible = anyVisible;
      m.instanceMatrix.needsUpdate = true;
    }
  }
}

// squelette : un groupe et des pivots enfants (ailes ou pattes)
function skeleton(pivots) {
  const g = new THREE.Group();
  const list = pivots.map(([x, y, z]) => {
    const p = new THREE.Object3D();
    p.position.set(x, y, z);
    g.add(p);
    return p;
  });
  return { g, list };
}

// ---------------------------------------------------------------------------
// Mouettes : planent en cercles au-dessus de la mer
// ---------------------------------------------------------------------------

function makeGull() {
  const { g, list } = skeleton(GULL_PIVOTS);
  g.userData.wings = list;
  g.userData.anchors = [g, ...list];
  return g;
}

// ---------------------------------------------------------------------------
// Crabes : se promènent sur le sable mouillé, filent quand on approche
// ---------------------------------------------------------------------------

function makeCrab() {
  const { g, list } = skeleton(CRAB_LEG_PIVOTS);
  g.userData.legs = list;
  g.scale.setScalar(0.85);
  return g;
}

// ---------------------------------------------------------------------------
// Papillons : deux ailes qui battent, vol erratique près des fleurs
// ---------------------------------------------------------------------------

function makeButterfly() {
  const { g, list } = skeleton(BUTTERFLY_PIVOTS);
  g.userData.wings = list;
  g.userData.anchors = [g, ...list];
  return g;
}

export class Fauna {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;

    // mouettes
    const gid = nextId();
    this.gullParts = new Parts(scene, gullGeometry(gid), toonMaterial({ ...MAT.gull, id: gid }), 4);
    this.gulls = [];
    for (let i = 0; i < 4; i++) {
      const m = makeGull();
      m.userData.r = rand(30, 42);
      m.userData.a = rand(0, Math.PI * 2);
      m.userData.h = rand(8, 13);
      m.userData.speed = rand(0.08, 0.13) * (i % 2 ? 1 : -1);
      m.userData.phase = rand(0, 10);
      this.gulls.push(m);
    }

    // crabes : corps, pattes gauches, pattes droites
    const cid = nextId();
    const crabMat = toonMaterial({ ...MAT.crab, id: cid });
    const [crabBody, legL, legR] = crabGeometry(cid);
    this.crabParts = new Parts(scene, [crabBody], crabMat, 4);
    this.legParts = new Parts(scene, [legL, legR], crabMat, 12);
    this.crabs = [];
    const crabAngles = [1.2, 2.3, 3.9, 5.4];
    for (const a of crabAngles) {
      const c = makeCrab();
      c.userData = { ...c.userData, ang: a, home: a, rr: rand(24.6, 25.8), dir: 1, pause: rand(0, 3), flee: 0, hidden: 0 };
      this.crabs.push(c);
    }

    // papillons : volent de massif en massif et s'y posent
    this.butterflies = [];
    this.spots = [];
    const colors = ['#f7b6c8', '#f6d27a', '#c7b2e6', '#9cc8ec', '#fffaf0', '#f4a28c', '#bfe8de', '#f9c2a0'];
    const bid = nextId();
    this.butterflyParts = new Parts(scene, butterflyGeometry(bid), toonMaterial({ ...MAT.butterfly, id: bid }), 8, false);
    const wingColor = new THREE.Color();
    for (let i = 0; i < 8; i++) {
      const b = makeButterfly();
      wingColor.set(colors[i % colors.length]);
      this.butterflyParts.color(1, i, wingColor);
      this.butterflyParts.color(2, i, wingColor);
      b.userData.seed = rand(0, 100);
      b.userData.state = 'fly';
      b.userData.timer = rand(0, 3);
      b.userData.target = new THREE.Vector3(LAYOUT.garden.x + rand(-4, 4), 2, LAYOUT.garden.z + rand(-3, 3));
      b.position.copy(b.userData.target);
      this.butterflies.push(b);
    }

    // lucioles (instanciées)
    const N = 46;
    this.fireflyData = [];
    const mat = glowMaterial(0xe8ff9a, 0.32);
    this.fireflies = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, N);
    this.fireflies.frustumCulled = false;
    for (let i = 0; i < N; i++) this.fireflyData.push({ base: new THREE.Vector3(0, -50, 0), seed: rand(0, 100) });
    this.fireflies.renderOrder = 11;
    scene.add(this.fireflies);
    this._m = new THREE.Matrix4();
  }

  // Massifs de fleurs : points de pose des papillons et halos des lucioles
  setSpots(spots) {
    this.spots = spots.filter((s) => s.y < 3.2 || true);
    if (!this.spots.length) return;
    this.fireflyData.forEach((f, i) => {
      const s = this.spots[(i * 7) % this.spots.length];
      const a = rand(0, Math.PI * 2);
      const d = rand(0.2, 1.6);
      const x = s.x + Math.cos(a) * d;
      const z = s.z + Math.sin(a) * d;
      f.base.set(x, heightAt(x, z) + rand(0.3, 1.3), z);
    });
  }

  pickSpot(from) {
    if (!this.spots.length) return null;
    // de préférence un massif proche
    let best = null;
    for (let k = 0; k < 6; k++) {
      const s = this.spots[Math.floor(Math.random() * this.spots.length)];
      const d = Math.hypot(s.x - from.x, s.z - from.z);
      if (!best || (d < best.d && d > 1.5)) best = { s, d };
    }
    const s = best.s;
    return new THREE.Vector3(s.x + rand(-0.6, 0.6), s.y + 0.42, s.z + rand(-0.6, 0.6));
  }

  update(dt, playerPos) {
    this.t += dt;
    const t = this.t;
    const night = U.uNight.value;
    const day = 1 - THREE.MathUtils.smoothstep(night, 0.3, 0.7);

    // --- mouettes ---
    for (const g of this.gulls) {
      const u = g.userData;
      u.a += u.speed * dt;
      const r = u.r + Math.sin(t * 0.2 + u.phase) * 4;
      const x = Math.cos(u.a) * r;
      const z = Math.sin(u.a) * r;
      const y = u.h + Math.sin(t * 0.5 + u.phase) * 1.2;
      g.position.set(x, y, z);
      const tx = -Math.sin(u.a) * Math.sign(u.speed);
      const tz = Math.cos(u.a) * Math.sign(u.speed);
      g.rotation.set(0, Math.atan2(tx, tz), -Math.sign(u.speed) * 0.25);
      // battements entrecoupés de planés
      const glide = Math.sin(t * 0.35 + u.phase) > 0.2;
      const flap = glide ? 0.12 + Math.sin(t * 1.5 + u.phase) * 0.05 : Math.sin(t * 9 + u.phase) * 0.55;
      u.wings[0].rotation.z = flap;
      u.wings[1].rotation.z = -flap;
      g.updateMatrixWorld(true);
    }
    this.gulls.forEach((g, i) => this.gullParts.set(i, g.userData.anchors, true));
    this.gullParts.commit(night < 0.85);

    // --- crabes ---
    for (const c of this.crabs) {
      const u = c.userData;
      const r = u.rr - coastRadius(u.ang);
      let x = Math.cos(u.ang) * r;
      let z = Math.sin(u.ang) * r;
      let moving = false;
      const dPlayer = playerPos ? Math.hypot(playerPos.x - x, playerPos.z - z) : 99;
      if (u.hidden > 0) {
        u.hidden -= dt;
        c.visible = false;
        if (u.hidden <= 0) {
          u.ang = u.home + rand(-0.3, 0.3);
          u.rr = rand(24.6, 25.8);
          c.visible = true;
        }
        continue;
      }
      if (dPlayer < 2.6 && u.flee <= 0) {
        u.flee = 1.6;
        u.dir = Math.sign(Math.random() - 0.5) || 1;
      }
      if (u.flee > 0) {
        u.flee -= dt;
        u.rr += dt * 1.6;
        u.ang += u.dir * dt * 0.08;
        moving = true;
        if (u.flee <= 0 || u.rr > 27.4) {
          u.hidden = rand(6, 12);
          u.flee = 0;
        }
      } else if (u.pause > 0) {
        u.pause -= dt;
      } else {
        u.ang += u.dir * dt * 0.035;
        moving = true;
        if (Math.random() < dt * 0.25) {
          u.pause = rand(1, 4);
          if (Math.random() < 0.5) u.dir *= -1;
        }
        if (Math.abs(u.ang - u.home) > 0.5) u.dir = Math.sign(u.home - u.ang);
      }
      const r2 = u.rr - coastRadius(u.ang);
      x = Math.cos(u.ang) * r2;
      z = Math.sin(u.ang) * r2;
      const y = Math.max(heightAt(x, z), 0.02);
      c.position.set(x, y, z);
      // marche en crabe : le corps fait face à la mer, déplacement latéral
      c.rotation.y = Math.atan2(x, z) + Math.PI;
      const legPhase = moving ? t * 18 : 0;
      c.userData.legs.forEach((l, i) => {
        l.rotation.x = Math.sin(legPhase + i * 1.3) * (moving ? 0.5 : 0);
      });
      c.position.y += moving ? Math.abs(Math.sin(t * 18)) * 0.02 : 0;
    }
    this.crabs.forEach((c, i) => {
      const shown = c.visible;
      if (shown) c.updateMatrixWorld(true);
      this.crabParts.set(i, [c], shown);
      const legs = c.userData.legs;
      for (let k = 0; k < 3; k++) this.legParts.set(i * 3 + k, [legs[k], legs[k + 3]], shown);
    });
    this.crabParts.commit();
    this.legParts.commit();

    // --- papillons : vol erratique vers un massif, pose, puis repart ---
    for (const b of this.butterflies) {
      const u = b.userData;
      const sd = u.seed;
      u.timer -= dt;
      if (u.state === 'fly') {
        const to = u.target.clone().sub(b.position);
        const dist = to.length();
        const wob = new THREE.Vector3(Math.sin(t * 2.3 + sd) * 0.6, Math.sin(t * 3.1 + sd * 2) * 0.35, Math.cos(t * 1.9 + sd) * 0.6);
        const step = to.normalize().multiplyScalar(Math.min(dist, 1.6 * dt)).add(wob.multiplyScalar(dt));
        b.position.add(step);
        b.position.y = Math.max(b.position.y, heightAt(b.position.x, b.position.z) + 0.3);
        if (step.lengthSq() > 1e-6) b.rotation.y = Math.atan2(step.x, step.z);
        const flap = Math.sin(t * 24 + sd) * 0.95;
        u.wings[0].rotation.z = flap;
        u.wings[1].rotation.z = -flap;
        if (dist < 0.12 || u.timer < -9) {
          u.state = 'rest';
          u.timer = rand(2.5, 6);
        }
      } else {
        // posé : les ailes s'ouvrent et se ferment lentement
        const flap = 0.25 + Math.sin(t * 2.2 + sd) * 0.3;
        u.wings[0].rotation.z = flap;
        u.wings[1].rotation.z = -flap;
        const near = playerPos && Math.hypot(playerPos.x - b.position.x, playerPos.z - b.position.z) < 1.2;
        if (u.timer <= 0 || near) {
          u.state = 'fly';
          u.timer = 0;
          u.target = this.pickSpot(b.position) || b.position.clone().add(new THREE.Vector3(rand(-3, 3), 0.5, rand(-3, 3)));
        }
      }
      b.scale.setScalar(day > 0.05 ? day : 0.0001);
      b.updateMatrixWorld(true);
    }
    const flying = day > 0.05 && U.uRain.value < 0.5;
    if (flying) this.butterflies.forEach((b, i) => this.butterflyParts.set(i, b.userData.anchors, true));
    this.butterflyParts.commit(flying);

    // --- lucioles ---
    const ff = this.fireflies;
    ff.visible = night > 0.3;
    if (ff.visible) {
      const m = this._m;
      this.fireflyData.forEach((f, i) => {
        const s = f.seed;
        const pulse = Math.max(0, Math.sin(t * (1.2 + (s % 1)) + s)) ;
        const sc = (0.25 + pulse * 0.9) * THREE.MathUtils.smoothstep(night, 0.3, 0.8);
        m.makeScale(sc, sc, sc);
        m.setPosition(
          f.base.x + Math.sin(t * 0.3 + s) * 0.8,
          f.base.y + Math.sin(t * 0.5 + s * 2) * 0.3,
          f.base.z + Math.cos(t * 0.27 + s) * 0.8,
        );
        ff.setMatrixAt(i, m);
      });
      ff.instanceMatrix.needsUpdate = true;
      ff.material.uniforms.uIntensity.value = 0.9;
    }
  }
}
