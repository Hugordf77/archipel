// Forteresse-navire du Plateau venté (BAT-014 à BAT-019) : formes communes de toutes les pièces du navire.
// Copies, sans changement de forme, des aides non exportées des modèles dont le navire reprend la DA
// (ces modèles ne doivent pas changer : leurs empreintes restent identiques) :
// - moulin-tour BAT-013 (batiments/moulin-tour/index.js, lignes 30 à 445) : facettes plates (tris, prisme,
//   rect, octo, oc, plaque, panZ, panX, pignonZ, pignonX, tronc, cadre, archivolte, coque,
//   segmentDisque), socle, barre, pans de bois (planche, fenetre, porte, panDeBois, poser, poteau, angles,
//   facesTronc) et toitMousse ;
// - nef effondrée MON-014 (monuments/ruines-alternative/forme.js) : hexa, coinsBoite, bloc, feuille,
//   touffe, mousse (rochers du berceau) ; la mousse des rochers y s'appelle MOUSSE, ici MOUSSE_ROC ;
// - toile de bannière de MON-014 (ruines-alternative/index.js), généralisée pour les voiles et les
//   flammes : couleurs, taille du blason, queue d'aronde et creux de voile en options (les valeurs par
//   défaut redonnent la bannière de la nef).
// Nouvelles aides : loft (coque par sections), plaqueBombee (calotte ovale de cuivre), hublot (anneau
// tourné), rivets (petits hexaèdres alignés, de près seulement).
// Contexte o : { rand (hasard reproductible), leger (version allégée), idBois, idMur, idToit
// (identifiants de contour) }.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { STONE_D, bx } from '../../kit/lieux.js';

// --- palette (docs/forteresse-navire/memory.md §9 ; aucun noir) ---------------------------------
// reprises de BAT-013 : enduit crème, poutres brun-orangé, mousse vert tendre des toits
export const ENDUIT = '#f4e4c6';
export const POUTRE = '#c07a45';
export const POUTRE_F = '#a5653b';
export const BOIS_TOIT = '#c98a52';
export const PORTE = '#ad6d40';
export const VITRE = '#a9bfcc';
export const TOILE = '#f7ecc8';
export const TOILE_B = '#f1e1b6';
export const MOUSSE = '#a9bf6c';
export const MOUSSE_C = '#bdd07f';
// reprises de MON-014 : ardoise et flammes bleues, blason, pierres et mousse des rochers, fougères
export const BLEU = '#3d6f90';
export const BLEU_F = '#355f7c';
export const BLASON = '#efe3c8';
export const PIERRES = ['#ddcfb8', '#d4c8b1', '#c9c3b6', '#b9b7af'];
export const MOUSSE_ROC = '#aab35c';
export const MOUSSE_ROC_F = '#7f9b55';
export const FEUILLES = ['#6d8e4e', '#7e9c56', '#93ad5f'];
// nouvelles (à valider sur la première planche) : bordages, plancher, cuivre, rivets, cordage (ROPE du
// kit), fumée
export const BORDAGE = '#b8875a';
export const BORDAGE_F = '#a3774f';
export const PONT = '#c98a52';
export const CUIVRE = '#cf8f5c';
export const CUIVRE_F = '#b97a4c';
export const RIVET = '#e2b07c';
export const CORDAGE = '#e9d8b4';
export const FUMEE = '#f4f1ea';
const F = { tint: 0 };

