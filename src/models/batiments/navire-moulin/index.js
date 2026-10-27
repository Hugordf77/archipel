// Tour-moulin centrale du navire-forteresse (BAT-017), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md §6.4) : version en hauteur du moulin-tour BAT-013, sans ses annexes,
// posée sur le pont. Socle de pierre ; quatre étages à colombages en tronc de pyramide qui s'affinent sans
// marche de 6 à 4 m de côté (enduit crème, poteaux d'angle, décharges, baies encadrées ; porte sur −Z) ;
// galerie à garde-corps au dernier étage ; cou ; tête de bois débordante à l'avant sous un capot en
// demi-couronne et à l'arrière sous un toit cintré ; quatre ailes à toile (rayon 8 m) sur +Z, en pièce
// animée qui tourne au vent. Variante v 1 : version allégée.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { SOCLE, ETAGES, GALERIE, COU, TETE, MOYEU, R_AILE } from './physique.js';
import {
  tris, prisme, rect, octo, oc, plaque, tronc, archivolte, coque, segmentDisque, socle, barre, panDeBois, poser, poteau, angles,
  facesTronc, ENDUIT, POUTRE, POUTRE_F, BOIS_TOIT, TOILE, TOILE_B,
} from '../navire-coque/forme.js';

const F = { tint: 0 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (x, w, h, yc) => [{ x, w, h, yc }];
const Ws = (xs, w, h, yc) => xs.map((x) => ({ x, w, h, yc }));

// --- la tour ------------------------------------------------------------------------------------
// baies de chaque face (0 : +Z, côté des ailes ; 1 : +X ; 2 : −Z ; 3 : −X)
const BAIES = [
  [Ws([-1.4, 1.4], 0.75, 0.9, 2.05), W(0, 0.75, 0.9, 2.05), [{ x: 0, w: 1.0, h: 1.6, yb: 0.45, porte: true }], W(0, 0.75, 0.9, 2.05)],
  [0, 1, 2, 3].map(() => Ws([-1.2, 1.2], 0.7, 0.85, 4.75)),
  [0, 1, 2, 3].map(() => W(0, 0.7, 0.85, 7.35)),
  [[{ x: 0, w: 0.85, h: 1.55, yb: 8.68, porte: true }], W(0, 0.65, 0.8, 9.9), W(0, 0.65, 0.8, 9.9), W(0, 0.65, 0.8, 9.9)],
];
function tour(b, o) {
  socle(b, SOCLE.c, SOCLE.c, SOCLE.h, 0, 0, o.leger);
  ETAGES.forEach((e, i) => {
    b.add(tronc(e.s, e.t, e.y1 - e.y0), ENDUIT, { p: [0, e.y0, 0], ...F });
    angles(b, e.s, e.t, e.y0, e.y1, 0.3, o);
    facesTronc(b, e.s, e.t, e.y0, e.y1, o.leger ? BAIES[i].map((f) => f.slice(0, 1)) : BAIES[i], o, i);
    // sablière haute (plancher de l'étage suivant), sauf sous la galerie
    if (e.y1 !== GALERIE.y) b.add(prisme(oc(o, e.t + 0.18, e.t + 0.18, 0.08), 0.22), POUTRE_F, { p: [0, e.y1 + 0.02, 0], id: o.idBois, ...F });
  });
}

// galerie à garde-corps autour du dernier étage : plancher, poteaux d'angle, lisses, montants et décharges,
// consoles du mur de l'étage inférieur au bord du plancher
function galerie(b, o) {
  const { y, demi, haut } = GALERIE;
  b.add(prisme(oc(o, 2 * demi + 0.14, 2 * demi + 0.14, 0.12), 0.2), POUTRE_F, { p: [0, y, 0], id: o.idBois, ...F });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.add(prisme(rect(0.15, 0.15), haut + 0.1), POUTRE, { p: [sx * demi, y + 0.1 + haut / 2, sz * demi], id: o.idBois, ...F });
  const mur = (ETAGES[2].s + ETAGES[2].t) / 4;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const f = new Builder(o.idBois);
    for (const yy of o.leger ? [haut] : [0.22, haut]) f.add(prisme(rect(0.1, 0.12), 2 * demi), POUTRE, { p: [0, y + 0.1 + yy, 0], r: [0, 0, Math.PI / 2], ...F });
    if (!o.leger) {
      const xs = [-demi / 2, 0, demi / 2];
      for (const x of xs) f.add(prisme(rect(0.09, 0.09), haut - 0.22), POUTRE, { p: [x, y + 0.1 + (haut + 0.22) / 2, 0], ...F });
      // décharges en V dans chaque travée
      const bornes = [-demi, ...xs, demi];
      for (let i = 0; i + 1 < bornes.length; i++) {
        const [x1, x2] = i % 2 ? [bornes[i] + 0.08, bornes[i + 1] - 0.08] : [bornes[i + 1] - 0.08, bornes[i] + 0.08];
        const len = Math.hypot(x2 - x1, haut - 0.3);
        f.add(prisme(rect(0.08, 0.07), len), POUTRE, { p: [(x1 + x2) / 2, y + 0.1 + (0.22 + haut) / 2, 0], r: [0, 0, Math.atan2(-(x2 - x1), haut - 0.3)], ...F });
      }
    }
    poser(b, f, a, Math.sin(a) * demi, Math.cos(a) * demi);
    // consoles sous le plancher
    const [ux, uz, tx, tz] = [Math.sin(a), Math.cos(a), Math.cos(a), -Math.sin(a)];
    for (const d of o.leger ? [0] : [-1.4, 0, 1.4]) barre(b, POUTRE_F, [ux * mur + tx * d, y - 1.2, uz * mur + tz * d], [ux * (demi - 0.3) + tx * d, y - 0.1, uz * (demi - 0.3) + tz * d], rect(0.16, 0.16), { id: o.idBois });
  }
}

