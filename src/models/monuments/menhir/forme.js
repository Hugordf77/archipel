// Pierre levée (menhir, montants de l'arche basse) : dalle de section « carré arrondi » (superellipse),
// qui s'amincit vers le haut et finit en sommet bombé, un peu en biseau. Surface lisse (sommets fusionnés,
// normales recalculées), sans arête vive. Repère : pied à y = 0, largeur le long de X, épaisseur le long
// de Z (faces larges vers ±Z).
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../../../render/builder.js';
import { vnoise } from '../../../world/home/terrain.js';
import { surface, patch } from '../../kit/formes.js';

// demi-largeur relative de la dalle à la hauteur relative t (1 au pied), et profil tourné du haut : sommet
// en « miche » (épaule ronde, dessus presque plat), jamais en pointe
function profil(effile, dome) {
  const t0 = 1 - dome;
  const pts = [[0, 0]];
  for (const t of [0, 0.12, 0.3, 0.5, 0.7, t0]) if (t <= t0) pts.push([1 - effile * t, t]);
  const r0 = 1 - effile * t0;
  for (let k = 1; k <= 4; k++) {
    const a = (k / 4) * (Math.PI / 2);
    pts.push([k === 4 ? 0 : r0 * Math.cos(a) ** 0.55, t0 + dome * Math.sin(a)]);
  }
  return pts;
}

// part de la hauteur prise par le sommet, pour qu'il reste rond : environ 0,8 fois la demi-largeur du haut
export const domeDe = ({ w, h, effile }) => Math.min(0.2, (0.8 * (w / 2) * (1 - effile * 0.85)) / h);

// w × h × d : largeur et épaisseur au pied, hauteur hors tout ; effile : amincissement au sommet (0 à 0,5) ;
// dome : part de la hauteur prise par le sommet bombé ; biseau : abaissement du sommet côté −X (part de h) ;
// bosse : relief doux de la taille (part de la demi-section) ; graine : relief propre à chaque pierre
export function pierreLevee({ w = 1, h = 3, d = 0.5, effile = 0.3, dome = 0.2, biseau = 0.06, bosse = 0.05, graine = 0, cotes = 20, n = 3 } = {}) {
  const g = G.lathe(profil(effile, dome).map(([r, t]) => [r, t * h]), cotes);
  const pos = g.attributes.position;
  const e = 2 / n;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const rho = Math.hypot(x, z);
    if (rho < 1e-6) continue;
    const c = x / rho;
    const s = z / rho;
    const relief = 1 + bosse * (vnoise(c * 1.6 + graine * 3.1, y * 0.9 + s * 1.3 + graine) - 0.5) * 2;
    const X = rho * Math.sign(c) * Math.abs(c) ** e * (w / 2) * relief;
    const Z = rho * Math.sign(s) * Math.abs(s) ** e * (d / 2) * relief;
    // sommet en biseau : le haut descend du côté −X
    const t = y / h;
    const Y = y - biseau * h * Math.max(0, (t - 0.6) / 0.4) * (0.5 - X / w);
    pos.setXYZ(i, X, Y, Z);
  }
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}

// mousse épousant la face +Z d'une pierre levée (tache lobée du kit, posée sur une surface qui suit la
// section de la dalle à la hauteur y) : x, y du centre (m, repère de la pierre), demi-tailles (m) en
// hauteur et en largeur, couleur fixe (tint 0)
export function mousse(b, forme, { x = 0, y, haut = 0.25, large = 0.2, graine = 1, couleur }) {
  const { w, h, d, effile } = forme;
  const k = 1 - effile * Math.min(1, y / h);
  const rad = [(w / 2) * k, 2.5, (d / 2) * k];
  // centre de la surface décalé de x : la tache part droit vers +Z (première demi-taille en hauteur)
  const surf = surface([x, y, 0], rad, 3);
  const vers = { add: (g, _c, o) => b.add(g, couleur, { ...o, tint: 0 }) };
  patch(vers, surf, [0, 0, 1], [haut / rad[1], Math.asin(Math.min(0.95, large / rad[0]))], graine, { lift: 0.018, seg: 16, couronnes: [0.5, 1], tol: 0.004 });
}

// Moellon couché (pierres du muret effondré, linteau de l'arche basse) : pierre allongée le long de X,
// de section « carré arrondi » (H de haut, D d'épaisseur), aux deux bouts arrondis ; anneaux espacés
// d'au plus pas m le long de la pierre (au plus deux entre les bouts). Centre à l'origine.
export function moellon(L, H, D, { bout = 0.22, pas = 0.45, bosse = 0.05, graine = 0, cotes = 10, n = 3.5 } = {}) {
  const e = Math.min(bout, L * 0.25);
  const nIn = Math.min(2, Math.max(0, Math.ceil((L - 2 * e) / pas) - 1));
  // bouts arrondis en trois anneaux (30°, 60°, 90°), pour un contour sans pans vu de près
  const bouts = [1, 2, 3].map((k) => [Math.sin((k * Math.PI) / 6), e * (1 - Math.cos((k * Math.PI) / 6))]);
  const xs = [[0, -L / 2], ...bouts.map(([r, dx]) => [r, -L / 2 + dx])];
  for (let k = 1; k <= nIn; k++) xs.push([1, -L / 2 + e + ((L - 2 * e) * k) / (nIn + 1)]);
  xs.push(...bouts.reverse().map(([r, dx]) => [r, L / 2 - dx]), [0, L / 2]);
  const g = G.lathe(xs, cotes);
  const pos = g.attributes.position;
  const ex = 2 / n;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const rho = Math.hypot(x, z);
    let X = 0;
    let Z = 0;
    if (rho > 1e-6) {
      const c = x / rho;
      const s = z / rho;
      const relief = 1 + bosse * (vnoise(c * 1.4 + graine * 2.3, y * 1.1 + s * 1.7 + graine) - 0.5) * 2;
      X = rho * Math.sign(c) * Math.abs(c) ** ex * (H / 2) * relief;
      Z = rho * Math.sign(s) * Math.abs(s) ** ex * (D / 2) * relief;
    }
    // axe du tour (Y) couché le long de X ; la section X devient la hauteur
    pos.setXYZ(i, y, -X, Z);
  }
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}
