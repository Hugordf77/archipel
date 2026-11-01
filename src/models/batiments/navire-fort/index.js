// Habillage de forteresse du navire (BAT-020), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md), ajoutée le 01/11/2026 à la demande de l'utilisateur (« que ça fasse
// vraiment forteresse, style château ambulant »). Posée à l'origine du navire, dans son repère, et calée
// sur la coque BAT-014 (navire-coque/physique.js) : échauguettes en encorbellement aux angles du château et
// du gaillard, créneaux de bois sur la crête des pavois, maisonnettes à pans de bois accrochées aux flancs
// sur des consoles, tuyaux de cuivre coudés qui sortent de la coque et montent au-dessus du pavois.
// Variante v 1 : version allégée.
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique from './physique.js';
import { station, demiLargeur, pontPrincipal, lisse, CHATEAU, GAILLARD, TRONCONS, OUVERTURE } from '../navire-coque/physique.js';
import {
  prisme, rect, oc, barre, fenetre, panDeBois, poser,
  ENDUIT, POUTRE, POUTRE_F, BLEU, BLEU_F, CUIVRE, CUIVRE_F, MOUSSE,
} from '../navire-coque/forme.js';

const F = { tint: 0 };
const W = (z) => station(z).W;
const cotes = (o) => (o.leger ? 8 : 10);
const anneau = (o, r0, r1, y, h) => G.lathe([[r0, y], [r1, y], [r1, y + h], [r0, y + h]], cotes(o));

// --- échauguettes : fût enduit sur un cul-de-lampe de bois, toit conique d'ardoise -------------------
// [flanc, z] : angles du château (côté pont) et du gaillard
const ECHAUGUETTES = [[-1, CHATEAU - 0.9], [1, CHATEAU - 0.9], [-1, GAILLARD + 0.9], [1, GAILLARD + 0.9]];
const R_ECH = 0.85;
function echauguette(b, o, s, z) {
  const yl = lisse(z);
  const cx = s * (W(z) + 0.5);
  const [y0, y1] = [yl - 1.0, yl + 1.5];
  const p = [cx, 0, z];
  // cul-de-lampe en tronc de cône renversé, collé au bordage
  b.add(G.lathe([[0.12, y0 - 1.7], [0.35, y0 - 1.45], [R_ECH + 0.06, y0 - 0.12], [R_ECH + 0.06, y0]], cotes(o)), POUTRE_F, { p, id: o.idBois, ...F });
  b.add(G.lathe([[R_ECH, y0], [R_ECH, y1]], cotes(o)), ENDUIT, { p, id: o.idMur, ...F });
  b.add(anneau(o, R_ECH, R_ECH + 0.07, y1 - 0.16, 0.16), POUTRE, { p, id: o.idBois, ...F });
  // fenêtre tournée vers le large
  const f = new Builder(o.idBois);
  fenetre(f, 0, yl + 0.45, 0.45, 0.7, o);
  poser(b, f, (s * Math.PI) / 2, cx + s * R_ECH, z);
  // toit conique d'ardoise au galbe évasé, larmier, épi
  const yt = y1 + 0.02;
  b.add(G.cyl(R_ECH + 0.28, R_ECH + 0.28, 0.1, cotes(o)), BLEU_F, { p: [cx, yt + 0.05, z], id: o.idToit, ...F });
  b.add(G.lathe([[R_ECH + 0.28, 0.08], [R_ECH + 0.12, 0.26], [0.55, 1.0], [0.12, 1.95], [0.02, 2.15]], cotes(o)), BLEU, { p: [cx, yt, z], id: o.idToit, ...F });
  if (!o.leger) b.add(G.cyl(0.04, 0.05, 0.7, 6), POUTRE_F, { p: [cx, yt + 2.35, z], id: o.idBois, ...F });
}

