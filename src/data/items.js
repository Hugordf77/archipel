// Objets de l'archipel : ressources, outils (4 niveaux, sans usure), stations,
// nourriture, poissons, insectes, pièces de construction. Icônes SVG générées.

const S = (body) => `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const darker = (hex, k = 0.7) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
};

// gabarits d'icônes : (couleur principale, couleur secondaire) → SVG
const SHAPES = {
  log: (c) => S(`<rect x="5" y="11" width="20" height="10" rx="5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><ellipse cx="25" cy="16" rx="3.4" ry="5" fill="#f1d3a3" stroke="${darker(c)}" stroke-width="2"/><path d="M9 14h9M10 18h6" stroke="${darker(c, 0.82)}" stroke-width="1.5"/>`),
  stick: (c) => S(`<path d="M7 25L25 7M16 16l5 1M12 20l-1 4" stroke="${darker(c)}" stroke-width="5"/><path d="M7 25L25 7M16 16l5 1" stroke="${c}" stroke-width="2.6"/>`),
  tuft: (c) => S(`<path d="M16 27C15 20 10 15 6 13M16 27c0-8 1-14 4-19M16 27c2-6 6-10 11-11" stroke="${darker(c)}" stroke-width="4" fill="none"/><path d="M16 27C15 20 10 15 6 13M16 27c0-8 1-14 4-19M16 27c2-6 6-10 11-11" stroke="${c}" stroke-width="2" fill="none"/>`),
  rock: (c) => S(`<path d="M5 22c0-6 4-11 10-12 6-1 12 3 12 9 0 4-3 7-8 7H11c-4 0-6-2-6-4z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M12 15c2-1 4-1 6 0" stroke="#fffaf0" stroke-width="1.6" fill="none" opacity=".7"/>`),
  pile: (c) => S(`<path d="M4 25c2-8 7-13 12-13s10 5 12 13z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><circle cx="12" cy="20" r="1" fill="${darker(c, 0.8)}"/><circle cx="18" cy="17" r="1" fill="${darker(c, 0.8)}"/><circle cx="21" cy="22" r="1" fill="${darker(c, 0.8)}"/>`),
  nugget: (c, c2) => S(`<path d="M6 22c-1-5 3-9 7-9l3-3c4 0 9 3 10 8 1 4-2 8-7 8h-8c-3 0-5-2-5-4z" fill="#d8d0d8" stroke="#9a8f9e" stroke-width="2"/><circle cx="13" cy="19" r="3" fill="${c}" stroke="${darker(c)}" stroke-width="1.5"/><circle cx="20" cy="15" r="2.4" fill="${c2 || c}" stroke="${darker(c)}" stroke-width="1.5"/><circle cx="21" cy="22" r="1.8" fill="${c}"/>`),
  crystal: (c) => S(`<path d="M16 3l6 8-6 18-6-18z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M10 11h12M16 3v26" stroke="#fffaf0" stroke-width="1.2" opacity=".7"/><path d="M8 17l-3 5 4 6 2-6zM24 17l3 5-4 6-2-6z" fill="${c}" stroke="${darker(c)}" stroke-width="1.6"/>`),
  coral: (c) => S(`<path d="M16 28V17M16 20l-6-6V9M16 18l6-6V7M10 14l-3-2M22 12l3-3" stroke="${darker(c)}" stroke-width="5" fill="none"/><path d="M16 28V17M16 20l-6-6V9M16 18l6-6V7M10 14l-3-2M22 12l3-3" stroke="${c}" stroke-width="3" fill="none"/>`),
  fruit: (c) => S(`<circle cx="16" cy="18" r="9" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M16 9c0-3 1-5 3-6" stroke="#9f6b48" stroke-width="2" fill="none"/><path d="M17 8c3-2 6-1 7 1-3 1-5 1-7-1z" fill="#a6d98f" stroke="#5c9e5a" stroke-width="1.4"/><ellipse cx="12.5" cy="15" rx="2" ry="3" fill="#fffaf0" opacity=".45"/>`),
  berries: (c) => S(`<circle cx="11" cy="18" r="5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><circle cx="20" cy="17" r="5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><circle cx="16" cy="24" r="5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M15 12c1-4 4-6 8-6" stroke="#5c9e5a" stroke-width="2" fill="none"/>`),
  mushroom: (c) => S(`<path d="M5 16c0-6 5-10 11-10s11 4 11 10z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M12 16v8c0 2 1.5 3 4 3s4-1 4-3v-8" fill="#fbf0dc" stroke="#c9a77e" stroke-width="2"/><circle cx="11" cy="11" r="1.5" fill="#fffaf0"/><circle cx="19" cy="9.5" r="1.4" fill="#fffaf0"/>`),
  coco: () => S(`<circle cx="16" cy="17" r="10" fill="#a8794f" stroke="#7a5536" stroke-width="2"/><circle cx="13" cy="13" r="1.4" fill="#5a3d28"/><circle cx="18" cy="12.5" r="1.4" fill="#5a3d28"/><circle cx="15.5" cy="17" r="1.4" fill="#5a3d28"/>`),
  fish: (c, c2) => S(`<path d="M4 16c4-6 12-8 18-4l5-4v16l-5-4c-6 4-14 2-18-4z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><circle cx="9" cy="15" r="1.4" fill="#3d3049"/><path d="M13 12c1 3 1 5 0 8" stroke="${c2 || darker(c, 0.85)}" stroke-width="1.8" fill="none"/>`),
  bug: (c, c2) => S(`<path d="M16 9v16" stroke="#3d3049" stroke-width="2"/><path d="M16 14c-4-7-11-7-11-2s5 7 11 4zM16 14c4-7 11-7 11-2s-5 7-11 4z" fill="${c}" stroke="${darker(c)}" stroke-width="1.8"/><path d="M16 18c-3 2-7 5-6 8 2 1 5-2 6-5zM16 18c3 2 7 5 6 8-2 1-5-2-6-5z" fill="${c2 || c}" stroke="${darker(c)}" stroke-width="1.6"/><path d="M15 9l-3-4M17 9l3-4" stroke="#3d3049" stroke-width="1.4"/>`),
  flower: (c) => S(`<path d="M16 29V17" stroke="#5c9e5a" stroke-width="2.4"/><path d="M16 23c-3-1-5-3-5-5 3 0 5 2 5 5z" fill="#a6d98f" stroke="#5c9e5a" stroke-width="1.4"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${16 + Math.cos((a * Math.PI) / 180) * 5}" cy="${11 + Math.sin((a * Math.PI) / 180) * 5}" r="4" fill="${c}" stroke="${darker(c)}" stroke-width="1.4"/>`).join('')}<circle cx="16" cy="11" r="2.6" fill="#f6d27a"/>`),
  plank: (c) => S(`<rect x="4" y="9" width="24" height="6" rx="1.5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><rect x="4" y="17" width="24" height="6" rx="1.5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M9 12h6M18 20h5" stroke="${darker(c, 0.82)}" stroke-width="1.4"/>`),
  rope: (c) => S(`<ellipse cx="16" cy="17" rx="10" ry="8" fill="none" stroke="${darker(c)}" stroke-width="5"/><ellipse cx="16" cy="17" rx="10" ry="8" fill="none" stroke="${c}" stroke-width="3"/><ellipse cx="16" cy="17" rx="5" ry="4" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M24 22l4 5" stroke="${darker(c)}" stroke-width="3"/>`),
  cloth: (c) => S(`<path d="M6 8h16l4 4v12H10l-4-4z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M10 12h12M10 16h12M10 20h10" stroke="#fffaf0" stroke-width="1.2" opacity=".6"/>`),
  brick: (c) => S(`<rect x="4" y="12" width="24" height="12" rx="2" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M4 12l4-5h20l-4 5M28 7v12l-4 5" fill="${darker(c, 0.85)}" stroke="${darker(c)}" stroke-width="2"/>`),
  glass: () => S(`<rect x="7" y="5" width="18" height="22" rx="2" fill="#d9f1f6" stroke="#7fb3c2" stroke-width="2"/><path d="M11 10l6-3M11 15l9-5" stroke="#fffaf0" stroke-width="2"/>`),
  ingot: (c) => S(`<path d="M5 22l4-9h14l4 9z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M9 13l2-4h10l2 4" fill="${darker(c, 0.9)}" stroke="${darker(c)}" stroke-width="2"/><path d="M11 17h8" stroke="#fffaf0" stroke-width="1.4" opacity=".7"/>`),
  nails: (c) => S(`${[8, 14, 20].map((x, i) => `<path d="M${x} 7h5M${x + 2.5} 7l${i % 2 ? 1 : -1} 18" stroke="${darker(c)}" stroke-width="2.4"/>`).join('')}`),
  sail: () => S(`<path d="M8 27V4l18 21z" fill="#fbf3e6" stroke="#9f6b48" stroke-width="2"/><path d="M8 27h20" stroke="#9f6b48" stroke-width="2.4"/>`),
  dye: (c) => S(`<path d="M9 11h14v14c0 2-1 3-3 3h-8c-2 0-3-1-3-3z" fill="#fffaf0" stroke="#9a8f9e" stroke-width="2"/><path d="M9 16h14v9c0 2-1 3-3 3h-8c-2 0-3-1-3-3z" fill="${c}"/><rect x="10" y="6" width="12" height="5" rx="1.5" fill="#d9a273" stroke="#9f6b48" stroke-width="1.6"/>`),
  torch: () => S(`<path d="M15 28l2-14" stroke="#9f6b48" stroke-width="3.4"/><path d="M16 4c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.4-4.7.1 1.5.8 2.4 1.6 2.9-.3-2.5.2-5 1-7.2z" fill="#f6c46d" stroke="#e08a5a" stroke-width="1.8"/>`),
  jar: (c) => S(`<path d="M10 10h12v15c0 2-1 3-3 3h-6c-2 0-3-1-3-3z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><rect x="9" y="5" width="14" height="5" rx="1.5" fill="#f4a28c" stroke="#b9705f" stroke-width="1.6"/><path d="M13 16h6" stroke="#fffaf0" stroke-width="1.6" opacity=".6"/>`),
  skewer: () => S(`<path d="M4 28L28 4" stroke="#9f6b48" stroke-width="2.4"/><path d="M8 20c2-5 7-8 12-6l3-2v9l-3-2c-4 3-9 3-12 1z" fill="#f2b880" stroke="#c9826b" stroke-width="1.8"/>`),
  bait: () => S(`<path d="M8 16c0-5 4-8 8-8s8 3 8 8-4 9-8 9-8-4-8-9z" fill="#c7b2e6" stroke="#8a74ad" stroke-width="2"/><path d="M12 14c2-2 6-2 8 0" stroke="#fffaf0" stroke-width="1.6" fill="none"/>`),
  // outils : couleur de la tête selon le niveau
  axe: (c) => S(`<path d="M10 28L22 6" stroke="#9f6b48" stroke-width="3.4"/><path d="M18 7c3-3 8-3 10 0l-2 9c-2-1-5-2-8-1z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/>`),
  pick: (c) => S(`<path d="M9 28L20 8" stroke="#9f6b48" stroke-width="3.4"/><path d="M6 10c6-6 14-7 22-3-4 0-9 1-12 4-3-1-6-1-10-1z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/>`),
  shovel: (c) => S(`<path d="M8 4l5 5M12 8l7 9" stroke="#9f6b48" stroke-width="3.4"/><path d="M17 15c4-2 9 1 10 6l-1 6-6 1c-5-1-8-6-6-10z" fill="${c}" stroke="${darker(c)}" stroke-width="2"/>`),
  rod: (c) => S(`<path d="M5 28L24 5" stroke="#9f6b48" stroke-width="2.6"/><path d="M24 5c2 4 3 9 2 14" stroke="#9a8f9e" stroke-width="1.2" fill="none"/><circle cx="26" cy="21" r="2" fill="${c}" stroke="${darker(c)}" stroke-width="1.4"/><circle cx="9" cy="23" r="3" fill="${c}" stroke="${darker(c)}" stroke-width="1.6"/>`),
  net: (c) => S(`<path d="M6 28l9-10" stroke="#9f6b48" stroke-width="3"/><circle cx="20" cy="12" r="8" fill="#fffaf0" fill-opacity=".5" stroke="${c}" stroke-width="2.6"/><path d="M14 9l12 6M14 15l11-7M20 4v16" stroke="${darker(c)}" stroke-width="1" opacity=".8"/>`),
  bench: (c) => S(`<rect x="4" y="11" width="24" height="5" rx="1.5" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M7 16v10M25 16v10M7 22h18" stroke="${darker(c)}" stroke-width="2.6"/><path d="M9 8l4 3M19 6v5" stroke="#9a8f9e" stroke-width="2"/>`),
  oven: () => S(`<path d="M5 27V15c0-6 5-10 11-10s11 4 11 10v12z" fill="#e6b8a0" stroke="#a8705a" stroke-width="2"/><path d="M11 27v-6a5 5 0 0 1 10 0v6z" fill="#5b4a63"/><path d="M13 25c1-2 2-3 3-5 1 2 2 3 3 5" fill="#f6c46d"/>`),
  loom: () => S(`<rect x="5" y="6" width="22" height="20" rx="2" fill="none" stroke="#9f6b48" stroke-width="2.4"/><path d="M9 6v20M13 6v20M17 6v20M21 6v20M25 6v20" stroke="#c7b2e6" stroke-width="1.6"/><path d="M5 14h22M5 18h22" stroke="#f4a28c" stroke-width="2"/>`),
  shipyard: () => S(`<path d="M4 21h24l-4 6H8z" fill="#e0b07e" stroke="#9f6b48" stroke-width="2"/><path d="M8 21V9l8-4 8 4v12" fill="none" stroke="#9f6b48" stroke-width="2"/><path d="M12 21V12M20 21V12" stroke="#9f6b48" stroke-width="1.6"/>`),
  boat: () => S(`<path d="M5 20h22l-3.5 6h-15z" fill="#e0b07e" stroke="#9f6b48" stroke-width="2"/><path d="M16 4v15" stroke="#9f6b48" stroke-width="2"/><path d="M16.5 5c5 3 7.5 8 7.5 13h-7.5z" fill="#fffaf0" stroke="#9f6b48" stroke-width="1.6"/>`),
  piece: (c) => S(`<rect x="6" y="8" width="20" height="16" rx="2" fill="${c}" stroke="${darker(c)}" stroke-width="2"/><path d="M6 14h20M6 19h20M13 8v6M19 14v5M13 19v5" stroke="${darker(c, 0.8)}" stroke-width="1.4"/>`),
  chest: () => S(`<rect x="5" y="13" width="22" height="13" rx="2" fill="#e0b07e" stroke="#9f6b48" stroke-width="2"/><path d="M5 13c0-4 3-7 11-7s11 3 11 7z" fill="#c98f5f" stroke="#9f6b48" stroke-width="2"/><rect x="14" y="15" width="4" height="5" rx="1" fill="#f6d27a" stroke="#9f6b48" stroke-width="1.4"/>`),
  map: () => S(`<path d="M4 8l8-3 8 3 8-3v19l-8 3-8-3-8 3z" fill="#f6ead2" stroke="#9f6b48" stroke-width="2"/><path d="M12 5v19M20 8v19" stroke="#c9a77e" stroke-width="1.4"/><path d="M22 14l3 3M25 14l-3 3" stroke="#c5604c" stroke-width="2"/>`),
};

