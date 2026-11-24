// Banc de captures déterministe (outil de développement, chargé dans la page du jeu) :
//   const B = await import('/scripts/rendu/banc/banc.js');
//   await B.serie(__ile, 'r2-avant');                       // tous les cadrages
//   await B.serie(__ile, 'r2-ab', { ab: ['ombres'] });       // + paires A/B (passe coupée | active)
// Sorties : captures/banc/<série>/<cadrage>.png, <cadrage>--<passe>-0.png | -1.png, manifeste.json
// (chargement, contrôle de rejet, coût GPU par poste). Métriques : scripts/rendu/banc/metriques.py.
// Garanties : taille d'image fixe (quelle que soit la fenêtre), qualité fixe, attente du chargement
// réel (îles, tuiles, herbe stables) au lieu d'un délai, origine du monde lue dans le jeu
// (__ile.U.uWorldOffset), temps, météo, vent et nuages figés, capture vide rejetée (mer seule, ciel
// seul, herbe absente, image plate). Les réglages du joueur sont rendus à la fin.
import { CADRAGES, viseeSoleil } from './cadrages.js';
import { budgetsDe, verifierBudgets } from './budgets.js';
// même instance que le jeu (même URL servie par Vite) : référence de hauteur des îles célestes
import { getGroundRef, setGroundRef } from '/src/world/navigation.js';

export const TAILLE = { largeur: 1600, hauteur: 900 };
export const QUALITE = 'high';
const TEMPS_FIGE = 120; // U.uTime figé (s) : vent de l'herbe, eau, particules, nuages

// --- préparation : taille et qualité fixes, résolution adaptative et redimensionnement coupés -------
export function preparer(ile, { largeur = TAILLE.largeur, hauteur = TAILLE.hauteur, qualite = QUALITE } = {}) {
  const game = ile.game;
  const P = game.pipeline;
  ile.passerTitre?.();
  game.skipSave = true;
  game.ui.closePanel?.(true);
  const avant = { qualite: P.settings.quality, adapt: P.adapt, resize: game.resize, settings: { ...P.settings } };
  P.adapt = () => {};
  game.resize = () => {};
  P.setQuality(qualite);
  P.dynScale = 1;
  // le pipeline multiplie la taille par son rapport de pixels : on lui donne la taille qui tombe juste
  const pr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, P.q.pixelRatio));
  P.setSize(largeur / pr + 1e-4, hauteur / pr + 1e-4);
  game.camera.aspect = largeur / hauteur;
  game.camera.updateProjectionMatrix();
  return () => {
    P.adapt = avant.adapt;
    game.resize = avant.resize;
    Object.assign(P.settings, avant.settings);
    P.setQuality(avant.qualite);
    game.resize();
  };
}

// --- gel : heure, météo, vent, nuages, horloge des shaders --------------------------------------
export function figer(ile, heure) {
  const game = ile.game;
  const U = ile.U;
  game.world.dayCycle.override = heure;
  if (game.weather.setMode) game.weather.setMode('clear');
  else game.weather.mode = 'clear';
  if (U.uWindStrength) U.uWindStrength.value = 1;
  if (U.uWindDir) U.uWindDir.value.set(0.8, 0.35).normalize();
  if (U.uCloudRot) U.uCloudRot.value = 0;
  U.uTime.value = TEMPS_FIGE;
}

// --- attente du chargement réel : îles posées, plus de travail en vol, tuiles et herbe stables ----
export async function attendreChargement(ile, { max = 30000, stable = 4, pas = 250 } = {}) {
  const game = ile.game;
  const t0 = performance.now();
  let prev = null;
  let n = 0;
  let info = null;
  while (performance.now() - t0 < max) {
    await ile.settle(pas);
    info = game.islands.info();
    const h = game.islands.herbe;
    const sig = JSON.stringify([info.shown, info.tiles, h.stats.cells, h.tiles.size]);
    const calme = info.inflight === 0 && !h.dirty;
    n = calme && sig === prev ? n + 1 : 0;
    prev = sig;
    if (n >= stable) return { ok: true, ms: Math.round(performance.now() - t0), info, herbe: { ...h.stats } };
  }
  return { ok: false, ms: Math.round(performance.now() - t0), info, herbe: { ...game.islands.herbe.stats }, raison: 'chargement non stabilisé' };
}

