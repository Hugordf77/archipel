// Troncs de la végétation des îles : écorce, segment effilé entre deux points (cylindre orienté) et
// tronc légèrement courbe en quatre segments ; col : couleur Three d'un code hexadécimal.
import * as THREE from 'three';
import { G } from '../../render/builder.js';
import { limb } from './formes.js';

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

// petit tirage déterministe (0 à 1) pour la forme d'un arbre
function tirage(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Arbres en détail (21/11/2026) : tronc d'un seul tube lisse (limb), évasé au pied, avec des racines
// qui plongent dans le sol et des branches maîtresses qui montent jusqu'au cœur de chaque masse du
// feuillage ; rien ne dépasse du houppier.
//   h : hauteur de la fourche ; r0, r1 : rayons au pied et à la fourche ; bend : courbure (m) ;
//   racines : nombre (3 ou 4) ; masses : [{ x, y, z }] centres des masses du feuillage (les branches
//   s'arrêtent à 82 % du chemin, dans la masse, effilées en pointe : pas de bout coupé visible) ;
//   seed : tirage de la forme.
// Rend les points de fourche et de bout de branche. Environ 80 + 36 × racines + 30 × branches triangles.
export function troncRameux(b, { h, r0, r1, bend = 0.2, racines = 3, masses = [], seed = 1, color = BARK }) {
  const rnd = tirage(seed);
  const fx = Math.sin(2.2) * bend;
  const fz = Math.sin(1.7) * bend * 0.6;
  const spine = [];
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    spine.push([Math.sin(t * 2.2) * bend, -0.12 + t * (h + 0.12), Math.sin(t * 1.7) * bend * 0.6]);
  }
  // pied évasé (1,5 × r0 sous le sol), puis effilé jusqu'à la fourche
  limb(b, color, spine, [r0 * 1.5, r0 * 1.02, (r0 + r1) / 2, r1], { sides: 10, rings: 4, tint: 1 });
  // racines : départ dans le tronc à 0,3 m, arrivée sous le sol à 2 à 2,6 × r0, réparties autour
  const a0 = rnd() * Math.PI * 2;
  for (let k = 0; k < racines; k++) {
    const a = a0 + (k / racines) * Math.PI * 2 + (rnd() - 0.5) * 0.6;
    const L = r0 * (2.0 + rnd() * 0.6);
    const c = Math.cos(a);
    const s = Math.sin(a);
    // racine ronde (6 côtés), qui naît bas dans le pied évasé et s'effile en s'enfonçant (ni piquet
    // ni planche)
    limb(b, color, [[c * r0 * 0.3, 0.3, s * r0 * 0.3], [c * r0 * 1.15, 0.08, s * r0 * 1.15], [c * L, -0.14, s * L]], [r0 * 0.48, r0 * 0.38, r0 * 0.18], { sides: 6, rings: 3, tint: 1 });
  }
  // branches maîtresses : de la fourche (10 cm sous elle, dans le tronc) vers chaque masse
  const tips = [];
  for (const m of masses) {
    const tx = fx + (m.x - fx) * 0.82;
    const ty = h + (m.y - h) * 0.82;
    const tz = fz + (m.z - fz) * 0.82;
    const mx = fx + (tx - fx) * 0.45;
    const mz = fz + (tz - fz) * 0.45;
    limb(b, color, [[fx * 0.95, h - 0.1, fz * 0.95], [mx, h + (ty - h) * 0.35, mz], [tx, ty, tz]], [r1 * 0.95, r1 * 0.62, r1 * 0.15], { sides: 5, rings: 3, tint: 1 });
    tips.push({ x: tx, y: ty, z: tz });
  }
  return { fourche: { x: fx, y: h, z: fz }, tips };
}

// Couronne en masses lisibles : une touffe par masse, plus des touffes satellites sur son dessus puis
// son bord extérieur (silhouette bosselée) ; entre les masses, des trouées de ciel.
//   masses : [{ x, y, z, r, color, clair? }] ; clair : couleur des satellites du dessus (lumière)
//   satellites : 0 à 3 par masse ; seed : tirage
export function couronneMasses(masses, { satellites = 2, seed = 1 } = {}) {
  const rnd = tirage(seed + 17);
  const clumps = [];
  for (const m of masses) {
    clumps.push({ x: m.x, y: m.y, z: m.z, r: m.r, color: col(m.color), squash: 0.82 });
    // direction extérieure de la masse (depuis l'axe du tronc), et le haut
    const ol = Math.hypot(m.x, m.z) || 1;
    for (let k = 0; k < satellites; k++) {
      // le premier satellite coiffe la masse (côté lumière), le suivant bosselle son bord extérieur
      const haut = k % 2 === 0;
      const a = Math.atan2(m.z / ol, m.x / ol) + (rnd() - 0.5) * 1.4;
      const d = m.r * (haut ? 0.35 : 0.72);
      clumps.push({
        x: m.x + Math.cos(a) * d,
        y: m.y + m.r * (haut ? 0.62 : 0.05 + rnd() * 0.25),
        z: m.z + Math.sin(a) * d,
        r: m.r * (0.48 + rnd() * 0.12),
        color: col(haut && m.clair ? m.clair : m.color),
        squash: 0.85,
      });
    }
  }
  return clumps;
}
