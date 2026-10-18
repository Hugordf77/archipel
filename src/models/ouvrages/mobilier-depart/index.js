// Mobilier de l'île de départ : parasol et transats (STR-020), bureau d'étude (STR-021), pont de la
// rivière (STR-022), pupitre du hibou (STR-023), panneau de la place (STR-024), banc de bois (STR-025)
// et lanterne de jardin (STR-026). Chaque fonction ajoute ses pièces à un Builder à la position
// donnée : le jeu passe les coordonnées de l'île (world/home/props.js), le catalogue (0, 0, 0).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { PAL } from '../../kit/palette.js';
import { segment } from '../../kit/shapes.js';
import { fiche, ile } from '../../kit/fiches.js';

// Pupitre, perchoir et chariot de livres du hibou
export function pupitreHibou(p, o, oy) {
  p.add(G.cyl(0.12, 0.18, 1.0, 10), PAL.woodDark, { p: [o.x, oy + 0.5, o.z] });
  p.add(G.box(0.8, 0.1, 0.55, 0.04), PAL.wood, { p: [o.x, oy + 1.04, o.z], r: [0.25, 0, 0] });
  p.add(G.cyl(0.4, 0.45, 0.12, 14), PAL.woodDark, { p: [o.x, oy + 0.06, o.z] });
  // perchoir
  p.add(G.cyl(0.05, 0.05, 1.3, 8), PAL.woodDark, { p: [o.x + 1.0, oy + 0.65, o.z - 0.1] });
  p.add(G.cyl(0.05, 0.05, 0.8, 8), PAL.woodDark, { p: [o.x + 1.0, oy + 1.3, o.z - 0.1], r: [0, 0, Math.PI / 2] });
  // chariot de livres
  const cx = o.x - 1.7;
  const cz = o.z - 0.5;
  p.add(G.box(1.1, 0.7, 0.55, 0.06), PAL.wood, { p: [cx, oy + 0.6, cz] });
  for (const wx of [-0.4, 0.4]) p.add(G.cyl(0.14, 0.14, 0.08, 12), PAL.woodDark, { p: [cx + wx, oy + 0.15, cz + 0.3], r: [Math.PI / 2, 0, 0] });
  const books = [PAL.coral, PAL.sky, PAL.butter, PAL.mint, PAL.lilac, PAL.roof];
  for (let i = 0; i < 6; i++) {
    p.add(G.box(0.13, 0.36 + (i % 3) * 0.05, 0.4, 0.03), books[i], { p: [cx - 0.38 + i * 0.15, oy + 1.12, cz], r: [0, 0, (i === 5 ? 0.25 : 0)] });
  }
}

