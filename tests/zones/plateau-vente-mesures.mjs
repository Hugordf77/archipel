// Mesures de référence du plan du Plateau venté (TASK-ILE-VERTE-006, fiche production/fiches/ZONE-ILE-VERTE.json,
// clé plan_plateau_vente). Script de mesure, PAS un fichier de test : il ne modifie rien du jeu ; le plan de la
// Grande Île est calculé en mémoire, la retouche de la corniche est essayée sur une copie de ce plan.
//
//   node tests/zones/plateau-vente-mesures.mjs            affiche les mesures
//   node tests/zones/plateau-vente-mesures.mjs --ecrire   les écrit aussi dans
//                                                         production/fiches/ZONE-ILE-VERTE.plateau-vente.mesures.json
//
// Modules du dépôt utilisés : ILE_BY_ID et zoneAt (src/world/islands/regions.js), buildPlan
// (src/world/islands/gen/plan.js), Surface (src/world/islands/gen/surface.js), climbable
// (src/entities/locomotion/motor.js), tuningFor('realiste') (src/entities/locomotion/tuning.js).
// Coordonnées monde (m, nord = −Z) ; repère de l'île = monde − centre de la Grande Île.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ILE_BY_ID, zoneAt } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { Surface } from '../../src/world/islands/gen/surface.js';
import { climbable } from '../../src/entities/locomotion/motor.js';
import { tuningFor } from '../../src/entities/locomotion/tuning.js';

const T = tuningFor('realiste');
const d = ILE_BY_ID.get('grande-ile');
const t0 = performance.now();
const p = buildPlan(d);
const tPlan = Math.round(performance.now() - t0);
let surf = new Surface(p);
const ZPL = p.zones.indexOf('plateau-vente');
const hW = (x, z) => surf.height(x - d.x, z - d.z);
const cellW = (x, z) => Math.round((z - d.z + p.ext) / p.s) * p.n + Math.round((x - d.x + p.ext) / p.s);
const xOf = (k) => d.x - p.ext + (k % p.n) * p.s;
const zOf = (k) => d.z - p.ext + Math.floor(k / p.n) * p.s;
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const out = { genere_par: 'tests/zones/plateau-vente-mesures.mjs', ile: { id: d.id, graine: d.seed, centre: [d.x, d.z], ext: p.ext, n: p.n, s: p.s }, duree_plan_ms: tPlan };

// --- vent et faits de base ------------------------------------------------------------------
const wa = p.traits.windAngle;
const up = [Math.cos(wa + Math.PI), Math.sin(wa + Math.PI)]; // d'où vient le vent (lecture : le moulin regarde windAngle + π)
let cases = 0, somme = 0, haut = { h: -1 };
for (let k = 0; k < p.H.length; k++) {
  if (p.ZI[k] !== ZPL || p.H[k] <= 0) continue;
  cases++;
  somme += p.H[k];
  if (p.H[k] > haut.h) haut = { h: p.H[k], x: xOf(k), z: zOf(k) };
}
out.vent = { windAngle: wa, deg: r1((wa * 180) / Math.PI), rot_moulin: r2(wa + Math.PI), vient_de: up.map(r2), cap_deg: r1(((Math.atan2(up[0], -up[1]) * 180) / Math.PI + 360) % 360) };
out.plateau = { cases, km2: Math.round(cases * p.s * p.s) / 1e6, h_moy: r1(somme / cases), point_haut: { x: haut.x, z: haut.z, h: r1(haut.h) }, lieux_du_plan: p.pois.length, chemins_du_plan: p.paths.length };

