// Corps et visage du personnage (PER-001) : torse en goutte, bras, jambes et chaussures, habillés selon
// l'avatar ; tenues et accessoires sont dessinés ici (leurs fiches : ../tenues/, ../accessoires/).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { SKINS, HAIR_COLORS, CLOTH_COLORS, SHOE_COLORS } from '../../../entities/character/avatar.js';
import { FACE } from '../../../entities/character/face.js';
import { HC, CREAM, B, ID, box, tint, mixHex, Parts } from '../commun.js';
import { HAIR_STYLES, onCap } from '../coupes/index.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

// ---------------------------------------------------------------------------
// Corps et vêtements
// ---------------------------------------------------------------------------
// profil du torse en goutte : [y, rayon]
const TORSO = [[0.42, 0.0], [0.423, 0.11], [0.44, 0.158], [0.48, 0.183], [0.55, 0.192], [0.62, 0.187], [0.69, 0.172], [0.75, 0.15], [0.8, 0.118], [0.835, 0.08], [0.851, 0.04], [0.856, 0.0]];

function torsoRadius(y) {
  for (let i = 1; i < TORSO.length; i++) {
    const [y1, r1] = TORSO[i];
    if (y <= y1) {
      const [y0, r0] = TORSO[i - 1];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
  }
  return 0;
}

// tranche du torse entre y0 et y1 (les rayures sont des tranches de couleurs différentes)
function torsoBand(b, y0, y1, color, colorFn = null) {
  const pts = [[torsoRadius(y0), y0]];
  for (const [y, r] of TORSO) if (y > y0 + 1e-4 && y < y1 - 1e-4) pts.push([r, y]);
  pts.push([torsoRadius(y1), y1]);
  b.add(G.lathe(pts, 12), color, { s: [1, 1, 0.82], colorFn });
}

export function buildAvatarGeometry(av) {
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

  // --- tête ---
  const H = P.on(B.HEAD, ID.head);
  H.add(G.sphere(FACE.R, 22, 14), skin, { p: [0, HC, 0], s: [FACE.SX, FACE.SY, 1] });
  if (!HAIR_STYLES[av.hair].hideEars) for (const sx of [-1, 1]) H.add(G.sphere(0.062, 8, 6), skinWarm, { p: [sx * 0.292, HC - 0.02, 0.005], s: [0.55, 1, 0.8] });
  const Acc = P.on(B.HEAD, ID.limb);
  HAIR_STYLES[av.hair].build(P, hair, hairDark, av);

  // --- torse ---
  const T = P.on(B.TORSO);
  T.add(G.cyl(0.055, 0.06, 0.1, 10), skin, { p: [0, 0.86, 0] });
  const bands = [];
  const waist = overalls ? 0.5 : 0.42;
  if (overalls) bands.push([0.42, 0.5, bot]);
  if (av.top === 'pull') {
    const y0 = Math.max(waist, 0.47);
    if (y0 > waist) bands.push([waist, y0, top]);
    let y = y0;
    let k = 0;
    while (y < 0.8 - 1e-4) {
      const y1 = Math.min(0.8, y + 0.042);
      bands.push([y, y1, k % 2 ? CREAM : top]);
      y = y1;
      k++;
    }
    bands.push([0.8, 0.856, top]);
  } else {
    bands.push([waist, 0.856, top]);
  }
  for (const [y0, y1, color] of bands) torsoBand(T, y0, y1, color);
  if (av.top === 'gilet') {
    // gilet ouvert sur un t-shirt crème
    T.add(box(0.08, 0.27, 0.03, 0.012), CREAM, { p: [0, 0.645, 0.152], r: [-0.12, 0, 0] });
    for (let i = 0; i < 3; i++) T.add(G.sphere(0.013, 6, 4), '#f2c14e', { p: [0.058, 0.72 - i * 0.07, 0.162 - i * 0.004] });
  }
  // col
  const collar = av.top === 'pull' ? tint(top, 0.88) : av.top === 'robe' ? CREAM : mixHex(top, CREAM, 0.45);
  T.add(G.torus(0.068, 0.016, 5, 14), collar, { p: [0, 0.836, 0], r: [Math.PI / 2, 0, 0] });

  // salopette : bavette, poche, boutons, bretelles (visibles de dos)
  if (overalls) {
    T.add(box(0.2, 0.15, 0.05, 0.02), bot, { p: [0, 0.625, 0.148], r: [-0.1, 0, 0] });
    T.add(box(0.08, 0.05, 0.012, 0.005), tint(bot, 0.86), { p: [0, 0.61, 0.176], r: [-0.1, 0, 0] });
    for (const sx of [-1, 1]) {
      T.add(G.sphere(0.016, 6, 4), '#f2c14e', { p: [sx * 0.075, 0.69, 0.172] });
      T.add(box(0.034, 0.14, 0.02, 0.008), bot, { p: [sx * 0.072, 0.755, 0.118], r: [-0.55, 0, 0] });
      T.add(box(0.034, 0.27, 0.02, 0.008), bot, { p: [sx * 0.074, 0.665, -0.142], r: [0.2, 0, -sx * 0.12] });
    }
  }

  // --- bassin, jupe, robe ---
  const Hp = P.on(B.HIPS);
  Hp.add(G.sphere(0.16, 12, 8), dress ? top : bot, { p: [0, 0.45, 0], s: [1.05, 0.62, 0.88] });
  if (dress) {
    const Sk = P.on(B.SKIRT);
    Sk.add(G.lathe([[0.17, 0.58], [0.19, 0.52], [0.22, 0.44], [0.255, 0.35], [0.27, 0.29], [0.262, 0.275]], 16), top, { s: [1, 1, 0.86] });
  } else if (av.bottom === 'jupe') {
    const Sk = P.on(B.SKIRT);
    Sk.add(G.lathe([[0.165, 0.53], [0.18, 0.48], [0.215, 0.4], [0.24, 0.33], [0.236, 0.315]], 16), bot, { s: [1, 1, 0.88] });
  }

  // --- bras ---
  for (const sx of [-1, 1]) {
    const A = P.on(sx < 0 ? B.ARM_L : B.ARM_R, ID.limb);
    const F = P.on(sx < 0 ? B.FORE_L : B.FORE_R, ID.limb);
    const W = P.on(sx < 0 ? B.HAND_L : B.HAND_R, ID.limb);
    const x = sx * 0.17;
    if (dress) {
      A.add(G.sphere(0.072, 10, 8), top, { p: [sx * 0.175, 0.765, 0], s: [1, 0.85, 1] });
      A.add(G.capsule(0.05, 0.09, 3, 8), skin, { p: [x, 0.7, 0] });
    } else {
      A.add(G.sphere(0.052, 8, 6), top, { p: [x, 0.762, 0] });
      const short = av.top === 'tshirt' ? (c, px, y) => { if (y < 0.68) c.set(skin); } : null;
      A.add(G.capsule(0.05, 0.09, 3, 8), top, { p: [x, 0.7, 0], colorFn: short });
    }
    const longSleeve = av.top === 'pull' || av.top === 'gilet';
    F.add(G.capsule(0.047, 0.09, 3, 8), longSleeve ? top : skin, { p: [x, 0.56, 0] });
    if (av.top === 'pull') F.add(G.torus(0.047, 0.016, 5, 12), CREAM, { p: [x, 0.505, 0], r: [Math.PI / 2, 0, 0] });
    W.add(G.sphere(0.058, 8, 6), skin, { p: [x, 0.455, 0.008], s: [0.9, 1.05, 0.95] });
  }

  // --- jambes et chaussures ---
  for (const sx of [-1, 1]) {
    const Th = P.on(sx < 0 ? B.THIGH_L : B.THIGH_R, ID.limb);
    const Sh = P.on(sx < 0 ? B.SHIN_L : B.SHIN_R, ID.limb);
    const Fo = P.on(sx < 0 ? B.FOOT_L : B.FOOT_R, ID.limb);
    const x = sx * 0.085;
    const bare = dress || av.bottom === 'jupe';
    const shortFn = av.bottom === 'short' && !dress ? (c, px, y) => { if (y < 0.33) c.set(skin); } : null;
    Th.add(G.capsule(0.06, 0.1, 3, 8), bare ? skin : bot, { p: [x, 0.355, 0], colorFn: shortFn });
    Sh.add(G.capsule(0.057, 0.1, 3, 8), pants ? bot : skin, { p: [x, 0.2, 0] });
    if (pants) Sh.add(G.torus(0.064, 0.02, 5, 12), mixHex(bot, CREAM, 0.3), { p: [x, 0.125, 0], r: [Math.PI / 2, 0, 0] });
    if (av.shoes === 'baskets') {
      Fo.add(G.sphere(0.078, 10, 7), shoe, { p: [x, 0.07, 0.03], s: [0.95, 0.62, 1.38] });
      Fo.add(G.sphere(0.082, 10, 5), shoe === CREAM ? '#e2d3b4' : '#fffaf0', { p: [x, 0.032, 0.03], s: [1, 0.3, 1.45] });
      Fo.add(G.sphere(0.014, 6, 4), '#fffaf0', { p: [x, 0.112, 0.08] });
    } else if (av.shoes === 'bottes') {
      Sh.add(G.cyl(0.07, 0.075, 0.16, 10), shoe, { p: [x, 0.17, 0] });
      Sh.add(G.torus(0.071, 0.016, 5, 12), tint(shoe, 0.85), { p: [x, 0.25, 0], r: [Math.PI / 2, 0, 0] });
      Fo.add(G.sphere(0.078, 10, 7), shoe, { p: [x, 0.07, 0.03], s: [0.98, 0.65, 1.4] });
      Fo.add(G.sphere(0.082, 10, 5), tint(shoe, 0.72), { p: [x, 0.03, 0.03], s: [1, 0.28, 1.45] });
    } else {
      Fo.add(G.sphere(0.066, 10, 8), skin, { p: [x, 0.06, 0.03], s: [0.92, 0.55, 1.35] });
      Fo.add(box(0.13, 0.024, 0.22, 0.01), shoe, { p: [x, 0.014, 0.03] });
      Fo.add(G.torus(0.056, 0.014, 6, 12), shoe, { p: [x, 0.07, 0.05], r: [Math.PI / 2 - 0.4, 0, 0], s: [1, 1.2, 1] });
    }
  }

  // --- accessoire (teinte au choix) ---
  const acc = av.accessory;
  const ac = CLOTH_COLORS[av.accessoryColor];
  const TA = P.on(B.TORSO, ID.limb);
  if (acc === 'echarpe') {
    TA.add(G.torus(0.1, 0.042, 6, 16), ac, { p: [0, 0.83, 0.01], r: [Math.PI / 2, 0, 0], s: [1, 0.88, 1] });
    const Sc = P.on(B.SCARF, ID.limb);
    Sc.add(box(0.075, 0.17, 0.035, 0.02), ac, { p: [0.075, 0.73, 0.15], r: [0.25, 0, 0.2] });
    Sc.add(box(0.076, 0.03, 0.037, 0.01), '#f6d78a', { p: [0.093, 0.65, 0.17], r: [0.25, 0, 0.2] });
  } else if (acc === 'bob') {
    Acc.add(G.cyl(0.36, 0.38, 0.03, 18), ac, { p: [0, HC + 0.17, -0.02], r: [-0.12, 0, 0], s: [FACE.SX, 1, 1] });
    // dôme calé sur la calotte des cheveux (coupes/, centre en z −0,08) : elle ne dépasse ni derrière ni
    // sur les côtés
    Acc.add(G.sphere(0.27, 12, 6), ac, { p: [0, HC + 0.2, -0.085], s: [1.2, 0.74, 1.24] });
    Acc.add(G.torus(0.285, 0.022, 5, 20), CREAM, { p: [0, HC + 0.22, -0.08], r: [Math.PI / 2 - 0.12, 0, 0], s: [1.19, 1.23, 1] });
  } else if (acc === 'barrette') {
    const p = onCap(0.62, 0.17, 0.02);
    Acc.add(G.sphere(0.036, 8, 6), ac, { p: [p[0] - 0.03, p[1], p[2]], s: [1.3, 0.8, 0.5], r: [0, 0.6, 0.2] });
    Acc.add(G.sphere(0.036, 8, 6), ac, { p: [p[0] + 0.03, p[1] - 0.012, p[2] - 0.02], s: [1.3, 0.8, 0.5], r: [0, 0.6, -0.2] });
    Acc.add(G.sphere(0.018, 6, 4), '#fffaf0', { p: [p[0], p[1] - 0.006, p[2] + 0.004] });
  } else if (acc === 'lunettes') {
    const R = FACE.R + 0.026;
    for (const sx of [-1, 1]) {
      const phi = (sx * 0.098) / (FACE.R * FACE.SX);
      const ex = Math.sin(phi) * R * FACE.SX;
      const ez = Math.cos(phi) * R;
      Acc.add(G.torus(0.052, 0.008, 6, 18), tint(ac, 0.8), { p: [ex, HC - 0.012, ez], r: [0, phi, 0] });
      // branche : du bord du verre jusqu'au-dessus de l'oreille
      const a = new THREE.Vector3(sx * 0.152, HC - 0.006, 0.262);
      const b = new THREE.Vector3(sx * 0.302, HC + 0.004, -0.02);
      const len = a.distanceTo(b);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      Acc.add(G.cyl(0.006, 0.006, len, 5), tint(ac, 0.8), { p: a.clone().add(b).multiplyScalar(0.5).toArray(), r: [e.x, e.y, e.z] });
    }
    Acc.add(G.cyl(0.006, 0.006, 0.05, 5), tint(ac, 0.8), { p: [0, HC - 0.0, R + 0.002], r: [0, 0, Math.PI / 2] });
  } else if (acc === 'sac') {
    TA.add(box(0.25, 0.27, 0.12, 0.05), ac, { p: [0, 0.64, -0.205] });
    TA.add(box(0.2, 0.1, 0.03, 0.02), tint(ac, 0.85), { p: [0, 0.6, -0.27] });
    TA.add(box(0.25, 0.08, 0.13, 0.03), tint(ac, 1.12), { p: [0, 0.75, -0.2], r: [0.15, 0, 0] });
    for (const sx of [-1, 1]) TA.add(box(0.03, 0.2, 0.02, 0.008), tint(ac, 0.9), { p: [sx * 0.09, 0.71, 0.135], r: [-0.35, 0, 0] });
  }

  return P.build();
}

export default fiche('PER-001', 'corps-visage', 'Corps et visage', perso(() => Character, {}, 'avatar'), {
  variants: [{ label: 'Yeux ovales', params: { eyes: 'ovale' } }, { label: 'Yeux ronds', params: { eyes: 'rond' } }, { label: 'Yeux en amande', params: { eyes: 'amande' } }],
  tags: ['atlas d\'expressions'],
});
