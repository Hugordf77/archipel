// Vache (ANI-003) : espèce de la faune des îles, reprise d'après sa planche (reference.png).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { limb, surface, hull, skinMesh, leafGeo, patch, union, grille } from '../../kit/formes.js';
import { eye, collier } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

// Vache (d'après la planche de référence), G la hauteur au garrot (0,86 m avant l'échelle) : corps d'un
// seul tenant (union lisse du tonneau, de la croupe carrée à pointes de hanche, des épaules, du garrot,
// du poitrail et d'un ventre à peine tombant), pattes au tiers de G qui sortent du dessous, genoux et
// jarrets marqués, onglons fendus et ergots ; cou court et épais qui porte la tête et plie pour brouter ;
// tête d'un seul tenant (crâne rond, arcades, joues, large museau rose tiré du visage, naseaux creusés,
// bouche) ; oreilles en feuille creusée, cornes annelées ; collier rond à boucle et cloche suisse ; pis
// en quatre quartiers ; queue à houppe en mèches ; taches qui épousent le corps, teintées par la robe
const CREAM = '#f5e9d6';
const PINK = '#f0b4a8';
const HOOF = '#4b4245';
// cou relevé sur la planche (profil) : collier de la nuque (y 0,92, z 0,26) à la gorge (y 0,65, z 0,48),
// donc un cou incliné de 0,89 rad vers l'avant, épais de 0,35 m, centré sur le collier
const NECK = 0.89; // inclinaison du cou vers l'avant (rad)
const axis = new THREE.Vector3(0, Math.cos(NECK), Math.sin(NECK));
const COL = new THREE.Vector3(0, 0.78, 0.37); // centre du collier
const NP = COL.clone().addScaledVector(axis, -0.3).toArray(); // pivot du cou, dans les épaules
const HP = axis.clone().multiplyScalar(0.42); // pivot de la tête, au bout du cou (repère du cou)
const HW = new THREE.Vector3(...NP).add(HP); // … dans le repère du corps

// --- corps : une seule surface (axes alignés : test des jonctions patte-corps) ---------------------
// raccords larges (k) : aucun creux serré, que les taches (faces planes) ne sauraient suivre
const CORPS = [
  { c: [0, 0.572, -0.03], rad: [0.238, 0.283, 0.44], n: 2.15 }, // tonneau
  { c: [0, 0.6, -0.29], rad: [0.238, 0.232, 0.215], n: 2.7, k: 0.08 }, // croupe carrée, coins hauts en pointes de hanche
  { c: [0, 0.625, 0.21], rad: [0.222, 0.235, 0.21], n: 2.3, k: 0.08 }, // épaules et garrot
  { c: [0, 0.48, 0.29], rad: [0.165, 0.18, 0.16], n: 2.1, k: 0.07 }, // poitrail
  { c: [0, 0.455, -0.04], rad: [0.215, 0.165, 0.3], n: 2.1, k: 0.09 }, // ventre à peine tombant
];
for (const sx of [-1, 1]) {
  CORPS.push(
    { c: [sx * 0.13, 0.49, -0.3], rad: [0.11, 0.2, 0.19], n: 2.9, k: 0.1 }, // cuisse
    { c: [sx * 0.13, 0.48, 0.25], rad: [0.1, 0.19, 0.155], n: 2.9, k: 0.1 }, // avant-bras
  );
}
const CC = [0, 0.57, -0.03];
const CR = [0.24, 0.28, 0.47];
const corps = union(CORPS, { centre: CC, rad: CR });
// direction réduite (vue du centre du corps) d'un point du corps
const versCorps = (x, y, z) => [(x - CC[0]) / CR[0], (y - CC[1]) / CR[1], (z - CC[2]) / CR[2]];

// taches : point visé sur le corps, demi-tailles (le long du corps, en travers), graine ; à droite (−x,
// vue de profil de la planche) selle, épaule, haricot, croupe, petite tache, cuisse ; à gauche, d'autres
const TACHES = [
  [[-0.12, 0.84, -0.04], [0.28, 1.2], 1], // selle sur le dos, qui descend surtout sur le flanc droit
  [[-0.23, 0.66, 0.31], [0.24, 0.55], 2], // épaule droite, du garrot au bas de l'épaule
  [[-0.235, 0.46, -0.03], [0.23, 0.17], 3], // haricot au flanc droit
  [[-0.2, 0.7, -0.41], [0.27, 0.3], 4], // croupe droite
  [[-0.245, 0.55, -0.25], [0.08, 0.08], 5], // petite tache du flanc arrière droit
  [[-0.2, 0.37, -0.43], [0.16, 0.12], 6], // cuisse droite
  [[0.22, 0.66, 0.29], [0.26, 0.48], 7], // épaule gauche
  [[0.235, 0.52, -0.08], [0.2, 0.17], 8], // flanc gauche
  [[0.2, 0.74, -0.37], [0.24, 0.26], 9], // croupe gauche
  [[0.21, 0.42, -0.4], [0.12, 0.11], 10], // cuisse gauche
  [[0.23, 0.42, 0.12], [0.1, 0.09], 11], // bas du flanc gauche, derrière l'épaule
];

