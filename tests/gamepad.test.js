import { describe, expect, it } from 'vitest';
import { BTN, stick, readPad, padName, pickFocus, GamepadInput, identifyController, PS_GLYPHS } from '../src/core/Gamepad.js';

const button = (value) => ({ pressed: value > 0.5, value });

describe('sticks', () => {
  it('ignore la zone morte puis repart de zéro sans à-coup', () => {
    expect(stick(0.1, 0.05)).toEqual([0, 0]);
    const [x, y] = stick(0.16, 0);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(0.02);
    expect(y).toBe(0);
  });

  it('atteint 1 en butée et garde la direction', () => {
    const [x, y] = stick(Math.SQRT1_2, -Math.SQRT1_2);
    expect(Math.hypot(x, y)).toBeCloseTo(1, 5);
    expect(x).toBeCloseTo(-y, 6);
    const [a, b] = stick(0.9, 0.9); // diagonale au-delà du cercle : bornée à 1
    expect(Math.hypot(a, b)).toBeCloseTo(1, 5);
  });
});

describe('lecture des boutons', () => {
  it('lit la disposition standard (Chrome, Edge, Safari)', () => {
    const buttons = Array.from({ length: 17 }, () => button(0));
    buttons[BTN.CROSS] = button(1);
    buttons[BTN.R2] = button(0.4);
    const gp = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', mapping: 'standard', buttons, axes: [0.5, -1, 0, 0.25] };
    const { btn, axes } = readPad(gp);
    expect(btn[BTN.CROSS]).toBe(1);
    expect(btn[BTN.R2]).toBeCloseTo(0.4);
    expect(btn[BTN.TOUCHPAD]).toBe(0); // bouton absent : relâché
    expect(axes).toEqual([0.5, -1, 0, 0.25]);
  });

  it('remet à sa place la DualSense en HID brut (Firefox sur macOS)', () => {
    const buttons = Array.from({ length: 14 }, () => button(0));
    buttons[1] = button(1); // ✕ brut
    buttons[0] = button(1); // □ brut
    buttons[13] = button(1); // pavé tactile
    const axes = [0, 0, 0.3, -1, 1, -0.6, 0, 0, 0, -1]; // L2 relâchée, R2 enfoncée, croix : haut
    const { btn, axes: out } = readPad({ id: '054c-0ce6-DualSense Wireless Controller', mapping: '', buttons, axes });
    expect(btn[BTN.CROSS]).toBe(1);
    expect(btn[BTN.SQUARE]).toBe(1);
    expect(btn[BTN.CIRCLE]).toBe(0);
    expect(btn[BTN.TOUCHPAD]).toBe(1);
    expect(btn[BTN.L2]).toBe(0);
    expect(btn[BTN.R2]).toBe(1);
    expect(btn[BTN.UP]).toBe(1);
    expect(btn[BTN.DOWN] + btn[BTN.LEFT] + btn[BTN.RIGHT]).toBe(0);
    expect(out).toEqual([0, 0, 0.3, -0.6]); // stick droit vertical sur l'axe 5
  });

  it('décode les huit directions de la croix et sa position relâchée', () => {
    const dirs = { '-1': 'U', '-0.714': 'UR', '-0.428': 'R', '-0.142': 'DR', '0.142': 'D', '0.428': 'DL', '0.714': 'L', '1': 'UL', '1.286': '' };
    for (const [hat, want] of Object.entries(dirs)) {
      const axes = [0, 0, 0, -1, -1, 0, 0, 0, 0, Number(hat)];
      const { btn } = readPad({ id: 'Wireless Controller (Vendor: 054c)', mapping: '', buttons: [], axes });
      const got = `${btn[BTN.UP] ? 'U' : ''}${btn[BTN.DOWN] ? 'D' : ''}${btn[BTN.LEFT] ? 'L' : ''}${btn[BTN.RIGHT] ? 'R' : ''}`;
      expect([...got].sort().join(''), `croix ${hat}`).toBe([...want].sort().join(''));
    }
  });

  it('nomme la manette d’après son identifiant', () => {
    expect(padName('DualSense Wireless Controller (Vendor: 054c Product: 0ce6)')).toBe('Manette DualSense');
    expect(padName('Wireless Controller (Vendor: 054c Product: 09cc)')).toBe('Manette DualShock 4');
    expect(padName('Xbox Wireless Controller (Vendor: 045e)')).toBe('Manette Xbox');
    expect(padName('8BitDo')).toBe('Manette');
  });
});

