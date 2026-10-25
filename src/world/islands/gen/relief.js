// Passe 1a — relief de base (avant érosion) des îles de la carte : contexte mis en cache et grille de
// 4 m, d'après la silhouette et les reliefs tracés à la main (forme.js). Aussi utilisé tel quel par la
// carte du jeu et la minicarte.
import { formeContext, formeHeight, formeHeightL, coastGrid } from './forme.js';

export const SEA_FLOOR = -16;
export const CELL = 4;

// Contexte d'une île : bruits, silhouette, reliefs et zones (forme.js)
const cache = new Map();
export function reliefContext(desc) {
  const key = `${desc.id}:${desc.seed}`;
  let c = cache.get(key);
  if (c) return c;
  c = formeContext(desc);
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  cache.set(key, c);
  return c;
}

// hauteur de base (m) en coordonnées locales à l'île, avant érosion et rivières
export function baseHeight(c, lx, lz) {
  return formeHeight(c, lx, lz);
}

// grille de 4 m du relief de base (pas exact : les sections se taillent dans la grille)
export function baseGrid(c) {
  const n = c.n;
  const H = new Float32Array(n * n);
  const L = coastGrid(c);
  for (let j = 0; j < n; j++) {
    const z = -c.ext + j * CELL;
    for (let i = 0; i < n; i++) H[j * n + i] = formeHeightL(c, -c.ext + i * CELL, z, L[j * n + i]);
  }
  return { H, n, s: CELL };
}
