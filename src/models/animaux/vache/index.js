// Vache (ANI-003) : espèce de la faune des îles, refaite d'après sa planche (reference.png).
import * as THREE from 'three';
import { G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { blob, limb, surface, hull, patch } from '../../kit/formes.js';
import { eye, collar, legs } from '../../kit/accessoires.js';
import { part } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

// Vache (d'après la planche de référence) : corps en tonneau à dos droit et croupe carrée, croupe et
// épaules soudées d'où sortent des pattes lisses à onglons, cou court qui porte la tête au-dessus du
// garrot et plie pour brouter, crâne rond, large museau rose, oreilles en feuille, cornes relevées,
// collier bleu et cloche dorée, gros pis à quatre trayons, queue à houppe ; taches lobées teintées
// par la robe
function vache() {
  const CREAM = '#f5e9d6';
  const PINK = '#f0b4a8';
  const NECK = 0.62; // inclinaison du cou vers l'avant (rad)
  // enveloppe du corps : tonneau, plus croupe et épaules (même pièce, donc sans trait d'encre) qui
  // enveloppent le haut des pattes : celles-ci sortent du dessous, jamais du flanc
  const SHELL = [{ c: [0, 0.545, -0.035], rad: [0.25, 0.29, 0.465], n: 3 }];
  for (const sx of [-1, 1]) SHELL.push({ c: [sx * 0.11, 0.36, -0.3], rad: [0.11, 0.14, 0.16], n: 2.5 }, { c: [sx * 0.11, 0.36, 0.22], rad: [0.1, 0.13, 0.14], n: 2.5 });
  const [shell, ...masses] = SHELL.map((e) => surface(e.c, e.rad, e.n));
  const skin = nextId();
  const body = part((b) => {
    hull(b, CREAM, shell, 18, 13, { tint: 0 });
    for (const m of masses) hull(b, CREAM, m, 7, 5, { tint: 0 });
    // selle sur le dos (dessus et deux flancs) ; à droite (vue de profil de la planche) épaule, flanc,
    // croupe et cuisse ; à gauche, d'autres taches
    const spots = [
      [[0, 1, -0.05], [0.42, 0.62], 1], [[-1, 0.75, -0.05], [0.34, 0.32], 2], [[1, 0.7, 0.05], [0.36, 0.33], 3],
      [[-0.9, 0.2, 0.62], [0.26, 0.4], 4], [[-1, -0.45, 0.05], [0.3, 0.16], 5], [[-0.85, 0.45, -0.75], [0.25, 0.27], 6], [[-0.75, -0.7, -0.62], [0.17, 0.18], 7],
      [[1, -0.05, -0.1], [0.33, 0.28], 8], [[0.9, 0.3, 0.7], [0.21, 0.24], 9], [[0.8, 0.4, -0.8], [0.23, 0.25], 10],
    ];
    for (const [d, size, seed] of spots) patch(b, shell, d, size, seed);
    // gros pis rose, visible de dos entre les cuisses ; quatre trayons arrondis, un peu écartés
    blob(b, PINK, [0, 0.235, -0.16], [0.14, 0.095, 0.13], { tint: 0 }, 10, 8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) limb(b, '#e9a194', [[sx * 0.055, 0.172, -0.16 + sz * 0.055], [sx * 0.067, 0.105, -0.16 + sz * 0.065]], [0.02, 0.018], { sides: 6, rings: 1, end: 'round' });
  }, [0, 0, 0], 'none', 1, 0, skin);
  body.shell = SHELL;
  // cou : pivot au poitrail, il porte la tête (pièce suivante) ; collier et cloche sous la gorge
  const axis = new THREE.Vector3(0, Math.cos(NECK), Math.sin(NECK));
  const neck = part((b) => {
    blob(b, CREAM, axis.clone().multiplyScalar(0.246).toArray(), [0.155, 0.27, 0.155], { r: [NECK, 0, 0], tint: 0 }, 9, 8);
    collar(b, NECK, 0.36, 0.145, 0.026);
  }, [0, 0.5, 0.22], 'neck', 1, 0, skin);
  const crane = surface([0, 0.02, 0.02], [0.165, 0.16, 0.165]);
  const MC = [0, -0.08, 0.19];
  const MR = [0.125, 0.085, 0.09];
  const head = part((b) => {
    hull(b, CREAM, crane, 12, 9, { tint: 0 });
    blob(b, PINK, MC, MR, { tint: 0 }, 12, 9);
    patch(b, crane, [0.62, 0.35, 0.65], [0.38, 0.36], 12); // tache autour de l'œil gauche, jusqu'à l'oreille
    for (const sx of [-1, 1]) {
      // naseau ovale posé selon la normale du museau, penché vers l'extérieur et le haut, creux sombre
      const p = new THREE.Vector3(sx * 0.05, -0.07, 0);
      p.z = MC[2] + MR[2] * Math.sqrt(1 - ((p.x - MC[0]) / MR[0]) ** 2 - ((p.y - MC[1]) / MR[1]) ** 2);
      const nrm = new THREE.Vector3((p.x - MC[0]) / MR[0] ** 2, (p.y - MC[1]) / MR[1] ** 2, (p.z - MC[2]) / MR[2] ** 2).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(nrm, -sx * 0.35).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm));
      const e = new THREE.Euler().setFromQuaternion(q);
      b.add(G.sphere(1, 8, 4), '#b06866', { p: p.clone().addScaledVector(nrm, -0.003).toArray(), s: [0.022, 0.03, 0.01], r: [e.x, e.y, e.z], tint: 0 });
      b.add(G.sphere(1, 6, 3), '#7e4646', { p: p.clone().addScaledVector(nrm, 0.0035).toArray(), s: [0.012, 0.019, 0.006], r: [e.x, e.y, e.z], tint: 0 });
      eye(b, sx * 0.1, 0.05, 0.14, 0.03, null, true);
      // oreille en feuille, à plat vers l'avant, intérieur rose ; la gauche prend la tache
      const eo = new THREE.Euler(0, sx * 0.3, -sx * 0.15);
      const at = (o) => new THREE.Vector3(...o).applyEuler(eo).add(new THREE.Vector3(sx * 0.215, 0.05, -0.05)).toArray();
      blob(b, sx > 0 ? '#ffffff' : CREAM, at([0, 0, 0]), [0.1, 0.055, 0.028], { r: [eo.x, eo.y, eo.z], tint: sx > 0 ? 1 : 0 }, 8, 6);
      blob(b, '#eea69d', at([sx * 0.012, 0, 0.02]), [0.07, 0.035, 0.012], { r: [eo.x, eo.y, eo.z], tint: 0 }, 6, 3);
      // corne : vers l'extérieur, puis le haut, puis un peu vers l'intérieur ; pointe arrondie
      limb(b, '#ecdcb4', [[sx * 0.06, 0.1, -0.03], [sx * 0.11, 0.165, -0.03], [sx * 0.155, 0.225, -0.035], [sx * 0.15, 0.285, -0.05]], [0.034, 0.028, 0.019, 0.01], { sides: 7, rings: 4, end: 'round' });
    }
  }, axis.clone().multiplyScalar(0.43).toArray(), 'head');
  head.parent = 1;
  // queue : racine enfoncée dans la croupe, courbe douce en S, houppe en pinceau (couleur des taches)
  const tail = part((b) => {
    limb(b, CREAM, [[0, 0.01, 0.03], [0, -0.01, -0.04], [0, -0.12, -0.1], [0, -0.26, -0.095], [0, -0.37, -0.06]], [0.03, 0.028, 0.025, 0.022, 0.02], { sides: 6, rings: 5, end: 'round' });
    blob(b, '#ffffff', [0, -0.42, -0.06], [0.032, 0.07, 0.032], {}, 5, 4);
    for (const sx of [-1, 1]) blob(b, '#ffffff', [sx * 0.022, -0.415, -0.06], [0.026, 0.06, 0.026], { r: [0, 0, sx * 0.35] }, 5, 4);
  }, [0, 0.7, -0.45], 'tail');
  return [body, neck, head, ...legs({ x: 0.11, zf: 0.22, zb: -0.3, hip: 0.5, color: CREAM, hoof: '#3b3537', hoofH: 0.055, cloven: true, hoofRound: true, radii: [0.07, 0.064, 0.056, 0.045],
    front: [[0, 0, 0], [0, -0.25, 0.012], [0, -0.4, 0], [0, -0.4725, 0]], back: [[0, 0, 0], [0, -0.22, -0.05], [0, -0.4, 0], [0, -0.4725, 0]] }), tail];
}

export const espece = {
  speed: 0.45, scale: 1.4, shadow: true, graze: 1.45, nod: -0.6, muzzle: [0, -0.14, 0.22], top: 1.15,
  coats: [['Pie brune', '#8a5a3c'], ['Pie noire', '#3b3340'], ['Pie rouge', '#b8643c']],
  parts: () => vache(),
};

export default fiche('ANI-003', 'vache', 'Vache', species('vache', espece), { budget: { triangles: 3500 } });
