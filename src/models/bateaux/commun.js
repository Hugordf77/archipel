// Chantier des bateaux de l'archipel : matériaux, coque arrondie, voile gonflée, et construction d'un
// bateau à partir de ses caractéristiques et de son dessin (chaque bateau a son dossier).
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW } from '../../core/globals.js';

export const WOOD = '#c98f5f';
export const WOOD_L = '#e0b07e';
export const WOOD_D = '#9f6b48';
export const ROPE = '#e9d8b4';
export const SAIL = '#fbf3e6';

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
export function hull(b, len, width, depth, color, rim) {
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

// Construit le bateau type : dessin(b, { body, oars, m }) ajoute la coque et l'accastillage au Builder (et
// les rames au corps) ; s'il porte des voiles (spec.sail), une par mât de mats [z, hauteur, bôme].
// Retour : { group, body, sail (pivots des bômes) | null, oars [], seat Vector3, len }
export function construire(type, spec, dessin, mats = []) {
  const m = materials();
  const group = new THREE.Group();
  group.name = `bateau-${type}`;
  const body = new THREE.Group();
  group.add(body);
  const b = new Builder();
  let sail = null;
  const oars = [];
  dessin(b, { body, oars, m });
  const mesh = new THREE.Mesh(b.build(), m.hull);
  mesh.layers.enable(LAYER_SHADOW);
  body.add(mesh);
  if (spec.sail) {
    const masts = mats;
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

// fiche d'un bateau : construit comme au chantier naval, avec un léger roulis et la voile qui bat
export function boat(type, construireBateau) {
  return {
    ref: `boat:${type}`, usedIn: ['chantier naval', 'mer'],
    build() {
      const bt = construireBateau();
      return {
        object3d: bt.group,
        anim: (dt, t) => {
          bt.body.rotation.z = Math.sin(t * 1.3) * 0.04;
          bt.body.rotation.x = Math.sin(t * 0.9) * 0.025;
          for (const s of [bt.sail || []].flat()) s.rotation.y = Math.sin(t * 0.5) * 0.15;
        },
      };
    },
  };
}
