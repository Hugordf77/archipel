// Îles célestes : îles flottantes marchables (relief, maillage, arbres, sol à la hauteur du joueur).
import { describe, it, expect } from 'vitest';
import { ARCHIPEL } from '../src/world/archipel.js';
import { cielAt, cielContext, dessusAt, buildCielMesh, placeCiel, ruisseauDe, STRIDE } from '../src/world/ciel/relief.js';
import { groundAt, waterDepth, setGroundRef, addObstacle, removeObstacle, obstacleAt } from '../src/world/navigation.js';
import { KINDS } from '../src/world/islands/gen/kinds.js';
import { ZONE_BY_ID } from '../src/world/archipel.js';

describe('îles célestes', () => {
  it('flottent au-dessus de la mer, au nord, dans la zone des Îles célestes, sans se toucher', () => {
    const Z = ZONE_BY_ID.get('iles-celestes');
    for (const c of ARCHIPEL.ciel) {
      expect(c.alt).toBeGreaterThan(80);
      expect(Math.hypot((c.x - Z.x) / Z.rx, (c.z - Z.z) / Z.rz), c.id).toBeLessThan(1.2);
      for (const d of ARCHIPEL.ciel) if (d !== c) expect(Math.hypot(c.x - d.x, c.z - d.z), `${c.id} / ${d.id}`).toBeGreaterThan(c.r + d.r);
    }
  });

  it('ont un dessus vallonné au-dessus d’un dessous de roche qui pend dans le vide', () => {
    for (const c of ARCHIPEL.ciel) {
      const s = cielAt(c.x, c.z);
      expect(s.ile).toBe(c);
      expect(Math.abs(s.top - c.alt - 3)).toBeLessThan(6);
      expect(c.alt - s.bottom).toBeGreaterThan(c.r * 0.6);
      expect(cielAt(c.x + c.r * 1.3, c.z)).toBe(null);
      // dessus praticable : pente douce au centre
      const k = cielContext(c);
      const sl = Math.abs(dessusAt(k, 4, 0) - dessusAt(k, -4, 0)) / 8;
      expect(sl).toBeLessThan(0.5);
    }
  });

  it('donnent un maillage fermé et sain (dessus tourné vers le ciel)', () => {
    const c = ARCHIPEL.ciel[0];
    const m = buildCielMesh(c);
    for (const v of m.positions) expect(Number.isFinite(v)).toBe(true);
    for (const i of m.index) expect(i).toBeLessThan(m.positions.length / 3);
    // centre du dessus : normale vers le haut ; pointe du dessous : vers le bas
    expect(m.normals[1]).toBeGreaterThan(0.8);
    expect(m.normals[m.normals.length - 2]).toBeLessThan(-0.5);
  });

  it('portent arbres et décor sur le dessus, loin du bord et du ruisseau, toujours les mêmes', () => {
    for (const c of ARCHIPEL.ciel) {
      const a = placeCiel(c);
      const b = placeCiel(c);
      expect(a.items).toEqual(b.items);
      expect(a.ids.length).toBeGreaterThan(5);
      const r = ruisseauDe(c);
      for (let k = 0; k < a.items.length; k += STRIDE) {
        expect(KINDS[a.items[k]]).toBeTruthy();
        const s = cielAt(c.x + a.items[k + 1], c.z + a.items[k + 3]);
        expect(s).not.toBe(null);
        expect(Math.abs(s.top - a.items[k + 2])).toBeLessThan(0.01);
        if (r) expect(r.near(a.items[k + 1], a.items[k + 3])).toBeGreaterThan(2.9);
      }
    }
    expect(ARCHIPEL.ciel.filter((c) => ruisseauDe(c)).length).toBeGreaterThanOrEqual(2);
  });

  it('se marchent dessus, mais pas d’en dessous : le sol dépend de la hauteur du joueur', () => {
    const c = ARCHIPEL.ciel[0];
    const top = cielAt(c.x, c.z).top;
    setGroundRef(top + 1);
    expect(groundAt(c.x, c.z).y).toBeCloseTo(top, 5);
    expect(waterDepth(c.x, c.z)).toBe(0);
    // juste au-delà du bord : le vide jusqu'à la mer
    expect(groundAt(c.x + c.r * 1.3, c.z).y).toBeLessThan(0);
    // en bateau dessous : la mer
    setGroundRef(0.5);
    expect(groundAt(c.x, c.z).y).toBeLessThan(0);
    expect(waterDepth(c.x, c.z)).toBeGreaterThan(1);
    // un arbre de l'île ne gêne que qui marche dessus
    const o = addObstacle({ x: c.x + 3, z: c.z, r: 0.6, ymin: c.alt - 12 });
    expect(obstacleAt(c.x + 3, c.z)).toBe(null);
    setGroundRef(top + 1);
    expect(obstacleAt(c.x + 3, c.z)).toBe(o);
    removeObstacle(o);
    setGroundRef(0);
  });
});
