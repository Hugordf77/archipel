// Squelette du personnage côté animation : application des articulations aux os, pivot de
// l'inclinaison sous le pied intérieur, et cinématique inverse du bras (main au sol, mains sur
// un tronc).
// Utilise THREE (matrices) mais ni le DOM ni le maillage : Character.js et les tests partagent
// exactement le même calcul.
//
// Repère du personnage (racine aux pieds, avant = +z). Attention au nommage des os : ARM_L,
// FORE_L, HAND_L sont du côté x < 0, ARM_R… du côté x > 0. Une inclinaison positive (virage
// à gauche, même signe que omega) penche le corps vers +x : la main intérieure est HAND_R.
import * as THREE from 'three';
import { B, PARENT, REST, GABARIT } from '../../models/personnage/commun.js';
import { BODY_Y_K } from '../../models/personnage/gabarit.js';

export { BODY_Y_K };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

// rayon de la main (sphère étirée de 5 % en hauteur, centrée sur l'os de la main ; gabarit)
export const HAND_RADIUS = GABARIT.main;
// la main effleure le sol sans s'y poser : 1,2 cm de jour sous la paume visé
export const HAND_BRUSH_GAP = 0.012;
// demi-écart des pieds : pivot de l'inclinaison sous le pied intérieur
export const FOOT_HALF_GAP = Math.abs(REST[B.FOOT_R][0]);

const ARM = {
  [1]: { arm: B.ARM_R, fore: B.FORE_R, hand: B.HAND_R, kx: 'armRX', kz: 'armRZ', kf: 'foreR', kwx: 'wristRX', kwz: 'wristRZ' },
  [-1]: { arm: B.ARM_L, fore: B.FORE_L, hand: B.HAND_L, kx: 'armLX', kz: 'armLZ', kf: 'foreL', kwx: 'wristLX', kwz: 'wristLZ' },
};
// longueurs : épaule → coude, coude → centre de la main
const UPPER = REST[B.ARM_R][1] - REST[B.FORE_R][1];
const LOWER = REST[B.FORE_R][1] - REST[B.HAND_R][1];

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();

// Pose les articulations j sur le corps et les os. À pied (footPivot), le corps pivote sous le
// pied intérieur (côté où il penche) au lieu du centre des pieds : ce pied ne s'enfonce pas.
export function applyJoints(body, bones, j, liftCur = 0, footPivot = false) {
  _e.set(j.lean, 0, j.bodyRoll);
  _q.setFromEuler(_e);
  // pivot P = (px, 0, 0) ; position = P − R·P, plus le rebond vertical
  const px = !footPivot ? 0 : j.bodyRoll < 0 ? FOOT_HALF_GAP : j.bodyRoll > 0 ? -FOOT_HALF_GAP : 0;
  const share = clamp(Math.abs(j.bodyRoll) / 0.12, 0, 1); // transition douce autour de zéro
  _p.set(px * share, 0, 0).applyQuaternion(_q);
  body.position.set(px * share - _p.x, j.bodyY * BODY_Y_K - liftCur - _p.y, -_p.z);
  body.rotation.copy(_e);
  body.scale.set(j.sx, j.sy, j.sx);
  bones[B.HIPS].rotation.set(0, (j.hipsY || 0) - j.torsoY * 0.4, j.hipsZ);
  bones[B.TORSO].rotation.set(j.torsoX, j.torsoY, j.torsoZ - j.hipsZ * 0.7);
  bones[B.NECK].rotation.set(j.neckX, j.neckY, j.neckZ);
  bones[B.HEAD].rotation.set(j.headX, j.headY, j.headZ);
  bones[B.ARM_L].rotation.set(j.armLX, 0, j.armLZ);
  bones[B.FORE_L].rotation.set(j.foreL, 0, 0);
  bones[B.HAND_L].rotation.set(j.wristLX, 0, j.wristLZ);
  bones[B.ARM_R].rotation.set(j.armRX, 0, j.armRZ);
  bones[B.FORE_R].rotation.set(j.foreR, 0, 0);
  bones[B.HAND_R].rotation.set(j.wristRX, 0, j.wristRZ);
  bones[B.THIGH_L].rotation.set(j.thighL, 0, -j.hipsZ);
  bones[B.SHIN_L].rotation.set(j.shinL, 0, 0);
  bones[B.FOOT_L].rotation.set(j.footL, 0, 0);
  bones[B.THIGH_R].rotation.set(j.thighR, 0, -j.hipsZ);
  bones[B.SHIN_R].rotation.set(j.shinR, 0, 0);
  bones[B.FOOT_R].rotation.set(j.footR, 0, 0);
}

// Matrice os → racine du personnage (spin · corps · maillage · chaîne d'os), sans passer par
// la scène : la racine est aux pieds, orientée selon le cap.
const _chain = [];
export function boneToRoot(rig, bone, out) {
  _chain.length = 0;
  for (let i = bone; i >= 0; i = PARENT[i]) _chain.push(i);
  rig.spin.updateMatrix();
  rig.body.updateMatrix();
  out.multiplyMatrices(rig.spin.matrix, rig.body.matrix);
  if (rig.mesh) {
    rig.mesh.updateMatrix();
    out.multiply(rig.mesh.matrix);
  }
  for (let k = _chain.length - 1; k >= 0; k--) {
    const b = rig.bones[_chain[k]];
    b.updateMatrix();
    out.multiply(b.matrix);
  }
  return out;
}

const _mParent = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _mA = new THREE.Matrix4();
const _mB = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _d = new THREE.Vector3();
const _h = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _c = new THREE.Vector3();
const _u = new THREE.Vector3();
const _x2 = new THREE.Vector3();
const _qIk = new THREE.Quaternion();
const _qAnim = new THREE.Quaternion();
const FORWARD = new THREE.Vector3(0, 0, 1);

