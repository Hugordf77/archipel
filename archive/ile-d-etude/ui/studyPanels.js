import { h, replay, fmtMinutes } from './dom.js';
import { ICON, ILLU } from './icons.js';
import { SPECIES, todayKey, dayKeyOf } from '../game/state.js';
import { GRADES, newCard, reviewCard, dueCards, buildQueue, logReview, masteryLevel, formatDue, nextDue } from '../game/flashcards.js';
import { newTask, visibleTasks } from '../game/tasks.js';
import { minutesByDay, minutesBySubject, totalMinutes, todayMinutes, streak, bestStreak, shiftDay } from '../game/stats.js';
import { growthOf, stageOf } from '../game/plants.js';
import { KINDS } from '../game/collectibles.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const OWL_GOOD = ['Hou hou, bravo !', 'Excellente mémoire !', 'Parfait, on la reverra plus tard.', 'Tu progresses à vue de plume !', 'Superbe !'];
const OWL_SOFT = ['Pas grave, on la reverra tout à l\'heure.', 'Elle reviendra bientôt, sans pression.', 'C\'est en se trompant qu\'on retient.'];

function subjectChips(subjects, selectedId, onPick, { allowAll = false } = {}) {
  const wrap = h('div', { class: 'chips' });
  const render = () => {
    wrap.replaceChildren(
      ...(allowAll ? [h('button', { class: `chip ${!selectedId ? 'selected' : ''}`, onclick: () => { selectedId = null; render(); onPick(null); } }, 'Toutes')] : []),
      ...subjects.filter((s) => !s.archived).map((s) => h('button', {
        class: `chip ${s.id === selectedId ? 'selected' : ''}`,
        style: { '--chip': `${s.color}55`, '--dot': s.color },
        onclick: () => { selectedId = s.id; render(); onPick(s.id); },
      }, h('span', { class: 'dot' }), s.name)),
    );
  };
  render();
  return wrap;
}