// --- pose : joueur et caméra figés ----------------------------------------------------------------
export function poser(ile, c) {
  const game = ile.game;
  const O = ile.U.uWorldOffset.value;
  const rig = game.rig;
  if (!rig.__updateBanc) rig.__updateBanc = rig.update;
  if (c.perso) {
    rig.update = rig.__updateBanc;
    return null;
  }
  rig.mode = 'shot';
  rig.update = () => {};
  const cam = game.camera;
  // hauteur absolue d'un point : telle quelle, ou comptée depuis le sol (sol: true)
  const abs = (p) => (c.sol ? [p[0], solAbs(ile, p[0], p[2]) + p[1], p[2]] : p);
  return () => {
    const pc = abs(c.cam);
    const vise = c.visee ? viseeSoleil(c, ile.U.uSunDir.value.toArray(), pc) : abs(c.vise);
    cam.position.set(pc[0] - O.x, pc[1] - O.y, pc[2] - O.z);
    cam.lookAt(vise[0] - O.x, vise[1] - O.y, vise[2] - O.z);
    cam.updateMatrixWorld();
  };
}

// hauteur du relief (coordonnées absolues) d'après la navigation du jeu, mesurée par en dessous : une
// île céleste au-dessus du point ne compte pas (sinon la caméra monte sur son dessus selon le moment)
// (la navigation et le joueur sont en coordonnées absolues ; seule la scène est décalée de l'origine)
function solAbs(ile, x, z) {
  const ref = getGroundRef();
  setGroundRef(-1e4);
  try {
    return ile.nav.groundAt(x, z).y;
  } finally {
    setGroundRef(ref);
  }
}

function relacher(ile) {
  const rig = ile.game.rig;
  if (rig.__updateBanc) rig.update = rig.__updateBanc;
  delete rig.__updateBanc;
  ile.follow();
}

// cadrage du personnage : même mise en place que __ile.shotPerso, sans capture
async function poserPerso(ile, c) {
  const game = ile.game;
  const P = game.player;
  const ch = game.character;
  const o = c.perso;
  if (P.mode === 'seated') P.stand();
  P.place(o.at[0], o.at[1], o.at[2]);
  ch.setPose('idle');
  P.vel.set(0, 0, 0);
  for (let i = 0; i < 90; i++) ch.update(1 / 60, 0);
  P.sync();
  const r = game.rig;
  r.mode = 'shot';
  ile.frame({ dist: o.dist, pitch: o.pitch, yaw: P.facing + o.yaw, tx: P.pos.x, tz: P.pos.z });
  r.target.y = r.focus.y = P.pos.y + o.ty;
  for (let i = 0; i < 40; i++) r.update(0.05);
}

