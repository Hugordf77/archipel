// Zone L’Île Verte (ZONE-ILE-VERTE, fiche production/fiches/ZONE-ILE-VERTE.json) : Ton île (« home ») et
// trois zones de la Grande Île (cote-aux-villages, foret-des-souvenirs, plateau-vente), monde ouvert
// GEN_VERSION 4, étape « bases » (relief, côtes, eau douce, arbres et décor ; ni lieux ni chemins).
// Test fonctionnel sur les vrais modules, hors navigateur :
//  - le vrai plan de la Grande Île (buildPlan) et son relief au mètre (Surface), branchés sur
//    navigation.js comme le fait IslandManager (setGroundProvider, setWaterProvider, obstacles des arbres) ;
//  - le vrai bateau (Sailing : amarrage, hauts-fonds, recherche d'une plage pour débarquer) ;
//  - le vrai Player (moteur de locomotion) pour les premiers pas sur la plage ;
//  - les règles de pente du moteur (climbable, tuning « realiste ») pour un parcours à pied sur grille ;
//  - la vraie récolte (Gather, Inventory, harvest.js) sur des arbres du plan.
// Coordonnées monde en mètres, nord = −Z, départ en (0, 0).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as THREE from 'three';
import { ILE_BY_ID, ILES, ISLANDS, zoneAt } from '../../src/world/islands/regions.js';
import { buildPlan } from '../../src/world/islands/gen/plan.js';
import { cropPlan } from '../../src/world/islands/gen/sections.js';
import { Surface } from '../../src/world/islands/gen/surface.js';
import { reliefContext, baseHeight } from '../../src/world/islands/gen/relief.js';
import { KINDS, KIND_RADIUS, STRIDE, TREES } from '../../src/world/islands/gen/kinds.js';
import { DECOR } from '../../src/world/islands/gen/flora.js';
import * as nav from '../../src/world/navigation.js';
import { tuningFor } from '../../src/entities/locomotion/tuning.js';
import { climbable } from '../../src/entities/locomotion/motor.js';
import { Player } from '../../src/entities/Player.js';
import { Sailing } from '../../src/entities/Sailing.js';
import { BOATS } from '../../src/models/bateaux/index.js';
import { HARVEST } from '../../src/data/harvest.js';
import { Inventory } from '../../src/gameplay/Inventory.js';
import { Gather } from '../../src/gameplay/Gather.js';
import { mulberry32 } from '../../src/core/random.js';

const T = tuningFor('realiste');
const PENTE_MAX = Math.tan(T.slideAngle); // au-delà de 55°, on glisse : ni montée ni descente à pied
const ZONES_GRANDE_ILE = ['cote-aux-villages', 'foret-des-souvenirs', 'plateau-vente'];
const DEPART = { x: 0, z: 4 }; // LAYOUT.spawn (fiche : ACC-01)
const PLAGE_NORD = { x: 0, z: -148 }; // ACC-03 : plage de la Côte aux villages face au départ
// trajet en mer du ponton à la plage nord : on contourne Ton île par l'est
const ROUTE_DETROIT = [[12.9, 30.4], [46, 30], [46, -46], [0, -62], [0, -132]];
// points d'intérêt et repères de la fiche, à pied d'œuvre sur la Grande Île
const POINTS = [
  { nom: 'étiquette de la Côte aux villages', x: -100, z: -400, zone: 'cote-aux-villages' },
  { nom: 'prairie au-dessus de la plage nord', x: 0, z: -200, zone: 'cote-aux-villages' },
  { nom: 'cœur de la Forêt des souvenirs', x: -900, z: -1240, zone: 'foret-des-souvenirs' },
  { nom: 'colline de la forêt (REP-04)', x: -624, z: -1132, zone: 'foret-des-souvenirs' },
  { nom: 'cascade de la rivière 7 (POI-10)', x: -968, z: -1243, zone: 'foret-des-souvenirs' },
  { nom: 'passage plateau / forêt', x: -29, z: -1030, zone: 'foret-des-souvenirs' },
  { nom: 'dessus du Plateau venté', x: 600, z: -880, zone: 'plateau-vente' },
  { nom: 'point haut du plateau', x: 716, z: -980, zone: 'plateau-vente' },
  { nom: 'embouchure de la rivière 0 (POI-11)', x: 376, z: -344, zone: 'cote-aux-villages' },
];
// sorties par la mer de la fiche (SOR-01 à SOR-05) : une côte praticable par zone au moins
const SORTIES = [
  { id: 'SOR-01', x: -1044, z: -1900, zone: 'foret-des-souvenirs' },
  { id: 'SOR-02', x: -1164, z: -1020, zone: 'foret-des-souvenirs' },
  { id: 'SOR-03', x: -484, z: -204, zone: 'cote-aux-villages' },
  { id: 'SOR-04', x: -1348, z: -1532, zone: 'foret-des-souvenirs' },
  { id: 'SOR-05', x: 1288, z: -956, zone: 'plateau-vente' },
];

