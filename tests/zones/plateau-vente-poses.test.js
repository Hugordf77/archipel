// Lieux posés à la main sur le Plateau venté (desc.poses de la Grande Île, src/world/archipel.js ;
// gen/pois.js, poserLieux) : trois moulins-tours (BAT-013) sur les sites PV-M1 à M3 du plan
// (production/fiches/ZONE-ILE-VERTE.json) et la nef effondrée (MON-014). Vrai plan (buildPlan), vraies
// sections (cropPlan) ; comparaison avec le plan de la même île sans poses : rien ne change loin d'elles.
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from '../helpers/canvas.js';
import { ILE_BY_ID, ISLANDS } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { cropPlan } from '../../src/world/islands/gen/sections.js';
import { STRIDE } from '../../src/world/islands/gen/kinds.js';
import { partModel } from '../../src/models/lieux.js';

installCanvasStub();

const d = ILE_BY_ID.get('grande-ile');
let P;
let sans;
beforeAll(() => {
  P = buildPlan(d);
  const { poses, ...nu } = d;
  sans = buildPlan(nu);
});

const cell = (Q, x, z) => Math.round((z + Q.ext) / Q.s) * Q.n + Math.round((x + Q.ext) / Q.s);

describe('lieux posés sur le Plateau venté', () => {
  it('pose trois moulins-tours et la nef effondrée, dans la zone du plateau', () => {
    const ZPL = P.zones.indexOf('plateau-vente');
    expect(P.pois.map((p) => p.type).sort()).toEqual(['moulin_tour', 'moulin_tour', 'moulin_tour', 'ruines_alternative']);
    for (const p of P.pois) {
      expect(d.poses.some((q) => q.at[0] === p.x && q.at[1] === p.z), p.label).toBe(true);
      expect(P.ZI[cell(P, p.x, p.z)], p.label).toBe(ZPL);
      expect(p.parts).toHaveLength(1);
      // chaque élément sait se construire, avec ses obstacles
      expect(partModel(p.parts[0]).obstacles.length, p.label).toBeGreaterThan(0);
    }
    expect(new Set(P.pois.map((p) => p.id)).size).toBe(4);
  });

  it('aplanit le site de chaque lieu à sa hauteur, sans arbre dessus', () => {
    for (const p of P.pois) {
      // plate-forme : cases à moins de 0,7 r du centre à ± 5 cm de la hauteur du lieu
      for (let u = -p.r * 0.7; u <= p.r * 0.7; u += P.s) {
        for (let v = -p.r * 0.7; v <= p.r * 0.7; v += P.s) {
          if (u * u + v * v > (p.r * 0.7) ** 2) continue;
          expect(Math.abs(P.H[cell(P, p.x + u, p.z + v)] - p.y), `${p.label} (${u}, ${v})`).toBeLessThan(0.05);
        }
      }
      for (let k = 0; k < P.items.length; k += STRIDE) {
        expect(Math.hypot(P.items[k + 1] - p.x, P.items[k + 3] - p.z), p.label).toBeGreaterThan(p.r * 0.9);
      }
    }
  });

  it('ne change le relief que sous les lieux (r + chute + une case)', () => {
    let ecarts = 0;
    for (let k = 0; k < P.H.length; k++) {
      if (P.H[k] === sans.H[k]) continue;
      const x = -P.ext + (k % P.n) * P.s;
      const z = -P.ext + Math.floor(k / P.n) * P.s;
      if (!P.pois.some((p) => Math.hypot(x - p.x, z - p.z) <= p.r + 6 + P.s)) ecarts++;
    }
    expect(ecarts).toBe(0);
  });

  it('garde chaque lieu dans une seule section, recentré', () => {
    const vus = new Map();
    for (const sec of ISLANDS.filter((q) => q.parent === 'grande-ile')) {
      const { cx, cz } = sec.section;
      for (const p of cropPlan(P, sec).pois) {
        expect(vus.has(p.id), p.label).toBe(false);
        vus.set(p.id, p);
        const entier = P.pois.find((q) => q.id === p.id);
        expect(p.x + cx).toBeCloseTo(entier.x, 6);
        expect(p.parts[0].z + cz).toBeCloseTo(entier.parts[0].z, 6);
      }
    }
    expect(vus.size).toBe(P.pois.length);
  });
});
