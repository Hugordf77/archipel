// Faune des îles générées : 23 espèces dessinées par pièces instanciées (une
// géométrie par pièce, un appel de dessin par pièce et par espèce). Comportements
// simples et paisibles : errer, brouter, s'écarter du joueur, dormir, voler, nager.
// Coordonnées absolues (les maillages vivent dans le groupe racine du monde).
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial, glowMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW, U } from '../../core/globals.js';
import { mulberry32 } from '../../core/random.js';
import { SPECIES_LABEL } from '../../world/islands/gen/spawns.js';
import { SPECIES } from '../../models/animaux/index.js';
import { MAT } from '../../models/kit/materials.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------------------------------------------------------------------------
export class IslandFauna {
  constructor(game) {
    this.game = game;
    this.root = game.world.root;
    this.mat = toonMaterial({ ...MAT.fauna });
    this.glow = glowMaterial(...SPECIES.luciole.glow);
    this.kinds = new Map(); // espèce → { def, meshes, count, capacity }
    this.animals = [];
    this.byIsland = new Map();
    this._m = new THREE.Matrix4();
    this._p = new THREE.Matrix4();
    this._loc = []; // matrices locales des pièces d'un animal (chaînage cou → tête)
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this.hearts = [];
    this.t = 0;
  }

