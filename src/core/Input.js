import * as THREE from 'three';

// Clavier : on lit event.code (position physique), donc ZQSD en AZERTY
// et WASD en QWERTY fonctionnent tous les deux, ainsi que les flèches.
const MOVE = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.enabled = true;
    this.onClick = null; // (x, y, event)
    this.onDrag = null; // (dx, dy)
    this.onWheel = null; // (delta)
    this.onKey = null; // (code, event) → true si consommé
    this.pad = null; // manette (voir Gamepad.js), branchée par le jeu
    this.taps = new Set(); // touches enfoncées depuis la dernière image (saut, roulade)
    this.pointer = { x: 0, y: 0, down: false, sx: 0, sy: 0, moved: false, button: 0 };
    this.lastMove = performance.now();

    window.addEventListener('keydown', (e) => this.keydown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      this.pointer.down = true;
      this.pointer.button = e.button;
      this.pointer.sx = this.pointer.x = e.clientX;
      this.pointer.sy = this.pointer.y = e.clientY;
      this.pointer.moved = false;
      canvas.setPointerCapture?.(e.pointerId);
    });
    window.addEventListener('pointermove', (e) => {
      this.lastMove = performance.now();
      const p = this.pointer;
      if (p.down && e.buttons === 0) p.down = false;
      if (p.down) {
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.moved = true;
        if (p.moved) this.onDrag?.(dx, dy, p.button);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      const p = this.pointer;
      if (p.down && !p.moved && p.button === 0) this.onClick?.(e.clientX, e.clientY, e);
      p.down = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.onWheel?.(e.deltaY);
    }, { passive: false });
  }

  keydown(e) {
    this.lastMove = performance.now();
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    if (typing) return;
    if (this.onKey?.(e.code, e)) {
      e.preventDefault();
      return;
    }
    if (MOVE[e.code] || e.code === 'Space' || e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
    if (!e.repeat) this.taps.add(e.code);
    this.keys.add(e.code);
  }

  get run() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || !!this.pad?.run;
  }

  // Touche enfoncée depuis la dernière lecture (un appui = une action)
  consumeTap(code) {
    return this.taps.delete(code);
  }

  // Touche tenue au clavier, ou simulée par la manette (voile, altitude en vol)
  held(code) {
    return this.keys.has(code) || !!this.pad?.held.has(code);
  }

  // Axes bruts (x : gauche/droite, y : avant/arrière), pour la barre du bateau
  axes() {
    let x = 0;
    let y = 0;
    if (this.enabled) {
      for (const k of this.keys) {
        const m = MOVE[k];
        if (m) {
          x += m[0];
          y += m[1];
        }
      }
      // stick gauche de la manette (analogique)
      if (this.pad) {
        x += this.pad.move.x;
        y += this.pad.move.y;
      }
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  // Vecteur de déplacement dans le monde, relatif à l'orientation caméra
  moveVector(forward, out = new THREE.Vector3()) {
    let fx = 0;
    let fy = 0;
    if (this.enabled) {
      for (const k of this.keys) {
        const m = MOVE[k];
        if (m) {
          fx += m[0];
          fy += m[1];
        }
      }
    }
    if (fx !== 0 || fy !== 0) {
      const len = Math.hypot(fx, fy);
      fx /= len;
      fy /= len;
    } else if (this.enabled && this.pad && (this.pad.move.x || this.pad.move.y)) {
      // stick : on garde son intensité (petite inclinaison = marche lente)
      fx = this.pad.move.x;
      fy = this.pad.move.y;
    } else return out.set(0, 0, 0);
    // forward = direction caméra (x, z) ; droite = (-forward.y, forward.x)
    const rx = -forward.y;
    const rz = forward.x;
    return out.set(forward.x * fy + rx * fx, 0, forward.y * fy + rz * fx);
  }
}
