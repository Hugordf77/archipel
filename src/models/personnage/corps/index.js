// Corps et visage du personnage (PER-001) : le corps du gabarit choisi (../gabarit.js), habillé selon
// l'avatar. Gabarit aventurier (≈ 4 têtes, 1,50 m sans les cheveux) : dessiné ici ; gabarit chibi : ./chibi.js,
// gardé tel quel pendant le chantier. Tenues et accessoires sont dessinés avec le corps (leurs fiches :
// ../tenues/, ../accessoires/).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from '../../../render/builder.js';
import { SKINS, HAIR_COLORS, CLOTH_COLORS, SHOE_COLORS } from '../../../entities/character/avatar.js';
import { FACE } from '../../../entities/character/face.js';
import { limb, leafGeo } from '../../kit/formes.js';
import { PAL } from '../../kit/palette.js';
import { HC, CREAM, B, ID, GABARIT, TETE_K as K, box, tint, mixHex, Parts } from '../commun.js';
import { HAIR_STYLES, onCap } from '../coupes/index.js';
import { craneGeometry, MENTON, oreilles } from '../tete.js';
import { buildChibiGeometry } from './chibi.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

export function buildAvatarGeometry(av) {
  // le chibi ne connaît pas les bottes de marche (pièce du personnage 2.0) : il garde ses baskets ; il ne
  // porte qu'une pièce d'accessoire, et le sac (emplacement « dos ») seulement s'il n'en a pas d'autre
  if (GABARIT.nom === 'chibi') {
    const chibi = { ...av, shoes: av.shoes === 'marche' ? 'baskets' : av.shoes };
    if (!av.accessory && av.back === 'sac') Object.assign(chibi, { accessory: 'sac', accessoryColor: av.backColor });
    return buildChibiGeometry(chibi);
  }
  return buildAventurier(av);
}

// ---------------------------------------------------------------------------
// Gabarit aventurier : corps trapu et rond, membres courts et épais. Positions absolues (repère du
// personnage, pieds en 0, avant = +z), calées sur les os de repos du gabarit.
// ---------------------------------------------------------------------------
const R = GABARIT.dessin.REST; // positions de dessin (Parts.build les porte au corps réduit)
// torse (os TORSO) : profil tourné [y, rayon en x], aplati en profondeur (ZT). Buste en colonne (rayon
// 0,165, les bras à ±0,165 sortent du flanc), épaules carrées qui montent presque au menton ; ourlet
// enfoui dans le bassin (fond en un seul cône, caché).
const ZT = 0.84;
const TORSO = [[0.7, 0.0], [0.72, 0.15], [0.76, 0.16], [0.82, 0.165], [0.9, 0.165], [0.96, 0.158], [1.0, 0.145], [1.04, 0.12], [1.075, 0.085], [1.1, 0.0]];
const HAUT = TORSO[TORSO.length - 1][0];
// bassin (os HIPS) : profil tourné, pantalon droit (le plus large vers 0,63, pas de bombé), aplati en
// profondeur (ZH) ; les cuisses y entrent (fond en un seul cône, entre les cuisses)
const ZH = 0.72;
const HIPS = [[0.575, 0.0], [0.6, 0.15], [0.63, 0.172], [0.67, 0.17], [0.72, 0.165], [0.76, 0.15], [0.78, 0.0]];

// Couleurs fixes de la tenue des planches (le reste suit l'avatar)
const LAITON = '#f2c14e'; // boutons de la salopette
const BRIQUE = '#d4574a'; // ceinture
const LACET = '#ead6b0'; // lacets des bottes de marche
const SEMELLE = '#f3e6c8'; // semelle crème des bottes de marche

// Identifiants de contour (DA § 5) : deux pièces qui se recouvrent n'en partagent jamais un, sinon l'encre
// ne les sépare pas. Cinq valeurs réservées au joueur (CHAR_IDS) ; le choix ci-dessous les répartit pour
// qu'aucune pièce ne touche une voisine du même identifiant dans la tenue de départ. Seules exceptions,
// soudées : le bout de la bretelle gauche entre dans la ceinture (dos), les bretelles du sac qui passent
// sous l'anneau de l'écharpe (même tissu de bordure). Au dos, avec le sac : sac (hair) sur le torse (body),
// les bretelles de la salopette (head : leur croisement est caché par le sac), les manches (limb) et
// l'anneau de l'écharpe (trim) ; poche (body), rabat (limb) et boucle (head) sur le sac ; bretelles du sac
// (trim) ; pans de l'écharpe : le haut (head) et le bas (body), sur le sac, les manches et l'anneau.
const ENC = {
  pull: ID.body, // torse, bassin, bas de la salopette
  membre: ID.limb, // cou, bras, manches, mains, jambes
  bavette: ID.trim,
  poche: ID.body,
  boutonBavette: ID.body,
  bretelle: { 1: ID.hair, [-1]: ID.head },
  bretelleSac: { 1: ID.head, [-1]: ID.head }, // bretelles de la salopette sous le sac
  sac: ID.hair,
  pocheSac: ID.body,
  rabat: ID.limb,
  boucle: ID.head,
  sangle: ID.trim, // bretelles du sac
  pan: [ID.head, ID.body], // pans de l'écharpe (os SCARF, SCARF_B)
  ceinture: ID.head,
  boutonCeinture: ID.hair,
  pousse: ID.hair,
  col: ID.trim, // col rond ou anneau de l'écharpe
  reversManche: ID.trim,
  reversJambe: ID.hair,
  tige: ID.body,
  pied: ID.head,
  semelle: ID.trim,
  lacet: ID.hair,
  jupe: ID.trim,
  patte: ID.trim, // devant crème du gilet
  boutonGilet: ID.hair,
};