// --- pis : quatre quartiers soudés en une surface à bosses --------------------------------------
const PIS = [{ c: [0, 0.33, -0.18], rad: [0.11, 0.08, 0.12], n: 2.2 }];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) PIS.push({ c: [sx * 0.052, 0.255, -0.18 + sz * 0.05], rad: [0.062, 0.062, 0.066], k: 0.035 });
const pis = union(PIS, { centre: [0, 0.29, -0.18], rad: [0.12, 0.1, 0.13] });

// --- tête (repère de la tête : origine au pivot, en bout de cou) --------------------------------
// points donnés dans le repère du corps (au repos), ramenés au pivot de la tête
const T = (x, y, z) => [x, y - HW.y, z - HW.z];
const TETE = [
  { c: T(0, 0.912, 0.48), rad: [0.15, 0.152, 0.152], n: 2.1 }, // crâne rond
  { c: T(0, 0.88, 0.555), rad: [0.125, 0.11, 0.1], n: 2.2, k: 0.06 }, // front et chanfrein
  { c: T(0, 0.81, 0.62), rad: [0.118, 0.094, 0.105], n: 2.5, k: 0.06 }, // museau, face avant aplatie
  { c: T(0, 0.775, 0.53), rad: [0.085, 0.055, 0.12], k: 0.05 }, // mâchoire
];
for (const sx of [-1, 1]) {
  TETE.push(
    { c: T(sx * 0.08, 0.83, 0.52), rad: [0.075, 0.075, 0.1], k: 0.05 }, // joue
    { c: T(sx * 0.095, 0.968, 0.578), rad: [0.04, 0.024, 0.034], k: 0.035 }, // arcade au-dessus de l'œil
  );
}
const NARINES = [-1, 1].map((sx) => ({ c: T(sx * 0.05, 0.828, 0.727), rad: [0.022, 0.031, 0.017], r: [0, 0, -sx * 0.45], k: 0.01, creux: true }));
const TC = T(0, 0.88, 0.52);
const TR = [0.15, 0.16, 0.2];
const tete = union([...TETE, ...NARINES], { centre: TC, rad: TR });
const versTete = (x, y, z) => { const [a, b2, c] = T(x, y, z); return new THREE.Vector3((a - TC[0]) / TR[0], (b2 - TC[1]) / TR[1], (c - TC[2]) / TR[2]); };
// axe des pôles de la tête : vers le centre du museau ; frontière rose / crème sur un parallèle
const AXE_TETE = versTete(0, 0.81, 0.725).normalize();
const ROSE = { haut: 0.6, cote: 0.68, bas: 0.95 };

// point et normale de la peau de la tête dans la direction réduite d
function surTete(d) {
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  tete.at(d.clone().normalize(), p, n);
  return { p, n };
}

// géométries coûteuses (peaux calculées par lancer de rayons) : calculées une fois, rejouées ensuite
// (opts : options ajoutées au rejeu, comme l'identifiant de contour de cette construction-ci)
const MEMO = new Map();
function rejoue(b, key, draw, opts = {}) {
  let rec = MEMO.get(key);
  if (!rec) {
    rec = [];
    draw({ add: (g, color, opts) => rec.push([g, color, opts]) });
    MEMO.set(key, rec);
  }
  for (const [g, color, o] of rec) b.add(g, color, { ...o, ...opts });
}

