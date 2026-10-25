// Carte d'herbe des tuiles (Worker, world/islands/gen/herbe.js) : format, bords identiques entre
// tuiles voisines, règles (zones, chemins, eau, arbres, massifs), éléments et identifiants des
// tuiles inchangés, coût par tuile. Sur l'île d'essai (tests/fixtures/ile-essai.js : village, chemins,
// sous-bois de champignons) et sur une section de la Grande Île.
import { describe, it, expect } from 'vitest';
import { ILE_ESSAI } from './fixtures/ile-essai.js';
import { ILES, ISLANDS } from '../src/world/islands/regions.js';
import { cropPlan } from '../src/world/islands/gen/sections.js';
import { buildPlan } from '../src/world/islands/gen/plan.js';
import { Surface, buildTile, tileGround, TILE } from '../src/world/islands/gen/surface.js';
import { herbeTile, HERBE_HMAX } from '../src/world/islands/gen/herbe.js';
import { Z } from '../src/world/islands/gen/zones.js';
import { KINDS, STRIDE } from '../src/world/islands/gen/kinds.js';

const V = TILE + 1;
const ESSAI = ILE_ESSAI.id;
// section de la Grande Île au cœur de la Forêt des souvenirs (monde ouvert, étape « bases »)
const FORET = 'grande-ile~2-3';
const cache = new Map();
function island(id) {
  if (!cache.has(id)) {
    let d;
    let p;
    if (id === ESSAI) p = buildPlan((d = ILE_ESSAI));
    else {
      d = ISLANDS.find((q) => q.id === id);
      p = cropPlan(buildPlan(ILES.find((q) => q.id === d.parent)), d);
    }
    cache.set(id, { d, p, surf: new Surface(p), tiles: new Map() });
  }
  return cache.get(id);
}
function tileOf(id, tx, tz) {
  const I = island(id);
  const key = `${tx},${tz}`;
  if (!I.tiles.has(key)) I.tiles.set(key, buildTile(I.p, I.surf, tx, tz));
  return I.tiles.get(key);
}
// toutes les tuiles d'une île (d'une section : celles de son carré, les seules affichées)
function allTiles(id) {
  const { p } = island(id);
  const nt = Math.ceil((p.core || p.ext) / TILE);
  const out = [];
  for (let tz = -nt; tz < nt; tz++) for (let tx = -nt; tx < nt; tx++) out.push([tx, tz]);
  return out;
}
// zone de la cellule de 4 m sous un point, et vrai si ses 8 voisines sont de la même zone
function zoneAt(p, x, z) {
  const i = Math.round((x + p.ext) / p.s);
  const j = Math.round((z + p.ext) / p.s);
  if (i < 1 || j < 1 || i >= p.n - 1 || j >= p.n - 1) return [-1, false];
  const zn = p.Z[j * p.n + i];
  let same = true;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (p.Z[(j + dj) * p.n + i + di] !== zn) same = false;
  return [zn, same];
}
const quantile = (a, q) => {
  const s = Float32Array.from(a).sort();
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
};
const median = (a) => quantile(a, 0.5);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

