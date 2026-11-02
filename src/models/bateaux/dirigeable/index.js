// Dirigeable (NAV-012) : décor qui vole vers 400 m au-dessus de l'archipel (src/world/ciel/Dirigeables.js),
// vu surtout de loin. Ballon allongé crème peint de deux bandes, quatre ailerons en croix à la poupe,
// nacelle de bois à cabine crème et toit coloré (quatre hublots par flanc), six câbles, deux moteurs de cuivre sur
// bras, hélices animées (tableau anim, comme les hélices du navire volant).
// Repère : pied sous la nacelle, nez du ballon vers +Z. Formes (paramètre forme) : 0 bandes terracotta et
// ailerons bleus, 1 l'inverse ; 2 ballon seul du navire volant (src/world/plateau/forteresse-navire.js),
// dans le repère du navire, avec ses câbles jusqu'aux lisses. Variante v 1 : version allégée, au loin.
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { WOOD, WOOD_D, ROPE, GLASS, bx, seg, lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { BALLON, NACELLE, Y_BALLON, NAVIRE } from './physique.js';

const F = { tint: 0 };
const CREME = ['#f6ead2', '#f8e3cf'];
const BANDE = ['#e39a78', '#7fb0cc'];
const AILE = ['#7fb0cc', '#e39a78'];
const CUIVRE = '#d9a066';

// rayon du ballon B ({ L, R, y }) à la fraction t de sa longueur (0 : poupe, 1 : nez) : nez rond, poupe
// effilée
function rayon(B, t) {
  const c = 0.6;
  const u = t < c ? (t - c) / c : (t - c) / (1 - c);
  return B.R * Math.sqrt(Math.max(0, 1 - u * u)) * (t < c ? 0.94 + 0.06 * t : 1);
}

// tronçon de ballon de t0 à t1 (profil tourné autour de l'axe du ballon)
function troncon(b, o, B, t0, t1, n, couleur) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    pts.push([Math.max(t === 0 || t === 1 ? 0 : 0.05, rayon(B, t)), (t - 0.5) * B.L]);
  }
  b.add(G.lathe(pts, o.leger ? 10 : 14), couleur, { p: [0, B.y, 0], r: [Math.PI / 2, 0, 0], id: o.idBallon, ...F });
}

// ballon peint de deux bandes, pointe de cuivre, ailerons ovales en croix à la poupe (enfoncés dans le
// ballon), à l'échelle de son rayon
function ballon(b, o, B, k) {
  const n = o.leger ? 0.5 : 1;
  // même identifiant pour les bandes : pas de trait d'encre aux raccords
  troncon(b, o, B, 0, 0.2, Math.ceil(6 * n), CREME[k]);
  troncon(b, o, B, 0.2, 0.27, 2, BANDE[k]);
  troncon(b, o, B, 0.27, 0.72, Math.ceil(8 * n), CREME[k]);
  troncon(b, o, B, 0.72, 0.79, 2, BANDE[k]);
  troncon(b, o, B, 0.79, 1, Math.ceil(7 * n), CREME[k]);
  const e = B.R / BALLON.R;
  if (!o.leger) b.add(G.sphere(0.7 * e, 10, 8), CUIVRE, { p: [0, B.y, B.L / 2 - 0.2 * e], id: o.idCuivre, ...F });
  const zA = -B.L / 2 + 7 * e;
  const rA = rayon(B, (7 * e) / B.L);
  for (let q = 0; q < 4; q++) {
    const a = (q * Math.PI) / 2;
    const d = rA + 2.2 * e;
    b.add(G.sphere(1, o.leger ? 8 : 10, 6), AILE[k], { p: [Math.sin(a) * d, B.y + Math.cos(a) * d, zA], r: [0, 0, -a], s: [0.35 * e, 3.6 * e, 5.4 * e], id: o.idAile, ...F });
  }
}

// forme 2 : ballon du navire volant et ses câbles, du ventre aux lisses
function ballonNavire(p, o) {
  const b = new Builder(o.idBallon);
  ballon(b, o, NAVIRE, 0);
  const yv = NAVIRE.y - NAVIRE.R * 0.88;
  for (const [z, w, y] of NAVIRE.ancrages) {
    for (const s of [-1, 1]) seg(b, ROPE, s * NAVIRE.R * 0.45, yv, z * 1.15, s * w, y, z, 0.16, 0.16, o.leger ? 3 : 5, { id: o.idCorde, ...F });
  }
  return { solid: b, obstacles: lire(physique.obstacles, p) };
}