// --- géométries à facettes plates (BAT-013) -------------------------------------------------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _u = new THREE.Vector3();
const _w = new THREE.Vector3();
// triangles [a, b, c, n] : chacun est retourné si sa normale ne va pas dans le sens n voulu
export function tris(liste) {
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
export function prisme(profil, len, ouvert = false) {
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
export const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
// rectangle aux angles abattus (c) : section des poteaux, des dalles et des pans de toit
export const octo = (w, d, c) => [[-w / 2 + c, -d / 2], [w / 2 - c, -d / 2], [w / 2, -d / 2 + c], [w / 2, d / 2 - c], [w / 2 - c, d / 2], [-w / 2 + c, d / 2], [-w / 2, d / 2 - c], [-w / 2, -d / 2 + c]];
// section des dalles et faîtages : chanfreinée de près, rectangulaire en version allégée
export const oc = (o, w, d, c) => (o.leger ? rect(w, d) : octo(w, d, c));
// planche plaquée : face avant et deux chanfreins, dos ouvert contre le mur (z = 0 à d)
export const plaque = (w, d) => [[w / 2, 0], [w / 2 - d * 0.6, d], [-w / 2 + d * 0.6, d], [-w / 2, 0]];
// pan de toit : largeur w (pente), épaisseur e, longueur L le long de Z (panZ) ou de X (panX)
export const panZ = (w, e, L) => prisme(octo(w, e, Math.min(0.07, e * 0.35)), L).clone().rotateX(Math.PI / 2);
export const panX = (w, e, L) => prisme(octo(e, w, Math.min(0.07, e * 0.35)), L).clone().rotateZ(Math.PI / 2);
// pignon : triangle de base w et de hauteur h, épaisseur e, face vers ±Z (pignonZ) ou ±X (pignonX)
export const pignonZ = (w, h, e) => prisme([[-w / 2, 0], [w / 2, 0], [0, h]], e).clone().rotateX(-Math.PI / 2);
export const pignonX = (w, h, e) => pignonZ(w, h, e).rotateY(Math.PI / 2);
// tronc de pyramide carré (jupe du chapeau) : côtés b en bas et t en haut, hauteur h
export function tronc(b, t, h) {
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
export function cadre(W, H, t, d, leger = false) {
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
export function archivolte(r0, r1, e, seg) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, 0, Math.PI, false);
  s.lineTo(-r0, 0);
  s.absarc(0, 0, r0, Math.PI, 0, true);
  s.lineTo(r1, 0);
  return new THREE.ExtrudeGeometry(s, { depth: e, bevelEnabled: false, curveSegments: seg }).translate(0, 0, -e / 2);
}

// socle de pierre w × d, haut de h : boîte arrondie du kit (aucune arête vive), simple prisme au loin.
// De près, une dalle quadrillée (pas d'environ 0,5 m) repose sur son dessus : l'emprise que mesure
// mesure.mjs ne voit que des sommets, et sans elle l'intérieur passerait pour du vide
export function socle(b, w, d, h, x, z, leger) {
  b.add(leger ? prisme(rect(w, d), h) : bx(w, h, d, 0.07), STONE_D, { p: [x, h / 2, z], ...F });
  if (leger) return;
  const [nx, nz] = [Math.max(1, Math.round(w / 0.5)), Math.max(1, Math.round(d / 0.5))];
  b.add(new THREE.PlaneGeometry(w - 0.12, d - 0.12, nx, nz).rotateX(-Math.PI / 2), STONE_D, { p: [x, h + 0.005, z], ...F });
}
// barre de section prof (profil [[x, z]…]) du point A au point B
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _d = new THREE.Vector3();
const HAUT = new THREE.Vector3(0, 1, 0);
export function barre(b, col, A, B, prof, opts = {}) {
  _d.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
  const len = _d.length();
  _e.setFromQuaternion(_q.setFromUnitVectors(HAUT, _d.normalize()));
  b.add(prisme(prof, len), col, { p: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], r: [_e.x, _e.y, _e.z], ...F, ...opts });
}
// coque en arc de cercle (centre (0 ; 0), rayons r à r + e, de l'angle a0 à a1), extrudée sur p le long de Z
export function coque(r, e, a0, a1, p, seg) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r + e, a0, a1, false);
  s.absarc(0, 0, r, a1, a0, true);
  return new THREE.ExtrudeGeometry(s, { depth: p, bevelEnabled: false, curveSegments: seg });
}
// segment de disque (sous un arc de rayon r centré en (0 ; 0), de a0 à a1, fermé par la corde), épaisseur p
export function segmentDisque(r, a0, a1, p, seg) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, a0, a1, false);
  return new THREE.ExtrudeGeometry(s, { depth: p, bevelEnabled: false, curveSegments: seg });
}

