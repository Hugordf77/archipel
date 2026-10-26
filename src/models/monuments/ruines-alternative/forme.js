// Nef effondrée du plateau (MON-014) : les formes de pierre. Reprises des éléments modulaires des ruines
// (MON-013, ruines-modules/forme.js, encore non commités quand ce modèle a été créé) pour garder le même
// style de pierre ; à fusionner avec eux une fois MON-013 commité. Ajouts propres à la nef : arc brisé
// partiel (claveaux d'un côté seulement), colonne brisée, tambour de colonne tombé, touffe de fougère.
// Blocs irréguliers aux arêtes adoucies (hexaèdre chanfreiné : faces planes, chanfreins aux normales
// fondues, un identifiant de contour par bloc pour le trait d'encre aux joints).
// Repère des éléments : pied à y = 0, mur le long de X, face avant vers +Z.
// Contexte o : { rand (hasard reproductible), leger (version allégée : blocs sans chanfrein, moins de
// feuilles) }.
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';

// palette de la planche de l'utilisateur : gris pierre et crème (blocs), vert clair et vert mousse
// (mousse, lierre, fougères) ; aucun noir
export const PIERRES = ['#ddcfb8', '#d4c8b1', '#c9c3b6', '#b9b7af'];
export const MOUSSE = '#aab35c';
export const MOUSSE_F = '#7f9b55';
export const FEUILLES = ['#6d8e4e', '#7e9c56', '#93ad5f'];
const F = { tint: 0 };

