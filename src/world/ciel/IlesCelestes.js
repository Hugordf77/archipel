// Îles célestes (rendu) : maillage de chaque île flottante (dessus herbeux, roche suspendue), arbres et
// décor instanciés avec les matériaux des îles, ruisseau et cascade qui se perd dans le vide,
// obstacles réservés à qui marche dessus (navigation.js, ymin). Relief et placement : relief.js.
import * as THREE from 'three';
import { ARCHIPEL } from '../archipel.js';
import { buildCielMesh, placeCiel, ruisseauDe, STRIDE } from './relief.js';
import { KINDS, KIND_RADIUS, TREES } from '../islands/gen/kinds.js';
import { kindModel, ROCKY } from '../../models/vegetation.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { buildRivers } from '../env/rivers.js';
import { addObstacles } from '../navigation.js';
import { LAYER_SHADOW } from '../../core/globals.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

// texture de la cascade : filets verticaux clairs, qui défilent vers le bas
function cascadeTexture() {
  const cv = document.createElement('canvas');
  cv.width = 32;
  cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(214, 240, 248, 0.75)';
  g.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(255, 255, 255, ${0.3 + (i % 3) * 0.2})`;
    g.fillRect((i * 13) % 32, (i * 37) % 128, 2, 18 + (i % 4) * 10);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class IlesCelestes {
  // mats : matériaux des îles (IslandManager.mats : solid, glow, foliage, flower)
  constructor({ root, mats }) {
    this.root = root;
    this.mats = mats;
    this.group = new THREE.Group();
    this.group.name = 'iles-celestes';
    root.add(this.group);
    this.terrainMat = toonMaterial({ vertexColors: true, rim: 0.5, outline: 0.7 });
    this.terrainMat.side = THREE.DoubleSide;
    this.falls = [];
    this.obstacles = [];
    for (const c of ARCHIPEL.ciel) this.build(c);
    addObstacles(this.obstacles);
  }

  build(c) {
    const g = new THREE.Group();
    g.name = `ciel-${c.id}`;
    g.position.set(c.x, 0, c.z);
    // roche et dessus
    const d = buildCielMesh(c);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(d.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(d.index, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.terrainMat);
    mesh.name = 'roche-celeste';
    mesh.layers.enable(LAYER_SHADOW);
    g.add(mesh);
    // arbres et décor, regroupés par espèce
    const { items } = placeCiel(c);
    const byKind = new Map();
    for (let k = 0; k < items.length; k += STRIDE) {
      const ki = items[k];
      if (!byKind.has(ki)) byKind.set(ki, []);
      byKind.get(ki).push(k);
    }
    for (const [ki, list] of byKind) {
      const kind = KINDS[ki];
      const model = kindModel(kind);
      const parts = [];
      if (model.solid) parts.push(['solid', new THREE.InstancedMesh(model.solid, model.glow ? this.mats.glow : this.mats.solid, list.length)]);
      if (model.clumpGeo) parts.push(['leaves', new THREE.InstancedMesh(model.clumpGeo, this.mats.foliage, list.length)]);
      if (model.flowerGeo) parts.push(['flower', new THREE.InstancedMesh(model.flowerGeo, this.mats.flower, list.length)]);
      list.forEach((k, i) => {
        const sc = items[k + 5];
        _p.set(items[k + 1], items[k + 2] - 0.04, items[k + 3]);
        _q.setFromAxisAngle(_up, items[k + 4]);
        _m.compose(_p, _q, _s.set(sc, sc, sc));
        const b = 0.9 + items[k + 6] * 0.18;
        for (const [role, im] of parts) {
          im.setMatrixAt(i, _m);
          if (role === 'solid') im.setColorAt(i, ROCKY.has(kind) ? _c.setRGB(0.85 * b, 0.8 * b, 0.82 * b) : _c.setRGB(b, b, b));
          else if (role === 'leaves') im.setColorAt(i, _c.setRGB(b, b * 1.01, b * 0.98));
          else im.setColorAt(i, _c.setRGB(1, 0.8, 0.86));
        }
        const r = KIND_RADIUS[kind];
        // obstacle pour qui marche sur l'île seulement (pas pour le bateau qui passe dessous)
        if (r > 0) this.obstacles.push({ x: c.x + items[k + 1], z: c.z + items[k + 3], r: r * sc, ymin: c.alt - 12, low: !TREES.has(kind) });
      });
      for (const [role, im] of parts) {
        im.name = kind;
        if (role === 'solid' && TREES.has(kind)) im.layers.enable(LAYER_SHADOW);
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        g.add(im);
      }
    }
    // ruisseau et cascade
    const r = ruisseauDe(c);
    if (r) {
      const river = buildRivers([{ pts: Float32Array.from(r.pts) }]);
      if (river) g.add(river);
      const f = r.chute;
      const tex = cascadeTexture();
      tex.repeat.set(1, f.h / 24);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexColors: true });
      // plan vertical, tangent au bord, un peu en avant de la lèvre ; s'efface vers le bas
      const pg = new THREE.PlaneGeometry(f.w, f.h, 1, 8);
      const pos = pg.attributes.position;
      const col = new Float32Array(pos.count * 4);
      for (let i = 0; i < pos.count; i++) col.set([1, 1, 1, THREE.MathUtils.smoothstep(pos.getY(i), -f.h / 2, f.h / 2 - 4)], i * 4);
      pg.setAttribute('color', new THREE.BufferAttribute(col, 4));
      const fall = new THREE.Mesh(pg, mat);
      fall.name = 'cascade-celeste';
      fall.position.set(f.x + Math.cos(f.dir) * 1.6, f.y - f.h / 2 + 0.3, f.z + Math.sin(f.dir) * 1.6);
      fall.rotation.y = -f.dir + Math.PI / 2;
      fall.renderOrder = 2;
      g.add(fall);
      this.falls.push(tex);
    }
    this.group.add(g);
  }

  update(dt) {
    for (const t of this.falls) t.offset.y += dt * 0.9;
  }
}