// hélice : moyeu et trois pales, tournant autour de Z
function helice(o) {
  const b = new Builder(o.idCuivre);
  b.add(G.sphere(0.4, o.leger ? 6 : 10, o.leger ? 4 : 8), CUIVRE, { id: o.idCuivre, ...F });
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    b.add(bx(0.55, 2.0, 0.1, 0.04), WOOD_D, { p: [-Math.sin(a) * 1.25, Math.cos(a) * 1.25, 0], r: [0, 0.3, a], id: o.idNacelle, ...F });
  }
  return b;
}

export function dirigeable(p) {
  const b = new Builder();
  const o = { leger: p.v === 1, idBallon: b.defaultId, idNacelle: nextId(), idCuivre: nextId(), idCorde: nextId(), idAile: nextId() };
  if (Math.round(p.forme ?? 0) === 2) return ballonNavire(p, o);
  const k = Math.min(1, Math.max(0, Math.round(p.forme ?? 0)));
  ballon(b, o, { ...BALLON, y: Y_BALLON }, k);
  // nacelle : coque de bois arrondie, cabine crème, toit coloré
  const L = NACELLE.L;
  b.add(G.sphere(1, o.leger ? 10 : 14, o.leger ? 6 : 8), WOOD, { p: [0, 1.3, 0], s: [2.4, 1.3, L / 2], id: o.idNacelle, ...F });
  b.add(bx(4.0, 2.2, L - 3.4, 0.3), CREME[1 - k], { p: [0, 2.2, 0], id: o.idNacelle, ...F });
  b.add(bx(4.5, 0.45, L - 2.8, 0.2), BANDE[k], { p: [0, 3.4, 0], id: o.idNacelle, ...F });
  if (!o.leger) {
    for (const s of [-1, 1]) for (let w = 0; w < 4; w++) b.add(bx(0.12, 0.85, 1.3, 0.05), GLASS, { p: [s * 2.0, 2.45, -3.9 + w * 2.6], id: o.idNacelle, ...F });
  }
  // câbles du toit au ventre du ballon
  for (const s of [-1, 1]) {
    for (const z of o.leger ? [-4.5, 4.5] : [-5, 0, 5]) {
      seg(b, ROPE, s * 1.9, 3.5, z, s * 3.6, Y_BALLON - BALLON.R * 0.9, z * 1.7, 0.07, 0.07, o.leger ? 3 : 4, { id: o.idCorde, ...F });
    }
  }
  // moteurs : bras de bois, nacelle de cuivre ; hélices animées à l'arrière
  const anim = [];
  for (const s of [-1, 1]) {
    seg(b, WOOD_D, s * 1.9, 2.2, -3, s * 4.8, 2.4, -3, 0.18, 0.15, o.leger ? 5 : 8, { id: o.idNacelle, ...F });
    b.add(G.capsule(0.75, 2.4, o.leger ? 3 : 4, o.leger ? 8 : 12), CUIVRE, { p: [s * 5.3, 2.4, -3], r: [Math.PI / 2, 0, 0], id: o.idCuivre, ...F });
    anim.push({ builder: helice(o), pivot: [s * 5.3, 2.4, -5.1], axis: 'z', speed: s * 7, wind: false });
  }
  return { solid: b, anim, obstacles: lire(physique.obstacles, p) };
}

export default fiche('NAV-012', 'dirigeable', 'Dirigeable', part('dirigeable', { forme: 0 }), {
  variants: [
    { label: 'Bandes terracotta', params: { forme: 0, v: 0 } },
    { label: 'Bandes terracotta, allégé (au loin)', params: { forme: 0, v: 1 } },
    { label: 'Bandes bleues', params: { forme: 1, v: 0 } },
    { label: 'Bandes bleues, allégé (au loin)', params: { forme: 1, v: 1 } },
    { label: 'Ballon du navire volant', params: { forme: 2, v: 0 } },
    { label: 'Ballon du navire volant, allégé (au loin)', params: { forme: 2, v: 1 } },
  ],
  tags: ['ciel', 'animé'],
});
