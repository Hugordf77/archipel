// Tourelle du navire-forteresse (BAT-016), pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md §6.3), dans la DA du moulin-tour BAT-013 : socle de pierre tourné percé
// d'une porte (+Z), couronne de consoles qui porte le fût en encorbellement (enduit crème, poteaux et
// lisses de bois, trois fenêtres à croisillons), corniche. Deux formes (paramètre forme) : 0 toit conique
// d'ardoise bleue très pointu, au galbe évasé, épi et flamme bleue ; 1 (proue) coupole de cuivre à côtes et
// lanterne vitrée. Profils tournés à 16 côtés (8 au loin). Variante v 1 : version allégée.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { SOCLE, FUT } from './physique.js';
import {
  tris, prisme, rect, oc, fenetre, porte, poser, flamme,
  ENDUIT, POUTRE, POUTRE_F, BLEU, BLEU_F, CUIVRE, CUIVRE_F, VITRE, PIERRES,
} from '../navire-coque/forme.js';

const F = { tint: 0 };
const cotes = (o) => (o.leger ? 8 : 16);
// anneau tourné de section rectangulaire : rayons r0 à r1, de y à y + h
const anneau = (o, r0, r1, y, h) => G.lathe([[r0, y], [r1, y], [r1, y + h], [r0, y + h]], cotes(o));
// une face plane posée sur le fût, à l'angle a (0 : +Z), au rayon r
function surFut(b, o, a, r, dessiner) {
  const f = new Builder(o.idBois);
  dessiner(f);
  poser(b, f, a, Math.sin(a) * r, Math.cos(a) * r);
}