function radiusAt(prof, y) {
  for (let i = 1; i < prof.length; i++) {
    const [y1, r1] = prof[i];
    if (y <= y1) {
      const [y0, r0] = prof[i - 1];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
  }
  return 0;
}
// devant du torse à la hauteur y et à l'écart x du milieu (pour poser l'écharpe et le sac) ; dessus du
// torse à l'écart x (sur l'épaule, entre le cou et le bras)
const front = (y, x = 0) => Math.sqrt(Math.max(0, radiusAt(TORSO, y) ** 2 - x * x)) * ZT;
function shoulderTop(x) {
  for (let i = TORSO.length - 1; i > 0; i--) {
    const [y1, r1] = TORSO[i - 1];
    const [y0, r0] = TORSO[i];
    if (r1 >= x) return y0 + ((x - r0) / (r1 - r0)) * (y1 - y0);
  }
  return TORSO[0][0];
}

// Surface du torse : point et normale à la hauteur y et à l'angle phi (0 : devant, + vers +x, π : dos).
// La pente du profil est lissée sur 1,6 cm (le profil est une ligne brisée).
function surf(y, phi) {
  const r = radiusAt(TORSO, y);
  const dr = (radiusAt(TORSO, y + 0.008) - radiusAt(TORSO, y - 0.008)) / 0.016;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const p = new THREE.Vector3(r * s, y, r * ZT * c);
  const n = new THREE.Vector3(ZT * s, -dr * ZT, c).normalize();
  return { p, n };
}
// angle du point du torse d'écart x (devant, ou dos)
const angle = (y, x, dos = false) => {
  const a = Math.asin(THREE.MathUtils.clamp(x / radiusAt(TORSO, y), -1, 1));
  return dos ? Math.PI - a : a;
};
// point posé sur le torse, décollé de e le long de la normale
function surTorse(y, x, e = 0, dos = false) {
  const { p, n } = surf(y, angle(y, x, dos));
  return { p: p.addScaledVector(n, e), n };
}
// rotation (Euler XYZ du Builder) qui tourne l'axe z local vers n, puis roule de roll autour de lui
const AXE_Z = new THREE.Vector3(0, 0, 1);
function vers(n, roll = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(AXE_Z, n);
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(AXE_Z, roll));
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}

// tranche d'un profil entre y0 et y1 (les rayures du pull sont des tranches de couleurs différentes)
function band(b, prof, y0, y1, color, zs, seg = 16) {
  const pts = [[radiusAt(prof, y0), y0]];
  for (const [y, r] of prof) if (y > y0 + 1e-4 && y < y1 - 1e-4) pts.push([r, y]);
  pts.push([radiusAt(prof, y1), y1]);
  b.add(G.lathe(pts, seg), color, { s: [1, 1, zs] });
}

// rayures du pull : bandes de 5,5 cm depuis le haut du torse (couleur du haut, puis crème), entre y0 et y1 ;
// la dernière bande s'allonge jusqu'à y0 plutôt que de laisser une lamelle
const RAYURE = 0.055;
function rayures(y0, y1, color) {
  const out = [];
  for (let k = 0; HAUT - k * RAYURE > y0 + 1e-4; k++) {
    let a = Math.max(y0, HAUT - (k + 1) * RAYURE);
    const b = Math.min(y1, HAUT - k * RAYURE);
    if (a - y0 < 0.03) a = y0;
    if (b - a > 1e-4) out.push([a, b, k % 2 ? CREAM : color]);
    if (a === y0) break;
  }
  return out;
}

// écharpe : hauteur du centre du boudin et penchée vers l'avant (rad)
const ECHARPE = { y: 1.066, penche: 0.15 };
// nœud de l'écharpe : sur le côté gauche du cou (x > 0), posé sur l'anneau ; les pans en partent et flottent
// derrière l'épaule gauche (planche, vue de dos). Pans : pivot (os, dans le nœud), direction et longueur au
// repos, demi-largeur, longueur des deux pointes du bout effiloché. Positions de dessin.
const NOEUD = { p: [0.12, 1.068, 0], r: 0.036, s: [0.85, 0.95, 1.15] };
const PANS = [
  { os: B.SCARF, dir: [0.5, -0.3, -0.81], L: 0.3, w: 0.04, pointes: [0.055, 0.036], vrille: 0.25 },
  { os: B.SCARF_B, dir: [0.6, -0.4, -0.69], L: 0.23, w: 0.035, pointes: [0.032, 0.05], vrille: -0.2 },
];
const EP_PAN = 0.0065; // demi-épaisseur d'un pan

// Pan d'écharpe : ruban plat (section en ellipse à 8 côtés), du pivot (enfoui dans le nœud) vers dir sur la
// longueur L, un peu bombé et vrillé ; face plate tournée vers l'arrière (on la voit large de dos comme de
// profil), largeur qui s'élargit de 0,35 w (au sortir du nœud) à w vers le bout ; bout effiloché en deux pointes rondes (normales lissées)
// séparées par une encoche. Départ ouvert (dans le nœud). 90 triangles.
const _o = new THREE.Vector3();
function panFlottant(b, color, pivot, { dir, L, w, pointes, vrille }) {
  const d = new THREE.Vector3(...dir).normalize();
  const nr0 = new THREE.Vector3(0, 0, -1).addScaledVector(d, d.z).normalize();
  const P0 = new THREE.Vector3(...pivot);
  const N = 5;
  const S = 8;
  const rings = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const nr = nr0.clone().applyAxisAngle(d, vrille * t);
    const wv = new THREE.Vector3().crossVectors(d, nr).normalize();
    const c = P0.clone().addScaledVector(d, L * t).addScaledVector(nr, 0.012 * Math.sin(Math.PI * t)).addScaledVector(wv, 0.012 * t * t);
    rings.push({ c, nr, wv, W: w * (0.35 + 0.65 * Math.sqrt(t)) });
  }
  const pos = [];
  for (const { c, nr, wv, W } of rings) {
    for (let j = 0; j < S; j++) {
      const a = (j / S) * Math.PI * 2;
      _o.copy(c).addScaledVector(wv, W * Math.cos(a)).addScaledVector(nr, EP_PAN * Math.sin(a));
      pos.push(_o.x, _o.y, _o.z);
    }
  }
  const fin = rings[N];
  const tip = (k, sx) => {
    _o.copy(fin.c).addScaledVector(d, pointes[k]).addScaledVector(fin.wv, sx * fin.W * (0.5 + 0.6 * pointes[k]));
    pos.push(_o.x, _o.y, _o.z);
    return pos.length / 3 - 1;
  };
  const A = tip(0, 1);
  const Bt = tip(1, -1);
  const idx = [];
  const P = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  // triangle tourné vers `vers` (sens de la normale vers l'extérieur du ruban)
  const tri = (i, j, k, vers) => {
    const n = new THREE.Vector3().crossVectors(P(j).sub(P(i)), P(k).sub(P(i)));
    if (n.dot(vers) < 0) idx.push(i, k, j);
    else idx.push(i, j, k);
  };
  const off = (i, j) => P(i * S + j).sub(rings[i].c);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < S; j++) {
      const j1 = (j + 1) % S;
      const a = i * S + j;
      const v = off(i, j).add(off(i, j1));
      tri(a, a + S, i * S + j1, v);
      tri(i * S + j1, a + S, (i + 1) * S + j1, v);
    }
  }
  // bout : pointe A (côté +largeur : sommets 0, 1, 2 dessus, 6, 7, 0 dessous), pointe B (2, 3, 4 / 4, 5, 6),
  // et la paroi de l'encoche de chaque pointe (2, 6)
  const r = N * S;
  const haut = fin.nr.clone().add(d);
  const bas = fin.nr.clone().negate().add(d);
  tri(r + 0, r + 1, A, haut);
  tri(r + 1, r + 2, A, haut);
  tri(r + 6, r + 7, A, bas);
  tri(r + 7, r + 0, A, bas);
  tri(r + 2, r + 6, A, fin.wv.clone().negate());
  tri(r + 2, r + 3, Bt, haut);
  tri(r + 3, r + 4, Bt, haut);
  tri(r + 4, r + 5, Bt, bas);
  tri(r + 5, r + 6, Bt, bas);
  tri(r + 2, r + 6, Bt, fin.wv);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.add(g, color);
}

