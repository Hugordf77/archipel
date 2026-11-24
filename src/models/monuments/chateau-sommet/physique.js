// Physique et plan : château du Sommet givré, version 1 (MON-015), repère central du monde ouvert.
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] (r ≤ 4 m) et planchers
// marchables { x0, z0, x1, z1, w, y0, y1 } en mètres, dans le repère du modèle : centre de la plate-forme à
// l'origine, sol de la plate-forme à y = 0, portail vers +Z. Le plan, partagé avec le constructeur, vit ici.

// enceinte : octogone de rayon R (axe des courtines aux sommets), courtines de hauteur H et de largeur EP,
// portail au milieu du côté +Z (ouverture de portail m, haute de portailH m, sous un linteau) ; soubassement
// taluté qui descend de TALUS m dans la pente du pic, évasé de FRUIT m
export const ENCEINTE = { R: 38, H: 16, EP: 3.4, TALUS: 30, FRUIT: 6, portail: 9, portailH: 10 };
const N = 8;
// angle de chaque sommet, compté depuis +Z vers +X : le portail tombe entre les sommets 7 et 0
export const SOMMETS = Array.from({ length: N }, (_, k) => {
  const a = Math.PI / N + (k * 2 * Math.PI) / N;
  return [Math.sin(a) * ENCEINTE.R, Math.cos(a) * ENCEINTE.R];
});
// tours d'angle : rayon r, hauteur du fût h, toit conique de t m ; 0 et 7 encadrent le portail
export const TOURS = SOMMETS.map((_, k) => (k === 0 || k === N - 1 ? { r: 6.5, h: 40, t: 16 } : { r: 6, h: k % 2 ? 30 : 34, t: 14 }));

// donjon : socle surélevé (dalle à angles coupés) et son grand escalier vers le portail ; corps de logis à
// toit en pavillon ; quatre tourelles d'angle ; grande tour au fond du logis
export const SOCLE = { x: 16, z0: -22, z1: 4, y: 3.2, coupe: 3 };
export const MARCHES = { n: 10, giron: 0.6, l: 12 };
export const LOGIS = { x: 12, z0: -18, z1: 0, h: 30, toit: 14, coupe: 2 };
export const TOURELLES = [[-12, 0], [12, 0], [12, -18], [-12, -18]].map(([x, z]) => ({ x, z, r: 3.6, h: 44, t: 12 }));
// grande tour : trois étages de plus en plus fins [rayon, hauteur du dessus] (terrasse à parapet entre deux
// étages), flèche de t m : le sommet du toit monte à ~170 m au-dessus de la plate-forme (~360 m d'altitude)
export const GRANDE_TOUR = { x: 0, z: -9, etages: [[9, 64], [7, 108], [5, 136]], t: 32 };

// --- physique ----------------------------------------------------------------------------------------
// obstacles en rangée le long d'un segment (cercles de rayon r tous les pas m)
const rang = (x0, z0, x1, z1, r, pas = r * 1.5) => {
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(L / pas));
  return Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, r]);
};
// disque plein de rayon R en cercles de 4 m au plus
const disque = (x, z, R) => (R <= 4 ? [[x, z, R]] : [[x, z, 4], ...Array.from({ length: 6 }, (_, i) => [x + Math.sin(i * 1.047) * (R - 2.5), z + Math.cos(i * 1.047) * (R - 2.5), 2.6])]);
// le côté k de l'enceinte, réduit aux courtines hors des tours (et hors du portail pour le côté 7)
export function cote(k) {
  const [ax, az] = SOMMETS[k];
  const [bx, bz] = SOMMETS[(k + 1) % N];
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L;
  const uz = (bz - az) / L;
  const t0 = TOURS[k].r * 0.8;
  const t1 = L - TOURS[(k + 1) % N].r * 0.8;
  const morceaux = k === N - 1 ? [[t0, L / 2 - ENCEINTE.portail / 2], [L / 2 + ENCEINTE.portail / 2, t1]] : [[t0, t1]];
  return morceaux.map(([s0, s1]) => [ax + ux * s0, az + uz * s0, ax + ux * s1, az + uz * s1]);
}

const { x: sx, z0: sz0, z1: sz1, y: sy } = SOCLE;
const { x: lx, z0: lz0, z1: lz1 } = LOGIS;
export default {
  obstacles: [
    ...SOMMETS.flatMap(([x, z], k) => disque(x, z, TOURS[k].r)),
    ...Array.from({ length: N }, (_, k) => cote(k).flatMap(([x0, z0, x1, z1]) => rang(x0, z0, x1, z1, 1.6))).flat(),
    // bords du socle (sauf l'escalier, au milieu de la façade), pourtour du logis, tourelles
    ...rang(-sx, sz0, sx, sz0, 0.7), ...rang(-sx, sz0, -sx, sz1, 0.7), ...rang(sx, sz0, sx, sz1, 0.7),
    ...rang(-sx, sz1, -MARCHES.l / 2 - 0.3, sz1, 0.7), ...rang(MARCHES.l / 2 + 0.3, sz1, sx, sz1, 0.7),
    ...rang(-lx, lz1, lx, lz1, 1), ...rang(lx, lz1, lx, lz0, 1), ...rang(lx, lz0, -lx, lz0, 1), ...rang(-lx, lz0, -lx, lz1, 1),
    ...TOURELLES.map((t) => [t.x, t.z, t.r]),
  ],
  // planchers : marches du grand escalier (montent vers −Z), dessus du socle devant le logis
  planchers: [
    ...Array.from({ length: MARCHES.n }, (_, k) => {
      const z0 = sz1 + (MARCHES.n - k) * MARCHES.giron;
      const y = ((k + 1) * sy) / MARCHES.n;
      return { x0: 0, z0, x1: 0, z1: z0 - MARCHES.giron, w: MARCHES.l - 0.1, y0: y, y1: y };
    }),
    { x0: 0, z0: sz1, x1: 0, z1: lz1 + 1.2, w: 2 * sx - 0.6, y0: sy, y1: sy },
  ],
};
