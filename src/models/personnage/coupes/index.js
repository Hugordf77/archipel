// Coupe de cheveux du personnage (PER-026) : une seule coupe, en pics, présentée sur l'avatar. Les
// anciennes coupes (PER-002 à PER-007) gardent leur numéro, au statut « retire ».
// Gabarit aventurier (personnage 2.0) : grosse masse ébouriffée des planches, dessinée ici. Gabarit
// chibi : la coupe du 02/11/2026, gardée telle quelle (./chibi.js).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { FACE } from '../../../entities/character/face.js';
import { HAIRS } from '../../../entities/character/avatar.js';
import { limb } from '../../kit/formes.js';
import { HC, B, ID, GABARIT } from '../commun.js';
import * as CHIBI from './chibi.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

// ---------------------------------------------------------------------------
// Coupe du héros (planches de l'utilisateur, docs/personnage-2/references/) : une calotte ronde, plus
// large et plus haute que le crâne, montée haut et en arrière (le front reste libre sous la frange,
// les oreilles sous les mèches de côté), hérissée de 33 mèches en pics, en couches, de longueurs et
// de sens inégaux. Mesures en mètres pour le crâne du héros (R 0,19), à l'échelle S du crâne du gabarit.
// ---------------------------------------------------------------------------
const S = FACE.R / 0.19;
// calotte : ellipsoïde de centre CAP.c et de demi-axes CAP.r ; 14 × 9 segments (couverte de mèches)
export const CAP = { c: [0, HC + 0.075 * S, -0.055 * S], r: [0.222 * S, 0.2 * S, 0.225 * S] };

// masse de la nuque : sous la calotte, elle couvre l'arrière du crâne jusqu'au cou (entre les oreilles)
export const NUQUE = { c: [0, HC - 0.07 * S, -0.1 * S], r: [0.165 * S, 0.105 * S, 0.13 * S] };

// le point p (repère du personnage) est-il toujours caché sous la calotte (prise à sa taille sous le bob,
// 95 %) ou sous la masse de la nuque, à 2 % près ? (le crâne y retire ses triangles : tete.js)
export function sousCalotte(p) {
  const r2 = ({ c, r }, k) => ((p.x - c[0]) / (r[0] * k)) ** 2 + ((p.y - c[1]) / (r[1] * k)) ** 2 + ((p.z - c[2]) / (r[2] * k)) ** 2;
  return r2(CAP, 0.95 * 0.98) < 1 || r2(NUQUE, 0.98) < 1;
}

// Marque des cheveux pour le shader du joueur (materials.js, CHEVEUX : brins et reflet), dans deux poids que
// son matériau n'utilise pas : sway 1 pour la calotte et la nuque (sens des brins : depuis le centre de la
// calotte) ; pour chaque mèche, sway de 1 à 2 (tangage de son axe) et tint de 0 à 1 (lacet) : le sens
// de ses brins
function cap(b, c, d, k = 1) {
  const [rx, ry, rz] = CAP.r;
  b.add(G.sphere(1, 14, 9), c, { p: CAP.c, s: [rx * k, ry * k, rz * k], sway: 1 });
  b.add(G.sphere(1, 10, 7), d, { p: NUQUE.c, s: NUQUE.r, sway: 1 });
}

// point de la calotte à l'azimut a (0 = devant, + vers +x) et à la hauteur dy au-dessus de son centre,
// poussé de `out` le long de la normale ; n (facultatif) reçoit la normale
export function surCalotte(a, dy, out = 0.008 * S, n = null) {
  const [rx, ry, rz] = CAP.r;
  const k = Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
  const x = Math.sin(a) * rx * k;
  const z = Math.cos(a) * rz * k;
  const nn = (n || new THREE.Vector3()).set(x / (rx * rx), dy / (ry * ry), z / (rz * rz)).normalize();
  return [CAP.c[0] + x + nn.x * out, CAP.c[1] + dy + nn.y * out, CAP.c[2] + z + nn.z * out];
}

