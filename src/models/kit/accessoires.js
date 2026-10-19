// Accessoires des créatures : yeux brillants, collier et cloche, pattes à sabots.
import * as THREE from 'three';
import { G } from '../../render/builder.js';
import { bone, limb } from './formes.js';
import { part } from './pieces.js';

// couleur des yeux (jamais de noir pur)
export const EYE = '#3d3049';
// onglon arrondi (profil tourné, bord supérieur adouci), 5,5 cm de haut
export const HOOF = G.lathe([[0.001, 0], [0.042, 0], [0.04, 0.04], [0.001, 0.055]], 5);
// sabot lisse : bord arrondi, dessus bombé (vu de près)
export const HOOF_SMOOTH = G.lathe([[0.001, 0], [0.042, 0], [0.044, 0.016], [0.04, 0.036], [0.028, 0.05], [0.001, 0.055]], 8);

// œil rond et brillant, tourné vers l'avant et l'extérieur ; ring : liseré clair sur un visage sombre ;
// detail : pupille et reflet plus ronds, vus de près (true ou 1, puis 2 pour plus fin encore)
export function eye(b, x, y, z, r, ring = null, detail = 0) {
  const sx = Math.sign(x) || 1;
  const rot = [0, sx * 0.55, 0];
  const [pw, ph, hw, hh] = detail === 2 ? [10, 8, 6, 5] : detail ? [8, 6, 6, 4] : [6, 4, 5, 3];
  if (ring) b.add(G.sphere(r * 1.45, 7, 5), ring, { p: [x - sx * r * 0.15, y, z - r * 0.2], s: [1, 1.1, 0.55], r: rot, tint: 0 });
  b.add(G.sphere(r, pw, ph), EYE, { p: [x, y, z], s: [1, 1.15, 0.7], r: rot, tint: 0 });
  b.add(G.sphere(r * 0.34, hw, hh), '#ffffff', { p: [x + sx * r * 0.2, y + r * 0.42, z + r * 0.62], tint: 0 });
}

// Collier (tore autour d'un cou incliné de tilt vers l'avant, à la distance at de son pivot) et cloche
// tournée qui pend sous la gorge : épaule ronde, lèvre évasée, anneau, bouche sombre et battant ; k :
// taille de la cloche (1 : 9 cm de haut)
export const BELL = [[0.05, 0], [0.056, 0.006], [0.044, 0.03], [0.034, 0.06], [0.024, 0.082], [0.001, 0.09]];
export function collar(b, tilt, at, R, tube, k = 1) {
  const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const throat = new THREE.Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const ring = axis.multiplyScalar(at);
  b.add(G.torus(R, tube, 5, 16), '#6a8fd4', { p: ring.toArray(), r: [tilt - Math.PI / 2, 0, 0], tint: 0 });
  const top = ring.addScaledVector(throat, R + tube - 0.001);
  const y0 = top.y - 0.1 * k;
  const z0 = top.z + 0.012 * k;
  b.add(G.lathe(BELL.map(([x, y]) => [x * k, y * k]), 8), '#e2b23e', { p: [0, y0, z0], tint: 0 });
  b.add(G.cyl(0.046 * k, 0.046 * k, 0.002, 6), '#6b4f1c', { p: [0, y0 + 0.004 * k, z0], tint: 0 });
  b.add(G.torus(0.012 * k, 0.004 * k, 3, 6), '#c99a2e', { p: [0, top.y - 0.006 * k, z0], tint: 0 });
  b.add(G.sphere(0.016 * k, 5, 3), '#5a4318', { p: [0, y0 - 0.01 * k, z0], tint: 0 });
}

// quatre pattes (avant gauche, avant droite, arrière gauche, arrière droite, en diagonale) :
// pivot de hanche caché dans le corps, sabot posé au sol ; zf et zb sont les positions signées
// des pattes avant (z > 0) et arrière (z < 0) ; cloven : sabot fendu en deux onglons ; hoofRound :
// sabots arrondis (profil tourné) ; radii : un rayon par point, la patte est alors un tube lisse (limb)
export function legs(o) {
  const { x, zf, zb, hip, color, tint = 0, r0, r1, hoof, hoofH = 0.06, front = null, back = null, joint = null, cloven = false, hoofRound = false, radii = null, sides = 10, rings = 4, hoofGeo = HOOF } = o;
  const out = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    const pts = (sz > 0 ? front : back) || [[0, 0, 0], [0, -hip + hoofH, 0]];
    out.push(part((b) => {
      if (radii) limb(b, color, pts, radii, { sides, rings, tint });
      else for (let i = 0; i < pts.length - 1; i++) {
        const t0 = i / (pts.length - 1);
        const t1 = (i + 1) / (pts.length - 1);
        bone(b, color, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, 8, tint);
        if (joint === (sz > 0 ? 'front' : 'back') && i > 0) b.add(G.sphere(r0 + (r1 - r0) * t0, 5, 3), color, { p: pts[i], tint });
      }
      const f = pts[pts.length - 1];
      if (hoofRound && cloven) for (const s of [-1, 1]) b.add(HOOF, hoof, { p: [f[0] + s * 0.034, -hip, f[2]], s: [0.75, hoofH / 0.055, 1.15], tint: 0 });
      else if (hoofRound) {
        const k = ((radii ? radii[radii.length - 1] : r1) * 1.2) / 0.042;
        b.add(hoofGeo, hoof, { p: [f[0], -hip, f[2]], s: [k, hoofH / 0.055, k * 1.1], tint: 0 });
      }
      else if (cloven) for (const s of [-1, 1]) b.add(G.cyl(r1 * 0.62, r1 * 0.7, hoofH, 5), hoof, { p: [f[0] + s * r1 * 0.5, -hip + hoofH / 2, f[2] + r1 * 0.12], tint: 0 });
      else b.add(G.cyl(r1 * 1.12, r1 * 1.22, hoofH, 8), hoof, { p: [f[0], -hip + hoofH / 2, f[2]], tint: 0 });
    }, [sx * x, hip, sz > 0 ? zf : zb], 'leg', 1, ph));
  }
  return out;
}

