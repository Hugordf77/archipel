// Îles de l'archipel décrites pour la chaîne de génération : la liste fixe d'archipel.js,
// complétée de leurs traits (village, moulin, fleurs, curiosité) et retouches à la main.
// Module pur et déterministe (Worker, jeu, tests).
import { ARCHIPEL } from '../archipel.js';
import { islandTraits, MILL_COLORS } from './archetypes.js';

// Version du générateur : enregistrée dans la sauvegarde (les différences liées à
// une ancienne génération — récoltes, terrassements — sont abandonnées proprement)
export const GEN_VERSION = 3;

// description complète d'une île : ce que lisent plan.js, le Worker, la carte et le journal
export function islandDesc(isl) {
  const ov = isl.overrides || {};
  const desc = { id: isl.id, x: isl.x, z: isl.z, r: isl.r, biome: isl.biome, seed: isl.seed, archetype: isl.archetype, dist: Math.hypot(isl.x, isl.z), big: isl.r >= 110 };
  const traits = { ...islandTraits(desc, isl.archetype) };
  for (const [k, v] of Object.entries(ov.traits || {})) {
    if (k === 'mill') {
      const m = MILL_COLORS.find((c) => c[0] === v);
      if (m) traits.mill = { id: m[0], label: m[1], color: m[2] };
    } else traits[k] = v;
  }
  return { ...desc, traits, name: ov.name || isl.name, overrides: { pois: ov.pois || [], removePois: ov.removePois || [], faune: ov.faune || [] } };
}

export const ISLANDS = ARCHIPEL.islands.map(islandDesc);
export const ISLAND_BY_ID = new Map(ISLANDS.map((d) => [d.id, d]));

// îles dont le disque touche le cercle (x, z, range)
export function islandsInRange(x, z, range) {
  return ISLANDS.filter((d) => Math.hypot(d.x - x, d.z - z) < range + d.r);
}
