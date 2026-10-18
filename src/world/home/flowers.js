import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { lavandeGeante, archeGlycine } from '../../models/plantes/raretes/index.js';
import physiqueRaretes from '../../models/plantes/raretes/physique.js';
import { MAT } from '../../models/kit/materials.js';
import { LAYOUT, heightAt, pathMask, vnoise, distToPolyline } from './terrain.js';

// ---------------------------------------------------------------------------
// Fleurs décoratives : l'île est fleurie dès le premier jour, en massifs.
// 6 espèces low-poly instanciées ; les pétales reçoivent la couleur d'instance
// (masque aTint), tiges et feuilles gardent leur vert.
// ---------------------------------------------------------------------------

const STEM = '#78c27f';
const LEAF = '#86cc88';
const LEAF2 = '#6fba84';

const C = {
  blanc: '#fff8ef', beurre: '#f8df8c', corail: '#f6a58f', rose: '#f7b5c7', lilas: '#c8b2ef',
  bleu: '#a6c8f2', violet: '#ae97e4', jaune: '#f9d46a', peche: '#f9c2a0',
};

// Couleurs par zone (règle du prompt)
const ZONES = {
  chemin: { colors: ['blanc', 'beurre', 'blanc', 'beurre'], species: { marguerite: 5, trefle: 3, campanule: 1 } },
  maison: { colors: ['corail', 'rose', 'rose', 'peche'], species: { coquelicot: 5, marguerite: 3, tournesol: 1 } },
  pre: { colors: ['lilas', 'bleu', 'lilas', 'violet'], species: { lavande: 4, campanule: 4, trefle: 2, marguerite: 2 } },
  plateau: { colors: ['jaune', 'blanc', 'beurre', 'blanc'], species: { marguerite: 5, tournesol: 3, trefle: 2 } },
  bassin: { colors: ['bleu', 'violet', 'lilas', 'bleu'], species: { campanule: 5, lavande: 3, trefle: 1 } },
  bureau: { colors: ['blanc', 'lilas', 'beurre', 'lilas'], species: { lavande: 4, marguerite: 4, campanule: 2 } },
  echoppe: { colors: ['jaune', 'corail', 'beurre', 'peche'], species: { tournesol: 4, coquelicot: 3, marguerite: 2 } },
  libre: { colors: ['blanc', 'rose', 'beurre', 'lilas', 'bleu'], species: { marguerite: 4, coquelicot: 2, trefle: 3, campanule: 2, lavande: 1 } },
};

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickWeighted(weights, r) {
  const entries = Object.entries(weights);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let t = r * total;
  for (const [k, w] of entries) {
    t -= w;
    if (t <= 0) return k;
  }
  return entries[0][0];
}

// --- géométries (pétales : tint 1 ; le reste : tint 0) ---------------------
// petite touffe de feuilles rondes à la base : donne du volume aux massifs
function rosetteBase(b, r = 0.09) {
  b.add(G.sphere(r, 6, 4), LEAF2, { p: [0, r * 0.35, 0], s: [1.25, 0.5, 1.25], tint: 0 });
  b.add(G.sphere(r * 0.8, 5, 3), LEAF, { p: [r * 0.6, r * 0.3, r * 0.3], s: [1.2, 0.45, 1.1], tint: 0 });
  b.add(G.sphere(r * 0.75, 5, 3), LEAF, { p: [-r * 0.55, r * 0.28, -r * 0.35], s: [1.2, 0.45, 1.1], tint: 0 });
}

function stemLeaves(b, h, leafY = 0.07) {
  b.add(G.cyl(0.011, 0.014, h, 5), STEM, { p: [0, h / 2, 0], tint: 0 });
  b.add(G.sphere(0.045, 5, 3), LEAF, { p: [0.04, leafY, 0], s: [1.5, 0.3, 0.7], r: [0, 0, 0.5], tint: 0 });
  b.add(G.sphere(0.04, 5, 3), LEAF2, { p: [-0.035, leafY + 0.04, 0.01], s: [1.5, 0.3, 0.7], r: [0, 0.4, -0.5], tint: 0 });
}

