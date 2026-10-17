// Catalogue des modèles 3D d'Archipel : grille par catégorie (vignettes peintes), recherche et
// filtres, fiche d'un modèle (vue 3D, statistiques, variantes et paramètres).
import '../src/app/setup.js';
import './style.css';
import { h } from '../src/ui/dom.js';
import { MODELS, CATEGORIES, STATUTS, BY_ID, defaultParams, paramValue } from '../src/models/registry.js';
import { Thumbs } from './thumbs.js';
import { Viewer } from './viewer.js';
import { fmtInt, fmtMeters } from './scene.js';

const ui = { cat: 'tous', q: '', status: new Set(), open: null, params: {}, variant: 0 };
let models = MODELS;
const statusOf = (m) => m.status;
const pressed = (b) => (b ? 'true' : 'false');
// remplace les enfants d'un élément en ignorant les blocs absents (null)
const put = (el, ...kids) => el.replaceChildren(...kids.flat().filter(Boolean));

// ---------------------------------------------------------------------------
// thème clair / sombre (préférence du système, ou choix mémorisé)
function loadTheme() {
  try {
    const t = localStorage.getItem('catalogue-theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch {
    /* stockage indisponible : préférence du système */
  }
}
function toggleTheme() {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('catalogue-theme', next);
  } catch {
    /* rien à mémoriser */
  }
}

// ---------------------------------------------------------------------------
// filtres
function matches(m) {
  if (ui.cat !== 'tous' && m.category !== ui.cat) return false;
  if (ui.status.size && !ui.status.has(statusOf(m))) return false;
  if (!ui.q) return true;
  const q = ui.q.toLowerCase();
  return [m.id, m.name, m.slug, ...m.tags, ...m.usedIn].some((s) => String(s).toLowerCase().includes(q));
}

// ---------------------------------------------------------------------------
// squelette de la page
const app = h('div', { class: 'cat-app' });
const sidebar = h('aside', { class: 'sidebar', 'aria-label': 'Catégories et filtres' });
const main = h('main', { class: 'main' });
const topbar = h('div', { class: 'topbar' });
const scroll = h('div', { class: 'scroll' });
main.append(topbar, scroll);
app.append(sidebar, main);
const sheet = h('section', { class: 'sheet', hidden: true, 'aria-label': 'Fiche du modèle' });
const stage = h('div', { class: 'stage' });
const info = h('div', { class: 'info' });
sheet.append(stage, info);
document.getElementById('catalogue').append(app, sheet);

const thumbs = new Thumbs();
let viewer = null;

function renderSidebar() {
  const count = (c) => models.filter((m) => (c === 'tous' || m.category === c) && (!ui.status.size || ui.status.has(statusOf(m)))).length;
  const search = h('input', {
    class: 'search', type: 'search', placeholder: 'id, nom ou étiquette…', value: ui.q, 'aria-label': 'Rechercher un modèle',
    oninput: (e) => {
      ui.q = e.target.value.trim();
      renderGrid();
    },
  });
  const nav = h('div', { class: 'nav', role: 'list' },
    h('button', { 'aria-pressed': pressed(ui.cat === 'tous'), onclick: () => setCat('tous') }, h('span', {}, 'Tous les modèles'), h('span', { class: 'count' }, fmtInt(count('tous')))),
    ...CATEGORIES.map((c) => h('button', { 'aria-pressed': pressed(ui.cat === c.id), onclick: () => setCat(c.id) },
      h('span', {}, h('span', { class: 'prefix mono' }, c.prefix), c.label),
      h('span', { class: 'count' }, fmtInt(count(c.id))))));
  const chips = h('div', { class: 'chips' }, ...Object.entries(STATUTS).map(([k, label]) => {
    const n = models.filter((m) => statusOf(m) === k).length;
    return h('button', {
      class: 'chip', 'aria-pressed': pressed(ui.status.has(k)),
      onclick: () => {
        if (ui.status.has(k)) ui.status.delete(k);
        else ui.status.add(k);
        renderSidebar();
        renderGrid();
      },
    }, h('span', { class: `dot ${k}` }), `${label} · ${n}`);
  }));
  sidebar.replaceChildren(
    h('div', { class: 'brand' }, h('h1', {}, 'Catalogue des modèles'), h('p', {}, `Archipel · ${fmtInt(models.length)} modèles numérotés`)),
    search,
    h('div', {}, h('p', { class: 'side-title' }, 'Catégories'), nav),
    h('div', {}, h('p', { class: 'side-title' }, 'Statut'), chips),
    h('div', { class: 'side-foot' }, h('button', { class: 'btn ghost', onclick: toggleTheme }, 'Thème clair / sombre')),
  );
}