// Bureau d'étude : tapis, plateau, livres, lampe, tabouret
export function bureauEtude(b, glass, x, y, z) {
  // tapis rond
  b.add(G.cyl(1.7, 1.7, 0.04, 30), '#f3c9a8', { p: [x, y + 0.02, z - 0.4], s: [1.2, 1, 0.9] });
  b.add(G.torus(1.5, 0.05, 6, 30), '#e9a98b', { p: [x, y + 0.05, z - 0.4], r: [Math.PI / 2, 0, 0], s: [1.2, 0.9, 1] });
  // plateau + pieds
  b.add(G.box(1.9, 0.12, 0.95, 0.05), PAL.woodLight, { p: [x, y + 0.8, z] });
  for (const [lx, lz] of [[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]]) {
    b.add(G.cyl(0.06, 0.05, 0.78, 8), PAL.wood, { p: [x + lx, y + 0.4, z + lz] });
  }
  b.add(G.box(0.62, 0.24, 0.85, 0.05), PAL.wood, { p: [x + 0.55, y + 0.62, z] });
  b.add(G.sphere(0.05, 6, 6), PAL.butter, { p: [x + 0.55, y + 0.62, z + 0.44] });
  // livres empilés
  const bc = [PAL.coral, PAL.sky, PAL.mint];
  for (let i = 0; i < 3; i++) {
    b.add(G.box(0.5, 0.11, 0.36, 0.03), bc[i], { p: [x - 0.62, y + 0.92 + i * 0.115, z + 0.05], r: [0, i * 0.2 - 0.1, 0] });
  }
  // cahier ouvert
  b.add(G.box(0.34, 0.03, 0.46, 0.01), PAL.white, { p: [x - 0.08, y + 0.885, z + 0.08], r: [0, 0, 0.06] });
  b.add(G.box(0.34, 0.03, 0.46, 0.01), PAL.white, { p: [x + 0.26, y + 0.885, z + 0.08], r: [0, 0, -0.06] });
  // pot à crayons
  b.add(G.cyl(0.08, 0.07, 0.18, 10), PAL.lilac, { p: [x + 0.72, y + 0.95, z - 0.25] });
  for (const [px, c] of [[-0.03, PAL.butter], [0.03, PAL.coral], [0.0, PAL.sky]]) {
    b.add(G.cyl(0.015, 0.015, 0.22, 5), c, { p: [x + 0.72 + px, y + 1.07, z - 0.25 + px], r: [px * 4, 0, px * 3] });
  }
  // lampe de bureau
  b.add(G.cyl(0.13, 0.15, 0.05, 12), PAL.mint, { p: [x + 0.62, y + 0.89, z + 0.25] });
  segment(b, PAL.mint, new THREE.Vector3(x + 0.62, y + 0.9, z + 0.25), new THREE.Vector3(x + 0.55, y + 1.32, z + 0.18), 0.025, 0.025, 6);
  segment(b, PAL.mint, new THREE.Vector3(x + 0.55, y + 1.32, z + 0.18), new THREE.Vector3(x + 0.3, y + 1.38, z + 0.15), 0.025, 0.025, 6);
  b.add(G.cone(0.17, 0.2, 14), PAL.mint, { p: [x + 0.28, y + 1.32, z + 0.15], r: [0, 0, 0.3] });
  glass.add(G.sphere(0.07, 8, 6), PAL.glass, { p: [x + 0.28, y + 1.24, z + 0.15] });
  // tabouret (derrière le bureau, côté arbre)
  const sz = z - 0.85;
  b.add(G.cyl(0.3, 0.26, 0.42, 16), PAL.wood, { p: [x, y + 0.21, sz] });
  b.add(G.sphere(0.34, 14, 10), PAL.coral, { p: [x, y + 0.45, sz], s: [1, 0.32, 1] });
}

// Petit pont en arc avec garde-corps
export function pontRiviere(b, x0, x1, z, base) {
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = THREE.MathUtils.lerp(x0, x1, t);
    const y = base + Math.sin(t * Math.PI) * 0.38;
    const slope = Math.cos(t * Math.PI) * 0.38 * Math.PI / (x1 - x0);
    b.add(G.box(0.3, 0.09, 1.5, 0.03), i % 2 ? PAL.woodLight : PAL.wood, { p: [x, y, z], r: [0, 0, Math.atan(slope)] });
    if (i % 2 === 0) {
      for (const sz of [-0.72, 0.72]) b.add(G.cyl(0.05, 0.05, 0.55, 6), PAL.woodDark, { p: [x, y + 0.27, z + sz] });
    }
  }
  for (const sz of [-0.72, 0.72]) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const a = new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t0), base + Math.sin(t0 * Math.PI) * 0.38 + 0.52, z + sz);
      const c = new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t1), base + Math.sin(t1 * Math.PI) * 0.38 + 0.52, z + sz);
      segment(b, PAL.wood, a, c, 0.04, 0.04, 6);
    }
  }
}

// Panneau indicateur à trois flèches
export function panneauPlace(b, x, y, z) {
  b.add(G.cyl(0.08, 0.09, 1.7, 8), PAL.woodDark, { p: [x, y + 0.85, z] });
  b.add(G.box(0.9, 0.24, 0.07, 0.04), PAL.woodLight, { p: [x + 0.35, y + 1.5, z], r: [0, 0.3, 0] });
  b.add(G.box(0.9, 0.24, 0.07, 0.04), PAL.wood, { p: [x - 0.35, y + 1.2, z], r: [0, -0.5, 0] });
  b.add(G.box(0.8, 0.22, 0.07, 0.04), PAL.woodLight, { p: [x, y + 0.92, z + 0.2], r: [0, 1.4, 0] });
}

