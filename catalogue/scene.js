// Outils 3D communs du catalogue : préparation des uniforms du jeu, mesure (boîte, statistiques),
// cadrage, silhouette du personnage (1,4 m) et lumières jour / soir / nuit (DayCycle du jeu).
import * as THREE from 'three';
import { U } from '../src/core/globals.js';
import { DayCycle } from '../src/world/env/daycycle.js';

export const LIGHTS = { jour: 12.5, soir: 18.6, nuit: 23 };
const cycle = new DayCycle();

// le catalogue montre les modèles à plat : pas de courbure du monde, pas de brume
export function prepareUniforms() {
  U.uCurvature.value = 0;
  U.uFogRange.value.set(600, 2400);
  U.uShadowOn.value = 1;
}

export function setLight(name) {
  cycle.override = LIGHTS[name] ?? LIGHTS.jour;
  cycle.update(0);
}

// fond de la scène selon l'heure : horizon du ciel, adouci vers le papier
const _paper = new THREE.Color('#f3e6cf');
export function skyBackground(name, out = new THREE.Color()) {
  out.copy(U.uSkyHorizon.value).lerp(U.uSkyTop.value, name === 'nuit' ? 0.55 : 0.25);
  if (name !== 'nuit') out.lerp(_paper, 0.45);
  return out;
}

// boîte englobante d'un modèle en pose de repos (géométries, instances comprises)
const _b = new THREE.Box3();
export function boxOf(object3d, out = new THREE.Box3()) {
  object3d.updateMatrixWorld(true);
  out.makeEmpty();
  object3d.traverse((o) => {
    if (!o.geometry || !o.visible) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    out.union(_b);
  });
  if (out.isEmpty()) out.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
  return out;
}

// statistiques de rendu : triangles, sommets, matériaux, appels de dessin
export function statsOf(object3d) {
  let tris = 0;
  let verts = 0;
  let calls = 0;
  const mats = new Set();
  object3d.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const n = o.isInstancedMesh ? o.count : 1;
    const t = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    tris += t * n;
    verts += g.attributes.position.count * n;
    calls++;
    for (const m of [o.material].flat()) mats.add(m);
  });
  return { tris: Math.round(tris), verts, mats: mats.size, calls };
}

// silhouette du personnage pour l'échelle : 1,4 m, ton encre transparent
export function makeSilhouette() {
  const mat = new THREE.MeshBasicMaterial({ color: 0x8a7a96, transparent: true, opacity: 0.38, depthWrite: false });
  const g = new THREE.Group();
  g.name = 'silhouette-1m40';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), mat);
  body.position.y = 0.43;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 14), mat);
  head.position.y = 1.11;
  g.add(body, head);
  g.renderOrder = 5;
  return g;
}

// grille au mètre, de taille adaptée au modèle (lignes douces)
export function makeGrid(extent, color) {
  const size = Math.max(4, Math.ceil(extent * 1.6 + 2));
  const grid = new THREE.GridHelper(size + (size % 2), size + (size % 2), color, color);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  grid.material.depthWrite = false;
  grid.position.y = 0.002;
  return grid;
}

// caméra trois-quarts qui cadre une boîte
export function frameBox(camera, box, target = new THREE.Vector3(), k = 1) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z, 0.3);
  const fov = (camera.fov * Math.PI) / 180;
  const dist = ((r * 0.62) / Math.tan(fov / 2)) * k + 0.25;
  camera.position.set(center.x + dist * 0.62, center.y + dist * 0.42, center.z + dist * 0.66);
  camera.near = Math.max(0.01, dist / 200);
  camera.far = dist * 40 + 50;
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  target.copy(center);
  return target;
}

// libère les géométries d'un objet construit pour le catalogue (les matériaux sont partagés)
export function disposeObject(object3d) {
  object3d.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    o.geometry?.dispose?.();
  });
}

export const fmtMeters = (v) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: v < 1 ? 2 : 1 })} m`;
export const fmtInt = (v) => v.toLocaleString('fr-FR');
