// Constats d'audit initial : ce qui existe déjà dans le monde ouvert (GEN_VERSION 4) pour chaque zone
// du checklist reliée à des zones du jeu (ZONES d'archipel.js, « home » pour Ton île). Chaque constat
// est vérifié au moment de l'écrire (zone présente dans le jeu, avec des terres ; fichiers de preuve
// présents) et ne vaut jamais validation : production terminée, intégré au jeu, validation « non
// contrôlée » tant qu'une tâche ne l'a pas vérifié contre la fiche de zone. À l'étape « bases » du monde
// ouvert, il n'y a ni lieux, ni chemins, ni villages, ni faune, ni ressources : aucun constat là-dessus.
import fs from 'node:fs';
import path from 'node:path';
import { ARCHIPEL, ZONE_BY_ID } from '../../src/world/archipel.js';
import { ILES } from '../../src/world/islands/regions.js';

// élément → fichiers qui l'attestent (le premier nomme le système, les suivants le testent)
const CONSTATS = {
  B01: ['src/world/archipel.js'],
  B02: ['src/world/islands/gen/forme.js', 'tests/world.test.js'],
  B03: ['src/world/archipel.js', 'src/world/islands/biomes.js'],
  D01: ['src/world/islands/gen/surface.js', 'src/world/islands/gen/forme.js', 'tests/world.test.js'],
  D02: ['src/world/islands/gen/flora.js', 'src/world/archipel.js'],
  D07: ['src/world/islands/biomes.js'],
  E01: ['src/world/islands/regions.js', 'src/world/islands/IslandManager.js'],
  E03: ['src/world/navigation.js', 'tests/collisions.test.js'],
  G06: ['src/core/state.js', 'tests/progression.test.js'],
};
// sources propres aux îles du ciel et à l'île de départ, modelée à la main
const PROPRES = {
  'iles-celestes': { B02: ['src/world/ciel/relief.js', 'tests/ciel.test.js'], D01: ['src/world/ciel/relief.js', 'tests/ciel.test.js'], D02: ['src/world/ciel/relief.js'], E01: ['src/world/ciel/IlesCelestes.js'], E03: ['src/world/navigation.js', 'tests/ciel.test.js'] },
  home: { B02: ['src/world/home/terrain.js'], D01: ['src/world/home/terrain.js', 'tests/herbe-champ.test.js'], D02: ['src/world/home/props.js', 'src/world/home/flowers.js'] },
};

// terres d'une zone du jeu : îles (ou zones d'une île découpée), îles du ciel, île de départ
function terresDe(id) {
  if (id === 'home') return [ARCHIPEL.home.id];
  const iles = ILES.filter((d) => d.zone === id || d.forme?.zones?.some((z) => z.id === id)).map((d) => d.id);
  const ciel = ARCHIPEL.ciel.filter((c) => c.zone === id).map((c) => c.id);
  return [...iles, ...ciel];
}

export function constatsAudit(ctx, racine) {
  const brouillons = [];
  const ecarts = [];
  for (const zone of ctx.zones) {
    const zonesJeu = zone.jeu?.zones || [];
    if (!zonesJeu.length) continue;
    const inconnues = zonesJeu.filter((id) => id !== 'home' && !ZONE_BY_ID.has(id));
    if (inconnues.length) { ecarts.push(`${zone.id} : zone absente du jeu (${inconnues.join(', ')})`); continue; }
    const sansTerre = zonesJeu.filter((id) => !terresDe(id).length);
    if (sansTerre.length) { ecarts.push(`${zone.id} : zone du jeu sans terre (${sansTerre.join(', ')})`); continue; }
    for (const [cle, base] of Object.entries(CONSTATS)) {
      const preuves = [...new Set([...base, ...zonesJeu.flatMap((id) => PROPRES[id]?.[cle] || [])])];
      const manquantes = preuves.filter((p) => !fs.existsSync(path.join(racine, p)));
      if (manquantes.length) { ecarts.push(`${zone.id}.${cle} : preuve introuvable (${manquantes.join(', ')})`); continue; }
      const def = ctx.itemParId.get(`${zone.id}.${cle}`);
      brouillons.push({
        type: 'checklist.item.updated', acteur: 'audit', cle: `audit:${zone.id}.${cle}`,
        donnees: {
          item_id: `${zone.id}.${cle}`,
          changements: { specification: 'specifie', production: 'completed', validation: 'not_checked', integration: 'integrated' },
          preuve: `${preuves.join(' ; ')} (zones du jeu : ${zonesJeu.join(', ')})`,
          note: `Existe dans le monde ouvert (${def.titre.toLowerCase()} des zones ${zonesJeu.join(', ')}, terres : ${zonesJeu.flatMap(terresDe).join(', ')}) ; conformité à la fiche de zone non vérifiée.`,
        },
      });
    }
  }
  return { brouillons, ecarts };
}
