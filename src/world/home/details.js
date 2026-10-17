import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial, foliageMaterial, glowMaterial, grassMaterial } from '../../render/shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../../core/globals.js';
import { LAYOUT, heightAt, pathMask, vnoise, coastRadius, distToPolyline } from './terrain.js';
import { PAL } from './props.js';
import { buildClumpGeometry } from '../../render/foliage.js';
import { cloudAtlas } from '../../render/textures.js';
import { tuftGeometry } from '../../render/grass.js';

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const UP = new THREE.Vector3(0, 1, 0);
function segment(b, color, a, c, r0, r1, sides = 6, opts = {}) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const m = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
  b.add(G.cyl(r1, r0, len, sides), color, { p: [m.x, m.y, m.z], r: [e.x, e.y, e.z], ...opts });
}

// ---------------------------------------------------------------------------
// Falaise sculptée : paroi à strates qui recouvre la pente du relief
// ---------------------------------------------------------------------------
const STRATA = ['#ecc8a0', '#f1c4b4', '#cd9c78'].map((c) => new THREE.Color(c));
const MOSS = new THREE.Color('#a3d08f');

function cliffColumns() {
  const P = LAYOUT.plateau;
  const R = LAYOUT.ramp;
  const cols = [];
  const N = 420;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const rim = new THREE.Vector2(P.cx + P.rx * c * 0.985, P.cz + P.rz * s * 0.985);
    const foot = new THREE.Vector2(P.cx + P.rx * c * 1.055, P.cz + P.rz * s * 1.055);
    const n = new THREE.Vector2(c / P.rx, s / P.rz).normalize();
    let ok = true;
    if (foot.x > R.x0 - 0.8 && foot.x < R.x1 + 0.8 && foot.y > R.zTop - 1.2 && s > 0) ok = false; // rampe
    if (Math.abs(rim.x - LAYOUT.river[LAYOUT.river.length - 1][0]) < 1.3 && s > 0) ok = false; // cascade
    const top = heightAt(rim.x, rim.y);
    if (top < 2.7) ok = false;
    cols.push({ th, rim, foot, n, ok, top: top - 0.08, bot: heightAt(foot.x, foot.y) - 0.35 });
  }
  return cols;
}

