// Animaux des îles générées : 23 espèces dessinées par pièces (corps, tête, pattes, ailes, queue).
// Chaque pièce : { geo, pivot [x, y, z], anim, side, phase, parent? } ; le jeu les instancie (IslandFauna).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, G } from '../../render/builder.js';
import { nextId } from '../../core/globals.js';

// ---------------------------------------------------------------------------
// Gabarits de silhouettes. Chaque pièce : { geo, pivot [x,y,z], anim, side, phase }
// anim : 'leg' (balancier), 'head' (hoche), 'neck' (cou qui porte la tête), 'wing' (bat), 'tail' (remue),
// 'hop' (rien : tout le corps saute). parent : indice de la pièce qui porte celle-ci (la tête sur le
// cou), placée avant elle ; le pivot est alors dans le repère de ce parent
// id : identifiant de contour partagé (pas de trait d'encre entre deux pièces soudées, cou et corps)
export function part(build, pivot, anim = 'none', side = 1, phase = 0, id = undefined) {
  const b = new Builder(id);
  build(b);
  return { geo: b.build(), pivot, anim, side, phase };
}

export function quad(o) {
  const { body, bodyS, head, headS, headAt, leg, legLen = 0.35, legR = 0.05, legX = 0.18, legZ = 0.25, extra, tail } = o;
  const y = legLen;
  const parts = [
    part((b) => {
      b.add(G.sphere(0.5, 12, 9), body, { p: [0, y + bodyS[1] * 0.5, 0], s: bodyS });
      extra?.(b, y);
    }, [0, 0, 0]),
    part((b) => {
      b.add(G.sphere(0.5, 10, 8), head, { p: [0, 0, headS[2] * 0.35], s: headS });
      o.ears?.(b);
    }, [0, y + bodyS[1] * 0.7 + (headAt?.[1] ?? 0), bodyS[2] * 0.48 + (headAt?.[2] ?? 0)], 'head'),
  ];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    parts.push(part((b) => b.add(G.cyl(legR, legR * 0.9, legLen, 5), leg, { p: [0, -legLen / 2, 0] }), [sx * legX, legLen, sz * legZ], 'leg', 1, ph));
  }
  if (tail) parts.push(part(tail, [0, y + bodyS[1] * 0.55, -bodyS[2] * 0.48], 'tail'));
  return parts;
}

// ---------------------------------------------------------------------------
// Ongulés : pièces dessinées à la main. Le pelage est teinté par animal (tint 1, sommets clairs
// multipliés par la couleur de la robe) ; yeux, museau, sabots, cornes et bois ne le sont pas.
const EYE = '#3d3049';
// onglon arrondi (profil tourné, bord supérieur adouci), 5,5 cm de haut
const HOOF = G.lathe([[0.001, 0], [0.042, 0], [0.04, 0.04], [0.001, 0.055]], 5);
// sabot lisse : bord arrondi, dessus bombé (vu de près)
const HOOF_SMOOTH = G.lathe([[0.001, 0], [0.042, 0], [0.044, 0.016], [0.04, 0.036], [0.028, 0.05], [0.001, 0.055]], 8);
const _up = new THREE.Vector3(0, 1, 0);

// cylindre effilé entre deux points [x, y, z]
function bone(b, color, a, c, r0, r1, sides = 8, tint = 1) {
  const va = new THREE.Vector3(...a);
  const vc = new THREE.Vector3(...c);
  const dir = vc.clone().sub(va);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir.clone().normalize()));
  const m = va.add(vc).multiplyScalar(0.5);
  b.add(G.cyl(r1, r0, dir.length(), sides), color, { p: [m.x, m.y, m.z], r: [e.x, e.y, e.z], tint });
}

// ellipsoïde (rayons rx, ry, rz)
const blob = (b, color, p, rad, opts = {}, w = 9, h = 7) => b.add(G.sphere(1, w, h), color, { p, s: rad, ...opts });