// ---------------------------------------------------------------------------
// Monde chargé une fois : plan de la Grande Île, relief, eau douce, obstacles des arbres et du décor
let W = null;
function chargerMonde() {
  const d = ILE_BY_ID.get('grande-ile');
  const p = buildPlan(d);
  const surf = new Surface(p);
  const dedans = (x, z) => Math.abs(x - d.x) < p.ext - 1 && Math.abs(z - d.z) < p.ext - 1;
  // comme IslandManager.heightAt / waterLevelAt (sans terrassements ni ponts : il n'y en a pas)
  nav.setGroundProvider((x, z) => (dedans(x, z) ? surf.height(x - d.x, z - d.z) : null));
  nav.setWaterProvider((x, z) => (dedans(x, z) ? surf.waterLevel(x - d.x, z - d.z) : 0));
  // obstacles : même rayon que IslandManager (encombrement de l'espèce × échelle)
  const obstacles = [];
  for (let k = 0; k < p.items.length; k += STRIDE) {
    const kind = KINDS[p.items[k]];
    const r = KIND_RADIUS[kind] || 0;
    if (r > 0) obstacles.push({ x: d.x + p.items[k + 1], z: d.z + p.items[k + 3], r: r * p.items[k + 5], kind });
  }
  nav.setObstacles(obstacles);
  return { d, p, surf };
}

// Parcours à pied sur une grille de 2 m couvrant les trois zones. Nœud : 0 terre ou eau peu profonde
// (≤ 0,32 m, on y marche : Player.free), 1 eau douce profonde (rivière, lac : on nage), 2 mer profonde
// (on ne la traverse pas à pied), 3 dans un obstacle (tronc, rocher). Arête praticable : pente montable
// par le moteur (climbable) et sous l'angle de glissade (55°) dans les deux sens ; entrer dans l'eau douce
// ou en sortir seulement si la berge est à moins d'une marche (stepUp) au-dessus de l'eau.
const S = 2;
const X0 = -1400;
const X1 = 1320;
const Z0 = -1980;
const Z1 = -100;
const NX = Math.round((X1 - X0) / S) + 1;
const NZ = Math.round((Z1 - Z0) / S) + 1;
const noeud = (x, z) => Math.round((z - Z0) / S) * NX + Math.round((x - X0) / S);
const xDe = (k) => X0 + (k % NX) * S;
const zDe = (k) => Z0 + Math.floor(k / NX) * S;

function grilleAPied() {
  const N = NX * NZ;
  const H = new Float32Array(N);
  const D = new Float32Array(N);
  const L = new Float32Array(N);
  const K = new Uint8Array(N);
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const x = X0 + i * S;
      const z = Z0 + j * S;
      const k = j * NX + i;
      H[k] = nav.groundAt(x, z).y;
      D[k] = nav.waterDepth(x, z);
      L[k] = nav.waterLevelAt(x, z);
      if (D[k] > 0.32) K[k] = L[k] > 0 ? 1 : 2;
      else if (nav.blockedByObstacle(x, z, 0.32)) K[k] = 3;
    }
  }
  return { H, D, L, K };
}

