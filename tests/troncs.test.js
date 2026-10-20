// Troncs grimpables : la polyligne grimpe des physique.js (et celle des palmiers de l'île de départ)
// face au maillage réel, la table GRIMPE, et le raccord aux obstacles des îles (un tronc disparaît
// avec son obstacle).
import * as THREE from 'three';
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from './helpers/canvas.js';

installCanvasStub();

// point de la polyligne [x, y, z, r] le plus proche de (px, py, pz) : distance à l'axe, rayon interpolé
function surAxe(pts, px, py, pz) {
  let best = { d: Infinity, r: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, az, ar] = pts[i];
    const [bx, by, bz, br] = pts[i + 1];
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const t = Math.min(1, Math.max(0, ((px - ax) * ux + (py - ay) * uy + (pz - az) * uz) / (ux * ux + uy * uy + uz * uz)));
    const d = Math.hypot(px - ax - ux * t, py - ay - uy * t, pz - az - uz * t);
    if (d < best.d) best = { d, r: ar + (br - ar) * t };
  }
  return best;
}

// sommets d'une géométrie (Builder : couleur par sommet) de l'une des couleurs données, passés par m
function sommets(geo, couleurs, m = null) {
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  const cs = couleurs.map((c) => new THREE.Color(c));
  const v = new THREE.Vector3();
  const out = [];
  for (let i = 0; i < pos.count; i++) {
    const ok = cs.some((c) => Math.abs(col.getX(i) - c.r) < 1e-4 && Math.abs(col.getY(i) - c.g) < 1e-4 && Math.abs(col.getZ(i) - c.b) < 1e-4);
    if (!ok) continue;
    v.fromBufferAttribute(pos, i);
    if (m) v.applyMatrix4(m);
    out.push([v.x, v.y, v.z]);
  }
  return out;
}

// écarts au maillage : centres des disques de chaque tronçon sur l'axe, cercles d'écorce au rayon r
function ecarts(pts, verts) {
  let axe = 0;
  let ecorce = 0;
  let n = 0;
  for (const [x, y, z] of verts) {
    const { d, r } = surAxe(pts, x, y, z);
    if (d < 0.05) axe = Math.max(axe, d);
    else {
      ecorce = Math.max(ecorce, Math.abs(d - r));
      n++;
    }
  }
  return { axe, ecorce, n };
}

let GRIMPE;
let KINDS;
beforeAll(async () => {
  ({ GRIMPE } = await import('../src/models/physique.gen.js'));
  ({ KINDS } = await import('../src/world/islands/gen/kinds.js'));
});

describe('troncs grimpables : données face au maillage', () => {
  it('le stipe du palmier reprend la courbe de palmier() et suit son maillage à 1 cm près', async () => {
    const { palmier } = await import('../src/models/arbres/palmier/index.js');
    const { grimpe } = (await import('../src/models/arbres/palmier/physique.js')).default;
    expect(grimpe.tronc).toHaveLength(7);
    grimpe.tronc.forEach(([x, y, z], i) => {
      const t = i / 6;
      expect(x).toBeCloseTo(Math.pow(t, 1.6) * 0.75, 3);
      expect(y).toBeCloseTo(4.2 * t, 3);
      expect(z).toBe(0);
    });
    expect(grimpe.sommet).toEqual({ y: 4.2, pose: 'poirier' });
    const verts = sommets(palmier().solid, ['#d8b58b', '#cfa77c']);
    const e = ecarts(grimpe.tronc, verts);
    expect(e.n).toBeGreaterThan(300);
    expect(e.axe).toBeLessThanOrEqual(0.01);
    expect(e.ecorce).toBeLessThanOrEqual(0.01);
    // le stipe couvre toute la hauteur du maillage, du pied au sommet (le cercle du haut, incliné
    // avec le stipe, dépasse 4,2 m d'au plus son rayon)
    const ys = verts.map((v) => v[1]);
    expect(Math.min(...ys)).toBeGreaterThan(-0.02);
    expect(Math.max(...ys)).toBeLessThan(4.2 + 0.118);
    expect(Math.max(...ys)).toBeGreaterThan(4.2);
  });

  it('les six palmiers de l’île de départ exposent leur stipe, qui suit leur maillage à 1 cm près', async () => {
    const { buildProps, PALMIER_MAISON } = await import('../src/world/home/props.js');
    const { PAL } = await import('../src/models/kit/palette.js');
    const { troncMonde } = await import('../src/world/navigation.js');
    const { mesh, obstacles } = buildProps();
    const palmiers = obstacles.filter((o) => o.grimpe);
    expect(palmiers).toHaveLength(6);
    const tous = sommets(mesh.geometry, [PAL.palmTrunk]);
    for (const o of palmiers) {
      expect(o.grimpe.kind).toBe('palmier_maison');
      expect(o.grimpe.def).toBe(PALMIER_MAISON);
      const w = troncMonde(o.grimpe);
      expect(w.pts[0][0]).toBeCloseTo(o.x, 6);
      expect(w.pts[0][2]).toBeCloseTo(o.z, 6);
      // penché vers l'extérieur de l'île : le sommet est 1,8 m plus loin du centre que le pied
      const [tx, ty, tz] = w.pts[6];
      expect(Math.hypot(tx, tz) - Math.hypot(o.x, o.z)).toBeCloseTo(1.8, 3);
      expect(ty - w.pts[0][1]).toBeCloseTo(4.3, 3);
      expect(w.sommetY).toBeCloseTo(ty, 3);
      const verts = tous.filter(([x, y, z]) => surAxe(w.pts, x, y, z).d < 0.6);
      const e = ecarts(w.pts, verts);
      expect(e.n, `${o.x}, ${o.z}`).toBeGreaterThan(300);
      expect(e.axe).toBeLessThanOrEqual(0.01);
      expect(e.ecorce).toBeLessThanOrEqual(0.01);
    }
  });

  it('GRIMPE ne donne un tronc qu’à des espèces d’arbre à tronc dégagé, au format attendu', () => {
    expect(GRIMPE.palmier).toBeTruthy();
    const permis = new Set(['palmier', 'pin', 'pin_givre', 'sapin_neige', 'bouleau', 'erable', 'arbre_cerisier', 'arbre_fruitier', 'arbre_pompon', 'bambou', 'fougere_arbo']);
    for (const [k, g] of Object.entries(GRIMPE)) {
      expect(KINDS, k).toContain(k);
      expect(permis.has(k), k).toBe(true);
      expect(g.tronc.length, k).toBeGreaterThanOrEqual(2);
      expect(g.tronc[0][1], k).toBe(0);
      for (let i = 1; i < g.tronc.length; i++) expect(g.tronc[i][1], k).toBeGreaterThan(g.tronc[i - 1][1]);
      for (const p of g.tronc) expect(p[3], k).toBeGreaterThan(0);
      expect(['poirier', 'suspendu'], k).toContain(g.sommet.pose);
      expect(g.sommet.y, k).toBeGreaterThan(0.3);
      expect(g.sommet.y, k).toBeLessThanOrEqual(g.tronc.at(-1)[1] + 1e-9);
    }
    // jamais : buissons, cactus, champignons, rochers, souches
    for (const k of ['arbuste', 'buisson_baies', 'buisson_fleuri', 'cactus', 'cactus_fleur', 'champi_geant', 'champi_petit', 'rocher', 'rocher_mousse', 'souche', 'bois_mort', 'saule']) {
      expect(GRIMPE[k], k).toBeUndefined();
    }
  });
});

