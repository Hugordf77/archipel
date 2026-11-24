// Fleurs : massif de quatre fleurs (PLA-014) et fleur des champs très légère (PLA-015, les champs en
// comptent des milliers) ; pétales teintés par instance, tiges et cœurs fixes.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { fiche, kind } from '../../kit/fiches.js';

function feuilleFacette(longueur, largeur, relief) {
  const g = new THREE.BufferGeometry();
  const racine = [0, 0, 0];
  const gauche = [longueur * 0.48, 0, largeur];
  const pointe = [longueur, -relief * 0.35, 0];
  const droite = [longueur * 0.48, 0, -largeur];
  const nervure = [longueur * 0.48, relief, 0];
  const sommets = [racine, gauche, nervure, gauche, pointe, nervure, pointe, droite, nervure, droite, racine, nervure].flat();
  g.setAttribute('position', new THREE.Float32BufferAttribute(sommets, 3));
  g.computeVertexNormals();
  return g;
}

export function fleurs() {
  return { flower: true };
}

export function fleurChamp() {
  return { fieldFlower: true };
}

// Touffe compacte et légère : trois fleurs à corolles pleines, feuilles basses ; les pétales
// gardent la teinte d'instance du biome pour former des nappes colorées dans les champs.
// Budget : 120 triangles par touffe (une tuile très fleurie en dessine plus de 6 000 ; plafond de
// 800 000 triangles de fleurs par tuile, tests/world.test.js) : tige ouverte à trois pans, une feuille
// par tige, quatre pétales et un cœur à 6 triangles.
export function fieldFlowerGeometry() {
  const b = new Builder();
  const petale = G.sphere(0.023, 3, 2);
  const feuille = feuilleFacette(0.075, 0.014, 0.006);
  const flowers = [
    { x: -0.036, z: 0.018, h: 0.275, size: 0.82, lean: [-0.08, 0.1] },
    { x: 0.036, z: 0.018, h: 0.315, size: 1, lean: [0.07, -0.1] },
    { x: 0, z: -0.044, h: 0.255, size: 0.78, lean: [-0.04, -0.08] },
  ];

  for (const [i, flower] of flowers.entries()) {
    const { x, z, h, size, lean } = flower;
    const stemH = h - 0.012;
    const stemX = x - Math.sin(lean[1]) * stemH * 0.5;
    const stemZ = z - Math.sin(lean[0]) * stemH * 0.5;
    // tige sans fonds (jamais vus) : 6 triangles
    b.add(new THREE.CylinderGeometry(0.007, 0.011, stemH, 3, 1, true), '#80b777', {
      p: [stemX, stemH / 2, stemZ], r: [lean[0], 0, lean[1]], tint: 0, sway: 0.68,
    });

    // Une feuille par tige, côté alterné d'une tige à l'autre : la base s'élargit sans masquer les corolles.
    for (const side of [i % 2 ? 1 : -1]) {
      const leafY = h * (side < 0 ? 0.4 : 0.57);
      const angle = (i * 1.9) + side * 0.95;
      const leafX = x + Math.cos(angle) * 0.028;
      const leafZ = z + Math.sin(angle) * 0.028;
      b.add(feuille, side < 0 ? '#8fc27d' : '#9dcc83', {
        p: [leafX, leafY, leafZ],
        r: [0.12 * side, angle, -0.42 * side],
        tint: 0, sway: 0.42,
      });
    }

    // Quatre pétales bombés gardent leur volume de profil et forment une corolle pleine.
    for (let petalIndex = 0; petalIndex < 4; petalIndex++) {
      const angle = (petalIndex / 4) * Math.PI * 2 + i * 0.28;
      const radius = 0.019 * size;
      b.add(petale, '#fff9ee', {
        p: [x + Math.cos(angle) * radius, h + 0.002, z + Math.sin(angle) * radius],
        r: [0.08, -angle, petalIndex % 2 ? 0.08 : -0.08],
        s: [1.45 * size, 0.72 * size, 1.05 * size], tint: 1, sway: 0.78,
      });
    }
    b.add(G.sphere(0.012 * size, 3, 2), '#f5c95f', {
      p: [x, h + 0.01, z], tint: 0, sway: 0.78,
    });
  }
  return b.build();
}

// trois fleurs sur tiges : pétales teintés par instance, tiges et cœurs fixes
export function flowerGeometry() {
  const b = new Builder();
  [[0, 0, 0.42], [0.22, 0.12, 0.32], [-0.16, 0.2, 0.36], [0.08, -0.22, 0.3]].forEach(([x, z, h]) => {
    b.add(G.cyl(0.016, 0.022, h, 5), '#7fbf86', { p: [x, h / 2, z], tint: 0, sway: 0.6 });
    b.add(G.sphere(0.06, 6, 4), '#86c98f', { p: [x + 0.05, h * 0.4, z], s: [1.4, 0.3, 0.7], tint: 0, sway: 0.4 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      b.add(G.sphere(0.075, 8, 5), '#ffffff', { p: [x + Math.cos(a) * 0.075, h, z + Math.sin(a) * 0.075], s: [1, 0.45, 1], sway: 0.6 });
    }
    b.add(G.sphere(0.045, 6, 5), '#f6d27a', { p: [x, h + 0.015, z], tint: 0, sway: 0.6 });
  });
  return b.build();
}

export default [
  fiche('PLA-014', 'massif-fleurs', 'Massif de fleurs', kind('fleurs'), { params: { fleur: 'color' }, tags: ['teinté par instance'] }),
  fiche('PLA-015', 'fleur-des-champs', 'Fleur des champs', kind('fleur_champ'), { params: { fleur: 'color' }, tags: ['teinté par instance'] }),
];