export function buildCliff(rand) {
  const cols = cliffColumns();
  const rows = 10;
  const pos = [];
  const colr = [];
  const idx = [];
  const c = new THREE.Color();
  let start = -1;
  const flush = (a, b) => {
    // b exclusif
    const base = pos.length / 3;
    const n = b - a;
    if (n < 2) return;
    for (let k = a; k < b; k++) {
      const col = cols[k];
      for (let r = 0; r <= rows; r++) {
        const t = r / rows;
        const y = THREE.MathUtils.lerp(col.top, col.bot, t);
        const hz = THREE.MathUtils.lerp(0, 1, Math.pow(t, 0.75));
        const x0 = THREE.MathUtils.lerp(col.rim.x, col.foot.x, hz);
        const z0 = THREE.MathUtils.lerp(col.rim.y, col.foot.y, hz);
        const bulge = 0.14 + vnoise(col.th * 26, y * 2.4) * 0.34 * Math.sin(Math.min(1, t * 1.2) * Math.PI) + vnoise(col.th * 70, y * 6) * 0.06;
        pos.push(x0 + col.n.x * bulge, y, z0 + col.n.y * bulge);
        // strates ocre / rosé, creux plus sombres, mousse sur la crête
        const band = Math.floor((y + vnoise(col.th * 9, y * 1.3) * 0.45) * 2.0);
        c.copy(STRATA[((band % 3) + 3) % 3]);
        c.multiplyScalar(0.95 + vnoise(col.th * 40, y * 4) * 0.08);
        if (bulge < 0.2) c.multiplyScalar(0.94);
        if (t < 0.14) c.lerp(MOSS, (0.14 - t) / 0.14);
        colr.push(c.r, c.g, c.b);
      }
    }
    for (let k = 0; k < n - 1; k++) {
      for (let r = 0; r < rows; r++) {
        const a0 = base + k * (rows + 1) + r;
        const b0 = a0 + rows + 1;
        idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0);
      }
    }
  };
  for (let k = 0; k < cols.length; k++) {
    if (cols[k].ok && start < 0) start = k;
    if ((!cols[k].ok || k === cols.length - 1) && start >= 0) {
      flush(start, cols[k].ok ? k + 1 : k);
      start = -1;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toonMaterial({ vertexColors: true, rim: 0.7, pigment: 1.2 }));
  mesh.name = 'falaise';
  mesh.layers.enable(LAYER_SHADOW);

  // rochers en saillie, herbe en surplomb, lierre fleuri qui retombe
  const rocks = new Builder();
  const ivy = new Builder();
  const clumps = [];
  const valid = cols.filter((col) => col.ok);
  valid.forEach((col, i) => {
    const r = rand();
    if (i % 14 === 0) {
      clumps.push({ x: col.rim.x + col.n.x * 0.1, y: col.top + 0.18, z: col.rim.y + col.n.y * 0.1, r: 0.42 + rand() * 0.25, squash: 0.6, color: new THREE.Color(i % 28 ? '#9fd08a' : '#8cc690'), density: 1.4 });
    }
    if (r < 0.045) {
      const t = 0.35 + rand() * 0.4;
      const y = THREE.MathUtils.lerp(col.top, col.bot, t);
      const x = THREE.MathUtils.lerp(col.rim.x, col.foot.x, t) + col.n.x * 0.42;
      const z = THREE.MathUtils.lerp(col.rim.y, col.foot.y, t) + col.n.y * 0.42;
      const s = 0.3 + rand() * 0.3;
      rocks.add(G.rock(s, i), rand() > 0.5 ? PAL.rockWarm : '#d8c3b4', { p: [x, y, z], s: [1.1, 0.75, 1], r: [0, rand() * 3, 0] });
    }
    if (r > 0.1 && r < 0.19) {
      // brin de lierre : chapelet de feuilles qui pend de la crête
      const len = 0.6 + rand() * 1.1;
      const steps = Math.round(len / 0.13);
      for (let k = 0; k < steps; k++) {
        const y = col.top + 0.05 - k * 0.13;
        const out = 0.3 + Math.sin(k * 0.9 + i) * 0.04;
        const x = col.rim.x + col.n.x * out + Math.sin(k * 1.3 + i) * 0.05;
        const z = col.rim.y + col.n.y * out;
        ivy.add(G.sphere(0.075, 6, 5), k % 2 ? '#7fc28a' : '#94d08c', { p: [x, y, z], s: [1.2, 0.6, 0.9], sway: k * 0.08 });
        if (k % 3 === 1 && rand() < 0.7) ivy.add(G.sphere(0.04, 6, 4), rand() > 0.5 ? '#fff4f6' : '#f7b6c8', { p: [x + col.n.x * 0.06, y - 0.03, z + col.n.y * 0.06], sway: k * 0.08 });
      }
    }
  });
  const rockMesh = new THREE.Mesh(rocks.build(), toonMaterial({ vertexColors: true, aId: true, rim: 0.8 }));
  rockMesh.layers.enable(LAYER_SHADOW);
  const ivyMesh = new THREE.Mesh(ivy.build(), toonMaterial({ vertexColors: true, aId: true, wind: 0.5, sway: true, outline: 0.5 }));
  return { mesh, rockMesh, ivyMesh, clumps };
}

