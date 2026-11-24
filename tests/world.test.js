// Monde ouvert (v4) : l'archipel des souvenirs (îles tracées, zones, sections, bases), la limite du
// large, la migration v4, le budget du Worker ; puis la passe des lieux éprouvée sur l'île d'essai
// (tests/fixtures/ile-essai.js) et ses variantes (graines, tailles) : plan déterministe, eau, lieux,
// chemins, identifiants, champs de fleurs.
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

const BUILDINGS = new Set(['maison', 'moulin', 'moulin_eau', 'phare', 'tour_guet', 'temple', 'cabane', 'observatoire']);

// module « neuf » (caches vides) : le résultat ne doit pas dépendre de l'historique
async function fresh(path) {
  vi.resetModules();
  return import(path);
}

const hash = (arr) => {
  let h = 2166136261;
  const u = new Uint32Array(arr.buffer, arr.byteOffset, arr.byteLength >> 2);
  for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619);
  return h >>> 0;
};
const digest = (p) => [hash(p.H), hash(p.Z), hash(p.C), hash(p.items), hash(p.ids), JSON.stringify(p.pois), JSON.stringify(p.pathParts), JSON.stringify(p.micro), JSON.stringify(p.spawners), p.paths.map((q) => hash(q.pts)).join(','), p.rivers.map((q) => hash(q.pts)).join(','), p.name].join('|');

// l'île d'essai et cinq variantes (autre graine, autre taille) : la chaîne doit rester saine si
// l'on retouche une île à la main
let shared = null;
async function samplePlans() {
  if (shared) return shared;
  const { VARIANTES_ESSAI } = await import('./fixtures/ile-essai.js');
  const { buildPlan } = await import('../src/world/islands/gen/plan.js');
  shared = VARIANTES_ESSAI.map((d) => ({ d, p: buildPlan(d) }));
  return shared;
}

