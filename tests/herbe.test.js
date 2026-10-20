// Herbe en tapis (render/herbe/) : placement par préfixe, anneaux de densité, budgets par
// préréglage sur un balayage de caméra, coût et seuil des mises à jour.
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { CELL, BLADES, HERBE_PRESETS, bladesAt, r2, ringOf, cellsForTile, bladesDrawn } from '../src/render/herbe/placement.js';
import { HerbeSystem, champDeSecours } from '../src/render/herbe/HerbeSystem.js';
import { ORIGIN } from '../src/core/globals.js';

const V = 65;

// tuile plate et verte (données comme celles du Worker), posée dans une île à l'origine
function fakeTile(tx, tz, island) {
  const positions = new Float32Array(V * V * 3);
  const colors = new Float32Array(V * V * 3);
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < V; i++) {
      const k = j * V + i;
      positions.set([tx * 64 + i, 2, tz * 64 + j], k * 3);
      colors.set([0.5, 0.75, 0.45], k * 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const group = new THREE.Group();
  island.add(group);
  const t = { x0: tx * 64, z0: tz * 64, group, mesh: { geometry: geo }, active: true };
  return { t, tile: { positions, colors, x0: t.x0, z0: t.z0 } };
}

function system(preset) {
  const H = new HerbeSystem({ id: 1 });
  H.setPreset(preset);
  const island = new THREE.Group();
  const e = { desc: { x: 0, z: 0 } };
  for (let tz = -2; tz <= 1; tz++) {
    for (let tx = -2; tx <= 1; tx++) {
      const { t, tile } = fakeTile(tx, tz, island);
      H.addTile(e, t, tile);
    }
  }
  const cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 2000);
  H.camera = cam;
  return { H, cam };
}

// caméra de jeu : à dist m du joueur, relevée de pitch rad, regard vers le joueur
function place(cam, focus, yaw, pitch, dist) {
  const cp = Math.cos(pitch);
  cam.position.set(focus.x + Math.sin(yaw) * cp * dist, 2 + Math.sin(pitch) * dist, focus.z + Math.cos(yaw) * cp * dist);
  cam.lookAt(focus.x, 2.7, focus.z);
  cam.updateMatrixWorld();
}

