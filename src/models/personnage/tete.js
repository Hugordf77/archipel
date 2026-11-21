// Forme de la tête du gabarit (GABARIT.FACE.forme) : un visage ovale de manga plutôt qu'une boule. Le
// crâne et la calotte peinte du visage (entities/character/face.js) passent par la même déformation, pour
// que les traits restent collés à la peau. Sans `forme` (chibi), rien ne change.
//
// Repère de la tête : centre du crâne en 0, avant = +z. Au-dessus de la ligne des yeux, la sphère reste
// ronde (le crâne et les cheveux s'y posent) ; en dessous, la mâchoire s'affine vers un menton doux qui
// descend, et la nuque rentre vers le cou.
import * as THREE from 'three';
import { GABARIT } from './gabarit.js';

const F = GABARIT.FACE;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// déforme une géométrie centrée sur la tête (positions en mètres) et refait ses normales
export function deformeTete(g) {
  const f = F.forme;
  if (!f) return g;
  const H = F.R * F.SY; // demi-hauteur du crâne
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    // d : 0 à la ligne des yeux, 1 au bas du crâne
    const d = clamp01((f.yeux - y / H) / (1 + f.yeux));
    if (d > 0) {
      // joues pleines juste sous les yeux, puis mâchoire qui s'affine vers le menton
      x *= (1 + f.joues * Math.sin(Math.PI * d)) * (1 - f.machoire * d ** 1.6);
      // menton : descend (ovale) ; le devant s'aplatit un peu, la nuque rentre vers le cou
      y -= f.menton * F.R * d * d;
      z *= z > 0 ? 1 - f.aplat * d : 1 - f.nuque * smooth(d);
    }
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  redresse(g);
  return g;
}

// Normales du visage tournées vers l'avant et un peu vers le haut : le toon pose ses paliers sur la forme
// de la tête, pas une bande d'ombre en travers des joues (le bas d'une sphère regarde le sol). Le dessus,
// les côtés et l'arrière gardent leurs normales.
const _n = new THREE.Vector3();
const AVANT = new THREE.Vector3(0, 0.3, 1).normalize();
function redresse(g) {
  const k = F.forme.lumiere;
  const nor = g.attributes.normal;
  for (let i = 0; i < nor.count; i++) {
    _n.fromBufferAttribute(nor, i);
    // poids : visage (normale vers l'avant), qui s'éteint doucement vers les côtés et le dessus
    const w = smooth(clamp01((_n.z + 0.5) / 1.1)) * (1 - smooth(clamp01(_n.y / 0.8)));
    if (w <= 0) continue;
    _n.lerp(AVANT, Math.min(1, k * w)).normalize();
    nor.setXYZ(i, _n.x, _n.y, _n.z);
  }
}

// crâne : sphère aplatie du gabarit, déformée ; centré en 0 (à poser en [0, HC, 0]). Mêmes triangles
// que la sphère d'origine (22 × 14), mais les anneaux sont resserrés vers le bas (le contour de la
// mâchoire) et espacés sur le dessus, caché par les cheveux.
export function craneGeometry(w = 22, h = 14) {
  const g = new THREE.SphereGeometry(F.R, w, h);
  if (F.forme) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const t = Math.acos(Math.max(-1, Math.min(1, y / F.R))) / Math.PI; // 0 en haut, 1 en bas
      const a = Math.PI * (1 - (1 - t) ** 1.4);
      const k = r > 1e-6 ? (F.R * Math.sin(a)) / r : 0;
      pos.setXYZ(i, x * k, F.R * Math.cos(a), z * k);
    }
  }
  g.scale(F.SX, F.SY, 1);
  return deformeTete(g);
}

// distance du centre du crâne au bas du menton : le cou et le col s'y raccordent
export const MENTON = F.R * (F.SY + (F.forme ? F.forme.menton : 0));

// Oreilles du gabarit (forme.oreille) : grandes et rondes, à hauteur des yeux, décollées vers l'avant
// comme sur les planches (identifiant à part : le trait les détache du crâne). b : Builder de l'os HEAD.
// Sans `forme` : null (le corps garde ses oreilles d'origine).
export function oreilles(b, color, hc) {
  const o = F.forme?.oreille;
  if (!o) return null;
  for (const sx of [-1, 1]) {
    b.add(new THREE.SphereGeometry(o.r, 10, 6), color, {
      p: [sx * F.R * F.SX * o.x, hc + o.y, o.z],
      r: [0, sx * o.ouvre, 0],
      s: [0.48, 1, 0.78],
    });
  }
  return b;
}