// Mèches : [azimut, hauteur du pied sur la calotte (au-dessus de son centre), longueur, demi-largeur,
// vrille du coiffé (rad : 0 = dans le sens de la pente, en descendant depuis le sommet ; + vers l'azimut
// croissant), décollement (rad), courbure (> 0 : la pointe revient vers le crâne), identifiant de
// contour, ton (0 clair, 1 foncé), forme ('c' couchée, 'd' dressée), S facultatif (décalage de la pointe
// en part de la longueur, + vers l'azimut croissant ; par défaut LAME.s dans le sens de la vrille)].
// Chaque mèche est une lame (`lame`) : racine épaisse, pointe effilée, légère courbe en S, dont le pied
// s'enfonce sous la calotte : de la pointe au pied, les mèches rayonnent depuis le sommet du crâne, en
// trois rangs posés l'un sur l'autre.
//
// Identifiants de contour (5 pour tout le personnage, CHAR_IDS ; l'encre ne passe qu'entre deux
// identifiants différents, jamais entre deux pièces du même). Règle retenue :
//   - calotte et masse de la nuque : `hair` ; aucune mèche n'est `head` (crâne et visage) ;
//   - rang du bas, couché sur la peau : frange en limb / trim alternés, la mèche entre les yeux `body` ;
//     côtés limb ou trim (jamais `body` : les oreilles le sont) ; nuque, les deux mèches du milieu
//     body / hair (elles descendent sur le cou `limb` et le col `trim`), celles du bord trim / hair
//     (jamais `body`, derrière l'oreille) ;
//   - rangs dressés (frange haute, volume des côtés et du dos, dessus, épi) : un identifiant qu'aucune
//     mèche qu'elles touchent n'a ; `hair` seulement pour les pics du dos, qui se détachent sur le ciel et
//     les mèches, jamais devant la calotte vue de face.
// Deux mèches « se touchent » quand leurs axes passent à moins de 1,5 fois la somme de leurs rayons :
// tests/cheveux.test.js vérifie qu'elles n'ont jamais le même identifiant.
const L = ID.limb;
const T = ID.trim;
const Bo = ID.body;
const H = ID.hair;
const PI = Math.PI;
// formes : enfoncement du pied, largeur (demi-largeur aux points AXE de la mèche, en part de sa
// demi-largeur : pied, ventre, puis un bout en ogive convexe, pointe nulle), aplatissement (épaisseur en part
// de la largeur, au milieu de la mèche ; LAME.ep la fait varier du pied à la pointe). Bout en ogive depuis
// la revue du 21/11/2026 (avant [0,95, 1, 0,62, 0] aux tiers : pointe en chevron droit)
export const AXE = [0, 0.3, 0.55, 0.8, 1];
export const FORMES = {
  c: { sink: 0.03 * S, profile: [0.95, 1, 0.9, 0.6, 0], flat: 0.62 },
  d: { sink: 0.045 * S, profile: [0.95, 1, 0.9, 0.6, 0], flat: 0.66 },
};
// demi-largeur d'une mèche de forme `forme` en t (0 au pied, 1 à la pointe), en part de sa demi-largeur
export function largeur(forme, t) {
  const p = FORMES[forme].profile;
  let i = 0;
  while (i < AXE.length - 2 && t > AXE[i + 1]) i++;
  const u = Math.min(1, Math.max(0, (t - AXE[i]) / (AXE[i + 1] - AXE[i])));
  return p[i] + (p[i + 1] - p[i]) * u;
}
// lame : épaisseur au pied et à la pointe (facteur de `flat`), décalage de la pointe par la courbe en S (en
// part de la longueur), maillage (6 côtés, dont deux sommets sur les tranchants ; 6 anneaux, bout ouvert
// mais fermé par la pointe nulle) : 72 triangles par mèche ; l'épi, vu dans son axe, a 8 côtés (96)
export const LAME = { ep: [1.4, 0.7], s: 0.08, sides: 6, rings: 6 };
// zones : os des mèches (et côtés de la lame, s'ils diffèrent de LAME.sides)
export const ZONES = {
  // frange sur son os à ressort (21/11/2026 ; avant, sur la tête : elle ne bougeait jamais)
  frange: { bone: B.HAIR_D },
  cotes: { bone: B.HAIR_C },
  nuque: { bone: B.HAIR_B },
  dessus: { bone: B.HAIR_A },
  epi: { bone: B.HAIR_A, sides: 8 },
};
const MECHES_H = {
  // frange épaisse (rang du bas) : cinq grosses mèches pointues couchées sur le front, pointes aux
  // sourcils, celle du milieu entre les yeux ; au-dessus, deux mèches dressées (rang du milieu)
  frange: [
    [-0.66, 0.065, 0.1, 0.048, -0.3, 0.18, 0.06, L, 0, 'c'],
    [-0.33, 0.085, 0.105, 0.05, 0.12, 0.18, 0.06, T, 0, 'c'],
    [0.02, 0.09, 0.15, 0.036, -0.05, 0.18, 0.06, Bo, 0, 'c'],
    [0.34, 0.085, 0.1, 0.05, -0.15, 0.18, 0.06, L, 0, 'c'],
    [0.67, 0.065, 0.1, 0.048, 0.35, 0.18, 0.06, T, 0, 'c'],
    [-0.55, 0.13, 0.13, 0.058, -0.25, 0.5, -0.1, Bo, 0, 'd'],
    [0.55, 0.13, 0.135, 0.058, 0.3, 0.5, -0.1, Bo, 0, 'd'],
  ],
  // côtés : rang du bas, deux mèches couchées de chaque côté (tempe, derrière l'oreille) ; rang du
  // milieu, une mèche dressée au-dessus de l'oreille qui en couvre le haut et fait la largeur
  cotes: [
    [-1.15, 0.03, 0.12, 0.046, -0.3, 0.42, 0.06, T, 0, 'c'],
    [-1.85, 0.0, 0.13, 0.048, -0.35, 0.3, 0.05, T, 1, 'c'],
    [1.15, 0.03, 0.125, 0.046, 0.3, 0.42, 0.06, L, 0, 'c'],
    [1.85, 0.0, 0.13, 0.048, 0.35, 0.3, 0.05, L, 1, 'c'],
    [-1.45, 0.1, 0.14, 0.058, -0.2, 0.55, -0.08, L, 0, 'd'],
    [1.45, 0.1, 0.145, 0.058, 0.25, 0.55, -0.08, T, 0, 'd'],
  ],
  // nuque : rang du bas, quatre grosses mèches foncées qui descendent sur le col (la masse de la nuque
  // remplit dessous) ; rang du milieu, trois mèches dressées qui font le volume de dos
  nuque: [
    [PI - 1.1, -0.08, 0.15, 0.05, 0.15, 0.2, 0.1, T, 1, 'c'],
    [PI - 0.4, -0.09, 0.17, 0.054, -0.1, 0.15, 0.12, H, 1, 'c'],
    [PI + 0.4, -0.09, 0.17, 0.054, 0.1, 0.15, 0.12, Bo, 1, 'c'],
    [PI + 1.1, -0.08, 0.15, 0.05, -0.15, 0.2, 0.1, H, 1, 'c'],
    [PI - 0.85, 0.07, 0.15, 0.062, 0.2, 0.42, -0.1, T, 0, 'd'],
    [PI, 0.06, 0.16, 0.066, -0.1, 0.4, -0.1, L, 0, 'd'],
    [PI + 0.85, 0.07, 0.15, 0.062, -0.2, 0.42, -0.1, L, 0, 'd'],
  ],
  // dessus : rang du haut, six pics dressés qui rayonnent depuis le sommet, pointes qui rebiquent
  dessus: [
    [0, 0.165, 0.12, 0.054, 0.3, 0.7, -0.15, T, 0, 'd'],
    [1.05, 0.165, 0.13, 0.054, 0.2, 0.7, -0.15, L, 0, 'd'],
    [2.1, 0.165, 0.13, 0.054, -0.2, 0.7, -0.15, H, 0, 'd'],
    [PI, 0.165, 0.13, 0.054, 0.15, 0.7, -0.15, H, 0, 'd'],
    [-2.1, 0.165, 0.13, 0.054, 0.2, 0.7, -0.15, Bo, 0, 'd'],
    [-1.05, 0.165, 0.13, 0.054, -0.25, 0.7, -0.15, T, 0, 'd'],
  ],
  // épi : trois pics plus hauts au sommet du crâne
  epi: [
    [-0.4, 0.19, 0.13, 0.052, 0, 1.05, -0.15, L, 0, 'd'],
    [0.9, 0.19, 0.12, 0.05, 0.2, 1.0, -0.15, Bo, 0, 'd'],
    [PI - 0.5, 0.19, 0.135, 0.052, -0.2, 1.0, -0.18, L, 0, 'd'],
  ],
};
// mèches à l'échelle de la tête du gabarit (hauteur, longueur, demi-largeur)
const kS = ([a, dy, len, r, ...rest]) => [a, dy * S, len * S, r * S, ...rest];
export const MECHES = Object.fromEntries(Object.entries(MECHES_H).map(([k, l]) => [k, l.map(kS)]));

