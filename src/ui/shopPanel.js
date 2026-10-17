import { h } from './dom.js';
import { ICON, pieceIcon } from './icons.js';
import { CATALOG, CATALOG_ORDER } from '../gameplay/decor.js';
import { PIECES, STARTER, CLOTH_COLORS, SLOT_NAMES } from '../entities/character/avatar.js';
import { ACC_COLORS } from './mirrorPanel.js';

// L'échoppe : décorations et garde-robe, payées en coquillages.

const shellIcon = () => h('span', { class: 'icon', html: ICON.shell });

export function openShopPanel(game, tab = 'decor') {
  const st = game.state;
  const balance = h('span', { class: 'balance' });
  const grid = h('div', { class: 'shop-grid' });
  const inv = h('div', { class: 'inv-grid' });
  const tabsEl = h('div', { class: 'tabs' });
  const decorView = h('div', { class: 'stack' });
  const wardrobeGrid = h('div', { class: 'shop-grid wardrobe-grid' });
  const wardrobeView = h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Des vêtements cousus sur l\'île. Une fois achetée, une pièce s\'essaie au miroir, dans toutes ses couleurs.'),
    wardrobeGrid);
  const renderWardrobe = () => {
    const owned = new Set(st.wardrobe);
    const pieces = Object.keys(PIECES).filter((k) => !STARTER.includes(k));
    wardrobeGrid.replaceChildren(...pieces.map((k, i) => {
      const it = PIECES[k];
      const has = owned.has(k);
      const color = it.slot === 'accessory' ? ACC_COLORS[k] : CLOTH_COLORS[(i * 3) % CLOTH_COLORS.length];
      const mirrorTab = it.slot === 'accessory' ? 'accessoires' : 'tenue';
      return h('div', { class: 'shop-item' },
        h('div', { class: 'thumb piece', html: pieceIcon(k, color) }),
        h('div', { class: 'shop-name' }, it.name),
        h('div', { class: 'muted shop-desc' }, SLOT_NAMES[it.slot]),
        h('div', { class: 'row spread' },
          has ? h('span', { class: 'muted' }, 'Dans ta garde-robe') : h('span', { class: 'price' }, shellIcon(), String(it.price)),
          has
            ? h('button', { class: 'btn small', onclick: () => game.openMirror({ tab: mirrorTab }) }, 'Essayer')
            : h('button', {
              class: 'btn small primary', disabled: st.shells >= it.price ? undefined : true,
              onclick: () => {
                if (st.shells < it.price || owned.has(k)) return;
                game.addShells(-it.price, 'achat');
                st.wardrobe.push(k);
                game.markDirty();
                game.audio?.pop(1.2);
                game.ui.toast(`${it.name} rangé dans ta garde-robe. Essaie-le au miroir !`, { icon: 'hanger' });
                render();
              },
            }, 'Acheter')));
    }));
  };
  const render = () => {
    balance.replaceChildren(shellIcon(), h('b', {}, String(st.shells)));
    const t = (id, label) => h('button', { class: `tab ${tab === id ? 'active' : ''}`, onclick: () => { tab = id; render(); } }, label);
    tabsEl.replaceChildren(t('decor', 'Décorations'), t('garde-robe', 'Garde-robe'));
    decorView.classList.toggle('hidden', tab !== 'decor');
    wardrobeView.classList.toggle('hidden', tab !== 'garde-robe');
    renderWardrobe();
    grid.replaceChildren(...CATALOG_ORDER.map((k) => {
      const it = CATALOG[k];
      const can = st.shells >= it.price;
      const owned = st.inventory[k] || 0;
      return h('div', { class: 'shop-item' },
        h('img', { class: 'thumb', src: game.decorThumb(k), alt: '' }),
        h('div', { class: 'shop-name' }, it.name),
        h('div', { class: 'muted shop-desc' }, it.desc),
        h('div', { class: 'row spread' },
          h('span', { class: 'price' }, shellIcon(), String(it.price)),
          h('button', {
            class: 'btn small primary', disabled: can ? undefined : true,
            onclick: () => {
              if (st.shells < it.price) return;
              game.addShells(-it.price, 'achat');
              st.inventory[k] = (st.inventory[k] || 0) + 1;
              game.markDirty();
              game.audio?.pop(1.2);
              game.ui.toast(`${it.name} ajouté à ton inventaire.`, { icon: 'shop' });
              render();
            },
          }, 'Acheter')),
        owned ? h('span', { class: 'owned' }, `×${owned}`) : null);
    }));
    const items = Object.entries(st.inventory).filter(([, n]) => n > 0);
    inv.replaceChildren(...(items.length ? items.map(([k, n]) => h('div', { class: 'inv-item' },
      h('img', { class: 'thumb small', src: game.decorThumb(k), alt: '' }),
      h('span', {}, `${CATALOG[k]?.name || k} ×${n}`),
      h('button', { class: 'btn small', onclick: () => { game.ui.closePanel(); game.decor.startPlacement(k); } }, 'Poser'))) : [h('p', { class: 'muted' }, 'Rien pour l\'instant. Les coquillages se gagnent en révisant !')]));
  };
  render();
  decorView.append(
    grid,
    h('div', { class: 'section-label' }, 'Ton inventaire'),
    inv,
    h('p', { class: 'muted' }, 'Pour déplacer un objet déjà posé, approche-toi et appuie sur E.'));
  const body = h('div', { class: 'stack' },
    h('div', { class: 'row spread' }, h('p', { class: 'muted' }, 'Tout est fait main par les habitants de l\'île.'), balance),
    tabsEl,
    decorView,
    wardrobeView);
  game.ui.openPanel(body, { title: "L'échoppe", icon: 'shop', className: 'wide shop-panel' });
}
