// Les 8 biomes de l'archipel : palette pastel, relief, végétation, ressources,
// rareté selon la distance à l'île de départ et affinité climatique.
// Module pur (Worker, jeu, tests).

// densités : éléments pour 100 m² de terrain favorable
export const BIOMES = {
  prairie: {
    name: 'Prairie fleurie', style: 'rolling', hmax: 11, beach: 0.11,
    pal: { sand: '#f6e7cc', wet: '#e2cca4', grass: ['#a9ddae', '#93d2a0'], accent: '#c9e59c', rock: '#d6cbbd', cliff: '#e5c7a4', floor: '#d3ead9' },
    veg: [['arbre_pompon', 0.7], ['arbre_fruitier', 0.28], ['arbre_cerisier', 0.22], ['arbuste', 0.7], ['buisson_baies', 0.35], ['rocher', 0.3], ['fleurs', 5.5], ['herbe', 12], ['souche', 0.06], ['filon_cuivre', 0.05]],
    flowers: ['#f7b6c8', '#fffaf0', '#f6d27a', '#c7b2e6', '#f4a28c'],
    structures: ['ruines', 'cabane'],
  },
  pins: {
    name: 'Forêt de pins', style: 'plateau', hmax: 21, beach: 0.08,
    pal: { sand: '#ebe0ca', wet: '#d8c8a8', grass: ['#8fcb9c', '#79bc90'], accent: '#a9d4a0', rock: '#c9c4cb', cliff: '#d9b69c', floor: '#c8e2d6' },
    veg: [['pin', 2.4], ['arbuste', 0.35], ['rocher_mousse', 0.55], ['rocher', 0.35], ['fougere', 1.4], ['champi_petit', 0.35], ['herbe', 8], ['fleurs', 1.1], ['filon_cuivre', 0.18], ['filon_fer', 0.07]],
    flowers: ['#fffaf0', '#c7b2e6', '#9cc8ec'],
    structures: ['cabane', 'phare'],
  },
  tropical: {
    name: 'Île tropicale', style: 'tropical', hmax: 14, beach: 0.17,
    pal: { sand: '#fcf0d7', wet: '#eed8ae', grass: ['#9fe0a6', '#80d39b'], accent: '#d4ed9b', rock: '#d9c7b1', cliff: '#e9c29e', floor: '#c2f0e2' },
    veg: [['palmier', 1.1], ['arbuste', 0.8], ['buisson_baies', 0.28], ['fougere', 0.7], ['rocher', 0.22], ['fleurs', 2.8], ['herbe', 8], ['filon_cuivre', 0.05]],
    flowers: ['#f4a28c', '#f6d27a', '#ef9bb5', '#fffaf0'],
    structures: ['temple', 'epave'],
  },
  dunes: {
    name: 'Dunes', style: 'dunes', hmax: 12, beach: 0.2,
    pal: { sand: '#f5dab8', wet: '#e9c59c', grass: ['#d9d79c', '#c8cf90'], accent: '#e8dca6', rock: '#e2b998', cliff: '#eabb9c', floor: '#d9eedf' },
    veg: [['cactus', 0.45], ['bois_mort', 0.18], ['rocher', 0.45], ['herbe', 2.6], ['filon_cuivre', 0.22], ['fleurs', 0.4]],
    flowers: ['#f4a28c', '#f6d27a'],
    structures: ['ruines', 'temple'],
  },
  volcan: {
    name: 'Île volcanique', style: 'cone', hmax: 34, beach: 0.07,
    pal: { sand: '#d1c6ca', wet: '#bbb1b9', grass: ['#b3c79f', '#a0b693'], accent: '#c2cfa2', rock: '#a395a6', cliff: '#ab9aa6', peak: '#8f8499', floor: '#c6dcd6' },
    veg: [['rocher', 1.1], ['fougere', 0.55], ['arbuste', 0.18], ['obsidienne', 0.28], ['filon_fer', 0.22], ['herbe', 3]],
    flowers: ['#f4a28c', '#fffaf0'],
    structures: ['grotte', 'ruines'],
  },
  glace: {
    name: 'Île glaciaire', style: 'ice', hmax: 22, beach: 0.08,
    pal: { sand: '#e9eff3', wet: '#d0dce5', grass: ['#d4e7e3', '#c0dad8'], accent: '#e2efee', rock: '#bcc8d8', cliff: '#c9d8e8', snow: '#f7fbff', floor: '#cfe5ea' },
    veg: [['pin_givre', 1.1], ['rocher', 0.55], ['cristal', 0.38], ['filon_fer', 0.1], ['herbe', 1.6]],
    flowers: ['#9cc8ec', '#fffaf0'],
    structures: ['phare', 'cabane'],
  },
  champignons: {
    name: 'Bois de champignons', style: 'mushroom', hmax: 12, beach: 0.09,
    pal: { sand: '#ecdcf0', wet: '#d9c5e1', grass: ['#bba8da', '#a795cd'], accent: '#d3c0ea', rock: '#c9bdd7', cliff: '#d6b9d8', floor: '#d7d9ee' },
    veg: [['champi_geant', 0.9], ['champi_petit', 1.4], ['fougere', 0.55], ['fleurs', 1.8], ['herbe', 7], ['cristal', 0.1]],
    flowers: ['#f7b6c8', '#9fdcc8', '#f6d27a'],
    structures: ['ruines'],
  },
  atoll: {
    name: 'Atoll corallien', style: 'atoll', hmax: 4, beach: 0.3,
    pal: { sand: '#fff4dd', wet: '#f2ddb6', grass: ['#a7e3b1', '#90d8a6'], accent: '#c9ecaa', rock: '#e8d5c1', cliff: '#ead2bc', floor: '#bfeee3' },
    veg: [['palmier', 1.0], ['arbuste', 0.28], ['corail', 1.8], ['rocher', 0.12], ['fleurs', 0.9], ['herbe', 4]],
    flowers: ['#f4a28c', '#f7b6c8'],
    structures: ['epave', 'grotte'],
  },
};