// Position (repère racine) de l'épaule du côté demandé.
export function shoulderInRoot(rig, side, out) {
  boneToRoot(rig, ARM[side].arm, _mParent);
  return out.setFromMatrixPosition(_mParent);
}

// Cinématique inverse à deux segments : amène le centre de la main du côté `side` (+1 : os R,
// x > 0 ; −1 : os L) vers `target` (repère racine), mélangée à la pose animée par `w` (0 à 1).
// Le coude plie vers l'avant (charnière en x, comme l'animation). Rend la distance restante
// entre la main et la cible (0 si atteinte, quelques millimètres bras presque tendu).
// hinge : 'avant' (défaut, main vers le sol) prend pour charnière avant × direction de la cible ;
// 'cote' (bras levés : grimpe, poirier) prend l'axe x du buste projeté perpendiculairement à la
// direction, qui ne se retourne pas quand la cible passe au-dessus de l'épaule. memo (vecteur gardé
// par le personnage, nul au départ) : la charnière précédente, tirée à chaque appel vers la préférée
// en proportion de la netteté de celle-ci ; quand la cible passe à côté de l'épaule (direction ≈ x,
// préférée dégénérée), la charnière ne bascule pas d'un coup.
const HINGE_PULL = 0.25;
const _pm = new THREE.Vector3();
export function reachHand(rig, j, side, target, w, hinge = 'avant', memo = null) {
  const S = ARM[side];
  if (w <= 1e-4) return 0;
  const bones = rig.bones;
  // repère du parent du bras (torse) → racine
  boneToRoot(rig, PARENT[S.arm], _mParent);
  _inv.copy(_mParent).invert();
  _d.copy(target).applyMatrix4(_inv);
  _s.copy(bones[S.arm].position);
  _d.sub(_s); // épaule → cible, dans le repère du torse (échelle du corps comprise)
  const D = _d.length();
  const a = UPPER;
  const b = LOWER;
  // extension adoucie près du bras tendu (sinon le coude claque) : au-delà de 94 % de la
  // longueur, la distance atteinte tend vers la longueur sans l'atteindre
  const L = a + b;
  const d0 = L * 0.94;
  const Ds = D <= d0 ? D : d0 + (L - d0) * (1 - Math.exp(-(D - d0) / (L - d0)));
  const Dc = clamp(Ds, Math.abs(a - b) + 1e-4, L - 1e-4);
  // pli du coude (0 : bras tendu)
  const cosIn = clamp((a * a + b * b - Dc * Dc) / (2 * a * b), -1, 1);
  const phi = Math.PI - Math.acos(cosIn);
  // main dans le repère du bras (coude plié vers l'avant autour de x) : (0, hy, hz)
  const hy = -a - b * Math.cos(phi);
  const hz = b * Math.sin(phi);
  // Rotation de l'épaule qui envoie cette main sur la cible, la charnière du coude restant
  // perpendiculaire à l'avant du torse (le coude pointe vers l'arrière) :
  // repère local [x, ĥ, x × ĥ] → repère visé [x', û, x' × û], avec x' = avant × û.
  _h.set(0, hy, hz).normalize();
  _ax.set(1, 0, 0);
  _c.crossVectors(_ax, _h);
  _mA.makeBasis(_ax, _h, _c);
  _u.copy(_d).normalize();
  if (hinge === 'cote') {
    _x2.set(1, 0, 0).addScaledVector(_u, -_u.x);
    if (memo && memo.lengthSq() > 0.25) {
      _pm.copy(memo).addScaledVector(_u, -memo.dot(_u));
      _x2.multiplyScalar(HINGE_PULL).addScaledVector(_pm, 1 - HINGE_PULL);
    }
  } else _x2.crossVectors(FORWARD, _u);
  if (_x2.lengthSq() < 1e-8) _x2.set(1, 0, 0);
  _x2.normalize();
  if (memo) memo.copy(_x2);
  _c.crossVectors(_x2, _u);
  _mB.makeBasis(_x2, _u, _c);
  _mA.transpose();
  _mB.multiply(_mA);
  _qIk.setFromRotationMatrix(_mB);
  _qAnim.setFromEuler(_e.set(j[S.kx], 0, j[S.kz]));
  bones[S.arm].quaternion.copy(_qAnim).slerp(_qIk, w);
  const lerpA = (from, to) => from + wrap(to - from) * w;
  bones[S.fore].rotation.set(lerpA(j[S.kf], -phi), 0, 0);
  // poignet presque droit : la paume regarde le sol
  bones[S.hand].rotation.set(lerpA(j[S.kwx], 0), 0, lerpA(j[S.kwz], 0));
  return Math.max(0, D - Dc) * w;
}

// Centre de la main (repère racine) du côté demandé, après pose et cinématique inverse.
export function handInRoot(rig, side, out) {
  boneToRoot(rig, ARM[side].hand, _mParent);
  return out.setFromMatrixPosition(_mParent);
}

// Squelette minimal pour les tests (même hiérarchie et mêmes positions que Character.js).
export function buildRig() {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  const body = new THREE.Group();
  const mesh = new THREE.Object3D();
  root.add(spin);
  spin.add(body);
  body.add(mesh);
  const bones = REST.map(() => new THREE.Bone());
  bones.forEach((bone, i) => {
    const parent = PARENT[i] < 0 ? [0, 0, 0] : REST[PARENT[i]];
    bone.position.set(REST[i][0] - parent[0], REST[i][1] - parent[1], REST[i][2] - parent[2]);
    (PARENT[i] < 0 ? mesh : bones[PARENT[i]]).add(bone);
  });
  return { root, spin, body, mesh, bones };
}
