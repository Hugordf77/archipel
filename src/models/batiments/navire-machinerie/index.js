// Hélices et encombrement du navire (BAT-021), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md), ajoutée le 01/11/2026 à la demande de l'utilisateur (« des hélices
// sur le dos du navire », « un design plus encombré et vivant ») pour le navire volant
// (src/world/plateau/NavireVolant.js). Posée à l'origine du navire, dans son repère, et calée sur la coque
// BAT-014 (navire-coque/physique.js) et les pièces voisines (habillage BAT-020, mâts, maisons) :
// - deux grandes hélices de poupe sur nacelles de cuivre, et deux rotors sur le dos du château : animés
//   (tableau anim, comme les ailes de la tour-moulin) ;
// - sur les flancs, où le pont n'a plus de place : cordes à linge, étagères de tonneaux et de caisses,
//   ancres et chaînes à la proue, lanternes sous les échauguettes.
// Variante v 1 : version allégée.
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';
import { station, demiLargeur, pont, pontPrincipal, lisse, POUPE, CHATEAU, GAILLARD } from '../navire-coque/physique.js';
import {
  prisme, rect, oc, barre, POUTRE_F, BOIS_TOIT, PORTE, CUIVRE, CUIVRE_F, CORDAGE, TOILE, TOILE_B, BLEU,
  MOUSSE, VITRE, BLASON,
} from '../navire-coque/forme.js';

const F = { tint: 0 };
const W = (z) => station(z).W;
// x du bordage au flanc s, à la hauteur y
const flanc = (s, z, y) => s * demiLargeur(station(z), y);
const cotes = (o) => (o.leger ? 6 : 10);

// --- hélices de poupe : nacelle de cuivre fuselée (axe Z), deux bras vers la coque, pales de bois aux bouts
// de cuivre qui tournent autour de Z ------------------------------------------------------------------------
const HELICES = [-1, 1].map((s) => ({ s, x: s * 4.4, y: 7.0, z0: POUPE + 1.2, z1: POUPE - 2.2, r: 2.6 }));
function nacelle(b, o, { s, x, y, z0, z1 }) {
  const L = z0 - z1;
  const prof = [[0.25, 0], [0.6, 0.3], [0.85, 0.9], [0.9, L - 1.0], [0.7, L - 0.2], [0.3, L]];
  b.add(G.lathe(prof, cotes(o)).clone().rotateX(Math.PI / 2), CUIVRE, { p: [x, y, z1], id: o.idCuivre, ...F });
  if (!o.leger) for (const t of [0.9, L - 1.0]) b.add(G.lathe([[0.9, 0], [0.97, 0], [0.97, 0.16], [0.9, 0.16]], cotes(o)).clone().rotateX(Math.PI / 2), CUIVRE_F, { p: [x, y, z1 + t], id: o.idCuivre, ...F });
  // bras vers la coque (au-dessus et au-dessous de la nacelle)
  for (const dy of [0.6, -0.6]) {
    const yb = y + dy * 2.2;
    barre(b, POUTRE_F, [x - s * 0.5, y + dy, z0 - 0.8], [flanc(s, z0 - 0.4, yb) - s * 0.1, yb, z0 - 0.4], oc(o, 0.2, 0.2, 0.05), { id: o.idBois });
  }
}
function pales(o, s, r) {
  const b = new Builder(o.idBois);
  b.add(G.sphere(0.36, o.leger ? 6 : 10, o.leger ? 4 : 8), CUIVRE_F, { id: o.idCuivre, ...F });
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    const L = r - 0.45;
    // pale vrillée (de 0,35 rad autour de son axe), puis tournée autour de l'axe de l'hélice
    const g = prisme(oc(o, 0.6, 0.1, 0.03), L).clone().rotateY(s * 0.35).rotateZ(a);
    b.add(g, BOIS_TOIT, { p: [-Math.sin(a) * (0.3 + L / 2), Math.cos(a) * (0.3 + L / 2), 0], id: o.idBois, ...F });
    if (o.leger) continue;
    const bout = prisme(oc(o, 0.64, 0.14, 0.04), 0.45).clone().rotateY(s * 0.35).rotateZ(a);
    b.add(bout, CUIVRE, { p: [-Math.sin(a) * (r - 0.3), Math.cos(a) * (r - 0.3), 0], id: o.idCuivre, ...F });
  }
  return b;
}