// cou et tête : le cou prolonge l'affinement de la tour ; la tête de bois déborde à l'avant (+Z, côté ailes)
// sous un capot en demi-couronne centré sur le moyeu, et loin à l'arrière sous un toit cintré
const CAPOT = { r: 1.6, e: 0.15, prof: 1.0 };
function tete(b, o) {
  const { y0, y1, faite, demi, av, ar } = TETE;
  b.add(tronc(COU.s, COU.t, y0 - COU.y0), ENDUIT, { p: [0, COU.y0, 0], ...F });
  angles(b, COU.s, COU.t, COU.y0, y0, 0.24, o);
  if (!o.leger) facesTronc(b, COU.s, COU.t, COU.y0, y0, [[], [], [], []], o, 2);
  const lg = av - ar;
  const zc = (av + ar) / 2;
  b.add(prisme(oc(o, 2 * demi + 0.24, lg + 0.24, 0.08), 0.2), POUTRE_F, { p: [0, y0 + 0.04, zc], id: o.idBois, ...F });
  b.add(prisme(rect(2 * demi, lg), y1 - y0), ENDUIT, { p: [0, (y0 + y1) / 2, zc], ...F });
  for (const sx of [-1, 1]) for (const z of [ar, av]) poteau(b, sx * demi, z, y0, y1, 0.26, o);
  b.add(prisme(oc(o, 2 * demi + 0.2, lg + 0.2, 0.07), 0.18), POUTRE_F, { p: [0, y1, zc], id: o.idBois, ...F });
  // jambes de force sous le débord arrière
  for (const sx of [-1, 1]) barre(b, POUTRE_F, [sx * 1.0, y0 - 1.5, -COU.t / 2 - 0.08], [sx * 1.0, y0 - 0.03, ar + 0.8], rect(0.18, 0.18), { id: o.idBois });
  // flancs (±X) : trois fenêtres (une au loin) ; arrière : une fenêtre
  const yf = (y0 + y1) / 2 + 0.05;
  for (const sx of [-1, 1]) {
    const f = new Builder(o.idBois);
    panDeBois(f, lg, y0 + 0.1, y1 - 0.06, o.leger ? W(0, 0.7, 0.7, yf) : Ws([-2.2, 0, 2.2], 0.7, 0.7, yf), { ...o, sens: sx > 0 ? 0 : 1 });
    poser(b, f, (sx * Math.PI) / 2, sx * demi, zc);
  }
  const fa = new Builder(o.idBois);
  panDeBois(fa, 2 * demi, y0 + 0.1, y1 - 0.06, W(0, 0.7, 0.7, yf), o);
  poser(b, fa, Math.PI, 0, ar);
  // capot avant : demi-couronne de bois autour du moyeu, fermée par un demi-disque crème ; palier et arbre
  const [ym, zm] = [MOYEU[1], MOYEU[2]];
  const seg = o.leger ? 8 : 14;
  b.add(archivolte(CAPOT.r, CAPOT.r + CAPOT.e, CAPOT.prof, seg), BOIS_TOIT, { p: [0, ym, av - CAPOT.prof / 2 + 0.06], id: o.idBois, ...F });
  b.add(segmentDisque(CAPOT.r + 0.01, 0, Math.PI, 0.1, seg), ENDUIT, { p: [0, ym, av - 0.08], ...F });
  b.add(G.cyl(0.5, 0.56, 0.18, 12), POUTRE_F, { p: [0, ym, av + 0.1], r: [Math.PI / 2, 0, 0], id: o.idBois, ...F });
  b.add(G.cyl(0.24, 0.24, zm - av + 0.2, 10), POUTRE_F, { p: [0, ym, (av + zm) / 2], r: [Math.PI / 2, 0, 0], id: o.idBois, ...F });
  // toit cintré : arc surbaissé de l'arrière jusque dans le capot, pignon arrière en segment de disque
  const ev = demi + 0.12;
  const fl = faite - y1;
  const R = (ev * ev + fl * fl) / (2 * fl);
  const al = Math.asin(ev / R);
  const yc = faite - R;
  const z0 = ar - 0.5;
  b.add(coque(R, 0.16, Math.PI / 2 - al, Math.PI / 2 + al, av - CAPOT.prof / 2 - z0, o.leger ? 6 : 10), BOIS_TOIT, { p: [0, yc, z0], id: o.idBois, ...F });
  b.add(segmentDisque(R - 0.01, Math.PI / 2 - al, Math.PI / 2 + al, 0.1, o.leger ? 6 : 10), ENDUIT, { p: [0, yc, ar - 0.05], ...F });
}

