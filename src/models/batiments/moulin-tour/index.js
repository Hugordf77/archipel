// Moulin-tour du plateau (BAT-013), d'après la référence de l'utilisateur (reference.png) : tour carrée à
// colombages sur cinq étages en léger retrait (enduit crème, poutres brun-orangé : poteaux, sablières,
// décharges, baies encadrées sur chaque face), galerie à garde-corps, tête de bois débordant à l'avant et
// à l'arrière sous un petit toit, six ailes longues à lattis sur la face +Z, qui tournent au vent ;
// annexe à colombages au toit de mousse accolée à la face +X ; maisonnette au toit de mousse percée d'une
// arche traversante (passage voûté le long de X). Variante 1 : version allégée, pour la vue lointaine.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { STONE_D, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { MAISONNETTE, PASSAGE } from './physique.js';

// palette de la référence : enduit crème, poutres brun-orangé, mousse vert tendre (aucun noir)
const ENDUIT = '#f4e4c6';
const POUTRE = '#c07a45';
const POUTRE_F = '#a5653b';
const BOIS_TOIT = '#c98a52';
const PORTE = '#ad6d40';
const VITRE = '#a9bfcc';
const TOILE = '#f7ecc8';
const TOILE_B = '#f1e1b6';
const MOUSSE = '#a9bf6c';
const MOUSSE_C = '#bdd07f';
const F = { tint: 0 };