const TIERS = [
  ['bois', 'en bois', '#d9a273'],
  ['cuivre', 'en cuivre', '#e3975a'],
  ['fer', 'en fer', '#9aa6c4'],
  ['cristal', 'de cristal', '#9fdcea'],
];
const TOOLS = { hache: ['Hache', 'axe'], pioche: ['Pioche', 'pick'], pelle: ['Pelle', 'shovel'], canne: ['Canne à pêche', 'rod'], filet: ['Filet', 'net'] };

export const FISH = [
  ['sardine', 'Sardine', '#9cc8ec', 'commun', 'toutes'],
  ['maquereau', 'Maquereau', '#7fb3c2', 'commun', 'toutes'],
  ['dorade', 'Dorade rose', '#f4b6b0', 'commun', 'prairie'],
  ['bar', 'Bar argenté', '#c9d4e0', 'commun', 'pins'],
  ['clown', 'Poisson-clown', '#f39c6b', 'peu commun', 'tropical'],
  ['lune', 'Poisson-lune', '#e8e0f0', 'rare', 'large'],
  ['raie', 'Raie pastel', '#c7b2e6', 'peu commun', 'atoll'],
  ['thon', 'Thon', '#5b7fc4', 'peu commun', 'large'],
  ['saumon', 'Saumon', '#f2a07a', 'peu commun', 'glace'],
  ['ballon', 'Poisson-ballon', '#f6d27a', 'peu commun', 'dunes'],
  ['anguille', 'Anguille des braises', '#8a7a99', 'rare', 'volcan'],
  ['hippocampe', 'Hippocampe lumineux', '#9fdcc8', 'rare', 'champignons'],
];
export const BUGS = [
  ['papillon', 'Papillon citron', '#f6d27a', '#fffaf0', 'commun'],
  ['coccinelle', 'Coccinelle', '#e8705f', '#3d3049', 'commun'],
  ['libellule', 'Libellule', '#9fdcc8', '#c7b2e6', 'peu commun'],
  ['abeille', 'Abeille ronde', '#f6c46d', '#5b4a63', 'commun'],
  ['luciole', 'Luciole', '#e9f5a0', '#5b4a63', 'nuit'],
  ['scarabee', 'Scarabée irisé', '#7fc6a0', '#5b7fc4', 'rare'],
  ['morpho', 'Morpho bleu', '#7fa6e6', '#3d3049', 'rare'],
  ['grillon', 'Grillon', '#a3b392', '#5b4a63', 'nuit'],
  ['papillon_rose', 'Papillon rose', '#f7b6c8', '#fffaf0', 'peu commun'],
  ['phasme', 'Phasme', '#a6d98f', '#5c9e5a', 'rare'],
  ['bernard', 'Bernard-l\'ermite', '#f4a28c', '#e6d4bd', 'commun'],
  ['luciole_bleue', 'Luciole bleue', '#9cc8ec', '#3d3049', 'nuit rare'],
];