// --- rotors sur le dos du château : mât de bois, boîtier de cuivre, quatre pales horizontales (autour de Y),
// sous la voile du mât d'artimon et hors des maisons de poupe --------------------------------------------
const ROTORS = [-1, 1].map((s) => ({ s, x: s * 5.6, z: -30.6, h: 5.0, r: 2.0 }));
function rotorMat(b, o, { x, z, h }) {
  const y0 = pont(z);
  b.add(prisme(oc(o, 0.24, 0.24, 0.06), h - 0.35), POUTRE_F, { p: [x, y0 + (h - 0.35) / 2, z], id: o.idBois, ...F });
  b.add(G.lathe([[0.18, 0], [0.42, 0.1], [0.42, 0.42], [0.2, 0.55]], cotes(o)), CUIVRE, { p: [x, y0 + h - 0.6, z], id: o.idCuivre, ...F });
}
function rotor(o, r) {
  const b = new Builder(o.idBois);
  b.add(G.cyl(0.14, 0.2, 0.3, cotes(o)), CUIVRE_F, { id: o.idCuivre, ...F });
  for (let k = 0; k < 4; k++) b.add(prisme(oc(o, r - 0.15, 0.36, 0.06), 0.06).clone().translate((r - 0.15) / 2 + 0.15, 0, 0).rotateY((k * Math.PI) / 2), BOIS_TOIT, { p: [0, 0.12, 0], id: o.idBois, ...F });
  return b;
}

// --- cordes à linge le long des flancs : [flanc, z0, z1, y, écart au bordage] (d'un tuyau à une
// échauguette, d'une maisonnette à un tuyau, BAT-020) --------------------------------------------------------
const LINGES = [[-1, -14.3, -19.6, 14.6, 1.0], [1, -15.3, -19.6, 14.6, 1.0], [-1, 7.0, 11.7, 12.6, 1.0]];
const LINGE = [TOILE, BLEU, TOILE_B, MOUSSE, BLASON, CUIVRE_F];
function linge(b, o, [s, z0, z1, y, ecart], k0) {
  const pt = (t) => {
    const z = z0 + (z1 - z0) * t;
    return [s * (W(z) + ecart), y - 0.45 * Math.sin(Math.PI * t), z];
  };
  const n = 4;
  for (let i = 0; i < n; i++) barre(b, CORDAGE, pt(i / n), pt((i + 1) / n), rect(0.04, 0.04), { id: o.idCorde });
  const pieces = Math.round(Math.abs(z1 - z0) / (o.leger ? 1.6 : 0.85));
  for (let i = 1; i < pieces; i++) {
    const [x, yy, z] = pt(i / pieces);
    const [h, l] = [0.45 + o.rand() * 0.4, 0.35 + o.rand() * 0.3];
    b.add(prisme(rect(0.04, l), h), LINGE[(k0 + i) % LINGE.length], { p: [x, yy - h / 2 - 0.02, z], r: [0, 0, s * (o.rand() - 0.5) * 0.15], id: o.idMur, ...F });
  }
}

// --- étagères de tonneaux et de caisses, sur deux consoles, entre les hublots : [flanc, z] -----------------
const ETAGERES = [[1, -7], [1, 5], [-1, -1]];
function tonneau(b, o, x, y, z) {
  b.add(G.lathe([[0.3, 0], [0.37, 0.2], [0.39, 0.4], [0.37, 0.6], [0.3, 0.8]], cotes(o)), BOIS_TOIT, { p: [x, y, z], id: o.idBois, ...F });
  if (o.leger) return;
  for (const t of [0.14, 0.62]) b.add(G.lathe([[0.37, 0], [0.4, 0], [0.4, 0.05], [0.37, 0.05]], cotes(o)), CUIVRE_F, { p: [x, y + t, z], id: o.idCuivre, ...F });
}
function etagere(b, o, [s, z]) {
  const y = pontPrincipal(z) - 0.9;
  const [xa, xb] = [s * (W(z) - 0.1), s * (W(z) + 1.3)];
  b.add(prisme(oc(o, 1.45, 3.0, 0.05), 0.14), POUTRE_F, { p: [(xa + xb) / 2, y - 0.07, z], id: o.idBois, ...F });
  if (!o.leger) for (const dz of [-1.1, 1.1]) barre(b, POUTRE_F, [flanc(s, z + dz, y - 1.1), y - 1.1, z + dz], [xb - s * 0.1, y - 0.12, z + dz], rect(0.13, 0.13), { id: o.idBois });
  // garde-fou de corde au bord, trois tonneaux et une caisse
  barre(b, CORDAGE, [xb, y + 0.5, z - 1.45], [xb, y + 0.5, z + 1.45], rect(0.05, 0.05), { id: o.idCorde });
  for (const dz of [-1.0, -0.2, 0.6]) tonneau(b, o, (xa + xb) / 2 + s * 0.05, y, z + dz);
  b.add(prisme(oc(o, 0.6, 0.55, 0.05), 0.5), PORTE, { p: [(xa + xb) / 2, y + 0.25, z + 1.15], r: [0, 0.3, 0], id: o.idBois, ...F });
}

