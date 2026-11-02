// Série de captures de rendu à caméra verrouillée (outil de développement, chargé à la main dans la
// console : `const S = await import('/scripts/rendu/serie.js'); await S.serie(__ile, 'avant')`).
// Les captures vont dans captures/<préfixe>-<lieu>-<heure>.png ; planche : scripts/rendu/planche.py.
import { ORIGIN } from '/src/core/globals.js';

// Coordonnées absolues : joueur posé, caméra, point visé
export const LIEUX = {
  depart: { joueur: [1, 4], cam: [1, 24.52, 34.53], vise: [1, -9.69, -14.76] },
  'grande-ile': { joueur: [-100, -400], cam: [-100, 31.07, -361.79], vise: [-100, 14.31, -419.4] },
  volcan: { joueur: [1000, -1250], cam: [987.66, 15.61, -1235.38], vise: [1026.36, 14.8, -1281.22] },
};
export const HEURES = [8, 12, 18.5, 23];

export async function serie(ile, prefixe, lieux = Object.keys(LIEUX), heures = HEURES) {
  const game = ile.game;
  game.skipSave = true;
  game.weather.mode = 'clear';
  game.ui.closePanel?.(true);
  const rig = game.rig;
  const update = rig.update;
  const cam = game.camera;
  const out = [];
  try {
    for (const l of lieux) {
      const L = LIEUX[l];
      ile.tp(L.joueur[0], L.joueur[1]);
      await ile.settle(4000);
      // caméra figée : ni la boucle de jeu ni la capture ne la bougent plus
      rig.mode = 'shot';
      rig.update = () => {};
      const pose = () => {
        cam.position.set(L.cam[0] - ORIGIN.x, L.cam[1] - ORIGIN.y, L.cam[2] - ORIGIN.z);
        cam.lookAt(L.vise[0] - ORIGIN.x, L.vise[1] - ORIGIN.y, L.vise[2] - ORIGIN.z);
        cam.updateMatrixWorld();
      };
      pose();
      await ile.settle(1500);
      for (const h of heures) {
        ile.setHour(h);
        pose();
        await ile.settle(700);
        pose();
        const n = `${prefixe}-${l}-${String(h).replace('.', 'h')}`;
        await ile.capture(n);
        out.push(n);
      }
      rig.update = update;
    }
  } finally {
    rig.update = update;
    game.world.dayCycle.override = null;
    ile.follow();
    game.applySettings();
  }
  return out;
}
