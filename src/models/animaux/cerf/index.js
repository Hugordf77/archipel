// Cerf (ANI-004) : espèce de la faune des îles, reprise d'après sa description (pas de planche).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { limb, leafGeo, patch, union, grilleZones } from '../../kit/formes.js';
import { EYE, anneauGeo, onglonGeo } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

// Cerf de jeu cosy, élancé mais attendrissant (famille de la vache et du mouton), G la hauteur au garrot
// (0,97 m avant l'échelle 1,2) : corps d'un seul tenant (union lisse du poitrail profond, du garrot, des
// reins, de la croupe ronde, d'un ventre qui remonte, des cuisses et des avant-bras), ventre et intérieur
// des cuisses crème, miroir blanc autour de la queue, quelques taches claires sur le dos ; pattes fines
// (42 % de G : exception de la fiche) qui sortent du dessous, genoux et jarrets marqués, onglons sombres
// fendus ; cou gracieux porté haut qui porte la tête et plie pour brouter, gorge crème ; tête d'un seul
// tenant (crâne rond, front large, chanfrein court, museau arrondi à bout crème, menton clair, truffe brune
// bombée), grands yeux en amande, grandes oreilles en feuille creusée ; bois à merrain courbé, trois
// andouillers et meule ; queue courte blanche dessous
const COAT = '#ffffff'; // pelage : teinté par la robe (tint 1)
const CREAM = '#f3e3c8'; // ventre, gorge, intérieur des cuisses, bout du museau, menton
const MIROIR = '#fbf3e4'; // miroir de la croupe, dessous de la queue
const TACHE = '#fffaf0'; // taches du dos (à demi teintées par la robe : claires sur le fauve, plus discrètes sur le brun)
const TRUFFE = '#5c4442';
const NASEAU = '#46363a';
const ONGLE = '#4a3c3a';
const BOIS = '#e7d4ae';
const MEULE = '#cdb48b';
const OREILLE = '#f0cdbf';

// cou : pivot dans le poitrail, incliné de NECK vers l'avant ; la tête est au bout, à NL du pivot
const NECK = 0.48;
const axis = new THREE.Vector3(0, Math.cos(NECK), Math.sin(NECK));
const NP = [0, 0.74, 0.28];
const NL = 0.5;
const HP = axis.clone().multiplyScalar(NL); // pivot de la tête (repère du cou)
const HW = new THREE.Vector3(...NP).add(HP); // … dans le repère du corps

// --- corps : une seule surface ----------------------------------------------------------------
const CORPS = [
  { c: [0, 0.7, 0.04], rad: [0.175, 0.24, 0.3], n: 2.1 }, // cage thoracique
  { c: [0, 0.79, 0.2], rad: [0.165, 0.18, 0.17], n: 2.2, k: 0.07 }, // épaules et garrot
  { c: [0, 0.61, 0.26], rad: [0.145, 0.205, 0.17], n: 2.1, k: 0.07 }, // poitrail profond
  { c: [0, 0.83, -0.16], rad: [0.15, 0.11, 0.26], n: 2.3, k: 0.07 }, // reins
  { c: [0, 0.79, -0.31], rad: [0.165, 0.165, 0.17], n: 2.2, k: 0.07 }, // croupe ronde
  { c: [0, 0.645, -0.06], rad: [0.155, 0.13, 0.19], n: 2.1, k: 0.08 }, // ventre qui remonte vers les cuisses
];
for (const sx of [-1, 1]) {
  CORPS.push(
    { c: [sx * 0.1, 0.68, -0.3], rad: [0.082, 0.22, 0.15], n: 2.4, k: 0.06 }, // cuisse
    { c: [sx * 0.09, 0.575, 0.24], rad: [0.072, 0.182, 0.095], n: 2.3, k: 0.07 }, // avant-bras
  );
}
const CC = [0, 0.7, -0.02];
const CR = [0.19, 0.27, 0.48];
const corps = union(CORPS, { centre: CC, rad: CR });
const versCorps = (x, y, z) => [(x - CC[0]) / CR[0], (y - CC[1]) / CR[1], (z - CC[2]) / CR[2]];

