// Montée de la corniche du Vent (BRF-PV-02, éléments PV-T1 et PV-T2 du plan du Plateau venté,
// production/fiches/ZONE-ILE-VERTE.json#plan_plateau_vente) : terrassement de la Grande Île
// (desc.terrassements de src/world/archipel.js, appliqué par terrasser de gen/forme.js dans buildPlan).
// Contrôles du brief sur le vrai plan et son relief au mètre (Surface), comparés au plan sans terrassement.
// Coordonnées monde (m, nord = −Z) ; repère de l'île = monde − centre de la Grande Île.
import { describe, it, expect, beforeAll } from 'vitest';
import { ILE_BY_ID } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { Surface } from '../../src/world/islands/gen/surface.js';
import { Z } from '../../src/world/islands/gen/zones.js';
import { traceCorniche, arrondir } from '../../src/world/islands/gen/forme.js';
import { climbable } from '../../src/entities/locomotion/motor.js';
import { tuningFor } from '../../src/entities/locomotion/tuning.js';

const T = tuningFor('realiste');
const PENTE_MAX = Math.tan(T.slideAngle);
const SEUIL_PENTE = 0.2;
const SEUIL_DEVERS = 0.1;
const SOL_MAX = 1.11; // tan 48°, slideExitAngle

let d, p, p0, surf, hW, tr, route;

beforeAll(() => {
  d = ILE_BY_ID.get('grande-ile');
  p = buildPlan(d);
  // même île sans terrassement : référence du relief naturel
  const { terrassements, ...sans } = d;
  p0 = buildPlan(sans);
  surf = new Surface(p);
  hW = (x, z) => surf.height(x - d.x, z - d.z);
  tr = d.terrassements.find((t) => t.t === 'corniche');
  // tracé arrondi, en monde : [x, z, hauteur visée]
  route = traceCorniche(tr).pts.map(([x, z, h]) => [x + d.x, z + d.z, h]);
}, 60000);

// pas de 2 m le long de la route : position, direction
function pas() {
  const out = [];
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1];
    const [bx, bz] = route[i];
    const l = Math.hypot(bx - ax, bz - az);
    const vx = (bx - ax) / l;
    const vz = (bz - az) / l;
    for (let t = 0; t < l; t += 2) out.push({ x: ax + vx * t, z: az + vz * t, vx, vz });
  }
  return out;
}

