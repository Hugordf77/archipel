// Îles de l'ancien archipel (génération 3, à archétypes) décrites pour la chaîne de génération :
// les tests des lieux, des chemins, des villages, de la faune et de l'herbe des prés s'y exercent
// en attendant que ces passes reviennent sur les îles de la carte.
import { ARCHIPEL_V3 } from '../fixtures/archipel-v3.js';
import { islandDesc } from '../../src/world/islands/regions.js';

export { ARCHIPEL_V3 };
export const ISLANDS = ARCHIPEL_V3.islands.map(islandDesc);
export const ISLAND_BY_ID = new Map(ISLANDS.map((d) => [d.id, d]));
