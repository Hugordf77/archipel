// Dirigeables (NAV-012) qui croisent très haut au-dessus de l'archipel, vers 400 m (décor : ni plancher ni
// obstacle). Créés et mis à jour par IslandManager, comme le navire volant. Chacun suit une grande ellipse
// à vitesse constante, nez dans le sens de la marche, en se balançant doucement. Deux versions : de près
// (v 0) en deçà de PRES, allégée (v 1) au-delà, cachée au-delà de LOIN (plan lointain de la caméra) ; la
// version de près n'est assemblée qu'à l'approche.
import * as THREE from 'three';
import { partModel } from '../../models/lieux.js';

const PRES = 500;
const LOIN = 4400;

// trajets : centre et demi-axes de l'ellipse (m), altitude (m), durée d'un tour (s, négative : sens
// inverse), phase de départ (fraction du tour), forme du modèle
export const DIRIGEABLES = [
  { centre: [0, -800], rx: 2100, rz: 1300, y: 410, tour: 720, phase: 0, forme: 0 },
  { centre: [300, -1050], rx: 1500, rz: 950, y: 455, tour: -560, phase: 0.45, forme: 1 },
];

// position, cap et assiette au temps t (s)
export function cap(t, D) {
  const a = 2 * Math.PI * (t / D.tour + D.phase);
  const s = Math.sign(D.tour);
  const x = D.centre[0] + D.rx * Math.cos(a);
  const z = D.centre[1] + D.rz * Math.sin(a);
  // vitesse (dérivée de l'ellipse) : le nez la suit
  const vx = -D.rx * Math.sin(a) * s;
  const vz = D.rz * Math.cos(a) * s;
  return { x, z, y: D.y + 2.5 * Math.sin(t / 7 + D.phase * 9), rot: Math.atan2(vx, vz), tangage: 0.02 * Math.sin(t / 5), roulis: 0.03 * Math.sin(t / 6.3) };
}

export class Dirigeables {
  constructor({ root, material }) {
    this.mat = material;
    this.t = 0;
    this.liste = DIRIGEABLES.map((D) => {
      const g = new THREE.Group();
      g.name = 'dirigeable';
      g.visible = false;
      root.add(g);
      const d = { D, g, lods: [null, null], anims: [] };
      d.lods[1] = this.version(d, 1);
      return d;
    });
  }

  version(d, v) {
    const m = partModel({ t: 'dirigeable', forme: d.D.forme, v, x: 0, z: 0, y: 0, rot: 0 });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(m.solid.build(), this.mat));
    for (const a of m.anim) {
      const holder = new THREE.Group();
      holder.position.set(...a.pivot);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(a.builder.build(), this.mat));
      holder.add(spin);
      g.add(holder);
      d.anims.push({ obj: spin, axis: a.axis, speed: a.speed });
    }
    g.visible = false;
    d.g.add(g);
    return g;
  }

  // dt (s), position du joueur (monde)
  update(dt, px, pz, py = 0) {
    this.t += dt;
    for (const d of this.liste) {
      const s = cap(this.t, d.D);
      const dist = Math.hypot(px - s.x, pz - s.z, py - s.y);
      d.g.visible = dist < LOIN;
      if (!d.g.visible) continue;
      if (!d.lods[0] && dist < PRES + 400) d.lods[0] = this.version(d, 0);
      const pres = dist < PRES && !!d.lods[0];
      d.lods[1].visible = !pres;
      if (d.lods[0]) d.lods[0].visible = pres;
      d.g.position.set(s.x, s.y, s.z);
      d.g.rotation.set(s.tangage, s.rot, s.roulis, 'YXZ');
      for (const a of d.anims) a.obj.rotation[a.axis] += dt * a.speed;
    }
  }
}