// --- pans de bois (BAT-013) -----------------------------------------------------------------------
// repère d'une face : x le long de la face, y vers le haut, z vers l'extérieur, mur en z = 0
// planche plaquée de (x1, y1) à (x2, y2), largeur w, saillie d
export function planche(f, col, x1, y1, x2, y2, w = 0.12, d = 0.06) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  f.add(prisme(plaque(w, d), len, true), col, { p: [(x1 + x2) / 2, (y1 + y2) / 2, 0], r: [0, 0, Math.atan2(-(x2 - x1), y2 - y1)], ...F });
}
// baie vitrée encadrée : vitre, cadre, croisillon et appui (sauf version allégée)
export function fenetre(f, x, yc, w, h, o) {
  f.add(new THREE.PlaneGeometry(w - 0.1, h - 0.1), VITRE, { p: [x, yc, 0.012], id: o.idMur, ...F });
  f.add(cadre(w, h, 0.08, 0.075, o.leger), POUTRE, { p: [x, yc, 0], ...F });
  if (o.leger) return;
  f.add(prisme(plaque(0.045, 0.035), h - 0.12, true), POUTRE, { p: [x, yc, 0.012], ...F });
  f.add(prisme(plaque(0.045, 0.035), w - 0.12, true), POUTRE, { p: [x, yc + h * 0.12, 0.012], r: [0, 0, Math.PI / 2], ...F });
  f.add(prisme(rect(0.07, 0.13), w + 0.16), POUTRE_F, { p: [x, yc - h / 2 - 0.035, 0.065], r: [0, 0, Math.PI / 2], ...F });
}
// porte de planches encadrée, seuil à yb
export function porte(f, x, yb, w, h, o) {
  f.add(prisme(rect(w - 0.12, 0.04), h - 0.06), PORTE, { p: [x, yb + h / 2 - 0.03, 0.02], id: o.idMur, ...F });
  f.add(cadre(w, h, 0.09, 0.08, o.leger), POUTRE, { p: [x, yb + h / 2, 0], ...F });
  if (o.leger) return;
  for (const dx of [-w / 6, w / 6]) f.add(prisme(plaque(0.035, 0.02), h - 0.2, true), POUTRE_F, { p: [x + dx, yb + h / 2 - 0.05, 0.04], id: o.idMur, ...F });
}
// pan de bois d'une face de longueur L entre y0 et y1 : sablière basse, poteaux qui encadrent les baies,
// décharges dans les travées libres (sens alterné), baies : [{ x, w, h, yc }] ou [{ x, w, h, yb, porte }]
export function panDeBois(f, L, y0, y1, baies, o) {
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
// une face du repère local ajoutée au bâti, tournée de a autour de Y et posée à (x, z) ; inclinée de
// theta vers l'intérieur autour de son pied y0 (faces d'un tronc de pyramide)
export function poser(b, f, a, x, z, theta = 0, y0 = 0) {
  const g = f.build();
  if (theta) g.translate(0, -y0, 0).rotateX(-theta).translate(0, y0, 0);
  b.addBuilt(g, { p: [x, 0, z], r: [0, a, 0] });
}
// poteau d'angle (section chanfreinée, ou carrée en version allégée)
export function poteau(b, x, z, y0, y1, w, o) {
  b.add(prisme(o.leger ? rect(w, w) : octo(w, w, w * 0.25), y1 - y0), POUTRE_F, { p: [x, (y0 + y1) / 2, z], id: o.idBois, ...F });
}
// poteaux d'angle d'un tronc (côté s au pied y0, t en tête y1), section chanfreinée de w
export function angles(b, s, t, y0, y1, w, o) {
  const prof = o.leger ? rect(w, w) : octo(w, w, w * 0.25);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) barre(b, POUTRE_F, [(sx * s) / 2, y0, (sz * s) / 2], [(sx * t) / 2, y1, (sz * t) / 2], prof, { id: o.idBois });
}
// pans de bois des quatre faces d'un tronc, inclinées de atan((s − t) / 2h)
export function facesTronc(b, s, t, y0, y1, faces, o, sens = 0) {
  const theta = Math.atan((s - t) / (2 * (y1 - y0)));
  faces.forEach((baies, k) => {
    if (!baies) return;
    const f = new Builder(o.idBois);
    panDeBois(f, t + 0.02, y0, y1, baies, { ...o, sens: sens + k });
    const a = (k * Math.PI) / 2;
    poser(b, f, a, (Math.sin(a) * s) / 2, (Math.cos(a) * s) / 2, theta, y0);
  });
}
// toit de mousse à deux pans, faîtage le long de X (de x0 à x1), centré en zc, demi-largeur demi des murs
export function toitMousse(b, x0, x1, zc, demi, y1, faite, o) {
  const ev = demi + 0.32;
  const ang = Math.atan2(faite - y1, ev);
  const w = Math.hypot(ev, faite - y1) + 0.1;
  const L = x1 - x0 + 0.5;
  for (const sz of [-1, 1]) b.add(panX(w, 0.22, L), sz > 0 ? MOUSSE : MOUSSE_C, { p: [(x0 + x1) / 2, (y1 + faite) / 2 + 0.1, zc + (sz * ev) / 2], r: [sz * ang, 0, 0], id: o.idToit, ...F });
  b.add(prisme(oc(o, 0.3, 0.3, 0.1), L - 0.1).clone().rotateZ(Math.PI / 2), MOUSSE, { p: [(x0 + x1) / 2, faite + 0.17, zc], id: o.idToit, ...F });
}

