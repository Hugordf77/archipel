// Les bateaux de l'archipel : caractéristiques et modèles peints.
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW } from '../../core/globals.js';

// vitesse (m/s), zone autorisée (m depuis l'île de départ), voile, cale (emplacements)
export const BOATS = {
  radeau: { name: 'Radeau', speed: 4, zone: 1000, sail: false, hold: 0, len: 3.2, seat: [0, 0.42, -0.4], desc: 'Quelques rondins bien ficelés. Parfait pour les îles voisines.' },
  barque: { name: 'Barque', speed: 6, zone: 3000, sail: false, hold: 0, len: 4.2, seat: [0, 0.38, -0.2], desc: 'Une coque solide et deux rames : on va déjà bien plus loin.' },
  voilier: { name: 'Voilier', speed: 9, speedWind: 12, zone: 6000, sail: true, hold: 0, len: 5.4, seat: [0, 0.5, -1.5], desc: 'Une voile à régler selon le vent : jusqu\'à 12 m/s au portant.' },
  goelette: { name: 'Goélette', speed: 11, speedWind: 13, zone: Infinity, sail: true, hold: 24, len: 8, seat: [0, 1.0, -2.8], desc: 'Deux mâts, une cale de 24 emplacements, et toute la mer devant soi.' },
};
export const BOAT_ORDER = ['radeau', 'barque', 'voilier', 'goelette'];

const WOOD = '#c98f5f';
const WOOD_L = '#e0b07e';
const WOOD_D = '#9f6b48';
const ROPE = '#e9d8b4';
const SAIL = '#fbf3e6';

let mats = null;
function materials() {
  if (!mats) {
    mats = {
      hull: toonMaterial({ vertexColors: true, aId: true, rim: 0.9 }),
      sail: toonMaterial({ vertexColors: true, aId: true, rim: 0.6, side: THREE.DoubleSide, wind: 0.04, sway: true }),
    };
  }
  return mats;
}

// coque arrondie : demi-ellipsoïde aplati, la partie immergée est cachée par l'eau
function hull(b, len, width, depth, color, rim) {
  b.add(G.sphere(1, 22, 12), color, { p: [0, 0.05, 0], s: [width / 2, depth, len / 2] });
  b.add(G.sphere(1, 22, 12), '#f6ead2', { p: [0, 0.18, 0], s: [width / 2 - 0.12, depth * 0.35, len / 2 - 0.2] });
  b.add(G.torus(1, 0.06, 6, 28), rim, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0], s: [width / 2, len / 2, 1] });
}

