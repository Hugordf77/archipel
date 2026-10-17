import { h, fmtClock, fmtMinutes, replay } from './dom.js';
import { ICON, pieceIcon } from './icons.js';
import { SPECIES, SUBJECT_COLORS, uid, speciesWithArticle } from '../game/state.js';
import { CATALOG, CATALOG_ORDER } from '../game/decor.js';
import { PIECES, STARTER, CLOTH_COLORS, SLOT_NAMES } from '../game/avatar.js';
import { ACC_COLORS } from './mirrorPanel.js';

const shellIcon = () => h('span', { class: 'icon', html: ICON.shell });

function stepper(value, { min, max, step, unit, onChange }) {
  let v = value;
  const val = h('span', { class: 'val' }, `${v} ${unit}`);
  const set = (nv) => {
    v = Math.max(min, Math.min(max, nv));
    val.textContent = `${v} ${unit}`;
    replay(val, 'squish');
    onChange(v);
  };
  return h('div', { class: 'stepper' },
    h('button', { 'aria-label': 'moins', onclick: () => set(v - step) }, '−'),
    val,
    h('button', { 'aria-label': 'plus', onclick: () => set(v + step) }, '+'));
}

// ---------------------------------------------------------------------------
// Préparation d'une session : matière + durées
// ---------------------------------------------------------------------------
export function openFocusPanel(game) {
  const st = game.state;
  const s = st.settings;
  let selected = st.subjects.find((x) => x.id === s.lastSubjectId && !x.archived) || st.subjects.find((x) => !x.archived);
  let total = game.focusTotal;

  const chips = h('div', { class: 'chips' });
  const plantInfo = h('p', { class: 'muted plant-info' });
  const renderChips = () => {
    chips.replaceChildren(
      ...st.subjects.filter((x) => !x.archived).map((sub) =>
        h('button', {
          class: `chip ${selected && sub.id === selected.id ? 'selected' : ''}`,
          style: { '--chip': `${sub.color}55`, '--dot': sub.color },
          onclick: () => {
            selected = sub;
            renderChips();
            game.audio?.pop(1.1);
          },
        }, h('span', { class: 'dot' }), `${SPECIES[sub.species]?.emoji || '🌱'} ${sub.name}`)),
      h('button', { class: 'chip add', onclick: () => { form.classList.toggle('hidden'); nameIn.focus(); } }, h('span', { class: 'icon', html: ICON.plus }), 'Nouvelle matière'),
    );
    if (selected) {
      plantInfo.innerHTML = `Chaque session de <b>${selected.name}</b> fait pousser <b>${speciesWithArticle(selected.species)}</b> ${SPECIES[selected.species].emoji} sur l'île.`;
    }
  };

  // formulaire d'ajout de matière
  let newColor = SUBJECT_COLORS[st.subjects.length % SUBJECT_COLORS.length];
  const usedSpecies = new Set(st.subjects.map((x) => x.species));
  let newSpecies = Object.keys(SPECIES).find((k) => !usedSpecies.has(k)) || 'tulipe';
  const nameIn = h('input', { type: 'text', placeholder: 'Histoire, Piano, Code…', maxlength: 28 });
  const colorRow = h('div', { class: 'row color-row' });
  const speciesRow = h('div', { class: 'chips species-row' });
  const renderForm = () => {
    colorRow.replaceChildren(...SUBJECT_COLORS.map((c) => h('button', {
      class: `color-dot ${c === newColor ? 'selected' : ''}`, style: { background: c }, 'aria-label': c,
      onclick: () => { newColor = c; renderForm(); },
    })));
    speciesRow.replaceChildren(...Object.entries(SPECIES).map(([k, sp]) => h('button', {
      class: `chip small ${k === newSpecies ? 'selected' : ''}`, title: sp.name,
      onclick: () => { newSpecies = k; renderForm(); },
    }, `${sp.emoji} ${sp.name}`)));
  };
  const addSubject = () => {
    const name = nameIn.value.trim();
    if (!name) {
      replay(nameIn, 'squish');
      return;
    }
    const sub = { id: uid('sub'), name, color: newColor, species: newSpecies, createdAt: Date.now(), archived: false };
    st.subjects.push(sub);
    selected = sub;
    nameIn.value = '';
    form.classList.add('hidden');
    game.markDirty();
    renderChips();
    game.audio?.pop(1.3);
  };
  nameIn.addEventListener('keydown', (e) => e.key === 'Enter' && addSubject());
  const form = h('div', { class: 'subject-form hidden stack' },
    h('div', { class: 'section-label' }, 'Nouvelle matière'),
    nameIn,
    h('div', { class: 'muted' }, 'Sa couleur'), colorRow,
    h('div', { class: 'muted' }, 'Sa plante'), speciesRow,
    h('div', { class: 'row' }, h('button', { class: 'btn primary small', onclick: addSubject }, 'Ajouter'),
      h('button', { class: 'btn ghost small', onclick: () => form.classList.add('hidden') }, 'Annuler')));
  renderForm();
  renderChips();

  const totalBox = h('input', { type: 'checkbox', checked: total || undefined, onchange: (e) => { total = e.target.checked; } });
  const longBox = h('input', { type: 'checkbox', checked: s.longBreakEvery > 0 || undefined, onchange: (e) => { s.longBreakEvery = e.target.checked ? 4 : 0; game.markDirty(); } });

  const start = () => {
    if (!selected) {
      game.ui.toast("Choisis d'abord une matière.", { icon: 'book' });
      return;
    }
    s.lastSubjectId = selected.id;
    game.focusTotal = total;
    game.ui.closePanel(true);
    game.startFocus(selected.id, s.focusMin, s.breakMin);
  };

  const body = h('div', { class: 'stack focus-setup' },
    h('div', { class: 'section-label' }, 'Matière'),
    chips,
    form,
    plantInfo,
    h('div', { class: 'section-label' }, 'Durées'),
    h('div', { class: 'row durations' },
      h('div', { class: 'stack dur' }, h('span', { class: 'muted' }, 'Concentration'),
        stepper(s.focusMin, { min: 5, max: 120, step: 5, unit: 'min', onChange: (v) => { s.focusMin = v; game.markDirty(); } })),
      h('div', { class: 'stack dur' }, h('span', { class: 'muted' }, 'Pause'),
        stepper(s.breakMin, { min: 1, max: 30, step: 1, unit: 'min', onChange: (v) => { s.breakMin = v; game.markDirty(); } }))),
    h('label', { class: 'check' }, longBox, h('span', {}, `Pause longue de ${s.longBreakMin} min toutes les 4 sessions`)),
    h('label', { class: 'check' }, totalBox, h('span', {}, 'Focus total : n\'afficher que le minuteur (touche T)')),
    h('div', { class: 'row spread start-row' },
      h('span', { class: 'muted' }, 'Astuce : F relance une session directement.'),
      h('button', { class: 'btn primary big-start', onclick: start }, h('span', { class: 'icon', html: ICON.play }), 'Commencer')),
  );
  game.ui.openPanel(body, { title: 'Session de révision', icon: 'book', className: 'focus-panel' });
}