// --- hexaèdre chanfreiné -------------------------------------------------------------------
// coins[k], k = ix + 2 iy + 4 iz (bits 0 : côté −, 1 : côté +, en X, Y, Z) ; e : chanfrein (m) ;
// leger : six faces seulement (12 triangles au lieu de 44) ; plat : dessous sans chanfrein (bloc posé).
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const autres = (a) => [0, 1, 2].filter((x) => x !== a);
export function hexa(coins, e = 0.06, leger = false, plat = false) {
  const C = coins.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p)));
  const ctr = C.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / 8);
  // chanfrein borné par la plus courte arête
  let court = Infinity;
  for (let k = 0; k < 8; k++) for (let a = 0; a < 3; a++) if (!(k & (1 << a))) court = Math.min(court, C[k].distanceTo(C[k | (1 << a)]));
  const ch = Math.min(e, court * 0.3);
  // P[k][a] : point du coin k sur la face perpendiculaire à l'axe a
  const P = C.map((c, k) => [0, 1, 2].map((a) => {
    if (leger || (plat && !(k & 2))) return c.clone();
    const p = c.clone();
    for (const b of autres(a)) p.add(_a.subVectors(C[k ^ (1 << b)], c).normalize().multiplyScalar(ch));
    return p;
  }));
  const coinsFace = (a, s) => {
    const [b, c] = autres(a);
    return [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => (s << a) | (u << b) | (v << c));
  };
  // normales des faces (méthode de Newell), tournées vers l'extérieur
  const N = {};
  for (let a = 0; a < 3; a++) for (let s = 0; s < 2; s++) {
    const pts = coinsFace(a, s).map((k) => P[k][a]);
    const n = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % 4];
      n.x += (p.y - q.y) * (p.z + q.z);
      n.y += (p.z - q.z) * (p.x + q.x);
      n.z += (p.x - q.x) * (p.y + q.y);
    }
    n.normalize();
    const m = pts.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(0.25).sub(ctr);
    if (n.dot(m) < 0) n.negate();
    N[`${a}${s}`] = n;
  }
  const pos = [];
  const nor = [];
  // triangle tourné vers l'extérieur (le bloc est convexe autour de son centre)
  const tri = (p1, n1, p2, n2, p3, n3) => {
    _a.subVectors(p2, p1);
    _b.subVectors(p3, p1);
    _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-12) return; // triangle plat (coin non chanfreiné)
    const m = _a.copy(p1).add(p2).add(p3).multiplyScalar(1 / 3).sub(ctr);
    if (_n.dot(m) < 0) [p2, n2, p3, n3] = [p3, n3, p2, n2];
    for (const [p, n] of [[p1, n1], [p2, n2], [p3, n3]]) {
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
    }
  };
  const quad = (v) => {
    tri(v[0][0], v[0][1], v[1][0], v[1][1], v[2][0], v[2][1]);
    tri(v[0][0], v[0][1], v[2][0], v[2][1], v[3][0], v[3][1]);
  };
  const bit = (k, a) => (k >> a) & 1;
  for (let a = 0; a < 3; a++) for (let s = 0; s < 2; s++) quad(coinsFace(a, s).map((k) => [P[k][a], N[`${a}${s}`]]));
  if (!leger) {
    // chanfreins : arête le long de l'axe c, entre les faces a et b
    for (let c = 0; c < 3; c++) {
      const [a, b] = autres(c);
      for (let sa = 0; sa < 2; sa++) for (let sb = 0; sb < 2; sb++) {
        const k0 = (sa << a) | (sb << b);
        const k1 = k0 | (1 << c);
        const na = N[`${a}${sa}`];
        const nb = N[`${b}${sb}`];
        quad([[P[k0][a], na], [P[k1][a], na], [P[k1][b], nb], [P[k0][b], nb]]);
      }
    }
    for (let k = 0; k < 8; k++) tri(P[k][0], N[`0${bit(k, 0)}`], P[k][1], N[`1${bit(k, 1)}`], P[k][2], N[`2${bit(k, 2)}`]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

// coins d'une boîte L × H × D centrée à l'origine, chaque coin déplacé d'au plus jit (m) ; retrait :
// le dessus rentre de cette part (usure) ; casse : le dessus penche (m d'écart d'un bout à l'autre)
export function coinsBoite(L, H, D, rand, { jit = 0.025, retrait = 0, casse = 0 } = {}) {
  const out = [];
  const pente = (rand() - 0.5) * 2 * casse;
  for (let k = 0; k < 8; k++) {
    const sx = k & 1 ? 1 : -1;
    const sy = k & 2 ? 1 : -1;
    const sz = k & 4 ? 1 : -1;
    const r = sy > 0 ? 1 - retrait : 1;
    out.push([
      sx * (L / 2) * r + (rand() - 0.5) * 2 * jit,
      sy * (H / 2) + (rand() - 0.5) * 2 * jit + (sy > 0 ? sx * pente * 0.5 - Math.abs(pente) * 0.5 : 0),
      sz * (D / 2) * r + (rand() - 0.5) * 2 * jit,
    ]);
  }
  return out;
}

// sommet en gradins de ruine : [[x jusqu'où, hauteur], …] (la dernière hauteur vaut jusqu'au bout) ;
// les x des marches (coupes) forcent un joint dans pan(), pour qu'aucun bloc ne surplombe le vide
export function gradins(marches) {
  const h = (x) => (marches.find(([xa]) => x < xa) || marches[marches.length - 1])[1];
  h.coupes = marches.slice(0, -1).map(([xa]) => xa);
  return h;
}

export const teinte = (o) => PIERRES[Math.floor(o.rand() * PIERRES.length)];
const chanfrein = (L, H, D) => Math.min(0.075, Math.min(L, H, D) * 0.16);

// bloc posé : centre c, tailles, rotation r, couleur (au hasard dans la planche sinon)
export function bloc(b, o, { c, L, H, D, r = [0, 0, 0], couleur = teinte(o), jit, retrait = 0, casse = 0, plat = false, e }) {
  const coins = coinsBoite(L, H, D, o.rand, { jit: jit ?? Math.min(0.03, Math.min(L, H, D) * 0.06), retrait, casse });
  b.add(hexa(coins, e ?? chanfrein(L, H, D), o.leger, plat), couleur, { p: c, r, id: nextId(), ...F });
}
// bloc de forme libre (claveau) : huit coins déjà placés
export function blocLibre(b, o, coins, couleur = teinte(o), e = 0.06, plat = false) {
  b.add(hexa(coins, e, o.leger, plat), couleur, { id: nextId(), ...F });
}

// --- pans de mur ---------------------------------------------------------------------------
// Pan de mur en assises de blocs le long de X, de x0 à x1, du niveau y0 au sommet haut(x) (gradins de
// ruine) ; blocs traversants d'épaisseur ep, centrés sur z. trous : vides { xc, y0, y1, demi(y) } (les
// bouts des blocs qui les bordent suivent leur courbe en biseau). long : longueurs des blocs ; longBas :
// celles des assises qui commencent sous 1,8 m. Un joint tombe sur chaque marche des gradins
// (haut.coupes) que l'assise dépasse d'un côté. Renvoie les sommets (dessus des blocs les plus hauts) :
// { x0, x1, y, z, D }.
export function pan(b, o, { x0, x1, y0 = 0, z = 0, ep = 0.9, assise = 0.55, haut = () => Infinity, trous = [], long = [0.8, 1.25], longBas = long, usure = true, e = 0.075, jit = 0.022 }) {
  const { rand } = o;
  let ymax = -Infinity;
  for (let i = 0; i <= 60; i++) ymax = Math.max(ymax, haut(x0 + ((x1 - x0) * i) / 60));
  const assises = [];
  for (let k = 0; y0 + k * assise < ymax - 0.12; k++) {
    const yb = y0 + k * assise;
    const yt = yb + assise;
    // tronçons [gauche, droite], bouts { b : x au bas, t : x au haut }
    let tr = [[{ b: x0, t: x0 }, { b: x1, t: x1 }]];
    for (const t of trous) {
      if (yt <= t.y0 + 1e-6 || yb >= t.y1 - 1e-6) continue;
      const hb = t.demi(Math.max(yb, t.y0) + 1e-6);
      const ht = yt >= t.y1 ? 0 : t.demi(yt - 1e-6);
      const neuf = [];
      for (const [g, d] of tr) {
        if (t.xc - hb < g.b || t.xc + hb > d.b) { neuf.push([g, d]); continue; }
        neuf.push([g, { b: t.xc - hb, t: t.xc - ht }], [{ b: t.xc + hb, t: t.xc + ht }, d]);
      }
      tr = neuf;
    }
    const blocs = [];
    const lg = yb < 1.8 ? longBas : long;
    for (const [g, d] of tr) {
      const gm = (g.b + g.t) / 2;
      const dm = (d.b + d.t) / 2;
      if (Math.min(d.b - g.b, d.t - g.t) < 0.12) continue;
      // joints décalés d'une assise à l'autre
      // marches des gradins où l'assise s'arrête d'un côté seulement
      const coupes = (haut.coupes || []).filter((xc) => {
        const [hg, hd] = [haut(xc - 0.01), haut(xc + 0.01)];
        return xc > gm + 0.25 && xc < dm - 0.25 && Math.min(hg, hd) < yt - 0.12 && Math.max(hg, hd) >= yb + 0.22;
      });
      const xs = [gm];
      let x = gm + (k % 2 ? 0.55 : 1) * (lg[0] + rand() * (lg[1] - lg[0]));
      while (x < dm - Math.min(0.42, lg[0] * 0.6)) {
        const c = coupes.find((xc) => xc > xs[xs.length - 1] + 0.2 && xc < x + 0.2);
        if (c !== undefined) x = c;
        xs.push(x);
        x += lg[0] + rand() * (lg[1] - lg[0]);
      }
      // une marche au-delà du dernier joint tiré
      for (const c of coupes) if (c > xs[xs.length - 1] + 0.2 && c < dm - 0.2) xs.push(c);
      xs.push(dm);
      for (let i = 0; i + 1 < xs.length; i++) {
        const gb = i === 0 ? g.b : xs[i];
        const gt = i === 0 ? g.t : xs[i];
        const db = i + 2 === xs.length ? d.b : xs[i + 1];
        const dt = i + 2 === xs.length ? d.t : xs[i + 1];
        const xm = (xs[i] + xs[i + 1]) / 2;
        const h = haut(xm);
        if (h < yb + 0.22) continue;
        const casse = h < yt - 0.12;
        blocs.push({ gb, gt, db, dt, xm, yb, yt: casse ? h : yt, casse });
      }
    }
    assises.push(blocs);
  }
  const sommets = [];
  assises.forEach((blocs, k) => {
    for (const q of blocs) {
      const D = ep * (0.96 + rand() * 0.07);
      const zc = z + (rand() - 0.5) * 0.06;
      const j = () => (rand() - 0.5) * 2 * jit;
      const dessus = !(assises[k + 1] || []).some((u) => u.gb < q.db - 0.1 && u.db > q.gb + 0.1);
      // dessus usé : coins du haut abaissés au hasard
      const use = () => (dessus && usure ? -rand() * 0.07 : 0);
      const coins = [];
      for (let n = 0; n < 8; n++) {
        const sx = n & 1;
        const sy = (n >> 1) & 1;
        const sz = (n >> 2) & 1;
        const x = sx ? (sy ? q.dt : q.db) : (sy ? q.gt : q.gb);
        const y = sy ? q.yt + use() : q.yb;
        coins.push([x + j(), y + j() * 0.6, zc + (sz ? D / 2 : -D / 2) + j()]);
      }
      blocLibre(b, o, coins, teinte(o), Math.min(e, chanfrein(q.db - q.gb, q.yt - q.yb, D)), true);
      if (dessus) sommets.push({ x0: Math.min(q.gb, q.gt), x1: Math.max(q.db, q.dt), y: q.yt, z: zc, D });
    }
  });
  return { sommets };
}

// --- baies ogivales ------------------------------------------------------------------------
// arc brisé : deux arcs de rayon R dont les centres sont à R − w de l'axe xc ; naissance à ys,
// demi-ouverture w, claveaux d'épaisseur t. Renvoie la clé, le sommet de l'extrados et demi(y),
// demi-largeur du vide (ouverture puis extrados) pour pan().
export function profilOgive({ xc = 0, ys, w, R, t }) {
  const k = R - w;
  const cle = ys + Math.sqrt(R * R - k * k);
  const sommet = ys + Math.sqrt((R + t) * (R + t) - k * k);
  const demiExt = (y) => (y < ys ? w : Math.max(0, (R + t) * Math.cos(Math.asin(Math.min(1, (y - ys) / (R + t)))) - k));
  return { xc, ys, w, R, t, k, cle, sommet, demiExt };
}

// claveaux de l'arc, n par côté, sur la profondeur ep (centrée sur z), saillants de s à l'avant ;
// garde : nombre de claveaux restants de chaque côté, en partant de la naissance ([gauche, droite]),
// pour un arc effondré
export function claveaux(b, o, arc, { z = 0, ep = 0.9, n = 5, s = 0.05, garde = [n, n] }) {
  const { xc, ys, R, t, k } = arc;
  const ai = Math.acos(k / R);
  const ae = Math.acos(k / (R + t));
  [-1, 1].forEach((sx, c) => {
    for (let i = 0; i < Math.min(n, garde[c]); i++) {
      const coins = [];
      for (let q = 0; q < 8; q++) {
        const j = i + (q & 1);
        const ext = 1 - ((q >> 1) & 1); // extrados en bit 0 : sans chanfrein (contre le mur)
        const av = (q >> 2) & 1;
        const a = ((ext ? ae : ai) * j) / n;
        const r = ext ? R + t : R;
        coins.push([xc + sx * (r * Math.cos(a) - k), ys + r * Math.sin(a), av ? z + ep / 2 + s : z - ep / 2]);
      }
      blocLibre(b, o, coins, teinte(o), 0.05, true);
    }
  });
}

// baie ogivale : { xc, yb (bas du vide), ys (naissance), w, R, t, z, ep, n, garde } ; options : appui
// (pierre d'appui sous le vide), meneau (colonnette au milieu, fenêtre double). Renvoie { trou (pour
// pan), arc, dessiner(b, o) }.
export function baieOgivale({ xc = 0, yb, ys, w, R, t, z = 0, ep = 0.9, n = 5, garde, appui = false, meneau = false }) {
  const arc = profilOgive({ xc, ys, w, R, t });
  const trou = { xc, y0: yb, y1: arc.sommet, demi: arc.demiExt };
  const dessiner = (b, o) => {
    claveaux(b, o, arc, { z, ep, n, garde });
    if (appui) bloc(b, o, { c: [xc, yb - 0.04, z + 0.05], L: 2 * w + 0.34, H: 0.16, D: ep + 0.14 });
    if (meneau) colonne(b, o, { x: xc, y0: yb, z, h: ys - yb, r: Math.min(0.11, w * 0.2), socle: false });
  };
  return { trou, arc, dessiner };
}

// --- colonnes ------------------------------------------------------------------------------
// colonne à chapiteau : base moulurée, fût tourné (léger galbe), corbeille évasée ornée de quatre
// feuilles, tailloir carré ; socle : dé de pierre sous la base. Hauteur h du pied au-dessus du tailloir.
// brisee : fût cassé à la hauteur h (ni chapiteau ni tailloir), cassure en biseau au sommet.
// Renvoie le sommet { x0, x1, y, z, D } (pour la mousse).
export function colonne(b, o, { x, y0 = 0, z, h, r, socle = true, brisee = false }) {
  const cotes = o.leger ? 6 : 8;
  const hs = socle ? Math.min(0.32, h * 0.1) : 0;
  if (socle) bloc(b, o, { c: [x, y0 + hs / 2, z], L: r * 3.1, H: hs, D: r * 3.1, plat: true });
  if (brisee) {
    // fût cassé : la cassure (un bloc en biseau, posé de travers) coiffe le tronçon
    const hf = h - hs - 0.12;
    const prof = o.leger
      ? [[0, 0], [r * 1.3, 0], [r * 1.05, 0.14], [r * 0.97, hf], [0, hf]]
      : [[0, 0], [r * 1.32, 0], [r * 1.05, 0.18], [r * 0.97, hf], [0, hf]];
    b.add(G.lathe(prof, cotes), teinte(o), { p: [x, y0 + hs, z], id: nextId(), ...F });
    bloc(b, o, { c: [x, y0 + hs + hf + 0.04, z], L: r * 1.75, H: 0.2, D: r * 1.75, r: [0.2, o.rand() * 3, 0.15], casse: 0.12, plat: true });
    return { x0: x - r * 0.8, x1: x + r * 0.8, y: y0 + h, z, D: r * 1.6 };
  }
  const ht = Math.min(0.2, h * 0.07); // tailloir
  const hc = Math.min(0.42, h * 0.14); // corbeille du chapiteau
  const hf = h - hs - ht;
  const prof = o.leger
    ? [[0, 0], [r * 1.3, 0], [r * 1.05, 0.14], [r * 0.92, hf - hc], [r * 1.4, hf], [0, hf]]
    : [[0, 0], [r * 1.32, 0], [r * 1.05, 0.18], [r * 0.92, hf - hc - 0.05], [r * 1.28, hf - hc * 0.3], [r * 1.42, hf], [0, hf]];
  b.add(G.lathe(prof, cotes), teinte(o), { p: [x, y0 + hs, z], id: nextId(), ...F });
  bloc(b, o, { c: [x, y0 + hs + hf + ht / 2, z], L: r * 3, H: ht, D: r * 3, plat: true });
  if (!o.leger && r >= 0.14) {
    // quatre feuilles d'acanthe stylisées sur la corbeille, aux diagonales
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const rr = r * 1.18;
      b.add(feuille(hc * 0.9, r * 0.55), MOUSSE, { p: [x + Math.sin(a) * rr, y0 + hs + hf - hc * 0.95, z + Math.cos(a) * rr], r: [-0.35, a, 0], id: nextId(), ...F });
    }
  }
  return { x0: x - r * 1.4, x1: x + r * 1.4, y: y0 + h, z, D: r * 2.8 };
}

// tambour de colonne tombé : cylindre couché (rayon r, longueur L) posé au niveau y0, centré en (x, z),
// d'axe tourné de cap autour de Y (0 : le long de X)
export function tambour(b, o, { x, y0 = 0, z, r, L, cap = 0 }) {
  const cotes = o.leger ? 6 : 8;
  // un bout chanfreiné, l'autre franc (cassure) ; anneau au milieu du fût (pour la mesure d'emprise)
  const prof = [[0, -L / 2], [r * 0.92, -L / 2], [r, -L / 2 + 0.06], [r, 0], [r, L / 2], [0, L / 2]];
  b.add(G.lathe(prof, cotes), teinte(o), { p: [x, y0 + r * 0.92, z], r: [0, cap, Math.PI / 2], id: nextId(), ...F });
}

// --- escalier et éboulis -------------------------------------------------------------------
// escalier de n marches (contremarche c, giron g) de largeur l centré en xc, du pied zPied, qui monte
// dans le sens dir (−1 : vers −Z) ; chaque marche est un bloc posé du sol (y0) à son dessus, ou deux
// (joint près de l'axe) si elle est large
export function escalier(b, o, { xc = 0, l, zPied, dir = -1, n, c, g, y0 = 0 }) {
  for (let k = 0; k < n; k++) {
    const top = y0 + (k + 1) * c;
    const za = zPied + dir * k * g;
    const zm = za + (dir * g) / 2;
    const coupe = xc + (o.rand() - 0.5) * 0.5;
    const parts = l > 3 ? [[xc - l / 2, coupe], [coupe, xc + l / 2]] : [[xc - l / 2, xc + l / 2]];
    for (const [u, v] of parts) {
      // la marche déborde un peu sous la suivante (pas de jour entre les blocs)
      const hh = top - y0;
      bloc(b, o, { c: [(u + v) / 2, y0 + hh / 2, zm + dir * 0.03], L: v - u - 0.02, H: hh, D: g + 0.06, r: [0, (o.rand() - 0.5) * 0.03, 0], jit: 0.018, plat: true, e: 0.045 });
    }
  }
}

// éboulis : blocs tombés [x, z, taille], couchés de biais, à demi enfoncés ; certains moussus
export function eboulis(b, o, pierres) {
  for (const [x, z, s] of pierres) {
    const L = s;
    const H = s * (0.5 + o.rand() * 0.25);
    const D = s * (0.6 + o.rand() * 0.25);
    const r = [(o.rand() - 0.5) * 0.5, o.rand() * Math.PI, (o.rand() - 0.5) * 0.5];
    bloc(b, o, { c: [x, H * 0.4, z], L, H, D, r, jit: 0.04, plat: true });
    if (o.rand() < 0.25) mousse(b, o, { x0: x - L * 0.3, x1: x + L * 0.3, y: H * 0.4 + H * 0.5, z, D: D * 0.7 }, { coulure: false });
  }
}

// --- mousse, lierre, fougères ----------------------------------------------------------------
// coussin de mousse sur le dessus d'un bloc (sommet { x0, x1, y, z, D }), coulure optionnelle sur la
// face avant
export function mousse(b, o, s, { couleur, coulure = true } = {}) {
  const { rand } = o;
  const L = (s.x1 - s.x0) * (0.55 + rand() * 0.35);
  const xm = s.x0 + (s.x1 - s.x0) * (0.3 + rand() * 0.4);
  const D = s.D * (0.7 + rand() * 0.2);
  const H = 0.07 + rand() * 0.04;
  const coul = couleur ?? (rand() < 0.65 ? MOUSSE : MOUSSE_F);
  b.add(hexa(coinsBoite(L, H, D, rand, { jit: 0.03, retrait: 0.15 }), 0.035, o.leger, true), coul, { p: [xm, s.y + H * 0.3, s.z + (rand() - 0.4) * 0.1], id: nextId(), ...F });
  if (coulure && !o.leger && rand() < 0.25) {
    const lc = Math.min(L * 0.6, 0.45);
    const hc = 0.16 + rand() * 0.2;
    b.add(hexa(coinsBoite(lc, hc, 0.05, rand, { jit: 0.015, retrait: -0.1 }), 0.02), coul, { p: [xm + (rand() - 0.5) * L * 0.3, s.y - hc / 2 + 0.03, s.z + s.D / 2 + 0.015], id: nextId(), ...F });
  }
}

// feuille : losange bombé, pointe vers +Y, longueur L, largeur l ; face +Z seulement (contre la pierre),
// ou les deux faces (deux : feuille libre, vue de partout)
export function feuille(L, l, deux = false) {
  const B = [0, 0, 0];
  const T = [0, L, 0];
  const G0 = [-l / 2, L * 0.42, 0];
  const D0 = [l / 2, L * 0.42, 0];
  const pos = [];
  for (const sens of deux ? [1, -1] : [1]) {
    const av = [0, L * 0.4, sens * L * 0.09];
    for (const [p, q] of [[B, D0], [D0, T], [T, G0], [G0, B]]) pos.push(...(sens > 0 ? [...p, ...q] : [...q, ...p]), ...av);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// brin de lierre qui retombe d'un sommet (x, y) le long d'une face (plan z, côté dz), sur longueur m :
// feuilles alternées de part et d'autre d'une tige qui ondule, une touffe au départ ; bas : niveau sous
// lequel il ne descend pas
export function lierre(b, o, { x, y, z, longueur: lv, taille = 0.26, dz = 1, bas = 0 }) {
  const { rand } = o;
  const longueur = Math.min(lv, y - bas - 0.25);
  const pas = o.leger ? 0.3 : 0.2;
  const n = Math.max(2, Math.round(longueur / pas));
  const ph = rand() * 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = taille * (1 - 0.35 * t) * (0.85 + rand() * 0.3);
    const cote = i % 2 ? 1 : -1;
    const px = x + Math.sin(ph + t * 4.5) * 0.14 + cote * s * 0.45;
    const py = y - t * longueur;
    // pointe vers le bas et de côté, feuille qui s'écarte du mur vers sa pointe
    const a = Math.PI + cote * (0.5 + rand() * 0.5);
    b.add(feuille(s, s * 0.8), FEUILLES[Math.floor(rand() * FEUILLES.length)], { p: [px, py, z + dz * (0.02 + rand() * 0.03)], r: [-(0.3 + rand() * 0.3), dz > 0 ? 0 : Math.PI, a], id: nextId(), ...F });
  }
  const touffe = o.leger ? 1 : 2;
  for (let i = 0; i < touffe; i++) {
    const s = taille * (0.9 + rand() * 0.4);
    b.add(feuille(s, s * 0.85), FEUILLES[Math.floor(rand() * FEUILLES.length)], { p: [x + (rand() - 0.5) * 0.4, y + 0.02, z - dz * rand() * 0.3], r: [-1.1 - rand() * 0.4, rand() * Math.PI * 2, (rand() - 0.5) * 0.6], id: nextId(), ...F });
  }
}

// mousse sur une part des sommets d'un pan, et lierre depuis quelques-uns (face +Z, ou −Z : dz = −1)
export function verdir(b, o, sommets, { part = 0.6, brins = [], bas = 0 } = {}) {
  for (const s of sommets) if (o.rand() < part) mousse(b, o, s);
  for (const { i, longueur, taille, dz = 1 } of brins) {
    const s = sommets[Math.min(sommets.length - 1, i)];
    if (i >= 0 && s) lierre(b, o, { x: (s.x0 + s.x1) / 2, y: s.y, z: s.z + (dz * s.D) / 2, longueur, taille, dz, bas });
  }
}

// touffe de fougère posée au niveau y : feuilles libres en couronne, pointes vers le haut et le dehors
export function touffe(b, o, { x, y = 0, z, taille = 0.5 }) {
  const n = o.leger ? 3 : 5;
  const a0 = o.rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (o.rand() - 0.5) * 0.4;
    const s = taille * (0.7 + o.rand() * 0.45);
    b.add(feuille(s, s * 0.42, true), FEUILLES[Math.floor(o.rand() * FEUILLES.length)], { p: [x, y - 0.02, z], r: [0, a, 0.55 + o.rand() * 0.35], id: nextId(), ...F });
  }
}
