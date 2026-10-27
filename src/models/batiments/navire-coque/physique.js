// Physique : coque et berceau du navire-forteresse (BAT-014).
// Données pures, sans import (lisibles par le Worker). Repère du navire (docs/forteresse-navire/memory.md
// §3) : origine au sol au centre de l'emprise, +Z vers la proue, +X flanc de l'escalier, y vers le haut.
// La forme de la coque (stations, tonture, sections) est décrite ici pour que le constructeur et les
// planchers partagent les mêmes nombres.
//
// Aucun obstacle : le berceau est tout entier sous les planchers du pont. En jeu, un plancher est le sol
// dans tout son rectangle (IslandManager.heightAt) et le joueur au sol ne monte pas plus de 0,4 m d'un coup
// (Player.free) : le bord des planchers, à 20 m, fait mur et personne ne passe sous la coque. Des cercles
// sous la quille gêneraient en revanche sur le pont (les obstacles n'ont pas de hauteur, navigation.js).

// stations de la coque (memory.md §6.1) : z, demi-largeur au pont W, au fond B, dessous de quille K.
// Quille relevée aux bouts sur la planche référence / modèle du 27/10/2026 (ventre qui remonte en rond
// vers la proue, comme la référence) : K de −32, 22, 28 et 32 passés de 7 / 5,5 / 8 / 12 à 8,5 / 6 / 9,5 / 16
export const STATIONS = [
  [-32, 6.0, 2.0, 8.5], [-24, 8.5, 4.0, 5.2], [-12, 9.0, 5.0, 4.2], [0, 9.0, 5.0, 4.0],
  [12, 8.6, 4.4, 4.3], [22, 6.5, 2.5, 6.0], [28, 3.6, 0.9, 9.5], [32, 0.4, 0.2, 16.0],
];
export const POUPE = -32;
export const PROUE = 32;

