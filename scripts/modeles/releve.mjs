// Relevé du registre des modèles : boîte englobante de chaque modèle (table TAILLES) et îles de
// l'archipel qui l'emploient (table USAGE, recensée sur les plans des neuf îles). Écrit les deux tables
// dans src/models/releves.gen.js. À lancer après un changement voulu : npm run modeles:releve
import fs from 'node:fs';
import * as THREE from 'three';
import { installCanvasStub } from '../../tests/helpers/canvas.js';

installCanvasStub();
const { MODELS, defaultParams } = await import('../../src/models/registry.js');
const { ISLANDS } = await import('../../src/world/islands/regions.js');
const { buildPlan } = await import('../../src/world/islands/gen/plan.js');
const { KINDS, STRIDE } = await import('../../src/world/islands/gen/kinds.js');
const { Surface, buildTile, TILE } = await import('../../src/world/islands/gen/surface.js');

// tailles
const box = new THREE.Box3();
const sizes = [];
for (const m of MODELS) {
  const { object3d } = m.build(defaultParams(m));
  object3d.updateMatrixWorld(true);
  box.makeEmpty();
  object3d.traverse((o) => {
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  const s = box.getSize(new THREE.Vector3());
  sizes.push(`  '${m.id}': [${[s.x, s.y, s.z].map((v) => Math.round(v * 100) / 100).join(', ')}],`);
}

// usage : références construites par chaque île (végétation, lieux, curiosités, chemins, faune)
const usage = new Map();
const note = (ref, name) => {
  if (!usage.has(ref)) usage.set(ref, new Set());
  usage.get(ref).add(name);
};
for (const d of ISLANDS) {
  const p = buildPlan(d);
  for (let k = 0; k < p.items.length; k += STRIDE) note(`kind:${KINDS[p.items[k]]}`, d.name);
  for (const poi of p.pois) for (const q of poi.parts || []) note(`part:${q.t}`, d.name);
  for (const q of [...p.micro, ...p.pathParts]) note(`part:${q.t}`, d.name);
  for (const s of p.spawners) note(`species:${s.sp}`, d.name);
}
// petite végétation des tuiles au mètre (herbe, fleurs des champs, blé, roseaux, nénuphars…)
for (const d of ISLANDS) {
  const p = buildPlan(d);
  const surf = new Surface(p);
  const nt = Math.ceil(p.ext / TILE);
  for (let tz = -nt; tz < nt; tz++) {
    for (let tx = -nt; tx < nt; tx++) {
      const t = buildTile(p, surf, tx, tz);
      for (let k = 0; k < t.items.length; k += STRIDE) note(`kind:${KINDS[t.items[k]]}`, d.name);
    }
  }
}
const order = new Map(ISLANDS.map((d, i) => [d.name, i]));
const used = [...usage.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ref, names]) => `  '${ref}': [${[...names].sort((a, b) => order.get(a) - order.get(b)).map((n) => `'${n.replace(/'/g, "\\'")}'`).join(', ')}],`);

const file = new URL('../../src/models/releves.gen.js', import.meta.url);
fs.writeFileSync(file, [
  '// Généré par « npm run modeles:releve » (scripts/modeles/releve.mjs) : ne pas modifier à la main.',
  '// TAILLES : boîte englobante de chaque modèle, [largeur, hauteur, profondeur] en mètres (±25 % vérifiés',
  '// en test) ; USAGE : îles de l\'archipel qui emploient chaque référence (recensées sur leurs plans).',
  'export const TAILLES = {', ...sizes, '};', '',
  'export const USAGE = {', ...used, '};', '',
].join('\n'));
console.log(`${sizes.length} tailles, ${used.length} références d'usage → src/models/releves.gen.js`);