// Boîte ronde (superellipsoïde) : demi-tailles a, b, c ; e < 1 l'arrondit en coussin (0,45 : flancs plats,
// coins ronds), sans arête vive ; ws × hs segments d'une sphère (ws multiple de 4 : sommets sur les axes)
function boule(a, b, c, ws = 8, hs = 6, e = 0.45) {
  const g = mergeVertices(new THREE.SphereGeometry(1, ws, hs).deleteAttribute('normal').deleteAttribute('uv'));
  const pos = g.attributes.position;
  const f = (v) => Math.sign(v) * Math.abs(v) ** e;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, f(pos.getX(i)) * a, f(pos.getY(i)) * b, f(pos.getZ(i)) * c);
  g.computeVertexNormals();
  return g;
}

// Sac à dos (os BAG) : porté haut (le haut vers les omoplates, le bas sur la ceinture), plaqué au dos,
// penché comme le dos (haut vers l'avant). Corps en coussin, poche avant à rabat, boucle de laiton ;
// bretelles sur le torse (sous les bretelles de la salopette, puis sous l'anneau de l'écharpe), du haut du
// sac par-dessus l'épaule jusque sous le bras. Positions de dessin ; c : centre du corps, h : demi-tailles,
// penche : inclinaison (rad, haut vers l'avant). L'os BAG a son pivot au haut du sac (gabarit.js).
const SAC = {
  c: [0, 0.905, -0.218], h: [0.13, 0.12, 0.068], e: 0.45, penche: 0.08,
  // poche et rabat : centre (repère du sac), demi-tailles, rotation, exposant (boule)
  poche: { p: [0.012, -0.036, -0.065], h: [0.064, 0.058, 0.024], r: [0, 0, 0], e: 0.5 },
  rabat: { p: [0.012, 0.024, -0.084], h: [0.069, 0.032, 0.02], r: [0.22, 0, 0], e: 0.5 },
  boucle: { p: [0.012, -0.004, -0.107], h: [0.016, 0.02, 0.007], r: [0.22, 0, 0], e: 0.6 },
};
const _sacM = new THREE.Matrix4().makeRotationX(SAC.penche).setPosition(...SAC.c);
// pièce du sac posée dans le repère du sac (origine au centre, −z : vers l'arrière)
function surSac(b, g, color, p, r = [0, 0, 0]) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r)).setPosition(...p).premultiply(_sacM);
  b.add(g.applyMatrix4(m), color);
}

// tube effilé à bout rond (membres, manches) : départ ouvert, enfoui dans la pièce voisine
const tube = (b, color, pts, radii, sides = 10, rings = 4) => limb(b, color, pts, radii, { sides, rings, end: 'round' });

// bourrelet tourné (revers de manche ou de jambe, col de botte) : anneau épais, du rayon intérieur ri
// (enfoui dans le membre) au rayon extérieur ro, de hauteur h, bords arrondis ; profil montant (faces
// vers l'extérieur)
function bourrelet(b, color, p, ri, ro, h, seg = 12) {
  const k = Math.min((ro - ri) * 0.45, h * 0.3);
  const prof = [[ri, -h / 2], [ro - k, -h / 2], [ro, 0], [ro - k, h / 2], [ri, h / 2]];
  b.add(G.lathe(prof, seg), color, { p });
}