// interpolation cubique monotone (Fritsch-Carlson) : passe par les stations sans dépasser leurs valeurs
function monotone(xs, ys) {
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    const xc = Math.min(xs[n - 1], Math.max(xs[0], x));
    let i = 0;
    while (i < n - 2 && xc > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (xc - xs[i]) / h;
    const [t2, t3] = [t * t, t * t * t];
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const colonne = (k) => monotone(STATIONS.map((s) => s[0]), STATIONS.map((s) => s[k]));
const LARGEUR = colonne(1);
const FOND = colonne(2);
const QUILLE = colonne(3);

// pont principal avec sa tonture ; château de poupe (+3 m) en deçà de CHATEAU, gaillard d'avant (+2 m)
// au-delà de GAILLARD. Le haut de la coque suit le pont principal ; au-dessus, le pavois (0,9 m au-dessus
// du pont) monte d'un ressaut franc au château et au gaillard, comme sur les galions (une lisse en rampe ne
// se contrôle pas : sur la pente, mesure.mjs compare le plancher à des sommets de la crête voisine)
export const CHATEAU = -20;
export const GAILLARD = 22;
// pavois de 1,1 m : avec la mousse, sa crête est à 1,32 m du pont, plus haut que le saut du joueur
// (≈ 1,23 m : tuning.js, Player.js:227)
export const PAVOIS = 1.1;
export const pontPrincipal = (z) => 20 + 0.0007 * z * z;
export const hausse = (z) => (z < CHATEAU ? 3 : z > GAILLARD ? 2 : 0);
export const pont = (z) => pontPrincipal(z) + hausse(z);
export const lisse = (z) => pont(z) + PAVOIS;
// tronçons du pavois [z0, z1, hausse] ; chacun se termine sur un poteau au ressaut. Le gaillard est fermé
// par une rambarde en travers à POINTE : au-delà, la proue est trop effilée pour qu'on y marche
export const POINTE = 28;
export const TRONCONS = [[POUPE, CHATEAU, 3], [CHATEAU, GAILLARD, 0], [GAILLARD, PROUE, 2]];

// section de coque à la station z : demi-largeur W au haut de la coque (pied du pavois, y = H), dessous de
// quille K, fond plat de demi-largeur f (la quille), flancs en quart de super-ellipse d'exposant N
export const N_SECTION = 2.4;
export function station(z) {
  const B = FOND(z);
  return { z, W: LARGEUR(z), B, K: QUILLE(z), H: pontPrincipal(z), f: B * 0.35 };
}
// demi-section : φ de 0 (quille) à π/2 (haut de coque) → [x ≥ 0, y]
export function demiSection(st, phi) {
  const e = 2 / N_SECTION;
  return [st.f + (st.W - st.f) * Math.pow(Math.sin(phi), e), st.K + (st.H - st.K) * (1 - Math.pow(Math.cos(phi), e))];
}
// demi-largeur extérieure de la coque à la hauteur y (bornée entre quille et haut de coque)
export function demiLargeur(st, y) {
  const v = Math.min(1, Math.max(0, (y - st.K) / (st.H - st.K)));
  const c = Math.pow(1 - v, N_SECTION / 2);
  return st.f + (st.W - st.f) * Math.pow(Math.sqrt(1 - c * c), 2 / N_SECTION);
}
// épaisseur du pavois ; le plancher du pont va jusqu'à sa face intérieure (aucune bande de vide entre les
// deux : hors des planchers, c'est le sol de l'île, 20 m plus bas)
export const BORDE = 0.3;
const demiPont = (z) => demiLargeur(station(z), Math.min(pont(z), station(z).H)) - BORDE;
// arrivée de l'escalier : le pavois du flanc +X s'ouvre entre ces deux z
export const OUVERTURE = [-7.4, -4.6];

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
// planchers : le pont en tronçons le long de Z (la tonture, en corde, s'écarte de moins de 7 mm du
// plancher dessiné), château et gaillard à part. Chaque tronçon prend la largeur de son bout le plus large :
// aucune bande de vide le long du pavois là où la coque s'élargit ; ce qui déborde passe sous le plancher
// du pavois, plus haut, qui reste le mur. Tronçons recoupés pour que ce débord reste sous 0,45 m.
const troncons = (zs, haut) => zs.slice(0, -1).flatMap((za, i) => {
  const zb = zs[i + 1];
  const n = Math.max(1, Math.ceil(Math.abs(demiPont(za + 0.01) - demiPont(zb - 0.01)) / 0.45));
  return Array.from({ length: n }, (_, k) => {
    const [z0, z1] = [za + ((zb - za) * k) / n, za + ((zb - za) * (k + 1)) / n];
    const w = 2 * Math.max(demiPont(z0 + 0.01), demiPont(z1 - 0.01), demiPont((z0 + z1) / 2));
    return { x0: 0, z0: r2(z0), x1: 0, z1: r2(z1), w: r2(w), y0: r3(haut(z0)), y1: r3(haut(z1)) };
  });
});
// dessus des pavois : le coussin de la lisse de mousse (0,19 à 0,22 m au-dessus de la lisse) porte un
// plancher étroit centré sur son bord intérieur (W − 0,25), de W − 0,6 à W + 0,1 : le joueur (rayon 0,3 m)
// est arrêté un rayon avant la face du pavois. Depuis le pont, c'est une marche de 1,3 m (4,3 m au
// château) que le joueur ne monte pas, ni à pied (Player.free : dy < 0,4 m sur un plancher) ni d'un saut :
// on ne traverse pas le pavois, sans obstacle (les obstacles n'ont pas de hauteur et bloqueraient aussi le
// sol sous la coque)
export const CRETE = { dx: -BORDE + 0.05, dy: 0.2 };
const LARGE_PAVOIS = 0.7;
// pavois du flanc s de z0 à z1 (hausse h) : tronçons droits de 3 m au plus, tant que la corde reste à moins
// de 2 cm (y) et 3 cm (x) de la crête
function pavois(s, z0, z1, h) {
  const pt = (z) => [s * (station(z).W + CRETE.dx), pontPrincipal(z) + h + PAVOIS + CRETE.dy];
  const proche = (a, c) => {
    if (c - a > 3) return false;
    const [[xa, ya], [xc, yc]] = [pt(a), pt(c)];
    for (let k = 1; k < 8; k++) {
      const [x, y] = pt(a + ((c - a) * k) / 8);
      if (Math.abs(y - (ya + ((yc - ya) * k) / 8)) > 0.02 || Math.abs(x - (xa + ((xc - xa) * k) / 8)) > 0.03) return false;
    }
    return true;
  };
  const out = [];
  for (let a = z0; a < z1 - 1e-6;) {
    let b = Math.min(z1, a + 0.5);
    while (b < z1 && proche(a, Math.min(z1, b + 0.5))) b = Math.min(z1, b + 0.5);
    const [[xa, ya], [xb, yb]] = [pt(a), pt(b)];
    out.push({ x0: r2(xa), z0: r2(a), x1: r2(xb), z1: r2(b), w: LARGE_PAVOIS, y0: r3(ya), y1: r3(yb) });
    a = b;
  }
  return out;
}
// planche en travers (le long de X) au niveau y
// rambardes des ressauts : lisse haute à 1,27 m (dessus à 1,32 m), au ras des coussins des pavois et plus
// haut que le saut du joueur
export const RAMBARDE = 1.3;
// largeur de leur plancher : centré sur la lisse, il arrête le joueur (rayon 0,3 m) avant elle des deux côtés
const LARGE_RAMBARDE = 0.84;
const travers = (z, demi, y, w) => ({ x0: r2(-demi), z0: z, x1: r2(demi), z1: z, w, y0: r3(y), y1: r3(y) });
export const PLANCHERS = [
  ...troncons([POUPE + 0.3, -26, CHATEAU], (z) => pontPrincipal(z) + 3),
  ...troncons([CHATEAU, -14, -8, -2, 4, 10, 16, GAILLARD], pontPrincipal),
  ...troncons([GAILLARD, 25, POINTE], (z) => pontPrincipal(z) + 2),
  ...[-1, 1].flatMap((s) => [
    ...pavois(s, POUPE + 0.8, CHATEAU, 3),
    ...(s > 0 ? [...pavois(s, CHATEAU, OUVERTURE[0], 0), ...pavois(s, OUVERTURE[1], GAILLARD, 0)] : pavois(s, CHATEAU, GAILLARD, 0)),
    ...pavois(s, GAILLARD, POINTE, 2),
  ]),
  // tableau de poupe (z −32 à −31,2 : faîtage de mousse, 0,37 m au-dessus de la lisse ; les pavois des
  // flancs commencent à −31,2)
  travers(POUPE + 0.4, station(POUPE).W, lisse(POUPE) + 0.37, 0.8),
  // rambardes du château (chute de 3 m vers le pont), du gaillard (2 m) et de la pointe, sur leur lisse haute
  travers(CHATEAU - 0.1, demiPont(CHATEAU), pontPrincipal(CHATEAU) + 3 + RAMBARDE, LARGE_RAMBARDE),
  travers(GAILLARD + 0.1, demiPont(GAILLARD), pontPrincipal(GAILLARD) + 2 + RAMBARDE, LARGE_RAMBARDE),
  travers(POINTE, demiPont(POINTE), pontPrincipal(POINTE) + 2 + RAMBARDE, LARGE_RAMBARDE),
];

export default {
  obstacles: [],
  planchers: PLANCHERS,
};
