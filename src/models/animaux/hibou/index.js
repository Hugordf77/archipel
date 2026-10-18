// Hibou cartographe : corps, tête à lunettes, yeux, ailes articulées à l'épaule.
// Renvoie les groupes animés (le jeu les fait cligner, hocher et battre des ailes).
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { toonMaterial } from '../../../render/shaders/materials.js';
import { nextId, LAYER_SHADOW } from '../../../core/globals.js';
import { fiche, ILE_DEPART } from '../../kit/fiches.js';

export function buildHibou(id = nextId()) {
  const mat = toonMaterial({ vertexColors: true, id: id, rim: 1.1, pigment: 0.7 });
  const eyeMat = toonMaterial({ color: '#3d3049', id: id, rim: 0, pigment: 0 });
  const shine = toonMaterial({ color: 0xffffff, emissive: 0xffffff, id: id, rim: 0, pigment: 0 });

  const root = new THREE.Group();
  root.name = 'hibou';
  const body = new THREE.Group();
  root.add(body);

  const brown = '#c49a77';
  const dark = '#a77d5c';
  const cream = '#f8e8cc';
  const b = new Builder(id);
  b.add(G.sphere(0.3, 20, 16), brown, { p: [0, 0.3, 0], s: [1, 1.08, 0.95] });
  b.add(G.sphere(0.22, 18, 14), cream, { p: [0, 0.27, 0.13], s: [0.95, 1.05, 0.55] });
  // plumes en écailles sur le ventre
  for (let r = 0; r < 3; r++) {
    for (let c = -1; c <= 1; c++) {
      if (r === 2 && c !== 0) continue;
      b.add(G.sphere(0.035, 8, 6), '#e6c9a2', { p: [c * 0.08 + (r % 2) * 0.04, 0.34 - r * 0.08, 0.245 - Math.abs(c) * 0.025], s: [1, 0.6, 0.4] });
    }
  }
  // pattes
  for (const sx of [-1, 1]) b.add(G.sphere(0.055, 10, 8), '#f3b36e', { p: [sx * 0.09, 0.02, 0.07], s: [1.2, 0.5, 1.4] });
  const torso = new THREE.Mesh(b.build(), mat);
  body.add(torso);

  // tête
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0);
  body.add(head);
  const hb = new Builder(id);
  hb.add(G.sphere(0.27, 20, 16), brown, { p: [0, 0.08, 0], s: [1.08, 0.95, 0.95] });
  for (const sx of [-1, 1]) {
    hb.add(G.sphere(0.12, 14, 10), '#f3dcc0', { p: [sx * 0.1, 0.09, 0.19], s: [1, 1, 0.45] });
    hb.add(G.cone(0.07, 0.17, 10), dark, { p: [sx * 0.19, 0.31, -0.02], r: [0, 0, -sx * 0.45] });
  }
  hb.add(G.cone(0.04, 0.09, 8), '#f6c46d', { p: [0, 0.02, 0.27], r: [Math.PI / 2 + 0.5, 0, 0] });
  // lunettes rondes
  for (const sx of [-1, 1]) hb.add(G.torus(0.085, 0.014, 6, 20), '#7a6a8a', { p: [sx * 0.1, 0.1, 0.27] });
  hb.add(G.cyl(0.012, 0.012, 0.05, 6), '#7a6a8a', { p: [0, 0.11, 0.28], r: [0, 0, Math.PI / 2] });
  const headMesh = new THREE.Mesh(hb.build(), mat);
  head.add(headMesh);
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.1, 0.25);
  head.add(eyes);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), eyeMat);
    e.position.set(sx * 0.1, 0, 0);
    e.scale.set(1, 1, 0.5);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), shine);
    s.position.set(sx * 0.1 + 0.016, 0.02, 0.025);
    eyes.add(e, s);
  }

  // ailes (pivot à l'épaule)
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.26, 0.42, -0.02);
    const wb = new Builder(id);
    wb.add(G.sphere(0.16, 14, 10), dark, { p: [sx * 0.03, -0.14, 0], s: [0.45, 1.05, 0.85] });
    pivot.add(new THREE.Mesh(wb.build(), mat));
    body.add(pivot);
    wings.push(pivot);
  }
  root.traverse((o) => o.isMesh && o.layers.enable(LAYER_SHADOW));
  return { root, body, torso, head, headMesh, eyes, wings };
}


export default fiche('ANI-027', 'hibou', 'Hibou cartographe', {
  ref: 'hibou', usedIn: ILE_DEPART, tags: ['animé', 'personnage'],
  build() {
    const h = buildHibou();
    return {
      object3d: h.root,
      anim: (dt, t) => {
        h.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.max(0, Math.sin(t * 2)) * 0.3; });
        h.head.rotation.y = Math.sin(t * 0.7) * 0.5;
      },
    };
  },
});