// --- contrôle de rejet : G-buffer (identifiant d'objet) et luminance de l'image ------------------
// ciel, mer et rivières écrivent l'identifiant 0 ; l'herbe écrit l'identifiant du terrain (celui des
// îles ou celui de Ton île) avec un style de contour nul
export async function controler(ile, c, dataUrl) {
  const game = ile.game;
  const P = game.pipeline;
  const R = game.renderer;
  const W = P.W;
  const H = P.H;
  const buf = new Uint8Array(W * H * 4);
  // seconde cible du G-buffer (normales, identifiant, style) : readRenderTargetPixels de three r170 ne
  // lit que la première, d'où la lecture WebGL2 directe
  const gl = R.getContext();
  R.setRenderTarget(P.sceneRT);
  gl.readBuffer(gl.COLOR_ATTACHMENT1);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  R.setRenderTarget(null);
  const idsTerrain = [game.islands.terrainId, game.world.terrain?.userData?.terrainId]
    .filter((v) => typeof v === 'number').map((v) => Math.round(v * 255));
  let decor = 0;
  let herbe = 0;
  let n = 0;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const i = (y * W + x) * 4;
      n++;
      if (buf[i + 2] !== 0) decor++;
      if (buf[i + 3] === 0 && idsTerrain.some((id) => Math.abs(buf[i + 2] - id) <= 1)) herbe++;
    }
  }
  const ecart = await ecartLuminance(dataUrl);
  const parts = { decor: +(decor / n).toFixed(4), herbe: +(herbe / n).toFixed(4), ecart: +ecart.toFixed(4) };
  const raisons = [];
  const e = c.exige || {};
  // caméra sous le relief : l'image peut sembler pleine (dessous du terrain, ciel reflété)
  const O = ile.U.uWorldOffset.value;
  const cp = game.camera.position;
  const sol = solAbs(ile, cp.x + O.x, cp.z + O.z);
  if (cp.y + O.y < sol + 0.3) raisons.push(`caméra sous le sol (${(cp.y + O.y).toFixed(1)} m, sol à ${sol.toFixed(1)} m)`);
  if (parts.decor < (e.decor ?? 0)) raisons.push(`décor ${parts.decor} < ${e.decor} (mer ou ciel seuls ?)`);
  if (parts.herbe < (e.herbe ?? 0)) raisons.push(`herbe ${parts.herbe} < ${e.herbe} (herbe absente ?)`);
  if (parts.ecart < (e.ecart ?? 0)) raisons.push(`écart de luminance ${parts.ecart} < ${e.ecart} (image plate)`);
  return { ok: raisons.length === 0, parts, raisons };
}

async function ecartLuminance(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 90;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, 160, 90);
  const d = g.getImageData(0, 0, 160, 90).data;
  let s = 0;
  let s2 = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    s += l;
    s2 += l * l;
  }
  const m = s / n;
  return Math.sqrt(Math.max(0, s2 / n - m * m));
}

// --- rendu d'une image figée ------------------------------------------------------------------------
function rendre(ile, c, pose) {
  const game = ile.game;
  figer(ile, c.heure);
  if (pose) pose();
  else game.rig.update(0);
  game.world.update(0, game.camera);
  figer(ile, c.heure);
  if (pose) pose();
  game.particules?.update(game.pipeline, game.camera, game.pipeline.settings.particules ?? 1);
  game.pipeline.forceShadow = true;
  return game.pipeline.capture(game.world.scene, game.camera, game.overlayScene);
}

async function ecrire(chemin, corps) {
  const r = await fetch(`/__banc?chemin=${encodeURIComponent(chemin)}`, { method: 'POST', body: corps });
  if (!r.ok) throw new Error(`écriture refusée : ${chemin}`);
}

// --- un cadrage : pose, chargement, capture, contrôle, A/B, GPU ------------------------------------
export async function cadrage(ile, nom, { serie, ab = [], gpu = true, essais = 2 } = {}) {
  const c = CADRAGES[nom];
  if (!c) throw new Error(`cadrage inconnu : ${nom}`);
  const out = { nom, titre: c.titre, heure: c.heure, fichier: `${nom}.png` };
  for (let essai = 1; essai <= essais; essai++) {
    figer(ile, c.heure);
    // joueur posé par en dessous (référence de hauteur basse) : sur le relief, jamais sur une île céleste
    if (c.perso) ile.tp(c.perso.at[0], c.perso.at[1], -1e4);
    else ile.tp(c.joueur[0], c.joueur[1], -1e4);
    const pose = poser(ile, c);
    if (pose) pose();
    out.chargement = await attendreChargement(ile);
    if (c.perso) await poserPerso(ile, c);
    else pose();
    await ile.settle(300);
    const url = rendre(ile, c, pose);
    out.controle = await controler(ile, c, url);
    out.essai = essai;
    if (out.controle.ok && out.chargement.ok) {
      await ecrire(`${serie}/${nom}.png`, url);
      out.ab = [];
      for (const passe of ab) out.ab.push(await paireAB(ile, c, pose, passe, serie, nom));
      if (gpu) out.gpu = await mesurerGPU(ile, c, pose);
      break;
    }
    // capture rejetée gardée à part, pour le diagnostic
    if (essai === essais) await ecrire(`${serie}/${nom}--rejet.png`, url);
  }
  out.ok = !!(out.controle?.ok && out.chargement?.ok);
  if (!out.ok) out.rejet = [...(out.chargement?.ok ? [] : [out.chargement?.raison]), ...(out.controle?.raisons || [])];
  relacher(ile);
  return out;
}

