import * as THREE from 'three';

// Saisons calées sur la date réelle (ou forcées dans les réglages).
export const SEASONS = { printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' };

export function seasonOf(date = new Date(), override = 'auto') {
  if (override && override !== 'auto' && SEASONS[override]) return override;
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'printemps';
  if (m >= 5 && m <= 7) return 'ete';
  if (m >= 8 && m <= 10) return 'automne';
  return 'hiver';
}

const AUTUMN = ['#f7bb6a', '#f4a07c', '#f7d97c', '#f2c27c'].map((c) => new THREE.Color(c));
const BLOSSOM = new THREE.Color('#f6c3d3');
const WINTER = new THREE.Color('#a9c6c2');
const WARM = new THREE.Color('#d6d27c');

function cellHash(x, z) {
  const h = Math.sin(Math.floor(x / 3.5) * 127.1 + Math.floor(z / 3.5) * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// Recolore les feuillages (couleurs par sommet) selon la saison.
// Les couleurs d'origine sont gardées pour pouvoir changer de saison à la volée.
export function applySeason(foliageMesh, season) {
  const geo = foliageMesh.geometry;
  const col = geo.attributes.color;
  const center = geo.attributes.aCenter;
  if (!geo.userData.baseColors) geo.userData.baseColors = col.array.slice();
  const base = geo.userData.baseColors;
  const c = new THREE.Color();
  for (let i = 0; i < col.count; i++) {
    c.setRGB(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
    const cx = center.getX(i);
    const cz = center.getZ(i);
    const r = cellHash(cx, cz);
    const isBlossom = c.r > c.g; // arbres déjà en fleurs (cerisiers)
    if (season === 'automne' && !isBlossom) {
      if (r < 0.42) c.lerp(AUTUMN[Math.floor(r * 100) % AUTUMN.length], 0.55 + (r * 7) % 0.12);
      else c.lerp(WARM, 0.14);
    } else if (season === 'printemps' && !isBlossom) {
      if (r < 0.22) c.lerp(BLOSSOM, 0.7);
      else c.offsetHSL(0.01, 0.04, 0.03);
    } else if (season === 'hiver') {
      c.lerp(WINTER, 0.35);
    }
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

// Neige posée en permanence l'hiver (sur les faces tournées vers le ciel)
export function seasonSnow(season) {
  return season === 'hiver' ? 0.42 : 0;
}
