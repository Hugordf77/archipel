// Série de captures du personnage (chantier « personnage 2.0 ») : mêmes cadrages avant et après chaque
// étape, rangés dans captures/ (plugin /__capture du serveur de dev). Dans la console du jeu :
//   const S = await import('/scripts/rendu/personnage.js');
//   await S.serie(__ile, 'p2-avant');                 // tout
//   await S.serie(__ile, 'p2-avant', { jeu: false }); // vues et visage seulement
// puis : python3 scripts/rendu/planche_perso.py p2-avant [p2-apres]
// Le jeu est mis en pause pendant la série (le monde ne bouge plus, les expressions restent posées) ;
// sauvegarde verrouillée (skipSave) à chaque appel.
import { EXPRESSIONS as EXPR, cellUV } from '/src/entities/character/face.js';
import { GABARIT } from '/src/models/personnage/gabarit.js';

// lieu de pose : pré de la Grande Île, dégagé tout autour (l'île de départ a partout un poteau, une
// barrière ou un buisson dans le champ) ; [x, z, orientation]
export let POSE = [-100, -400, 0.4];
// vues fixes : [nom, angle de caméra autour du personnage (0 = de face)]
export const VUES = [['face', 0], ['dos', Math.PI], ['profil-g', Math.PI / 2], ['profil-d', -Math.PI / 2], ['34-avant', -0.7], ['34-arriere', Math.PI - 0.7]];
export const EXPRESSIONS = ['neutre', 'clignement', 'joie', 'surpris', 'endormi', 'pensif', 'determine', 'effort'];
// en jeu : distances de caméra (m) et inclinaison ; à 15 m, caméra basse : la silhouette se découpe
export const DISTANCES = [[3, 0.2], [8, 0.16], [15, 0.06]];
export const HEURES = [8, 12, 18.5, 23];
const nomH = (h) => String(h).replace('.', 'h');

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// place le joueur au repos, puis cadre la caméra (dist, pitch, yaw autour de lui) sur le point à la
// hauteur y au-dessus de ses pieds (le rig ajoute son lookOffset : on le retranche)
async function cadre(I, { dist, pitch, yaw, y, heure }) {
  const game = I.game;
  const P = game.player;
  const ch = game.character;
  game.world.dayCycle.override = heure;
  game.paused = false;
  P.place(POSE[0], POSE[1], POSE[2]);
  ch.setPose('idle');
  // pas de geste d'attente (étirement, tape du pied) pendant la série
  ch.fidget = null;
  ch.idleTime = 0;
  ch.nextFidget = 1e9;
  // regard figé vers l'avant (pas de flânerie tirée au hasard)
  ch.lookYaw = ch.lookTarget = 0;
  ch.lookTimer = 1e9;
  P.vel.set(0, 0, 0);
  for (let i = 0; i < 90; i++) ch.update(1 / 60, 0);
  P.sync();
  const r = game.rig;
  r.mode = 'shot';
  I.frame({ dist, pitch, yaw: P.facing + yaw, tx: P.pos.x, tz: P.pos.z });
  r.target.y = r.focus.y = P.pos.y + y - r.lookOffset.y;
  for (let i = 0; i < 40; i++) r.update(0.05);
  for (let i = 0; i < 6; i++) game.world.update(0.016, game.camera);
  game.paused = true;
  await attendre(150);
}

// pose une expression (yeux ouverts : pas de clignement pendant la capture)
function expression(ch, nom) {
  const [eye, mouth] = EXPR[nom];
  cellUV(eye, ch.faceMat.uniforms.uEyeCell.value);
  cellUV(mouth, ch.faceMat.uniforms.uMouthCell.value);
  ch.eyeCell = eye;
  ch.mouthCell = mouth;
}

export async function serie(I, prefixe, { vues = true, visage = true, jeu = true, heureVues = 12, pose = null } = {}) {
  if (pose) POSE = pose;
  const game = I.game;
  game.skipSave = true;
  // rejoint le lieu de pose (sections du monde chargées)
  if (Math.hypot(game.player.pos.x - POSE[0], game.player.pos.z - POSE[1]) > 30) {
    I.tp(POSE[0], POSE[1]);
    await I.settle(6000);
    game.skipSave = true;
  }
  game.ui.closePanel?.(true);
  const fichiers = [];
  const prise = async (nom) => {
    await I.capture(`${prefixe}-${nom}`);
    fichiers.push(`${prefixe}-${nom}`);
  };
  try {
    if (vues) {
      for (const [nom, yaw] of VUES) {
        await cadre(I, { dist: 3.9, pitch: 0.08, yaw, y: 0.84, heure: heureVues });
        expression(game.character, 'neutre');
        await prise(`vue-${nom}`);
      }
    }
    if (visage) {
      for (const nom of EXPRESSIONS) {
        // gros plan à hauteur des yeux (centre du crâne du gabarit)
        await cadre(I, { dist: 1.5, pitch: 0.06, yaw: -0.22, y: GABARIT.HC - 0.03, heure: heureVues });
        expression(game.character, nom);
        await prise(`visage-${nom}`);
      }
      // atlas peint (yeux en haut, bouches en bas)
      const url = game.character.atlas.canvas.toDataURL('image/png');
      await fetch(`/__capture?name=${encodeURIComponent(`${prefixe}-atlas`)}`, { method: 'POST', body: url });
      fichiers.push(`${prefixe}-atlas`);
    }
    if (jeu) {
      for (const h of HEURES) {
        for (const [d, pitch] of DISTANCES) {
          await cadre(I, { dist: d, pitch, yaw: -0.5, y: d > 10 ? 1.6 : 0.85, heure: h });
          await prise(`jeu-${d}m-${nomH(h)}`);
        }
      }
    }
  } finally {
    game.paused = false;
    game.rig.mode = 'follow';
    game.world.dayCycle.override = null;
    game.applySettings?.();
  }
  return fichiers;
}
