// Troncs de la végétation des îles : écorce, segment effilé entre deux points (cylindre orienté) et
// tronc légèrement courbe en quatre segments ; col : couleur Three d'un code hexadécimal.
import * as THREE from 'three';
import { G } from '../../render/builder.js';

const UP = new THREE.Vector3(0, 1, 0);
export function segment(b, color, a, c, r0, r1, sides = 10, opts = {}) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
  b.add(G.cyl(r1, r0, len, sides), color, { p: [mid.x, mid.y, mid.z], r: [e.x, e.y, e.z], ...opts });
}

export const BARK = '#b98a64';
export const col = (c) => new THREE.Color(c);

// ---------------------------------------------------------------------------
// Végétation : { solid, clumps, crowns } en coordonnées locales (pied à l'origine)
//   solid  : géométrie fusionnée (Builder) — tronc, fruits, rochers…
//   clumps : touffes de billboards (feuillages peints)
//   crowns : sphères d'ombre portée [x, y, z, r, aplatissement]
//   grass / flower : rendus spéciaux (herbe, fleurs teintées par instance)
// ---------------------------------------------------------------------------
export function treeTrunk(b, h, r0, r1, bend = 0.25) {
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    pts.push(new THREE.Vector3(Math.sin(t * 2.2) * bend, t * h, Math.sin(t * 1.7) * bend * 0.6));
  }
  for (let i = 0; i < 4; i++) segment(b, BARK, pts[i], pts[i + 1], THREE.MathUtils.lerp(r0, r1, i / 4), THREE.MathUtils.lerp(r0, r1, (i + 1) / 4), 10);
  return pts[4];
}