// ailes : quatre bras en croix, longeron brun, toile crème en trapèze (0,75 m au pied, 1,7 m au bout) décalée
// sur le côté du longeron, rive sur le bord extérieur, trois lattes en façade
const TOILE_AILE = { r0: 1.7, r1: 7.85, w0: 0.75, w1: 1.7, v0: 0.12, z0: 0.175, z1: 0.225 };
function ailes(o) {
  const s = new Builder(o.idBois);
  s.add(G.cyl(0.6, 0.6, 0.5, 12), POUTRE_F, { p: [0, 0, 0.25], r: [Math.PI / 2, 0, 0], ...F });
  s.add(G.cone(0.34, 0.4, 12), POUTRE, { p: [0, 0, 0.7], r: [Math.PI / 2, 0, 0], ...F });
  const { r0, r1, w0, w1, v0, z0, z1 } = TOILE_AILE;
  const largeur = (r) => w0 + ((w1 - w0) * (r - r0)) / (r1 - r0);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    const [vx, vy] = [-uy, ux];
    const at = (r, v, z) => [ux * r + vx * v, uy * r + vy * v, z];
    s.add(prisme(o.leger ? rect(0.24, 0.2) : octo(0.24, 0.2, 0.06), R_AILE - 0.2), POUTRE, { p: at(R_AILE / 2 + 0.1, 0, 0.34), r: [0, 0, a - Math.PI / 2], ...F });
    // toile : prisme à base trapézoïdale, chaque face orientée vers l'extérieur
    const P = [[r0, v0], [r1, v0], [r1, v0 + w1], [r0, v0 + w0]];
    const bas = P.map(([r, v]) => V(...at(r, v, z0)));
    const haut = P.map(([r, v]) => V(...at(r, v, z1)));
    const [cx, cy] = at((r0 + r1) / 2, v0 + 0.6, 0);
    const L = [[bas[0], bas[1], bas[2], V(0, 0, -1)], [bas[0], bas[2], bas[3], V(0, 0, -1)], [haut[0], haut[1], haut[2], V(0, 0, 1)], [haut[0], haut[2], haut[3], V(0, 0, 1)]];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const n = V((bas[i].x + bas[j].x) / 2 - cx, (bas[i].y + bas[j].y) / 2 - cy, 0);
      L.push([bas[i], bas[j], haut[j], n], [bas[i], haut[j], haut[i], n]);
    }
    s.add(tris(L), k % 2 ? TOILE : TOILE_B, F);
    if (o.leger) continue;
    barre(s, POUTRE, at(r0 - 0.04, v0 + w0, 0.2), at(r1 + 0.04, v0 + w1, 0.2), octo(0.08, 0.08, 0.02));
    for (const r of [2.8, 4.6, 6.4]) s.add(prisme(plaque(0.08, 0.04), largeur(r) - 0.08, true), TOILE_B, { p: at(r, v0 + largeur(r) / 2, z1), r: [0, 0, a], ...F });
  }
  return s;
}

// --- assemblage -------------------------------------------------------------------------------------
export function navireMoulin(p) {
  const b = new Builder();
  const o = { rand: mulberry32(2017), leger: p.v === 1, idMur: b.defaultId, idBois: nextId(), idToit: nextId() };
  tour(b, o);
  galerie(b, o);
  tete(b, o);
  return { solid: b, anim: [{ builder: ailes(o), pivot: [...MOYEU], axis: 'z', speed: 0.6, wind: true }], obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-017', 'navire-moulin', 'Tour-moulin centrale du navire-forteresse', part('navire_moulin'), {
  variants: [{ label: 'De près', params: { v: 0 } }, { label: 'Allégé (au loin)', params: { v: 1 } }],
  // budget accordé par l'utilisateur le 26/10/2026 (forteresse-navire, ≈ 60 000 en pièces) : 9 000 de
  // près, 4 000 allégé
  budget: { triangles: 9000, lod: 4000 },
  tags: ['plateau', 'forteresse', 'animé'],
});