// onglon : demi-sabot à semelle plate, face intérieure droite contre la fente, pointe vers l'avant
const ONGLONS = new Map();
function onglon(s, lite) {
  const key = `${s}${lite}`;
  if (ONGLONS.has(key)) return ONGLONS.get(key);
  const R = [0.031, 0.029, 0.05];
  let geo = null;
  skinMesh({ add: (g) => { geo = g; } }, HOOF, (u, out) => {
    const k = u.clone().normalize();
    const n = 2.6;
    const q = k.clone().multiplyScalar((Math.abs(k.x) ** n + Math.abs(k.y) ** n + Math.abs(k.z) ** n) ** (-1 / n));
    let x = q.x * R[0];
    let y = q.y * R[1];
    let z = q.z * R[2];
    // effilé vers le haut, plus long vers l'avant ; face intérieure droite ; semelle plate
    const t = (y / R[1] + 1) / 2;
    x *= 1 - 0.25 * t;
    z = z * (1 - 0.3 * t) + (z > 0 ? 0.008 : 0);
    if (s * x < -0.55 * R[0]) x = -s * 0.55 * R[0];
    y = Math.max(y, -0.8 * R[1]);
    out.set(x + s * 0.55 * R[0], y + 0.8 * R[1], z);
  }, lite ? 8 : 10, lite ? 4 : 5);
  ONGLONS.set(key, geo);
  return geo;
}
const ERGOT = G.lathe([[0.001, 0], [0.011, 0.006], [0.001, 0.017]], 6);

// oreilles (feuilles creusées) et intérieur rose
const EAR = leafGeo(12, 6, 0.55);
const EAR_IN = leafGeo(10, 5, 0.35);
const EAR_LITE = leafGeo(7, 4, 0.55);
const EAR_IN_LITE = leafGeo(6, 3, 0.35);

