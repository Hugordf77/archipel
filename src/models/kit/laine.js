// Laine en boucles (mouton) : dômes lisses posés à intervalle régulier sur un fond de laine.
import * as THREE from 'three';
import { scatter } from './formes.js';

const _up = new THREE.Vector3(0, 1, 0);

// Laine en boucles : dômes lisses posés sur un fond de laine (surface centrée à l'origine, placée en at
// et tournée de rot), aux places de scatter, de rayon spacing × 0,7 (± 15 %), enfoncés d'un tiers et
// tournés au hasard sur eux-mêmes ; teintés par la robe (sommets blancs, tint 1)
export const CURL = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.6);
export const CURL_S = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
// mêmes boucles vues de loin (version allégée d'un animal)
export const CURL_LITE = new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI * 0.6);
export const CURL_S_LITE = new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI * 0.6);
export function curls(b, surf, spacing, { at = [0, 0, 0], rot = [0, 0, 0], seed = 1, keep, geo = CURL } = {}) {
  const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  const A = new THREE.Vector3(...at);
  const q = new THREE.Quaternion();
  const tw = new THREE.Quaternion();
  const e = new THREE.Euler();
  scatter(surf, spacing, seed, keep).forEach(({ p, n }, i) => {
    const h = ((i * 2654435761 + seed * 40503) >>> 0) / 4294967296;
    const r = spacing * 0.7 * (0.85 + 0.3 * h);
    n.applyQuaternion(Q);
    p.applyQuaternion(Q).add(A).addScaledVector(n, -0.35 * r);
    e.setFromQuaternion(q.setFromUnitVectors(_up, n).multiply(tw.setFromAxisAngle(_up, h * 6.283)));
    b.add(geo, '#ffffff', { p: p.toArray(), s: r, r: [e.x, e.y, e.z], tint: 1 });
  });
}