// --- corniche : tracé sur la courbe de niveau de la hauteur visée (pente G), de A vers le nord ---
const G = 0.17;
const A = [432, -728];
const hA = hW(...A);
const crossX = (z, h) => { for (let x = 300; x <= 440; x += 0.25) if (hW(x, z) >= h) return x; return null; };
const brut = [{ x: A[0], z: A[1] }];
{
  let x = A[0], z = A[1], h = hA;
  while (z > -1000) {
    const nz = z - 4;
    let nx = crossX(nz, h - G * 4);
    if (nx === null) break;
    const l = Math.hypot(nx - x, nz - z);
    const hh = h - G * l;
    nx = crossX(nz, hh) ?? nx;
    brut.push({ x: nx, z: nz });
    x = nx; z = nz; h = hh;
    if (hh <= hW(nx - 14, nz) + 0.5) break;
  }
}
// lissage : moyenne glissante de 5 points sur x (A fixe), hauteurs visées recalculées sur la longueur lissée
const lisse = brut.map((q, i) => { const w = brut.slice(Math.max(0, i - 2), i + 3); return { x: i === 0 ? q.x : w.reduce((a, b) => a + b.x, 0) / w.length, z: q.z }; });
let L = 0;
lisse[0].hv = hA;
for (let i = 1; i < lisse.length; i++) { L += Math.hypot(lisse[i].x - lisse[i - 1].x, lisse[i].z - lisse[i - 1].z); lisse[i].hv = hA - G * L; }
const route = lisse.slice().reverse().map((q) => [r2(q.x), q.z, r2(q.hv), r2(hW(q.x, q.z))]); // du pied P0 vers A
out.corniche = { pente_visee: G, longueur_m: r1(L), points: route.length, format: '[x, z, hauteur visée, hauteur actuelle]', route };

// distance d'un point à la polyligne de la corniche (segments)
const dRoute = (x, z) => {
  let m = Infinity;
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
};

// --- éléments ----------------------------------------------------------------------------------
const vues = { plage_nord: [0, -200, 1.6], village_prevu: [-100, -400, 1.6], frontiere_cote: [242, -672, 1.6], ponton_ton_ile: [10.5, 32, 0.86 + 1.6] };
const voit = ([vx, vz, oeil], x, z, cible) => {
  const y0 = (Math.hypot(vx, vz) < 40 ? 0.86 : hW(vx, vz)) + oeil;
  const Lv = Math.hypot(x - vx, z - vz);
  for (let t = 8; t < Lv - 8; t += 4) { const f = t / Lv; if (hW(vx + (x - vx) * f, vz + (z - vz) * f) > y0 + (cible - y0) * f) return false; }
  return true;
};
// horizon au vent : angle maximal (°) du relief vers l'amont du vent, vu d'une hauteur d'œil donnée, pas de 2 m
const horizon = (x, z, oeil, t0, t1) => { const y = hW(x, z) + oeil; let m = -90; for (let t = t0; t <= t1; t += 2) m = Math.max(m, (Math.atan2(hW(x + up[0] * t, z + up[1] * t) - y, t) * 180) / Math.PI); return r1(m); };
const replat = (x, z, r) => { let lo = Infinity, hi = -Infinity; for (let a = 0; a < 16; a++) { const h = hW(x + Math.cos(a * 0.3927) * r, z + Math.sin(a * 0.3927) * r); lo = Math.min(lo, h); hi = Math.max(hi, h); } const h0 = hW(x, z); return { r, denivele: r2(Math.max(hi, h0) - Math.min(lo, h0)), relatif: Math.round(((Math.max(hi, h0) - Math.min(lo, h0)) / (2 * r)) * 1000) / 1000 }; };
const section = (x, z) => `grande-ile~${Math.floor((x - d.x + p.ext) / 512)}-${Math.floor((z - d.z + p.ext) / 512)}`;
const CER = [620, -886];
const ux = (CER[0] - A[0]) / Math.hypot(CER[0] - A[0], CER[1] - A[1]);
const uz = (CER[1] - A[1]) / Math.hypot(CER[0] - A[0], CER[1] - A[1]);
const ELEMENTS = {
  'PV-M1': { nom: 'Moulin de la Corniche', x: 418, z: -786, r: 4.5, moulin: true },
  'PV-M2': { nom: 'Moulin du Bord', x: 376, z: -868, r: 4.5, moulin: true },
  'PV-M3': { nom: 'Moulin du Large', x: 864, z: -872, r: 4.5, moulin: true },
  'PV-A': { nom: 'Arche basse', x: r1(A[0] + ux * 44), z: r1(A[1] + uz * 44), r: 3 }, // 44 m de A sur l'allée, au pied de la descente du rebord
  'PV-P1': { nom: 'Menhir du Guet', x: 479, z: -768, r: 1.5 },
  'PV-P2': { nom: 'Menhir du Milieu', x: 526, z: -807, r: 1.5 },
  'PV-P3': { nom: 'Menhir de la Butte', x: 573, z: -847, r: 1.5 },
  'PV-C': { nom: 'Cercle de pierres', x: CER[0], z: CER[1], r: 5 },
  'PV-W': { nom: 'Muret effondré (milieu)', x: 608, z: -893, r: 2 },
  'PV-E0': { nom: 'Entrée sud-ouest', x: 300, z: -694, r: 4 },
};
out.elements = {};
for (const [id, e] of Object.entries(ELEMENTS)) {
  const m = { nom: e.nom, x: e.x, z: e.z, local: [r1(e.x - d.x), r1(e.z - d.z)], h: r1(hW(e.x, e.z)), zone_plan: p.zones[p.ZI[cellW(e.x, e.z)]], zoneAt: zoneAt(e.x, e.z)?.id, section: section(e.x, e.z), replat: replat(e.x, e.z, e.r), distance_corniche_m: r1(dRoute(e.x, e.z)), distance_A_m: r1(Math.hypot(e.x - A[0], e.z - A[1])) };
  if (e.moulin) {
    m.horizon_vent = { oeil_0m_4_600: horizon(e.x, e.z, 0, 4, 600), oeil_6_6m_4_600: horizon(e.x, e.z, 6.6, 4, 600), oeil_6_6m_600_2500: horizon(e.x, e.z, 6.6, 600, 2500) };
    m.vu_depuis = Object.entries(vues).filter(([, v]) => voit(v, e.x, e.z, hW(e.x, e.z) + 10.4)).map(([k]) => k);
  }
  out.elements[id] = m;
}

