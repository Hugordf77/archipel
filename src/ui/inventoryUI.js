// Barre rapide (8 cases) ; le sac et l'atelier vivent dans l'écran plein écran (inventoryScreen.js).
import { h, replay } from './dom.js';
import { ITEMS, itemIcon } from '../data/items.js';
import RECIPES from '../data/recipes.json';
import { HOTBAR } from '../gameplay/Inventory.js';

export const RECIPE_LIST = RECIPES.recipes;

// ---------------------------------------------------------------------------
// Barre rapide (HUD)
export class Hotbar {
  constructor(game) {
    this.game = game;
    this.cells = [];
    this.el = h('div', { class: 'hud hotbar', role: 'toolbar', 'aria-label': 'Barre rapide' });
    for (let i = 0; i < HOTBAR; i++) {
      const icon = h('span', { class: 'slot-icon' });
      const count = h('span', { class: 'slot-count' });
      const cell = h('button', {
        class: 'slot',
        'aria-label': `Case ${i + 1}`,
        onclick: (e) => {
          e.stopPropagation();
          this.select(i);
        },
      }, icon, count, h('span', { class: 'slot-key' }, String(i + 1)));
      this.cells.push({ cell, icon, count });
      this.el.append(cell);
    }
    this.label = h('div', { class: 'hotbar-label' });
    this.el.append(this.label);
    game.uiRoot.append(this.el);
    this.render();
  }

  select(i) {
    const st = this.game.state;
    st.sel = i;
    this.render();
    this.game.gather?.refreshHeld();
    const s = this.game.inv.slots[i];
    this.flashLabel(s ? ITEMS[s.id].name : '');
    this.game.audio?.pop(1.4);
  }

  flashLabel(text) {
    this.label.textContent = text;
    this.label.classList.toggle('show', !!text);
    clearTimeout(this.labelT);
    this.labelT = setTimeout(() => this.label.classList.remove('show'), 1500);
  }

  render() {
    const inv = this.game.inv;
    const sel = this.game.state.sel || 0;
    this.cells.forEach(({ cell, icon, count }, i) => {
      const s = inv.slots[i];
      const key = s ? `${s.id}:${s.n}` : '';
      cell.classList.toggle('selected', i === sel);
      if (cell.dataset.key === key) return;
      cell.dataset.key = key;
      icon.innerHTML = s ? itemIcon(s.id) : '';
      count.textContent = s && s.n > 1 ? String(s.n) : '';
      cell.title = s ? ITEMS[s.id].name : 'Vide';
      cell.setAttribute('aria-label', s ? `Case ${i + 1} : ${ITEMS[s.id].name}${s.n > 1 ? ` ×${s.n}` : ''}` : `Case ${i + 1} : vide`);
    });
  }

  bump(i) {
    replay(this.cells[i].cell, 'squish');
  }
}
