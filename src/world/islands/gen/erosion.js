// Passe 1b — érosion sur la grille de 4 m : thermique (éboulis) puis hydraulique
// (gouttes qui creusent des ravines et déposent des cônes de déjection).
import { mulberry32 } from '../../../core/random.js';

// éboulement : toute pente au-delà du talus se tasse vers le bas
export function thermal(H, n, s, iters = 18, talus = 0.75, rate = 0.45) {
  const maxD = talus * s;
  for (let it = 0; it < iters; it++) {
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const k = j * n + i;
        const h = H[k];
        if (h < 0.5) continue;
        // voisin le plus bas (4-connexité)
        let lo = k - 1;
        if (H[k + 1] < H[lo]) lo = k + 1;
        if (H[k - n] < H[lo]) lo = k - n;
        if (H[k + n] < H[lo]) lo = k + n;
        const d = h - H[lo];
        if (d > maxD) {
          const m = (d - maxD) * 0.5 * rate;
          H[k] -= m;
          H[lo] += m;
        }
      }
    }
  }
}

// gouttes d'eau : inertie, capacité de transport, érosion / dépôt bilinéaires
export function hydraulic(H, n, s, count, seed, opts = {}) {
  const { inertia = 0.06, capacity = 4, minSlope = 0.012, erode = 0.32, deposit = 0.28, evaporate = 0.03, steps = 48, maxErode = 1.4 } = opts;
  const rng = mulberry32(seed ^ 0xe70510);
  for (let d = 0; d < count; d++) {
    let x = 1 + rng() * (n - 3);
    let z = 1 + rng() * (n - 3);
    let dx = 0;
    let dz = 0;
    let speed = 1;
    let water = 1;
    let sed = 0;
    for (let st = 0; st < steps; st++) {
      const i = Math.floor(x);
      const j = Math.floor(z);
      if (i < 1 || j < 1 || i >= n - 2 || j >= n - 2) break;
      const u = x - i;
      const v = z - j;
      const k = j * n + i;
      const h00 = H[k];
      const h10 = H[k + 1];
      const h01 = H[k + n];
      const h11 = H[k + n + 1];
      if (h00 < -0.5 && h10 < -0.5) break; // arrivée en mer
      const gx = (h10 - h00) * (1 - v) + (h11 - h01) * v;
      const gz = (h01 - h00) * (1 - u) + (h11 - h10) * u;
      const hOld = (h00 * (1 - u) + h10 * u) * (1 - v) + (h01 * (1 - u) + h11 * u) * v;
      dx = dx * inertia - gx * (1 - inertia);
      dz = dz * inertia - gz * (1 - inertia);
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) break;
      dx /= len;
      dz /= len;
      x += dx;
      z += dz;
      const i2 = Math.floor(x);
      const j2 = Math.floor(z);
      if (i2 < 1 || j2 < 1 || i2 >= n - 2 || j2 >= n - 2) break;
      const u2 = x - i2;
      const v2 = z - j2;
      const k2 = j2 * n + i2;
      const hNew = (H[k2] * (1 - u2) + H[k2 + 1] * u2) * (1 - v2) + (H[k2 + n] * (1 - u2) + H[k2 + n + 1] * u2) * v2;
      const dh = hNew - hOld;
      const cap = Math.max(-dh / s, minSlope) * speed * water * capacity;
      if (sed > cap || dh > 0) {
        // dépôt (ou comblement d'un creux)
        const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * deposit;
        sed -= amt;
        H[k] += amt * (1 - u) * (1 - v);
        H[k + 1] += amt * u * (1 - v);
        H[k + n] += amt * (1 - u) * v;
        H[k + n + 1] += amt * u * v;
      } else {
        const amt = Math.min((cap - sed) * erode, -dh, maxErode);
        sed += amt;
        H[k] -= amt * (1 - u) * (1 - v);
        H[k + 1] -= amt * u * (1 - v);
        H[k + n] -= amt * (1 - u) * v;
        H[k + n + 1] -= amt * u * v;
      }
      speed = Math.sqrt(Math.max(0.01, speed * speed - dh * 0.5));
      water *= 1 - evaporate;
    }
  }
}
