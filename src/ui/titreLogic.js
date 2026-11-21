// Écran-titre, logique pure (tests/titre.test.js) : lieu de la scène, plans de caméra et menu.
// La scène et l'orchestration vivent dans src/app/Titre.js, l'habillage dans src/ui/titreScreen.js.
import { createDefaultState } from '../core/state.js';

// ---------------------------------------------------------------------------
// Lieu : le rebord est du Plateau venté, face au large, à l'aube (choix de l'utilisateur, 22/11/2026).
// x, z : coordonnées absolues du héros (m) ; cap : direction du regard (0 = +Z, π/2 = est) ; heure :
// heure canonique forcée (lever à 6,5) ; vent : direction où il souffle (x, z), force du vent du monde
// (uWindStrength) et brise ressentie par les cheveux et l'écharpe (VENT.brise, m/s).
export const LIEU_TITRE = {
  x: 866,
  z: -881,
  cap: Math.PI / 2,
  heure: 6.65,
  vent: { dir: [-0.86, 0.51], force: 1.3, brise: 6.5 },
};

// ---------------------------------------------------------------------------
// Plans de caméra, dans le repère du héros : av (devant, m), dr (à sa droite, m), h (au-dessus de ses
// pieds, m). Chaque plan va de « de » à « a » en un lent mouvement ; entre deux plans, un fondu au papier.
// Le Moulin du Large se dresse à 10 m au sud (à droite du héros) : les plans larges se tiennent au nord,
// les plans serrés au sud tournent le dos au moulin ; il reste hors du cadre.
export const PLANS = [
  // le large : de dos, travelling avant lent ; l'horizon au tiers haut, le héros à droite du centre
  {
    nom: 'large',
    duree: 17,
    de: { cam: [-11, -3.4, 3], vise: [130, 14, -14], fov: 40 },
    a: { cam: [-7.5, -2.4, 2.3], vise: [130, 12, -12], fov: 38 },
  },
  // le vent : trois quarts dos, en contre-plongée, tête et écharpe sur le ciel ; lente orbite
  {
    nom: 'vent',
    duree: 15,
    de: { cam: [-3.4, 2.5, 0.9], vise: [5, -0.9, 1.05], fov: 36 },
    a: { cam: [-4.2, 1.4, 1.05], vise: [5, -0.4, 1], fov: 35 },
  },
  // l'archipel : grand plan qui s'élève et recule, le héros tout petit au bord du plateau
  {
    nom: 'archipel',
    duree: 18,
    de: { cam: [-15, -9, 5.5], vise: [170, 4, -34], fov: 42 },
    a: { cam: [-24, -14, 11], vise: [170, 6, -40], fov: 42 },
  },
  // le profil : de côté (sud), travelling latéral, la silhouette tournée vers le jour qui se lève
  {
    nom: 'profil',
    duree: 15,
    de: { cam: [0.3, 4.6, 1.9], vise: [1.1, -0.3, 0.85], fov: 34 },
    a: { cam: [-1.2, 4.8, 2], vise: [0.6, -0.5, 0.85], fov: 34 },
  },
];
export const DUREE_PLANS = PLANS.reduce((s, p) => s + p.duree, 0);
export const FONDU_PLAN = 0.9; // s, de chaque côté d'une coupe

const lissage = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
const melange = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);

// plan courant au temps t (s, en boucle) : indice, temps dans le plan, avancement 0..1
export function planAt(t) {
  let r = ((t % DUREE_PLANS) + DUREE_PLANS) % DUREE_PLANS;
  for (let i = 0; i < PLANS.length; i++) {
    if (r < PLANS[i].duree || i === PLANS.length - 1) return { i, local: r, u: Math.min(1, r / PLANS[i].duree) };
    r -= PLANS[i].duree;
  }
  return { i: 0, local: 0, u: 0 };
}

// cadrage au temps t, dans le repère du héros
export function poseAt(t) {
  const { i, u } = planAt(t);
  const P = PLANS[i];
  const k = lissage(u);
  return { plan: P.nom, cam: melange(P.de.cam, P.a.cam, k), vise: melange(P.de.vise, P.a.vise, k), fov: P.de.fov + (P.a.fov - P.de.fov) * k };
}