const SPECIES = {
  marguerite() {
    const b = new Builder();
    const h = 0.24;
    rosetteBase(b, 0.085);
    stemLeaves(b, h);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.add(G.sphere(0.06, 5, 3), '#ffffff', { p: [Math.cos(a) * 0.07, h + 0.005, Math.sin(a) * 0.07], s: [1.6, 0.3, 0.68], r: [0, -a, 0.15], tint: 1 });
    }
    b.add(G.sphere(0.045, 6, 4), '#f4c34a', { p: [0, h + 0.022, 0], s: [1, 0.7, 1], tint: 0 });
    return b.build();
  },
  coquelicot() {
    const b = new Builder();
    const h = 0.3;
    rosetteBase(b, 0.08);
    b.add(G.cyl(0.01, 0.013, h * 0.55, 5), STEM, { p: [0, h * 0.27, 0], tint: 0 });
    b.add(G.cyl(0.01, 0.01, h * 0.5, 5), STEM, { p: [0.02, h * 0.75, 0], r: [0, 0, -0.15], tint: 0 });
    b.add(G.sphere(0.05, 5, 3), LEAF, { p: [0.04, 0.06, 0], s: [1.6, 0.28, 0.6], r: [0, 0, 0.5], tint: 0 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      b.add(G.sphere(0.092, 6, 4), '#ffffff', { p: [0.045 + Math.cos(a) * 0.06, h + 0.05, Math.sin(a) * 0.06], s: [0.95, 0.72, 0.5], r: [Math.sin(a) * 0.6, -a, -Math.cos(a) * 0.6], tint: 1 });
    }
    b.add(G.sphere(0.032, 5, 3), '#7a5576', { p: [0.045, h + 0.065, 0], tint: 0 });
    return b.build();
  },
  lavande() {
    const b = new Builder();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const tilt = 0.18 + (k % 3) * 0.06;
      const h = 0.36 + (k % 2) * 0.08;
      const tx = Math.sin(tilt) * Math.cos(a);
      const tz = Math.sin(tilt) * Math.sin(a);
      b.add(G.cyl(0.007, 0.009, h, 4), '#8fb88c', { p: [tx * h * 0.5, h / 2, tz * h * 0.5], r: [tz * 0.9, 0, -tx * 0.9], tint: 0 });
      for (let j = 0; j < 5; j++) {
        const t = 0.62 + j * 0.08;
        b.add(G.sphere(0.032 - j * 0.002, 5, 3), '#ffffff', { p: [tx * h * t, h * t, tz * h * t], tint: 1 });
      }
    }
    b.add(G.sphere(0.13, 6, 4), '#9cc39a', { p: [0, 0.04, 0], s: [1.2, 0.45, 1.2], tint: 0 });
    return b.build();
  },
  campanule() {
    const b = new Builder();
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      pts.push(new THREE.Vector3(Math.sin(t * 1.5) * 0.12, Math.sin(t * Math.PI * 0.62) * 0.34, 0));
    }
    for (let i = 0; i < 5; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const m = p.clone().add(q).multiplyScalar(0.5);
      b.add(G.cyl(0.009, 0.011, p.distanceTo(q) + 0.01, 4), STEM, { p: [m.x, m.y, m.z], r: [0, 0, -Math.atan2(q.x - p.x, q.y - p.y)], tint: 0 });
    }
    b.add(G.sphere(0.045, 5, 3), LEAF, { p: [0.03, 0.05, 0.02], s: [1.6, 0.3, 0.7], r: [0, 0.6, 0.4], tint: 0 });
    rosetteBase(b, 0.08);
    for (const k of [5, 4, 3]) {
      const p = pts[k];
      b.add(G.cone(0.072, 0.11, 6), '#ffffff', { p: [p.x + 0.01, p.y - 0.07, p.z], tint: 1 });
      b.add(G.sphere(0.016, 5, 3), '#fff7e0', { p: [p.x + 0.01, p.y - 0.13, p.z], tint: 0 });
    }
    return b.build();
  },
  trefle() {
    const b = new Builder();
    for (let i = 0; i < 7; i++) {
      const a = i * 2.39;
      const d = 0.06 + (i % 3) * 0.07;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      for (let k = 0; k < 3; k++) {
        const la = (k / 3) * Math.PI * 2 + i;
        b.add(G.sphere(0.042, 5, 3), k % 2 ? LEAF : '#9ad49a', { p: [x + Math.cos(la) * 0.04, 0.04 + (i % 2) * 0.012, z + Math.sin(la) * 0.04], s: [1, 0.3, 1], tint: 0 });
      }
    }
    for (const [x, z] of [[0.05, 0.04], [-0.08, -0.03], [0.02, -0.1]]) {
      b.add(G.cyl(0.007, 0.007, 0.11, 4), STEM, { p: [x, 0.055, z], tint: 0 });
      b.add(G.sphere(0.045, 5, 3), '#ffffff', { p: [x, 0.12, z], s: [1, 0.85, 1], tint: 1 });
    }
    return b.build();
  },
  tournesol() {
    const b = new Builder();
    const h = 0.3;
    rosetteBase(b, 0.09);
    b.add(G.cyl(0.016, 0.02, h, 6), STEM, { p: [0, h / 2, 0], tint: 0 });
    b.add(G.sphere(0.07, 6, 4), LEAF, { p: [0.06, 0.13, 0], s: [1.5, 0.3, 0.9], r: [0, 0, 0.4], tint: 0 });
    b.add(G.sphere(0.065, 6, 4), LEAF2, { p: [-0.055, 0.2, 0.02], s: [1.5, 0.3, 0.9], r: [0, 0.5, -0.4], tint: 0 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b.add(G.sphere(0.058, 5, 3), '#ffffff', { p: [Math.cos(a) * 0.1, h + 0.08 + Math.sin(a) * 0.1, 0.03], s: [1.7, 0.6, 0.3], r: [0, 0, a], tint: 1 });
    }
    b.add(G.sphere(0.075, 6, 4), '#a77a52', { p: [0, h + 0.08, 0.045], s: [1, 1, 0.45], tint: 0 });
    return b.build();
  },
};