// lite : version allégée pour les vaches lointaines (mêmes pièces, pivots, animations et parents)
function vache(lite = false) {
  const L = lite ? 'lite' : 'fin';
  // corps, taches et pis : identifiant partagé avec le cou (soudé, pas de trait au raccord)
  const skin = nextId();
  const body = part((b) => {
    rejoue(b, `corps-${L}`, (r) => {
      // pôles au poitrail et à la croupe (cachés par le cou et la queue), méridien 0 sur le dos
      grille(r, corps, lite ? 18 : 32, lite ? 12 : 22, { axe: [0, 0, 1], haut: [0, 1, 0], bandes: [[Infinity, CREAM, 0]] });
      for (const [p, size, seed] of TACHES) {
        // une couronne tous les 0,4 rad au plus, arêtes recoupées là où le corps bombe : la tache reste
        // au-dessus de la peau
        const m = Math.max(...size);
        const nc = lite ? Math.ceil(m / 0.5) : Math.ceil(m / 0.4);
        patch(r, corps, versCorps(...p), size, seed, { lift: lite ? 0.015 : 0.006, seg: lite ? 10 : m > 0.45 ? 32 : 20, couronnes: Array.from({ length: nc }, (_, i) => (i + 1) / nc), tol: lite ? null : 0.005 });
      }
      grille(r, pis, lite ? 10 : 16, lite ? 6 : 8, { axe: [0, -1, 0], haut: [0, 0, 1], bandes: [[Infinity, '#f2b3a6', 0]] });
    });
    // quatre trayons lisses sous les quartiers, un peu écartés
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      limb(b, '#e9a194', [[sx * 0.052, 0.215, -0.18 + sz * 0.05], [sx * 0.058, 0.18, -0.18 + sz * 0.054], [sx * 0.064, 0.148, -0.18 + sz * 0.058]], [0.018, 0.016, 0.013], { sides: lite ? 6 : 10, rings: lite ? 1 : 2, end: 'round' });
    }
  }, [0, 0, 0], 'none', 1, 0, skin);
  body.shell = CORPS.map(({ c, rad, n = 2 }) => ({ c, rad, n }));
  // cou : pivot dans le poitrail, il porte la tête (pièce suivante) ; collier et cloche à part (trait)
  const neck = part((b) => {
    hull(b, CREAM, surface([0, 0, 0], [0.16, 0.3, 0.178], 2.2), lite ? 10 : 16, lite ? 7 : 12, { p: axis.clone().multiplyScalar(0.3).toArray(), r: [NECK, 0, 0], tint: 0 });
    collier(b, NECK, 0.3, [0.153, 0.17], 0.02, { k: 1, lite, id: nextId(), idCloche: nextId() });
  }, NP, 'neck', 1, 0, skin);
  // tête d'un seul tenant : museau rose sur les premiers parallèles autour de son centre
  const head = part((b) => {
    const h = lite ? 14 : 25;
    const ib = Math.round(h * 0.42);
    const vb = ib / h;
    const { haut, cote, bas } = ROSE;
    const th1 = (haut - bas) / 2;
    const th0 = ((haut + bas) / 2 + cote) / 2;
    const th2 = ((haut + bas) / 2 - cote) / 2;
    const bord = (ph) => th0 + th1 * Math.cos(ph) + th2 * Math.cos(2 * ph);
    rejoue(b, `tete-${L}`, (r) => {
      grille(r, tete, lite ? 16 : 30, h, {
        axe: AXE_TETE.toArray(), haut: [0, 1, 0],
        theta: (v, ph) => (v <= vb ? bord(ph) * (v / vb) : bord(ph) + (Math.PI - bord(ph)) * ((v - vb) / (1 - vb)) ** 1.1),
        bandes: [[ib, PINK, 0], [Infinity, CREAM, 0]],
      });
      // tache autour de l'œil gauche, du front jusqu'à l'oreille
      patch(r, tete, versTete(0.115, 0.965, 0.52).toArray(), [0.55, 0.46], 12, { lift: 0.0025, seg: lite ? 12 : 28, couronnes: lite ? [1] : [0.5, 1], tol: lite ? null : 0.002 });
    }, { id: skin }); // peau de la tête soudée au cou : pas de trait à la nuque ni sous la gorge
    // naseaux : creux ovales penchés, fond sombre (invisibles de loin)
    if (!lite) for (const sx of [-1, 1]) {
      const { p, n } = surTete(versTete(sx * 0.05, 0.828, 0.727));
      const q = new THREE.Quaternion().setFromAxisAngle(n, -sx * 0.45).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
      const e = new THREE.Euler().setFromQuaternion(q);
      b.add(G.sphere(1, 10, 6), '#7f4548', { p: p.clone().addScaledVector(n, -0.0015).toArray(), s: [0.0135, 0.021, 0.004], r: [e.x, e.y, e.z], tint: 0 });
    }
    // bouche : ligne fine sous le museau, d'une commissure à l'autre
    if (!lite) {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = -1 + i / 3;
        const { p, n } = surTete(versTete(t * 0.075, 0.742 - 0.012 * t * t, 0.7 - 0.05 * t * t));
        pts.push(p.addScaledVector(n, 0.001).toArray());
      }
      limb(b, '#c98782', pts, pts.map(() => 0.0032), { sides: 6, rings: 6, end: 'round' });
    }
    // yeux : perles sombres à reflet, hauts et bien écartés
    for (const sx of [-1, 1]) {
      const { p, n } = surTete(versTete(sx * 0.1, 0.94, 0.572));
      p.addScaledVector(n, -0.007);
      eye(b, p.x, p.y, p.z, 0.02, null, lite ? 0 : 2);
    }
    // oreilles : feuilles creusées, à l'horizontale, intérieur rose vers l'avant ; la gauche prend la
    // tache à sa base (contour séparé de la tête)
    for (const sx of [-1, 1]) {
      const idE = nextId();
      const eo = new THREE.Euler(-0.35, sx * 0.4, -sx * 0.22);
      const at = (o) => new THREE.Vector3(...o).applyEuler(eo).add(new THREE.Vector3(...T(sx * 0.225, 0.95, 0.43))).toArray();
      const [E, EI] = lite ? [EAR_LITE, EAR_IN_LITE] : [EAR, EAR_IN];
      const ear = sx > 0 ? E : E.clone().scale(-1, 1, 1);
      const inner = sx > 0 ? EI : EI.clone().scale(-1, 1, 1);
      const o = { p: at([0, 0, 0]), s: [0.082, 0.05, 0.028], r: [eo.x, eo.y, eo.z], id: idE };
      if (sx > 0) {
        // base tachée (teinte de la robe), bout crème : triangles répartis selon une frontière ondulée
        const flat = ear.index ? ear.toNonIndexed() : ear;
        const pos = flat.attributes.position;
        const base = [];
        const bout = [];
        for (let i = 0; i < pos.count; i += 3) {
          const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
          const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
          (x < -0.15 + 0.2 * Math.sin(y * 3 + 1) ? base : bout).push(i, i + 1, i + 2);
        }
        for (const [list, color, tint] of [[base, '#ffffff', 1], [bout, CREAM, 0]]) {
          const g = flat.clone();
          g.setIndex(list);
          b.add(g, color, { ...o, tint });
        }
      } else b.add(ear, CREAM, { ...o, tint: 0 });
      b.add(inner, '#eea69d', { ...o, p: at([0, 0, 0.006]), s: [0.064, 0.036, 0.012], tint: 0 });
      // corne annelée à la base : vers l'extérieur, puis le haut, puis un peu vers l'intérieur
      const H = [[0.06, 0.995, 0.47], [0.1, 1.025, 0.468], [0.113, 1.032, 0.467], [0.126, 1.039, 0.466], [0.139, 1.047, 0.465], [0.165, 1.068, 0.462], [0.19, 1.1, 0.456], [0.186, 1.128, 0.45]];
      limb(b, '#ecdcb4', H.map(([x, y, z]) => T(sx * x, y, z)), [0.03, 0.0285, 0.0262, 0.0278, 0.0248, 0.021, 0.015, 0.008], { sides: lite ? 6 : 10, rings: lite ? 4 : 11, end: 'round' });
    }
  }, HP.toArray(), 'head');
  head.parent = 1;
  // queue : racine dans la croupe, courbe douce, houppe en mèches effilées et évasées (couleur des taches)
  const tail = part((b) => {
    limb(b, CREAM, [[0, 0, 0.05], [0, 0.004, -0.02], [0, -0.06, -0.075], [0, -0.16, -0.12], [0, -0.26, -0.148], [0, -0.33, -0.158]], [0.034, 0.032, 0.026, 0.021, 0.019, 0.018], { sides: lite ? 6 : 10, rings: lite ? 4 : 7, end: 'round' });
    const N = lite ? 5 : 6;
    const R0 = [0, -0.31, -0.155];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.4;
      const ox = Math.cos(a);
      const oz = Math.sin(a);
      const L2 = 0.14 + 0.018 * Math.sin(i * 2.1);
      const at = (dy, r, dz) => [ox * r, R0[1] - dy, R0[2] + oz * r - dz];
      limb(b, '#ffffff', [R0, at(0.04, 0.018, 0.008), at(L2 * 0.65, 0.026, 0.02), at(L2, 0.012, 0.034)], [0.014, 0.022, 0.017, 0.003], { sides: lite ? 4 : 5, rings: lite ? 2 : 3, end: 'round', tint: 1 });
    }
  }, [0, 0.75, -0.47], 'tail');
  return [body, neck, head, ...pattes(lite), tail];
}

