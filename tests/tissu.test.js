// Tissu simulé (src/entities/character/tissu.js) : un ruban épinglé par le haut tombe sous la gravité, part
// sous le vent, ne s'étire pas, ne traverse pas une sphère, et ne dépend pas de la cadence d'image.
import { describe, it, expect } from 'vitest';
import { creerRuban, pasTissu } from '../src/entities/character/tissu.js';

const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// ruban horizontal de 0,3 m le long de -z, 3 colonnes de 4 cm, épinglé en z = 0
function ruban() {
  const L = 9;
  const C = 3;
  const repos = [];
  for (let l = 0; l < L; l++) for (let c = 0; c < C; c++) repos.push((c - 1) * 0.04, 1, -0.3 * (l / (L - 1)));
  return creerRuban(repos, L, C);
}
const bout = (t) => [t.p[(t.n - 2) * 3], t.p[(t.n - 2) * 3 + 1], t.p[(t.n - 2) * 3 + 2]];
function simule(t, { vent = [0, 0, 0], dt = 1 / 60, duree = 3, spheres = [] } = {}) {
  for (let s = 0; s < Math.round(duree / dt); s++) pasTissu(t, { M: I, vent, temps: s * dt, spheres, dt });
  return t;
}

describe('tissu simulé', () => {
  it('tombe sous son poids sans vent, sans s’étirer', () => {
    const t = simule(ruban());
    const [, y] = bout(t);
    expect(y).toBeLessThan(1 - 0.2);
    for (const [a, b, L, k] of t.contraintes) {
      if (k < 1) continue;
      const d = Math.hypot(t.p[b * 3] - t.p[a * 3], t.p[b * 3 + 1] - t.p[a * 3 + 1], t.p[b * 3 + 2] - t.p[a * 3 + 2]);
      expect(Math.abs(d - L) / L).toBeLessThan(0.08);
    }
  });

  it('part sous le vent (le bout file dans son sens)', () => {
    const calme = bout(simule(ruban()));
    const vent = bout(simule(ruban(), { vent: [8, 0, 0] }));
    expect(vent[0] - calme[0]).toBeGreaterThan(0.08);
    expect(vent[1]).toBeGreaterThan(calme[1]);
  });

  it('ne traverse pas une sphère sous lui', () => {
    const sph = [0, 0.82, -0.12, 0.1];
    const t = simule(ruban(), { spheres: [sph] });
    for (let i = 0; i < t.n; i++) {
      const d = Math.hypot(t.p[i * 3] - sph[0], t.p[i * 3 + 1] - sph[1], t.p[i * 3 + 2] - sph[2]);
      expect(d).toBeGreaterThan(sph[3] - 0.005);
    }
  });

  it('ne dépend pas de la cadence d’image (pas fixe)', () => {
    const a = bout(simule(ruban(), { dt: 1 / 30, duree: 2 }));
    const b = bout(simule(ruban(), { dt: 1 / 120, duree: 2 }));
    for (let k = 0; k < 3; k++) expect(Math.abs(a[k] - b[k])).toBeLessThan(0.02);
  });

  it('une épingle qui saute (téléportation) replace le ruban au repos', () => {
    const t = simule(ruban(), { duree: 1 });
    const loin = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 50, 0, 0, 1];
    pasTissu(t, { M: loin, vent: [0, 0, 0], dt: 1 / 60 });
    expect(t.p[0]).toBeCloseTo(50 - 0.04, 5);
    expect(t.p[t.n * 3 - 1]).toBeCloseTo(-0.3, 5);
  });
});
