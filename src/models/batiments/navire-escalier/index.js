// Escalier et passerelle du navire-forteresse (BAT-019), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md §6.6). Forme 0 : escalier de bois du flanc +X, dans le repère du navire,
// de l'ouverture du pavois (pont à 20 m) au sol, en cinq volées de onze marches et quatre paliers, posé sur
// des chevalets ; rambardes des deux côtés. Forme 1 : passerelle droite de 6 m qui monte de 2 m, sur deux
// limons, rambardes. Variante v 1 : version allégée.
import { Builder } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { HAUT, N, HM, GIRON, PALIER, LARGE, X, PALIER_HAUT, VOLEES, PASSERELLE, POTEAUX, RAMBARDE } from './physique.js';
import { prisme, rect, oc, barre, POUTRE, POUTRE_F, BOIS_TOIT, PONT, BORDAGE } from '../navire-coque/forme.js';

const F = { tint: 0 };

// poteau de rambarde, du niveau y (sous la marche ou le plancher) à la hauteur yh
const poteauR = (b, o, x, z, y, yh) => b.add(prisme(rect(0.1, 0.1), yh - y), POUTRE_F, { p: [x, (y + yh) / 2, z], id: o.idBois, ...F });
// rambarde le long de A → B (points [x, y, z], y : niveau du plancher sous la rambarde ; bas : où partent
// les poteaux) : poteaux aux bouts et tous les 1,5 m (aux bouts seulement au loin ; aucun avec
// poteaux: false, quand d'autres les posent), lisse haute à h − 0,03 ; les planchers des rambardes de
// l'escalier sont à RAMBARDE (physique.js)
function rambarde(b, o, A, B, { h = RAMBARDE, bas = 0.05, poteaux = true } = {}) {
  const n = !poteaux ? -1 : o.leger ? 1 : Math.max(1, Math.round(Math.hypot(B[0] - A[0], B[2] - A[2]) / 1.5));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const [x, y, z] = [0, 1, 2].map((a) => A[a] + (B[a] - A[a]) * t);
    poteauR(b, o, x, z, y - bas, y + h - 0.01);
  }
  barre(b, POUTRE, [A[0], A[1] + h - 0.03, A[2]], [B[0], B[1] + h - 0.03, B[2]], rect(0.1, 0.12), { id: o.idBois });
}
// au loin, l'escalier perd ses rambardes (des lisses de 10 cm sans poteaux flottent) : une joue pleine de
// 0,9 m le long de A → B (niveau du plancher), qui dépasse de 0,58 m
const joue = (b, o, A, B) => barre(b, POUTRE_F, [A[0], A[1] + 0.13, A[2]], [B[0], B[1] + 0.13, B[2]], rect(0.14, 0.9), { id: o.idBois });
// chevalet : deux poteaux du sol au dessous d'un plancher (y), en x0 et x1, à z ; croix de Saint-André
function chevalet(b, o, x0, x1, z, y) {
  for (const x of [x0, x1]) b.add(prisme(oc(o, 0.32, 0.32, 0.07), y), POUTRE_F, { p: [x, y / 2, z], id: o.idBois, ...F });
  if (o.leger || y < 2) return;
  barre(b, POUTRE_F, [x0, 0.4, z], [x1, y - 0.3, z], rect(0.12, 0.14), { id: o.idBois });
  barre(b, POUTRE_F, [x1, 0.4, z], [x0, y - 0.3, z], rect(0.12, 0.14), { id: o.idBois });
}