// --- hexaèdre chanfreiné (MON-014) ----------------------------------------------------------------
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

export const teinte = (o) => PIERRES[Math.floor(o.rand() * PIERRES.length)];
const chanfrein = (L, H, D) => Math.min(0.075, Math.min(L, H, D) * 0.16);

// bloc posé : centre c, tailles, rotation r, couleur (au hasard dans la planche sinon)
export function bloc(b, o, { c, L, H, D, r = [0, 0, 0], couleur = teinte(o), jit, retrait = 0, casse = 0, plat = false, e }) {
  const coins = coinsBoite(L, H, D, o.rand, { jit: jit ?? Math.min(0.03, Math.min(L, H, D) * 0.06), retrait, casse });
  b.add(hexa(coins, e ?? chanfrein(L, H, D), o.leger, plat), couleur, { p: c, r, id: nextId(), ...F });
}

// --- mousse et fougères (MON-014) -----------------------------------------------------------------
// coussin de mousse sur le dessus d'un bloc (sommet { x0, x1, y, z, D }), coulure optionnelle sur la
// face avant
export function mousse(b, o, s, { couleur, coulure = true } = {}) {
  const { rand } = o;
  const L = (s.x1 - s.x0) * (0.55 + rand() * 0.35);
  const xm = s.x0 + (s.x1 - s.x0) * (0.3 + rand() * 0.4);
  const D = s.D * (0.7 + rand() * 0.2);
  const H = 0.07 + rand() * 0.04;
  const coul = couleur ?? (rand() < 0.65 ? MOUSSE_ROC : MOUSSE_ROC_F);
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

// --- toile : bannière de MON-014 généralisée (voiles, flammes) -------------------------------------
// toile de L × H pendue sous sa perche ou sa vergue (repère : axe de la perche à l'origine, toile dans le
// plan z, vers −Y), plis légers ; blason (anneau, tige, deux paires de feuilles) sur les deux faces.
// Options : face et dos (couleurs des deux faces ; par défaut le bleu de la nef), blason (couleur, ou null
// sans blason), ech (taille du blason ; 1 : celui de la bannière de la nef), encoche (profondeur de la
// queue d'aronde, 0 : bas droit), creux (creux de voile vers +Z au milieu, m ; s'ajoute aux plis), cols
// et rows (quadrillage de près ; moitié au loin, au moins 2 et 3), ourlet (couleur de l'ourlet du haut,
// ou null). Le balancement au vent (aSway, matériau des lieux) croît du haut vers le bas de la toile.
export function toile(o, L, H, { face = BLEU, dos = BLEU_F, blason = BLASON, ech = 1, encoche = 0.36, creux = 0, cols = 4, rows = 6, ourlet = BLEU_F } = {}) {
  const t = new Builder(nextId());
  const nc = o.leger ? Math.max(2, Math.ceil(cols / 2)) : cols;
  const nr = o.leger ? Math.max(3, Math.ceil(rows / 2)) : rows;
  const bas = (u) => H - encoche * (1 - Math.abs(2 * u - 1));
  const pli = (x, y) => 0.035 * Math.sin(((x + L / 2) / L) * Math.PI * 2 + (-y / H) * 1.5) * (0.3 - y / H)
    + creux * Math.sin(((x + L / 2) / L) * Math.PI) * Math.sin(Math.min(1, -y / H) * Math.PI * 0.85);
  const pt = (u, v) => [-L / 2 + u * L, -0.08 - v * (bas(u) - 0.08)];
  // les deux faces (épaisseur 2,4 cm), en quadrillage qui suit les plis
  const dessiner = (sens, couleur) => {
    const pos = [];
    for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, c]) => {
        const [x, y] = pt(a / nc, c / nr);
        return [x, y, pli(x, y) + sens * 0.012];
      });
      for (const k of sens > 0 ? [0, 3, 2, 0, 2, 1] : [0, 1, 2, 0, 2, 3]) pos.push(...q[k]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    t.add(g, couleur, F);
  };
  dessiner(1, face);
  dessiner(-1, dos);
  if (blason) {
    // blason : triangles 2D posés sur les plis, de part et d'autre de la toile
    const cy = -H * 0.42;
    const tr = [];
    const seg = o.leger ? 8 : 12;
    const [r0, r1] = [0.17 * ech, 0.21 * ech];
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2;
      const a1 = ((k + 1) / seg) * Math.PI * 2;
      const p = (r, a) => [Math.cos(a) * r, cy + Math.sin(a) * r];
      tr.push([p(r0, a0), p(r1, a0), p(r1, a1)], [p(r0, a0), p(r1, a1), p(r0, a1)]);
    }
    // tige, du bas de l'anneau jusqu'au-dessus (tronçons pour suivre les plis)
    const wt = 0.022 * ech;
    for (let k = 0; k < 4; k++) {
      const ya = cy + ech * (-0.42 + (0.72 * k) / 4);
      const yb = cy + ech * (-0.42 + (0.72 * (k + 1)) / 4);
      tr.push([[-wt, ya], [wt, ya], [wt, yb]], [[-wt, ya], [wt, yb], [-wt, yb]]);
    }
    // deux paires de feuilles lancéolées qui partent de la tige, une feuille au bout
    if (!o.leger) {
      for (const [y0, dx0, dy0] of [[-0.16, 0.27, 0.2], [0.02, 0.22, 0.2]]) {
        const [y, dx, dy] = [cy + y0 * ech, dx0 * ech, dy0 * ech];
        for (const s of [-1, 1]) {
          const a = [s * 0.015 * ech, y];
          const b = [s * dx, y + dy];
          const l = Math.hypot(dx, dy);
          const [nx, ny] = [(-dy / l) * 0.035 * ech, (dx / l) * 0.035 * ech];
          const m = [s * (dx * 0.5 + nx), y + dy * 0.5 + ny];
          const n = [s * (dx * 0.5 - nx), y + dy * 0.5 - ny];
          tr.push(s > 0 ? [a, n, b] : [a, b, n], s > 0 ? [a, b, m] : [a, m, b]);
        }
      }
      const e = ech;
      tr.push([[-0.05 * e, cy + 0.3 * e], [0.05 * e, cy + 0.3 * e], [0, cy + 0.44 * e]], [[-0.05 * e, cy + 0.3 * e], [0, cy + 0.22 * e], [0.05 * e, cy + 0.3 * e]]);
    }
    for (const sens of [1, -1]) {
      const pos = [];
      for (const tri of tr) {
        for (const k of sens > 0 ? [0, 1, 2] : [0, 2, 1]) {
          const [x, y] = tri[k];
          pos.push(x, y, pli(x, y) + sens * 0.02);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      t.add(g, blason, { id: t.defaultId, ...F });
    }
  }
  // ourlet du haut, qui enserre la perche
  if (ourlet) t.add(hexa(coinsBoite(L + 0.04, 0.12, 0.07, o.rand, { jit: 0.004 }), 0.02, o.leger), ourlet, { p: [0, -0.04, 0], ...F });
  const g = t.build();
  const sw = g.attributes.aSway.array;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) sw[i] = 2.2 * Math.min(1, Math.max(0, -pos.getY(i) / H));
  return g;
}