// ===========================================================================
// Bibliothèque du hibou : fiches et répétition espacée
// ===========================================================================
export function openCardsPanel(game, tab = null) {
  const st = game.state;
  const bubble = h('div', { class: 'owl-say' }, '');
  const owlLine = h('div', { class: 'owl-line' }, h('span', { class: 'icon owl-ic', html: ICON.owl }), bubble);
  const say = (t) => {
    bubble.textContent = t;
    replay(bubble, 'pop');
  };
  const tabsEl = h('div', { class: 'tabs' });
  const content = h('div', { class: 'tab-content' });
  let keyHandler = null;
  const setKeys = (fn) => {
    if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
    keyHandler = fn;
    if (fn) window.addEventListener('keydown', fn, true);
  };

  const totalDue = () => dueCards(st.cards).length;
  if (!tab) tab = 'review';

  const renderTabs = () => {
    const t = (id, label) => h('button', { class: `tab ${tab === id ? 'active' : ''}`, onclick: () => { tab = id; render(); } }, label);
    tabsEl.replaceChildren(t('review', `Réviser${totalDue() ? ` (${totalDue()})` : ''}`), t('list', `Mes fiches (${st.cards.length})`), t('new', 'Nouvelle fiche'));
  };

  // --- onglet : réviser ---
  const renderReview = () => {
    const due = totalDue();
    if (!st.cards.length) {
      say('Hou hou ! Écris tes premières fiches, je te les ferai réviser au bon moment.');
      return h('div', { class: 'empty-state' },
        h('div', { class: 'illu', html: ILLU.hibou }),
        h('p', {}, 'Tes fiches t\'attendent ici. Une question au recto, la réponse au verso : je m\'occupe de te les ressortir juste avant que tu les oublies.'),
        h('button', { class: 'btn primary', onclick: () => { tab = 'new'; render(); } }, h('span', { class: 'icon', html: ICON.plus }), 'Écrire ma première fiche'));
    }
    if (!due) {
      const nd = nextDue(st.cards);
      say('Tout est à jour, bravo ! Les fiches reviennent juste avant d\'être oubliées.');
      return h('div', { class: 'stack' }, h('p', {}, 'Rien à réviser pour le moment.'),
        nd ? h('p', { class: 'muted' }, `Prochaine fiche : ${formatDue(nd)}.`) : null);
    }
    say(`${due} fiche${due > 1 ? 's' : ''} t'attend${due > 1 ? 'ent' : ''}. On y va ?`);
    const rows = st.subjects.filter((s) => !s.archived).map((s) => {
      const n = dueCards(st.cards, s.id).length;
      const total = st.cards.filter((c) => c.subjectId === s.id).length;
      if (!total) return null;
      return h('div', { class: 'deck-row' },
        h('span', { class: 'dot', style: { background: s.color } }),
        h('b', {}, s.name),
        h('span', { class: 'muted' }, `${n} à revoir · ${total} fiche${total > 1 ? 's' : ''}`),
        h('button', { class: 'btn small', disabled: n ? undefined : true, onclick: () => startReview(s.id) }, 'Réviser'));
    });
    return h('div', { class: 'stack' }, ...rows,
      h('div', { class: 'row spread' }, h('span', { class: 'muted' }, 'Chaque bonne réponse rapporte des coquillages.'),
        h('button', { class: 'btn primary', onclick: () => startReview(null) }, h('span', { class: 'icon', html: ICON.play }), `Tout réviser (${Math.min(20, due)})`)));
  };

  // --- session de révision (carte qui se retourne) ---
  const startReview = (subjectId) => {
    const queue = buildQueue(st.cards, subjectId);
    if (!queue.length) return;
    const total = queue.length;
    let done = 0;
    let correct = 0;
    let earned = 0;
    let flipped = false;
    tabsEl.classList.add('hidden');
    const counter = h('div', { class: 'review-count' });
    const front = h('div', { class: 'card-face front' });
    const back = h('div', { class: 'card-face back' });
    const card = h('div', { class: 'index-card' }, h('div', { class: 'card-inner' }, front, back));
    const actions = h('div', { class: 'row review-actions' });
    const view = h('div', { class: 'stack review' }, counter, card, actions);
    content.replaceChildren(view);
    say('Lis la question, réponds dans ta tête, puis retourne la fiche.');

    const show = () => {
      const c = queue[0];
      const sub = st.subjects.find((s) => s.id === c.subjectId);
      counter.innerHTML = `<span class="dot" style="background:${sub?.color || '#ccc'}"></span> ${sub?.name || ''} · fiche ${done + 1} / ${Math.max(total, done + queue.length)}`;
      front.textContent = c.front;
      back.textContent = c.back;
      flipped = false;
      card.classList.remove('flipped');
      replay(card, 'drop-in');
      actions.replaceChildren(h('button', { class: 'btn primary', onclick: flip }, 'Retourner', h('span', { class: 'keycap' }, 'Espace')));
    };
    const flip = () => {
      if (flipped) return;
      flipped = true;
      card.classList.add('flipped');
      game.audio?.pop(0.9);
      actions.replaceChildren(...GRADES.map((g) => h('button', { class: `btn ${g.tone}`, onclick: () => grade(g.q) }, g.label, h('span', { class: 'keycap' }, g.key))));
    };
    const grade = (q) => {
      const c = queue.shift();
      reviewCard(c, q);
      logReview(st, q >= 3);
      if (q >= 3) {
        done += 1;
        correct += 1;
        const bonus = q === 5 ? 2 : 1;
        earned += bonus;
        game.addShells(bonus, 'fiche');
        if (q >= 4) game.owl.cheer();
        say(pick(OWL_GOOD));
      } else {
        // on la reverra un peu plus loin dans la même séance
        queue.splice(Math.min(3, queue.length), 0, c);
        say(pick(OWL_SOFT));
        game.audio?.pop(0.6);
      }
      game.markDirty();
      if (!queue.length) finish();
      else show();
    };
    const finish = () => {
      setKeys(null);
      tabsEl.classList.remove('hidden');
      game.owl.cheer();
      game.audio?.chime('soft');
      say('Hou hou ! Ta mémoire te dit merci.');
      content.replaceChildren(h('div', { class: 'stack reward' },
        h('div', { class: 'stamp stamp-in' }, 'Révision terminée'),
        h('p', { class: 'reward-title' }, `${correct} fiche${correct > 1 ? 's' : ''} retenue${correct > 1 ? 's' : ''}`),
        h('p', {}, h('span', { class: 'icon', html: ICON.shell }), ` +${earned} coquillages`),
        h('button', { class: 'btn primary', onclick: () => { tab = 'review'; render(); } }, 'Retour à la bibliothèque')));
      renderTabs();
    };
    setKeys((e) => {
      if (!game.ui.panelOpen) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!flipped) flip();
      } else if (flipped && ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        grade(GRADES[Number(e.code.slice(-1)) - 1].q);
      }
    });
    show();
  };

  // --- onglet : mes fiches ---
  let filter = null;
  let search = '';
  const renderList = () => {
    say('Voici ta collection de fiches. Tu peux les modifier quand tu veux.');
    const list = h('div', { class: 'card-list' });
    const fill = () => {
      const cards = st.cards.filter((c) => (!filter || c.subjectId === filter) && (!search || `${c.front} ${c.back}`.toLowerCase().includes(search)));
      list.replaceChildren(...(cards.length ? cards.map((c) => cardRow(c)) : [h('p', { class: 'muted' }, 'Aucune fiche ici.')]));
    };
    const cardRow = (c) => {
      const sub = st.subjects.find((s) => s.id === c.subjectId);
      const lvl = masteryLevel(c);
      let confirmDel = false;
      const row = h('div', { class: 'card-row' },
        h('span', { class: 'dot', style: { background: sub?.color || '#ccc' } }),
        h('div', { class: 'card-text' }, h('b', {}, c.front), h('span', { class: 'muted' }, c.back)),
        h('span', { class: 'mastery', title: `Maîtrise ${lvl}/4` }, '●'.repeat(lvl) + '○'.repeat(4 - lvl)),
        h('span', { class: 'muted due' }, formatDue(c.due)),
        h('button', { class: 'btn small ghost', onclick: () => edit() }, 'Modifier'),
        h('button', {
          class: 'btn small ghost', onclick: (e) => {
            if (!confirmDel) {
              confirmDel = true;
              e.target.textContent = 'Sûr ?';
              return;
            }
            st.cards = st.cards.filter((x) => x.id !== c.id);
            game.markDirty();
            fill();
            renderTabs();
          },
        }, 'Supprimer'));
      const edit = () => {
        const f = h('textarea', { rows: 2 }, c.front);
        const b = h('textarea', { rows: 2 }, c.back);
        row.replaceWith(h('div', { class: 'card-row editing stack' }, f, b,
          h('div', { class: 'row' }, h('button', {
            class: 'btn small primary', onclick: () => {
              c.front = f.value.trim() || c.front;
              c.back = b.value.trim() || c.back;
              game.markDirty();
              fill();
            },
          }, 'Enregistrer'), h('button', { class: 'btn small ghost', onclick: fill }, 'Annuler'))));
      };
      return row;
    };
    const searchIn = h('input', { type: 'text', placeholder: 'Chercher une fiche…', oninput: (e) => { search = e.target.value.toLowerCase(); fill(); } });
    fill();
    return h('div', { class: 'stack' }, subjectChips(st.subjects, filter, (id) => { filter = id; fill(); }, { allowAll: true }), searchIn, list);
  };

  // --- onglet : nouvelle fiche ---
  let newSubject = st.settings.lastSubjectId;
  const renderNew = () => {
    say('Une fiche, une idée. Formule la question comme tu aimerais qu\'on te la pose !');
    const frontIn = h('textarea', { rows: 3, placeholder: 'Recto : la question (ex. « Capitale de l\'Australie ? »)' });
    const backIn = h('textarea', { rows: 3, placeholder: 'Verso : la réponse (ex. « Canberra »)' });
    const msg = h('p', { class: 'muted' }, '');
    const add = () => {
      const f = frontIn.value.trim();
      const b = backIn.value.trim();
      if (!f || !b) {
        replay(!f ? frontIn : backIn, 'squish');
        return;
      }
      const sub = newSubject || st.subjects.find((s) => !s.archived)?.id;
      st.cards.push(newCard(sub, f, b));
      game.markDirty();
      frontIn.value = '';
      backIn.value = '';
      frontIn.focus();
      const n = st.cards.filter((c) => c.subjectId === sub).length;
      msg.textContent = `Fiche ajoutée ! (${n} dans cette matière)`;
      replay(msg, 'pop');
      game.audio?.pop(1.2);
      renderTabs();
    };
    backIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add();
    });
    return h('div', { class: 'stack' },
      subjectChips(st.subjects, newSubject, (id) => { newSubject = id; }),
      frontIn, backIn,
      h('div', { class: 'row spread' }, msg, h('button', { class: 'btn primary', onclick: add }, h('span', { class: 'icon', html: ICON.plus }), 'Ajouter la fiche')),
      h('p', { class: 'muted' }, 'Astuce : Ctrl + Entrée ajoute la fiche et en commence une nouvelle.'));
  };

  const render = () => {
    setKeys(null);
    tabsEl.classList.remove('hidden');
    renderTabs();
    content.replaceChildren(tab === 'review' ? renderReview() : tab === 'list' ? renderList() : renderNew());
  };
  render();
  game.ui.openPanel(h('div', { class: 'stack cards-panel' }, owlLine, tabsEl, content), {
    title: 'La bibliothèque du hibou', className: 'wide', onClose: () => setKeys(null),
  });
}

