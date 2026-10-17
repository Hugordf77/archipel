import { h, replay } from './dom.js';
import { ICON } from './icons.js';
import { QUALITY } from '../render/Pipeline.js';
import { CHANNELS, CHANNEL_LABELS } from '../audio/AudioEngine.js';
import { exportSave, readImportFile, writeSave } from '../core/db.js';
import { validateImport, migrate, createDefaultState } from '../core/state.js';
import { SEASONS } from '../world/env/season.js';
import { PAD_DEFAULTS } from '../core/Gamepad.js';

function slider(label, value, { min = 0, max = 1, step = 0.05, fmt = (v) => `${Math.round(v * 100)} %`, onInput }) {
  const out = h('span', { class: 'slider-val' }, fmt(value));
  const input = h('input', {
    type: 'range', min, max, step, value,
    oninput: (e) => {
      const v = parseFloat(e.target.value);
      out.textContent = fmt(v);
      onInput(v);
    },
  });
  return h('label', { class: 'slider-row' }, h('span', { class: 'slider-label' }, label), input, out);
}

function choice(options, current, onPick) {
  const wrap = h('div', { class: 'chips' });
  const render = () => wrap.replaceChildren(...options.map(([value, label]) => h('button', {
    class: `chip ${value === current ? 'selected' : ''}`,
    onclick: () => {
      current = value;
      render();
      onPick(value);
    },
  }, label)));
  render();
  return wrap;
}

const hourLabel = (v) => {
  const hh = Math.floor(v);
  const mm = Math.round((v - hh) * 60);
  return `${String(hh).padStart(2, '0')} h ${String(mm).padStart(2, '0')}`;
};

