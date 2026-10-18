// Formes de base partagées par les modèles : hasard reproductible, segments orientés,
// feuille de palmier. Pures (pas de scène) : utilisables par le jeu et le catalogue.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../../render/builder.js';

export function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}


const UP = new THREE.Vector3(0, 1, 0);
// Ajoute un cylindre orienté entre deux points
export function segment(b, color, a, c, rBottom, rTop, sides = 14) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
  b.add(G.cyl(rTop, rBottom, len, sides), color, { p: [mid.x, mid.y, mid.z], r: [e.x, e.y, e.z] });
}


// Feuille de palmier pliée, visible des deux côtés
export function palmFrondGeometry(len = 2.3, width = 0.6) {
  const segs = 9;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * len;
    const y = Math.sin(t * 1.6) * 0.45 - t * t * 1.25;
    const w = width * Math.sin(Math.min(1, t * 1.25 + 0.08) * Math.PI) * (1 - t * 0.25);
    const fold = w * 0.38;
    pos.push(x, y - fold, -w, x, y + fold * 0.4, 0, x, y - fold, w);
    if (i < segs) {
      const a = i * 3;
      idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const front = new THREE.BufferGeometry();
  front.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  front.setIndex(idx);
  front.computeVertexNormals();
  const back = front.clone();
  const bi = back.index.array.slice();
  for (let i = 0; i < bi.length; i += 3) {
    const t = bi[i];
    bi[i] = bi[i + 2];
    bi[i + 2] = t;
  }
  back.setIndex(Array.from(bi));
  back.computeVertexNormals();
  return mergeGeometries([front.toNonIndexed(), back.toNonIndexed()]);
}