const _n = new THREE.Vector3();
const _t = new THREE.Vector3();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Repère d'une mèche (repère du personnage) : pied enfoncé, axe y = direction de la mèche, axe z =
// normale de la calotte ramenée perpendiculaire à l'axe (épaisseur), axe x = largeur. Le long de la
// mèche (t de 0 au pied à 1 à la pointe), dans ce repère :
//   - ep(t) : épaisseur, en part de la largeur (racine épaisse, pointe en lame) ;
//   - curl(t) : décalage en x, courbe en S (la courbure change de sens à mi-longueur, la pointe finit
//     parallèle au pied, décalée de S × L) ;
//   - bend(t) : décalage en z, arc qui ramène la pointe vers le crâne (bend > 0) ou l'en écarte.
export function meche([a, dy, len, , tw, lift, bend, , , forme, sv]) {
  const { sink, flat } = FORMES[forme];
  const base = new THREE.Vector3(...surCalotte(a, dy, -sink, _n));
  // sens du coiffé : la pente (vers le bas), vrillée vers l'azimut croissant
  _t.set(Math.sin(tw) * Math.cos(a), -Math.cos(tw), -Math.sin(tw) * Math.sin(a));
  _t.addScaledVector(_n, -_n.dot(_t)).normalize();
  const dir = _t.clone().multiplyScalar(Math.cos(lift)).addScaledVector(_n, Math.sin(lift)).normalize();
  _z.copy(_n).addScaledVector(dir, -_n.dot(dir)).normalize();
  _x.crossVectors(dir, _z);
  const L = len + sink;
  // S : + vers l'azimut croissant (tangente de la calotte (cos a, 0, −sin a)), par défaut dans le sens de
  // la vrille
  const versA = Math.sign(_x.x * Math.cos(a) - _x.z * Math.sin(a)) || 1;
  const k = (sv ?? LAME.s * (Math.sign(tw || a) || 1)) * versA * L;
  const [e0, e1] = LAME.ep;
  return {
    base,
    dir,
    x: _x.clone(),
    z: _z.clone(),
    L,
    ep: (t) => flat * (e0 + (e1 - e0) * t),
    curl: (t) => k * t * t * (3 - 2 * t),
    bend: (t) => -bend * L * t * t,
  };
}

