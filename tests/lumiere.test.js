// Lot « lumière » : l'étalonnage par heure ne mène jamais au noir, les ombres restent froides
// (violet / bleu) et la lumière rebondie a une couleur pour chaque biome.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GRADE_KEYS } from '../src/world/env/daycycle.js';
import { BIOMES, couleurRebond } from '../src/world/islands/biomes.js';

// comme en jeu (src/app/setup.js) : les couleurs hexadécimales sont prises telles quelles
THREE.ColorManagement.enabled = false;

const lum = (c) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
const rgb = (hex) => new THREE.Color(hex).toArray();

// réplique de hourGrade (src/render/shaders/post.js, COMPOSITE_FRAG) : à tenir alignée
function hourGrade(col, k) {
  const low = rgb(k.gradeLow);
  const high = rgb(k.gradeHigh);
  const lift = rgb(k.gradeLift);
  const l = Math.max(lum(col), 1e-4);
  let lc = Math.min(Math.max(0.55 + (l - 0.55) * k.contrast, 0), 1.2);
  lc = Math.max(lc, l * 0.72);
  if (lc > 0.86) lc = 0.86 + 0.14 * (1 - Math.exp(-(lc - 0.86) / 0.14));
  const t = Math.min(Math.max((lc - 0.12) / 0.68, 0), 1);
  const s = t * t * (3 - 2 * t);
  let c = col.map((v, i) => v * (lc / l) * (low[i] + (high[i] - low[i]) * s));
  const l2 = lum(c);
  c = c.map((v) => Math.min(Math.max(l2 + (v - l2) * k.sat, 0), 1));
  return c.map((v, i) => lift[i] + v * (1 - lift[i]));
}

const CLES = GRADE_KEYS.filter((k) => k.ref === undefined);

describe('étalonnage par heure (daycycle.js)', () => {
  it('chaque palette porte un étalonnage complet et borné', () => {
    expect(CLES.length).toBeGreaterThanOrEqual(9);
    for (const k of CLES) {
      expect(k.contrast, k.name).toBeGreaterThanOrEqual(1);
      expect(k.contrast, k.name).toBeLessThanOrEqual(1.4);
      expect(k.sat, k.name).toBeGreaterThanOrEqual(0.9);
      expect(k.sat, k.name).toBeLessThanOrEqual(1.2);
    }
  });

  it('plancher teinté : ni noir ni gris, bleu-violet', () => {
    for (const k of CLES) {
      const f = rgb(k.gradeLift);
      expect(lum(f), k.name).toBeGreaterThan(0.01);
      expect(lum(f), k.name).toBeLessThan(0.09);
      expect(f[2], k.name).toBeGreaterThan(f[0]);
      expect(f[2], k.name).toBeGreaterThan(f[1]);
    }
  });

  it('les ombres partent vers le froid (bleu au moins égal au rouge et au vert)', () => {
    for (const k of CLES) {
      const lo = rgb(k.gradeLow);
      expect(lo[2], k.name).toBeGreaterThanOrEqual(lo[0]);
      expect(lo[2], k.name).toBeGreaterThanOrEqual(lo[1]);
    }
  });

  it('jamais de noir : un sombre (cheveux, encre) reste au-dessus de 0,07', () => {
    const sombres = [[0, 0, 0], [0.1, 0.07, 0.05], [0.12, 0.1, 0.18], [0.08, 0.12, 0.08]];
    for (const k of CLES) {
      for (const c of sombres) {
        const out = hourGrade(c, k);
        const plancher = Math.max(lum(rgb(k.gradeLift)), lum(c) >= 0.08 ? 0.07 : 0);
        expect(lum(out), `${k.name} ${c}`).toBeGreaterThanOrEqual(plancher - 1e-6);
      }
    }
  });

  it('les tons moyens gagnent en contraste sans brûler les pastels', () => {
    for (const k of CLES) {
      const clair = hourGrade([0.85, 0.82, 0.74], k);
      const moyen = hourGrade([0.45, 0.5, 0.42], k);
      expect(lum(clair) - lum(moyen), k.name).toBeGreaterThan(lum([0.85, 0.82, 0.74]) - lum([0.45, 0.5, 0.42]) - 0.06);
      expect(Math.max(...clair), k.name).toBeLessThanOrEqual(1);
    }
  });
});

describe('lumière rebondie (biomes.js)', () => {
  it('une couleur claire pour chaque biome et pour la mer', () => {
    for (const b of [...Object.keys(BIOMES), null]) {
      const c = couleurRebond(b);
      expect(c).toHaveLength(3);
      for (const v of c) {
        expect(v, String(b)).toBeGreaterThanOrEqual(0);
        expect(v, String(b)).toBeLessThanOrEqual(1);
      }
      expect(lum(c), String(b)).toBeGreaterThan(0.25);
    }
  });
});