export const FLOWER_COLORS = [
  ['rose', 'Fleur rose', '#f7b6c8'],
  ['jaune', 'Fleur jaune', '#f6d27a'],
  ['bleue', 'Fleur bleue', '#9cc8ec'],
  ['blanche', 'Fleur blanche', '#fffaf0'],
  ['mauve', 'Fleur mauve', '#c7b2e6'],
];

export const ITEMS = {};
function def(id, o) {
  ITEMS[id] = { id, stack: 99, sell: 1, ...o };
}

// --- ressources ---
def('bois', { name: 'Bois', cat: 'ressource', icon: SHAPES.log('#c98f5f'), sell: 2 });
def('branche', { name: 'Branche', cat: 'ressource', icon: SHAPES.stick('#d9a273'), sell: 1 });
def('fibre', { name: 'Fibres', cat: 'ressource', icon: SHAPES.tuft('#8fd08a'), sell: 1 });
def('pierre', { name: 'Pierre', cat: 'ressource', icon: SHAPES.rock('#cfc3d4'), sell: 1 });
def('sable', { name: 'Sable', cat: 'ressource', icon: SHAPES.pile('#f6e2b8'), sell: 1 });
def('argile', { name: 'Argile', cat: 'ressource', icon: SHAPES.pile('#e2a68a'), sell: 2 });
def('cuivre', { name: 'Minerai de cuivre', cat: 'ressource', icon: SHAPES.nugget('#e3975a', '#f0b27a'), sell: 4 });
def('fer', { name: 'Minerai de fer', cat: 'ressource', icon: SHAPES.nugget('#9aa6c4', '#c98a6a'), sell: 6 });
def('cristal', { name: 'Cristal', cat: 'ressource', icon: SHAPES.crystal('#bfe4f2'), sell: 12 });
def('obsidienne', { name: 'Obsidienne', cat: 'ressource', icon: SHAPES.crystal('#8a74ad'), sell: 10 });
def('corail', { name: 'Corail', cat: 'ressource', icon: SHAPES.coral('#f4a2a0'), sell: 5 });
def('peche', { name: 'Pêche', cat: 'nourriture', icon: SHAPES.fruit('#f7b48a'), sell: 3 });
def('coco', { name: 'Noix de coco', cat: 'nourriture', icon: SHAPES.coco(), sell: 3 });
def('baie', { name: 'Baies', cat: 'nourriture', icon: SHAPES.berries('#e9786f'), sell: 2 });
def('champignon', { name: 'Champignon', cat: 'nourriture', icon: SHAPES.mushroom('#e9a3c4'), sell: 3 });
def('pousse', { name: 'Pousse d\'arbre', cat: 'graine', icon: SHAPES.tuft('#6cbd98'), sell: 2, plant: true });
def('ble', { name: 'Blé', cat: 'ressource', icon: SHAPES.tuft('#e8d18a'), sell: 2 });
def('graines', { name: 'Graines de tournesol', cat: 'nourriture', icon: SHAPES.berries('#8a6a52'), sell: 1 });
def('potiron', { name: 'Potiron', cat: 'nourriture', icon: SHAPES.fruit('#f39c4a'), sell: 6 });
for (const [k, n, c] of FLOWER_COLORS) def(`fleur_${k}`, { name: n, cat: 'fleur', icon: SHAPES.flower(c), sell: 2, color: c });
for (const [k, n, c, rar, where] of FISH) def(`poisson_${k}`, { name: n, cat: 'poisson', icon: SHAPES.fish(c), sell: rar === 'rare' ? 30 : rar === 'peu commun' ? 12 : 5, rarity: rar, where });
for (const [k, n, c, c2, rar] of BUGS) def(`insecte_${k}`, { name: n, cat: 'insecte', icon: SHAPES.bug(c, c2), sell: rar.includes('rare') ? 25 : rar === 'peu commun' ? 10 : 4, rarity: rar });

