import { describe, expect, it } from 'vitest';
import { ITEMS, STATION_NAMES } from '../src/data/items.js';
import RECIPES from '../src/data/recipes.json';
import { Inventory } from '../src/gameplay/Inventory.js';
import {
  GROUPS, CAT_ORDER, groupOf, entries, pageCount, pageOf, clampCursor, moveCursor, nextSort,
  rarityStars, badgeOf, actionsFor, itemSheet, nextTab, recipesOf,
} from '../src/ui/inventoryLogic.js';

const slots = (...list) => Array.from({ length: 32 }, (_, i) => list[i] || null);

describe('inventaire plein écran : catégories', () => {
  it('chaque catégorie des objets tombe dans un seul onglet', () => {
    const cats = new Set(Object.values(ITEMS).map((it) => it.cat));
    for (const c of cats) {
      expect(CAT_ORDER).toContain(c);
      expect(GROUPS.filter((g) => g.cats?.includes(c))).toHaveLength(1);
    }
    expect(GROUPS.length).toBeGreaterThanOrEqual(6);
    expect(GROUPS.length).toBeLessThanOrEqual(8);
    expect(groupOf('poisson')).toBe('faune');
    expect(groupOf('teinture')).toBe('artisanat');
  });

  it('filtre par onglet et marque les objets de la barre rapide', () => {
    const s = slots({ id: 'bois', n: 5 }, { id: 'poisson_thon', n: 1 }, null, null, null, null, null, null, { id: 'pierre', n: 9 });
    const res = entries(s, ITEMS, 'ressources');
    expect(res.map((e) => e.id)).toEqual(['bois', 'pierre']);
    expect(res.find((e) => e.id === 'bois').hot).toBe(true);
    expect(res.find((e) => e.id === 'pierre').hot).toBe(false);
    expect(entries(s, ITEMS, 'faune').map((e) => e.slot)).toEqual([1]);
    expect(entries(s, ITEMS, 'chantier')).toEqual([]);
  });
});

describe('inventaire plein écran : tri', () => {
  const s = slots({ id: 'pierre', n: 3 }, { id: 'hache_fer', n: 1 }, { id: 'bois', n: 40 }, { id: 'argile', n: 3 }, { id: 'hache_bois', n: 1 });
  it('par catégorie : outils d\'abord, par niveau, puis par nom', () => {
    expect(entries(s, ITEMS, 'tout', 'categorie').map((e) => e.id)).toEqual(['hache_bois', 'hache_fer', 'argile', 'bois', 'pierre']);
  });
  it('par nombre : les grosses piles d\'abord, à égalité par nom', () => {
    expect(entries(s, ITEMS, 'tout', 'nombre').map((e) => e.id)).toEqual(['bois', 'argile', 'pierre', 'hache_bois', 'hache_fer']);
  });
  it('par nom : ordre alphabétique français', () => {
    expect(entries(s, ITEMS, 'tout', 'nom').map((e) => ITEMS[e.id].name)).toEqual(['Argile', 'Bois', 'Hache en bois', 'Hache en fer', 'Pierre']);
  });
  it('le tri tourne en boucle', () => {
    expect(nextSort('categorie')).toBe('nombre');
    expect(nextSort('nom')).toBe('categorie');
    expect(nextSort('categorie', -1)).toBe('nom');
  });
});