// pattes (avant gauche, avant droite, arrière gauche, arrière droite, en diagonale) : pivot de hanche
// dans le corps, tube lisse aux rayons marqués (genou, jarret, boulet), paturon, deux onglons et ergots
const HIP = 0.5;
const AVANT = { z: 0.27, pts: [[0, 0, 0], [0, -0.12, 0.004], [0, -0.23, 0.01], [0, -0.3, 0.014], [0, -0.37, 0.01], [0, -0.418, 0.012], [0, -0.445, 0.02], [0, -0.465, 0.026]], radii: [0.076, 0.07, 0.059, 0.068, 0.049, 0.058, 0.043, 0.044] };
const ARRIERE = { z: -0.33, pts: [[0, 0, 0], [0, -0.13, -0.012], [0, -0.23, -0.035], [0, -0.3, -0.066], [0, -0.37, -0.044], [0, -0.418, -0.028], [0, -0.445, -0.018], [0, -0.465, -0.01]], radii: [0.08, 0.074, 0.058, 0.066, 0.049, 0.058, 0.043, 0.044] };
function pattes(lite) {
  const out = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    const P = sz > 0 ? AVANT : ARRIERE;
    out.push(part((b) => {
      limb(b, CREAM, P.pts, P.radii, { sides: lite ? 6 : 10, rings: lite ? 4 : 7 });
      const f = P.pts[P.pts.length - 1];
      for (const s of [-1, 1]) {
        b.add(onglon(s, lite), HOOF, { p: [f[0] + s * 0.003, -HIP, f[2] + 0.004], tint: 0 });
        // ergot : à l'arrière du boulet, pointé vers le bas et l'arrière
        const [, by, bz] = P.pts[5];
        if (!lite) b.add(ERGOT, HOOF, { p: [s * 0.022, by - 0.018, bz - P.radii[5] * 0.8], r: [-2.4, 0, -s * 0.35], tint: 0 });
      }
    }, [sx * 0.13, HIP, sz > 0 ? AVANT.z : ARRIERE.z], 'leg', 1, ph));
  }
  return out;
}

export const espece = {
  speed: 0.45, scale: 1.4, shadow: true, graze: 1.45, nod: -0.35, muzzle: T(0, 0.75, 0.715), top: 1.15,
  coats: [['Pie brune', '#8a5a3c'], ['Pie noire', '#4d4453'], ['Pie rouge', '#b8643c']],
  parts: () => vache(),
  // au-delà de 20 m du joueur, la version allégée (mêmes pièces)
  lod: () => vache(true), lodDist: 20,
};

export default fiche('ANI-003', 'vache', 'Vache', species('vache', espece), { budget: { triangles: 10000, lod: 3500 } });
