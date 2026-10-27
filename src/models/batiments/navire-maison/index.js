// Maison de pont du navire-forteresse (BAT-015), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md §6.2), dans la DA du moulin-tour BAT-013 : socle de pierre, rez de bois
// en bordages, étages à colombages (enduit crème, poutres brun-orangé) en léger encorbellement sur des
// consoles, fenêtres à croisillons, porte de 1,6 m sur la rue (+Z). Trois formes (paramètre forme) :
// 0 grande à pignon sur rue (toit de mousse, oriel, combles, cheminée qui fume), 1 étroite et haute (deux
// étages, balcon de bois au 2e, toit pointu d'ardoise bleue), 2 basse à appentis (toit moussu d'une seule
// pente adossé, haut sur le dos, petite cheminée). Variante v 1 : version allégée, pour la vue lointaine.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { forme, SOCLE } from './physique.js';
import {
  tris, prisme, rect, oc, panZ, panX, pignonZ, barre, planche, fenetre, porte, panDeBois, poser, poteau, socle,
  ENDUIT, POUTRE, POUTRE_F, BOIS_TOIT, MOUSSE, MOUSSE_C, BLEU, BLEU_F, BORDAGE, BORDAGE_F, PIERRES, FUMEE,
} from '../navire-coque/forme.js';

const F = { tint: 0 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BRIQUE = PIERRES[1];

// --- murs -------------------------------------------------------------------------------------------
// niveau : { y0, y1, L, P } (P : profondeur, encorbellement compris) ; bois : rez en bordages
function murs(b, o, n, bois) {
  const h = n.y1 - n.y0;
  if (bois) {
    // bordages de ≈ 0,5 m, deux tons
    const k = Math.max(2, Math.round(h / (o.leger ? 1.0 : 0.5)));
    for (let i = 0; i < k; i++) b.add(prisme(rect(n.L, n.P), h / k), i % 2 ? BORDAGE_F : BORDAGE, { p: [0, n.y0 + (h / k) * (i + 0.5), 0], id: o.idMur, ...F });
  } else b.add(prisme(rect(n.L, n.P), h), ENDUIT, { p: [0, (n.y0 + n.y1) / 2, 0], id: o.idMur, ...F });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) poteau(b, (sx * n.L) / 2, (sz * n.P) / 2, n.y0, n.y1, 0.22, o);
}
// une face du niveau n : k (0 : +Z, 1 : +X, 2 : −Z, 3 : −X) ; colombage (pan de bois complet) ou bois (baies
// seules, sur les bordages) ; baies : [{ x, w, h, yc }] ou [{ x, w, h, yb, porte }]
function face(b, o, n, k, baies, bois) {
  const a = (k * Math.PI) / 2;
  const lg = k % 2 ? n.P : n.L;
  const dist = (k % 2 ? n.L : n.P) / 2;
  const f = new Builder(o.idBois);
  if (bois) for (const q of baies) (q.porte ? porte(f, q.x, q.yb, q.w, q.h, o) : fenetre(f, q.x, q.yc, q.w, q.h, o));
  else panDeBois(f, lg, n.y0, n.y1, baies, { ...o, sens: k });
  poser(b, f, a, Math.sin(a) * dist, Math.cos(a) * dist);
}
// sablière entre deux niveaux (au-dessus de n), débordant de l'encorbellement
function sabliere(b, o, L, P, y) {
  b.add(prisme(oc(o, L + 0.16, P + 0.16, 0.05), 0.2), POUTRE_F, { p: [0, y, 0], id: o.idBois, ...F });
}
// consoles sous l'encorbellement de la façade et du dos (x de chaque console)
function consoles(b, o, xs, P, e, y) {
  if (!e) return;
  for (const s of [-1, 1]) for (const x of xs) barre(b, POUTRE_F, [x, y - 0.75, s * (P / 2 - 0.02)], [x, y - 0.05, s * (P / 2 + e)], rect(0.13, 0.13), { id: o.idBois });
}