function sailGeometry(w, h) {
  // voile triangulaire légèrement gonflée (bord d'attaque le long du mât)
  const pos = [];
  const idx = [];
  const N = 8;
  for (let j = 0; j <= N; j++) {
    const t = j / N;
    const ww = w * (1 - t);
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const belly = Math.sin(u * Math.PI) * Math.sin((1 - t) * Math.PI * 0.9) * 0.18 * w;
      pos.push(belly, t * h, -u * ww);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < 4; i++) {
      const a = j * 5 + i;
      idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Retour : { group, sail (pivot de la bôme) | null, oars [], seat Vector3, len }
export function buildBoat(type) {
  const spec = BOATS[type];
  const m = materials();
  const group = new THREE.Group();
  group.name = `bateau-${type}`;
  const body = new THREE.Group();
  group.add(body);
  const b = new Builder();
  let sail = null;
  const oars = [];
  if (type === 'radeau') {
    for (let k = -2; k <= 2; k++) b.add(G.cyl(0.21, 0.21, 3.2, 12), k % 2 ? WOOD : WOOD_L, { p: [k * 0.4, 0.12, 0], r: [Math.PI / 2, 0, 0] });
    for (const z of [-1.1, 0, 1.1]) b.add(G.torus(0.98, 0.04, 5, 16), ROPE, { p: [0, 0.12, z], s: [1.05, 0.4, 1] });
    b.add(G.box(1.5, 0.08, 0.9, 0.03), WOOD_D, { p: [0, 0.36, -0.4] });
    b.add(G.cyl(0.05, 0.06, 1.8, 8), WOOD_D, { p: [0, 1.2, 0.8] });
    b.add(G.box(0.7, 0.42, 0.03, 0.01), '#f19b86', { p: [0.36, 1.85, 0.8], sway: 1 });
    b.add(G.box(0.12, 0.08, 1.2, 0.03), WOOD_D, { p: [0, 0.3, -1.9] });
  } else if (type === 'barque') {
    hull(b, 4.2, 1.6, 0.55, '#86c6bb', '#5a9e94');
    b.add(G.box(1.3, 0.07, 0.36, 0.03), WOOD_L, { p: [0, 0.32, -0.2] });
    b.add(G.box(1.1, 0.07, 0.36, 0.03), WOOD_L, { p: [0, 0.32, 1.2] });
    b.add(G.box(0.12, 0.42, 0.12, 0.03), WOOD_D, { p: [0, 0.36, 2.0] });
    for (const sx of [-1, 1]) {
      const o = new Builder();
      o.add(G.cyl(0.035, 0.035, 2.2, 8), WOOD_L, { p: [sx * 1.0, 0, 0], r: [0, 0, Math.PI / 2] });
      o.add(G.box(0.5, 0.03, 0.18, 0.02), WOOD, { p: [sx * 2.0, 0, 0] });
      const oar = new THREE.Mesh(o.build(), m.hull);
      oar.position.set(sx * 0.15, 0.48, -0.1);
      body.add(oar);
      oars.push(oar);
    }
  } else if (type === 'voilier') {
    hull(b, 5.4, 1.9, 0.7, '#fbf3e6', '#f19b86');
    b.add(G.box(1.4, 0.06, 2.6, 0.03), WOOD_L, { p: [0, 0.36, -0.2] });
    b.add(G.cyl(0.06, 0.08, 5.2, 10), WOOD_D, { p: [0, 2.9, 0.7] });
    b.add(G.cone(0.08, 0.2, 8), '#f19b86', { p: [0, 5.6, 0.7] });
    b.add(G.box(0.08, 0.5, 0.5, 0.02), WOOD_D, { p: [0, 0.0, -2.5] });
  } else {
    hull(b, 8, 2.6, 1.0, '#e0b07e', '#9f6b48');
    b.add(G.box(2.0, 0.08, 6.2, 0.04), WOOD_L, { p: [0, 0.62, 0] });
    b.add(G.box(1.4, 0.9, 1.6, 0.08), '#f6ead2', { p: [0, 1.1, -2.2] });
    b.add(G.box(1.6, 0.12, 1.8, 0.05), '#86c6bb', { p: [0, 1.6, -2.2] });
    for (const z of [1.4, -0.4]) b.add(G.cyl(0.07, 0.09, 6.4, 10), WOOD_D, { p: [0, 3.8, z] });
    b.add(G.box(0.08, 0.7, 0.6, 0.02), WOOD_D, { p: [0, 0.2, -3.9] });
    b.add(G.cyl(0.03, 0.03, 2.2, 6), ROPE, { p: [0, 1.4, 3.6], r: [0.9, 0, 0] });
  }
  const mesh = new THREE.Mesh(b.build(), m.hull);
  mesh.layers.enable(LAYER_SHADOW);
  body.add(mesh);
  if (spec.sail) {
    const masts = type === 'goelette' ? [[1.4, 5.6, 2.6], [-0.4, 4.6, 2.2]] : [[0.7, 4.6, 2.2]];
    sail = [];
    for (const [z, h, w] of masts) {
      const pivot = new THREE.Group();
      pivot.position.set(0, 0.75, z);
      // la géométrie de voile n'a pas les attributs du Builder : on la colore à part
      const geo = sailGeometry(w, h);
      const n = geo.attributes.position.count;
      const c = new THREE.Color(SAIL);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aId', new THREE.BufferAttribute(new Float32Array(n).fill(0.31), 1));
      geo.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
      geo.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(n).fill(0.3), 1));
      const s = new THREE.Mesh(geo, m.sail);
      s.layers.enable(LAYER_SHADOW);
      pivot.add(s);
      // bôme
      const boom = new Builder();
      boom.add(G.cyl(0.04, 0.04, w, 8), WOOD_D, { p: [0, 0, -w / 2], r: [Math.PI / 2, 0, 0] });
      pivot.add(new THREE.Mesh(boom.build(), m.hull));
      body.add(pivot);
      sail.push(pivot);
    }
  }
  return { group, body, sail, oars, seat: new THREE.Vector3(...spec.seat), len: spec.len };
}