// ---------------------------------------------------------------------------
// Détails de l'île
// ---------------------------------------------------------------------------
export function buildDetails(spots, obstacles, terrainId) {
  const rand = rng(77);
  const group = new THREE.Group();
  group.name = 'details';
  const stat = new Builder();
  const sway = new Builder();
  const glass = new Builder(nextId());
  const extraObstacles = [];
  const anim = { koi: [], boat: null, foam: null, mist: null };
  const free = (x, z, r = 0.6) => {
    for (const o of obstacles.concat(extraObstacles)) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + r) ** 2) return false;
    if (pathMask(x, z) > 0.2) return false;
    if (Math.abs(x - LAYOUT.garden.x) < 4.8 && Math.abs(z - LAYOUT.garden.z) < 3.8) return false;
    if (Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z) < LAYOUT.pond.r + 1) return false;
    return true;
  };
  const onGrass = (x, z) => {
    const y = heightAt(x, z);
    return (y > 0.88 && y < 1.6) || (y > 3.2 && y < 3.75);
  };

  // --- falaise ---
  const cliff = buildCliff(rand);
  group.add(cliff.mesh, cliff.rockMesh, cliff.ivyMesh);

  // --- terrain : rochers moussus, souches, champignons, petites pierres ---
  const scatter = (n, minGap, fn) => {
    const pts = [];
    for (let t = 0; t < n * 60 && pts.length < n; t++) {
      const x = (rand() * 2 - 1) * 20;
      const z = (rand() * 2 - 1) * 22;
      if (!onGrass(x, z) || !free(x, z, 0.7)) continue;
      if (distToPolyline(x, z, LAYOUT.river).d < 1.6) continue;
      if (pts.some((p) => Math.hypot(p.x - x, p.z - z) < minGap)) continue;
      pts.push({ x, z });
      fn(x, heightAt(x, z), z, pts.length);
    }
  };
  scatter(10, 4, (x, y, z, i) => {
    const s = 0.4 + rand() * 0.35;
    stat.add(G.rock(s, i * 2.3), i % 2 ? PAL.rock : PAL.rockWarm, { p: [x, y + s * 0.2, z], s: [1.15, 0.7, 1], r: [0, rand() * 3, 0] });
    stat.add(G.sphere(s * 0.75, 10, 6), '#95cc8e', { p: [x - s * 0.1, y + s * 0.62, z], s: [1.1, 0.32, 1] });
    extraObstacles.push({ x, z, r: s * 0.9 });
  });
  scatter(6, 5, (x, y, z) => {
    stat.add(G.cyl(0.36, 0.42, 0.38, 14), PAL.bark, { p: [x, y + 0.17, z] });
    stat.add(G.cyl(0.33, 0.33, 0.03, 14), '#ecd0a6', { p: [x, y + 0.37, z] });
    stat.add(G.torus(0.2, 0.02, 4, 14), '#cfa983', { p: [x, y + 0.39, z], r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + rand();
      stat.add(G.capsule(0.09, 0.3, 4, 8), PAL.barkDark, { p: [x + Math.cos(a) * 0.38, y + 0.05, z + Math.sin(a) * 0.38], r: [0, -a, Math.PI / 2 - 0.3] });
    }
    extraObstacles.push({ x, z, r: 0.45 });
  });
  const capCols = ['#f4a28c', '#f6d27a', '#c7b2e6', '#f7b6c8'];
  scatter(14, 3, (x, y, z, i) => {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.2 + i;
      const d = k === 0 ? 0 : 0.16;
      const s = k === 0 ? 1 : 0.7;
      const mx = x + Math.cos(a) * d;
      const mz = z + Math.sin(a) * d;
      stat.add(G.cyl(0.03 * s, 0.04 * s, 0.14 * s, 6), '#fbf0dc', { p: [mx, y + 0.07 * s, mz] });
      stat.add(G.sphere(0.09 * s, 10, 6), capCols[i % capCols.length], { p: [mx, y + 0.15 * s, mz], s: [1, 0.6, 1] });
      stat.add(G.sphere(0.018 * s, 5, 4), '#fffaf0', { p: [mx + 0.04 * s, y + 0.2 * s, mz] });
    }
  });
  scatter(40, 1.2, (x, y, z, i) => {
    stat.add(G.rock(0.1 + rand() * 0.1, i), i % 3 ? PAL.stone : PAL.rock, { p: [x, y + 0.02, z], s: [1.2, 0.5, 1] });
  });

  // --- plage : laisse de mer, bois flotté, coquillages décoratifs ---
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    if (a > 3.6 && a < 5.75) continue; // côté nord (falaise)
    if (Math.abs(a - 1.18) < 0.14) continue; // ponton
    const rr = 25.6 + rand() * 0.7;
    const r = rr - coastRadius(a);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < 0.02 || y > 0.35) continue;
    if (i % 5 === 0) {
      stat.add(G.capsule(0.07, 0.8 + rand() * 0.6, 4, 8), '#dccdb6', { p: [x, y + 0.05, z], r: [Math.PI / 2, rand() * 3, 0] });
    } else if (i % 2 === 0) {
      stat.add(G.sphere(0.16 + rand() * 0.1, 8, 5), rand() > 0.5 ? '#6aa898' : '#7fb79d', { p: [x, y + 0.02, z], s: [1.8, 0.18, 0.7], r: [0, -a + rand(), 0] });
    } else {
      const sc = rand() > 0.5 ? '#ffd7c4' : '#fff1dc';
      for (let k = 0; k < 4; k++) {
        const pa = (k / 3 - 0.5) * 1.4;
        stat.add(G.sphere(0.035, 6, 4), sc, { p: [x + Math.sin(pa) * 0.04, y + 0.02, z + Math.cos(pa) * 0.03], s: [0.45, 0.45, 1.4], r: [0, pa + a, 0] });
      }
    }
  }
  // parasol et transats près du ponton
  {
    const px = 14.6;
    const pz = 20.0;
    const py = heightAt(px, pz);
    stat.add(G.cyl(0.035, 0.04, 2.1, 6), PAL.white, { p: [px, py + 1.05, pz] });
    stat.add(G.cone(1.15, 0.45, 16), PAL.white, {
      p: [px, py + 2.05, pz],
      colorFn: (c, vx, vy, vz) => {
        const a = Math.atan2(vz - pz, vx - px);
        if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2 === 0) c.set(PAL.coral);
      },
    });
    stat.add(G.sphere(0.06, 6, 4), PAL.butter, { p: [px, py + 2.3, pz] });
    for (const [tx, tz] of [[13.4, 20.8], [15.8, 20.6]]) {
      const ty = heightAt(tx, tz);
      stat.add(G.box(0.62, 0.06, 1.3, 0.03), tx < 14 ? PAL.mint : PAL.sky, { p: [tx, ty + 0.32, tz], r: [-0.12, 0, 0] });
      stat.add(G.box(0.62, 0.06, 0.62, 0.03), tx < 14 ? PAL.mint : PAL.sky, { p: [tx, ty + 0.55, tz - 0.78], r: [0.9, 0, 0] });
      for (const sx of [-0.27, 0.27]) {
        stat.add(G.cyl(0.025, 0.025, 0.4, 5), PAL.woodLight, { p: [tx + sx, ty + 0.17, tz + 0.4] });
        stat.add(G.cyl(0.025, 0.025, 0.55, 5), PAL.woodLight, { p: [tx + sx, ty + 0.25, tz - 0.55] });
      }
      extraObstacles.push({ x: tx, z: tz - 0.2, r: 0.6 });
    }
    extraObstacles.push({ x: px, z: pz, r: 0.15 });
  }

  // --- bassin : galets, roseaux, rochers moussus, koïs ---
  {
    const P = LAYOUT.pond;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + rand() * 0.1;
      if (Math.sin(a) < -0.55) continue; // côté cascade
      const d = P.r + 0.35 + vnoise(a * 3, 1) * 0.45;
      const x = P.x + Math.cos(a) * d;
      const z = P.z + Math.sin(a) * d;
      const s = 0.12 + rand() * 0.14;
      stat.add(G.rock(s, i * 1.7), i % 3 ? '#d9cfc6' : '#cfc3d4', { p: [x, heightAt(x, z) + s * 0.25, z], s: [1.2, 0.6, 1] });
    }
    for (const [a, n] of [[0.25, 7], [2.8, 6], [1.6, 4]]) {
      const cx = P.x + Math.cos(a) * (P.r - 0.1);
      const cz = P.z + Math.sin(a) * (P.r - 0.1);
      for (let k = 0; k < n; k++) {
        const x = cx + (rand() - 0.5) * 0.7;
        const z = cz + (rand() - 0.5) * 0.7;
        const y = Math.max(heightAt(x, z), P.level - 0.1);
        const h = 0.8 + rand() * 0.6;
        sway.add(G.cyl(0.016, 0.022, h, 5), '#86b878', { p: [x, y + h / 2, z], sway: 0.6 });
        if (k % 2 === 0) sway.add(G.capsule(0.04, 0.14, 4, 6), '#a77a52', { p: [x, y + h * 0.82, z], sway: 0.9 });
        sway.add(G.sphere(0.05, 5, 4), '#94c486', { p: [x + 0.06, y + h * 0.3, z], s: [0.6, 2.6, 0.3], r: [0, 0, 0.3], sway: 0.3 });
      }
    }
    const fx = LAYOUT.river[LAYOUT.river.length - 1][0];
    for (const [dx, dz, s] of [[-1.3, -1.7, 0.45], [1.25, -1.6, 0.5], [0.8, -1.0, 0.3]]) {
      const x = fx + dx;
      const z = P.z + dz;
      const y = Math.max(heightAt(x, z), P.level - 0.15);
      stat.add(G.rock(s, dx * 9), PAL.rock, { p: [x, y + s * 0.2, z], s: [1.1, 0.7, 1] });
      stat.add(G.sphere(s * 0.7, 9, 6), '#8cc690', { p: [x, y + s * 0.6, z], s: [1.1, 0.35, 1] });
    }
    // koïs pastel qui glissent juste sous la surface
    const koiCols = [['#f6a27a', '#fff3e8'], ['#fff3e8', '#f6b58e'], ['#f7c48e', '#fff3e8']];
    for (let k = 0; k < 3; k++) {
      const kb = new Builder();
      kb.add(G.sphere(0.18, 10, 6), koiCols[k][0], { s: [0.6, 0.3, 1.5] });
      kb.add(G.sphere(0.07, 6, 4), koiCols[k][1], { p: [0.03, 0.03, 0.05], s: [1, 0.4, 1.2] });
      kb.add(G.cone(0.1, 0.18, 6), koiCols[k][0], { p: [0, 0, -0.32], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.25] });
      const m = new THREE.Mesh(kb.build(), toonMaterial({ vertexColors: true, rim: 0.4, outline: 0.5, emissive: 0x10302c }));
      m.userData = { phase: k * 2.1, radius: 0.8 + k * 0.35, speed: 0.35 + k * 0.08 };
      anim.koi.push(m);
      group.add(m);
    }
    // écume de la cascade : bouffées peintes qui pulsent + embruns
    const fp = spots.waterfallFoam;
    if (fp) {
      const fGeo = buildClumpGeometry([
        { x: fp.x, y: fp.y + 0.12, z: fp.z, r: 0.6, squash: 0.45, density: 3 },
        { x: fp.x - 0.55, y: fp.y + 0.05, z: fp.z + 0.25, r: 0.38, squash: 0.45, density: 3 },
        { x: fp.x + 0.6, y: fp.y + 0.05, z: fp.z + 0.2, r: 0.4, squash: 0.45, density: 3 },
      ], 5, { minQuads: 10, maxQuads: 22 });
      const foam = new THREE.Mesh(fGeo, foliageMaterial({ leafTex: cloudAtlas(), color: 0xffffff, color2: 0xeef8fb, wind: 0 }));
      foam.frustumCulled = false;
      anim.foam = foam;
      group.add(foam);
      const N = 14;
      const mist = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial(0xf4fbff, 0.7), N);
      mist.material.uniforms.uIntensity.value = 0.28;
      mist.frustumCulled = false;
      mist.renderOrder = 12;
      mist.userData = { base: new THREE.Vector3(fp.x, fp.y, fp.z), seeds: Array.from({ length: N }, () => rand()) };
      anim.mist = mist;
      group.add(mist);
    }
  }

  // --- maison : paillasson, lampe de porche, banc, linge qui sèche ---
  {
    const { x, z } = LAYOUT.house;
    const y = heightAt(x, z) - 0.05;
    stat.add(G.box(0.95, 0.03, 0.5, 0.02), PAL.coral, { p: [x, y + 0.34, z + 2.42] });
    stat.add(G.box(0.7, 0.032, 0.08, 0.01), PAL.white, { p: [x, y + 0.35, z + 2.42] });
    const la = 0.48;
    const lx = x + Math.sin(la) * 2.1;
    const lz = z + Math.cos(la) * 2.1;
    stat.add(G.box(0.06, 0.06, 0.3, 0.02), PAL.woodDark, { p: [lx, y + 2.05, lz], r: [0, la, 0] });
    stat.add(G.cone(0.14, 0.12, 8), PAL.roofTeal, { p: [lx + Math.sin(la) * 0.15, y + 2.18, lz + Math.cos(la) * 0.15] });
    glass.add(G.box(0.15, 0.18, 0.15, 0.05), PAL.glass, { p: [lx + Math.sin(la) * 0.15, y + 2.02, lz + Math.cos(la) * 0.15] });
    // miroir sur pied, à gauche de la porte : on y change d'apparence
    {
      const mx = 7.3;
      const mz = 1.15;
      const my = heightAt(mx, mz);
      const mr = 0.35;
      const at = (dx, dy, dz) => [mx + Math.cos(mr) * dx + Math.sin(mr) * dz, my + dy, mz - Math.sin(mr) * dx + Math.cos(mr) * dz];
      for (const sx of [-0.3, 0.3]) {
        stat.add(G.box(0.1, 0.06, 0.42, 0.02), PAL.woodDark, { p: at(sx, 0.03, 0), r: [0, mr, 0] });
        stat.add(G.cyl(0.03, 0.035, 0.95, 6), PAL.wood, { p: at(sx, 0.5, 0), r: [0, mr, 0] });
      }
      stat.add(G.torus(0.36, 0.045, 6, 22), PAL.woodLight, { p: at(0, 1.1, 0), r: [0, mr, 0], s: [0.72, 1, 1] });
      stat.add(G.sphere(0.04, 6, 4), PAL.butter, { p: at(0, 1.5, 0.01) });
      stat.add(G.cyl(0.34, 0.34, 0.02, 20), '#dcecf2', { p: at(0, 1.1, 0), r: [Math.PI / 2, mr, 0], s: [0.72, 1, 1] });
      stat.add(G.box(0.05, 0.36, 0.012, 0.005), PAL.white, { p: at(-0.08, 1.15, 0.016), r: [0, mr, 0.3] });
      extraObstacles.push({ x: mx, z: mz, r: 0.35 });
      spots.mirror = { x: mx, z: mz, y: my, rot: mr };
    }
    // banc à l'est
    const bx = 11.6;
    const bz = 2.7;
    const by = heightAt(bx, bz);
    stat.add(G.box(1.3, 0.09, 0.42, 0.04), PAL.woodLight, { p: [bx, by + 0.44, bz] });
    stat.add(G.box(1.3, 0.3, 0.07, 0.03), PAL.wood, { p: [bx, by + 0.7, bz - 0.2] });
    for (const sx of [-0.5, 0.5]) stat.add(G.box(0.07, 0.44, 0.36, 0.03), PAL.woodDark, { p: [bx + sx, by + 0.22, bz] });
    stat.add(G.sphere(0.12, 8, 6), PAL.lilac, { p: [bx - 0.35, by + 0.54, bz - 0.04], s: [1, 0.55, 1] });
    extraObstacles.push({ x: bx, z: bz, r: 0.7 });
    // fil à linge à l'ouest
    const wx = 5.3;
    const z0 = -3.4;
    const z1 = -0.4;
    for (const zz of [z0, z1]) {
      const wy = heightAt(wx, zz);
      stat.add(G.cyl(0.05, 0.06, 1.8, 6), PAL.woodDark, { p: [wx, wy + 0.9, zz] });
      extraObstacles.push({ x: wx, z: zz, r: 0.2 });
    }
    const ly = heightAt(wx, (z0 + z1) / 2) + 1.72;
    segment(stat, PAL.white, new THREE.Vector3(wx, ly, z0), new THREE.Vector3(wx, ly - 0.08, (z0 + z1) / 2), 0.012, 0.012, 4);
    segment(stat, PAL.white, new THREE.Vector3(wx, ly - 0.08, (z0 + z1) / 2), new THREE.Vector3(wx, ly, z1), 0.012, 0.012, 4);
    [[z0 + 0.6, PAL.sky, 0.5], [z0 + 1.4, PAL.coral, 0.4], [z0 + 2.25, PAL.mint, 0.55]].forEach(([zz, col, w]) => {
      sway.add(G.box(0.05, 0.6, w, 0.02), col, { p: [wx, ly - 0.36, zz], sway: 0.5 });
      sway.add(G.sphere(0.02, 4, 3), PAL.woodDark, { p: [wx, ly - 0.05, zz - w * 0.35] });
    });
  }

  // --- bibliothèque : piles de livres, lanternes en papier, panneau peint ---
  {
    const L = LAYOUT.library;
    const y = heightAt(L.x, L.z) - 0.1;
    const books = [PAL.coral, PAL.sky, PAL.butter, PAL.mint, PAL.lilac];
    for (const [bx, bz] of [[10.9, -16.2], [2.6, -16.3]]) {
      const by = heightAt(bx, bz);
      for (let k = 0; k < 5; k++) {
        stat.add(G.box(0.46 - k * 0.03, 0.1, 0.34, 0.03), books[(k + Math.round(bx)) % 5], { p: [bx, by + 0.05 + k * 0.1, bz], r: [0, (k % 2 ? 0.2 : -0.15), 0] });
      }
      stat.add(G.box(0.4, 0.1, 0.3, 0.03), books[2], { p: [bx + 0.5, by + 0.05, bz + 0.1], r: [0, 0.6, 0] });
      extraObstacles.push({ x: bx, z: bz, r: 0.4 });
    }
    const dz = L.z + 2.62;
    for (const lx of [L.x - 0.75, L.x + 0.75]) {
      segment(stat, PAL.woodDark, new THREE.Vector3(lx, y + 2.5, dz + 0.55), new THREE.Vector3(lx, y + 2.28, dz + 0.55), 0.01, 0.01, 4);
      glass.add(G.sphere(0.16, 12, 9), lx < L.x ? '#ffd2b8' : '#fff0c2', { p: [lx, y + 2.12, dz + 0.55], s: [1, 1.15, 1] });
    }
    // panneau-chevalet peint
    const ax = 9.6;
    const az = -13.6;
    const ay = heightAt(ax, az);
    stat.add(G.box(0.8, 0.95, 0.05, 0.03), PAL.woodLight, { p: [ax, ay + 0.48, az + 0.12], r: [-0.22, 0, 0] });
    stat.add(G.box(0.8, 0.95, 0.05, 0.03), PAL.wood, { p: [ax, ay + 0.48, az - 0.12], r: [0.22, 0, 0] });
    stat.add(G.box(0.26, 0.32, 0.03, 0.02), PAL.white, { p: [ax - 0.14, ay + 0.6, az + 0.25], r: [-0.22, 0.2, 0] });
    stat.add(G.box(0.26, 0.32, 0.03, 0.02), PAL.white, { p: [ax + 0.14, ay + 0.6, az + 0.25], r: [-0.22, -0.2, 0] });
    stat.add(G.box(0.62, 0.06, 0.04, 0.02), PAL.coral, { p: [ax, ay + 0.36, az + 0.2], r: [-0.22, 0, 0] });
    extraObstacles.push({ x: ax, z: az, r: 0.45 });
  }

  // --- ponton : cordages, canne à pêche, barque qui tangue ---
  {
    const P = LAYOUT.pier;
    for (const [cx, cz] of [[P.x + 0.75, 23.6], [P.x - 0.8, 28.9]]) {
      for (let k = 0; k < 3; k++) stat.add(G.torus(0.2 - k * 0.04, 0.035, 5, 14), '#e6d3a8', { p: [cx, P.h + 0.07 + k * 0.05, cz], r: [Math.PI / 2, 0, 0] });
    }
    const sx = P.x + P.w / 2 + 0.05;
    for (let zz = P.z0 + 0.3; zz + 2.3 <= P.z1 + 0.1; zz += 2.3) {
      const a = new THREE.Vector3(sx, P.h + 0.28, zz);
      const m = new THREE.Vector3(sx, P.h + 0.16, zz + 1.15);
      const c = new THREE.Vector3(sx, P.h + 0.28, zz + 2.3);
      segment(stat, '#e6d3a8', a, m, 0.02, 0.02, 4);
      segment(stat, '#e6d3a8', m, c, 0.02, 0.02, 4);
    }
    const rb = new THREE.Vector3(P.x - 0.9, P.h + 0.05, P.z1 - 0.7);
    const tip = new THREE.Vector3(P.x - 2.0, P.h + 1.9, P.z1 + 0.9);
    segment(stat, PAL.woodDark, rb, tip, 0.03, 0.012, 5);
    stat.add(G.cyl(0.05, 0.05, 0.05, 8), PAL.sky, { p: [rb.x - 0.12, rb.y + 0.2, rb.z + 0.15], r: [0, 0, Math.PI / 2] });
    segment(stat, '#f6f2ee', tip, new THREE.Vector3(tip.x - 0.3, -0.05, tip.z + 1.2), 0.004, 0.004, 3);
    // barque
    const boat = new THREE.Group();
    const bb = new Builder();
    bb.add(G.sphere(1, 16, 10), PAL.sky, { s: [0.62, 0.32, 1.35], p: [0, 0.02, 0] });
    bb.add(G.sphere(1, 16, 10), '#fff8ee', { s: [0.54, 0.26, 1.22], p: [0, 0.12, 0] });
    bb.add(G.box(1.0, 0.06, 0.28, 0.03), PAL.woodLight, { p: [0, 0.3, 0.1] });
    bb.add(G.torus(0.6, 0.05, 6, 24), PAL.white, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0], s: [1, 2.2, 1] });
    for (const sxx of [-1, 1]) segment(bb, PAL.woodLight, new THREE.Vector3(sxx * 0.45, 0.32, 0.3), new THREE.Vector3(sxx * 0.95, 0.0, -0.6), 0.025, 0.025, 5);
    const boatMesh = new THREE.Mesh(bb.build(), toonMaterial({ vertexColors: true, aId: true, rim: 1 }));
    boatMesh.layers.enable(LAYER_SHADOW);
    boat.add(boatMesh);
    boat.position.set(P.x + 2.6, 0, 27.6);
    boat.rotation.y = 0.25;
    anim.boat = boat;
    group.add(boat);
  }

  // --- échoppe : étals plus remplis, guirlande lumineuse ---
  {
    const { x, z } = LAYOUT.shop;
    const y = heightAt(x, z);
    const jars = [PAL.mint, PAL.coral, PAL.butter, PAL.lilac];
    jars.forEach((c, k) => stat.add(G.cyl(0.08, 0.08, 0.18, 10), c, { p: [x - 0.25, y + 1.13, z - 0.25 + k * 0.17] }));
    stat.add(G.cyl(0.22, 0.14, 0.12, 12), PAL.woodDark, { p: [x - 0.15, y + 1.09, z + 0.45] });
    for (let k = 0; k < 6; k++) stat.add(G.sphere(0.07, 8, 6), k % 2 ? '#f7b48a' : '#f6d27a', { p: [x - 0.15 + Math.cos(k) * 0.1, y + 1.17 + (k % 2) * 0.05, z + 0.45 + Math.sin(k) * 0.1] });
    for (const pz of [z - 1.6, z + 1.0]) {
      stat.add(G.cyl(0.16, 0.12, 0.24, 10), '#e8987a', { p: [x - 0.75, y + 0.12, pz] });
      for (let k = 0; k < 5; k++) stat.add(G.sphere(0.08, 7, 5), [PAL.coral, PAL.butter, PAL.lilac][k % 3], { p: [x - 0.75 + Math.cos(k * 1.3) * 0.08, y + 0.32 + (k % 2) * 0.04, pz + Math.sin(k * 1.3) * 0.08] });
    }
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      glass.add(G.sphere(0.055, 7, 5), [PAL.butter, PAL.coral, PAL.mint, PAL.lilac][k % 4], { p: [x - 0.9, y + 1.95 - Math.sin(t * Math.PI) * 0.18, z - 1.15 + t * 2.3] });
    }
  }

  // --- assemblage ---
  const statMesh = new THREE.Mesh(stat.build(), toonMaterial({ vertexColors: true, aId: true, rim: 0.9 }));
  statMesh.name = 'details-statiques';
  statMesh.layers.enable(LAYER_SHADOW);
  const swayMesh = new THREE.Mesh(sway.build(), toonMaterial({ vertexColors: true, aId: true, wind: 0.35, sway: true, rim: 0.8, outline: 0.5 }));
  swayMesh.name = 'details-vent';
  const glassMesh = new THREE.Mesh(glass.build(), toonMaterial({ vertexColors: true, aId: true, emissive: 0xffa94a, emissiveNight: true, rim: 0.2 }));
  glassMesh.name = 'details-lumieres';
  group.add(statMesh, swayMesh, glassMesh);

  // oyats sur la plage (touffes d'herbe dorée près de la lisière)
  const tuft = tuftGeometry();
  const oyats = new THREE.InstancedMesh(tuft, grassMaterial({ id: terrainId, tipColor: 0xeee0a8 }), 420);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  let n = 0;
  for (let t = 0; t < 6000 && n < 420; t++) {
    const a = rand() * Math.PI * 2;
    if (a > 3.6 && a < 5.75) continue;
    const rr = 21.2 + Math.pow(rand(), 1.6) * 2.6;
    const r = rr - coastRadius(a);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    if (y < 0.3 || y > 0.86) continue;
    if (vnoise(x * 0.4, z * 0.4) < 0.45) continue; // en touffes groupées
    let blocked = false;
    for (const o of obstacles.concat(extraObstacles)) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + 0.3) ** 2) blocked = true;
    if (blocked || Math.abs(x - LAYOUT.pier.x) < 2 && z > 19) continue;
    const s = 1.1 + rand() * 0.7;
    m4.compose(new THREE.Vector3(x, y - 0.02, z), new THREE.Quaternion().setFromAxisAngle(UP, rand() * 6.28), new THREE.Vector3(s * 0.8, s * 1.8, s * 0.8));
    oyats.setMatrixAt(n, m4);
    oyats.setColorAt(n, col.set(rand() > 0.5 ? '#bfcf92' : '#cdd59c'));
    n++;
  }
  oyats.count = n;
  oyats.instanceMatrix.needsUpdate = true;
  if (oyats.instanceColor) oyats.instanceColor.needsUpdate = true;
  oyats.frustumCulled = false;
  group.add(oyats);

  return { group, anim, obstacles: extraObstacles, clumps: cliff.clumps };
}

