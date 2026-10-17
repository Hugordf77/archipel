import * as THREE from 'three';
import { LAYOUT, heightAt, smooth, distToPolyline } from './home/terrain.js';
import { U, ORIGIN } from '../core/globals.js';

// Toutes les coordonnées de ce module sont absolues (origine du monde = île de départ).
// L'île de départ est dessinée à la main ; au-delà, un « fournisseur » (le gestionnaire
// d'îles) donne le relief des îles générées. En pleine mer : le fond, très bas.
export const HOME_EXTENT = 40;
const SEA_FLOOR = -16;
let provider = null;
let waterProvider = null;
export function setGroundProvider(fn) {
  provider = fn;
}
// niveau de l'eau (lacs et rivières des îles générées) ; la mer est à 0
export function setWaterProvider(fn) {
  waterProvider = fn;
}
export function waterLevelAt(x, z) {
  if (isHome(x, z)) return 0;
  return waterProvider ? waterProvider(x, z) : 0;
}
function terrainY(x, z) {
  if (Math.abs(x) < HOME_EXTENT && Math.abs(z) < HOME_EXTENT) return heightAt(x, z);
  const h = provider ? provider(x, z) : null;
  return h ?? SEA_FLOOR;
}
export const isHome = (x, z) => Math.abs(x) < HOME_EXTENT && Math.abs(z) < HOME_EXTENT;

// Ponton et pont : surfaces marchables posées au-dessus de l'eau
let bridge = null;
export function setBridge(spot) {
  bridge = spot;
}

function pierY(x, z) {
  const P = LAYOUT.pier;
  if (Math.abs(x - P.x) > P.w / 2 + 0.05) return null;
  if (z < P.z0 - 1.4 || z > P.z1 + 0.2) return null;
  // petite rampe d'accès depuis la plage
  const start = heightAt(x, P.z0 - 1.4);
  return THREE.MathUtils.lerp(start, P.h + 0.05, smooth(P.z0 - 1.4, P.z0 + 0.1, z));
}

function bridgeY(x, z) {
  if (!bridge) return null;
  if (x < bridge.x0 - 0.1 || x > bridge.x1 + 0.1 || Math.abs(z - bridge.z) > bridge.w / 2) return null;
  const t = THREE.MathUtils.clamp((x - bridge.x0) / (bridge.x1 - bridge.x0), 0, 1);
  return bridge.base + Math.sin(t * Math.PI) * 0.38 + 0.05;
}

// Hauteur du sol marchable et type de surface (pour les pas)
export function groundAt(x, z) {
  const h = terrainY(x, z);
  if (!isHome(x, z)) return { y: h, surface: h < 0.75 ? (h < -0.3 ? 'water' : 'sand') : 'grass', deck: false };
  const py = pierY(x, z);
  if (py !== null && py > h - 0.05) return { y: Math.max(py, h), surface: 'wood', deck: true };
  const by = bridgeY(x, z);
  if (by !== null) return { y: by, surface: 'wood', deck: true };
  let surface = 'grass';
  if (h < 0.75) surface = 'sand';
  return { y: h, surface, deck: false };
}

// Profondeur d'eau sous un point (0 si sec)
export function waterDepth(x, z) {
  if (!isHome(x, z)) return Math.max(0, waterLevelAt(x, z) - terrainY(x, z));
  const h = heightAt(x, z);
  const pd = Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z);
  if (pd < LAYOUT.pond.r + 0.6) return Math.max(0, LAYOUT.pond.level - h);
  if (h > 2.2 && distToPolyline(x, z, LAYOUT.river).d < 1.1) return Math.max(0, LAYOUT.riverLevel - h);
  return Math.max(0, -h);
}

// Obstacles ronds { x, z, r } rangés dans une grille de 8 m (r ≤ 4 m)
const CELL = 8;
const grid = new Map();
const cellKey = (i, j) => i * 73856093 + j * 19349663;
let count = 0;
export function setObstacles(list) {
  grid.clear();
  count = 0;
  for (const o of list) addObstacle(o);
}
export function addObstacle(o) {
  const k = cellKey(Math.floor(o.x / CELL), Math.floor(o.z / CELL));
  let c = grid.get(k);
  if (!c) grid.set(k, (c = []));
  c.push(o);
  o._cell = k;
  count++;
  return o;
}
export function removeObstacle(o) {
  const c = grid.get(o._cell);
  if (!c) return;
  const i = c.indexOf(o);
  if (i >= 0) {
    c.splice(i, 1);
    count--;
  }
  if (!c.length) grid.delete(o._cell);
}
export function addObstacles(list) {
  for (const o of list) addObstacle(o);
}
export function removeObstacles(list) {
  for (const o of list) removeObstacle(o);
}
export function obstacleCount() {
  return count;
}
// parcourt les obstacles proches de (x, z)
function near(x, z, fn) {
  const i0 = Math.floor(x / CELL);
  const j0 = Math.floor(z / CELL);
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      const c = grid.get(cellKey(i, j));
      if (c) for (const o of c) if (fn(o)) return true;
    }
  }
  return false;
}