function arete(G, a, b) {
  const { H, L, K } = G;
  if (K[a] >= 2 || K[b] >= 2) return false;
  if (K[a] === 1 && K[b] === 1) return true;
  if (K[a] === 1) return H[b] <= L[a] + T.stepUp;
  if (K[b] === 1) return H[a] <= L[b] + T.stepUp;
  const dy = Math.abs(H[b] - H[a]);
  return climbable(dy, S, Infinity, T) && (dy <= 0.08 || dy / S <= PENTE_MAX);
}

function parcours(G, depart) {
  const seen = new Uint8Array(NX * NZ);
  const q = new Int32Array(NX * NZ);
  let h = 0;
  let t = 0;
  seen[depart] = 1;
  q[t++] = depart;
  while (h < t) {
    const a = q[h++];
    const i = a % NX;
    const j = (a - i) / NX;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
      const b = jj * NX + ii;
      if (seen[b] || !arete(G, a, b)) continue;
      seen[b] = 1;
      q[t++] = b;
    }
  }
  return seen;
}

// un nœud atteint à moins de r mètres de (x, z) ?
function atteintPres(x, z, r = 6) {
  for (let dz = -r; dz <= r; dz += S) {
    for (let dx = -r; dx <= r; dx += S) {
      if (dx * dx + dz * dz > r * r) continue;
      const k = noeud(x + dx, z + dz);
      if (W.atteint[k] && W.G.K[k] !== 1) return k;
    }
  }
  return -1;
}

// Le bateau : vraie classe Sailing dans une partie factice (comme tests/world.test.js)
function bateau(type, x, z, heading, aboard = false) {
  const game = {
    state: { boat: { type, owned: [type], x, z, heading } },
    scene: { add() {}, remove() {} },
    ui: { toast() {}, panelOpen: false },
    player: { pos: new THREE.Vector3() },
    weather: null,
    audio: null,
  };
  const s = new Sailing(game);
  s.aboard = aboard;
  return s;
}
// empreinte du bateau (proue, poupe, centre, bâbord, tribord) : la règle « clearWater » de Sailing.update
function empreinteFlotte(s, x, z, heading) {
  const hx = Math.sin(heading);
  const hz = Math.cos(heading);
  const half = s.model.len * 0.45;
  const side = s.model.width ? s.model.width * 0.42 : 0.55;
  return [[x + hx * half, z + hz * half], [x - hx * half, z - hz * half], [x, z], [x - hz * side, z + hx * side], [x + hz * side, z - hx * side]].every(([px, pz]) => nav.waterDepth(px, pz) > 0.45);
}

// Mer navigable sur une grille de 8 m (Ton île et Grande Île au relief réel, autres îles au relief de base)
function merNavigable() {
  const s = 8;
  const mx0 = -1700;
  const mz0 = -2300;
  const nx = Math.round(3400 / s) + 1;
  const nz = Math.round(2500 / s) + 1;
  const autres = ILES.filter((q) => q.id !== 'grande-ile').map((q) => ({ q, c: reliefContext(q) }));
  const eau = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = mx0 + i * s;
      const z = mz0 + j * s;
      if (nav.waterDepth(x, z) <= 0.45 || nav.waterLevelAt(x, z) > 0) continue;
      let libre = true;
      for (const { q, c } of autres) {
        const lx = x - q.x;
        const lz = z - q.z;
        if (Math.abs(lx) > c.ext || Math.abs(lz) > c.ext) continue;
        if (baseHeight(c, lx, lz) > -0.45) {
          libre = false;
          break;
        }
      }
      if (libre) eau[j * nx + i] = 1;
    }
  }
  const id = (x, z) => Math.round((z - mz0) / s) * nx + Math.round((x - mx0) / s);
  const seen = new Uint8Array(nx * nz);
  const q = new Int32Array(nx * nz);
  let h = 0;
  let t = 0;
  const depart = id(ROUTE_DETROIT[0][0] + 4, ROUTE_DETROIT[0][1] + 4);
  if (eau[depart]) {
    seen[depart] = 1;
    q[t++] = depart;
  }
  while (h < t) {
    const a = q[h++];
    const i = a % nx;
    const j = (a - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
      const b = jj * nx + ii;
      if (seen[b] || !eau[b]) continue;
      seen[b] = 1;
      q[t++] = b;
    }
  }
  // mer reliée à Ton île à moins de r mètres de (x, z) ?
  return (x, z, r = 48) => {
    for (let dz = -r; dz <= r; dz += s) for (let dx = -r; dx <= r; dx += s) if (dx * dx + dz * dz <= r * r && seen[id(x + dx, z + dz)]) return true;
    return false;
  };
}

