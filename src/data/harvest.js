// Ce que donne chaque élément récoltable, avec quel outil, et en combien de temps il repousse.
// drops : [objet, min, max, probabilité = 1] ; regrow en secondes de temps réel.
import { FLOWER_COLORS, FISH, BUGS } from './items.js';

export const HARVEST = {
  arbre_pompon: { tool: 'hache', tier: 1, strikes: 3, regrow: 600, verb: 'Couper l\'arbre', drops: [['bois', 2, 3], ['branche', 1, 2], ['pousse', 1, 1, 0.3]] },
  arbre_fruitier: { tool: 'hache', tier: 1, strikes: 3, regrow: 600, verb: 'Couper le pêcher', drops: [['bois', 2, 3], ['peche', 2, 3], ['pousse', 1, 1, 0.3]] },
  arbre_cerisier: { tool: 'hache', tier: 1, strikes: 3, regrow: 600, verb: 'Couper le cerisier', drops: [['bois', 2, 3], ['fleur_rose', 1, 2], ['pousse', 1, 1, 0.3]] },
  pin: { tool: 'hache', tier: 1, strikes: 4, regrow: 600, verb: 'Couper le pin', drops: [['bois', 3, 4], ['branche', 1, 2], ['pousse', 1, 1, 0.25]] },
  pin_givre: { tool: 'hache', tier: 2, strikes: 4, regrow: 720, verb: 'Couper le pin givré', drops: [['bois', 3, 4], ['branche', 1, 2], ['cristal', 1, 1, 0.15]] },
  palmier: { tool: 'hache', tier: 1, strikes: 3, regrow: 600, verb: 'Couper le palmier', drops: [['bois', 2, 2], ['coco', 1, 3], ['fibre', 1, 2]] },
  champi_geant: { tool: 'hache', tier: 1, strikes: 3, regrow: 720, verb: 'Couper le champignon géant', drops: [['champignon', 2, 4], ['bois', 1, 1]] },
  cactus: { tool: 'hache', tier: 1, strikes: 2, regrow: 480, verb: 'Couper le cactus', drops: [['fibre', 2, 3]] },
  souche: { tool: 'hache', tier: 1, strikes: 2, regrow: 900, verb: 'Débiter la souche', drops: [['bois', 1, 2], ['branche', 1, 1]] },
  rocher: { tool: 'pioche', tier: 1, strikes: 3, regrow: 480, verb: 'Casser le rocher', drops: [['pierre', 2, 3]] },
  rocher_mousse: { tool: 'pioche', tier: 1, strikes: 3, regrow: 480, verb: 'Casser le rocher', drops: [['pierre', 2, 3], ['fibre', 1, 1, 0.5]] },
  filon_cuivre: { tool: 'pioche', tier: 1, strikes: 4, regrow: 900, verb: 'Miner le cuivre', drops: [['cuivre', 1, 2], ['pierre', 1, 1]] },
  filon_fer: { tool: 'pioche', tier: 2, strikes: 5, regrow: 900, verb: 'Miner le fer', drops: [['fer', 1, 2], ['pierre', 1, 1]] },
  cristal: { tool: 'pioche', tier: 3, strikes: 4, regrow: 1200, verb: 'Détacher le cristal', drops: [['cristal', 1, 2]] },
  obsidienne: { tool: 'pioche', tier: 3, strikes: 4, regrow: 1200, verb: 'Tailler l\'obsidienne', drops: [['obsidienne', 1, 2]] },
  arbuste: { tool: null, strikes: 1, regrow: 240, verb: 'Cueillir des fibres', drops: [['fibre', 1, 2], ['branche', 1, 1, 0.5]] },
  buisson_baies: { tool: null, strikes: 1, regrow: 300, verb: 'Cueillir les baies', drops: [['baie', 2, 3], ['fibre', 1, 1]] },
  fougere: { tool: null, strikes: 1, regrow: 240, verb: 'Cueillir la fougère', drops: [['fibre', 1, 2]] },
  herbe: { tool: null, strikes: 1, regrow: 180, verb: 'Arracher des herbes', drops: [['fibre', 1, 1]] },
  bois_mort: { tool: null, strikes: 1, regrow: 600, verb: 'Ramasser le bois mort', drops: [['branche', 2, 3], ['bois', 1, 1, 0.5]] },
  champi_petit: { tool: null, strikes: 1, regrow: 300, verb: 'Cueillir les champignons', drops: [['champignon', 1, 2]] },
  corail: { tool: null, strikes: 1, regrow: 600, verb: 'Ramasser le corail', drops: [['corail', 1, 1]] },
  fleurs: { tool: null, strikes: 1, regrow: 300, verb: 'Cueillir les fleurs', drops: [['fleur', 1, 2]] },
  // espèces v2
  bouleau: { tool: 'hache', tier: 1, strikes: 3, regrow: 600, verb: 'Couper le bouleau', drops: [['bois', 2, 3], ['branche', 1, 2], ['pousse', 1, 1, 0.25]] },
  saule: { tool: 'hache', tier: 1, strikes: 4, regrow: 700, verb: 'Couper le saule', drops: [['bois', 3, 4], ['fibre', 1, 2], ['pousse', 1, 1, 0.25]] },
  erable: { tool: 'hache', tier: 1, strikes: 3, regrow: 600, verb: 'Couper l\'érable', drops: [['bois', 2, 3], ['branche', 1, 2], ['pousse', 1, 1, 0.25]] },
  sapin_neige: { tool: 'hache', tier: 2, strikes: 4, regrow: 720, verb: 'Couper le sapin', drops: [['bois', 3, 4], ['branche', 1, 2]] },
  bambou: { tool: 'hache', tier: 1, strikes: 2, regrow: 360, verb: 'Couper les bambous', drops: [['bois', 1, 2], ['fibre', 2, 3]] },
  fougere_arbo: { tool: 'hache', tier: 1, strikes: 2, regrow: 480, verb: 'Couper la fougère arborescente', drops: [['fibre', 2, 3], ['bois', 1, 1]] },
  cactus_fleur: { tool: 'hache', tier: 1, strikes: 2, regrow: 480, verb: 'Couper le cactus', drops: [['fibre', 2, 3], ['fleur_rose', 1, 1, 0.6]] },
  buisson_fleuri: { tool: null, strikes: 1, regrow: 300, verb: 'Cueillir le buisson fleuri', drops: [['fibre', 1, 1], ['fleur_rose', 1, 2]] },
  tournesol: { tool: null, strikes: 1, regrow: 360, verb: 'Cueillir le tournesol', drops: [['fleur_jaune', 1, 2], ['graines', 2, 4]] },
  lavande: { tool: null, strikes: 1, regrow: 300, verb: 'Cueillir la lavande', drops: [['fleur_mauve', 2, 3]] },
  ble: { tool: null, strikes: 1, regrow: 420, verb: 'Moissonner le blé', drops: [['ble', 1, 2]] },
  roseau: { tool: null, strikes: 1, regrow: 300, verb: 'Couper les roseaux', drops: [['fibre', 1, 2]] },
  nenuphar: { tool: null, strikes: 1, regrow: 420, verb: 'Cueillir le nénuphar', drops: [['fleur_rose', 1, 1]] },
  potiron: { tool: null, strikes: 1, regrow: 600, verb: 'Ramasser le potiron', drops: [['potiron', 1, 1]] },
  fleur_champ: { tool: null, strikes: 1, regrow: 240, verb: 'Cueillir des fleurs', drops: [['fleur', 1, 2]] },
};