describe('archipel des souvenirs (open world)', () => {
  it('trace 24 zones nommées et des îles aux identifiants stables, dans l’emprise de 6 × 4 km', async () => {
    const { ARCHIPEL, ZONES } = await import('../src/world/archipel.js');
    const { ILES } = await import('../src/world/islands/regions.js');
    const B = ARCHIPEL.bounds;
    expect(B.maxX - B.minX).toBe(6000);
    expect(B.maxZ - B.minZ).toBe(4000);
    expect(ZONES).toHaveLength(24);
    expect(new Set(ZONES.map((z) => z.id)).size).toBe(24);
    for (const zn of ZONES) {
      expect(zn.name).toMatch(/^(L’|Les |Le |La )/);
      expect(zn.lx).toBeGreaterThan(B.minX);
      expect(zn.lx).toBeLessThan(B.maxX);
    }
    expect(new Set(ILES.map((d) => d.id)).size).toBe(ILES.length);
    expect(ILES.filter((d) => !d.ilot).length).toBeGreaterThanOrEqual(15);
    for (const d of ILES) {
      expect(d.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ZONES.some((z) => z.id === d.zone), d.id).toBe(true);
      expect(d.x - d.r).toBeGreaterThan(B.minX);
      expect(d.x + d.r).toBeLessThan(B.maxX);
      expect(d.z - d.r).toBeGreaterThan(B.minZ);
      expect(d.z + d.r).toBeLessThan(B.maxZ);
    }
    // la Grande Île est la plus grande ; chaque zone de la carte a au moins une île ou est une zone de mer
    const grande = ILES.find((d) => d.id === 'grande-ile');
    expect(Math.max(...ILES.map((d) => d.r))).toBe(grande.r);
    for (const zn of ZONES) expect(zn.mer || ILES.some((d) => d.zone === zn.id || zn.ile === d.id), zn.id).toBe(true);
  });

  it('laisse des chenaux navigables entre les îles (70 m au moins) et dégage le départ', async () => {
    const { ILES } = await import('../src/world/islands/regions.js');
    const { reliefContext, baseHeight } = await import('../src/world/islands/gen/relief.js');
    const land = new Map();
    for (const d of ILES) {
      const c = reliefContext(d);
      const out = [];
      for (let z = -c.ext; z <= c.ext; z += 12) for (let x = -c.ext; x <= c.ext; x += 12) if (baseHeight(c, x, z) > 0) out.push(d.x + x, d.z + z);
      land.set(d.id, out);
    }
    for (let i = 0; i < ILES.length; i++) {
      for (let j = i + 1; j < ILES.length; j++) {
        const a = ILES[i];
        const b = ILES[j];
        if (Math.hypot(a.x - b.x, a.z - b.z) > a.r + b.r + 200) continue;
        const A = land.get(a.id);
        const Bl = land.get(b.id);
        let m = Infinity;
        for (let p = 0; p < A.length; p += 2) for (let q = 0; q < Bl.length; q += 2) m = Math.min(m, Math.hypot(A[p] - Bl[q], A[p + 1] - Bl[q + 1]));
        expect(m, `${a.id} / ${b.id}`).toBeGreaterThanOrEqual(70);
      }
    }
    // aucune terre à moins de 120 m de l'île de départ
    for (const [id, A] of land) for (let p = 0; p < A.length; p += 2) expect(Math.hypot(A[p], A[p + 1]), id).toBeGreaterThan(120);
  }, 60000);

  it('dresse des repères visibles de loin : Sommet givré, volcan, Îles célestes dans le ciel', async () => {
    const { ILE_BY_ID } = await import('../src/world/islands/regions.js');
    const { reliefContext, baseHeight } = await import('../src/world/islands/gen/relief.js');
    const top = (id) => {
      const d = ILE_BY_ID.get(id);
      const c = reliefContext(d);
      let h = 0;
      for (let z = -c.ext; z <= c.ext; z += 8) for (let x = -c.ext; x <= c.ext; x += 8) h = Math.max(h, baseHeight(c, x, z));
      return h;
    };
    expect(top('grande-ile')).toBeGreaterThan(220);
    expect(top('volcan-endormi')).toBeGreaterThan(150);
    const { ARCHIPEL } = await import('../src/world/archipel.js');
    expect(ARCHIPEL.ciel.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...ARCHIPEL.ciel.map((c) => c.alt))).toBeGreaterThan(200);
  });

  it('donne du caractère au relief : massif à plusieurs sommets, forêt vallonnée, côte et plateau plus doux', async () => {
    const { ILE_BY_ID } = await import('../src/world/islands/regions.js');
    const { ZONE_BY_ID } = await import('../src/world/archipel.js');
    const { reliefContext, baseHeight } = await import('../src/world/islands/gen/relief.js');
    const d = ILE_BY_ID.get('grande-ile');
    const c = reliefContext(d);
    const sample = (id, step = 16) => {
      const z = ZONE_BY_ID.get(id);
      const pts = [];
      for (let v = -z.rz * 0.7; v <= z.rz * 0.7; v += step) for (let u = -z.rx * 0.7; u <= z.rx * 0.7; u += step) pts.push([u, v, baseHeight(c, z.x - d.x + u, z.z - d.z + v)]);
      return pts;
    };
    // relief local : écart moyen à la moyenne des voisins (rugosité des collines)
    const rough = (id) => {
      const z = ZONE_BY_ID.get(id);
      let sum = 0;
      let n = 0;
      for (const [u, v, h] of sample(id, 24)) {
        if (h < 2) continue;
        const x = z.x - d.x + u;
        const y = z.z - d.z + v;
        const m = (baseHeight(c, x + 30, y) + baseHeight(c, x - 30, y) + baseHeight(c, x, y + 30) + baseHeight(c, x, y - 30)) / 4;
        sum += Math.abs(h - m);
        n++;
      }
      return sum / n;
    };
    expect(rough('foret-des-souvenirs')).toBeGreaterThan(rough('cote-aux-villages') * 1.5);
    expect(rough('sommet-givre')).toBeGreaterThan(rough('foret-des-souvenirs') * 1.5);
    // plusieurs sommets au-dessus de 150 m dans le massif (maxima locaux sur la grille de 16 m)
    const pts = sample('sommet-givre');
    const H = new Map(pts.map(([u, v, h]) => [`${u},${v}`, h]));
    let peaks = 0;
    for (const [u, v, h] of pts) {
      if (h < 150) continue;
      let top = true;
      for (const [du, dv] of [[16, 0], [-16, 0], [0, 16], [0, -16], [16, 16], [-16, -16], [16, -16], [-16, 16]]) if ((H.get(`${u + du},${v + dv}`) ?? -1) > h) top = false;
      if (top) peaks++;
    }
    expect(peaks).toBeGreaterThanOrEqual(3);
  }, 30000);

  it('nomme la zone de chaque point : île, zone de mer, départ, haute mer', async () => {
    const { zoneAt } = await import('../src/world/islands/regions.js');
    const { ZONE_BY_ID } = await import('../src/world/archipel.js');
    const at = (id) => {
      const z = ZONE_BY_ID.get(id);
      return zoneAt(z.x, z.z)?.id;
    };
    for (const id of ['sommet-givre', 'foret-des-souvenirs', 'plateau-vente', 'cote-aux-villages', 'volcan-endormi', 'ile-aux-fleurs', 'ile-aux-lueurs', 'desert-ile-sechee', 'royaume-des-ruines', 'cascades-sacrees', 'place-des-os', 'village-englouti']) expect(at(id), id).toBe(id);
    expect(zoneAt(0, 4)?.id).toBe('home');
    // au large, loin de toute zone
    expect(zoneAt(-2900, 1200)).toBe(null);
  });

  it('découpe les grandes îles en sections de 512 m taillées dans le plan de l’île entière', async () => {
    const { ILE_BY_ID, ISLANDS } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { cropPlan } = await import('../src/world/islands/gen/sections.js');
    const { TREES, KINDS, STRIDE } = await import('../src/world/islands/gen/kinds.js');
    const { bilinear } = await import('../src/world/islands/gen/grid.js');
    const d = ILE_BY_ID.get('ile-aux-lueurs');
    const secs = ISLANDS.filter((q) => q.parent === d.id);
    expect(secs.length).toBeGreaterThanOrEqual(4);
    expect(ISLANDS.some((q) => q.id === d.id)).toBe(false);
    for (const q of secs) expect(q.id).toMatch(/^ile-aux-lueurs~\d-\d$/);
    const whole = buildPlan(d);
    const parts = secs.map((q) => cropPlan(whole, q));
    // chaque arbre est dans une seule section, au même identifiant
    expect(parts.reduce((a, p) => a + p.ids.length, 0)).toBe(whole.ids.length);
    expect(new Set(parts.flatMap((p) => [...p.ids]))).toEqual(new Set(whole.ids));
    const { DECOR } = await import('../src/world/islands/gen/flora.js');
    for (const p of parts) for (let k = 0; k < p.items.length; k += STRIDE) expect(TREES.has(KINDS[p.items[k]]) || DECOR.has(KINDS[p.items[k]])).toBe(true);
    // même relief des deux côtés d'un raccord
    for (const [p, q] of parts.map((p, i) => [p, secs[i]])) {
      for (const [lx, lz] of [[-256, 0], [255, 100], [0, -256], [-100, 255]]) {
        const h = bilinear(p.H, p.n, (lx + p.ext) / p.s, (lz + p.ext) / p.s);
        const x = q.section.cx + lx;
        const z = q.section.cz + lz;
        expect(h).toBeCloseTo(bilinear(whole.H, whole.n, (x + whole.ext) / whole.s, (z + whole.ext) / whole.s), 5);
      }
    }
  }, 30000);

  it('pose relief, eau douce, arbres et décor naturel (ni lieux tirés, ni chemins, ni faune tirée, ni ressources), Lac céleste', async () => {
    const { ILE_BY_ID } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { TREES, KINDS, STRIDE } = await import('../src/world/islands/gen/kinds.js');
    const { ZONE_BY_ID } = await import('../src/world/archipel.js');
    const d = ILE_BY_ID.get('grande-ile');
    const p = buildPlan(d);
    // seuls lieux : ceux posés à la main (desc.poses, tests/zones/plateau-vente-poses.test.js)
    expect(p.pois.map((q) => q.type)).toEqual(d.poses.map((q) => q.t));
    expect(p.paths).toEqual([]);
    // seule faune : les troupeaux posés à la main (desc.faune, tests/zones/troupeaux.test.js)
    expect(p.spawners.map((q) => [q.sp, q.x, q.z])).toEqual(d.faune.map((q) => [q.sp, q.x, q.z]));
    expect(p.micro).toEqual([]);
    const { DECOR } = await import('../src/world/islands/gen/flora.js');
    let trees = 0;
    for (let k = 0; k < p.items.length; k += STRIDE) {
      const kind = KINDS[p.items[k]];
      expect(TREES.has(kind) || DECOR.has(kind), kind).toBe(true);
      if (TREES.has(kind)) trees++;
    }
    expect(trees).toBeGreaterThan(5000);
    // décor : buissons, rochers, fougères… mais aucune ressource (filons, cristaux, baies)
    for (const r of ['filon_cuivre', 'filon_fer', 'cristal', 'buisson_baies', 'obsidienne']) expect(DECOR.has(r)).toBe(false);
    expect(p.rivers.length).toBeGreaterThanOrEqual(4);
    // le Lac céleste : un lac d'eau douce à l'est, sous son aire
    const L = ZONE_BY_ID.get('lac-celeste');
    const lake = p.lakes.find((q) => {
      const k = q.cells[0];
      const x = d.x - p.ext + (k % p.n) * p.s;
      const z = d.z - p.ext + Math.floor(k / p.n) * p.s;
      return Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz) < 1;
    });
    expect(lake).toBeTruthy();
    expect(lake.area).toBeGreaterThan(20000);
    // neige au Sommet givré, pas sur la côte
    const Zs = await import('../src/world/islands/gen/zones.js');
    let neige = 0;
    for (let k = 0; k < p.Z.length; k++) if (p.Z[k] === Zs.Z.NEIGE) neige++;
    expect(neige * p.s * p.s).toBeGreaterThan(30000);
  }, 30000);
});

