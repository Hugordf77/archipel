// Aide « Collisions » du catalogue : la physique de chaque modèle telle que le jeu l'emploie (obstacles
// des lieux et de l'île de départ, encombrement de la végétation et du décor, planchers des ponts) et
// son dessin.
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from './helpers/canvas.js';

installCanvasStub();
let R;
let C;
let deps;
beforeAll(async () => {
  R = await import('../src/models/registry.js');
  C = await import('../catalogue/collisions.js');
  const { partModel } = await import('../src/models/lieux.js');
  const { KIND_RADIUS } = await import('../src/world/islands/gen/kinds.js');
  const { CATALOG } = await import('../src/models/decor/index.js');
  const physiques = {};
  for (const m of R.MODELS) {
    const f = m.source.replace(/index\.js$/, 'physique.js');
    if (fs.existsSync(new URL(`../${f}`, import.meta.url))) physiques[f] = (await import(`../${f}`)).default;
  }
  deps = { partModel, KIND_RADIUS, CATALOG, physiques };
});
const phys = (id, params) => {
  const m = R.BY_ID.get(id);
  return C.physiqueDe(m, params ?? R.defaultParams(m), deps);
};

describe('aide « Collisions » du catalogue', () => {
  it('lit la physique du jeu : obstacles des lieux, encombrement des espèces et du décor, planchers', () => {
    expect(phys('BAT-001').obstacles).toEqual([[0, 0, Math.max(3.2, 3.0) * 0.55]]);
    expect(phys('BAT-001', { v: 2 }).obstacles[0][2]).toBeCloseTo(4.6 * 0.55);
    expect(phys('ARB-001').encombrement).toBe(0.55);
    expect(phys('DEC-001').encombrement).toBe(0.45);
    expect(phys('STR-001').planchers).toHaveLength(1);
    expect(phys('STR-004').planchers[0].sag).toBeGreaterThan(0);
    expect(phys('BAT-002').obstacles).toEqual([[0, 0, 2.55], [-2.0, 2.6, 0.3]]); // île de départ
    expect(phys('STR-023').obstacles).toHaveLength(2);
    expect(phys('ANI-001')).toEqual({ obstacles: [], encombrement: null, planchers: [] });
  });

  it('donne une physique à chaque lieu, espèce, article et pièce de l’île de départ qui en a une', () => {
    for (const m of R.MODELS) {
      const p = C.physiqueDe(m, R.defaultParams(m), deps);
      for (const [x, z, r] of p.obstacles) expect([x, z, r].every(Number.isFinite) && r > 0, m.id).toBe(true);
      if (m.ref.startsWith('kind:')) expect(typeof deps.KIND_RADIUS[m.ref.slice(5)], m.id).toBe('number');
      for (const d of p.planchers) expect(d.w, m.id).toBeGreaterThan(0);
    }
  });

  it('dessine une colonne par obstacle, un cercle d’encombrement et un ruban par plancher', () => {
    const g = C.objetCollisions({ obstacles: [[0, 0, 1], [2, 0, 0.5]], encombrement: 0.6, planchers: phys('STR-004').planchers }, 1.8);
    expect(g.children.filter((c) => c.isGroup)).toHaveLength(2);
    expect(g.children.filter((c) => c.isLineLoop && c.material.isLineDashedMaterial)).toHaveLength(1);
    const ruban = g.children.find((c) => c.isMesh);
    expect(ruban.geometry.attributes.position.count).toBe(2 * 25); // pont de corde : courbe en 24 pas
    for (const c of g.children) if (c.material) expect(c.material.depthTest).toBe(false);
  });
});