function setCat(c) {
  ui.cat = c;
  renderSidebar();
  renderGrid();
  scroll.scrollTop = 0;
}

function card(m) {
  const thumb = h('div', { class: 'thumb' }, h('span', { class: 'wait', 'aria-hidden': 'true' }));
  const el = h('button', { class: 'card', 'data-id': m.id, onclick: () => openSheet(m.id), title: `${m.id} · ${m.name}` },
    thumb,
    h('div', { class: 'meta' },
      h('span', { class: 'id mono' }, m.id),
      h('span', { class: `dot ${statusOf(m)}`, title: STATUTS[statusOf(m)] }),
      h('span', { class: 'name' }, m.name)));
  thumbs.watch(thumb, m);
  return el;
}

function renderGrid() {
  const list = models.filter(matches);
  const cat = CATEGORIES.find((c) => c.id === ui.cat);
  topbar.replaceChildren(
    h('h2', {}, cat ? cat.label : 'Tous les modèles'),
    h('span', { class: 'sub' }, `${fmtInt(list.length)} modèle${list.length > 1 ? 's' : ''}${ui.q ? ` pour « ${ui.q} »` : ''}`),
    h('span', { class: 'spacer' }),
  );
  if (!list.length) {
    scroll.replaceChildren(h('div', { class: 'empty' }, h('b', {}, 'Aucun modèle ne correspond.'), 'Essaie un autre mot, ou retire un filtre de statut.'));
    return;
  }
  // « Tous » : une section par catégorie, dans l'ordre du registre
  const groups = ui.cat === 'tous' ? CATEGORIES.map((c) => [c, list.filter((m) => m.category === c.id)]).filter(([, l]) => l.length) : [[cat, list]];
  put(scroll, ...groups.flatMap(([c, l]) => [
    ui.cat === 'tous' ? h('h3', { class: 'section-title' }, `${c.prefix} · ${c.label} (${l.length})`) : null,
    h('div', { class: 'grid' }, ...l.map(card)),
  ]));
}

// ---------------------------------------------------------------------------
// fiche d'un modèle
function seg(label, key, options) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label }, ...options.map(([value, text]) => h('button', {
    'aria-pressed': pressed(viewer.opts[key] === value),
    onclick: (e) => {
      viewer.set(key, value);
      for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false');
      e.currentTarget.setAttribute('aria-pressed', 'true');
    },
  }, text)));
}
function toggle(key, text) {
  return h('div', { class: 'seg' }, h('button', {
    'aria-pressed': pressed(viewer.opts[key]),
    onclick: (e) => {
      viewer.set(key, !viewer.opts[key]);
      e.currentTarget.setAttribute('aria-pressed', pressed(viewer.opts[key]));
    },
  }, text));
}

function ensureViewer() {
  if (viewer) return;
  viewer = new Viewer(stage);
  stage.append(
    h('div', { class: 'toolbar' },
      seg('Lumière', 'light', [['jour', 'Jour'], ['soir', 'Soir'], ['nuit', 'Nuit']]),
      seg('Rendu', 'render', [['jeu', 'Rendu du jeu'], ['brut', 'Rendu brut']]),
      toggle('wire', 'Fil de fer'),
      toggle('bbox', 'Cotes'),
      toggle('scale', 'Silhouette 1,4 m'),
      toggle('rotate', 'Rotation'),
      toggle('anim', 'Animation')),
    h('p', { class: 'hint' }, 'Glisser pour tourner · molette pour zoomer · clic droit pour déplacer · Échap pour fermer'),
  );
}

function openSheet(id, { keepView = false, keepParams = false } = {}) {
  const m = BY_ID.get(id);
  if (!m) return;
  if (ui.open !== id || !keepParams) {
    ui.variant = 0;
    ui.params = defaultParams(m);
  }
  ui.open = id;
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  sheet.hidden = false;
  ensureViewer();
  viewer.start();
  const [item] = viewer.show([{ m, params: ui.params }], { keepView });
  renderInfo(m, item);
}

function closeSheet() {
  sheet.hidden = true;
  viewer?.stop();
  viewer?.clear();
  ui.open = null;
  history.replaceState(null, '', location.pathname + location.search);
}

