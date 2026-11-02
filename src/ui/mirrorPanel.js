import { h, replay } from './dom.js';
import { ICON, pieceIcon } from './icons.js';
import {
  SKINS, HAIR_COLORS, CLOTH_COLORS, CLOTH_NAMES, SHOE_COLORS, EYES, PIECES, piecesOf, sanitizeAvatar,
} from '../entities/character/avatar.js';

// Le miroir : on change d'apparence en voyant son personnage en direct dans le monde.
// Le panneau est collé à droite, sans voile ; on fait pivoter le personnage au glissé.

const TABS = [['visage', 'Visage'], ['cheveux', 'Cheveux'], ['tenue', 'Tenue'], ['accessoires', 'Accessoires']];
export const ACC_COLORS = { echarpe: '#8fd6c3', bob: '#e0a93b', barrette: '#ef9bb5', lunettes: '#3d3049', sac: '#3f8f8a' };

const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const randIndex = (n) => Math.floor(Math.random() * n);

// Look tiré au hasard parmi ce que l'on possède (la peau, les yeux et la coupe ne changent pas)
function randomLook(av, owned) {
  const mine = (slot) => piecesOf(slot).filter((k) => owned.has(k));
  return {
    ...av,
    hairColor: randIndex(HAIR_COLORS.length),
    top: pickOne(mine('top')),
    topColor: randIndex(CLOTH_COLORS.length),
    bottom: pickOne(mine('bottom')),
    bottomColor: randIndex(CLOTH_COLORS.length),
    shoes: pickOne(mine('shoes')),
    shoesColor: randIndex(SHOE_COLORS.length),
    accessory: Math.random() < 0.2 ? null : pickOne(mine('accessory')),
    accessoryColor: randIndex(CLOTH_COLORS.length),
  };
}