  kind(sp) {
    let k = this.kinds.get(sp);
    if (k) return k;
    const def = SPECIES[sp];
    if (!def) return null;
    const parts = def.parts();
    const capacity = 64;
    k = { def, parts, capacity, meshes: [], count: 0 };
    // robes : couleur du pelage par animal (sommets teintés seulement)
    if (def.coats) k.coats = def.coats.map(([, c]) => new THREE.Color(c));
    if (def.insect === 'glow') {
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.glow, capacity);
      im.frustumCulled = false;
      im.count = 0;
      im.renderOrder = 10;
      this.root.add(im);
      k.meshes.push(im);
    } else {
      const meshes = (list) => list.map((p) => {
        const im = new THREE.InstancedMesh(p.geo, this.mat, capacity);
        im.frustumCulled = false;
        im.count = 0;
        if (def.shadow) im.layers.enable(LAYER_SHADOW);
        this.root.add(im);
        return im;
      });
      k.meshes = meshes(parts);
      // version allégée pour les animaux lointains : mêmes pièces (pivots, animations), moins de facettes
      if (def.lod) k.low = { meshes: meshes(def.lod()), count: 0, dist: def.lodDist ?? 20 };
    }
    this.kinds.set(sp, k);
    return k;
  }

  // arrivée d'une île au premier plan : ses animaux apparaissent autour de leurs points d'apparition
  addIsland(entry) {
    if (this.byIsland.has(entry.desc.id)) return;
    const plan = entry.plan;
    const list = [];
    const rng = mulberry32(entry.desc.seed ^ 0xa11);
    for (const sp of plan.spawners) {
      const def = SPECIES[sp.sp];
      if (!def) continue;
      // répartis dans le disque (0,6 r) en spirale de tournesol (angle d'or, rayon en racine : densité
      // uniforme), un peu bougés : pas deux bêtes l'une dans l'autre à l'apparition (elles restent
      // en place tant que le joueur est à plus de 200 m)
      const a0 = rng() * Math.PI * 2;
      for (let i = 0; i < sp.count; i++) {
        const a = a0 + i * 2.39996 + (rng() - 0.5) * 0.5;
        const d = sp.r * 0.6 * Math.sqrt((i + 0.5 + (rng() - 0.5) * 0.5) / sp.count);
        const hx = entry.desc.x + sp.x;
        const hz = entry.desc.z + sp.z;
        const an = {
          sp: sp.sp, def, entry, home: { x: hx, z: hz, r: sp.r },
          x: hx + Math.cos(a) * d, z: hz + Math.sin(a) * d, y: 0, heading: rng() * 6.28,
          state: 'idle', t: rng() * 3, target: null, phase: rng() * 10, speed: 0, petT: 0, hop: 0,
          angle: rng() * 6.28, radius: sp.r * (0.5 + rng() * 0.5), seed: rng(),
        };
        // robe tirée au hasard, ou imposée par le point d'apparition (troupeau aux robes mêlées)
        an.coat = def.coats ? (sp.robes ? sp.robes[i % sp.robes.length] : Math.floor(an.seed * 9973)) % def.coats.length : 0;
        an.y = this.groundY(an);
        list.push(an);
        this.animals.push(an);
      }
    }
    this.byIsland.set(entry.desc.id, list);
  }

  removeIsland(id) {
    const list = this.byIsland.get(id);
    if (!list) return;
    const set = new Set(list);
    this.animals = this.animals.filter((a) => !set.has(a));
    this.byIsland.delete(id);
  }

  groundY(an) {
    const im = this.game.islands;
    const g = im.heightAt(an.x, an.z) ?? -16;
    if (an.def.swim || an.def.fish) {
      const w = im.waterLevelAt(an.x, an.z);
      return an.def.fish ? Math.max(g + 0.2, w - 0.45) : w;
    }
    return g;
  }

  // peut-on se poser là ? (terre ferme pour les marcheurs, eau pour les nageurs)
  okAt(an, x, z) {
    const im = this.game.islands;
    const g = im.heightAt(x, z);
    if (g === null) return false;
    const w = im.waterLevelAt(x, z);
    if (an.def.swim || an.def.fish) return w - g > (an.def.fish ? 0.5 : 0.25);
    if (an.def.wade) return w - g < 0.5;
    return g > 0.35 && w - g < 0.05;
  }

  update(dt, player) {
    this.t += dt;
    const night = U.uNight.value > 0.55;
    const P = player.pos;
    for (const k of this.kinds.values()) {
      k.count = 0;
      if (k.low) k.low.count = 0;
    }
    for (const an of this.animals) {
      const dx = an.x - P.x;
      const dz = an.z - P.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 200) continue;
      const full = dist < 80;
      // simplifié au loin : un pas de simulation sur quatre
      if (full || ((this.t * 60) | 0) % 4 === 0) this.behave(an, full ? dt : dt * 4, dist, dx, dz, night);
      this.draw(an, full, dist);
    }
    for (const k of this.kinds.values()) {
      for (const set of k.low ? [k, k.low] : [k]) {
        for (const im of set.meshes) {
          im.count = set.count;
          im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
        }
      }
    }
    this.updateHearts(dt);
  }

  behave(an, dt, dist, dx, dz, night) {
    const def = an.def;
    an.t -= dt;
    an.phase += dt * (1 + an.speed * 3);
    if (def.fly || def.insect) {
      // vol : cercle autour du point d'attache, légère houle
      const dir = an.seed > 0.5 ? 1 : -1;
      an.angle += dt * (def.speed / Math.max(2, an.radius)) * dir;
      const cx = an.home.x;
      const cz = an.home.z;
      const wob = def.insect ? Math.sin(this.t * 2.3 + an.seed * 20) * 0.6 : 0;
      an.x = cx + Math.cos(an.angle) * (an.radius + wob);
      an.z = cz + Math.sin(an.angle) * (an.radius + wob);
      const g = this.game.islands.heightAt(an.x, an.z) ?? 0;
      an.y = Math.max(0, g) + (def.height || 6) + Math.sin(this.t * 0.8 + an.seed * 9) * (def.insect ? 0.3 : 1.2);
      an.heading = an.angle + (dir > 0 ? 0 : Math.PI);
      an.speed = 1;
      return;
    }
    // la nuit, les animaux de jour dorment (sauf les nocturnes)
    if (night && !def.night && an.state !== 'flee') {
      an.state = 'sleep';
      an.speed = 0;
      return;
    }
    if (an.state === 'sleep' && !night) an.state = 'idle';
    // s'écarter doucement si le joueur arrive trop vite ou trop près
    const shy = def.shy || 2.4;
    if (dist < shy && an.petT <= 0 && this.game.player.vel.lengthSq() > 2) {
      an.state = 'flee';
      an.t = 1.5;
      const l = dist || 1;
      an.target = { x: an.x + (dx / l) * 6, z: an.z + (dz / l) * 6 };
    }
    if (an.petT > 0) {
      an.petT -= dt;
      an.speed = 0;
      return;
    }
    if (an.state === 'idle' && an.t <= 0) {
      // nouvelle balade dans le rayon d'errance
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * an.home.r;
      const tx = an.home.x + Math.cos(a) * d;
      const tz = an.home.z + Math.sin(a) * d;
      if (this.okAt(an, tx, tz)) {
        an.target = { x: tx, z: tz };
        an.state = 'walk';
      }
      an.t = 2 + Math.random() * 4;
    }
    if ((an.state === 'walk' || an.state === 'flee') && an.target) {
      const tx = an.target.x - an.x;
      const tz = an.target.z - an.z;
      const d = Math.hypot(tx, tz);
      const sp = def.speed * (an.state === 'flee' ? 1.8 : 1);
      if (d < 0.3 || an.t <= -6) {
        an.state = 'idle';
        an.t = 1.5 + Math.random() * 4;
        an.speed = 0;
      } else {
        const step = Math.min(d, sp * dt);
        const nx = an.x + (tx / d) * step;
        const nz = an.z + (tz / d) * step;
        if (this.okAt(an, nx, nz)) {
          an.x = nx;
          an.z = nz;
          an.speed += (sp - an.speed) * damp(6, dt);
        } else {
          an.state = 'idle';
          an.t = 1;
        }
        const want = def.sideways ? Math.atan2(tx, tz) + Math.PI / 2 : Math.atan2(tx, tz);
        let dh = ((want - an.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        an.heading += dh * damp(5, dt);
      }
    } else an.speed *= 1 - damp(6, dt);
    const gy = this.groundY(an);
    an.y += (gy - an.y) * damp(10, dt);
    if (def.hop && an.speed > 0.2) an.hop = Math.abs(Math.sin(an.phase * 3.2)) * 0.18;
    else an.hop *= 0.8;
  }

  draw(an, full, dist = 0) {
    const k = this.kind(an.sp);
    if (!k) return;
    // au-delà de k.low.dist, la version allégée (mêmes pièces, mêmes matrices)
    const set = k.low && dist > k.low.dist ? k.low : k;
    if (set.count >= k.capacity) return;
    const i = set.count++;
    const def = an.def;
    const sc = def.scale;
    const m = this._m;
    if (def.insect === 'glow') {
      const on = U.uNight.value;
      const s = (0.25 + 0.15 * Math.sin(this.t * 3 + an.seed * 20)) * on;
      m.makeScale(s, s, s).setPosition(an.x, an.y, an.z);
      k.meshes[0].setMatrixAt(i, m);
      return;
    }
    const sleep = an.state === 'sleep';
    const bank = def.fly ? (an.seed > 0.5 ? -0.3 : 0.3) : 0;
    const roll = def.waddle && an.speed > 0.05 ? Math.sin(an.phase * 4) * 0.15 : 0;
    this._e.set(0, an.heading, bank + roll + (sleep ? 0 : 0));
    this._q.setFromEuler(this._e);
    m.compose(this._v.set(an.x, an.y + an.hop - (sleep ? 0.06 : 0), an.z), this._q, this._s.set(sc, sleep ? sc * 0.85 : sc, sc));
    // broutage : graze va de 0 (tête portée) à 1 (museau dans l'herbe) ; en marche, léger hochement
    const idle = an.speed < 0.1;
    const graze = sleep ? 0.35 : idle ? 0.5 + Math.sin(this.t * 1.3 + an.seed * 10) * 0.5 : 0;
    const bob = sleep || idle ? 0 : Math.sin(an.phase * 3) * 0.08;
    const loc = this._loc;
    k.parts.forEach((p, pi) => {
      let a = 0;
      if (full) {
        const t = this.t;
        if (p.anim === 'leg') a = Math.sin(an.phase * 6 + p.phase) * Math.min(1, an.speed) * 0.6;
        // cou articulé : le cou plie jusqu'à def.graze, la tête qu'il porte jusqu'à def.nod
        else if (p.anim === 'neck') a = graze * def.graze + bob;
        else if (p.anim === 'head') a = p.parent != null ? graze * (def.nod ?? 0) : sleep ? 0.4 : graze * (def.graze ?? 0.5) + bob;
        else if (p.anim === 'wing') a = def.insect ? Math.sin(t * 28 + an.seed * 10) * 0.9 : Math.sin(t * (def.fly ? 5 : 10) + an.seed * 10) * 0.55;
        else if (p.anim === 'tail') a = Math.sin(t * (def.fish ? 8 : 4) + an.seed * 10) * 0.3;
      }
      // pivot dans le repère de la pièce parente (la tête suit le cou), sinon dans celui du corps
      const pm = (loc[pi] ??= new THREE.Matrix4()).makeTranslation(p.pivot[0], p.pivot[1], p.pivot[2]);
      if (a) {
        const r = this._p;
        if (p.anim === 'wing') r.makeRotationZ(a * p.side);
        else if (p.anim === 'tail') r.makeRotationY(a);
        else r.makeRotationX(a);
        pm.multiply(r);
      }
      if (p.parent != null) pm.premultiply(loc[p.parent]);
      set.meshes[pi].setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, pm));
      if (k.coats) set.meshes[pi].setColorAt(i, k.coats[an.coat]);
    });
  }

  // animal le plus proche (pour le caresser)
  nearest(x, z, r = 2.2) {
    let best = null;
    let bd = r;
    for (const an of this.animals) {
      if (an.def.fly || an.def.insect || an.def.fish) continue;
      const d = Math.hypot(an.x - x, an.z - z);
      if (d < bd) {
        bd = d;
        best = an;
      }
    }
    return best;
  }

  label(an) {
    return SPECIES_LABEL[an.sp] || an.sp;
  }

  pet(an) {
    an.petT = 2.2;
    an.state = 'idle';
    an.hop = 0.25;
    this.heart(an.x, an.y + (an.def.top ?? 1.0) * an.def.scale + 0.4, an.z);
  }

  heart(x, y, z) {
    if (!this.heartMesh) {
      const b = new Builder();
      b.add(G.sphere(0.12, 10, 8), '#f4a2b4', { p: [-0.08, 0, 0] });
      b.add(G.sphere(0.12, 10, 8), '#f4a2b4', { p: [0.08, 0, 0] });
      b.add(G.cone(0.16, 0.22, 10), '#f4a2b4', { p: [0, -0.15, 0], r: [Math.PI, 0, 0] });
      this.heartMesh = new THREE.InstancedMesh(b.build(), toonMaterial({ vertexColors: true, aId: true, emissiveVColor: 0.4 }), 12);
      this.heartMesh.frustumCulled = false;
      this.heartMesh.count = 0;
      this.root.add(this.heartMesh);
    }
    this.hearts.push({ x, y, z, t: 0 });
  }

  updateHearts(dt) {
    if (!this.heartMesh) return;
    const m = this._m;
    this.hearts = this.hearts.filter((h) => (h.t += dt) < 1.6);
    this.hearts.forEach((h, i) => {
      const k = h.t / 1.6;
      const s = Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * (1 - k * 0.3);
      m.makeRotationY(h.t * 2).scale(this._s.set(s, s, s)).setPosition(h.x, h.y + k * 0.8, h.z);
      this.heartMesh.setMatrixAt(i, m);
    });
    this.heartMesh.count = this.hearts.length;
    this.heartMesh.instanceMatrix.needsUpdate = true;
  }
}

export { SPECIES };
