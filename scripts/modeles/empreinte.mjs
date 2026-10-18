// Empreinte des modèles : construit chaque modèle du registre et chaque variante, et relève le
// nombre de triangles et de sommets, la boîte englobante (arrondie au 1e-4), une somme de contrôle
// des positions, une autre des autres attributs (hors aId), la pose animée et les données de
// physique (obstacles, planchers, encombrement), plus les tables que le jeu importe (espèces,
// bateaux, décor, personnage…). Sert de garde-fou aux réorganisations : tout écart bloque.
//   node scripts/modeles/empreinte.mjs            vérifie contre tests/fixtures/empreintes.json
//   node scripts/modeles/empreinte.mjs --ecrire   réécrit la référence (après un changement voulu)
//   node scripts/modeles/empreinte.mjs ANI-001    n'affiche que l'empreinte de ce modèle
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { installCanvasStub } from '../../tests/helpers/canvas.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REFERENCE = path.join(RACINE, 'tests/fixtures/empreintes.json');

// premier module existant parmi les chemins donnés (les modules changent de place pendant la
// réorganisation : l'empreinte doit se calculer avant comme après)
// (sous vitest, chemin absolu : l'URL file:// encode l'espace du dossier et n'est pas résolue)
const url = (f) => (process.env.VITEST ? f : pathToFileURL(f).href);
async function charge(...rels) {
  for (const rel of rels) {
    const f = path.join(RACINE, rel);
    if (fs.existsSync(f)) return import(url(f));
  }
  throw new Error(`module introuvable : ${rels.join(' | ')}`);
}