export const TOOL_NAMES = { hache: 'une hache', pioche: 'une pioche', pelle: 'une pelle', canne: 'une canne à pêche', filet: 'un filet' };
export const TIER_NAMES = ['', 'en bois', 'en cuivre', 'en fer', 'de cristal'];

// durée d'un coup selon le niveau de l'outil (s)
export const strikeTime = (tier) => [0.6, 0.7, 0.55, 0.45, 0.35][tier] ?? 0.6;

// couleur de fleur la plus proche d'une teinte de biome
export function flowerItemFor(hex) {
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = rgb(hex);
  let best = FLOWER_COLORS[0];
  let bd = Infinity;
  for (const f of FLOWER_COLORS) {
    const b = rgb(f[2]);
    const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return `fleur_${best[0]}`;
}

// tirage des objets obtenus (rng : () => [0, 1[)
export function rollDrops(def, rng, { flower = null, bonus = 0 } = {}) {
  const out = {};
  for (const [id0, min, max, p = 1] of def.drops) {
    if (rng() > p) continue;
    const id = id0 === 'fleur' ? flower || 'fleur_rose' : id0;
    const n = min + Math.floor(rng() * (max - min + 1)) + (p === 1 ? bonus : 0);
    if (n > 0) out[id] = (out[id] || 0) + n;
  }
  return out;
}

// --- pêche et insectes ---
const W = { commun: 6, 'peu commun': 3, rare: 1, nuit: 4, 'nuit rare': 1 };

// where : { biome, large (bool), night (bool) }, tier : niveau de la canne
export function rollFish(rng, { biome = 'prairie', large = false, tier = 1 } = {}) {
  const pool = FISH.filter(([, , , , w]) => w === 'toutes' || w === biome || (w === 'large' && large));
  let total = 0;
  const weights = pool.map(([, , , r]) => {
    const w = (W[r] || 1) * (r === 'rare' ? tier : 1);
    total += w;
    return w;
  });
  let k = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    k -= weights[i];
    if (k <= 0) return `poisson_${pool[i][0]}`;
  }
  return `poisson_${pool[0][0]}`;
}

export function rollBug(rng, { night = false, beach = false, tier = 1 } = {}) {
  const pool = BUGS.filter(([id, , , , r]) => (beach ? id === 'bernard' : id !== 'bernard') && (night ? r.startsWith('nuit') || r === 'rare' : !r.startsWith('nuit')));
  let total = 0;
  const weights = pool.map(([, , , , r]) => {
    const w = (W[r] || 1) * (r.includes('rare') ? tier : 1);
    total += w;
    return w;
  });
  let k = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    k -= weights[i];
    if (k <= 0) return `insecte_${pool[i][0]}`;
  }
  return `insecte_${pool[0][0]}`;
}