// Peut-on se tenir en (x, z) en venant d'une hauteur fromY, après un pas de longueur dist ?
export function canStand(x, z, fromY, dist) {
  const g = groundAt(x, z);
  if (!g.deck && waterDepth(x, z) > 0.32) return false;
  const slope = (g.y - fromY) / Math.max(dist, 0.001);
  if (Math.abs(g.y - fromY) > 0.08 && Math.abs(slope) > 1.45) return false;
  return true;
}

// Repousse un cercle (joueur) hors des obstacles
export function pushOut(pos, radius = 0.32) {
  near(pos.x, pos.z, (o) => {
    const dx = pos.x - o.x;
    const dz = pos.z - o.z;
    const r = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      pos.x = o.x + (dx / d) * r;
      pos.z = o.z + (dz / d) * r;
    }
    return false;
  });
}

// Premier obstacle qui chevauche le cercle (x, z, radius), ou null
let found = null;
export function obstacleAt(x, z, radius = 0.32) {
  found = null;
  near(x, z, (o) => {
    const dx = x - o.x;
    const dz = z - o.z;
    const r = o.r + radius;
    if (dx * dx + dz * dz < r * r) {
      found = o;
      return true;
    }
    return false;
  });
  return found;
}

export function blockedByObstacle(x, z, radius = 0.32) {
  return near(x, z, (o) => {
    const dx = x - o.x;
    const dz = z - o.z;
    const r = o.r + radius;
    return dx * dx + dz * dz < r * r;
  });
}

// Rayon souris → sol, en tenant compte de la courbure du monde (marche le long du rayon)
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _co = new THREE.Vector3();
export function pickGround(raycaster) {
  // rayon en coordonnées locales (caméra) → absolues
  _o.copy(raycaster.ray.origin).add(ORIGIN);
  _d.copy(raycaster.ray.direction);
  const origin = _co.copy(U.uCurveOrigin.value).add(ORIGIN);
  const dir = U.uCurveDir.value;
  const k = U.uCurvature.value;
  const ks = U.uCurveSide.value;
  const curvedY = (x, z) => {
    const dx = x - origin.x;
    const dz = z - origin.z;
    const along = Math.max(dx * dir.x + dz * dir.y, 0);
    const side = dx * -dir.y + dz * dir.x;
    return groundAt(x, z).y - k * (along * along + ks * side * side);
  };
  let prevT = 0;
  for (let t = 0.5; t < 400; t += t < 40 ? 0.25 : t < 120 ? 1 : 3) {
    const x = _o.x + _d.x * t;
    const y = _o.y + _d.y * t;
    const z = _o.z + _d.z * t;
    if (y < curvedY(x, z)) {
      // affinage par dichotomie
      let a = prevT;
      let b = t;
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2;
        const mx = _o.x + _d.x * m;
        const my = _o.y + _d.y * m;
        const mz = _o.z + _d.z * m;
        if (my < curvedY(mx, mz)) b = m;
        else a = m;
      }
      const x2 = _o.x + _d.x * b;
      const z2 = _o.z + _d.z * b;
      return new THREE.Vector3(x2, groundAt(x2, z2).y, z2);
    }
    prevT = t;
  }
  return null;
}

// Position écran (px) d'un point du monde, en appliquant la courbure
export function projectCurved(p, camera, width, height, out = new THREE.Vector3()) {
  const origin = U.uCurveOrigin.value;
  const dir = U.uCurveDir.value;
  const lx = p.x - ORIGIN.x;
  const lz = p.z - ORIGIN.z;
  const dx = lx - origin.x;
  const dz = lz - origin.z;
  const along = Math.max(dx * dir.x + dz * dir.y, 0);
  const side = dx * -dir.y + dz * dir.x;
  out.set(lx, p.y - U.uCurvature.value * (along * along + U.uCurveSide.value * side * side), lz);
  out.project(camera);
  const visible = out.z < 1 && out.z > -1;
  out.x = (out.x * 0.5 + 0.5) * width;
  out.y = (-out.y * 0.5 + 0.5) * height;
  out.visible = visible;
  return out;
}