// --- géométries à facettes plates -------------------------------------------------------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _u = new THREE.Vector3();
const _w = new THREE.Vector3();
// triangles [a, b, c, n] : chacun est retourné si sa normale ne va pas dans le sens n voulu
function tris(liste) {
  const pos = [];
  for (const [a, b, c, n] of liste) {
    _u.subVectors(b, a).cross(_w.subVectors(c, a));
    const [p, q] = _u.dot(n) < 0 ? [c, b] : [b, c];
    pos.push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// prisme le long de Y (−len/2 à len/2), profil convexe [[x, z]…] ; ouvert : sans la face du dernier au
// premier point (le dos d'une planche plaquée contre le mur)
const CACHE = new Map();
function prisme(profil, len, ouvert = false) {
  const cle = JSON.stringify([profil, len, ouvert]);
  if (CACHE.has(cle)) return CACHE.get(cle);
  const h = len / 2;
  const n = profil.length;
  const cx = profil.reduce((a, p) => a + p[0], 0) / n;
  const cz = profil.reduce((a, p) => a + p[1], 0) / n;
  const L = [];
  for (let i = 0; i < n - (ouvert ? 1 : 0); i++) {
    const [x0, z0] = profil[i];
    const [x1, z1] = profil[(i + 1) % n];
    const dir = V((x0 + x1) / 2 - cx, 0, (z0 + z1) / 2 - cz);
    L.push([V(x0, -h, z0), V(x1, -h, z1), V(x1, h, z1), dir], [V(x0, -h, z0), V(x1, h, z1), V(x0, h, z0), dir]);
  }
  for (const [y, s] of [[-h, -1], [h, 1]]) {
    for (let i = 1; i < n - 1; i++) L.push([V(profil[0][0], y, profil[0][1]), V(profil[i][0], y, profil[i][1]), V(profil[i + 1][0], y, profil[i + 1][1]), V(0, s, 0)]);
  }
  const g = tris(L);
  CACHE.set(cle, g);
  return g;
}
const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
// rectangle aux angles abattus (c) : section des poteaux, des dalles et des pans de toit
const octo = (w, d, c) => [[-w / 2 + c, -d / 2], [w / 2 - c, -d / 2], [w / 2, -d / 2 + c], [w / 2, d / 2 - c], [w / 2 - c, d / 2], [-w / 2 + c, d / 2], [-w / 2, d / 2 - c], [-w / 2, -d / 2 + c]];
// planche plaquée : face avant et deux chanfreins, dos ouvert contre le mur (z = 0 à d)
const plaque = (w, d) => [[w / 2, 0], [w / 2 - d * 0.6, d], [-w / 2 + d * 0.6, d], [-w / 2, 0]];
// pan de toit : largeur w (pente), épaisseur e, longueur L le long de Z (panZ) ou de X (panX)
const panZ = (w, e, L) => prisme(octo(w, e, Math.min(0.07, e * 0.35)), L).clone().rotateX(Math.PI / 2);
const panX = (w, e, L) => prisme(octo(e, w, Math.min(0.07, e * 0.35)), L).clone().rotateZ(Math.PI / 2);
// pignon : triangle de base w et de hauteur h, épaisseur e, face vers ±Z (pignonZ) ou ±X (pignonX)
const pignonZ = (w, h, e) => prisme([[-w / 2, 0], [w / 2, 0], [0, h]], e).clone().rotateX(-Math.PI / 2);
const pignonX = (w, h, e) => pignonZ(w, h, e).rotateY(Math.PI / 2);
// tronc de pyramide carré (jupe du chapeau) : côtés b en bas et t en haut, hauteur h
function tronc(b, t, h) {
  const B = [[-b, -b], [b, -b], [b, b], [-b, b]].map(([x, z]) => V(x / 2, 0, z / 2));
  const T = [[-t, -t], [t, -t], [t, t], [-t, t]].map(([x, z]) => V(x / 2, h, z / 2));
  const L = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const n = V((B[i].x + B[j].x) / 2, 0.3, (B[i].z + B[j].z) / 2);
    L.push([B[i], B[j], T[j], n], [B[i], T[j], T[i], n]);
  }
  L.push([T[0], T[1], T[2], V(0, 1, 0)], [T[0], T[2], T[3], V(0, 1, 0)]);
  return tris(L);
}
// cadre de baie : anneau W × H de bord t, en saillie d (face avant, chants extérieurs biseautés, tableau ;
// sans tableau en version allégée)
function cadre(W, H, t, d, leger = false) {
  const cle = `cadre${[W, H, t, d, leger]}`;
  if (CACHE.has(cle)) return CACHE.get(cle);
  const o = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
  const i = o.map(([x, y]) => [x - Math.sign(x) * t, y - Math.sign(y) * t]);
  const b = o.map(([x, y]) => [x + Math.sign(x) * d * 0.5, y + Math.sign(y) * d * 0.5]);
  const L = [];
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4;
    const m = V((o[k][0] + o[j][0]) / 2, (o[k][1] + o[j][1]) / 2, 0);
    L.push([V(...o[k], d), V(...o[j], d), V(...i[j], d), V(0, 0, 1)], [V(...o[k], d), V(...i[j], d), V(...i[k], d), V(0, 0, 1)]);
    L.push([V(...b[k], 0), V(...b[j], 0), V(...o[j], d), m], [V(...b[k], 0), V(...o[j], d), V(...o[k], d), m]);
    if (leger) continue;
    const mi = m.clone().negate();
    L.push([V(...i[k], d), V(...i[j], d), V(...i[j], 0.005), mi], [V(...i[k], d), V(...i[j], 0.005), V(...i[k], 0.005), mi]);
  }
  const g = tris(L);
  CACHE.set(cle, g);
  return g;
}
// demi-couronne d'arche (archivolte) : rayons r0 à r1, épaisseur e, centre au sol de la clé (0, 0)
function archivolte(r0, r1, e, seg) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, 0, Math.PI, false);
  s.lineTo(-r0, 0);
  s.absarc(0, 0, r0, Math.PI, 0, true);
  s.lineTo(r1, 0);
  return new THREE.ExtrudeGeometry(s, { depth: e, bevelEnabled: false, curveSegments: seg }).translate(0, 0, -e / 2);
}
// voûte et tympans d'un passage : sous le rectangle (±r ; haut), au-dessus de l'arc de rayon r centré à
// (0 ; naissance), sur la profondeur p (le long de X une fois tournée)
function voute(r, naissance, haut, p, seg) {
  const s = new THREE.Shape();
  s.moveTo(-r, naissance);
  s.absarc(0, naissance, r, Math.PI, 0, true);
  s.lineTo(r, haut);
  s.lineTo(-r, haut);
  s.lineTo(-r, naissance);
  return new THREE.ExtrudeGeometry(s, { depth: p, bevelEnabled: false, curveSegments: seg }).rotateY(Math.PI / 2);
}