// --- matériaux transformés ---
def('planche', { name: 'Planche', cat: 'matériau', icon: SHAPES.plank('#e0b07e'), sell: 3 });
def('corde', { name: 'Corde', cat: 'matériau', icon: SHAPES.rope('#e9d8b4'), sell: 3 });
def('tissu', { name: 'Tissu', cat: 'matériau', icon: SHAPES.cloth('#f6ead2'), sell: 5 });
def('brique', { name: 'Brique', cat: 'matériau', icon: SHAPES.brick('#e2a68a'), sell: 3 });
def('verre', { name: 'Verre', cat: 'matériau', icon: SHAPES.glass(), sell: 4 });
def('lingot_cuivre', { name: 'Lingot de cuivre', cat: 'matériau', icon: SHAPES.ingot('#e3975a'), sell: 10 });
def('lingot_fer', { name: 'Lingot de fer', cat: 'matériau', icon: SHAPES.ingot('#9aa6c4'), sell: 14 });
def('clous', { name: 'Clous', cat: 'matériau', icon: SHAPES.nails('#9aa6c4'), sell: 2 });
def('voile', { name: 'Voile', cat: 'matériau', icon: SHAPES.sail(), sell: 30 });
for (const [k, , c] of FLOWER_COLORS) def(`teinture_${k}`, { name: `Teinture ${k}`, cat: 'teinture', icon: SHAPES.dye(c), sell: 6, color: c });
def('torche', { name: 'Torche', cat: 'objet', icon: SHAPES.torch(), sell: 2 });
def('appat', { name: 'Appât', cat: 'objet', icon: SHAPES.bait(), sell: 2 });
def('confiture', { name: 'Confiture de baies', cat: 'nourriture', icon: SHAPES.jar('#e9786f'), sell: 18 });
def('jus_coco', { name: 'Jus de coco', cat: 'nourriture', icon: SHAPES.jar('#fbf3e6'), sell: 9 });
def('brochette', { name: 'Brochette grillée', cat: 'nourriture', icon: SHAPES.skewer(), sell: 14 });
def('soupe', { name: 'Soupe aux champignons', cat: 'nourriture', icon: SHAPES.jar('#d9b48f'), sell: 12 });
def('carte_tresor', { name: 'Carte au trésor', cat: 'objet', icon: SHAPES.map(), stack: 1, sell: 0 });

