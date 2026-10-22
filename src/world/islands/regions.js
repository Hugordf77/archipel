// Îles de l'archipel décrites pour la chaîne de génération et pour le moteur.
//  - ILES : les îles entières de la carte (archipel.js) : carte, minicarte, journal, zones ;
//  - ISLANDS : ce que le moteur charge (LOD, tuiles, Worker) : les îles, et les grandes îles
//    découpées en sections de 512 m, chacune taillée dans le plan de son île (gen/sections.js).
// Les descriptions à archétype (ancienne génération, tests des lieux et des villages) passent
// encore par islandDesc. Module pur et déterministe (Worker, jeu, tests).
import { ARCHIPEL, ZONES, ZONE_BY_ID } from '../archipel.js';
import { islandTraits, MILL_COLORS } from './archetypes.js';
import { reliefContext, baseHeight } from './gen/relief.js';
import { coastDist, formeExt, formeZone, SECTION, SECTION_MIN_R } from './gen/forme.js';

// Version du générateur : enregistrée dans la sauvegarde (les différences liées à
// une ancienne génération — récoltes, terrassements — sont abandonnées proprement)
// 4 : open world de l'archipel des souvenirs (6 × 4 km)
export const GEN_VERSION = 4;

const NO_OVERRIDES = { pois: [], removePois: [], faune: [] };

// description complète d'une île : ce que lisent plan.js, le Worker, la carte et le journal
export function islandDesc(isl) {
  if (isl.forme) return { ...isl, dist: Math.hypot(isl.x, isl.z), big: isl.r >= 110, traits: {}, overrides: NO_OVERRIDES };
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

export const ILES = ARCHIPEL.islands.map(islandDesc);
export const ILE_BY_ID = new Map(ILES.map((d) => [d.id, d]));

// Sections d'une grande île : carrés de 512 m alignés sur sa grille, gardés s'ils touchent la terre
// ou les hauts-fonds. Identifiant stable « île~i-j ».
export function sectionsOf(d) {
  const ext = formeExt(d);
  const k = (2 * ext) / SECTION;
  const c = reliefContext(d);
  const out = [];
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < k; i++) {
      const cx = -ext + SECTION / 2 + i * SECTION;
      const cz = -ext + SECTION / 2 + j * SECTION;
      let land = false;
      for (let v = -SECTION / 2 - 24; v <= SECTION / 2 + 24 && !land; v += 24) {
        for (let u = -SECTION / 2 - 24; u <= SECTION / 2 + 24; u += 24) {
          if (baseHeight(c, cx + u, cz + v) > -6) {
            land = true;
            break;
          }
        }
      }
      if (!land) continue;
      out.push({
        id: `${d.id}~${i}-${j}`, parent: d.id, name: d.name, zone: d.zone, biome: d.biome, seed: d.seed, ilot: false,
        x: d.x + cx, z: d.z + cz, r: (SECTION / 2) * Math.SQRT2, dist: Math.hypot(d.x + cx, d.z + cz), big: true,
        section: { cx, cz, i, j }, traits: {}, overrides: NO_OVERRIDES,
      });
    }
  }
  return out;
}

export const ISLANDS = ILES.flatMap((d) => (d.forme && d.r >= SECTION_MIN_R ? sectionsOf(d) : [d]));
export const ISLAND_BY_ID = new Map(ISLANDS.map((d) => [d.id, d]));

// îles du moteur dont le disque touche le cercle (x, z, range)
export function islandsInRange(x, z, range) {
  return ISLANDS.filter((d) => Math.hypot(d.x - x, d.z - z) < range + d.r);
}

// Zone nommée au point (x, z) du monde : sur une île (jusqu'à 40 m au large de sa côte), la zone de
// l'île la plus proche ; en mer, la zone dont l'aire contient le point ; près du départ, « Ton île ».
const HOME_ZONE = { id: 'home', name: ARCHIPEL.home.name, sous: 'Ton île de départ', x: 0, z: 0, lx: 0, lz: 0 };
export function zoneAt(x, z) {
  if (Math.hypot(x - ARCHIPEL.home.x, z - ARCHIPEL.home.z) < ARCHIPEL.home.r + 50) return HOME_ZONE;
  for (const d of ILES) {
    if (!d.forme || Math.abs(x - d.x) > d.r + 120 || Math.abs(z - d.z) > d.r + 120) continue;
    const c = reliefContext(d);
    const lx = x - d.x;
    const lz = z - d.z;
    if (coastDist(c, lx, lz) > -40) return ZONE_BY_ID.get(c.zones[formeZone(c, lx, lz)].id) || null;
  }
  let best = null;
  for (const zn of ZONES) {
    if (zn.ile) continue;
    const e = ((x - zn.x) / zn.rx) ** 2 + ((z - zn.z) / zn.rz) ** 2;
    if (e < 1 && (!best || e < best.e)) best = { e, zn };
  }
  return best ? best.zn : null;
}
