// Manette : DualSense (PS5), DualShock 4, Xbox… par l'API Gamepad du navigateur.
// Rien à installer : la manette est reliée au Mac (Bluetooth ou câble USB-C), on appuie
// sur un de ses boutons une fois le jeu ouvert, et elle pilote les mêmes actions que
// le clavier. Les boutons sont lus par position (disposition « standard ») : ✕ en bas,
// ◯ à droite, □ à gauche, △ en haut — comme le clavier lit event.code.
import * as THREE from 'three';
import { projectCurved, groundAt } from '../world/navigation.js';

export const BTN = {
  CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3,
  L1: 4, R1: 5, L2: 6, R2: 7,
  CREATE: 8, OPTIONS: 9, L3: 10, R3: 11,
  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
  PS: 16, TOUCHPAD: 17,
};
const COUNT = 18;
const ON = 0.5;
const _aim = new THREE.Vector3();
export const PAD_DEFAULTS = { rumble: true, stepRumble: true, invertY: false, sensitivity: 1 };

// Zone morte radiale puis remise à l'échelle : une petite inclinaison donne une marche lente,
// sans saut à la sortie de la zone morte.
export function stick(x, y, dead = 0.15) {
  const m = Math.hypot(x, y);
  if (m < dead) return [0, 0];
  const k = Math.min(1, (m - dead) / (1 - dead)) / m;
  return [x * k, y * k];
}

export function padName(id = '') {
  if (/dualsense|0ce6|0df2/i.test(id)) return 'Manette DualSense';
  if (/dualshock|05c4|09cc/i.test(id)) return 'Manette DualShock 4';
  if (/xbox|045e/i.test(id)) return 'Manette Xbox';
  return 'Manette';
}