// socle de pierre w × d, haut de h, au dessus quadrillé au pas d'environ 0,42 m (l'emprise mesurée par
// mesure.mjs ne voit que des sommets : le quadrillage lui donne l'assise pleine ; pas en version allégée)
function socle(b, w, d, h, x, z, leger) {
  const [nx, nz] = leger ? [1, 1] : [Math.max(1, Math.round(w / 0.42)), Math.max(1, Math.round(d / 0.42))];
  b.add(new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2), STONE_D, { p: [x, h, z], ...F });
  const L = [];
  for (const [ax, az, bx2, bz] of [[-w, -d, w, -d], [w, -d, w, d], [w, d, -w, d], [-w, d, -w, -d]]) {
    const n = V(ax + bx2, 0, az + bz);
    L.push([V(ax / 2, 0, az / 2), V(bx2 / 2, 0, bz / 2), V(bx2 / 2, h, bz / 2), n], [V(ax / 2, 0, az / 2), V(bx2 / 2, h, bz / 2), V(ax / 2, h, az / 2), n]);
  }
  b.add(tris(L), STONE_D, { p: [x, 0, z], ...F });
}

// --- pans de bois -------------------------------------------------------------------------------
// repère d'une face : x le long de la face, y vers le haut, z vers l'extérieur, mur en z = 0
// planche plaquée de (x1, y1) à (x2, y2), largeur w, saillie d
function planche(f, col, x1, y1, x2, y2, w = 0.12, d = 0.06) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  f.add(prisme(plaque(w, d), len, true), col, { p: [(x1 + x2) / 2, (y1 + y2) / 2, 0], r: [0, 0, Math.atan2(-(x2 - x1), y2 - y1)], ...F });
}
// baie vitrée encadrée : vitre, cadre, croisillon et appui (sauf version allégée)
function fenetre(f, x, yc, w, h, o) {
  f.add(new THREE.PlaneGeometry(w - 0.1, h - 0.1), VITRE, { p: [x, yc, 0.012], id: o.idMur, ...F });
  f.add(cadre(w, h, 0.08, 0.075, o.leger), POUTRE, { p: [x, yc, 0], ...F });
  if (o.leger) return;
  f.add(prisme(plaque(0.045, 0.035), h - 0.12, true), POUTRE, { p: [x, yc, 0.012], ...F });
  f.add(prisme(plaque(0.045, 0.035), w - 0.12, true), POUTRE, { p: [x, yc + h * 0.12, 0.012], r: [0, 0, Math.PI / 2], ...F });
  f.add(prisme(rect(0.07, 0.13), w + 0.16), POUTRE_F, { p: [x, yc - h / 2 - 0.035, 0.065], r: [0, 0, Math.PI / 2], ...F });
}
// porte de planches encadrée, seuil à yb
function porte(f, x, yb, w, h, o) {
  f.add(prisme(rect(w - 0.12, 0.04), h - 0.06), PORTE, { p: [x, yb + h / 2 - 0.03, 0.02], id: o.idMur, ...F });
  f.add(cadre(w, h, 0.09, 0.08, o.leger), POUTRE, { p: [x, yb + h / 2, 0], ...F });
  if (o.leger) return;
  for (const dx of [-w / 6, w / 6]) f.add(prisme(plaque(0.035, 0.02), h - 0.2, true), POUTRE_F, { p: [x + dx, yb + h / 2 - 0.05, 0.04], id: o.idMur, ...F });
}
// pan de bois d'une face de longueur L entre y0 et y1 : sablière basse, poteaux qui encadrent les baies,
// décharges dans les travées libres (sens alterné), baies : [{ x, w, h, yc }] ou [{ x, w, h, yb, porte }]
function panDeBois(f, L, y0, y1, baies, o) {
  const xa = L / 2 - 0.11;
  const ya = y0 + 0.12;
  const yb = y1 - 0.03;
  if (!o.leger) planche(f, POUTRE, -xa - 0.02, y0 + 0.06, xa + 0.02, y0 + 0.06, 0.11, 0.055);
  const bords = [-xa, xa];
  const pleins = [];
  for (const b of baies) {
    const xp = b.w / 2 + 0.08;
    for (const sx of [-1, 1]) planche(f, POUTRE, b.x + sx * xp, ya - 0.06, b.x + sx * xp, yb, 0.12, 0.06);
    bords.push(b.x - xp, b.x + xp);
    pleins.push([b.x - xp, b.x + xp]);
    if (b.porte) porte(f, b.x, b.yb, b.w, b.h, o);
    else fenetre(f, b.x, b.yc, b.w, b.h, o);
  }
  bords.sort((a, b) => a - b);
  let k = o.sens ?? 0;
  for (let i = 0; i + 1 < bords.length; i++) {
    const [a, b] = [bords[i] + 0.04, bords[i + 1] - 0.04];
    if (b - a < 0.3 || pleins.some(([p, q]) => a > p - 0.01 && b < q + 0.01)) continue;
    // décharge : de bas en haut vers la baie (en Λ de part et d'autre), sinon en sens alterné
    const versBaie = baies.length ? (Math.abs(b) < Math.abs(a) ? 1 : -1) : k++ % 2 ? 1 : -1;
    if (versBaie > 0) planche(f, POUTRE, a, ya, b, yb, 0.11, 0.05);
    else planche(f, POUTRE, b, ya, a, yb, 0.11, 0.05);
  }
}
// une face du repère local ajoutée au bâti, tournée de a autour de Y et posée à (x, z)
function poser(b, f, a, x, z) {
  b.addBuilt(f.build(), { p: [x, 0, z], r: [0, a, 0] });
}
// poteau d'angle (section chanfreinée, ou carrée en version allégée)
function poteau(b, x, z, y0, y1, w, o) {
  b.add(prisme(o.leger ? rect(w, w) : octo(w, w, w * 0.25), y1 - y0), POUTRE_F, { p: [x, (y0 + y1) / 2, z], id: o.idBois, ...F });
}