// ===========================================================================
// Tâches du jour (bouteilles à la mer)
// ===========================================================================
export function openTasksPanel(game, focusId = null) {
  const st = game.state;
  const list = h('div', { class: 'task-list' });
  const input = h('input', { type: 'text', placeholder: 'Nouvelle tâche du jour…', maxlength: 120 });
  const render = () => {
    const tasks = visibleTasks(st.tasks).sort((a, b) => (!!a.doneAt - !!b.doneAt) || a.createdAt - b.createdAt);
    if (!tasks.length) {
      list.replaceChildren(h('div', { class: 'empty-state' },
        h('div', { class: 'illu', html: ILLU.bouteille }),
        h('p', {}, 'Aucune bouteille sur la plage. Écris ce que tu veux faire aujourd\'hui : chaque tâche arrivera par la mer.')));
      return;
    }
    list.replaceChildren(...tasks.map((t) => {
      const row = h('div', { class: `task-row ${t.doneAt ? 'done' : ''} ${t.id === focusId ? 'focus' : ''}` },
        h('button', {
          class: 'task-check', 'aria-label': t.doneAt ? 'Décocher' : 'Cocher',
          onclick: () => {
            if (t.doneAt) {
              t.doneAt = null;
              game.bottles.sync(t.id);
            } else {
              t.doneAt = Date.now();
              game.bottles.sendAway(t.id);
              game.addShells(2, 'tache');
              game.character.bounce(1);
              game.ui.toast('La bouteille repart au large… Bien joué !', { icon: 'bottle' });
            }
            game.markDirty();
            game.audio?.pop(t.doneAt ? 1.3 : 0.8);
            render();
          },
        }, t.doneAt ? h('span', { class: 'icon', html: ICON.stamp }) : ''),
        h('span', { class: 'task-text' }, t.text),
        t.doneAt ? h('span', { class: 'stamp small-stamp' }, 'Fait !') : null,
        h('button', {
          class: 'btn small ghost task-del', 'aria-label': 'Supprimer',
          onclick: () => {
            st.tasks = st.tasks.filter((x) => x.id !== t.id);
            game.bottles.sync();
            game.markDirty();
            render();
          },
        }, '×'));
      return row;
    }));
    const f = list.querySelector('.task-row.focus');
    if (f) {
      f.scrollIntoView({ block: 'center' });
      replay(f, 'squish');
    }
  };
  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    const t = newTask(text);
    st.tasks.push(t);
    input.value = '';
    game.bottles.sync(t.id);
    game.markDirty();
    game.audio?.pop(1.1);
    render();
    game.ui.toast('Une bouteille dérive vers la plage…', { icon: 'bottle' });
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && add());
  render();
  const body = h('div', { class: 'stack tasks-panel' },
    h('div', { class: 'row add-task' }, input, h('button', { class: 'btn primary', onclick: add }, 'Ajouter')),
    list,
    h('p', { class: 'muted' }, 'Chaque tâche arrive dans une bouteille sur la plage. Coche-la : la bouteille repart au large (+2 coquillages). Ce qui n\'est pas fait attend tranquillement demain.'));
  game.ui.openPanel(body, { title: 'Tâches du jour', icon: 'bottle', className: 'scroll-paper' });
  setTimeout(() => input.focus(), 60);
}

