// Physique : escalier et passerelle du navire-forteresse (BAT-019).
// Données pures, sans import (lisibles par le Worker). Forme 0 (escalier du flanc) : dans le repère du
// navire (posée à son origine, memory.md §8, élément 13) ; forme 1 (passerelle) : pied au bas de la rampe,
// montée vers +Z.
//
// Aucun obstacle : chevalets et poteaux sont sous les planchers de l'escalier, que le joueur au sol ne monte
// pas (Player.free : < 0,4 m) ; des obstacles sans hauteur gêneraient sur les marches. Les rambardes portent
// des planchers étroits à 1,6 m au-dessus des marches, plus haut que le saut (≈ 1,23 m) même depuis la
// marche voisine, plus haute de 0,33 m : on ne tombe pas de l'escalier. La passerelle passe au-dessus du
// pont : ses rambardes n'ont pas de plancher (on n'en tomberait que sur le pont).

// escalier du flanc +X : arrivée dans l'ouverture du pavois (z −7,4 → −4,6, pont à 13,025 m en z = −6,
// pontPrincipal de navire-coque/physique.js ; 20,025 m avant l'abaissement de la coque du 01/11/2026),
// descente vers la proue (pied vers le cercle de pierres, emplacement de l'utilisateur, §7) : trois volées
// de treize hauteurs (douze marches et un palier), marches de 0,334 m (< 0,4 m) et 0,4 m de giron
export const HAUT = 13.025;
export const N = 13;
export const F = 3;
export const HM = HAUT / (F * N);
export const GIRON = 0.4;
export const PALIER = 1.6;
export const LARGE = 2.4;
export const X = 10.8;
export const PALIER_HAUT = { x0: 8.5, z0: -7.2, z1: -4.8 };
export const VOLEES = Array.from({ length: F }, (_, f) => {
  const z0 = PALIER_HAUT.z1 + f * ((N - 1) * GIRON + PALIER);
  return { z0, z1: z0 + (N - 1) * GIRON, y0: HAUT - f * N * HM };
});
// hauteur des rambardes de l'escalier au-dessus de leur marche ou de leur palier (lisse haute à 1,57 m,
// dessus à 1,62 m)
export const RAMBARDE = 1.6;
const RX = [X - LARGE / 2 - 0.05, X + LARGE / 2 + 0.05];

// passerelle : 6 m de long, 1,8 m de large, montée de 2 m (du pont principal au gaillard)
export const PASSERELLE = { L: 6, larg: 1.8, h: 2.0 };

const r3 = (v) => Math.round(v * 1000) / 1000;
const plat = (x, z0, z1, w, y) => ({ x0: x, z0: r3(z0), x1: x, z1: r3(z1), w, y0: r3(y), y1: r3(y) });
const pente = (x, z0, y0, z1, y1, w) => ({ x0: x, z0: r3(z0), x1: x, z1: r3(z1), w, y0: r3(y0), y1: r3(y1) });

function escalier() {
  const out = [];
  const { x0, z0, z1 } = PALIER_HAUT;
  const xe = X + LARGE / 2 + 0.05;
  // palier d'arrivée, du bord du pont à la rambarde extérieure ; rambardes : extérieure, en travers vers la
  // poupe, et en travers vers la proue entre le pavois et la première volée
  out.push({ x0: r3((x0 + xe) / 2), z0, x1: r3((x0 + xe) / 2), z1, w: r3(xe - x0), y0: HAUT, y1: HAUT });
  out.push(plat(xe, z0, z1, 0.3, HAUT + RAMBARDE));
  out.push({ x0: x0 + 0.1, z0: z0 - 0.05, x1: xe, z1: z0 - 0.05, w: 0.3, y0: r3(HAUT + RAMBARDE), y1: r3(HAUT + RAMBARDE) });
  // (décalées de 5 cm vers le pavois, comme leur lisse : elles ferment l'ouverture jusqu'à ses poteaux)
  out.push({ x0: x0 + 0.1, z0: z1 + 0.05, x1: RX[0], z1: z1 + 0.05, w: 0.3, y0: r3(HAUT + RAMBARDE), y1: r3(HAUT + RAMBARDE) });
  VOLEES.forEach(({ z0: za, z1: zb, y0 }, f) => {
    // marches (une par plancher, plates) ; rambardes des deux côtés en planchers plats, un par marche, à
    // RAMBARDE au-dessus d'elle (la règle des planchers ne se tient pas sur la pente de la lisse : 0,83)
    for (let i = 0; i < N - 1; i++) {
      const [z0m, z1m, ym] = [za + i * GIRON, za + (i + 1) * GIRON, y0 - (i + 1) * HM];
      out.push(plat(X, z0m, z1m, LARGE - 0.1, ym));
      for (const x of RX) out.push(plat(x, z0m, z1m, 0.3, ym + RAMBARDE));
    }
    if (f === F - 1) return;
    // palier entre deux volées et ses rambardes
    const yp = y0 - N * HM;
    out.push(plat(X, zb, zb + PALIER, LARGE, yp));
    for (const x of RX) out.push(plat(x, zb, zb + PALIER, 0.3, yp + RAMBARDE));
  });
  return out;
}
// poteaux des rambardes de l'escalier : au bord arrière d'une marche sur trois (tête à RAMBARDE au-dessus
// de la marche ; à 0,35 m de la marche précédente, la règle des planchers ne les y compare pas), et aux deux
// bouts de chaque volée
export const POTEAUX = [2, 5, 8];
function passerelle() {
  const { L, larg, h } = PASSERELLE;
  return [pente(0, 0, 0.07, L, h + 0.07, larg - 0.1)];
}
export const PLANCHERS = [escalier(), passerelle()];

export default {
  obstacles: [],
  planchers: (p) => PLANCHERS[Math.min(1, Math.max(0, Math.round(p.forme ?? 0)))],
};