// --- toits ------------------------------------------------------------------------------------------
// pignon sur rue : faîtage le long de Z, deux pans de mousse épais, pignons crème avec poinçon et
// contrefiches ; renvoie la hauteur du toit en x (pour la cheminée)
function toitPignon(b, o, L, P, ye, faite) {
  const ev = L / 2 + 0.35;
  const ang = Math.atan2(faite - ye, ev);
  const w = Math.hypot(ev, faite - ye) + 0.1;
  const lz = P + 0.7;
  for (const sx of [-1, 1]) b.add(panZ(w, 0.24, lz), sx > 0 ? MOUSSE : MOUSSE_C, { p: [(sx * ev) / 2, (ye + faite) / 2 + 0.11, 0], r: [0, 0, -sx * ang], id: o.idToit, ...F });
  b.add(prisme(oc(o, 0.32, 0.32, 0.1), lz - 0.1).clone().rotateX(Math.PI / 2), MOUSSE, { p: [0, faite + 0.19, 0], id: o.idToit, ...F });
  for (const sz of [-1, 1]) {
    b.add(pignonZ(L + 0.1, faite - ye, 0.12), ENDUIT, { p: [0, ye, sz * (P / 2 - 0.06)], ...F });
    if (o.leger) continue;
    const fp = new Builder(o.idBois);
    planche(fp, POUTRE, 0, ye + 0.08, 0, faite - 0.1, 0.12, 0.05);
    for (const sx of [-1, 1]) planche(fp, POUTRE, sx * 0.08, ye + (faite - ye) * 0.45, sx * L * 0.3, ye + 0.1, 0.1, 0.045);
    planche(fp, POUTRE_F, -L / 2 + 0.1, ye + 0.06, L / 2 - 0.1, ye + 0.06, 0.12, 0.05);
    poser(b, fp, sz > 0 ? 0 : Math.PI, 0, sz * P / 2);
  }
  return (x) => ye + (faite - ye) * Math.max(0, 1 - Math.abs(x) / ev) + 0.24;
}
// toit pointu d'ardoise : pyramide sur un larmier, arêtiers et épi
function toitPointu(b, o, L, P, ye, faite) {
  const [dx, dz] = [L / 2 + 0.3, P / 2 + 0.3];
  const S = V(0, faite, 0);
  const C = [[-dx, -dz], [dx, -dz], [dx, dz], [-dx, dz]].map(([x, z]) => V(x, ye, z));
  const T = [];
  for (let i = 0; i < 4; i++) {
    const [p, q] = [C[i], C[(i + 1) % 4]];
    T.push([p, q, S, V((p.x + q.x) / 2, 0.6, (p.z + q.z) / 2)]);
  }
  T.push([C[0], C[1], C[2], V(0, -1, 0)], [C[0], C[2], C[3], V(0, -1, 0)]);
  b.add(tris(T), BLEU, { id: o.idToit, ...F });
  b.add(prisme(oc(o, 2 * dx + 0.06, 2 * dz + 0.06, 0.08), 0.16), BLEU_F, { p: [0, ye - 0.06, 0], id: o.idToit, ...F });
  for (const c of C) barre(b, BLEU_F, [c.x * 1.01, ye + 0.03, c.z * 1.01], [0, faite + 0.02, 0], oc(o, 0.15, 0.15, 0.04), { id: o.idToit });
  b.add(G.cone(0.13, 1.1, 8), POUTRE_F, { p: [0, faite + 0.5, 0], id: o.idBois, ...F });
}
// appentis : un seul pan de mousse, haut sur le dos (−Z), bas sur la façade ; joues triangulaires
function toitAppentis(b, o, L, P, yf, yb) {
  const pente = Math.atan2(yb - yf, P);
  const w = Math.hypot(P + 0.8, yb - yf);
  b.add(panX(w, 0.24, L + 0.5), MOUSSE, { p: [0, (yf + yb) / 2 + 0.16, 0.05], r: [pente, 0, 0], id: o.idToit, ...F });
  // mur du dos rehaussé, joues des côtés (triangle de yf à yb)
  b.add(prisme(rect(L, 0.3), yb - yf), BORDAGE_F, { p: [0, (yf + yb) / 2, -P / 2 + 0.15], id: o.idMur, ...F });
  for (const sx of [-1, 1]) {
    const joue = prisme([[0, -P / 2], [0, P / 2], [yb - yf, -P / 2]], 0.2).clone().rotateZ(Math.PI / 2);
    b.add(joue, BORDAGE, { p: [sx * (L / 2 - 0.1), yf, 0], id: o.idMur, ...F });
  }
  return (x, z) => yf + ((yb - yf) * (P / 2 - z)) / P + 0.24;
}

