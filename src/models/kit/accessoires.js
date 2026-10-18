// Accessoires des créatures : yeux brillants, collier et cloche, pattes à sabots.
import * as THREE from 'three';
import { G } from '../../render/builder.js';
import { bone, limb } from './formes.js';
import { part } from './pieces.js';

// couleur des yeux (jamais de noir pur)
export const EYE = '#3d3049';
// onglon arrondi (profil tourné, bord supérieur adouci), 5,5 cm de haut
export const HOOF = G.lathe([[0.001, 0], [0.042, 0], [0.04, 0.04], [0.001, 0.055]], 5);
// sabot lisse : bord arrondi, dessus bombé (vu de près)
export const HOOF_SMOOTH = G.lathe([[0.001, 0], [0.042, 0], [0.044, 0.016], [0.04, 0.036], [0.028, 0.05], [0.001, 0.055]], 8);

// œil rond et brillant, tourné vers l'avant et l'extérieur ; ring : liseré clair sur un visage sombre ;
// detail : pupille et reflet plus ronds, vus de près (true ou 1, puis 2 pour plus fin encore)
export function eye(b, x, y, z, r, ring = null, detail = 0) {
  const sx = Math.sign(x) || 1;
  const rot = [0, sx * 0.55, 0];
  const [pw, ph, hw, hh] = detail === 2 ? [10, 8, 6, 5] : detail ? [8, 6, 6, 4] : [6, 4, 5, 3];
  if (ring) b.add(G.sphere(r * 1.45, 7, 5), ring, { p: [x - sx * r * 0.15, y, z - r * 0.2], s: [1, 1.1, 0.55], r: rot, tint: 0 });
  b.add(G.sphere(r, pw, ph), EYE, { p: [x, y, z], s: [1, 1.15, 0.7], r: rot, tint: 0 });
  b.add(G.sphere(r * 0.34, hw, hh), '#ffffff', { p: [x + sx * r * 0.2, y + r * 0.42, z + r * 0.62], tint: 0 });
}

// Collier (tore autour d'un cou incliné de tilt vers l'avant, à la distance at de son pivot) et cloche
// tournée qui pend sous la gorge : épaule ronde, lèvre évasée, anneau, bouche sombre et battant ; k :
// taille de la cloche (1 : 9 cm de haut)
export const BELL = [[0.05, 0], [0.056, 0.006], [0.044, 0.03], [0.034, 0.06], [0.024, 0.082], [0.001, 0.09]];
export function collar(b, tilt, at, R, tube, k = 1) {
  const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const throat = new THREE.Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const ring = axis.multiplyScalar(at);
  b.add(G.torus(R, tube, 5, 16), '#6a8fd4', { p: ring.toArray(), r: [tilt - Math.PI / 2, 0, 0], tint: 0 });
  const top = ring.addScaledVector(throat, R + tube - 0.001);
  const y0 = top.y - 0.1 * k;
  const z0 = top.z + 0.012 * k;
  b.add(G.lathe(BELL.map(([x, y]) => [x * k, y * k]), 8), '#e2b23e', { p: [0, y0, z0], tint: 0 });
  b.add(G.cyl(0.046 * k, 0.046 * k, 0.002, 6), '#6b4f1c', { p: [0, y0 + 0.004 * k, z0], tint: 0 });
  b.add(G.torus(0.012 * k, 0.004 * k, 3, 6), '#c99a2e', { p: [0, top.y - 0.006 * k, z0], tint: 0 });
  b.add(G.sphere(0.016 * k, 5, 3), '#5a4318', { p: [0, y0 - 0.01 * k, z0], tint: 0 });
}

// quatre pattes (avant gauche, avant droite, arrière gauche, arrière droite, en diagonale) :
// pivot de hanche caché dans le corps, sabot posé au sol ; zf et zb sont les positions signées
// des pattes avant (z > 0) et arrière (z < 0) ; cloven : sabot fendu en deux onglons ; hoofRound :
// sabots arrondis (profil tourné) ; radii : un rayon par point, la patte est alors un tube lisse (limb)
export function legs(o) {
  const { x, zf, zb, hip, color, tint = 0, r0, r1, hoof, hoofH = 0.06, front = null, back = null, joint = null, cloven = false, hoofRound = false, radii = null, sides = 10, rings = 4, hoofGeo = HOOF } = o;
  const out = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    const pts = (sz > 0 ? front : back) || [[0, 0, 0], [0, -hip + hoofH, 0]];
    out.push(part((b) => {
      if (radii) limb(b, color, pts, radii, { sides, rings, tint });
      else for (let i = 0; i < pts.length - 1; i++) {
        const t0 = i / (pts.length - 1);
        const t1 = (i + 1) / (pts.length - 1);
        bone(b, color, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, 8, tint);
        if (joint === (sz > 0 ? 'front' : 'back') && i > 0) b.add(G.sphere(r0 + (r1 - r0) * t0, 5, 3), color, { p: pts[i], tint });
      }
      const f = pts[pts.length - 1];
      if (hoofRound && cloven) for (const s of [-1, 1]) b.add(HOOF, hoof, { p: [f[0] + s * 0.034, -hip, f[2]], s: [0.75, hoofH / 0.055, 1.15], tint: 0 });
      else if (hoofRound) {
        const k = ((radii ? radii[radii.length - 1] : r1) * 1.2) / 0.042;
        b.add(hoofGeo, hoof, { p: [f[0], -hip, f[2]], s: [k, hoofH / 0.055, k * 1.1], tint: 0 });
      }
      else if (cloven) for (const s of [-1, 1]) b.add(G.cyl(r1 * 0.62, r1 * 0.7, hoofH, 5), hoof, { p: [f[0] + s * r1 * 0.5, -hip + hoofH / 2, f[2] + r1 * 0.12], tint: 0 });
      else b.add(G.cyl(r1 * 1.12, r1 * 1.22, hoofH, 8), hoof, { p: [f[0], -hip + hoofH / 2, f[2]], tint: 0 });
    }, [sx * x, hip, sz > 0 ? zf : zb], 'leg', 1, ph));
  }
  return out;
}
