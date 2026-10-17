// Passe 6 — faune : points d'apparition déterministes (espèce, position, taille du
// groupe, rayon d'errance) selon les zones, le biome et les lieux.
import { mulberry32, weighted } from '../../../core/random.js';
import { Z } from './zones.js';

export const SPECIES = ['mouton', 'chevre', 'vache', 'lapin', 'cerf', 'renard', 'herisson', 'ecureuil', 'tortue', 'crabe', 'mouette', 'perroquet', 'flamant', 'canard', 'grenouille', 'poisson', 'papillon', 'abeille', 'luciole', 'phoque', 'pingouin', 'lezard', 'escargot'];
export const SPECIES_LABEL = {
  mouton: 'Mouton', chevre: 'Chèvre', vache: 'Vache', lapin: 'Lapin', cerf: 'Cerf', renard: 'Renard', herisson: 'Hérisson', ecureuil: 'Écureuil',
  tortue: 'Tortue', crabe: 'Crabe', mouette: 'Mouette', perroquet: 'Perroquet', flamant: 'Flamant rose', canard: 'Canard', grenouille: 'Grenouille',
  poisson: 'Poisson', papillon: 'Papillon', abeille: 'Abeille', luciole: 'Luciole', phoque: 'Phoque', pingouin: 'Pingouin', lezard: 'Lézard', escargot: 'Escargot géant',
};

// [espèce, poids, taille de groupe min, max, biomes autorisés (null = tous)]
const BY_ZONE = {
  [Z.PRAIRIE]: [['lapin', 3, 2, 4], ['herisson', 1, 1, 1], ['cerf', 0.6, 1, 2, ['prairie', 'pins', 'glace']], ['papillon', 1.5, 4, 7]],
  [Z.FLEURS]: [['papillon', 4, 5, 9], ['abeille', 2, 3, 6], ['lapin', 1.5, 2, 3]],
  [Z.CLAIRIERE]: [['cerf', 2, 1, 3, ['prairie', 'pins', 'glace', 'champignons']], ['lapin', 1.5, 2, 3], ['papillon', 1, 3, 5]],
  [Z.FORET]: [['ecureuil', 2, 1, 2, ['prairie', 'pins', 'glace']], ['cerf', 1, 1, 2, ['prairie', 'pins', 'glace']], ['perroquet', 3, 2, 4, ['tropical']], ['luciole', 1.5, 6, 10]],
  [Z.LISIERE]: [['renard', 1.5, 1, 1], ['herisson', 1, 1, 1], ['lapin', 1, 1, 3]],
  [Z.MAQUIS]: [['chevre', 2, 2, 4], ['lezard', 1.5, 1, 2, ['dunes', 'volcan', 'tropical']]],
  [Z.ROCHE]: [['chevre', 2, 2, 3], ['lezard', 1, 1, 2, ['dunes', 'volcan', 'tropical']]],
  [Z.ALPAGE]: [['chevre', 3, 2, 4]],
  [Z.PLAGE]: [['crabe', 3, 2, 4], ['tortue', 2, 1, 3, ['tropical', 'atoll', 'dunes']], ['phoque', 3, 1, 3, ['glace']], ['pingouin', 3, 3, 6, ['glace']], ['mouette', 2, 3, 6]],
  [Z.DUNE]: [['lezard', 2, 1, 2], ['crabe', 1, 2, 3]],
  [Z.MARAIS]: [['grenouille', 3, 2, 4], ['luciole', 1.5, 6, 10], ['flamant', 2, 3, 6, ['tropical', 'atoll']]],
  [Z.ROSELIERE]: [['grenouille', 2, 2, 3], ['canard', 2, 2, 4]],
  [Z.NEIGE]: [['pingouin', 2, 3, 5, ['glace']]],
  [Z.LAVE]: [['lezard', 2, 1, 2]],
  [Z.CHAMPIGNONS]: [['escargot', 3, 1, 3], ['luciole', 1.5, 6, 10]],
  [Z.CULTURES]: [['mouton', 2, 3, 6], ['vache', 0.6, 1, 2], ['lapin', 1, 1, 2]],
  [Z.VILLAGE]: [['mouton', 1, 2, 4]],
  [Z.LAC]: [['canard', 3, 2, 4], ['poisson', 2, 3, 6]],
  [Z.RIVIERE]: [['poisson', 3, 3, 5]],
  [Z.MER]: [['flamant', 1, 3, 6, ['atoll', 'tropical']], ['poisson', 1, 3, 6]],
};
const SPREAD = { mouette: 18, perroquet: 14, papillon: 9, abeille: 6, luciole: 10, poisson: 6, chevre: 14, mouton: 12, cerf: 16, lapin: 10, flamant: 8 };

export function placeSpawners(P, pois) {
  const { H, n, s, ext, zone, desc } = P;
  const rng = mulberry32(desc.seed ^ 0xfa0a);
  const out = [];
  const land = [];
  for (let k = 0; k < n * n; k++) if (H[k] > -0.8) land.push(k);
  const area = land.length * s * s;
  const target = desc.r < 40 ? (rng() < 0.6 ? 1 : 0) : Math.max(2, Math.min(24, Math.round(area / 3200)));
  const add = (sp, x, z, count, k) => out.push({ sp, x, z, count, r: SPREAD[sp] ?? 8, zone: k >= 0 ? zone[k] : -1 });
  for (let t = 0; t < target * 4 && out.length < target; t++) {
    const k = land[Math.floor(rng() * land.length)];
    const opts = (BY_ZONE[zone[k]] || []).filter(([, , , , bs]) => !bs || bs.includes(desc.biome));
    if (!opts.length) continue;
    const pick = weighted(rng, opts.map((o) => [o, o[1]]));
    const x = -ext + (k % n) * s;
    const z = -ext + Math.floor(k / n) * s;
    if (out.some((o) => o.sp === pick[0] && Math.hypot(o.x - x, o.z - z) < 30)) continue;
    add(pick[0], x, z, pick[2] + Math.floor(rng() * (pick[3] - pick[2] + 1)), k);
  }
  // lieux qui appellent leurs animaux
  for (const p of pois) {
    if (p.type === 'rucher') add('abeille', p.x, p.z, 5, -1);
    if (p.type === 'village') for (const f of p.fields || []) if (rng() < 0.7) add('mouton', f.x, f.z, 3 + Math.floor(rng() * 3), -1);
  }
  // toute île de plus de 80 m de diamètre a des animaux ; une plage a toujours ses crabes
  if (desc.r >= 40 && !out.length) {
    const k = land[Math.floor(land.length / 2)];
    add('crabe', -ext + (k % n) * s, -ext + Math.floor(k / n) * s, 2, k);
  }
  return out;
}
