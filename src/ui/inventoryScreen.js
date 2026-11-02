// Inventaire plein écran (V2) : le jeu en pause sous un voile violet, onglets en haut,
// catégories, grille de 5 × 4 cases par page, aperçu du personnage et fiche de l'objet
// à droite, rappels des commandes en bas. Mise en page inspirée des grands jeux
// d'aventure, habillage peint de l'Archipel (papier, encre, pastels).
// Manette : l'écran lit lui-même les boutons (sheet.padScreen, appelé par Gamepad.js).
import { h, replay } from './dom.js';
import { ICON } from './icons.js';
import { ITEMS, SHAPES, itemIcon, STATION_NAMES } from '../data/items.js';
import { HOTBAR } from '../gameplay/Inventory.js';
import { BTN } from '../core/Gamepad.js';
import { RECIPE_LIST } from './inventoryUI.js';
import { characterPreview } from './inventoryPreview.js';
import {
  COLS, ROWS, PER_PAGE, GROUPS, TABS, STATIONS, SORTS, entries, pageCount, pageOf, clampCursor, moveCursor,
  nextSort, nextTab, badgeOf, actionsFor, itemSheet, recipesOf,
} from './inventoryLogic.js';

const FADE_MS = 120;
const GROUP_ICON = {
  tout: SHAPES.chest(),
  ressources: SHAPES.log('#c98f5f'),
  jardin: SHAPES.flower('#f7b6c8'),
  nourriture: SHAPES.fruit('#f7b48a'),
  faune: SHAPES.fish('#9cc8ec'),
  artisanat: SHAPES.cloth('#f6ead2'),
  outils: SHAPES.axe('#9aa6c4'),
  chantier: SHAPES.boat(),
};
const STATION_ICON = {
  main: SHAPES.rope('#e9d8b4'),
  etabli: SHAPES.bench('#c98f5f'),
  four: SHAPES.oven(),
  couture: SHAPES.loom(),
  chantier: SHAPES.shipyard(),
};
// où trouver de quoi remplir un onglet vide
const EMPTY_TIP = {
  tout: 'Ton sac est vide. Récolte du bois, des pierres et des fibres pour commencer.',
  ressources: 'Coupe du bois, casse des pierres, arrache des fibres.',
  jardin: 'Cueille des fleurs dans les prés ; les jeunes arbres donnent des pousses.',
  nourriture: 'Secoue les arbres fruitiers, cueille baies et champignons.',
  faune: 'Pêche à la canne, attrape les insectes au filet.',
  artisanat: 'Fabrique planches, cordes et teintures à l\'atelier.',
  outils: 'Fabrique tes premiers outils à l\'atelier.',
  chantier: 'Stations et bateaux se fabriquent à l\'atelier.',
};
const KEYS = { confirm: 'Entrée', back: 'Échap', sort: 'T', catPrev: '⇧ Tab', catNext: 'Tab', rotate: 'Glisser' };
const PADS = { confirm: '✕', back: '◯', sort: '□', catPrev: 'L2', catNext: 'R2', tabPrev: 'L1', tabNext: 'R1', rotate: 'R' };
const TAB_KEYS = { carnet: 'J', inventaire: 'I', atelier: 'C', reglages: 'P' };

let lastSort = 'categorie';

