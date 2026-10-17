// Grand albatros, monture du vol : corps, cou articulé, bec, ailes à plumes.
// root.userData.wings / neck : groupes que le vol fait battre et orienter.
import * as THREE from 'three';
import { toonMaterial } from '../../render/shaders/materials.js';

export function buildAlbatros() {
  const root = new THREE.Group();
  root.name = 'grand-oiseau-monture';
  const bodyMat  = toonMaterial({ color: 0xc78b62, rim: 0.8, pigment: 0.55 });
  const creamMat = toonMaterial({ color: 0xf3dfbc, rim: 0.7, pigment: 0.5 });
  const darkMat  = toonMaterial({ color: 0x66566b, rim: 0.6, pigment: 0.4 });
  const beakMat  = toonMaterial({ color: 0xe9ad63, rim: 0.5, pigment: 0.35 });
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const mesh = (mat, scale, pos, parent = root, geo = sphere) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(...scale);
    m.position.set(...pos);
    parent.add(m);
    return m;
  };

  mesh(bodyMat,  [0.86, 0.58, 1.32], [0, 0, 0]);
  mesh(creamMat, [0.67, 0.22, 0.95], [0, -0.25, 0.03]);
  const neck = new THREE.Group();
  neck.position.set(0, 0.22, 0.82);
  root.add(neck);
  mesh(bodyMat, [0.38, 0.43, 0.72], [0, 0.08, 0.35], neck);
  mesh(bodyMat, [0.48, 0.4,  0.48], [0, 0.28, 0.82], neck);
  mesh(creamMat,[0.25, 0.22, 0.1],  [0, 0.15, 1.18], neck);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 7), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.06, 1.32);
  neck.add(beak);
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 6);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, darkMat);
    eye.position.set(side * 0.36, 0.42, 1.02);
    root.add(eye);
  }
  // Les ailes sont des groupes articulés : leurs plumes suivent le battement.
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.58, 0.18, 0.05);
    root.add(wing);
    mesh(bodyMat, [2.12, 0.12, 0.56], [side * 1.05, 0, 0], wing);
    for (let i = 0; i < 5; i++) {
      mesh(creamMat, [0.66, 0.08, 0.23], [side * (1.05 + i * 0.28), -0.035, -0.25 - i * 0.09], wing);
    }
    wings.push(wing);
  }
  mesh(darkMat, [0.32, 0.13, 0.58], [0, 0.18, -1.35]);
  root.userData.wings = wings;
  root.userData.neck  = neck;
  return root;
}
