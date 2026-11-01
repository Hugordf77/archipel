// Le Navire-forteresse en vol autour du Plateau venté (décor : ni plancher ni obstacle ; données et
// trajectoire dans forteresse-navire.js). Créé et mis à jour par IslandManager. Deux versions : de près
// (v 0) en deçà de PRES, allégée (v 1) au-delà, cachée au-delà de LOIN ; chacune est assemblée un élément
// par image (un élément coûte jusqu'à quelques dizaines de ms), l'allégée dès que le joueur s'approche à
// moins de PREPARE.
import * as THREE from 'three';
import { partModel } from '../../models/lieux.js';
import { ILE_BY_ID } from '../islands/regions.js';
import { ELEMENTS, vol } from './forteresse-navire.js';

const PRES = 450;
const LOIN = 3200;
const PREPARE = 3600;

export class NavireVolant {
  constructor({ root, material }) {
    this.mat = material;
    this.t = 0;
    this.ile = ILE_BY_ID.get('grande-ile');
    // cap (rotation autour de Y) puis assiette (roulis, tangage) dans le repère du navire
    this.cap = new THREE.Group();
    this.cap.name = 'navire-volant';
    this.cap.visible = false;
    this.assiette = new THREE.Group();
    this.cap.add(this.assiette);
    root.add(this.cap);
    this.lods = [null, null];
    this.file = [];
    this.anims = [];
  }

  // une version (v) : groupe vide tout de suite, éléments ajoutés un par image (avancer)
  preparer(v) {
    const g = new THREE.Group();
    g.visible = false;
    this.assiette.add(g);
    this.lods[v] = { g, pret: false };
    ELEMENTS.forEach((e, k) => this.file.push({ v, e, dernier: k === ELEMENTS.length - 1 }));
  }

  avancer() {
    const job = this.file.shift();
    if (!job) return;
    const { v, e } = job;
    const m = partModel({ t: e.t, forme: e.forme, v, vol: e.vol, x: 0, z: 0, y: 0, rot: 0 });
    const el = new THREE.Group();
    el.position.set(e.dx, e.dy, e.dz);
    el.rotation.y = -e.rot;
    if (m?.solid?.parts.length) el.add(new THREE.Mesh(m.solid.build(), this.mat));
    // ailes de la tour-moulin
    for (const a of m?.anim || []) {
      const holder = new THREE.Group();
      holder.position.set(a.pivot[0], a.pivot[1], a.pivot[2]);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(a.builder.build(), this.mat));
      holder.add(spin);
      el.add(holder);
      this.anims.push({ obj: spin, axis: a.axis, speed: a.speed, wind: a.wind });
    }
    this.lods[v].g.add(el);
    if (job.dernier) this.lods[v].pret = true;
  }

  // dt (s), position du joueur (monde), force du vent (U.uWindStrength)
  update(dt, px, pz, wind) {
    this.t += dt;
    const s = vol(this.t);
    const [x, z] = [this.ile.x + s.x, this.ile.z + s.z];
    const d = Math.hypot(px - x, pz - z);
    if (!this.lods[1] && d < PREPARE) this.preparer(1);
    if (!this.lods[0] && this.lods[1]?.pret && d < PRES + 150) this.preparer(0);
    this.avancer();
    const [pres, loin] = this.lods;
    const proche = d < PRES && pres?.pret;
    if (pres) pres.g.visible = !!proche;
    if (loin) loin.g.visible = !proche && loin.pret;
    this.cap.visible = d < LOIN && !!(proche || loin?.pret);
    if (!this.cap.visible) return;
    this.cap.position.set(x, s.y, z);
    this.cap.rotation.y = Math.PI / 2 - s.rot;
    this.assiette.rotation.set(s.tangage, 0, s.roulis);
    for (const a of this.anims) a.obj.rotation[a.axis] += dt * a.speed * (a.wind ? 0.4 + wind * 0.7 : 1);
  }
}