export function openInventoryScreen(game, startTab = 'inventaire') {
  const inv = game.inv;
  const pad = game.pad;
  const st = {
    tab: startTab === 'atelier' ? 'atelier' : 'inventaire',
    group: 0,
    station: 0,
    sort: lastSort,
    cur: { page: 0, cell: 0 },
    curs: {}, // curseur gardé par catégorie
    menu: null, // { entry, actions, i, confirm }
    device: pad?.recent ? 'pad' : 'clavier',
    lastKey: pad?.recent ? 0 : performance.now(),
  };
  const near = game.stationsNear();
  let closing = false;
  let done = false;

  // --- squelette (l'aperçu 3D reste en place d'un rendu à l'autre) ---
  const topLeft = h('div', { class: 'inv2-state' });
  const topTabs = h('nav', { class: 'inv2-tabs', 'aria-label': 'Onglets' });
  const topRight = h('div', { class: 'inv2-shells', title: 'Coquillages' });
  const cats = h('div', { class: 'inv2-cats', role: 'tablist' });
  const catTitle = h('div', { class: 'inv2-cat-title' });
  const gridEl = h('div', { class: 'inv2-grid', role: 'grid' });
  const prevBtn = h('button', { class: 'inv2-page prev', 'aria-label': 'Page précédente', onclick: () => turnPage(-1) }, '‹');
  const nextBtn = h('button', { class: 'inv2-page next', 'aria-label': 'Page suivante', onclick: () => turnPage(1) }, '›');
  const dots = h('div', { class: 'inv2-dots' });
  const empty = h('div', { class: 'inv2-empty hidden' });
  const menuEl = h('div', { class: 'inv2-menu paper hidden', role: 'menu' });
  const gridWrap = h('div', { class: 'inv2-gridwrap' }, prevBtn, h('div', { class: 'inv2-gridbox' }, gridEl, empty, menuEl), nextBtn);
  const card = h('div', { class: 'inv2-card paper' });
  const previewBox = h('div', { class: 'inv2-preview', title: 'Glisse pour faire tourner ton personnage' });
  const previewHint = h('div', { class: 'inv2-preview-hint' });
  const hints = h('div', { class: 'inv2-hints' });

  let preview = null;
  try {
    preview = characterPreview(game.state.avatar);
    previewBox.append(preview.canvas);
  } catch (e) {
    console.warn('Aperçu du personnage indisponible', e);
    previewBox.classList.add('off');
  }
  previewBox.append(previewHint);

  const body = h('div', { class: 'inv2' },
    h('header', { class: 'inv2-top' }, topLeft, topTabs, topRight),
    h('div', { class: 'inv2-main' },
      h('section', { class: 'inv2-left' }, cats, catTitle, gridWrap, dots),
      h('aside', { class: 'inv2-right' }, previewBox, card)),
    h('footer', { class: 'inv2-bottom' }, hints));

  // --- données de l'onglet courant ---
  const list = () => {
    if (st.tab === 'atelier') {
      const station = STATIONS[st.station];
      const here = station === 'main' || near.has(station);
      return recipesOf(RECIPE_LIST, station, (r) => here && inv.canCraft(r)).map((r) => ({ recipe: r, id: r.out, n: r.n, item: ITEMS[r.out], here }));
    }
    return entries(inv.slots, ITEMS, GROUPS[st.group].id, st.sort, HOTBAR);
  };
  const selected = (l = list()) => pageOf(l, st.cur.page)[st.cur.cell] || null;
  const owned = (it) => !!it?.boat && !!game.state.boat?.owned?.includes(it.boat);
  const craftable = (e) => e.here && inv.canCraft(e.recipe) && !owned(e.item);

  // --- petits éléments ---
  const glyph = (action, extraClass = '') => {
    const isPad = st.device === 'pad';
    const txt = isPad ? PADS[action] : KEYS[action];
    if (!txt) return null;
    const face = isPad && ['confirm', 'back', 'sort'].includes(action);
    return h('span', { class: `inv2-glyph ${isPad ? 'pad' : 'key'} ${face ? `face ${action}` : ''} ${extraClass}` }, txt);
  };
  const sound = (kind) => game.audio?.menu?.(kind);
  // replaceChildren écrirait « null » : on écarte les enfants absents
  const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));

  // --- rendu ---
  const renderTop = () => {
    const clock = (game.ui.clockTag?.textContent || '').split(' · ');
    fill(topLeft, 
      h('span', { class: 'inv2-state-icon', html: ICON.clock }),
      h('span', { class: 'inv2-state-txt' }, h('b', {}, clock[0] || ''), h('span', {}, clock.slice(1).join(' · '))),
    );
    const isPad = st.device === 'pad';
    fill(topTabs, 
      isPad ? glyph('tabPrev', 'bumper') : null,
      ...TABS.map((t) => h('button', {
        class: `inv2-tab ${st.tab === t.id ? 'active' : ''}`,
        role: 'tab',
        'aria-selected': st.tab === t.id ? 'true' : 'false',
        onclick: () => goTab(t.id),
      }, h('span', {}, t.label), isPad ? null : h('span', { class: 'inv2-tabkey' }, TAB_KEYS[t.id]))),
      isPad ? glyph('tabNext', 'bumper') : null,
    );
    fill(topRight, h('span', { class: 'inv2-shell-icon', html: ICON.shell }), h('b', {}, String(game.state.shells || 0)));
  };

  const renderCats = () => {
    const atelier = st.tab === 'atelier';
    const items = atelier
      ? STATIONS.map((s, i) => ({ i, label: STATION_NAMES[s], icon: STATION_ICON[s], dim: s !== 'main' && !near.has(s) }))
      : GROUPS.map((g, i) => ({ i, label: g.label, icon: GROUP_ICON[g.id], dim: !entries(inv.slots, ITEMS, g.id).length }));
    const at = atelier ? st.station : st.group;
    fill(cats, 
      glyph('catPrev', 'trigger'),
      ...items.map((c) => h('button', {
        class: `inv2-cat ${c.i === at ? 'active' : ''} ${c.dim ? 'dim' : ''}`,
        role: 'tab',
        title: c.label,
        'aria-label': c.label,
        'aria-selected': c.i === at ? 'true' : 'false',
        onclick: () => setCat(c.i),
      }, h('span', { class: 'inv2-cat-icon', html: c.icon }))),
      glyph('catNext', 'trigger'),
    );
    const sub = atelier
      ? (STATIONS[st.station] === 'main' || near.has(STATIONS[st.station]) ? 'à portée' : 'approche-toi de cette station')
      : SORTS.find((s) => s.id === st.sort).label.toLowerCase();
    fill(catTitle, h('b', {}, items[at].label), h('span', {}, ` · ${sub}`));
  };

  const cellEl = (e, idx) => {
    if (!e) return h('div', { class: 'inv2-cell blank', 'aria-hidden': 'true' });
    const sel = idx === st.cur.cell;
    const atelier = st.tab === 'atelier';
    const badge = badgeOf(e.item);
    const ok = atelier ? craftable(e) : true;
    return h('button', {
      class: `inv2-cell ${sel ? 'sel' : ''} ${!atelier && e.hot ? 'hot' : ''} ${atelier && !ok ? 'off' : ''}`,
      role: 'gridcell',
      'aria-label': `${e.item.name}${e.n > 1 ? ` ×${e.n}` : ''}${!atelier && e.hot ? ', dans la barre rapide' : ''}`,
      onpointerenter: () => {
        if (st.menu || st.cur.cell === idx) return;
        st.cur.cell = idx;
        sound('tick');
        render();
      },
      onclick: () => {
        if (st.cur.cell !== idx) {
          st.cur.cell = idx;
          st.menu = null;
          render();
        }
        choose();
      },
    },
    h('span', { class: 'inv2-cell-icon', html: itemIcon(e.id) }),
    e.n > 1 ? h('span', { class: 'inv2-cell-n' }, atelier ? `×${e.n}` : String(e.n)) : null,
    badge ? h('span', { class: `inv2-badge ${badge.kind}`, title: badge.title }, badge.text) : null,
    !atelier && e.hot ? h('span', { class: 'inv2-hotkey', title: 'Case de la barre rapide' }, String(e.slot + 1)) : null,
    atelier && owned(e.item) ? h('span', { class: 'inv2-owned' }, 'Possédé') : null,
    sel ? h('span', { class: 'inv2-sel', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')) : null);
  };

  const renderGrid = (l) => {
    const pages = pageCount(l.length);
    const page = pageOf(l, st.cur.page);
    gridEl.style.setProperty('--cols', COLS);
    gridEl.style.setProperty('--rows', ROWS);
    fill(gridEl, ...Array.from({ length: PER_PAGE }, (_, i) => cellEl(page[i], i)));
    prevBtn.disabled = st.cur.page <= 0;
    nextBtn.disabled = st.cur.page >= pages - 1;
    fill(dots, ...(pages > 1 ? Array.from({ length: pages }, (_, i) => h('span', { class: `inv2-dot ${i === st.cur.page ? 'on' : ''}` })) : []));
    empty.classList.toggle('hidden', l.length > 0);
    if (!l.length) {
      fill(empty, 
        h('b', {}, st.tab === 'atelier' ? 'Aucune recette ici.' : 'Rien ici pour l\'instant.'),
        st.tab === 'atelier' ? null : h('span', {}, EMPTY_TIP[GROUPS[st.group].id]),
      );
    }
  };

  const stars = (n) => h('span', { class: 'inv2-stars', 'aria-label': `${n} étoile${n > 1 ? 's' : ''} sur 3` },
    ...[1, 2, 3].map((k) => h('span', { class: k <= n ? 'on' : '' }, '★')));

  const renderCard = (e) => {
    if (!e) {
      fill(card, h('div', { class: 'inv2-card-empty' }, st.tab === 'atelier' ? 'Choisis une recette.' : 'Choisis un objet pour lire sa fiche.'));
      return;
    }
    const sheet = itemSheet(e.id, ITEMS, RECIPE_LIST, STATION_NAMES, inv.count(e.id));
    const head = h('div', { class: 'inv2-card-head' },
      h('span', { class: 'inv2-card-icon', html: itemIcon(e.id) }),
      h('div', { class: 'inv2-card-titles' },
        sheet.rarity ? stars(sheet.rarity.stars) : null,
        h('h2', {}, sheet.name),
        h('span', { class: 'inv2-card-cat' }, sheet.rarity?.night ? `${sheet.cat} · de nuit` : sheet.cat)));
    const statEls = h('div', { class: 'inv2-stats' }, ...sheet.stats.map((s) => h('span', { class: `inv2-stat ${s.k}` },
      s.k === 'prix' ? h('span', { class: 'inv2-stat-icon', html: ICON.shell }) : null,
      h('span', { class: 'inv2-stat-label' }, s.label), h('b', {}, s.value))));
    const parts = [head, statEls];
    if (st.tab === 'atelier') {
      const r = e.recipe;
      parts.push(h('div', { class: 'inv2-needs' }, ...Object.entries(r.in).map(([id, n]) => {
        const have = inv.count(id);
        return h('span', { class: `inv2-need ${have >= n ? 'have' : ''}`, title: ITEMS[id].name },
          h('span', { class: 'inv2-need-icon', html: itemIcon(id) }), h('span', {}, ITEMS[id].name), h('b', {}, `${Math.min(have, n)}/${n}`));
      })));
      const why = owned(e.item) ? 'Tu possèdes déjà ce bateau.'
        : !e.here ? `Approche-toi : ${STATION_NAMES[r.station].toLowerCase()}.`
          : !inv.canCraft(r) ? 'Il manque des ingrédients.' : `Prêt : ${r.n > 1 ? `${r.n} d'un coup` : 'à fabriquer'}.`;
      parts.push(h('p', { class: `inv2-craft-state ${craftable(e) ? 'ok' : ''}` }, why));
    }
    parts.push(h('p', { class: 'inv2-text' }, sheet.text));
    fill(card, ...parts);
  };

  const renderMenu = () => {
    const m = st.menu;
    menuEl.classList.toggle('hidden', !m);
    if (!m) return;
    const items = m.confirm ? [{ id: 'oui', label: 'Oui, jeter' }, { id: 'non', label: 'Non, garder' }] : m.actions;
    fill(menuEl, 
      h('div', { class: 'inv2-menu-title' }, m.confirm ? `Jeter ${m.entry.item.name}${m.entry.n > 1 ? ` ×${m.entry.n}` : ''} ?` : m.entry.item.name),
      ...items.map((a, i) => h('button', {
        class: `inv2-menu-item ${i === m.i ? 'on' : ''} ${a.id === 'jeter' || a.id === 'oui' ? 'warn' : ''}`,
        role: 'menuitem',
        onpointerenter: () => {
          if (m.i === i) return;
          m.i = i;
          renderMenu();
        },
        onclick: (ev) => {
          ev.stopPropagation();
          m.i = i;
          runMenu();
        },
      }, i === m.i ? glyph('confirm', 'small') : h('span', { class: 'inv2-menu-dot' }), h('span', {}, a.label))),
    );
    // à côté de la case choisie (à droite, ou à gauche près du bord)
    const col = st.cur.cell % COLS;
    menuEl.style.setProperty('--mx', String(col));
    menuEl.style.setProperty('--my', String(Math.floor(st.cur.cell / COLS)));
    menuEl.classList.toggle('left', col >= COLS - 2);
  };

  const renderHints = () => {
    const atelier = st.tab === 'atelier';
    const isPad = st.device === 'pad';
    const item = (action, label) => h('span', { class: 'inv2-hint' }, glyph(action), h('span', {}, label));
    fill(hints, 
      atelier ? null : item('sort', `Trier · ${SORTS.find((s) => s.id === st.sort).label.toLowerCase()}`),
      item('back', st.menu ? 'Annuler' : 'Retour'),
      item('confirm', atelier ? 'Fabriquer' : 'Choisir'),
      preview ? item('rotate', 'Tourner') : null,
    );
    previewHint.textContent = preview ? (isPad ? 'Stick droit : tourner' : 'Glisse pour tourner') : '';
  };

  function render() {
    if (done) return;
    const l = list();
    st.cur = clampCursor(st.cur, l.length);
    renderTop();
    renderCats();
    renderGrid(l);
    renderCard(selected(l));
    renderMenu();
    renderHints();
  }

  // --- actions ---
  function setCat(i) {
    const atelier = st.tab === 'atelier';
    const n = atelier ? STATIONS.length : GROUPS.length;
    const next = ((i % n) + n) % n;
    st.curs[`${st.tab}:${atelier ? st.station : st.group}`] = st.cur;
    if (atelier) st.station = next;
    else st.group = next;
    st.cur = st.curs[`${st.tab}:${next}`] || { page: 0, cell: 0 };
    st.menu = null;
    sound('tab');
    render();
  }

  function goTab(id) {
    if (id === st.tab) return;
    if (id === 'carnet' || id === 'reglages') {
      // les panneaux existants prennent la place de l'écran
      finish();
      if (id === 'carnet') game.openJournal();
      else game.openSettings();
      return;
    }
    st.tab = id;
    st.cur = { page: 0, cell: 0 };
    st.menu = null;
    sound('tab');
    render();
  }

  function turnPage(d) {
    const l = list();
    const p = Math.min(pageCount(l.length) - 1, Math.max(0, st.cur.page + d));
    if (p === st.cur.page) return;
    st.cur = clampCursor({ page: p, cell: st.cur.cell }, l.length);
    st.menu = null;
    sound('tab');
    render();
  }

  function move(dir) {
    if (st.menu) {
      const n = st.menu.confirm ? 2 : st.menu.actions.length;
      if (dir[1]) {
        st.menu.i = (st.menu.i + dir[1] + n) % n;
        sound('tick');
        renderMenu();
      }
      return;
    }
    const before = st.cur;
    st.cur = moveCursor(st.cur, dir, list().length);
    if (before.page !== st.cur.page || before.cell !== st.cur.cell) {
      sound(before.page !== st.cur.page ? 'tab' : 'tick');
      render();
    }
  }

  function choose() {
    const e = selected();
    if (!e) return;
    if (st.tab === 'atelier') {
      craft(e);
      return;
    }
    if (st.menu) {
      runMenu();
      return;
    }
    st.menu = { entry: e, actions: actionsFor(e), i: 0, confirm: false };
    sound('tick');
    render();
  }

  function craft(e) {
    if (!craftable(e)) {
      sound('no');
      replay(card, 'squish');
      return;
    }
    const res = inv.craft(e.recipe);
    if (!res.ok) {
      sound('no');
      game.ui.toast(res.why === 'plein' ? 'Ton sac est plein.' : 'Il manque des ingrédients.', { icon: 'leaf' });
      return;
    }
    game.onCrafted(e.recipe);
    game.audio?.pop(1.2);
    render();
    const cell = gridEl.querySelector('.inv2-cell.sel');
    if (cell) replay(cell, 'squish');
  }

  // met une case dans la barre rapide (première case libre, sinon celle tenue en main)
  const toHotbar = (slot) => {
    if (slot < HOTBAR) return slot;
    let j = inv.freeSlot(0, HOTBAR);
    if (j < 0) j = game.state.sel || 0;
    inv.move(slot, j);
    return j;
  };
  const hold = (j) => {
    game.state.sel = j;
    game.hotbar?.render();
    game.gather?.refreshHeld();
  };

  function runMenu() {
    const m = st.menu;
    if (!m) return;
    if (m.confirm) {
      if (m.i === 0) {
        inv.discard(m.entry.slot);
        game.audio?.plop?.();
      }
      st.menu = null;
      render();
      return;
    }
    const a = m.actions[m.i];
    const slot = m.entry.slot;
    switch (a.id) {
      case 'barre':
      case 'tenir':
        hold(toHotbar(slot));
        game.audio?.pop(1.2);
        break;
      case 'retirer': {
        const k = inv.freeSlot(HOTBAR);
        if (k < 0) {
          sound('no');
          game.ui.toast('Ton sac est plein.', { icon: 'leaf' });
        } else {
          inv.move(slot, k);
          game.audio?.pop(1);
        }
        break;
      }
      case 'diviser':
        if (!inv.split(slot)) {
          sound('no');
          game.ui.toast('Plus de place pour partager la pile.', { icon: 'leaf' });
        }
        break;
      case 'poser': {
        const id = m.entry.id;
        hold(toHotbar(slot));
        finish();
        game.ui.closePanel();
        game.decor.startPlacement(id);
        return;
      }
      case 'planter':
        hold(toHotbar(slot));
        finish();
        game.ui.closePanel();
        game.ui.toast(`Vise un coin de terre et appuie sur ${pad?.recent ? '□' : 'E'} pour planter.`, { icon: 'leaf' });
        return;
      case 'jeter':
        m.confirm = true;
        m.i = 1;
        sound('tick');
        renderMenu();
        return;
      default:
        break;
    }
    st.menu = null;
    render();
  }

  function back() {
    if (st.menu) {
      if (st.menu.confirm) {
        st.menu.confirm = false;
        st.menu.i = st.menu.actions.findIndex((a) => a.id === 'jeter');
        renderMenu();
      } else {
        st.menu = null;
        render();
      }
      sound('tick');
      return;
    }
    close();
  }

  function cycleSort() {
    if (st.tab === 'atelier') return;
    st.sort = lastSort = nextSort(st.sort);
    st.cur = { page: 0, cell: 0 };
    st.menu = null;
    sound('tab');
    render();
    replay(catTitle, 'squish');
  }

  // --- entrées ---
  const setDevice = (d) => {
    if (st.device === d) return;
    st.device = d;
    render();
  };

  const DIRS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const onKey = (e) => {
    if (done || game.ui.panel?.sheet !== sheet) return;
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (typing) return;
    st.lastKey = performance.now();
    // l'écran garde toutes les touches pour lui (le jeu est en pause)
    e.preventDefault();
    e.stopImmediatePropagation();
    setDevice('clavier');
    const c = e.code;
    if (DIRS[c]) move(DIRS[c]);
    else if (e.repeat) return;
    else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyE') choose();
    else if (c === 'Escape' || c === 'Backspace') back();
    else if (c === 'KeyI') close();
    else if (c === 'Tab') setCat((st.tab === 'atelier' ? st.station : st.group) + (e.shiftKey ? -1 : 1));
    else if (/^Digit[1-8]$/.test(c)) {
      const i = Number(c[5]) - 1;
      if (i < (st.tab === 'atelier' ? STATIONS.length : GROUPS.length)) setCat(i);
    } else if (c === 'KeyT') cycleSort();
    else if (c === 'KeyJ') goTab('carnet');
    else if (c === 'KeyC') goTab(st.tab === 'atelier' ? 'inventaire' : 'atelier');
    else if (c === 'KeyP') goTab('reglages');
    else if (c === 'PageUp') turnPage(-1);
    else if (c === 'PageDown') turnPage(1);
  };
  const onPointer = () => {
    st.lastKey = performance.now();
    setDevice('clavier');
  };

  // manette : appelé par Gamepad.panel() à chaque image tant que l'écran est ouvert
  const padScreen = (p, dt) => {
    if (done || closing) return;
    if (p.lastUse > st.lastKey) setDevice('pad');
    if (p.pressed(BTN.CIRCLE)) back();
    else if (p.pressed(BTN.TRIANGLE) || p.pressed(BTN.OPTIONS)) close();
    else if (p.pressed(BTN.CROSS)) choose();
    else if (p.pressed(BTN.SQUARE)) cycleSort();
    else if (p.pressed(BTN.L1)) goTab(nextTab(st.tab, -1));
    else if (p.pressed(BTN.R1)) goTab(nextTab(st.tab, 1));
    else if (p.pressed(BTN.L2)) setCat((st.tab === 'atelier' ? st.station : st.group) - 1);
    else if (p.pressed(BTN.R2)) setCat((st.tab === 'atelier' ? st.station : st.group) + 1);
    if (done) return;
    const dir = p.pressed(BTN.UP) ? [0, -1] : p.pressed(BTN.DOWN) ? [0, 1] : p.pressed(BTN.LEFT) ? [-1, 0] : p.pressed(BTN.RIGHT) ? [1, 0] : p.stickNav(dt);
    if (dir) move(dir);
    if (p.look.x && preview) preview.rotate(p.look.x * 2.6 * dt);
  };

  // glisser sur l'aperçu : tourner le personnage
  let drag = null;
  previewBox.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, id: e.pointerId };
    previewBox.setPointerCapture?.(e.pointerId);
    previewBox.classList.add('dragging');
  });
  previewBox.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    preview?.rotate((e.clientX - drag.x) * 0.012);
    drag.x = e.clientX;
  });
  const endDrag = () => {
    drag = null;
    previewBox.classList.remove('dragging');
  };
  previewBox.addEventListener('pointerup', endDrag);
  previewBox.addEventListener('pointercancel', endDrag);
  // molette sur la grille : tourner les pages
  gridWrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) > 8) turnPage(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // --- vie de l'écran ---
  const fitPreview = () => {
    if (!preview) return;
    const r = previewBox.getBoundingClientRect();
    preview.resize(Math.round(r.width), Math.round(r.height));
  };
  // redimensionner la fenêtre efface le canevas du jeu : on redessine une image figée
  const onResize = () => {
    fitPreview();
    if (game.paused) game.pipeline.render(game.world.scene, game.camera, game.overlayScene);
  };
  const baseChange = inv.onChange;
  inv.onChange = () => {
    baseChange?.();
    render();
  };

  // nettoyage, aussi quand un autre panneau prend la place sans fermer celui-ci
  function finish() {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointermove', onPointer, true);
    window.removeEventListener('resize', onResize);
    inv.onChange = baseChange;
    game.paused = false;
    game.pauseFrame = null;
    delete game.uiRoot.dataset.inv2;
  }

  function close() {
    if (closing || done) return;
    closing = true;
    sound('close');
    const host = game.ui.panelHost;
    host.classList.add('inv2-leaving');
    setTimeout(() => {
      host.classList.remove('inv2-leaving');
      if (game.ui.panel?.sheet === sheet) game.ui.closePanel();
      else finish();
    }, FADE_MS);
  }

  const panel = game.ui.openPanel(body, { className: 'inv2-sheet', hostKind: 'inv2', onClose: finish });
  const sheet = panel.sheet;
  sheet.padScreen = padScreen;
  game.uiRoot.dataset.inv2 = '1';
  game.paused = true;
  game.pauseFrame = (dt) => {
    if (game.ui.panel?.sheet !== sheet) {
      finish();
      return;
    }
    preview?.render(dt);
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('pointermove', onPointer, true);
  window.addEventListener('resize', onResize);
  render();
  fitPreview();
  requestAnimationFrame(fitPreview);
  sound('open');
  return panel;
}