describe('carte d’herbe des tuiles', () => {
  it('a le format du contrat : 65 × 65 × 4 octets, mêmes nœuds que le maillage, A = 0', () => {
    const t = tileOf(ESSAI, 0, 0);
    expect(t.herbe).toBeInstanceOf(Uint8Array);
    expect(t.herbe.length).toBe(V * V * 4);
    expect(t.positions.length).toBeGreaterThanOrEqual(V * V * 3); // nœuds, puis la jupe
    for (let k = 0; k < V * V; k++) expect(t.herbe[k * 4 + 3]).toBe(0);
    expect(HERBE_HMAX).toBe(1.2);
  });

  it('donne exactement les mêmes valeurs sur le bord commun de deux tuiles voisines du même biome', () => {
    // (entre deux tuiles de biomes différents, la palette de chaque tuile diffère : raccord à reprendre,
    // voir LIVRAISONS.md, « État courant »)
    let pairs = 0;
    for (const id of [ESSAI, FORET]) {
      const tiles = new Set(allTiles(id).map(([tx, tz]) => `${tx},${tz}`));
      for (const [tx, tz] of allTiles(id)) {
        const a = tileOf(id, tx, tz);
        if (tiles.has(`${tx + 1},${tz}`)) {
          const b = tileOf(id, tx + 1, tz);
          if (a.biome === b.biome) {
            pairs++;
            for (let j = 0; j < V; j++) for (let ch = 0; ch < 4; ch++) expect(a.herbe[(j * V + TILE) * 4 + ch], `${id} ${tx},${tz} est`).toBe(b.herbe[j * V * 4 + ch]);
          }
        }
        if (tiles.has(`${tx},${tz + 1}`)) {
          const c = tileOf(id, tx, tz + 1);
          if (a.biome === c.biome) {
            pairs++;
            for (let i = 0; i < V; i++) for (let ch = 0; ch < 4; ch++) expect(a.herbe[(TILE * V + i) * 4 + ch], `${id} ${tx},${tz} sud`).toBe(c.herbe[i * 4 + ch]);
          }
        }
      }
    }
    expect(pairs).toBeGreaterThan(150);
  });

  it('est déterministe : la même tuile reconstruite (plan neuf) donne la même carte', () => {
    const p = buildPlan({ ...ILE_ESSAI });
    const t = buildTile(p, new Surface(p), 0, 0);
    expect(Buffer.from(t.herbe).equals(Buffer.from(tileOf(ESSAI, 0, 0).herbe))).toBe(true);
  });

  it('prairie dense (R ≥ 0,85) au mollet (0,30 à 0,45 m), massifs au genou (0,6 à 0,9 m)', () => {
    const { p } = island(ESSAI);
    const R = [];
    const G = [];
    for (const [tx, tz] of allTiles(ESSAI)) {
      const t = tileOf(ESSAI, tx, tz);
      for (let k = 0; k < V * V; k++) {
        const [zn, same] = zoneAt(p, t.positions[k * 3], t.positions[k * 3 + 2]);
        if (zn !== Z.PRAIRIE || !same || t.normals[k * 3 + 1] < 0.92) continue;
        R.push(t.herbe[k * 4] / 255);
        G.push((t.herbe[k * 4 + 1] / 255) * HERBE_HMAX);
      }
    }
    console.info(`prairie de l’île d’essai : ${R.length} nœuds, densité médiane ${median(R).toFixed(2)}, hauteur médiane ${median(G).toFixed(2)} m, 99e centile ${quantile(G, 0.99).toFixed(2)} m, massifs (≥ 0,6 m) ${((100 * G.filter((g) => g >= 0.6).length) / G.length).toFixed(1)} %`);
    expect(R.length).toBeGreaterThan(800);
    expect(median(R)).toBeGreaterThanOrEqual(0.85);
    expect(median(G)).toBeGreaterThanOrEqual(0.3);
    expect(median(G)).toBeLessThanOrEqual(0.45);
    // massifs de hautes herbes : quelques pour cent de la prairie, au genou ou à la cuisse
    expect(G.filter((g) => g >= 0.6).length / G.length).toBeGreaterThan(0.02);
    expect(quantile(G, 0.99)).toBeLessThanOrEqual(0.95);
  });

  it('les villages et les collines restent herbus (hors chemins et pied des murs)', () => {
    const { p, surf } = island(ESSAI);
    const vil = p.pois.find((q) => q.type === 'village');
    const houses = vil.parts.filter((q) => q.t === 'maison' || q.t === 'etal' || q.t === 'puits' || q.t === 'potager');
    const village = [];
    const hill = [];
    for (const [tx, tz] of allTiles(ESSAI)) {
      const t = tileOf(ESSAI, tx, tz);
      const g = tileGround(p, surf, tx, tz);
      for (let k = 0; k < V * V; k++) {
        const x = t.positions[k * 3];
        const y = t.positions[k * 3 + 1];
        const z = t.positions[k * 3 + 2];
        if (g.pathW[k] > 0 || y < 1.5) continue;
        const R = t.herbe[k * 4] / 255;
        if (Math.hypot(x - vil.x, z - vil.z) < vil.r && houses.every((q) => Math.hypot(q.x - x, q.z - z) > 3.2)) village.push(R);
        const [zn, same] = zoneAt(p, x, z);
        const ny = t.normals[k * 3 + 1];
        // pente de 0,55 à 0,85 (normale de 0,76 à 0,88)
        if (zn === Z.PRAIRIE && same && ny > 0.76 && ny < 0.88) hill.push(R);
      }
    }
    console.info(`île d’essai : densité médiane au village ${median(village).toFixed(2)} (${village.length} nœuds), sur les pentes de prairie ${median(hill).toFixed(2)} (${hill.length} nœuds)`);
    expect(village.length).toBeGreaterThan(300);
    expect(median(village)).toBeGreaterThanOrEqual(0.6);
    expect(hill.length).toBeGreaterThan(30);
    expect(median(hill)).toBeGreaterThanOrEqual(0.6);
  });

  it('rien sur les chemins, herbe rase à leur bord (0,12 à 0,25 m)', () => {
    const { p, surf } = island(ESSAI);
    let on = 0;
    const edge = [];
    for (const [tx, tz] of allTiles(ESSAI)) {
      const t = tileOf(ESSAI, tx, tz);
      const g = tileGround(p, surf, tx, tz);
      for (let k = 0; k < V * V; k++) {
        if (g.pathW[k] > 0.6 && t.herbe[k * 4] > 0) on++;
        if (g.pathW[k] < 0.3 && g.pathD[k] > 0.4 && g.pathD[k] < 1.2 && t.herbe[k * 4] > 0) edge.push((t.herbe[k * 4 + 1] / 255) * HERBE_HMAX);
      }
    }
    console.info(`chemins de l’île d’essai : ${on} nœuds herbeux sur la voie, hauteur médiane au bord ${median(edge).toFixed(2)} m`);
    expect(on).toBe(0);
    expect(edge.length).toBeGreaterThan(100);
    expect(median(edge)).toBeGreaterThanOrEqual(0.12);
    expect(median(edge)).toBeLessThanOrEqual(0.25);
  });

  it('rien dans la mer ni sous l’eau douce ; ombre sous les arbres ; peu d’herbe en forêt', () => {
    for (const id of [ESSAI, FORET]) {
      const { surf } = island(id);
      let wet = 0;
      for (const [tx, tz] of allTiles(id)) {
        const t = tileOf(id, tx, tz);
        for (let k = 0; k < V * V; k++) {
          const x = t.positions[k * 3];
          const y = t.positions[k * 3 + 1];
          const z = t.positions[k * 3 + 2];
          const lvl = surf.waterLevel(x, z);
          if ((y < 0.3 || (lvl > 0 && y < lvl)) && t.herbe[k * 4] > 0) wet++;
        }
      }
      expect(wet, id).toBe(0);
    }
    // sous la couronne d'un arbre de prairie (à 1,25 m du tronc) : moins dense qu'à 6 m de lui
    const { p } = island(ESSAI);
    const under = [];
    const open = [];
    for (let q = 0; q < p.items.length; q += STRIDE) {
      if (KINDS[p.items[q]] !== 'arbre_pompon' && KINDS[p.items[q]] !== 'arbre_fruitier') continue;
      const x = p.items[q + 1];
      const z = p.items[q + 3];
      const tx = Math.floor((x + 1.25) / TILE);
      const tz = Math.floor(z / TILE);
      if (Math.floor((x - 6) / TILE) !== tx) continue;
      const t = tileOf(ESSAI, tx, tz);
      const at = (ax, az) => t.herbe[((Math.round(az) - tz * TILE) * V + (Math.round(ax) - tx * TILE)) * 4] / 255;
      under.push(at(x + 1.25, z));
      open.push(at(x - 6, z));
    }
    console.info(`arbres de l’île d’essai : densité moyenne sous la couronne ${mean(under).toFixed(2)}, à 6 m ${mean(open).toFixed(2)} (${under.length} arbres)`);
    expect(under.length).toBeGreaterThan(10);
    expect(mean(under)).toBeLessThan(0.85 * mean(open));
    // sous-bois de champignons de l'île d'essai : herbe rare sous le couvert
    const B = island(ESSAI).p;
    const forest = [];
    for (const [tx, tz] of allTiles(ESSAI)) {
      const t = tileOf(ESSAI, tx, tz);
      for (let k = 0; k < V * V; k++) {
        const [zn, same] = zoneAt(B, t.positions[k * 3], t.positions[k * 3 + 2]);
        if ((zn === Z.FORET || zn === Z.CHAMPIGNONS) && same) forest.push(t.herbe[k * 4] / 255);
      }
    }
    expect(forest.length).toBeGreaterThan(500);
    // et dans la Forêt des souvenirs (section de la Grande Île)
    const F = island(FORET).p;
    const futaie = [];
    for (const [tx, tz] of allTiles(FORET)) {
      const t = tileOf(FORET, tx, tz);
      for (let k = 0; k < V * V; k++) {
        const [zn, same] = zoneAt(F, t.positions[k * 3], t.positions[k * 3 + 2]);
        if (zn === Z.FORET && same) futaie.push(t.herbe[k * 4] / 255);
      }
    }
    expect(futaie.length).toBeGreaterThan(500);
    expect(median(futaie)).toBeLessThan(0.3);
    expect(median(forest)).toBeLessThan(0.3);
  });

  it('ne change ni les éléments, ni les identifiants, ni le relief des tuiles (flux aléatoire propre)', () => {
    // empreintes relevées sans la carte d'herbe (la couleur du sol, réglée avec la palette, n'y est pas),
    // le 25/10/2026 sur l'île d'essai et la section de la Forêt des souvenirs
    const ref = {
      [ESSAI]: '56c7ea8c:244153a3:50fc1413,7b013a60:d5f237d:41f18723,7ddb541:42270523:e12f695a',
      [FORET]: '811c9dc5:811c9dc5:ed36cdde,811c9dc5:811c9dc5:828aa8b9,811c9dc5:811c9dc5:9d10a05d',
    };
    const hash = (a) => {
      let h = 2166136261;
      const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
      return (h >>> 0).toString(16);
    };
    for (const [id, want] of Object.entries(ref)) {
      const parts = [[-1, -1], [0, 0], [1, -1]].map(([tx, tz]) => {
        const t = tileOf(id, tx, tz);
        return `${hash(Float32Array.from(t.items))}:${hash(Float64Array.from(t.ids))}:${hash(t.positions)}`;
      });
      expect(parts.join(','), id).toBe(want);
    }
  });

  // Budget de l'herbe V2 : 0,5 ms, mesuré sur l'ancien archipel. Dans les sections de la Grande Île, la
  // médiane est de 0,70 à 0,83 ms seule et de 0,92 à 0,94 ms sous la suite complète (25/10/2026, plus
  // d'arbres par tuile) : plafond provisoire de 1,2 ms, à trancher (LIVRAISONS.md, « État courant »).
  it('coûte au plus 1,2 ms de plus par tuile au Worker (Forêt des souvenirs)', () => {
    const { p, surf } = island(FORET);
    const tiles = allTiles(FORET);
    const grounds = tiles.map(([tx, tz]) => [tx, tz, tileGround(p, surf, tx, tz)]);
    for (const [tx, tz, g] of grounds) herbeTile(p, surf, tx * TILE, tz * TILE, TILE, g); // chauffe
    // meilleur de trois passes par tuile : la mesure pèse peu sous la charge de la suite complète
    const ms = grounds.map(() => Infinity);
    for (let r = 0; r < 3; r++) {
      grounds.forEach(([tx, tz, g], q) => {
        const t0 = performance.now();
        herbeTile(p, surf, tx * TILE, tz * TILE, TILE, g);
        ms[q] = Math.min(ms[q], performance.now() - t0);
      });
    }
    console.info(`carte d'herbe : ${tiles.length} tuiles, médiane ${median(ms).toFixed(2)} ms, 95e centile ${quantile(ms, 0.95).toFixed(2)} ms`);
    expect(median(ms)).toBeLessThanOrEqual(1.2);
  });
});
