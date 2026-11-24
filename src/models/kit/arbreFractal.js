// Arbre fractal : portage de l'arbre de l'utilisateur (projet « Jeux vidéo aprentissage », src/arbre.js).
// Une branche est une chaîne de segments courbés qui porte à son sommet `enfants` versions plus petites
// d'elle-même ; l'arbre entier émerge de cette seule règle. Même recette et même graine = même arbre, à la
// branche près : générateur mulberry32 (celui de l'original) et même ordre de tirage, feuilles comprises.
//
// squelette(recette) rend les branches (points en mètres, à l'échelle 1) et les feuilles de l'original ;
// les modèles en tirent :
//   boisFractal(b, sq, …)    : le bois, un tube lisse par branche (limb), jusqu'à la génération voulue ;
//   touffesFractal(sq, …)    : le feuillage en touffes peintes, une par sous-arbre (les feuilles de
//                              l'original regroupées), teintées par exposition comme dans l'original ;
//   couronneFractal(touffes) : l'enveloppe du houppier (ombre portée, forme lointaine).
import * as THREE from 'three';
import { mulberry32 } from '../../core/random.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder } from '../../render/builder.js';
import { buildClumpGeometry } from '../../render/foliage.js';
import { limb } from './formes.js';

// La recette de l'original. Le coût est exponentiel en profondeur (enfants ^ profondeur branches).
export const RECETTE = Object.freeze({
  graine: 42,
  profondeur: 6, // générations de branches
  enfants: 3, // branches filles par branche
  longueurTronc: 3.6,
  rayonTronc: 0.42, // + évasement du pied (profilRayon)
  reduction: 0.78, // une fille fait 78 % de la longueur de sa mère
  effilement: 0.74, // … et 74 % de son épaisseur
  ouverture: 36, // écartement des branches, en degrés
  courbure: 0.1, // chaque segment se redresse un peu : la branche fait un arc
  hasard: 0.38, // 0 = fractale parfaite, 1 = chaos
  feuillesParSegment: 8,
  tailleFeuille: 0.4,
  // ajout (absent de l'original, nul par défaut) : les dernières générations plient vers l'extérieur et
  // retombent (saule) ; n'ajoute aucun tirage, la graine donne la même ramure
  retombee: 0,
});

// Rayon le long d'une branche (t : 0 à la base, 1 au sommet) : décroissance linéaire, plus l'évasement
// en puissance 3 du tronc (le contrefort des vieux arbres, qui plante l'arbre dans le sol).
function profilRayon(P, rayon, t, estTronc) {
  const r = rayon * (1 - t * (1 - P.effilement));
  return estTronc ? r * (1 + 0.85 * Math.pow(1 - t, 3)) : r;
}

const CACHE = new Map();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _rot = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YZX');