// taches d'été : deux rangées de part et d'autre de l'échine, du garrot à la croupe (point visé, demi-tailles
// angulaires le long du corps et en travers, graine)
const TACHES = [];
[[0.13, 0.07], [0.02, 0.08], [-0.09, 0.075], [-0.2, 0.07], [0.075, 0.105], [-0.035, 0.11], [-0.145, 0.105]].forEach(([z, x], i) => {
  for (const sx of [-1, 1]) TACHES.push([[sx * x, 0.97, z], i < 4 ? [0.055, 0.075] : [0.045, 0.06], 1 + i * 2 + (sx > 0 ? 1 : 0)]);
});

// --- cou : union dans son repère (axe +y, gorge vers +z), incliné de NECK au montage -----------------
const COU = union([
  { c: [0, 0.07, 0.012], rad: [0.11, 0.18, 0.14], n: 2.1 }, // attache, large, dans le poitrail
  { c: [0, 0.28, 0], rad: [0.08, 0.18, 0.094], k: 0.1 }, // cou élancé
  { c: [0, 0.47, 0.004], rad: [0.07, 0.105, 0.08], k: 0.06 }, // haut du cou, sous la nuque
], { centre: [0, 0.27, 0], rad: [0.09, 0.32, 0.11] });

// --- tête (repère de la tête : origine au pivot, au bout du cou) ---------------------------------
// points donnés dans le repère du corps au repos, ramenés au pivot de la tête
const T = (x, y, z) => [x, y - HW.y, z - HW.z];
const PENTE = 0.698; // chanfrein incliné de 40° sous l'horizontale
const D = new THREE.Vector3(0, -Math.sin(PENTE), Math.cos(PENTE));
const C0 = new THREE.Vector3(0, 1.25, 0.54); // centre du crâne
const MU = C0.clone().addScaledVector(D, 0.18); // centre du museau
const TIP = MU.clone().addScaledVector(D, 0.09); // bout du museau
const NEZ = MU.clone().addScaledVector(D, 0.066).add(new THREE.Vector3(0, 0.01, 0)); // centre de la truffe
const TETE = [
  { c: C0.toArray(), rad: [0.132, 0.124, 0.132], n: 2.1 }, // crâne rond
  { c: [0, 1.265, 0.605], rad: [0.108, 0.08, 0.08], k: 0.05 }, // front large
  { c: MU.toArray(), rad: [0.07, 0.072, 0.09], n: 2.5, r: [PENTE, 0, 0], k: 0.06 }, // museau court, bout arrondi
  { c: MU.clone().add(new THREE.Vector3(0, -0.034, -0.035)).toArray(), rad: [0.052, 0.04, 0.072], r: [PENTE, 0, 0], k: 0.04 }, // mâchoire et menton
  { c: NEZ.toArray(), rad: [0.045, 0.034, 0.03], r: [PENTE, 0, 0], k: 0.012 }, // truffe bombée
];
for (const sx of [-1, 1]) {
  TETE.push(
    { c: [sx * 0.064, 1.19, 0.57], rad: [0.06, 0.062, 0.075], k: 0.05 }, // joue
    { c: [sx * 0.076, 1.285, 0.64], rad: [0.034, 0.02, 0.03], k: 0.03 }, // arcade au-dessus de l'œil
  );
}
for (const f of TETE) f.c = T(...f.c);
const TC = T(0, 1.19, 0.6);
const TR = [0.13, 0.16, 0.2];
const tete = union(TETE, { centre: TC, rad: TR });
const versTete = (x, y, z) => { const [a, b2, c] = T(x, y, z); return new THREE.Vector3((a - TC[0]) / TR[0], (b2 - TC[1]) / TR[1], (c - TC[2]) / TR[2]); };
// axe des pôles de la tête : vers le centre de la truffe ; truffe, puis bout crème, sur des parallèles
const AXE_TETE = versTete(...NEZ.toArray()).normalize();
function surTete(d) {
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  tete.at(d.clone().normalize(), p, n);
  return { p, n };
}

// géométries coûteuses (peaux calculées par lancer de rayons) : calculées une fois, rejouées ensuite
const MEMO = new Map();
function rejoue(b, key, draw, opts = {}) {
  let rec = MEMO.get(key);
  if (!rec) {
    rec = [];
    draw({ add: (g, color, o) => rec.push([g, color, o]) });
    MEMO.set(key, rec);
  }
  for (const [g, color, o] of rec) b.add(g, color, { ...o, ...opts });
}
// builder relais : impose des options (identifiant de contour, couleur…) aux géométries d'une aide
const avec = (b, force) => ({ add: (g, color, o) => b.add(g, force.color ?? color, { ...o, ...force, color: undefined }) });