// ---------------------------------------------------------------------------
// Minuteur discret pendant le focus et la pause
// ---------------------------------------------------------------------------
export class FocusHud {
  constructor(game) {
    this.game = game;
    const root = game.ui.focusHud;
    this.root = root;
    this.dot = h('span', { class: 'dot' });
    this.subject = h('b', {}, '');
    this.phase = h('span', { class: 'phase' }, '');
    this.timer = h('div', { class: 'timer' }, '00:00');
    this.bar = h('span', {});
    this.pauseBtn = h('button', { class: 'btn small', onclick: () => game.togglePause() }, h('span', { class: 'icon', html: ICON.pause }), 'Pause');
    this.stopBtn = h('button', { class: 'btn small ghost', onclick: () => game.askStopFocus() }, 'Terminer');
    this.totalBtn = h('button', { class: 'btn small ghost', onclick: () => game.toggleFocusTotal() }, 'Focus total (T)');
    this.skipBtn = h('button', { class: 'btn small primary', onclick: () => game.quickFocus() }, 'Reprendre maintenant (F)');
    this.endBreakBtn = h('button', { class: 'btn small ghost', onclick: () => game.skipBreak() }, 'Passer la pause');
    this.card = h('div', { class: 'focus-card paper' },
      h('div', { class: 'row focus-head' }, this.dot, this.subject, this.phase),
      this.timer,
      h('div', { class: 'pencil-bar' }, this.bar),
      h('div', { class: 'row focus-actions' }, this.pauseBtn, this.stopBtn, this.totalBtn, this.skipBtn, this.endBreakBtn));
    this.big = h('div', { class: 'focus-total-timer' }, '00:00');
    this.bigSub = h('div', { class: 'focus-total-sub' }, '');
    this.totalLayer = h('div', { class: 'focus-total hidden' }, this.big, this.bigSub);
    root.replaceChildren(this.card, this.totalLayer);
    this.lastText = '';
  }

