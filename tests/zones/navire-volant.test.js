// Le Navire-forteresse en vol autour du Plateau venté (src/world/plateau/forteresse-navire.js,
// NavireVolant.js) : trajectoire, hauteur au-dessus du vrai relief (buildPlan de la Grande Île), éléments
// constructibles dans les deux versions, budget de la forteresse-navire tenu.
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from '../helpers/canvas.js';
import { ILE_BY_ID } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { partModel } from '../../src/models/lieux.js';
import { ELEMENTS, VOL, vol } from '../../src/world/plateau/forteresse-navire.js';

installCanvasStub();

let P;
beforeAll(() => {
  P = buildPlan(ILE_BY_ID.get('grande-ile'));
});

const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
const sol = (x, z) => {
  const [i, j] = [Math.round((x + P.ext) / P.s), Math.round((z + P.ext) / P.s)];
  return i < 0 || j < 0 || i >= P.n || j >= P.n ? 0 : P.H[j * P.n + i];
};

describe('navire volant du Plateau venté', () => {
  it('fait le tour du dôme, la proue dans le sens de la marche', () => {
    const [a, b] = [vol(0), vol(VOL.tour)];
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
    for (let t = 0; t < VOL.tour; t += 7) {
      const s = vol(t);
      expect(Math.hypot(s.x - VOL.centre[0], s.z - VOL.centre[1])).toBeCloseTo(VOL.rayon, 6);
      const n = vol(t + 0.5);
      // la proue (direction rot) va vers la position suivante
      expect(Math.cos(s.rot) * (n.x - s.x) + Math.sin(s.rot) * (n.z - s.z)).toBeGreaterThan(0);
    }
  });

  it('vole à plus de 25 m au-dessus du relief sous toute son emprise', () => {
    let marge = Infinity;
    for (let t = 0; t < VOL.tour; t += 2) {
      const s = vol(t);
      const [c, sn] = [Math.cos(s.rot), Math.sin(s.rot)];
      // emprise : 22 m de large, de la poupe au bout du beaupré
      for (let dz = -33; dz <= 43; dz += 4) {
        for (let dx = -11; dx <= 11; dx += 4) {
          const [x, z] = [s.x + dz * c + dx * sn, s.z + dz * sn - dx * c];
          marge = Math.min(marge, s.y - sol(x, z));
        }
      }
    }
    expect(marge).toBeGreaterThan(25);
  });

  it('sait construire chaque élément, de près et allégé, dans le budget de la forteresse-navire', () => {
    expect(ELEMENTS.map((e) => e.t)).not.toContain('navire_escalier');
    let total = 0;
    for (const v of [0, 1]) {
      for (const e of ELEMENTS) {
        const m = partModel({ t: e.t, forme: e.forme, v, vol: e.vol, x: 0, z: 0, y: 0, rot: 0 });
        expect(m.solid.parts.length, `${e.t} ${e.forme} v${v}`).toBeGreaterThan(0);
        if (v === 0) total += tris(m.solid.build());
      }
    }
    expect(total).toBeLessThanOrEqual(60000);
    // en vol, la coque n'a pas de berceau
    const coque = (vol) => tris(partModel({ t: 'navire_coque', x: 0, z: 0, vol }).solid.build());
    expect(coque(true)).toBeLessThan(coque(false));
  });
});