// --- la tour ------------------------------------------------------------------------------------
// étages : bas, haut, côté ; baies de chaque face (0 : +Z, 1 : +X, 2 : −Z, 3 : −X) ; null : face cachée
const W = (w, h, yc) => [{ x: 0, w, h, yc }];
const ETAGES = [
  { y0: 0.45, y1: 2.45, s: 2.8, faces: [[{ x: 0, w: 0.95, h: 1.62, yb: 0.47, porte: true }], null, W(0.6, 0.75, 1.55), W(0.6, 0.75, 1.55)] },
  { y0: 2.45, y1: 4.35, s: 2.56, faces: [W(0.62, 0.8, 3.45), W(0.6, 0.66, 3.85), W(0.62, 0.8, 3.45), W(0.62, 0.8, 3.45)] },
  { y0: 4.35, y1: 6.05, s: 2.32, faces: [W(0.56, 0.74, 5.22), W(0.56, 0.74, 5.22), W(0.56, 0.74, 5.22), W(0.56, 0.74, 5.22)] },
  { y0: 6.05, y1: 7.55, s: 2.1, faces: [W(0.5, 0.66, 6.8), W(0.5, 0.66, 6.8), W(0.5, 0.66, 6.8), W(0.5, 0.66, 6.8)] },
  { y0: 7.55, y1: 9.0, s: 1.92, faces: [[{ x: 0, w: 0.62, h: 1.12, yb: 7.64, porte: true }], W(0.46, 0.6, 8.3), W(0.46, 0.6, 8.3), W(0.46, 0.6, 8.3)] },
];
const GALERIE = { y: 7.55, demi: 1.6, haut: 0.78 };
const MOYEU = [0, 11.2, 2.05];

function tour(b, o) {
  socle(b, 3.0, 3.0, 0.45, 0, 0, o.leger);
  ETAGES.forEach((e, i) => {
    const h = e.y1 - e.y0;
    b.add(prisme(rect(e.s, e.s), h), ENDUIT, { p: [0, (e.y0 + e.y1) / 2, 0], ...F });
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) poteau(b, (sx * e.s) / 2, (sz * e.s) / 2, e.y0, e.y1, 0.22, o);
    e.faces.forEach((baies, k) => {
      if (!baies) return;
      const f = new Builder(o.idBois);
      panDeBois(f, e.s, e.y0, e.y1, baies, { ...o, sens: i + k });
      const a = (k * Math.PI) / 2;
      poser(b, f, a, (Math.sin(a) * e.s) / 2, (Math.cos(a) * e.s) / 2);
    });
    // sablière haute en encorbellement (plancher de l'étage suivant), sauf sous la galerie
    if (e.y1 !== GALERIE.y) b.add(prisme(octo(e.s + 0.22, e.s + 0.22, 0.08), 0.16), POUTRE_F, { p: [0, e.y1 + 0.02, 0], id: o.idBois, ...F });
  });
}