// Animations légères (koïs, barque, écume, embruns)
const _m = new THREE.Matrix4();
export function animateDetails(anim, t) {
  const P = LAYOUT.pond;
  for (const k of anim.koi) {
    const u = k.userData;
    const a = t * u.speed + u.phase;
    const r = u.radius + Math.sin(t * 0.3 + u.phase) * 0.25;
    k.position.set(P.x + Math.cos(a) * r, P.level + 0.012, P.z + 0.3 + Math.sin(a) * r * 0.8);
    k.rotation.y = -a + Math.PI;
    k.rotation.z = Math.sin(t * 6 + u.phase) * 0.12;
  }
  if (anim.boat) {
    anim.boat.position.y = Math.sin(t * 1.1) * 0.06 - 0.02;
    anim.boat.rotation.z = Math.sin(t * 0.9) * 0.05;
    anim.boat.rotation.x = Math.sin(t * 0.7 + 1) * 0.03;
  }
  if (anim.foam) {
    const s = 1 + Math.sin(t * 3.4) * 0.05;
    anim.foam.scale.set(s, 1 + Math.sin(t * 2.7 + 1) * 0.07, s);
  }
  if (anim.mist) {
    const m = anim.mist;
    const b = m.userData.base;
    m.userData.seeds.forEach((sd, i) => {
      const k = (t * 0.35 + sd) % 1;
      const sc = (0.4 + k * 0.9) * Math.sin(k * Math.PI);
      _m.makeScale(sc, sc, sc);
      _m.setPosition(b.x + Math.sin(sd * 40 + t * 0.4) * 0.7, b.y + 0.2 + k * 1.4, b.z + 0.3 + Math.cos(sd * 30) * 0.5);
      m.setMatrixAt(i, _m);
    });
    m.instanceMatrix.needsUpdate = true;
  }
}
