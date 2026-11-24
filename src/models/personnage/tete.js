// Forme de la tête du gabarit (GABARIT.FACE.forme) : un visage ovale de manga plutôt qu'une boule. Le
// crâne et la calotte peinte du visage (entities/character/face.js) passent par la même déformation, pour
// que les traits restent collés à la peau. Sans `forme` (chibi), rien ne change.
//
// Repère de la tête : centre du crâne en 0, avant = +z. Au-dessus de la ligne des yeux, la sphère reste
// ronde (le crâne et les cheveux s'y posent) ; en dessous, la mâchoire s'affine vers un menton doux qui
// descend, et la nuque rentre vers le cou.
import * as THREE from 'three';
import { GABARIT } from './gabarit.js';

const F = GABARIT.FACE;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// déforme un point (repère de la tête, en mètres) ; out reçoit le point déformé
function deforme(x, y, z, out) {
  const f = F.forme;
  const H = F.R * F.SY; // demi-hauteur du crâne
  // d : 0 à la ligne des yeux, 1 au bas du crâne
  const d = clamp01((f.yeux - y / H) / (1 + f.yeux));
  if (d > 0) {
    // joues pleines juste sous les yeux, puis mâchoire qui s'affine vers le menton
    x *= (1 + f.joues * Math.sin(Math.PI * d)) * (1 - f.machoire * d ** 1.6);
    // menton : descend (ovale) ; le devant s'aplatit un peu, la nuque rentre vers le cou
    y -= f.menton * F.R * d * d;
    z *= z > 0 ? 1 - f.aplat * d : 1 - f.nuque * smooth(d);
  }
  return out.set(x, y, z);
}

// déforme une géométrie centrée sur la tête (positions en mètres) et refait ses normales
const _p = new THREE.Vector3();
// force : celle de redresse (crâne : 0,7 de celle du visage)
export function deformeTete(g, force = (F.forme?.lumiere ?? 0) * 0.7) {
  if (!F.forme) return g;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    deforme(pos.getX(i), pos.getY(i), pos.getZ(i), _p);
    pos.setXYZ(i, _p.x, _p.y, _p.z);
  }
  g.computeVertexNormals();
  redresse(g, force);
  return g;
}

// ---------------------------------------------------------------------------------------------------
// Visage sculpté (gabarit à `forme`) : la calotte du visage (face.js) devient une grille plus serrée au
// centre (nez, bouche) que sur les côtés, déformée comme le crâne, puis bosselée le long de sa normale par
// des volumes doux. Repère des volumes : celui de l'atlas peint (face.js), x et y en mètres du crâne de
// référence (R = 0,28), y = 0 à l'équateur, x vers la droite ; hauteur en part du rayon du crâne. Les
// traits peints (yeux, sourcils, bouche) se posent dessus aux mêmes coordonnées.
// [nom, x, y, demi-largeur, demi-hauteur, hauteur, y de fin (arête : la hauteur va de h à hFin)?, hFin?]
// Les volumes à x ≠ 0 sont posés des deux côtés.
export const VOLUMES = [
  // nez : arête de la ligne des yeux à la pointe, pointe ronde, ailes, creux dessous (saillie de la pointe
  // ≈ 0,09 R, 1,7 cm)
  // (revue du 21/11/2026 : volumes au moins deux fois plus larges que la maille de la grille, sinon la normale
  // saute d'un sommet à l'autre ; plus d'ailes ni de creux dessous, trop fins)
  ['arête', 0, -0.03, 0.016, 0.014, 0.004, -0.11, 0.036],
  ['pointe', 0, -0.116, 0.026, 0.024, 0.034],
  // haut du visage : arcades sous les sourcils, front entre eux
  ['arcades', 0.105, 0.03, 0.06, 0.02, 0.028],
  ['front', 0, 0.015, 0.028, 0.03, 0.012],
  // pommettes
  ['pommettes', 0.15, -0.105, 0.05, 0.035, 0.022],
  // bouche : creux au-dessus de la lèvre, lèvre du haut, pli, coins, lèvre du bas, creux dessous
  ['creux de la lèvre', 0, -0.155, 0.006, 0.01, -0.006],
  ['lèvre du haut', 0, -0.17, 0.03, 0.011, 0.02],
  ['pli de la bouche', 0, -0.18, 0.028, 0.007, -0.012],
  ['coins', 0.034, -0.18, 0.008, 0.008, -0.008],
  ['lèvre du bas', 0, -0.192, 0.024, 0.01, 0.018],
  ['sous la lèvre', 0, -0.21, 0.03, 0.01, -0.012],
  // menton
  ['menton', 0, -0.25, 0.045, 0.03, 0.04],
];
// accent des normales du relief (1 : normales exactes du visage sculpté) ; écart borné à 25° de la normale du
// visage lisse (pas de paliers serrés sur le nez)
const RELIEF_N = 1.2;
const RELIEF_MAX = (25 * Math.PI) / 180;
// relief (part de R) au point (x, y) du repère des volumes
function relief(x, y) {
  let h = 0;
  for (const [, vx, vy, sx, sy, vh, yFin, hFin] of VOLUMES) {
    for (const cx of vx ? [-vx, vx] : [0]) {
      const dx = (x - cx) / sx;
      if (yFin === undefined) {
        h += vh * Math.exp(-dx * dx - ((y - vy) / sy) ** 2);
      } else {
        // arête : de (cx, vy) à (cx, yFin), hauteur de vh à hFin
        const t = clamp01((y - vy) / (yFin - vy));
        const yy = vy + t * (yFin - vy);
        h += (vh + (hFin - vh) * t) * Math.exp(-dx * dx - ((y - yy) / sy) ** 2);
      }
    }
  }
  return h;
}