// Squelette de l'arbre (mémorisé par recette) :
//   branches : [{ gen, tronc, parent, pts: [[x, y, z]…] (base de chaque segment puis sommet), radii }]
//   feuilles : [{ p: [x, y, z], q: [x, y, z, w], t (taille), expo (0 cœur à 1 périphérie), j: [3 tirages],
//                 branche }] — exactement les feuilles de l'original
//   hauteur : point le plus haut des feuilles ; ancetre(i, gen) : branche de génération gen qui porte i
export function squelette(recette = {}) {
  const P = { ...RECETTE, ...recette };
  const cle = JSON.stringify(P);
  const deja = CACHE.get(cle);
  if (deja) return deja;
  const alea = mulberry32(P.graine);
  const entre = (a, b) => a + alea() * (b - a);
  const branches = [];
  const rameaux = []; // segments des deux derniers niveaux : là où poussent les feuilles

  function creerBranche(longueur, rayon, profondeur, parent) {
    const pivot = new THREE.Group();
    const estTronc = profondeur === P.profondeur;
    const nbSeg = estTronc ? 6 : 3;
    const lSeg = longueur / nbSeg;
    let sommet = pivot;
    const idx = branches.length;
    const br = { gen: profondeur, tronc: estTronc, parent, segs: [], lSeg, radii: [] };
    branches.push(br);
    for (let s = 0; s <= nbSeg; s++) br.radii.push(profilRayon(P, rayon, s / nbSeg, estTronc));
    // retombée : pleine aux rameaux, nulle à partir des 40 % les plus hauts de la ramure
    const retombe = P.retombee * THREE.MathUtils.clamp(1 - profondeur / (P.profondeur * 0.6), 0, 1);
    for (let s = 0; s < nbSeg; s++) {
      const segment = new THREE.Group();
      // la courbure : le segment se redresse vers l'axe du parent, avec un peu de bruit
      segment.rotation.set(
        entre(-0.05, 0.05) * P.hasard,
        entre(-0.05, 0.05),
        (estTronc ? -0.02 : -P.courbure + retombe) + entre(-0.06, 0.06) * P.hasard,
      );
      sommet.add(segment);
      const suivant = new THREE.Group();
      suivant.position.y = lSeg;
      segment.add(suivant);
      sommet = suivant;
      br.segs.push(segment);
      // les DEUX derniers niveaux portent des feuilles (sinon la couronne reste transparente)
      if (profondeur <= 1) rameaux.push({ segment, lSeg, densite: profondeur === 0 ? 1 : 0.5, branche: idx });
    }
    if (profondeur > 0) {
      for (let i = 0; i < P.enfants; i++) {
        const enfant = creerBranche(
          longueur * P.reduction * entre(1 - P.hasard * 0.3, 1 + P.hasard * 0.3),
          rayon * P.effilement,
          profondeur - 1,
          idx,
        );
        enfant.position.y = entre(-lSeg * 0.6, 0);
        // Z écarte la branche de l'axe de sa mère, Y la répartit en éventail autour de cet axe
        const ouverture = THREE.MathUtils.degToRad(P.ouverture * entre(1 - P.hasard, 1 + P.hasard));
        enfant.rotation.set(0, (i / P.enfants) * Math.PI * 2 + entre(0, P.hasard * 2), ouverture);
        sommet.add(enfant);
      }
    }
    return pivot;
  }

  const racine = creerBranche(P.longueurTronc, P.rayonTronc, P.profondeur, -1);
  // Three ne calcule les positions absolues qu'au rendu : sans cet appel, tout reste à l'origine
  racine.updateMatrixWorld(true);

  for (const br of branches) {
    br.pts = br.segs.map((s) => _v.setFromMatrixPosition(s.matrixWorld).toArray());
    const last = br.segs[br.segs.length - 1];
    br.pts.push(_v.set(0, br.lSeg, 0).applyMatrix4(last.matrixWorld).toArray());
  }

  // Les feuilles, dans l'ordre de tirage de l'original (dix tirages par feuille)
  const feuilles = [];
  let hauteur = 0;
  for (const { segment, lSeg, densite, branche } of rameaux) {
    segment.getWorldQuaternion(_q);
    const nb = Math.round(P.feuillesParSegment * densite);
    for (let i = 0; i < nb; i++) {
      // position le long du rameau (semer en nuage ferait flotter les feuilles dans le vide)
      _v.set(entre(-0.03, 0.03), entre(0.05, 1) * lSeg, entre(-0.03, 0.03)).applyMatrix4(segment.matrixWorld);
      // orientation : celle du rameau, puis une rotation locale au hasard (quat * rot)
      _e.set(entre(-0.5, 0.5), entre(0, Math.PI * 2), entre(0.6, 2.3));
      _rot.setFromEuler(_e);
      const t = P.tailleFeuille * entre(0.75, 1.3);
      const j = [entre(0, 1), entre(0, 1), entre(0, 1)];
      // exposition : périphérie et cime prennent la lumière, le cœur de la couronne reste sombre
      const expo = THREE.MathUtils.clamp((Math.hypot(_v.x, _v.z) / 8.5) * 0.55 + ((_v.y - 4) / 9) * 0.45, 0, 1);
      feuilles.push({ p: _v.toArray(), q: _q.clone().multiply(_rot).toArray(), t, expo, j, branche });
      hauteur = Math.max(hauteur, _v.y);
    }
  }

  // la hiérarchie de Three n'est plus utile : on ne garde que des nombres
  for (const br of branches) delete br.segs;
  const ancetre = (i, gen) => {
    let k = i;
    while (k >= 0 && branches[k].gen < gen) k = branches[k].parent;
    return k;
  };
  const sq = { P, branches, feuilles, hauteur, ancetre };
  CACHE.set(cle, sq);
  return sq;
}

