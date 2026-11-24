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

// ---------------------------------------------------------------------------
// Arbres (portage des textures peintes de l'utilisateur, « Jeux vidéo aprentissage », da.js) : peintes en
// valeurs de gris seulement (la couleur vient de la teinte d'exposition de chaque feuille, ou de l'écorce de
// l'espèce), au hasard reproductible, sans Path2D (absent hors navigateur).
// ---------------------------------------------------------------------------

// contour d'une feuille dans une case de 256 px (pied en bas, pointe en haut) : forme 0 ovale, 1 érable
// (palmée, cinq lobes), 2 fleurs (trois fleurs à cinq pétales), 3 lancéolée (saule)
function contourFeuille(g, forme, ox, oy, dx = 0, dy = 0) {
  const X = (x) => ox + x + dx;
  const Y = (y) => oy + y + dy;
  g.beginPath();
  if (forme === 0) {
    g.moveTo(X(128), Y(250));
    g.bezierCurveTo(X(212), Y(192), X(234), Y(78), X(128), Y(6));
    g.bezierCurveTo(X(22), Y(78), X(44), Y(192), X(128), Y(250));
  } else if (forme === 1) {
    // palmée : rayon modulé par cinq lobes autour du centre (128, 128), pétiole vers le bas
    for (let i = 0; i <= 150; i++) {
      const a = (i / 150) * Math.PI * 2;
      // a = 0 vers le haut ; le creux du bas (a = π) reste court
      const lobe = Math.pow(Math.abs(Math.cos((a * 5) / 2)), 0.6);
      const bas = 1 - 0.55 * Math.pow(Math.max(0, -Math.cos(a)), 6);
      const r = (50 + 70 * lobe) * bas;
      const x = 128 + Math.sin(a) * r;
      const y = 128 - Math.cos(a) * r;
      if (i === 0) g.moveTo(X(x), Y(y));
      else g.lineTo(X(x), Y(y));
    }
    g.closePath();
    g.moveTo(X(124), Y(252));
    g.lineTo(X(132), Y(252));
    g.lineTo(X(131), Y(170));
    g.lineTo(X(125), Y(170));
    g.closePath();
  } else if (forme === 2) {
    for (const [cx, cy, s] of [[90, 92, 1], [170, 118, 0.85], [118, 190, 0.9]]) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 + cx * 0.01;
        const px = cx + Math.cos(a) * 30 * s;
        const py = cy + Math.sin(a) * 30 * s;
        g.moveTo(X(px + Math.cos(a) * 22 * s), Y(py + Math.sin(a) * 22 * s));
        g.ellipse(X(px), Y(py), 22 * s, 16 * s, a, 0, Math.PI * 2);
      }
    }
  } else {
    g.moveTo(X(128), Y(252));
    g.bezierCurveTo(X(168), Y(190), X(170), Y(70), X(128), Y(4));
    g.bezierCurveTo(X(86), Y(70), X(88), Y(190), X(128), Y(252));
  }
}

// Atlas 2 × 2 de GRAPPES DE FEUILLES pour la version forêt des feuillus (23/11/2026) : à la place du pompon
// rond festonné (leafAtlas), une grappe de 60 à 80 petites feuilles posées dans une enveloppe irrégulière
// (lobes et creux), avec des trouées : le bord se découpe en feuilles, on voit le ciel au travers. Valeur
// (canal vert) : claire en haut et vers le bord, sombre au cœur et en bas (ombre interne), chaque feuille
// un peu différente. Alpha : feuille ou vide (seuil 0,5 du shader).
export function grappesAtlas() {
  const S = 512;
  const cell = S / 2;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  const rand = rng(9311);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * cell + cell / 2;
    const oy = Math.floor(k / 2) * cell + cell / 2;
    // enveloppe : rayon selon l'angle (trois à cinq lobes et des creux)
    const nl = 3 + Math.floor(rand() * 3);
    const ph = [rand() * 6.28, rand() * 6.28];
    const env = (a) => cell * 0.36 * (0.82 + 0.13 * Math.sin(a * nl + ph[0]) + 0.07 * Math.sin(a * (nl + 3) + ph[1]));
    // sous-couche sombre, plus petite, percée de trous : la grappe n'est pas creuse
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * env(a) * 0.62;
      const v = 95 + Math.floor(rand() * 35);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.ellipse(ox + Math.cos(a) * d, oy + Math.sin(a) * d, cell * 0.075, cell * 0.055, rand() * 3.14, 0, Math.PI * 2);
      g.fill();
    }
    // feuilles : ovales pointus, tournées vers l'extérieur, plus nombreuses vers le bord
    const n = 60 + Math.floor(rand() * 20);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.pow(rand(), 0.55) * env(a);
      const x = ox + Math.cos(a) * d;
      const y = oy + Math.sin(a) * d;
      // lumière d'en haut : valeur selon la hauteur dans la grappe et la distance au cœur
      const haut = (oy - y) / (cell * 0.36);
      const bord = d / env(a);
      let v = 150 + 55 * haut + 35 * bord + (rand() - 0.5) * 50;
      v = Math.max(70, Math.min(255, Math.round(v)));
      const L = cell * (0.06 + rand() * 0.03);
      const W = L * (0.42 + rand() * 0.15);
      g.save();
      g.translate(x, y);
      g.rotate(a + (rand() - 0.5) * 1.2);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.moveTo(-L, 0);
      g.quadraticCurveTo(0, -W * 1.4, L, 0);
      g.quadraticCurveTo(0, W * 1.4, -L, 0);
      g.fill();
      g.restore();
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

