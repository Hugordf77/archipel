import { h } from './dom.js';
import { ICON } from './icons.js';
import { KINDS } from '../game/collectibles.js';
import { ARCHETYPES } from '../world/archetypes.js';
import { BIOMES } from '../world/biomes.js';
import { SPECIES, SPECIES_LABEL } from '../world/gen/spawns.js';
import { ITEMS } from '../data/items.js';

// Panneaux de l'exploration : journal de bord, carte, cartographe.
// (la carte complète et les quêtes arrivent avec la navigation et l'exploration)

const fmtKm = (m) => `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;

export function openLogbookPanel(game) {
  const st = game.state;
  const ex = st.explorer || { islands: {}, distance: 0 };
  let tab = 'bord';
  const left = h('div', { class: 'nb-page left' });
  const right = h('div', { class: 'nb-page right' });
  const ribbons = h('div', { class: 'nb-ribbons' });
  const stat = (icon, label, value) => h('div', { class: 'stat' }, h('span', { class: 'icon', html: ICON[icon] }), h('span', { class: 'stat-label' }, label), h('b', {}, value));
  const islands = () => Object.values(ex.islands || {});

  const renderBord = () => {
    const found = islands();
    left.replaceChildren(
      h('h2', {}, 'Journal de bord'),
      h('p', { class: 'muted hand' }, st.world?.name || 'Mon archipel'),
      stat('map', 'Îles découvertes', String(found.length)),
      stat('boat', 'Distance parcourue', fmtKm(ex.distance || 0)),
      stat('sparkle', 'Trésors trouvés', String(Object.values(st.collect?.totals || {}).reduce((a, b) => a + b, 0))),
      stat('shell', 'Coquillages', String(st.shells)),
      h('p', { class: 'muted hand' }, `Graine du monde : ${st.world?.seed || '—'}`),
    );
    // fiche de chaque île : archétype, biome, lieux découverts, animaux rencontrés
    const pois = ex.pois || {};
    const card = (i) => {
      const places = (i.pois || []).map((id) => pois[id]?.name).filter(Boolean);
      const beasts = (i.animals || []).map((sp) => SPECIES_LABEL[sp] || sp);
      return h('li', { class: 'isle-card' },
        h('span', { class: 'dot', style: { background: (BIOMES[i.biome]?.pal.grass[1]) || '#9fdcc8' } }),
        h('div', {},
          h('b', {}, i.name),
          h('div', { class: 'muted' }, [ARCHETYPES[i.archetype]?.name, BIOMES[i.biome]?.name].filter(Boolean).join(' · ')),
          places.length ? h('div', { class: 'isle-line' }, `Lieux : ${places.slice(0, 5).join(', ')}${places.length > 5 ? '…' : ''}`) : null,
          beasts.length ? h('div', { class: 'isle-line' }, `Rencontres : ${beasts.join(', ')}`) : null));
    };
    right.replaceChildren(
      h('h3', {}, 'Îles au carnet'),
      found.length
        ? h('ul', { class: 'day-list isle-list' }, ...found.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 8).map(card))
        : h('div', { class: 'empty-state' },
          h('p', { class: 'hand' }, 'Aucune île au carnet pour l\'instant. Le large t\'attend : la carte du cartographe est pleine de blancs.')),
    );
  };

  const renderCollection = () => {
    const tot = st.collect?.totals || {};
    left.replaceChildren(
      h('h2', {}, 'Trésors de plage'),
      h('div', { class: 'collection' }, ...Object.entries(KINDS).map(([k, v]) => h('div', { class: `treasure ${tot[k] ? '' : 'unknown'}` },
        h('span', {}, tot[k] ? v.name : '???'),
        h('b', {}, `×${tot[k] || 0}`)))),
    );
    const met = ex.animals || {};
    const cols = st.collections || { poissons: {}, insectes: {} };
    const caught = [...Object.keys(cols.poissons || {}), ...Object.keys(cols.insectes || {})];
    right.replaceChildren(
      h('h3', {}, `Animaux rencontrés (${Object.keys(met).length}/${SPECIES.length})`),
      h('div', { class: 'collection' }, ...SPECIES.map((sp) => h('div', { class: `treasure ${met[sp] ? '' : 'unknown'}` }, h('span', {}, met[sp] ? SPECIES_LABEL[sp] : '???')))),
      h('h3', {}, `Pêches et insectes (${caught.length})`),
      caught.length ? h('p', { class: 'muted' }, caught.map((id) => ITEMS[id]?.name || id).join(', ')) : h('p', { class: 'muted hand' }, 'Une canne, un filet, et la collection commence.'),
    );
  };

  const render = () => {
    const r = (id, label, color) => h('button', { class: `ribbon ${tab === id ? 'active' : ''}`, style: { '--rb': color }, onclick: () => { tab = id; render(); } }, label);
    ribbons.replaceChildren(r('bord', 'Bord', '#f4a28c'), r('collection', 'Collection', '#c7b2e6'));
    if (tab === 'bord') renderBord();
    else renderCollection();
  };
  render();
  const book = h('div', { class: 'notebook' }, ribbons, h('div', { class: 'nb-pages' }, left, h('div', { class: 'nb-spine' }), right));
  game.ui.openPanel(book, { className: 'journal-panel' });
}

// Carte provisoire (remplacée par la carte en parchemin de la navigation)
export { openMapPanel } from './mapPanel.js';

export function openCartographerPanel(game) {
  const body = h('div', { class: 'stack' },
    h('div', { class: 'owl-line' }, h('span', { class: 'icon owl-ic', html: ICON.owl }),
      h('div', { class: 'owl-say' }, 'Hou hou ! Je range mes livres et je déroule mes cartes : l\'archipel est immense, et presque tout y reste à découvrir.')),
    h('p', {}, 'Bientôt, je te confierai des expéditions. Pour commencer, regarde l\'horizon depuis le ponton.'));
  game.ui.openPanel(body, { title: 'Le cartographe', icon: 'owl' });
}