// --- nouvelles aides du navire --------------------------------------------------------------------
// loft : surface tendue entre des sections le long de Z (coque). stations : [{ z, … }] dans l'ordre des z
// croissants ; section(st, t) → [x, y] pour t de 0 à 1, n + 1 points par station. Une section qui va de
// −X à +X en passant par le bas donne des normales vers l'extérieur (inverser sinon). Normales lissées sur
// toute la surface ; bandes : nombre de rangées par bande de couleur (les bandes alternées des bordages
// suivent ainsi les lignes de la coque), une géométrie par bande (sommets dupliqués aux changements de
// bande, normales communes) ; 0 : une seule. Renvoie la liste des géométries (indexées).
export function loft(stations, n, section, { bandes = 0, inverser = false } = {}) {
  const m = stations.length;
  const pos = new Float32Array(m * (n + 1) * 3);
  stations.forEach((st, j) => {
    for (let i = 0; i <= n; i++) {
      const [x, y] = section(st, i / n);
      pos.set([x, y, st.z], (j * (n + 1) + i) * 3);
    }
  });
  // quadrillage de k points par rangée sur les m stations ; (P0, Q0, Q1) et (P0, Q1, P1)
  const indices = (k) => {
    const ix = [];
    for (let j = 0; j + 1 < m; j++) for (let i = 0; i + 1 < k; i++) {
      const a = j * k + i;
      const [b, c, d] = [a + 1, a + k, a + k + 1];
      ix.push(...(inverser ? [a, d, b, a, c, d] : [a, b, d, a, d, c]));
    }
    return ix;
  };
  const tout = new THREE.BufferGeometry();
  tout.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tout.setIndex(indices(n + 1));
  tout.computeVertexNormals();
  if (!bandes) return [tout];
  const nor = tout.attributes.normal.array;
  const out = [];
  for (let i0 = 0; i0 < n; i0 += bandes) {
    const i1 = Math.min(n, i0 + bandes);
    const k = i1 - i0 + 1;
    const p = new Float32Array(m * k * 3);
    const q = new Float32Array(m * k * 3);
    for (let j = 0; j < m; j++) for (let i = i0; i <= i1; i++) {
      const src = (j * (n + 1) + i) * 3;
      const dst = (j * k + i - i0) * 3;
      p.set(pos.subarray(src, src + 3), dst);
      q.set(nor.subarray(src, src + 3), dst);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(q, 3));
    g.setIndex(indices(k));
    out.push(g);
  }
  return out;
}