// cheminée de briques crème qui dépasse le toit, chapeau, fumée : grappe de bouffées aplaties et soudées,
// la première assise dans le chapeau, qui s'en vont vers le dos de la maison (balancement léger)
const BOUFFEES = [[0.35, 0.3, 0], [0.5, 0.72, 0.38], [0.62, 1.18, 0.8], [0.75, 1.68, 1.25]];
const BOUFFEES_LEGER = [[0.45, 0.35, 0], [0.65, 0.92, 0.55]];
function cheminee(b, o, x, z, y0, y1) {
  b.add(prisme(oc(o, 0.7, 0.7, 0.1), y1 - y0), BRIQUE, { p: [x, (y0 + y1) / 2, z], id: o.idBois, ...F });
  b.add(prisme(oc(o, 0.92, 0.92, 0.1), 0.18), POUTRE_F, { p: [x, y1 + 0.05, z], id: o.idBois, ...F });
  for (const [r, dy, d] of o.leger ? BOUFFEES_LEGER : BOUFFEES) b.add(G.sphere(r, 10, 8), FUMEE, { p: [x, y1 + dy, z - d], s: [1, 0.8, 1], id: o.idFumee, sway: 0.6, ...F });
}

// --- formes -----------------------------------------------------------------------------------------
const W = (x, w = 0.8, h = 0.9) => ({ x, w, h });
const PORTE = { w: 0.95, h: 1.6 };
// niveaux de la forme : rez sans encorbellement, étages élargis sur la façade et le dos
const niveaux = (f) => f.niveaux.map(([y0, y1], i) => ({ y0, y1, L: f.L, P: f.P + (i ? 2 * f.encorbellement : 0) }));
const yc = (n, d = 0.15) => (n.y0 + n.y1) / 2 + d;
const baies = (n, liste) => liste.map((q) => (q.porte ? { ...q, yb: n.y0 + 0.02 } : { ...q, yc: q.yc ?? yc(n) }));