// Atlas 2 × 2 des feuilles (512 px) : alpha = découpe, gris = valeur peinte (aplats décalés hors
// registre, bord à la brosse sèche qui déborde, liseré clair d'un seul côté, nervures)
export function feuillesAtlas() {
  const S = 512;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  const rand = rng(4242);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * 256;
    const oy = Math.floor(k / 2) * 256;
    const fleur = k === 2;
    g.save();
    g.beginPath();
    g.rect(ox, oy, 256, 256);
    g.clip();
    // 1er aplat, posé franc
    g.fillStyle = fleur ? 'rgb(205,205,205)' : 'rgb(128,128,128)';
    contourFeuille(g, k, ox, oy);
    g.fill();
    // 2e et 3e aplats légèrement décalés (le hors-registre de la peinture), gardés dans la découpe
    g.save();
    contourFeuille(g, k, ox, oy);
    g.clip();
    g.fillStyle = fleur ? 'rgba(236,236,236,0.85)' : 'rgba(168,168,168,0.85)';
    contourFeuille(g, k, ox, oy, -7, -9);
    g.fill();
    g.fillStyle = fleur ? 'rgba(150,150,150,0.5)' : 'rgba(70,70,70,0.55)';
    contourFeuille(g, k, ox, oy, 9, 6);
    g.fill();
    g.restore();
    // le bord : brosse sèche, courtes touches qui débordent du contour (feuilles seulement)
    if (!fleur) {
      const rx = k === 3 ? 0.34 : 0.78;
      for (let i = 0; i < 110; i++) {
        const a = rand() * Math.PI * 2;
        const r = 96 + rand() * 22;
        const x = ox + 128 + Math.cos(a) * r * rx;
        const y = oy + 128 + Math.sin(a) * r * 1.02;
        const v = rand() > 0.5 ? 185 : 85;
        g.strokeStyle = `rgba(${v},${v},${v},${0.2 + rand() * 0.45})`;
        g.lineWidth = 3 + rand() * 6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (ox + 128 - x) * 0.18 + (rand() - 0.5) * 12, y + (oy + 128 - y) * 0.18 + (rand() - 0.5) * 12);
        g.stroke();
      }
    }
    // liseré clair d'un seul côté, nervure centrale et nervures suggérées (dans la découpe)
    g.save();
    contourFeuille(g, k, ox, oy);
    g.clip();
    if (fleur) {
      // cœur des fleurs plus sombre
      for (const [cx, cy, s] of [[90, 92, 1], [170, 118, 0.85], [118, 190, 0.9]]) {
        g.fillStyle = 'rgba(120,120,120,0.8)';
        g.beginPath();
        g.arc(ox + cx, oy + cy, 9 * s, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.strokeStyle = 'rgba(235,235,235,0.55)';
      g.lineWidth = 9;
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(ox + 122, oy + 246);
      g.bezierCurveTo(ox + 30, oy + 190, ox + 50, oy + 76, ox + 126, oy + 10);
      g.stroke();
      g.strokeStyle = 'rgba(220,220,220,0.32)';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(ox + 128, oy + 238);
      g.quadraticCurveTo(ox + 134, oy + 130, ox + 127, oy + 26);
      g.stroke();
      g.lineWidth = 2.5;
      for (const y of [92, 140, 188]) {
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(ox + 128, oy + y + 16);
          g.quadraticCurveTo(ox + 128 + s * 34, oy + y + 4, ox + 128 + s * 56, oy + y - 8);
          g.stroke();
        }
      }
    }
    g.restore();
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

// Écorce (512 px, répétée) : brosse sèche verticale, clairs, creux froids et crevasses franches ; chaque
// trait est aussi peint décalé d'une largeur pour que la texture se raccorde à elle-même
export function ecorceTexture() {
  const S = 512;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, S, S);
  const rand = rng(777);
  const trait = (x, pas, ecart, w, style) => {
    const r2 = rng(Math.floor(x * 131 + w * 17));
    const pts = [];
    let px = x;
    for (let y = -30; y < S + 40; y += pas) {
      pts.push([px, y]);
      px += (r2() - 0.5) * ecart;
    }
    for (const d of [-S, 0, S]) {
      g.strokeStyle = style;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath();
      pts.forEach(([a, b], i) => (i ? g.lineTo(a + d, b) : g.moveTo(a + d, b)));
      g.stroke();
    }
  };
  for (let i = 0; i < 560; i++) {
    const x = rand() * S;
    const t = rand();
    const a = t > 0.62 ? 0.1 + rand() * 0.35 : t > 0.3 ? 0.1 + rand() * 0.38 : 0.06 + rand() * 0.25;
    const v = t > 0.62 ? 205 : t > 0.3 ? 82 : 48;
    trait(x, 46, 17, 1 + rand() * 9, `rgba(${v},${v},${v},${a})`);
  }
  for (let i = 0; i < 16; i++) trait(rand() * S, 62, 30, 5 + rand() * 9, 'rgba(40,40,40,0.42)');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
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