describe('île d’essai (passe des lieux)', () => {
  it('donne à l’île un plan déterministe, avec les lieux de sa recette', async () => {
    const { VARIANTES_ESSAI } = await import('./fixtures/ile-essai.js');
    const A = await fresh('../src/world/islands/gen/plan.js');
    const first = VARIANTES_ESSAI.map((d) => digest(A.buildPlan(d)));
    const B = await fresh('../src/world/islands/gen/plan.js');
    const plans = VARIANTES_ESSAI.slice().reverse().map((d) => B.buildPlan(d)).reverse();
    plans.forEach((p, i) => expect(digest(p), VARIANTES_ESSAI[i].id).toBe(first[i]));
    const types = plans[0].pois.map((q) => q.type);
    expect(types).toEqual(expect.arrayContaining(['village', 'moulin_vent', 'rucher', 'arche_fleurie', 'phare', 'arbre_geant', 'cabane_ermite', 'cercle_pierres', 'ruines', 'tour_guet']));
    expect(plans[0].lieux).toBe(true);
    expect(plans[0].pois.find((q) => q.type === 'village').name).toBe('Village de Port-Essai');
    expect(plans[0].pois.find((q) => q.type === 'moulin_vent').name).toBe('Moulin Rose');
  });

  it('ne pose que les lieux de la recette ; sans lieux décrits, ni lieux, ni chemins, ni faune', async () => {
    const { ILE_ESSAI } = await import('./fixtures/ile-essai.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { Surface, buildTile } = await import('../src/world/islands/gen/surface.js');
    const lieux = ILE_ESSAI.lieux;
    const sans = buildPlan({ ...ILE_ESSAI, lieux: { ...lieux, recette: lieux.recette.filter(([t]) => t !== 'phare'), generiques: false } });
    expect(sans.pois.map((q) => q.type)).not.toContain('phare');
    const seul = buildPlan({ ...ILE_ESSAI, lieux: { ...lieux, recette: [['puits_isole', 1]], generiques: false } });
    expect(seul.pois.filter((q) => q.type !== 'cascade').map((q) => q.type)).toEqual(['puits_isole']);
    // comme les îles du jeu à l'étape « bases »
    const nue = buildPlan({ ...ILE_ESSAI, lieux: undefined });
    expect(nue.lieux).toBe(false);
    expect([nue.pois, nue.micro, nue.paths, nue.pathParts, nue.spawners]).toEqual([[], [], [], [], []]);
    expect(nue.landing).toBe(null);
    expect(nue.ids.length).toBeGreaterThan(500);
    expect(buildTile(nue, new Surface(nue), 0, 2).items.length).toBe(0);
  });

  it('pose le troupeau de vaches sur un pré, robes mêlées, sans toucher au reste de la faune', async () => {
    const { ILE_ESSAI } = await import('./fixtures/ile-essai.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { Z } = await import('../src/world/islands/gen/zones.js');
    const p = buildPlan(ILE_ESSAI);
    const vaches = p.spawners.filter((s) => s.sp === 'vache');
    expect(vaches).toHaveLength(1);
    const [v] = vaches;
    expect(v.count).toBe(3);
    expect(new Set(v.robes)).toEqual(new Set([0, 1, 2]));
    // sur le pré : terre ferme, au-dessus de l'eau, en prairie sur tout le rayon d'errance
    const at = (x, z) => Math.round((z + p.ext) / p.s) * p.n + Math.round((x + p.ext) / p.s);
    for (let a = 0; a < 12; a++) for (const d of [0, v.r * 0.5, v.r]) {
      const k = at(v.x + Math.cos(a) * d, v.z + Math.sin(a) * d);
      expect(p.H[k]).toBeGreaterThan(0.5);
      expect([Z.PRAIRIE, Z.LISIERE, Z.VERGER, Z.FLEURS]).toContain(p.Z[k]);
    }
    // sans le troupeau, la faune de l'île est la même (le troupeau vient après tout tirage)
    const sans = buildPlan({ ...ILE_ESSAI, lieux: { ...ILE_ESSAI.lieux, faune: [] } });
    expect(p.spawners.filter((s) => s.sp !== 'vache')).toEqual(sans.spawners);
  });

  it('place les éléments de la mer (s’il y en a) en eau libre, à positions fixes et identifiants uniques', async () => {
    const { ARCHIPEL } = await import('../src/world/archipel.js');
    const { MARINE_TYPES } = await import('../src/models/objets/index.js');
    const ids = new Set();
    for (const m of ARCHIPEL.marine) {
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
      expect(MARINE_TYPES).toContain(m.type);
      for (const isl of [...ARCHIPEL.islands, ARCHIPEL.home]) expect(Math.hypot(m.x - isl.x, m.z - isl.z), `${m.id} près de ${isl.id}`).toBeGreaterThan(isl.r * 1.3);
    }
  });
});

describe('limite du monde', () => {
  // bateau réel (Sailing) piloté par une partie factice : plein gaz, barre droite
  async function sail(type, x, z, heading, aboard, seconds) {
    const { Sailing } = await import('../src/entities/Sailing.js');
    const game = {
      state: { boat: { type, owned: [type], x, z, heading } },
      scene: { add() {}, remove() {} },
      ui: { toast() {}, panelOpen: false },
      player: { pos: new THREE.Vector3() },
      weather: null,
      audio: null,
    };
    const s = new Sailing(game);
    s.aboard = aboard;
    const input = { axes: () => ({ x: 0, y: 1 }), held: () => false };
    let far = 0;
    for (let t = 0; t < seconds; t += 1 / 30) {
      s.update(1 / 30, input);
      far = Math.max(far, s.pos.x);
    }
    return { x: s.pos.x, far, s };
  }

  it('décrit brume, courant et demi-tour selon la distance au bord de l’emprise', async () => {
    const { worldLimit } = await import('../src/world/archipel.js');
    expect(worldLimit(0, -800).d).toBe(-2000);
    expect(worldLimit(2800, 0).pull).toBe(0);
    expect(worldLimit(2800, 0).mist).toBe(0);
    expect(worldLimit(2950, 0).mist).toBeGreaterThan(0);
    expect(worldLimit(3150, 0).pull).toBeGreaterThan(0.3);
    expect(worldLimit(3150, 0).ux).toBeLessThan(-0.9);
    expect(worldLimit(0, 1350).uz).toBeLessThan(-0.9);
    expect(worldLimit(3200, 0).turn).toBe(false);
    expect(worldLimit(3300, 0).turn).toBe(true);
    expect(worldLimit(0, -3100).turn).toBe(true);
  });

  it('ramène le bateau au-delà du bord de l’emprise et fait demi-tour 250 m plus loin', async () => {
    // à la dérive, moteur coupé : le courant du large le ramène vers le bord
    const drift = await sail('voilier', 3200, -700, Math.PI / 2, false, 300);
    expect(drift.x).toBeLessThan(3060);
    // plein gaz vers le large : il ne dépasse guère 250 m au-delà, vire et revient
    const run = await sail('voilier', 2950, -700, Math.PI / 2, true, 150);
    expect(run.far).toBeLessThan(3330);
    expect(run.x).toBeLessThan(3000);
    expect(run.s.uTurn).toBe(false);
  }, 30000);
});

describe('migration v4 (open world)', () => {
  it('remet le monde à zéro, garde inventaire, bateaux et île de départ, ramène le joueur au départ', async () => {
    const { migrate, relinkDiscoveries } = await import('../src/core/state.js');
    const { GEN_VERSION } = await import('../src/world/islands/regions.js');
    expect(GEN_VERSION).toBe(4);
    const old = {
      version: 2,
      world: { seed: 'coquille-azur-4821', name: 'Vieux monde', createdAt: 1, genVersion: 3 },
      player: { name: 'Mochi', x: -170, z: 400 },
      shells: 42,
      inventory: { lanterne: 2 },
      decor: [{ id: 'd1', type: 'banc', x: 3, z: 4 }],
      harvest: { 'village-pommeraie': { 7: 1 } },
      terra: { 'village-pommeraie': { '5,6': -1 } },
      boat: { type: 'barque', owned: ['radeau', 'barque'], x: 600, z: 700, heading: 1 },
      explorer: {
        islands: { 'village-pommeraie': { name: 'Village de Pommeraie', archetype: 'village', x: -170, z: 400, t: 5 } },
        distance: 1234,
        fog: { '0,0': 'f'.repeat(64) },
        pins: [{ x: 10, z: 20 }],
        pois: { 123: { name: 'Moulin', island: 'village-pommeraie', x: 1, z: 2 } },
      },
    };
    const s = migrate(old);
    expect(s.harvest).toEqual({});
    expect(s.terra).toEqual({});
    expect(s.explorer.fog).toEqual({});
    expect(s.explorer.pins).toEqual([]);
    expect(s.explorer.pois).toEqual({});
    expect(s.explorer.islands).toEqual({});
    expect(s.explorer.distance).toBe(1234);
    expect(s.shells).toBe(42);
    expect(s.inventory).toEqual({ lanterne: 2 });
    expect(s.decor).toEqual(old.decor);
    expect(s.boat.owned).toEqual(['radeau', 'barque']);
    expect(s.boat.x).toBe(null);
    expect([s.player.x, s.player.z]).toEqual([0, 4.5]);
    expect(relinkDiscoveries(s)).toBe(true);
    expect(s.world.genVersion).toBe(GEN_VERSION);
    expect(relinkDiscoveries(s)).toBe(false);
    // une sauvegarde à jour garde ses récoltes et son joueur
    const cur = migrate({ ...old, world: { ...old.world, genVersion: GEN_VERSION } });
    expect(cur.harvest).toEqual(old.harvest);
    expect(cur.terra).toEqual(old.terra);
    expect(cur.player.x).toBe(-170);
  });
});

describe('plan d’île', () => {
  it('garde tous les éléments dans l’emprise de leur île', async () => {
    for (const { d, p } of await samplePlans()) {
      for (const q of [...p.pois.flatMap((x) => x.parts), ...p.pathParts, ...p.micro]) {
        expect(Math.hypot(q.x, q.z), `${d.id} ${q.t}`).toBeLessThan(p.ext + 5);
        expect(Number.isFinite(q.y ?? 0)).toBe(true);
      }
    }
  });
});

describe('eau douce', () => {
  it('fait toujours descendre les rivières jusqu’à la mer, un lac ou un confluent', async () => {
    let n = 0;
    for (const { d, p } of await samplePlans()) {
      for (const rv of p.rivers) {
        n++;
        expect(['mer', 'lac', 'confluent']).toContain(rv.end);
        for (let q = 4; q < rv.pts.length; q += 4) expect(rv.pts[q + 2], `${d.id} rivière ${rv.id}`).toBeLessThanOrEqual(rv.pts[q - 2] + 1e-4);
        const last = rv.pts[rv.pts.length - 2];
        if (rv.end === 'mer') expect(last).toBeLessThan(0.8);
        if (rv.end === 'lac') expect(p.lakes.some((lk) => Math.abs(last - lk.level) < 1.5)).toBe(true);
      }
    }
    expect(n).toBeGreaterThanOrEqual(8);
  });

  it('ne laisse fuir aucun lac (seule la rivière exutoire descend sous son niveau)', async () => {
    const { Z } = await import('../src/world/islands/gen/zones.js');
    let lakes = 0;
    for (const { d, p } of await samplePlans()) {
      const { H, n } = p;
      for (const lk of p.lakes) {
        lakes++;
        const own = new Set(lk.cells);
        for (const k of lk.cells) {
          for (const q of [k - 1, k + 1, k - n, k + n, k - n - 1, k - n + 1, k + n - 1, k + n + 1]) {
            if (own.has(q) || p.Z[q] === Z.RIVIERE || p.Z[q] === Z.LAC) continue;
            expect(H[q], `${d.id} lac ${lk.id}`).toBeGreaterThanOrEqual(lk.level);
          }
        }
      }
    }
    expect(lakes).toBeGreaterThanOrEqual(2);
  });
});

describe('points d’intérêt', () => {
  it('ne se chevauchent pas', async () => {
    const SOFT = new Set(['recif', 'epave_immergee', 'rocher_baleine']);
    for (const { d, p } of await samplePlans()) {
      const list = p.pois.filter((q) => q.r > 0 && !SOFT.has(q.type));
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          // le moulin peut se poser en lisière du village : il évite alors la place et chaque maison
          if ((a.type === 'village' && b.type === 'moulin_vent') || (b.type === 'village' && a.type === 'moulin_vent')) {
            const [vil, mill] = a.type === 'village' ? [a, b] : [b, a];
            for (const h of vil.parts.filter((q) => q.t === 'maison')) expect(Math.hypot(h.x - mill.x, h.z - mill.z)).toBeGreaterThan(4 + mill.r);
            continue;
          }
          expect(Math.hypot(a.x - b.x, a.z - b.z), `${d.id} ${a.type}/${b.type}`).toBeGreaterThanOrEqual(a.r + b.r - 0.01);
        }
      }
    }
  });

  it('pose les bâtiments sur un sol aplani (pente maximale respectée)', async () => {
    const { Surface } = await import('../src/world/islands/gen/surface.js');
    let n = 0;
    let steep = 0;
    for (const { p } of await samplePlans()) {
      const surf = new Surface(p);
      for (const q of p.pois.flatMap((x) => x.parts)) {
        if (!BUILDINGS.has(q.t) || (q.y !== undefined && q.y < 0.5)) continue;
        n++;
        const h0 = surf.height(q.x, q.z);
        let worst = 0;
        for (let a = 0; a < 8; a++) worst = Math.max(worst, Math.abs(surf.height(q.x + Math.cos(a * 0.785) * 2, q.z + Math.sin(a * 0.785) * 2) - h0) / 2);
        if (worst > 0.35) steep++;
      }
    }
    expect(n).toBeGreaterThan(40);
    expect(steep / n).toBeLessThan(0.03);
  });

  it('installe le moulin à vent sur un point haut et dégagé', async () => {
    const { Z } = await import('../src/world/islands/gen/zones.js');
    const ranks = [];
    for (const { p } of await samplePlans()) {
      const m = p.pois.find((q) => q.type === 'moulin_vent');
      if (!m) continue;
      const y = m.parts[0].y;
      const land = [];
      for (let k = 0; k < p.H.length; k++) if (p.H[k] > 0.5) land.push(p.H[k]);
      ranks.push(land.filter((h) => h < y).length / land.length);
      const k = Math.round((m.z + p.ext) / p.s) * p.n + Math.round((m.x + p.ext) / p.s);
      expect(p.Z[k]).not.toBe(Z.FORET);
    }
    ranks.sort((a, b) => a - b);
    expect(ranks.length).toBeGreaterThanOrEqual(6);
    expect(ranks[0]).toBeGreaterThan(0.35); // jamais dans le tiers le plus bas
    expect(ranks[ranks.length >> 1]).toBeGreaterThan(0.85);
  });

  it('bâtit chaque village près d’une anse, avec sa jetée et ses barques', async () => {
    const { bilinear } = await import('../src/world/islands/gen/grid.js');
    let n = 0;
    for (const { d, p } of await samplePlans()) {
      const vil = p.pois.find((q) => q.type === 'village');
      if (!vil) continue;
      n++;
      expect(vil.jetty, d.id).toBeTruthy();
      const { x, z, rot, len } = vil.jetty;
      expect(Math.hypot(x - vil.x, z - vil.z), d.id).toBeLessThan(vil.r + 40);
      // la jetée part du rivage et s'avance dans l'eau
      const hAt = (px, pz) => bilinear(p.H, p.n, (px + p.ext) / p.s, (pz + p.ext) / p.s);
      expect(hAt(x, z)).toBeLessThan(1.5);
      expect(hAt(x + Math.cos(rot) * len, z + Math.sin(rot) * len), d.id).toBeLessThan(0);
      expect(vil.parts.filter((q) => q.t === 'maison').length).toBeGreaterThanOrEqual(4);
      expect(vil.parts.some((q) => q.t === 'barque_amarree')).toBe(true);
      const mill = p.pois.some((q) => q.type === 'moulin_vent' || q.type === 'moulin_eau');
      expect(mill, d.id).toBe(true);
    }
    expect(n).toBeGreaterThanOrEqual(6);
  });
});

