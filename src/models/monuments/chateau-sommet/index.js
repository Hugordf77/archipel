// Château du Sommet givré, version 1 (MON-015) : très grand château fantastique, repère central du monde
// ouvert, design original de l'Archipel (pierre crème et lavande, toits ardoise pastel, volumes ronds, peu
// de faces, aucun détail fin). Enceinte octogonale de 76 m sur un soubassement taluté qui descend dans la
// pente du pic, courtines de 16 m, huit tours rondes à toit conique (30 à 40 m), portail sous linteau entre
// les deux plus hautes ; au centre, un socle surélevé et son grand escalier, le corps de logis à toit en
// pavillon, quatre tourelles d'angle et la grande tour en trois étages, dont la flèche monte à ~170 m.
// Type de lieu chateau_fondations (DIRZ : le portail regarde vers rot). En jeu, la pose ne garde que la
// physique (v: 1) : le château est dessiné en permanence par world/env/chateau.js, visible de tout le monde.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, {
  ENCEINTE, SOMMETS, TOURS, cote, SOCLE, MARCHES, LOGIS, TOURELLES, GRANDE_TOUR,
} from './physique.js';

const PIERRE = '#e2d6bf';
const PIERRE_B = '#d9ccb2';
const LAVANDE = '#cbc1d6';
const SOUBASSEMENT = '#cdbfa6';
const TOIT = '#8f9dcb';
const TOIT_B = '#8191c2';
const F = { tint: 0 };

// --- géométries à faces planes (peu de triangles, arêtes chanfreinées) ------------------------------
// triangles [a, b, c] (points 3D) orientés vers l'extérieur : retournés si leur normale regarde le centre
function geometrie(tris, centre) {
  const pos = [];
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (const [a, b, c] of tris) {
    v1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    v2.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    n.crossVectors(v1, v2);
    const m = [(a[0] + b[0] + c[0]) / 3 - centre[0], (a[1] + b[1] + c[1]) / 3 - centre[1], (a[2] + b[2] + c[2]) / 3 - centre[2]];
    const dehors = n.x * m[0] + n.y * m[1] + n.z * m[2] >= 0;
    pos.push(...a, ...(dehors ? b : c), ...(dehors ? c : b));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// tronçon extrudé : profil [[o, y]…] (o : décalage perpendiculaire, positif vers dehors) tiré de A à B
// (points [x, z]) ; dehors : sens du décalage positif ([x, z], unitaire)
function troncon(A, B, profil, dehors) {
  const pt = (P, [o, y]) => [P[0] + dehors[0] * o, y, P[1] + dehors[1] * o];
  const tris = [];
  const n = profil.length;
  for (let i = 0; i < n; i++) {
    const p = profil[i];
    const q = profil[(i + 1) % n];
    tris.push([pt(A, p), pt(B, p), pt(B, q)], [pt(A, p), pt(B, q), pt(A, q)]);
  }
  // bouts : profil triangulé (il peut être concave au pied du mur)
  const faces = THREE.ShapeUtils.triangulateShape(profil.map(([o, y]) => new THREE.Vector2(o, y)), []);
  for (const P of [A, B]) for (const [a, b, c] of faces) tris.push([pt(P, profil[a]), pt(P, profil[b]), pt(P, profil[c])]);
  const cy = profil.reduce((s, [, y]) => s + y, 0) / n;
  const co = profil.reduce((s, [o]) => s + o, 0) / n;
  const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  return geometrie(tris, [m[0] + dehors[0] * co, cy, m[1] + dehors[1] * co]);
}

// prisme convexe chanfreiné : polygone [[x, z]…] de y0 à y1, arête haute abattue de ch
function prisme(poly, y0, y1, ch = 0.08) {
  const cx = poly.reduce((s, [x]) => s + x, 0) / poly.length;
  const cz = poly.reduce((s, [, z]) => s + z, 0) / poly.length;
  const dedans = poly.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1;
    return [x - ((x - cx) / d) * ch * 1.2, z - ((z - cz) / d) * ch * 1.2];
  });
  const tris = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [a, b] = [poly[i], poly[j]];
    const [c, d] = [dedans[i], dedans[j]];
    tris.push([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1 - ch, b[1]]], [[a[0], y0, a[1]], [b[0], y1 - ch, b[1]], [a[0], y1 - ch, a[1]]]);
    tris.push([[a[0], y1 - ch, a[1]], [b[0], y1 - ch, b[1]], [d[0], y1, d[1]]], [[a[0], y1 - ch, a[1]], [d[0], y1, d[1]], [c[0], y1, c[1]]]);
    if (i > 0 && i < n - 1) tris.push([[dedans[0][0], y1, dedans[0][1]], [c[0], y1, c[1]], [d[0], y1, d[1]]]);
  }
  return geometrie(tris, [cx, (y0 + y1) / 2, cz]);
}