// Grille du visage : NX colonnes en azimut, NY rangées en élévation, plus serrées au centre (azimut 0,
// élévation EC, entre le nez et la bouche) ; mêmes coordonnées de texture que l'ancienne calotte sphérique
// (u selon l'azimut, v selon l'élévation), l'atlas peint ne bouge pas. Normales : celles du visage lisse
// tournées vers l'avant (redresse : pas de bande d'ombre sur les joues), plus l'écart que donne le relief
// (le nez et les lèvres prennent leur ombre). Le relief s'efface vers les bords (fenêtre) pour rejoindre le
// crâne sans marche.
export function visageGeometry({ PHI, TOP, BOT, ATLAS_R, NX = 22, NY = 20 }) {
  const r = F.R * 1.012;
  const EC = -0.5;
  const az = (s) => (PHI / 2) * (0.35 * s + 0.65 * s ** 3);
  const el = (q) => EC + (q > 0 ? TOP - EC : EC + BOT) * (0.45 * q + 0.55 * q ** 3);
  const pos = [];
  const uv = [];
  const hs = [];
  const ws = [];
  for (let j = 0; j <= NY; j++) {
    const e = el(1 - (2 * j) / NY); // du haut vers le bas
    for (let i = 0; i <= NX; i++) {
      const a = az((2 * i) / NX - 1);
      deforme(r * F.SX * Math.sin(a) * Math.cos(e), r * F.SY * Math.sin(e), r * Math.cos(a) * Math.cos(e), _p);
      pos.push(_p.x, _p.y, _p.z);
      uv.push(0.5 + a / PHI, (e + BOT) / (TOP + BOT));
      const w = smooth(clamp01((PHI / 2 - Math.abs(a)) / 0.25)) * smooth(clamp01((TOP - e) / 0.15)) * smooth(clamp01((e + BOT) / 0.2));
      hs.push(relief(a * ATLAS_R * F.SX, e * ATLAS_R * F.SY) * F.R * w);
      ws.push(w);
    }
  }
  const idx = [];
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i;
      const c = a + NX + 1;
      // diagonales en miroir de part et d'autre de x = 0 (nez symétrique)
      if (i < NX / 2) idx.push(a, c, a + 1, a + 1, c, c + 1);
      else idx.push(a, c, c + 1, a, c + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // normales du visage lisse (n0), relevées (nr) : pleine force au milieu, celle du crâne aux bords (aucune
  // marche de lumière au raccord)
  g.computeVertexNormals();
  const n0 = g.attributes.normal.clone();
  const kv = F.forme.lumiere;
  redresse(g, (i) => kv * (0.7 + 0.3 * ws[i]), PLEIN);
  const nr = g.attributes.normal.clone();
  // relief le long de n0, puis normales du visage sculpté (ns) : n = nr + (ns − n0) × RELIEF_N
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n0.getX(i) * hs[i], p.getY(i) + n0.getY(i) * hs[i], p.getZ(i) + n0.getZ(i) * hs[i]);
  g.computeVertexNormals();
  const ns = g.attributes.normal;
  const K = RELIEF_N;
  const r0 = new THREE.Vector3();
  for (let i = 0; i < ns.count; i++) {
    _p.set(nr.getX(i) + (ns.getX(i) - n0.getX(i)) * K, nr.getY(i) + (ns.getY(i) - n0.getY(i)) * K, nr.getZ(i) + (ns.getZ(i) - n0.getZ(i)) * K).normalize();
    r0.fromBufferAttribute(nr, i);
    const ang = r0.angleTo(_p);
    if (ang > RELIEF_MAX) _p.copy(r0).applyAxisAngle(_ax.crossVectors(r0, _p).normalize(), RELIEF_MAX);
    ns.setXYZ(i, _p.x, _p.y, _p.z);
  }
  return g;
}

// le point du crâne d'azimut a et d'élévation e (avant déformation) est-il sous le visage, à `marge` (rad)
// de ses bords ? (le visage le cache toujours : on retire ces triangles du crâne)
export function sousVisage(a, e, { PHI, TOP, BOT }, marge = 0.12) {
  return Math.abs(a) < PHI / 2 - marge && e < TOP - marge && e > -BOT + marge;
}