describe('troncs grimpables : raccord aux obstacles des îles', () => {
  // une île réduite à un palmier, posé par buildKind comme en jeu
  async function ileAUnPalmier({ x = 12, y = 3.5, z = -7, rot = 0.8, sc = 1.2 } = {}) {
    const { IslandManager } = await import('../src/world/islands/IslandManager.js');
    const { KIND_INDEX, STRIDE } = await import('../src/world/islands/gen/kinds.js');
    const nav = await import('../src/world/navigation.js');
    nav.setObstacles([]);
    const items = new Float32Array(STRIDE);
    items.set([KIND_INDEX.palmier, x, y, z, rot, sc, 0.5]);
    const mat = new THREE.MeshBasicMaterial();
    const man = Object.create(IslandManager.prototype);
    man.entries = new Map([['ile-test', {}]]);
    man.mats = { solid: mat, glow: mat, foliage: mat, grass: mat, flower: mat, proxy: mat };
    const e = { desc: { id: 'ile-test', x: 300, z: -200, biome: 'tropical' }, plan: { items }, hidden: new Set() };
    const ctx = { kinds: new Map(), slotOf: new Map(), obstacles: [], crowns: [], proxyOf: new Map(), idx: new Map([[0, 0]]) };
    const near = new THREE.Group();
    while (man.buildKind(e, near, e.plan, KIND_INDEX.palmier, [0], ctx, { i: 0 }));
    e.items = ctx;
    e.obstacles = ctx.obstacles;
    nav.addObstacles(e.obstacles);
    return { man, e, ctx, near, nav };
  }

  it('l’obstacle d’un palmier d’île porte son tronc, placé comme l’instance dessinée', async () => {
    const { ctx, near, nav } = await ileAUnPalmier();
    const o = ctx.obstacles[0];
    expect(o.grimpe).toMatchObject({ kind: 'palmier', x: 312, z: -207 });
    expect(o.grimpe.rot).toBeCloseTo(0.8, 6);
    expect(o.grimpe.sc).toBeCloseTo(1.2, 6);
    expect(o.grimpe.y).toBeCloseTo(3.5 - 0.04, 6);
    expect(o.grimpe.def).toBe(GRIMPE.palmier);
    // le tronc monde suit le maillage de l'instance (matrice d'instance, île en (300, 0, -200))
    const im = near.children.find((c) => c.isInstancedMesh && c.name === 'palmier');
    const m = new THREE.Matrix4();
    im.getMatrixAt(0, m);
    m.premultiply(new THREE.Matrix4().makeTranslation(300, 0, -200));
    const verts = sommets(im.geometry, ['#d8b58b', '#cfa77c'], m);
    const e = ecarts(nav.troncMonde(o.grimpe).pts, verts);
    expect(e.n).toBeGreaterThan(300);
    expect(e.axe).toBeLessThanOrEqual(0.01 * 1.2);
    expect(e.ecorce).toBeLessThanOrEqual(0.01 * 1.2);
  });

  it('le tronc disparaît avec son obstacle quand l’arbre est coupé, et revient à la repousse', async () => {
    const { man, e, ctx, nav } = await ileAUnPalmier();
    const o = ctx.obstacles[0];
    expect(nav.obstacleAt(o.x, o.z, 0.1)?.grimpe).toBe(o.grimpe);
    expect(man.setItemVisible(e, { tile: null, idx: 0 }, false)).toBe(true);
    expect(nav.obstacleAt(o.x, o.z, 0.1)).toBeNull();
    man.setItemVisible(e, { tile: null, idx: 0 }, true);
    expect(nav.obstacleAt(o.x, o.z, 0.1)?.grimpe).toBe(o.grimpe);
    // île déchargée : ses obstacles, troncs compris, quittent la navigation
    nav.removeObstacles(e.obstacles);
    expect(nav.obstacleAt(o.x, o.z, 0.1)).toBeNull();
  });
});