// Anneau : tore dont l'âme suit une superellipse du plan xy (demi-largeurs a sur x et c sur y, exposant
// n : 2 pour une ellipse, 4 pour un rectangle arrondi), tube rond de rayon t, s côtés, m pas le long de
// l'âme ; normales lissées (sans couture)
export function anneauGeo(a, c, n, t, s = 10, m = 32) {
  const pw = (v) => Math.sign(v) * Math.abs(v) ** (2 / n);
  const ame = (th) => new THREE.Vector3(a * pw(Math.cos(th)), c * pw(Math.sin(th)), 0);
  const pos = [];
  const Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < m; i++) {
    const th = (i / m) * Math.PI * 2;
    const p = ame(th);
    const T = ame(th + 1e-3).sub(ame(th - 1e-3)).normalize();
    const N = new THREE.Vector3().crossVectors(T, Z).normalize(); // vers l'extérieur de l'âme
    for (let j = 0; j < s; j++) {
      const ph = (j / s) * Math.PI * 2;
      const q = p.clone().addScaledVector(N, Math.cos(ph) * t).addScaledVector(Z, Math.sin(ph) * t);
      pos.push(q.x, q.y, q.z);
    }
  }
  const idx = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < s; j++) {
      const v0 = i * s + j;
      const v1 = ((i + 1) % m) * s + j;
      const v2 = ((i + 1) % m) * s + ((j + 1) % s);
      const v3 = i * s + ((j + 1) % s);
      idx.push(v0, v1, v3, v1, v2, v3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Profil tourné à section en superellipse (rectangle arrondi) : profil [[s, y], …] (s : échelle de la
// section, 0 aux pôles), section de demi-largeurs a (x) et c (z), exposant n, S côtés ; normales lissées.
// Renvoie la géométrie et, pour chaque point du profil, la première face de sa bande (pour colorer
// l'intérieur d'une autre couleur)
function profilCarre(profil, a, c, n, S) {
  const pw = (v) => Math.sign(v) * Math.abs(v) ** (2 / n);
  const pos = [];
  const debut = [];
  for (const [s, y] of profil) {
    debut.push(pos.length / 3);
    if (s === 0) pos.push(0, y, 0);
    else for (let j = 0; j < S; j++) {
      const th = (j / S) * Math.PI * 2;
      pos.push(s * a * pw(Math.cos(th)), y, s * c * pw(Math.sin(th)));
    }
  }
  const bandes = [];
  for (let k = 0; k < profil.length - 1; k++) {
    const out = [];
    const [s0] = profil[k];
    const [s1] = profil[k + 1];
    const A = debut[k];
    const B = debut[k + 1];
    for (let j = 0; j < S; j++) {
      const j1 = (j + 1) % S;
      // sens choisi pour une normale vers l'extérieur quand le profil descend par l'extérieur
      if (s0 === 0) out.push(A, B + j1, B + j);
      else if (s1 === 0) out.push(A + j, A + j1, B);
      else out.push(A + j, A + j1, B + j, A + j1, B + j1, B + j);
    }
    bandes.push(out);
  }
  return { pos, bandes };
}

// Cloche suisse : tronc de pyramide aux arêtes arrondies (section en superellipse, face large vers
// l'avant), épaule douce, bord ourlé, bouche sombre, battant visible, anneau de suspension. L'anneau est
// centré en p (son haut se cache dans le collier) ; k : taille (1 : 9,5 cm de cloche sous 2,5 cm
// d'anneau) ; lite : version allégée ; id : identifiant de contour
export const CLOCHE_OR = '#e2b23e';
export function clocheSuisse(b, p, { k = 1, lite = false, id } = {}) {
  const H = 0.095;
  const S = lite ? 12 : 18;
  // profil : dessus plat, épaule, flancs droits qui s'évasent, bourrelet du bord ourlé, puis l'intérieur
  const ext = [[0, H], [0.42, H], [0.57, H - 0.005], [0.63, H - 0.016], [0.7, 0.72 * H], [0.82, 0.4 * H], [0.93, 0.12 * H], [1, 0.04 * H],
    [1.045, 0.012 * H], [1.02, -0.008 * H], [0.94, 0.005 * H]];
  const int = [[0.86, 0.15 * H], [0.68, 0.6 * H], [0.45, 0.85 * H], [0, 0.88 * H]];
  const garde = lite ? [0, 1, 3, 5, 7, 8, 10] : ext.map((_, i) => i);
  const profil = garde.map((i) => ext[i]).concat(lite ? [int[0], int[3]] : int);
  const nExt = garde.length;
  const { pos, bandes } = profilCarre(profil.map(([s, y]) => [s, y * k]), 0.042 * k, 0.032 * k, 3.6, S);
  const y0 = p[1] - 0.011 * k - H * k;
  const add = (faces, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(faces);
    g.computeVertexNormals();
    b.add(g, color, { p: [p[0], y0, p[2]], tint: 0, id });
  };
  // dehors doré jusqu'au bord ourlé, bouche sombre au-delà (l'intérieur se voit par-dessous)
  add(bandes.slice(0, nExt - 1).flat(), CLOCHE_OR);
  add(bandes.slice(nExt - 1).flat(), '#6e5226');
  // anneau de suspension, face vers l'avant (le haut se cache dans le collier) et battant
  b.add(anneauGeo(0.013 * k, 0.016 * k, 2, 0.0038 * k, lite ? 5 : 6, lite ? 8 : 12), '#c99a2e', { p, tint: 0, id });
  const tige = 0.85 * H * k + 0.004 * k;
  b.add(new THREE.CylinderGeometry(0.004 * k, 0.004 * k, tige, lite ? 6 : 8, 1, true), '#8a6a32', { p: [p[0], y0 - 0.004 * k + tige / 2, p[2]], tint: 0, id });
  b.add(G.sphere(0.0105 * k, 10, lite ? 4 : 5), '#8a6a32', { p: [p[0], y0 - 0.008 * k, p[2]], s: [1, 0.9, 1], tint: 0, id });
}

// Collier rond et épais (anneau elliptique autour d'un cou incliné de tilt vers l'avant, à la distance
// at de son pivot ; demi-largeurs rad = [travers, gorge-nuque], tube rond) avec une boucle sur le côté
// gauche (+x, angle boucle autour du cou ; pas en version allégée) et une cloche suisse sous la gorge.
// id : contour du collier (pas celui du cou : le trait les sépare) ; idCloche : contour de la cloche
export const COLLIER_BLEU = '#6a8fd4';
export function collier(b, tilt, at, rad, tube, { k = 1, lite = false, id, idCloche, boucle = 0.75 } = {}) {
  const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const throat = new THREE.Vector3(0, -Math.sin(tilt), Math.cos(tilt));
  const c = axis.clone().multiplyScalar(at);
  const r = [tilt - Math.PI / 2, 0, 0];
  b.add(anneauGeo(rad[0], rad[1], 2, tube, lite ? 6 : 10, lite ? 14 : 30), COLLIER_BLEU, { p: c.toArray(), r, tint: 0, id });
  // boucle : cadre en rectangle arrondi qui enserre la sangle, sur le flanc gauche, vers la nuque
  const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...r));
  const ang = boucle;
  const P = new THREE.Vector3(rad[0] * Math.cos(ang), rad[1] * Math.sin(ang), 0);
  const T = new THREE.Vector3(-rad[0] * Math.sin(ang), rad[1] * Math.cos(ang), 0).normalize();
  const O = new THREE.Vector3().crossVectors(T, new THREE.Vector3(0, 0, 1)).normalize();
  // repère du cadre : x = vers l'extérieur, y = le long de l'axe du cou, z = le long de la sangle
  const M = new THREE.Matrix4().makeBasis(O, new THREE.Vector3(0, 0, 1), T);
  const qb = Q.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(M));
  const eb = new THREE.Euler().setFromQuaternion(qb);
  const pb = P.applyQuaternion(Q).add(c).addScaledVector(O.clone().applyQuaternion(Q), 0.002);
  if (!lite) b.add(anneauGeo(tube + 0.007, tube + 0.011, 4, 0.0055, 6, 14), '#d6a843', { p: pb.toArray(), r: [eb.x, eb.y, eb.z], tint: 0, id });
  // cloche : son anneau pend sous la sangle, à la gorge
  const gorge = c.clone().addScaledVector(throat, rad[1]);
  gorge.y -= tube * 0.75;
  clocheSuisse(b, gorge.toArray(), { k, lite, id: idCloche });
}
