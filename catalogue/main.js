// Catalogue des modèles 3D d'Archipel : grille par catégorie (vignettes peintes), recherche et
// filtres, fiche d'un modèle (vue 3D, statistiques, variantes, paramètres, statut et notes),
// comparaison de 2 à 4 modèles, exports, rechargement à chaud des constructeurs.
import '../src/app/setup.js';
import './style.css';
import { h } from '../src/ui/dom.js';
import * as registry from '../src/models/registry.js';
import { Thumbs, sourceText } from './thumbs.js';
import { ligneSource } from './source.js';
import { Viewer } from './viewer.js';
import { fmtInt, fmtMeters, boxOf } from './scene.js';
import { inventory, downloadCSV, downloadJSON, contactSheet } from './exports.js';

// registre courant : remplacé à chaud quand un constructeur change (HMR)
let R = registry;
const ui = { cat: 'tous', q: '', status: new Set(), open: null, params: {}, variant: 0, comparing: false, picks: [], compareOpen: false };
const notes = { map: {}, root: '', online: false };
const statusOf = (m) => notes.map[m.id]?.status || m.status;
const pressed = (b) => (b ? 'true' : 'false');
// remplace les enfants d'un élément en ignorant les blocs absents (null)
const put = (el, ...kids) => el.replaceChildren(...kids.flat().filter(Boolean));
const fmtTime = (iso) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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

let toastT = 0;
function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(el);
  clearTimeout(toastT);
  toastT = setTimeout(() => el.remove(), 2600);
}