describe('herbe en tapis : placement', () => {
  it('tout préfixe des brins d’une cellule reste bien réparti (suite R2)', () => {
    const p = [0, 0];
    for (const n of [16, 64, 128, 256, 384]) {
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([...r2(i, p)]);
      // distance minimale entre brins voisins : au moins 0,5 / √n de la cellule
      let dmin = Infinity;
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          let dx = Math.abs(pts[a][0] - pts[b][0]);
          let dz = Math.abs(pts[a][1] - pts[b][1]);
          dx = Math.min(dx, 1 - dx);
          dz = Math.min(dz, 1 - dz);
          dmin = Math.min(dmin, Math.hypot(dx, dz));
        }
      }
      expect(dmin, `n = ${n}`).toBeGreaterThan(0.5 / Math.sqrt(n));
      // chaque quart de la cellule reçoit sa part (à 25 % près)
      const q = [0, 0, 0, 0];
      for (const [x, z] of pts) q[(x < 0.5 ? 0 : 1) + (z < 0.5 ? 0 : 2)]++;
      for (const c of q) expect(Math.abs(c - n / 4)).toBeLessThanOrEqual(Math.max(2, n * 0.25 * 0.25));
    }
  });

  it('la densité décroît continûment avec la distance, sans saut d’anneau', () => {
    for (const P of Object.values(HERBE_PRESETS)) {
      let prev = bladesAt(0, P);
      expect(prev).toBe(P.blades[0]);
      for (let d = 0.01; d < 70; d += 0.01) {
        const n = bladesAt(d, P);
        expect(n).toBeLessThanOrEqual(prev + 1e-9);
        expect(prev - n).toBeLessThan(P.blades[0] * 0.01); // au plus 1 % par centimètre : pas de saut
        prev = n;
      }
      expect(bladesAt(P.rings[2] + 0.01, P)).toBe(0);
    }
  });

  it('chaque cellule est dessinée par un anneau qui a assez de brins pour tous ses points', () => {
    for (const P of Object.values(HERBE_PRESETS)) {
      for (let dc = 0; dc < 70; dc += 0.37) {
        const ring = ringOf(dc, P);
        const need = bladesAt(Math.max(0, dc - (CELL * Math.SQRT2) / 2), P);
        if (need <= 0) continue;
        expect(ring, `dc = ${dc}`).toBeGreaterThanOrEqual(0);
        expect(P.blades[ring]).toBeGreaterThanOrEqual(need - 1e-9);
      }
    }
  });

  it('les cellules d’une tuile ne sortent pas de la tuile et ne sont comptées qu’une fois', () => {
    const P = HERBE_PRESETS.high;
    const out = [[], [], []];
    cellsForTile(0, 0, 64, 20, 30, P, out);
    const seen = new Set();
    for (const list of out) {
      for (let k = 0; k < list.length; k += 2) {
        expect(list[k]).toBeGreaterThanOrEqual(0);
        expect(list[k]).toBeLessThan(64);
        expect(list[k + 1]).toBeGreaterThanOrEqual(0);
        expect(list[k + 1]).toBeLessThan(64);
        const key = `${list[k]},${list[k + 1]}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(32 * 32); // tuile entière à moins de 60 m du joueur
    expect(bladesDrawn(out, P)).toBeGreaterThan(0);
  });
});

describe('herbe en tapis : budgets et mises à jour', () => {
  it('reste sous le plafond de brins de chaque préréglage sur un balayage de caméra', () => {
    const caps = { high: 120000, medium: 75000, low: 30000 };
    const worst = {};
    for (const [name, cap] of Object.entries(caps)) {
      const { H, cam } = system(name);
      const focus = new THREE.Vector3(0, 2, 0);
      let max = 0;
      for (let dist = 8; dist <= 30; dist += 4) {
        for (let pitch = 0.25; pitch <= 1.15; pitch += 0.15) {
          for (let yaw = 0; yaw < 6.28; yaw += 1.1) {
            place(cam, focus, yaw, pitch, dist);
            H.dirty = true;
            H.update(focus);
            max = Math.max(max, H.stats.blades);
          }
        }
      }
      worst[name] = max;
      console.info(`herbe ${name} : au plus ${max} brins dessinés`);
      expect(max, name).toBeLessThanOrEqual(cap);
      expect(max, name).toBeGreaterThan(cap * 0.2);
    }
    expect(worst.high).toBeGreaterThan(worst.medium);
    expect(worst.medium).toBeGreaterThan(worst.low);
  });

  it('ne recalcule rien sous 0,25 m de déplacement ; une mise à jour coûte peu', () => {
    const { H, cam } = system('high');
    const focus = new THREE.Vector3(0, 2, 0);
    place(cam, focus, 0.8, 0.56, 14);
    H.update(focus);
    const n0 = H.stats.updates;
    focus.x += 0.1;
    H.update(focus);
    expect(H.stats.updates).toBe(n0);
    // 500 mouvements de 0,3 m (chacun recalcule)
    let total = 0;
    for (let k = 0; k < 500; k++) {
      focus.x += 0.3 * Math.cos(k * 0.05);
      focus.z += 0.3 * Math.sin(k * 0.05);
      place(cam, focus, 0.8 + k * 0.002, 0.56, 14);
      H.update(focus);
      total += H.stats.updateMs;
    }
    expect(H.stats.updates).toBe(n0 + 500);
    expect(total / 500).toBeLessThan(1);
  });

  it('carte de secours : herbe sur le sol peint en vert, rien sur un chemin, du sable ou de la roche', () => {
    const tile = { positions: new Float32Array(V * V * 3).fill(2), colors: new Float32Array(V * V * 3) };
    const set = (k, c) => tile.colors.set(c, k * 3);
    set(0, [0.5, 0.75, 0.45]); // prairie
    set(1, [0.96, 0.9, 0.76]); // chemin
    set(2, [0.9, 0.84, 0.66]); // sable
    set(3, [0.8, 0.74, 0.78]); // roche
    const c = champDeSecours(tile);
    expect(c[0]).toBeGreaterThan(100);
    expect(c[4]).toBe(0);
    expect(c[8]).toBe(0);
    expect(c[12]).toBe(0);
    expect(BLADES).toBe(384);
  });

  it('l’épée fauche l’herbe d’un disque, qui ne se fauche pas deux fois et repousse en deux minutes', () => {
    const { H } = system('medium');
    const first = H.cut(10, 12, 1.3);
    expect(first).toBeGreaterThan(0.5); // prairie de secours, densité 0,7
    const tile = [...H.tiles].find((t) => t.x0 === 0 && t.z0 === 0);
    expect(tile.herbe.coupe).not.toBeNull();
    expect(tile.herbe.material.uniforms.uCoupe.value).toBe(tile.herbe.coupeTex);
    expect(tile.herbe.coupe[24 * 129 + 20]).toBe(255); // centre du disque (10 ; 12)
    expect(H.cut(10, 12, 1.3)).toBeLessThan(first * 0.35); // déjà fauchée (seul le bord doux reste)
    // à cheval sur deux tuiles (0,0 déjà fauchée et 1,0) : les deux sont fauchées
    H.cut(64, 30, 1.3);
    const cutTiles = [...H.tiles].filter((t) => t.herbe.coupe).map((t) => `${t.x0},${t.z0}`);
    expect(cutTiles.sort()).toEqual(['0,0', '64,0']);
    for (let s = 0; s < 60; s++) H.regrow(1);
    expect(tile.herbe.coupe).not.toBeNull();
    for (let s = 0; s < 70; s++) H.regrow(1);
    expect(tile.herbe.coupe).toBeNull();
    expect(H.cut(10, 12, 1.3)).toBeGreaterThan(0.5);
  });

  it('les pousseurs passent en coordonnées de la scène, les places libres sont éteintes', () => {
    const { H } = system('low');
    ORIGIN.set(100, 0, -50);
    H.setPushers([{ x: 103, z: -48, r: 1, s: 1 }, { x: 90, z: -40, r: 0.9, s: 0.5 }]);
    const P = H.shared.uPushers.value;
    expect(P[0].toArray()).toEqual([3, 2, 1, 1]);
    expect(P[1].toArray()).toEqual([-10, 10, 0.9, 0.5]);
    for (let k = 2; k < 8; k++) expect(P[k].z).toBe(0);
    ORIGIN.set(0, 0, 0);
  });
});

describe('herbe en tapis : île de départ', () => {
  it('pré dense sur les terrasses, rien dans la mare, le potager ni sur les chemins', async () => {
    const { installCanvasStub } = await import('./helpers/canvas.js');
    installCanvasStub();
    const { buildTerrain, LAYOUT, pathMask } = await import('../src/world/home/terrain.js');
    const { buildProps } = await import('../src/world/home/props.js');
    const { champsMaison } = await import('../src/render/grass.js');
    const tiles = champsMaison(buildTerrain(), buildProps().obstacles);
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    const at = (x, z) => {
      for (const { tile } of tiles) {
        const i = Math.round(x - tile.x0);
        const j = Math.round(z - tile.z0);
        if (i >= 0 && j >= 0 && i < 65 && j < 65) return tile.herbe[(j * 65 + i) * 4] / 255;
      }
      return 0;
    };
    expect(at(LAYOUT.pond.x, LAYOUT.pond.z)).toBe(0);
    expect(at(LAYOUT.garden.x, LAYOUT.garden.z)).toBe(0);
    // densité moyenne du pré (nœuds herbeux) et chemins
    let sum = 0;
    let n = 0;
    let onPath = 0;
    for (const { tile } of tiles) {
      for (let k = 0; k < 65 * 65; k++) {
        const d = tile.herbe[k * 4] / 255;
        const x = tile.positions[k * 3];
        const z = tile.positions[k * 3 + 2];
        if (pathMask(x, z) > 0.5 && d > 0) onPath++;
        if (d > 0) {
          sum += d;
          n++;
        }
      }
    }
    expect(onPath).toBe(0);
    expect(n).toBeGreaterThan(1000); // plus de 1 000 m² d'herbe
    expect(sum / n).toBeGreaterThan(0.35);
  });
});