// Le bois : un tube lisse par branche (pas de fente aux jointures), des générations P.profondeur à
// genMin ; la dernière génération dessinée s'arrête en pointe à coupe × sa longueur (ses filles sont dans les touffes). Le
// pied du tronc descend de `enfoui` m sous le sol (pentes).
//   cotes(gen, tronc), anneaux(gen, tronc) : finesse des tubes
//   epaisseur : grossit le tronc (× epaisseur) et les grosses branches, de moins en moins vers les rameaux
//   (× 1 + (epaisseur − 1) × (gen / profondeur)²) : la ramure reste fine, l'arbre est planté
//   sansTronc : le tronc est construit à part (troncFractal : contreforts, cannelures, racines)
export const grossit = (sq, gen, epaisseur) => 1 + (epaisseur - 1) * Math.pow(gen / sq.P.profondeur, 2);
export function boisFractal(b, sq, { echelle = 1, genMin = 0, couleur = '#b98a64', cotes, anneaux, enfoui = 0.15, tint = 1, coupe = 0.55, epaisseur = 1, sansTronc = false } = {}) {
  const k = echelle;
  for (const br of sq.branches) {
    if (br.gen < genMin) continue;
    if (sansTronc && br.tronc) continue;
    const pts = br.pts.map(([x, y, z]) => [x * k, y * k, z * k]);
    const ep = grossit(sq, br.gen, epaisseur);
    const radii = br.radii.map((r) => r * k * ep);
    if (br.tronc) {
      // le pied plonge sous le sol, un peu plus large que le contrefort
      pts.unshift([pts[0][0], -enfoui, pts[0][2]]);
      radii.unshift(radii[0] * 1.04);
    }
    if (br.gen === genMin && !br.tronc) {
      // dernière génération dessinée : elle s'arrête à mi-longueur, en pointe, dans sa touffe (sinon son
      // bout nu dépasse du houppier, les rameaux qu'elle porte se recourbant vers l'intérieur)
      const n = pts.length - 1;
      const t = coupe * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      const bout = pts[i].map((v, a) => v + (pts[i + 1][a] - v) * f);
      const rb = radii[i] + (radii[i + 1] - radii[i]) * f;
      pts.splice(i + 1, pts.length, bout);
      radii.splice(i + 1, radii.length, rb * 0.35);
    }
    limb(b, couleur, pts, radii, {
      sides: cotes ? cotes(br.gen, br.tronc) : br.tronc ? 10 : 5,
      rings: anneaux ? anneaux(br.gen, br.tronc) : pts.length - 1,
      tint,
    });
  }
}