// Grille spatiale pour savoir s'il y a déjà une fleur près d'un point
class Grid {
  constructor(cell = 1) {
    this.cell = cell;
    this.map = new Map();
  }
  key(x, z) {
    return `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
  }
  add(p) {
    const k = this.key(p.x, p.z);
    if (!this.map.has(k)) this.map.set(k, []);
    this.map.get(k).push(p);
  }
  near(x, z, r) {
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    const n = Math.ceil(r / this.cell);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const list = this.map.get(`${cx + i},${cz + j}`);
        if (!list) continue;
        for (const p of list) if ((p.x - x) ** 2 + (p.z - z) ** 2 < r * r) return true;
      }
    }
    return false;
  }
}

export class Flowers {
  constructor(obstacles) {
    this.obstacles = obstacles;
    this.group = new THREE.Group();
    this.group.name = 'fleurs';
    this.rand = rng(2024);
    this.grid = new Grid(1);
    this.base = []; // fleurs présentes dès le jour 1
    this.progress = []; // massifs débloqués par les heures d'étude
    this.massifs = []; // centres (papillons, lucioles)
    this.layout();
    this.buildMeshes();
    this.buildLilies();
    this.buildRares();
    this.setProgress(0);
  }

  // Raretés débloquées par le temps d'étude total
  buildRares() {
    this.rares = [];
    // lavandes géantes (10 h)
    const lav = new Builder();
    const spots = [[LAYOUT.desk.x + 3.4, LAYOUT.desk.z - 2.6], [LAYOUT.pond.x - 3.4, LAYOUT.pond.z + 2.4], [LAYOUT.house.x - 4.2, LAYOUT.house.z + 1.4]];
    const r = rng(31);
    const obstacles = [];
    for (const [cx, cz] of spots) {
      lavandeGeante(lav, cx, heightAt(cx, cz), cz, r);
      const { obstacles: obs, bas } = physiqueRaretes.lavandeGeante;
      for (const [ox, oz, rr] of obs) obstacles.push({ x: cx + ox, z: cz + oz, r: rr, low: bas });
    }
    const lavMesh = new THREE.Mesh(lav.build(), toonMaterial({ ...MAT.lavender }));
    lavMesh.name = 'lavandes-geantes';
    this.rares.push({ id: 'lavande', hours: 10, mesh: lavMesh, obstacles, label: 'Des lavandes géantes ont fleuri sur l\'île !' });
    // arche de glycine au-dessus du chemin de la maison (25 h)
    const gl = new Builder();
    const ax = 4.4;
    const az = 3.3;
    archeGlycine(gl, ax, heightAt(ax, az), az, r);
    const glMesh = new THREE.Mesh(gl.build(), toonMaterial({ ...MAT.wisteria }));
    glMesh.name = 'arche-glycine';
    this.rares.push({ id: 'glycine', hours: 25, mesh: glMesh, obstacles: physiqueRaretes.archeGlycine.obstacles.map(([ox, oz, rr]) => ({ x: ax + ox, z: az + oz, r: rr })), label: 'Une arche de glycine s\'est épanouie près de la maison !' });
    for (const rare of this.rares) {
      rare.mesh.visible = false;
      this.group.add(rare.mesh);
    }
  }

  // --- règles de placement ---
  zoneOf(x, z, y) {
    if (y > 2.6) return 'plateau';
    if (Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z) < LAYOUT.pond.r + 2.6) return 'bassin';
    if (Math.hypot(x - LAYOUT.house.x, z - LAYOUT.house.z) < 6) return 'maison';
    if (Math.hypot(x - LAYOUT.desk.x, z - LAYOUT.desk.z) < 4.5) return 'bureau';
    if (Math.hypot(x - LAYOUT.shop.x, z - LAYOUT.shop.z) < 4.5) return 'echoppe';
    if (x > 4 && z > 7.5) return 'pre';
    return 'libre';
  }

  canPlace(x, z, { onPathOk = false } = {}) {
    const y = heightAt(x, z);
    const onGrass = (y > 0.86 && y < 1.6) || (y > 3.15 && y < 3.75);
    if (!onGrass) return false;
    if (!onPathOk && pathMask(x, z) > 0.18) return false;
    const e = 0.35;
    if (Math.abs(heightAt(x + e, z) - heightAt(x - e, z)) > 0.28 || Math.abs(heightAt(x, z + e) - heightAt(x, z - e)) > 0.28) return false;
    for (const o of this.obstacles) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + 0.18) ** 2) return false;
    if (Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z) < LAYOUT.pond.r + 0.45) return false;
    if (distToPolyline(x, z, LAYOUT.river).d < 1.25 && y > 2.4) return false;
    if (Math.abs(x - LAYOUT.garden.x) < 4.7 && Math.abs(z - LAYOUT.garden.z) < 3.6) return false;
    const R = LAYOUT.ramp;
    if (x > R.x0 - 0.5 && x < R.x1 + 0.5 && z < R.zBottom + 0.6 && z > R.zTop - 0.3) return false;
    return true;
  }

  flower(x, z, zone, list, spacing = 0.2) {
    if (this.grid.near(x, z, spacing)) return false;
    if (!this.canPlace(x, z)) return false;
    const Z = ZONES[zone];
    const r = this.rand;
    const species = pickWeighted(Z.species, r());
    const color = C[Z.colors[Math.floor(r() * Z.colors.length)]];
    const f = { x, z, y: heightAt(x, z), species, color, scale: 1.3 + r() * 0.4, rot: r() * Math.PI * 2 };
    this.grid.add(f);
    list.push(f);
    return true;
  }

  // Massif : grappe de n fleurs serrées
  massif(cx, cz, n, radius, zone, list) {
    const r = this.rand;
    let placed = 0;
    for (let tries = 0; tries < n * 6 && placed < n; tries++) {
      const a = r() * Math.PI * 2;
      const d = radius * Math.sqrt(r());
      if (this.flower(cx + Math.cos(a) * d, cz + Math.sin(a) * d, zone, list, 0.15)) placed++;
    }
    if (placed >= 4 && list === this.base) this.massifs.push({ x: cx, z: cz, y: heightAt(cx, cz), zone, n: placed });
    return placed;
  }

  layout() {
    const r = this.rand;
    const base = this.base;
    // 1) bordures continues le long des chemins (une rangée de chaque côté, trouées)
    for (const path of LAYOUT.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, az] = path[i];
        const [bx, bz] = path[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const nx = -(bz - az) / len;
        const nz = (bx - ax) / len;
        for (let t = 0; t < len; t += 0.42) {
          const px = ax + ((bx - ax) * t) / len;
          const pz = az + ((bz - az) * t) / len;
          for (const side of [-1, 1]) {
            if (vnoise(px * 0.55 + side * 3.1, pz * 0.55) > 0.64) continue; // trouées naturelles
            const off = 1.0 + (vnoise(px * 1.7, pz * 1.7) - 0.5) * 0.3;
            const zone = this.zoneOf(px, pz, heightAt(px, pz));
            const z2 = zone === 'libre' || zone === 'pre' ? 'chemin' : zone;
            this.flower(px + nx * off * side, pz + nz * off * side, z2, base, 0.2);
            if (vnoise(px * 2.3, pz * 2.3 + side) > 0.45) this.flower(px + nx * (off + 0.28) * side + 0.1, pz + nz * (off + 0.28) * side, z2, base, 0.2);
          }
        }
      }
    }
    // 2) parterres devant les lieux
    const ring = (cx, cz, r0, r1, count, zone, skip = []) => {
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + r() * 0.3;
        if (skip.some(([s0, s1]) => a > s0 && a < s1)) continue;
        const d = r0 + r() * (r1 - r0);
        this.massif(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 9 + Math.floor(r() * 6), 0.85, zone, base);
      }
    };
    const H = LAYOUT.house;
    ring(H.x, H.z, 3.3, 4.2, 6, 'maison', [[1.2, 1.95]]); // porte au sud (+z)
    const L = LAYOUT.library;
    ring(L.x, L.z, 4.0, 4.8, 6, 'plateau', [[1.15, 2.1]]);
    const D = LAYOUT.desk;
    ring(D.x, D.z - 0.4, 2.6, 3.3, 5, 'bureau', [[-0.6, 0.5]]);
    const S = LAYOUT.shop;
    ring(S.x, S.z, 2.2, 2.9, 4, 'echoppe', [[2.6, 3.7]]);
    // 3) berges du bassin (côté prairie uniquement)
    const P = LAYOUT.pond;
    for (let k = 0; k < 6; k++) {
      const a = -0.2 + (k / 5) * (Math.PI + 0.4);
      this.massif(P.x + Math.cos(a) * (P.r + 1.2), P.z + Math.sin(a) * (P.r + 1.1), 9, 0.7, 'bassin', base);
    }
    // 4) prairie fleurie du pré sud-est
    for (let k = 0; k < 11; k++) {
      this.massif(6 + r() * 12, 9 + r() * 9, 14 + Math.floor(r() * 10), 1.3 + r() * 0.4, 'pre', base);
    }
    // 5) plateau et zones libres
    for (let k = 0; k < 5; k++) this.massif(-6 + r() * 20, -21 + r() * 7, 10 + Math.floor(r() * 8), 1.1, 'plateau', base);
    const libres = [[-16, 7], [-17, -4], [-7, 12], [15, -1], [-14, 13], [3, -3], [-8, -3], [18, 1], [-19, 1]];
    for (const [x, z] of libres) this.massif(x + (r() - 0.5) * 2, z + (r() - 0.5) * 2, 10 + Math.floor(r() * 8), 1.1, 'libre', base);

    // 6) massifs gagnés en étudiant (révélés un par un)
    const cand = [];
    for (let tries = 0; tries < 2000 && cand.length < 60; tries++) {
      const x = (r() * 2 - 1) * 20;
      const z = (r() * 2 - 1) * 22;
      if (!this.canPlace(x, z) || this.grid.near(x, z, 1.4)) continue;
      if (cand.some((c) => Math.hypot(c.x - x, c.z - z) < 3)) continue;
      cand.push({ x, z, d: Math.hypot(x - LAYOUT.desk.x, z - LAYOUT.desk.z) });
    }
    cand.sort((a, b) => a.d - b.d);
    this.progressMassifs = [];
    this.progressCenters = [];
    for (const c of cand.slice(0, 40)) {
      const list = [];
      const zone = this.zoneOf(c.x, c.z, heightAt(c.x, c.z));
      this.massif(c.x, c.z, 12 + Math.floor(r() * 8), 1.2, zone, list);
      if (list.length >= 6) {
        this.progressMassifs.push(list);
        this.progressCenters.push({ x: c.x, z: c.z, y: heightAt(c.x, c.z), zone, n: list.length });
      }
    }
  }

  buildMeshes() {
    // une InstancedMesh par espèce : d'abord les fleurs de base, puis les massifs
    // gagnés dans l'ordre où ils se débloquent
    this.meshes = {};
    this.counts = {};
    const order = {};
    for (const k of Object.keys(SPECIES)) order[k] = [];
    for (const f of this.base) order[f.species].push(f);
    this.cumul = []; // cumul[k][espèce] = nb d'instances des k premiers massifs gagnés
    const running = Object.fromEntries(Object.keys(SPECIES).map((k) => [k, 0]));
    this.cumul.push({ ...running });
    for (const list of this.progressMassifs) {
      for (const f of list) {
        order[f.species].push(f);
        running[f.species]++;
      }
      this.cumul.push({ ...running });
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    for (const [k, list] of Object.entries(order)) {
      const mat = toonMaterial({ vertexColors: true, tintMask: true, wind: 2.2, rim: 0.9, outline: 0.5, pigment: 0.5 });
      const mesh = new THREE.InstancedMesh(SPECIES[k](), mat, Math.max(1, list.length));
      list.forEach((f, i) => {
        q.setFromAxisAngle(up, f.rot);
        m.compose(new THREE.Vector3(f.x, f.y - 0.02, f.z), q, new THREE.Vector3(f.scale, f.scale * (0.9 + (i % 5) * 0.05), f.scale));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, col.set(f.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.name = `fleurs-${k}`;
      this.counts[k] = { base: this.base.filter((f) => f.species === k).length };
      this.meshes[k] = mesh;
      this.group.add(mesh);
    }
  }

  // Nénuphars en fleurs sur le bassin
  buildLilies() {
    const P = LAYOUT.pond;
    const b = new Builder();
    const r = rng(9);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.4 + r() * (P.r - 0.6);
      const x = P.x + Math.cos(a) * d;
      const z = P.z + Math.sin(a) * d * 0.8 + 0.4;
      const s = 0.22 + r() * 0.12;
      // feuille ronde avec son encoche
      b.add(new THREE.CylinderGeometry(s, s, 0.02, 14, 1, false, 0.4, Math.PI * 2 - 0.4), i % 2 ? '#7fc58a' : '#8fd193', { p: [x, P.level + 0.035, z], r: [0, r() * 6, 0], tint: 0 });
      if (i % 3 !== 2) {
        for (let k = 0; k < 6; k++) {
          const pa = (k / 6) * Math.PI * 2;
          b.add(G.sphere(0.045, 7, 5), i % 2 ? '#f9c5d4' : '#fff4f2', { p: [x + Math.cos(pa) * 0.045, P.level + 0.08, z + Math.sin(pa) * 0.045], s: [0.8, 0.9, 0.5], r: [Math.sin(pa) * 0.7, -pa, -Math.cos(pa) * 0.7], tint: 0 });
        }
        b.add(G.sphere(0.025, 6, 5), '#f6d27a', { p: [x, P.level + 0.09, z], tint: 0 });
      }
    }
    this.lilies = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, rim: 0.8, outline: 0.5 }));
    this.lilies.name = 'nenuphars';
    this.group.add(this.lilies);
  }

  // Révèle les massifs gagnés : 1 massif toutes les 30 min d'étude
  // renvoie les raretés nouvellement débloquées
  setProgress(hours) {
    const k = Math.max(0, Math.min(this.progressMassifs.length, Math.floor(hours * 2)));
    this.revealed = k;
    for (const [name, mesh] of Object.entries(this.meshes)) {
      mesh.count = this.counts[name].base + this.cumul[k][name];
    }
    const unlocked = [];
    for (const rare of this.rares || []) {
      const on = hours >= rare.hours;
      if (on && !rare.mesh.visible) unlocked.push(rare);
      rare.mesh.visible = on;
    }
    return unlocked;
  }

  // Y a-t-il une fleur (visible ou à venir) près de ce point ?
  near(x, z, r = 0.6) {
    return this.grid.near(x, z, r);
  }

  get visibleCount() {
    return Object.values(this.meshes).reduce((a, m) => a + m.count, 0);
  }

  // Centres de massifs visibles (papillons, lucioles)
  spots() {
    return this.massifs.concat(this.progressCenters.slice(0, this.revealed));
  }
}