describe('chemins', () => {
  it('relient les lieux de l’île d’essai à l’accostage', async () => {
    for (const { d, p } of (await samplePlans()).filter(({ d }) => !d.id.includes('~'))) {
      expect(p.failedLinks, d.id).toEqual([]);
      expect(p.stats.pathFailed, d.id).toBe(0);
      expect(p.pois.filter((q) => q.byBoat), d.id).toEqual([]);
      if (p.pois.length > 1) expect(p.paths.length, d.id).toBeGreaterThan(0);
    }
  });

  it('restent sains sur les variantes (îles retouchées)', async () => {
    let boat = 0;
    let total = 0;
    for (const { d, p } of await samplePlans()) {
      expect(p.failedLinks, d.id).toEqual([]);
      expect(p.stats.pathFailed).toBe(0);
      total += p.pois.length;
      boat += p.pois.filter((q) => q.byBoat).length;
    }
    expect(boat / total).toBeLessThan(0.02);
  });
});

describe('identifiants', () => {
  it('sont stables et uniques (arbres, lieux, petite végétation des tuiles)', async () => {
    const { ILE_ESSAI: d } = await import('./fixtures/ile-essai.js');
    const { buildPlan } = await fresh('../src/world/islands/gen/plan.js');
    const { Surface, buildTile, TILE } = await import('../src/world/islands/gen/surface.js');
    const a = buildPlan(d);
    const b = buildPlan({ ...d });
    expect(hash(b.ids)).toBe(hash(a.ids));
    expect(b.pois.map((q) => q.id)).toEqual(a.pois.map((q) => q.id));
    const seen = new Set(a.ids);
    expect(seen.size).toBe(a.ids.length);
    for (const q of a.pois) {
      expect(seen.has(q.id)).toBe(false);
      seen.add(q.id);
    }
    // les tuiles donnent les mêmes identifiants à chaque construction, sans collision
    const surf = new Surface(a);
    const nt = Math.ceil(a.ext / TILE);
    let small = 0;
    for (let tz = -nt; tz < nt; tz++) {
      for (let tx = -nt; tx < nt; tx++) {
        const t1 = buildTile(a, surf, tx, tz);
        const t2 = buildTile(a, surf, tx, tz);
        expect(hash(t2.ids)).toBe(hash(t1.ids));
        for (const id of t1.ids) {
          expect(seen.has(id)).toBe(false);
          seen.add(id);
          small++;
        }
      }
    }
    expect(small).toBeGreaterThan(1000);
  }, 30000);
});