export function openSettingsPanel(game, tab = 'image') {
  const st = game.state;
  const s = st.settings;
  const tabsEl = h('div', { class: 'tabs' });
  const content = h('div', { class: 'tab-content stack' });
  let fpsTimer = null;

  const save = () => {
    game.markDirty();
  };

  const renderImage = () => {
    const fps = h('b', {}, '…');
    fpsTimer = setInterval(() => {
      fps.textContent = `${Math.round(game.fps || 0)} images/s`;
    }, 500);
    return [
      h('div', { class: 'section-label' }, 'Qualité'),
      choice(Object.entries(QUALITY).map(([k, q]) => [k, q.label]), s.quality, (v) => {
        s.quality = v;
        game.applySettings();
        save();
      }),
      h('p', { class: 'muted' }, 'Bas : peinture simple en demi-résolution. Moyen : Kuwahara anisotrope en demi-résolution. Haut : Kuwahara anisotrope plus fin, résolution Retina.'),
      h('p', { class: 'muted' }, 'Fluidité actuelle : ', fps),
      h('div', { class: 'section-label' }, 'Rendu peint'),
      slider('Effet peinture', s.paint, { min: 0, max: 1.6, onInput: (v) => { s.paint = v; game.applySettings(); save(); }, fmt: (v) => (v === 0 ? 'désactivé' : `${Math.round(v * 100)} %`) }),
      slider('Contours encrés', s.outline, { min: 0, max: 1.5, onInput: (v) => { s.outline = v; game.applySettings(); save(); } }),
      slider('Grain du papier', s.paper, { min: 0, max: 1.5, onInput: (v) => { s.paper = v; game.applySettings(); save(); } }),
      slider('Courbure du monde', s.curvature, { min: 0, max: 2, onInput: (v) => { s.curvature = v; game.applySettings(); save(); } }),
    ];
  };

  const renderSound = () => {
    const rows = CHANNELS.map((ch) => slider(CHANNEL_LABELS[ch], s.volumes[ch], {
      onInput: (v) => {
        s.volumes[ch] = v;
        game.audio?.setVolume(ch, v);
        save();
      },
    }));
    return [
      h('div', { class: 'section-label' }, 'Volumes'),
      ...rows,
      h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { game.toggleMute(); renderAll(); } }, game.audio?.muted ? 'Réactiver le son' : 'Couper le son (N)'),
        h('button', { class: 'btn small ghost', onclick: () => game.audio?.chime('end') }, 'Écouter le carillon')),
      h('p', { class: 'muted' }, 'Tous les sons sont synthétisés en direct : vagues, vent, oiseaux le jour, grillons la nuit, pluie et petite boîte à musique.'),
    ];
  };

  const renderTime = () => {
    const live = h('span', { class: 'muted' }, '');
    const upd = () => {
      live.textContent = `${hourLabel(game.world.dayCycle.hour)} · ${game.world.dayCycle.state.name || ''}`;
    };
    upd();
    const hourSlider = slider('Heure fixe', s.timeOverride, {
      min: 0, max: 23.99, step: 0.05, fmt: hourLabel,
      onInput: (v) => {
        s.timeOverride = v;
        if (s.timeMode !== 'fixed') {
          s.timeMode = 'fixed';
          renderAll();
        }
        game.applySettings();
        upd();
        save();
      },
    });
    return [
      h('div', { class: 'section-label' }, 'Heure de l\'île'),
      choice([['real', 'Heure réelle'], ['fixed', 'Heure fixe']], s.timeMode, (v) => {
        s.timeMode = v;
        game.applySettings();
        upd();
        save();
      }),
      hourSlider,
      live,
      h('div', { class: 'section-label' }, 'Météo'),
      choice([['auto', 'Au fil des jours'], ['clair', 'Toujours clair'], ['pluie', 'Pluie fine'], ['neige', 'Neige légère']], s.weather, (v) => {
        s.weather = v;
        game.weather?.setMode(v);
        save();
      }),
      h('div', { class: 'section-label' }, 'Saison'),
      choice([['auto', 'Selon la date'], ...Object.entries(SEASONS)], s.season || 'auto', (v) => {
        s.season = v;
        game.applySettings();
        save();
      }),
    ];
  };

  const renderLook = () => [
    h('div', { class: 'section-label' }, 'Apparence'),
    h('p', {}, 'Coupe, couleur de cheveux, peau, yeux, tenue et accessoire se choisissent au miroir, en voyant ton personnage en direct.'),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => game.openMirror({}) }, h('span', { class: 'icon', html: ICON.mirror }), 'Ouvrir le miroir')),
    h('p', { class: 'muted' }, 'Le miroir se trouve aussi à gauche de la porte de la maison. De nouvelles pièces s\'achètent à l\'échoppe.'),
  ];

  // commandes à la manette : boutons PlayStation (✕ en bas, ◯ à droite, □ à gauche, △ en haut)
  const PAD_MAP = [
    ['Stick gauche', 'courir · incliné à moitié : marcher · enfoncé (L3) : sprinter'],
    ['Stick droit', 'tourner la caméra · R3 : la replacer derrière toi'],
    ['✕', 'interagir, parler, caresser, débarquer · sinon : sauter (maintenu : plus haut)'],
    ['□', 'utiliser l\'outil tenu : couper, miner, creuser, pêcher'],
    ['◯', 'roulade (à relancer en rythme pour gagner de la vitesse) · se lever, annuler, fermer'],
    ['△', 'sac et atelier'],
    ['L1 / R1', 'objet précédent / suivant · à la voile : border / choquer'],
    ['L2 / R2', 'éloigner / rapprocher la caméra · en vol : descendre / monter'],
    ['Croix', '↑ appeler l\'aigle (en vol : chute libre) · ↓ journal · ← → barre rapide'],
    ['Options', 'réglages · Create ou pavé tactile : carte'],
  ];
  const renderPad = () => {
    s.pad = { ...PAD_DEFAULTS, ...(s.pad || {}) };
    const status = h('p', {}, '');
    const upd = () => {
      const pad = game.pad;
      status.textContent = pad?.connected
        ? `${pad.name} connectée. Les panneaux se parcourent à la croix, ✕ valide, ◯ ferme, L1 / R1 changent d'onglet.`
        : 'Aucune manette détectée. Relie-la au Mac puis appuie sur un de ses boutons, le jeu la reconnaît tout seul.';
    };
    upd();
    fpsTimer = setInterval(upd, 500);
    return [
      h('div', { class: 'section-label' }, 'Manette'),
      status,
      h('p', { class: 'muted' }, 'DualSense en Bluetooth : maintiens PS et Create jusqu\'à ce que la barre lumineuse clignote, puis choisis-la dans Réglages Système → Bluetooth. Un câble USB-C marche aussi. Chrome, Edge et Safari la lisent directement.'),
      h('div', { class: 'section-label' }, 'Vibrations'),
      choice([[true, 'Activées'], [false, 'Désactivées']], s.pad.rumble, (v) => {
        s.pad.rumble = v;
        save();
        game.pad?.rumble(0.5, 0.3, 160);
      }),
      choice([[true, 'Vibration à chaque pas'], [false, 'Pas sans vibration']], s.pad.stepRumble, (v) => {
        s.pad.stepRumble = v;
        save();
      }),
      h('div', { class: 'section-label' }, 'Caméra'),
      choice([[false, 'Axe vertical normal'], [true, 'Axe vertical inversé']], s.pad.invertY, (v) => {
        s.pad.invertY = v;
        save();
      }),
      slider('Sensibilité', s.pad.sensitivity, { min: 0.4, max: 2, step: 0.1, fmt: (v) => `${Math.round(v * 100)} %`, onInput: (v) => { s.pad.sensitivity = v; save(); } }),
      h('div', { class: 'section-label' }, 'Commandes'),
      h('dl', { class: 'pad-map' }, ...PAD_MAP.flatMap(([k, what]) => [h('dt', {}, h('span', { class: 'key-badge' }, k)), h('dd', {}, what)])),
    ];
  };

  // déplacements : profil de locomotion, secousses de caméra, rappel des commandes
  const renderMotion = () => {
    s.motion = { profile: 'realiste', shake: true, ...(s.motion || {}) };
    return [
      h('div', { class: 'section-label' }, 'Sensation'),
      choice([['realiste', 'Élan réaliste'], ['reactif', 'Réactif']], s.motion.profile, (v) => {
        s.motion.profile = v;
        game.applySettings();
        save();
      }),
      h('p', { class: 'muted' }, 'Élan réaliste : le personnage prend son élan, s\'engage dans les virages et dérape quand on fait demi-tour en pleine course. Réactif : mêmes gestes, beaucoup moins d\'inertie.'),
      h('div', { class: 'section-label' }, 'Caméra'),
      choice([[true, 'Balancement et secousses'], [false, 'Caméra stable']], s.motion.shake, (v) => {
        s.motion.shake = v;
        save();
      }),
      h('div', { class: 'section-label' }, 'Commandes'),
      h('dl', { class: 'pad-map' },
        ...[
          ['ZQSD · stick', 'courir ; Alt ou stick à moitié : marcher'],
          ['Maj · L3', 'sprinter (L3 : un clic, jusqu\'à ce qu\'on lâche le stick)'],
          ['Espace · ✕', 'sauter (maintenu : plus haut ; au sprint : saut long)'],
          ['C · ◯', 'roulade, à relancer en rythme pour gagner de la vitesse'],
          ['Demi-tour', 'en pleine course : dérapage puis relance'],
          ['Attention', 'au sprint, un buisson, un rocher ou une souche percutés de face font trébucher'],
        ].flatMap(([k, what]) => [h('dt', {}, h('span', { class: 'key-badge' }, k)), h('dd', {}, what)])),
    ];
  };

  const renderSave = () => {
    const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        const obj = await readImportFile(f);
        const err = validateImport(obj);
        if (err) {
          game.ui.toast(err, { icon: 'close' });
          return;
        }
        const data = migrate(obj.data);
        await writeSave(data);
        game.ui.toast('Monde importé ! Rechargement…', { icon: 'leaf' });
        game.skipSave = true;
        setTimeout(() => location.reload(), 600);
      } catch (e) {
        game.ui.toast(`Import impossible : ${e.message}`, { icon: 'close' });
      }
    });
    let armed = false;
    const resetBtn = h('button', {
      class: 'btn coral small',
      onclick: async () => {
        if (!armed) {
          armed = true;
          resetBtn.textContent = 'Vraiment tout effacer ? Clique encore';
          replay(resetBtn, 'squish');
          return;
        }
        await writeSave(createDefaultState());
        game.skipSave = true;
        location.reload();
      },
    }, 'Recommencer un monde vierge');
    return [
      h('div', { class: 'section-label' }, 'Sauvegarde'),
      h('p', {}, 'Ton monde est enregistré automatiquement dans ce navigateur (IndexedDB) : graine, îles explorées, constructions, inventaire, décorations.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => { game.saveNow(); exportSave(st); } }, 'Exporter mon monde (JSON)'),
        h('button', { class: 'btn', onclick: () => file.click() }, 'Importer une sauvegarde'),
        file),
      h('p', { class: 'muted' }, 'L\'export te permet de garder une copie ou de retrouver ton île sur un autre ordinateur.'),
      h('div', { class: 'section-label' }, 'Zone sensible'),
      resetBtn,
    ];
  };

  const renderAll = () => {
    clearInterval(fpsTimer);
    const t = (id, label) => h('button', { class: `tab ${tab === id ? 'active' : ''}`, onclick: () => { tab = id; renderAll(); } }, label);
    tabsEl.replaceChildren(t('image', 'Image'), t('son', 'Son'), t('temps', 'Temps & météo'), t('deplacements', 'Déplacements'), t('manette', 'Manette'), t('apparence', 'Apparence'), t('sauvegarde', 'Sauvegarde'));
    const parts = tab === 'image' ? renderImage() : tab === 'son' ? renderSound() : tab === 'temps' ? renderTime() : tab === 'deplacements' ? renderMotion() : tab === 'manette' ? renderPad() : tab === 'apparence' ? renderLook() : renderSave();
    content.replaceChildren(...parts);
  };
  renderAll();
  game.ui.openPanel(h('div', { class: 'stack settings' }, tabsEl, content), {
    title: 'Réglages', icon: 'gear', className: 'settings-panel', onClose: () => clearInterval(fpsTimer),
  });
}
