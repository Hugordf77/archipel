// Carte parchemin (M) de l'archipel, bornée à son emprise : brouillard qui se lève autour du
// joueur, îles découvertes et leurs noms (les autres en pointillés), limite du large, épingles,
// zone du bateau, traces des cartes au trésor, part de l'archipel découverte.
import { h } from './dom.js';
import { ISLANDS } from '../world/islands/regions.js';
import { ARCHIPEL } from '../world/archipel.js';
import { islandContext, islandHeight } from '../world/islands/islandgen.js';
import { BIOMES } from '../world/islands/biomes.js';
import { isRevealed, FOG_CELL, fogShare } from '../world/fog.js';
import { heightAt } from '../world/home/terrain.js';
import { BOATS } from '../models/bateaux/index.js';

const shapeCache = new Map();
// silhouette peinte d'une île (petit canevas mis en cache)
function islandShape(desc) {
  let c = shapeCache.get(desc.id);
  if (c) return c;
  const N = 40;
  c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const isHome = desc.id === 'home';
  const ctx = isHome ? null : islandContext(desc);
  const ext = isHome ? 40 : desc.r * 1.38;
  const pal = BIOMES[desc.biome]?.pal || BIOMES.prairie.pal;
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const sand = hex(pal.sand);
  const grass = hex(pal.grass[1]);
  const rock = hex(pal.rock);
  const shallow = [176, 225, 214];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -ext + ((i + 0.5) / N) * ext * 2;
      const z = -ext + ((j + 0.5) / N) * ext * 2;
      const hgt = isHome ? heightAt(x, z) : islandHeight(ctx, x, z);
      let col = null;
      let a = 255;
      if (hgt > 1.3) col = hgt > (isHome ? 6 : desc.biome === 'volcan' ? 14 : 16) ? rock : grass;
      else if (hgt > -0.3) col = sand;
      else if (hgt > -2.5) {
        col = shallow;
        a = 150;
      }
      const k = (j * N + i) * 4;
      if (col) {
        img.data[k] = col[0];
        img.data[k + 1] = col[1];
        img.data[k + 2] = col[2];
        img.data[k + 3] = a;
      }
    }
  }
  g.putImageData(img, 0, 0);
  shapeCache.set(desc.id, c);
  return c;
}