// Le tronc, plus travaillé que les branches : le tube de l'original (évasé au pied) grossi × epaisseur, puis
// sculpté. Au pied, des contreforts (lobes) dans l'axe de chaque racine, creusés entre elles, qui se
// fondent dans le fût vers le tiers de sa hauteur ; sur le fût, des cannelures irrégulières (la peau d'un
// vieux tronc) ; et des racines qui partent des contreforts et plongent dans le sol. Angles des racines
// tirés de la graine de la recette (le même arbre a toujours les mêmes racines).
//   cannelures : 0 (version forêt) à 1 ; racines : nombre ; cotes, anneaux : finesse du fût
export function troncFractal(b, sq, { echelle = 1, epaisseur = 1, couleur = '#b98a64', cotes = 10, anneaux = 7, enfoui = 0.15, cannelures = 0, racines = 4, cotesRacine = 5, anneauxRacine = 3, tint = 1 } = {}) {
  const tr = sq.branches.find((br) => br.tronc);
  const k = echelle;
  const pts = tr.pts.map(([x, y, z]) => [x * k, y * k, z * k]);
  const radii = tr.radii.map((r) => r * k * epaisseur);
  pts.unshift([pts[0][0], -enfoui, pts[0][2]]);
  radii.unshift(radii[0] * 1.04);
  const t = new Builder(b.defaultId);
  limb(t, couleur, pts, radii, { sides: cotes, rings: anneaux, tint });
  const rnd = mulberry32((sq.P.graine * 7919 + 13) >>> 0);
  const a0 = rnd() * Math.PI * 2;
  const angles = [];
  for (let i = 0; i < racines; i++) angles.push(a0 + (i / racines) * Math.PI * 2 + (rnd() - 0.5) * 0.6);
  const R0 = radii[1]; // rayon au sol, contrefort de l'original compris
  const H = pts[pts.length - 1][1];
  const g = mergeVertices(t.build(), 1e-5);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // axe du tronc à cette hauteur (le tronc monte : interpolation sur y)
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1][1] < y) j++;
    const u = THREE.MathUtils.clamp((y - pts[j][1]) / Math.max(pts[j + 1][1] - pts[j][1], 1e-4), 0, 1);
    const ax = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u;
    const az = pts[j][2] + (pts[j + 1][2] - pts[j][2]) * u;
    const dx = pos.getX(i) - ax;
    const dz = pos.getZ(i) - az;
    const th = Math.atan2(dz, dx);
    let lobe = 0;
    for (const a of angles) {
      const d = Math.atan2(Math.sin(th - a), Math.cos(th - a));
      lobe = Math.max(lobe, Math.exp((-d * d) / 0.09));
    }
    const bas = Math.pow(1 - THREE.MathUtils.clamp(y / (H * 0.32), 0, 1), 2.2);
    const contrefort = bas * (0.26 * lobe - 0.07);
    const peau = cannelures * (0.045 * Math.sin(6 * th + y * 1.3) + 0.025 * Math.sin(13 * th - y * 2.7));
    const f = 1 + contrefort + peau;
    pos.setXYZ(i, ax + dx * f, y, az + dz * f);
  }
  g.computeVertexNormals();
  b.addBuilt(g.toNonIndexed());
  // racines : nées dans le contrefort, basses et rondes, elles courent un peu au ras du sol puis plongent,
  // effilées (ni coins ni planches)
  const cx = pts[1][0];
  const cz = pts[1][2];
  for (const a of angles) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const L = R0 * (1.6 + rnd() * 0.5);
    const p0 = [cx + c * R0 * 0.45, R0 * 0.32, cz + s * R0 * 0.45];
    const p1 = [cx + c * R0 * 1.0, R0 * 0.1, cz + s * R0 * 1.0];
    const p2 = [cx + c * L, -0.1 - R0 * 0.12, cz + s * L];
    limb(b, couleur, [p0, p1, p2], [R0 * 0.3, R0 * 0.2, R0 * 0.05], { sides: cotesRacine, rings: anneauxRacine, tint });
  }
  return { R0, angles };
}

// Le Builder rend des triangles séparés (trois sommets chacun) ; les tubes du bois partagent leurs sommets :
// réindexés, ils passent 3 à 4 fois moins de sommets au shader (des milliers d'arbres instanciés)
export function indexe(geo) {
  const g = mergeVertices(geo, 1e-5);
  g.computeBoundingSphere();
  return g;
}