// œil rond et brillant, tourné vers l'avant et l'extérieur ; ring : liseré clair sur un visage sombre ;
// detail : pupille et reflet plus ronds, vus de près (true ou 1, puis 2 pour plus fin encore)
function eye(b, x, y, z, r, ring = null, detail = 0) {
  const sx = Math.sign(x) || 1;
  const rot = [0, sx * 0.55, 0];
  const [pw, ph, hw, hh] = detail === 2 ? [10, 8, 6, 5] : detail ? [8, 6, 6, 4] : [6, 4, 5, 3];
  if (ring) b.add(G.sphere(r * 1.45, 7, 5), ring, { p: [x - sx * r * 0.15, y, z - r * 0.2], s: [1, 1.1, 0.55], r: rot, tint: 0 });
  b.add(G.sphere(r, pw, ph), EYE, { p: [x, y, z], s: [1, 1.15, 0.7], r: rot, tint: 0 });
  b.add(G.sphere(r * 0.34, hw, hh), '#ffffff', { p: [x + sx * r * 0.2, y + r * 0.42, z + r * 0.62], tint: 0 });
}

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
function surface(c, rad, n = 2) {
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
function hull(b, color, surf, w, h, opts = {}) {
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
function patch(b, surf, d, size, seed, { lift = 0.008 } = {}) {
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
function scatter(surf, spacing, seed = 1, keep = () => true) {
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

// Laine en boucles : dômes lisses posés sur un fond de laine (surface centrée à l'origine, placée en at
// et tournée de rot), aux places de scatter, de rayon spacing × 0,7 (± 15 %), enfoncés d'un tiers et
// tournés au hasard sur eux-mêmes ; teintés par la robe (sommets blancs, tint 1)
const CURL = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.6);
const CURL_S = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
// mêmes boucles vues de loin (version allégée d'un animal)
const CURL_LITE = new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI * 0.6);
const CURL_S_LITE = new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI * 0.6);
function curls(b, surf, spacing, { at = [0, 0, 0], rot = [0, 0, 0], seed = 1, keep, geo = CURL } = {}) {
  const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  const A = new THREE.Vector3(...at);
  const q = new THREE.Quaternion();
  const tw = new THREE.Quaternion();
  const e = new THREE.Euler();
  scatter(surf, spacing, seed, keep).forEach(({ p, n }, i) => {
    const h = ((i * 2654435761 + seed * 40503) >>> 0) / 4294967296;
    const r = spacing * 0.7 * (0.85 + 0.3 * h);
    n.applyQuaternion(Q);
    p.applyQuaternion(Q).add(A).addScaledVector(n, -0.35 * r);
    e.setFromQuaternion(q.setFromUnitVectors(_up, n).multiply(tw.setFromAxisAngle(_up, h * 6.283)));
    b.add(geo, '#ffffff', { p: p.toArray(), s: r, r: [e.x, e.y, e.z], tint: 1 });
  });
}

// Maillage lisse d'une surface donnée point par point (at(u) : point dans la direction u) : sphère
// w × h déformée, sommets soudés, normales recalculées
function skinMesh(b, color, at, w, h, opts = {}) {
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
function leafGeo(w, h, cup = 0.5) {
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

// Collier (tore autour d'un cou incliné de tilt vers l'avant, à la distance at de son pivot) et cloche
// tournée qui pend sous la gorge : épaule ronde, lèvre évasée, anneau, bouche sombre et battant ; k :
// taille de la cloche (1 : 9 cm de haut)
const BELL = [[0.05, 0], [0.056, 0.006], [0.044, 0.03], [0.034, 0.06], [0.024, 0.082], [0.001, 0.09]];
function collar(b, tilt, at, R, tube, k = 1) {
  const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const throat = new THREE.Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const ring = axis.multiplyScalar(at);
  b.add(G.torus(R, tube, 5, 16), '#6a8fd4', { p: ring.toArray(), r: [tilt - Math.PI / 2, 0, 0], tint: 0 });
  const top = ring.addScaledVector(throat, R + tube - 0.001);
  const y0 = top.y - 0.1 * k;
  const z0 = top.z + 0.012 * k;
  b.add(G.lathe(BELL.map(([x, y]) => [x * k, y * k]), 8), '#e2b23e', { p: [0, y0, z0], tint: 0 });
  b.add(G.cyl(0.046 * k, 0.046 * k, 0.002, 6), '#6b4f1c', { p: [0, y0 + 0.004 * k, z0], tint: 0 });
  b.add(G.torus(0.012 * k, 0.004 * k, 3, 6), '#c99a2e', { p: [0, top.y - 0.006 * k, z0], tint: 0 });
  b.add(G.sphere(0.016 * k, 5, 3), '#5a4318', { p: [0, y0 - 0.01 * k, z0], tint: 0 });
}

// quatre pattes (avant gauche, avant droite, arrière gauche, arrière droite, en diagonale) :
// pivot de hanche caché dans le corps, sabot posé au sol ; zf et zb sont les positions signées
// des pattes avant (z > 0) et arrière (z < 0) ; cloven : sabot fendu en deux onglons ; hoofRound :
// sabots arrondis (profil tourné) ; radii : un rayon par point, la patte est alors un tube lisse (limb)
function legs(o) {
  const { x, zf, zb, hip, color, tint = 0, r0, r1, hoof, hoofH = 0.06, front = null, back = null, joint = null, cloven = false, hoofRound = false, radii = null, sides = 10, rings = 4, hoofGeo = HOOF } = o;
  const out = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    const pts = (sz > 0 ? front : back) || [[0, 0, 0], [0, -hip + hoofH, 0]];
    out.push(part((b) => {
      if (radii) limb(b, color, pts, radii, { sides, rings, tint });
      else for (let i = 0; i < pts.length - 1; i++) {
        const t0 = i / (pts.length - 1);
        const t1 = (i + 1) / (pts.length - 1);
        bone(b, color, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, 8, tint);
        if (joint === (sz > 0 ? 'front' : 'back') && i > 0) b.add(G.sphere(r0 + (r1 - r0) * t0, 5, 3), color, { p: pts[i], tint });
      }
      const f = pts[pts.length - 1];
      if (hoofRound && cloven) for (const s of [-1, 1]) b.add(HOOF, hoof, { p: [f[0] + s * 0.034, -hip, f[2]], s: [0.75, hoofH / 0.055, 1.15], tint: 0 });
      else if (hoofRound) {
        const k = ((radii ? radii[radii.length - 1] : r1) * 1.2) / 0.042;
        b.add(hoofGeo, hoof, { p: [f[0], -hip, f[2]], s: [k, hoofH / 0.055, k * 1.1], tint: 0 });
      }
      else if (cloven) for (const s of [-1, 1]) b.add(G.cyl(r1 * 0.62, r1 * 0.7, hoofH, 5), hoof, { p: [f[0] + s * r1 * 0.5, -hip + hoofH / 2, f[2] + r1 * 0.12], tint: 0 });
      else b.add(G.cyl(r1 * 1.12, r1 * 1.22, hoofH, 8), hoof, { p: [f[0], -hip + hoofH / 2, f[2]], tint: 0 });
    }, [sx * x, hip, sz > 0 ? zf : zb], 'leg', 1, ph));
  }
  return out;
}

// Mouton (d'après la planche de référence) : laine en boucles rondes (teintée par la robe), cou court
// laineux qui porte la tête au-dessus du dos et plie pour brouter, visage rose lisse d'un seul tenant
// (museau tiré du visage), nez rose en triangle et bouche en Y, yeux noirs brillants, frange de
// boucles sur le front, oreilles en feuille creusée à l'intérieur rose, collier bleu et cloche,
// pattes courtes roses à sabots arrondis, queue en touffe
const EAR = leafGeo(11, 6, 0.55);
const EAR_IN = leafGeo(9, 5, 0.3);
const EAR_LITE = leafGeo(7, 4, 0.55);
const EAR_IN_LITE = leafGeo(6, 3, 0.3);
// lite : version allégée pour les moutons lointains (mêmes pièces et mêmes boucles, moins de facettes,
// sans la bouche)
function mouton(lite = false) {
  const SKIN = '#f6d6c8';
  const NECK = 0.4; // inclinaison du cou vers l'avant (rad)
  // corps : fond de laine en tonneau couvert de boucles, sauf dessous (ventre à l'ombre)
  const BODY = [0, 0.44, -0.05];
  const core = surface([0, 0, 0], [0.2, 0.22, 0.36], 2.5);
  const body = part((b) => {
    hull(b, '#ffffff', core, lite ? 10 : 14, lite ? 8 : 10, { p: BODY, tint: 1 });
    curls(b, core, 0.13, { at: BODY, seed: 1, geo: lite ? CURL_LITE : CURL, keep: (q, n) => n.y > -0.8 });
  }, [0, 0, 0]);
  // cou : pivot dans le poitrail, il porte la tête (pièce suivante) ; collier et cloche sous la gorge
  const axis = new THREE.Vector3(0, Math.cos(NECK), Math.sin(NECK));
  const NAT = axis.clone().multiplyScalar(0.18).toArray();
  const neckCore = surface([0, 0, 0], [0.085, 0.16, 0.085]);
  const neck = part((b) => {
    hull(b, '#ffffff', neckCore, lite ? 7 : 10, lite ? 5 : 8, { p: NAT, r: [NECK, 0, 0], tint: 1 });
    curls(b, neckCore, 0.095, { at: NAT, rot: [NECK, 0, 0], seed: 2, geo: lite ? CURL_S_LITE : CURL_S });
    collar(b, NECK, 0.2, 0.123, 0.018, 0.68);
  }, [0, 0.38, 0.2], 'neck');
  // visage : ellipsoïde dont le bas de l'avant est tiré en museau (une seule surface, sans pli)
  const FC = [0, -0.01, 0.055];
  const FR = [0.1, 0.115, 0.112];
  // bosses douces : museau (devant, en bas), joues
  const BUMPS = [[[0, -0.5, 0.87], 0.032, 0.62], [[0.55, -0.4, 0.73], 0.012, 0.45], [[-0.55, -0.4, 0.73], 0.012, 0.45]].map(([d, a, w]) => [new THREE.Vector3(...d).normalize(), a, w]);
  const face = (u, out = new THREE.Vector3()) => {
    const k = u.clone().normalize();
    let bump = 0;
    for (const [d, a, w] of BUMPS) bump += a * Math.exp(-((Math.acos(Math.min(1, k.dot(d))) / w) ** 2));
    return out.set(FC[0] + k.x * (FR[0] + bump), FC[1] + k.y * (FR[1] + bump), FC[2] + k.z * (FR[2] + bump));
  };
  // point et normale du visage dans la direction d
  const onFace = (d) => {
    const u = new THREE.Vector3(...d).normalize();
    const t1 = new THREE.Vector3().crossVectors(u, Math.abs(u.y) < 0.9 ? _up : new THREE.Vector3(1, 0, 0)).normalize();
    const t2 = new THREE.Vector3().crossVectors(u, t1);
    const e = 0.01;
    const a = face(u.clone().addScaledVector(t1, e)).sub(face(u.clone().addScaledVector(t1, -e)));
    const c = face(u.clone().addScaledVector(t2, e)).sub(face(u.clone().addScaledVector(t2, -e)));
    const n = new THREE.Vector3().crossVectors(a, c).normalize();
    if (n.dot(u) < 0) n.negate();
    return { p: face(u), n };
  };
  // pose une pièce plate (épaisseur sur z) contre le visage, en d, enfoncée de inset, tournée de twist
  const onSkin = (geo, color, d, s, inset, twist = 0) => {
    const { p, n } = onFace(d);
    const q = new THREE.Quaternion().setFromAxisAngle(n, twist).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
    const e = new THREE.Euler().setFromQuaternion(q);
    b0.add(geo, color, { p: p.addScaledVector(n, -inset).toArray(), s, r: [e.x, e.y, e.z], tint: 0 });
    return { p, n };
  };
  let b0 = null;
  const capCore = surface([0, 0, 0], [0.125, 0.09, 0.125]);
  const CAP = [0, 0.055, -0.035];
  const head = part((b) => {
    b0 = b;
    skinMesh(b, SKIN, face, lite ? 12 : 20, lite ? 9 : 14, { tint: 0 });
    // nez : petit triangle rose arrondi, pointe en bas ; sillon et bouche en Y dessous
    const nose = lite ? new THREE.SphereGeometry(1, 6, 4) : new THREE.SphereGeometry(1, 10, 6);
    const np = nose.attributes.position;
    for (let i = 0; i < np.count; i++) np.setX(i, np.getX(i) * (0.6 + 0.4 * (np.getY(i) + 1) / 2));
    onSkin(nose, '#e39a98', [0, -0.36, 0.93], [0.025, 0.017, 0.01], 0.004);
    const m = onFace([0, -0.6, 0.8]);
    const top = onFace([0, -0.45, 0.89]).p;
    if (!lite) bone(b, '#c47c7b', top.toArray(), m.p.clone().addScaledVector(m.n, 0.0005).toArray(), 0.0024, 0.0024, 4, 0);
    const X = new THREE.Vector3(1, 0, 0);
    const Y = new THREE.Vector3().crossVectors(m.n, X);
    const frame = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, m.n));
    if (!lite) for (const sx of [-1, 1]) {
      const arc = 1.9;
      const q = frame.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2 - arc / 2));
      const e = new THREE.Euler().setFromQuaternion(q);
      const c = m.p.clone().addScaledVector(X, sx * 0.0105).addScaledVector(Y, 0.011).addScaledVector(m.n, 0.0008);
      b.add(G.torus(0.011, 0.0022, 3, 6, arc), '#c47c7b', { p: c.toArray(), r: [e.x, e.y, e.z], tint: 0 });
    }
    // yeux noirs brillants, bien écartés, à mi-hauteur du visage
    for (const sx of [-1, 1]) {
      const { p, n } = onFace([sx * 0.5, 0.25, 0.83]);
      p.addScaledVector(n, -0.006);
      eye(b, p.x, p.y, p.z, 0.019, null, lite ? 0 : 2);
      // oreille en feuille creusée, à l'horizontale sous la laine, intérieur rose
      const eo = new THREE.Euler(0.3, sx * 0.35, -sx * 0.3);
      const at = (o) => new THREE.Vector3(...o).applyEuler(eo).add(new THREE.Vector3(sx * 0.165, -0.005, -0.015)).toArray();
      const [E, EI] = lite ? [EAR_LITE, EAR_IN_LITE] : [EAR, EAR_IN];
      const ear = sx > 0 ? E : E.clone().scale(-1, 1, 1);
      const inner = sx > 0 ? EI : EI.clone().scale(-1, 1, 1);
      b.add(ear, SKIN, { p: at([0, 0, 0]), s: [0.068, 0.04, 0.03], r: [eo.x, eo.y, eo.z], tint: 0 });
      b.add(inner, '#eba3a0', { p: at([sx * 0.007, 0, 0.004]), s: [0.052, 0.028, 0.012], r: [eo.x, eo.y, eo.z], tint: 0 });
    }
    // calotte de laine : fond lisse et boucles sur le dessus, l'arrière et les côtés, frange sur le front
    hull(b, '#ffffff', capCore, lite ? 8 : 12, lite ? 6 : 9, { p: CAP, tint: 1 });
    curls(b, capCore, 0.058, { at: CAP, seed: 3, geo: lite ? CURL_S_LITE : CURL_S, keep: (q) => !(q.z + CAP[2] > 0.02 && q.y + CAP[1] < 0.075 && Math.abs(q.x) < 0.085) });
  }, axis.clone().multiplyScalar(0.36).toArray(), 'head');
  head.geo.scale(1.1, 1.1, 1.1); // tête un peu plus grosse, comme sur la planche
  head.parent = 1;
  // queue : touffe de boucles en haut de la croupe, pendante
  const tailCore = surface([0, 0, 0], [0.04, 0.065, 0.04]);
  const tail = part((b) => {
    hull(b, '#ffffff', tailCore, lite ? 6 : 8, lite ? 4 : 6, { p: [0, -0.09, -0.05], r: [-0.25, 0, 0], tint: 1 });
    curls(b, tailCore, 0.045, { at: [0, -0.09, -0.05], rot: [-0.25, 0, 0], seed: 4, geo: lite ? CURL_S_LITE : CURL_S });
  }, [0, 0.54, -0.44], 'tail');
  return [body, neck, head, ...legs({ x: 0.1, zf: 0.15, zb: -0.31, hip: 0.36, color: SKIN, hoof: '#c99d8c', hoofH: 0.045, hoofRound: true, hoofGeo: lite ? HOOF : HOOF_SMOOTH, radii: [0.056, 0.052, 0.047, 0.04], sides: lite ? 6 : 10, rings: lite ? 3 : 5,
    front: [[0, 0, 0], [0, -0.17, 0.006], [0, -0.28, 0], [0, -0.3375, 0]], back: [[0, 0, 0], [0, -0.15, -0.03], [0, -0.28, 0], [0, -0.3375, 0]] }), tail];
}