function grande(b, o, f) {
  const [rez, etage] = niveaux(f);
  murs(b, o, rez, true);
  face(b, o, rez, 0, baies(rez, [{ x: -1.8, ...PORTE, porte: true }, W(1.0), W(3.0)]), true);
  face(b, o, rez, 1, baies(rez, [W(0)]), true);
  face(b, o, rez, 2, baies(rez, [W(-1.5), W(1.5)]), true);
  face(b, o, rez, 3, baies(rez, [W(0)]), true);
  sabliere(b, o, f.L, etage.P, etage.y0);
  consoles(b, o, [-3.6, -1.2, 1.2, 3.6], f.P, f.encorbellement, etage.y0);
  murs(b, o, etage, false);
  // façade : deux fenêtres, oriel au milieu ; dos : deux fenêtres ; côtés : une
  face(b, o, etage, 0, baies(etage, [W(-2.9), W(2.9)]), false);
  face(b, o, etage, 1, baies(etage, [W(0)]), false);
  face(b, o, etage, 2, baies(etage, [W(-2), W(2)]), false);
  face(b, o, etage, 3, baies(etage, [W(0)]), false);
  sabliere(b, o, f.L, etage.P, etage.y1);
  const haut = toitPignon(b, o, f.L, etage.P, etage.y1 + 0.1, f.faite);
  // oriel sur la façade de l'étage : avancée vitrée sur deux consoles, petit toit de bois
  const zo = etage.P / 2;
  const [oy0, oy1] = [etage.y0 + 0.45, etage.y1 - 0.35];
  b.add(prisme(rect(2.0, 0.7), oy1 - oy0), ENDUIT, { p: [0, (oy0 + oy1) / 2, zo + 0.35], id: o.idMur, ...F });
  b.add(prisme(oc(o, 2.3, 0.95, 0.06), 0.16), POUTRE_F, { p: [0, oy0 - 0.06, zo + 0.42], id: o.idBois, ...F });
  b.add(prisme(oc(o, 2.4, 1.05, 0.06), 0.16), BOIS_TOIT, { p: [0, oy1 + 0.08, zo + 0.45], id: o.idToit, ...F });
  for (const x of [-0.7, 0.7]) barre(b, POUTRE_F, [x, oy0 - 0.7, zo], [x, oy0 - 0.12, zo + 0.75], rect(0.12, 0.12), { id: o.idBois });
  const fo = new Builder(o.idBois);
  fenetre(fo, 0, (oy0 + oy1) / 2, 1.3, 1.0, o);
  for (const sx of [-1, 1]) poteau(fo, sx * 0.95, 0.04, oy0, oy1, 0.14, o);
  poser(b, fo, 0, 0, zo + 0.7);
  // combles : une fenêtre dans le pignon de la façade
  const fc = new Builder(o.idBois);
  fenetre(fc, 0, etage.y1 + 1.9, 0.75, 0.8, o);
  poser(b, fc, 0, 0, etage.P / 2);
  // cheminée sur le pan +X, vers le dos, qui dépasse le toit de 1,5 m
  const [cx, cz] = [2.2, -1.6];
  cheminee(b, o, cx, cz, etage.y1, haut(cx) + 1.5);
}

function etroite(b, o, f) {
  const [rez, e1, e2] = niveaux(f);
  murs(b, o, rez, true);
  face(b, o, rez, 0, baies(rez, [{ x: -0.9, ...PORTE, porte: true }, W(1.2, 0.75)]), true);
  face(b, o, rez, 1, baies(rez, [W(0, 0.7)]), true);
  face(b, o, rez, 3, baies(rez, [W(0, 0.7)]), true);
  for (const [n, bas] of [[e1, rez], [e2, e1]]) {
    sabliere(b, o, f.L, n.P, n.y0);
    consoles(b, o, [-1.6, 1.6], bas.P, n.P === bas.P ? 0 : f.encorbellement, n.y0);
    murs(b, o, n, false);
  }
  face(b, o, e1, 0, baies(e1, [W(-1.1, 0.7), W(1.1, 0.7)]), false);
  face(b, o, e1, 1, baies(e1, [W(0, 0.7)]), false);
  face(b, o, e1, 2, baies(e1, [W(0, 0.7)]), false);
  face(b, o, e1, 3, baies(e1, [W(0, 0.7)]), false);
  // 2e étage : porte-fenêtre sur le balcon, fenêtres sur les côtés et le dos
  face(b, o, e2, 0, baies(e2, [{ x: 0, w: 0.85, h: 1.6, porte: true }]), false);
  face(b, o, e2, 1, baies(e2, [W(0, 0.7)]), false);
  face(b, o, e2, 2, baies(e2, [W(0, 0.7)]), false);
  face(b, o, e2, 3, baies(e2, [W(0, 0.7)]), false);
  sabliere(b, o, f.L, e2.P, e2.y1);
  toitPointu(b, o, f.L, e2.P, e2.y1 + 0.1, f.faite);
  // balcon de bois au 2e : plancher sur trois consoles, poteaux et lisses
  const zb = e2.P / 2;
  const [bl, bp] = [2.6, 0.9];
  b.add(prisme(oc(o, bl, bp, 0.05), 0.14), BOIS_TOIT, { p: [0, e2.y0 - 0.05, zb + bp / 2], id: o.idBois, ...F });
  for (const x of [-1.0, 0, 1.0]) barre(b, POUTRE_F, [x, e2.y0 - 0.8, zb - 0.02], [x, e2.y0 - 0.14, zb + bp - 0.1], rect(0.12, 0.12), { id: o.idBois });
  const coins = [[-bl / 2 + 0.06, zb + 0.05], [-bl / 2 + 0.06, zb + bp - 0.06], [bl / 2 - 0.06, zb + bp - 0.06], [bl / 2 - 0.06, zb + 0.05]];
  for (let i = 0; i < 3; i++) {
    const [A, B] = [coins[i], coins[i + 1]];
    const n = Math.max(1, Math.round(Math.hypot(B[0] - A[0], B[1] - A[1]) / (o.leger ? 2 : 0.45)));
    for (let k = 0; k <= n; k++) b.add(prisme(rect(0.07, 0.07), 0.9), POUTRE, { p: [A[0] + ((B[0] - A[0]) * k) / n, e2.y0 + 0.47, A[1] + ((B[1] - A[1]) * k) / n], id: o.idBois, ...F });
    barre(b, POUTRE_F, [A[0], e2.y0 + 0.95, A[1]], [B[0], e2.y0 + 0.95, B[1]], oc(o, 0.1, 0.12, 0.03), { id: o.idBois });
  }
}

