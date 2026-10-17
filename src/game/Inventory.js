// Inventaire : barre rapide de 8 cases + sac de 24, piles de 99 (outils : 1).
// Module pur (testé par Vitest) : aucune dépendance au rendu.
import { ITEMS } from '../data/items.js';

export const HOTBAR = 8;
export const BAG = 24;
export const SLOTS = HOTBAR + BAG;

const stackOf = (id) => ITEMS[id]?.stack ?? 99;

export class Inventory {
  constructor(slots = null) {
    this.slots = Array.from({ length: SLOTS }, (_, i) => {
      const s = slots?.[i];
      return s && ITEMS[s.id] && s.n > 0 ? { id: s.id, n: Math.min(s.n, stackOf(s.id)) } : null;
    });
    this.onChange = null;
  }

  changed() {
    this.onChange?.();
  }

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.n;
    return n;
  }

  has(needs) {
    return Object.entries(needs).every(([id, n]) => this.count(id) >= n);
  }

  // place libre pour n objets (piles existantes puis cases vides)
  room(id) {
    const max = stackOf(id);
    let r = 0;
    for (const s of this.slots) {
      if (!s) r += max;
      else if (s.id === id) r += max - s.n;
    }
    return r;
  }

  // ajoute n objets ; renvoie ce qui n'a pas trouvé de place
  add(id, n = 1) {
    if (!ITEMS[id] || n <= 0) return n;
    const max = stackOf(id);
    let left = n;
    // compléter les piles existantes (barre d'abord)
    for (const s of this.slots) {
      if (left <= 0) break;
      if (s && s.id === id && s.n < max) {
        const k = Math.min(max - s.n, left);
        s.n += k;
        left -= k;
      }
    }
    for (let i = 0; i < SLOTS && left > 0; i++) {
      if (!this.slots[i]) {
        const k = Math.min(max, left);
        this.slots[i] = { id, n: k };
        left -= k;
      }
    }
    if (left !== n) this.changed();
    return left;
  }

  // retire n objets (tout ou rien) ; le sac d'abord, la barre en dernier
  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    let left = n;
    const order = [...Array(SLOTS).keys()].sort((a, b) => (a < HOTBAR) - (b < HOTBAR) || b - a);
    for (const i of order) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(s.n, left);
      s.n -= k;
      left -= k;
      if (s.n <= 0) this.slots[i] = null;
      if (left <= 0) break;
    }
    this.changed();
    return true;
  }

  removeAll(needs) {
    if (!this.has(needs)) return false;
    for (const [id, n] of Object.entries(needs)) this.remove(id, n);
    return true;
  }

  // échange / fusion de deux cases (glisser-déposer)
  move(from, to) {
    if (from === to) return;
    const a = this.slots[from];
    const b = this.slots[to];
    if (a && b && a.id === b.id && b.n < stackOf(b.id)) {
      const k = Math.min(stackOf(b.id) - b.n, a.n);
      b.n += k;
      a.n -= k;
      if (a.n <= 0) this.slots[from] = null;
    } else {
      this.slots[from] = b;
      this.slots[to] = a;
    }
    this.changed();
  }

  // partage une pile en deux
  split(i) {
    const s = this.slots[i];
    if (!s || s.n < 2) return false;
    const j = this.slots.findIndex((x, k) => !x && k !== i);
    if (j < 0) return false;
    const half = Math.floor(s.n / 2);
    s.n -= half;
    this.slots[j] = { id: s.id, n: half };
    this.changed();
    return true;
  }

  // meilleur outil d'un type (hache, pioche…) : niveau 0 si aucun
  bestTool(kind) {
    let best = null;
    for (const s of this.slots) {
      const it = s && ITEMS[s.id];
      if (it?.tool === kind && (!best || it.tier > best.tier)) best = it;
    }
    return best;
  }

  canCraft(recipe, times = 1) {
    const needs = {};
    for (const [id, n] of Object.entries(recipe.in)) needs[id] = n * times;
    return this.has(needs);
  }

  // fabrique : retire les ingrédients, ajoute le résultat (refuse si le sac est plein)
  craft(recipe, times = 1) {
    if (!this.canCraft(recipe, times)) return { ok: false, why: 'ingredients' };
    const outN = recipe.n * times;
    // Simule la transaction sur un inventaire isolé. Ainsi les callbacks de
    // sauvegarde ne voient jamais un état intermédiaire et aucun ingrédient
    // n'est perdu si le résultat ne peut pas entrer dans le sac.
    const draft = new Inventory(this.slots);
    for (const [id, n] of Object.entries(recipe.in)) draft.remove(id, n * times);
    const left = draft.add(recipe.out, outN);
    if (left > 0) return { ok: false, why: 'plein' };
    this.slots = draft.slots;
    this.changed();
    return { ok: true, left: 0 };
  }

  serialize() {
    return this.slots.map((s) => (s ? { id: s.id, n: s.n } : null));
  }
}