// répartition des méridiens : nb méridiens sur la bande de demi-largeur hb autour de φ = π, le reste ailleurs
function meridiens(w, nb, hb) {
  const j0 = (w - nb) / 2;
  const j1 = j0 + nb;
  return (v, k) => {
    const j = k * w;
    const h = hb(v);
    if (j <= j0) return (j / j0) * (Math.PI - h);
    if (j <= j1) return Math.PI - h + ((j - j0) / nb) * 2 * h;
    return Math.PI + h + ((j - j1) / (w - j1)) * (Math.PI - h);
  };
}

// oreilles (feuilles creusées) et intérieur rosé
const EAR = leafGeo(10, 6, 0.6);
const EAR_IN = leafGeo(8, 4, 0.4);
const EAR_LITE = leafGeo(7, 4, 0.6);
const EAR_IN_LITE = leafGeo(6, 3, 0.4);
// onglons (demi-sabots fendus)
const ONGLONS = new Map();
const onglon = (s, lite) => {
  const key = `${s}${lite}`;
  if (!ONGLONS.has(key)) ONGLONS.set(key, onglonGeo(s, { R: [0.02, 0.022, 0.034], effile: [0.3, 0.35], avant: 0.006, w: lite ? 8 : 10, h: lite ? 3 : 4 }));
  return ONGLONS.get(key);
};

// bois (côté droit, repère du corps au repos ; le gauche en miroir) : merrain qui part vers l'arrière puis
// remonte, trois andouillers vers l'avant (œil, chevillure, empaumure) ; rayons par point, bouts arrondis
const MERRAIN = [[0.062, 1.372, 0.551], [0.094, 1.432, 0.53], [0.148, 1.506, 0.48], [0.207, 1.574, 0.43], [0.256, 1.645, 0.41], [0.282, 1.715, 0.428], [0.288, 1.776, 0.468]];
const R_MERRAIN = [0.03, 0.028, 0.025, 0.022, 0.019, 0.016, 0.012];
const ANDOUILLERS = [
  [[[0.094, 1.432, 0.53], [0.114, 1.468, 0.61], [0.127, 1.522, 0.678]], [0.019, 0.015, 0.01]], // andouiller d'œil
  [[[0.207, 1.574, 0.43], [0.228, 1.628, 0.525], [0.238, 1.686, 0.582]], [0.018, 0.014, 0.009]], // chevillure
  [[[0.282, 1.715, 0.428], [0.328, 1.748, 0.424], [0.352, 1.795, 0.414]], [0.016, 0.012, 0.008]], // empaumure
];

// queue courte : dos teinté, dessous blanc. limb range ses faces anneau par anneau puis côté par côté (deux
// triangles par case), le dôme du bout en éventail : le côté j = sides / 2 est le dessous (le premier
// côté, j = 0, part vers le haut à la racine)
function queue(b, lite) {
  const sides = lite ? 6 : 10;
  const rings = lite ? 3 : 6;
  let geo = null;
  limb({ add: (g) => { geo = g; } }, COAT, [[0, 0.005, 0.05], [0, 0, 0], [0, -0.03, -0.032], [0, -0.072, -0.05], [0, -0.112, -0.055]], [0.028, 0.028, 0.026, 0.021, 0.015], { sides, rings, end: 'round' });
  const idx = geo.index.array;
  const quads = 2 * (rings + 2) * sides;
  const dessus = [];
  const dessous = [];
  for (let t = 0; t < idx.length / 3; t++) {
    const j = t < quads ? Math.floor(t / 2) % sides : t - quads;
    (Math.abs(j - sides / 2) <= sides / 5 ? dessous : dessus).push(idx[3 * t], idx[3 * t + 1], idx[3 * t + 2]);
  }
  for (const [list, color, tint] of [[dessus, COAT, 1], [dessous, MIROIR, 0]]) {
    const g = geo.clone();
    g.setIndex(list);
    b.add(g, color, { tint, s: [1.1, 1, 0.85] });
  }
}