// calotte ovale bombée (plaque de cuivre rivetée) : ellipse L (le long de X) × H (le long de Y) dans le
// plan z = 0, flèche f vers +Z au centre, seg côtés ; le bord retombe en biseau jusqu'à z = −0,06 pour
// s'enfoncer dans la coque (pas de jour). Normales lissées.
export function plaqueBombee(L, H, f, seg = 16) {
  const anneaux = Math.max(2, Math.round(seg / 4));
  const pos = [0, 0, f];
  for (let r = 1; r <= anneaux; r++) {
    const u = r / anneaux;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      pos.push((Math.cos(a) * u * L) / 2, (Math.sin(a) * u * H) / 2, f * (1 - u * u));
    }
  }
  // biseau : un anneau un peu plus large, sous le plan
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    pos.push(Math.cos(a) * (L / 2 + 0.05), Math.sin(a) * (H / 2 + 0.05), -0.06);
  }
  const at = (r, k) => 1 + (r - 1) * seg + (k % seg);
  const idx = [];
  for (let k = 0; k < seg; k++) idx.push(0, at(1, k), at(1, k + 1));
  for (let r = 1; r <= anneaux; r++) {
    for (let k = 0; k < seg; k++) {
      const [a, b, c, d] = [at(r, k), at(r, k + 1), at(r + 1, k), at(r + 1, k + 1)];
      idx.push(a, c, d, a, d, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// hublot : cerclage tourné de rayon intérieur r (anneau arrondi en saillie de 0,11 m), axe le long de +Z,
// pied en z = −0,04 (enfoncé dans la coque) ; la vitre (disque VITRE) se pose à part, en retrait
export function hublot(r, cotes = 12) {
  const e = Math.max(0.08, r * 0.28);
  // profil du dehors vers le dedans (faces vers l'extérieur une fois tourné)
  const prof = [[r + e * 1.08, -0.04], [r + e, 0.06], [r + e * 0.6, 0.11], [r + e * 0.15, 0.09], [r, 0.02]];
  // profil tourné autour de Y (y du profil = saillie), puis axe ramené sur +Z
  return G.lathe(prof, cotes).rotateX(Math.PI / 2);
}

// rivets : petits hexaèdres de côté t posés sur les points [[x, y, z]…] (de près seulement ; aucun en
// version allégée) ; id : identifiant de contour de la plaque qu'ils tiennent (pas de trait autour de
// chaque rivet)
export function rivets(b, o, points, { t = 0.12, couleur = RIVET, id } = {}) {
  if (o.leger) return;
  for (const p of points) b.add(hexa(coinsBoite(t, t, t, o.rand, { jit: t * 0.08 }), 0, true), couleur, { p, id, ...F });
}
