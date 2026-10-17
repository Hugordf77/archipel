// Façade de la génération des îles (v2). Le vrai travail est découpé en passes dans
// gen/ : relief et érosion, hydrologie, zones, lieux, chemins, végétation, faune.
// Ce module garde les noms historiques utilisés par le reste du jeu.
import { reliefContext, baseHeight } from './gen/relief.js';

export { KINDS, KIND_INDEX, KIND_RADIUS, STRIDE, TREES, SMALL } from './gen/kinds.js';
export { SEA_FLOOR, CELL, reliefContext, baseHeight } from './gen/relief.js';
export { buildPlan } from './gen/plan.js';
export { Surface, buildLOD1, buildLOD2, buildTile, buildDepthWindow, toHalf, halfToFloat, TILE } from './gen/surface.js';

// la carte du jeu dessine les îles avec le relief de base (rapide, sans plan complet)
export const islandContext = (desc) => reliefContext(desc);
export const islandHeight = (ctx, lx, lz) => baseHeight(ctx, lx, lz);