// Balancement au vent du bois (attribut aSway du Builder, lu par le matériau des végétaux) : nul sous
// `pied` m, puis croissant avec la hauteur jusqu'à `haut` au sommet (h : hauteur de l'arbre). Les feuilles
// (feuillesFractal) reprennent la même formule à leur attache : elles suivent leur branche.
export const BALANCE = { pied: 1.0, haut: 1.9 };
export function balancement(geo, h, { pied = BALANCE.pied, haut = BALANCE.haut } = {}) {
  const pos = geo.attributes.position;
  const sw = geo.attributes.aSway;
  if (!sw) return geo;
  for (let i = 0; i < pos.count; i++) {
    const y = Math.max(pos.getY(i) - pied, 0) / Math.max(h - pied, 0.01);
    sw.setX(i, haut * Math.pow(Math.min(y, 1.2), 1.5));
  }
  return geo;
}

// Couleur d'exposition de l'original (HSL : cœur sombre et froid → périphérie claire), teinte par espèce
//   teinte : { h: [cœur, périphérie], s: [...], l: [...] }
export function couleurExposition(teinte, expo, j, out = new THREE.Color()) {
  const L = THREE.MathUtils.lerp;
  return out.setHSL(
    L(teinte.h[0], teinte.h[1], expo) + (j[0] - 0.5) * 0.05,
    THREE.MathUtils.clamp(L(teinte.s[0], teinte.s[1], expo) + (j[1] - 0.5) * 0.12, 0, 1),
    THREE.MathUtils.clamp(L(teinte.l[0], teinte.l[1], expo) * (0.78 + j[2] * 0.34), 0, 1),
  );
}

// Le feuillage en touffes : les feuilles de l'original regroupées par sous-arbre de génération genTouffe
// (une touffe par branche de cette génération), au centre de leurs feuilles, du rayon qui les contient
// presque toutes ; couleur d'exposition moyenne. Format des touffes de render/foliage.js.
// variation : part des petits écarts de teinte de l'original (par feuille) gardée sur une touffe entière
export function touffesFractal(sq, { echelle = 1, genTouffe = 2, teinte, ampleur = 1.15, squash = 0.85, density = 1, variation = 0.45 } = {}) {
  const groupes = new Map();
  for (const f of sq.feuilles) {
    const a = sq.ancetre(f.branche, genTouffe);
    let g = groupes.get(a);
    if (!g) groupes.set(a, (g = []));
    g.push(f);
  }
  const touffes = [];
  for (const [, fs] of [...groupes].sort((x, y) => x[0] - y[0])) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let expo = 0;
    for (const f of fs) {
      cx += f.p[0];
      cy += f.p[1];
      cz += f.p[2];
      expo += f.expo;
    }
    const n = fs.length;
    cx /= n;
    cy /= n;
    cz /= n;
    expo /= n;
    let d2 = 0;
    for (const f of fs) d2 += (f.p[0] - cx) ** 2 + ((f.p[1] - cy) / squash) ** 2 + (f.p[2] - cz) ** 2;
    const r = Math.sqrt(d2 / n) * ampleur + sq.P.tailleFeuille * 0.5;
    touffes.push({
      x: cx * echelle,
      y: cy * echelle,
      z: cz * echelle,
      r: r * echelle,
      squash,
      density,
      expo,
      color: couleurExposition(teinte, expo, fs[0].j.map((j) => 0.5 + (j - 0.5) * variation)),
    });
  }
  return touffes;
}

