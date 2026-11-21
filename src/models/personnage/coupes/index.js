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

function cap(b, c, d, k = 1) {
  const [rx, ry, rz] = CAP.r;
  b.add(G.sphere(1, 14, 9), c, { p: CAP.c, s: [rx * k, ry * k, rz * k] });
  b.add(G.sphere(1, 10, 7), d, { p: NUQUE.c, s: NUQUE.r });
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
// contour, ton (0 clair, 1 foncé), forme ('c' couchée, 'd' dressée)]. Chaque mèche est un tube effilé
// à bout rond (`limb`), aplati en feuille, dont le pied s'enfonce sous la calotte : de la pointe au
// pied, les mèches rayonnent depuis le sommet du crâne, en trois rangs posés l'un sur l'autre.
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
// formes : enfoncement du pied, profil (rayon au pied, au ventre, aux deux tiers, à la pointe, en part de
// la demi-largeur), aplatissement (épaisseur en part de la largeur)
export const FORMES = {
  c: { sink: 0.03 * S, profile: [0.9, 1, 0.8, 0.18], flat: 0.62 },
  d: { sink: 0.045 * S, profile: [0.82, 1, 0.72, 0.16], flat: 0.66 },
};
// zones : os et finesse du tube. La frange, vue de près et de face, a 8 côtés ; les pics du dessus, vus
// de loin et sur le ciel, 6 ; le reste 7
export const ZONES = {
  frange: { bone: B.HEAD, sides: 8, rings: 3 },
  cotes: { bone: B.HAIR_C, sides: 7, rings: 3 },
  nuque: { bone: B.HAIR_B, sides: 7, rings: 3 },
  dessus: { bone: B.HAIR_A, sides: 6, rings: 3 },
  epi: { bone: B.HAIR_A, sides: 7, rings: 3 },
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
    [PI, 0.06, 0.16, 0.066, -0.1, 0.4, -0.1, T, 0, 'd'],
    [PI + 0.85, 0.07, 0.15, 0.062, -0.2, 0.42, -0.1, L, 0, 'd'],
  ],
  // dessus : rang du haut, six pics dressés qui rayonnent depuis le sommet, pointes qui rebiquent
  dessus: [
    [0, 0.165, 0.12, 0.054, 0.3, 0.7, -0.15, T, 0, 'd'],
    [1.05, 0.165, 0.13, 0.054, 0.2, 0.7, -0.15, L, 0, 'd'],
    [2.1, 0.165, 0.13, 0.054, -0.2, 0.7, -0.15, Bo, 0, 'd'],
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
// normale de la calotte ramenée perpendiculaire à l'axe (épaisseur), axe x = largeur ; axe de la mèche
// (courbé dans le plan de l'épaisseur, avant l'aplatissement)
export function meche([a, dy, len, , tw, lift, bend, , , forme]) {
  const { sink, flat } = FORMES[forme];
  const base = new THREE.Vector3(...surCalotte(a, dy, -sink, _n));
  // sens du coiffé : la pente (vers le bas), vrillée vers l'azimut croissant
  _t.set(Math.sin(tw) * Math.cos(a), -Math.cos(tw), -Math.sin(tw) * Math.sin(a));
  _t.addScaledVector(_n, -_n.dot(_t)).normalize();
  const dir = _t.clone().multiplyScalar(Math.cos(lift)).addScaledVector(_n, Math.sin(lift)).normalize();
  _z.copy(_n).addScaledVector(dir, -_n.dot(dir)).normalize();
  _x.crossVectors(dir, _z);
  const L = len + sink;
  const axe = [0, 0.3, 0.65, 1].map((t) => [0, L * t, (-bend * L * t * t) / flat]);
  return { base, dir, x: _x.clone(), z: _z.clone(), L, axe, flat };
}

// point de l'axe d'une mèche (repère du personnage), du pied (t = 0) à la pointe (t = 1) : tests
export function mechePoint(s, t) {
  const f = meche(s);
  const bend = s[6];
  return f.base.clone().addScaledVector(f.dir, f.L * t).addScaledVector(f.z, -bend * f.L * t * t);
}

function meches(on, list, c, d, { sides, rings }) {
  for (const s of list) {
    const f = meche(s);
    const { profile } = FORMES[s[9]];
    _m.makeBasis(f.x, f.dir, f.z).scale(new THREE.Vector3(1, 1, f.flat)).setPosition(f.base);
    const at = { add: (g, col, opts) => on(s[7]).add(g.applyMatrix4(_m), col, opts) };
    limb(at, s[8] ? d : c, f.axe, profile.map((k) => k * s[3]), { sides, rings, end: 'round' });
  }
}

// rose des anciens rubans de cheveux, gardé pour la bague du crayon (../crayon/)
export const RIBBON = '#ef9bb5';

const HERO = {
  pics: {
    // pivots des os à ressort (repère du personnage) : dessus et épi (a), nuque (b), côtés (c)
    a: [0, HC + 0.2 * S, -0.07 * S],
    b: [0, HC + 0.06 * S, -0.06 * S],
    c: [0, HC + 0.16 * S, -0.03 * S],
    // dynamique de chaque groupe (entities/character/cheveux.js) : direction moyenne des mèches depuis
    // le pivot (repère de la tête), bras de levier, butées en radians (x : avant + / arrière − pour le
    // dessus ; les mèches pendantes, nuque et côtés, partent en arrière en +), roulis z. Butées choisies
    // pour que les mèches ne rentrent ni dans la tête ni dans les oreilles (tests/cheveux.test.js)
    dyn: {
      a: { dir: [0, 0.8, -0.6], lever: 0.13, x: [-0.24, 0.18], z: 0.16 },
      b: { dir: [0, -0.5, -0.87], lever: 0.13, x: [-0.06, 0.3], z: 0.1 },
      c: { dir: [0, -1, -0.1], lever: 0.13, x: [-0.1, 0.15], z: 0.06 },
    },
    // av : l'avatar (le bob couvre le haut de la tête : ni dessus, ni épi, ni rang haut de la nuque)
    build(P, c, d, av = {}) {
      const bob = av.accessory === 'bob';
      cap(P.on(B.HEAD, ID.hair), c, d, bob ? 0.95 : 1);
      for (const [nom, list] of Object.entries(MECHES)) {
        if (bob && (nom === 'dessus' || nom === 'epi')) continue;
        const zone = ZONES[nom];
        const sel = bob ? list.filter((s) => s[9] === 'c') : list;
        meches((id) => P.on(zone.bone, id), sel, c, d, zone);
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
