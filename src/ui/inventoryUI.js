// Barre rapide (8 cases), sac (24 cases) et atelier de fabrication.
import { h, replay } from './dom.js';
import { ICON } from './icons.js';
import { ITEMS, itemIcon, STATION_NAMES } from '../data/items.js';
import RECIPES from '../data/recipes.json';
import { HOTBAR, SLOTS } from '../gameplay/Inventory.js';

export const RECIPE_LIST = RECIPES.recipes;
const CAT_LABEL = { ressource: 'Ressource', nourriture: 'Nourriture', graine: 'Graine', fleur: 'Fleur', poisson: 'Poisson', insecte: 'Insecte', matériau: 'Matériau', teinture: 'Teinture', objet: 'Objet', outil: 'Outil', station: 'Station', bateau: 'Bateau' };

function describe(it) {
  if (!it) return '';
  if (it.tool) return `${CAT_LABEL.outil} de niveau ${it.tier} — ne s'use jamais.`;
  if (it.station) return 'Sélectionne-la dans la barre rapide puis appuie sur E pour la poser.';
  if (it.boat) return 'Un nouveau bateau pour aller plus loin.';
  if (it.plant) return 'Choisis-la dans la barre rapide puis E pour la planter.';
  return `${CAT_LABEL[it.cat] || 'Objet'} · le marchand en donne ${it.sell} coquillage${it.sell > 1 ? 's' : ''}.`;
}

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

// ---------------------------------------------------------------------------
// Sac et atelier
export function openInventoryPanel(game, tab = 'sac') {
  const inv = game.inv;
  let picked = null;
  const tabsEl = h('div', { class: 'tabs' });
  const content = h('div', { class: 'tab-content stack inv-content' });
  const info = h('div', { class: 'inv-info muted' }, 'Clique sur un objet pour le prendre, puis sur une case pour le poser. Maj + clic : partager une pile.');

  const slotEl = (i) => {
    const s = inv.slots[i];
    return h('button', {
      class: `slot big ${picked === i ? 'picked' : ''} ${i < HOTBAR ? 'hot' : ''}`,
      title: s ? ITEMS[s.id].name : 'Vide',
      'aria-label': s ? `${ITEMS[s.id].name}${s.n > 1 ? ` ×${s.n}` : ''}` : 'Case vide',
      onclick: (e) => {
        if (e.shiftKey && s) {
          inv.split(i);
          render();
          return;
        }
        if (picked === null) {
          if (s) {
            picked = i;
            info.textContent = `${ITEMS[s.id].name} — ${describe(ITEMS[s.id])}`;
          }
        } else {
          inv.move(picked, i);
          picked = null;
          info.textContent = 'Rangé !';
          game.audio?.pop(1.2);
        }
        render();
      },
    }, h('span', { class: 'slot-icon', html: s ? itemIcon(s.id) : '' }), s && s.n > 1 ? h('span', { class: 'slot-count' }, String(s.n)) : null, i < HOTBAR ? h('span', { class: 'slot-key' }, String(i + 1)) : null);
  };

  const bag = () => {
    const hot = h('div', { class: 'inv-grid hot' }, ...Array.from({ length: HOTBAR }, (_, i) => slotEl(i)));
    const rest = h('div', { class: 'inv-grid' }, ...Array.from({ length: SLOTS - HOTBAR }, (_, i) => slotEl(i + HOTBAR)));
    return [h('div', { class: 'section-label' }, 'Barre rapide (1 à 8)'), hot, h('div', { class: 'section-label' }, 'Sac'), rest, info];
  };

  const craft = () => {
    const near = game.stationsNear();
    const groups = ['main', 'etabli', 'four', 'couture', 'chantier'];
    const out = [];
    for (const st of groups) {
      const list = RECIPE_LIST.filter((r) => r.station === st);
      const here = st === 'main' || near.has(st);
      out.push(h('div', { class: 'section-label craft-head' }, STATION_NAMES[st], here ? null : h('span', { class: 'craft-away' }, st === 'main' ? '' : ' — approche-toi de cette station')));
      out.push(h('div', { class: 'craft-list' }, ...list.map((r) => {
        const ok = here && inv.canCraft(r);
        const it = ITEMS[r.out];
        const owned = it.boat && game.state.boat.owned.includes(it.boat);
        return h('div', { class: `craft-card ${ok ? 'ok' : ''} ${here ? '' : 'away'}` },
          h('span', { class: 'slot-icon', html: itemIcon(r.out) }),
          h('div', { class: 'craft-txt' },
            h('b', {}, `${it.name}${r.n > 1 ? ` ×${r.n}` : ''}`),
            h('div', { class: 'craft-needs' }, ...Object.entries(r.in).map(([id, n]) => {
              const have = inv.count(id);
              return h('span', { class: `need ${have >= n ? 'have' : ''}`, title: ITEMS[id].name }, h('span', { class: 'need-icon', html: itemIcon(id) }), `${Math.min(have, n)}/${n}`);
            }))),
          h('button', {
            class: 'btn small',
            disabled: !ok || owned ? true : undefined,
            onclick: () => {
              const res = inv.craft(r);
              if (!res.ok) {
                game.ui.toast(res.why === 'plein' ? 'Ton sac est plein.' : 'Il manque des ingrédients.', { icon: 'leaf' });
                return;
              }
              game.onCrafted(r);
              render();
            },
          }, owned ? 'Possédé' : 'Fabriquer'));
      })));
    }
    return out;
  };

  const render = () => {
    tabsEl.replaceChildren(...[['sac', 'Sac'], ['atelier', 'Atelier']].map(([id, label]) => h('button', {
      class: `tab ${tab === id ? 'active' : ''}`,
      onclick: () => {
        tab = id;
        picked = null;
        render();
      },
    }, label)));
    content.replaceChildren(...(tab === 'sac' ? bag() : craft()));
    game.hotbar?.render();
  };
  render();
  const off = () => {
    inv.onChange = () => game.hotbar?.render();
  };
  inv.onChange = () => {
    game.hotbar?.render();
  };
  game.ui.openPanel(h('div', { class: 'stack inv-panel-body' }, tabsEl, content), { title: tab === 'atelier' ? 'Atelier' : 'Sac', icon: 'leaf', className: 'inv-panel', onClose: off });
}
