// Troupeaux du monde ouvert (desc.faune de la Grande Île, src/world/archipel.js ; gen/spawns.js,
// poserTroupeaux) : moutons ANI-001 sur le haut du Plateau venté, vaches ANI-003 sur la Côte aux
// villages et au bord du Lac céleste. Vrai plan (buildPlan), vraies sections (cropPlan) : chaque
// troupeau est sur un pré (prairie ou fleurs, pente douce, hors de l'eau), sans arbre ni obstacle dans
// son rayon d'errance, loin des lieux et de la corniche, dans une seule section ; le reste du plan ne
// bouge pas.
import { describe, it, expect, beforeAll } from 'vitest';
import { ILE_BY_ID, ISLANDS } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { cropPlan } from '../../src/world/islands/gen/sections.js';
import { poserTroupeaux } from '../../src/world/islands/gen/spawns.js';
import { Z } from '../../src/world/islands/gen/zones.js';
import { KINDS, STRIDE, TREES } from '../../src/world/islands/gen/kinds.js';
import { SECTION } from '../../src/world/islands/gen/forme.js';
import { SPECIES } from '../../src/models/animaux/index.js';

const d = ILE_BY_ID.get('grande-ile');
// arbres et obstacles bas (IslandManager, LOW_KINDS) : rien de tout cela dans un pré
const OBSTACLES = new Set([...TREES, 'arbuste', 'buisson_baies', 'buisson_fleuri', 'rocher', 'rocher_mousse', 'souche', 'bois_mort']);
const PRE = new Set([Z.PRAIRIE, Z.FLEURS]);
let P;
let sans;
beforeAll(() => {
  P = buildPlan(d);
  const { faune, ...nu } = d;
  sans = buildPlan(nu);
}, 60000);

const cell = (x, z) => Math.round((z + P.ext) / P.s) * P.n + Math.round((x + P.ext) / P.s);
const pente = (x, z) => {
  const h = (u, v) => P.H[cell(x + u, z + v)];
  return Math.hypot(h(P.s, 0) - h(-P.s, 0), h(0, P.s) - h(0, -P.s)) / (2 * P.s);
};
// points du disque d'errance (toutes les 4 m, et cercles à r/2 et r)
const disque = (t) => {
  const out = [];
  for (let u = -t.r; u <= t.r; u += 4) for (let v = -t.r; v <= t.r; v += 4) if (u * u + v * v <= t.r * t.r) out.push([t.x + u, t.z + v]);
  for (let a = 0; a < 16; a++) for (const q of [t.r * 0.5, t.r]) out.push([t.x + Math.cos((a / 16) * Math.PI * 2) * q, t.z + Math.sin((a / 16) * Math.PI * 2) * q]);
  return out;
};
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
};
const hash = (arr) => {
  let h = 2166136261;
  const u = new Uint32Array(arr.buffer, arr.byteOffset, arr.byteLength >> 2);
  for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
  return h >>> 0;
};