// Normales du visage relevées (pente de 0,3 vers le haut) : le toon pose ses paliers sur la forme de la
// tête, pas une bande d'ombre en travers des joues (le bas d'une sphère regarde le sol). Elles gardent leur
// direction gauche-droite (21/11/2026 ; avant, toutes tournées vers l'avant : vu de profil, tout le visage
// était rasant et prenait le reflet de bord, blanc). Le dessus, les côtés et l'arrière gardent leurs normales.
// Revue du 21/11/2026 (mâchoire en dents de scie, dessous du menton éclairé comme le devant) : poids éteint
// sur une bande plus large et sous le menton (normales franchement vers le bas : il garde son ombre) ; force
// en paramètre (nombre, ou fonction (indice du sommet) → force), part au plus `max`, écart borné à `ecart`
// (rad) : sur le crâne grossier, réglage doux (0,8, 35°) ; sur le visage, plein (sinon une bande d'ombre
// barre le bas du visage)
const _n = new THREE.Vector3();
const _c = new THREE.Vector3();
const _ax = new THREE.Vector3();
const DOUX = { max: 0.8, ecart: (35 * Math.PI) / 180 };
const PLEIN = { max: 1, ecart: Math.PI };
function redresse(g, force = F.forme.lumiere, { max, ecart } = DOUX) {
  const nor = g.attributes.normal;
  for (let i = 0; i < nor.count; i++) {
    _n.fromBufferAttribute(nor, i);
    // poids : visage (normale vers l'avant), qui s'éteint doucement vers les côtés, le dessus et le dessous
    const w = smooth(clamp01((_n.z + 0.2) / 1.1)) * (1 - smooth(clamp01(_n.y / 0.8))) * smooth(clamp01((_n.y + 0.97) / 0.22));
    if (w <= 0) continue;
    const k = typeof force === 'function' ? force(i) : force;
    // cible : même direction gauche-droite, relevée
    const h = Math.hypot(_n.x, _n.z) || 1;
    _c.set(_n.x / h, 0.3, _n.z / h).normalize().sub(_n).multiplyScalar(Math.min(max, k * w)).add(_n).normalize();
    const ang = _n.angleTo(_c);
    if (ang > ecart) _c.copy(_n).applyAxisAngle(_ax.crossVectors(_n, _c).normalize(), ecart);
    nor.setXYZ(i, _c.x, _c.y, _c.z);
  }
}

// crâne : sphère aplatie du gabarit, déformée ; centré en 0 (à poser en [0, HC, 0]). Mêmes triangles
// que la sphère d'origine (22 × 14), mais les anneaux sont resserrés vers le bas (le contour de la
// mâchoire) et espacés sur le dessus, caché par les cheveux. cache(p, a, e) (facultatif) : le sommet p
// (déformé, repère de la tête), d'azimut a et d'élévation e avant déformation, est-il toujours caché (sous
// le visage, la calotte des cheveux…) ? Les triangles dont les trois sommets le sont sont retirés.
export function craneGeometry(w = 22, h = 14, cache = null) {
  const g = new THREE.SphereGeometry(F.R, w, h);
  if (F.forme) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const t = Math.acos(Math.max(-1, Math.min(1, y / F.R))) / Math.PI; // 0 en haut, 1 en bas
      const a = Math.PI * (1 - (1 - t) ** 1.4);
      const k = r > 1e-6 ? (F.R * Math.sin(a)) / r : 0;
      pos.setXYZ(i, x * k, F.R * Math.cos(a), z * k);
    }
  }
  g.scale(F.SX, F.SY, 1);
  const pos = g.attributes.position;
  const angles = [];
  for (let i = 0; i < pos.count; i++) angles.push([Math.atan2(pos.getX(i) / F.SX, pos.getZ(i)), Math.asin(clamp01((pos.getY(i) / (F.R * F.SY) + 1) / 2) * 2 - 1)]);
  deformeTete(g);
  if (cache) {
    const cachés = angles.map(([a, e], i) => cache(_p.fromBufferAttribute(pos, i), a, e));
    const idx = g.index.array;
    const garde = [];
    for (let i = 0; i < idx.length; i += 3) if (!(cachés[idx[i]] && cachés[idx[i + 1]] && cachés[idx[i + 2]])) garde.push(idx[i], idx[i + 1], idx[i + 2]);
    g.setIndex(garde);
  }
  return g;
}

// distance du centre du crâne au bas du menton : le cou et le col s'y raccordent
export const MENTON = F.R * (F.SY + (F.forme ? F.forme.menton : 0));

// Oreilles du gabarit (forme.oreille) : grandes et rondes, à hauteur des yeux, décollées vers l'avant
// comme sur les planches (identifiant à part : le trait les détache du crâne). b : Builder de l'os HEAD.
// Sans `forme` : null (le corps garde ses oreilles d'origine).
export function oreilles(b, color, hc) {
  const o = F.forme?.oreille;
  if (!o) return null;
  for (const sx of [-1, 1]) {
    b.add(new THREE.SphereGeometry(o.r, 10, 6), color, {
      p: [sx * F.R * F.SX * o.x, hc + o.y, o.z],
      r: [0, sx * o.ouvre, 0],
      s: [0.48, 1, 0.78],
    });
  }
  return b;
}