// --- créneaux : merlons de bois sur la crête du pavois, sauf à l'ouverture de l'escalier, près des
// échauguettes et sur la pointe effilée de la proue ; au loin, un merlon sur deux -------------------------
const PAS_MERLON = 1.8;
function creneaux(b, o) {
  for (const [z0, z1] of TRONCONS) {
    for (const s of [-1, 1]) {
      for (let z = Math.max(z0, -31) + 0.7; z < Math.min(z1, 29.5) - 0.4; z += o.leger ? 2 * PAS_MERLON : PAS_MERLON) {
        if (s > 0 && z > OUVERTURE[0] - 0.6 && z < OUVERTURE[1] + 0.6) continue;
        if (ECHAUGUETTES.some(([se, ze]) => se === s && Math.abs(z - ze) < 1.5)) continue;
        const pente = (W(z + 0.2) - W(z - 0.2)) / 0.4;
        b.add(prisme(oc(o, 0.36, 0.7, 0.06), 0.55), POUTRE_F, { p: [s * (W(z) - 0.15), lisse(z) + 0.37, z], r: [0, Math.atan2(s * pente, 1), 0], id: o.idBois, ...F });
      }
    }
  }
}

// --- maisonnettes accrochées aux flancs : caisson enduit à pans de bois, plancher sur consoles, appentis
// d'ardoise contre la coque ; [flanc, z, longueur, profondeur, hauteur, pied sous le pont principal], hors
// des hublots (navire-coque/index.js, HUBLOTS) et de l'escalier (flanc +X, z −7,2 → 12,8)
const MAISONNETTES = [[-1, -26, 4.2, 1.8, 2.6, 1.0], [1, -27, 3.6, 1.6, 2.4, 1.0], [-1, 4.8, 4.0, 1.8, 2.6, 2.8], [1, 16.5, 3.6, 1.6, 2.4, 2.8]];
function maisonnette(b, o, [s, z, L, D, H, sous]) {
  const y0 = pontPrincipal(z) - sous;
  const xi = s * (W(z) - 0.25);
  const xo = s * (W(z) + D);
  const xm = (xi + xo) / 2;
  b.add(prisme(rect(D + 0.25, L), H), ENDUIT, { p: [xm, y0 + H / 2, z], id: o.idMur, ...F });
  b.add(prisme(oc(o, D + 0.45, L + 0.3, 0.06), 0.2), POUTRE_F, { p: [s * (W(z) + (D + 0.2) / 2 - 0.05), y0 - 0.1, z], id: o.idBois, ...F });
  // façade au large : deux fenêtres ; bouts : une fenêtre sur le bout tourné vers le milieu du navire
  const face = new Builder(o.idBois);
  panDeBois(face, L, y0, y0 + H, [{ x: -L / 4, w: 0.7, h: 0.9, yc: y0 + 1.4 }, { x: L / 4, w: 0.7, h: 0.9, yc: y0 + 1.4 }], o);
  poser(b, face, (s * Math.PI) / 2, xo, z);
  for (const e of [-1, 1]) {
    const bout = new Builder(o.idBois);
    panDeBois(bout, D + 0.25, y0, y0 + H, e * z < 0 ? [{ x: 0, w: 0.55, h: 0.8, yc: y0 + 1.45 }] : [], { ...o, sens: e > 0 ? 1 : 0 });
    poser(b, bout, e > 0 ? 0 : Math.PI, xm, z + (e * L) / 2);
  }
  // appentis d'ardoise : du bordage, 0,8 m au-dessus du caisson, au larmier qui déborde de 0,35 m
  const pente = Math.atan2(0.8, D + 0.6);
  b.add(prisme(oc(o, D + 0.7, L + 0.5, 0.05), 0.14), BLEU, { p: [s * (W(z) + (D + 0.35) / 2 - 0.1), y0 + H + 0.42, z], r: [0, 0, -s * pente], id: o.idToit, ...F });
  if (!o.leger) b.add(prisme(oc(o, 0.36, L + 0.4, 0.1), 0.24), MOUSSE, { p: [s * (W(z) - 0.12), y0 + H + 0.82, z], id: o.idToit, ...F });
  // consoles : de la coque, 1,8 m plus bas, au bord du plancher
  if (o.leger) return;
  const yc = y0 - 1.8;
  const xc = s * (demiLargeur(station(z), yc) - 0.05);
  for (const dz of [-L / 2 + 0.4, 0, L / 2 - 0.4]) barre(b, POUTRE_F, [xc, yc, z + dz], [s * (W(z) + D - 0.15), y0 - 0.2, z + dz], rect(0.16, 0.16), { id: o.idBois });
}

