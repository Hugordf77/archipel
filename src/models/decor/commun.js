// Décor achetable à l'échoppe (prix en coquillages) : maillage peint d'un article, halo lumineux, et fiche
// du registre (chaque article a son build() → Object3D, animé au besoin par userData.anim(dt, t)).
import * as THREE from 'three';
import { toonMaterial, glowMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW } from '../../core/globals.js';
import { fiche } from '../kit/fiches.js';

export function mesh(b, opts = {}) {
  const m = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, aId: true, ...opts }));
  m.layers.enable(LAYER_SHADOW);
  return m;
}

export function halo(y, size = 1.3, color = 0xffc27a) {
  const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(color, size));
  h.position.y = y;
  h.renderOrder = 10;
  h.userData.halo = true;
  return h;
}

// fiche d'un article : construit comme à l'échoppe, animé s'il l'est
export function decor(k, a) {
  return {
    ref: `decor:${k}`, usedIn: ['échoppe de l\'île de départ'],
    build() {
      const o = a.build();
      return { object3d: o, anim: o.userData.anim ? (dt, t) => o.userData.anim(dt, t) : undefined };
    },
  };
}
export const article = (id, k, a) => fiche(id, `decor-${k}`, a.name, decor(k, a), { tags: [a.station ? 'atelier' : 'décor', `${a.price} coquillages`] });