// --- prototype de la retouche de la corniche, sur une copie du plan ----------------------------
const HW = 6, TW = 8, SEUIL_PENTE = 0.2, SEUIL_DEVERS = 0.1;
const H0 = Float32Array.from(p.H);
const A0 = Uint8Array.from(p.A);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const proj = (x, z) => {
  let best = null;
  for (let i = 1; i < route.length; i++) {
    const [ax, az, ah] = route[i - 1], [bx, bz, bh] = route[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const dd = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (!best || dd < best.d) best = { d: dd, hv: ah + (bh - ah) * t };
  }
  return best;
};
let retouchees = 0, horsZone = 0;
for (let j = 0; j < p.n; j++) for (let i = 0; i < p.n; i++) {
  const x = d.x - p.ext + i * p.s, z = d.z - p.ext + j * p.s;
  if (x < 300 || x > 470 || z < -970 || z > -700) continue;
  const q = proj(x, z);
  if (q.d > HW + TW) continue;
  const k = j * p.n + i;
  const w = q.d <= HW ? 1 : smooth(HW + TW, HW, q.d);
  p.H[k] = H0[k] * (1 - w) + q.hv * w;
  p.A[k] = Math.round(p.A[k] * (1 - w));
  retouchees++;
  if (p.ZI[k] !== ZPL) horsZone++;
}
surf = new Surface(p);
let pas = 0, ok = 0, pMax = 0, dMax = 0, solMax = 0;
const hors = [];
for (let i = 1; i < route.length; i++) {
  const [ax, az] = route[i - 1], [bx, bz] = route[i];
  const l = Math.hypot(bx - ax, bz - az), vx = (bx - ax) / l, vz = (bz - az) / l;
  for (let t = 0; t < l; t += 2) {
    const x = ax + vx * t, z = az + vz * t;
    const dy = hW(x + vx * 2, z + vz * 2) - hW(x, z);
    const pente = Math.abs(dy) / 2;
    const devers = Math.abs(hW(x - vz * 3, z + vx * 3) - hW(x + vz * 3, z - vx * 3)) / 6;
    pas++;
    if (climbable(Math.abs(dy), 2, Infinity, T) && pente <= Math.tan(T.slideAngle)) ok++;
    pMax = Math.max(pMax, pente);
    dMax = Math.max(dMax, devers);
    for (const o of [-3, 0, 3]) { const px = x - vz * o, pz = z + vx * o; solMax = Math.max(solMax, Math.hypot(hW(px + 0.5, pz) - hW(px - 0.5, pz), hW(px, pz + 0.5) - hW(px, pz - 0.5))); }
    if (pente > SEUIL_PENTE || devers > SEUIL_DEVERS) hors.push([Math.round(x), Math.round(z), r2(pente), r2(devers)]);
  }
}
// parcours à pied plafonné (grille de 2 m, règle du test ile-verte + plafond) de P0 à A
const S = 2, X0 = 290, X1 = 470, Z0 = -970, Z1 = -690;
const NX = (X1 - X0) / S + 1, NZ = (Z1 - Z0) / S + 1;
const Hg = new Float32Array(NX * NZ);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) Hg[j * NX + i] = hW(X0 + i * S, Z0 + j * S);
const noeud = (x, z) => Math.round((z - Z0) / S) * NX + Math.round((x - X0) / S);
const atteint = (cap) => {
  const vu = new Uint8Array(NX * NZ);
  const pile = [noeud(route[0][0], route[0][1])];
  vu[pile[0]] = 1;
  while (pile.length) {
    const a = pile.pop();
    const i = a % NX, j = (a - i) / NX;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
      const b = jj * NX + ii;
      const dy = Math.abs(Hg[b] - Hg[a]);
      if (vu[b] || !(climbable(dy, S, Infinity, T) && (dy <= 0.08 || dy / S <= Math.min(cap, Math.tan(T.slideAngle))))) continue;
      vu[b] = 1;
      pile.push(b);
    }
  }
  for (let dz = -4; dz <= 4; dz += 2) for (let dx = -4; dx <= 4; dx += 2) if (vu[noeud(A[0] + dx, A[1] + dz)]) return true;
  return false;
};
// profil frontal de l'escarpement du test ile-verte
const pied = hW(430, -701), sommet = hW(460, -722);
let bloque = false, prev = pied;
for (let t = 1; t <= 30; t++) { const y = hW(430 + t, -701 - t * 0.7), dist = Math.hypot(1, 0.7); if (!(climbable(y - prev, dist, Infinity, T) && (y - prev) / dist <= Math.tan(T.slideAngle))) bloque = true; prev = y; }
out.prototype = {
  methode: `copie du plan : bande ±${HW} m à la hauteur visée, talus ${TW} m fondu vers le relief naturel, relief fin A coupé`,
  cases_retouchees: retouchees, cases_hors_zone: horsZone, pas_de_2m: pas, pas_praticables: ok,
  pente_max: r2(pMax), devers_max: r2(dMax), pente_sol_max: r2(solMax),
  seuils: { pente: SEUIL_PENTE, devers: SEUIL_DEVERS }, pas_hors_seuils: hors,
  parcours_P0_A: { plafond_0_25: atteint(0.25), plafond_0_38: atteint(0.38) },
  profil_frontal_test: { denivele: r1(sommet - pied), bloque },
};
p.H.set(H0);
p.A.set(A0);

console.log(JSON.stringify(out, null, 1));
if (process.argv.includes('--ecrire')) {
  const f = fileURLToPath(new URL('../../production/fiches/ZONE-ILE-VERTE.plateau-vente.mesures.json', import.meta.url));
  // la durée du plan varie d'une machine à l'autre : elle n'est pas écrite (fichier reproductible)
  const { duree_plan_ms, ...stable } = out;
  writeFileSync(f, JSON.stringify(stable, null, 1) + '\n');
  console.error('écrit :', f);
}
