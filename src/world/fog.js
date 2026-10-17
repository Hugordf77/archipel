// Brouillard de la carte : cases de 32 m, rangées par région de 512 m
// (16 × 16 bits = 64 caractères hexadécimaux par région dans la sauvegarde).
// Il est borné à l'emprise de l'archipel : rien ne se découvre au-delà.
import { ARCHIPEL } from './archipel.js';

export const FOG_CELL = 32;
const B = ARCHIPEL.bounds;
const inBounds = (x, z) => x >= B.minX && x <= B.maxX && z >= B.minZ && z <= B.maxZ;
// nombre de cases de l'archipel (pour le pourcentage de découverte)
export const FOG_TOTAL = Math.round(((B.maxX - B.minX) / FOG_CELL) * ((B.maxZ - B.minZ) / FOG_CELL));
const PER = 16; // cases par côté de région
const REGION = FOG_CELL * PER;

function regionBits(fog, rx, rz, create) {
  const key = `${rx},${rz}`;
  let hex = fog[key];
  if (!hex) {
    if (!create) return null;
    hex = '0'.repeat(64);
  }
  return { key, hex };
}

export function isRevealed(fog, x, z) {
  const rx = Math.floor(x / REGION);
  const rz = Math.floor(z / REGION);
  const r = regionBits(fog, rx, rz, false);
  if (!r) return false;
  const ci = Math.floor((x - rx * REGION) / FOG_CELL);
  const cj = Math.floor((z - rz * REGION) / FOG_CELL);
  const bit = cj * PER + ci;
  return (parseInt(r.hex[bit >> 2], 16) >> (bit & 3)) & 1;
}

// lève le brouillard autour de (x, z) ; renvoie le nombre de cases découvertes
export function reveal(fog, x, z, radius = 60) {
  let added = 0;
  const c0 = Math.floor((x - radius) / FOG_CELL);
  const c1 = Math.floor((x + radius) / FOG_CELL);
  const r0 = Math.floor((z - radius) / FOG_CELL);
  const r1 = Math.floor((z + radius) / FOG_CELL);
  const touched = new Map();
  for (let cj = r0; cj <= r1; cj++) {
    for (let ci = c0; ci <= c1; ci++) {
      const cx = (ci + 0.5) * FOG_CELL;
      const cz = (cj + 0.5) * FOG_CELL;
      if (Math.hypot(cx - x, cz - z) > radius + FOG_CELL * 0.5 || !inBounds(cx, cz)) continue;
      const rx = Math.floor(ci / PER);
      const rz = Math.floor(cj / PER);
      const key = `${rx},${rz}`;
      let arr = touched.get(key);
      if (!arr) {
        const hex = fog[key] || '0'.repeat(64);
        arr = hex.split('').map((h) => parseInt(h, 16));
        touched.set(key, arr);
      }
      const bit = (cj - rz * PER) * PER + (ci - rx * PER);
      const nib = bit >> 2;
      const mask = 1 << (bit & 3);
      if (!(arr[nib] & mask)) {
        arr[nib] |= mask;
        added++;
      }
    }
  }
  if (added) for (const [key, arr] of touched) fog[key] = arr.map((v) => v.toString(16)).join('');
  return added;
}

export function revealedCount(fog) {
  let n = 0;
  for (const hex of Object.values(fog)) for (const h of hex) n += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][parseInt(h, 16)];
  return n;
}

// part de l'archipel découverte (0 à 1)
export function fogShare(fog) {
  return Math.min(1, revealedCount(fog) / FOG_TOTAL);
}

// retire les cases hors de l'emprise (sauvegardes du monde infini)
export function boundFog(fog) {
  const out = {};
  for (const [key, hex] of Object.entries(fog || {})) {
    const [rx, rz] = key.split(',').map(Number);
    const arr = hex.split('').map((h) => parseInt(h, 16));
    let any = false;
    for (let bit = 0; bit < PER * PER; bit++) {
      const cx = (rx * PER + (bit % PER) + 0.5) * FOG_CELL;
      const cz = (rz * PER + Math.floor(bit / PER) + 0.5) * FOG_CELL;
      if (!inBounds(cx, cz)) arr[bit >> 2] &= ~(1 << (bit & 3));
      else if (arr[bit >> 2] & (1 << (bit & 3))) any = true;
    }
    if (any) out[key] = arr.map((v) => v.toString(16)).join('');
  }
  return out;
}

