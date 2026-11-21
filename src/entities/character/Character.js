import * as THREE from 'three';
import { toonMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW, U } from '../../core/globals.js';
import { SMOKE_VERT, SMOKE_FRAG } from '../../world/World.js';
import { defaultAvatar, sanitizeAvatar, SKINS, HAIR_COLORS } from './avatar.js';
import { FaceAtlas, faceGeometry, EXPRESSIONS, BLINKABLE, EYE, cellUV } from './face.js';
import { locomotionPose, LOCO_FAMILY, FAMILY_HALFLIFE, createArmDynamics, stepArmDynamics, handWeightTarget, climbRootFrame, axisInRoot, climbHandTarget, perchHandTarget, trunkChord, CLIMB, CLIMB_GAP, climbRenderFrame } from '../locomotion/pose.js';
import { H as MOTOR_STEP } from '../locomotion/motor.js';
import { applyJoints, reachHand, shoulderInRoot, handInRoot, boneToRoot, HAND_RADIUS, HAND_BRUSH_GAP } from '../locomotion/rig.js';
import { RESSORT, PAN, SAC, hairSpring, stepHair, hairAngles, stepRebond } from './cheveux.js';
import { B, PARENT, REST, ID, tint, HAIR_STYLES, buildAvatarGeometry, GABARIT, TETE_K, versReel, DYN_PANS, DYN_SAC } from '../../models/personnage/index.js';
import { crayonGeometry } from '../../models/personnage/index.js';
export { HAIR_STYLES };

// Joueur humain, rond et peint, aux proportions du gabarit (models/personnage/gabarit.js) : héros 2.0
// (5 têtes, 1,58 m sans les cheveux) ou chibi 1.0 (≈ 1,45 m, tête = 40 % de la hauteur).
// Tout le corps, vêtements et cheveux compris, est UN SkinnedMesh à liaison
// rigide (chaque pièce suit un seul os) ; le visage est une calotte texturée
// accrochée à l'os de la tête. Animation 100 % procédurale.

const damp = (k, dt) => 1 - Math.exp(-k * dt);

// ---------------------------------------------------------------------------
// Petites bouffées de poussière peintes quand on court
// ---------------------------------------------------------------------------
function buildDust(n, lit = '#fffaf0', shade = '#c4a47c') {
  const geo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geo.index = plane.index;
  geo.setAttribute('position', plane.attributes.position);
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  geo.setAttribute('aFade', fade);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(n).map(() => Math.random() * 10), 1));
  const mat = new THREE.ShaderMaterial({
    name: 'poussiere',
    glslVersion: THREE.GLSL3,
    // dessus plus clair et ombre plus chaude que le sable : la bouffée se lit sur le chemin
    uniforms: { ...U, uCloudLit: { value: new THREE.Color(lit) }, uCloudShade: { value: new THREE.Color(shade) } },
    vertexShader: SMOKE_VERT,
    fragmentShader: SMOKE_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.visible = false;
  mesh.userData.fade = fade;
  return mesh;
}

// Réserve de bouffées réutilisées (aucune allocation) : poussière des pas, traînée de
// dérapage, anneau d'atterrissage, roulade ; une seconde réserve claire pour l'écume,
// le souffle et la sueur. Coordonnées de scène (absolues − ORIGIN).
class PuffPool {
  constructor(n, lit, shade) {
    this.mesh = buildDust(n, lit, shade);
    this.fade = this.mesh.userData.fade;
    this.items = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, s: 0.2, grow: 0.3, drag: 2, grav: 0, alive: false }));
    this.next = 0;
    this._m = new THREE.Matrix4();
  }

  spawn(x, y, z, o = {}) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    it.alive = true;
    it.x = x;
    it.y = y;
    it.z = z;
    it.vx = o.vx ?? 0;
    it.vy = o.vy ?? 0.35;
    it.vz = o.vz ?? 0;
    it.t = 0;
    it.life = o.life ?? 0.6;
    it.s = o.size ?? 0.18;
    it.grow = o.grow ?? 0.3;
    it.drag = o.drag ?? 2.5;
    it.grav = o.grav ?? 0;
  }

  update(dt) {
    let n = 0;
    const m = this._m;
    for (const it of this.items) {
      if (!it.alive) continue;
      it.t += dt;
      if (it.t >= it.life) {
        it.alive = false;
        continue;
      }
      const k = Math.exp(-it.drag * dt);
      it.vx *= k;
      it.vz *= k;
      it.vy = it.vy * k - it.grav * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.z += it.vz * dt;
      const u = it.t / it.life;
      const size = it.s + u * it.grow;
      m.makeScale(size, size, size).setPosition(it.x, it.y, it.z);
      this.mesh.setMatrixAt(n, m);
      this.fade.setX(n, Math.min(1, Math.sin(Math.min(1, u * 1.6) * Math.PI) * (1 - u) * 1.5));
      n++;
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    if (n) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.fade.needsUpdate = true;
    }
  }
}

const BASE = {
  bodyY: 0, lean: 0, bodyRoll: 0, sx: 1, sy: 1, hipsY: 0, hipsZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0,
  neckX: 0, neckY: 0, neckZ: 0,
  headX: 0, headY: 0, headZ: 0,
  armLX: 0, armLZ: -0.2, armRX: 0, armRZ: 0.2, foreL: -0.15, foreR: -0.15,
  wristLX: 0, wristLZ: 0, wristRX: 0, wristRZ: 0,
  thighL: 0, thighR: 0, shinL: 0, shinR: 0, footL: 0, footR: 0,
};
const FIDGETS = ['etire', 'ciel', 'tape', 'gratte'];
const _crown = new THREE.Vector3();
// point du torse où l'écharpe et le sac mesurent l'accélération (repère de l'os du torse : entre le nœud
// de l'écharpe et le haut du sac)
const CLOTH_POINT = new THREE.Vector3(0.06, versReel(B.TORSO, [0, 1.0, 0])[1] - REST[B.TORSO][1], -0.08);
// grimpe : durée (s) du glissement des cibles des mains à l'accroche et entre tronc et poirier
const CLIMB_BLEND = 0.25;
// grimpe : durée (s) du retour des mains à l'animation, une fois revenues à leur pose en quittant le tronc
const CLIMB_RELEASE = 0.12;
// grimpe : vitesse de rotation maximale (rad/s) des os des bras, et ces os
const ARM_RATE = 30;
const ARM_BONES = [B.ARM_L, B.FORE_L, B.HAND_L, B.ARM_R, B.FORE_R, B.HAND_R];
// poirier : durée (s) de la bascule par-dessus les mains, à l'aller et au retour
const PERCH_FLIP = 0.4;