// Arbre feuillu des îles, version forêt (instanciée par milliers, vue au-delà d'une trentaine de mètres) :
// la recette de l'original ramenée à `hauteur` m ; bois des générations P.profondeur à genBois (tubes
// fins, réindexés), touffes peintes une par sous-arbre de génération genTouffe, teintées par exposition ;
// ombre portée : l'enveloppe du houppier. Rend { solid, clumpGeo, crowns, touffes, couronne }
// (format de vegetation.js) ; clumpGeo est construit ici (touffes de quads plus ou moins garnies).
//   options : recette, hauteur, teinte, ecorce, genBois, genTouffe, quads [min, max], seed, ampleur
//   detail : version proche (feuilles une à une, bois fin), voir plus bas ; forme : case de l'atlas des
//   feuilles (render/textures.js, feuillesAtlas : 0 ovale, 1 érable, 2 fleurs, 3 lancéolée)
//   epaisseur : tronc et grosses branches grossis (grossit) ; racines : nombre de racines du tronc
export function arbreFeuillu({ recette = {}, hauteur = 4.7, teinte, ecorce = '#b48a68', genBois = 4, genTouffe = 4, quads = [7, 10], seed = 1, ampleur = 1.15, squash = 0.85, sizeMul = 1, decor = null, forme = 0, epaisseur = 1.6, racines = 5, detail = {} } = {}) {
  const sq = squelette(recette);
  const k = hauteur / sq.hauteur;
  const b = new Builder();
  const P = sq.P;
  // vue au-delà de la bascule (une trentaine de mètres) : tronc à 8 côtés aux contreforts sans cannelures,
  // racines à 4 côtés, branches maîtresses à 5 puis 4 ; la dernière génération dessinée s'arrête aux 85 %
  // de sa longueur, dans sa touffe
  troncFractal(b, sq, { echelle: k, epaisseur, couleur: ecorce, cotes: 8, anneaux: 5, racines, cotesRacine: 4, anneauxRacine: 2 });
  boisFractal(b, sq, {
    echelle: k,
    genMin: genBois,
    couleur: ecorce,
    coupe: 0.85,
    epaisseur,
    sansTronc: true,
    cotes: (gen) => (gen >= P.profondeur - 1 ? 5 : 4),
    anneaux: () => 2,
  });
  const touffes = touffesFractal(sq, { echelle: k, genTouffe, teinte, ampleur, squash });
  const couronne = couronneFractal(touffes);
  // décor propre à l'espèce (fruits…), posé sur les touffes : decor(b, touffes, couronne)
  if (decor) decor(b, touffes, couronne);
  const solid = indexe(balancement(b.build(), hauteur));
  const clumpGeo = normalesCouronne(buildClumpGeometry(touffes, seed, { minQuads: quads[0], maxQuads: quads[1], sizeMul }), couronne);
  // version proche : construite à la demande (premier arbre proche), mémorisée par le modèle
  let proche = null;
  const versionProche = () => (proche ||= arbreProche(sq, { echelle: k, hauteur, teinte, ecorce, couronne, touffes, decor, forme, epaisseur, racines, ...detail }));
  return { solid, clumpGeo, crowns: lobesCouronne(touffes, couronne), touffes, couronne, detail: versionProche };
}

// ---------------------------------------------------------------------------
// Version proche (dans un rayon d'environ 30 m du joueur, quelques dizaines d'arbres à la fois) : les
// feuilles de l'original une à une, une sur `pas` (toutes les feuilles d'une branche restent ensemble de
// place en place), agrandies pour garder la même couverture ; chaque feuille est une carte pliée sur sa
// nervure (4 triangles : la gouttière de l'original, qui accroche la lumière selon son orientation).
// Bois jusqu'à la 2e génération, tubes plus ronds. Rend { solid, leafGeo }.
// ---------------------------------------------------------------------------

// carte de feuille pliée (pied à l'origine, nervure le long de +Y, creusée vers -Z) : 6 sommets, 4 triangles
const CARTE = {
  pos: [-0.34, 0, -0.04, 0, 0, 0, 0.34, 0, -0.04, -0.34, 1, -0.14, 0, 1, -0.1, 0.34, 1, -0.14],
  uv: [0, 0, 0.5, 0, 1, 0, 0, 1, 0.5, 1, 1, 1],
  idx: [0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4],
};

