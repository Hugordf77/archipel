// Voûte nocturne : catalogue déterministe (pur, sans THREE) d'où sky.js tire la carte précalculée
// (voie lactée, bandes de poussière, nébuleuses pastel, amas) et les paramètres des étoiles.
// Les directions sont en « espace voûte » : +Y est le pôle céleste, autour duquel la voûte tourne.

export const VOUTE_GRAINE = 7;

// Couleurs des étoiles (bleu-blanc, crème, ambre) et des nébuleuses : pastel, jamais sombres
export const ETOILES_COULEURS = ['#d4e2ff', '#fff6e2', '#ffdcae'];
export const NEBULEUSES_COULEURS = ['#b79cf0', '#86d8d0', '#f2a8c8', '#a8b8f4', '#f6c2a4'];

// Pôle céleste en espace ciel : vers le nord (-Z), 38° au-dessus de l'horizon
const POLE_ELEVATION = (38 * Math.PI) / 180;
export const POLE = [0, Math.sin(POLE_ELEVATION), -Math.cos(POLE_ELEVATION)];

// La voûte fait un tour par jour canonique (sky.js, tourneVoute) ; le zénith, en espace voûte, à l'angle th
export const ARCHE_HEURE = 1;
const ARCHE_THETA = (ARCHE_HEURE / 24) * Math.PI * 2;
export function zenithVoute(heure) {
  const th = (heure / 24) * Math.PI * 2;
  const c = Math.cos(POLE_ELEVATION);
  return [c * Math.sin(th), Math.sin(POLE_ELEVATION), c * Math.cos(th)];
}

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function unitaire(v) {
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
}

// direction au hasard sur la sphère, éventuellement près d'un plan (normale n, écart max en sinus)
function direction(rand, n = null, ecart = 1) {
  for (;;) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const d = [r * Math.cos(a), z, r * Math.sin(a)];
    if (!n || Math.abs(d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) < ecart) return d;
  }
}

export function genererVoute(graine = VOUTE_GRAINE) {
  const rand = rng(graine);
  // plan galactique incliné de 42 à 50° sur l'équateur céleste, orienté pour que l'arche passe au
  // zénith vers 1 h (le zénith décrit le parallèle de déclinaison = élévation du pôle)
  const inc = ((42 + rand() * 8) * Math.PI) / 180;
  const k = (-Math.tan(POLE_ELEVATION) / Math.tan(inc));
  const az = (rand() < 0.5 ? Math.asin(k) : Math.PI - Math.asin(k)) - ARCHE_THETA;
  const galaxie = unitaire([Math.sin(inc) * Math.cos(az), Math.cos(inc), Math.sin(inc) * Math.sin(az)]);
  // centre galactique (bulbe plus clair) : dans le plan
  const g = galaxie;
  const t = unitaire(Math.abs(g[1]) < 0.9 ? [g[2], 0, -g[0]] : [1, 0, 0]);
  const b = [g[1] * t[2] - g[2] * t[1], g[2] * t[0] - g[0] * t[2], g[0] * t[1] - g[1] * t[0]];
  const ac = rand() * Math.PI * 2;
  const centre = unitaire([0, 1, 2].map((i) => Math.cos(ac) * t[i] + Math.sin(ac) * b[i]));
  // nébuleuses pastel, surtout près de la bande
  const nebuleuses = [];
  for (let i = 0; i < NEBULEUSES_COULEURS.length; i++) {
    nebuleuses.push({
      dir: direction(rand, galaxie, 0.35),
      rayon: 0.07 + rand() * 0.09,
      couleur: NEBULEUSES_COULEURS[i],
      force: 0.55 + rand() * 0.45,
    });
  }
  // amas d'étoiles (plus d'étoiles et une lueur douce)
  const amas = [];
  for (let i = 0; i < 6; i++) {
    amas.push({ dir: direction(rand, i < 4 ? galaxie : null, 0.3), rayon: 0.025 + rand() * 0.035, richesse: 0.6 + rand() * 0.4 });
  }
  // décalages de bruit (poussière, nuées) et graine des étoiles
  const bruit = [rand() * 100, rand() * 100, rand() * 100];
  const etoiles = Math.floor(rand() * 997);
  return { graine, pole: POLE, galaxie, centre, nebuleuses, amas, bruit, etoiles };
}
