// Raccords des sections de la Grande Île (TASK-ILE-VERTE-005, problème P01 du rapport d'intégration de
// ZONE-ILE-VERTE) : le sol physique (IslandManager.heightAt) doit suivre le relief du plan entier le long
// de chaque raccord entre deux sections de 512 m, sans marche invisible.
// Cause du défaut : une section garde deux cases de 4 m de marge (gen/sections.js) ; au-delà de 4 m hors
// de son carré, l'interpolation bicubique y recopie le bord et le relief diverge du plan entier. Le sol
// prenait le maximum de toutes les sections chargées, donc parfois cette marge faussée du voisin.
// Test sur les vrais modules, hors navigateur : vrai plan (buildPlan), vraies sections (sectionsOf via
// ISLANDS, cropPlan), vrai relief au mètre (Surface) et vraie méthode IslandManager.heightAt, appelée sur
// les 30 sections chargées ensemble. Bandes de 8 m de part et d'autre de chaque raccord, pas de 0,5 m.
// Deux îles sectionnées qui se recouvrent (Grande Île et Volcan endormi) : le relief d'une île ne remplace
// jamais celui d'une autre ; le sol vaut le maximum des plans entiers, quel que soit l'ordre de chargement.
import { describe, it, expect, beforeAll } from 'vitest';
import { installCanvasStub } from '../helpers/canvas.js';
import { ILE_BY_ID, ISLANDS } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { cropPlan } from '../../src/world/islands/gen/sections.js';
import { Surface } from '../../src/world/islands/gen/surface.js';
import { SECTION } from '../../src/world/islands/gen/forme.js';
import { tuningFor } from '../../src/entities/locomotion/tuning.js';

installCanvasStub();

const PAS = 0.5; // m entre deux points voisins
const BANDE = 8; // m de part et d'autre du raccord
const TOLERANCE = 0.01; // m : écart admis entre le sol physique et le relief du plan entier
const STEP_UP = tuningFor('realiste').stepUp; // 0,4 m : marche montée automatiquement (motor.js, climbable)

let mesure;

// plans entiers (une fois par île) et sections taillées dedans
const plans = new Map();
function planDe(id) {
  if (!plans.has(id)) {
    const P = buildPlan(ILE_BY_ID.get(id));
    plans.set(id, { P, entier: new Surface(P) });
  }
  return plans.get(id);
}
const sectionsDe = (id) => ISLANDS.filter((q) => q.parent === id);
// gestionnaire réduit à ses entrées, chargées dans l'ordre donné
async function gestionnaire(secs) {
  const { IslandManager } = await import('../../src/world/islands/IslandManager.js');
  const man = Object.create(IslandManager.prototype);
  man.entries = new Map();
  for (const q of secs) {
    const plan = cropPlan(planDe(q.parent).P, q);
    man.entries.set(q.id, { desc: q, plan, surf: new Surface(plan), decks: [] });
  }
  return man;
}

beforeAll(async () => {
  const d = ILE_BY_ID.get('grande-ile');
  const { entier } = planDe('grande-ile');
  const secs = sectionsDe('grande-ile');
  // toutes les sections chargées (le cas le plus large du jeu)
  const man = await gestionnaire(secs);
  // raccords : bords partagés par deux sections présentes (i + 1 à l'est, j + 1 au sud)
  const par = new Map(secs.map((q) => [`${q.section.i},${q.section.j}`, q]));
  const raccords = [];
  for (const q of secs) {
    const { i, j } = q.section;
    if (par.has(`${i + 1},${j}`)) raccords.push({ a: q.id, b: par.get(`${i + 1},${j}`).id, vertical: true, x: q.x + SECTION / 2, z: q.z });
    if (par.has(`${i},${j + 1}`)) raccords.push({ a: q.id, b: par.get(`${i},${j + 1}`).id, vertical: false, x: q.x, z: q.z + SECTION / 2 });
  }
  const nl = Math.round(SECTION / PAS) + 1; // points le long du raccord
  const nt = Math.round((2 * BANDE) / PAS) + 1; // points en travers
  const sol = new Float64Array(nl * nt);
  const ref = new Float64Array(nl * nt);
  const m = { sections: secs.length, raccords: raccords.length, points: 0, ecartMax: 0, pointEcartMax: null, horsTolerance: 0, marches: 0, marcheMax: 0, pointMarcheMax: null, surplusMax: 0, absents: 0 };
  for (const r of raccords) {
    for (let a = 0; a < nl; a++) {
      const u = -SECTION / 2 + a * PAS;
      for (let b = 0; b < nt; b++) {
        const o = -BANDE + b * PAS;
        const x = r.vertical ? r.x + o : r.x + u;
        const z = r.vertical ? r.z + u : r.z + o;
        const k = a * nt + b;
        const h = man.heightAt(x, z);
        const hp = entier.height(x - d.x, z - d.z);
        sol[k] = h ?? NaN;
        ref[k] = hp;
        m.points++;
        if (h === null) {
          m.absents++;
          continue;
        }
        const e = Math.abs(h - hp);
        if (e > TOLERANCE) m.horsTolerance++;
        if (e > m.ecartMax) {
          m.ecartMax = e;
          m.pointEcartMax = { x, z, sol: +h.toFixed(3), plan: +hp.toFixed(3), raccord: `${r.a}|${r.b}` };
        }
      }
    }
    // marches entre points voisins (0,5 m), le long et en travers du raccord
    for (let a = 0; a < nl; a++) {
      for (let b = 0; b < nt; b++) {
        const k = a * nt + b;
        for (const k2 of [b + 1 < nt ? k + 1 : -1, a + 1 < nl ? k + nt : -1]) {
          if (k2 < 0) continue;
          const ds = Math.abs(sol[k2] - sol[k]);
          const dp = Math.abs(ref[k2] - ref[k]);
          if (!(ds === ds)) continue;
          // marche invisible : saut du sol physique que le relief rendu (plan entier) n'a pas
          const surplus = ds - dp;
          if (surplus > m.surplusMax) m.surplusMax = surplus;
          if (ds > STEP_UP && dp <= STEP_UP) {
            m.marches++;
            if (ds > m.marcheMax) {
              m.marcheMax = ds;
              const u = -SECTION / 2 + a * PAS;
              const o = -BANDE + b * PAS;
              m.pointMarcheMax = { x: r.vertical ? r.x + o : r.x + u, z: r.vertical ? r.z + u : r.z + o, sol: ds, plan: dp, raccord: `${r.a}|${r.b}` };
            }
          }
        }
      }
    }
  }
  mesure = m;
}, 120000);