// --- sommes de contrôle -----------------------------------------------------------------
// hachage 53 bits (cyrb53) des mots de 32 bits d'un tableau typé : bit à bit, sans arrondi
function hache(arr, h1 = 0xdeadbeef, h2 = 0x41c6ce57) {
  const u = arr instanceof Float32Array || arr instanceof Uint32Array || arr instanceof Int32Array
    ? new Uint32Array(arr.buffer, arr.byteOffset, arr.length)
    : Uint32Array.from(arr, (v) => (Number.isInteger(v) ? v >>> 0 : new Uint32Array(new Float32Array([v]).buffer)[0]));
  for (let i = 0; i < u.length; i++) {
    h1 = Math.imul(h1 ^ u[i], 2654435761);
    h2 = Math.imul(h2 ^ u[i], 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}
const hex = ([a, b]) => a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
const arrondi = (v, k = 1e4) => Math.round(v * k) / k || 0;
// arrondit récursivement les nombres d'une donnée (physique, tables)
function net(v, k = 1e6) {
  if (typeof v === 'number') return arrondi(v, k);
  if (Array.isArray(v)) return v.map((x) => net(x, k));
  if (v && typeof v === 'object') {
    if (v.isColor) return `#${v.getHexString()}`;
    if (v.isVector3) return net(v.toArray(), k);
    const o = {};
    for (const key of Object.keys(v).sort()) if (typeof v[key] !== 'function' && v[key] !== undefined) o[key] = net(v[key], k);
    return o;
  }
  return v;
}

// hasard reproductible pendant les constructions (le personnage tire des graines au hasard)
function graine(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _box = new THREE.Box3();
const _gb = new THREE.Box3();
// relevé d'un objet construit : triangles, sommets, boîte, positions, autres attributs, matrices
function releve(object3d) {
  object3d.updateMatrixWorld(true);
  _box.makeEmpty();
  let tris = 0;
  let verts = 0;
  let pos = [0x9e3779b9, 0x7f4a7c15];
  let attr = [0x85ebca6b, 0xc2b2ae35];
  let mat = [0x27d4eb2f, 0x165667b1];
  object3d.traverse((o) => {
    if (!o.geometry) return;
    const g = o.geometry;
    const p = g.attributes.position;
    verts += p.count;
    tris += (g.index ? g.index.count : p.count) / 3;
    pos = hache(p.array, ...pos);
    if (g.index) pos = hache(g.index.array, ...pos);
    for (const name of Object.keys(g.attributes).sort()) {
      if (name === 'position' || name === 'aId') continue;
      attr = hache(g.attributes[name].array, ...hache([name.length, g.attributes[name].itemSize], ...attr));
    }
    mat = hache(new Float32Array(o.matrixWorld.elements.map((e) => arrondi(e, 1e6))), ...mat);
    if (o.isInstancedMesh) {
      mat = hache(o.instanceMatrix.array, ...mat);
      if (o.instanceColor) attr = hache(o.instanceColor.array, ...attr);
    }
    g.computeBoundingBox();
    _gb.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    if (o.isInstancedMesh) _gb.applyMatrix4(new THREE.Matrix4().fromArray(o.instanceMatrix.array));
    _box.union(_gb);
  });
  return {
    tris, verts,
    box: _box.isEmpty() ? [] : [..._box.min.toArray(), ..._box.max.toArray()].map((v) => arrondi(v)),
    pos: hex(pos), attr: hex(attr), mat: hex(mat),
  };
}
// matrices de toutes les pièces après quelques pas d'animation
function pose(object3d, anim) {
  if (!anim) return undefined;
  for (const t of [0.4, 1.3, 5.2]) anim(0.016, t);
  object3d.updateMatrixWorld(true);
  let h = [1, 2];
  object3d.traverse((o) => { h = hache(new Float32Array(o.matrixWorld.elements.map((e) => arrondi(e, 1e5))), ...h); });
  return hex(h);
}

// --- calcul -----------------------------------------------------------------------------
export async function calculer({ seul = null } = {}) {
  installCanvasStub();
  const random = Math.random;
  const now = performance.now;
  performance.now = () => 1000; // horloge figée (respiration du personnage)
  const R = await import(url(path.join(RACINE, 'src/models/registry.js')));
  const L = await charge('src/models/lieux.js', 'src/models/structures/lieux.js');
  const { KIND_RADIUS } = await charge('src/world/islands/gen/kinds.js');
  const modeles = {};
  const physique = {};
  const fiches = {};
  try {
    for (const m of R.MODELS) {
      if (seul && m.id !== seul) continue;
      const runs = [R.defaultParams(m), ...m.variants.map((v) => v.params)];
      // fiche du registre : identité, usage, réglages (statuts et notes vivent dans catalogue/notes.json)
      fiches[m.id] = net({ slug: m.slug, name: m.name, category: m.category, ref: m.ref, status: m.status, size: m.size, tags: m.tags, usedIn: m.usedIn, params: m.params, defaults: m.defaults, variants: m.variants });
      modeles[m.id] = runs.map((params) => {
        Math.random = graine(7);
        const { object3d, anim } = m.build(params);
        const r = releve(object3d);
        r.anim = pose(object3d, anim);
        if (!r.anim) delete r.anim;
        return r;
      });
      const [kind, key] = m.ref.split(':');
      if (kind === 'part') {
        physique[m.id] = runs.map((params) => {
          const md = L.partModel({ x: 0, y: 0, z: 0, rot: 0, t: key, ...m.defaults, ...params });
          return net({
            obstacles: md.obstacles, planchers: md.decks, lumiere: md.light,
            pivots: md.anim?.map((a) => ({ pivot: a.pivot, axis: a.axis, speed: a.speed, wind: a.wind })),
            roue: md.wheel ? true : undefined, rotY: L.rotY(key, 0.3),
          });
        });
      } else if (kind === 'kind') physique[m.id] = { encombrement: KIND_RADIUS[key] };
    }
    if (seul) return { fiches, modeles, physique };
    return { fiches, modeles, physique, tables: await tables(), ileDepart: await ileDepart() };
  } finally {
    Math.random = random;
    performance.now = now;
  }
}

// tables que le jeu importe : leurs valeurs (sans les fonctions) et la géométrie des pièces
async function tables() {
  const geo = (parts) => hex(parts.reduce((h, p) => hache(p.geo.attributes.position.array, ...h), [3, 4]));
  const meta = (parts) => parts.map((p) => net({ pivot: p.pivot, anim: p.anim, side: p.side, phase: p.phase, parent: p.parent }));
  const { SPECIES } = await charge('src/models/animaux/index.js', 'src/models/animals/especes.js');
  const especes = {};
  for (const [sp, d] of Object.entries(SPECIES)) {
    const parts = d.parts();
    especes[sp] = { ...net(d), pieces: meta(parts), geo: geo(parts) };
    if (d.lod) especes[sp].lod = geo(d.lod());
  }
  const B = await charge('src/models/bateaux/index.js', 'src/models/boats/bateaux.js');
  const D = await charge('src/models/decor/index.js', 'src/models/decor/catalogue.js');
  const O = await charge('src/models/objets/index.js', 'src/models/props/objets.js');
  const T = await charge('src/models/personnage/index.js', 'src/models/props/outils.js');
  const P = await charge('src/models/personnage/index.js', 'src/models/character/personnage.js');
  const V = await charge('src/models/vegetation.js', 'src/models/vegetation/especes.js');
  const F = await charge('src/models/animaux/index.js', 'src/models/animals/ileDepart.js');
  const { KIND_RADIUS } = await charge('src/world/islands/gen/kinds.js');
  return net({
    especes,
    bateaux: { BOATS: B.BOATS, BOAT_ORDER: B.BOAT_ORDER },
    decor: { CATALOG: D.CATALOG, CATALOG_ORDER: D.CATALOG_ORDER },
    objets: { MARINE_TYPES: O.MARINE_TYPES, OUTILS: T.OUTILS },
    personnage: { HC: P.HC, B: P.B, PARENT: P.PARENT, REST: P.REST, ID: P.ID, RIBBON: P.RIBBON, coupes: Object.keys(P.HAIR_STYLES), tint: P.tint('#80a0c0', 0.8) },
    vegetation: { ROCKY: [...V.ROCKY].sort(), CAP_COLORS: V.CAP_COLORS, KIND_RADIUS },
    fauneDepart: { GULL_PIVOTS: F.GULL_PIVOTS, BUTTERFLY_PIVOTS: F.BUTTERFLY_PIVOTS, CRAB_LEG_PIVOTS: F.CRAB_LEG_PIVOTS },
  });
}

// île de départ : obstacles posés par le jeu autour de ses bâtiments et de son mobilier
async function ileDepart() {
  const { buildProps } = await charge('src/world/home/props.js');
  Math.random = graine(11);
  const p = buildProps();
  return { obstacles: net(p.obstacles), lanternes: net(p.lanterns), spots: net(p.spots) };
}

// --- comparaison ------------------------------------------------------------------------
export function ecarts(a, b, chemin = '', out = []) {
  if (out.length > 40) return out;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a && !b) || (!a && b)) {
    out.push(`${chemin} : ${JSON.stringify(a)?.slice(0, 120)} → ${JSON.stringify(b)?.slice(0, 120)}`);
    return out;
  }
  if (a && typeof a === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) ecarts(a[k], b[k], chemin ? `${chemin}.${k}` : k, out);
    return out;
  }
  if (a !== b) out.push(`${chemin} : ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const arg = process.argv[2];
  if (arg && arg !== '--ecrire') {
    console.log(JSON.stringify(await calculer({ seul: arg }), null, 1));
  } else {
    const t0 = Date.now();
    const e = await calculer();
    const n = Object.values(e.modeles).reduce((a, r) => a + r.length, 0);
    if (arg === '--ecrire') {
      fs.mkdirSync(path.dirname(REFERENCE), { recursive: true });
      fs.writeFileSync(REFERENCE, `${JSON.stringify(e, null, 1)}\n`);
      console.log(`${Object.keys(e.modeles).length} modèles, ${n} constructions relevées en ${Date.now() - t0} ms → ${path.relative(RACINE, REFERENCE)}`);
    } else {
      const ref = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
      const d = ecarts(ref, JSON.parse(JSON.stringify(e)));
      if (d.length) {
        console.log(`Empreinte modifiée (${d.length}${d.length > 40 ? '+' : ''} écarts) :\n  ${d.join('\n  ')}`);
        process.exit(1);
      }
      console.log(`Empreinte identique : ${Object.keys(e.modeles).length} modèles, ${n} constructions (${Date.now() - t0} ms)`);
    }
  }
}
