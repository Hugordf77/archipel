import * as THREE from 'three';
import { groundAt, obstacleAt, waterDepth, pushOut } from '../world/navigation.js';
import { U, ORIGIN } from '../core/globals.js';
import { waterSurfaceAt } from '../world/env/water.js';
import { createMotor, stepMotor, resetMotor, interpolate, climbable, arriveIntent, setProfile } from './locomotion/motor.js';
import { strideLength, advanceGaitPhase } from './locomotion/pose.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);
// glissement le long d'un obstacle : directions déviées essayées tour à tour
const SLIDE_ANGLES = [0.5, -0.5, 1.0, -1.0, 1.35, -1.35];
// États au sol où l'on marche (les pas, la poussière et les sons de pas en découlent)
const STEPPING = new Set(['WALK', 'RUN', 'SPRINT', 'LAND', 'ROLL_RECOVER', 'IDLE']);

// minmod : pente d'un vrai versant ; au bord d'une falaise, l'un des côtés est plat → 0
const minmod = (a, b) => (a * b <= 0 ? 0 : Math.abs(a) < Math.abs(b) ? a : b);

// Contrôleur du personnage : la physique vit dans le moteur de locomotion
// (locomotion/motor.js) ; ici on lui fournit le sol, l'eau et les collisions,
// on gère le clic pour aller, les sièges, les actions, et on transmet tout à l'animation.
export class Player {
  constructor(character) {
    this.character = character;
    this.pos = new THREE.Vector3(0, 1, 4.5);
    this.vel = new THREE.Vector3();
    this.facing = Math.PI; // regarde vers +z (la caméra) au départ
    this.previousFacing = this.facing;
    this.mode = 'free'; // free | goto | seated | action | boat | air
    this.swimming = false;
    this.target = null;
    this.seat = null;
    this.action = null;
    this.locked = false; // vrai pendant une session de focus
    this.walkSpeed = 3.3; // référence de l'animation des poses existantes
    this.stepPhase = 0; // phase visuelle conservée sur deux demi-cycles
    this.stepEventPhase = 0; // phase distincte des appuis sonores et des événements
    this.actualSpeed = 0;
    this.targetSpeed = 0;
    this.onStep = null;
    this.stuck = 0;
    this.radius = 0.3;
    // moteur de locomotion et ce qu'il a produit pendant l'image
    this.motor = createMotor();
    this.events = [];
    this.intent = { dirX: 0, dirZ: 0, mag: 0, sprint: false, walk: false, jump: false, jumpHeld: false, roll: false, noSkid: false, swim: false, speed: 0 };
    this.loco = { state: 'IDLE', t: 0, v: 0, vLat: 0, vy: 0, omega: 0, heading: 0, inputAngle: 0, grounded: true, phase: 0, stride: 0.5, sprintTime: 0, slopeAlong: 0, chain: 0, airTime: 0, impact: 0, rollT: 0, landHeavy: false, stopOnly: false, jumpLong: false, swim: false, accF: 0, accL: 0, surface: 'grass' };
    this.env = {
      surface: 'grass',
      slopeX: 0,
      slopeZ: 0,
      ground: (x, z) => groundAt(x, z).y,
      sweep: (m, dx, dz, r, out) => this.sweep(m, dx, dz, r, out),
    };
    this._view = { x: 0, y: 0, z: 0, heading: 0 };
    this._lastDist = 0;
    this._prevV = 0;
    this._prevLat = 0;
    this._resync = true;
  }

  setProfile(profile) {
    setProfile(this.motor, profile);
  }

  place(x, z, facing = this.facing) {
    this.pos.set(x, groundAt(x, z).y, z);
    this.facing = facing;
    this.previousFacing = facing;
    this._resync = true;
    this.sync();
  }

  goTo(x, z, onArrive = null, stopDist = 0.25) {
    if (this.locked) return;
    if (this.mode === 'seated') this.stand();
    this.mode = 'goto';
    this.target = { x, z, onArrive, stopDist, far: Math.hypot(x - this.pos.x, z - this.pos.z) > 8 };
    this.stuck = 0;
  }

  sitAt(seat) {
    // seat : { x, z, y, facing, pose }
    this.mode = 'seated';
    this.seat = seat;
    this.target = null;
    this.vel.set(0, 0, 0);
    this.character.setPose(seat.pose || 'sit');
  }

  stand() {
    if (this.mode !== 'seated') return;
    const s = this.seat;
    this.mode = 'free';
    this.seat = null;
    // se relève un peu devant le siège
    if (s && s.exit) {
      this.pos.x = s.exit.x;
      this.pos.z = s.exit.z;
      this.pos.y = groundAt(s.exit.x, s.exit.z).y;
    }
    this._resync = true;
    this.character.setPose('idle');
    this.character.bounce(0.8);
  }