// galerie à garde-corps autour du dernier étage : plancher, consoles, lisses, montants et croix
function galerie(b, o) {
  const { y, demi, haut } = GALERIE;
  b.add(prisme(octo(2 * demi + 0.1, 2 * demi + 0.1, 0.1), 0.14), POUTRE_F, { p: [0, y, 0], id: o.idBois, ...F });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.add(prisme(rect(0.1, 0.1), haut + 0.06), POUTRE, { p: [sx * demi, y + 0.07 + haut / 2, sz * demi], id: o.idBois, ...F });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const f = new Builder(o.idBois);
    for (const yy of o.leger ? [haut] : [0.14, haut]) f.add(prisme(rect(0.07, 0.08), 2 * demi), POUTRE, { p: [0, y + 0.07 + yy, 0], r: [0, 0, Math.PI / 2], ...F });
    if (!o.leger) {
      f.add(prisme(rect(0.07, 0.07), haut - 0.14), POUTRE, { p: [0, y + 0.07 + (haut + 0.14) / 2, 0], ...F });
      // croix : une décharge par demi-travée, en V
      for (const sx of [-1, 1]) {
        const x1 = sx * 0.06;
        const x2 = sx * (demi - 0.06);
        const len = Math.hypot(x2 - x1, haut - 0.2);
        f.add(prisme(rect(0.06, 0.05), len), POUTRE, { p: [(x1 + x2) / 2, y + 0.07 + (0.14 + haut) / 2, 0], r: [0, 0, Math.atan2(-(x2 - x1), haut - 0.2)], ...F });
      }
      // consoles sous le plancher, du mur de l'étage inférieur au bord de la galerie
      const zm = ETAGES[3].s / 2;
      for (const sx of [-0.7, 0.7]) {
        const [z1, y1, z2, y2] = [zm, y - 0.75, demi - 0.25, y - 0.07];
        f.add(prisme(rect(0.09, 0.09), Math.hypot(z2 - z1, y2 - y1)), POUTRE_F, { p: [sx, (y1 + y2) / 2, (z1 + z2) / 2 - demi], r: [Math.atan2(z2 - z1, y2 - y1), 0, 0], ...F });
      }
    }
    poser(b, f, a, Math.sin(a) * demi, Math.cos(a) * demi);
  }
}

