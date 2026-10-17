// Hasard déterministe : même graine → mêmes îles, partout et toujours.
// Module pur (utilisé par le Worker de génération, le jeu et les tests).

// Chaîne → entier 32 bits (cyrb53 replié)
export function hashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

// Mélange de trois entiers (graine, coordonnées de région…) → entier 32 bits
export function hash3(a, b, c) {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b * 0x85ebca6b), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13) ^ (c * 0x27d4eb2f), 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

// Générateur pseudo-aléatoire (mulberry32) → () => [0, 1)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// tirage pondéré : [[valeur, poids], …]
export function weighted(rng, entries) {
  let total = 0;
  for (const [, w] of entries) total += Math.max(0, w);
  if (total <= 0) return entries[0][0];
  let r = rng() * total;
  for (const [v, w] of entries) {
    r -= Math.max(0, w);
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