describe('Plateau venté : montée de la corniche du Vent (BRF-PV-02)', () => {
  it('va du pied P0 (350, −936) à l’arrivée A (432, −728) avec des virages arrondis', () => {
    const [x0, z0] = route[0];
    const [x1, z1] = route[route.length - 1];
    expect(Math.hypot(x0 - 350, z0 + 936)).toBeLessThan(0.01);
    expect(Math.hypot(x1 - 432, z1 + 728)).toBeLessThan(0.01);
    expect(arrondir(tr.pts).length).toBeGreaterThan(tr.pts.length * 4);
    // rayon de courbure ≥ 10 m (cercle par trois points de la route arrondie, espacés de trois points)
    let rmin = Infinity;
    const P = route;
    for (let i = 3; i < P.length - 3; i++) {
      const [ax, az] = P[i - 3], [bx, bz] = P[i], [cx, cz] = P[i + 3];
      const a = Math.hypot(bx - ax, bz - az), b = Math.hypot(cx - bx, cz - bz), c = Math.hypot(cx - ax, cz - az);
      const aire = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) / 2;
      if (aire > 1e-6) rmin = Math.min(rmin, (a * b * c) / (4 * aire));
    }
    console.log(`corniche : rayon de virage minimal ${rmin.toFixed(1)} m`);
    expect(rmin).toBeGreaterThanOrEqual(10);
  });

  it('pente ≤ 0,20, dévers ≤ 0,10 et sol ≤ tan 48° sur toute la route (relief au mètre, pas de 2 m)', () => {
    const hors = [];
    let pMax = 0, dMax = 0, sMax = 0;
    for (const { x, z, vx, vz } of pas()) {
      const pente = Math.abs(hW(x + vx * 2, z + vz * 2) - hW(x, z)) / 2;
      const devers = Math.abs(hW(x - vz * 3, z + vx * 3) - hW(x + vz * 3, z - vx * 3)) / 6;
      let sol = 0;
      for (const o of [-3, 0, 3]) {
        const px = x - vz * o, pz = z + vx * o;
        sol = Math.max(sol, Math.hypot(hW(px + 0.5, pz) - hW(px - 0.5, pz), hW(px, pz + 0.5) - hW(px, pz - 0.5)));
      }
      pMax = Math.max(pMax, pente);
      dMax = Math.max(dMax, devers);
      sMax = Math.max(sMax, sol);
      if (pente > SEUIL_PENTE || devers > SEUIL_DEVERS || sol > SOL_MAX) hors.push([Math.round(x), Math.round(z), +pente.toFixed(2), +devers.toFixed(2), +sol.toFixed(2)]);
    }
    console.log(`corniche : pente max ${pMax.toFixed(3)}, dévers max ${dMax.toFixed(3)}, sol max ${sMax.toFixed(3)}`);
    expect(hors).toEqual([]);
  });

  it('A est atteinte à pied depuis P0 sur la grille de 2 m, pente plafonnée à 0,25', () => {
    const S = 2, X0 = 290, X1 = 470, Z0 = -970, Z1 = -690;
    const NX = (X1 - X0) / S + 1, NZ = (Z1 - Z0) / S + 1;
    const Hg = new Float32Array(NX * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) Hg[j * NX + i] = hW(X0 + i * S, Z0 + j * S);
    const noeud = (x, z) => Math.round((z - Z0) / S) * NX + Math.round((x - X0) / S);
    const atteint = (cap) => {
      const vu = new Uint8Array(NX * NZ);
      const pile = [noeud(350, -936)];
      vu[pile[0]] = 1;
      while (pile.length) {
        const a = pile.pop();
        const i = a % NX, j = (a - i) / NX;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
          const b = jj * NX + ii;
          const dy = Math.abs(Hg[b] - Hg[a]);
          if (vu[b] || !(climbable(dy, S, Infinity, T) && (dy <= 0.08 || dy / S <= Math.min(cap, PENTE_MAX)))) continue;
          vu[b] = 1;
          pile.push(b);
        }
      }
      return vu[noeud(432, -728)] === 1;
    };
    expect(atteint(0.25)).toBe(true);
  });

  it('ne touche que la zone plateau-vente, à moins de 14 m de la route ou du palier ; H identique ailleurs', () => {
    const ZPL = p.zones.indexOf('plateau-vente');
    let changees = 0;
    const fautes = [];
    const dRoute = (x, z) => {
      let m = Infinity;
      for (let i = 1; i < route.length; i++) {
        const [ax, az] = route[i - 1], [bx, bz] = route[i];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
      }
      return Math.min(m, Math.hypot(x - 432, z + 728) - tr.palier);
    };
    for (let k = 0; k < p.H.length; k++) {
      if (p.H[k] === p0.H[k]) continue;
      changees++;
      const x = d.x - p.ext + (k % p.n) * p.s, z = d.z - p.ext + Math.floor(k / p.n) * p.s;
      if (p.ZI[k] !== ZPL || dRoute(x, z) >= 14) fautes.push([x, z]);
    }
    expect(changees).toBeGreaterThan(100);
    expect(fautes).toEqual([]);
  });

  it('palier d’arrivée : dénivelé ≤ 0,3 m sur 6 m de rayon, à ±0,5 m de 66,3 m', () => {
    let lo = Infinity, hi = -Infinity;
    for (let a = 0; a < 16; a++) {
      const h = hW(432 + Math.cos((a * Math.PI) / 8) * 6, -728 + Math.sin((a * Math.PI) / 8) * 6);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    const h0 = hW(432, -728);
    expect(Math.max(hi, h0) - Math.min(lo, h0)).toBeLessThanOrEqual(0.3);
    expect(Math.abs(h0 - 66.3)).toBeLessThanOrEqual(0.5);
  });

  it('aucune eau dans l’emprise ; la route est herbeuse (presque plus de roche sur la bande)', () => {
    let eau = 0, roche = 0, n = 0;
    for (const { x, z } of pas()) {
      const k = Math.round((z - d.z + p.ext) / p.s) * p.n + Math.round((x - d.x + p.ext) / p.s);
      n++;
      if (p.H[k] < 0 || p.Z[k] === Z.LAC || p.Z[k] === Z.RIVIERE) eau++;
      if (p.Z[k] === Z.ROCHE) roche++;
    }
    console.log(`corniche : ${roche} pas de roche sur ${n}`);
    expect(eau).toBe(0);
    expect(roche / n).toBeLessThan(0.05);
  });

  it('l’escarpement frontal REP-03 reste infranchissable de face (430, −701) → (460, −722)', () => {
    const pied = hW(430, -701);
    expect(hW(460, -722) - pied).toBeGreaterThan(35);
    let bloque = false, prev = pied;
    for (let t = 1; t <= 30; t++) {
      const y = hW(430 + t, -701 - t * 0.7), dist = Math.hypot(1, 0.7);
      if (!(climbable(y - prev, dist, Infinity, T) && (y - prev) / dist <= PENTE_MAX)) bloque = true;
      prev = y;
    }
    expect(bloque).toBe(true);
  });
});
