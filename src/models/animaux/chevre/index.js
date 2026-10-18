// Chèvre (ANI-002) : espèce de la faune des îles (ongulé dessiné à la main).
import { G } from '../../../render/builder.js';
import { bone, blob } from '../../kit/formes.js';
import { eye, legs } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

// Chèvre : dos droit, cornes recourbées vers l'arrière, barbichette, oreilles tombantes
function chevre() {
  const HORN = '#9c8a74';
  const body = part((b) => {
    b.add(G.box(0.5, 0.34, 0.78, 0.12, 1), '#ffffff', { p: [0, 0.63, -0.02] });
    blob(b, '#ffffff', [0, 0.6, 0.3], [0.21, 0.17, 0.16], {}, 7, 5);
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.16, 0.2], 0.1, 0.075);
    blob(b, '#ffffff', [0, 0.18, 0.33], [0.11, 0.12, 0.16], { r: [0.3, 0, 0] });
    blob(b, '#f1ebe3', [0, 0.11, 0.47], [0.075, 0.07, 0.09], {}, 7, 5);
    b.add(G.cone(0.035, 0.12, 6), '#ece6dd', { p: [0, 0.0, 0.44], r: [Math.PI + 0.25, 0, 0] }); // barbichette
    for (const sx of [-1, 1]) {
      const h = [[sx * 0.045, 0.28, 0.32], [sx * 0.06, 0.39, 0.27], [sx * 0.075, 0.45, 0.17], [sx * 0.08, 0.43, 0.08]];
      for (let i = 0; i < 3; i++) bone(b, HORN, h[i], h[i + 1], 0.026 - i * 0.006, 0.02 - i * 0.006, 6, 0);
      blob(b, '#ffffff', [sx * 0.2, 0.18, 0.29], [0.14, 0.035, 0.05], { r: [0, 0, sx * -0.6] }, 6, 4);
      eye(b, sx * 0.075, 0.22, 0.42, 0.028);
    }
  }, [0, 0.6, 0.3], 'head');
  const tail = part((b) => b.add(G.cone(0.04, 0.13, 6), '#ffffff', { p: [0, 0.05, -0.02], r: [-0.5, 0, 0] }), [0, 0.76, -0.41], 'tail');
  return [body, head, ...legs({ x: 0.14, zf: 0.27, zb: -0.28, hip: 0.52, color: '#e9e2d8', tint: 1, r0: 0.042, r1: 0.034, hoof: '#4a3f3a',
    front: [[0, 0, 0], [0, -0.25, 0.02], [0, -0.46, 0]], back: [[0, 0, 0], [0, -0.22, -0.06], [0, -0.46, 0]] }), tail];
}

export const espece = {
  speed: 0.9, scale: 0.9, shadow: true, graze: 1.2, muzzle: [0, 0.1, 0.56], top: 1.2,
  coats: [['Crème', '#f3ead9'], ['Alpine brune', '#a9784f'], ['Noire', '#544a4e']],
  parts: () => chevre(),
};

export default fiche('ANI-002', 'chevre', 'Chèvre', species('chevre', espece), { budget: { triangles: 1500 } });