// Banc de bois (orienté de 0,5 rad)
export function bancBois(b, x, y, z) {
  b.add(G.box(1.4, 0.1, 0.45, 0.04), PAL.woodLight, { p: [x, y + 0.45, z], r: [0, 0.5, 0] });
  b.add(G.box(1.4, 0.32, 0.08, 0.04), PAL.wood, { p: [x - Math.sin(0.5) * 0.22, y + 0.72, z - Math.cos(0.5) * 0.22], r: [0, 0.5, 0] });
  for (const s of [-0.55, 0.55]) b.add(G.box(0.08, 0.45, 0.4, 0.03), PAL.woodDark, { p: [x + Math.cos(0.5) * s, y + 0.22, z - Math.sin(0.5) * s], r: [0, 0.5, 0] });
}

// Lanterne de jardin sur poteau (vitre lumineuse la nuit)
export function lanterneJardin(b, glass, x, y, z) {
  b.add(G.cyl(0.07, 0.09, 1.55, 8), PAL.woodDark, { p: [x, y + 0.77, z] });
  b.add(G.cyl(0.18, 0.2, 0.08, 10), PAL.woodDark, { p: [x, y + 0.04, z] });
  b.add(G.cone(0.28, 0.2, 10), PAL.roofTeal, { p: [x, y + 1.95, z] });
  b.add(G.sphere(0.05, 6, 6), PAL.butter, { p: [x, y + 2.08, z] });
  b.add(G.cyl(0.13, 0.13, 0.05, 10), PAL.woodDark, { p: [x, y + 1.55, z] });
  glass.add(G.box(0.24, 0.3, 0.24, 0.07), PAL.glass, { p: [x, y + 1.72, z] });
}

// Parasol de plage rayé (corail et blanc)
export function parasolPlage(b, x, y, z) {
  b.add(G.cyl(0.035, 0.04, 2.1, 6), PAL.white, { p: [x, y + 1.05, z] });
  b.add(G.cone(1.15, 0.45, 16), PAL.white, {
    p: [x, y + 2.05, z],
    colorFn: (c, vx, vy, vz) => {
      const a = Math.atan2(vz - z, vx - x);
      if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2 === 0) c.set(PAL.coral);
    },
  });
  b.add(G.sphere(0.06, 6, 4), PAL.butter, { p: [x, y + 2.3, z] });
}

// Transat en bois, toile de couleur (dossier vers -z)
export function transat(b, x, y, z, toile = PAL.mint) {
  b.add(G.box(0.62, 0.06, 1.3, 0.03), toile, { p: [x, y + 0.32, z], r: [-0.12, 0, 0] });
  b.add(G.box(0.62, 0.06, 0.62, 0.03), toile, { p: [x, y + 0.55, z - 0.78], r: [0.9, 0, 0] });
  for (const sx of [-0.27, 0.27]) {
    b.add(G.cyl(0.025, 0.025, 0.4, 5), PAL.woodLight, { p: [x + sx, y + 0.17, z + 0.4] });
    b.add(G.cyl(0.025, 0.025, 0.55, 5), PAL.woodLight, { p: [x + sx, y + 0.25, z - 0.55] });
  }
}

export default [
  fiche('STR-020', 'parasol-transats', 'Parasol et transats', ile('parasol', (b) => {
    parasolPlage(b, 0, 0, 0);
    transat(b, -1.2, 0, 0.8, PAL.mint);
    transat(b, 1.2, 0, 0.6, PAL.sky);
  }), { tags: ['plage'] }),
  fiche('STR-021', 'bureau-etude', 'Bureau d\'étude', ile('bureauEtude', (b, glass) => bureauEtude(b, glass, 0, 0, 0)), { tags: ['étude', 'lumineux'] }),
  fiche('STR-022', 'pont-riviere', 'Pont de la rivière', ile('pontRiviere', (b) => pontRiviere(b, -2.4, 2.4, 0, 0)), { tags: ['chemins'] }),
  fiche('STR-023', 'pupitre-hibou', 'Pupitre et perchoir du hibou', ile('pupitreHibou', (b) => pupitreHibou(b, { x: 0, z: 0 }, 0)), { tags: ['hibou'] }),
  fiche('STR-024', 'panneau-place', 'Panneau de la place', ile('panneauPlace', (b) => panneauPlace(b, 0, 0, 0)), { tags: ['chemins'] }),
  fiche('STR-025', 'banc-bois', 'Banc de bois', ile('bancBois', (b) => bancBois(b, 0, 0, 0)), { tags: ['assise'] }),
  fiche('STR-026', 'lanterne-jardin', 'Lanterne de jardin', ile('lanterneJardin', (b, glass) => lanterneJardin(b, glass, 0, 0, 0)), { tags: ['lumineux'] }),
];