describe('inventaire plein écran : pagination et grille', () => {
  it('pages de 20 cases', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(21)).toBe(2);
    expect(pageOf([...Array(32).keys()], 1)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
  });

  it('se déplace dans une page sans sortir des cases occupées', () => {
    expect(moveCursor({ page: 0, cell: 0 }, [1, 0], 20)).toEqual({ page: 0, cell: 1 });
    expect(moveCursor({ page: 0, cell: 0 }, [0, 1], 20)).toEqual({ page: 0, cell: 5 });
    expect(moveCursor({ page: 0, cell: 0 }, [0, -1], 20)).toEqual({ page: 0, cell: 0 });
    expect(moveCursor({ page: 0, cell: 0 }, [-1, 0], 20)).toEqual({ page: 0, cell: 0 });
    // 7 objets : la case 3 descend sur la dernière (6)
    expect(moveCursor({ page: 0, cell: 3 }, [0, 1], 7)).toEqual({ page: 0, cell: 6 });
    expect(moveCursor({ page: 0, cell: 6 }, [1, 0], 7)).toEqual({ page: 0, cell: 6 });
  });

  it('passe à la page voisine par les bords', () => {
    // 32 objets : la page 2 en a 12 (lignes 0 à 2)
    expect(moveCursor({ page: 0, cell: 4 }, [1, 0], 32)).toEqual({ page: 1, cell: 0 });
    // depuis la 4e ligne : première case de la dernière ligne de la page 2
    expect(moveCursor({ page: 0, cell: 19 }, [1, 0], 32)).toEqual({ page: 1, cell: 10 });
    expect(moveCursor({ page: 1, cell: 10 }, [-1, 0], 32)).toEqual({ page: 0, cell: 14 });
    expect(moveCursor({ page: 1, cell: 11 }, [1, 0], 32)).toEqual({ page: 1, cell: 11 });
  });

  it('garde un curseur valide quand la liste rétrécit', () => {
    expect(clampCursor({ page: 1, cell: 9 }, 22)).toEqual({ page: 1, cell: 1 });
    expect(clampCursor({ page: 1, cell: 9 }, 5)).toEqual({ page: 0, cell: 4 });
    expect(clampCursor({ page: 0, cell: 3 }, 0)).toEqual({ page: 0, cell: 0 });
  });
});

describe('inventaire plein écran : sac', () => {
  it('jette une case et trouve les cases libres', () => {
    const inv = new Inventory(slots({ id: 'bois', n: 5 }, { id: 'pierre', n: 2 }));
    expect(inv.freeSlot(0, 8)).toBe(2);
    expect(inv.freeSlot(8)).toBe(8);
    expect(inv.discard(0)).toBe(true);
    expect(inv.count('bois')).toBe(0);
    expect(inv.discard(0)).toBe(false);
    expect(inv.freeSlot(0, 8)).toBe(0);
  });
});

describe('inventaire plein écran : fiches et actions', () => {
  it('étoiles de rareté d\'après les données', () => {
    expect(rarityStars('commun').stars).toBe(1);
    expect(rarityStars('peu commun').stars).toBe(2);
    expect(rarityStars('rare').stars).toBe(3);
    expect(rarityStars('nuit rare')).toMatchObject({ stars: 3, night: true });
    expect(rarityStars(undefined)).toBe(null);
  });

  it('pastilles : niveau d\'outil, créature rare ou de nuit', () => {
    expect(badgeOf(ITEMS.pioche_cristal)).toMatchObject({ kind: 'tier', text: 'IV' });
    expect(badgeOf(ITEMS.poisson_lune)).toMatchObject({ kind: 'rare' });
    expect(badgeOf(ITEMS.insecte_luciole)).toMatchObject({ kind: 'night' });
    expect(badgeOf(ITEMS.bois)).toBe(null);
  });

  it('propose seulement les actions que le jeu sait faire', () => {
    const ids = (e) => actionsFor(e).map((a) => a.id);
    expect(ids({ hot: false, n: 1, item: ITEMS.etabli })).toEqual(['barre', 'poser', 'jeter', 'annuler']);
    expect(ids({ hot: true, n: 4, item: ITEMS.pousse })).toEqual(['retirer', 'planter', 'diviser', 'jeter', 'annuler']);
    expect(ids({ hot: false, n: 1, item: ITEMS.bateau_barque })).not.toContain('jeter');
    expect(ids({ hot: false, n: 1, item: ITEMS.peche })).not.toContain('manger');
  });

  it('compose la fiche à partir des recettes', () => {
    const f = itemSheet('planche', ITEMS, RECIPES.recipes, STATION_NAMES, 12);
    expect(f.name).toBe('Planche');
    expect(f.stats.find((s) => s.k === 'total').value).toBe('12');
    expect(f.text).toMatch(/Se fabrique/);
    expect(f.text).toMatch(/Sert à fabriquer/);
    expect(itemSheet('hache_fer', ITEMS, RECIPES.recipes, STATION_NAMES).stats.find((s) => s.k === 'niveau').value).toBe('3 sur 4');
    expect(itemSheet('inconnu', ITEMS)).toBe(null);
  });

  it('onglets du haut bornés et recettes faisables d\'abord', () => {
    expect(nextTab('inventaire', 1)).toBe('atelier');
    expect(nextTab('carnet', -1)).toBe('carnet');
    const list = recipesOf(RECIPES.recipes, 'main', (r) => r.out === 'torche');
    expect(list[0].out).toBe('torche');
    expect(list.every((r) => r.station === 'main')).toBe(true);
  });
});
