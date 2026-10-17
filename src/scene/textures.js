import * as THREE from 'three';

// Textures procédurales générées au démarrage (aucun fichier externe).

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Atlas 2x2 de touffes de feuilles : alpha = silhouette, vert = variations internes
export function leafAtlas() {
  const S = 256;
  const cell = S / 2;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  const rand = rng(1234);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * cell + cell / 2;
    const oy = Math.floor(k / 2) * cell + cell / 2;
    // touffe ronde festonnée : un coeur et des lobes arrondis qui se chevauchent
    g.fillStyle = 'rgb(160,160,160)';
    g.beginPath();
    g.arc(ox, oy, cell * 0.27, 0, Math.PI * 2);
    g.fill();
    const lobes = 8 + Math.floor(rand() * 4);
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + rand() * 0.4;
      const dist = cell * (0.17 + rand() * 0.07);
      const rad = cell * (0.1 + rand() * 0.07);
      const v = 175 + Math.floor(rand() * 75);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.ellipse(ox + Math.cos(a) * dist, oy + Math.sin(a) * dist, rad, rad * (0.75 + rand() * 0.25), a, 0, Math.PI * 2);
      g.fill();
    }
    // quelques reflets de feuilles plus clairs
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      const dist = rand() * cell * 0.2;
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(ox + Math.cos(a) * dist, oy + Math.sin(a) * dist - cell * 0.04, cell * 0.06, cell * 0.035, a, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.premultiplyAlpha = false;
  return tex;
}

// Atlas 2x2 de bouffées de nuages
export function cloudAtlas() {
  const S = 256;
  const cell = S / 2;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const rand = rng(77);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * cell + cell / 2;
    const oy = Math.floor(k / 2) * cell + cell / 2;
    const blobs = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < blobs; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * cell * 0.16;
      const r = cell * (0.16 + rand() * 0.12);
      const v = 200 + Math.floor(rand() * 55);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, Math.min(r, cell * 0.46 - d), 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Bruit de valeur périodique (pour une texture qui se répète sans couture)
function tileNoise(size, period, seed) {
  const rand = rng(seed);
  const grid = new Float32Array(period * period).map(() => rand());
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * period;
      const fy = (y / size) * period;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const ux = tx * tx * (3 - 2 * tx);
      const uy = ty * ty * (3 - 2 * ty);
      const g = (i, j) => grid[((j % period) * period + (i % period))];
      const a = g(ix, iy);
      const b = g(ix + 1, iy);
      const c = g(ix, iy + 1);
      const d = g(ix + 1, iy + 1);
      out[y * size + x] = (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
    }
  }
  return out;
}

// Grain de papier aquarelle : fibres, grain fin et légères taches
export function paperTexture() {
  const S = 512;
  const n1 = tileNoise(S, 128, 3);
  const n2 = tileNoise(S, 32, 5);
  const n3 = tileNoise(S, 8, 9);
  const n4 = tileNoise(S, 256, 11);
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    let v = 0.5;
    v += (n1[i] - 0.5) * 0.35;
    v += (n4[i] - 0.5) * 0.3;
    v += (n2[i] - 0.5) * 0.25;
    v += (n3[i] - 0.5) * 0.2;
    const b = Math.max(0, Math.min(255, v * 255));
    img.data[i * 4] = b;
    img.data[i * 4 + 1] = b;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // fibres
  const rand = rng(21);
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 900; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const a = rand() * Math.PI;
    const l = 4 + rand() * 14;
    const light = rand() > 0.5;
    g.strokeStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rand() - 0.5) * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