  show(phase) {
    this.root.classList.remove('hidden');
    this.root.dataset.phase = phase;
    const inFocus = phase === 'focus';
    this.pauseBtn.classList.toggle('hidden', !inFocus);
    this.stopBtn.classList.toggle('hidden', !inFocus);
    this.totalBtn.classList.toggle('hidden', !inFocus);
    this.skipBtn.classList.toggle('hidden', inFocus);
    this.endBreakBtn.classList.toggle('hidden', inFocus);
    replay(this.card, 'drop-in');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  setTotal(on) {
    this.totalLayer.classList.toggle('hidden', !on);
    this.card.classList.toggle('hidden', on);
  }

  update(pomo, subject) {
    const ms = pomo.remaining();
    const text = fmtClock(ms);
    if (text !== this.lastText) {
      this.timer.textContent = text;
      this.big.textContent = text;
      this.lastText = text;
    }
    const p = Math.max(0, Math.min(1, pomo.progress()));
    this.bar.style.width = `${(p * 100).toFixed(2)}%`;
    if (subject) {
      this.dot.style.background = subject.color;
      this.subject.textContent = subject.name;
    }
    const ph = pomo.phase;
    const label = ph === 'focus' ? (pomo.paused ? 'en pause' : 'concentration') : ph === 'break' ? (pomo.s.kind === 'long' ? 'grande pause' : 'pause') : '';
    if (this.phase.textContent !== label) this.phase.textContent = label;
    this.bigSub.textContent = subject ? `${subject.name}${pomo.paused ? ' · en pause' : ''}` : '';
    this.pauseBtn.innerHTML = pomo.paused ? `<span class="icon">${ICON.play}</span>Reprendre` : `<span class="icon">${ICON.pause}</span>Pause`;
  }
}

// ---------------------------------------------------------------------------
// Carte de récompense en fin de session
// ---------------------------------------------------------------------------
export function openRewardCard(game, sum) {
  const sp = SPECIES[sum.subject?.species] || SPECIES.tulipe;
  const lines = [
    h('li', {}, shellIcon(), h('span', {}, h('b', {}, `+${sum.shells} coquillages`), sum.bonus ? ` (dont +${sum.bonus} pour ta série)` : '')),
  ];
  if (sum.plant) {
    const art = speciesWithArticle(sum.subject?.species);
    lines.push(h('li', {}, h('span', { class: 'emoji' }, sp.emoji), h('span', {}, `${art[0].toUpperCase()}${art.slice(1)} a été planté${sp.f ? 'e' : ''} ${sum.plotInGarden ? 'dans le potager' : 'sur l\'île'}.`)));
  } else if (sum.noRoom) {
    lines.push(h('li', {}, h('span', { class: 'emoji' }, '🌱'), h('span', {}, 'L\'île est pleine de plantes : bravo !')));
  }
  if (sum.streak > 0) lines.push(h('li', {}, h('span', { class: 'icon', html: ICON.flame }), h('span', {}, `${sum.streak} jour${sum.streak > 1 ? 's' : ''} d'affilée`)));
  if (sum.todayMin) lines.push(h('li', {}, h('span', { class: 'icon', html: ICON.clock }), h('span', {}, `${fmtMinutes(sum.todayMin)} de travail aujourd'hui`)));

  const stamp = h('div', { class: 'stamp stamp-in reward-stamp' }, sum.partial ? 'Bien joué' : 'Session terminée');
  const breakMin = sum.breakMin;
  const body = h('div', { class: 'stack reward' },
    stamp,
    h('p', { class: 'reward-title' }, `${fmtMinutes(sum.minutes)} de ${sum.subject?.name || 'révision'}`),
    sum.partial ? h('p', { class: 'muted' }, 'Session écourtée : tout ce que tu as fait compte quand même.') : null,
    h('ul', { class: 'reward-list' }, ...lines),
    h('div', { class: 'row spread' },
      h('button', { class: 'btn', onclick: () => { game.ui.closePanel(); game.quickFocus(); } }, 'Enchaîner une session'),
      h('button', { class: 'btn primary', onclick: () => game.ui.closePanel() }, breakMin ? `Profiter de la pause (${breakMin} min)` : 'Continuer')),
  );
  game.ui.openPanel(body, { className: 'reward-panel' });
}

// ---------------------------------------------------------------------------
// Échoppe : acheter puis poser des décorations
// ---------------------------------------------------------------------------
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