// lite : version allégée pour les cerfs lointains (mêmes pièces, pivots, animations et parents)
function cerf(lite = false) {
  const L = lite ? 'lite' : 'fin';
  // corps, cou et peau de la tête : identifiant partagé (soudés, pas de trait au raccord)
  const skin = nextId();
  const body = part((b) => {
    rejoue(b, `corps-${L}`, (r) => {
      // pôles au-devant du poitrail et au centre du miroir (normales tirées du champ : pas de pli) ; méridien
      // 0 sur l'échine ; ventre et intérieur des cuisses sur une bande de méridiens autour de φ = π, qui
      // s'élargit sous le ventre et se resserre entre les cuisses ; miroir sur les derniers parallèles
      const W = lite ? 16 : 28;
      const H = lite ? 11 : 20;
      const NB = lite ? 4 : 8;
      const NM = lite ? 2 : 4;
      const vm = 1 - NM / H;
      const tm = (ph) => 0.54 + 0.08 * Math.cos(ph) + 0.03 * Math.cos(2 * ph);
      const hb = (v) => 0.22 + 0.5 * Math.sin(Math.PI * Math.min(1, Math.max(0, (v - 0.33) / 0.47))) ** 0.8;
      const ib = Math.round(H * 0.37);
      const j0 = (W - NB) / 2;
      grilleZones(r, corps, W, H, {
        axe: [0, 0, 1], haut: [0, 1, 0],
        phi: meridiens(W, NB, hb),
        theta: (v, ph) => (v <= vm ? ((Math.PI - tm(ph)) * v) / vm : Math.PI - (tm(ph) * (1 - v)) / (1 - vm)),
        zone: (i, j) => (i >= H - NM ? 2 : i >= ib && j >= j0 && j < j0 + NB ? 1 : 0),
        zones: [[COAT, 1], [CREAM, 0], [MIROIR, 0]],
      });
      // taches d'été, claires et discrètes, qui épousent le dos
      for (const [p, size, seed] of TACHES) {
        patch(avec(r, { color: TACHE, tint: 0.35 }), corps, versCorps(...p), size, seed, { lift: lite ? 0.008 : 0.004, seg: lite ? 5 : 10, couronnes: [1], tol: lite ? null : 0.003 });
      }
    });
  }, [0, 0, 0], 'none', 1, 0, skin);
  // cou : pivot dans le poitrail, il porte la tête (pièce suivante) ; tache crème de la gorge, sous la mâchoire
  const neck = part((b) => {
    rejoue(b, `cou-${L}`, (r) => {
      grilleZones(r, COU, lite ? 10 : 14, lite ? 7 : 11, { axe: [0, 1, 0], haut: [0, 0, -1], zones: [[COAT, 1]], r: [NECK, 0, 0] });
      patch(avec(r, { color: CREAM, tint: 0, r: [NECK, 0, 0] }), COU, [0, 0.62, 1], [0.32, 0.5], 5, { lift: lite ? 0.006 : 0.003, seg: lite ? 8 : 16, couronnes: lite ? [1] : [0.5, 1], tol: lite ? null : 0.002 });
    });
  }, NP, 'neck', 1, 0, skin);
  // tête d'un seul tenant : truffe, puis bout du museau et menton crème, sur les premiers parallèles
  const head = part((b) => {
    const H = lite ? 12 : 24;
    const IN = lite ? 2 : 3;
    const IC = lite ? 5 : 9;
    // bords (angle depuis le centre de la truffe) : truffe ronde ; crème étroit dessus, jusque sous la mâchoire
    const bn = (ph) => 0.22 + 0.03 * Math.cos(ph) - 0.015 * Math.cos(2 * ph);
    const bc = (ph) => 0.6275 - 0.315 * Math.cos(ph) + 0.1075 * Math.cos(2 * ph);
    rejoue(b, `tete-${L}`, (r) => {
      grilleZones(r, tete, lite ? 14 : 28, H, {
        axe: AXE_TETE.toArray(), haut: [0, 1, 0],
        theta: (v, ph) => {
          const vn = IN / H;
          const vc = IC / H;
          if (v <= vn) return (bn(ph) * v) / vn;
          if (v <= vc) return bn(ph) + ((bc(ph) - bn(ph)) * (v - vn)) / (vc - vn);
          return bc(ph) + (Math.PI - bc(ph)) * ((v - vc) / (1 - vc)) ** 1.1;
        },
        zone: (i) => (i < IN ? 0 : i < IC ? 1 : 2),
        zones: [[TRUFFE, 0], [CREAM, 0], [COAT, 1]],
      });
    }, { id: skin });
    // naseaux : virgules sombres sur la truffe, et reflet de la truffe (pas en version allégée)
    if (!lite) {
      for (const sx of [-1, 1]) {
        const { p, n } = surTete(versTete(sx * 0.019, 1.058, 0.787));
        const q = new THREE.Quaternion().setFromAxisAngle(n, sx * 0.5).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
        const e = new THREE.Euler().setFromQuaternion(q);
        b.add(G.sphere(1, 10, 3), NASEAU, { p: p.clone().addScaledVector(n, -0.001).toArray(), s: [0.0075, 0.0115, 0.003], r: [e.x, e.y, e.z], tint: 0 });
      }
      const { p, n } = surTete(versTete(0, 1.084, 0.77));
      b.add(G.sphere(1, 10, 3), '#a08886', { p: p.clone().addScaledVector(n, 0.0005).toArray(), s: [0.011, 0.005, 0.006], r: [-0.5, 0, 0], tint: 0 });
    }
    // yeux en amande : perle sombre allongée le long du visage, coin avant un peu plus bas, reflet
    for (const sx of [-1, 1]) {
      const { p, n } = surTete(versTete(sx * 0.1, 1.275, 0.625));
      const f = new THREE.Vector3(0, -0.28, 1).addScaledVector(n, -new THREE.Vector3(0, -0.28, 1).dot(n)).normalize();
      // repère direct : grand axe le long du visage, petit axe, normale de la peau
      const Y = new THREE.Vector3().crossVectors(n, f);
      const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, Y, n));
      const r = 0.027;
      b.add(G.sphere(1, lite ? 8 : 10, lite ? 6 : 8), EYE, { p: p.clone().addScaledVector(n, -0.009).toArray(), s: [r * 1.45, r * 0.88, r * 0.62], r: [e.x, e.y, e.z], tint: 0 });
      // reflet posé sur la perle, en haut vers l'avant
      const haut = Y.y < 0 ? Y.clone().negate() : Y;
      const hl = p.clone().addScaledVector(n, -0.009).addScaledVector(f, r * 1.45 * 0.3).addScaledVector(haut, r * 0.88 * 0.42).addScaledVector(n, r * 0.62 * 0.8);
      b.add(G.sphere(r * 0.26, lite ? 6 : 10, lite ? 3 : 4), '#ffffff', { p: hl.toArray(), tint: 0 });
    }
    // oreilles : grandes feuilles creusées, portées sur les côtés, un peu relevées ; intérieur rosé vers
    // l'avant (contour séparé de la tête)
    for (const sx of [-1, 1]) {
      const id = nextId();
      const X = new THREE.Vector3(0.85, 0.4, -0.32).normalize();
      const Z = new THREE.Vector3(0.3, 0.15, 1).addScaledVector(X, -new THREE.Vector3(0.3, 0.15, 1).dot(X)).normalize();
      const Y = new THREE.Vector3().crossVectors(Z, X);
      const eo = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
      if (sx < 0) eo.set(eo.x, -eo.y, -eo.z);
      const base = new THREE.Vector3(sx * 0.088, 1.335, 0.5);
      const at = (o) => new THREE.Vector3(...o).applyEuler(eo).add(new THREE.Vector3(...T(...base.toArray()))).toArray();
      const [E, EI] = lite ? [EAR_LITE, EAR_IN_LITE] : [EAR, EAR_IN];
      const ear = sx > 0 ? E : E.clone().scale(-1, 1, 1);
      const inner = sx > 0 ? EI : EI.clone().scale(-1, 1, 1);
      b.add(ear, COAT, { p: at([sx * 0.088, 0, 0]), s: [0.095, 0.052, 0.026], r: [eo.x, eo.y, eo.z], tint: 1, id });
      b.add(inner, OREILLE, { p: at([sx * 0.092, 0, 0.008]), s: [0.077, 0.039, 0.013], r: [eo.x, eo.y, eo.z], tint: 0, id });
    }
    // bois : pivot (peau du crâne), meule en anneau, merrain et andouillers d'un même contour par bois
    for (const sx of [-1, 1]) {
      const id = nextId();
      const M = (q) => T(sx * q[0], q[1], q[2]);
      limb(avec(b, { id: skin }), COAT, [M([0.03, 1.31, 0.552]), M([0.048, 1.345, 0.551]), M(MERRAIN[0])], [0.028, 0.027, 0.025], { sides: lite ? 6 : 8, rings: 1, tint: 1 });
      const tg = new THREE.Vector3(...MERRAIN[1]).sub(new THREE.Vector3(...MERRAIN[0])).normalize();
      tg.x *= sx;
      const eq = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg));
      b.add(anneauGeo(0.033, 0.033, 2, 0.01, lite ? 4 : 6, lite ? 6 : 12), MEULE, { p: M([0.0645, 1.376, 0.5505]), r: [eq.x, eq.y, eq.z], tint: 0, id });
      const bo = avec(b, { id });
      limb(bo, BOIS, MERRAIN.map(M), R_MERRAIN, { sides: lite ? 6 : 8, rings: lite ? 3 : 6, end: 'round' });
      for (const [pts, radii] of ANDOUILLERS) limb(bo, BOIS, pts.map(M), radii, { sides: lite ? 6 : 8, rings: lite ? 1 : 2, end: 'round' });
    }
  }, HP.toArray(), 'head');
  head.parent = 1;
  // queue courte, dessous blanc, qui remue
  const tail = part((b) => queue(b, lite), [0, 0.9, -0.43], 'tail');
  return [body, neck, head, ...pattes(lite), tail];
}

