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
// (options : seg côtés du contour, couronnes rayons relatifs des couronnes ; par défaut 12 côtés et une
// couronne, 20 côtés et deux couronnes pour une grande tache ; tol (m) : coupe en deux, jusqu'à deux fois,
// toute arête dont le milieu, ou tout triangle dont le centre, s'écarte de la surface de plus de tol
// (bosse, arête du dos), sans laisser de fente)
export function patch(b, surf, d, size, seed, { lift = 0.008, seg: nseg = null, couronnes = null, tol = null } = {}) {
  const u0 = new THREE.Vector3(...d).normalize();
  const t1 = new THREE.Vector3(0, 0, 1).addScaledVector(u0, -u0.z);
  if (t1.lengthSq() < 0.04) t1.set(0, 1, 0).addScaledVector(u0, -u0.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(u0, t1);
  const lobe = (th) => 1 + 0.18 * Math.sin(2 * th + seed * 2.3) + 0.15 * Math.sin(3 * th + seed * 4.1) + 0.07 * Math.sin(4 * th + seed * 1.7);
  const pos = [];
  const nor = [];
  const par = [];
  const u = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const put = (a, c) => {
    par.push(a, c);
    const rho = Math.hypot(a, c);
    u.copy(u0).multiplyScalar(Math.cos(rho));
    if (rho > 1e-6) u.addScaledVector(t1, (Math.sin(rho) * a) / rho).addScaledVector(t2, (Math.sin(rho) * c) / rho);
    surf.at(u, p, n);
    p.addScaledVector(n, lift);
    pos.push(p.x, p.y, p.z);
    nor.push(n.x, n.y, n.z);
  };
  const big = Math.max(...size) > 0.45;
  const rings = couronnes ?? (big ? [0.5, 1] : [1]);
  const seg = nseg ?? (big ? 20 : 12);
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
  if (tol) {
    const vus = { aretes: new Set(), triangles: new Set() };
    for (let pass = 0; pass < 3; pass++) affine(idx, pos, nor, par, put, tol, vus);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  b.add(g, '#ffffff', { tint: 1 });
}

// raffinement d'une tache (patch, option tol) : une arête est coupée si son milieu, reposé sur la surface,
// s'écarte de plus de tol de la corde, et les trois arêtes d'un triangle dont le centre s'en écarte ;
// les arêtes à couper sont toutes choisies avant de découper, si bien que deux triangles voisins restent
// soudés (découpe en 2, 3 ou 4 selon les arêtes coupées). vus : arêtes et triangles déjà jugés assez
// proches de la surface lors d'une passe précédente (inutile de les relancer)
function affine(idx, pos, nor, par, put, tol, vus) {
  const m = new THREE.Vector3();
  const q = new THREE.Vector3();
  const nn = new THREE.Vector3();
  const key = (i, j) => (i < j ? `${i}|${j}` : `${j}|${i}`);
  // écart à la surface du point de paramètres (a, c) face au point plat f (sommet provisoire retiré)
  const ecart = (a, c, f) => {
    const k = pos.length / 3;
    put(a, c);
    const e = Math.abs(q.fromArray(pos, 3 * k).sub(f).dot(nn.fromArray(nor, 3 * k)));
    pos.length -= 3;
    nor.length -= 3;
    par.length -= 2;
    return e;
  };
  const coupe = new Set();
  const vu = new Set();
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    for (let e = 0; e < 3; e++) {
      const i = v[e];
      const j = v[(e + 1) % 3];
      const k = key(i, j);
      if (vu.has(k) || vus.aretes.has(k)) continue;
      vu.add(k);
      m.fromArray(pos, 3 * i).add(q.fromArray(pos, 3 * j)).multiplyScalar(0.5);
      if (ecart((par[2 * i] + par[2 * j]) / 2, (par[2 * i + 1] + par[2 * j + 1]) / 2, m.clone()) > tol) coupe.add(k);
      else vus.aretes.add(k);
    }
    const kt = [...v].sort((x, y) => x - y).join('|');
    if (vus.triangles.has(kt)) continue;
    const f = new THREE.Vector3();
    for (const i of v) f.add(q.fromArray(pos, 3 * i));
    f.divideScalar(3);
    const ca = (par[2 * v[0]] + par[2 * v[1]] + par[2 * v[2]]) / 3;
    const cc = (par[2 * v[0] + 1] + par[2 * v[1] + 1] + par[2 * v[2] + 1]) / 3;
    if (ecart(ca, cc, f) > tol) for (let e = 0; e < 3; e++) coupe.add(key(v[e], v[(e + 1) % 3]));
    else vus.triangles.add(kt);
  }
  const mids = new Map();
  const mid = (i, j) => {
    const k = key(i, j);
    if (!coupe.has(k)) return -1;
    if (!mids.has(k)) {
      mids.set(k, pos.length / 3);
      put((par[2 * i] + par[2 * j]) / 2, (par[2 * i + 1] + par[2 * j + 1]) / 2);
    }
    return mids.get(k);
  };
  const out = [];
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    const c = [mid(v[0], v[1]), mid(v[1], v[2]), mid(v[2], v[0])];
    const n = c.filter((x) => x >= 0).length;
    if (n === 0) out.push(...v);
    else if (n === 3) out.push(v[0], c[0], c[2], c[0], v[1], c[1], c[2], c[1], v[2], c[0], c[1], c[2]);
    else {
      // tourner pour que la première arête coupée soit (a, b)
      let s = c.findIndex((x) => x >= 0);
      if (n === 2 && c[(s + 2) % 3] >= 0) s = (s + 2) % 3;
      const a = v[s];
      const b2 = v[(s + 1) % 3];
      const d = v[(s + 2) % 3];
      const ab = c[s];
      if (n === 1) out.push(a, ab, d, ab, b2, d);
      else {
        const bd = c[(s + 1) % 3];
        out.push(a, ab, d, ab, b2, bd, ab, bd, d);
      }
    }
  }
  idx.length = 0;
  idx.push(...out);
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

// Union lisse de surfaces. Chaque forme { c, rad, n = 2, k = 0,03, r?, creux? } est une surface
// |x|^n + |y|^n + |z|^n = 1 en coordonnées réduites (centre c, rayons rad, tournée de r) ; sa distance
// approchée, (f − 1) / |∇f|, se raccorde aux formes précédentes par un minimum doux (cubique) de largeur
// k (m) : une seule peau, sans pli ni bosse aux raccords. Une forme creuse (creux: true) se retranche en
// douceur (narines). champ(x, y, z) : < 0 dedans, 0 sur la peau, > 0 dehors. at(u, p, nrm) : comme
// surface, point de la peau vu de centre dans la direction u × rad (u : direction réduite), normale
// tirée du gradient du champ ; l'union doit être étoilée depuis centre et sans partie plus mince que pas.
export function union(formes, { centre = [0, 0, 0], rad = [1, 1, 1], pas = 0.02 } = {}) {
  const F = formes.map((f) => ({
    c: f.c, rad: f.rad, n: f.n ?? 2, k: f.k ?? 0.03, creux: !!f.creux, rmin: Math.min(...f.rad),
    inv: f.r ? new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...f.r))).invert() : null,
  }));
  const q = new THREE.Vector3();
  const dist = (f, x, y, z) => {
    q.set(x - f.c[0], y - f.c[1], z - f.c[2]);
    if (f.inv) q.applyMatrix3(f.inv);
    const n = f.n;
    const ax = Math.abs(q.x) / f.rad[0];
    const ay = Math.abs(q.y) / f.rad[1];
    const az = Math.abs(q.z) / f.rad[2];
    const v = (ax ** n + ay ** n + az ** n) ** (1 / n);
    if (v < 1e-6) return -f.rmin;
    const g = v ** (1 - n);
    return (v - 1) / Math.hypot((g * ax ** (n - 1)) / f.rad[0], (g * ay ** (n - 1)) / f.rad[1], (g * az ** (n - 1)) / f.rad[2]);
  };
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - (h * h * h * k) / 6;
  };
  const champ = (x, y, z) => {
    let d = dist(F[0], x, y, z);
    for (let i = 1; i < F.length; i++) {
      const di = dist(F[i], x, y, z);
      d = F[i].creux ? -smin(-d, di, F[i].k) : smin(d, di, F[i].k);
    }
    return d;
  };
  const C = new THREE.Vector3(...centre);
  const dir = new THREE.Vector3();
  const e = 1e-4;
  return {
    champ,
    at(u, p, nrm) {
      dir.set(u.x * rad[0], u.y * rad[1], u.z * rad[2]).normalize();
      const f = (t) => champ(C.x + dir.x * t, C.y + dir.y * t, C.z + dir.z * t);
      // départ sur l'ellipsoïde de rayons rad (proche de la peau), puis encadrement par pas de pas
      // (une seule traversée : l'union est étoilée) et fausse position (Illinois)
      let a = 1 / Math.hypot(dir.x / rad[0], dir.y / rad[1], dir.z / rad[2]);
      let fa = f(a);
      let t;
      let ft;
      if (fa < 0) {
        t = a + pas;
        ft = f(t);
        while (ft < 0 && t < 50) {
          a = t;
          fa = ft;
          t += pas;
          ft = f(t);
        }
      } else {
        t = a;
        ft = fa;
        a = Math.max(0, t - pas);
        fa = f(a);
        while (fa >= 0 && a > 0) {
          t = a;
          ft = fa;
          a = Math.max(0, a - pas);
          fa = f(a);
        }
      }
      let cote = 0;
      for (let i = 0; i < 30 && t - a > 1e-7; i++) {
        const m = (a * ft - t * fa) / (ft - fa);
        const fm = f(m);
        if (Math.abs(fm) < 1e-8) {
          a = t = m;
          break;
        }
        if (fm < 0) {
          a = m;
          fa = fm;
          if (cote < 0) ft /= 2;
          cote = -1;
        } else {
          t = m;
          ft = fm;
          if (cote > 0) fa /= 2;
          cote = 1;
        }
      }
      p.copy(C).addScaledVector(dir, (a + t) / 2);
      nrm.set(
        champ(p.x + e, p.y, p.z) - champ(p.x - e, p.y, p.z),
        champ(p.x, p.y + e, p.z) - champ(p.x, p.y - e, p.z),
        champ(p.x, p.y, p.z + e) - champ(p.x, p.y, p.z - e),
      ).normalize();
    },
  };
}