// opacité du voile (0 : image nette, 1 : papier) : fondu de part et d'autre de chaque coupe ; pas de
// fondu d'entrée au tout premier plan (l'écran de chargement s'efface déjà)
export function voileAt(t) {
  const { i, local } = planAt(t);
  const d = PLANS[i].duree;
  const sortie = lissage(1 - (d - local) / FONDU_PLAN);
  const entree = t < DUREE_PLANS && i === 0 ? 0 : lissage(1 - local / FONDU_PLAN);
  return Math.max(sortie, entree);
}

// repère du héros → monde : héros { x, y, z, cap } ; renvoie le point en coordonnées absolues
export function versMonde([av, dr, h], { x, y, z, cap }) {
  const fx = Math.sin(cap);
  const fz = Math.cos(cap);
  // à droite de qui regarde vers (fx, fz)
  const rx = -fz;
  const rz = fx;
  return { x: x + fx * av + rx * dr, y: y + h, z: z + fz * av + rz * dr };
}

// ---------------------------------------------------------------------------
// Menu. Étapes : intro (le titre apparaît) → attente (« Appuyez sur une touche ») → menu ; confirmer
// (nouvelle partie alors qu'une partie existe) ; options (panneau des réglages ouvert) ; depart.
export const LIBELLES = {
  continuer: 'Continuer',
  nouvelle: 'Nouvelle partie',
  options: 'Options',
  recommencer: 'Tout effacer et recommencer',
  annuler: 'Annuler',
};

export function entreesMenu(sauvegarde) {
  return sauvegarde ? ['continuer', 'nouvelle', 'options'] : ['nouvelle', 'options'];
}

export function creerMenu({ sauvegarde = false } = {}) {
  return { etape: 'intro', sauvegarde, entrees: entreesMenu(sauvegarde), curseur: 0, action: null };
}

// entrées affichées à l'étape courante
export function entreesVisibles(m) {
  return m.etape === 'confirmer' ? ['recommencer', 'annuler'] : m.entrees;
}

// premier appui (touche, clic, bouton) : le menu s'ouvre
export function eveiller(m) {
  if (m.etape !== 'intro' && m.etape !== 'attente') return { ...m, action: null };
  return { ...m, etape: 'menu', curseur: 0, action: 'eveil' };
}

export function deplacer(m, d) {
  if (m.etape !== 'menu' && m.etape !== 'confirmer') return { ...m, action: null };
  const n = entreesVisibles(m).length;
  return { ...m, curseur: (m.curseur + d + n) % n, action: 'curseur' };
}

// curseur posé sur une entrée (survol de la souris)
export function choisir(m, i) {
  if (m.etape !== 'menu' && m.etape !== 'confirmer') return { ...m, action: null };
  const n = entreesVisibles(m).length;
  const c = Math.max(0, Math.min(n - 1, i));
  return { ...m, curseur: c, action: c === m.curseur ? null : 'curseur' };
}

// valider l'entrée sous le curseur ; action : 'eveil' | 'continuer' | 'nouvelle' | 'options' |
// 'confirmer' | 'annuler'
export function valider(m) {
  if (m.etape === 'intro' || m.etape === 'attente') return eveiller(m);
  if (m.etape === 'menu') {
    const id = m.entrees[m.curseur];
    // une partie existe : on demande avant de l'effacer (Annuler sous le curseur)
    if (id === 'nouvelle' && m.sauvegarde) return { ...m, etape: 'confirmer', curseur: 1, action: 'confirmer' };
    if (id === 'options') return { ...m, etape: 'options', action: 'options' };
    return { ...m, etape: 'depart', action: id };
  }
  if (m.etape === 'confirmer') {
    if (m.curseur === 0) return { ...m, etape: 'depart', action: 'nouvelle' };
    return retour(m);
  }
  return { ...m, action: null };
}

// retour (Échap, ◯) : de la confirmation au menu, des options au menu
export function retour(m) {
  if (m.etape === 'confirmer') return { ...m, etape: 'menu', curseur: m.entrees.indexOf('nouvelle'), action: 'annuler' };
  if (m.etape === 'options') return { ...m, etape: 'menu', curseur: m.entrees.indexOf('options'), action: 'annuler' };
  return { ...m, action: null };
}

// Nouvelle partie à la place d'une partie existante : monde vierge, réglages du joueur gardés (volumes,
// qualité, commandes)
export function etatNouvellePartie(ancien) {
  const neuf = createDefaultState();
  if (ancien?.settings) neuf.settings = JSON.parse(JSON.stringify(ancien.settings));
  return neuf;
}
