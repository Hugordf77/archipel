// Raretés fleuries de l'île de départ, débloquées par le temps d'étude : lavande géante (PLA-018, 10 h)
// et arche de glycine (PLA-019, 25 h). Posées par world/home/flowers.js.
import { G } from '../../../render/builder.js';
import { rng } from '../../kit/shapes.js';
import { fiche, ile } from '../../kit/fiches.js';

// Touffe de lavandes géantes (rareté, 10 h d'étude) ; r : suite aléatoire partagée
export function lavandeGeante(b, cx, y, cz, r = rng(31)) {
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.55;
    const h = 0.75 + r() * 0.45;
    const x = cx + Math.cos(a) * d;
    const z = cz + Math.sin(a) * d;
    b.add(G.cyl(0.012, 0.016, h, 4), '#8fb88c', { p: [x, y + h / 2, z], r: [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4], tint: 0 });
    for (let j = 0; j < 7; j++) b.add(G.sphere(0.035 - j * 0.002, 6, 4), j % 2 ? '#b49be8' : '#a58ae0', { p: [x, y + h * (0.62 + j * 0.06), z], tint: 0 });
  }
  b.add(G.sphere(0.6, 10, 7), '#94bf93', { p: [cx, y + 0.12, cz], s: [1.1, 0.35, 1.1], tint: 0 });
}

// Arche de glycine (rareté, 25 h d'étude), piliers à z ± 1,25
export function archeGlycine(b, ax, y0, az, r = rng(31)) {
  for (const dz of [-1.25, 1.25]) {
    b.add(G.cyl(0.08, 0.1, 2.2, 8), '#c98f5f', { p: [ax, y0 + 1.1, az + dz], tint: 0 });
  }
  b.add(G.torus(1.25, 0.08, 8, 24, Math.PI), '#c98f5f', { p: [ax, y0 + 2.2, az], r: [0, Math.PI / 2, 0], tint: 0 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 25) * Math.PI;
    const px = ax + (r() - 0.5) * 0.4;
    const py = y0 + 2.2 + Math.sin(a) * 1.25;
    const pz = az + Math.cos(a) * 1.25;
    b.add(G.sphere(0.16, 8, 6), i % 3 ? '#9fd08a' : '#86c48a', { p: [px, py + 0.05, pz], tint: 0 });
    if (i % 2 === 0) {
      const len = 0.45 + r() * 0.35;
      b.add(G.cone(0.1, len, 7), i % 4 ? '#c3a6ee' : '#ae92e6', { p: [px, py - len / 2 - 0.05, pz], r: [Math.PI, 0, 0], tint: 0 });
    }
  }
}

export default [
  fiche('PLA-018', 'lavande-geante', 'Lavande géante (rareté)', ile('lavandeGeante', (b) => lavandeGeante(b, 0, 0, 0), 'lavender'), { tags: ['rareté', '10 h d\'étude'] }),
  fiche('PLA-019', 'arche-glycine', 'Arche de glycine (rareté)', ile('archeGlycine', (b) => archeGlycine(b, 0, 0, 0), 'wisteria'), { tags: ['rareté', '25 h d\'étude'] }),
];
