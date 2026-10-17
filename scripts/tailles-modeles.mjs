// Relève la boîte englobante de chaque modèle du registre et réécrit la table TAILLES de
// src/models/registry.js. À lancer après un changement voulu de modèle : npm run modeles:tailles
import fs from 'node:fs';
import * as THREE from 'three';
import { installCanvasStub } from '../tests/helpers/canvas.js';

installCanvasStub();
const { MODELS, defaultParams } = await import('../src/models/registry.js');
const box = new THREE.Box3();
const lines = [];
for (const m of MODELS) {
  const { object3d } = m.build(defaultParams(m));
  object3d.updateMatrixWorld(true);
  box.makeEmpty();
  object3d.traverse((o) => {
    if (!o.geometry) return;
    o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  const s = box.getSize(new THREE.Vector3());
  lines.push(`  '${m.id}': [${[s.x, s.y, s.z].map((v) => Math.round(v * 100) / 100).join(', ')}],`);
}
const file = new URL('../src/models/registry.js', import.meta.url);
const src = fs.readFileSync(file, 'utf8');
const out = src.replace(/\/\/ <tailles>\n[\s\S]*?\/\/ <\/tailles>/, `// <tailles>\nconst TAILLES = {\n${lines.join('\n')}\n};\n// </tailles>`);
fs.writeFileSync(file, out);
console.log(`${lines.length} tailles relevées`);
