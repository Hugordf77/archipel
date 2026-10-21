// Inventaire plein écran : logique pure (aucun DOM), testée par Vitest.
// Regroupement des catégories, tri, pagination, déplacement dans la grille,
// actions proposées et fiche d'un objet, d'après les données existantes.

export const COLS = 5;
export const ROWS = 4;
export const PER_PAGE = COLS * ROWS;

// Huit onglets lisibles, tirés du champ `cat` des objets (« tout » en premier)
export const GROUPS = [
  { id: 'tout', label: 'Tout', cats: null, shape: 'chest' },
  { id: 'ressources', label: 'Ressources', cats: ['ressource'], shape: 'log' },
  { id: 'jardin', label: 'Jardin', cats: ['fleur', 'graine'], shape: 'flower' },
  { id: 'nourriture', label: 'Nourriture', cats: ['nourriture'], shape: 'fruit' },
  { id: 'faune', label: 'Faune', cats: ['poisson', 'insecte'], shape: 'fish' },
  { id: 'artisanat', label: 'Artisanat', cats: ['matériau', 'teinture'], shape: 'cloth' },
  { id: 'outils', label: 'Outils', cats: ['outil', 'objet'], shape: 'axe' },
  { id: 'chantier', label: 'Chantier', cats: ['station', 'bateau'], shape: 'boat' },
];

// ordre des catégories pour le tri « par catégorie »
export const CAT_ORDER = ['outil', 'objet', 'ressource', 'matériau', 'teinture', 'nourriture', 'graine', 'fleur', 'poisson', 'insecte', 'station', 'bateau'];
export const CAT_LABEL = { ressource: 'Ressource', nourriture: 'Nourriture', graine: 'Graine', fleur: 'Fleur', poisson: 'Poisson', insecte: 'Insecte', matériau: 'Matériau', teinture: 'Teinture', objet: 'Objet', outil: 'Outil', station: 'Station', bateau: 'Bateau' };

export const SORTS = [
  { id: 'categorie', label: 'Par catégorie' },
  { id: 'nombre', label: 'Par nombre' },
  { id: 'nom', label: 'Par nom' },
];

export function groupOf(cat) {
  return GROUPS.find((g) => g.cats?.includes(cat))?.id || 'outils';
}