// Lecture normalisée : 18 boutons (0 à 1) dans l'ordre standard et 4 axes (stick gauche x/y,
// stick droit x/y). Chrome, Edge et Safari donnent déjà la disposition standard ; Firefox
// sur macOS livre la DualSense en HID brut, qu'on remet à sa place.
const SONY = /054c|dualsense|dualshock|wireless controller/i;
const RAW_SONY = [1, 2, 0, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // index standard → index brut
export function readPad(gp) {
  const btn = new Float32Array(COUNT);
  const val = (i) => {
    const b = gp.buttons[i];
    if (!b) return 0;
    return typeof b === 'object' ? b.value || (b.pressed ? 1 : 0) : b;
  };
  if (gp.mapping === 'standard' || !SONY.test(gp.id)) {
    for (let i = 0; i < COUNT; i++) btn[i] = val(i);
    return { btn, axes: [gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[3] || 0] };
  }
  // HID brut : □ ✕ ◯ △ L1 R1 L2 R2 Create Options L3 R3 PS pavé ; gâchettes sur les axes 3 et 4,
  // stick droit vertical sur l'axe 5, croix directionnelle codée sur l'axe 9
  RAW_SONY.forEach((raw, i) => {
    btn[i] = val(raw);
  });
  btn[BTN.PS] = val(12);
  btn[BTN.TOUCHPAD] = val(13);
  if (gp.axes.length > 4) {
    btn[BTN.L2] = Math.max(btn[BTN.L2], ((gp.axes[3] ?? -1) + 1) / 2);
    btn[BTN.R2] = Math.max(btn[BTN.R2], ((gp.axes[4] ?? -1) + 1) / 2);
  }
  const hat = gp.axes[9];
  if (hat !== undefined && hat <= 1.01) {
    // −1 = haut, puis par pas de 2/7 dans le sens horaire ; au-delà de 1 : relâchée
    const dir = Math.round((hat + 1) * 3.5) % 8;
    btn[BTN.UP] = dir === 7 || dir <= 1 ? 1 : 0;
    btn[BTN.RIGHT] = dir >= 1 && dir <= 3 ? 1 : 0;
    btn[BTN.DOWN] = dir >= 3 && dir <= 5 ? 1 : 0;
    btn[BTN.LEFT] = dir >= 5 && dir <= 7 ? 1 : 0;
  }
  return { btn, axes: [gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[5] || 0] };
}

// Navigation dans un panneau : parmi les centres « cands », le plus proche dans la direction
// (dx, dy) depuis « from », en pénalisant l'écart latéral (une ligne plus bas plutôt qu'en biais).
export function pickFocus(from, cands, dx, dy) {
  let best = -1;
  let bestScore = Infinity;
  cands.forEach((c, i) => {
    const vx = c.x - from.x;
    const vy = c.y - from.y;
    const along = vx * dx + vy * dy;
    if (along <= 4) return;
    const across = Math.abs(vx * dy - vy * dx);
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([type="hidden"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export class GamepadInput {
  constructor(game) {
    this.game = game;
    this.index = -1;
    this.name = '';
    this.cur = new Float32Array(COUNT);
    this.prev = new Float32Array(COUNT);
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.trig = { l: 0, r: 0 };
    this.held = new Set(); // touches clavier simulées (voile, altitude en vol)
    this.lastUse = 0;
    this.focus = null;
    this.sheet = null;
    this.nav = { dir: '', t: 0 };
    this.sprint = false; // sprint enclenché par L3
    this.flags = { jump: false, roll: false }; // appuis lus une fois par le jeu
    this.announced = new Set();
    window.addEventListener('gamepadconnected', (e) => this.attach(e.gamepad));
    window.addEventListener('gamepaddisconnected', (e) => this.detach(e.gamepad));
  }

  get connected() {
    return this.index >= 0;
  }

  // la manette a servi dans la dernière minute : l'aide et les invites montrent ses symboles
  get recent() {
    return this.connected && performance.now() - this.lastUse < 60000;
  }

  get settings() {
    return { ...PAD_DEFAULTS, ...(this.game.state?.settings?.pad || {}) };
  }

  // L3 (stick gauche enfoncé) : sprinter, comme Maj au clavier ; en vol, turbo
  get run() {
    return this.connected && this.sprint;
  }

  // ✕ maintenu : saut plus haut
  get jumpHeld() {
    return this.connected && this.down(BTN.CROSS);
  }

  // appui de saut ou de roulade, lu une seule fois par image
  consume(name) {
    const v = this.flags[name];
    this.flags[name] = false;
    return v;
  }

  attach(gp) {
    if (!gp || this.index === gp.index || (this.index >= 0 && this.index !== gp.index)) return;
    this.index = gp.index;
    this.name = padName(gp.id);
    this.cur.fill(0);
    this.prev.fill(0);
    this.lastUse = performance.now();
    if (!this.announced.has(gp.id)) {
      this.announced.add(gp.id);
      this.game.ui?.toast(`${this.name} connectée : stick gauche courir (enfoncé : sprint) · ✕ sauter / interagir · ◯ roulade · △ sac · Options réglages`, { icon: 'pad', duration: 5600 });
    }
    this.rumble(0.35, 0.2, 120);
  }

  detach(gp) {
    if (!gp || gp.index !== this.index) return;
    this.index = -1;
    this.release();
    this.announced.delete(gp.id);
    this.game.ui?.toast(`${this.name} déconnectée.`, { icon: 'pad' });
  }

  release() {
    this.cur.fill(0);
    this.prev.fill(0);
    this.move.x = this.move.y = 0;
    this.look.x = this.look.y = 0;
    this.trig.l = this.trig.r = 0;
    this.sprint = false;
    this.flags.jump = this.flags.roll = false;
    this.held.clear();
    this.blur();
  }

  down(b) {
    return this.cur[b] > ON;
  }

  pressed(b) {
    return this.cur[b] > ON && this.prev[b] <= ON;
  }

  rumble(strong, weak, ms) {
    if (!this.connected || !this.settings.rumble) return;
    const gp = navigator.getGamepads?.()[this.index];
    try {
      gp?.vibrationActuator?.playEffect?.('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {});
    } catch {
      /* vibrations indisponibles dans ce navigateur */
    }
  }

  // Une fois par image, avant le joueur : lit la manette et déclenche les actions
  poll(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = this.index >= 0 ? pads[this.index] : null;
    if (!gp && this.index >= 0) {
      this.index = -1;
      this.release();
    }
    if (!gp) {
      // Safari et Chrome ne signalent la manette qu'au premier appui sur un bouton
      for (const p of pads) {
        if (p && p.connected) {
          this.attach(p);
          gp = p;
          break;
        }
      }
      if (!gp) return;
    }
    this.prev.set(this.cur);
    const { btn, axes } = readPad(gp);
    this.cur.set(btn);
    const s = this.settings;
    const [mx, my] = stick(axes[0], axes[1]);
    const [lx, ly] = stick(axes[2], axes[3], 0.12);
    this.move.x = mx;
    this.move.y = -my;
    this.look.x = lx;
    this.look.y = s.invertY ? -ly : ly;
    this.trig.l = btn[BTN.L2];
    this.trig.r = btn[BTN.R2];
    let any = mx !== 0 || my !== 0 || lx !== 0 || ly !== 0;
    for (let i = 0; i < COUNT && !any; i++) if (btn[i] > ON) any = true;
    if (any) {
      this.lastUse = performance.now();
      if (this.game.input) this.game.input.lastMove = this.lastUse;
      this.game.audio?.resume();
    }
    this.dispatch(dt);
  }

  dispatch(dt) {
    const g = this.game;
    this.held.clear();
    if (g.ui.panelOpen) {
      this.panel(dt);
      return;
    }
    this.blur();
    this.sheet = null;
    const key = (code) => g.handleKey(code, { repeat: false });
    const aboard = g.sailing?.aboard;
    const flying = g.airRide?.riding;
    const placing = g.decor?.placing;
    const s = this.settings;

    // caméra : stick droit ; zoom : L2 recule, R2 rapproche (en vol, les gâchettes règlent l'altitude)
    if (this.look.x || this.look.y) {
      g.rig.rotate(-this.look.x * 2.4 * s.sensitivity * dt, this.look.y * 1.5 * s.sensitivity * dt);
      if (g.sailing) g.sailing.lastDrag = performance.now();
    }
    if (flying) {
      if (this.trig.r > 0.3) this.held.add('Space');
      if (this.trig.l > 0.3) this.held.add('ControlLeft');
    } else {
      const z = this.trig.l - this.trig.r;
      if (Math.abs(z) > 0.05) g.rig.zoom(Math.exp(z * 1.3 * dt));
    }
    // à la voile : L1 borde, R1 choque
    if (aboard) {
      if (this.down(BTN.L1)) this.held.add('KeyR');
      if (this.down(BTN.R1)) this.held.add('KeyF');
    }

    // ✕ : interagir s'il y a quelque chose à portée, sinon sauter (poser l'objet en placement)
    if (this.pressed(BTN.CROSS)) {
      if (placing) g.decor.place();
      else if (g.interactPrimary ? g.interactPrimary(false) : key('KeyE')) this.rumble(0.12, 0.3, 50);
      else if (!aboard && !flying) this.flags.jump = true;
    }
    // □ : utiliser l'outil tenu (récolter, creuser, pêcher)
    if (this.pressed(BTN.SQUARE)) {
      if (placing) g.decor.storePlacement();
      else if (!aboard && !flying && g.gather?.target) {
        g.gather.act();
        this.rumble(0.3, 0.45, 80);
      } else if (key('KeyE')) this.rumble(0.12, 0.3, 50);
    }
    // L3 : le sprint s'enclenche (un clic suffit) et dure jusqu'à ce qu'on lâche le stick ;
    // un second clic l'arrête
    if (this.pressed(BTN.L3)) this.sprint = !this.sprint;
    if (!this.move.x && !this.move.y && !this.down(BTN.L3)) this.sprint = false;
    // ◯ : se lever ou annuler un placement en priorité, sinon roulade
    if (this.pressed(BTN.CIRCLE)) {
      const seated = g.player?.mode === 'seated' && !g.player.locked;
      if (seated || placing || flying || aboard) key('Escape');
      else this.flags.roll = true;
    }
    // △ : sac et atelier
    if (this.pressed(BTN.TRIANGLE)) g.openInventory();
    // L1 / R1 : objet précédent / suivant (tourner l'objet en placement)
    if (!aboard) {
      if (this.pressed(BTN.L1)) placing ? g.decor.rotate() : this.hotbar(-1);
      if (this.pressed(BTN.R1)) placing ? g.decor.rotate() : this.hotbar(1);
    }
    // croix : ↑ aigle (en vol : chute libre, puis le rappeler), ↓ journal, ← → barre rapide
    if (this.pressed(BTN.UP)) {
      if (flying && g.airRide.flightPhase !== 'freefall') key('KeyF');
      else key('KeyG');
    }
    if (this.pressed(BTN.DOWN)) g.openJournal();
    if (this.pressed(BTN.LEFT)) this.hotbar(-1);
    if (this.pressed(BTN.RIGHT)) this.hotbar(1);
    if (this.pressed(BTN.CREATE) || this.pressed(BTN.TOUCHPAD)) g.openMap();
    if (this.pressed(BTN.OPTIONS)) g.openSettings();
    // R3 : caméra replacée derrière le personnage (ou le bateau)
    if (this.pressed(BTN.R3)) {
      const heading = aboard ? g.sailing.heading : g.player.facing;
      g.rig.yaw = heading + Math.PI;
    }
    // placement d'un objet : il suit un point à 3 m devant le personnage
    if (placing) this.aimPlacement();
  }

  hotbar(d) {
    const g = this.game;
    const n = g.hotbar?.cells.length || 0;
    if (!n) return;
    g.hotbar.select((((g.state.sel || 0) + d) % n + n) % n);
  }

  aimPlacement() {
    const g = this.game;
    const P = g.player.pos;
    const x = P.x + Math.sin(g.player.facing) * 3;
    const z = P.z + Math.cos(g.player.facing) * 3;
    const p = projectCurved({ x, y: groundAt(x, z).y, z }, g.camera, window.innerWidth, window.innerHeight, _aim);
    if (p.visible) {
      g.input.pointer.x = p.x;
      g.input.pointer.y = p.y;
    }
  }

  // ---------------------------------------------------------------------------
  // Panneaux ouverts : la croix (ou le stick gauche) déplace la sélection, ✕ valide, ◯ ferme
  panel(dt) {
    const g = this.game;
    const sheet = g.ui.panel?.sheet;
    if (!sheet) return;
    this.sprint = false;
    this.flags.jump = this.flags.roll = false;
    if (sheet !== this.sheet) {
      this.sheet = sheet;
      this.blur();
      // ouvert à la manette : on sélectionne d'emblée le premier élément
      if (this.recent) this.step(sheet, null);
    }
    if (this.pressed(BTN.CIRCLE) || this.pressed(BTN.OPTIONS)) {
      g.handleKey('Escape', { repeat: false });
      return;
    }
    // miroir : le stick droit fait tourner le personnage
    if (g.mirror && this.look.x) g.player.facing += this.look.x * 2.2 * dt;
    // carte : stick gauche pour se déplacer, gâchettes pour zoomer
    const map = sheet.querySelector('canvas.map-canvas');
    const pad = map?.padControl;
    if (pad) {
      if (this.move.x || this.move.y) pad.pan(this.move.x * 520 * dt, -this.move.y * 520 * dt);
      const z = this.trig.l - this.trig.r;
      if (Math.abs(z) > 0.05) pad.zoom(Math.exp(z * 1.6 * dt));
    }
    let dir = this.pressed(BTN.UP) ? [0, -1] : this.pressed(BTN.DOWN) ? [0, 1] : this.pressed(BTN.LEFT) ? [-1, 0] : this.pressed(BTN.RIGHT) ? [1, 0] : null;
    if (!dir && !pad) dir = this.stickNav(dt);
    if (dir) this.step(sheet, dir);
    if (this.pressed(BTN.CROSS)) {
      if (this.focus && sheet.contains(this.focus)) {
        this.focus.click();
        this.rumble(0.08, 0.2, 40);
        // le contenu a pu être redessiné (onglets) : on garde une sélection valide
        if (!this.focus.isConnected && g.ui.panel?.sheet === sheet) this.step(sheet, null);
      } else this.step(sheet, null);
    }
    // L1 / R1 : onglet précédent / suivant
    if (this.pressed(BTN.L1) || this.pressed(BTN.R1)) {
      const tabs = [...sheet.querySelectorAll('.tab')].filter(visible);
      const at = tabs.findIndex((t) => t.classList.contains('active'));
      if (tabs.length && at >= 0) {
        tabs[(at + (this.pressed(BTN.R1) ? 1 : -1) + tabs.length) % tabs.length].click();
        this.step(sheet, null);
      }
    }
    // stick droit : faire défiler le contenu
    if (this.look.y && !g.mirror) {
      const box = this.scroller(this.focus && sheet.contains(this.focus) ? this.focus : sheet, sheet);
      if (box) box.scrollTop += this.look.y * 700 * dt;
    }
  }

  // le stick gauche se comporte comme la croix, avec répétition quand on le maintient
  stickNav(dt) {
    const { x, y } = this.move;
    let d = '';
    if (Math.max(Math.abs(x), Math.abs(y)) > 0.6) d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'R' : 'L') : y > 0 ? 'U' : 'D';
    if (!d) {
      this.nav.dir = '';
      return null;
    }
    if (d === this.nav.dir) {
      this.nav.t -= dt;
      if (this.nav.t > 0) return null;
      this.nav.t = 0.13;
    } else {
      this.nav.dir = d;
      this.nav.t = 0.38;
    }
    return { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[d];
  }

  step(sheet, dir) {
    const els = [...sheet.querySelectorAll(FOCUSABLE)].filter((el) => visible(el) && !el.closest('.hidden'));
    if (!els.length) return;
    const cur = this.focus;
    if (!dir || !cur || !els.includes(cur)) {
      // première sélection : en évitant la croix de fermeture quand il y a mieux
      this.setFocus(els.find((el) => !el.classList.contains('panel-close')) || els[0]);
      return;
    }
    // curseur (volumes, heure…) : gauche et droite changent la valeur
    if (cur.matches('input[type="range"]') && dir[0] !== 0) {
      const min = parseFloat(cur.min) || 0;
      const max = parseFloat(cur.max) || 1;
      const stepV = Math.max(parseFloat(cur.step) || 0.01, (max - min) / 40);
      cur.value = String(Math.min(max, Math.max(min, parseFloat(cur.value) + dir[0] * stepV)));
      cur.dispatchEvent(new Event('input', { bubbles: true }));
      cur.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const others = els.filter((el) => el !== cur);
    const i = pickFocus(center(cur), others.map(center), dir[0], dir[1]);
    if (i >= 0) this.setFocus(others[i]);
  }

  setFocus(el) {
    this.focus?.classList.remove('pad-focus');
    this.focus = el;
    el.classList.add('pad-focus');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  blur() {
    this.focus?.classList.remove('pad-focus');
    this.focus = null;
  }

  scroller(from, root) {
    for (let el = from; el && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return el;
      if (el === root) break;
    }
    return null;
  }

  // aide affichée en bas de l'écran quand la manette sert
  hint() {
    return 'Stick gauche : courir (à moitié : marcher · enfoncé : sprint) · ✕ : sauter / interagir · ◯ : roulade · □ : outil · △ : sac · L1/R1 : objet · ↑ : aigle · stick droit : caméra';
  }
}
