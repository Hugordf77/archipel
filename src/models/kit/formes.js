// Formes lisses partagées par les modèles : segments effilés, ellipsoïdes, tubes le long d'une
// courbe (membres, cornes, queues), surfaces pleines et leur maillage, peaux déformées (visages),
// feuilles (oreilles), taches épousant une surface, places réparties sur une surface.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../../render/builder.js';

const _up = new THREE.Vector3(0, 1, 0);

// cylindre effilé entre deux points [x, y, z]
export function bone(b, color, a, c, r0, r1, sides = 8, tint = 1) {
  const va = new THREE.Vector3(...a);
  const vc = new THREE.Vector3(...c);
  const dir = vc.clone().sub(va);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir.clone().normalize()));
  const m = va.add(vc).multiplyScalar(0.5);
  b.add(G.cyl(r1, r0, dir.length(), sides), color, { p: [m.x, m.y, m.z], r: [e.x, e.y, e.z], tint });
}

// ellipsoïde (rayons rx, ry, rz)
export const blob = (b, color, p, rad, opts = {}, w = 9, h = 7) => b.add(G.sphere(1, w, h), color, { p, s: rad, ...opts });

// Tube lisse le long d'une courbe Catmull-Rom passant par pts, un rayon par point (interpolé), sans
// bouchon interne : pas de fente aux jointures. Le départ reste ouvert (enfoui dans le corps, le
// crâne ou la croupe) ; end : 'open' (bout caché dans un sabot) ou 'round' (bout fermé en dôme)
export function limb(b, color, pts, radii, { sides = 8, rings = 6, tint = 0, end = 'open' } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
  const k = pts.length - 1;
  const rad = (t) => {
    const i = Math.min(k - 1, Math.floor(t * k));
    return radii[i] + (radii[i + 1] - radii[i]) * (t * k - i);
  };
  // anneaux : centre, tangente, rayon, inclinaison de la normale (dôme)
  const rs = [];
  for (let i = 0; i <= rings; i++) rs.push({ c: curve.getPoint(i / rings), t: curve.getTangent(i / rings).normalize(), r: rad(i / rings), a: 0 });
  const last = rs[rs.length - 1];
  if (end === 'round') for (const a of [0.7, 1.2]) rs.push({ c: last.c.clone().addScaledVector(last.t, last.r * Math.sin(a)), t: last.t, r: last.r * Math.cos(a), a });
  // repère transporté d'un anneau à l'autre (sans torsion)
  const n = Math.abs(rs[0].t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const q = new THREE.Quaternion();
  const pos = [];
  const nor = [];
  const d = new THREE.Vector3();
  const bn = new THREE.Vector3();
  rs.forEach((R, i) => {
    if (i > 0) n.applyQuaternion(q.setFromUnitVectors(rs[i - 1].t, R.t));
    n.addScaledVector(R.t, -n.dot(R.t)).normalize();
    bn.crossVectors(R.t, n);
    for (let j = 0; j < sides; j++) {
      const th = (j / sides) * Math.PI * 2;
      d.copy(n).multiplyScalar(Math.cos(th)).addScaledVector(bn, Math.sin(th));
      pos.push(R.c.x + d.x * R.r, R.c.y + d.y * R.r, R.c.z + d.z * R.r);
      d.multiplyScalar(Math.cos(R.a)).addScaledVector(R.t, Math.sin(R.a));
      nor.push(d.x, d.y, d.z);
    }
  });
  const idx = [];
  for (let i = 0; i < rs.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const bb = i * sides + ((j + 1) % sides);
      idx.push(a, bb, a + sides, bb, bb + sides, a + sides);
    }
  }
  if (end === 'round') {
    const tip = last.c.clone().addScaledVector(last.t, last.r);
    const base = (rs.length - 1) * sides;
    pos.push(tip.x, tip.y, tip.z);
    nor.push(last.t.x, last.t.y, last.t.z);
    for (let j = 0; j < sides; j++) idx.push(base + j, base + ((j + 1) % sides), base + sides);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  b.add(g, color, { tint });
}

// Surface lisse de centre c et de rayons rad : |x|^n + |y|^n + |z|^n = 1 en coordonnées réduites.
// n = 2 donne l'ellipsoïde, n = 3 un pavé arrondi (dos droit, croupe carrée, poitrail rond).
// at(u, p, nrm) : point de la surface dans la direction réduite u (vue du centre) et sa normale
export function surface(c, rad, n = 2) {
  const q = new THREE.Vector3();
  const pw = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  return {
    at(u, p, nrm) {
      q.copy(u).multiplyScalar((Math.abs(u.x) ** n + Math.abs(u.y) ** n + Math.abs(u.z) ** n) ** (-1 / n));
      nrm.set(pw(q.x, n - 1) / rad[0], pw(q.y, n - 1) / rad[1], pw(q.z, n - 1) / rad[2]).normalize();
      p.set(c[0] + q.x * rad[0], c[1] + q.y * rad[1], c[2] + q.z * rad[2]);
    },
  };
}

// maillage d'une surface (sphère w × h projetée, normales exactes)
export function hull(b, color, surf, w, h, opts = {}) {
  const g = new THREE.SphereGeometry(1, w, h);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const u = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    surf.at(u.fromBufferAttribute(pos, i), p, n);
    pos.setXYZ(i, p.x, p.y, p.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  b.add(g, color, opts);
}

// tache lobée (nuage, haricot) épousant une surface : centrée dans la direction réduite d, de
// demi-tailles angulaires size (le long du corps, en travers), contour ondulé selon seed ; à peine
// décollée de la surface et teintée par la robe (sommets blancs, tint 1). Une grande tache a une
// couronne intérieure, pour épouser la courbure sans s'enfoncer
export function patch(b, surf, d, size, seed, { lift = 0.008 } = {}) {
  const u0 = new THREE.Vector3(...d).normalize();
  const t1 = new THREE.Vector3(0, 0, 1).addScaledVector(u0, -u0.z);
  if (t1.lengthSq() < 0.04) t1.set(0, 1, 0).addScaledVector(u0, -u0.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(u0, t1);
  const lobe = (th) => 1 + 0.18 * Math.sin(2 * th + seed * 2.3) + 0.15 * Math.sin(3 * th + seed * 4.1) + 0.07 * Math.sin(4 * th + seed * 1.7);
  const pos = [];
  const nor = [];
  const u = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const put = (a, c) => {
    const rho = Math.hypot(a, c);
    u.copy(u0).multiplyScalar(Math.cos(rho));
    if (rho > 1e-6) u.addScaledVector(t1, (Math.sin(rho) * a) / rho).addScaledVector(t2, (Math.sin(rho) * c) / rho);
    surf.at(u, p, n);
    p.addScaledVector(n, lift);
    pos.push(p.x, p.y, p.z);
    nor.push(n.x, n.y, n.z);
  };
  const big = Math.max(...size) > 0.45;
  const rings = big ? [0.5, 1] : [1];
  const seg = big ? 20 : 12;
  put(0, 0);
  for (const k of rings) {
    for (let i = 0; i < seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      const r = lobe(th) * k;
      put(size[0] * r * Math.cos(th), size[1] * r * Math.sin(th));
    }
  }
  // centre en éventail, puis couronnes (sens direct vu de l'extérieur)
  const idx = [];
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    idx.push(0, 1 + i, 1 + j);
    for (let r = 1; r < rings.length; r++) {
      const a = 1 + (r - 1) * seg;
      const c = a + seg;
      idx.push(a + i, c + i, c + j, a + i, c + j, a + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  b.add(g, '#ffffff', { tint: 1 });
}

// Places réparties à intervalle régulier sur une surface (centrée à l'origine) : points tirés sur une
// spirale de Fibonacci, gardés s'ils sont à plus de spacing de tous les autres (ordre de visite fixé
// par seed) ; keep(p, n) écarte des zones. Renvoie [{ p, n }] (point et normale)
export function scatter(surf, spacing, seed = 1, keep = () => true) {
  const M = 1200;
  const u = new THREE.Vector3();
  const cand = [];
  for (let i = 0; i < M; i++) {
    const y = 1 - (2 * (i + 0.5)) / M;
    const k = Math.sqrt(1 - y * y);
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    surf.at(u.set(Math.cos(i * 2.39996) * k, y, Math.sin(i * 2.39996) * k), p, n);
    if (keep(p, n)) cand.push([((i * 7919 + seed * 104729) % M) * M + i, p, n]);
  }
  cand.sort((a, c) => a[0] - c[0]);
  const out = [];
  const s2 = spacing * spacing;
  for (const [, p, n] of cand) if (out.every((o) => o.p.distanceToSquared(p) >= s2)) out.push({ p, n });
  return out;
}

// Maillage lisse d'une surface donnée point par point (at(u) : point dans la direction u) : sphère
// w × h déformée, sommets soudés, normales recalculées
export function skinMesh(b, color, at, w, h, opts = {}) {
  const g = new THREE.SphereGeometry(1, w, h).deleteAttribute('normal').deleteAttribute('uv');
  const m = mergeVertices(g);
  const pos = m.attributes.position;
  const u = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    at(u.fromBufferAttribute(pos, i), q);
    pos.setXYZ(i, q.x, q.y, q.z);
  }
  m.computeVertexNormals();
  b.add(m, color, opts);
}

// Feuille (oreille) : longueur sur x (base en −x, pointe effilée en +x), largeur y, épaisseur z ; la
// face avant (+z) est creusée pour loger l'intérieur
export function leafGeo(w, h, cup = 0.5) {
  const g = new THREE.SphereGeometry(1, w, h).deleteAttribute('normal').deleteAttribute('uv');
  const m = mergeVertices(g);
  const pos = m.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i) * 0.45;
    const t = (x + 1) / 2;
    if (z > 0) z -= cup * 0.45 * (1 - x * x) * (1 - y * y);
    pos.setXYZ(i, x, y * (1 - 0.5 * t * t) * (0.85 + 0.15 * (1 - t)), z);
  }
  m.computeVertexNormals();
  return m;
}