function escalier(b, o) {
  const [xi, xe] = [X - LARGE / 2, X + LARGE / 2];
  const { x0, z0, z1 } = PALIER_HAUT;
  const garde = (A, B, opts) => (o.leger ? joue(b, o, A, B) : rambarde(b, o, A, B, opts));
  // dessous des limons (de près) ou des joues (au loin) de la volée f en z, pour les contrefiches
  const dessous = (f, z) => {
    const { z0: za, z1: zb, y0 } = VOLEES[f];
    const [ya, yb] = [y0 - 0.2, y0 - (N - 1) * HM - 0.35];
    return ya + ((yb - ya) * (z - za + 0.1)) / (zb - za + 0.2) - (o.leger ? 0.45 : 0.17);
  };
  // palier d'arrivée (dans l'ouverture du pavois) sur deux chevalets
  b.add(prisme(rect(xe - x0 + 0.1, z1 - z0), 0.16), BOIS_TOIT, { p: [(x0 + xe) / 2, HAUT - 0.08, (z0 + z1) / 2], id: o.idBois, ...F });
  for (const z of [z0 + 0.15, z1 - 0.15]) chevalet(b, o, xi + 0.15, xe - 0.15, z, HAUT - 0.16);
  garde([xe + 0.05, HAUT, z0], [xe + 0.05, HAUT, z1]);
  garde([x0 + 0.1, HAUT, z0 - 0.05], [xe + 0.05, HAUT, z0 - 0.05]);
  garde([x0 + 0.1, HAUT, z1 + 0.05], [xi - 0.05, HAUT, z1 + 0.05]);
  VOLEES.forEach(({ z0: za, z1: zb, y0 }, f) => {
    const yb = y0 - (N - 1) * HM;
    const yp = y0 - N * HM;
    // marches (planches de deux tons de près, une rampe au loin), deux limons
    if (o.leger) barre(b, PONT, [X, y0 - HM - 0.06, za], [X, yb - 0.06, zb], rect(LARGE, 0.12), { id: o.idBois });
    else for (let i = 0; i < N - 1; i++) b.add(prisme(rect(LARGE, GIRON + 0.04), 0.08), i % 2 ? BORDAGE : PONT, { p: [X, y0 - (i + 1) * HM - 0.04, za + (i + 0.5) * GIRON], id: o.idBois, ...F });
    if (!o.leger) for (const x of [xi - 0.06, xe + 0.06]) barre(b, POUTRE_F, [x, y0 - 0.2, za - 0.1], [x, yb - 0.35, zb + 0.1], rect(0.12, 0.34), { id: o.idBois });
    // rambardes : lisse en pente le long des nez de marche ; un poteau par jonction, à la tête de la plus
    // haute des deux lisses (en haut de volée, celle du palier ; en bas, celle de la volée), sauf en haut de
    // la première volée, où la rambarde du palier d'arrivée a les siens ; poteaux au bord arrière des
    // marches de POTEAUX (tête à 1,29 m au-dessus de la marche)
    for (const x of [xi - 0.05, xe + 0.05]) {
      garde([x, y0 - HM, za], [x, yb, zb], { bas: HM, poteaux: false });
      if (o.leger) continue;
      if (f > 0) poteauR(b, o, x, za, y0 - HM - 0.3, y0 + RAMBARDE - 0.01);
      poteauR(b, o, x, zb, Math.max(0, yp - 0.3), yb + RAMBARDE - 0.01);
      for (const i of POTEAUX) poteauR(b, o, x, za + (i + 1) * GIRON - 0.05, y0 - (i + 2) * HM, y0 - (i + 1) * HM + RAMBARDE - 0.01);
    }
    if (f === 4) return;
    // palier sur un chevalet en son milieu, contreventé dans l'axe par deux contrefiches à 45° par poteau
    // (vers le limon de la volée qui arrive et de celle qui part) ; rambardes sans poteaux (ceux des
    // jonctions)
    const zc = zb + PALIER / 2;
    b.add(prisme(rect(LARGE + 0.1, PALIER), 0.16), BOIS_TOIT, { p: [X, yp - 0.08, zc], id: o.idBois, ...F });
    chevalet(b, o, xi + 0.15, xe - 0.15, zc, yp - 0.16);
    for (const [xp, xl] of [[xi + 0.15, xi - 0.06], [xe - 0.15, xe + 0.06]]) {
      for (const [g, s] of [[f, -1], [f + 1, 1]]) {
        // 2,6 m de portée, moins près du sol (le pied de la contrefiche reste à 0,4 m au moins)
        let d = 2.6;
        while (d > 0.8 && dessous(g, zc + s * d) - d < 0.4) d -= 0.2;
        const ye = dessous(g, zc + s * d);
        if (ye - d >= 0.4) barre(b, POUTRE_F, [xp, ye - d, zc], [xl, ye, zc + s * d], rect(0.12, 0.14), { id: o.idBois });
      }
    }
    for (const x of [xi - 0.05, xe + 0.05]) garde([x, yp, zb], [x, yp, zb + PALIER], { poteaux: false });
  });
}

function passerelle(b, o) {
  const { L, larg, h } = PASSERELLE;
  barre(b, PONT, [0, 0.02, 0], [0, h + 0.02, L], rect(larg, 0.1), { id: o.idBois });
  for (const x of [-larg / 2 - 0.06, larg / 2 + 0.06]) {
    barre(b, POUTRE_F, [x, -0.15, -0.05], [x, h - 0.15, L + 0.05], rect(0.12, 0.3), { id: o.idBois });
    rambarde(b, o, [x + Math.sign(x) * 0.01, 0.07, 0], [x + Math.sign(x) * 0.01, h + 0.07, L], { h: 1.3, bas: 0.1 });
  }
  // tasseaux en travers, tous les 1,2 m (de près)
  if (!o.leger) for (let z = 0.6; z < L; z += 1.2) b.add(prisme(rect(larg, 0.08), 0.04), POUTRE, { p: [0, (h * z) / L + 0.08, z], r: [Math.atan2(h, L), 0, 0], id: o.idBois, ...F });
}

export function navireEscalier(p) {
  const b = new Builder();
  const o = { leger: p.v === 1, idBois: nextId() };
  ((p.forme ?? 0) >= 1 ? passerelle : escalier)(b, o);
  return { solid: b, obstacles: lire(physique.obstacles, p), decks: lire(physique.planchers, p) };
}

export default fiche('BAT-019', 'navire-escalier', 'Escalier et passerelle du navire-forteresse', part('navire_escalier', { forme: 0 }), {
  variants: [
    { label: 'Escalier du flanc', params: { forme: 0, v: 0 } },
    { label: 'Escalier du flanc, allégé (au loin)', params: { forme: 0, v: 1 } },
    { label: 'Passerelle (6 m)', params: { forme: 1, v: 0 } },
    { label: 'Passerelle, allégée (au loin)', params: { forme: 1, v: 1 } },
  ],
  // budget accordé par l'utilisateur le 26/10/2026 (forteresse-navire, ≈ 60 000 en pièces) : 2 500 de
  // près, 1 000 allégé
  budget: { triangles: 2500, lod: 1000 },
  tags: ['plateau', 'forteresse'],
});