export function openMirrorPanel(game, { first = false, tab = 'visage' } = {}) {
  if (game.mode === 'focus') return;
  const st = game.state;
  const before = { ...st.avatar };
  let draft = { ...st.avatar };
  let kept = false;
  const owned = () => new Set(st.wardrobe);

  const preview = () => {
    draft = game.character.setAvatar(draft);
  };

  const tabsEl = h('div', { class: 'tabs' });
  const content = h('div', { class: 'tab-content stack mirror-content' });

  const dots = (palette, current, onPick, names = null) => h('div', { class: 'row color-row mirror-dots' }, ...palette.map((c, i) => h('button', {
    class: `color-dot ${i === current ? 'selected' : ''}`,
    style: `background:${c}`,
    'aria-label': names ? names[i] : `Teinte ${i + 1}`,
    'data-label': names ? names[i] : null,
    onclick: () => {
      onPick(i);
      preview();
      render();
    },
  })));

  const chips = (entries, current, onPick) => h('div', { class: 'chips' }, ...entries.map(([value, label, extra = {}]) => h('button', {
    class: `chip ${value === current ? 'selected' : ''} ${extra.locked ? 'locked' : ''}`,
    disabled: extra.locked ? true : undefined,
    title: extra.locked ? `${extra.price} coquillages à l'échoppe` : null,
    onclick: () => {
      if (extra.locked) return;
      onPick(value);
      preview();
      render();
    },
  }, extra.icon ? h('span', { class: 'icon', html: extra.icon }) : null, h('span', {}, label), extra.locked ? h('span', { class: 'icon lock', html: ICON.lock }) : null)));

  const pieceChips = (slot, colorKey, palette) => {
    const own = owned();
    return chips(
      piecesOf(slot).map((k) => [k, PIECES[k].name, { icon: pieceIcon(k, palette[draft[colorKey]]), locked: !own.has(k), price: PIECES[k].price }]),
      draft[slot],
      (v) => {
        draft[slot] = v;
      },
    );
  };

  const section = (label, ...children) => h('div', { class: 'stack mirror-section' }, h('div', { class: 'section-label' }, label), ...children);

  const render = () => {
    tabsEl.replaceChildren(...TABS.map(([id, label]) => h('button', {
      class: `tab ${tab === id ? 'active' : ''}`,
      onclick: () => {
        tab = id;
        render();
      },
    }, label)));
    let parts = [];
    if (tab === 'visage') {
      parts = [
        section('Peau', dots(SKINS, draft.skin, (i) => { draft.skin = i; })),
        section('Yeux', chips(Object.entries(EYES), draft.eyes, (v) => { draft.eyes = v; })),
      ];
    } else if (tab === 'cheveux') {
      // une seule coupe (en pics) : on n'en choisit que la couleur
      parts = [
        section('Couleur', dots(HAIR_COLORS, draft.hairColor, (i) => { draft.hairColor = i; })),
      ];
    } else if (tab === 'tenue') {
      const dress = draft.top === 'robe';
      parts = [
        section('Haut', pieceChips('top', 'topColor', CLOTH_COLORS), dots(CLOTH_COLORS, draft.topColor, (i) => { draft.topColor = i; }, CLOTH_NAMES)),
        dress
          ? section('Bas', h('p', { class: 'muted' }, 'La robe remplace le bas tant que tu la portes.'))
          : section('Bas', pieceChips('bottom', 'bottomColor', CLOTH_COLORS), dots(CLOTH_COLORS, draft.bottomColor, (i) => { draft.bottomColor = i; }, CLOTH_NAMES)),
        section('Chaussures', pieceChips('shoes', 'shoesColor', SHOE_COLORS), dots(SHOE_COLORS, draft.shoesColor, (i) => { draft.shoesColor = i; })),
      ];
    } else {
      const own = owned();
      parts = [
        section('Accessoire', chips(
          [[null, 'Aucun'], ...piecesOf('accessory').map((k) => [k, PIECES[k].name, { icon: pieceIcon(k, CLOTH_COLORS[draft.accessoryColor]), locked: !own.has(k), price: PIECES[k].price }])],
          draft.accessory,
          (v) => { draft.accessory = v; },
        ), draft.accessory ? dots(CLOTH_COLORS, draft.accessoryColor, (i) => { draft.accessoryColor = i; }, CLOTH_NAMES) : null),
        h('p', { class: 'muted' }, 'D\'autres pièces t\'attendent à l\'échoppe, contre quelques coquillages.'),
      ];
    }
    content.replaceChildren(...parts);
  };

  const stampEl = h('div', { class: 'stamp mirror-stamp hidden' }, 'Joli !');
  const commit = () => {
    if (kept) return;
    kept = true;
    st.avatar = sanitizeAvatar(draft);
    st.avatarIntro = true;
    game.markDirty();
    stampEl.classList.remove('hidden');
    replay(stampEl, 'stamp-in');
    game.audio?.pop?.(1.1);
    setTimeout(() => {
      game.ui.closePanel();
      game.character.setPose('celebrate');
      setTimeout(() => game.character.pose === 'celebrate' && game.character.setPose('idle'), 1300);
    }, 650);
  };
  const surprise = h('button', {
    class: 'btn ghost',
    onclick: () => {
      draft = randomLook(draft, owned());
      preview();
      render();
      replay(surprise, 'squish');
    },
  }, h('span', { class: 'icon', html: ICON.sparkle }), 'Surprends-moi');
  const keep = h('button', { class: 'btn primary', onclick: commit }, h('span', { class: 'icon', html: ICON.stamp }), 'Garder ce look');

  render();
  const intro = first
    ? h('p', { class: 'mirror-intro' }, 'Voici ton reflet ! Change ce qui te plaît, ou garde ce look. Le miroir t\'attend près de la porte de la maison.')
    : h('p', { class: 'muted' }, 'Glisse sur l\'île pour te faire tourner.');
  const body = h('div', { class: 'stack mirror' }, intro, tabsEl, content, h('div', { class: 'row spread mirror-actions' }, surprise, keep), stampEl);

  game.enterMirror(() => {
    // fermeture sans validation : on retrouve son apparence d'avant
    if (!kept) game.character.setAvatar(before);
    st.avatarIntro = true;
    game.markDirty();
  });
  const panel = game.ui.openPanel(body, {
    title: 'Le miroir',
    icon: 'mirror',
    className: 'mirror-panel',
    hostKind: 'mirror',
    onClose: () => game.exitMirror(),
  });
  game.mirror.sheet = panel.sheet;
}