// --- ancres de la proue contre le bordage, chaîne qui sort de l'écubier --------------------------------------
const ANCRES = [-1, 1].map((s) => ({ s, z: 20.5 }));
function ancre(b, o, { s, z }) {
  const yt = pontPrincipal(z) - 1.3;
  const yb = yt - 2.6;
  const x = (y) => flanc(s, z, y) + s * 0.18;
  const prof = oc(o, 0.18, 0.18, 0.05);
  barre(b, POUTRE_F, [x(yt), yt, z], [x(yb), yb, z], prof, { id: o.idBois });
  // jas en travers, en haut ; bras en V et pattes en bas
  barre(b, POUTRE_F, [x(yt - 0.3), yt - 0.3, z - 0.8], [x(yt - 0.3), yt - 0.3, z + 0.8], prof, { id: o.idBois });
  for (const e of [-1, 1]) {
    const pb = [x(yb + 0.75), yb + 0.75, z + e * 0.85];
    barre(b, CUIVRE_F, [x(yb), yb, z], pb, prof, { id: o.idCuivre });
    b.add(prisme(oc(o, 0.4, 0.1, 0.03), 0.4), CUIVRE_F, { p: pb, id: o.idCuivre, ...F });
  }
  // chaîne : de l'écubier (à l'avant, sous la lisse) à l'organeau, maillons alternés
  const A = [x(lisse(z + 1.6) - 1.0), lisse(z + 1.6) - 1.0, z + 1.6];
  const B = [x(yt + 0.1), yt + 0.1, z];
  b.add(G.cyl(0.2, 0.2, 0.12, cotes(o)).clone().rotateZ(Math.PI / 2), CUIVRE_F, { p: A, id: o.idCuivre, ...F });
  if (o.leger) {
    barre(b, CUIVRE_F, A, B, rect(0.08, 0.08), { id: o.idCuivre });
    return;
  }
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - 0.25 * Math.sin(Math.PI * t), A[2] + (B[2] - A[2]) * t];
    b.add(prisme(rect(i % 2 ? 0.05 : 0.16, i % 2 ? 0.16 : 0.05), 0.2), CUIVRE_F, { p, r: [Math.atan2(B[2] - A[2], A[1] - B[1]), 0, 0], id: o.idCuivre, ...F });
  }
}

// --- lanternes pendues sous les échauguettes (BAT-020 : cul-de-lampe à lisse − 2,7 m, à W + 0,5) -----------
const LANTERNES = [[-1, CHATEAU - 0.9], [1, CHATEAU - 0.9], [-1, GAILLARD + 0.9], [1, GAILLARD + 0.9]];
function lanterne(b, o, [s, z]) {
  const x = s * (W(z) + 0.5);
  const y = lisse(z) - 3.3;
  barre(b, CUIVRE_F, [x, y + 0.6, z], [x, y + 0.3, z], rect(0.04, 0.04), { id: o.idCuivre });
  b.add(G.cone(0.22, 0.2, 6), CUIVRE_F, { p: [x, y + 0.2, z], id: o.idCuivre, ...F });
  b.add(prisme(rect(0.24, 0.24), 0.32), VITRE, { p: [x, y - 0.06, z], id: o.idMur, ...F });
  b.add(prisme(rect(0.3, 0.3), 0.05), CUIVRE_F, { p: [x, y - 0.24, z], id: o.idCuivre, ...F });
}

export function navireMachinerie(p) {
  const b = new Builder();
  const o = { rand: mulberry32(2021), leger: p.v === 1, idMur: b.defaultId, idBois: nextId(), idCuivre: nextId(), idCorde: nextId() };
  const anim = [];
  for (const h of HELICES) {
    nacelle(b, o, h);
    anim.push({ builder: pales(o, h.s, h.r), pivot: [h.x, h.y, h.z1 - 0.15], axis: 'z', speed: h.s * 4.5, wind: false });
  }
  for (const r of ROTORS) {
    rotorMat(b, o, r);
    anim.push({ builder: rotor(o, r.r), pivot: [r.x, pont(r.z) + r.h - 0.05, r.z], axis: 'y', speed: r.s * 3.2, wind: false });
  }
  LINGES.forEach((l, k) => linge(b, o, l, k * 2));
  for (const e of ETAGERES) etagere(b, o, e);
  for (const a of ANCRES) ancre(b, o, a);
  if (!o.leger) for (const l of LANTERNES) lanterne(b, o, l);
  return { solid: b, anim, obstacles: lire(physique.obstacles, p), decks: lire(physique.planchers, p) };
}

export default fiche('BAT-021', 'navire-machinerie', 'Hélices et encombrement du navire', part('navire_machinerie'), {
  variants: [
    { label: 'Hélices et encombrement', params: { v: 0 } },
    { label: 'Hélices et encombrement, allégé (au loin)', params: { v: 1 } },
  ],
  // budget pris le 01/11/2026 sur la marge des ≈ 60 000 triangles accordés pour la forteresse-navire
  // (26/10/2026) : 5 000 de près, 1 600 allégé, pales comprises
  budget: { triangles: 5000, lod: 1600 },
  tags: ['plateau', 'forteresse', 'animé'],
});