// --- socle, consoles, fût, corniche -----------------------------------------------------------------
function corps(b, o) {
  const { r: rs, h: hs } = SOCLE;
  const { r, y0, y1 } = FUT;
  // socle de pierre : empattement, cordon, porte de 1,6 m sur +Z
  b.add(G.lathe([[rs + 0.12, 0], [rs + 0.12, 0.3], [rs, 0.42], [rs, hs]], cotes(o)), PIERRES[1], { id: o.idMur, ...F });
  surFut(b, o, 0, rs, (f) => porte(f, 0, 0.25, 0.9, 1.6, o));
  // couronne de consoles qui descendent le long du socle (profil en équerre à pied coupé, ≈ 1 m de haut),
  // tous les 36° sauf au-dessus de la porte ; plancher de l'encorbellement
  const saillie = r - rs + 0.07;
  const profil = [[0, 1.1], [0, y0 - 0.2], [saillie, y0 - 0.2], [saillie, y0 - 0.45]];
  const n = 10;
  for (let i = 1; i < n; i += o.leger ? 2 : 1) {
    const a = (i / n) * Math.PI * 2;
    const g = prisme(profil, 0.2).clone().rotateX(-Math.PI / 2).rotateY(a - Math.PI / 2);
    b.add(g, POUTRE_F, { p: [Math.sin(a) * (rs - 0.03), 0, Math.cos(a) * (rs - 0.03)], id: o.idBois, ...F });
  }
  b.add(anneau(o, rs - 0.1, r + 0.12, y0 - 0.2, 0.2), POUTRE_F, { id: o.idBois, ...F });
  // fût enduit, lisses basse et haute, poteaux
  b.add(G.lathe([[r, y0], [r, y1]], cotes(o)), ENDUIT, { id: o.idMur, ...F });
  for (const y of o.leger ? [y1 - 0.18] : [y0 + 0.02, (y0 + y1) / 2 - 0.09, y1 - 0.18]) b.add(anneau(o, r, r + 0.07, y, 0.18), POUTRE, { id: o.idBois, ...F });
  const np = o.leger ? 6 : 8;
  for (let i = 0; i < np; i++) {
    const a = (i / np) * Math.PI * 2 + Math.PI / np;
    b.add(prisme(o.leger ? rect(0.16, 0.12) : oc(o, 0.16, 0.12, 0.04), y1 - y0), POUTRE_F, { p: [Math.sin(a) * (r + 0.04), (y0 + y1) / 2, Math.cos(a) * (r + 0.04)], r: [0, a, 0], id: o.idBois, ...F });
  }
  // trois fenêtres entre les poteaux : au-dessus de la porte (panneau haut) et à ± 135° (panneau bas)
  for (const a of [0, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) surFut(b, o, a, r, (f) => fenetre(f, 0, a ? 3.5 : 5.6, 0.7, 0.9, o));
  // corniche
  b.add(anneau(o, r - 0.05, r + 0.25, y1, 0.22), POUTRE_F, { id: o.idBois, ...F });
}

// --- toits ------------------------------------------------------------------------------------------
// toit conique d'ardoise très pointu, au galbe évasé (coyau), larmier, épi et flamme
function toitPointu(b, o) {
  const y = FUT.y1 + 0.22;
  const re = FUT.r + 0.45;
  const h = 5.6;
  b.add(G.cyl(re, re, 0.12, cotes(o)), BLEU_F, { p: [0, y + 0.06, 0], id: o.idToit, ...F });
  b.add(G.lathe([[re, 0.1], [re - 0.18, 0.32], [1.5, 1.5], [0.72, 3.5], [0.14, 5.2], [0.02, h]], cotes(o)), BLEU, { p: [0, y, 0], id: o.idToit, ...F });
  const yt = y + h;
  b.add(G.cyl(0.05, 0.06, 1.7, 8), POUTRE_F, { p: [0, yt + 0.7, 0], id: o.idBois, ...F });
  if (!o.leger) b.add(G.sphere(0.13, 10, 8), POUTRE, { p: [0, yt + 0.1, 0], id: o.idBois, ...F });
  b.addBuilt(flamme(o, 2.2, 0.5), { p: [0.05, yt + 1.3, 0] });
}
// coupole de cuivre à côtes et lanterne vitrée
function coupole(b, o) {
  const y = FUT.y1 + 0.22;
  const [a, h, rl] = [FUT.r + 0.25, 2.0, 0.6];
  // profil en quart d'ellipse, de la corniche au collet de la lanterne
  const n = o.leger ? 3 : 6;
  const tf = Math.acos(rl / a);
  const prof = Array.from({ length: n + 1 }, (_, i) => {
    const t = (tf * i) / n;
    return [a * Math.cos(t), h * Math.sin(t)];
  });
  b.add(G.lathe(prof, cotes(o)), CUIVRE, { p: [0, y, 0], id: o.idToit, ...F });
  const top = y + prof[n][1];
  // six côtes continues le long des méridiens (de près) : nervure de 0,12 m de large et 0,07 m de saillie
  // qui suit chaque point du profil (dessus et deux joues, aucun joint)
  if (!o.leger) {
    const T = [];
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const pts = prof.map(([pr, py], i) => {
        const t = (tf * i) / n;
        const [nr, ny] = [Math.cos(t) / a, Math.sin(t) / h];
        const l = Math.hypot(nr, ny);
        const d = Math.min(0.06 / pr, 0.25);
        const P = (off, s) => {
          const rr = pr + (nr / l) * off;
          return new THREE.Vector3(Math.sin(ang + s * d) * rr, y + py + (ny / l) * off, Math.cos(ang + s * d) * rr);
        };
        return { bg: P(-0.01, -1), bd: P(-0.01, 1), hg: P(0.07, -1), hd: P(0.07, 1), n: new THREE.Vector3(Math.sin(ang) * nr, ny, Math.cos(ang) * nr) };
      });
      for (let i = 0; i < n; i++) {
        const [p, q] = [pts[i], pts[i + 1]];
        const cote = (s) => new THREE.Vector3(Math.cos(ang) * s, 0, -Math.sin(ang) * s);
        T.push([p.hg, p.hd, q.hd, p.n], [p.hg, q.hd, q.hg, p.n]);
        T.push([p.bg, p.hg, q.hg, cote(-1)], [p.bg, q.hg, q.bg, cote(-1)]);
        T.push([p.bd, q.bd, q.hd, cote(1)], [p.bd, q.hd, p.hd, cote(1)]);
      }
    }
    b.add(tris(T), CUIVRE_F, { id: o.idToit, ...F });
  }
  // lanterne : collet, vitrage, montants, chapeau, boule
  b.add(anneau(o, 0.2, rl + 0.08, top - 0.05, 0.16), CUIVRE_F, { id: o.idToit, ...F });
  b.add(G.cyl(rl - 0.05, rl - 0.05, 1.0, 8), VITRE, { p: [0, top + 0.6, 0], id: o.idMur, ...F });
  const nm = o.leger ? 4 : 6;
  for (let k = 0; k < nm; k++) {
    const ang = ((k + 0.5) / nm) * Math.PI * 2;
    b.add(prisme(rect(0.07, 0.07), 1.0), POUTRE_F, { p: [Math.sin(ang) * (rl - 0.03), top + 0.6, Math.cos(ang) * (rl - 0.03)], id: o.idBois, ...F });
  }
  b.add(G.cone(rl + 0.22, 0.75, 8), CUIVRE_F, { p: [0, top + 1.45, 0], id: o.idToit, ...F });
  if (!o.leger) b.add(G.sphere(0.16, 10, 8), CUIVRE, { p: [0, top + 1.9, 0], id: o.idToit, ...F });
}

// --- assemblage -------------------------------------------------------------------------------------
export function navireTourelle(p) {
  const b = new Builder();
  const k = Math.min(1, Math.max(0, Math.round(p.forme ?? 0)));
  const o = { rand: mulberry32(2016 + 977 * k), leger: p.v === 1, idMur: b.defaultId, idBois: nextId(), idToit: nextId() };
  corps(b, o);
  (k ? coupole : toitPointu)(b, o);
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

export default fiche('BAT-016', 'navire-tourelle', 'Tourelle du navire-forteresse', part('navire_tourelle', { forme: 0 }), {
  variants: [
    { label: 'Toit d\'ardoise', params: { forme: 0, v: 0 } },
    { label: 'Toit d\'ardoise, allégée (au loin)', params: { forme: 0, v: 1 } },
    { label: 'Coupole de cuivre (proue)', params: { forme: 1, v: 0 } },
    { label: 'Coupole de cuivre, allégée (au loin)', params: { forme: 1, v: 1 } },
  ],
  // budget accordé par l'utilisateur le 26/10/2026 (forteresse-navire, ≈ 60 000 en pièces) : 2 000 de
  // près, 800 allégé, pour chaque forme
  budget: { triangles: 2000, lod: 800 },
  tags: ['plateau', 'forteresse'],
});