function basse(b, o, f) {
  const [rez] = niveaux(f);
  murs(b, o, rez, true);
  face(b, o, rez, 0, baies(rez, [{ x: -1.8, ...PORTE, porte: true }, W(0.6), W(2.4)]), true);
  face(b, o, rez, 1, baies(rez, [W(0.3, 0.7, 0.8)]), true);
  face(b, o, rez, 3, baies(rez, [W(0.3, 0.7, 0.8)]), true);
  sabliere(b, o, f.L, f.P, rez.y1);
  const haut = toitAppentis(b, o, f.L, f.P, rez.y1 + 0.1, f.faite);
  const [cx, cz] = [-2.2, -1.1];
  cheminee(b, o, cx, cz, rez.y1, haut(cx, cz) + 1.0);
}

// --- assemblage -------------------------------------------------------------------------------------
const CONSTRUIRE = [grande, etroite, basse];
export function navireMaison(p) {
  const b = new Builder();
  const f = forme(p);
  const k = Math.min(2, Math.max(0, Math.round(p.forme ?? 0)));
  const o = { rand: mulberry32(2015 + 977 * k), leger: p.v === 1, idMur: b.defaultId, idBois: nextId(), idToit: nextId(), idFumee: nextId() };
  socle(b, f.L + 0.2, f.P + 0.2, SOCLE, 0, 0, o.leger);
  CONSTRUIRE[k](b, o, f);
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-015', 'navire-maison', 'Maison de pont du navire-forteresse', part('navire_maison', { forme: 0 }), {
  variants: [
    { label: 'Grande à pignon', params: { forme: 0, v: 0 } },
    { label: 'Grande à pignon, allégée (au loin)', params: { forme: 0, v: 1 } },
    { label: 'Étroite et haute', params: { forme: 1, v: 0 } },
    { label: 'Étroite et haute, allégée (au loin)', params: { forme: 1, v: 1 } },
    { label: 'Basse à appentis', params: { forme: 2, v: 0 } },
    { label: 'Basse à appentis, allégée (au loin)', params: { forme: 2, v: 1 } },
  ],
  // budget accordé par l'utilisateur le 26/10/2026 (forteresse-navire, ≈ 60 000 en pièces) : 3 500 de
  // près, 1 500 allégé, pour chaque forme
  budget: { triangles: 3500, lod: 1500 },
  tags: ['plateau', 'forteresse'],
});
