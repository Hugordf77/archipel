import * as THREE from 'three';
import { U, ORIGIN } from '../core/globals.js';
import { computeHorizonDip } from '../world/env/sky.js';

const damp = (k, dt) => 1 - Math.exp(-k * dt);

const wrapAngle = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
// écart d'azimut caméra / personnage sur un tronc (rad) : trois quarts, jamais derrière le tronc
const CLIMB_MIN = 0.45;
const CLIMB_MAX = 1.15;
// sur le tronc : caméra plus basse (rad), recul (part de la distance), visée relevée (m) ; au sommet
const CLIMB_PITCH = -0.16;
const CLIMB_BACK = 0.12;
const CLIMB_LOOK = 0.9;
const TOP_PITCH = -0.06;
const TOP_LOOK = 0.4;

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Caméra à la troisième personne : suit une cible, ou tourne lentement
// autour d'un point en mode « contemplation » (pendant les sessions de focus).
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 1, 4);
    this.focus = this.target.clone();
    this.followVelocity = new THREE.Vector3();
    this.followSpeed = 0;
    this.followWater = false;
    this._leadTarget = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.58;
    this.distance = 17;
    this.cur = { yaw: 0, pitch: 0.58, distance: 17 };
    this.mode = 'follow';
    this.orbit = { center: new THREE.Vector3(), t: 0, baseYaw: 0 };
    this.lookOffset = new THREE.Vector3(0, 0.7, 0);
    // minPitch négatif : la caméra descend au ras du sol et lève les yeux (regarder les îles du ciel)
    this.limits = { minDist: 8, maxDist: 30, minPitch: -0.6, maxPitch: 1.15 };
    this.forward = new THREE.Vector2(0, -1);
    this.followRate = 5;
    this.groundFn = null; // (x, z) => hauteur du sol, pour éviter le relief
    this.occPitch = 0;
    this.occDist = 1;
    this.tilt = 0;
    // champ de vision élargi au sprint (degrés, suivi par un ressort) et secousses
    this.fovBase = null;
    this.fovKick = 0;
    this.fovCur = 0;
    this.shakeAmp = 0;
    this.shakeT = 0;
    this.bobY = 0;
    this.bobV = 0;
    this.sway = 0;
    this.swayV = 0;
    // grimpe : la caméra tourne avec le personnage autour du tronc (azimut θ du corps), recule un
    // peu et vise plus haut ; mélange 0 → 1 (transition douce à l'accroche et au saut)
    this.climbTheta = null;
    this.climbTop = false;
    this.climbK = 0;
    this.climbTopK = 0;
  }

  // Appelé à chaque image : on = sur un tronc, theta = azimut du corps autour de l'axe (le
  // personnage regarde le tronc : la caméra derrière lui est à l'azimut θ), top = au sommet.
  // La caméra suit θ en gardant l'écart choisi par le joueur, de trois quarts (entre CLIMB_MIN et
  // CLIMB_MAX de part et d'autre), jamais derrière le tronc.
  climbFollow(on, theta = 0, top = false) {
    // seulement en suivi : un cadrage fixe (contemplation, portrait, vue de capture) garde son angle
    if (!on || this.mode !== 'follow') {
      this.climbTheta = null;
      this.climbTop = false;
      return;
    }
    const prev = this.climbTheta;
    if (prev !== null) this.yaw += wrapAngle(theta - prev);
    const off = wrapAngle(this.yaw - theta);
    const side = off >= 0 ? 1 : -1;
    // à l'accroche, on se met de trois quarts ; ensuite, seul l'écart maximal est tenu
    if (prev === null && Math.abs(off) < CLIMB_MIN) this.yaw = theta + side * CLIMB_MIN;
    else if (Math.abs(off) > CLIMB_MAX) this.yaw = theta + side * CLIMB_MAX;
    this.climbTheta = theta;
    this.climbTop = top;
  }

  shake(amount) {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
  }

  // balancement d'un pas : la caméra plonge à peine et penche du côté du pied (≈ amount mètres)
  bob(amount, side = 0) {
    this.bobV -= amount * 40;
    this.swayV += side * amount * 18;
  }

  // Le segment cible → caméra traverse-t-il le relief ?
  blocked(yaw, pitch, distance) {
    if (!this.groundFn) return false;
    const f = this.focus;
    const cp = Math.cos(pitch);
    const cx = f.x + Math.sin(yaw) * cp * distance;
    const cy = f.y + Math.sin(pitch) * distance;
    const cz = f.z + Math.cos(yaw) * cp * distance;
    const ly = f.y + this.lookOffset.y;
    for (let i = 2; i <= 16; i++) {
      const t = i / 16;
      const x = f.x + (cx - f.x) * t;
      const z = f.z + (cz - f.z) * t;
      const y = ly + (cy - ly) * t;
      if (y < this.groundFn(x, z) + 0.55) return true;
    }
    return false;
  }

  contemplate(center, startYaw = this.cur.yaw) {
    this.mode = 'contemplate';
    this.orbit.center.copy(center);
    this.orbit.t = 0;
    this.orbit.baseYaw = startYaw;
  }

  follow() {
    this.mode = 'follow';
  }

  rotate(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, this.limits.minPitch, this.limits.maxPitch);
  }

  zoom(factor) {
    this.distance = THREE.MathUtils.clamp(this.distance * factor, this.limits.minDist, this.limits.maxDist);
  }

  update(dt) {
    let rate = this.followRate;
    if (this.mode === 'contemplate') {
      const o = this.orbit;
      o.t += dt;
      // lent travelling circulaire, respiration de la hauteur et de la distance
      this.yaw = o.baseYaw + o.t * 0.035;
      this.pitch = 0.42 + Math.sin(o.t * 0.045) * 0.07;
      this.distance = 15.5 + Math.sin(o.t * 0.06 + 1.0) * 2.5;
      this.target.copy(o.center);
      rate = 0.8;
    }
    const k = damp(rate, dt);
    this._leadTarget.copy(this.target);
    if (this.mode === 'follow') {
      // Une légère anticipation aide à lire le terrain sans faire pivoter la caméra.
      const lead = this.followWater ? 0.14 : 0.22;
      this._leadTarget.x += this.followVelocity.x * lead;
      this._leadTarget.z += this.followVelocity.z * lead;
    }
    this.focus.lerp(this._leadTarget, k);
    this.cur.yaw = lerpAngle(this.cur.yaw, this.yaw, damp(rate * 1.2, dt));
    this.cur.pitch += (this.pitch - this.cur.pitch) * damp(rate, dt);
    this.cur.distance += (this.distance - this.cur.distance) * damp(rate, dt);

    // grimpe : mélange doux vers la caméra du tronc (et retour au saut)
    const climbOn = this.mode === 'follow' && this.climbTheta !== null;
    this.climbK += ((climbOn ? 1 : 0) - this.climbK) * damp(climbOn ? 3.5 : 2.5, dt);
    const ck = this.climbK;
    this.climbTopK += ((this.climbTop ? 1 : 0) - this.climbTopK) * damp(3, dt);
    const tk = this.climbTopK;
    const climbPitch = ck * (CLIMB_PITCH + (TOP_PITCH - CLIMB_PITCH) * tk);
    const climbLook = ck * (CLIMB_LOOK + (TOP_LOOK - CLIMB_LOOK) * tk);
    // évitement du relief : on relève d'abord l'angle, puis on se rapproche
    let extra = 0;
    let distMul = 1;
    // regard vers le haut (angle sous l'horizon) : pas d'évitement par l'angle, la caméra reste au
    // ras du sol (plus bas) et vise au-dessus du personnage
    const low = this.cur.pitch < 0.12;
    if (this.groundFn && !low) {
      const p0 = this.cur.pitch + climbPitch;
      while (extra < 0.75 && this.blocked(this.cur.yaw, p0 + extra, this.cur.distance)) extra += 0.05;
      while (distMul > 0.45 && this.blocked(this.cur.yaw, p0 + extra, this.cur.distance * distMul)) distMul -= 0.05;
    }
    this.occPitch += (extra - this.occPitch) * damp(extra > this.occPitch ? 9 : 1.8, dt);
    this.occDist += (distMul - this.occDist) * damp(distMul < this.occDist ? 9 : 1.8, dt);
    const yaw = this.cur.yaw;
    const pitch = low ? Math.max(-0.6, this.cur.pitch + climbPitch) : Math.max(0.12, Math.min(1.3, this.cur.pitch + this.occPitch + climbPitch));
    // part du regard vers le haut (0 à l'horizon, 1 tout en bas) : la caméra se rapproche
    const up = low ? Math.min(1, (0.12 - pitch) / 0.72) : 0;
    const speedZoom = this.mode === 'follow' && !this.followWater ? Math.min(1.8, this.followSpeed * 0.12) : 0;
    const distance = (this.cur.distance + speedZoom) * this.occDist * (1 + CLIMB_BACK * ck) * (1 - 0.5 * up);
    const cp = Math.cos(pitch);
    // la cible est en coordonnées absolues ; la caméra vit en coordonnées locales
    const fx = this.focus.x - ORIGIN.x;
    const fz = this.focus.z - ORIGIN.z;
    this.camera.position.set(
      fx + Math.sin(yaw) * cp * distance,
      this.focus.y + Math.sin(pitch) * distance,
      fz + Math.cos(yaw) * cp * distance,
    );
    // au ras du sol ou de la mer, jamais dessous
    if (low && this.groundFn) {
      const gy = Math.max(0, this.groundFn(this.focus.x + Math.sin(yaw) * cp * distance, this.focus.z + Math.cos(yaw) * cp * distance)) + 0.6;
      if (this.camera.position.y < gy) this.camera.position.y = gy;
    }
    // secousse brève (atterrissage lourd, rebond, dérapage) qui s'amortit
    if (this.shakeAmp > 0.0005) {
      this.shakeT += dt;
      const a = this.shakeAmp;
      this.camera.position.x += Math.sin(this.shakeT * 61) * a;
      this.camera.position.y += Math.sin(this.shakeT * 47 + 1.3) * a;
      this.camera.position.z += Math.sin(this.shakeT * 53 + 2.1) * a;
      this.shakeAmp *= Math.exp(-9 * dt);
    } else this.shakeAmp = 0;
    // balancement des pas : ressort un peu sous-amorti (petit rebond), invisible au repos
    const bw = 22;
    this.bobV += (-bw * bw * this.bobY - 2 * 0.55 * bw * this.bobV) * dt;
    this.bobY += this.bobV * dt;
    this.swayV += (-bw * bw * this.sway - 2 * 0.6 * bw * this.swayV) * dt;
    this.sway += this.swayV * dt;
    if (Math.abs(this.bobY) + Math.abs(this.sway) > 1e-5) {
      this.camera.position.y += this.bobY;
      this.camera.position.x += Math.cos(yaw) * this.sway;
      this.camera.position.z -= Math.sin(yaw) * this.sway;
    }
    if (this.fovBase === null) this.fovBase = this.camera.fov;
    this.fovCur += (this.fovKick - this.fovCur) * damp(4, dt);
    const fov = this.fovBase + this.fovCur;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(fx + this.lookOffset.x, this.focus.y + this.lookOffset.y + climbLook + up * distance * 0.12, fz + this.lookOffset.z);
    if (this.tilt) this.camera.rotation.z += this.tilt;
    this.camera.updateMatrixWorld();

    // monde courbé : origine sur la cible, direction = avant de la caméra
    this.forward.set(-Math.sin(yaw), -Math.cos(yaw));
    U.uCurveOrigin.value.set(fx, this.focus.y, fz);
    U.uCurveDir.value.copy(this.forward);
    U.uHorizonDip.value = computeHorizonDip(this.camera, U.uCurveOrigin.value, this.forward, U.uCurvature.value);
  }
}