// toit en pavillon : pyramide sur le polygone (débord de deb m) jusqu'à un faîte en pointe
function pavillon(poly, y, h, deb = 0.8) {
  const cx = poly.reduce((s, [x]) => s + x, 0) / poly.length;
  const cz = poly.reduce((s, [, z]) => s + z, 0) / poly.length;
  const bord = poly.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1;
    return [x + ((x - cx) / d) * deb, y, z + ((z - cz) / d) * deb];
  });
  const tris = bord.map((p, i) => [p, bord[(i + 1) % bord.length], [cx, y + h, cz]]);
  for (let i = 1; i < bord.length - 1; i++) tris.push([bord[0], bord[i + 1], bord[i]]);
  return geometrie(tris, [cx, y + h * 0.3, cz]);
}

// tour ronde : (talus évasé sous le sol,) plinthe, fût, avant-toit, toit conique ; profil montant
function tour(b, x, z, { r, h, t }, { y = 0, talus = true, couleur = PIERRE, toit = TOIT, cotes = 10 } = {}) {
  const { TALUS, FRUIT } = ENCEINTE;
  const prof = [
    ...(talus ? [[r + FRUIT, -TALUS], [r + 0.7, -0.1], [r + 0.7, 0.8]] : [[r + 0.3, -0.2], [r + 0.3, 0.6]]),
    [r, talus ? 1.4 : 1], [r, h],
  ];
  b.add(G.lathe(prof.map(([a, c]) => [a, c + y]), cotes), couleur, { ...F, p: [x, 0, z] });
  b.add(G.lathe([[r - 0.1, y + h - 0.05], [r + 1, y + h + 0.3], [0, y + h + t]], cotes), toit, { ...F, p: [x, 0, z] });
}

// courtine : talus sous le sol, plinthe, mur à arêtes abattues, chemin de ronde légèrement creusé
const profilCourtine = (h) => {
  const { EP, TALUS, FRUIT } = ENCEINTE;
  const e = EP / 2;
  return [[-e, -3], [e + FRUIT, -TALUS], [e + 0.6, 0], [e, 0.8], [e, h], [e - 0.5, h], [e - 0.6, h - 0.5], [-e + 0.3, h - 0.5], [-e, h - 0.2]];
};

function enceinte(b, o) {
  SOMMETS.forEach(([x, z], k) => tour(b, x, z, TOURS[k], { couleur: o.rand() < 0.5 ? PIERRE : PIERRE_B, toit: k % 2 ? TOIT : TOIT_B }));
  const { H, EP, portail, portailH } = ENCEINTE;
  for (let k = 0; k < SOMMETS.length; k++) {
    for (const [x0, z0, x1, z1] of cote(k)) {
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const d = Math.hypot(mx, mz);
      b.add(troncon([x0, z0], [x1, z1], profilCourtine(H), [mx / d, mz / d]), o.rand() < 0.3 ? LAVANDE : PIERRE, F);
    }
  }
  // linteau du portail : bloc qui ferme la courtine au-dessus de l'ouverture
  const [ax, az] = SOMMETS[7];
  const [bx, bz] = SOMMETS[0];
  const mx = (ax + bx) / 2;
  const mz = (az + bz) / 2;
  const ux = (bx - ax) / Math.hypot(bx - ax, bz - az);
  const uz = (bz - az) / Math.hypot(bx - ax, bz - az);
  const w = portail / 2 + 0.6;
  const t = EP / 2 + 0.3;
  b.add(prisme([[mx - ux * w - uz * t, mz - uz * w + ux * t], [mx + ux * w - uz * t, mz + uz * w + ux * t], [mx + ux * w + uz * t, mz + uz * w - ux * t], [mx - ux * w + uz * t, mz - uz * w - ux * t]], portailH, H + 1.2, 0.3), LAVANDE, F);
}