beforeAll(() => {
  W = chargerMonde();
  W.G = grilleAPied();
  W.atteint = parcours(W.G, noeud(0, -160));
}, 60000);

afterAll(() => {
  nav.setGroundProvider(null);
  nav.setWaterProvider(null);
  nav.setObstacles([]);
});

// ---------------------------------------------------------------------------
describe('L’Île Verte : accès (C10)', () => {
  it('le départ est sur l’herbe sèche de Ton île et le bateau amarré au ponton flotte en eau navigable', () => {
    const g = nav.groundAt(DEPART.x, DEPART.z);
    expect(zoneAt(DEPART.x, DEPART.z)?.id).toBe('home');
    expect(g.y).toBeGreaterThan(0.75);
    expect(g.surface).toBe('grass');
    expect(nav.waterDepth(DEPART.x, DEPART.z)).toBe(0);
    for (let a = 0; a < 8; a++) expect(nav.canStand(DEPART.x + Math.sin(a) * 0.5, DEPART.z + Math.cos(a) * 0.5, g.y, 0.5)).toBe(true);
    // amarrage par défaut (Sailing.mooring : bout du ponton), empreinte du radeau en eau libre
    const s = bateau('radeau', null, null, 0);
    expect(s.pos.x).toBeCloseTo(12.9, 5);
    expect(s.pos.z).toBeCloseTo(30.4, 5);
    expect(empreinteFlotte(s, s.pos.x, s.pos.z, s.heading)).toBe(true);
  });

  it('le détroit est navigable du ponton à la plage nord, dans la portée du radeau de départ', () => {
    const s = bateau('radeau', null, null, 0);
    for (let w = 0; w + 1 < ROUTE_DETROIT.length; w++) {
      const [ax, az] = ROUTE_DETROIT[w];
      const [bx, bz] = ROUTE_DETROIT[w + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const cap = Math.atan2(bx - ax, bz - az);
      for (let t = 0; t <= len; t += 1) {
        const x = ax + ((bx - ax) * t) / len;
        const z = az + ((bz - az) * t) / len;
        expect(empreinteFlotte(s, x, z, cap), `haut-fond en (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(true);
      }
    }
    // la première terre au nord du départ est la plage de la Grande Île, vers z = −148 (fiche ACC-03)
    let cote = null;
    for (let z = -40; z >= -300 && cote === null; z -= 1) if (nav.groundAt(0, z).y > 0) cote = z;
    expect(cote).toBeLessThanOrEqual(-140);
    expect(cote).toBeGreaterThanOrEqual(-156);
    expect(zoneAt(0, cote)?.id).toBe('cote-aux-villages');
    expect(Math.hypot(PLAGE_NORD.x, PLAGE_NORD.z)).toBeLessThan(BOATS.radeau.zone);
  });

  it('le vrai radeau, cap au nord, s’échoue sur la plage nord et trouve où débarquer dans la Côte aux villages', () => {
    const s = bateau('radeau', 0, -62, Math.PI, true);
    const input = { axes: () => ({ x: 0, y: 1 }), held: () => false };
    for (let t = 0; t < 60; t += 1 / 30) s.update(1 / 30, input);
    // arrêté par les hauts-fonds de la plage, pas plus loin
    expect(s.pos.z).toBeLessThan(-125);
    expect(s.pos.z).toBeGreaterThan(-150);
    expect(Math.abs(s.pos.x)).toBeLessThan(20);
    const spot = s.landingSpot();
    expect(spot).toBeTruthy();
    expect(nav.waterDepth(spot.x, spot.z)).toBeLessThanOrEqual(0.2);
    expect(nav.groundAt(spot.x, spot.z).y).toBeGreaterThan(-0.25);
    expect(zoneAt(spot.x, spot.z)?.id).toBe('cote-aux-villages');
    W.debarquement = spot;
  });

  it('du débarquement, le vrai Player monte à pied de la plage à la prairie de la côte', () => {
    const spot = W.debarquement ?? PLAGE_NORD;
    const stub = {
      root: { position: new THREE.Vector3(), rotation: { y: 0 } },
      pose: 'idle',
      busy: false,
      setPose(p) {
        this.pose = p;
      },
      update() {},
      bounce() {},
    };
    const P = new Player(stub);
    P.place(spot.x, spot.z, Math.PI);
    const nord = { move: new THREE.Vector3(0, 0, -1), sprint: false };
    for (let i = 0; i < 12 * 60; i++) P.update(1 / 60, nord);
    expect(P.swimming).toBe(false);
    expect(P.pos.z).toBeLessThan(spot.z - 25);
    expect(nav.groundAt(P.pos.x, P.pos.z).y).toBeGreaterThan(1.5);
    expect(nav.waterDepth(P.pos.x, P.pos.z)).toBe(0);
    expect(zoneAt(P.pos.x, P.pos.z)?.id).toBe('cote-aux-villages');
    // et la plage du débarquement fait partie du parcours à pied de la Grande Île
    expect(atteintPres(spot.x, spot.z)).toBeGreaterThanOrEqual(0);
  });
});

describe('L’Île Verte : sortie (C11)', () => {
  it('chaque zone de la Grande Île touche une côte praticable reliée à pied à son intérieur', () => {
    const { H, D, K } = W.G;
    // côte praticable : nœud atteint, sec, où l'on tient debout (gy ≥ −0,25 comme Sailing.landingSpot),
    // à moins de 6 m d'une mer où le bateau flotte (profondeur > 0,45 m)
    const cotes = Object.fromEntries(ZONES_GRANDE_ILE.map((z) => [z, 0]));
    for (let k = 0; k < NX * NZ; k += 1) {
      if (!W.atteint[k] || K[k] !== 0 || D[k] > 0.2 || H[k] < -0.25 || H[k] > 2) continue;
      const x = xDe(k);
      const z = zDe(k);
      let mer = false;
      for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6], [4, 4], [-4, 4], [4, -4], [-4, -4]]) {
        const b = noeud(x + dx, z + dz);
        if (b >= 0 && b < NX * NZ && K[b] === 2 && D[b] > 0.45) mer = true;
      }
      if (!mer) continue;
      const zn = zoneAt(x, z)?.id;
      if (zn in cotes) cotes[zn]++;
    }
    // au moins 200 m de côte praticable (100 nœuds de 2 m) par zone
    for (const zn of ZONES_GRANDE_ILE) expect(cotes[zn], zn).toBeGreaterThan(100);
  }, 30000);

  it('les sorties par la mer de la fiche sont des côtes atteintes à pied, d’où le vrai bateau repart', () => {
    const s = bateau('radeau', 0, 0, 0);
    for (const so of SORTIES) {
      expect(zoneAt(so.x, so.z)?.id, so.id).toBe(so.zone);
      expect(atteintPres(so.x, so.z, 10), `${so.id} à pied`).toBeGreaterThanOrEqual(0);
      // une eau navigable pour le bateau à moins de 60 m, et de là une plage où (re)débarquer
      let quai = null;
      for (let r = 4; r <= 60 && !quai; r += 2) {
        for (let a = 0; a < 32 && !quai; a++) {
          const x = so.x + Math.sin((a / 32) * Math.PI * 2) * r;
          const z = so.z + Math.cos((a / 32) * Math.PI * 2) * r;
          if (nav.waterLevelAt(x, z) === 0 && empreinteFlotte(s, x, z, 0)) {
            s.pos.set(x, 0, z);
            s.heading = 0;
            if (s.landingSpot()) quai = { x, z };
          }
        }
      }
      expect(quai, `${so.id} : bateau à quai`).toBeTruthy();
    }
  });

  it('Ton île reste atteignable : la mer de chaque sortie est reliée au ponton, et la plage nord à pied de partout', () => {
    const relie = merNavigable();
    expect(relie(PLAGE_NORD.x, PLAGE_NORD.z, 24)).toBe(true);
    for (const so of SORTIES) expect(relie(so.x, so.z, 64), so.id).toBe(true);
    // de chaque point de la fiche, la plage nord (en face du ponton) est dans le même parcours à pied
    expect(atteintPres(PLAGE_NORD.x, PLAGE_NORD.z - 4)).toBeGreaterThanOrEqual(0);
    for (const pt of POINTS) expect(atteintPres(pt.x, pt.z), pt.nom).toBeGreaterThanOrEqual(0);
  }, 60000);
});

describe('L’Île Verte : exploration à pied (C02)', () => {
  it('les trois zones de la Grande Île sont contiguës, sur la même terre', () => {
    const { K, H } = W.G;
    const contacts = new Map();
    const paire = (a, b) => [a, b].sort().join(' / ');
    for (let j = 0; j < NZ; j += 1) {
      for (let i = 0; i + 1 < NX; i += 1) {
        const k = j * NX + i;
        if (K[k] === 2 || H[k] <= 0) continue;
        for (const b of [k + 1, k + NX]) {
          if (b >= NX * NZ || K[b] === 2 || H[b] <= 0) continue;
          const za = zoneAt(xDe(k), zDe(k))?.id;
          if (!ZONES_GRANDE_ILE.includes(za)) continue;
          const zb = zoneAt(xDe(b), zDe(b))?.id;
          if (zb && zb !== za && ZONES_GRANDE_ILE.includes(zb)) contacts.set(paire(za, zb), (contacts.get(paire(za, zb)) || 0) + 1);
        }
      }
      if (contacts.size === 3 && [...contacts.values()].every((n) => n > 50)) break;
    }
    expect(contacts.get(paire('cote-aux-villages', 'foret-des-souvenirs'))).toBeGreaterThan(50);
    expect(contacts.get(paire('cote-aux-villages', 'plateau-vente'))).toBeGreaterThan(50);
    expect(contacts.get(paire('foret-des-souvenirs', 'plateau-vente'))).toBeGreaterThan(50);
  }, 60000);

  it('les points de la fiche sont dans leur zone et à pied d’œuvre depuis la plage du débarquement', () => {
    for (const pt of POINTS) {
      expect(zoneAt(pt.x, pt.z)?.id, pt.nom).toBe(pt.zone);
      expect(atteintPres(pt.x, pt.z), pt.nom).toBeGreaterThanOrEqual(0);
    }
  });

  it('presque toute la terre de chaque zone est praticable à pied (≥ 95 % des nœuds de 2 m, hors troncs)', () => {
    const { H, K } = W.G;
    const st = Object.fromEntries(ZONES_GRANDE_ILE.map((z) => [z, [0, 0]]));
    for (let k = 0; k < NX * NZ; k += 3) {
      if (H[k] <= 0 || K[k] >= 2) continue;
      const zn = zoneAt(xDe(k), zDe(k))?.id;
      if (!(zn in st)) continue;
      st[zn][1]++;
      if (W.atteint[k]) st[zn][0]++;
    }
    for (const zn of ZONES_GRANDE_ILE) {
      expect(st[zn][1], zn).toBeGreaterThan(1000);
      expect(st[zn][0] / st[zn][1], zn).toBeGreaterThan(0.95);
    }
  }, 30000);

  it('signale l’escarpement du Plateau venté (REP-03) : infranchissable de face, contourné par une autre rampe', () => {
    // profil de (430, −701) au pied à (460, −722) sur la table : ~45 m de dénivelé
    const pied = nav.groundAt(430, -701).y;
    const haut = nav.groundAt(460, -722).y;
    expect(haut - pied).toBeGreaterThan(35);
    let bloque = false;
    let prev = pied;
    for (let t = 1; t <= 30; t++) {
      const x = 430 + t;
      const z = -701 - t * 0.7;
      const y = nav.groundAt(x, z).y;
      const dist = Math.hypot(1, 0.7);
      if (!(climbable(y - prev, dist, Infinity, T) && (y - prev) / dist <= PENTE_MAX)) bloque = true;
      prev = y;
    }
    expect(bloque).toBe(true);
    // le pied et le dessus sont pourtant dans le même parcours à pied (par une autre pente)
    expect(atteintPres(430, -701)).toBeGreaterThanOrEqual(0);
    expect(atteintPres(470, -729)).toBeGreaterThanOrEqual(0);
  });
});

describe('L’Île Verte : collecte et ressources (C04)', () => {
  // arbres du plan de la Grande Île par zone de l'Île Verte
  function arbresParZone() {
    const { d, p } = W;
    const out = Object.fromEntries(ZONES_GRANDE_ILE.map((z) => [z, []]));
    for (let k = 0, q = 0; k < p.items.length; k += STRIDE, q++) {
      const kind = KINDS[p.items[k]];
      if (!TREES.has(kind)) continue;
      if (q % 7) continue; // échantillon (zoneAt coûte) : un arbre sur sept
      const x = d.x + p.items[k + 1];
      const z = d.z + p.items[k + 3];
      const zn = zoneAt(x, z)?.id;
      if (zn in out) out[zn].push({ kind, x, z, y: p.items[k + 2], idx: q, id: p.ids[q] });
    }
    return out;
  }

  it('la génération place des arbres récoltables à la hache dans chaque zone, qui donnent du bois', () => {
    const par = arbresParZone();
    W.arbres = par;
    for (const zn of ZONES_GRANDE_ILE) {
      expect(par[zn].length, zn).toBeGreaterThan(50);
      for (const kind of new Set(par[zn].map((a) => a.kind))) {
        const def = HARVEST[kind];
        expect(def, kind).toBeTruthy();
        expect(def.tool, kind).toBe('hache');
        expect(def.tier, kind).toBe(1); // la hache en bois suffit
        expect(def.drops.some(([id, min, , pr = 1]) => id === 'bois' && min >= 1 && pr === 1), kind).toBe(true);
      }
    }
  }, 60000);

  // Partie factice autour de la vraie récolte : Gather, Inventory, plan de section (cropPlan) comme en jeu
  function partieRecolte(sec, plan) {
    const e = { desc: sec, plan, hidden: new Set() };
    const game = {
      state: { harvest: {}, sel: 0 },
      inv: new Inventory([{ id: 'hache_bois', n: 1 }]),
      player: {
        mode: 'free',
        pos: new THREE.Vector3(),
        facing: 0,
        swimming: false,
        climbing: false,
        faceTowards() {},
        playAction(pose, dur, fin) {
          fin();
        },
      },
      character: { held: null, holdItem(m) {
        this.held = m;
      } },
      islands: {
        entries: new Map([[sec.id, e]]),
        // IslandManager.itemsNear, partie « plan » (les tuiles ne portent que la petite végétation)
        itemsNear(x, z, r) {
          const out = [];
          const lx = x - sec.x;
          const lz = z - sec.z;
          const it = plan.items;
          for (let k = 0; k < it.length; k += STRIDE) {
            const dx = it[k + 1] - lx;
            const dz = it[k + 3] - lz;
            if (dx * dx + dz * dz > r * r) continue;
            const idx = k / STRIDE;
            if (e.hidden.has(idx)) continue;
            out.push({ e, ref: { tile: null, idx }, id: plan.ids[idx], kind: KINDS[it[k]], x: sec.x + it[k + 1], y: it[k + 2], z: sec.z + it[k + 3], scale: it[k + 5], variant: it[k + 6], d: Math.sqrt(dx * dx + dz * dz) });
          }
          return out;
        },
        setItemVisible(ent, ref, vis) {
          if (!vis) ent.hidden.add(ref.idx);
        },
      },
      ui: { toast() {}, pickup() {} },
      markDirty() {},
    };
    const g = new Gather(game);
    g.rng = mulberry32(20261024);
    return { g, game, e };
  }

  const sectionDe = (x, z) => ISLANDS.find((q) => q.parent === 'grande-ile' && Math.abs(x - q.x) < 256 && Math.abs(z - q.z) < 256);

  it('le vrai Gather abat un arbre de chaque zone avec la hache de départ et remplit l’inventaire', () => {
    const par = W.arbres ?? arbresParZone();
    for (const zn of ZONES_GRANDE_ILE) {
      // un arbre isolé (aucun autre élément du plan à moins de 2,6 m du joueur)
      let fait = false;
      for (const a of par[zn]) {
        const sec = sectionDe(a.x, a.z);
        const plan = cropPlan(W.p, sec);
        const { g, game } = partieRecolte(sec, plan);
        const P = game.player;
        P.pos.set(a.x, a.y, a.z + 1.2);
        P.facing = Math.PI; // regarde vers −z, l'arbre devant soi
        const proches = game.islands.itemsNear(P.pos.x, P.pos.z, 2.6);
        if (proches.length !== 1) continue;
        const cible = g.findTarget();
        expect(cible?.mode, zn).toBe('harvest');
        expect(cible.kind).toBe(a.kind);
        g.target = cible;
        expect(g.act()).toBe(true);
        const gains = Object.fromEntries(game.inv.slots.filter((s) => s && s.id !== 'hache_bois').map((s) => [s.id, s.n]));
        expect(gains.bois ?? 0, `${zn} ${a.kind}`).toBeGreaterThanOrEqual(HARVEST[a.kind].drops.find(([id]) => id === 'bois')?.[1] ?? 0);
        expect(Object.keys(gains).length).toBeGreaterThan(0);
        // l'arbre est marqué récolté (repousse) sous son identifiant stable, dans sa section
        expect(Object.keys(game.state.harvest[sec.id] || {})).toEqual([String(a.id)]);
        expect(g.findTarget()).toBe(null);
        fait = true;
        break;
      }
      expect(fait, `${zn} : aucun arbre isolé`).toBe(true);
    }
  }, 60000);

  it('le décor naturel de ces zones (buissons, rochers, fougères) ne se récolte pas', () => {
    const { d, p } = W;
    let essais = 0;
    for (let k = 0, q = 0; k < p.items.length && essais < 3; k += STRIDE, q++) {
      const kind = KINDS[p.items[k]];
      if (!DECOR.has(kind) || !HARVEST[kind]) continue;
      const x = d.x + p.items[k + 1];
      const z = d.z + p.items[k + 3];
      if (!ZONES_GRANDE_ILE.includes(zoneAt(x, z)?.id)) continue;
      const sec = sectionDe(x, z);
      const plan = cropPlan(p, sec);
      const { g, game } = partieRecolte(sec, plan);
      game.player.pos.set(x, p.items[k + 2], z + 1);
      game.player.facing = Math.PI;
      const proches = game.islands.itemsNear(x, z + 1, 2.6);
      if (proches.some((c) => TREES.has(c.kind))) continue;
      expect(proches.some((c) => c.kind === kind)).toBe(true);
      expect(g.findTarget(), kind).toBe(null);
      essais++;
    }
    expect(essais).toBe(3);
  }, 60000);
});
