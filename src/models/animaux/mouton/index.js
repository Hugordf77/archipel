// Mouton (ANI-001) : espèce de la faune des îles, refaite d'après sa planche (reference.png).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { bone, surface, hull, skinMesh, leafGeo } from '../../kit/formes.js';
import { CURL, CURL_S, CURL_LITE, CURL_S_LITE, curls } from '../../kit/laine.js';
import { HOOF, HOOF_SMOOTH, eye, collar, legs } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

const _up = new THREE.Vector3(0, 1, 0);

// Mouton (d'après la planche de référence) : laine en boucles rondes (teintée par la robe), cou court
// laineux qui porte la tête au-dessus du dos et plie pour brouter, visage rose lisse d'un seul tenant
// (museau tiré du visage), nez rose en triangle et bouche en Y, yeux noirs brillants, frange de
// boucles sur le front, oreilles en feuille creusée à l'intérieur rose, collier bleu et cloche,
// pattes courtes roses à sabots arrondis, queue en touffe
const EAR = leafGeo(11, 6, 0.55);
const EAR_IN = leafGeo(9, 5, 0.3);
const EAR_LITE = leafGeo(7, 4, 0.55);
const EAR_IN_LITE = leafGeo(6, 3, 0.3);
// lite : version allégée pour les moutons lointains (mêmes pièces et mêmes boucles, moins de facettes,
// sans la bouche)
function mouton(lite = false) {
  const SKIN = '#f6d6c8';
  const NECK = 0.4; // inclinaison du cou vers l'avant (rad)
  // corps : fond de laine en tonneau couvert de boucles, sauf dessous (ventre à l'ombre)
  const BODY = [0, 0.44, -0.05];
  const core = surface([0, 0, 0], [0.2, 0.22, 0.36], 2.5);
  const body = part((b) => {
    hull(b, '#ffffff', core, lite ? 10 : 14, lite ? 8 : 10, { p: BODY, tint: 1 });
    curls(b, core, 0.13, { at: BODY, seed: 1, geo: lite ? CURL_LITE : CURL, keep: (q, n) => n.y > -0.8 });
  }, [0, 0, 0]);
  // cou : pivot dans le poitrail, il porte la tête (pièce suivante) ; collier et cloche sous la gorge
  const axis = new THREE.Vector3(0, Math.cos(NECK), Math.sin(NECK));
  const NAT = axis.clone().multiplyScalar(0.18).toArray();
  const neckCore = surface([0, 0, 0], [0.085, 0.16, 0.085]);
  const neck = part((b) => {
    hull(b, '#ffffff', neckCore, lite ? 7 : 10, lite ? 5 : 8, { p: NAT, r: [NECK, 0, 0], tint: 1 });
    curls(b, neckCore, 0.095, { at: NAT, rot: [NECK, 0, 0], seed: 2, geo: lite ? CURL_S_LITE : CURL_S });
    collar(b, NECK, 0.2, 0.123, 0.018, 0.68);
  }, [0, 0.38, 0.2], 'neck');
  // visage : ellipsoïde dont le bas de l'avant est tiré en museau (une seule surface, sans pli)
  const FC = [0, -0.01, 0.055];
  const FR = [0.1, 0.115, 0.112];
  // bosses douces : museau (devant, en bas), joues
  const BUMPS = [[[0, -0.5, 0.87], 0.032, 0.62], [[0.55, -0.4, 0.73], 0.012, 0.45], [[-0.55, -0.4, 0.73], 0.012, 0.45]].map(([d, a, w]) => [new THREE.Vector3(...d).normalize(), a, w]);
  const face = (u, out = new THREE.Vector3()) => {
    const k = u.clone().normalize();
    let bump = 0;
    for (const [d, a, w] of BUMPS) bump += a * Math.exp(-((Math.acos(Math.min(1, k.dot(d))) / w) ** 2));
    return out.set(FC[0] + k.x * (FR[0] + bump), FC[1] + k.y * (FR[1] + bump), FC[2] + k.z * (FR[2] + bump));
  };
  // point et normale du visage dans la direction d
  const onFace = (d) => {
    const u = new THREE.Vector3(...d).normalize();
    const t1 = new THREE.Vector3().crossVectors(u, Math.abs(u.y) < 0.9 ? _up : new THREE.Vector3(1, 0, 0)).normalize();
    const t2 = new THREE.Vector3().crossVectors(u, t1);
    const e = 0.01;
    const a = face(u.clone().addScaledVector(t1, e)).sub(face(u.clone().addScaledVector(t1, -e)));
    const c = face(u.clone().addScaledVector(t2, e)).sub(face(u.clone().addScaledVector(t2, -e)));
    const n = new THREE.Vector3().crossVectors(a, c).normalize();
    if (n.dot(u) < 0) n.negate();
    return { p: face(u), n };
  };
  // pose une pièce plate (épaisseur sur z) contre le visage, en d, enfoncée de inset, tournée de twist
  const onSkin = (geo, color, d, s, inset, twist = 0) => {
    const { p, n } = onFace(d);
    const q = new THREE.Quaternion().setFromAxisAngle(n, twist).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
    const e = new THREE.Euler().setFromQuaternion(q);
    b0.add(geo, color, { p: p.addScaledVector(n, -inset).toArray(), s, r: [e.x, e.y, e.z], tint: 0 });
    return { p, n };
  };
  let b0 = null;
  const capCore = surface([0, 0, 0], [0.125, 0.09, 0.125]);
  const CAP = [0, 0.055, -0.035];
  const head = part((b) => {
    b0 = b;
    skinMesh(b, SKIN, face, lite ? 12 : 20, lite ? 9 : 14, { tint: 0 });
    // nez : petit triangle rose arrondi, pointe en bas ; sillon et bouche en Y dessous
    const nose = lite ? new THREE.SphereGeometry(1, 6, 4) : new THREE.SphereGeometry(1, 10, 6);
    const np = nose.attributes.position;
    for (let i = 0; i < np.count; i++) np.setX(i, np.getX(i) * (0.6 + 0.4 * (np.getY(i) + 1) / 2));
    onSkin(nose, '#e39a98', [0, -0.36, 0.93], [0.025, 0.017, 0.01], 0.004);
    const m = onFace([0, -0.6, 0.8]);
    const top = onFace([0, -0.45, 0.89]).p;
    if (!lite) bone(b, '#c47c7b', top.toArray(), m.p.clone().addScaledVector(m.n, 0.0005).toArray(), 0.0024, 0.0024, 4, 0);
    const X = new THREE.Vector3(1, 0, 0);
    const Y = new THREE.Vector3().crossVectors(m.n, X);
    const frame = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, m.n));
    if (!lite) for (const sx of [-1, 1]) {
      const arc = 1.9;
      const q = frame.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2 - arc / 2));
      const e = new THREE.Euler().setFromQuaternion(q);
      const c = m.p.clone().addScaledVector(X, sx * 0.0105).addScaledVector(Y, 0.011).addScaledVector(m.n, 0.0008);
      b.add(G.torus(0.011, 0.0022, 3, 6, arc), '#c47c7b', { p: c.toArray(), r: [e.x, e.y, e.z], tint: 0 });
    }
    // yeux noirs brillants, bien écartés, à mi-hauteur du visage
    for (const sx of [-1, 1]) {
      const { p, n } = onFace([sx * 0.5, 0.25, 0.83]);
      p.addScaledVector(n, -0.006);
      eye(b, p.x, p.y, p.z, 0.019, null, lite ? 0 : 2);
      // oreille en feuille creusée, à l'horizontale sous la laine, intérieur rose
      const eo = new THREE.Euler(0.3, sx * 0.35, -sx * 0.3);
      const at = (o) => new THREE.Vector3(...o).applyEuler(eo).add(new THREE.Vector3(sx * 0.165, -0.005, -0.015)).toArray();
      const [E, EI] = lite ? [EAR_LITE, EAR_IN_LITE] : [EAR, EAR_IN];
      const ear = sx > 0 ? E : E.clone().scale(-1, 1, 1);
      const inner = sx > 0 ? EI : EI.clone().scale(-1, 1, 1);
      b.add(ear, SKIN, { p: at([0, 0, 0]), s: [0.068, 0.04, 0.03], r: [eo.x, eo.y, eo.z], tint: 0 });
      b.add(inner, '#eba3a0', { p: at([sx * 0.007, 0, 0.004]), s: [0.052, 0.028, 0.012], r: [eo.x, eo.y, eo.z], tint: 0 });
    }
    // calotte de laine : fond lisse et boucles sur le dessus, l'arrière et les côtés, frange sur le front
    hull(b, '#ffffff', capCore, lite ? 8 : 12, lite ? 6 : 9, { p: CAP, tint: 1 });
    curls(b, capCore, 0.058, { at: CAP, seed: 3, geo: lite ? CURL_S_LITE : CURL_S, keep: (q) => !(q.z + CAP[2] > 0.02 && q.y + CAP[1] < 0.075 && Math.abs(q.x) < 0.085) });
  }, axis.clone().multiplyScalar(0.36).toArray(), 'head');
  head.geo.scale(1.1, 1.1, 1.1); // tête un peu plus grosse, comme sur la planche
  head.parent = 1;
  // queue : touffe de boucles en haut de la croupe, pendante
  const tailCore = surface([0, 0, 0], [0.04, 0.065, 0.04]);
  const tail = part((b) => {
    hull(b, '#ffffff', tailCore, lite ? 6 : 8, lite ? 4 : 6, { p: [0, -0.09, -0.05], r: [-0.25, 0, 0], tint: 1 });
    curls(b, tailCore, 0.045, { at: [0, -0.09, -0.05], rot: [-0.25, 0, 0], seed: 4, geo: lite ? CURL_S_LITE : CURL_S });
  }, [0, 0.54, -0.44], 'tail');
  return [body, neck, head, ...legs({ x: 0.1, zf: 0.15, zb: -0.31, hip: 0.36, color: SKIN, hoof: '#c99d8c', hoofH: 0.045, hoofRound: true, hoofGeo: lite ? HOOF : HOOF_SMOOTH, radii: [0.056, 0.052, 0.047, 0.04], sides: lite ? 6 : 10, rings: lite ? 3 : 5,
    front: [[0, 0, 0], [0, -0.17, 0.006], [0, -0.28, 0], [0, -0.3375, 0]], back: [[0, 0, 0], [0, -0.15, -0.03], [0, -0.28, 0], [0, -0.3375, 0]] }), tail];
}

export const espece = {
  speed: 0.6, scale: 1, shadow: true, graze: 1.5, nod: -0.7, muzzle: [0, -0.11, 0.19], top: 0.92,
  coats: [['Crème', '#f4e9d0'], ['Blanc', '#fbf8f1'], ['Noir', '#5a5160']],
  parts: () => mouton(),
  // au-delà de 20 m du joueur, la version allégée (mêmes pièces)
  lod: () => mouton(true), lodDist: 20,
};

export default fiche('ANI-001', 'mouton', 'Mouton', species('mouton', espece), { budget: { triangles: 10000, lod: 3400 } });