describe('champs de fleurs', () => {
  it('forme des nappes denses, colorées et stables, plus étendues dans les prés fleuris', async () => {
    const { ILE_ESSAI } = await import('./fixtures/ile-essai.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { Surface, buildTile, TILE } = await import('../src/world/islands/gen/surface.js');
    const { KINDS, STRIDE } = await import('../src/world/islands/gen/kinds.js');
    const { Z } = await import('../src/world/islands/gen/zones.js');
    const { fieldFlowerGeometry } = await import('../src/models/plantes/fleurs/index.js');
    const plan = buildPlan(ILE_ESSAI);
    const surf = new Surface(plan);
    const flowerKind = KINDS.indexOf('fleur_champ');
    const nt = Math.ceil(plan.ext / TILE);
    const hues = new Set();
    let flowerCount = 0;
    let flowerArea = 0;
    const flowersPerTile = [];
    const fieldShares = [];
    for (const zone of plan.Z) if (zone === Z.FLEURS) flowerArea += plan.s * plan.s;
    const center = buildTile(plan, surf, 0, 0);
    const repeated = buildTile(plan, surf, 0, 0);
    expect(hash(repeated.items)).toBe(hash(center.items));
    expect(hash(repeated.ids)).toBe(hash(center.ids));
    const tileCoords = [];
    for (let tz = -nt; tz < nt; tz++) for (let tx = -nt; tx < nt; tx++) tileCoords.push([tx, tz]);
    for (const [tx, tz] of tileCoords) buildTile(plan, surf, tx, tz);
    const flowerGeometry = fieldFlowerGeometry();
    const trianglesPerTuft = Math.round((flowerGeometry.index ? flowerGeometry.index.count : flowerGeometry.attributes.position.count) / 3);
    for (const [tx, tz] of tileCoords) {
      const tile = buildTile(plan, surf, tx, tz);
      let flowersInTile = 0;
      for (let k = 0; k < tile.items.length; k += STRIDE) {
        if (tile.items[k] !== flowerKind) continue;
        flowersInTile++;
        const x = Math.floor(tile.items[k + 1]);
        const z = Math.floor(tile.items[k + 3]);
        const zi = Math.max(0, Math.min(plan.n - 1, Math.round((z + plan.ext) / plan.s)));
        const xi = Math.max(0, Math.min(plan.n - 1, Math.round((x + plan.ext) / plan.s)));
        if (plan.Z[zi * plan.n + xi] === Z.FLEURS) flowerCount++;
      }
      flowersPerTile.push(flowersInTile);
      for (const group of tile.groups) {
        if (group.ki !== flowerKind) continue;
        for (let k = 0; k < group.cols.length; k += 3) hues.add(`${group.cols[k].toFixed(2)},${group.cols[k + 1].toFixed(2)},${group.cols[k + 2].toFixed(2)}`);
      }
    }
    // 3,2 fleurs par m² visées (surface.js), moins les chemins et l'eau
    expect(flowerCount / flowerArea).toBeGreaterThan(2.7);
    expect(flowerCount / flowerArea).toBeLessThan(3.3);
    expect(hues.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...flowersPerTile) * trianglesPerTuft).toBeLessThan(800_000);

    // part des prés en fleurs selon la zone de l'île (fleurs de archipel.js) : prés fleuris > côte
    for (let zi = 0; zi < plan.zones.length; zi++) {
      let open = 0;
      let blooms = 0;
      for (let k = 0; k < plan.Z.length; k++) {
        if (plan.ZI[k] !== zi) continue;
        if (plan.Z[k] === Z.PRAIRIE || plan.Z[k] === Z.FLEURS) open++;
        if (plan.Z[k] === Z.FLEURS) blooms++;
      }
      fieldShares.push(open ? blooms / open : 0);
    }
    const [cote, , pres] = fieldShares;
    expect(cote).toBeGreaterThan(0.04);
    expect(pres).toBeGreaterThan(cote * 2.5);
  }, 30000);
});

