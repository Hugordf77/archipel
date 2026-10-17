import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { nextId } from '../core/globals.js';
import { vnoise } from '../world/home/terrain.js';

const ROCKS = new Map();

// Primitives arrondies « jouet »
export const G = {
  sphere: (r = 1, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h),
  cyl: (rt = 1, rb = 1, h = 1, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s, 1),
  cone: (r = 1, h = 1, s = 18) => new THREE.ConeGeometry(r, h, s, 1),
  box: (w = 1, h = 1, d = 1, rad = 0.08, segs = 3) =>
    new RoundedBoxGeometry(w, h, d, segs, Math.min(rad, Math.min(w, h, d) * 0.49)),
  torus: (r = 1, t = 0.2, rs = 10, ts = 24, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  capsule: (r = 0.5, l = 1, cs = 6, rs = 14) => new THREE.CapsuleGeometry(r, l, cs, rs),
  lathe: (pts, s = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s),
  // rocher : icosphère déformée par du bruit
  // rocher : icosphère déformée par du bruit (mémorisé : les mêmes rochers reviennent souvent)
  rock: (r = 1, seed = 0) => {
    const key = `${r.toFixed(3)}:${seed}`;
    const hit = ROCKS.get(key);
    if (hit) return hit;
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = vnoise(v.x * 1.3 + seed, v.y * 1.3 + v.z * 0.7 + seed * 2.1);
      v.multiplyScalar(0.82 + n * 0.32);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const merged = mergeVertices(g, 1e-4);
    merged.computeVertexNormals();
    if (ROCKS.size > 300) ROCKS.delete(ROCKS.keys().next().value);
    ROCKS.set(key, merged);
    return merged;
  },
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

// Assemble des primitives colorées en une seule géométrie (couleur + id par sommet)
export class Builder {
  constructor(defaultId = nextId()) {
    this.parts = [];
    this.defaultId = defaultId;
  }

  add(geo, color, opts = {}) {
    const { p = [0, 0, 0], r = [0, 0, 0], s = 1, id = this.defaultId, colorFn = null, tint = 1, sway = 0 } = opts;
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    const sc = Array.isArray(s) ? s : [s, s, s];
    _e.set(r[0], r[1], r[2]);
    _q.setFromEuler(_e);
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(sc[0], sc[1], sc[2]));
    g.applyMatrix4(_m);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(color);
    const tmp = new THREE.Color();
    const pos = g.attributes.position;
    for (let i = 0; i < n; i++) {
      if (colorFn) {
        tmp.copy(c);
        colorFn(tmp, pos.getX(i), pos.getY(i), pos.getZ(i));
        col[i * 3] = tmp.r;
        col[i * 3 + 1] = tmp.g;
        col[i * 3 + 2] = tmp.b;
      } else {
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aId', new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
    // masque de teinte : 1 = reçoit la couleur d'instance (pétales), 0 = garde sa couleur (tiges)
    g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n).fill(tint), 1));
    // poids de balancement au vent (indépendant de l'altitude de l'objet)
    g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(n).fill(sway), 1));
    this.parts.push(g);
    return this;
  }

  // Ajoute une géométrie déjà construite par un autre Builder
  addBuilt(geo, opts = {}) {
    const { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = opts;
    const g = geo.clone();
    const sc = Array.isArray(s) ? s : [s, s, s];
    _e.set(r[0], r[1], r[2]);
    _q.setFromEuler(_e);
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(sc[0], sc[1], sc[2]));
    g.applyMatrix4(_m);
    this.parts.push(g);
    return this;
  }

  build() {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingSphere();
    return g;
  }
}
