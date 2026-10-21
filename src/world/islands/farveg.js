// Végétation lointaine (LOD1) : une couronne basse en polygones par arbre ou rocher,
// fusionnée en un seul maillage par île. Module pur, exécuté dans le Worker.
import { KINDS, STRIDE } from './gen/kinds.js';

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// formes : [type, cx, cy, cz, r, squash | haut, couleur] (aussi lues par gen/herbe.js : couronnes)
export const SHAPES = {
  arbre_pompon: [['ball', 0, 2.55, 0, 1.45, 0.9, '#8fd08a'], ['ball', 0.45, 3.25, -0.25, 0.95, 0.9, '#a9dc96']],
  arbre_fruitier: [['ball', 0, 2.55, 0, 1.45, 0.9, '#93d28c']],
  arbre_cerisier: [['ball', 0, 2.55, 0, 1.45, 0.9, '#f6bfcb'], ['ball', 0.45, 3.25, -0.25, 0.95, 0.9, '#f9d3dc']],
  pin: [['cone', 0, 0.9, 0, 1.35, 4.3, '#68b994']],
  pin_givre: [['cone', 0, 0.9, 0, 1.35, 4.3, '#c2dcd8']],
  palmier: [['ball', 0.55, 4.25, 0, 1.7, 0.3, '#7fc98a']],
  arbuste: [['ball', 0, 0.55, 0, 0.85, 0.8, '#86cc8c']],
  buisson_baies: [['ball', 0, 0.55, 0, 0.85, 0.8, '#7fc48b']],
  rocher: [['ball', 0, 0.22, 0, 0.8, 0.62, 'rock']],
  rocher_mousse: [['ball', 0, 0.22, 0, 0.8, 0.62, 'rock'], ['ball', 0, 0.55, 0, 0.6, 0.35, '#9fd09a']],
  cactus: [['cone', 0, 0, 0, 0.34, 1.9, '#8fc79a']],
  champi_geant: [['ball', 0, 2.75, 0, 1.6, 0.48, '#e9a3c4']],
  cristal: [['cone', 0, 0, 0, 0.42, 1.25, '#b9dff0']],
  filon_cuivre: [['ball', 0, 0.3, 0, 0.85, 0.7, 'rock']],
  filon_fer: [['ball', 0, 0.3, 0, 0.85, 0.7, 'rock']],
  obsidienne: [['cone', 0, 0, 0, 0.5, 0.95, '#6c5a80']],
  bouleau: [['ball', 0, 3.0, 0, 1.1, 1.2, '#b8e0a0']],
  saule: [['ball', 0, 2.3, 0, 1.9, 0.75, '#a9d98e']],
  erable: [['ball', 0, 2.8, 0, 1.45, 0.9, '#f2a07a'], ['ball', 0.4, 3.5, 0.2, 0.9, 0.9, '#f6c08a']],
  sapin_neige: [['cone', 0, 0.8, 0, 1.3, 4.6, '#dcebe8']],
  bambou: [['cone', 0, 0, 0, 0.7, 4.6, '#9fd08a']],
  fougere_arbo: [['ball', 0, 2.5, 0, 1.4, 0.45, '#7fc48b']],
  cactus_fleur: [['cone', 0, 0, 0, 0.36, 2.0, '#8fc79a']],
  buisson_fleuri: [['ball', 0, 0.5, 0, 0.75, 0.8, '#f2b8c6']],
};

const SEG = 7;
const RINGS = 4;
// nombre de sommets / indices par forme
const BALL_V = (RINGS + 1) * (SEG + 1);
const BALL_I = RINGS * SEG * 6;
const CONE_V = SEG + 2;
const CONE_I = SEG * 6;

export function buildFarVeg(items, pal) {
  // comptage
  let nv = 0;
  let ni = 0;
  for (let k = 0; k < items.length; k += STRIDE) {
    const sh = SHAPES[KINDS[items[k]]];
    if (!sh) continue;
    for (const s of sh) {
      nv += s[0] === 'ball' ? BALL_V : CONE_V;
      ni += s[0] === 'ball' ? BALL_I : CONE_I;
    }
  }
  const positions = new Float32Array(nv * 3);
  const normals = new Float32Array(nv * 3);
  const colors = new Float32Array(nv * 3);
  const index = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const rock = hex(pal.rock);
  let v = 0;
  let w = 0;
  const put = (x, y, z, nx, ny, nz, c) => {
    positions[v * 3] = x;
    positions[v * 3 + 1] = y;
    positions[v * 3 + 2] = z;
    normals[v * 3] = nx;
    normals[v * 3 + 1] = ny;
    normals[v * 3 + 2] = nz;
    colors[v * 3] = c[0];
    colors[v * 3 + 1] = c[1];
    colors[v * 3 + 2] = c[2];
    v++;
  };
  const col = [0, 0, 0];
  for (let k = 0; k < items.length; k += STRIDE) {
    const sh = SHAPES[KINDS[items[k]]];
    if (!sh) continue;
    const x = items[k + 1];
    const y = items[k + 2];
    const z = items[k + 3];
    const rot = items[k + 4];
    const sc = items[k + 5];
    const vr = items[k + 6];
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const bright = 0.9 + vr * 0.18;
    for (const [type, cx, cy, cz, r, q, c] of sh) {
      const base = c === 'rock' ? rock : hex(c);
      col[0] = base[0] * bright;
      col[1] = base[1] * bright;
      col[2] = base[2] * bright;
      const ox = x + (cx * cr + cz * sr) * sc;
      const oz = z + (-cx * sr + cz * cr) * sc;
      const oy = y + cy * sc;
      const v0 = v;
      if (type === 'ball') {
        for (let j = 0; j <= RINGS; j++) {
          const phi = (j / RINGS) * Math.PI;
          const sy = Math.cos(phi);
          const sx = Math.sin(phi);
          for (let i = 0; i <= SEG; i++) {
            const th = (i / SEG) * Math.PI * 2;
            const nx = sx * Math.cos(th);
            const nz = sx * Math.sin(th);
            put(ox + nx * r * sc, oy + sy * r * q * sc, oz + nz * r * sc, nx, sy, nz, col);
          }
        }
        for (let j = 0; j < RINGS; j++) {
          for (let i = 0; i < SEG; i++) {
            const a = v0 + j * (SEG + 1) + i;
            const b = a + SEG + 1;
            index[w++] = a;
            index[w++] = a + 1;
            index[w++] = b;
            index[w++] = a + 1;
            index[w++] = b + 1;
            index[w++] = b;
          }
        }
      } else {
        // cône : cy = base, q = sommet
        const top = y + q * sc;
        const by = oy;
        for (let i = 0; i <= SEG; i++) {
          const th = (i / SEG) * Math.PI * 2;
          const nx = Math.cos(th);
          const nz = Math.sin(th);
          put(ox + nx * r * sc, by, oz + nz * r * sc, nx * 0.8, 0.6, nz * 0.8, col);
        }
        put(ox, top, oz, 0, 1, 0, col);
        for (let i = 0; i < SEG; i++) {
          index[w++] = v0 + i;
          index[w++] = v0 + SEG + 1;
          index[w++] = v0 + i + 1;
          // fond (rarement visible) : on referme quand même
          index[w++] = v0 + i;
          index[w++] = v0 + i + 1;
          index[w++] = v0;
        }
      }
    }
  }
  return { positions, normals, colors, index };
}
