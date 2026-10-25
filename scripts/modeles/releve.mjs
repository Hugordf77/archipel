// Relevé du registre des modèles : boîte englobante de chaque modèle (table TAILLES) et zones du monde
// ouvert qui l'emploient (table USAGE, recensée sur les plans des îles entières d'archipel.js : chaque
// élément compte dans la zone de sa case). Écrit les deux tables dans src/models/releves.gen.js.
// À lancer après un changement voulu : npm run modeles:releve
import fs from 'node:fs';
import * as THREE from 'three';
import { installCanvasStub } from '../../tests/helpers/canvas.js';

installCanvasStub();
const { MODELS, defaultParams } = await import('../../src/models/registry.js');
const { ILES } = await import('../../src/world/islands/regions.js');
const { ZONES, ZONE_BY_ID } = await import('../../src/world/archipel.js');
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

// usage : références construites sur chaque île (végétation, lieux, curiosités, chemins, faune), notées
// au nom de la zone de leur case
const usage = new Map();
const note = (ref, name) => {
  if (!usage.has(ref)) usage.set(ref, new Set());
  usage.get(ref).add(name);
};
for (const d of ILES) {
  const p = buildPlan(d);
  const zoneOf = (x, z) => {
    const i = Math.max(0, Math.min(p.n - 1, Math.round((x + p.ext) / p.s)));
    const j = Math.max(0, Math.min(p.n - 1, Math.round((z + p.ext) / p.s)));
    return ZONE_BY_ID.get(p.zones[p.ZI[j * p.n + i]])?.name ?? d.name;
  };
  for (let k = 0; k < p.items.length; k += STRIDE) note(`kind:${KINDS[p.items[k]]}`, zoneOf(p.items[k + 1], p.items[k + 3]));
  for (const poi of p.pois) for (const q of poi.parts || []) note(`part:${q.t}`, zoneOf(q.x, q.z));
  for (const q of [...p.micro, ...p.pathParts]) note(`part:${q.t}`, zoneOf(q.x, q.z));
  for (const s of p.spawners) note(`species:${s.sp}`, zoneOf(s.x, s.z));
  // petite végétation des tuiles au mètre (herbe, fleurs des champs, blé, roseaux, nénuphars…) :
  // seulement sur les îles qui décrivent leurs lieux
  if (!p.lieux) continue;
  const surf = new Surface(p);
  const nt = Math.ceil(p.ext / TILE);
  for (let tz = -nt; tz < nt; tz++) {
    for (let tx = -nt; tx < nt; tx++) {
      const t = buildTile(p, surf, tx, tz);
      for (let k = 0; k < t.items.length; k += STRIDE) note(`kind:${KINDS[t.items[k]]}`, zoneOf(t.items[k + 1], t.items[k + 3]));
    }
  }
}
const order = new Map([...ZONES.map((zn, i) => [zn.name, i]), ...ILES.map((d, i) => [d.name, ZONES.length + i])]);
const used = [...usage.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ref, names]) => `  '${ref}': [${[...names].sort((a, b) => order.get(a) - order.get(b)).map((n) => `'${n.replace(/'/g, "\\'")}'`).join(', ')}],`);

const file = new URL('../../src/models/releves.gen.js', import.meta.url);
fs.writeFileSync(file, [
  '// Généré par « npm run modeles:releve » (scripts/modeles/releve.mjs) : ne pas modifier à la main.',
  '// TAILLES : boîte englobante de chaque modèle, [largeur, hauteur, profondeur] en mètres (±25 % vérifiés',
  '// en test) ; USAGE : zones du monde ouvert qui emploient chaque référence (recensées sur les plans).',
  'export const TAILLES = {', ...sizes, '};', '',
  'export const USAGE = {', ...used, '};', '',
].join('\n'));
console.log(`${sizes.length} tailles, ${used.length} références d'usage → src/models/releves.gen.js`);