// Chèvre : dos droit, cornes recourbées vers l'arrière, barbichette, oreilles tombantes
function chevre() {
  const HORN = '#9c8a74';
  const body = part((b) => {
    b.add(G.box(0.5, 0.34, 0.78, 0.12, 1), '#ffffff', { p: [0, 0.63, -0.02] });
    blob(b, '#ffffff', [0, 0.6, 0.3], [0.21, 0.17, 0.16], {}, 7, 5);
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.16, 0.2], 0.1, 0.075);
    blob(b, '#ffffff', [0, 0.18, 0.33], [0.11, 0.12, 0.16], { r: [0.3, 0, 0] });
    blob(b, '#f1ebe3', [0, 0.11, 0.47], [0.075, 0.07, 0.09], {}, 7, 5);
    b.add(G.cone(0.035, 0.12, 6), '#ece6dd', { p: [0, 0.0, 0.44], r: [Math.PI + 0.25, 0, 0] }); // barbichette
    for (const sx of [-1, 1]) {
      const h = [[sx * 0.045, 0.28, 0.32], [sx * 0.06, 0.39, 0.27], [sx * 0.075, 0.45, 0.17], [sx * 0.08, 0.43, 0.08]];
      for (let i = 0; i < 3; i++) bone(b, HORN, h[i], h[i + 1], 0.026 - i * 0.006, 0.02 - i * 0.006, 6, 0);
      blob(b, '#ffffff', [sx * 0.2, 0.18, 0.29], [0.14, 0.035, 0.05], { r: [0, 0, sx * -0.6] }, 6, 4);
      eye(b, sx * 0.075, 0.22, 0.42, 0.028);
    }
  }, [0, 0.6, 0.3], 'head');
  const tail = part((b) => b.add(G.cone(0.04, 0.13, 6), '#ffffff', { p: [0, 0.05, -0.02], r: [-0.5, 0, 0] }), [0, 0.76, -0.41], 'tail');
  return [body, head, ...legs({ x: 0.14, zf: 0.27, zb: -0.28, hip: 0.52, color: '#e9e2d8', tint: 1, r0: 0.042, r1: 0.034, hoof: '#4a3f3a',
    front: [[0, 0, 0], [0, -0.25, 0.02], [0, -0.46, 0]], back: [[0, 0, 0], [0, -0.22, -0.06], [0, -0.46, 0]] }), tail];
}