// --- outils (4 niveaux, sans usure) ---
TIERS.forEach(([t, label, color], tier) => {
  for (const [k, [name, shape]] of Object.entries(TOOLS)) {
    def(`${k}_${t}`, { name: `${name} ${label}`, cat: 'outil', tool: k, tier: tier + 1, icon: SHAPES[shape](color), stack: 1, sell: [3, 12, 24, 60][tier], color });
  }
});

// --- stations et bateaux (objets « posables ») ---
def('etabli', { name: 'Établi', cat: 'station', station: 'etabli', icon: SHAPES.bench('#c98f5f'), stack: 9, piece: 'etabli' });
def('four', { name: 'Four', cat: 'station', station: 'four', icon: SHAPES.oven(), stack: 9, piece: 'four' });
def('couture', { name: 'Table de couture', cat: 'station', station: 'couture', icon: SHAPES.loom(), stack: 9, piece: 'couture' });
def('chantier', { name: 'Chantier naval', cat: 'station', station: 'chantier', icon: SHAPES.shipyard(), stack: 9, piece: 'chantier' });
def('bateau_barque', { name: 'Barque', cat: 'bateau', boat: 'barque', icon: SHAPES.boat(), stack: 1 });
def('bateau_voilier', { name: 'Voilier', cat: 'bateau', boat: 'voilier', icon: SHAPES.boat(), stack: 1 });
def('bateau_goelette', { name: 'Goélette', cat: 'bateau', boat: 'goelette', icon: SHAPES.boat(), stack: 1 });

export const STATION_NAMES = { main: 'À la main', etabli: 'Établi', four: 'Four', couture: 'Table de couture', chantier: 'Chantier naval' };

export function itemIcon(id) {
  return ITEMS[id]?.icon || SHAPES.piece('#e0b07e');
}
export { SHAPES };