describe('navigation dans les panneaux', () => {
  // grille de boutons 3 × 2 (centres en pixels)
  const grid = [
    { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 100 },
    { x: 100, y: 160 }, { x: 200, y: 160 }, { x: 300, y: 160 },
  ];

  it('va au voisin le plus proche dans la direction demandée', () => {
    const from = { x: 200, y: 100 };
    expect(pickFocus(from, grid, 1, 0)).toBe(2);
    expect(pickFocus(from, grid, -1, 0)).toBe(0);
    expect(pickFocus(from, grid, 0, 1)).toBe(4);
    expect(pickFocus(from, grid, 0, -1)).toBe(-1); // rien au-dessus
  });

  it('préfère la ligne d’en dessous à un élément lointain en biais', () => {
    const cands = [{ x: 420, y: 150 }, { x: 110, y: 170 }];
    expect(pickFocus({ x: 100, y: 100 }, cands, 0, 1)).toBe(1);
  });
});

describe('actions en jeu', () => {
  // jeu réduit au strict nécessaire : on note les touches que la manette déclenche
  const setup = () => {
    globalThis.window ||= { addEventListener() {} };
    const keys = [];
    const game = {
      ui: { panelOpen: false },
      rig: { rotate() {}, zoom() {} },
      handleKey: (code) => {
        keys.push(code);
        return true;
      },
      sailing: { aboard: false },
      airRide: { riding: false, flightPhase: 'glide' },
      decor: null,
      gather: null,
      openInventory() {},
      openJournal() {},
      openMap: () => keys.push('carte'),
      openSettings() {},
      state: { settings: {} },
    };
    const pad = new GamepadInput(game);
    pad.index = 0;
    const frame = (btns = [], move = [0, 0]) => {
      pad.prev.set(pad.cur);
      pad.cur.fill(0);
      for (const b of btns) pad.cur[b] = 1;
      pad.move.x = move[0];
      pad.move.y = move[1];
      pad.dispatch(1 / 60);
    };
    return { pad, keys, frame, game };
  };

  it('court après un clic sur le stick gauche, jusqu’à ce qu’on le lâche', () => {
    const { pad, frame } = setup();
    frame([], [0, 1]);
    expect(pad.run).toBe(false);
    frame([BTN.L3], [0, 1]);
    expect(pad.run).toBe(true);
    frame([], [0, 1]); // stick relâché en tant que bouton, toujours incliné
    expect(pad.run).toBe(true);
    frame([], [0, 0]); // on s'arrête : la course aussi
    expect(pad.run).toBe(false);
    frame([BTN.L3], [0.8, 0]);
    frame([], [0.8, 0]);
    frame([BTN.L3], [0.8, 0]); // second clic : retour à la marche
    expect(pad.run).toBe(false);
  });

  it('roule avec ◯ en se déplaçant ; assis, ◯ reste le bouton retour', () => {
    const { pad, keys, frame, game } = setup();
    frame([BTN.CIRCLE], [0, 1]);
    expect(pad.run).toBe(false);
    expect(pad.consume('roll')).toBe(true);
    expect(pad.consume('roll')).toBe(false); // lu une seule fois
    expect(keys).not.toContain('Escape');
    game.player = { mode: 'seated', locked: false };
    frame([]);
    frame([BTN.CIRCLE]);
    expect(keys).toContain('Escape');
    expect(pad.consume('roll')).toBe(false);
  });

  it('saute avec ✕ quand rien n’est à portée, interagit sinon', () => {
    const { pad, frame, game } = setup();
    let near = false;
    game.interactPrimary = () => near;
    frame([BTN.CROSS]);
    expect(pad.consume('jump')).toBe(true);
    near = true;
    frame([]);
    frame([BTN.CROSS]);
    expect(pad.consume('jump')).toBe(false);
  });

  it('appelle l’aigle avec ↑ (en vol : chute libre, puis le rappeler)', () => {
    const { keys, frame, game } = setup();
    frame([BTN.UP]);
    expect(keys).toEqual(['KeyG']);
    game.airRide.riding = true;
    frame([]);
    frame([BTN.UP]);
    expect(keys.at(-1)).toBe('KeyF');
    game.airRide.flightPhase = 'freefall';
    frame([]);
    frame([BTN.UP]);
    expect(keys.at(-1)).toBe('KeyG');
    expect(keys).not.toContain('carte');
  });
});