// Maillage d'une surface vue de son centre (surface, union…) en grille de w méridiens × h parallèles,
// pôles sur l'axe axe (direction réduite), méridien 0 du côté de haut : avec w pair, les sommets sont
// symétriques par rapport au plan x = 0 quand axe et haut y sont. theta(v, phi) place les parallèles (v
// de 0, pôle +axe, à 1, pôle −axe ; par défaut θ = π v), si bien qu'un parallèle peut suivre une
// frontière de couleur. bandes : [[i, couleur, tint], …], dans l'ordre : les triangles des parallèles
// d'indice < i prennent cette couleur ; la frontière est nette et sans fente (sommets et normales
// partagés). opts : options de Builder.add (id…)
export function grille(b, surf, w, h, { axe = [0, 0, 1], haut = [0, 1, 0], theta = null, bandes = [[Infinity, '#ffffff', 0]], ...opts } = {}) {
  const A = new THREE.Vector3(...axe).normalize();
  const U = new THREE.Vector3(...haut).addScaledVector(A, -new THREE.Vector3(...haut).dot(A)).normalize();
  const B = new THREE.Vector3().crossVectors(A, U);
  const pos = [];
  const nor = [];
  const u = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const put = (th, ph) => {
    u.copy(A).multiplyScalar(Math.cos(th)).addScaledVector(U, Math.sin(th) * Math.cos(ph)).addScaledVector(B, Math.sin(th) * Math.sin(ph));
    surf.at(u, p, n);
    pos.push(p.x, p.y, p.z);
    nor.push(n.x, n.y, n.z);
  };
  put(0, 0);
  for (let i = 1; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const ph = (j / w) * Math.PI * 2;
      put(theta ? theta(i / h, ph) : (Math.PI * i) / h, ph);
    }
  }
  put(Math.PI, 0);
  const last = 1 + w * (h - 1);
  const at = (i, j) => (i === 0 ? 0 : i === h ? last : 1 + (i - 1) * w + (j % w));
  // triangles par parallèle, chacun tourné vers l'extérieur (sens direct, vu du côté de la normale)
  const strips = [];
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const tri = (out, i0, i1, i2) => {
    if (i0 === i1 || i1 === i2 || i0 === i2) return;
    a.fromArray(pos, i0 * 3);
    c.fromArray(pos, i1 * 3).sub(a);
    d.fromArray(pos, i2 * 3).sub(a);
    c.cross(d);
    n.fromArray(nor, i0 * 3).add(u.fromArray(nor, i1 * 3)).add(u.fromArray(nor, i2 * 3));
    if (c.dot(n) >= 0) out.push(i0, i1, i2);
    else out.push(i0, i2, i1);
  };
  for (let i = 0; i < h; i++) {
    const out = [];
    for (let j = 0; j < w; j++) {
      tri(out, at(i, j), at(i + 1, j), at(i + 1, j + 1));
      tri(out, at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
    strips.push(out);
  }
  let i0 = 0;
  for (const [iMax, color, tint = 0] of bandes) {
    const idx = strips.slice(i0, Math.min(h, iMax)).flat();
    i0 = Math.min(h, iMax);
    if (!idx.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    b.add(g, color, { ...opts, tint });
  }
}

// Grille à zones : maillage d'une surface vue de son centre, comme grille (w méridiens × h parallèles,
// pôles sur l'axe axe, méridien 0 du côté de haut), mais les méridiens aussi se placent : phi(v, k) donne
// l'angle du méridien k (de 0 à 1 pour un tour, croissant) sur le parallèle v (de 0, pôle +axe, à 1), par
// défaut 2π k ; theta(v, ph) place les parallèles (par défaut π v). zone(i, j) : indice, dans zones, de la
// case entre les parallèles i et i + 1 et les méridiens j et j + 1 ; zones : [[couleur, tint], …]. Une
// zone suit ainsi un parallèle courbé (calotte, museau) ou un méridien courbé (ventre, gorge), à bord net
// et sans fente (sommets et normales partagés). opts : options de Builder.add (id…)
export function grilleZones(b, surf, w, h, { axe = [0, 0, 1], haut = [0, 1, 0], theta = null, phi = null, zone = () => 0, zones = [['#ffffff', 0]], ...opts } = {}) {
  const A = new THREE.Vector3(...axe).normalize();
  const U = new THREE.Vector3(...haut).addScaledVector(A, -new THREE.Vector3(...haut).dot(A)).normalize();
  const B = new THREE.Vector3().crossVectors(A, U);
  const pos = [];
  const nor = [];
  const u = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const put = (th, ph) => {
    u.copy(A).multiplyScalar(Math.cos(th)).addScaledVector(U, Math.sin(th) * Math.cos(ph)).addScaledVector(B, Math.sin(th) * Math.sin(ph));
    surf.at(u, p, n);
    pos.push(p.x, p.y, p.z);
    nor.push(n.x, n.y, n.z);
  };
  put(0, 0);
  for (let i = 1; i < h; i++) {
    const v = i / h;
    for (let j = 0; j < w; j++) {
      const ph = phi ? phi(v, j / w) : (j / w) * Math.PI * 2;
      put(theta ? theta(v, ph) : Math.PI * v, ph);
    }
  }
  put(Math.PI, 0);
  const last = 1 + w * (h - 1);
  const at = (i, j) => (i === 0 ? 0 : i === h ? last : 1 + (i - 1) * w + (j % w));
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  // triangle tourné vers l'extérieur (sens direct, vu du côté de la normale), sauf s'il est dégénéré (pôle)
  const tri = (out, i0, i1, i2) => {
    if (i0 === i1 || i1 === i2 || i0 === i2) return;
    a.fromArray(pos, i0 * 3);
    c.fromArray(pos, i1 * 3).sub(a);
    d.fromArray(pos, i2 * 3).sub(a);
    c.cross(d);
    n.fromArray(nor, i0 * 3).add(u.fromArray(nor, i1 * 3)).add(u.fromArray(nor, i2 * 3));
    if (c.dot(n) >= 0) out.push(i0, i1, i2);
    else out.push(i0, i2, i1);
  };
  const faces = zones.map(() => []);
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const out = faces[zone(i, j)];
      tri(out, at(i, j), at(i + 1, j), at(i + 1, j + 1));
      tri(out, at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
  zones.forEach(([color, tint = 0], k) => {
    if (!faces[k].length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(faces[k]);
    b.add(g, color, { ...opts, tint });
  });
}
