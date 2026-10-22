import { ARCHIPEL } from '../world/archipel.js';
import { ILES } from '../world/islands/regions.js';
import { islandContext, islandHeight } from '../world/islands/islandgen.js';
import { bilinear } from '../world/islands/gen/grid.js';
import { heightAt, LAYOUT } from '../world/home/terrain.js';
import { isRevealed } from '../world/fog.js';
import { cielSous } from '../world/navigation.js';

const SIZE = 164;
const METERS_PER_PIXEL = 2;
const contexts = new Map();

function terrainColor(height) {
  if (height < -3) return [78, 151, 171, 255];
  if (height < -0.3) return [117, 190, 195, 255];
  if (height < 1.25) return [231, 207, 157, 255];
  if (height < 5) return [151, 192, 127, 255];
  if (height < 12) return [111, 170, 105, 255];
  if (height < 20) return [88, 142, 101, 255];
  if (height < 70) return [143, 139, 127, 255];
  return [236, 240, 244, 255];
}

export class MiniMap {
  constructor(game) {
    this.game = game;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hud minimap';
    this.canvas.width = this.canvas.height = SIZE;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Mini-carte vue du dessus, nord en haut');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.timer = 0;
    this.update(1);
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.35;

    const { player, state } = this.game;
    const { x: px, z: pz } = player.pos;
    const { ctx } = this;
    const image = ctx.createImageData(SIZE, SIZE);
    const heights = new Float32Array(SIZE * SIZE);
    const known = new Uint8Array(SIZE * SIZE);
    const bounds = ARCHIPEL.bounds;
    // relief : la grille de 4 m des îles chargées (rapide), sinon le relief de base de l'île
    const reach = (SIZE / 2) * METERS_PER_PIXEL + 8;
    const near = [...(this.game.islands?.entries.values() || [])].filter((e) => e.plan && Math.abs(e.desc.x - px) < e.plan.ext + reach && Math.abs(e.desc.z - pz) < e.plan.ext + reach);
    const isles = ILES.filter((d) => Math.abs(d.x - px) < d.r * 1.4 + 150 + reach && Math.abs(d.z - pz) < d.r * 1.4 + 150 + reach);
    const loaded = (wx, wz) => {
      for (const e of near) {
        const lx = wx - e.desc.x;
        const lz = wz - e.desc.z;
        const core = e.plan.core || e.plan.ext - 4;
        if (Math.abs(lx) > core || Math.abs(lz) > core) continue;
        return bilinear(e.plan.H, e.plan.n, (lx + e.plan.ext) / e.plan.s, (lz + e.plan.ext) / e.plan.s);
      }
      return null;
    };

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const wx = px + (x - SIZE / 2) * METERS_PER_PIXEL;
        const wz = pz + (y - SIZE / 2) * METERS_PER_PIXEL;
        const i = (y * SIZE + x) * 4;
        const inside = wx >= bounds.minX && wx <= bounds.maxX && wz >= bounds.minZ && wz <= bounds.maxZ;
        if (inside && isRevealed(state.explorer.fog, wx, wz)) {
          let height = -4;
          const ciel = cielSous(wx, wz);
          if (ciel) height = 8;
          else if (Math.hypot(wx, wz) < 52) height = heightAt(wx, wz);
          else if ((height = loaded(wx, wz) ?? -4) === -4) {
            const island = isles.find((d) => Math.abs(wx - d.x) < islandContext(d).ext && Math.abs(wz - d.z) < islandContext(d).ext && islandHeight(islandContext(d), wx - d.x, wz - d.z) > -3);
            if (island) {
              let islandCtx = contexts.get(island.id);
              if (!islandCtx) {
                islandCtx = islandContext(island);
                contexts.set(island.id, islandCtx);
              }
              height = islandHeight(islandCtx, wx - island.x, wz - island.z);
            }
          }
          heights[y * SIZE + x] = height;
          known[y * SIZE + x] = 1;
        }
      }
    }

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const index = y * SIZE + x;
        const i = index * 4;
        let col;
        if (known[index]) {
          col = terrainColor(heights[index]);
          const left = heights[y * SIZE + Math.max(0, x - 1)];
          const right = heights[y * SIZE + Math.min(SIZE - 1, x + 1)];
          const up = heights[Math.max(0, y - 1) * SIZE + x];
          const down = heights[Math.min(SIZE - 1, y + 1) * SIZE + x];
          const relief = (known[y * SIZE + Math.max(0, x - 1)] && known[y * SIZE + Math.min(SIZE - 1, x + 1)]
            && known[Math.max(0, y - 1) * SIZE + x] && known[Math.min(SIZE - 1, y + 1) * SIZE + x])
            ? Math.max(-15, Math.min(15, ((left - right) + (up - down)) * 1.2)) : 0;
          const shade = 1 + relief / 100;
          col = [Math.round(col[0] * shade), Math.round(col[1] * shade), Math.round(col[2] * shade), 255];
        } else {
          const wx = px + (x - SIZE / 2) * METERS_PER_PIXEL;
          const wz = pz + (y - SIZE / 2) * METERS_PER_PIXEL;
          const inside = wx >= bounds.minX && wx <= bounds.maxX && wz >= bounds.minZ && wz <= bounds.maxZ;
          col = inside ? [181, 207, 203, 255] : [96, 164, 180, 255];
        }
        image.data[i] = col[0];
        image.data[i + 1] = col[1];
        image.data[i + 2] = col[2];
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Chemins de l'île de départ, stylisés comme des sentiers de sable.
    if (isRevealed(state.explorer.fog, 0, 0)) {
      const sx = (x) => SIZE / 2 + (x - px) / METERS_PER_PIXEL;
      const sy = (z) => SIZE / 2 + (z - pz) / METERS_PER_PIXEL;
      for (const path of LAYOUT.paths) {
        ctx.beginPath();
        path.forEach(([x, z], i) => (i ? ctx.lineTo(sx(x), sy(z)) : ctx.moveTo(sx(x), sy(z))));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(137, 99, 62, 0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(246, 224, 177, 0.92)';
        ctx.lineWidth = 2.3;
        ctx.stroke();
      }
    }

    // Échelle discrète, nord toujours en haut.
    ctx.strokeStyle = '#f9f2df';
    ctx.fillStyle = '#42534f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 26);
    ctx.lineTo(16, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 17);
    ctx.lineTo(16, 11);
    ctx.lineTo(20, 17);
    ctx.fill();
    ctx.font = '700 10px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 16, 9);

    // Barre d'échelle, dessinée sur une pastille pour rester lisible sur le relief.
    ctx.fillStyle = 'rgba(255, 248, 236, 0.88)';
    ctx.beginPath();
    ctx.roundRect(SIZE - 58, SIZE - 25, 48, 17, 7);
    ctx.fill();
    ctx.fillStyle = '#42534f';
    ctx.font = '700 9px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(20 * METERS_PER_PIXEL)} m`, SIZE - 34, SIZE - 13);

    // Zone nommée où se trouve le joueur (donnée par le jeu), sur une pastille en haut
    if (this.zone) {
      // sous le bord rond de la minicarte : la pastille reste entière
      ctx.font = '700 9px Fredoka, Nunito, sans-serif';
      const w = Math.min(SIZE - 40, ctx.measureText(this.zone.name).width + 12);
      ctx.fillStyle = 'rgba(255, 248, 236, 0.9)';
      ctx.beginPath();
      ctx.roundRect(SIZE / 2 - w / 2, 30, w, 15, 7);
      ctx.fill();
      ctx.fillStyle = '#42534f';
      ctx.textAlign = 'center';
      ctx.fillText(this.zone.name, SIZE / 2, 40.5, w - 8);
    }

    // Flèche du joueur : la carte ne tourne pas, l'indicateur suit son cap.
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(player.facing);
    ctx.fillStyle = '#c5604c';
    ctx.strokeStyle = '#fff8ec';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 5);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const boat = state.boat;
    if (Math.hypot(boat.x - px, boat.z - pz) < (SIZE * METERS_PER_PIXEL) / 2) {
      const bx = SIZE / 2 + (boat.x - px) / METERS_PER_PIXEL;
      const by = SIZE / 2 + (boat.z - pz) / METERS_PER_PIXEL;
      ctx.fillStyle = '#8d5a38';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