// ---------------------------------------------------------------------------
// notes de travail (catalogue/notes.json, via le middleware de dev)
async function loadNotes() {
  try {
    const r = await fetch('/__catalogue/notes');
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('hors du serveur de dev');
    const d = await r.json();
    notes.map = d.notes || {};
    notes.root = d.root || '';
    notes.online = true;
  } catch {
    notes.online = false;
  }
}
async function saveNote(id, patch) {
  const r = await fetch('/__catalogue/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'enregistrement impossible');
  if (d.note) notes.map[id] = d.note;
  else delete notes.map[id];
  return d.note;
}

// ---------------------------------------------------------------------------
// filtres
function matches(m) {
  if (ui.cat !== 'tous' && m.category !== ui.cat) return false;
  if (ui.status.size && !ui.status.has(statusOf(m))) return false;
  if (!ui.q) return true;
  const q = ui.q.toLowerCase();
  return [m.id, m.name, m.slug, ...m.tags, ...m.usedIn, notes.map[m.id]?.note || ''].some((s) => String(s).toLowerCase().includes(q));
}

// ---------------------------------------------------------------------------
// squelette de la page
const app = h('div', { class: 'cat-app' });
const sidebar = h('aside', { class: 'sidebar', 'aria-label': 'Catégories et filtres' });
const main = h('main', { class: 'main' });
const topbar = h('div', { class: 'topbar' });
const scroll = h('div', { class: 'scroll' });
const pickBar = h('div', { class: 'pickbar', hidden: true });
main.append(topbar, scroll, pickBar);
app.append(sidebar, main);
const sheet = h('section', { class: 'sheet', hidden: true, 'aria-label': 'Fiche du modèle' });
const stage = h('div', { class: 'stage' });
const info = h('div', { class: 'info' });
sheet.append(stage, info);
document.getElementById('catalogue').append(app, sheet);

const thumbs = new Thumbs();
let viewer = null;

function renderSidebar() {
  const models = R.MODELS;
  const count = (c) => models.filter((m) => (c === 'tous' || m.category === c) && (!ui.status.size || ui.status.has(statusOf(m)))).length;
  const search = h('input', {
    class: 'search', type: 'search', placeholder: 'id, nom, étiquette, note…', value: ui.q, 'aria-label': 'Rechercher un modèle',
    oninput: (e) => {
      ui.q = e.target.value.trim();
      renderGrid();
    },
  });
  const nav = h('div', { class: 'nav', role: 'list' },
    h('button', { 'aria-pressed': pressed(ui.cat === 'tous'), onclick: () => setCat('tous') }, h('span', {}, 'Tous les modèles'), h('span', { class: 'count' }, fmtInt(count('tous')))),
    ...R.CATEGORIES.map((c) => h('button', { 'aria-pressed': pressed(ui.cat === c.id), onclick: () => setCat(c.id) },
      h('span', {}, h('span', { class: 'prefix mono' }, c.prefix), c.label),
      h('span', { class: 'count' }, fmtInt(count(c.id))))));
  const chips = h('div', { class: 'chips' }, ...Object.entries(R.STATUTS).map(([k, label]) => {
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
  const cat = R.CATEGORIES.find((c) => c.id === ui.cat);
  put(sidebar,
    h('div', { class: 'brand' }, h('h1', {}, 'Catalogue des modèles'), h('p', {}, `Archipel · ${fmtInt(models.length)} modèles numérotés`)),
    search,
    h('div', {}, h('p', { class: 'side-title' }, 'Catégories'), nav),
    h('div', {}, h('p', { class: 'side-title' }, 'Statut'), chips),
    h('div', { class: 'side-foot' },
      h('p', { class: 'side-title' }, 'Exports'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => exportInventory('csv') }, 'Inventaire CSV'),
        h('button', { class: 'btn', onclick: () => exportInventory('json') }, 'JSON')),
      h('button', {
        class: 'btn', disabled: !cat, onclick: exportSheet,
        title: cat ? `Planche contact de la catégorie ${cat.label}` : 'Choisis d\'abord une catégorie',
      }, cat ? `Planche PNG · ${cat.prefix}` : 'Planche PNG (une catégorie)'),
      notes.online ? null : h('p', { class: 'saved' }, 'Notes en lecture seule : lance le serveur de dev (npm run catalogue) pour les modifier.'),
      h('button', { class: 'btn ghost', onclick: toggleTheme }, 'Thème clair / sombre')),
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
  const picked = ui.picks.includes(m.id);
  const el = h('div', { class: 'card', 'data-id': m.id },
    h('button', { class: 'open', onclick: () => (ui.comparing ? togglePick(m.id) : openSheet(m.id)), title: `${m.id} · ${m.name}` },
      thumb,
      h('span', { class: 'meta' },
        h('span', { class: 'id mono' }, m.id),
        h('span', { class: `dot ${statusOf(m)}`, title: R.STATUTS[statusOf(m)] }),
        h('span', { class: 'name' }, m.name))),
    h('button', { class: 'pick', 'aria-pressed': pressed(picked), 'aria-label': `Comparer ${m.id}`, onclick: () => togglePick(m.id) }, picked ? '✓' : '+'));
  thumbs.watch(thumb, m, R.defaultParams(m));
  return el;
}

function renderGrid() {
  const list = R.MODELS.filter(matches);
  const cat = R.CATEGORIES.find((c) => c.id === ui.cat);
  app.classList.toggle('comparing', ui.comparing);
  put(topbar,
    h('h2', {}, cat ? cat.label : 'Tous les modèles'),
    h('span', { class: 'sub' }, `${fmtInt(list.length)} modèle${list.length > 1 ? 's' : ''}${ui.q ? ` pour « ${ui.q} »` : ''}`),
    h('span', { class: 'spacer' }),
    h('button', {
      class: `btn ${ui.comparing ? 'primary' : ''}`, 'aria-pressed': pressed(ui.comparing),
      onclick: () => {
        ui.comparing = !ui.comparing;
        renderGrid();
      },
    }, ui.comparing ? 'Terminer la sélection' : 'Comparer des modèles'),
  );
  renderPickBar();
  if (!list.length) {
    scroll.replaceChildren(h('div', { class: 'empty' }, h('b', {}, 'Aucun modèle ne correspond.'), 'Essaie un autre mot, ou retire un filtre de statut.'));
    return;
  }
  // « Tous » : une section par catégorie, dans l'ordre du registre
  const groups = ui.cat === 'tous' ? R.CATEGORIES.map((c) => [c, list.filter((m) => m.category === c.id)]).filter(([, l]) => l.length) : [[cat, list]];
  put(scroll, ...groups.flatMap(([c, l]) => [
    ui.cat === 'tous' ? h('h3', { class: 'section-title' }, `${c.prefix} · ${c.label} (${l.length})`) : null,
    h('div', { class: 'grid' }, ...l.map(card)),
  ]));
}

// ---------------------------------------------------------------------------
// comparaison (2 à 4 modèles côte à côte, même échelle)
function togglePick(id) {
  const i = ui.picks.indexOf(id);
  if (i >= 0) ui.picks.splice(i, 1);
  else if (ui.picks.length < 4) ui.picks.push(id);
  else toast('Quatre modèles au plus : retires-en un avant.');
  for (const b of scroll.querySelectorAll('.card')) {
    const on = ui.picks.includes(b.dataset.id);
    const p = b.querySelector('.pick');
    p.setAttribute('aria-pressed', pressed(on));
    p.textContent = on ? '✓' : '+';
  }
  renderPickBar();
}

function renderPickBar() {
  pickBar.hidden = !ui.comparing && !ui.picks.length;
  put(pickBar,
    h('span', { class: 'muted' }, ui.picks.length ? 'À comparer :' : 'Choisis 2 à 4 modèles (bouton + sur les cartes)'),
    ...ui.picks.map((id) => h('button', { class: 'chip', onclick: () => togglePick(id), title: 'Retirer' }, h('span', { class: 'mono' }, id), ' ×')),
    h('span', { class: 'spacer' }),
    ui.picks.length ? h('button', { class: 'btn ghost', onclick: () => { ui.picks = []; renderGrid(); } }, 'Vider') : null,
    h('button', { class: 'btn primary', disabled: ui.picks.length < 2, onclick: () => openCompare() }, `Comparer (${ui.picks.length})`),
  );
}

function openCompare({ keepView = false } = {}) {
  const list = ui.picks.map((id) => R.BY_ID.get(id)).filter(Boolean);
  if (list.length < 2) return;
  ui.compareOpen = true;
  ui.open = null;
  history.replaceState(null, '', `#comparer=${list.map((m) => m.id).join(',')}`);
  sheet.hidden = false;
  ensureViewer();
  viewer.start();
  const items = viewer.show(list.map((m) => ({ m, params: R.defaultParams(m) })), { keepView });
  const row = (it) => {
    const s = boxOf(it.holder).getSize(it.holder.position.clone());
    return h('tr', {},
      h('td', { class: 'mono' }, it.m.id),
      h('td', {}, h('button', { class: 'linkish', onclick: () => openSheet(it.m.id) }, it.m.name)),
      h('td', { class: 'num' }, fmtInt(it.stats.tris)),
      h('td', { class: 'num' }, `${fmtMeters(s.x)} × ${fmtMeters(s.y)}`),
      h('td', {}, h('span', { class: `dot ${statusOf(it.m)}`, title: R.STATUTS[statusOf(it.m)] })));
  };
  put(info,
    h('header', {},
      h('div', { class: 'close-row' }, h('span', { class: 'badge' }, `${list.length} modèles`), h('button', { class: 'btn ghost', onclick: closeSheet }, 'Fermer')),
      h('h2', {}, 'Comparaison'),
      h('span', { class: 'muted' }, 'Même échelle, de gauche à droite ; la silhouette mesure 1,4 m.')),
    h('div', { class: 'block' }, h('h3', {}, 'Modèles'),
      h('table', { class: 'cmp' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Id'), h('th', {}, 'Nom'), h('th', { class: 'num' }, 'Triangles'), h('th', { class: 'num' }, 'L × H'), h('th', {}, ''))),
        h('tbody', {}, ...items.map(row)))),
  );
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
      toggle('collisions', 'Collisions'),
      toggle('rotate', 'Rotation'),
      toggle('anim', 'Animation')),
    h('p', { class: 'hint' }, 'Glisser pour tourner · molette pour zoomer · clic droit pour déplacer · ← → modèle voisin · Échap pour fermer'),
  );
}

function openSheet(id, { keepView = false, keepParams = false } = {}) {
  const m = R.BY_ID.get(id);
  if (!m) return;
  if (ui.open !== id || !keepParams) {
    ui.variant = 0;
    ui.params = R.defaultParams(m);
  }
  ui.open = id;
  ui.compareOpen = false;
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
  ui.compareOpen = false;
  history.replaceState(null, '', location.pathname + location.search);
}

function paramControl(m, key, spec) {
  const value = R.paramValue(m, ui.params, key);
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

// ligne du constructeur dans son fichier source, pour ouvrir l'éditeur au bon endroit
async function sourceLine(m) {
  return ligneSource(m, await sourceText(m.source));
}

// statut et remarque (enregistrés dans catalogue/notes.json)
function workBlock(m) {
  const n = notes.map[m.id] || {};
  const saved = h('p', { class: 'saved', 'aria-live': 'polite' }, n.updatedAt ? `Enregistré le ${fmtTime(n.updatedAt)}` : '');
  const persist = async (patch) => {
    saved.textContent = 'Enregistrement…';
    try {
      const note = await saveNote(m.id, patch);
      saved.textContent = note ? `Enregistré le ${fmtTime(note.updatedAt)}` : 'Revenu à l\'état du registre';
      return true;
    } catch (err) {
      saved.textContent = `Échec : ${err.message}`;
      return false;
    }
  };
  const keys = Object.keys(R.STATUTS);
  const status = h('div', { class: 'status-pick', role: 'group', 'aria-label': 'Statut' }, ...keys.map((k) => h('button', {
    class: 'chip', 'aria-pressed': pressed(statusOf(m) === k), disabled: !notes.online,
    onclick: async () => {
      // le statut du registre n'a pas besoin d'être répété dans les notes
      if (await persist({ status: k === m.status ? null : k })) {
        [...status.children].forEach((b, i) => b.setAttribute('aria-pressed', pressed(keys[i] === k)));
        refreshStatus(m);
      }
    },
  }, h('span', { class: `dot ${k}` }), R.STATUTS[k])));
  let timer = 0;
  const area = h('textarea', {
    placeholder: notes.online ? 'Ce qui va, ce qui cloche, la prochaine retouche…' : 'Notes en lecture seule hors du serveur de dev',
    readonly: !notes.online, 'aria-label': 'Notes de travail',
    oninput: (e) => {
      clearTimeout(timer);
      saved.textContent = 'Modifié…';
      timer = setTimeout(() => persist({ note: e.target.value }), 700);
    },
  });
  area.value = n.note || '';
  return h('div', { class: 'block notes' }, h('h3', {}, 'Statut et notes'), status, area, saved);
}

function refreshStatus(m) {
  const st = statusOf(m);
  const badge = info.querySelector('.badge');
  if (badge) badge.replaceChildren(h('span', { class: `dot ${st}` }), R.STATUTS[st]);
  const dot = scroll.querySelector(`.card[data-id="${m.id}"] .meta .dot`);
  if (dot) {
    dot.className = `dot ${st}`;
    dot.title = R.STATUTS[st];
  }
  renderSidebar();
}

function renderInfo(m, item) {
  const s = item.stats;
  const size = viewer.box.getSize(viewer.box.min.clone());
  const cat = R.CATEGORIES.find((c) => c.id === m.category);
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
  const source = h('a', { class: 'btn', href: notes.root ? `vscode://file/${notes.root}/${m.source}` : undefined, title: notes.root ? 'Ouvrir le constructeur dans VS Code' : 'Disponible avec le serveur de dev' }, 'Ouvrir la source');
  if (notes.root) sourceLine(m).then((line) => { source.href = `vscode://file/${notes.root}/${m.source}:${line}`; });
  put(info,
    h('header', {},
      h('div', { class: 'close-row' },
        h('div', { class: 'idline' }, h('span', { class: 'mono' }, m.id), h('span', { class: 'badge' }, h('span', { class: `dot ${statusOf(m)}` }), R.STATUTS[statusOf(m)])),
        h('button', { class: 'btn ghost', onclick: closeSheet, 'aria-label': 'Fermer la fiche' }, 'Fermer')),
      h('h2', {}, m.name),
      h('span', { class: 'muted' }, `${cat.prefix} · ${cat.label}`),
      h('div', { class: 'row' },
        h('button', {
          class: 'btn',
          onclick: async () => {
            try {
              await navigator.clipboard.writeText(m.id);
              toast(`${m.id} copié`);
            } catch {
              toast(`Copie impossible : ${m.id}`);
            }
          },
        }, 'Copier l\'id'),
        source)),
    workBlock(m),
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
// exports
async function exportInventory(kind) {
  toast('Inventaire en cours…');
  const rows = await inventory(R.MODELS, statusOf, R.defaultParams, (i, n) => toast(`Inventaire : ${i} / ${n}`));
  if (kind === 'csv') downloadCSV(rows);
  else downloadJSON(rows);
  toast(`Inventaire de ${rows.length} modèles exporté`);
}

async function exportSheet() {
  const cat = R.CATEGORIES.find((c) => c.id === ui.cat);
  if (!cat) return;
  toast(`Planche ${cat.prefix} en cours…`);
  const list = R.MODELS.filter((m) => m.category === cat.id);
  await contactSheet(list, thumbs, `${cat.prefix} · ${cat.label}`, R.defaultParams, `planche-${cat.prefix.toLowerCase()}`);
  toast(`Planche ${cat.prefix} enregistrée`);
}

// ---------------------------------------------------------------------------
// navigation au clavier et par l'adresse (#ARB-001, #comparer=ARB-001,ARB-004)
function fromHash() {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('comparer=')) {
    ui.picks = hash.slice(9).split(',').filter((id) => R.BY_ID.has(id)).slice(0, 4);
    renderPickBar();
    openCompare();
  } else if (R.BY_ID.has(hash)) openSheet(hash);
  else if (!sheet.hidden) closeSheet();
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  if (ui.open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target === document.body) {
    const list = R.MODELS.filter(matches);
    const i = list.findIndex((m) => m.id === ui.open);
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    if (next) openSheet(next.id);
  }
});
addEventListener('hashchange', fromHash);

// rechargement à chaud : modifier un constructeur met à jour la fiche et les vignettes
if (import.meta.hot) {
  import.meta.hot.accept('../src/models/registry.js', (mod) => {
    if (!mod) return;
    R = mod;
    thumbs.invalidate();
    renderSidebar();
    renderGrid();
    if (ui.compareOpen) openCompare({ keepView: true });
    else if (ui.open) openSheet(ui.open, { keepView: true, keepParams: true });
    toast('Modèles rechargés');
  });
}

loadTheme();
renderSidebar();
renderGrid();
loadNotes().then(() => {
  renderSidebar();
  renderGrid();
  fromHash();
});

// outils de mise au point (captures, tests manuels)
window.__catalogue = { ui, notes, open: openSheet, compare: openCompare, close: closeSheet, get viewer() { return viewer; }, thumbs, exportSheet };