export class Character {
  constructor(avatar = defaultAvatar()) {
    this.id = ID.body;
    this.root = new THREE.Group();
    this.root.name = 'personnage';
    this.body = new THREE.Group();
    // pivot de roulade : tourne autour du centre du corps (voir locomotion/pose.js)
    this.spin = new THREE.Group();
    this.root.add(this.spin);
    this.spin.add(this.body);
    // Épée décorative portée dans le dos, indépendante des os et de l'inventaire.
    // Elle suit le corps pendant la marche et les roulades sans modifier le modèle catalogue.
    this.backSword = new THREE.Group();
    this.backSword.name = 'épée de dos';
    this.backSword.position.set(...GABARIT.epee.p);
    this.backSword.rotation.z = GABARIT.epee.rz;
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.35);
    bladeShape.lineTo(0.032, -0.27);
    bladeShape.lineTo(0.032, 0.028);
    bladeShape.lineTo(-0.032, 0.028);
    bladeShape.lineTo(-0.032, -0.27);
    bladeShape.closePath();
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bladeShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 1 }),
      toonMaterial({ color: '#b9d4d7', rim: 0.75, pigment: 0.2 }),
    );
    blade.position.z = -0.012;
    this.backSword.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.055), toonMaterial({ color: '#d8a95f', rim: 0.45, pigment: 0.1 }));
    guard.position.set(0, 0.04, -0.005);
    this.backSword.add(guard);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.031, 0.19, 8), toonMaterial({ color: '#76513f', rim: 0.35, pigment: 0.15 }));
    grip.position.set(0, 0.135, 0);
    this.backSword.add(grip);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), toonMaterial({ color: '#d8a95f', rim: 0.45, pigment: 0.1 }));
    pommel.position.set(0, 0.245, 0);
    this.backSword.add(pommel);
    // contour « doux » : l'encre suit les frontières entre masses, pas chaque mèche
    this.mat = toonMaterial({ vertexColors: true, aId: true, outline: 0.5, rim: 1.25, pigment: 0.35, character: true });

    // squelette
    this.bones = REST.map(() => new THREE.Bone());
    this.restLocal = REST.map(() => new THREE.Vector3());
    this.mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), this.mat);
    this.bones.forEach((b, i) => (PARENT[i] < 0 ? this.mesh : this.bones[PARENT[i]]).add(b));
    // Accrochée au torse plutôt qu'au pivot global : elle suit ses inclinaisons et reste
    // plaquée au dos malgré les poses et les mouvements du personnage.
    this.bones[B.TORSO].add(this.backSword);
    this.skeleton = new THREE.Skeleton(this.bones);
    this.mesh.frustumCulled = false;
    this.mesh.layers.enable(LAYER_SHADOW);
    this.body.add(this.mesh);

    // main droite : ce qu'on tient (arrosoir, crayon)
    this.hand = new THREE.Object3D();
    this.hand.position.set(0, 0, 0.008);
    this.bones[B.HAND_R].add(this.hand);

    // visage
    this.atlas = new FaceAtlas();
    this.faceMat = toonMaterial({ color: '#ffffff', id: ID.head, rim: 1.25, pigment: 0.2, outline: 0, face: this.atlas.texture, character: true });
    this.face = new THREE.Mesh(faceGeometry(), this.faceMat);
    this.face.position.set(0, GABARIT.HC - REST[B.HEAD][1], 0);
    this.bones[B.HEAD].add(this.face);
    this.eyeCell = -1;
    this.mouthCell = -1;
    this.expression = 'neutre';

    this.dustPool = new PuffPool(64, '#fffaf0', '#c4a47c');
    this.foamPool = new PuffPool(48, '#ffffff', '#b9d8ec');
    this.dust = this.dustPool.mesh;
    this.foam = this.foamPool.mesh;
    this._m = new THREE.Matrix4();
    this._v = new THREE.Vector3();

    // état d'animation
    this.pose = 'idle';
    this.previousPose = 'idle';
    this.poseTime = 0;
    this.phase = 0;
    this.speed = 0;
    this.speedAccel = 0;
    this.blinkT = 2;
    this.lookYaw = 0;
    this.lookTarget = 0;
    this.lookTimer = 3;
    this.held = null;
    this.squashImpulse = 0;
    this.idleTime = 0;
    this.nextFidget = 20;
    this.fidget = null;
    this.lastStep = 0;
    this.sleepy = false;
    this.clothSprings = {
      hairA: hairSpring(),
      hairB: hairSpring(),
      hairC: hairSpring(),
      skirt: { x: 0, vx: 0, y: 0, vy: 0, z: 0, vz: 0 },
      scarf: { x: 0, vx: 0, y: 0, vy: 0, z: 0, vz: 0 },
      // pans de l'écharpe (os SCARF, SCARF_B) et sac à dos (os BAG ; ty : rebond vertical)
      panA: hairSpring(),
      panB: hairSpring(),
      sac: hairSpring(),
    };
    this.springs = [this.clothSprings.hairA, this.clothSprings.hairB, this.clothSprings.hairC];
    this.prevHeadY = 0;
    // cheveux (hairPush) : racine et sommet du crâne autour d'elle à l'image précédente, leurs vitesses,
    // accélération lissée (state : 0 = à placer, 1 = vitesses à prendre, 2 = en route), orientation de
    // la tête, poussée
    const v3 = () => new THREE.Vector3();
    const inertie = () => ({
      state: 0, p: v3(), prev: v3(), rootPrev: v3(), vr: v3(), vr1: v3(), vo: v3(), vo1: v3(), acc: v3(), a: v3(), w: v3(),
      q: new THREE.Quaternion(), s: v3(), m: new THREE.Matrix4(), push: [0, 0, 0], al: v3(), wl: v3(),
    });
    this._hairDyn = inertie();
    // écharpe et sac : même mesure, au torse (point entre le nœud et le haut du sac)
    this._clothDyn = inertie();
    this._prevPos = null;
    this._estVel = new THREE.Vector3();
    this.j = { ...BASE };
    // transitions de locomotion : écart à effacer (inertialisation) et vitesses des articulations
    this.jv = Object.fromEntries(Object.keys(BASE).map((k) => [k, 0]));
    this.off = Object.fromEntries(Object.keys(BASE).map((k) => [k, 0]));
    this.offV = Object.fromEntries(Object.keys(BASE).map((k) => [k, 0]));
    this.fam = null;
    this.famW = 14;
    this.spinCur = 0;
    this.liftCur = 0;
    this.lp = { now: 0, startT: 1, breath: 0 };
    this.lx = { spin: 0, lift: 0, expr: null };
    this.moving = false;
    this.startT = 1;
    this.breath = 0;
    // bras vivants (ressorts secondaires) et main au sol (poids mélangé, côté, cible)
    this.armDyn = createArmDynamics();
    this.armOut = { armLX: 0, armLZ: 0, armRX: 0, armRZ: 0 };
    this.handW = 0;
    this.handSide = 0;
    this.handRise = 0;
    this.handGap = 0;
    this._rig = { spin: this.spin, body: this.body, mesh: this.mesh, bones: this.bones };
    this._shoulder = new THREE.Vector3();
    this._handTarget = new THREE.Vector3();
    this.handContact = new THREE.Vector3();
    this.handContactOk = false;
    // grimpe : poids des mains sur l'écorce, glissade (bras et jambes serrés), temps depuis l'accroche,
    // repère de la racine sur le tronc et dernières cibles des mains (repère racine)
    this.climbW = 0;
    this.vyPose = 0;
    this.slideW = 0;
    this.grabT = 1;
    this.climbFam = null;
    this.climbGap = 0;
    this.perchSpin = false;
    this.flipT = 0;
    this._climbFrame = {};
    this._climbAxis = {};
    this._climbTgt = { [1]: new THREE.Vector3(), [-1]: new THREE.Vector3() };
    this._climbFrom = { [1]: new THREE.Vector3(), [-1]: new THREE.Vector3() };
    this._climbTo = new THREE.Vector3();
    // orientation des os des bras à l'image précédente (vitesse bornée sur le tronc)
    this._armQ = [];
    for (const bi of ARM_BONES) this._armQ[bi] = new THREE.Quaternion();
    this._armQOk = false;
    // charnière du coude de chaque bras sur le tronc (repère du buste), gardée d'une image à l'autre
    this._climbHinge = { [1]: new THREE.Vector3(), [-1]: new THREE.Vector3() };
    this.climbSrc = null;
    this.climbBlendT = 1;
    this.blendByFlip = false;
    this._chord = [0, 1, 0];
    this._renderPos = null;
    this._renderFacing = undefined;
    this._axisAt = (ds, o) => axisInRoot(this._climbFrame, ds, o);

    this.setAvatar(avatar);
  }

  // Reconstruit le maillage pour une nouvelle apparence (mesure dans lastBuildMs)
  setAvatar(raw) {
    const t0 = performance.now();
    const av = sanitizeAvatar(raw);
    const style = HAIR_STYLES[av.hair];
    // os des cheveux posés par la coupe (positions de dessin), portés au squelette
    REST[B.HAIR_A] = versReel(B.HAIR_A, style.a);
    REST[B.HAIR_B] = versReel(B.HAIR_B, style.b);
    REST[B.HAIR_C] = versReel(B.HAIR_C, style.c ?? style.a);
    REST.forEach((p, i) => {
      const parent = PARENT[i] < 0 ? [0, 0, 0] : REST[PARENT[i]];
      this.restLocal[i].set(p[0] - parent[0], p[1] - parent[1], p[2] - parent[2]);
    });
    const old = this.mesh.geometry;
    this.mesh.geometry = buildAvatarGeometry(av);
    old.dispose();
    this.rebind();
    this.faceMat.uniforms.uColor.value.set(SKINS[av.skin]);
    this.atlas.draw({ eyes: av.eyes, brow: tint(HAIR_COLORS[av.hairColor], 0.78) });
    this.avatar = av;
    this.placeSword(av);
    this.lastBuildMs = performance.now() - t0;
    return av;
  }

  // Recalcule la pose de liaison (les os des cheveux changent selon la coupe)
  rebind() {
    const saved = this.bones.map((b) => b.quaternion.clone());
    this.bones.forEach((b, i) => {
      b.position.copy(this.restLocal[i]);
      b.quaternion.identity();
    });
    this.mesh.bind(this.skeleton);
    this.bones.forEach((b, i) => b.quaternion.copy(saved[i]));
  }

  setPose(name) {
    if (this.pose === name) return;
    if (this.pose === 'swordAttack') this.stowSword();
    if (name === 'swordAttack') this.drawSword();
    if (this.pose === 'study' && this.held === this._pencil) this.holdItem(null);
    this.previousPose = this.pose;
    this.pose = name;
    this.poseTime = 0;
    if (name === 'study' && !this.held) this.holdItem(this.pencil());
  }

  // Épée de dos : sur le sac quand il est porté (GABARIT.epeeSac, os BAG : elle rebondit avec lui), sinon
  // sur le torse (GABARIT.epee). Épée en main : on change seulement l'endroit où elle sera rangée.
  placeSword(av = this.avatar) {
    const surSac = av?.back === 'sac' && GABARIT.epeeSac;
    const e = surSac ? GABARIT.epeeSac : GABARIT.epee;
    const home = { parent: this.bones[surSac ? B.BAG : B.TORSO], position: new THREE.Vector3(...e.p), rotation: new THREE.Euler(e.rx || 0, e.ry || 0, e.rz), scale: new THREE.Vector3(1, 1, 1) };
    if (this._swordHome) {
      Object.assign(this._swordHome, home);
      return;
    }
    this.backSword.parent?.remove(this.backSword);
    home.parent.add(this.backSword);
    this.backSword.position.copy(home.position);
    this.backSword.rotation.copy(home.rotation);
  }

  drawSword() {
    if (this._swordHome) return;
    this._swordHome = {
      parent: this.backSword.parent,
      position: this.backSword.position.clone(),
      rotation: this.backSword.rotation.clone(),
      scale: this.backSword.scale.clone(),
      held: this.held,
      heldVisible: this.held?.visible,
    };
    if (this.held) this.held.visible = false;
    this._swordHome.parent.remove(this.backSword);
    this.hand.add(this.backSword);
    this.backSword.position.set(0, -0.015, 0.02);
    this.backSword.rotation.set(-Math.PI / 2, 0, 0);
  }

  stowSword() {
    const home = this._swordHome;
    if (!home) return;
    this.backSword.parent?.remove(this.backSword);
    home.parent.add(this.backSword);
    this.backSword.position.copy(home.position);
    this.backSword.rotation.copy(home.rotation);
    this.backSword.scale.copy(home.scale);
    if (home.held) home.held.visible = home.heldVisible;
    this._swordHome = null;
  }

  // petit rebond squash & stretch (interactions, joie)
  bounce(amount = 1) {
    this.squashImpulse = amount;
  }

  holdItem(obj) {
    if (this.held) this.hand.remove(this.held);
    this.held = obj;
    if (obj) this.hand.add(obj);
  }

  pencil() {
    if (!this._pencil) {
      this._pencil = new THREE.Mesh(crayonGeometry(ID.limb), toonMaterial({ vertexColors: true, id: ID.limb, rim: 0.8 }));
      this._pencil.position.set(0.0, -0.025, 0.045);
      this._pencil.rotation.set(0.55, 0, 0.2);
    }
    return this._pencil;
  }

  spawnDust(side) {
    this.root.updateMatrixWorld();
    const p = this.root.localToWorld(this._v.set(side * Math.abs(REST[B.FOOT_R][0]), 0.04, -0.08));
    this.dustPool.spawn(p.x, p.y, p.z, { size: 0.16 * (0.7 + Math.random() * 0.4), life: 0.55 + Math.random() * 0.15, vy: 0.4 });
  }

  updateDust(dt) {
    this.dustPool.update(dt);
    this.foamPool.update(dt);
  }

  update(dt, speed01 = 0, motion = null) {
    this.poseTime += dt;
    const t = this.poseTime;
    const now = performance.now() / 1000;
    const speedDelta = dt > 1e-4 ? (speed01 - this.speed) / dt : 0;
    this.speed += (speed01 - this.speed) * damp(10, dt);
    const sp = this.speed;
    this.speedAccel += (speedDelta - this.speedAccel) * damp(8, dt);
    const turnRate = THREE.MathUtils.clamp(motion?.turnRate || 0, -5, 5);
    const T = { ...BASE };
    const breathe = Math.sin(now * ((Math.PI * 2) / 3));
    let expr = this.sleepy ? 'somnolent' : 'neutre';
    const walk = Math.min(1, sp * 1.4);

    const L = motion?.loco;
    // position et cap rendus (Player, interpolés entre les pas du moteur) : la grimpe s'y cale
    this._renderPos = motion?.pos || null;
    this._renderFacing = motion?.facing;
    const useLoco = !!L && (this.pose === 'walk' || this.pose === 'run' || this.pose === 'idle');
    if (!useLoco) {
      this.handW = Math.max(0, this.handW - dt * 8);
      this.climbW = Math.max(0, this.climbW - dt * 8);
    }
    if (useLoco) expr = this.locoPose(T, L, dt, now) || expr;
    else switch (this.pose) {
      case 'walk':
      case 'run':
      case 'idle': {
        const running = this.pose === 'run';
        const run = running ? THREE.MathUtils.smoothstep(t, 0, 0.22) : THREE.MathUtils.smoothstep(sp, 0.96, 1.12);
        const startAccent = running && t < 0.26 ? Math.sin((t / 0.26) * Math.PI) : 0;
        const brake = !running && this.previousPose === 'run' ? Math.exp(-t * 5.5) : 0;
        // Cadence liée à la vitesse réelle : environ 2,5 pas/s en marche et 3,8 en course.
        this.phase += dt * (running
          ? 8.8 + THREE.MathUtils.clamp(sp, 0, 1.15) * 3
          : 2.6 + sp * 7.2 + run * 1.2);
        const s = Math.sin(this.phase);
        const still = 1 - walk;
        // En course, le bassin absorbe chaque impact et le torse reste plus stable.
        T.bodyY = Math.abs(s) * (0.04 + 0.018 * run) * walk;
        T.sy = 1 + breathe * 0.012 * still + Math.cos(this.phase * 2) * (0.018 + 0.012 * run) * walk;
        T.lean = (0.09 + 0.13 * run) * walk + THREE.MathUtils.clamp(this.speedAccel * 0.035, -0.07, 0.07);
        T.bodyRoll = THREE.MathUtils.clamp(-turnRate * sp * 0.022, -0.1, 0.1);
        T.hipsZ = s * (0.025 + 0.018 * run) * walk + Math.sin(now * 1.05) * 0.035 * still;
        // Foulée plus ample en course, avec une flexion du genou pendant le retour du pied.
        T.thighL = s * (0.5 + 0.28 * run) * walk;
        T.thighR = -T.thighL;
        T.shinL = Math.max(0, s) * (0.72 + 0.38 * run) * walk;
        T.shinR = Math.max(0, -s) * (0.72 + 0.38 * run) * walk;
        // Les bras contrebalancent franchement les jambes et restent pliés pendant le sprint.
        T.armLX = -s * (0.58 + 0.32 * run) * walk;
        T.armRX = -T.armLX;
        T.armLZ = -0.2 + 0.04 * run - 0.035 * walk;
        T.armRZ = 0.2 - 0.04 * run + 0.035 * walk;
        T.foreL = -(0.18 + 0.22 * walk + 0.62 * run + Math.max(0, -s) * 0.14 * run);
        T.foreR = -(0.18 + 0.22 * walk + 0.62 * run + Math.max(0, s) * 0.14 * run);
        T.torsoY = -s * (0.09 + 0.08 * run) * walk;
        T.torsoZ = -s * 0.025 * run * walk - T.bodyRoll * 0.55;
        T.neckX = -T.lean * 0.16;
        T.neckZ = -T.bodyRoll * 0.2;
        T.headX = -T.lean * 0.42 + Math.sin(this.phase * 2) * 0.012 * walk;
        T.headZ = -T.bodyRoll * 0.55 + s * 0.018 * walk + Math.sin(now * 0.9) * 0.04 * still;
        // La cheville prolonge la ligne du tibia puis relève les orteils au retour.
        T.footL = (-Math.max(0, s) * 0.16 + Math.max(0, -s) * 0.2) * walk;
        T.footR = (-Math.max(0, -s) * 0.16 + Math.max(0, s) * 0.2) * walk;
        T.wristLX = -0.04 - Math.max(0, s) * 0.05 * run;
        T.wristRX = -0.04 - Math.max(0, -s) * 0.05 * run;
        // Départ comprimé, puis le torse et les bras prennent leur rythme.
        T.bodyY -= startAccent * 0.025 + brake * 0.018;
        T.torsoX += startAccent * 0.08 - brake * 0.11;
        T.armLX += startAccent * 0.16 + brake * 0.12;
        T.armRX += startAccent * 0.16 + brake * 0.12;
        // Le regard reste porté vers l'avant pendant la course.
        // regard qui flâne au repos
        this.lookTimer -= dt;
        if (this.lookTimer < 0) {
          this.lookTarget = (Math.random() - 0.5) * 1.0;
          this.lookTimer = 2 + Math.random() * 4;
        }
        this.lookYaw += (this.lookTarget * still - this.lookYaw) * damp(3, dt);
        T.headY = this.lookYaw;
        if (run > 0.3) expr = 'content';
        // poussière à chaque pas de course
        const step = Math.floor(this.phase / Math.PI);
        if (step !== this.lastStep) {
          this.lastStep = step;
          if (run > 0.5) this.spawnDust(step % 2 ? 1 : -1);
        }
        // petites occupations après 20 s d'immobilité
        if (walk < 0.05 && this.pose === 'idle') this.idleTime += dt;
        else {
          this.idleTime = 0;
          this.nextFidget = 20;
          this.fidget = null;
        }
        if (!this.fidget && this.idleTime > this.nextFidget) {
          this.fidget = { name: FIDGETS[Math.floor(Math.random() * FIDGETS.length)], t: 0, dur: 2.6 };
        }
        if (this.fidget) expr = this.applyFidget(T, dt) || expr;
        break;
      }
      case 'sit':
      case 'study': {
        T.bodyY = -0.39;
        T.sy = 1 + breathe * 0.012;
        T.thighL = T.thighR = -1.45;
        T.shinL = 1.35 + Math.sin(t * 1.3) * 0.08;
        T.shinR = 1.35 + Math.sin(t * 1.3 + 1.5) * 0.08;
        if (this.pose === 'study') {
          // écrit, tourne les pages, s'étire de temps en temps (cycle de 26 s)
          const cycle = t % 26;
          expr = 'concentre';
          T.torsoX = 0.2;
          T.headX = 0.3 + Math.sin(t * 0.9) * 0.05;
          T.headZ = Math.sin(t * 0.37) * 0.06;
          T.armRX = -1.25 + Math.sin(t * 7.5) * 0.05;
          T.foreR = -0.5 + Math.sin(t * 5.1) * 0.08;
          T.armRZ = 0.12;
          T.armLX = -1.15;
          T.foreL = -0.45;
          T.armLZ = -0.12;
          const flip = cycle % 9;
          if (flip > 8.2) {
            const k = Math.sin(((flip - 8.2) / 0.8) * Math.PI);
            T.armLZ = -0.12 + k * 0.7;
            T.foreL = -0.45 - k * 0.4;
          }
          if (cycle > 22 && cycle < 25) {
            const k = Math.sin(((cycle - 22) / 3) * Math.PI);
            const L = THREE.MathUtils.lerp;
            T.armLX = L(T.armLX, -2.9, k);
            T.armRX = L(T.armRX, -2.9, k);
            T.foreL = L(T.foreL, -0.1, k);
            T.foreR = L(T.foreR, -0.1, k);
            T.armLZ = L(T.armLZ, -0.3, k);
            T.armRZ = L(T.armRZ, 0.3, k);
            T.headX = L(T.headX, -0.35, k);
            T.torsoX = L(T.torsoX, -0.12, k);
            T.sy += k * 0.05;
            if (k > 0.2) expr = 'baillement';
          }
        } else {
          // assis sur le banc : mains sur les genoux, pieds qui se balancent
          expr = 'content';
          T.armLX = T.armRX = -0.55;
          T.foreL = T.foreR = -0.55;
          T.armLZ = -0.15;
          T.armRZ = 0.15;
          T.headX = Math.sin(t * 0.5) * 0.05;
          T.headY = Math.sin(t * 0.23) * 0.3;
          T.shinL += Math.sin(t * 1.6) * 0.18;
          T.shinR += Math.sin(t * 1.6 + 2.2) * 0.18;
        }
        break;
      }
      case 'glide': {
        // Pose réactive au vol : lit l'état physique depuis airRide (pitchAngle, bankAngle, speed).
        const airRide = motion?.airRide ?? null;
        const pitchA  = airRide ? airRide.pitchAngle : 0;
        const bankA   = airRide ? airRide.bankAngle  : 0;
        const speedN  = airRide ? THREE.MathUtils.clamp(airRide.speed / 52, 0, 1) : 0;

        // Corps : légère élévation rythmique + oscillation liée aux turbulences
        T.bodyY = -0.18 + Math.sin(t * 2.2) * 0.025;

        // Torse : se penche en avant en piqué, en arrière en cabré
        T.torsoX = THREE.MathUtils.lerp(-0.08, 0.22, THREE.MathUtils.smoothstep(pitchA, -0.4, 0.4));

        // Roulis du bassin en virage
        T.bodyRoll = bankA * 0.35;

        // Bras : plus ouverts à haute vitesse (équilibre actif)
        T.armLZ = THREE.MathUtils.lerp(-0.42, -0.72, speedN);
        T.armRZ = -T.armLZ;
        T.armLX = T.armRX = THREE.MathUtils.lerp(-0.12, -0.28, speedN);
        T.foreL = T.foreR = -0.32;

        // Jambes : se relèvent en piqué, se détendent en cabré
        T.thighL = T.thighR = THREE.MathUtils.lerp(-0.48, -0.72, THREE.MathUtils.smoothstep(pitchA, 0.3, -0.3));
        T.shinL = T.shinR = 0.55 + Math.sin(t * 1.8) * 0.05;

        // Tête : suit le virage (bankA) et le piqué (pitchA)
        T.headZ = bankA * -0.22;
        T.headX = THREE.MathUtils.lerp(-0.04, -0.16, THREE.MathUtils.smoothstep(pitchA, 0.3, -0.3));

        T.sy = 1 + breathe * 0.012;
        expr  = speedN > 0.7 ? 'content' : 'content';
        break;
      }
      case 'freefall': {
        // Chute libre : corps horizontal face au vent, bras déployés en ailes,
        // jambes fléchies en arrière, ou piqué fuselé si plongée rapide (Maj / Shift).
        const airRide = motion?.airRide ?? null;
        const diving  = motion?.diving ?? false;
        const bankA   = airRide ? airRide.bankAngle : 0;
        const velY    = airRide ? airRide.velocity.y : -30;
        const fallN   = THREE.MathUtils.clamp((-velY) / 55, 0, 1);

        // Flottement d'air à haute vitesse
        const windFlutter = Math.sin(t * 28) * 0.035;

        if (diving) {
          // Piqué tête la première (profil aérodynamique fuselé)
          T.lean = THREE.MathUtils.lerp(0.65, 1.25, fallN);
          T.torsoX = 0.22;
          T.bodyRoll = bankA * 0.75;

          // Bras profilés le long du corps
          T.armLX = T.armRX = 0.45;
          T.armLZ = -0.16;
          T.armRZ = 0.16;
          T.foreL = T.foreR = -0.15;

          // Jambes tendues vers l'arrière
          T.thighL = T.thighR = -0.18;
          T.shinL = T.shinR = 0.22;
          T.footL = T.footR = 0.35;

          // Tête relevée pour regarder le sol
          T.headX = -0.55;
          T.headZ = -bankA * 0.3;
          expr = 'surpris';
        } else {
          // Position en étoile ventrale (skydive classique, équilibre et glisse)
          T.lean = THREE.MathUtils.lerp(0.38, 0.72, fallN);
          T.torsoX = -0.16;
          T.bodyRoll = bankA * 0.65;

          // Bras déployés en ailes dans le vent
          T.armLX = T.armRX = -0.12 + windFlutter;
          T.armLZ = -0.78;
          T.armRZ = 0.78;
          T.foreL = T.foreR = -0.32;

          // Jambes écartées et genoux relevés vers le haut
          T.thighL = T.thighR = 0.28;
          T.shinL = T.shinR = 0.82 + windFlutter;
          T.footL = T.footR = 0.2;

          // Tête relevée face à l'horizon
          T.headX = -0.45;
          T.headZ = -bankA * 0.35;
          expr = fallN > 0.5 ? 'joie' : 'content';
        }

        T.sy = 1 + windFlutter * 0.5;
        break;
      }
      case 'dangle': {
        // assis au bord du ponton, les pieds qui se balancent dans le vide
        expr = 'content';
        T.bodyY = -0.59;
        T.thighL = T.thighR = -1.5;
        T.shinL = 1.2 + Math.sin(t * 2.2) * 0.35;
        T.shinR = 1.2 - Math.sin(t * 2.2) * 0.35;
        T.armLX = T.armRX = 0.35;
        T.foreL = T.foreR = -0.2;
        T.armLZ = -0.45;
        T.armRZ = 0.45;
        T.torsoX = -0.12;
        T.headX = -0.12;
        T.headY = Math.sin(t * 0.3) * 0.4;
        T.sy = 1 + breathe * 0.012;
        break;
      }
      case 'water': {
        expr = 'content';
        T.lean = 0.1;
        T.armRX = -1.0;
        T.foreR = -0.35;
        T.armRZ = 0.22;
        T.armLX = -0.2;
        T.headX = 0.25;
        T.sy = 1 + Math.sin(t * 6) * 0.02;
        if (this.held) this.held.rotation.x = THREE.MathUtils.lerp(this.held.rotation.x, 0.9, damp(4, dt));
        break;
      }
      case 'pickup': {
        // accroupi, surpris, puis bras levés tout content
        if (t < 0.3) {
          const k = Math.sin((t / 0.3) * Math.PI * 0.5);
          expr = 'surpris';
          T.bodyY = -0.16 * k;
          T.thighL = T.thighR = -0.9 * k;
          T.shinL = T.shinR = 1.3 * k;
          T.torsoX = 0.45 * k;
          T.armLX = T.armRX = -0.9 * k;
          T.sy = 1 - 0.08 * k;
          T.sx = 1 + 0.06 * k;
        } else {
          const k = Math.min(1, (t - 0.3) / 0.25);
          expr = 'joie';
          T.bodyY = Math.sin(Math.min(1, (t - 0.3) / 0.4) * Math.PI) * 0.16;
          T.sy = 1 + 0.07 * Math.sin(k * Math.PI);
          T.armLX = T.armRX = -2.8 * k;
          T.foreL = T.foreR = -0.2;
          T.armLZ = -0.25;
          T.armRZ = 0.25;
          T.headX = -0.25 * k;
        }
        break;
      }
      case 'steer':
      case 'row': {
        // assis à la poupe : main sur la barre (voilier) ou rames qui tirent (radeau, barque)
        expr = 'content';
        T.bodyY = -0.39;
        T.thighL = T.thighR = -1.45;
        T.shinL = T.shinR = 1.3;
        T.sy = 1 + breathe * 0.012;
        if (this.pose === 'row') {
          const r = Math.sin(t * 3.2);
          T.torsoX = 0.12 + r * 0.16;
          T.armLX = T.armRX = -1.25 + r * 0.45;
          T.foreL = T.foreR = -0.55 - r * 0.25;
          T.armLZ = -0.32;
          T.armRZ = 0.32;
          T.headX = -r * 0.08;
        } else {
          T.armRX = -0.85 + Math.sin(t * 0.9) * 0.06;
          T.foreR = -0.6;
          T.armRZ = 0.25;
          T.armLX = -0.3;
          T.foreL = -0.4;
          T.armLZ = -0.35;
          T.headY = Math.sin(t * 0.21) * 0.45;
          T.headX = -0.06;
        }
        break;
      }
      case 'swim': {
        // brasse tranquille, la tête hors de l'eau
        expr = 'content';
        const s = Math.sin(t * 3.4);
        const c2 = Math.cos(t * 3.4);
        T.lean = 0.55;
        T.headX = -0.5;
        T.armLX = -1.9 + s * 0.6;
        T.armRX = -1.9 + s * 0.6;
        T.armLZ = -0.5 - c2 * 0.45;
        T.armRZ = 0.5 + c2 * 0.45;
        T.foreL = T.foreR = -0.3 - Math.max(0, -s) * 0.6;
        T.thighL = 0.35 + Math.sin(t * 6.8) * 0.3;
        T.thighR = 0.35 - Math.sin(t * 6.8) * 0.3;
        T.shinL = T.shinR = 0.5;
        T.footL = Math.sin(t * 6.8 + 0.8) * 0.16;
        T.footR = -Math.sin(t * 6.8 + 0.8) * 0.16;
        T.sy = 1 + Math.sin(t * 3.4) * 0.015;
        break;
      }
      case 'chop':
      case 'mine': {
        // élan au-dessus de l'épaule puis frappe (cycle de 0,7 s)
        expr = 'concentre';
        const k = (t % 0.7) / 0.7;
        const up = k < 0.55 ? Math.sin((k / 0.55) * Math.PI * 0.5) : 1 - Math.pow((k - 0.55) / 0.45, 0.6);
        const high = this.pose === 'mine' ? 1 : 0.75;
        T.armRX = -0.6 - up * 2.1 * high;
        T.armLX = -0.5 - up * 1.8 * high;
        T.armRZ = 0.15;
        T.armLZ = -0.15;
        T.foreR = T.foreL = -0.35;
        T.torsoX = 0.25 - up * 0.35;
        T.torsoY = this.pose === 'chop' ? 0.35 - up * 0.5 : 0;
        T.thighL = -0.25;
        T.shinL = 0.3;
        T.thighR = 0.2;
        T.headX = 0.15 - up * 0.1;
        T.sy = 1 - (1 - up) * 0.03;
        break;
      }
      case 'dig': {
        expr = 'concentre';
        const k = Math.sin(t * 4.2);
        T.lean = 0.25;
        T.torsoX = 0.35 + k * 0.15;
        T.armRX = T.armLX = -0.9 - k * 0.35;
        T.foreR = T.foreL = -0.6;
        T.armRZ = 0.1;
        T.armLZ = -0.1;
        T.thighL = -0.35;
        T.shinL = 0.5;
        T.headX = 0.3;
        break;
      }
      case 'fish': {
        // canne tenue devant soi ; légère tension quand ça mord
        expr = this.bite ? 'surpris' : 'content';
        const pull = this.bite ? Math.sin(t * 14) * 0.08 : 0;
        T.armRX = -1.0 + pull;
        T.armLX = -0.95 + pull;
        T.foreR = T.foreL = -0.45;
        T.armRZ = 0.1;
        T.armLZ = -0.1;
        T.torsoX = this.bite ? -0.1 : 0.05;
        T.headX = 0.12;
        T.sy = 1 + breathe * 0.012;
        break;
      }
      case 'build': {
        expr = 'concentre';
        const k = Math.abs(Math.sin(t * 7));
        T.armRX = -1.6 + k * 0.9;
        T.foreR = -0.7;
        T.armLX = -0.8;
        T.foreL = -0.5;
        T.torsoX = 0.2;
        T.headX = 0.2;
        break;
      }
      case 'swordAttack': {
        expr = 'determine';
        const rise = THREE.MathUtils.clamp(t / 0.2, 0, 1);
        const cut = THREE.MathUtils.clamp((t - 0.2) / 0.16, 0, 1);
        const ease = cut * cut * (3 - 2 * cut);
        const lift = t < 0.2 ? rise * rise * (3 - 2 * rise) : 1 - ease;
        T.armRX = -0.28 - lift * 2.05;
        T.foreR = -0.3 - lift * 0.25;
        T.armRZ = 0.18 - lift * 0.42;
        T.wristRX = -0.12 - (1 - lift) * 0.2;
        T.wristRZ = 0.18 - (1 - lift) * 0.38;
        T.armLX = -0.75;
        T.foreL = -0.4;
        T.armLZ = -0.22;
        T.torsoX = 0.08 - (1 - lift) * 0.18;
        T.torsoY = 0.08 + (1 - lift) * 0.3;
        T.thighL = -0.12;
        T.thighR = 0.08;
        T.headX = 0.1;
        break;
      }
      case 'carry': {
        T.armLX = T.armRX = -1.15;
        T.foreL = T.foreR = -0.5;
        T.armLZ = -0.1;
        T.armRZ = 0.1;
        break;
      }
      case 'celebrate': {
        expr = 'joieOuverte';
        const hop = Math.abs(Math.sin(t * 6));
        T.bodyY = hop * 0.22;
        T.sy = 1 + (hop - 0.5) * 0.14;
        T.sx = 1 - (hop - 0.5) * 0.07;
        T.armLX = -2.7 + Math.sin(t * 12) * 0.2;
        T.armRX = -2.7 - Math.sin(t * 12) * 0.2;
        T.armLZ = -0.45;
        T.armRZ = 0.45;
        T.foreL = T.foreR = -0.25;
        T.thighL = T.thighR = -0.3 * hop;
        T.shinL = T.shinR = 0.6 * hop;
        T.headX = -0.2;
        break;
      }
      default:
        break;
    }

    // impulsion de rebond
    if (this.squashImpulse > 0.001) {
      const k = this.squashImpulse;
      T.sy *= 1 - Math.sin(k * Math.PI) * 0.12;
      T.sx *= 1 + Math.sin(k * Math.PI) * 0.08;
      this.squashImpulse = Math.max(0, this.squashImpulse - dt * 3);
    }

    const j = this.j;
    const idt0 = 1 / Math.max(dt, 1e-4);
    if (useLoco) {
      // changement de famille de pose : l'écart s'efface par un ressort critique ;
      // au sein d'une famille, la pose (déjà continue) est appliquée telle quelle
      const fam = LOCO_FAMILY[L.state] || 'sol';
      if (fam !== this.fam) {
        this.fam = fam;
        this.famW = 1.678 / (FAMILY_HALFLIFE[fam] || 0.12);
        for (const key in T) {
          this.off[key] = j[key] - T[key];
          this.offV[key] = 0;
        }
      }
      const w = this.famW;
      const e = Math.exp(-w * dt);
      for (const key in T) {
        const x0 = this.off[key];
        const v0 = this.offV[key];
        const a1 = v0 + w * x0;
        this.off[key] = (x0 + a1 * dt) * e;
        this.offV[key] = (v0 - w * a1 * dt) * e;
        const nj = T[key] + this.off[key];
        this.jv[key] = (nj - j[key]) * idt0;
        j[key] = nj;
      }
    } else {
      this.fam = null;
      const k = damp(14, dt);
      for (const key in T) {
        const nj = j[key] + (T[key] - j[key]) * k;
        this.jv[key] = (nj - j[key]) * idt0;
        j[key] = nj;
      }
    }
    // roulade : rotation autour du centre du corps ; hors roulade, retour par le plus court
    const X = this.lx;
    const perch = useLoco && LOCO_FAMILY[L.state] === 'perch';
    if (useLoco && LOCO_FAMILY[L.state] === 'roll') {
      this.spinCur = X.spin;
      this.flipT = 0;
      this.perchSpin = false;
    } else if (perch || this.flipT > 0) {
      // poirier : le corps bascule par-dessus les mains en PERCH_FLIP s, lisse aux deux bouts, et
      // revient de même (saut du sommet, redescente)
      this.flipT = THREE.MathUtils.clamp(this.flipT + (perch ? dt : -dt) / PERCH_FLIP, 0, 1);
      this.spinCur = Math.PI * THREE.MathUtils.smoothstep(this.flipT, 0, 1);
      this.perchSpin = this.flipT > 0;
    } else if (this.spinCur !== 0) {
      let d = this.spinCur % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.spinCur = Math.abs(d) < 0.01 ? 0 : d * Math.exp(-26 * dt);
    }
    const liftT = useLoco ? X.lift : 0;
    // poirier : le pivot est posé d'emblée à hauteur de poitrine et y reste jusqu'au retour complet de
    // la bascule (sans rotation, la hauteur du pivot ne déplace rien) ; ailleurs, il suit la pose
    if (this.perchSpin) this.liftCur = CLIMB.perchLift;
    else this.liftCur += (liftT - this.liftCur) * damp(30, dt);
    this.spin.position.y = this.liftCur;
    this.spin.rotation.x = this.spinCur;

    const bn = this.bones;
    // à pied, l'inclinaison pivote sous le pied intérieur (locomotion/rig.js) ; sur un tronc, aux pieds
    const onTrunk = useLoco && (LOCO_FAMILY[L.state] === 'climb' || LOCO_FAMILY[L.state] === 'perch');
    applyJoints(this.body, bn, j, this.liftCur, useLoco && !onTrunk);
    // main au sol : le bras intérieur va chercher le sol sous l'épaule (cinématique inverse) ;
    // la hauteur du sol vient de la sonde de Player (handRise), pour suivre le relief
    this.handGap = 0;
    this.handContactOk = false;
    const side = this.handSide || (L?.handDown ? L.handSide : 0);
    if (useLoco && side && (this.handW > 1e-3 || L.handDown)) {
      const sh = shoulderInRoot(this._rig, side, this._shoulder);
      this._handTarget.set(sh.x, this.handRise + HAND_RADIUS * j.sy + HAND_BRUSH_GAP, sh.z + 0.04);
      // point de contact au sol (repère du personnage), lu par les retours (poussière)
      this.handContact.set(this._handTarget.x, this.handRise, this._handTarget.z);
      this.handContactOk = true;
      if (this.handW > 1e-3) this.handGap = reachHand(this._rig, j, side, this._handTarget, this.handW);
    }
    // grimpe : les mains tiennent l'écorce (cibles du cycle, sur la vraie courbe de l'axe), ou le
    // sommet au poirier. À l'accroche, la cible glisse en CLIMB_BLEND s depuis la main ; entre tronc
    // et poirier, au rythme de la bascule ; en quittant le tronc, vers la main de la pose animée, puis
    // les mains sont rendues à l'animation (un fondu de poids basculerait d'un coup quand les deux
    // rotations du bras s'opposent). Pendant ces changements, les os des bras tournent au plus à
    // ARM_RATE : aux bascules, le bras ne claque jamais d'une image à l'autre.
    this.climbGap = 0;
    const climbFam = useLoco ? LOCO_FAMILY[L.state] : null;
    const src = climbFam === 'perch' ? 'perch' : climbFam === 'climb' && L.trunk ? 'climb' : null;
    if (src || (useLoco && this.climbW > 1e-3)) {
      const handR = HAND_RADIUS * j.sy;
      // repère de la racine : telle que rendue (position de Player), sinon sa place sur le tronc
      if (src === 'climb') {
        if (this._renderPos) climbRenderFrame(L.trunk.pts, this.lp.climbS, this._renderPos, this._renderFacing ?? L.heading, this._climbFrame);
        else climbRootFrame(L.trunk.pts, L.climbS, L.heading, this._climbFrame);
      }
      if (src !== this.climbSrc) {
        for (const sd of [1, -1]) {
          if (this.climbSrc) this._climbFrom[sd].copy(this._climbTgt[sd]);
          else handInRoot(this._rig, sd, this._climbFrom[sd]);
        }
        this.climbBlendT = 0;
        // entre tronc et poirier, les cibles suivent la bascule du corps (sinon, hors de portée)
        this.blendByFlip = !!src && (src === 'perch' || this.climbSrc === 'perch');
        this.climbSrc = src;
      }
      this.climbBlendT += dt;
      const flip = THREE.MathUtils.smoothstep(this.flipT, 0, 1);
      const k = this.blendByFlip ? (src === 'perch' ? flip : 1 - flip) : THREE.MathUtils.smoothstep(this.climbBlendT, 0, CLIMB_BLEND);
      // poids : pris à l'accroche (locoPose), rendu à l'animation une fois la main revenue à sa pose
      if (!src && k >= 1) this.climbW = Math.max(0, this.climbW - dt / CLIMB_RELEASE);
      for (const sd of [1, -1]) {
        const tgt = this._climbTgt[sd];
        if (src === 'perch') perchHandTarget(sd, handR, this._climbTo);
        else if (src === 'climb') climbHandTarget(this.lp, sd, this._axisAt, handR, this._climbTo);
        else handInRoot(this._rig, sd, this._climbTo);
        tgt.copy(this._climbFrom[sd]).lerp(this._climbTo, k);
        if (this.climbW > 1e-3) this.climbGap = Math.max(this.climbGap, reachHand(this._rig, j, sd, tgt, this.climbW, 'cote', this._climbHinge[sd]));
      }
      // pendant un changement de prise (glissement, bascule, lâcher), vitesse de rotation bornée des
      // os des bras depuis l'image précédente ; en prise, les mains restent exactement sur l'écorce
      const changing = k < 1 || !src || (this.flipT > 0 && this.flipT < 1);
      const step = ARM_RATE * dt;
      for (const bi of ARM_BONES) {
        const q = this.bones[bi].quaternion;
        const prev = this._armQ[bi];
        // un bras encore en retard à la fin du changement (bras long, bascule rapide) finit de rattraper
        // sa cible à la même vitesse au lieu de claquer
        if (this._armQOk && (changing || prev.angleTo(q) > step)) q.copy(prev.rotateTowards(q, step));
        prev.copy(q);
      }
      this._armQOk = true;
    } else this._armQOk = false;
    if (!src && this.climbW <= 1e-3) {
      this.climbW = 0;
      this.climbSrc = null;
      this._climbHinge[1].set(0, 0, 0);
      this._climbHinge[-1].set(0, 0, 0);
    }

    // -------------------------------------------------------------------------
    // Dynamique physique 3D des cheveux et des vêtements au vent
    // -------------------------------------------------------------------------
    const idt = 1 / Math.max(dt, 1e-4);
    const vYaw = (j.headY - this.prevHeadY) * idt;
    this.prevHeadY = j.headY;

    // Vitesse mondiale du personnage (fournie par motion.vel ou estimée par déplacement)
    if (!this._prevPos) this._prevPos = new THREE.Vector3().copy(this.root.position);
    const estVel = this._estVel;
    if (motion?.vel) {
      estVel.copy(motion.vel);
    } else if (dt > 1e-4) {
      estVel.set(
        (this.root.position.x - this._prevPos.x) * idt,
        (this.root.position.y - this._prevPos.y) * idt,
        (this.root.position.z - this._prevPos.z) * idt
      );
    }
    this._prevPos.copy(this.root.position);

    // Direction et force du vent atmosphérique mondial
    const wDir = U.uWindDir?.value || { x: 0.8, y: 0.35 };
    const wBase = U.uWindStrength?.value ?? 1.0;

    // Simulation multi-fréquence de rafales et micro-turbulences
    const slowGust = Math.sin(now * 0.75) * 0.35 + Math.sin(now * 2.1 + 1.2) * 0.2;
    const microTurb = Math.sin(now * 6.3 + 0.4) * 0.15 + Math.sin(now * 13.5) * 0.08;
    const gustMult = Math.max(0.1, wBase * (1.0 + slowGust + microTurb));

    const worldWindX = wDir.x * gustMult;
    const worldWindZ = wDir.y * gustMult;

    // Vent relatif (headwind = opposé au déplacement)
    const headwindX = -estVel.x;
    const headwindY = -estVel.y;
    const headwindZ = -estVel.z;

    // Vent total effectif ressenti par le corps
    const totalWindX = worldWindX + headwindX;
    const totalWindY = headwindY; // En chute libre ou saut, puissant vent vertical
    const totalWindZ = worldWindZ + headwindZ;

    // Projection dans le repère local du personnage (orienté par facing)
    const facing = motion?.facing ?? this.root.rotation.y;
    const cosF = Math.cos(facing);
    const sinF = Math.sin(facing);

    const localWindX = totalWindX * cosF - totalWindZ * sinF; // gauche(-) / droite(+)
    const localWindZ = -(totalWindX * sinF + totalWindZ * cosF); // arrière(+) / avant(-)
    const localWindY = totalWindY; // ascendant(+)

    const airSpeed = Math.hypot(totalWindX, totalWindY, totalWindZ);
    // inertie de l'écharpe : au freinage elle part en avant, à l'accélération elle traîne
    const accF = THREE.MathUtils.clamp(motion?.loco?.aLong ?? motion?.loco?.accF ?? 0, -30, 30);
    const accL = THREE.MathUtils.clamp(motion?.loco?.aLat ?? (motion?.loco?.omega || 0) * (motion?.loco?.v || 0), -15, 15);

    // 1. CHEVEUX : le dessus (HAIR_A), la nuque (HAIR_B) et les côtés (HAIR_C, si la coupe en a) sont des
    // pendules raides fixés à la tête (cheveux.js), poussés par l'accélération réelle du crâne et par le
    // vent ressenti, dans le repère de la tête : ils suivent la course, l'appel et la réception d'un saut,
    // la roulade, l'arrêt brusque
    const hairDyn = HAIR_STYLES[this.avatar?.hair]?.dyn;
    if (hairDyn) {
      const push = this.hairPush(dt, totalWindX, totalWindY, totalWindZ, motion?.vel);
      const yawRate = turnRate + vYaw;
      for (const [key, bone, d] of [['hairA', B.HAIR_A, hairDyn.a], ['hairB', B.HAIR_B, hairDyn.b], ['hairC', B.HAIR_C, hairDyn.c]]) {
        if (!d) continue;
        const a = hairAngles(stepHair(this.clothSprings[key], d, push, dt, yawRate), d);
        bn[bone].rotation.set(a.x, a.y, a.z);
      }
    }

    // 2. VÊTEMENTS : JUPE ET ROBE (B.SKIRT)
    if (bn[B.SKIRT]) {
      const s = this.clothSprings.skirt;
      const clothFlutter = Math.sin(now * (11 + airSpeed * 0.5)) * Math.min(0.12, 0.01 + airSpeed * 0.015);
      const clothWave = Math.sin(this.phase) * 0.07 * walk;

      // Pitch : traînée aérodynamique vers l'arrière, soulèvement en chute libre
      const targetSkirtX = THREE.MathUtils.clamp(
        localWindZ * 0.045 + localWindY * 0.02 + clothFlutter,
        -0.45, 0.8
      );
      // Roll : vent latéral, balancement de la marche et roulis de bassin
      const targetSkirtZ = THREE.MathUtils.clamp(
        -localWindX * 0.045 + clothWave - j.hipsZ * 0.4,
        -0.55, 0.55
      );

      // Ressort tissu (plus dense que les cheveux)
      const skirtStiff = 95;
      const skirtDamp = 9.5;
      s.vx += ((targetSkirtX - s.x) * skirtStiff - s.vx * skirtDamp) * dt;
      s.x += s.vx * dt;
      s.vz += ((targetSkirtZ - s.z) * skirtStiff - s.vz * skirtDamp) * dt;
      s.z += s.vz * dt;

      bn[B.SKIRT].rotation.set(s.x, 0, s.z);
    }

    // 3. VÊTEMENTS : ÉCHARPE ET SAC
    if (GABARIT.nom === 'chibi') {
      // chibi (gardé pour comparer) : un seul pan, sur l'os SCARF, ressort d'origine
      const s = this.clothSprings.scarf;
      // Ondulation fluide en ruban
      const scarfFlutter = Math.sin(now * 15.5 + 1.1) * Math.min(0.22, 0.04 + airSpeed * 0.035);
      const scarfFlutterZ = Math.cos(now * 13.0) * Math.min(0.16, 0.03 + airSpeed * 0.02);

      // L'écharpe est ultra-légère et flotte intensément au vent
      const targetScarfX = THREE.MathUtils.clamp(
        localWindZ * 0.085 + Math.max(0, localWindY) * 0.03 + scarfFlutter + accF * 0.035,
        -0.6, 1.45
      );
      const targetScarfZ = THREE.MathUtils.clamp(
        -localWindX * 0.085 - turnRate * 0.07 + scarfFlutterZ + accL * 0.05,
        -0.95, 0.95
      );

      const scarfStiff = 60;
      const scarfDamp = 6.0;
      s.vx += ((targetScarfX - s.x) * scarfStiff - s.vx * scarfDamp) * dt;
      s.x += s.vx * dt;
      s.vz += ((targetScarfZ - s.z) * scarfStiff - s.vz * scarfDamp) * dt;
      s.z += s.vz * dt;

      bn[B.SCARF].rotation.set(s.x, 0, s.z);
    } else {
      // aventurier : les deux pans de l'écharpe (SCARF, SCARF_B) et le sac (BAG) sont des pendules fixés
      // au torse (cheveux.js, réglages PAN et SAC), poussés par l'accélération du torse et par le vent
      // ressenti, dans le repère du torse : les pans traînent derrière à la course et flottent au saut, le
      // sac rebondit un peu à la foulée et à la réception ; tous bornés par leurs butées (DYN_PANS, DYN_SAC)
      const pans = this.avatar?.accessory === 'echarpe';
      const sac = this.avatar?.back === 'sac';
      if (pans || sac) {
        const C = this._clothDyn;
        this.inertia(C, B.TORSO, CLOTH_POINT, dt, totalWindX, totalWindY, totalWindZ, motion?.vel);
        const f = C.push;
        if (pans) {
          // le tissu bat au vent ressenti (le long de la face plate des pans, surtout en roulis)
          const bat = Math.min(5, airSpeed * 0.8);
          DYN_PANS.forEach((d, i) => {
            const ph = i * 1.7;
            f[0] = C.wl.x * PAN.vent - C.al.x + Math.sin(now * (11.3 + i * 1.9) + ph) * bat;
            f[1] = C.wl.y * PAN.vent - C.al.y + Math.cos(now * (9.1 + i * 1.3) + ph) * bat * 0.5;
            f[2] = C.wl.z * PAN.vent - C.al.z;
            const a = hairAngles(stepHair(this.clothSprings[i ? 'panB' : 'panA'], d, f, dt, turnRate, PAN), d, PAN);
            bn[d.os].rotation.set(a.x, a.y, a.z);
          });
        }
        if (sac) {
          f[0] = C.wl.x * SAC.vent - C.al.x;
          f[1] = C.wl.y * SAC.vent - C.al.y;
          f[2] = C.wl.z * SAC.vent - C.al.z;
          const s = this.clothSprings.sac;
          const a = hairAngles(stepHair(s, DYN_SAC, f, dt, 0, SAC), DYN_SAC, SAC);
          bn[B.BAG].rotation.set(a.x, 0, a.z);
          bn[B.BAG].position.copy(this.restLocal[B.BAG]);
          bn[B.BAG].position.y += stepRebond(s, f[1], dt, SAC);
        }
      }
    }

    // visage : expression + clignement toutes les 2 à 5 s
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
    const [eye0, mouth] = EXPRESSIONS[expr];
    const eye = this.blinkT < 0.12 && BLINKABLE.has(eye0) ? EYE.fermes : eye0;
    if (eye !== this.eyeCell) {
      cellUV(eye, this.faceMat.uniforms.uEyeCell.value);
      this.eyeCell = eye;
    }
    if (mouth !== this.mouthCell) {
      cellUV(mouth, this.faceMat.uniforms.uMouthCell.value);
      this.mouthCell = mouth;
    }
    this.expression = expr;
    this.updateDust(dt);
  }

  // Poussée ressentie par les cheveux (m/s², repère de la tête) : inertie du crâne qui accélère et vent
  // ressenti (wx, wy, wz : vent du monde + vent de course). L'accélération du crâne est celle de la
  // racine, prise sur la vitesse du moteur (vel : une seule dérivée, sans les dents de scie des pas
  // fixes), plus une part de celle du sommet du crâne autour de la racine (la pose : foulée, saut,
  // roulade), lissées (RESSORT, cheveux.js). Une téléportation ou une image très longue repart de zéro.
  hairPush(dt, wx, wy, wz, vel = null) {
    const H = this._hairDyn;
    // sommet du crâne, dans le repère de l'os de la tête
    _crown.set(0, GABARIT.HC + 0.25 * TETE_K - REST[B.HEAD][1], -0.05 * TETE_K);
    this.inertia(H, B.HEAD, _crown, dt, wx, wy, wz, vel);
    H.push[0] = H.wl.x * RESSORT.vent - H.al.x;
    H.push[1] = H.wl.y * RESSORT.vent - H.al.y;
    H.push[2] = H.wl.z * RESSORT.vent - H.al.z;
    return H.push;
  }

  // Mesure, pour un os et un point porté par lui (repère de l'os), l'accélération lissée du point (celle de
  // la racine plus RESSORT.pose de celle du point autour de la racine, H.a, axes du monde) et la rend dans
  // le repère de l'os (H.al), avec le vent ressenti (H.wl ; wx, wy, wz : axes du monde)
  inertia(H, bone, point, dt, wx, wy, wz, vel = null) {
    const rp = this.root.position;
    boneToRoot(this._rig, bone, H.m);
    H.m.decompose(H.p, H.q, H.s);
    H.q.premultiply(this.root.quaternion);
    // point autour de la racine, en axes du monde
    H.p.copy(point).applyMatrix4(H.m).applyQuaternion(this.root.quaternion);
    if (H.state === 0 || dt > 0.1 || rp.distanceToSquared(H.rootPrev) > 4) {
      H.state = 1;
      H.a.set(0, 0, 0);
    } else if (dt > 1e-4) {
      if (vel) H.vr1.copy(vel);
      else H.vr1.subVectors(rp, H.rootPrev).divideScalar(dt);
      H.vo1.subVectors(H.p, H.prev).divideScalar(dt);
      if (H.state === 2) {
        H.acc.subVectors(H.vo1, H.vo).multiplyScalar(RESSORT.pose).add(H.vr1).sub(H.vr).divideScalar(dt).clampLength(0, 80);
        H.a.lerp(H.acc, 1 - Math.exp(-dt / RESSORT.lissage));
      }
      H.vr.copy(H.vr1);
      H.vo.copy(H.vo1);
      H.state = 2;
    }
    H.prev.copy(H.p);
    H.rootPrev.copy(rp);
    H.q.invert();
    H.al.copy(H.a).applyQuaternion(H.q);
    H.wl.set(wx, wy, wz).applyQuaternion(H.q);
    return H;
  }

  // Locomotion pilotée par le moteur : pose pure (locomotion/pose.js) + regard qui flâne,
  // petites occupations au repos, essoufflement après un long sprint
  locoPose(T, L, dt, now) {
    const speed = Math.hypot(L.v, L.vLat);
    if (speed > 0.3 && !this.moving) {
      this.moving = true;
      this.startT = 0;
    } else if (speed < 0.1) this.moving = false;
    this.startT += dt;
    if (L.state === 'SPRINT') this.breath = Math.max(this.breath, Math.min(1, L.sprintTime / 4));
    else this.breath = Math.max(0, this.breath - dt / 2.5);
    // main au sol : le poids monte vite au contact et redescend un peu plus doucement ; le côté
    // reste celui du dernier contact pendant que la main se relève
    const handT = handWeightTarget(L);
    this.handW += (handT - this.handW) * damp(handT > this.handW ? 24 : 14, dt);
    if (L.handDown && L.handSide) this.handSide = L.handSide;
    if (Number.isFinite(L.handRise)) this.handRise += (L.handRise - this.handRise) * damp(30, dt);
    // grimpe : mains sur l'écorce (poids), glissade, temps depuis l'accroche (pas au retour du sommet)
    const famNow = LOCO_FAMILY[L.state] || 'sol';
    const trunkFam = famNow === 'climb' || famNow === 'perch';
    const prevFam = this.climbFam;
    if (famNow === 'climb' && prevFam !== 'climb' && prevFam !== 'perch') this.grabT = 0;
    else this.grabT += dt;
    this.climbFam = famNow;
    // les mains prennent l'écorce vite ; le lâcher se règle avec les cibles (update)
    if (trunkFam) this.climbW += (1 - this.climbW) * damp(20, dt);
    const slideT = famNow === 'climb' && L.sliding ? 1 : 0;
    this.slideW += (slideT - this.slideW) * damp(12, dt);
    const p = this.lp;
    Object.assign(p, L);
    p.now = now;
    p.startT = this.startT;
    p.breath = this.breath;
    p.handW = this.handW;
    p.slideW = this.slideW;
    p.grabT = this.grabT;
    // en l'air, la pose lit une vitesse verticale lissée : le saut relâché tôt (jumpCut) la coupe de
    // moitié d'un pas à l'autre, et l'écrasement comme les bras sauteraient avec elle
    // (au décollage, le changement de famille lisse déjà la pose : on part de la vraie vitesse)
    if (famNow === 'air' && prevFam === 'air') {
      this.vyPose += ((L.vy || 0) - this.vyPose) * damp(30, dt);
      p.vy = this.vyPose;
    } else this.vyPose = L.vy || 0;
    // Le moteur avance au pas fixe (1/120 s) et rend l'état de fin de pas ; le rendu (position
    // interpolée) en est à la part interp du pas : l'abscisse et l'arc reculent d'autant, sinon la pose
    // avance par à-coups au-delà de 120 Hz.
    if (famNow === 'climb' && Number.isFinite(L.interp)) {
      const late = (1 - L.interp) * MOTOR_STEP;
      p.climbS = L.climbS - (L.climbSpeed || 0) * late;
      p.climbArc = L.climbArc + (L.climbTurn || 0) * ((L.trunkR || 0) + CLIMB_GAP) * late;
    }
    // sur un tronc courbe, le corps suit la corde de l'axe des pieds aux mains
    p.bodyTangent = famNow === 'climb' && L.trunk ? trunkChord(L.trunk.pts, p.climbS, this._chord) : null;
    this.phase = L.phase;
    locomotionPose(p, T, this.lx);
    // bras vivants : retard des bras sur l'accélération, à-coups à la réception et au contact
    const dyn = stepArmDynamics(this.armDyn, p, dt, this.armOut);
    const fam = LOCO_FAMILY[L.state] || 'sol';
    if (fam === 'sol' || fam === 'land' || fam === 'air') {
      T.armLX += dyn.armLX;
      T.armRX += dyn.armRX;
      T.armLZ += dyn.armLZ;
      T.armRZ += dyn.armRZ;
    }
    let expr = this.lx.expr;
    // au repos : le regard flâne, puis de petites occupations après 20 s
    const still = L.state === 'IDLE' && speed < 0.1;
    if (still) {
      this.lookTimer -= dt;
      if (this.lookTimer < 0) {
        this.lookTarget = (Math.random() - 0.5) * 1.0;
        this.lookTimer = 2 + Math.random() * 4;
      }
      this.lookYaw += (this.lookTarget - this.lookYaw) * damp(3, dt);
      T.headY += this.lookYaw;
      this.idleTime += dt;
    } else {
      this.lookYaw += (0 - this.lookYaw) * damp(6, dt);
      this.idleTime = 0;
      this.nextFidget = 20;
      this.fidget = null;
    }
    if (!this.fidget && this.idleTime > this.nextFidget) {
      this.fidget = { name: FIDGETS[Math.floor(Math.random() * FIDGETS.length)], t: 0, dur: 2.6 };
    }
    if (this.fidget) expr = this.applyFidget(T, dt) || expr;
    return expr;
  }

  // petites animations de repos : s'étire, regarde le ciel, tapote du pied, se gratte la tête
  applyFidget(T, dt) {
    const f = this.fidget;
    f.t += dt;
    const k = Math.sin(Math.min(1, f.t / f.dur) * Math.PI);
    let expr = null;
    if (f.name === 'etire') {
      T.armLX = T.armRX = -2.9 * k;
      T.armLZ = -0.2 - 0.15 * k;
      T.armRZ = 0.2 + 0.15 * k;
      T.foreL = T.foreR = -0.15 * (1 - k);
      T.headX = -0.3 * k;
      T.sy += 0.05 * k;
      if (k > 0.3) expr = 'baillement';
    } else if (f.name === 'ciel') {
      T.headX = -0.55 * k;
      T.torsoX = -0.1 * k;
      if (k > 0.3) expr = 'content';
    } else if (f.name === 'tape') {
      T.thighR = -0.25 * k;
      T.shinR = (0.4 + Math.sin(f.t * 14) * 0.25) * k;
      T.armLZ = -0.2 - 0.25 * k;
      T.foreL = -1.2 * k;
    } else if (f.name === 'gratte') {
      T.armRZ = 0.2 + 1.9 * k;
      T.armRX = -0.4 * k;
      T.foreR = -1.7 * k + Math.sin(f.t * 16) * 0.12 * k;
      T.headZ = 0.12 * k;
      if (k > 0.3) expr = 'surpris';
    }
    if (f.t >= f.dur) {
      this.nextFidget = this.idleTime + 12 + Math.random() * 10;
      this.fidget = null;
    }
    return expr;
  }
}
