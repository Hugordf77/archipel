// Retours de la locomotion : sons, bouffées (poussière, écume, souffle, sueur), vibrations
// de la manette et caméra (champ de vision au sprint, secousses), à partir des événements
// du moteur (player.events) et de son état continu (player.loco).
import { ORIGIN } from '../../core/globals.js';
import { bankAngle } from './pose.js';

export class LocoFeedback {
  constructor(game) {
    this.game = game;
    this.trailT = 0;
    this.turnT = 0;
    this.breathT = 0;
    this.sweatT = 0;
    this.pantT = 0;
  }

  get shakeOn() {
    return this.game.state?.settings?.motion?.shake !== false;
  }

  get stepRumbleOn() {
    return this.game.state?.settings?.pad?.stepRumble !== false;
  }

  // positions absolues → scène (origine flottante)
  dust(x, y, z, o) {
    this.game.character.dustPool.spawn(x - ORIGIN.x, y, z - ORIGIN.z, o);
  }

  foam(x, y, z, o) {
    this.game.character.foamPool.spawn(x - ORIGIN.x, y, z - ORIGIN.z, o);
  }

  rumble(strong, weak, ms) {
    this.game.pad?.rumble(strong, weak, ms);
  }

  shake(amount) {
    if (this.shakeOn) this.game.rig.shake?.(amount);
  }

