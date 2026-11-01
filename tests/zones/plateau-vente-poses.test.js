// Lieux posés à la main sur le Plateau venté (desc.poses de la Grande Île, src/world/archipel.js ;
// gen/pois.js, poserLieux) : trois moulins-tours (BAT-013) sur les sites PV-M1 à M3 du plan
// (production/fiches/ZONE-ILE-VERTE.json), la nef effondrée (MON-014) et le Navire-forteresse (BAT-014 à
// 019, lieu composé de plusieurs éléments, src/world/plateau/forteresse-navire.js). Vrai plan (buildPlan), vraies
// sections (cropPlan) ; comparaison avec le plan de la même île sans poses : rien ne change loin d'elles.
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from '../helpers/canvas.js';
import { ILE_BY_ID, ISLANDS } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { cropPlan } from '../../src/world/islands/gen/sections.js';
import { STRIDE } from '../../src/world/islands/gen/kinds.js';
import { partModel } from '../../src/models/lieux.js';
import { NAVIRE, ELEMENTS, versIle } from '../../src/world/plateau/forteresse-navire.js';

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
// plates-formes d'un lieu : la sienne, ou celles de ses sites (lieu composé)
const sites = (p) => p.sites || [{ x: p.x, z: p.z, r: p.r }];

describe('lieux posés sur le Plateau venté', () => {
  it('pose trois moulins-tours, la nef effondrée et le navire, dans la zone du plateau', () => {
    const ZPL = P.zones.indexOf('plateau-vente');
    expect(P.pois.map((p) => p.type).sort()).toEqual(['moulin_tour', 'moulin_tour', 'moulin_tour', 'navire_coque', 'ruines_alternative']);
    for (const p of P.pois) {
      expect(d.poses.some((q) => q.at[0] === p.x && q.at[1] === p.z), p.label).toBe(true);
      for (const q of p.parts) expect(P.ZI[cell(P, q.x, q.z)], `${p.label} ${q.t}`).toBe(ZPL);
      if (p.type === 'navire_coque') continue;
      expect(p.parts).toHaveLength(1);
      // chaque élément sait se construire, avec ses obstacles
      expect(partModel(p.parts[0]).obstacles.length, p.label).toBeGreaterThan(0);
    }
    expect(new Set(P.pois.map((p) => p.id)).size).toBe(5);
  });

  it('pose le navire en un lieu, ses éléments sur le pont, la proue vers rot et l\'escalier côté cercle', () => {
    const p = P.pois.find((q) => q.type === 'navire_coque');
    expect(p.label).toBe('Le Navire-forteresse');
    expect(p.parts).toHaveLength(ELEMENTS.length);
    ELEMENTS.forEach((e, k) => {
      const q = p.parts[k];
      expect([q.t, q.forme], `élément ${k + 1}`).toEqual([e.t, e.forme]);
      expect(q.y - p.y).toBeCloseTo(e.dy, 6);
      expect(q.rot).toBeCloseTo(NAVIRE.rot + e.rot, 6);
      // chaque élément sait se construire dans sa forme
      expect(partModel(q).solid.parts.length, `élément ${k + 1}`).toBeGreaterThan(0);
    });
    // la proue (dz > 0) dans la direction rot, le flanc de l'escalier (dx > 0) vers le cercle de pierres
    const [px, pz] = versIle(NAVIRE, 0, 32);
    expect(Math.atan2(pz - p.z, px - p.x)).toBeCloseTo(NAVIRE.rot - 2 * Math.PI, 6);
    const [fx, fz] = versIle(NAVIRE, 12, 0);
    const cercle = [624, 278];
    expect(Math.hypot(fx - cercle[0], fz - cercle[1])).toBeLessThan(Math.hypot(2 * p.x - fx - cercle[0], 2 * p.z - fz - cercle[1]));
  });

  it('aplanit le site de chaque lieu à sa hauteur, sans arbre dessus', () => {
    for (const p of P.pois) {
      for (const st of sites(p)) {
        // plate-forme : cases à moins de 0,7 r du centre à ± 5 cm de la hauteur du lieu
        for (let u = -st.r * 0.7; u <= st.r * 0.7; u += P.s) {
          for (let v = -st.r * 0.7; v <= st.r * 0.7; v += P.s) {
            if (u * u + v * v > (st.r * 0.7) ** 2) continue;
            expect(Math.abs(P.H[cell(P, st.x + u, st.z + v)] - p.y), `${p.label} (${u}, ${v})`).toBeLessThan(0.05);
          }
        }
        for (let k = 0; k < P.items.length; k += STRIDE) {
          expect(Math.hypot(P.items[k + 1] - st.x, P.items[k + 3] - st.z), p.label).toBeGreaterThan(st.r * 0.9);
        }
      }
    }
  });

  it('ne change le relief que sous les lieux (r + chute + une case)', () => {
    let ecarts = 0;
    for (let k = 0; k < P.H.length; k++) {
      if (P.H[k] === sans.H[k]) continue;
      const x = -P.ext + (k % P.n) * P.s;
      const z = -P.ext + Math.floor(k / P.n) * P.s;
      if (!P.pois.some((p) => sites(p).some((st) => Math.hypot(x - st.x, z - st.z) <= st.r + 6 + P.s))) ecarts++;
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