function paramControl(m, key, spec) {
  const value = paramValue(m, ui.params, key);
  const set = (v) => {
    ui.params = { ...ui.params, [key]: v };
    openSheet(m.id, { keepView: true, keepParams: true });
  };
  let input;
  let out = null;
  if (spec === 'color') input = h('input', { type: 'color', value, onchange: (e) => set(e.target.value), 'aria-label': key });
  else if (spec === 'bool') input = h('input', { type: 'checkbox', checked: !!value, onchange: (e) => set(e.target.checked), 'aria-label': key });
  else if (typeof spec[0] === 'string') input = h('select', { onchange: (e) => set(e.target.value), 'aria-label': key }, ...spec.map((o) => h('option', { value: o, selected: o === value }, o)));
  else {
    const int = Number.isInteger(spec[0]) && Number.isInteger(spec[1]);
    out = h('output', {}, String(value));
    input = h('input', {
      type: 'range', min: spec[0], max: spec[1], step: int ? 1 : (spec[1] - spec[0]) / 40, value, 'aria-label': key,
      oninput: (e) => { out.textContent = e.target.value; },
      onchange: (e) => set(Number(e.target.value)),
    });
  }
  return h('label', { class: 'param' }, h('span', {}, key), input, out || h('span'));
}

function renderInfo(m, item) {
  const s = item.stats;
  const size = viewer.box.getSize(viewer.box.min.clone());
  const cat = CATEGORIES.find((c) => c.id === m.category);
  const variants = m.variants.length
    ? h('div', { class: 'block' }, h('h3', {}, 'Variantes'), h('div', { class: 'variants' }, ...m.variants.map((v, i) => h('button', {
      'aria-pressed': pressed(ui.variant === i),
      onclick: () => {
        ui.variant = i;
        ui.params = { ...v.params };
        openSheet(m.id, { keepView: true, keepParams: true });
      },
    }, v.label))))
    : null;
  const params = Object.keys(m.params).length
    ? h('div', { class: 'block' }, h('h3', {}, 'Paramètres'), ...Object.entries(m.params).map(([k, spec]) => paramControl(m, k, spec)))
    : null;
  put(info,
    h('header', {},
      h('div', { class: 'close-row' },
        h('div', { class: 'idline' }, h('span', { class: 'mono' }, m.id), h('span', { class: 'badge' }, h('span', { class: `dot ${statusOf(m)}` }), STATUTS[statusOf(m)])),
        h('button', { class: 'btn ghost', onclick: closeSheet, 'aria-label': 'Fermer la fiche' }, 'Fermer')),
      h('h2', {}, m.name),
      h('span', { class: 'muted' }, `${cat.prefix} · ${cat.label}`)),
    h('div', { class: 'block' }, h('h3', {}, 'Statistiques'), h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, fmtInt(s.tris)), h('span', {}, 'triangles')),
      h('div', { class: 'stat' }, h('b', {}, fmtInt(s.verts)), h('span', {}, 'sommets')),
      h('div', { class: 'stat' }, h('b', {}, fmtInt(s.mats)), h('span', {}, 'matériaux')),
      h('div', { class: 'stat' }, h('b', {}, fmtInt(s.calls)), h('span', {}, 'appels de dessin')))),
    h('div', { class: 'block' }, h('h3', {}, 'Dimensions'),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Mesurées'), h('dd', { class: 'mono' }, `${fmtMeters(size.x)} × ${fmtMeters(size.y)} × ${fmtMeters(size.z)}`),
        h('dt', {}, 'Déclarées'), h('dd', { class: 'mono' }, m.size.map((v) => fmtMeters(v)).join(' × ')))),
    variants,
    params,
    h('div', { class: 'block' }, h('h3', {}, 'Fiche'),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Source'), h('dd', { class: 'mono' }, m.source),
        h('dt', {}, 'Référence'), h('dd', { class: 'mono' }, m.ref),
        h('dt', {}, 'Utilisé dans'), h('dd', {}, m.usedIn.length ? m.usedIn.join(', ') : h('span', { class: 'muted' }, 'aucune île de l\'archipel pour l\'instant')))),
    m.tags.length ? h('div', { class: 'block' }, h('h3', {}, 'Étiquettes'), h('div', { class: 'tags' }, ...m.tags.map((t) => h('span', { class: 'tag' }, t)))) : null,
  );
}

// ---------------------------------------------------------------------------
// navigation au clavier et par l'adresse (#ARB-001)
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  if (!sheet.hidden && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target === document.body) {
    const list = models.filter(matches);
    const i = list.findIndex((m) => m.id === ui.open);
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    if (next) openSheet(next.id);
  }
});
addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (BY_ID.has(id)) openSheet(id);
  else if (!sheet.hidden) closeSheet();
});

loadTheme();
renderSidebar();
renderGrid();
if (BY_ID.has(location.hash.slice(1))) openSheet(location.hash.slice(1));

// outils de mise au point (captures, tests manuels)
window.__catalogue = { ui, open: openSheet, close: closeSheet, get viewer() { return viewer; }, thumbs };