describe('troupeaux de vaches et de moutons dans le monde ouvert', () => {
  it('pose deux troupeaux de moutons et trois de vaches, robes mêlées, sans rien tirer', () => {
    expect(P.spawners).toEqual(poserTroupeaux(d));
    expect(P.spawners.map((t) => t.sp)).toEqual(['mouton', 'mouton', 'vache', 'vache', 'vache']);
    const betes = (sp) => P.spawners.filter((t) => t.sp === sp).reduce((a, t) => a + t.count, 0);
    expect(betes('mouton')).toBe(11);
    expect(betes('vache')).toBe(10);
    for (const t of P.spawners) {
      // le modèle du catalogue existe, avec ses robes ; une robe par bête, au moins deux robes par troupeau
      const def = SPECIES[t.sp];
      expect(def?.coats?.length, t.sp).toBe(3);
      expect(t.robes).toHaveLength(t.count);
      for (const r of t.robes) expect(r >= 0 && r < def.coats.length).toBe(true);
      expect(new Set(t.robes).size).toBeGreaterThan(1);
      expect(t.r).toBeGreaterThanOrEqual(10);
    }
    // une seule robe noire chez les moutons de la Corniche (le mouton noir du troupeau)
    expect(P.spawners[0].robes.filter((r) => r === 2)).toHaveLength(1);
  });

  it('met chaque troupeau sur un pré à pente douce, hors de l’eau, dans sa zone', () => {
    const zoneDe = (t) => P.zones[P.ZI[cell(t.x, t.z)]];
    for (const t of P.spawners) {
      const nom = `${t.sp} (${t.x}, ${t.z})`;
      if (t.sp === 'mouton') {
        expect(zoneDe(t), nom).toBe('plateau-vente');
        // sur le haut du plateau (rebord à 59 m), pas dans la plaine du pied
        expect(P.H[cell(t.x, t.z)], nom).toBeGreaterThan(50);
      } else expect(['cote-aux-villages', 'lac-celeste'], nom).toContain(zoneDe(t));
      for (const [x, z] of disque(t)) {
        const k = cell(x, z);
        expect(PRE.has(P.Z[k]), `${nom} : zone ${P.Z[k]} en (${x.toFixed(0)}, ${z.toFixed(0)})`).toBe(true);
        expect(P.H[k], nom).toBeGreaterThan(1);
        expect(pente(x, z), nom).toBeLessThanOrEqual(0.22);
      }
      const k = cell(t.x, t.z);
      expect(P.wetDist[k], `${nom} : eau douce`).toBeGreaterThan(t.r + 10);
      expect(P.coastDist[k], `${nom} : côte`).toBeGreaterThan(t.r + 20);
    }
  });

  it('ne met ni arbre ni obstacle dans le rayon d’errance, loin des lieux et de la corniche', () => {
    for (const t of P.spawners) {
      const nom = `${t.sp} (${t.x}, ${t.z})`;
      for (let k = 0; k < P.items.length; k += STRIDE) {
        if (!OBSTACLES.has(KINDS[P.items[k]])) continue;
        expect(Math.hypot(P.items[k + 1] - t.x, P.items[k + 3] - t.z), `${nom} : ${KINDS[P.items[k]]}`).toBeGreaterThan(t.r + 1);
      }
      for (const p of P.pois) expect(Math.hypot(p.x - t.x, p.z - t.z), `${nom} : ${p.label}`).toBeGreaterThan(t.r + 30);
      for (const tr of d.terrassements) {
        for (let i = 1; i < tr.pts.length; i++) expect(segDist(t.x, t.z, tr.pts[i - 1], tr.pts[i]), `${nom} : ${tr.nom}`).toBeGreaterThan(t.r + 30);
      }
    }
    // pas deux troupeaux l'un sur l'autre
    for (const a of P.spawners) for (const b of P.spawners) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(80);
  });

  it('garde chaque troupeau dans une seule section, recentré, loin de ses bords', () => {
    const vus = [];
    for (const sec of ISLANDS.filter((q) => q.parent === 'grande-ile')) {
      const { cx, cz } = sec.section;
      const C = cropPlan(P, sec);
      expect(cropPlan(P, sec).spawners).toEqual(C.spawners);
      for (const t of C.spawners) {
        const src = P.spawners.find((q) => q.x === t.x + cx && q.z === t.z + cz);
        expect(src, `${sec.id}`).toBeTruthy();
        expect({ ...t, x: src.x, z: src.z }).toEqual(src);
        // tout le rayon d'errance dans le carré de la section, à 8 m au moins du bord
        expect(SECTION / 2 - Math.max(Math.abs(t.x), Math.abs(t.z)), `${sec.id}`).toBeGreaterThan(t.r + 8);
        vus.push(src);
      }
    }
    expect(vus).toHaveLength(P.spawners.length);
    expect(new Set(vus).size).toBe(P.spawners.length);
  });

  it('ne change rien d’autre au plan de l’île (relief, arbres, lieux)', () => {
    expect(sans.spawners).toEqual([]);
    expect(hash(P.H)).toBe(hash(sans.H));
    expect(hash(P.items)).toBe(hash(sans.items));
    expect(Array.from(P.ids)).toEqual(Array.from(sans.ids));
    expect(JSON.stringify(P.pois)).toBe(JSON.stringify(sans.pois));
  });
});