  playAction(pose, duration, onEnd) {
    this.mode = 'action';
    this.action = { pose, t: 0, duration, onEnd };
    this.vel.set(0, 0, 0);
    this.motor.v = this.motor.vLat = 0;
    this.character.setPose(pose);
  }

  faceTowards(x, z) {
    this.facing = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.motor.heading = this.motor.pHeading = this.facing;
    this.motor.omega = 0;
  }

  // ---------------------------------------------------------------------------
  // Collisions pour le moteur : obstacles, eau profonde (on nage), marches et parois.
  // Les descentes sont toujours permises : au-delà d'un rebord, le moteur fait tomber.
  sweep(m, dx, dz, r, out) {
    const len = Math.hypot(dx, dz);
    const fromY = this.swimming ? groundAt(m.x, m.z).y : m.y;
    out.hit = false;
    out.frac = 1;
    out.trip = false;
    if (this.free(m, m.x + dx, m.z + dz, len, r, dx / len, dz / len, fromY)) {
      out.x = m.x + dx;
      out.z = m.z + dz;
      return out;
    }
    out.hit = true;
    // obstacle bas (buisson, rocher, souche…) percuté de face : le moteur peut faire trébucher
    const o = this._block;
    if (o && o.low) {
      const ox = o.x - m.x;
      const oz = o.z - m.z;
      const d = Math.hypot(ox, oz) || 1;
      out.trip = (dx * ox + dz * oz) / (len * d) > 0.55;
    }
    for (const a of SLIDE_ANGLES) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      const rx = (dx * c - dz * s) * c;
      const rz = (dx * s + dz * c) * c;
      const l = len * c;
      if (this.free(m, m.x + rx, m.z + rz, l, r, rx / l, rz / l, fromY)) {
        out.x = m.x + rx;
        out.z = m.z + rz;
        out.frac = c * c;
        return out;
      }
    }
    out.x = m.x;
    out.z = m.z;
    out.frac = 0;
    return out;
  }

  free(m, x, z, dist, r, ux, uz, fromY) {
    const o = obstacleAt(x, z, r * 0.9);
    // en basculant par-dessus un obstacle bas, on ne s'y cogne pas
    if (o && !(o.low && m.state === 'TRIP')) {
      this._block = o;
      return false;
    }
    this._block = null;
    const g = groundAt(x, z);
    if (!g.deck && waterDepth(x, z) > 0.32) return true; // eau profonde : on nage
    const T = m.T;
    // en l'air : on passe au-dessus de tout ce qui est plus bas que les pieds
    if (!m.grounded && !this.swimming) return g.y <= m.y + T.stepUp * 0.5;
    const dy = g.y - fromY;
    if (dy <= 0.08) return true;
    if (g.deck) return dy < T.stepUp;
    const ahead = groundAt(x + ux * 0.3, z + uz * 0.3).y - g.y;
    return climbable(dy, dist, ahead, T);
  }

  // Compatibilité avec l'ancien contrôle (sièges, interactions)
  canGo(x, z, dist) {
    return this.free(this.motor, x, z, dist, this.radius, 0, 0, this.pos.y);
  }

  // ---------------------------------------------------------------------------
  update(dt, intent = null, legacyRun = false) {
    // Les longues images après un onglet inactif ne doivent pas téléporter le joueur.
    dt = Math.min(Math.max(dt || 0, 0), 0.05);
    if (intent && intent.isVector3) intent = { move: intent, sprint: legacyRun };
    const c = this.character;
    let speed01 = 0;

    if (this.mode === 'boat') {
      // la position suit le siège du bateau (voir Sailing)
      c.update(dt, 0);
      this.sync();
      return;
    }

    if (this.mode === 'seated') {
      const s = this.seat;
      this.pos.x += (s.x - this.pos.x) * damp(10, dt);
      this.pos.z += (s.z - this.pos.z) * damp(10, dt);
      this.pos.y += (s.y - this.pos.y) * damp(10, dt);
      this.facing = lerpAngle(this.facing, s.facing, damp(8, dt));
      if (!this.locked && intent?.move && intent.move.lengthSq() > 0.01) this.stand();
    } else if (this.mode === 'action') {
      const a = this.action;
      a.t += dt;
      if (a.t >= a.duration) {
        this.mode = 'free';
        this.action = null;
        this._resync = true;
        c.setPose('idle');
        a.onEnd?.();
      }
    } else if (this.mode === 'free' || this.mode === 'goto') {
      speed01 = this.updateMotor(dt, intent);
    }

    const L = this.loco;
    const moving = this.mode === 'free' || this.mode === 'goto';
    const turnRate = moving ? THREE.MathUtils.clamp(this.motor.omega, -5, 5) : THREE.MathUtils.clamp(angleDelta(this.previousFacing, this.facing) / Math.max(dt, 1e-4), -5, 5);
    this.previousFacing = this.facing;
    c.update(dt, speed01, { turnRate, vel: this.vel, facing: this.facing, loco: moving ? L : null });
    this.sync();
  }

  updateMotor(dt, intent) {
    const m = this.motor;
    const c = this.character;
    // le jeu a déplacé le personnage (téléportation, sortie de bateau, de vol, de siège) : on recale
    if (this._resync || Math.hypot(this.pos.x - m.x, this.pos.z - m.z) > 0.75) {
      const gy = groundAt(this.pos.x, this.pos.z).y;
      resetMotor(m, this.pos.x, this.swimming ? this.pos.y : gy, this.pos.z, this.facing);
      this._resync = false;
      this._lastDist = m.dist;
    }
    const I = this.intent;
    const move = intent?.move;
    const hasMove = !!move && move.lengthSq() > 0.0025 && !this.locked;
    if (this.mode === 'goto' && (hasMove || intent?.jump || intent?.roll)) {
      this.mode = 'free';
      this.target = null;
    }
    if (this.mode === 'goto' && this.target) {
      const t = this.target;
      const d = arriveIntent(m, t.x, t.z, t.stopDist, t.far, I);
      if (d < t.stopDist) {
        this.mode = 'free';
        this.target = null;
        t.onArrive?.();
      } else if (m.v < 0.3 && m.t > 0.3) {
        // on n'y arrive pas : si la cible est proche, on déclenche quand même
        this.stuck += dt;
        if (this.stuck > 0.6) {
          this.mode = 'free';
          this.target = null;
          if (d < 2.2) t.onArrive?.();
        }
      } else this.stuck = 0;
    } else {
      I.noSkid = false;
      I.speed = 0;
      if (hasMove) {
        const l = Math.hypot(move.x, move.z);
        I.dirX = move.x / l;
        I.dirZ = move.z / l;
        I.mag = Math.min(1, l);
      } else {
        I.dirX = I.dirZ = 0;
        I.mag = 0;
      }
      I.sprint = !!intent?.sprint;
      I.walk = !!intent?.walk;
    }
    I.jump = !this.locked && !!intent?.jump;
    I.jumpHeld = !!intent?.jumpHeld;
    I.roll = !this.locked && !!intent?.roll;

    // eau : on nage dès qu'elle monte à la poitrine ; en l'air, seulement en l'atteignant
    const g = groundAt(m.x, m.z);
    const depth = waterDepth(m.x, m.z);
    let swim = !g.deck && depth > (this.swimming ? 0.45 : 0.6);
    if (swim && !m.grounded && m.y > g.y + depth - 0.4) swim = false;
    if (swim && !this.swimming && !m.grounded) m.events.push({ type: 'splash', x: m.x, y: g.y + depth, z: m.z, v: Math.hypot(m.v, m.vy) });
    this.swimming = swim;
    I.swim = swim;

    // environnement de l'image : surface et pente sous les pieds
    const E = this.env;
    E.surface = g.deck ? 'wood' : depth > 0.05 && depth <= 0.45 ? 'shallow' : g.surface === 'sand' ? 'sand' : 'grass';
    if (g.deck || swim) {
      E.slopeX = E.slopeZ = 0;
    } else {
      const s = 0.3;
      E.slopeX = minmod((g.y - groundAt(m.x - s, m.z).y) / s, (groundAt(m.x + s, m.z).y - g.y) / s);
      E.slopeZ = minmod((g.y - groundAt(m.x, m.z - s).y) / s, (groundAt(m.x, m.z + s).y - g.y) / s);
    }

    // posé dans un obstacle (téléportation, objet apparu) : on en sort avant d'avancer
    const ox = m.x;
    const oz = m.z;
    pushOut(m, this.radius);
    if (m.x !== ox || m.z !== oz) {
      m.px += m.x - ox;
      m.pz += m.z - oz;
    }

    stepMotor(m, I, E, dt);

    // rendu : position et cap interpolés entre deux pas du moteur
    const view = interpolate(m, this._view);
    this.pos.x = view.x;
    this.pos.z = view.z;
    this.facing = view.heading;
    if (swim) {
      const d2 = waterDepth(this.pos.x, this.pos.z);
      const gy = waterSurfaceAt(this.pos.x, this.pos.z, Math.max(0, d2)) - 0.66 + Math.sin(U.uTime.value * 1.65) * 0.015;
      this.pos.y += (gy - this.pos.y) * damp(6, dt);
      m.y = this.pos.y;
    } else if (!m.grounded) this.pos.y = view.y;
    else {
      // au sol : léger lissage des bosses et des marches, jamais de flottement
      const dy = view.y - this.pos.y;
      this.pos.y = Math.abs(dy) > 0.6 ? view.y : this.pos.y + dy * damp(24, dt);
    }

    // vitesse monde (caméra, faune) et dynamique pour l'animation
    const fx = Math.sin(m.heading);
    const fz = Math.cos(m.heading);
    this.vel.set(fx * m.v + fz * m.vLat, m.grounded ? 0 : m.vy, fz * m.v - fx * m.vLat);
    this.actualSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.targetSpeed = I.mag > 0.05 ? m.v : 0;

    // pas : la phase avance avec la distance parcourue, comme des pieds posés au sol
    const L = this.loco;
    const dDist = m.dist - this._lastDist;
    this._lastDist = m.dist;
    const speed = this.actualSpeed;
    const stride = strideLength(speed);
    if (m.grounded && !swim && STEPPING.has(m.state) && speed > 0.12) {
      const phaseAdvance = (Math.PI * dDist) / stride;
      this.stepPhase = advanceGaitPhase(this.stepPhase, dDist, stride);
      this.stepEventPhase += phaseAdvance;
      while (this.stepEventPhase >= Math.PI) {
        this.stepEventPhase -= Math.PI;
        const intensity = Math.min(1.4, speed / 3.3);
        this._side = -(this._side || 1);
        this.onStep?.(groundAt(this.pos.x, this.pos.z).surface, intensity, this._side * 0.25);
        this.events.push({ type: 'step', x: this.pos.x, y: this.pos.y, z: this.pos.z, heading: m.heading, v: speed, surface: E.surface, side: this._side });
      }
    } else if (swim && speed > 0.12) {
      const phaseAdvance = dt * (3.8 + speed * 2.5);
      this.stepPhase = (this.stepPhase + phaseAdvance) % (Math.PI * 2);
      this.stepEventPhase += phaseAdvance;
      while (this.stepEventPhase >= Math.PI) {
        this.stepEventPhase -= Math.PI;
        this.onStep?.('water', speed / 1.8);
      }
    }

    // instantané pour l'animation
    const idt = dt > 1e-4 ? 1 / dt : 0;
    const accF = (m.v - this._prevV) * idt;
    const accL = (m.vLat - this._prevLat) * idt;
    this._prevV = m.v;
    this._prevLat = m.vLat;
    L.accF += (accF - L.accF) * damp(12, dt);
    L.accL += (accL - L.accL) * damp(12, dt);
    L.state = swim ? 'SWIM' : m.state;
    L.t = m.t;
    L.v = m.v;
    L.vLat = m.vLat;
    L.vy = m.vy;
    L.omega = m.omega;
    L.heading = m.heading;
    L.inputAngle = I.mag > 0.05 ? m.inputAngle : 0;
    L.grounded = m.grounded;
    L.phase = this.stepPhase;
    L.stride = stride;
    L.sprintTime = m.sprintTime;
    L.slopeAlong = m.slopeAlong;
    L.chain = m.chain;
    L.airTime = m.airTime;
    L.impact = m.lastImpact;
    L.rollT = m.state === 'ROLL' ? Math.min(1, m.t / m.T.rollTime) : 0;
    L.landHeavy = m.landHeavy;
    L.stopOnly = m.stopOnly;
    L.jumpLong = m.jumpLong;
    L.swim = swim;
    L.surface = E.surface;

    // événements du moteur vers le jeu (sons, poussière, vibrations, caméra)
    for (const e of m.events) this.events.push(e);
    m.events.length = 0;

    // poses existantes (l'animation dédiée lit this.loco)
    if (swim) {
      if (c.pose !== 'swim') c.setPose('swim');
    } else if (c.pose !== 'pickup' && c.pose !== 'celebrate' && !c.busy) {
      const pose = speed > 3.6 ? 'run' : speed > 0.15 ? 'walk' : 'idle';
      if (c.pose !== pose) c.setPose(pose);
    }
    return Math.min(1, speed / (swim ? 1.8 : this.walkSpeed)) * (speed > 3.6 ? 1.15 : 1);
  }

  sync() {
    const r = this.character.root;
    r.position.copy(this.pos);
    r.rotation.y = this.facing;
    U.uPlayerPos.value.set(this.pos.x - ORIGIN.x, this.pos.y, this.pos.z - ORIGIN.z);
  }
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
