// Cerf (ANI-004) : espèce de la faune des îles (ongulé dessiné à la main).
import { G } from '../../../render/builder.js';
import { bone, blob } from '../../kit/formes.js';
import { EYE, eye, legs } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

// Cerf : cou long dressé, museau allongé, bois ramifiés, croupe blanche, jarrets marqués
function cerf() {
  const BONE = '#ead7b4';
  const body = part((b) => {
    blob(b, '#ffffff', [0, 0.78, -0.02], [0.21, 0.2, 0.44]);
    blob(b, '#f3e6cf', [0, 0.69, 0], [0.17, 0.12, 0.34], { tint: 0 }, 7, 5); // ventre clair
    blob(b, '#fbf3e6', [0, 0.8, -0.43], [0.15, 0.15, 0.08], { tint: 0 }, 7, 5); // croupe blanche
  }, [0, 0, 0]);
  const head = part((b) => {
    bone(b, '#ffffff', [0, 0, 0], [0, 0.3, 0.32], 0.11, 0.07);
    blob(b, '#ffffff', [0, 0.36, 0.45], [0.1, 0.11, 0.15], { r: [0.25, 0, 0] });
    blob(b, '#efe6dc', [0, 0.31, 0.62], [0.065, 0.065, 0.11], {}, 7, 5);
    b.add(G.sphere(0.03, 6, 4), EYE, { p: [0, 0.31, 0.73], tint: 0 }); // truffe
    for (const sx of [-1, 1]) {
      blob(b, '#ffffff', [sx * 0.13, 0.46, 0.38], [0.1, 0.04, 0.05], { r: [0, 0, sx * 0.5] }, 6, 4);
      eye(b, sx * 0.08, 0.39, 0.53, 0.028);
      // bois : merrain à trois segments et quatre andouillers
      const m = [[sx * 0.05, 0.45, 0.42], [sx * 0.15, 0.6, 0.36], [sx * 0.21, 0.76, 0.27], [sx * 0.23, 0.9, 0.19]];
      for (let i = 0; i < 3; i++) bone(b, BONE, m[i], m[i + 1], 0.024 - i * 0.005, 0.019 - i * 0.005, 5, 0);
      for (const [a, c] of [[m[1], [sx * 0.17, 0.68, 0.5]], [m[2], [sx * 0.29, 0.86, 0.33]], [m[3], [sx * 0.18, 0.99, 0.15]], [m[3], [sx * 0.3, 0.97, 0.14]]]) bone(b, BONE, a, c, 0.014, 0.008, 5, 0);
    }
  }, [0, 0.8, 0.32], 'head');
  const tail = part((b) => b.add(G.sphere(1, 6, 4), '#ffffff', { p: [0, 0, -0.03], s: [0.05, 0.08, 0.04] }), [0, 0.86, -0.46], 'tail');
  return [body, head, ...legs({ x: 0.1, zf: 0.26, zb: -0.28, hip: 0.74, color: '#e3d8cd', tint: 1, r0: 0.046, r1: 0.03, hoof: '#3d3330', hoofH: 0.05, joint: 'back',
    front: [[0, 0, 0], [0, -0.38, 0.02], [0, -0.69, 0]], back: [[0, 0, 0], [0, -0.33, -0.1], [0, -0.69, -0.02]] }), tail];
}

export const espece = {
  speed: 1.4, scale: 1.2, shadow: true, shy: 7, graze: 1.2, muzzle: [0, 0.3, 0.74], top: 1.85,
  coats: [["Fauve d'été", '#c98f5f'], ["Brun d'hiver", '#8d6a52']],
  parts: () => cerf(),
};

export default fiche('ANI-004', 'cerf', 'Cerf', species('cerf', espece), { budget: { triangles: 1500 } });
