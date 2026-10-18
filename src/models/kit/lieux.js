// Teintes et pièces simples des lieux des îles (maisons, moulins, ponts, épaves…) : bois, pierre, mousse,
// crème, corde et vitre ; boîte arrondie économe (bx), segment orienté entre deux points (seg) et lecture
// des données de physique d'un lieu (lire).
import * as THREE from 'three';
import { G } from '../../render/builder.js';

export const WOOD = '#c98f5f';
export const WOOD_L = '#e0b07e';
export const WOOD_D = '#9f6b48';
export const STONE = '#e6dccd';
export const STONE_D = '#cfc2b0';
export const MOSS = '#a9d4a0';
export const CREAM = '#fbf3e6';
export const ROPE = '#e9d8b4';
export const GLASS = '#ffe6a8';

const UP = new THREE.Vector3(0, 1, 0);
// boîte à arrondi simple : dix fois moins de sommets que la boîte « jouet » complète
export const bx = (w, h, d, r = 0.06) => G.box(w, h, d, r, 1);
export function seg(b, color, ax, ay, az, bx, by, bz, r0, r1 = r0, sides = 8, opts = {}) {
  const a = new THREE.Vector3(ax, ay, az);
  const c = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  if (len < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  b.add(G.cyl(r1, r0, len, sides), color, { p: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], r: [e.x, e.y, e.z], ...opts });
}

// données de physique d'un lieu (son physique.js) : valeur, ou fonction pure des paramètres p du lieu ;
// toujours une copie neuve (le jeu peut transformer ce qu'il reçoit)
export function lire(v, p) {
  const d = typeof v === 'function' ? v(p) : v;
  return d.map((o) => (Array.isArray(o) ? [...o] : { ...o }));
}
