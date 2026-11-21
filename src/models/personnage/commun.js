// Personnage joueur : squelette (os, parents, positions de repos), identifiants de contour, teintes et
// assemblage des pièces par os, en un seul maillage à liaison rigide (une pièce = un os). Le squelette,
// l'animation et les poses vivent dans entities/character/Character.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Builder } from '../../render/builder.js';
import { CHAR_IDS } from '../../core/globals.js';
import { GABARIT, versReel, versDessin } from './gabarit.js';

export { GABARIT, TETE_K, NAGE, versReel, versDessin } from './gabarit.js';
// centre du crâne, dans les positions de dessin des pièces (corps/, coupes/, tete.js) ; celui du squelette
// (corps réduit) est GABARIT.HC
export const HC = GABARIT.dessin.HC;
export const CREAM = '#f6ead2';
const JOINT_BLEND_RADIUS = 0.055;

export const B = { HIPS: 0, TORSO: 1, HEAD: 2, ARM_L: 3, FORE_L: 4, ARM_R: 5, FORE_R: 6, THIGH_L: 7, SHIN_L: 8, THIGH_R: 9, SHIN_R: 10, HAIR_A: 11, HAIR_B: 12, NECK: 13, HAND_L: 14, HAND_R: 15, FOOT_L: 16, FOOT_R: 17, SKIRT: 18, SCARF: 19, HAIR_C: 20, SCARF_B: 21, BAG: 22 };
// (SCARF et SCARF_B : les deux pans de l'écharpe ; BAG : le sac à dos, sur le torse)
export const PARENT = [-1, 0, B.NECK, 1, 3, 1, 5, 0, 7, 0, 9, 2, 2, 1, B.FORE_L, B.FORE_R, B.SHIN_L, B.SHIN_R, B.HIPS, B.TORSO, B.HEAD, B.TORSO, B.TORSO];
// positions de repos absolues du squelette (repère du personnage, pieds en 0 ; corps réduit du gabarit,
// gabarit.js) ; copie modifiable : la coupe pose les os des cheveux (Character.setAvatar, versReel)
export const REST = GABARIT.REST.map((p) => [...p]);

export const ID = CHAR_IDS;
// boîte arrondie économe (1 segment d'arrondi : ~100 triangles au lieu de ~600)
export const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 1, Math.min(r, Math.min(w, h, d) * 0.49));

export const tint = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
export const mixHex = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

// Pièces regroupées par os, puis fusionnées avec leurs poids de peau
export class Parts {
  constructor() {
    this.by = new Map();
  }

  // un Builder par (os, masse) : l'id de contour suit la masse
  on(bone, id = ID.body) {
    const key = `${bone}|${id}`;
    let b = this.by.get(key);
    if (!b) {
      b = new Builder(id);
      b.bone = bone;
      this.by.set(key, b);
    }
    return b;
  }

  build() {
    const geos = [];
    for (const builder of this.by.values()) {
      const bone = builder.bone;
      const g = builder.build();
      if (!g.attributes.position) continue;
      const n = g.attributes.position.count;
      const si = new Uint16Array(n * 4);
      const sw = new Float32Array(n * 4);
      // les pièces sont dessinées dans les positions de dessin : pivots des jointures dans ce repère
      const neighbors = [];
      if (PARENT[bone] >= 0) neighbors.push({ bone: PARENT[bone], pivot: versDessin(bone, REST[bone]) });
      for (let child = 0; child < PARENT.length; child++) {
        if (PARENT[child] === bone) neighbors.push({ bone: child, pivot: versDessin(child, REST[child]) });
      }
      const pos = g.attributes.position;
      for (let i = 0; i < n; i++) {
        si[i * 4] = bone;
        let neighborWeight = 0;
        let neighborBone = bone;
        let nearestSq = JOINT_BLEND_RADIUS * JOINT_BLEND_RADIUS;
        for (const neighbor of neighbors) {
          const dx = pos.getX(i) - neighbor.pivot[0];
          const dy = pos.getY(i) - neighbor.pivot[1];
          const dz = pos.getZ(i) - neighbor.pivot[2];
          const distanceSq = dx * dx + dy * dy + dz * dz;
          if (distanceSq < nearestSq) {
            nearestSq = distanceSq;
            neighborBone = neighbor.bone;
          }
        }
        if (neighborBone !== bone) {
          const blend = 1 - THREE.MathUtils.smoothstep(Math.sqrt(nearestSq), 0, JOINT_BLEND_RADIUS);
          neighborWeight = blend * 0.5;
          si[i * 4 + 1] = neighborBone;
        }
        sw[i * 4] = 1 - neighborWeight;
        sw[i * 4 + 1] = neighborWeight;
      }
      // puis portées aux positions du squelette (corps réduit, tête descendue avec le cou)
      if (GABARIT.corps !== 1) {
        for (let i = 0; i < n; i++) pos.setXYZ(i, ...versReel(bone, [pos.getX(i), pos.getY(i), pos.getZ(i)]));
        g.computeBoundingSphere();
      }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    return merged;
  }
}
