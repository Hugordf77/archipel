// Écharpe en vrai tissu (personnage aventurier) : les deux pans, autrefois des plaques rigides sur des os à
// ressort (cheveux.js, PAN), deviennent des rubans simulés (tissu.js) : épinglés au nœud, ils tombent sous
// leur poids, se plient, battent et claquent au vent, traînent à la course, glissent sur le dos, l'épaule
// et le sac. Forme de repos : celle des pans dessinés (models/personnage/corps/index.js, PANS), portée au
// squelette ; les pans rigides du maillage sont repliés dans le nœud (os SCARF et SCARF_B à l'échelle nulle).
import * as THREE from 'three';
import { toonMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW } from '../../core/globals.js';
import { creerRuban, pasTissu } from './tissu.js';
import { FACE } from './face.js';
import { CLOTH_COLORS } from './avatar.js';
import { B, ID, HC, GABARIT, versReel, tint, VOLUMES } from '../../models/personnage/index.js';

const LIGNES = 9; // le long du pan (la première est épinglée dans le nœud)
const COLONNES = 3; // en travers : les bords et le milieu (le pan peut se creuser et se plier en long)

// Forme de repos d'un pan (repère de dessin), même construction que panFlottant : du pivot vers dir sur L,
// un peu bombé et vrillé, de plus en plus large ; bout en deux pointes (les bords dépassent, le milieu
// recule : l'encoche)
function reposPan(pivot, { dir, L, w, pointes, vrille }) {
  const d = new THREE.Vector3(...dir).normalize();
  const nr0 = new THREE.Vector3(0, 0, -1).addScaledVector(d, d.z).normalize();
  const P0 = new THREE.Vector3(...pivot);
  const out = [];
  for (let i = 0; i < LIGNES; i++) {
    const t = i / (LIGNES - 1);
    const nr = nr0.clone().applyAxisAngle(d, vrille * t);
    const wv = new THREE.Vector3().crossVectors(d, nr).normalize();
    const c = P0.clone().addScaledVector(d, L * t).addScaledVector(nr, 0.012 * Math.sin(Math.PI * t)).addScaledVector(wv, 0.012 * t * t);
    const W = w * (0.35 + 0.65 * Math.sqrt(t));
    for (let k = 0; k < COLONNES; k++) {
      const s = k - 1;
      const p = c.clone().addScaledVector(wv, s * W);
      if (i === LIGNES - 1) p.addScaledVector(d, s === 0 ? -0.006 : pointes[s < 0 ? 0 : 1]);
      out.push(p.x, p.y, p.z);
    }
  }
  return out;
}

const _v = new THREE.Vector3();

export class EcharpeTissu {
  // ch : le personnage (mesh, bones, root) ; av : son apparence (couleur de l'accessoire, sac)
  constructor(ch, av) {
    this.ch = ch;
    this.sac = av.back === 'sac';
    const R = GABARIT.dessin.REST;
    const ac = CLOTH_COLORS[av.accessoryColor];
    const { PANS, SAC } = VOLUMES;
    this.pans = PANS.map((pan, i) => {
      const repos = reposPan(R[pan.os], pan);
      for (let j = 0; j < repos.length; j += 3) {
        const r = versReel(pan.os, [repos[j], repos[j + 1], repos[j + 2]]);
        repos[j] = r[0];
        repos[j + 1] = r[1];
        repos[j + 2] = r[2];
      }
      const ruban = creerRuban(repos, LIGNES, COLONNES);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ruban.n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(ruban.n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const idx = [];
      for (let l = 0; l < LIGNES - 1; l++) {
        for (let c = 0; c < COLONNES - 1; c++) {
          const a = l * COLONNES + c;
          idx.push(a, a + COLONNES, a + 1, a + 1, a + COLONNES, a + COLONNES + 1);
        }
      }
      geo.setIndex(idx);
      // mêmes ids d'encre que les pans dessinés (corps/index.js, ENC.pan), lumière et netteté du joueur
      const mat = toonMaterial({ color: i ? tint(ac, 0.93) : ac, id: i ? ID.body : ID.head, outline: 0.5, rim: 1.25, pigment: 0.35, character: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `echarpe-pan-${i}`;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      mesh.layers.enable(LAYER_SHADOW);
      return { os: pan.os, ruban, mesh };
    });
    // sphères du corps (repère de dessin, par os) : torse en trois boules, épaules, tête ; sac s'il est porté
    const S = (os, p, r) => ({ os, c: versReel(os, p), r: r * (os === B.HEAD ? 1 : GABARIT.corps) });
    this.spheres = [
      S(B.TORSO, [0, 0.82, 0], 0.16),
      S(B.TORSO, [0, 0.92, 0], 0.16),
      S(B.TORSO, [0, 1.0, 0], 0.14),
      S(B.TORSO, [0.17, 1.03, 0], 0.075),
      S(B.TORSO, [-0.17, 1.03, 0], 0.075),
      S(B.HEAD, [0, HC, 0], FACE.R * 1.08),
    ];
    if (this.sac) {
      this.spheres.push(S(B.BAG, [0.06, SAC.c[1], SAC.c[2]], 0.095), S(B.BAG, [-0.06, SAC.c[1], SAC.c[2]], 0.095), S(B.BAG, [0, SAC.c[1] + 0.07, SAC.c[2] + 0.01], 0.085));
    }
    this._mats = new Map();
    this._sph = this.spheres.map(() => [0, 0, 0, 0]);
  }

  // repère de liaison → monde pour un os (le calcul de l'habillage, fait ici sur le processeur)
  matrice(os) {
    const mesh = this.ch.mesh;
    const sk = mesh.skeleton;
    let m = this._mats.get(os);
    if (!m) this._mats.set(os, (m = new THREE.Matrix4()));
    return m.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse).multiply(sk.bones[os].matrixWorld).multiply(sk.boneInverses[os]).multiply(mesh.bindMatrix);
  }

  // dt (s), temps (s), vent du monde [x, y, z] (m/s)
  update(dt, temps, vent) {
    const ch = this.ch;
    // les maillages vont dans la scène (repère du monde), au premier passage où le personnage y est ; hors
    // de toute scène (tests, catalogue avant affichage), le tissu avance quand même
    if (!this.pans[0].mesh.parent) {
      let top = ch.root;
      while (top.parent) top = top.parent;
      if (top !== ch.root) for (const p of this.pans) top.add(p.mesh);
    }
    // pans dessinés repliés dans le nœud (remplacés par les rubans)
    for (const p of this.pans) ch.bones[p.os].scale.setScalar(1e-4);
    ch.root.updateMatrixWorld(true);
    this.spheres.forEach((s, i) => {
      _v.fromArray(s.c).applyMatrix4(this.matrice(s.os));
      const o = this._sph[i];
      o[0] = _v.x;
      o[1] = _v.y;
      o[2] = _v.z;
      o[3] = s.r;
    });
    const M = this.matrice(B.TORSO).elements;
    for (const p of this.pans) {
      pasTissu(p.ruban, { M, vent, temps, spheres: this._sph, dt });
      const g = p.mesh.geometry;
      g.attributes.position.array.set(p.ruban.p);
      g.attributes.normal.array.set(p.ruban.nrm);
      g.attributes.position.needsUpdate = true;
      g.attributes.normal.needsUpdate = true;
    }
  }

  // retire les rubans et rend les pans dessinés
  dispose() {
    for (const p of this.pans) {
      p.mesh.parent?.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      this.ch.bones[p.os].scale.setScalar(1);
    }
  }
}
