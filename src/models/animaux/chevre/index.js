// Chèvre (ANI-002) : espèce de la faune des îles (ongulé dessiné à la main).
import { G } from '../../../render/builder.js';
import { bone, blob, limb } from '../../kit/formes.js';
import { eye, legs } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

// Chèvre : dos droit, cornes recourbées vers l'arrière, barbichette, oreilles tombantes
function chevre() {
  const HORN = '#9c8a74';
  const body = part((b) => {
    b.add(G.box(0.54, 0.58, 0.88, 0.16, 1), '#ffffff', { p: [0, 0.51, -0.02] });
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.16, 0.2], 0.1, 0.075);
    blob(b, '#ffffff', [0, 0.18, 0.33], [0.11, 0.12, 0.16], { r: [0.3, 0, 0] });
    blob(b, '#f1ebe3', [0, 0.11, 0.47], [0.075, 0.07, 0.09], {}, 7, 5);
    limb(b, '#ece6dd', [[0, 0.06, 0.46], [0, 0.015, 0.48], [0, -0.045, 0.5]], [0.032, 0.024, 0.003], { sides: 8, rings: 4, end: 'round' }); // barbichette
    for (const sx of [-1, 1]) {
      limb(b, HORN, [[sx * 0.055, 0.28, 0.32], [sx * 0.085, 0.39, 0.27], [sx * 0.12, 0.45, 0.17], [sx * 0.15, 0.43, 0.08]], [0.029, 0.022, 0.014, 0.004], { sides: 8, rings: 4, end: 'round' });
      blob(b, '#ffffff', [sx * 0.2, 0.18, 0.29], [0.14, 0.035, 0.05], { r: [0, 0, sx * -0.6] }, 10, 7);
      eye(b, sx * 0.075, 0.22, 0.42, 0.028);
    }
  }, [0, 0.6, 0.3], 'head');
  const tail = part((b) => limb(b, '#ffffff', [[0, 0.025, 0.015], [0, 0.005, -0.035], [0, -0.075, -0.085]], [0.038, 0.028, 0.008], { sides: 8, rings: 6, end: 'round' }), [0, 0.62, -0.39], 'tail');
  return [body, head, ...legs({ x: 0.14, zf: 0.27, zb: -0.28, hip: 0.52, color: '#e9e2d8', tint: 1, r0: 0.042, r1: 0.034, hoof: '#4a3f3a',
    front: [[0, 0, 0], [0, -0.25, 0.02], [0, -0.46, 0]], back: [[0, 0, 0], [0, -0.22, -0.06], [0, -0.46, 0]] }), tail];
}

export const espece = {
  speed: 0.9, scale: 0.9, shadow: true, graze: 1.2, muzzle: [0, 0.1, 0.56], top: 1.2,
  coats: [['Crème', '#f3ead9'], ['Alpine brune', '#a9784f'], ['Noire', '#544a4e']],
  parts: () => chevre(),
};

export default fiche('ANI-002', 'chevre', 'Chèvre', species('chevre', espece), { budget: { triangles: 1500 } });