// chapeau, cou et tête : la tête de bois déborde à l'avant (+Z, côté ailes) et à l'arrière
const TETE = { y0: 10.42, y1: 11.45, faite: 11.97, demi: 0.82, av: 1.65, ar: -1.75 };
function tete(b, o) {
  b.add(tronc(2.42, 1.5, 0.48), BOIS_TOIT, { p: [0, 9.08, 0], id: o.idBois, ...F });
  b.add(prisme(rect(1.3, 1.3), 1.0), ENDUIT, { p: [0, 9.92, 0], ...F });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) poteau(b, sx * 0.65, sz * 0.65, 9.4, 10.42, 0.16, o);
  if (!o.leger) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const f = new Builder(o.idBois);
      planche(f, POUTRE, -0.5, 9.62, 0.5, 9.62, 0.1, 0.05);
      planche(f, POUTRE, -0.48, 9.66, 0.48, 10.32, 0.1, 0.045);
      poser(b, f, a, Math.sin(a) * 0.65, Math.cos(a) * 0.65);
    }
  }
  const { y0, y1, faite, demi, av, ar } = TETE;
  const lg = av - ar;
  const zc = (av + ar) / 2;
  b.add(prisme(octo(2 * demi + 0.14, lg + 0.14, 0.05), 0.12), POUTRE_F, { p: [0, y0 + 0.02, zc], id: o.idBois, ...F });
  b.add(prisme(rect(2 * demi, lg), y1 - y0), ENDUIT, { p: [0, (y0 + y1) / 2, zc], ...F });
  for (const sx of [-1, 1]) for (const z of [ar, av]) poteau(b, sx * demi, z, y0, y1, 0.15, o);
  b.add(prisme(octo(2 * demi + 0.12, lg + 0.12, 0.04), 0.1), POUTRE_F, { p: [0, y1, zc], id: o.idBois, ...F });
  // flancs (±X) : deux poteaux, une fenêtre au milieu, décharges vers l'avant et l'arrière
  for (const sx of [-1, 1]) {
    const f = new Builder(o.idBois);
    panDeBois(f, lg, y0 + 0.06, y1 - 0.04, [{ x: 0, w: 0.46, h: 0.44, yc: (y0 + y1) / 2 + 0.04 }], { ...o, leger: true });
    poser(b, f, (sx * Math.PI) / 2, sx * demi, zc);
  }
  // arrière : petite fenêtre ; avant : le palier de l'arbre des ailes
  const fa = new Builder(o.idBois);
  panDeBois(fa, 2 * demi, y0 + 0.06, y1 - 0.04, [{ x: 0, w: 0.4, h: 0.4, yc: (y0 + y1) / 2 + 0.04 }], { ...o, leger: true });
  poser(b, fa, Math.PI, 0, ar);
  b.add(G.cyl(0.26, 0.3, 0.1, 12), POUTRE_F, { p: [0, MOYEU[1], av + 0.05], r: [Math.PI / 2, 0, 0], id: o.idBois, ...F });
  b.add(G.cyl(0.13, 0.13, MOYEU[2] - av + 0.1, 10), POUTRE_F, { p: [0, MOYEU[1], (av + MOYEU[2]) / 2], r: [Math.PI / 2, 0, 0], id: o.idBois, ...F });
  // petit toit à deux pans (faîtage le long de Z), qui déborde devant et derrière ; pignons crème
  const ev = demi + 0.24;
  const ang = Math.atan2(faite - y1, ev);
  const w = Math.hypot(ev, faite - y1) + 0.06;
  for (const sx of [-1, 1]) b.add(panZ(w, 0.09, lg + 0.5), BOIS_TOIT, { p: [(sx * ev) / 2, (y1 + faite) / 2 + 0.06, zc], r: [0, 0, -sx * ang], id: o.idBois, ...F });
  for (const z of [ar, av]) b.add(pignonZ(2 * demi, faite - y1 - 0.02, 0.08), ENDUIT, { p: [0, y1 + 0.03, z], ...F });
  b.add(prisme(octo(0.14, 0.14, 0.04), lg + 0.56).clone().rotateX(Math.PI / 2), POUTRE_F, { p: [0, faite + 0.08, zc], id: o.idBois, ...F });
}

// ailes : six bras à 60°, longeron brun, toile crème sur un lattis (lattes en façade), bord de rive
const R_AILE = 4.1;
function ailes(o) {
  const s = new Builder(o.idBois);
  s.add(G.cyl(0.3, 0.3, 0.26, 12), POUTRE_F, { p: [0, 0, 0.13], r: [Math.PI / 2, 0, 0], ...F });
  s.add(G.cone(0.17, 0.2, 12), POUTRE, { p: [0, 0, 0.36], r: [Math.PI / 2, 0, 0], ...F });
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 2;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    const [vx, vy] = [-uy, ux];
    const rot = [0, 0, a - Math.PI / 2];
    const at = (r, v, z) => [ux * r + vx * v, uy * r + vy * v, z];
    s.add(prisme(o.leger ? rect(0.12, 0.1) : octo(0.12, 0.1, 0.03), R_AILE - 0.1), POUTRE, { p: at(R_AILE / 2 + 0.05, 0, 0.17), r: rot, ...F });
    s.add(prisme(rect(0.6, 0.025), 3.1), k % 2 ? TOILE : TOILE_B, { p: at(2.5, 0.36, 0.1), r: rot, ...F });
    if (o.leger) continue;
    s.add(prisme(rect(0.05, 0.05), 3.14), POUTRE, { p: at(2.5, 0.66, 0.11), r: rot, ...F });
    for (let j = 0; j < 7; j++) s.add(prisme(plaque(0.045, 0.03), 0.62, true), POUTRE, { p: at(1.0 + j * 0.5, 0.36, 0.1125), r: [0, 0, a], ...F });
  }
  return s;
}

