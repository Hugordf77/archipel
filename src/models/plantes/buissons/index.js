// Buissons : arbuste (PLA-001), buisson à baies (PLA-002, récolte) et buisson fleuri (PLA-003).
// Refonte du 23/11/2026 : plus une ou deux boules posées au sol, mais un buisson composé (DA dans la FICHE) :
//   - 4 à 5 masses de feuillage de tailles inégales, décalées (silhouette asymétrique, une masse haute,
//     une basse en avant), en plusieurs verts dont une masse un peu roussie (automne) ;
//   - des tiges de bois qui sortent du sol et filent vers chaque masse (le buisson est planté, pas posé) ;
//   - baies en grappes de trois sur la surface éclairée, fleurs à cœur jaune posées sur le dessus.
// Le feuillage est dessiné en grappes de feuilles (grappesAtlas, IslandManager : matériau foliage).
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { col, segment } from '../../kit/vegetal.js';
import { fiche, kind } from '../../kit/fiches.js';

const BOIS = '#8f6a50';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// tiges : du pied (un peu écarté du centre) jusqu'au cœur de chaque masse, effilées
function tiges(b, masses) {
  masses.forEach((m, i) => {
    const a = i * 2.39;
    const pied = V(Math.cos(a) * 0.08, -0.04, Math.sin(a) * 0.08);
    const coude = V(m.x * 0.45 + Math.cos(a) * 0.05, m.y * 0.45, m.z * 0.45 + Math.sin(a) * 0.05);
    const bout = V(m.x * 0.7, m.y * 0.75, m.z * 0.7);
    segment(b, BOIS, pied, coude, 0.045, 0.032, 6);
    segment(b, BOIS, coude, bout, 0.032, 0.014, 6);
  });
}

// point de la surface d'une masse dans la direction (az, élévation), un peu enfoncé
function surface(m, az, el, enf = 0.9) {
  return [m.x + Math.cos(az) * Math.cos(el) * m.r * enf, m.y + Math.sin(el) * m.r * (m.squash ?? 0.8) * enf, m.z + Math.sin(az) * Math.cos(el) * m.r * enf];
}

// masses de l'arbuste
const MASSES_ARBUSTE = [
  { x: 0, y: 0.62, z: 0, r: 0.72, squash: 0.8, color: col('#86c985'), density: 1.2 },
  { x: 0.58, y: 0.46, z: 0.18, r: 0.52, squash: 0.8, color: col('#74b97f'), density: 1.2 },
  { x: -0.5, y: 0.44, z: -0.2, r: 0.5, squash: 0.8, color: col('#9bcf86'), density: 1.2 },
  { x: 0.12, y: 1.0, z: -0.12, r: 0.44, squash: 0.85, color: col('#a8c97a'), density: 1.2 },
  { x: 0.05, y: 0.34, z: 0.55, r: 0.38, squash: 0.8, color: col('#c7b56e'), density: 1.2 },
];

const ombres = (masses) => masses.slice(0, 3).map((m) => [m.x, m.y, m.z, m.r * 1.1, m.squash]);

export function arbuste() {
  const b = new Builder();
  tiges(b, MASSES_ARBUSTE);
  return { solid: b.build(), clumps: MASSES_ARBUSTE, crowns: ombres(MASSES_ARBUSTE) };
}

export function buissonBaies() {
  const masses = [
    { x: 0, y: 0.6, z: 0, r: 0.7, squash: 0.8, color: col('#78bf86'), density: 1.25 },
    { x: 0.5, y: 0.44, z: -0.25, r: 0.5, squash: 0.8, color: col('#6aae7c'), density: 1.25 },
    { x: -0.45, y: 0.46, z: 0.25, r: 0.5, squash: 0.8, color: col('#86c68a'), density: 1.25 },
    { x: -0.05, y: 0.98, z: 0.1, r: 0.42, squash: 0.85, color: col('#93c983'), density: 1.25 },
  ];
  const b = new Builder();
  tiges(b, masses);
  // cinq grappes de trois baies, du côté haut et vers l'extérieur ; rouges, une grappe bleue
  const grappes = [[0, 0.5, 0.5], [1, 2.1, 0.3], [2, 4.0, 0.4], [0, 3.3, 0.9], [3, 1.2, 0.6]];
  grappes.forEach(([mi, az, el], g) => {
    const [x, y, z] = surface(masses[mi], az, el, 0.96);
    const c = g === 2 ? '#8fa6e6' : '#e9786f';
    [[0, 0, 0], [0.07, -0.03, 0.03], [-0.04, -0.05, 0.06]].forEach(([dx, dy, dz]) => {
      b.add(G.sphere(0.06, 7, 4), c, { p: [x + dx, y + dy, z + dz], tint: 0 });
    });
  });
  return { solid: b.build(), clumps: masses, crowns: ombres(masses) };
}

export function buissonFleuri() {
  const masses = [
    { x: 0, y: 0.55, z: 0, r: 0.64, squash: 0.82, color: col('#8bcd88'), density: 1.25 },
    { x: 0.45, y: 0.4, z: 0.2, r: 0.44, squash: 0.8, color: col('#7cc285'), density: 1.25 },
    { x: -0.42, y: 0.42, z: -0.12, r: 0.44, squash: 0.8, color: col('#9ed28a'), density: 1.25 },
    { x: 0.05, y: 0.88, z: -0.1, r: 0.38, squash: 0.85, color: col('#8fca86'), density: 1.25 },
  ];
  const b = new Builder();
  tiges(b, masses);
  // fleurs ouvertes sur le dessus et les flancs hauts : corolle aplatie (rose ou crème), cœur jaune
  const fleurs = [[0, 0.3, 1.1], [0, 2.4, 0.8], [0, 4.4, 0.7], [1, 0.6, 0.7], [1, 5.6, 0.5], [2, 3.1, 0.7], [2, 2.0, 0.4], [3, 1.0, 1.0], [3, 4.0, 0.8]];
  fleurs.forEach(([mi, az, el], f) => {
    const [x, y, z] = surface(masses[mi], az, el, 1.0);
    b.add(G.sphere(0.085, 7, 4), f % 3 ? '#f4b4c6' : '#fff6ea', { p: [x, y, z], s: [1, 0.42, 1], tint: 0 });
    b.add(G.sphere(0.03, 5, 3), '#f6d266', { p: [x, y + 0.03, z], tint: 0 });
  });
  return { solid: b.build(), clumps: masses, crowns: ombres(masses) };
}

export default [
  fiche('PLA-001', 'arbuste', 'Arbuste', kind('arbuste')),
  fiche('PLA-002', 'buisson-baies', 'Buisson à baies', kind('buisson_baies'), { tags: ['récolte'] }),
  fiche('PLA-003', 'buisson-fleuri', 'Buisson fleuri', kind('buisson_fleuri')),
];
