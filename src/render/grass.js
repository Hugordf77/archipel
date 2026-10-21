import * as THREE from 'three';
import { grassMaterial } from './shaders/materials.js';
import { LAYOUT, heightAt, pathMask, vnoise, distToPolyline } from '../world/home/terrain.js';
import { paletteHerbe } from '../world/islands/biomes.js';

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Touffe : quelques brins effilés et courbés (uv.y = hauteur relative)
export function tuftGeometry() {
  const pos = [];
  const uv = [];
  const idx = [];
  const blades = 6;
  let v = 0;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.7;
    const lean = 0.09 + (b % 3) * 0.05;
    const h = 0.26 + (b % 2) * 0.1;
    const w = 0.07;
    const bx = Math.cos(a) * 0.06;
    const bz = Math.sin(a) * 0.06;
    const segs = 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const ww = w * (1 - t) + 0.004;
      const ox = bx + Math.cos(a) * lean * t * t;
      const oz = bz + Math.sin(a) * lean * t * t;
      const px = -Math.sin(a) * ww;
      const pz = Math.cos(a) * ww;
      pos.push(ox - px, t * h, oz - pz, ox + px, t * h, oz + pz);
      uv.push(0, t, 1, t);
      if (s < segs) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

function slopeAt(x, z) {
  const e = 0.3;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

function blocked(x, z, obstacles, pad = 0) {
  for (const o of obstacles) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (dx * dx + dz * dz < (o.r + pad) * (o.r + pad)) return true;
  }
  if (Math.hypot(x - LAYOUT.pond.x, z - LAYOUT.pond.z) < LAYOUT.pond.r + 0.6) return true;
  // potager (parcelles)
  if (Math.abs(x - LAYOUT.garden.x) < 4.3 && Math.abs(z - LAYOUT.garden.z) < 3.2) return true;
  if (distToPolyline(x, z, LAYOUT.river).d < 1.3 && heightAt(x, z) > 2.4) return true;
  return false;
}

// Échantillonne la couleur du terrain (pour que l'herbe se fonde dans le sol)
function terrainColorSampler(terrain) {
  const col = terrain.geometry.attributes.color;
  const size = 78;
  const seg = 250;
  return (x, z, out) => {
    const ix = Math.round(((x + size / 2) / size) * seg);
    const iz = Math.round(((z + size / 2) / size) * seg);
    const i = THREE.MathUtils.clamp(iz, 0, seg) * (seg + 1) + THREE.MathUtils.clamp(ix, 0, seg);
    return out.setRGB(col.getX(i), col.getY(i), col.getZ(i));
  };
}

export function buildGrass(terrain, obstacles, count = 4200) {
  const rand = rng(42);
  const sample = terrainColorSampler(terrain);
  const geo = tuftGeometry();
  const mat = grassMaterial({ id: terrain.userData.terrainId });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  let n = 0;
  let tries = 0;
  while (n < count && tries < count * 30) {
    tries++;
    const x = (rand() * 2 - 1) * 24;
    const z = (rand() * 2 - 1) * 26;
    const y = heightAt(x, z);
    const onGrass = (y > 0.86 && y < 1.4) || (y > 3.15 && y < 3.7);
    if (!onGrass) continue;
    if (slopeAt(x, z) > 0.45) continue;
    if (pathMask(x, z) > 0.25) continue;
    // touffes regroupées en plaques, comme des touches de pinceau
    const patch = vnoise(x * 0.32 + 3.1, z * 0.32 - 1.7);
    if (rand() > THREE.MathUtils.smoothstep(patch, 0.3, 0.62) * 0.95 + 0.05) continue;
    if (blocked(x, z, obstacles, 0.1)) continue;
    const sc = 0.75 + rand() * 0.75;
    p.set(x, y - 0.02, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    s.set(sc, sc * (0.8 + rand() * 0.5), sc);
    m.compose(p, q, s);
    mesh.setMatrixAt(n, m);
    sample(x, z, c);
    c.multiplyScalar(0.96 + rand() * 0.1);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.name = 'grass';
  return mesh;
}

// ---------------------------------------------------------------------------
// Herbe en tapis de l'île de départ (render/herbe/) : quatre tuiles de 64 m, au mètre, au même
// format que celles des îles (hauteur et couleur du sol, carte d'herbe RGBA : densité, hauteur des
// brins, sécheresse), avec les règles des touffes ci-dessus rendues continues : terrasses herbeuses,
// ni pente forte, ni chemin, ni mare, ni potager, ni rivière, ni pied d'obstacle ; plaques plus
// denses et plus hautes.
const HOME_V = 65;
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
export function champsMaison(terrain, obstacles) {
  const sample = terrainColorSampler(terrain);
  const c = new THREE.Color();
  const out = [];
  for (const z0 of [-64, 0]) {
    for (const x0 of [-64, 0]) {
      const positions = new Float32Array(HOME_V * HOME_V * 3);
      const colors = new Float32Array(HOME_V * HOME_V * 3);
      const herbe = new Uint8Array(HOME_V * HOME_V * 4);
      let any = false;
      for (let j = 0; j < HOME_V; j++) {
        for (let i = 0; i < HOME_V; i++) {
          const k = j * HOME_V + i;
          const x = x0 + i;
          const z = z0 + j;
          const y = heightAt(x, z);
          positions[k * 3] = x;
          positions[k * 3 + 1] = y;
          positions[k * 3 + 2] = z;
          if (Math.abs(x) > 40 || Math.abs(z) > 40) continue;
          const terrace = smooth(0.82, 0.92, y) * (1 - smooth(1.35, 1.5, y)) + smooth(3.1, 3.2, y) * (1 - smooth(3.65, 3.8, y));
          if (terrace <= 0 || blocked(x, z, obstacles, 0.1)) continue;
          const patch = smooth(0.25, 0.6, vnoise(x * 0.32 + 3.1, z * 0.32 - 1.7));
          const dens = 0.85 * terrace * (1 - smooth(0.3, 0.55, slopeAt(x, z))) * (1 - smooth(0.15, 0.35, pathMask(x, z))) * (0.45 + 0.55 * patch);
          if (dens <= 0.01) continue;
          herbe[k * 4] = Math.round(dens * 255);
          herbe[k * 4 + 1] = Math.round(((0.32 + 0.18 * patch) / 1.2) * 255);
          herbe[k * 4 + 2] = Math.round(smooth(1.1, 0.88, y) * 0.45 * 255); // plus sèche au haut de la plage
          any = true;
        }
      }
      if (!any) continue;
      out.push({ positions, colors, herbe, x0, z0 });
    }
  }
  solSousHerbe(terrain, out);
  for (const tile of out) {
    const { positions, colors } = tile;
    for (let k = 0; k < HOME_V * HOME_V; k++) {
      sample(positions[k * 3], positions[k * 3 + 2], c);
      colors[k * 3] = c.r;
      colors[k * 3 + 1] = c.g;
      colors[k * 3 + 2] = c.b;
    }
  }
  return out.map((tile) => {
    const { positions, colors, x0, z0 } = tile;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const group = new THREE.Group();
    group.name = `herbe-maison-${x0},${z0}`;
    return { t: { x0, z0, group, mesh: { geometry: geo }, active: true }, tile };
  });
}

// Sol sous le tapis : comme aux îles (gen/zones.js), il prend le « milieu ombré » de la palette en
// proportion de la densité de l'herbe (carte au mètre lue en bilinéaire à chaque sommet du terrain)
function solSousHerbe(terrain, tiles) {
  const sol = paletteHerbe('maison').sol;
  const pos = terrain.geometry.attributes.position;
  const col = terrain.geometry.attributes.color;
  const at = (i, j) => {
    for (const t of tiles) {
      const a = i - t.x0;
      const b = j - t.z0;
      if (a >= 0 && b >= 0 && a < HOME_V && b < HOME_V) return t.herbe[(b * HOME_V + a) * 4] / 255;
    }
    return 0;
  };
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v);
    const z = pos.getZ(v);
    const i = Math.floor(x);
    const j = Math.floor(z);
    const u = x - i;
    const w = z - j;
    const d = (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - w) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * w;
    if (d <= 0) continue;
    col.setXYZ(v, col.getX(v) + (sol[0] - col.getX(v)) * d, col.getY(v) + (sol[1] - col.getY(v)) * d, col.getZ(v) + (sol[2] - col.getZ(v)) * d);
  }
  col.needsUpdate = true;
}
