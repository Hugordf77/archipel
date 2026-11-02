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

// Cadrages tournés vers le ciel (joueur sur Ton île) : ouest au coucher (îlot de la Grotte en silhouette),
// est au lever (mer ouverte), zénith la nuit (voûte, cimes en bas du cadre), horizon marin avec Ton île en
// silhouette (vue depuis la mer au sud-est)
export const LIEUX_CIEL = {
  'ouest-coucher': { joueur: [1, 4], cam: [-28, 4.5, 8], vise: [-528, 92, 78] },
  'est-lever': { joueur: [1, 4], cam: [28, 4.5, 4], vise: [528, 92, 34] },
  'zenith-nuit': { joueur: [1, 4], cam: [-10, 4, -6], vise: [-10, 218, -106] },
  'horizon-marin': { joueur: [1, 4], cam: [90, 3.5, 110], vise: [0, 16, 0] },
};
export const HEURES_CIEL = [5.5, 6.75, 18.25, 19.5, 20.5, 23, 2];

// série des cadrages du ciel ; nuages figés (même dérive à chaque capture) pour comparer avant / après
export function ciel(ile, prefixe, lieux = Object.keys(LIEUX_CIEL), heures = HEURES_CIEL) {
  return serie(ile, prefixe, lieux, heures, LIEUX_CIEL);
}

export async function serie(ile, prefixe, lieux = Object.keys(LIEUX), heures = HEURES, table = LIEUX) {
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
      const L = table[l];
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
        if (table === LIEUX_CIEL && ile.U.uCloudRot) ile.U.uCloudRot.value = 0;
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