describe('reconnaisseur de manettes (identifyController)', () => {
  it('détecte avec précision la DualSense PS5 en Bluetooth et USB', () => {
    const btPad = { id: 'DualSense Wireless Controller (Vendor: 054c Product: 0ce6)' };
    const btInfo = identifyController(btPad);
    expect(btInfo.model).toBe('Sony DualSense (PS5)');
    expect(btInfo.generation).toBe('PS5');
    expect(btInfo.family).toBe('playstation');
    expect(btInfo.isPlayStation).toBe(true);
    expect(btInfo.isPS5).toBe(true);
    expect(btInfo.isPS4).toBe(false);
    expect(btInfo.connection).toBe('Bluetooth');
    expect(btInfo.hasTouchpad).toBe(true);

    const usbPad = { id: 'Sony Interactive Entertainment DualSense USB (Vendor: 054c Product: 0ce6)' };
    const usbInfo = identifyController(usbPad);
    expect(usbInfo.isPS5).toBe(true);
    expect(usbInfo.connection).toBe('USB');
  });

  it('détecte la DualSense Edge PS5', () => {
    const edgePad = { id: 'DualSense Edge Wireless Controller (Vendor: 054c Product: 0df2)' };
    const edgeInfo = identifyController(edgePad);
    expect(edgeInfo.model).toBe('Sony DualSense Edge (PS5)');
    expect(edgeInfo.isPS5).toBe(true);
  });

  it('détecte la DualShock 4 (PS4)', () => {
    const ds4 = { id: 'Wireless Controller (Vendor: 054c Product: 09cc)' };
    const info = identifyController(ds4);
    expect(info.model).toBe('Sony DualShock 4 (PS4)');
    expect(info.generation).toBe('PS4');
    expect(info.isPlayStation).toBe(true);
    expect(info.isPS4).toBe(true);
    expect(info.isPS5).toBe(false);
  });

  it('fournit les glyphes PlayStation officiels', () => {
    expect(PS_GLYPHS.CROSS).toBe('✕');
    expect(PS_GLYPHS.CIRCLE).toBe('◯');
    expect(PS_GLYPHS.SQUARE).toBe('□');
    expect(PS_GLYPHS.TRIANGLE).toBe('△');
    expect(PS_GLYPHS.TOUCHPAD).toBe('Pavé tactile');
  });
});