// ===========================================================================
// Journal : carnet relié
// ===========================================================================
// « YYYY-MM-DD » → date locale (new Date('YYYY-MM-DD') serait interprété en UTC)
function localDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function openJournalPanel(game) {
  const st = game.state;
  let tab = 'resume';
  let month = new Date();
  month.setDate(1);
  let selectedDay = todayKey();
  const left = h('div', { class: 'nb-page left' });
  const right = h('div', { class: 'nb-page right' });
  const ribbons = h('div', { class: 'nb-ribbons' });

  const renderRibbons = () => {
    const r = (id, label, color) => h('button', { class: `ribbon ${tab === id ? 'active' : ''}`, style: { '--rb': color }, onclick: () => { tab = id; render(); } }, label);
    ribbons.replaceChildren(r('resume', 'Résumé', '#f4a28c'), r('calendrier', 'Calendrier', '#9fdcc8'), r('collection', 'Collection', '#c7b2e6'));
  };

  const stat = (icon, label, value) => h('div', { class: 'stat' }, h('span', { class: 'icon', html: ICON[icon] }), h('span', { class: 'stat-label' }, label), h('b', {}, value));

  const renderResume = () => {
    const sessions = st.sessions;
    if (!sessions.length) {
      // carnet tout neuf : une invitation plutôt qu'une colonne de zéros
      left.replaceChildren(
        h('h2', {}, 'Mon carnet d\'île'),
        h('div', { class: 'empty-state' },
          h('div', { class: 'illu', html: ILLU.carnet }),
          h('p', { class: 'hand' }, 'Ton carnet est encore tout neuf. Chaque session au bureau y laissera un tampon, et ton île fleurira avec tes heures.'),
          h('button', { class: 'btn primary', onclick: () => { game.ui.closePanel(); game.openFocusSetup(); } }, h('span', { class: 'icon', html: ICON.play }), 'Réviser maintenant')),
      );
      right.replaceChildren(
        h('h3', {}, 'Ce que tu trouveras ici'),
        h('ul', { class: 'preview-list' },
          h('li', {}, h('span', { class: 'icon', html: ICON.book }), 'Tes heures par matière, en bandes de washi tape'),
          h('li', {}, h('span', { class: 'icon', html: ICON.flame }), 'Ta série de jours, sans jamais de reproche'),
          h('li', {}, h('span', { class: 'icon', html: ICON.stamp }), 'Un calendrier où chaque jour de travail est tamponné')),
        h('div', { class: 'ghost-stamps' }, h('span'), h('span'), h('span')),
      );
      return;
    }
    const total = totalMinutes(sessions);
    const byDay = minutesByDay(sessions);
    let week = 0;
    for (let i = 0; i < 7; i++) week += byDay[shiftDay(todayKey(), -i)] || 0;
    const reviews = Object.values(st.reviewLog).reduce((a, r) => ({ c: a.c + r.count, k: a.k + r.correct }), { c: 0, k: 0 });
    const blooming = st.plants.filter((p) => stageOf(growthOf(p)) === 3).length;
    const done = st.tasks.filter((t) => t.doneAt).length;
    const sk = streak(sessions);
    left.replaceChildren(
      h('h2', {}, 'Mon carnet d\'île'),
      h('p', { class: 'muted hand' }, new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
      stat('clock', 'Temps total', fmtMinutes(total)),
      stat('sparkle', "Aujourd'hui", fmtMinutes(todayMinutes(sessions))),
      stat('book', 'Ces 7 derniers jours', fmtMinutes(week)),
      stat('flame', 'Série en cours', `${sk} jour${sk > 1 ? 's' : ''} (record ${bestStreak(sessions)})`),
      stat('focus', 'Sessions terminées', String(sessions.filter((s) => s.completed).length)),
      stat('leaf', 'Plantes sur l\'île', `${st.plants.length} (dont ${blooming} en fleurs)`),
      stat('owl', 'Fiches révisées', reviews.c ? `${reviews.c} (${Math.round((reviews.k / reviews.c) * 100)} % justes)` : '0'),
      stat('bottle', 'Tâches accomplies', String(done)),
    );
    // heures par matière en bandes de washi tape + 7 derniers jours
    const bySub = minutesBySubject(sessions);
    const max = Math.max(1, ...Object.values(bySub));
    const subs = st.subjects.filter((s) => bySub[s.id]).sort((a, b) => bySub[b.id] - bySub[a.id]);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const k = shiftDay(todayKey(), -i);
      days.push({ k, m: byDay[k] || 0 });
    }
    const dmax = Math.max(30, ...days.map((d) => d.m));
    right.replaceChildren(
      h('h3', {}, 'Heures par matière'),
      subs.length ? h('div', { class: 'washi-list' }, ...subs.map((s) => h('div', { class: 'washi-row' },
        h('span', { class: 'washi-label' }, `${SPECIES[s.species]?.emoji || ''} ${s.name}`),
        h('div', { class: 'washi', style: { width: `${12 + (bySub[s.id] / max) * 88}%`, '--w': s.color } }),
        h('span', { class: 'washi-val' }, fmtMinutes(bySub[s.id]))))) : h('p', { class: 'muted hand' }, 'Ton premier tampon t\'attend… Lance une session au bureau !'),
      h('h3', {}, 'Ces 7 derniers jours'),
      h('div', { class: 'week-bars' }, ...days.map((d) => h('div', { class: 'wb' },
        h('div', { class: 'wb-bar', style: { height: `${(d.m / dmax) * 100}%` }, title: fmtMinutes(d.m) }),
        h('span', { class: 'wb-day' }, ['D', 'L', 'M', 'M', 'J', 'V', 'S'][localDate(d.k).getDay()])))),
    );
  };

  const renderCalendar = () => {
    const byDay = minutesByDay(st.sessions);
    const y = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // lundi en premier
    const daysIn = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(h('div', { class: 'cal-cell empty' }));
    let stamped = 0;
    for (let d = 1; d <= daysIn; d++) {
      const k = todayKey(new Date(y, m, d));
      const mins = byDay[k] || 0;
      const daySessions = st.sessions.filter((s) => dayKeyOf(s.end || s.start) === k);
      const mainSub = daySessions.length ? st.subjects.find((s) => s.id === daySessions[daySessions.length - 1].subjectId) : null;
      if (mins) stamped++;
      const sz = mins ? Math.min(1, 0.55 + mins / 240) : 0;
      cells.push(h('button', {
        class: `cal-cell ${k === todayKey() ? 'today' : ''} ${k === selectedDay ? 'sel' : ''}`,
        onclick: () => { selectedDay = k; render(); },
      }, h('span', { class: 'cal-num' }, String(d)),
      mins ? h('span', { class: 'cal-stamp', style: { '--sc': mainSub?.color || '#f4a28c', transform: `rotate(${(d * 37) % 30 - 15}deg) scale(${sz})` } }, mins >= 60 ? `${(Math.round(mins / 6) / 10).toLocaleString('fr-FR')} h` : `${mins}'`) : null));
    }
    left.replaceChildren(
      h('div', { class: 'row spread cal-head' },
        h('button', { class: 'btn small ghost', onclick: () => { month = new Date(y, m - 1, 1); render(); } }, '‹'),
        h('h2', {}, `${MOIS[m]} ${y}`),
        h('button', { class: 'btn small ghost', onclick: () => { month = new Date(y, m + 1, 1); render(); } }, '›')),
      h('div', { class: 'cal-grid' }, ...['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('div', { class: 'cal-dow' }, d)), ...cells),
      h('p', { class: 'muted hand' }, `${stamped} jour${stamped > 1 ? 's' : ''} tamponné${stamped > 1 ? 's' : ''} ce mois-ci.`),
    );
    // détails du jour choisi
    const k = selectedDay;
    const ses = st.sessions.filter((s) => dayKeyOf(s.end || s.start) === k);
    const plants = st.plants.filter((p) => dayKeyOf(p.plantedAt) === k);
    const tasks = st.tasks.filter((t) => t.doneAt && dayKeyOf(t.doneAt) === k);
    const rv = st.reviewLog[k];
    const [yy, mm, dd] = k.split('-').map(Number);
    right.replaceChildren(
      h('h3', {}, new Date(yy, mm - 1, dd).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })),
      ses.length ? h('ul', { class: 'day-list' }, ...ses.map((s) => {
        const sub = st.subjects.find((x) => x.id === s.subjectId);
        return h('li', {}, h('span', { class: 'dot', style: { background: sub?.color || '#ccc' } }),
          `${new Date(s.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${sub?.name || '?'} · ${fmtMinutes(s.minutes)}${s.completed ? '' : ' (écourtée)'}`);
      })) : h('p', { class: 'muted hand' }, 'Pas de session ce jour-là.'),
      plants.length ? h('p', {}, `🌱 ${plants.length} plante${plants.length > 1 ? 's' : ''} plantée${plants.length > 1 ? 's' : ''}`) : null,
      tasks.length ? h('p', {}, `🍾 ${tasks.length} tâche${tasks.length > 1 ? 's' : ''} accomplie${tasks.length > 1 ? 's' : ''}`) : null,
      rv ? h('p', {}, `🦉 ${rv.count} fiche${rv.count > 1 ? 's' : ''} révisée${rv.count > 1 ? 's' : ''}`) : null,
    );
  };

  const renderCollection = () => {
    const tot = st.collect.totals || {};
    left.replaceChildren(
      h('h2', {}, 'Trésors de plage'),
      h('div', { class: 'collection' }, ...Object.entries(KINDS).map(([k, v]) => h('div', { class: `treasure ${tot[k] ? '' : 'unknown'}` },
        h('span', { class: 'treasure-emoji' }, { coquillage: '🐚', etoile: '⭐', verre: '💎', perle: '🫧', peche: '🍑' }[k]),
        h('span', {}, tot[k] ? v.name : '???'),
        h('b', {}, `×${tot[k] || 0}`)))),
      h('p', { class: 'muted hand' }, 'De nouveaux trésors s\'échouent chaque matin.'),
    );
    const bySpecies = {};
    for (const p of st.plants) {
      const e = (bySpecies[p.species] = bySpecies[p.species] || { n: 0, bloom: 0 });
      e.n++;
      if (stageOf(growthOf(p)) === 3) e.bloom++;
    }
    right.replaceChildren(
      h('h2', {}, 'Herbier'),
      h('div', { class: 'collection' }, ...Object.entries(SPECIES).map(([k, sp]) => h('div', { class: `treasure ${bySpecies[k] ? '' : 'unknown'}` },
        h('span', { class: 'treasure-emoji' }, sp.emoji),
        h('span', {}, bySpecies[k] ? sp.name : '???'),
        h('b', {}, bySpecies[k] ? `${bySpecies[k].n} (${bySpecies[k].bloom} en fleurs)` : '—')))),
    );
  };

  const render = () => {
    renderRibbons();
    if (tab === 'resume') renderResume();
    else if (tab === 'calendrier') renderCalendar();
    else renderCollection();
  };
  render();
  const book = h('div', { class: 'notebook' }, ribbons, h('div', { class: 'nb-pages' }, left, h('div', { class: 'nb-spine' }), right));
  game.ui.openPanel(book, { className: 'journal-panel' });
}
