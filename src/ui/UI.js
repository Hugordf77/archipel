import { h, replay } from './dom.js';
import { ICON } from './icons.js';
import { MiniMap } from './minimap.js';

// Interface « objets physiques » : panneaux de bois, feuilles de papier, tampons.
export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.panel = null;
    this.bubbles = new Map();

    // --- coin haut gauche : panneau de bois avec les coquillages ---
    this.shellCount = h('span', { class: 'shell-count' }, '0');
    this.shellSign = h('div', { class: 'wood-sign shell-sign', title: 'Coquillages' },
      h('span', { class: 'icon', html: ICON.shell }), this.shellCount);
    this.clockTag = h('div', { class: 'paper-tag clock-tag' }, '');
    this.topLeft = h('div', { class: 'hud hud-top-left' }, this.shellSign, this.clockTag);

    // --- coin haut droit : boutons ronds en bois ---
    const btn = (icon, label, key, fn) =>
      h('button', { class: 'wood-btn', 'data-label': `${label} (${key})`, 'aria-label': label, onclick: (e) => { e.stopPropagation(); fn(); } },
        h('span', { class: 'icon', html: icon }), h('span', { class: 'key-badge' }, key));
    this.soundBtn = btn(ICON.sound, 'Son', 'N', () => game.toggleMute());
    this.topRight = h('div', { class: 'hud hud-top-right' },
      btn(ICON.journal, 'Journal de bord', 'J', () => game.openJournal()),
      btn(ICON.map, 'Carte', 'M', () => game.openMap()),
      btn(ICON.gear, 'Réglages', 'P', () => game.openSettings()),
      this.soundBtn,
    );

    // --- bas : aide contextuelle, barre rapide (inventaire) ---
    this.hint = h('div', { class: 'hint-strip' }, '');
    this.bottom = h('div', { class: 'hud hud-bottom' }, this.hint);
    this.bottomRight = h('div', { class: 'hud hud-bottom-right' });

    // --- invite d'interaction ancrée dans le monde ---
    this.promptLabel = h('span', { class: 'prompt-label' }, '');
    this.prompt = h('div', { class: 'prompt hidden' }, h('span', { class: 'keycap' }, 'E'), this.promptLabel);

    // --- boussole en ruban (haut, centre) et jauges de navigation ---
    this.buildCompass();
    this.sailHud = h('div', { class: 'hud sail-hud paper-tag hidden' });
    this.minimap = new MiniMap(game);

    this.toasts = h('div', { class: 'toasts' });
    // bandeau d'entrée de zone (nom de la région et sa devise)
    this.zoneTitle = h('div', { class: 'zone-title', 'aria-live': 'polite' });
    this.bubbleLayer = h('div', { class: 'bubble-layer' });
    this.floatLayer = h('div', { class: 'float-layer' });
    this.panelHost = h('div', { class: 'panel-host hidden' });
    this.panelHost.addEventListener('pointerdown', (e) => {
      if (e.target === this.panelHost && this.panel?.dismissable !== false) this.closePanel();
    });
    root.append(this.bubbleLayer, this.floatLayer, this.prompt, this.topLeft, this.topRight, this.compass, this.sailHud, this.minimap.canvas, this.bottom,
      this.bottomRight, this.toasts, this.zoneTitle, this.panelHost);
  }

  // ---------------------------------------------------------------------------
  // Boussole : 2 px par degré, trois tours de ruban pour boucler sans saut
  buildCompass() {
    const PX = 2;
    this.compassPx = PX;
    const strip = h('div', { class: 'compass-strip' });
    const NAMES = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
    for (let d = -360; d < 720; d += 15) {
      const a = ((d % 360) + 360) % 360;
      const name = NAMES[a];
      const tick = h('span', { class: `compass-tick ${name ? (name.length === 1 ? 'major' : 'mid') : ''}` }, name || '');
      tick.style.left = `${(d + 360) * PX}px`;
      strip.append(tick);
    }
    this.compassStrip = strip;
    this.compassMarks = h('div', { class: 'compass-marks' });
    this.compass = h('div', { class: 'hud compass', 'aria-hidden': 'true' }, strip, this.compassMarks, h('span', { class: 'compass-needle' }));
    this.compassPool = [];
  }

  // bearing : cap de la vue (degrés, 0 = nord) ; marks : [{ bearing, icon, label }]
  setCompass(bearing, marks = []) {
    const PX = this.compassPx;
    const w = 360;
    this.compassStrip.style.transform = `translateX(${Math.round(w / 2 - (bearing + 360) * PX)}px)`;
    while (this.compassPool.length < marks.length) {
      const m = h('span', { class: 'compass-mark' });
      this.compassMarks.append(m);
      this.compassPool.push(m);
    }
    this.compassPool.forEach((el, i) => {
      const m = marks[i];
      if (!m) {
        el.style.display = 'none';
        return;
      }
      let d = ((m.bearing - bearing + 540) % 360) - 180;
      const out = Math.abs(d) > 88;
      d = Math.max(-88, Math.min(88, d));
      el.style.display = '';
      el.classList.toggle('edge', out);
      if (el.dataset.icon !== m.icon) {
        el.innerHTML = ICON[m.icon] || '';
        el.dataset.icon = m.icon;
      }
      el.title = m.label || '';
      el.style.transform = `translateX(${Math.round(w / 2 + d * PX)}px) translateX(-50%)`;
    });
  }

  // Jauges du bateau (null : masquées)
  setSailHud(info) {
    const el = this.sailHud;
    if (!info) {
      if (!el.classList.contains('hidden')) el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const kmh = Math.abs(info.speed);
    const zoneTxt = Number.isFinite(info.zone) ? `${(info.dHome / 1000).toFixed(1)} / ${info.zone / 1000} km` : `${(info.dHome / 1000).toFixed(1)} km`;
    const key = `${info.name}|${kmh.toFixed(1)}|${zoneTxt}|${info.sail ? Math.round(info.trim * 20) + ':' + Math.round(info.ideal * 20) + ':' + Math.round(info.eff * 10) : ''}|${Math.round(info.windRel * 8)}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    const windArrow = h('span', { class: 'wind-arrow', title: 'Vent', style: `transform: rotate(${Math.round((info.windRel * 180) / Math.PI)}deg)`, html: ICON.wind || '➜' });
    const parts = [
      h('span', { class: 'icon', html: ICON.boat }),
      h('b', {}, info.name),
      h('span', { class: 'sail-num' }, `${kmh.toFixed(1)} m/s`),
      h('span', { class: 'sail-sep' }, '·'),
      windArrow,
      h('span', { class: 'sail-sep' }, '·'),
      h('span', { class: 'sail-num', title: 'Distance à ton île / zone du bateau' }, zoneTxt),
    ];
    if (info.sail) {
      const gauge = h('span', { class: 'trim-gauge', title: 'Voile : R pour border, F pour choquer' },
        h('span', { class: 'trim-ideal', style: `left:${(info.ideal * 100).toFixed(0)}%` }),
        h('span', { class: 'trim-cur', style: `left:${(info.trim * 100).toFixed(0)}%` }));
      parts.push(h('span', { class: 'sail-sep' }, '·'), h('span', { class: 'sail-label' }, 'Voile'), gauge);
    }
    el.replaceChildren(...parts);
  }

  // ---------------------------------------------------------------------------
  setShells(n, delta = 0) {
    this.shellCount.textContent = String(n);
    if (delta) {
      replay(this.shellSign, 'squish');
      const f = h('div', { class: `float-delta ${delta > 0 ? 'plus' : 'minus'}` }, `${delta > 0 ? '+' : ''}${delta}`);
      const r = this.shellSign.getBoundingClientRect();
      f.style.left = `${r.right - 18}px`;
      f.style.top = `${r.bottom - 6}px`;
      this.floatLayer.append(f);
      setTimeout(() => f.remove(), 1400);
    }
  }

  setClock(text) {
    if (this.clockTag.textContent !== text) this.clockTag.textContent = text;
  }

  setHint(text) {
    if (this.hint.textContent !== text) this.hint.textContent = text;
  }

  setMuted(muted) {
    this.soundBtn.querySelector('.icon').innerHTML = muted ? ICON.mute : ICON.sound;
  }

  // ---------------------------------------------------------------------------
  showPrompt(label, x, y, key = this.game?.pad?.recent ? '✕' : 'E') {
    const wasHidden = this.prompt.classList.contains('hidden');
    this.promptLabel.textContent = label;
    this.prompt.querySelector('.keycap').textContent = key;
    this.prompt.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    if (wasHidden) {
      this.prompt.classList.remove('hidden');
      replay(this.prompt.firstChild, 'pop');
    }
  }

  hidePrompt() {
    this.prompt.classList.add('hidden');
  }

  // Bulle de dialogue ancrée (hibou…)
  bubble(id, text, x, y, visible = true) {
    let b = this.bubbles.get(id);
    if (!visible || !text) {
      if (b) {
        b.remove();
        this.bubbles.delete(id);
      }
      return;
    }
    if (!b) {
      b = h('div', { class: 'speech-anchor' }, h('div', { class: 'speech pop' }, ''));
      this.bubbleLayer.append(b);
      this.bubbles.set(id, b);
    }
    const inner = b.firstChild;
    if (inner.textContent !== text) {
      inner.textContent = text;
      replay(inner, 'pop');
    }
    b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  // Étiquette en bois ancrée dans le monde (ex. « Ta première plante poussera ici »)
  worldTag(id, text, x, y, visible = true) {
    this.tags = this.tags || new Map();
    let t = this.tags.get(id);
    if (!visible || !text) {
      if (t) t.style.display = 'none';
      return;
    }
    if (!t) {
      t = h('div', { class: 'world-tag' }, h('span', { class: 'world-tag-text' }, text));
      this.bubbleLayer.append(t);
      this.tags.set(id, t);
    }
    t.style.display = '';
    // l'étiquette reste entière à l'écran même si son ancre est au bord
    t.halfW ||= t.offsetWidth / 2;
    const half = t.halfW;
    const cx = Math.min(Math.max(x, half + 8), innerWidth - half - 8);
    t.style.transform = `translate(${Math.round(cx)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  // Entrée dans une zone nommée : grand titre au centre de l'écran, qui s'efface de lui-même
  zoneBanner(name, sub = '') {
    clearTimeout(this.zoneTimer);
    this.zoneTitle.replaceChildren(h('div', { class: 'zone-name' }, name), sub ? h('div', { class: 'zone-sub' }, sub) : null);
    replay(this.zoneTitle, 'show');
    this.zoneTimer = setTimeout(() => this.zoneTitle.classList.remove('show'), 3600);
  }

  toast(text, { icon = null, tone = 'paper', duration = 3200 } = {}) {
    const t = h('div', { class: `toast ${tone}` }, icon ? h('span', { class: 'icon', html: ICON[icon] || icon }) : null, h('span', {}, text));
    this.toasts.append(t);
    setTimeout(() => t.classList.add('leaving'), duration);
    setTimeout(() => t.remove(), duration + 500);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
  }

  // ---------------------------------------------------------------------------
  // Panneaux (feuille de papier épinglée sur une planche)
  openPanel(content, { title = '', className = '', dismissable = true, onClose = null, icon = null, hostKind = '' } = {}) {
    this.closePanel(true);
    const closeBtn = dismissable
      ? h('button', { class: 'panel-close', 'aria-label': 'Fermer', html: ICON.close, onclick: () => this.closePanel() })
      : null;
    const head = title
      ? h('div', { class: 'panel-title' }, icon ? h('span', { class: 'icon', html: ICON[icon] || icon }) : null, h('span', {}, title))
      : null;
    const sheet = h('div', { class: `panel paper ${className}` }, h('div', { class: 'tape' }), closeBtn, head, content);
    this.panelHost.replaceChildren(sheet);
    // « mirror » : panneau à droite, sans voile, pour voir le personnage
    this.panelHost.dataset.kind = hostKind;
    this.panelHost.classList.remove('hidden');
    replay(sheet, 'drop-in');
    this.panel = { sheet, onClose, dismissable };
    this.game.onPanelChange?.(true);
    return this.panel;
  }

  closePanel(silent = false) {
    if (!this.panel) return;
    const p = this.panel;
    this.panel = null;
    this.panelHost.classList.add('hidden');
    this.panelHost.dataset.kind = '';
    this.panelHost.replaceChildren();
    if (!silent) {
      p.onClose?.();
      this.game.onPanelChange?.(false);
    }
  }

  get panelOpen() {
    return !!this.panel;
  }

  setMode(mode) {
    // modes : 'free' | 'focus' | 'focus-total' | 'break'
    this.root.dataset.mode = mode;
  }
}
