// Apparence du joueur : palettes, garde-robe, look par défaut et validation
// des données sauvegardées (state.avatar, state.wardrobe).

// Teintes de peau chaudes, de très claire à très foncée (jamais grises)
export const SKINS = ['#fde3cf', '#f6cfae', '#e8b48c', '#c98d63', '#9c6644', '#6e4530'];

export const HAIR_COLORS = ['#3b3340', '#5a3d36', '#8a5a3c', '#c46a3f', '#e0b56a', '#f2a7b8', '#a99be0', '#8fd6c3'];

// Couleurs de tissu : chaque pièce existe dans toutes ces teintes
export const CLOTH_COLORS = ['#e8705f', '#5b7fc4', '#8a5a8f', '#3f8f8a', '#d4574a', '#e0a93b', '#ef9bb5', '#7cc8b0', '#f6ead2', '#4d4766', '#6aa898', '#e07a4f'];
export const CLOTH_NAMES = ['corail', 'denim', 'prune', 'sarcelle', 'brique', 'moutarde', 'rose', 'menthe', 'crème', 'ardoise', 'sauge', 'orange'];

// (les sauvegardes stockent des indices : une couleur nouvelle s'ajoute à la fin, jamais au milieu)
export const SHOE_COLORS = ['#f6ead2', '#e8705f', '#5b7fc4', '#f2c14e', '#d4574a', '#3f8f8a', '#8a5a8f', '#9c6644'];
// brun cuir des bottes de marche (couleur du look par défaut)
const CUIR = SHOE_COLORS.indexOf('#9c6644');

// Une seule coupe : les sauvegardes qui en portent une autre (bol, carré, queue, macarons, boucles,
// longs) retombent sur elle (sanitizeAvatar).
export const HAIRS = { pics: 'En pics' };

export const EYES = { ovale: 'Ovales', rond: 'Ronds', amande: 'En amande' };

// Garde-robe. La salopette se range avec les bas (elle se porte sur un haut) ;
// la robe remplace le bas tant qu'elle est portée.
export const PIECES = {
  tshirt: { slot: 'top', name: 'T-shirt', price: 8 },
  pull: { slot: 'top', name: 'Pull rayé', price: 0 },
  gilet: { slot: 'top', name: 'Gilet', price: 14 },
  robe: { slot: 'top', name: 'Robe trapèze', price: 18 },
  short: { slot: 'bottom', name: 'Short', price: 8 },
  jupe: { slot: 'bottom', name: 'Jupe', price: 10 },
  pantalon: { slot: 'bottom', name: 'Pantalon roulé', price: 12 },
  salopette: { slot: 'bottom', name: 'Salopette', price: 0 },
  baskets: { slot: 'shoes', name: 'Baskets rondes', price: 0 },
  bottes: { slot: 'shoes', name: 'Bottes de pluie', price: 12 },
  sandales: { slot: 'shoes', name: 'Sandales', price: 8 },
  marche: { slot: 'shoes', name: 'Bottes de marche', price: 0 },
  echarpe: { slot: 'accessory', name: 'Écharpe sauge', price: 0 },
  bob: { slot: 'accessory', name: 'Bob', price: 10 },
  barrette: { slot: 'accessory', name: 'Barrette', price: 6 },
  lunettes: { slot: 'accessory', name: 'Lunettes rondes', price: 10 },
  sac: { slot: 'back', name: 'Sac à dos', price: 14 },
};

export const SLOT_NAMES = { top: 'Haut', bottom: 'Bas', shoes: 'Chaussures', accessory: 'Accessoire', back: 'Dos' };

export const piecesOf = (slot) => Object.keys(PIECES).filter((k) => PIECES[k].slot === slot);

// Pièces offertes : celles du look par défaut, plus les baskets rondes (chaussures de départ avant le
// personnage 2.0 : une ancienne sauvegarde qui les porte les garde, et elles restent hors de la boutique)
export const STARTER = ['pull', 'salopette', 'marche', 'echarpe', 'sac', 'baskets'];

export function defaultAvatar() {
  return {
    v: 1,
    skin: 1,
    hair: 'pics',
    hairColor: 1,
    eyes: 'ovale',
    top: 'pull',
    topColor: 0,
    bottom: 'salopette',
    bottomColor: 1,
    shoes: 'marche',
    shoesColor: CUIR,
    accessory: 'echarpe',
    accessoryColor: 10, // sauge (fin de CLOTH_COLORS)
    // dos : le sac des planches, porté avec l'écharpe
    back: 'sac',
    backColor: 11, // orange
  };
}

const index = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
const pick = (v, list, d) => (list.includes(v) ? v : d);

// Remplace toute valeur inconnue par celle du look par défaut
export function sanitizeAvatar(raw) {
  const d = defaultAvatar();
  if (!raw || typeof raw !== 'object') return d;
  const oldSac = raw.accessory === 'sac';
  return {
    v: 1,
    skin: index(raw.skin, SKINS.length, d.skin),
    hair: pick(raw.hair, Object.keys(HAIRS), d.hair),
    hairColor: index(raw.hairColor, HAIR_COLORS.length, d.hairColor),
    eyes: pick(raw.eyes, Object.keys(EYES), d.eyes),
    top: pick(raw.top, piecesOf('top'), d.top),
    topColor: index(raw.topColor, CLOTH_COLORS.length, d.topColor),
    bottom: pick(raw.bottom, piecesOf('bottom'), d.bottom),
    bottomColor: index(raw.bottomColor, CLOTH_COLORS.length, d.bottomColor),
    shoes: pick(raw.shoes, piecesOf('shoes'), d.shoes),
    shoesColor: index(raw.shoesColor, SHOE_COLORS.length, d.shoesColor),
    // le sac se portait en accessoire avant l'emplacement « dos » : une ancienne sauvegarde qui le porte le
    // retrouve au dos (avec sa couleur), sans accessoire ; une ancienne sauvegarde sans sac n'en reçoit pas
    accessory: raw.accessory === null || oldSac ? null : pick(raw.accessory, piecesOf('accessory'), d.accessory),
    accessoryColor: index(raw.accessoryColor, CLOTH_COLORS.length, d.accessoryColor),
    back: raw.back === undefined ? (oldSac ? 'sac' : null) : raw.back === null ? null : pick(raw.back, piecesOf('back'), d.back),
    backColor: index(raw.back === undefined && oldSac ? raw.accessoryColor : raw.backColor, CLOTH_COLORS.length, d.backColor),
  };
}

// Garde-robe possédée : pièces de départ + achats + ce que porte l'avatar
export function sanitizeWardrobe(raw, avatar) {
  const owned = new Set(STARTER);
  if (Array.isArray(raw)) for (const k of raw) if (PIECES[k]) owned.add(k);
  for (const k of [avatar.top, avatar.bottom, avatar.shoes, avatar.accessory, avatar.back]) if (k && PIECES[k]) owned.add(k);
  return [...owned];
}