// auvent de la porte (face +Z) : deux pans de bois sur consoles
function auvent(b, o) {
  const z0 = ETAGES[0].s / 2;
  const [y, ev, faite] = [2.12, 0.78, 2.5];
  const ang = Math.atan2(faite - y, ev);
  for (const sx of [-1, 1]) b.add(panZ(Math.hypot(ev, faite - y) + 0.05, 0.08, 0.86), BOIS_TOIT, { p: [(sx * ev) / 2, (y + faite) / 2 + 0.04, z0 + 0.4], r: [0, 0, -sx * ang], id: o.idBois, ...F });
  b.add(pignonZ(1.3, faite - y - 0.02, 0.06), ENDUIT, { p: [0, y + 0.02, z0 + 0.8], ...F });
  if (o.leger) return;
  // consoles : du mur (z0, 1,65 m) au-dessous du pan (z0 + 0,55, 2,15 m)
  const [dz, dy] = [0.53, 0.5];
  for (const sx of [-1, 1]) b.add(prisme(rect(0.08, 0.08), Math.hypot(dz, dy)), POUTRE_F, { p: [sx * 0.6, 1.65 + dy / 2, z0 + 0.02 + dz / 2], r: [Math.atan2(dz, dy), 0, 0], id: o.idBois, ...F });
}

// --- annexes ------------------------------------------------------------------------------------
// aile basse à colombages accolée à la face +X : x 1,3 à 4,0 ; z −1,45 à 1,45 ; toit de mousse à deux
// pans, faîtage le long de X, pignon sur +X
const ANNEXE = { x0: 1.3, x1: 4.0, demi: 1.45, y0: 0.25, y1: 2.35, faite: 3.18 };
function toitMousse(b, x0, x1, zc, demi, y1, faite, o) {
  const ev = demi + 0.32;
  const ang = Math.atan2(faite - y1, ev);
  const w = Math.hypot(ev, faite - y1) + 0.1;
  const L = x1 - x0 + 0.5;
  for (const sz of [-1, 1]) b.add(panX(w, 0.22, L), sz > 0 ? MOUSSE : MOUSSE_C, { p: [(x0 + x1) / 2, (y1 + faite) / 2 + 0.1, zc + (sz * ev) / 2], r: [sz * ang, 0, 0], id: o.idToit, ...F });
  b.add(prisme(octo(0.3, 0.3, 0.1), L - 0.1).clone().rotateZ(Math.PI / 2), MOUSSE, { p: [(x0 + x1) / 2, faite + 0.17, zc], id: o.idToit, ...F });
}
function annexe(b, o) {
  const { x0, x1, demi, y0, y1, faite } = ANNEXE;
  const xc = (x0 + x1) / 2;
  const lx = x1 - x0;
  socle(b, lx + 0.12, 2 * demi + 0.12, y0, xc, 0, o.leger);
  b.add(prisme(rect(lx, 2 * demi), y1 - y0), ENDUIT, { p: [xc, (y0 + y1) / 2, 0], ...F });
  for (const sz of [-1, 1]) for (const x of [x0 + 0.15, x1]) poteau(b, x, sz * demi, y0, y1, 0.2, o);
  b.add(prisme(octo(lx + 0.2, 2 * demi + 0.2, 0.06), 0.13), POUTRE_F, { p: [xc, y1, 0], id: o.idBois, ...F });
  // façade +Z : porte et fenêtre ; dos −Z : deux fenêtres ; pignon +X : fenêtre
  const fz = new Builder(o.idBois);
  panDeBois(fz, lx, y0, y1, [{ x: -0.55, w: 0.56, h: 0.66, yc: 1.45 }, { x: 0.62, w: 0.78, h: 1.5, yb: y0 + 0.02, porte: true }], { ...o, sens: 1 });
  poser(b, fz, 0, xc, demi);
  const fd = new Builder(o.idBois);
  panDeBois(fd, lx, y0, y1, [{ x: -0.6, w: 0.5, h: 0.62, yc: 1.45 }, { x: 0.6, w: 0.5, h: 0.62, yc: 1.45 }], o);
  poser(b, fd, Math.PI, xc, -demi);
  const fx = new Builder(o.idBois);
  panDeBois(fx, 2 * demi, y0, y1, [{ x: 0, w: 0.56, h: 0.66, yc: 1.45 }], o);
  poser(b, fx, Math.PI / 2, x1, 0);
  b.add(pignonX(2 * demi + 0.1, faite - y1, 0.1), ENDUIT, { p: [x1 - 0.02, y1 + 0.06, 0], ...F });
  if (!o.leger) {
    const fp = new Builder(o.idBois);
    planche(fp, POUTRE, 0, y1 + 0.1, 0, faite - 0.02, 0.11, 0.05);
    for (const sx of [-1, 1]) planche(fp, POUTRE, sx * 0.05, y1 + 0.45, sx * 0.9, y1 + 0.12, 0.09, 0.045);
    poser(b, fp, Math.PI / 2, x1 + 0.03, 0);
  }
  toitMousse(b, x0, x1, 0, demi, y1 + 0.05, faite, o);
}