function donjon(b) {
  const { x, z0, z1, y, coupe } = SOCLE;
  // socle : dalle à angles coupés
  const poly = [[-x + coupe, z1], [x - coupe, z1], [x, z1 - coupe], [x, z0 + coupe], [x - coupe, z0], [-x + coupe, z0], [-x, z0 + coupe], [-x, z1 - coupe]];
  b.add(prisme(poly, -2, y, 0.3), SOUBASSEMENT, F);
  // grand escalier : de la cour au socle, vers −Z
  const { n, giron, l } = MARCHES;
  for (let k = 0; k < n; k++) {
    const zc = z1 + (n - k - 0.5) * giron;
    b.add(prisme([[-l / 2, zc - giron / 2 - 0.02], [l / 2, zc - giron / 2 - 0.02], [l / 2, zc + giron / 2 + 0.02], [-l / 2, zc + giron / 2 + 0.02]], -0.3, ((k + 1) * y) / n, 0.05), k % 2 ? PIERRE : PIERRE_B, F);
  }
  // corps de logis à angles coupés, toit en pavillon
  const L = LOGIS;
  const c = L.coupe;
  const pl = [[-L.x + c, L.z1], [L.x - c, L.z1], [L.x, L.z1 - c], [L.x, L.z0 + c], [L.x - c, L.z0], [-L.x + c, L.z0], [-L.x, L.z0 + c], [-L.x, L.z1 - c]];
  b.add(prisme(pl, y - 0.2, y + L.h, 0.3), PIERRE, F);
  b.add(pavillon(pl, y + L.h - 0.2, L.toit, 1), TOIT_B, F);
  for (const t of TOURELLES) tour(b, t.x, t.z, t, { y, talus: false, toit: TOIT, cotes: 8 });
  // grande tour : étages de plus en plus fins, terrasse à parapet entre deux étages, flèche
  const g = GRANDE_TOUR;
  const prof = [[g.etages[0][0] + 0.5, y - 0.3], [g.etages[0][0], y + 1]];
  g.etages.forEach(([r, h], i) => {
    prof.push([r, y + h]);
    const suivant = g.etages[i + 1];
    if (suivant) prof.push([r + 0.8, y + h + 0.3], [r + 0.8, y + h + 2], [suivant[0], y + h + 2]);
  });
  b.add(G.lathe(prof, 12), LAVANDE, { ...F, p: [g.x, 0, g.z] });
  const [rh, hh] = g.etages.at(-1);
  b.add(G.lathe([[rh - 0.1, y + hh - 0.05], [rh + 1.4, y + hh + 0.5], [0, y + hh + g.t]], 12), TOIT_B, { ...F, p: [g.x, 0, g.z] });
}

// v: 1 : physique seule (la pose en jeu ; le dessin est le repère permanent, world/env/chateau.js)
export function chateauFondations(p) {
  const b = new Builder();
  const o = { rand: mulberry32(1515) };
  if (p.v !== 1) {
    enceinte(b, o);
    donjon(b);
  }
  return { solid: b, obstacles: lire(physique.obstacles, p), decks: lire(physique.planchers, p) };
}

export default fiche('MON-015', 'chateau-sommet', 'Château du Sommet givré', part('chateau_fondations'), {
  tags: ['sommet'],
});
