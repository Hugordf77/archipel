// CHÂTEAU DU SOMMET (MON-015), repère central du monde ouvert (demande de l'utilisateur, 24/11/2026 : « qu'il
// soit le point central de l'open world, visible de la montagne »). Les lieux des îles ne sont dessinés qu'à
// moins de 600 m (LOD1, IslandManager) : le château est donc dessiné ici, en permanence, au sommet du
// Sommet givré ; la pose de l'île (archipel.js, v: 1) ne garde que l'aplanissement, les obstacles et les
// planchers. Le modèle est celui du registre (models/monuments/chateau-sommet), matériau des lieux.
import * as THREE from 'three';
import { ORIGIN, LAYER_SHADOW, nextId } from '../../core/globals.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { MAT } from '../../models/kit/materials.js';
import { chateauFondations } from '../../models/monuments/chateau-sommet/index.js';
import { rotY } from '../../models/lieux.js';

// position absolue du centre de la plate-forme (île Grande Île en (−4, −1164) + pose (−260, −688)), hauteur
// de la plate-forme aplanie relevée en jeu le 24/11/2026 (en attendant le plan de l'île, qui la donne
// exactement : update), orientation de la pose
export const CHATEAU = { x: -264, z: -1852, y: 193.09, rot: 1.21 };

export class Chateau {
  constructor(scene) {
    const m = chateauFondations({});
    const geo = m.solid.build();
    const mat = toonMaterial({ ...MAT.solid, id: nextId() });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'chateau-sommet';
    this.mesh.rotation.y = rotY('chateau_fondations', CHATEAU.rot);
    this.mesh.layers.enable(LAYER_SHADOW);
    scene.add(this.mesh);
    this.update();
  }

  // suit l'origine flottante (le monde est décalé pour garder des coordonnées locales petites) ; dès que
  // le plan de la section qui porte la pose est chargé, prend la hauteur exacte de la plate-forme
  update(islands) {
    if (!this.cale && islands) {
      for (const e of islands.entries.values()) {
        const poi = e.plan?.pois?.find((p) => p.type === 'chateau_fondations');
        if (poi) {
          this.y = poi.y;
          this.cale = true;
          break;
        }
      }
    }
    this.mesh.position.set(CHATEAU.x - ORIGIN.x, (this.y ?? CHATEAU.y) - ORIGIN.y, CHATEAU.z - ORIGIN.z);
  }
}