// Vache (d'après la planche de référence) : corps en tonneau à dos droit et croupe carrée, croupe et
// épaules soudées d'où sortent des pattes lisses à onglons, cou court qui porte la tête au-dessus du
// garrot et plie pour brouter, crâne rond, large museau rose, oreilles en feuille, cornes relevées,
// collier bleu et cloche dorée, gros pis à quatre trayons, queue à houppe ; taches lobées teintées
// par la robe
function vache() {
  const CREAM = '#f5e9d6';
  const PINK = '#f0b4a8';
  const NECK = 0.62; // inclinaison du cou vers l'avant (rad)
  // enveloppe du corps : tonneau, plus croupe et épaules (même pièce, donc sans trait d'encre) qui
  // enveloppent le haut des pattes : celles-ci sortent du dessous, jamais du flanc
  const SHELL = [{ c: [0, 0.545, -0.035], rad: [0.25, 0.29, 0.465], n: 3 }];
  for (const sx of [-1, 1]) SHELL.push({ c: [sx * 0.11, 0.36, -0.3], rad: [0.11, 0.14, 0.16], n: 2.5 }, { c: [sx * 0.11, 0.36, 0.22], rad: [0.1, 0.13, 0.14], n: 2.5 });
  const [shell, ...masses] = SHELL.map((e) => surface(e.c, e.rad, e.n));
  const skin = nextId();
  const body = part((b) => {
    hull(b, CREAM, shell, 18, 13, { tint: 0 });
    for (const m of masses) hull(b, CREAM, m, 7, 5, { tint: 0 });
    // selle sur le dos (dessus et deux flancs) ; à droite (vue de profil de la planche) épaule, flanc,
    // croupe et cuisse ; à gauche, d'autres taches
    const spots = [
      [[0, 1, -0.05], [0.42, 0.62], 1], [[-1, 0.75, -0.05], [0.34, 0.32], 2], [[1, 0.7, 0.05], [0.36, 0.33], 3],
      [[-0.9, 0.2, 0.62], [0.26, 0.4], 4], [[-1, -0.45, 0.05], [0.3, 0.16], 5], [[-0.85, 0.45, -0.75], [0.25, 0.27], 6], [[-0.75, -0.7, -0.62], [0.17, 0.18], 7],
      [[1, -0.05, -0.1], [0.33, 0.28], 8], [[0.9, 0.3, 0.7], [0.21, 0.24], 9], [[0.8, 0.4, -0.8], [0.23, 0.25], 10],
    ];
    for (const [d, size, seed] of spots) patch(b, shell, d, size, seed);
    // gros pis rose, visible de dos entre les cuisses ; quatre trayons arrondis, un peu écartés
    blob(b, PINK, [0, 0.235, -0.16], [0.14, 0.095, 0.13], { tint: 0 }, 10, 8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) limb(b, '#e9a194', [[sx * 0.055, 0.172, -0.16 + sz * 0.055], [sx * 0.067, 0.105, -0.16 + sz * 0.065]], [0.02, 0.018], { sides: 6, rings: 1, end: 'round' });
  }, [0, 0, 0], 'none', 1, 0, skin);
  body.shell = SHELL;
  // cou : pivot au poitrail, il porte la tête (pièce suivante) ; collier et cloche sous la gorge
  const axis = new THREE.Vector3(0, Math.cos(NECK), Math.sin(NECK));
  const neck = part((b) => {
    blob(b, CREAM, axis.clone().multiplyScalar(0.246).toArray(), [0.155, 0.27, 0.155], { r: [NECK, 0, 0], tint: 0 }, 9, 8);
    collar(b, NECK, 0.36, 0.145, 0.026);
  }, [0, 0.5, 0.22], 'neck', 1, 0, skin);
  const crane = surface([0, 0.02, 0.02], [0.165, 0.16, 0.165]);
  const MC = [0, -0.08, 0.19];
  const MR = [0.125, 0.085, 0.09];
  const head = part((b) => {
    hull(b, CREAM, crane, 12, 9, { tint: 0 });
    blob(b, PINK, MC, MR, { tint: 0 }, 12, 9);
    patch(b, crane, [0.62, 0.35, 0.65], [0.38, 0.36], 12); // tache autour de l'œil gauche, jusqu'à l'oreille
    for (const sx of [-1, 1]) {
      // naseau ovale posé selon la normale du museau, penché vers l'extérieur et le haut, creux sombre
      const p = new THREE.Vector3(sx * 0.05, -0.07, 0);
      p.z = MC[2] + MR[2] * Math.sqrt(1 - ((p.x - MC[0]) / MR[0]) ** 2 - ((p.y - MC[1]) / MR[1]) ** 2);
      const nrm = new THREE.Vector3((p.x - MC[0]) / MR[0] ** 2, (p.y - MC[1]) / MR[1] ** 2, (p.z - MC[2]) / MR[2] ** 2).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(nrm, -sx * 0.35).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm));
      const e = new THREE.Euler().setFromQuaternion(q);
      b.add(G.sphere(1, 8, 4), '#b06866', { p: p.clone().addScaledVector(nrm, -0.003).toArray(), s: [0.022, 0.03, 0.01], r: [e.x, e.y, e.z], tint: 0 });
      b.add(G.sphere(1, 6, 3), '#7e4646', { p: p.clone().addScaledVector(nrm, 0.0035).toArray(), s: [0.012, 0.019, 0.006], r: [e.x, e.y, e.z], tint: 0 });
      eye(b, sx * 0.1, 0.05, 0.14, 0.03, null, true);
      // oreille en feuille, à plat vers l'avant, intérieur rose ; la gauche prend la tache
      const eo = new THREE.Euler(0, sx * 0.3, -sx * 0.15);
      const at = (o) => new THREE.Vector3(...o).applyEuler(eo).add(new THREE.Vector3(sx * 0.215, 0.05, -0.05)).toArray();
      blob(b, sx > 0 ? '#ffffff' : CREAM, at([0, 0, 0]), [0.1, 0.055, 0.028], { r: [eo.x, eo.y, eo.z], tint: sx > 0 ? 1 : 0 }, 8, 6);
      blob(b, '#eea69d', at([sx * 0.012, 0, 0.02]), [0.07, 0.035, 0.012], { r: [eo.x, eo.y, eo.z], tint: 0 }, 6, 3);
      // corne : vers l'extérieur, puis le haut, puis un peu vers l'intérieur ; pointe arrondie
      limb(b, '#ecdcb4', [[sx * 0.06, 0.1, -0.03], [sx * 0.11, 0.165, -0.03], [sx * 0.155, 0.225, -0.035], [sx * 0.15, 0.285, -0.05]], [0.034, 0.028, 0.019, 0.01], { sides: 7, rings: 4, end: 'round' });
    }
  }, axis.clone().multiplyScalar(0.43).toArray(), 'head');
  head.parent = 1;
  // queue : racine enfoncée dans la croupe, courbe douce en S, houppe en pinceau (couleur des taches)
  const tail = part((b) => {
    limb(b, CREAM, [[0, 0.01, 0.03], [0, -0.01, -0.04], [0, -0.12, -0.1], [0, -0.26, -0.095], [0, -0.37, -0.06]], [0.03, 0.028, 0.025, 0.022, 0.02], { sides: 6, rings: 5, end: 'round' });
    blob(b, '#ffffff', [0, -0.42, -0.06], [0.032, 0.07, 0.032], {}, 5, 4);
    for (const sx of [-1, 1]) blob(b, '#ffffff', [sx * 0.022, -0.415, -0.06], [0.026, 0.06, 0.026], { r: [0, 0, sx * 0.35] }, 5, 4);
  }, [0, 0.7, -0.45], 'tail');
  return [body, neck, head, ...legs({ x: 0.11, zf: 0.22, zb: -0.3, hip: 0.5, color: CREAM, hoof: '#3b3537', hoofH: 0.055, cloven: true, hoofRound: true, radii: [0.07, 0.064, 0.056, 0.045],
    front: [[0, 0, 0], [0, -0.25, 0.012], [0, -0.4, 0], [0, -0.4725, 0]], back: [[0, 0, 0], [0, -0.22, -0.05], [0, -0.4, 0], [0, -0.4725, 0]] }), tail];
}