  // anneau de bouffées autour des pieds
  ring(e, n, speed, size, foam = false) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const vx = Math.cos(a) * speed;
      const vz = Math.sin(a) * speed;
      const life = 0.5 + Math.random() * 0.2;
      if (foam) this.foam(e.x, e.y + 0.05, e.z, { vx, vz, vy: 1.2, grav: 4, size, life, grow: 0.25 });
      else this.dust(e.x, e.y + 0.05, e.z, { vx, vz, vy: 0.3, size, life, grow: 0.25 });
    }
  }

  handle(e) {
    const g = this.game;
    const audio = g.audio;
    const fx = Math.sin(e.heading || 0);
    const fz = Math.cos(e.heading || 0);
    switch (e.type) {
      case 'step': {
        // chaque appui se sent : vibration légère alternée gauche / droite, caméra qui balance
        const k = Math.min(1, Math.max(0, (e.v - 2.2) / 6));
        if (k > 0) {
          if (this.stepRumbleOn) this.rumble(e.side < 0 ? 0.04 + 0.1 * k : 0, e.side > 0 ? 0.05 + 0.12 * k : 0, 32);
          if (this.shakeOn) g.rig.bob?.(0.025 + 0.06 * k, e.side * (0.4 + 0.6 * k));
        }
        if (e.surface === 'shallow') {
          for (let i = 0; i < 3; i++) this.foam(e.x, e.y + 0.05, e.z, { vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, vy: 1.4, grav: 5, size: 0.08, life: 0.45, grow: 0.08 });
          return;
        }
        if (e.v < 3.6) return;
        // poussière au talon, côté du pied qui pousse
        const sx = -fz * 0.09 * e.side;
        const sz = fx * 0.09 * e.side;
        const n = e.surface === 'sand' ? 2 : 1;
        for (let i = 0; i < n; i++) this.dust(e.x + sx - fx * 0.12, e.y + 0.04, e.z + sz - fz * 0.12, { size: 0.12 + e.v * 0.012, vy: 0.35, vx: -fx * 0.6, vz: -fz * 0.6, life: 0.5 });
        return;
      }
      case 'skidStart':
        audio?.skid(g.player.loco.surface, Math.max(0.4, e.v / 8));
        this.rumble(0.45, 0.2, 160);
        this.shake(0.03);
        this.trailT = 0;
        return;
      case 'pivot':
        audio?.hop(false);
        this.ring(e, 4, 1.2, 0.14);
        return;
      case 'turn':
        this.dust(e.x, e.y + 0.04, e.z, { size: 0.1, life: 0.35 });
        return;
      case 'roll':
        audio?.roll(e.chain || 0);
        if (e.chain > 0) this.rumble(0.3, 0.6, 60);
        else this.rumble(0.2, 0.4, 70);
        for (let i = 0; i < 2; i++) this.dust(e.x - fx * 0.2, e.y + 0.05, e.z - fz * 0.2, { size: 0.16, vx: -fx * 1.2 + (Math.random() - 0.5), vz: -fz * 1.2 + (Math.random() - 0.5), vy: 0.4 });
        return;
      case 'bonk':
        audio?.bonk();
        this.rumble(1, 0.6, 220);
        this.shake(0.12);
        // petites étoiles qui tournent au-dessus de la tête
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          this.foam(e.x + Math.cos(a) * 0.35, e.y + 1.5, e.z + Math.sin(a) * 0.35, { vx: -Math.sin(a) * 1.2, vz: Math.cos(a) * 1.2, vy: 0.2, size: 0.07, life: 0.7, grow: 0.02, drag: 0.5 });
        }
        this.ring(e, 4, 1.4, 0.16);
        return;
      case 'trip':
        audio?.trip();
        this.rumble(0.5, 0.3, 110);
        this.dust(e.x + fx * 0.3, e.y + 0.05, e.z + fz * 0.3, { size: 0.18, vy: 0.5 });
        return;
      case 'faceplant': {
        const imp = e.impact || 6;
        audio?.land(imp + 4, g.player.loco.surface);
        audio?.bump();
        this.rumble(0.9, 0.6, 220);
        this.shake(0.1);
        // le corps est étendu devant les pieds : la poussière jaillit sous le ventre
        const c = { ...e, x: e.x + fx * 0.6, z: e.z + fz * 0.6 };
        this.ring(c, 8, 1.6, 0.2);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          this.foam(c.x + Math.cos(a) * 0.35, e.y + 0.7, c.z + Math.sin(a) * 0.35, { vx: -Math.sin(a) * 1.2, vz: Math.cos(a) * 1.2, vy: 0.15, size: 0.07, life: 0.8, grow: 0.02, drag: 0.5 });
        }
        return;
      }
      case 'getup':
        this.ring({ ...e, x: e.x + fx * 0.4, z: e.z + fz * 0.4 }, 4, 0.8, 0.14);
        return;
      case 'jump':
        audio?.hop(e.long);
        this.ring(e, 3, 0.8, 0.12);
        return;
      case 'land': {
        const imp = e.impact || 0;
        audio?.land(imp, g.player.loco.surface);
        this.ring(e, 4 + Math.min(6, Math.round(imp * 0.6)), 0.7 + imp * 0.14, 0.17 + imp * 0.012);
        if (imp > 9) {
          this.rumble(0.8, 0.4, 140);
          this.shake(0.08);
        }
        return;
      }
      case 'splash':
        audio?.splash(Math.min(1.5, 0.4 + (e.v || 0) / 8));
        this.ring(e, 8, 1.6, 0.12, true);
        return;
      default:
    }
  }

  // effets continus : traînées, souffle, sueur, halètement, champ de vision
  update(dt) {
    const g = this.game;
    const p = g.player;
    const L = p.loco;
    const moving = p.mode === 'free' || p.mode === 'goto';
    const speed = p.actualSpeed;
    const fx = Math.sin(p.facing);
    const fz = Math.cos(p.facing);
    const P = p.pos;
    if (moving && (L.state === 'SKID' || L.state === 'SLIDE')) {
      this.trailT -= dt;
      if (this.trailT <= 0 && speed > 0.8) {
        this.trailT = 0.04;
        // le pied avant laboure le sol
        if (L.surface === 'shallow') this.foam(P.x + fx * 0.25, P.y + 0.05, P.z + fz * 0.25, { vx: fx * speed * 0.25, vz: fz * speed * 0.25, vy: 1.4, grav: 5, size: 0.1, life: 0.55 });
        else this.dust(P.x + fx * 0.25, P.y + 0.04, P.z + fz * 0.25, { size: 0.22 + speed * 0.02, vx: fx * speed * 0.25, vz: fz * speed * 0.25, vy: 0.45, life: 0.6, grow: 0.4 });
      }
    }
    // virage serré : le pied extérieur pousse
    const bank = bankAngle(speed, L.omega || 0);
    if (moving && L.grounded && (L.state === 'RUN' || L.state === 'SPRINT') && Math.abs(bank) > 0.18) {
      this.turnT -= dt;
      if (this.turnT <= 0) {
        this.turnT = 0.12;
        const side = bank > 0 ? -1 : 1;
        this.dust(P.x - fz * 0.15 * side, P.y + 0.04, P.z + fx * 0.15 * side, { size: 0.13, vx: -fz * side * 0.8, vz: fx * side * 0.8, vy: 0.3, life: 0.45 });
      }
    }
    // souffle au sprint, gouttes de sueur après 6 s
    if (moving && L.state === 'SPRINT') {
      this.breathT -= dt;
      if (this.breathT <= 0) {
        this.breathT = 0.5;
        this.foam(P.x + fx * 0.32, P.y + 0.95, P.z + fz * 0.32, { vx: fx * 0.6, vz: fz * 0.6, vy: 0.15, size: 0.05, life: 0.45, grow: 0.12, drag: 5 });
      }
      if (L.sprintTime > 6) {
        this.sweatT -= dt;
        if (this.sweatT <= 0) {
          this.sweatT = 0.45;
          const s = Math.random() < 0.5 ? -1 : 1;
          this.foam(P.x - fz * 0.22 * s, P.y + 1.25, P.z + fx * 0.22 * s, { vx: -fz * s * 0.8, vz: fx * s * 0.8, vy: 1.6, grav: 7, size: 0.035, life: 0.5, grow: 0, drag: 1 });
        }
      }
    }
    // essoufflé à l'arrêt après un long sprint
    if (g.character.breath > 0.5 && speed < 0.3) {
      this.pantT -= dt;
      if (this.pantT <= 0) {
        this.pantT = 0.75;
        g.audio?.pant();
      }
    }
    // champ de vision un peu plus large au sprint
    const rig = g.rig;
    if (rig) rig.fovKick = moving && L.state === 'SPRINT' ? 6 * Math.min(1, Math.max(0, (speed - 5.4) / 2.8)) : 0;
  }
}