// Attributs des feuilles (lus par feuilleMaterial, render/shaders/materials.js) :
//   position, normal, uv (case de l'atlas), color (teinte d'exposition de l'original),
//   aAncre (attache de la feuille : le vent la déplace avec sa branche), aSway (balancement de la ramure
//   à l'attache, comme le bois), aFeuille (phase et ampleur du frémissement), aNorC (normale de
//   l'enveloppe du houppier : la couronne s'éclaire d'un bloc)
export function feuillesFractal(sq, { echelle = 1, hauteur, teinte, couronne, pas = 6, taille = 1, forme = 0, variation = 1 } = {}) {
  const fs = sq.feuilles.filter((_, i) => i % pas === 0);
  const nV = fs.length * 6;
  const pos = new Float32Array(nV * 3);
  const nor = new Float32Array(nV * 3);
  const uv = new Float32Array(nV * 2);
  const col = new Float32Array(nV * 3);
  const anc = new Float32Array(nV * 3);
  const sway = new Float32Array(nV);
  const fe = new Float32Array(nV * 2);
  const norC = new Float32Array(nV * 3);
  const idx = new Uint32Array(fs.length * 12);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Color();
  // normales de la carte pliée (repère de la feuille)
  const carte = new THREE.BufferGeometry();
  carte.setAttribute('position', new THREE.Float32BufferAttribute(CARTE.pos, 3));
  carte.setIndex(CARTE.idx);
  carte.computeVertexNormals();
  const cn = carte.attributes.normal.array;
  // case de l'atlas : colonne forme % 2 ; ligne 0 (haut de la toile) = v de 0,5 à 1, ligne 1 = v de 0 à 0,5
  const cu = (forme % 2) * 0.5;
  const v0 = Math.floor(forme / 2) === 0 ? 0.5 : 0;
  const nm = new THREE.Matrix3();
  fs.forEach((f, li) => {
    p.fromArray(f.p).multiplyScalar(echelle);
    q.fromArray(f.q);
    const t = f.t * echelle * taille;
    m.compose(p, q, s.set(t, t, t));
    nm.getNormalMatrix(m);
    couleurExposition(teinte, f.expo, f.j.map((j) => 0.5 + (j - 0.5) * variation), c);
    const hy = Math.max(p.y - BALANCE.pied, 0) / Math.max(hauteur - BALANCE.pied, 0.01);
    const sw = BALANCE.haut * Math.pow(Math.min(hy, 1.2), 1.5);
    n.set(p.x - couronne.x, (p.y - couronne.y) / Math.max(couronne.squash, 0.2), p.z - couronne.z).normalize();
    for (let k = 0; k < 6; k++) {
      const o = li * 6 + k;
      v.set(CARTE.pos[k * 3], CARTE.pos[k * 3 + 1], CARTE.pos[k * 3 + 2]).applyMatrix4(m);
      pos.set([v.x, v.y, v.z], o * 3);
      v.set(cn[k * 3], cn[k * 3 + 1], cn[k * 3 + 2]).applyMatrix3(nm).normalize();
      nor.set([v.x, v.y, v.z], o * 3);
      uv.set([cu + CARTE.uv[k * 2] * 0.5, v0 + CARTE.uv[k * 2 + 1] * 0.5], o * 2);
      col.set([c.r, c.g, c.b], o * 3);
      anc.set([p.x, p.y, p.z], o * 3);
      sway[o] = sw;
      fe.set([f.j[0], f.j[1]], o * 2);
      norC.set([n.x, n.y, n.z], o * 3);
    }
    for (let k = 0; k < 12; k++) idx[li * 12 + k] = li * 6 + CARTE.idx[k];
  });
  carte.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aAncre', new THREE.BufferAttribute(anc, 3));
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  g.setAttribute('aFeuille', new THREE.BufferAttribute(fe, 2));
  g.setAttribute('aNorC', new THREE.BufferAttribute(norC, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  g.boundingSphere.radius += 0.5;
  return g;
}

export function arbreProche(sq, { echelle, hauteur, teinte, ecorce, couronne, touffes, decor = null, forme = 0, pas = 8, taille = 2.5, genBois = 2, epaisseur = 1.6, racines = 5 }) {
  const b = new Builder();
  const P = sq.P;
  // de près : fût à 16 côtés et 12 anneaux, contreforts et cannelures, racines à 6 côtés
  troncFractal(b, sq, { echelle, epaisseur, couleur: ecorce, cotes: 16, anneaux: 12, cannelures: 1, racines, cotesRacine: 6, anneauxRacine: 4 });
  boisFractal(b, sq, {
    echelle,
    genMin: genBois,
    couleur: ecorce,
    coupe: 1,
    epaisseur,
    sansTronc: true,
    cotes: (gen) => (gen >= P.profondeur - 1 ? 9 : gen >= P.profondeur - 2 ? 7 : gen > genBois ? 5 : 3),
    anneaux: (gen) => (gen >= P.profondeur - 2 ? 3 : 2),
  });
  if (decor) decor(b, touffes, couronne);
  const solid = indexe(balancement(b.build(), hauteur));
  const leafGeo = feuillesFractal(sq, { echelle, hauteur, teinte, couronne, pas, taille, forme });
  return { solid, leafGeo };
}

// Les touffes s'éclairent comme une seule couronne : leur normale (sphérique, depuis le centre de la
// touffe) est tirée vers celle de l'enveloppe du houppier (depuis son centre). Sans cela, chaque touffe a
// son côté sombre et la couronne se tachette ; avec, le côté au soleil et le côté à l'ombre se lisent d'un
// bloc, les touffes gardant leur relief (part : 0 = touffes seules, 1 = enveloppe seule).
export function normalesCouronne(geo, c, part = 0.6) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const n = new THREE.Vector3();
  const e = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    e.set(pos.getX(i) - c.x, (pos.getY(i) - c.y) / Math.max(c.squash, 0.2), pos.getZ(i) - c.z).normalize();
    n.set(nor.getX(i), nor.getY(i), nor.getZ(i)).lerp(e, part).normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return geo;
}

// Ombre portée du houppier en trois lobes (un par tiers de la couronne, autour du tronc) au lieu d'une seule
// ellipse : l'ombre au sol a la silhouette bosselée de la couronne. [x, y, z, r, aplatissement] chacun.
export function lobesCouronne(touffes, c, n = 3) {
  const t = touffes.slice().sort((a, b) => Math.atan2(a.z - c.z, a.x - c.x) - Math.atan2(b.z - c.z, b.x - c.x));
  const lobes = [];
  for (let k = 0; k < n; k++) {
    const g = t.slice(Math.floor((k * t.length) / n), Math.floor(((k + 1) * t.length) / n));
    if (!g.length) continue;
    let w = 0;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const u of g) {
      x += u.x * u.r;
      y += u.y * u.r;
      z += u.z * u.r;
      w += u.r;
    }
    x /= w;
    y /= w;
    z /= w;
    let r = 0;
    let ry = 0;
    for (const u of g) {
      r = Math.max(r, Math.hypot(u.x - x, u.z - z) + u.r * 0.75);
      ry = Math.max(ry, Math.abs(u.y - y) + u.r * u.squash * 0.75);
    }
    lobes.push([x, y, z, r, Math.min(ry / r, 1.2)]);
  }
  return lobes;
}

// Enveloppe du houppier : centre, rayon horizontal et aplatissement de l'ellipsoïde qui contient les
// touffes (ombre portée [x, y, z, r, aplatissement], forme lointaine) ; bas et haut de la couronne.
export function couronneFractal(touffes) {
  let cx = 0;
  let cz = 0;
  let bas = Infinity;
  let haut = -Infinity;
  for (const t of touffes) {
    cx += t.x;
    cz += t.z;
    bas = Math.min(bas, t.y - t.r * t.squash);
    haut = Math.max(haut, t.y + t.r * t.squash);
  }
  cx /= touffes.length;
  cz /= touffes.length;
  let rh = 0;
  for (const t of touffes) rh = Math.max(rh, Math.hypot(t.x - cx, t.z - cz) + t.r * 0.6);
  const cy = (bas + haut) / 2;
  const ry = (haut - bas) / 2;
  return { x: cx, y: cy, z: cz, r: rh, squash: ry / rh, bas, haut };
}