// Cerf : cou long dressé, museau allongé, bois ramifiés, croupe blanche, jarrets marqués
function cerf() {
  const BONE = '#ead7b4';
  const body = part((b) => {
    blob(b, '#ffffff', [0, 0.78, -0.02], [0.21, 0.2, 0.44]);
    blob(b, '#f3e6cf', [0, 0.69, 0], [0.17, 0.12, 0.34], { tint: 0 }, 7, 5); // ventre clair
    blob(b, '#fbf3e6', [0, 0.8, -0.43], [0.15, 0.15, 0.08], { tint: 0 }, 7, 5); // croupe blanche
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.3, 0.32], 0.11, 0.07);
    blob(b, '#ffffff', [0, 0.36, 0.45], [0.1, 0.11, 0.15], { r: [0.25, 0, 0] });
    blob(b, '#efe6dc', [0, 0.31, 0.62], [0.065, 0.065, 0.11], {}, 7, 5);
    b.add(G.sphere(0.03, 6, 4), EYE, { p: [0, 0.31, 0.73], tint: 0 }); // truffe
    for (const sx of [-1, 1]) {
      blob(b, '#ffffff', [sx * 0.13, 0.46, 0.38], [0.1, 0.04, 0.05], { r: [0, 0, sx * 0.5] }, 6, 4);
      eye(b, sx * 0.08, 0.39, 0.53, 0.028);
      // bois : merrain à trois segments et quatre andouillers
      const m = [[sx * 0.05, 0.45, 0.42], [sx * 0.15, 0.6, 0.36], [sx * 0.21, 0.76, 0.27], [sx * 0.23, 0.9, 0.19]];
      for (let i = 0; i < 3; i++) bone(b, BONE, m[i], m[i + 1], 0.024 - i * 0.005, 0.019 - i * 0.005, 5, 0);
      for (const [a, c] of [[m[1], [sx * 0.17, 0.68, 0.5]], [m[2], [sx * 0.29, 0.86, 0.33]], [m[3], [sx * 0.18, 0.99, 0.15]], [m[3], [sx * 0.3, 0.97, 0.14]]]) bone(b, BONE, a, c, 0.014, 0.008, 5, 0);
    }
  }, [0, 0.8, 0.32], 'head');
  const tail = part((b) => b.add(G.sphere(1, 6, 4), '#ffffff', { p: [0, 0, -0.03], s: [0.05, 0.08, 0.04] }), [0, 0.86, -0.46], 'tail');
  return [body, head, ...legs({ x: 0.1, zf: 0.26, zb: -0.28, hip: 0.74, color: '#e3d8cd', tint: 1, r0: 0.046, r1: 0.03, hoof: '#3d3330', hoofH: 0.05, joint: 'back',
    front: [[0, 0, 0], [0, -0.38, 0.02], [0, -0.69, 0]], back: [[0, 0, 0], [0, -0.33, -0.1], [0, -0.69, -0.02]] }), tail];
}