// chronométré : suite à part (npm run test:chronos), la mesure dépend de la charge de la machine
describe.runIf(process.env.CHRONOS === '1')('[chrono] budget du Worker', () => {
  it('construit plan + LOD1 d’une île en moins de 60 ms en moyenne, le plan de la Grande Île en moins de 3 s, une section en moins de 30 ms, une tuile en moins de 15 ms', async () => {
    const { ILES, ISLANDS } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { Surface, buildLOD1, buildTile, TILE } = await import('../src/world/islands/gen/surface.js');
    const { cropPlan } = await import('../src/world/islands/gen/sections.js');
    const { SECTION_MIN_R } = await import('../src/world/islands/gen/forme.js');
    const time = (f) => {
      const t0 = performance.now();
      f();
      return performance.now() - t0;
    };
    // îles entières (non découpées) : comme le Worker, plan puis LOD1
    const small = ILES.filter((d) => d.r < SECTION_MIN_R);
    for (const d of small) buildLOD1(buildPlan(d)); // chauffe du compilateur
    const all = small.map((d) => time(() => buildLOD1(buildPlan({ ...d, id: `${d.id}-bench` }))));
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    // Grande Île : plan entier une fois par partie (Worker), puis chaque section taillée dans le plan
    const big = ILES.find((d) => d.id === 'grande-ile');
    let P = null;
    const plan = time(() => (P = buildPlan({ ...big, id: 'grande-ile-bench' })));
    const secs = ISLANDS.filter((q) => q.parent === big.id);
    const crops = secs.map((q) => time(() => buildLOD1(cropPlan(P, q)))).sort((a, b) => a - b);
    // tuiles d'une section du milieu
    const p = cropPlan(P, secs[secs.length >> 1]);
    const surf = new Surface(p);
    const nt = Math.ceil(p.ext / TILE);
    const tiles = [];
    for (let tz = -nt; tz < nt; tz++) for (let tx = -nt; tx < nt; tx++) tiles.push(time(() => buildTile(p, surf, tx, tz)));
    tiles.sort((a, b) => a - b);
    console.info(`Worker : plan + LOD1 moyenne ${avg.toFixed(1)} ms (${small.length} îles), pire ${Math.max(...all).toFixed(1)} ms ; Grande Île : plan ${plan.toFixed(0)} ms, section + LOD1 médiane ${crops[crops.length >> 1].toFixed(1)} ms, pire ${crops[crops.length - 1].toFixed(1)} ms (${secs.length} sections) ; tuile médiane ${tiles[tiles.length >> 1].toFixed(1)} ms, p95 ${tiles[Math.floor(tiles.length * 0.95)].toFixed(1)} ms`);
    expect(avg).toBeLessThan(60);
    expect(Math.max(...all)).toBeLessThan(250);
    expect(plan).toBeLessThan(3000);
    expect(crops[crops.length - 1]).toBeLessThan(30);
    expect(tiles[Math.floor(tiles.length * 0.95)]).toBeLessThan(15);
  }, 120000);
});

describe('fenêtre de profondeur', () => {
  it('encode les hauteurs en demi-flottants', async () => {
    const { toHalf, halfToFloat } = await import('../src/world/islands/gen/surface.js');
    expect(toHalf(0)).toBe(0);
    expect(toHalf(1)).toBe(0x3c00);
    expect(toHalf(-2)).toBe(0xc000);
    expect(toHalf(0.5)).toBe(0x3800);
    expect(halfToFloat(toHalf(-12.5))).toBeCloseTo(-12.5, 2);
  });
});