// point de l'axe d'une mèche (repère du personnage), du pied (t = 0) à la pointe (t = 1), même formule
// que la lame : tests
export function mechePoint(s, t) {
  const f = meche(s);
  return f.base.clone().addScaledVector(f.dir, f.L * t).addScaledVector(f.x, f.curl(t)).addScaledVector(f.z, f.bend(t));
}

// Lame : tube `limb` tracé sur l'axe droit de la mèche (y de 0 à L), puis chaque sommet déformé dans le
// repère de la mèche, avec t = y / L borné : x' = x + curl(t), z' = z · ep(t) + bend(t) ; normales
// recalculées. Sur un axe droit, `limb` pose son premier sommet sur +x : avec 6 côtés, deux sommets
// tombent sur les tranchants (la largeur), et la section est une lame, pas un tube aplati.
function lame(g, f) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, p.getY(i) / f.L));
    p.setXYZ(i, p.getX(i) + f.curl(t), p.getY(i), p.getZ(i) * f.ep(t) + f.bend(t));
  }
  g.computeVertexNormals();
  return g;
}

function meches(on, list, c, d, sides = LAME.sides) {
  for (const s of list) {
    const f = meche(s);
    const { profile } = FORMES[s[9]];
    _m.makeBasis(f.x, f.dir, f.z).setPosition(f.base);
    const [dx, dy, dz] = [f.dir.x, f.dir.y, f.dir.z];
    const sens = { sway: 1.5 + Math.asin(Math.max(-1, Math.min(1, dy))) / Math.PI, tint: Math.atan2(dz, dx) / (2 * Math.PI) + 0.5 };
    const at = { add: (g, col, opts) => on(s[7]).add(lame(g, f).applyMatrix4(_m), col, { ...opts, ...sens }) };
    limb(at, s[8] ? d : c, AXE.map((u) => [0, f.L * u, 0]), profile.map((k) => k * s[3]), { sides, rings: LAME.rings, end: 'open' });
  }
}

// rose des anciens rubans de cheveux, gardé pour la bague du crayon (../crayon/)
export const RIBBON = '#ef9bb5';