export const SPECIES = {
  // Ongulés refaits (catalogue ANI-001 à ANI-004) : visage, cou porté par la pièce « head » (la vache
  // a un cou articulé, pièce « neck »), pattes à sabots, robes teintées par animal. graze : angle de
  // broutage (rad) de la tête, ou du cou s'il y en a un ; nod : angle de la tête portée par le cou ;
  // muzzle : bout du museau dans le repère de la tête ; top : haut de la tête (m, avant l'échelle).
  mouton: {
    speed: 0.6, scale: 1, shadow: true, graze: 1.5, nod: -0.7, muzzle: [0, -0.11, 0.19], top: 0.92,
    coats: [['Crème', '#f4e9d0'], ['Blanc', '#fbf8f1'], ['Noir', '#5a5160']],
    parts: () => mouton(),
    // au-delà de 20 m du joueur, la version allégée (mêmes pièces)
    lod: () => mouton(true), lodDist: 20,
  },
  chevre: {
    speed: 0.9, scale: 0.9, shadow: true, graze: 1.2, muzzle: [0, 0.1, 0.56], top: 1.2,
    coats: [['Crème', '#f3ead9'], ['Alpine brune', '#a9784f'], ['Noire', '#544a4e']],
    parts: () => chevre(),
  },
  vache: {
    speed: 0.45, scale: 1.4, shadow: true, graze: 1.45, nod: -0.6, muzzle: [0, -0.14, 0.22], top: 1.15,
    coats: [['Pie brune', '#8a5a3c'], ['Pie noire', '#3b3340'], ['Pie rouge', '#b8643c']],
    parts: () => vache(),
  },
  cerf: {
    speed: 1.4, scale: 1.2, shadow: true, shy: 7, graze: 1.2, muzzle: [0, 0.3, 0.74], top: 1.85,
    coats: [["Fauve d'été", '#c98f5f'], ["Brun d'hiver", '#8d6a52']],
    parts: () => cerf(),
  },
  renard: {
    speed: 1.2, scale: 0.75, shadow: true, shy: 6,
    parts: () => quad({
      body: '#f39c4a', bodyS: [0.42, 0.42, 0.9], head: '#f39c4a', headS: [0.3, 0.28, 0.38], leg: '#5b4a63', legLen: 0.28,
      ears: (b) => { for (const sx of [-1, 1]) b.add(G.cone(0.07, 0.18, 4), '#f39c4a', { p: [sx * 0.1, 0.17, 0] }); b.add(G.sphere(0.08, 6, 4), '#fbf7f2', { p: [0, -0.05, 0.2], s: [1, 0.7, 1] }); },
      tail: (b) => { b.add(G.sphere(0.16, 8, 6), '#f39c4a', { p: [0, 0.05, -0.25], s: [0.9, 0.9, 2] }); b.add(G.sphere(0.1, 6, 4), '#fbf7f2', { p: [0, 0.08, -0.55] }); },
    }),
  },
  lapin: {
    speed: 1.6, scale: 0.5, hop: true, shy: 5,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 10, 8), '#e6d6c2', { p: [0, 0.32, 0], s: [0.5, 0.48, 0.66] }); b.add(G.sphere(0.12, 6, 4), '#fffaf0', { p: [0, 0.38, -0.33] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.2, 10, 8), '#e6d6c2', { p: [0, 0, 0.08] }); for (const sx of [-1, 1]) b.add(G.sphere(0.08, 6, 5), '#e6d6c2', { p: [sx * 0.08, 0.27, 0], s: [0.6, 2.1, 0.5] }); }, [0, 0.55, 0.28], 'head'),
    ],
  },
  herisson: {
    speed: 0.35, scale: 0.6,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 10, 7), '#8a6a5c', { p: [0, 0.18, 0], s: [0.5, 0.36, 0.62] }); for (let k = 0; k < 14; k++) b.add(G.cone(0.05, 0.16, 4), '#5b4a5a', { p: [Math.cos(k * 1.7) * 0.18, 0.3 + (k % 3) * 0.04, Math.sin(k * 2.3) * 0.22], r: [Math.sin(k) * 0.6, 0, Math.cos(k) * 0.6] }); }, [0, 0, 0]),
      part((b) => { b.add(G.cone(0.12, 0.22, 8), '#e6d6c2', { p: [0, 0, 0.08], r: [Math.PI / 2, 0, 0] }); b.add(G.sphere(0.03, 5, 4), '#3d3049', { p: [0, 0, 0.2] }); }, [0, 0.16, 0.3], 'head'),
    ],
  },
  ecureuil: {
    speed: 1.5, scale: 0.4, hop: true, shy: 5,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 10, 8), '#d4734a', { p: [0, 0.35, 0], s: [0.42, 0.55, 0.5] }); b.add(G.sphere(0.24, 8, 6), '#d4734a', { p: [0, 0.75, -0.35], s: [0.8, 1.6, 0.9] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.17, 10, 8), '#d4734a', {}); for (const sx of [-1, 1]) b.add(G.cone(0.05, 0.12, 4), '#d4734a', { p: [sx * 0.08, 0.16, 0] }); }, [0, 0.72, 0.15], 'head'),
    ],
  },
  tortue: {
    speed: 0.2, scale: 0.8,
    parts: () => [
      part((b) => { b.add(G.sphere(0.5, 12, 8), '#7fb88a', { p: [0, 0.18, 0], s: [0.75, 0.42, 0.95] }); for (let k = 0; k < 5; k++) b.add(G.sphere(0.12, 6, 4), '#9fd09a', { p: [Math.cos(k * 1.25) * 0.15, 0.36, Math.sin(k * 1.25) * 0.2], s: [1, 0.3, 1] }); for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(G.sphere(0.08, 6, 4), '#c6d6a0', { p: [sx * 0.3, 0.08, sz * 0.32], s: [1.2, 0.6, 1.4] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.11, 8, 6), '#c6d6a0', { p: [0, 0, 0.06] }); }, [0, 0.15, 0.45], 'head'),
    ],
  },
  crabe: {
    speed: 0.7, scale: 0.6, sideways: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.2, 10, 7), '#f49d86', { p: [0, 0.14, 0], s: [1.25, 0.62, 1] }); for (const sx of [-1, 1]) { b.add(G.cyl(0.018, 0.018, 0.12, 5), '#f49d86', { p: [sx * 0.07, 0.25, 0.1] }); b.add(G.sphere(0.035, 6, 4), '#fffaf0', { p: [sx * 0.07, 0.32, 0.1] }); b.add(G.sphere(0.08, 8, 6), '#f49d86', { p: [sx * 0.3, 0.15, 0.14], s: [1, 0.7, 1.2] }); } }, [0, 0, 0]),
      ...[-1, 1].flatMap((sx) => [0, 1, 2].map((k) => part((b) => b.add(G.cyl(0.015, 0.012, 0.18, 4), '#e07a64', { p: [sx * 0.09, -0.04, 0], r: [0, 0, sx * 1.0] }), [sx * 0.18, 0.12, -0.08 + k * 0.08], 'leg', sx, k * 1.7))),
    ],
  },
  mouette: {
    speed: 4, scale: 0.9, fly: 'circle', height: 9,
    parts: () => birdParts('#fbf7f2', '#d8dce8', '#f6b45e'),
  },
  perroquet: {
    speed: 3.5, scale: 0.7, fly: 'circle', height: 7,
    parts: () => birdParts('#e8705f', '#5b9fd8', '#f6d27a', '#7fc48b'),
  },
  flamant: {
    speed: 0.3, scale: 1.1, wade: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.25, 10, 8), '#f4a2b4', { p: [0, 1.05, 0], s: [0.9, 0.7, 1.4] }); b.add(G.cyl(0.02, 0.02, 0.9, 4), '#f08aa0', { p: [0, 0.48, 0] }); b.add(G.cyl(0.02, 0.02, 0.5, 4), '#f08aa0', { p: [0.06, 0.8, 0.05], r: [1.2, 0, 0] }); }, [0, 0, 0]),
      part((b) => { b.add(G.cyl(0.03, 0.035, 0.7, 5), '#f4a2b4', { p: [0, 0.35, 0], r: [0.25, 0, 0] }); b.add(G.sphere(0.08, 8, 6), '#f4a2b4', { p: [0, 0.72, 0.12] }); b.add(G.cone(0.03, 0.12, 5), '#3d3049', { p: [0, 0.68, 0.22], r: [2.2, 0, 0] }); }, [0, 1.12, 0.25], 'head'),
    ],
  },
  canard: {
    speed: 0.6, scale: 0.6, swim: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.3, 10, 8), '#f6ead2', { p: [0, 0.1, 0], s: [0.8, 0.6, 1.2] }); b.add(G.cone(0.08, 0.14, 4), '#f6ead2', { p: [0, 0.2, -0.33], r: [-1.2, 0, 0] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.13, 8, 6), '#3f8f8a', {}); b.add(G.cone(0.05, 0.14, 6), '#f6b45e', { p: [0, -0.02, 0.15], r: [Math.PI / 2, 0, 0], s: [1.3, 1, 0.6] }); }, [0, 0.38, 0.22], 'head'),
    ],
  },
  grenouille: {
    speed: 1.2, scale: 0.35, hop: true,
    parts: () => [part((b) => { b.add(G.sphere(0.3, 10, 8), '#8fc79a', { p: [0, 0.18, 0], s: [1, 0.65, 1.1] }); for (const sx of [-1, 1]) { b.add(G.sphere(0.08, 8, 6), '#fffaf0', { p: [sx * 0.12, 0.38, 0.12] }); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [sx * 0.12, 0.4, 0.18] }); b.add(G.sphere(0.12, 6, 4), '#7fbf86', { p: [sx * 0.24, 0.08, -0.1], s: [0.8, 0.5, 1.4] }); } }, [0, 0, 0])],
  },
  poisson: {
    speed: 1.0, scale: 0.6, fish: true,
    parts: () => [part((b) => { b.add(G.sphere(0.25, 8, 6), '#f39c6b', { s: [0.6, 0.8, 1.4] }); b.add(G.cone(0.14, 0.2, 4), '#f6c08a', { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [0.3, 1, 1] }); }, [0, 0, 0], 'tail')],
  },
  papillon: {
    speed: 1.2, scale: 1, insect: 'flutter', height: 1.1,
    parts: () => [
      part((b) => b.add(G.cyl(0.015, 0.015, 0.12, 4), '#5b4a63', { r: [Math.PI / 2, 0, 0] }), [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.07, 6, 4), '#f6d27a', { p: [0.07, 0, 0.02], s: [1.2, 0.1, 1] }); b.add(G.sphere(0.05, 6, 4), '#f4a2b4', { p: [0.06, 0, -0.05], s: [1, 0.1, 1] }); }, [0.01, 0, 0], 'wing', 1),
      part((b) => { b.add(G.sphere(0.07, 6, 4), '#f6d27a', { p: [-0.07, 0, 0.02], s: [1.2, 0.1, 1] }); b.add(G.sphere(0.05, 6, 4), '#f4a2b4', { p: [-0.06, 0, -0.05], s: [1, 0.1, 1] }); }, [-0.01, 0, 0], 'wing', -1),
    ],
  },
  abeille: {
    speed: 1.6, scale: 1, insect: 'buzz', height: 1.0,
    parts: () => [
      part((b) => { b.add(G.sphere(0.05, 6, 4), '#f6c46d', { s: [0.9, 0.9, 1.3] }); b.add(G.torus(0.045, 0.012, 4, 8), '#5b4a63', { r: [0, 0, 0] }); }, [0, 0, 0]),
      part((b) => b.add(G.sphere(0.035, 5, 3), '#fbfbff', { p: [0.03, 0.02, 0], s: [1.2, 0.2, 0.8] }), [0.02, 0.03, 0], 'wing', 1),
      part((b) => b.add(G.sphere(0.035, 5, 3), '#fbfbff', { p: [-0.03, 0.02, 0], s: [1.2, 0.2, 0.8] }), [-0.02, 0.03, 0], 'wing', -1),
    ],
  },
  luciole: { speed: 0.6, scale: 1, insect: 'glow', glow: [0xe9f5a0, 0.5], height: 1.4, night: true, parts: () => [] },
  phoque: {
    speed: 0.3, scale: 1,
    parts: () => [
      part((b) => { b.add(G.sphere(0.4, 12, 8), '#bcc8d8', { p: [0, 0.28, 0], s: [0.9, 0.7, 1.9] }); b.add(G.cone(0.2, 0.3, 6), '#a9b6c8', { p: [0, 0.18, -0.85], r: [-Math.PI / 2, 0, 0], s: [1.4, 1, 0.4] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.24, 10, 8), '#bcc8d8', {}); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [0.09, 0.06, 0.2] }); b.add(G.sphere(0.04, 6, 4), '#3d3049', { p: [-0.09, 0.06, 0.2] }); }, [0, 0.5, 0.65], 'head'),
    ],
  },
  pingouin: {
    speed: 0.5, scale: 0.8, waddle: true,
    parts: () => [
      part((b) => { b.add(G.sphere(0.3, 10, 8), '#4d4766', { p: [0, 0.4, 0], s: [0.85, 1.4, 0.8] }); b.add(G.sphere(0.27, 10, 8), '#fbf7f2', { p: [0, 0.38, 0.06], s: [0.75, 1.25, 0.7] }); for (const sx of [-1, 1]) b.add(G.sphere(0.07, 6, 4), '#f6b45e', { p: [sx * 0.1, 0.02, 0.08], s: [1, 0.4, 1.6] }); }, [0, 0, 0]),
      part((b) => { b.add(G.sphere(0.17, 10, 8), '#4d4766', {}); b.add(G.cone(0.04, 0.14, 5), '#f6b45e', { p: [0, -0.02, 0.17], r: [Math.PI / 2, 0, 0] }); }, [0, 0.85, 0.02], 'head'),
    ],
  },
  lezard: {
    speed: 1.0, scale: 0.6,
    parts: () => [part((b) => { b.add(G.sphere(0.2, 8, 6), '#9fd09a', { p: [0, 0.08, 0], s: [0.7, 0.4, 1.6] }); b.add(G.cone(0.08, 0.5, 5), '#9fd09a', { p: [0, 0.06, -0.5], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.5] }); b.add(G.sphere(0.1, 8, 6), '#9fd09a', { p: [0, 0.1, 0.36], s: [1, 0.7, 1.3] }); for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(G.sphere(0.04, 5, 4), '#7fbf86', { p: [sx * 0.15, 0.04, sz * 0.15], s: [1.6, 0.5, 0.6] }); }, [0, 0, 0], 'tail')],
  },
  escargot: {
    speed: 0.12, scale: 1,
    parts: () => [part((b) => { b.add(G.sphere(0.2, 8, 6), '#e6d6c2', { p: [0, 0.08, 0.1], s: [0.8, 0.5, 2] }); b.add(G.torus(0.18, 0.1, 8, 14), '#c7b2e6', { p: [0, 0.32, -0.05], r: [0, Math.PI / 2, 0] }); b.add(G.sphere(0.12, 8, 6), '#e2a5c9', { p: [0, 0.32, -0.05] }); for (const sx of [-1, 1]) b.add(G.cyl(0.012, 0.012, 0.18, 4), '#e6d6c2', { p: [sx * 0.05, 0.2, 0.42], r: [0.4, 0, 0] }); }, [0, 0, 0])],
  },
};

export function birdParts(body, wing, beak, wing2 = null) {
  return [
    part((b) => { b.add(G.sphere(0.22, 10, 8), body, { s: [0.8, 0.75, 1.5] }); b.add(G.sphere(0.15, 8, 6), body, { p: [0, 0.1, 0.28] }); b.add(G.cone(0.05, 0.14, 5), beak, { p: [0, 0.08, 0.45], r: [Math.PI / 2, 0, 0] }); b.add(G.cone(0.12, 0.25, 4), wing, { p: [0, 0, -0.38], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.3] }); }, [0, 0, 0]),
    part((b) => b.add(G.sphere(0.5, 10, 6), wing, { p: [0.42, 0, 0], s: [1, 0.08, 0.32] }), [0.12, 0.02, 0], 'wing', 1),
    part((b) => b.add(G.sphere(0.5, 10, 6), wing2 || wing, { p: [-0.42, 0, 0], s: [1, 0.08, 0.32] }), [-0.12, 0.02, 0], 'wing', -1),
  ];
}