// maisonnette percée d'une arche : passage voûté le long de X, 2 × PASSAGE libres entre les piédroits
const MAISON = { demiX: 1.2, mur: 0.7, naissance: 1.2, y1: 2.75, faite: 3.62 };
function maisonnette(b, o) {
  const [cx, cz] = MAISONNETTE;
  const { demiX, mur, naissance, y1, faite } = MAISON;
  const r = PASSAGE + 0.03;
  const demi = r + mur;
  for (const sz of [-1, 1]) {
    const zc = cz + sz * (r + mur / 2);
    socle(b, 2 * demiX + 0.12, mur + 0.12, 0.2, cx, zc, o.leger);
    b.add(prisme(rect(2 * demiX, mur), y1 - 0.2), ENDUIT, { p: [cx, 0.2 + (y1 - 0.2) / 2, zc], ...F });
    for (const x of [cx - demiX, cx + demiX]) poteau(b, x, cz + sz * demi, 0.2, y1, 0.2, o);
  }
  b.add(voute(r, naissance, y1, 2 * demiX, o.leger ? 6 : 10), ENDUIT, { p: [cx - demiX, 0, cz], ...F });
  // aux deux bouts : archivolte, piédroits, entrait, pignon et poinçon
  for (const sx of [-1, 1]) {
    const x = cx + sx * demiX;
    b.add(archivolte(r, r + 0.14, 0.1, o.leger ? 6 : 9), POUTRE, { p: [x + sx * 0.03, naissance, cz], r: [0, Math.PI / 2, 0], id: o.idBois, ...F });
    const f = new Builder(o.idBois);
    for (const s of [-1, 1]) planche(f, POUTRE, s * (r + 0.07), 0.2, s * (r + 0.07), naissance + 0.02, 0.14, 0.06);
    planche(f, POUTRE_F, -demi - 0.05, y1 - 0.04, demi + 0.05, y1 - 0.04, 0.14, 0.07);
    if (!o.leger) planche(f, POUTRE, 0, y1 + 0.02, 0, faite - 0.05, 0.1, 0.05);
    poser(b, f, (sx * Math.PI) / 2, x, cz);
    b.add(pignonX(2 * demi + 0.1, faite - y1, 0.1), ENDUIT, { p: [x - sx * 0.04, y1, cz], ...F });
  }
  // longs pans (±Z) : une fenêtre chacun
  for (const sz of [-1, 1]) {
    const f = new Builder(o.idBois);
    panDeBois(f, 2 * demiX, 0.2, y1, [{ x: 0, w: 0.5, h: 0.6, yc: 1.5 }], o);
    poser(b, f, sz > 0 ? 0 : Math.PI, cx, cz + sz * demi);
  }
  b.add(prisme(octo(2 * demiX + 0.18, 2 * demi + 0.18, 0.06), 0.12), POUTRE_F, { p: [cx, y1, cz], id: o.idBois, ...F });
  toitMousse(b, cx - demiX, cx + demiX, cz, demi, y1 + 0.04, faite, o);
}

// --- assemblage ---------------------------------------------------------------------------------
export function moulinTour(p) {
  const b = new Builder();
  const o = { leger: p.v === 1, idMur: b.defaultId, idBois: nextId(), idToit: nextId() };
  tour(b, o);
  galerie(b, o);
  tete(b, o);
  auvent(b, o);
  annexe(b, o);
  maisonnette(b, o);
  return { solid: b, anim: [{ builder: ailes(o), pivot: [...MOYEU], axis: 'z', speed: 0.7, wind: true }], obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-013', 'moulin-tour', 'Moulin-tour du plateau', part('moulin_tour'), {
  variants: [{ label: 'De près', params: { v: 0 } }, { label: 'Allégé (au loin)', params: { v: 1 } }],
  // budget accordé par l'utilisateur le 26/10/2026 (TASK-ILE-VERTE-010) : 8 000 de près, 4 000 allégé
  budget: { triangles: 8000, lod: 4000 },
  tags: ['plateau', 'animé'],
});