export function nextSort(id, d = 1) {
  const i = Math.max(0, SORTS.findIndex((s) => s.id === id));
  return SORTS[(((i + d) % SORTS.length) + SORTS.length) % SORTS.length].id;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const byName = (a, b) => collator.compare(a, b);

// Piles du sac (barre rapide comprise) visibles dans un onglet, triées.
// slots : [{ id, n } | null] ; items : table ITEMS ; hotbar : nombre de cases de la barre
export function entries(slots, items, groupId = 'tout', sort = 'categorie', hotbar = 8) {
  const g = GROUPS.find((x) => x.id === groupId) || GROUPS[0];
  const list = [];
  slots.forEach((s, slot) => {
    const it = s && items[s.id];
    if (!it) return;
    if (g.cats && !g.cats.includes(it.cat)) return;
    list.push({ slot, id: s.id, n: s.n, hot: slot < hotbar, item: it });
  });
  const cat = (e) => {
    const i = CAT_ORDER.indexOf(e.item.cat);
    return i < 0 ? CAT_ORDER.length : i;
  };
  const cmp = {
    categorie: (a, b) => cat(a) - cat(b) || (a.item.tier || 0) - (b.item.tier || 0) || byName(a.item.name, b.item.name) || a.slot - b.slot,
    nombre: (a, b) => b.n - a.n || byName(a.item.name, b.item.name) || a.slot - b.slot,
    nom: (a, b) => byName(a.item.name, b.item.name) || b.n - a.n || a.slot - b.slot,
  }[sort] || ((a, b) => a.slot - b.slot);
  return list.sort(cmp);
}

export function pageCount(total, per = PER_PAGE) {
  return Math.max(1, Math.ceil(total / per));
}

export function pageOf(list, page, per = PER_PAGE) {
  return list.slice(page * per, page * per + per);
}

// Garde un curseur valide après un changement de liste (tri, objet jeté…)
export function clampCursor(cursor, total, per = PER_PAGE) {
  const page = Math.min(Math.max(0, cursor.page), pageCount(total, per) - 1);
  const onPage = Math.max(1, Math.min(per, total - page * per));
  return { page, cell: Math.min(Math.max(0, cursor.cell), onPage - 1) };
}

// Déplacement dans la grille, comme des pages posées côte à côte : au bord gauche ou
// droit on passe à la page voisine (même ligne) ; haut et bas restent dans la page.
// Les cases vides en fin de liste ne se sélectionnent pas.
export function moveCursor(cursor, dir, total, cols = COLS, rows = ROWS) {
  const per = cols * rows;
  if (total <= 0) return { page: 0, cell: 0 };
  const pages = pageCount(total, per);
  const { page, cell } = clampCursor(cursor, total, per);
  const onPage = (p) => Math.min(per, total - p * per);
  const col = cell % cols;
  const row = Math.floor(cell / cols);
  const [dx, dy] = dir;
  if (dx) {
    const c = col + dx;
    if (c >= 0 && c < cols) {
      const idx = row * cols + c;
      if (idx < onPage(page)) return { page, cell: idx };
      // au bout d'une ligne incomplète, la droite mène à la page suivante
      if (dx < 0) return { page, cell };
    }
    const np = page + dx;
    if (np < 0 || np >= pages) return { page, cell };
    // la page voisine peut être plus courte : on se cale sur sa dernière case
    const n = onPage(np);
    const r = Math.min(row, Math.floor((n - 1) / cols));
    return { page: np, cell: Math.min(r * cols + (dx > 0 ? 0 : cols - 1), n - 1) };
  }
  if (dy) {
    const r = row + dy;
    if (r < 0 || r >= rows) return { page, cell };
    const idx = r * cols + col;
    if (idx < onPage(page)) return { page, cell: idx };
    // vers le bas, sous une ligne incomplète : la dernière case
    if (dy > 0 && r <= Math.floor((onPage(page) - 1) / cols)) return { page, cell: onPage(page) - 1 };
  }
  return { page, cell };
}

// Rareté déjà présente dans les données (poissons, insectes) → étoiles et mention
export function rarityStars(rarity) {
  if (!rarity) return null;
  const r = String(rarity);
  const stars = r.includes('peu') ? 2 : r.includes('rare') ? 3 : r.includes('nuit') ? 2 : 1;
  return { stars, night: r.includes('nuit'), label: r };
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'];
// Pastille en haut à gauche d'une case : niveau d'outil, ou rareté d'une créature
export function badgeOf(item) {
  if (!item) return null;
  if (item.tool) return { kind: 'tier', text: ROMAN[item.tier] || String(item.tier), title: `Niveau ${item.tier}` };
  const r = rarityStars(item.rarity);
  if (r && r.stars >= 3) return { kind: 'rare', text: '★', title: 'Rare' };
  if (r?.night) return { kind: 'night', text: '☾', title: 'De nuit' };
  return null;
}

// Actions du menu (✕ / Entrée / clic). Aucune règle nouvelle : on ne propose que ce
// que le jeu sait déjà faire (pas de « manger » : il n'y a ni faim ni santé).
export function actionsFor(entry) {
  if (!entry) return [];
  const it = entry.item;
  const out = [];
  if (entry.hot) out.push({ id: 'retirer', label: 'Ranger dans le sac' });
  else out.push({ id: 'barre', label: 'Mettre dans la barre rapide' });
  if (it.station) out.push({ id: 'poser', label: 'Poser' });
  if (it.plant) out.push({ id: 'planter', label: 'Planter' });
  if (it.tool) out.push({ id: 'tenir', label: 'Prendre en main' });
  if (entry.n > 1) out.push({ id: 'diviser', label: 'Partager la pile' });
  if (!it.boat) out.push({ id: 'jeter', label: entry.n > 1 ? 'Jeter la pile' : 'Jeter' });
  out.push({ id: 'annuler', label: 'Annuler' });
  return out;
}

// Fiche d'un objet : caractéristiques et texte, composés à partir des données et des recettes
export function itemSheet(id, items, recipes = [], stationNames = {}, total = 0) {
  const it = items[id];
  if (!it) return null;
  const stats = [];
  if (it.sell > 0) stats.push({ k: 'prix', label: 'Prix', value: `${it.sell} coquillage${it.sell > 1 ? 's' : ''}` });
  if (it.tool) stats.push({ k: 'niveau', label: 'Niveau', value: `${it.tier} sur 4` });
  if (total > 0) stats.push({ k: 'total', label: 'En tout', value: String(total) });
  if (it.stack > 1) stats.push({ k: 'pile', label: 'Pile', value: `${it.stack} max.` });
  const made = recipes.find((r) => r.out === id);
  const uses = [...new Set(recipes.filter((r) => r.in?.[id]).map((r) => items[r.out]?.name).filter(Boolean))];
  const lines = [];
  if (it.tool) lines.push('Un outil solide : il ne s\'use jamais.');
  if (it.station) lines.push('Une station de fabrication à poser près de chez toi.');
  if (it.boat) lines.push('Un nouveau bateau pour aller plus loin.');
  if (it.plant) lines.push('À planter dans la terre : elle deviendra un arbre.');
  if (it.where === 'toutes') lines.push('Se pêche autour de toutes les îles.');
  else if (it.where) lines.push(`Se pêche du côté de l'île « ${it.where} ».`);
  if (made) lines.push(`Se fabrique : ${stationNames[made.station] || made.station}.`);
  if (uses.length) lines.push(`Sert à fabriquer : ${uses.slice(0, 4).join(', ')}${uses.length > 4 ? '…' : ''}.`);
  if (!lines.length) lines.push(it.sell > 0 ? 'Le marchand le reprend volontiers.' : 'Un objet précieux à garder.');
  return { name: it.name, cat: CAT_LABEL[it.cat] || 'Objet', rarity: rarityStars(it.rarity), stats, text: lines.join(' ') };
}

// Onglets du haut (L1 / R1) : Carnet et Réglages ouvrent les panneaux existants
export const TABS = [
  { id: 'carnet', label: 'Carnet' },
  { id: 'inventaire', label: 'Inventaire' },
  { id: 'atelier', label: 'Atelier' },
  { id: 'reglages', label: 'Réglages' },
];

export function nextTab(id, d) {
  const i = TABS.findIndex((t) => t.id === id);
  return TABS[Math.min(TABS.length - 1, Math.max(0, i + d))].id;
}

// Atelier : stations comme catégories, recettes faisables d'abord
export const STATIONS = ['main', 'etabli', 'four', 'couture', 'chantier'];

export function recipesOf(recipes, station, canCraft = () => true) {
  return recipes
    .filter((r) => r.station === station)
    .map((r, i) => ({ r, i, ok: canCraft(r) }))
    .sort((a, b) => b.ok - a.ok || a.i - b.i)
    .map((x) => x.r);
}