// --- tuyaux de cuivre : sortent de la coque à 2,5 m sous le pont, coude, montent au-dessus du pavois,
// pavillon évasé ; colliers et patte d'attache ----------------------------------------------------------
const TUYAUX = [[-1, -14], [-1, 12], [1, -15], [1, 25]];
const R_TUYAU = 0.24;
function tuyau(b, o, s, z) {
  const y = pontPrincipal(z) - 2.5;
  const xh = s * (demiLargeur(station(z), y) - 0.1);
  const xv = s * (W(z) + 0.9);
  const yh = lisse(z) + 1.5;
  const prof = oc(o, 2 * R_TUYAU, 2 * R_TUYAU, 0.07);
  barre(b, CUIVRE, [xh, y, z], [xv, y, z], prof, { id: o.idCuivre });
  barre(b, CUIVRE, [xv, y, z], [xv, yh, z], prof, { id: o.idCuivre });
  b.add(G.sphere(R_TUYAU + 0.02, o.leger ? 6 : 8, o.leger ? 4 : 6), CUIVRE, { p: [xv, y, z], id: o.idCuivre, ...F });
  b.add(G.lathe(o.leger ? [[R_TUYAU, 0], [0.46, 0.62], [0.3, 0.62]] : [[R_TUYAU - 0.04, 0], [R_TUYAU + 0.04, 0.12], [0.44, 0.5], [0.46, 0.62], [0.3, 0.62]], cotes(o)), CUIVRE_F, { p: [xv, yh, z], id: o.idCuivre, ...F });
  if (o.leger) return;
  b.add(anneau(o, R_TUYAU, R_TUYAU + 0.06, yh - 0.6, 0.12), CUIVRE_F, { p: [xv, 0, z], id: o.idCuivre, ...F });
  barre(b, POUTRE_F, [xv, lisse(z) - 0.6, z], [s * (W(z) - 0.05), lisse(z) - 0.6, z], rect(0.12, 0.12), { id: o.idBois });
}

export function navireFort(p) {
  const b = new Builder();
  const o = { rand: mulberry32(2020), leger: p.v === 1, idMur: b.defaultId, idBois: nextId(), idToit: nextId(), idCuivre: nextId() };
  for (const [s, z] of ECHAUGUETTES) echauguette(b, o, s, z);
  creneaux(b, o);
  for (const m of MAISONNETTES) maisonnette(b, o, m);
  for (const [s, z] of TUYAUX) tuyau(b, o, s, z);
  return { solid: b, obstacles: lire(physique.obstacles, p), decks: lire(physique.planchers, p) };
}

export default fiche('BAT-020', 'navire-fort', 'Habillage de forteresse du navire', part('navire_fort'), {
  variants: [
    { label: 'Habillage de forteresse', params: { v: 0 } },
    { label: 'Habillage de forteresse, allégé (au loin)', params: { v: 1 } },
  ],
  // budget pris le 01/11/2026 sur la marge des ≈ 60 000 triangles accordés pour la forteresse-navire
  // (26/10/2026) : 6 000 de près, 2 500 allégé
  budget: { triangles: 6000, lod: 2500 },
  tags: ['plateau', 'forteresse'],
});
