// Navigation : vent, bateau du joueur (barre, allure, réglage de voile), zones
// autorisées selon le bateau, tempêtes qui repoussent, embarquer / débarquer,
// sillage et caméra de navigation. Coordonnées absolues (origine flottante gérée au rendu).
import * as THREE from 'three';
import { BOATS, buildBoat } from '../models/boats/bateaux.js';
import { groundAt, waterDepth, canStand, blockedByObstacle } from '../world/navigation.js';
import { U, ORIGIN } from '../core/globals.js';
import { LAYOUT } from '../world/home/terrain.js';
import { setSeaConditions, waveHeightAt } from '../world/env/water.js';
import { CURVE } from '../render/shaders/chunks.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Amortisseur critique, stable quelle que soit la fréquence d'images.
function smoothDamp(state, target, smoothTime, dt) {
  if (dt <= 0) {
    state.value = target;
    state.velocity = 0;
    return;
  }
  const omega = 2 / Math.max(0.01, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.value - target;
  const temp = (state.velocity + omega * change) * dt;
  state.velocity = (state.velocity - omega * temp) * exp;
  state.value = target + (change + temp) * exp;
}

// efficacité de l'allure : 0 = vent arrière, π = face au vent
export function pointOfSail(theta) {
  const deg = (theta * 180) / Math.PI;
  if (deg > 150) return 0.12; // vent debout : la voile faseye
  if (deg > 120) return 0.12 + ((150 - deg) / 30) * 0.5; // près
  if (deg > 60) return 1.0; // travers et largue
  if (deg > 25) return 0.95;
  return 0.82; // vent arrière
}
// réglage idéal : 0 = voile bordée (près), 1 = voile choquée (vent arrière)
export const idealTrim = (theta) => 1 - theta / Math.PI;

const WAKE_VERT = /* glsl */ `
${CURVE}
attribute float aFade;
varying vec2 vUv;
varying float vFade;
varying float vViewDist;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position.x, 0.0, position.y, 1.0);
  vUv = position.xy + 0.5;
  vFade = aFade;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const WAKE_FRAG = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outNormal;
uniform vec3 uSunColor;
uniform float uNight;
varying vec2 vUv;
varying float vFade;
float h21(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 q = vUv - 0.5;
  float d = length(q * vec2(1.0, 1.6)) * 2.0;
  float n = h21(floor(vUv * 9.0)) * 0.25;
  float a = smoothstep(1.0, 0.55, d + n) * vFade;
  vec3 col = mix(vec3(1.0, 0.99, 0.95), uSunColor, 0.2) * mix(1.0, 0.65, uNight);
  outColor = vec4(col, a * 0.85);
  outNormal = vec4(0.0);
}
`;

export class Sailing {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.wind = { angle: 0.6, strength: 1 };
    this.aboard = false;
    this.speed = 0;
    this.throttle = 0;
    this.trim = 0.5;
    this.trimTouched = -99;
    this.turn = 0;
    this.sailEff = 0;
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.lastDrag = 0;
    this.warned = { zone: false, storm: false };
    this.creakT = 2;
    this.floatSpring = { value: LAYOUT.waterLevel, velocity: 0 };
    this.floatPitch = 0;
    this.floatRoll = 0;
    this._seat = new THREE.Vector3();
    const b = game.state.boat;
    if (!Number.isFinite(b.x)) this.mooring(b);
    this.pos.set(b.x, 0, b.z);
    this.heading = b.heading;
    this.spawn(b.type);
    this.buildWake();
  }

  get spec() {
    return BOATS[this.type];
  }

  // amarrage par défaut : au bout du ponton de l'île de départ
  mooring(b) {
    const P = LAYOUT.pier;
    b.x = P.x + 2.4;
    b.z = P.z1 - 1.6;
    b.heading = 0;
  }

  spawn(type) {
    if (this.model) this.game.scene.remove(this.model.group);
    this.type = type;
    this.model = buildBoat(type);
    this.game.scene.add(this.model.group);
    this.game.state.boat.type = type;
    this.sync(0);
  }

  // ---------------------------------------------------------------------------
  // Vent : lent, déterministe dans le temps, plus fort pendant les tempêtes
  updateWind(dt) {
    this.t += dt;
    const t = this.t;
    const w = this.wind;
    w.angle = 0.6 + Math.sin(t / 240) * 1.3 + Math.sin(t / 67 + 1.3) * 0.35;
    const storm = this.game.weather?.storm;
    w.strength = (0.85 + 0.15 * Math.sin(t / 41)) * (storm ? 1.5 : 1);
    U.uWindDir.value.set(Math.cos(w.angle), Math.sin(w.angle));
    const rain = this.game.weather?.rain || 0;
    const targetWind = storm ? 1.8 : 1 + rain * 0.35;
    U.uWindStrength.value = THREE.MathUtils.lerp(U.uWindStrength.value, targetWind, damp(0.3, dt));
    setSeaConditions(U.uWindStrength.value, rain, storm);
  }

  // ---------------------------------------------------------------------------
  update(dt, input) {
    this.updateWind(dt);
    const spec = this.spec;
    const g = this.game;
    const hx = Math.sin(this.heading);
    const hz = Math.cos(this.heading);

    if (this.aboard && !g.ui.panelOpen) {
      const ax = input.axes();
      this.throttle = THREE.MathUtils.clamp(this.throttle + ax.y * dt * 0.7, -0.25, 1);
      this.turn += (-ax.x - this.turn) * damp(4, dt);
      if (spec.sail) {
        if (input.held('KeyR')) {
          this.trim = Math.max(0, this.trim - dt * 0.45);
          this.trimTouched = this.t;
        }
        if (input.held('KeyF')) {
          this.trim = Math.min(1, this.trim + dt * 0.45);
          this.trimTouched = this.t;
        }
      }
    } else if (!this.aboard) {
      this.throttle = 0;
      this.turn = 0;
    }

    // allure et vitesse visée
    let target;
    const wx = Math.cos(this.wind.angle);
    const wz = Math.sin(this.wind.angle);
    const theta = Math.acos(THREE.MathUtils.clamp(hx * wx + hz * wz, -1, 1));
    this.theta = theta;
    if (spec.sail) {
      const ideal = idealTrim(theta);
      // petit coup de main : sans réglage pendant 5 s, la voile se règle doucement seule
      if (this.t - this.trimTouched > 5) this.trim += (ideal - this.trim) * damp(0.15, dt);
      const match = 1 - Math.min(1, Math.abs(this.trim - ideal) * 1.6) * 0.7;
      this.sailEff = pointOfSail(theta) * match * Math.min(1.1, this.wind.strength);
      target = this.throttle > 0 ? this.throttle * (3 + (spec.speedWind - 3) * Math.min(1, this.sailEff)) : this.throttle * 2;
    } else {
      target = this.throttle * spec.speed;
    }
    this.speed += (target - this.speed) * damp(0.9, dt);

    // barre : on tourne mieux avec un peu d'erre
    const turnRate = (type) => ({ radeau: 0.9, barque: 0.85, voilier: 0.7, goelette: 0.5 })[type] || 0.7;
    const grip = 0.3 + 0.7 * Math.min(1, Math.abs(this.speed) / 3);
    this.heading += this.turn * turnRate(this.type) * grip * dt * Math.sign(this.speed || 1);

    // courants : un courant lent et déterministe donne une dérive perceptible
    // même par temps calme. La tempête ajoute ensuite son propre rappel.
    let px = 0;
    let pz = 0;
    const storm = !!g.weather?.storm;
    const currentAngle = 0.35 + Math.sin(this.t / 190) * 0.9 + Math.sin(this.t / 73) * 0.22;
    const currentStrength = 0.12 + (storm ? 0.32 : 0);
    px += Math.cos(currentAngle) * currentStrength;
    pz += Math.sin(currentAngle) * currentStrength;
    const dHome = Math.hypot(this.pos.x, this.pos.z);
    if (dHome > spec.zone) {
      const push = Math.min(1, (dHome - spec.zone) / 60);
      px -= (this.pos.x / dHome) * push * 3.5;
      pz -= (this.pos.z / dHome) * push * 3.5;
      this.speed *= 1 - push * 0.4 * dt * 4;
      if (this.aboard && !this.warned.zone) {
        this.warned.zone = true;
        g.ui.toast(`Le courant te ramène : avec ${spec.name === 'Radeau' ? 'un radeau' : `ta ${spec.name.toLowerCase()}`}, on ne dépasse pas ${spec.zone / 1000} km. Il faudra un bateau plus solide.`, { icon: 'boat', duration: 5200 });
      }
    } else if (dHome < spec.zone - 100) this.warned.zone = false;
    if (g.weather?.storm && dHome > 150) {
      px -= (this.pos.x / dHome) * 1.3;
      pz -= (this.pos.z / dHome) * 1.3;
      if (this.aboard && !this.warned.storm) {
        this.warned.storm = true;
        g.ui.toast('La tempête te repousse vers ton île… Attends une éclaircie pour repartir.', { icon: 'boat', duration: 5200 });
      }
    } else this.warned.storm = false;

    // déplacement, en butant doucement contre les hauts-fonds
    const vx = hx * this.speed + px;
    const vz = hz * this.speed + pz;
    const nx = this.pos.x + vx * dt;
    const nz = this.pos.z + vz * dt;
    const half = this.model.len * 0.45;
    const bowX = nx + hx * half * Math.sign(this.speed || 1);
    const bowZ = nz + hz * half * Math.sign(this.speed || 1);
    const sternX = nx - hx * half * Math.sign(this.speed || 1);
    const sternZ = nz - hz * half * Math.sign(this.speed || 1);
    const side = this.model.width ? this.model.width * 0.42 : 0.55;
    const portX = nx - hz * side;
    const portZ = nz + hx * side;
    const starX = nx + hz * side;
    const starZ = nz - hx * side;
    const clearWater = [
      [bowX, bowZ], [sternX, sternZ], [nx, nz], [portX, portZ], [starX, starZ],
    ].every(([x, z]) => waterDepth(x, z) > 0.45);
    if (clearWater) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (Math.abs(this.speed) > 0.3) {
      this.speed *= -0.25;
      g.audio?.bump?.();
    } else {
      this.speed = 0;
    }

    this.sync(dt);
    this.updateWake(dt);

    // craquements du bois quand on navigue
    if (this.aboard && Math.abs(this.speed) > 0.5) {
      this.creakT -= dt;
      if (this.creakT <= 0) {
        this.creakT = 2.5 + Math.random() * 4;
        g.audio?.creak?.(this.type === 'goelette' ? 0.7 : 1);
      }
    }
    const st = g.state.boat;
    st.x = this.pos.x;
    st.z = this.pos.z;
    st.heading = this.heading;
  }

  // position, tangage, roulis ; le joueur suit son siège
  sync(dt) {
    const m = this.model;
    const half = m.len * 0.45;
    const side = m.width ? m.width * 0.42 : 0.55;
    const hx = Math.sin(this.heading);
    const hz = Math.cos(this.heading);
    const depth = Math.max(0.45, waterDepth(this.pos.x, this.pos.z));
    const t = U.uTime.value;
    const center = LAYOUT.waterLevel + waveHeightAt(this.pos.x, this.pos.z, depth, t);
    const bow = waveHeightAt(this.pos.x + hx * half, this.pos.z + hz * half, depth, t);
    const stern = waveHeightAt(this.pos.x - hx * half, this.pos.z - hz * half, depth, t);
    const port = waveHeightAt(this.pos.x - hz * side, this.pos.z + hx * side, depth, t);
    const starboard = waveHeightAt(this.pos.x + hz * side, this.pos.z - hx * side, depth, t);
    smoothDamp(this.floatSpring, center, 0.42, dt);
    const pitchTarget = THREE.MathUtils.clamp(-(bow - stern) / Math.max(1, half * 2), -0.11, 0.11);
    const rollTarget = THREE.MathUtils.clamp((port - starboard) / Math.max(0.8, side * 2), -0.09, 0.09);
    const settle = damp(3.2, dt);
    this.floatPitch += (pitchTarget - this.floatPitch) * settle;
    this.floatRoll += (rollTarget - this.floatRoll) * settle;
    m.group.position.set(this.pos.x, this.floatSpring.value, this.pos.z);
    m.group.rotation.y = this.heading;
    const sp = Math.abs(this.speed);
    m.body.rotation.x = this.floatPitch - sp * 0.003;
    m.body.rotation.z = this.floatRoll - this.turn * Math.min(1, sp / 4) * 0.08;
    if (m.sail) {
      // la bôme s'ouvre du côté opposé au vent, d'autant plus que la voile est choquée
      const wx = Math.cos(this.wind.angle);
      const wz = Math.sin(this.wind.angle);
      const side = Math.sign(Math.cos(this.heading) * wx - Math.sin(this.heading) * wz) || 1;
      const ang = side * (0.08 + this.trim * 1.25);
      for (const s of m.sail) s.rotation.y += (ang - s.rotation.y) * damp(3, dt);
    }
    if (m.oars.length) {
      const k = this.aboard ? Math.min(1, Math.abs(this.throttle) + 0.1) : 0;
      const ph = t * 3.2;
      m.oars.forEach((o, i) => {
        o.rotation.y = Math.sin(ph) * 0.5 * k * (i ? -1 : 1);
        o.rotation.z = (Math.cos(ph) * 0.15 * k + 0.12) * (i ? -1 : 1);
      });
    }
    if (this.aboard) {
      const P = this.game.player;
      m.group.updateMatrixWorld(true);
      const seat = m.body.localToWorld(this._seat.copy(m.seat));
      P.pos.set(seat.x + ORIGIN.x, seat.y, seat.z + ORIGIN.z);
      P.facing = this.heading;
    }
  }

  // ---------------------------------------------------------------------------
  // Sillage : taches d'écume posées à plat derrière la coque
  buildWake() {
    const N = 48;
    const geo = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    geo.index = plane.index;
    geo.setAttribute('position', plane.attributes.position);
    this.wakeFade = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
    geo.setAttribute('aFade', this.wakeFade);
    const mat = new THREE.ShaderMaterial({
      name: 'sillage',
      glslVersion: THREE.GLSL3,
      uniforms: { ...U },
      vertexShader: WAKE_VERT,
      fragmentShader: WAKE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.wake = new THREE.InstancedMesh(geo, mat, N);
    this.wake.frustumCulled = false;
    this.wake.renderOrder = 6;
    this.wake.count = 0;
    this.puffs = [];
    this.wakeT = 0;
    this.game.scene.add(this.wake);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
  }

  updateWake(dt) {
    const sp = Math.abs(this.speed);
    this.wakeT -= dt;
    if (sp > 0.6 && this.wakeT <= 0) {
      this.wakeT = 0.12;
      const hx = Math.sin(this.heading);
      const hz = Math.cos(this.heading);
      const back = this.model.len * 0.5;
      for (const side of [-1, 1]) {
        if (this.puffs.length >= 48) this.puffs.shift();
        this.puffs.push({ x: this.pos.x - hx * back + hz * side * 0.4, z: this.pos.z - hz * back - hx * side * 0.4, t: 0, life: 2.2 + sp * 0.12, s: 0.6 + sp * 0.08, side, rot: this.heading });
      }
    }
    const m = this._m;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.t += dt;
      if (p.t > p.life) this.puffs.splice(i, 1);
    }
    this.puffs.forEach((p, i) => {
      const k = p.t / p.life;
      const s = p.s * (1 + k * 2.2);
      // les deux bras du sillage s'écartent en V
      const spread = k * 1.6 * p.side;
      this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      m.compose(new THREE.Vector3(p.x + Math.cos(p.rot) * spread, 0.2, p.z - Math.sin(p.rot) * spread), this._q, new THREE.Vector3(s, 1, s * 1.8));
      this.wake.setMatrixAt(i, m);
      this.wakeFade.setX(i, (1 - k) * (1 - k));
    });
    this.wake.count = this.puffs.length;
    this.wake.instanceMatrix.needsUpdate = true;
    this.wakeFade.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  distanceTo(x, z) {
    return Math.hypot(this.pos.x - x, this.pos.z - z);
  }

  board() {
    const g = this.game;
    const P = g.player;
    if (this.aboard) return;
    if (this.distanceTo(P.pos.x, P.pos.z) > 5.5) {
      g.ui.toast('Le bateau est trop loin : approche-toi du bord.', { icon: 'boat' });
      return;
    }
    if (P.mode === 'seated') P.stand();
    this.aboard = true;
    P.mode = 'boat';
    P.vel.set(0, 0, 0);
    g.character.setPose(this.spec.sail ? 'steer' : 'row');
    g.character.bounce(0.9);
    g.audio?.splash?.(0.8);
    this.throttle = 0;
    // caméra de navigation : plus haute et plus loin
    const r = g.rig;
    this.savedCam = { distance: r.distance, pitch: r.pitch, limits: { ...r.limits } };
    r.limits.maxDist = 70;
    r.limits.minPitch = 0.08;
    r.distance = this.type === 'goelette' ? 30 : 22;
    r.pitch = 0.27;
    if (!g.state.sailTips) {
      g.state.sailTips = true;
      setTimeout(() => g.ui.toast(this.spec.sail ? 'Z/S : hisser ou affaler · Q/D : barre · R/F : border ou choquer la voile · E : débarquer' : 'Z/S : avancer ou ralentir · Q/D : barre · E : débarquer près d\'une plage', { icon: 'boat', duration: 6500 }), 400);
    }
    g.markDirty();
  }

  // cherche un bout de plage autour du bateau
  landingSpot() {
    const hx = Math.sin(this.heading);
    const hz = Math.cos(this.heading);
    let best = null;
    for (let r = 1.2; r <= 7.5 && !best; r += 0.5) {
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        const x = this.pos.x + Math.sin(a) * r;
        const z = this.pos.z + Math.cos(a) * r;
        if (waterDepth(x, z) > 0.2) continue;
        const gy = groundAt(x, z).y;
        if (gy < -0.25 || blockedByObstacle(x, z, 0.35)) continue;
        // il faut pouvoir y tenir debout (pas une falaise)
        if (!canStand(x + 0.3, z, gy, 0.3) || !canStand(x, z + 0.3, gy, 0.3)) continue;
        const score = -(Math.sin(a) * hx + Math.cos(a) * hz);
        if (!best || score < best.score) best = { x, z, score };
      }
    }
    return best;
  }

  disembark() {
    const g = this.game;
    if (!this.aboard) return false;
    if (Math.abs(this.speed) > 2.5) {
      g.ui.toast('Ralentis d\'abord (S) pour accoster.', { icon: 'boat' });
      return true;
    }
    const spot = this.landingSpot();
    if (!spot) {
      g.ui.toast('Approche-toi d\'une plage ou d\'un ponton pour débarquer.', { icon: 'boat' });
      return true;
    }
    const P = g.player;
    this.aboard = false;
    this.speed = 0;
    this.throttle = 0;
    P.mode = 'free';
    P.place(spot.x, spot.z, Math.atan2(spot.x - this.pos.x, spot.z - this.pos.z));
    g.character.setPose('idle');
    g.character.bounce(1);
    g.audio?.splash?.(0.5);
    const r = g.rig;
    if (this.savedCam) {
      r.limits = this.savedCam.limits;
      r.distance = this.savedCam.distance;
      r.pitch = this.savedCam.pitch;
    }
    g.markDirty();
    return true;
  }

  // ramène le bateau (ponton, appel depuis la côte) : petit fondu côté jeu
  recallTo(x, z, heading = 0) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.sync(0);
  }

  // caméra : derrière le bateau, sauf si l'on vient de la tourner à la main
  updateCamera(dt) {
    const g = this.game;
    const r = g.rig;
    r.target.set(this.pos.x, 1.4, this.pos.z);
    if (performance.now() - this.lastDrag > 2500) r.yaw = lerpAngle(r.yaw, this.heading + Math.PI, damp(0.9, dt));
  }

  // boussole et jauges
  hud() {
    const spec = this.spec;
    return {
      heading: this.heading,
      speed: this.speed,
      sail: spec.sail,
      trim: this.trim,
      eff: this.sailEff,
      ideal: idealTrim(this.theta || 0),
      wind: this.wind.angle,
      zone: spec.zone,
      dHome: Math.hypot(this.pos.x, this.pos.z),
    };
  }
}