// pattes (avant gauche, avant droite, arrière gauche, arrière droite, en diagonale) : pivot dans le corps,
// tube lisse aux rayons marqués (coude, genou, canon, boulet, paturon ; à l'arrière, jarret en angle), deux
// onglons sombres arrondis, fente nette
const AVANT = {
  pivot: [0.088, 0.6, 0.245],
  pts: [[0, 0, 0], [0, -0.14, 0], [0, -0.25, 0.004], [0, -0.31, 0.008], [0, -0.335, 0.01], [0, -0.37, 0.008], [0, -0.47, 0.004], [0, -0.5, 0.008], [0, -0.54, 0.018], [0, -0.578, 0.024]],
  radii: [0.055, 0.05, 0.04, 0.032, 0.035, 0.027, 0.024, 0.029, 0.022, 0.02],
};
const ARRIERE = {
  pivot: [0.1, 0.66, -0.3],
  pts: [[0, 0, 0], [0, -0.12, 0.03], [0, -0.22, 0], [0, -0.3, -0.045], [0, -0.36, -0.075], [0, -0.4, -0.07], [0, -0.52, -0.05], [0, -0.56, -0.045], [0, -0.6, -0.033], [0, -0.638, -0.027]],
  radii: [0.065, 0.06, 0.05, 0.036, 0.032, 0.026, 0.023, 0.029, 0.022, 0.02],
};
function pattes(lite) {
  const out = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
    const P = sz > 0 ? AVANT : ARRIERE;
    const hip = P.pivot[1];
    out.push(part((b) => {
      limb(b, COAT, P.pts, P.radii, { sides: lite ? 6 : 8, rings: lite ? 4 : P.pts.length - 1, tint: 1 });
      const f = P.pts[P.pts.length - 1];
      for (const s of [-1, 1]) b.add(onglon(s, lite), ONGLE, { p: [f[0] + s * 0.0015, -hip, f[2] + 0.004], tint: 0 });
    }, [sx * P.pivot[0], hip, P.pivot[2]], 'leg', 1, ph));
  }
  return out;
}

export const espece = {
  speed: 1.4, scale: 1.2, shadow: true, shy: 7, graze: 2.15, nod: -0.95, muzzle: T(...TIP.toArray()), top: 1.8,
  coats: [["Fauve d'été", '#c98f5f'], ["Brun d'hiver", '#8d6a52']],
  parts: () => cerf(),
  // au-delà de 20 m du joueur, la version allégée (mêmes pièces)
  lod: () => cerf(true), lodDist: 20,
};

export default fiche('ANI-004', 'cerf', 'Cerf', species('cerf', espece), { budget: { triangles: 6000, lod: 2500 }, exceptions: { pattes: [0.4, 0.45] } });
