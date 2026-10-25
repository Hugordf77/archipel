// Île d'essai (tests seulement, absente du jeu) : une île à forme, décrite comme celles d'archipel.js
// (silhouette, reliefs et zones en mètres, repère de l'île), qui décrit ses lieux (desc.lieux) : la
// passe des lieux, des chemins, des petites découvertes et de la faune de plan.js s'y exerce en
// attendant que les zones du jeu reçoivent les leurs. Trois zones réelles du monde ouvert lui prêtent
// biome, forêt, fleurs et arbres : une côte habitée (prairie), un sous-bois de champignons, des prés
// fleuris. Variantes (autre graine, autre taille) : la chaîne doit rester saine si l'on retouche une île.
import { islandDesc } from '../../src/world/islands/regions.js';

const BASE = {
  id: 'ile-essai',
  name: 'Île d’essai',
  // au sud de l'emprise du monde : aucune île de la carte à côté
  x: 0,
  z: 2000,
  biome: 'prairie',
  seed: 2463534242,
  zone: 'cote-aux-villages',
  cote: [[-250, -40], [-220, -150], [-140, -215], [-30, -235], [80, -215], [180, -170], [250, -80], [270, 20], [235, 120], [160, 195], [50, 225], [-60, 215], [-170, 165], [-240, 70]],
  base: { h: 8, larg: 140 },
  plage: 14,
  falaise: 0.15,
  reliefs: [
    { t: 'colline', x: 20, z: -90, r: 110, h: 30 },
    { t: 'colline', x: 150, z: 30, r: 70, h: 16 },
    { t: 'plateau', x: -60, z: 110, rx: 60, rz: 40, h: 10, bord: 16 },
    { t: 'cuvette', x: -130, z: -30, r: 45, p: 9 },
  ],
  zones: [
    { id: 'cote-aux-villages', x: 40, z: 140, rx: 220, rz: 110 },
    { id: 'ile-aux-lueurs', x: -150, z: -110, rx: 140, rz: 120 },
    { id: 'ile-aux-fleurs', x: 170, z: -110, rx: 130, rz: 110 },
  ],
  lieux: {
    accostage: [40, 215],
    village: 'Port-Essai',
    moulin: 'rose',
    recette: [
      ['village', 1], ['moulin_vent', 1], ['moulin_eau', 0.85], ['verger', 0.6], ['rucher', 1], ['arche_fleurie', 1],
      ['phare', 1], ['arbre_geant', 1], ['cabane_ermite', 1], ['cercle_pierres', 1], ['ruines', 1], ['tour_guet', 1], ['campement', 0.5],
    ],
    generiques: true,
    faune: [{ sp: 'vache', x: 96, z: 92, count: 3, r: 9, robes: [0, 1, 2] }],
  },
};

const TAILLES = [1, 0.85, 0.91, 0.97, 1.03, 1.09];

// variante k (0 : l'île de référence) : graine décalée, île agrandie ou réduite d'un facteur f
export function ileEssai(k = 0, base = BASE) {
  const f = TAILLES[k] ?? 1;
  const xz = ([x, z]) => [x * f, z * f];
  const cote = base.cote.map(xz);
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const [x, z] of cote) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  }
  const r = Math.max(...cote.map(([x, z]) => Math.hypot(x, z)));
  const rEq = Math.sqrt(((x1 - x0) * (z1 - z0)) / Math.PI);
  const echelle = (o) => {
    const out = { ...o };
    for (const key of ['x', 'z', 'r', 'rx', 'rz', 'bord']) if (out[key] !== undefined) out[key] *= f;
    return out;
  };
  const { lieux } = base;
  return islandDesc({
    id: k ? `${base.id}~${k}` : base.id,
    name: base.name,
    x: base.x,
    z: base.z,
    r,
    biome: base.biome,
    seed: (base.seed + k * 7919) >>> 0,
    ilot: false,
    zone: base.zone,
    forme: {
      cote,
      rEq,
      base: { h: base.base.h, larg: base.base.larg * f },
      plage: base.plage,
      falaise: base.falaise,
      immerge: false,
      reliefs: base.reliefs.map(echelle),
      zones: base.zones.map(echelle),
    },
    lieux: { ...lieux, accostage: xz(lieux.accostage), faune: lieux.faune.map((q) => ({ ...q, x: q.x * f, z: q.z * f })) },
  });
}

export const ILE_ESSAI = ileEssai(0);
export const VARIANTES_ESSAI = TAILLES.map((_, k) => ileEssai(k));