export function openMapPanel(game) {
  const st = game.state;
  const ex = st.explorer;
  const P = game.player.pos;
  const view = { cx: P.x, cz: P.z, mpp: 4 }; // mètres par pixel
  const B = ARCHIPEL.bounds;
  const canvas = h('canvas', { class: 'map-canvas', tabindex: '0', 'aria-label': 'Carte de l\'archipel' });
  const share = Math.round(fogShare(ex.fog) * 100);
  const known = Object.keys(ex.islands).filter((id) => ISLANDS.some((d) => d.id === id)).length;
  const legend = h('p', { class: 'muted map-legend' }, `${known} / ${ISLANDS.length} îles · ${share} % de l'archipel découvert. Glisse pour te déplacer, molette ou +/− pour zoomer, clique pour poser ou retirer une épingle.`);
  const zoomTxt = h('span', { class: 'map-scale' }, '');
  const btn = (label, title, fn) => h('button', { class: 'btn ghost small', title, onclick: fn }, label);
  const tools = h('div', { class: 'row map-tools' },
    btn('−', 'Dézoomer', () => zoom(1.4)),
    btn('+', 'Zoomer', () => zoom(1 / 1.4)),
    btn('Me centrer', 'Revenir sur ta position', () => {
      view.cx = P.x;
      view.cz = P.z;
      draw();
    }),
    btn('Île de départ', 'Centrer sur ton île', () => {
      view.cx = 0;
      view.cz = 0;
      draw();
    }),
    btn('Tout l\'archipel', 'Voir l\'archipel en entier', () => overview()),
    zoomTxt,
  );
  const body = h('div', { class: 'stack map-body' }, canvas, tools, legend);
  game.ui.openPanel(body, { title: 'Carte de l\'archipel', icon: 'map', className: 'map-panel' });

  const g = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, Math.round(r.width));
    H = Math.max(200, Math.round(r.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const toScreen = (x, z) => [W / 2 + (x - view.cx) / view.mpp, H / 2 + (z - view.cz) / view.mpp];
  const toWorld = (sx, sy) => [view.cx + (sx - W / 2) * view.mpp, view.cz + (sy - H / 2) * view.mpp];

  function draw() {
    if (!W) resize();
    g.clearRect(0, 0, W, H);
    // parchemin
    g.fillStyle = '#f6ead2';
    g.fillRect(0, 0, W, H);
    // mer découverte (cases du brouillard)
    const cellPx = FOG_CELL / view.mpp;
    const [x0, z0] = toWorld(0, 0);
    const [x1, z1] = toWorld(W, H);
    const step = cellPx < 3 ? Math.ceil(3 / cellPx) : 1;
    g.fillStyle = '#cfe9e4';
    for (let cz = Math.floor(z0 / FOG_CELL); cz <= Math.ceil(z1 / FOG_CELL); cz += step) {
      for (let cx = Math.floor(x0 / FOG_CELL); cx <= Math.ceil(x1 / FOG_CELL); cx += step) {
        if (!isRevealed(ex.fog, (cx + 0.5) * FOG_CELL, (cz + 0.5) * FOG_CELL)) continue;
        const [sx, sy] = toScreen(cx * FOG_CELL, cz * FOG_CELL);
        g.fillRect(sx - 0.5, sy - 0.5, cellPx * step + 1, cellPx * step + 1);
      }
    }
    // hachures « terra incognita » très légères
    g.strokeStyle = 'rgba(159, 107, 72, 0.08)';
    g.lineWidth = 1;
    for (let k = -H; k < W; k += 14) {
      g.beginPath();
      g.moveTo(k, H);
      g.lineTo(k + H, 0);
      g.stroke();
    }
    // zone du bateau
    const spec = BOATS[st.boat.type];
    if (Number.isFinite(spec.zone)) {
      const [hx, hy] = toScreen(0, 0);
      g.setLineDash([6, 6]);
      g.strokeStyle = 'rgba(63, 143, 138, 0.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(hx, hy, spec.zone / view.mpp, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    // emprise de l'archipel et limite du large
    {
      const [ax, ay] = toScreen(B.minX, B.minZ);
      const [bx, by] = toScreen(B.maxX, B.maxZ);
      g.strokeStyle = 'rgba(159, 107, 72, 0.45)';
      g.lineWidth = 1.5;
      g.strokeRect(ax, ay, bx - ax, by - ay);
      const [hx, hy] = toScreen(0, 0);
      g.setLineDash([3, 7]);
      g.strokeStyle = 'rgba(91, 74, 99, 0.35)';
      g.beginPath();
      g.arc(hx, hy, ARCHIPEL.limit.mist / view.mpp, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    // îles
    const isles = [...ISLANDS, { id: 'home', x: 0, z: 0, r: 30, biome: 'prairie', name: ARCHIPEL.home.name }];
    const labels = [];
    for (const d of isles) {
      const known = d.id === 'home' || ex.islands[d.id];
      const seen = known || isRevealed(ex.fog, d.x, d.z) || isRevealed(ex.fog, d.x + d.r * 0.7, d.z) || isRevealed(ex.fog, d.x - d.r * 0.7, d.z) || isRevealed(ex.fog, d.x, d.z + d.r * 0.7) || isRevealed(ex.fog, d.x, d.z - d.r * 0.7);
      if (!seen) {
        // île encore inconnue : un contour en pointillés, sans nom
        const [sx, sy] = toScreen(d.x, d.z);
        g.setLineDash([4, 5]);
        g.strokeStyle = 'rgba(159, 107, 72, 0.4)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(sx, sy, Math.max(4, (d.r * 0.9) / view.mpp), 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        continue;
      }
      const ext = d.id === 'home' ? 40 : d.r * 1.38;
      const [sx, sy] = toScreen(d.x - ext, d.z - ext);
      const size = (ext * 2) / view.mpp;
      g.imageSmoothingEnabled = true;
      g.drawImage(islandShape(d), sx, sy, size, size);
      if (known) labels.push({ x: d.x, z: d.z + d.r * 0.9, text: d.name, home: d.id === 'home' });
    }
    // traces des cartes au trésor
    for (const t of ex.treasures || []) {
      if (t.found) continue;
      const [sx, sy] = toScreen(t.x, t.z);
      g.strokeStyle = '#c5604c';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(sx - 7, sy - 7);
      g.lineTo(sx + 7, sy + 7);
      g.moveTo(sx + 7, sy - 7);
      g.lineTo(sx - 7, sy + 7);
      g.stroke();
    }
    // bateau (s'il est ailleurs)
    if (!game.sailing?.aboard) {
      const [bx, by] = toScreen(st.boat.x, st.boat.z);
      g.fillStyle = '#e0b07e';
      g.strokeStyle = '#9f6b48';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(bx, by, 7, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    // noms
    g.font = '600 13px Fredoka, Nunito, sans-serif';
    g.textAlign = 'center';
    for (const l of labels) {
      const [sx, sy] = toScreen(l.x, l.z);
      g.lineWidth = 4;
      g.strokeStyle = '#f6ead2';
      g.strokeText(l.text, sx, sy + 14);
      g.fillStyle = l.home ? '#9f6b48' : '#5b4a63';
      g.fillText(l.text, sx, sy + 14);
    }
    // lieux découverts : un point, et leur nom quand on zoome
    g.font = '500 12px Nunito, sans-serif';
    for (const p of Object.values(ex.pois || {})) {
      const [sx, sy] = toScreen(p.x, p.z);
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      g.fillStyle = p.type === 'village' ? '#c5604c' : '#3f8f8a';
      g.beginPath();
      g.arc(sx, sy, view.mpp < 3 ? 4 : 2.5, 0, Math.PI * 2);
      g.fill();
      if (view.mpp < 2.2) {
        g.lineWidth = 3;
        g.strokeStyle = '#f6ead2';
        g.strokeText(p.name, sx, sy - 7);
        g.fillStyle = '#5b4a63';
        g.fillText(p.name, sx, sy - 7);
      }
    }
    // épingles
    for (const p of ex.pins) {
      const [sx, sy] = toScreen(p.x, p.z);
      g.fillStyle = '#f4a28c';
      g.strokeStyle = '#b9705f';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sx, sy - 10, 6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(sx, sy - 4);
      g.lineTo(sx, sy);
      g.stroke();
    }
    // joueur : flèche dans la direction du regard
    const [px, py] = toScreen(P.x, P.z);
    const f = game.sailing?.aboard ? game.sailing.heading : game.player.facing;
    g.save();
    g.translate(px, py);
    g.rotate(-f + Math.PI);
    g.fillStyle = '#c5604c';
    g.strokeStyle = '#fffaf0';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(0, -11);
    g.lineTo(8, 9);
    g.lineTo(0, 4);
    g.lineTo(-8, 9);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
    // rose des vents
    g.fillStyle = '#9f6b48';
    g.font = '700 16px Fredoka, sans-serif';
    g.fillText('N', W - 28, 30);
    g.strokeStyle = '#9f6b48';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(W - 28, 36);
    g.lineTo(W - 28, 56);
    g.stroke();
    zoomTxt.textContent = `1 cm ≈ ${Math.round(view.mpp * 38)} m`;
  }

  // la vue reste sur l'archipel ; le dézoom maximal le montre en entier
  const maxMpp = () => Math.max((B.maxX - B.minX) / Math.max(200, W || 600), (B.maxZ - B.minZ) / Math.max(200, H || 500)) * 1.08;
  function clampView() {
    view.mpp = Math.max(0.6, Math.min(maxMpp(), view.mpp));
    view.cx = Math.max(B.minX, Math.min(B.maxX, view.cx));
    view.cz = Math.max(B.minZ, Math.min(B.maxZ, view.cz));
  }
  function zoom(k) {
    view.mpp *= k;
    clampView();
    draw();
  }
  function overview() {
    view.cx = (B.minX + B.maxX) / 2;
    view.cz = (B.minZ + B.maxZ) / 2;
    view.mpp = maxMpp();
    draw();
  }

  // interactions : glisser, molette, épingles
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, cx: view.cx, cz: view.cz, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    view.cx = drag.cx - dx * view.mpp;
    view.cz = drag.cz - dy * view.mpp;
    clampView();
    if (drag.moved) draw();
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (!d || d.moved) return;
    const r = canvas.getBoundingClientRect();
    const [wx, wz] = toWorld(e.clientX - r.left, e.clientY - r.top);
    const hit = ex.pins.findIndex((p) => Math.hypot(p.x - wx, p.z - wz) < 10 * view.mpp);
    if (hit >= 0) ex.pins.splice(hit, 1);
    else if (ex.pins.length < 40) ex.pins.push({ x: Math.round(wx), z: Math.round(wz) });
    else game.ui.toast('40 épingles au plus : retires-en une avant.', { icon: 'pin' });
    game.markDirty();
    draw();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') zoom(1 / 1.4);
    else if (e.key === '-') zoom(1.4);
  });
  // manette : stick gauche pour parcourir la carte, gâchettes pour zoomer (pixels écran)
  canvas.padControl = {
    pan(dx, dy) {
      view.cx += dx * view.mpp;
      view.cz += dy * view.mpp;
      clampView();
      draw();
    },
    zoom,
  };
  requestAnimationFrame(() => {
    resize();
    clampView();
    draw();
    canvas.focus();
  });
}