// paire A/B d'une passe, même état, sans rechargement : -0 = coupée, -1 = valeur courante
export async function paireAB(ile, c, pose, passe, serie, nom) {
  const { PASSES } = await import('/src/render/Pipeline.js');
  const p = PASSES[passe];
  if (!p) throw new Error(`passe inconnue : ${passe} (Pipeline.PASSES)`);
  const S = ile.game.pipeline.settings;
  const garde = S[p.reglage];
  const fichiers = [];
  try {
    for (const [k, v] of [[0, p.coupe], [1, garde === p.coupe ? p.active : garde]]) {
      S[p.reglage] = v;
      const url = rendre(ile, c, pose);
      const f = `${nom}--${passe}-${k}.png`;
      await ecrire(`${serie}/${f}`, url);
      fichiers.push(f);
    }
  } finally {
    S[p.reglage] = garde;
  }
  return { passe, reglage: p.reglage, fichiers };
}

// coût GPU par poste (banc synchrone de scripts/rendu/gpu.js), vue et état figés ; trois passes, médiane
// par poste (l'horloge du GPU varie d'une seconde à l'autre), dispersion consignée
export async function mesurerGPU(ile, c, pose, n = 20, passes = 3) {
  const G = await import('/scripts/rendu/gpu.js');
  rendre(ile, c, pose);
  const runs = [];
  for (let i = 0; i < passes; i++) {
    runs.push(G.banc(ile, n));
    await new Promise((r) => setTimeout(r, 50));
  }
  const brut = {};
  const dispersion = {};
  for (const k of Object.keys(runs[0])) {
    const v = runs.map((x) => x[k]).sort((a, b) => a - b);
    brut[k] = v[Math.floor(v.length / 2)];
    dispersion[k] = +(v.at(-1) - v[0]).toFixed(2);
  }
  const postes = {
    gbuffer: brut.gbuffer,
    ombres: brut.ombreParImage,
    peinture: +((brut.tenseur || 0) + (brut.flou2 || 0) + (brut.kuwahara || 0)).toFixed(2),
    composition: brut.composition,
    particules: brut.calque ?? 0,
    image: brut.image,
  };
  const qualite = ile.game.pipeline.settings.quality;
  return { qualite, brut, dispersion, passes, postes, verdict: verifierBudgets(postes, budgetsDe(qualite)) };
}

// --- une série complète ----------------------------------------------------------------------------
export async function serie(ile, nomSerie, { cadrages = Object.keys(CADRAGES), ab = [], gpu = true, taille = TAILLE, qualite = QUALITE } = {}) {
  if (!/^[a-z0-9_-]+$/i.test(nomSerie)) throw new Error('nom de série : lettres, chiffres, - et _ seulement');
  const game = ile.game;
  const rendreReglages = preparer(ile, { ...taille, qualite });
  const W = game.pipeline.W;
  const H = game.pipeline.H;
  const debut = new Date().toISOString();
  const res = [];
  try {
    for (const nom of cadrages) res.push(await cadrage(ile, nom, { serie: nomSerie, ab, gpu }));
  } finally {
    game.world.dayCycle.override = null;
    relacher(ile);
    rendreReglages();
    game.applySettings();
  }
  const manifeste = {
    serie: nomSerie,
    debut,
    fin: new Date().toISOString(),
    taille: [W, H],
    qualite,
    tempsFige: TEMPS_FIGE,
    cadrages: Object.fromEntries(res.map((r) => [r.nom, r])),
    rejets: res.filter((r) => !r.ok).map((r) => ({ nom: r.nom, raisons: r.rejet })),
  };
  await ecrire(`${nomSerie}/manifeste.json`, JSON.stringify(manifeste, null, 2));
  return { serie: nomSerie, taille: [W, H], ok: manifeste.rejets.length === 0, rejets: manifeste.rejets, gpu: Object.fromEntries(res.map((r) => [r.nom, r.gpu?.postes])) };
}