describe('Raccords des sections de la Grande Île (P01)', () => {
  it('découpe la Grande Île en sections reliées par des raccords', () => {
    expect(mesure.sections).toBe(30);
    expect(mesure.raccords).toBeGreaterThan(30);
    expect(mesure.absents, JSON.stringify(mesure)).toBe(0);
  });

  it('le sol physique reste à moins de 1 cm du relief du plan entier sur 8 m de part et d’autre de chaque raccord', () => {
    expect(mesure.horsTolerance, JSON.stringify(mesure)).toBe(0);
    expect(mesure.ecartMax, JSON.stringify(mesure)).toBeLessThan(TOLERANCE);
  });

  it('aucune marche invisible au-delà de stepUp entre deux points voisins de 0,5 m', () => {
    expect(mesure.marches, JSON.stringify(mesure)).toBe(0);
    expect(mesure.surplusMax, JSON.stringify(mesure)).toBeLessThan(STEP_UP);
  });
});

// Grande Île (grande-ile~6-2) et Volcan endormi (volcan-endormi~2-2) : leurs carrés se recouvrent sur
// 148 m × 464 m, terre du volcan sur fond de mer de la Grande Île. Toutes les sections des deux îles sont
// chargées, dans un ordre puis dans l'autre ; on échantillonne au mètre le recouvrement des deux sections.
describe('Îles sectionnées qui se recouvrent (Grande Île et Volcan endormi)', () => {
  const A = 'grande-ile~6-2';
  const B = 'volcan-endormi~2-2';
  let cas;

  beforeAll(async () => {
    const secs = [...sectionsDe('grande-ile'), ...sectionsDe('volcan-endormi')];
    const a = ISLANDS.find((q) => q.id === A);
    const b = ISLANDS.find((q) => q.id === B);
    cas = [];
    for (const ordre of ['Grande Île d’abord', 'Volcan endormi d’abord']) {
      const liste = ordre === 'Grande Île d’abord' ? secs : [...secs].reverse();
      const man = await gestionnaire(liste);
      const ext = man.entries.get(A).plan.ext - 1;
      const m = { ordre, points: 0, ecartMax: 0, pointEcartMax: null, horsTolerance: 0, absents: 0 };
      for (let x = Math.ceil(Math.max(a.x, b.x) - ext); x <= Math.min(a.x, b.x) + ext; x++) {
        for (let z = Math.ceil(Math.max(a.z, b.z) - ext); z <= Math.min(a.z, b.z) + ext; z++) {
          let ref = -Infinity;
          for (const id of ['grande-ile', 'volcan-endormi']) {
            const d = ILE_BY_ID.get(id);
            ref = Math.max(ref, planDe(id).entier.height(x - d.x, z - d.z));
          }
          const h = man.heightAt(x, z);
          m.points++;
          if (h === null) {
            m.absents++;
            continue;
          }
          const e = Math.abs(h - ref);
          if (e > TOLERANCE) m.horsTolerance++;
          if (e > m.ecartMax) {
            m.ecartMax = e;
            m.pointEcartMax = { x, z, sol: +h.toFixed(3), plans: +ref.toFixed(3) };
          }
        }
      }
      cas.push(m);
    }
  }, 120000);

  it('le sol vaut le maximum des plans entiers des deux îles, dans les deux ordres de chargement', () => {
    expect(cas).toHaveLength(2);
    for (const m of cas) {
      expect(m.points).toBeGreaterThan(50000);
      expect(m.absents, JSON.stringify(m)).toBe(0);
      expect(m.horsTolerance, JSON.stringify(m)).toBe(0);
      expect(m.ecartMax, JSON.stringify(m)).toBeLessThan(TOLERANCE);
    }
  });
});
