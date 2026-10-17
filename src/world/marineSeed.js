import { hashString } from '../core/random.js';

export const MARINE_CELL_SIZE = 150;

function hash(x, z, seed = 0) {
  let h = Math.imul((x | 0) ^ seed, 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= z | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

export function marineCellSeed(worldSeed, cx, cz) {
  // toute la graine compte (pas seulement sa longueur) : deux mondes n'ont jamais les mêmes épaves
  return hash(cx, cz, hashString(String(worldSeed)));
}

export function marineCellKey(cx, cz) {
  return `${cx},${cz}`;
}