// Plaque bombée posée sur le torse (bavette, poche, patte du gilet) : contour en superellipse (coins
// ronds) de centre (xc, yc), demi-largeur w, demi-hauteur h ; épaisseur ep au centre, bord arrondi qui
// s'enfonce de 3 mm sous la surface de base (base : décollement de cette surface, 0 = le torse).
// Une seule peau (le dessous est dans le torse), lisse : normales moyennées.
const COQUE_K = [0.55, 0.88, 1];
function coque(b, color, xc, yc, w, h, ep, base = 0, seg = 18, ks = COQUE_K) {
  const pos = [];
  const put = (u, v, k) => {
    const x = xc + u * w;
    const y = yc + v * h;
    const lift = base - 0.003 + (ep + 0.003) * Math.sqrt(Math.max(0, 1 - k ** 6));
    const { p } = surTorse(y, x, lift);
    pos.push(p.x, p.y, p.z);
  };
  put(0, 0, 0);
  for (const k of ks) {
    for (let j = 0; j < seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      put(k * Math.sign(c) * Math.abs(c) ** 0.5, k * Math.sign(s) * Math.abs(s) ** 0.5, k);
    }
  }
  const idx = [];
  for (let j = 0; j < seg; j++) idx.push(0, 1 + j, 1 + ((j + 1) % seg));
  for (let i = 1; i < ks.length; i++) {
    const a0 = 1 + (i - 1) * seg;
    const a1 = 1 + i * seg;
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      idx.push(a0 + j, a1 + j, a1 + j1, a0 + j, a1 + j1, a0 + j1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.add(g, color);
}

// Bretelle large : ruban plat (section en ellipse, demi-largeur w, demi-épaisseur t) qui épouse le torse
// le long d'une courbe donnée par des points de passage [y, angle, décollement] ; bouts arrondis.
function ruban(b, color, ctrl, w = 0.017, t = 0.0042, sides = 6, n = 10) {
  const courbe = new THREE.CatmullRomCurve3(ctrl.map(([y, phi, e]) => new THREE.Vector3(y, phi, e)));
  const P = [];
  const N = [];
  for (const q of courbe.getPoints(n)) {
    const s = surf(q.x, q.y);
    P.push(s.p.addScaledVector(s.n, q.z));
    N.push(s.n);
  }
  const rings = P.map((c, i) => {
    const T = P[Math.min(n, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize();
    const Bn = new THREE.Vector3().crossVectors(T, N[i]).normalize();
    const Nn = new THREE.Vector3().crossVectors(Bn, T).normalize();
    return { c, T, Bn, Nn, k: 1 };
  });
  // bouts : un anneau rétréci, puis une pointe
  const bout = (r, sgn) => ({ ...r, c: r.c.clone().addScaledVector(r.T, sgn * w * Math.sin(0.9)), k: Math.cos(0.9) });
  const all = [bout(rings[0], -1), ...rings, bout(rings[n], 1)];
  const pos = [];
  for (const r of all) {
    for (let j = 0; j < sides; j++) {
      const th = (j / sides) * Math.PI * 2;
      const v = r.c.clone().addScaledVector(r.Bn, w * r.k * Math.cos(th)).addScaledVector(r.Nn, t * r.k * Math.sin(th));
      pos.push(v.x, v.y, v.z);
    }
  }
  const t0 = rings[0].c.clone().addScaledVector(rings[0].T, -w);
  const t1 = rings[n].c.clone().addScaledVector(rings[n].T, w);
  pos.push(t0.x, t0.y, t0.z, t1.x, t1.y, t1.z);
  const tip0 = all.length * sides;
  const idx = [];
  for (let i = 0; i < all.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const bb = i * sides + ((j + 1) % sides);
      idx.push(a, a + sides, bb, bb, a + sides, bb + sides);
    }
  }
  const last = (all.length - 1) * sides;
  for (let j = 0; j < sides; j++) {
    const j1 = (j + 1) % sides;
    idx.push(j1, j, tip0);
    idx.push(last + j, tip0 + 1, last + j1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.add(g, color);
}

// --- Salopette des planches (bas « salopette ») ---
// taille (ceinture) et bavette
const TAILLE = 0.8;
const BAVETTE = { y0: 0.797, y1: 0.987, w: 0.1 };
const BAV_EP = 0.008;
// bretelle : points de passage [y, x] du devant (coin de la bavette) au sommet de l'épaule, puis du dos
// (elles se croisent au milieu du dos et finissent dans la ceinture, de l'autre côté)
const BRET_DEVANT = [[0.958, 0.074], [1.0, 0.08], [1.04, 0.084], [1.062, 0.085]];
const BRET_DOS = [[1.062, 0.085], [1.03, 0.082], [0.99, 0.064], [0.94, 0.026], [0.9, -0.012], [0.86, -0.046], [0.828, -0.07]];
// décollement de la bretelle au dos : la gauche passe sur la droite au croisement
const BRET_E = { 1: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005], [-1]: [0.005, 0.008, 0.012, 0.0145, 0.0145, 0.009, 0.006] };

// sac : avec le sac à dos, les bretelles s'arrêtent sous son haut (le croisement est caché) ; sinon
// elles se croisent dans le dos jusqu'à la ceinture
function salopette(P, bot, sac = false) {
  // ceinture brique (profil tourné un peu plus large que le torse) et deux boutons de laiton
  const r0 = radiusAt(TORSO, TAILLE) - 0.004;
  const hc = 0.036;
  const ep = 0.018;
  const prof = [[r0, TAILLE - hc / 2], [r0 + ep * 0.8, TAILLE - hc / 2 + 0.002], [r0 + ep, TAILLE - hc / 4], [r0 + ep, TAILLE + hc / 4], [r0 + ep * 0.8, TAILLE + hc / 2 - 0.002], [r0, TAILLE + hc / 2]];
  P.on(B.TORSO, ENC.ceinture).add(G.lathe(prof, 16), BRIQUE, { s: [1, 1, ZT] });
  const BC = P.on(B.TORSO, ENC.boutonCeinture);
  for (const sx of [-1, 1]) {
    const { p, n } = surTorse(TAILLE, sx * 0.084, 0.016);
    BC.add(G.sphere(0.011, 10, 3), LAITON, { p: p.toArray(), s: [1, 1, 0.55], r: vers(n) });
  }

  // bavette (du dessous de la ceinture à la poitrine) et sa poche
  const yc = (BAVETTE.y0 + BAVETTE.y1) / 2;
  coque(P.on(B.TORSO, ENC.bavette), bot, 0, yc, BAVETTE.w, (BAVETTE.y1 - BAVETTE.y0) / 2, BAV_EP);
  coque(P.on(B.TORSO, ENC.poche), bot, 0, 0.902, 0.046, 0.038, 0.005, BAV_EP - 0.001, 14, [0.6, 1]);

  // bretelles larges : du coin de la bavette, par-dessus l'épaule, croisées dans le dos (ou arrêtées
  // sous le haut du sac : 3 points du dos, 6 anneaux au lieu de 10)
  const dos = sac ? BRET_DOS.slice(0, 3) : BRET_DOS;
  for (const sx of [-1, 1]) {
    const e = BRET_E[sx];
    const ctrl = [
      ...BRET_DEVANT.map(([y, x]) => [y, angle(y, sx * x), 0.005]),
      [shoulderTop(0.085), sx * Math.PI / 2, 0.005],
      ...dos.map(([y, x], i) => [y, sx * (Math.PI - Math.asin(THREE.MathUtils.clamp(x / radiusAt(TORSO, y), -1, 1))), e[i]]),
    ];
    ruban(P.on(B.TORSO, (sac ? ENC.bretelleSac : ENC.bretelle)[sx]), bot, ctrl, 0.017, 0.0042, 6, sac ? 6 : 10);
  }
  // gros boutons de laiton aux coins de la bavette, sur le bout des bretelles
  const BB = P.on(B.TORSO, ENC.boutonBavette);
  for (const sx of [-1, 1]) {
    const { p, n } = surTorse(0.962, sx * 0.073, BAV_EP);
    BB.add(G.sphere(0.0135, 10, 3), LAITON, { p: p.toArray(), s: [1, 1, 0.55], r: vers(n) });
  }

  // pousse de feuilles épinglée à la bretelle gauche, sous la clavicule
  const PS = P.on(B.TORSO, ENC.pousse);
  const { p: base, n } = surTorse(0.994, -0.079, 0.0125);
  const feuilles = [[2.2, 0.036, 0.019, PAL.leafDeep], [1.5, 0.044, 0.021, PAL.leaf], [0.75, 0.033, 0.018, PAL.leafDeep]];
  const q = new THREE.Quaternion().setFromUnitVectors(AXE_Z, n);
  for (const [a, L, W, c] of feuilles) {
    const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyQuaternion(q);
    PS.add(leafGeo(8, 4), c, { p: base.clone().addScaledVector(dir, L * 0.42).toArray(), s: [L / 2, W / 2, 0.009], r: vers(n, a) });
  }
}

function buildAventurier(av) {
  const P = new Parts();
  const skin = SKINS[av.skin];
  const skinWarm = mixHex(skin, '#e07a6a', 0.16);
  const hair = HAIR_COLORS[av.hairColor];
  const hairDark = tint(hair, 0.86);
  const top = CLOTH_COLORS[av.topColor];
  const bot = CLOTH_COLORS[av.bottomColor];
  const shoe = SHOE_COLORS[av.shoesColor];
  const dress = av.top === 'robe';
  const pants = !dress && (av.bottom === 'pantalon' || av.bottom === 'salopette');
  const overalls = !dress && av.bottom === 'salopette';

  // --- tête : crâne, oreilles rondes (identifiant à part : le trait les détache du crâne), coupe ---
  // (crâne ovale du gabarit, déjà à l'échelle et aux normales réglées : tete.js)
  P.on(B.HEAD, ID.head).add(craneGeometry(), skin, { p: [0, HC, 0] });
  if (!HAIR_STYLES[av.hair].hideEars) {
    const E = P.on(B.HEAD, ID.body);
    oreilles(E, skinWarm, HC);
  }
  const Acc = P.on(B.HEAD, ID.limb);
  HAIR_STYLES[av.hair].build(P, hair, hairDark, av);

  // --- cou (os NECK) : court et doux, presque caché ; profil tourné qui part du torse et entre sous le
  // menton (bas du menton à HC − MENTON), un peu en retrait vers la nuque ---
  const yM = HC - MENTON;
  P.on(B.NECK, ENC.membre).add(G.lathe([[0.068, 1.02], [0.062, 1.06], [0.055, yM + 0.01], [0.05, yM + 0.05]], 14), skin, { p: [0, 0, -0.012], s: [1, 1, 0.88] });

  // --- torse : le haut en tranches du profil (rayures du pull), le bas de la salopette en dessous de la
  // ceinture ---
  const T = P.on(B.TORSO, ENC.pull);
  const y0 = TORSO[0][0];
  const taille = overalls ? TAILLE + 0.015 : y0;
  const bands = overalls ? [[y0, taille, bot]] : [];
  if (av.top === 'pull') bands.push(...rayures(taille, HAUT, top));
  else bands.push([taille, HAUT, top]);
  for (const [a, b, color] of bands) band(T, TORSO, a, b, color, ZT);
  if (av.top === 'gilet') {
    // gilet ouvert sur un t-shirt crème : patte crème sur le devant, trois boutons
    coque(P.on(B.TORSO, ENC.patte), CREAM, 0, 0.94, 0.03, 0.13, 0.004, 0, 16, [0.5, 0.85, 1]);
    const BG = P.on(B.TORSO, ENC.boutonGilet);
    for (let i = 0; i < 3; i++) {
      const y = 1.03 - i * 0.065;
      const { p, n } = surTorse(y, 0.046, 0.003);
      BG.add(G.sphere(0.0105, 10, 3), LAITON, { p: p.toArray(), s: [1, 1, 0.6], r: vers(n) });
    }
  }
  // col rond (au pied du cou, là où le torse se referme) ; caché par l'écharpe
  const yCol = HAUT - 0.024;
  const collar = av.top === 'pull' || av.top === 'robe' ? CREAM : mixHex(top, CREAM, 0.45);
  // (assez haut et épais pour envelopper la base du cou : de face, pas de peau entre le col et le menton)
  if (av.accessory !== 'echarpe') P.on(B.TORSO, ENC.col).add(G.torus(0.064, 0.016, 6, 16), collar, { p: [0, yCol + 0.006, 0.004], r: [Math.PI / 2, 0, 0], s: [1.12, 0.95, 1] });
  if (overalls) salopette(P, bot, av.back === 'sac');

  // --- bassin, jupe, robe ---
  band(P.on(B.HIPS, ENC.pull), HIPS, HIPS[0][0], HIPS[HIPS.length - 1][0], dress ? top : bot, ZH);
  // (profils montants : un profil tourné qui descend a ses faces vers l'intérieur ; évasés sous la
  // hauteur des poings, écartés au repos à ±0,25)
  if (dress) {
    P.on(B.SKIRT, ENC.pull).add(G.lathe([[0.235, 0.42], [0.246, 0.434], [0.243, 0.46], [0.222, 0.52], [0.196, 0.6], [0.183, 0.68], [0.175, 0.76], [0.17, 0.85]], 18), top, { s: [1, 1, 0.84] });
  } else if (av.bottom === 'jupe') {
    P.on(B.SKIRT, ENC.jupe).add(G.lathe([[0.205, 0.5], [0.216, 0.512], [0.213, 0.54], [0.198, 0.6], [0.185, 0.68], [0.174, 0.77], [0.17, 0.81]], 18), bot, { s: [1, 1, 0.84] });
  }

  // --- bras ---
  for (const sx of [-1, 1]) {
    const L = sx < 0;
    const A = P.on(L ? B.ARM_L : B.ARM_R, ENC.membre);
    const F = P.on(L ? B.FORE_L : B.FORE_R, ENC.membre);
    const W = P.on(L ? B.HAND_L : B.HAND_R, ENC.membre);
    const [sx0, sy0] = R[L ? B.ARM_L : B.ARM_R];
    const [ex, ey] = R[L ? B.FORE_L : B.FORE_R];
    const [hx, hy, hz] = R[L ? B.HAND_L : B.HAND_R];
    const xm = sx0 + sx * 0.004;
    if (av.top === 'pull' || av.top === 'gilet') {
      // manche bouffante : tranches de la manche (rayures du pull) raccordées anneau sur anneau (même axe,
      // mêmes rayons aux joints : aucune fente), l'épaule en dôme (bout rond de la tranche du haut, tournée
      // vers le haut), bout rond au coude ; 10 côtés (budget des cheveux, 03/11/2026)
      const yb = ey + 0.015;
      if (av.top === 'gilet') {
        limb(A, top, [[xm, (sy0 + yb) / 2, 0], [xm, sy0, 0]], [0.064, 0.062], { sides: 10, rings: 1, end: 'round' });
        limb(A, top, [[xm, (sy0 + yb) / 2, 0], [xm, yb, 0]], [0.064, 0.054], { sides: 10, rings: 1, end: 'round' });
      } else {
        // trois bandes de 5,5 cm (couleur, crème, couleur) au-dessus du revers ; bouffante au milieu
        limb(A, top, [[xm, 0.895, 0], [xm, sy0, 0]], [0.066, 0.062], { sides: 10, rings: 1, end: 'round' });
        limb(A, CREAM, [[xm, 0.895, 0], [xm, 0.84, 0]], [0.066, 0.065], { sides: 10, rings: 1 });
        limb(A, top, [[xm, 0.84, 0], [xm, yb, 0]], [0.065, 0.054], { sides: 10, rings: 1, end: 'round' });
      }
    } else if (av.top === 'tshirt') {
      // bras nu, manche courte (manchon un peu plus large, bord rond) et épaule de la couleur du haut
      const S = P.on(L ? B.ARM_L : B.ARM_R, ENC.pull);
      S.add(G.sphere(0.06, 10, 7), top, { p: [sx0 - sx * 0.004, sy0 - 0.002, 0], s: [1, 0.95, 1] });
      tube(S, top, [[sx0, sy0, 0], [sx0 + sx * 0.006, sy0 - 0.1, 0]], [0.062, 0.06], 10, 2);
      tube(A, skin, [[sx0, sy0, 0], [sx0 + sx * 0.003, (sy0 + ey) / 2, 0], [ex, ey, 0]], [0.05, 0.048, 0.045], 10, 3);
    } else {
      // robe : manche bouffante courte, bras nu
      P.on(L ? B.ARM_L : B.ARM_R, ENC.pull).add(G.sphere(0.07, 10, 7), top, { p: [sx0 - sx * 0.006, sy0 - 0.006, 0], s: [1, 0.88, 1] });
      tube(A, skin, [[sx0, sy0, 0], [sx0 + sx * 0.003, (sy0 + ey) / 2, 0], [ex, ey, 0]], [0.05, 0.048, 0.045], 10, 3);
    }
    // avant-bras : nu (manche retroussée au coude), ou manche longue du gilet
    const sleeveLong = av.top === 'gilet';
    tube(F, sleeveLong ? top : skin, [[ex, ey + 0.01, 0], [(ex + hx) / 2, (ey + hy) / 2 + 0.01, 0.002], [hx, hy + 0.03, hz]], sleeveLong ? [0.05, 0.047, 0.042] : [0.044, 0.042, 0.038], 10, 2);
    if (av.top === 'pull') bourrelet(P.on(L ? B.FORE_L : B.FORE_R, ENC.reversManche), CREAM, [ex, ey - 0.006, 0], 0.04, 0.068, 0.036, 10);
    if (sleeveLong) bourrelet(P.on(L ? B.FORE_L : B.FORE_R, ENC.reversManche), CREAM, [hx, hy + 0.05, hz * 0.6], 0.036, 0.054, 0.026, 10);
    W.add(G.sphere(0.06, 10, 6), skin, { p: [hx, hy, hz + 0.004], s: [0.9, 1, 0.95] });
  }

  // --- jambes et chaussures ---
  const bare = dress || av.bottom === 'jupe';
  const marche = av.shoes === 'marche';
  const pluie = av.shoes === 'bottes';
  for (const sx of [-1, 1]) {
    const L = sx < 0;
    const Th = P.on(L ? B.THIGH_L : B.THIGH_R, ENC.membre);
    const Sh = P.on(L ? B.SHIN_L : B.SHIN_R, ENC.membre);
    const Fo = P.on(L ? B.FOOT_L : B.FOOT_R, ENC.membre);
    const [tx, ty] = R[L ? B.THIGH_L : B.THIGH_R];
    const [kx, ky] = R[L ? B.SHIN_L : B.SHIN_R];
    const [fx, fy, fz] = R[L ? B.FOOT_L : B.FOOT_R];
    // axe du tibia (du genou à la cheville, un peu en avant en bas)
    const zs = (y) => (fz * (ky - y)) / (ky - fy);
    const thighPts = [[tx - sx * 0.01, ty + 0.03, 0], [tx, ty - 0.07, 0.003], [(tx + kx) / 2, (ty + ky) / 2 - 0.04, 0.002], [kx, ky, 0]];
    if (pants || av.bottom === 'short') {
      // jambe large de la salopette (ou du pantalon) : un bourrelet doux à mi-cuisse
      if (pants) tube(Th, bot, thighPts, [0.08, 0.092, 0.088, 0.085], 12, 3);
      else {
        tube(Th, skin, thighPts, [0.07, 0.078, 0.07, 0.064], 10, 5);
        tube(P.on(L ? B.THIGH_L : B.THIGH_R, ENC.pull), bot, [[tx - sx * 0.01, ty + 0.03, 0], [tx + sx * 0.004, ty - 0.15, 0.002]], [0.085, 0.094], 12, 2);
      }
    } else {
      tube(Th, skin, thighPts, [0.07, 0.078, 0.07, 0.064], 10, 5);
    }
    if (pants) {
      // tibia : pli au genou, jambe ramassée au-dessus du revers, puis le bas dans la chaussure (enfoui)
      const ourlet = marche ? 0.268 : pluie ? null : 0.15;
      const fin = marche ? 0.15 : pluie ? 0.2 : 0.13;
      const ys = ourlet ? [ky + 0.02, ky - 0.05, ourlet + 0.045, ourlet, fin] : [ky + 0.02, ky - 0.05, 0.3, 0.25, fin];
      const rs = ourlet ? [0.083, 0.087, 0.084, 0.076, 0.064] : [0.083, 0.087, 0.082, 0.078, 0.074];
      limb(Sh, bot, ys.map((y) => [y > ky ? kx : fx, y, zs(y)]), rs, { sides: 12, rings: 4 });
      // revers de jambe : gros bourrelet plus clair, au-dessus de la chaussure
      if (ourlet) bourrelet(P.on(L ? B.SHIN_L : B.SHIN_R, ENC.reversJambe), mixHex(bot, CREAM, 0.35), [fx, ourlet, zs(ourlet)], 0.066, 0.094, 0.064);
    } else {
      // tibia nu : mollet, cheville (enfouie dans la chaussure)
      tube(Sh, skin, [[kx, ky + 0.02, 0], [kx, ky - 0.1, zs(ky - 0.1)], [fx, fy + 0.06, zs(fy + 0.06)], [fx, fy, fz]], [0.064, 0.066, 0.052, 0.046], 10, 5);
    }

    if (marche) {
      // bottes de marche : tige basse à revers (os du tibia), pied au bout rond, semelle épaisse crème,
      // deux lacets en bourrelets sur le cou-de-pied
      const zt = 0.02;
      P.on(L ? B.SHIN_L : B.SHIN_R, ENC.tige).add(G.lathe([[0.066, 0.045], [0.077, 0.182], [0.088, 0.196], [0.088, 0.216], [0.074, 0.228]], 12), shoe, { p: [fx, 0, zt] });
      const cz = fz + 0.035;
      const ry = 0.0576;
      P.on(L ? B.FOOT_L : B.FOOT_R, ENC.pied).add(G.sphere(0.08, 12, 7), shoe, { p: [fx, 0.068, cz], s: [1, 0.72, 1.55] });
      P.on(L ? B.FOOT_L : B.FOOT_R, ENC.semelle).add(G.sphere(0.084, 12, 4), SEMELLE, { p: [fx, 0.024, cz], s: [1.04, 0.3, 1.62] });
      const dessus = (x, z) => 0.068 + ry * Math.sqrt(Math.max(0, 1 - (x / 0.08) ** 2 - ((z - cz) / 0.124) ** 2));
      const LF = P.on(L ? B.FOOT_L : B.FOOT_R, ENC.lacet);
      for (const z of [cz + 0.046, cz + 0.072]) {
        const pts = [-0.034, 0, 0.034].map((x, i) => [fx + x, dessus(x, z) + (i === 1 ? 0.004 : -0.002), z]);
        limb(LF, LACET, pts, [0.0065, 0.0065, 0.0065], { sides: 4, rings: 2, end: 'round' });
      }
    } else if (av.shoes === 'baskets') {
      Fo.add(G.sphere(0.076, 12, 7), shoe, { p: [fx, 0.07, fz + 0.03], s: [0.95, 0.82, 1.6] });
      Fo.add(G.sphere(0.079, 12, 5), shoe === CREAM ? '#e2d3b4' : '#fffaf0', { p: [fx, 0.022, fz + 0.03], s: [1, 0.28, 1.62] });
      Fo.add(G.sphere(0.013, 10, 6), '#fffaf0', { p: [fx, 0.129, fz + 0.07] });
    } else if (pluie) {
      // bottes de pluie : tige haute (os du tibia) à revers, pied et semelle
      P.on(L ? B.SHIN_L : B.SHIN_R, ENC.tige).add(G.lathe([[0.07, 0.04], [0.083, 0.08], [0.086, 0.2], [0.088, 0.28], [0.093, 0.29], [0.094, 0.31], [0.088, 0.318], [0.072, 0.316]], 12), shoe, { p: [fx, 0, 0.018] });
      P.on(L ? B.FOOT_L : B.FOOT_R, ENC.pied).add(G.sphere(0.08, 12, 7), shoe, { p: [fx, 0.068, fz + 0.03], s: [1, 0.72, 1.5] });
      P.on(L ? B.FOOT_L : B.FOOT_R, ENC.semelle).add(G.sphere(0.083, 12, 5), tint(shoe, 0.72), { p: [fx, 0.024, fz + 0.03], s: [1.03, 0.3, 1.56] });
    } else {
      // sandales : pied nu, semelle, bride
      Fo.add(G.sphere(0.066, 12, 7), skin, { p: [fx, fy - 0.04, fz + 0.03], s: [0.86, 0.6, 1.62] });
      P.on(L ? B.FOOT_L : B.FOOT_R, ENC.semelle).add(box(0.115, 0.02, 0.25, 0.009), shoe, { p: [fx, 0.01, fz + 0.03] });
      P.on(L ? B.FOOT_L : B.FOOT_R, ENC.lacet).add(G.torus(0.052, 0.011, 6, 12), shoe, { p: [fx, fy - 0.025, fz + 0.05], r: [Math.PI / 2 - 0.4, 0, 0], s: [1, 1.2, 1] });
    }
  }

  // --- accessoire (teinte au choix) ---
  const acc = av.accessory;
  const ac = CLOTH_COLORS[av.accessoryColor];
  if (acc === 'echarpe') {
    // gros boudin de tissu noué lâche autour du cou (section de 4,6 cm de rayon), penché vers l'avant : le
    // bas du menton (HC − MENTON) passe au-dessus. Nœud rond sur le côté gauche ; deux pans plats qui en
    // partent et flottent derrière l'épaule gauche, chacun sur son os à ressort (SCARF, SCARF_B ;
    // Character.js), bouts effilochés en deux pointes rondes.
    const Col = P.on(B.TORSO, ENC.col);
    Col.add(G.torus(0.082, 0.046, 8, 16), ac, { p: [0, ECHARPE.y, 0.002], r: [Math.PI / 2 + ECHARPE.penche, 0, 0], s: [1.12, 0.95, 1] });
    Col.add(G.sphere(NOEUD.r, 10, 6), ac, { p: NOEUD.p, s: NOEUD.s });
    PANS.forEach((pan, i) => panFlottant(P.on(pan.os, ENC.pan[i]), i ? tint(ac, 0.93) : ac, R[pan.os], pan));
  } else if (acc === 'bob') {
    // dessiné pour le crâne chibi, à l'échelle de la tête ; dôme calé sur la calotte des cheveux
    Acc.add(G.cyl(0.36 * K, 0.38 * K, 0.03 * K, 18), ac, { p: [0, HC + 0.17 * K, -0.02 * K], r: [-0.12, 0, 0], s: [FACE.SX, 1, 1] });
    Acc.add(G.sphere(0.27 * K, 14, 8), ac, { p: [0, HC + 0.2 * K, -0.085 * K], s: [1.2, 0.74, 1.24] });
    Acc.add(G.torus(0.285 * K, 0.022 * K, 6, 20), CREAM, { p: [0, HC + 0.22 * K, -0.08 * K], r: [Math.PI / 2 - 0.12, 0, 0], s: [1.19, 1.23, 1] });
  } else if (acc === 'barrette') {
    const p = onCap(0.8, 0.15 * K, 0.05 * K); // posée sur les mèches de la coupe, au-dessus de la tempe droite
    const r = 0.036 * K;
    Acc.add(G.sphere(r, 10, 6), ac, { p: [p[0] - 0.03 * K, p[1], p[2]], s: [1.3, 0.8, 0.5], r: [0, 0.6, 0.2] });
    Acc.add(G.sphere(r, 10, 6), ac, { p: [p[0] + 0.03 * K, p[1] - 0.012 * K, p[2] - 0.02 * K], s: [1.3, 0.8, 0.5], r: [0, 0.6, -0.2] });
    Acc.add(G.sphere(0.018 * K, 10, 6), '#fffaf0', { p: [p[0], p[1] - 0.006 * K, p[2] + 0.004 * K] });
  } else if (acc === 'lunettes') {
    // verres sur une sphère un peu plus grande que le crâne ; branches du bord extérieur du verre jusqu'au
    // dessus de l'oreille, tout depuis FACE (rayon, aplatissement)
    const Rv = FACE.R + 0.026 * K;
    const ecart = 0.098 * K; // demi-écart des verres, le long du crâne
    const rv = 0.052 * K; // rayon d'un verre
    const fil = 0.008 * K;
    const verre = tint(ac, 0.8);
    for (const sx of [-1, 1]) {
      const phi = (sx * ecart) / (FACE.R * FACE.SX);
      Acc.add(G.torus(rv, fil, 6, 18), verre, { p: [Math.sin(phi) * Rv * FACE.SX, HC - 0.012 * K, Math.cos(phi) * Rv], r: [0, phi, 0] });
      const phiB = (sx * (ecart + rv * 0.94)) / (FACE.R * FACE.SX);
      const a = new THREE.Vector3(Math.sin(phiB) * (FACE.R + 0.012 * K) * FACE.SX, HC - 0.006 * K, Math.cos(phiB) * (FACE.R + 0.012 * K));
      const b = new THREE.Vector3(sx * (FACE.R * FACE.SX + 0.005 * K), HC + 0.004 * K, -0.07 * FACE.R);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      Acc.add(G.cyl(fil * 0.75, fil * 0.75, a.distanceTo(b), 8), verre, { p: a.clone().add(b).multiplyScalar(0.5).toArray(), r: [e.x, e.y, e.z] });
    }
    Acc.add(G.cyl(fil * 0.75, fil * 0.75, 0.05 * K, 8), verre, { p: [0, HC, Rv + 0.002 * K], r: [0, 0, Math.PI / 2] });
  }

  // --- dos : sac à dos (teinte au choix), os BAG ---
  if (av.back === 'sac') {
    const sc = CLOTH_COLORS[av.backColor];
    surSac(P.on(B.BAG, ENC.sac), boule(...SAC.h, 8, 6, SAC.e), sc, [0, 0, 0]);
    // poche avant (dans la moitié basse, un peu à gauche : l'épée est à droite, GABARIT.epeeSac), rabat qui
    // la coiffe, bord libre décollé ; boucle de laiton au bord du rabat
    for (const [k, id, color, hs] of [['poche', ENC.pocheSac, tint(sc, 0.9), 4], ['rabat', ENC.rabat, tint(sc, 1.1), 4], ['boucle', ENC.boucle, LAITON, 4]]) {
      const q = SAC[k];
      surSac(P.on(B.BAG, id), boule(...q.h, k === 'boucle' ? 4 : 8, hs, q.e), color, q.p, q.r);
    }
    // bretelles : rubans plats sur le torse, du haut du sac (enfouies dedans) par-dessus l'épaule, sous les
    // bretelles de la salopette (moins décollées), jusque sous le bras ; points [y, x, décollement]
    const ys = shoulderTop(0.108);
    for (const sx of [-1, 1]) {
      const dos = (y, x, e) => [y, sx * (Math.PI - Math.asin(Math.min(1, x / radiusAt(TORSO, y)))), e];
      const ctrl = [
        [0.872, angle(0.872, sx * 0.148), 0.003], [0.94, angle(0.94, sx * 0.128), 0.003], [1.0, angle(1.0, sx * 0.112), 0.003],
        [ys, sx * Math.PI / 2, 0.003],
        dos(1.02, 0.1, 0.003), dos(0.985, 0.088, 0.03), dos(0.97, 0.082, 0.06),
      ];
      ruban(P.on(B.TORSO, ENC.sangle), tint(sc, 0.82), ctrl, 0.014, 0.0035, 5, 6);
    }
  }

  return P.build();
}
// Pour les tests (tests/echarpe-sac.test.js) : profil du torse, sac, nœud et pans de l'écharpe (positions
// de dessin)
export const VOLUMES = { TORSO, ZT, SAC, NOEUD, PANS, EP_PAN };

// Ressorts des pans de l'écharpe et du sac (Character.js, avec stepHair de cheveux.js ; repère du torse) :
// direction moyenne au repos (unitaire), bras de levier (m), butées [arrière, avant] de la bascule (x) et
// [intérieur, extérieur] du roulis (z), en rad. Pans : jusqu'à presque l'horizontale vers l'arrière, peu
// vers l'avant (l'épaule) et vers l'intérieur (le sac) ; sac : petit débattement, presque rien vers le dos.
// Butées vérifiées par tests/echarpe-sac.test.js (rien dans le torse, le sac ni la tête).
export const DYN_PANS = PANS.map(({ os, dir, L }) => ({ os, dir: new THREE.Vector3(...dir).normalize().toArray(), lever: L * 0.55, x: [-0.12, 0.5], z: [-0.1, 0.45] }));
export const DYN_SAC = { os: B.BAG, dir: [0, -0.954, 0.3], lever: 0.12, x: [-0.03, 0.08], z: [-0.04, 0.04] };

export default fiche('PER-001', 'corps-visage', 'Corps et visage', perso(() => Character, {}, 'avatar'), {
  variants: [{ label: 'Yeux ovales', params: { eyes: 'ovale' } }, { label: 'Yeux ronds', params: { eyes: 'rond' } }, { label: 'Yeux en amande', params: { eyes: 'amande' } }],
  tags: ['atlas d\'expressions'],
});