// Frange : pivot au-dessus du front, sous la calotte ; direction moyenne et bras de levier tirés des mèches
// (point aux six dixièmes de chacune). Butées : − la soulève et l'écarte du front (vent qui monte, vent de
// dos, chute), + la plaquerait contre le front (aucune : 0) ; roulis jusqu'à ± 0,14, permis seulement en
// proportion du soulèvement (zLeve : 0,5 rad de roulis par rad soulevé ; cheveux.js, hairAngles)
const PIVOT_D = [0, HC + 0.15 * S, 0.07 * S];
const DYN_D = (() => {
  const p = new THREE.Vector3(...PIVOT_D);
  const m = new THREE.Vector3();
  let lever = 0;
  for (const s of MECHES.frange) {
    const v = mechePoint(s, 0.6).sub(p);
    lever += v.length() / MECHES.frange.length;
    m.add(v.normalize());
  }
  m.normalize();
  return { dir: [m.x, m.y, m.z], lever, x: [-0.4, 0], z: 0.14, zLeve: 0.5 };
})();

const HERO = {
  pics: {
    // calotte (repère de dessin) : le shader du joueur y rapporte les mèches (brins, racines, reflet)
    cap: CAP,
    // pivots des os à ressort (repère du personnage) : dessus et épi (a), nuque (b), côtés (c), frange (d)
    a: [0, HC + 0.2 * S, -0.07 * S],
    b: [0, HC + 0.06 * S, -0.06 * S],
    c: [0, HC + 0.16 * S, -0.03 * S],
    d: PIVOT_D,
    // dynamique de chaque groupe (entities/character/cheveux.js) : direction moyenne des mèches depuis
    // le pivot (repère de la tête), bras de levier, butées en radians (x : avant + / arrière − pour le
    // dessus ; les mèches pendantes, nuque et côtés, partent en arrière en +), roulis z. Butées choisies
    // pour que les mèches ne rentrent ni dans la tête ni dans les oreilles (tests/cheveux.test.js)
    dyn: {
      // roulis ouverts le 21/11/2026 pour le vent (dessus 0,16 → 0,32, nuque 0,1 → 0,3) : les pointes restent
      // à 21 % (dessus) et 9 % (nuque) hors du crâne ; les côtés restent à 0,06 (les oreilles)
      a: { dir: [0, 0.8, -0.6], lever: 0.13, x: [-0.24, 0.18], z: 0.32 },
      b: { dir: [0, -0.5, -0.87], lever: 0.13, x: [-0.06, 0.3], z: 0.3 },
      c: { dir: [0, -1, -0.1], lever: 0.13, x: [-0.1, 0.15], z: 0.06 },
      d: DYN_D,
    },
    // points du crâne toujours cachés par la coupe (repère du personnage)
    cache: sousCalotte,
    // av : l'avatar (le bob couvre le haut de la tête : ni dessus, ni épi, ni rang haut de la nuque)
    build(P, c, d, av = {}) {
      const bob = av.accessory === 'bob';
      cap(P.on(B.HEAD, ID.hair), c, d, bob ? 0.95 : 1);
      for (const [nom, list] of Object.entries(MECHES)) {
        if (bob && (nom === 'dessus' || nom === 'epi')) continue;
        const zone = ZONES[nom];
        const sel = bob ? list.filter((s) => s[9] === 'c') : list;
        meches((id) => P.on(zone.bone, id), sel, c, d, zone.sides);
      }
    },
  },
};

export const HAIR_STYLES = GABARIT.nom === 'chibi' ? CHIBI.HAIR_STYLES : HERO;
// point posé sur la calotte du gabarit (barrette, accessoires/)
export const onCap = GABARIT.nom === 'chibi' ? CHIBI.onCap : surCalotte;

// fiches du registre : l'avatar coiffé de la coupe ; les coupes retirées le 21/10/2026 gardent leur
// numéro et montrent l'avatar d'aujourd'hui (leurs sauvegardes retombent sur la coupe en pics)
const RETIREES = [['bol', 'Bol court'], ['carre', 'Carré frangé'], ['queue', 'Queue haute'], ['macarons', 'Deux macarons'], ['boucles', 'Boucles'], ['longs', 'Longs lisses']];
export default [
  ...RETIREES.map(([k, nom], i) => fiche(`PER-${String(i + 2).padStart(3, '0')}`, `coupe-${k}`, `Coupe : ${nom}`, perso(() => Character, {}, `hair:${k}`), { status: 'retire', tags: ['coupe', 'remplacée par PER-026'] })),
  fiche('PER-026', 'coupe-pics', `Coupe : ${HAIRS.pics}`, perso(() => Character, { hair: 'pics' }, 'hair:pics'), { tags: ['coupe'] }),
];