describe('contrôleur DualSense PS5 & haptique', () => {
  const setupPS5 = () => {
    globalThis.window ||= { addEventListener() {} };
    const keys = [];
    const rumbles = [];
    let inventoryOpened = false;
    let settingsOpened = false;
    const game = {
      ui: { panelOpen: false, toast() {} },
      rig: { rotate() {}, zoom() {}, yaw: 0 },
      handleKey: (code) => {
        keys.push(code);
        return true;
      },
      sailing: { aboard: false, heading: 0 },
      airRide: { riding: false, flightPhase: 'glide' },
      decor: null,
      gather: null,
      openInventory: () => { inventoryOpened = true; },
      openJournal() {},
      openMap: () => keys.push('carte'),
      openSettings: () => { settingsOpened = true; },
      state: { settings: { pad: { rumble: true } } },
    };
    const pad = new GamepadInput(game);
    const mockGp = {
      id: 'DualSense Wireless Controller (Vendor: 054c Product: 0ce6)',
      index: 0,
      vibrationActuator: {
        playEffect: (type, params) => {
          rumbles.push({ type, params });
          return Promise.resolve();
        },
      },
    };
    try {
      Object.defineProperty(globalThis.navigator, 'getGamepads', {
        value: () => [mockGp],
        configurable: true,
        writable: true,
      });
    } catch {
      globalThis.navigator.getGamepads = () => [mockGp];
    }
    pad.attach(mockGp);
    const frame = (btns = [], move = [0, 0], triggers = { l: 0, r: 0 }) => {
      pad.prev.set(pad.cur);
      pad.cur.fill(0);
      for (const b of btns) pad.cur[b] = 1;
      pad.move.x = move[0];
      pad.move.y = move[1];
      pad.trig.l = triggers.l;
      pad.trig.r = triggers.r;
      pad.dispatch(1 / 60);
    };
    return {
      pad,
      keys,
      rumbles,
      frame,
      game,
      get inventoryOpened() { return inventoryOpened; },
      get settingsOpened() { return settingsOpened; },
    };
  };

  it('reconnaît la manette connectée comme PlayStation 5', () => {
    const { pad } = setupPS5();
    expect(pad.isPlayStation).toBe(true);
    expect(pad.isPS5).toBe(true);
    expect(pad.isPS4).toBe(false);
  });

  it('△ ouvre l’inventaire au sol et déclenche la chute libre en vol', () => {
    const s = setupPS5();
    s.frame([BTN.TRIANGLE]);
    expect(s.inventoryOpened).toBe(true);
    expect(s.keys).not.toContain('KeyF');

    s.game.airRide.riding = true;
    s.game.airRide.flightPhase = 'flying';
    s.frame([]);
    s.frame([BTN.TRIANGLE]);
    expect(s.keys.at(-1)).toBe('KeyF');
  });

  it('□ rappelle l’aigle en chute libre', () => {
    const s = setupPS5();
    s.game.airRide.riding = true;
    s.game.airRide.flightPhase = 'freefall';
    s.frame([BTN.SQUARE]);
    expect(s.keys.at(-1)).toBe('KeyG');
  });

  it('le pavé tactile ouvre la carte et Options ouvre les réglages', () => {
    const s = setupPS5();
    s.frame([BTN.TOUCHPAD]);
    expect(s.keys).toContain('carte');

    s.frame([]);
    s.frame([BTN.OPTIONS]);
    expect(s.settingsOpened).toBe(true);
  });

  it('gâchettes adaptatives : R2 enfoncé en vol déclenche le turbo, et en chute libre le piqué', () => {
    const s = setupPS5();
    s.game.airRide.riding = true;
    s.game.airRide.flightPhase = 'flying';

    // R2 léger : montée normale
    s.frame([], [0, 0], { l: 0, r: 0.5 });
    expect(s.pad.held.has('Space')).toBe(true);
    expect(s.pad.sprint).toBe(false);

    // R2 à fond (> 0.82) : turbo engagé
    s.frame([], [0, 0], { l: 0, r: 0.9 });
    expect(s.pad.sprint).toBe(true);

    // Chute libre : R2 déclenche le piqué (ShiftLeft)
    s.game.airRide.flightPhase = 'freefall';
    s.frame([], [0, 0], { l: 0, r: 0.6 });
    expect(s.pad.held.has('ShiftLeft')).toBe(true);
  });

  it('déclenche les impulsions haptiques spécialisées', () => {
    const s = setupPS5();
    s.rumbles.length = 0;
    s.pad.hapticJump();
    expect(s.rumbles.length).toBe(1);
    expect(s.rumbles[0].params.strongMagnitude).toBeCloseTo(0.28);

    s.pad.hapticRoll();
    expect(s.rumbles.length).toBe(2);

    s.pad.hapticDive();
    expect(s.rumbles.length).toBe(3);

    s.pad.hapticSplash();
    expect(s.rumbles.length).toBe(4);
    expect(s.rumbles[3].params.strongMagnitude).toBeCloseTo(0.7);
  });

  it('fournit des indices d’aide (hint) dynamiques avec symboles PlayStation', () => {
    const s = setupPS5();
    expect(s.pad.hint()).toContain('✕ : sauter / interagir');
    expect(s.pad.hint()).toContain('Pavé tactile : carte');

    s.game.airRide.riding = true;
    s.game.airRide.flightPhase = 'flying';
    expect(s.pad.hint()).toContain('R2/L2 : altitude');
    expect(s.pad.hint()).toContain('△ ou ↑ : chute libre');

    s.game.airRide.flightPhase = 'freefall';
    expect(s.pad.hint()).toContain('R2/L3 : piqué');
    expect(s.pad.hint()).toContain("□ ou ↑ : rappeler l'aigle");
  });
});

