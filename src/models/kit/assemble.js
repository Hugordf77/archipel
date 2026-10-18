// Assemblage d'un modèle seul, avec les matériaux du jeu (MAT) : végétation instanciée,
// éléments de lieux, pièces de l'île de départ, animaux par pièces. Sert le registre des
// modèles (catalogue, tests) ; le jeu, lui, regroupe ces mêmes modèles par île.
// Chaque fonction renvoie { object3d, anim? } ; anim(dt, t) anime le modèle.
import * as THREE from 'three';
import { Builder } from '../../render/builder.js';
import { toonMaterial, foliageMaterial, grassMaterial } from '../../render/shaders/materials.js';
import { buildClumpGeometry } from '../../render/foliage.js';
import { leafAtlas } from '../../render/textures.js';
import { LAYER_SHADOW } from '../../core/globals.js';
import { MAT } from './materials.js';
import { table } from './tables.js';

let mats = null;
export function materiaux() {
  if (!mats) {
    mats = {};
    for (const k of Object.keys(MAT)) if (k !== 'foliage') mats[k] = toonMaterial({ ...MAT[k] });
    mats.foliage = foliageMaterial({ leafTex: leafAtlas(), ...MAT.foliage });
    mats.grass = grassMaterial({ tipColor: 0xe4f0bc });
  }
  return mats;
}

const _id = new THREE.Matrix4();
function shadowed(o) {
  o.traverse((c) => c.isMesh && c.layers.enable(LAYER_SHADOW));
  return o;
}
// une seule instance (même chemin de rendu que le jeu : teinte par instance)
function single(geo, mat, color) {
  const im = new THREE.InstancedMesh(geo, mat, 1);
  im.setMatrixAt(0, _id);
  im.setColorAt(0, color);
  return im;
}

// Végétation et ressources : { roche: couleur de roche du biome, v: variante, fleur: couleur }
export function assembleKind(kind, { roche = '#d6cbbd', v = 0, fleur = '#f7b6c8' } = {}) {
  const { kindModel, ROCKY, CAP_COLORS } = table('vegetation');
  const md = kindModel(kind);
  const M = materiaux();
  const g = new THREE.Group();
  const b = 0.99;
  const c = new THREE.Color();
  if (md.solid) {
    if (ROCKY.has(kind)) c.set(roche).multiplyScalar(b);
    else if (kind === 'champi_geant' || kind === 'champi_petit') c.copy(CAP_COLORS[v % CAP_COLORS.length]);
    else c.setRGB(b, b, b);
    g.add(single(md.solid, md.glow ? M.glow : M.solid, c.clone()));
  }
  if (md.clumpGeo) g.add(single(md.clumpGeo, M.foliage, new THREE.Color(b, b * 1.01, b * 0.98)));
  if (md.grassGeo) g.add(single(md.grassGeo, M.grass, new THREE.Color(0.8 * b, 0.9 * b, 0.65 * b)));
  if (md.flowerGeo) g.add(single(md.flowerGeo, M.flower, new THREE.Color(fleur)));
  return { object3d: shadowed(g) };
}

const flat = (geo) => (geo.index ? geo.toNonIndexed() : geo);
// Éléments de lieux (maisons, moulins, jetées…) : p comme dans un plan d'île ({ t, v, … })
export function assemblePart(p) {
  const { partModel, recolorPart } = table('lieux');
  const md = partModel({ x: 0, y: 0, z: 0, rot: 0, ...p });
  const M = materiaux();
  const g = new THREE.Group();
  if (md.solid?.parts.length) {
    const geo = flat(md.solid.build());
    const C = geo.attributes.color?.array;
    const T = geo.attributes.aTint?.array;
    if (C && T) recolorPart(p, C, T, 0, geo.attributes.position.count);
    g.add(new THREE.Mesh(geo, M.struct));
  }
  if (md.glow?.parts.length) g.add(new THREE.Mesh(flat(md.glow.build()), M.structGlow));
  const spins = [];
  for (const a of md.anim || []) {
    const holder = new THREE.Group();
    holder.position.fromArray(a.pivot);
    const spin = new THREE.Group();
    spin.add(new THREE.Mesh(a.builder.build(), M.struct));
    holder.add(spin);
    g.add(holder);
    spins.push({ obj: spin, axis: a.axis, speed: a.speed });
  }
  if (md.wheel) {
    // roue à aubes : contre le pignon, dans le bief (le jeu la pose sur la rivière)
    const holder = new THREE.Group();
    holder.position.set(2.05, 1.45, 0);
    const spin = new THREE.Group();
    spin.add(new THREE.Mesh(md.wheel.build(), M.struct));
    holder.add(spin);
    g.add(holder);
    spins.push({ obj: spin, axis: 'x', speed: 1.2 });
  }
  const anim = spins.length ? (dt) => { for (const s of spins) s.obj.rotation[s.axis] += dt * s.speed; } : undefined;
  return { object3d: shadowed(g), anim };
}

// Pièces dessinées dans un Builder (île de départ) : draw(b, vitres) → feuillages éventuels
export function assembleBuilder(draw, mat = 'home') {
  const M = materiaux();
  const b = new Builder();
  const glass = new Builder();
  const clumps = draw(b, glass);
  const g = new THREE.Group();
  if (b.parts.length) g.add(new THREE.Mesh(b.build(), M[mat]));
  if (glass.parts.length) g.add(new THREE.Mesh(glass.build(), M.homeGlass));
  if (Array.isArray(clumps) && clumps.length) g.add(new THREE.Mesh(buildClumpGeometry(clumps, 3), M.foliage));
  return { object3d: shadowed(g) };
}

// Animaux par pièces : [{ geo, pivot, anim, side, phase, parent? }] (faune des îles). Comme en jeu,
// chaque pièce est une instance : coat teinte le pelage (sommets teintés). Une pièce à parent (la
// tête portée par un cou) a son pivot dans le repère de ce parent. L'animation alterne quatre
// secondes de marche et quatre secondes de broutage (tête, ou cou, baissé jusqu'à graze ; tête
// portée par le cou jusqu'à nod).
export function assembleCreature(parts, { scale = 1, mat = materiaux().fauna, pace = 1, coat = null, graze = 0.5, nod = 0 } = {}) {
  const g = new THREE.Group();
  const moving = [];
  const pivots = [];
  const color = new THREE.Color(coat ?? 0xffffff);
  for (const p of parts) {
    const pivot = new THREE.Group();
    pivot.position.fromArray(p.pivot);
    pivot.add(single(p.geo, mat, color));
    (p.parent != null ? pivots[p.parent] : g).add(pivot);
    pivots.push(pivot);
    if (p.anim && p.anim !== 'none') moving.push({ obj: pivot, ...p });
  }
  g.scale.setScalar(scale);
  const anim = moving.length
    ? (dt, t) => {
        const cyc = t % 8;
        const walk = cyc < 4;
        const down = walk ? 0 : Math.sin((Math.PI * (cyc - 4)) / 4);
        for (const m of moving) {
          const s = t * pace + (m.phase || 0);
          if (m.anim === 'leg') m.obj.rotation.x = walk ? Math.sin(s * 7) * 0.45 * Math.min(1, cyc * 2, (4 - cyc) * 2) : 0;
          else if (m.anim === 'neck') m.obj.rotation.x = walk ? Math.sin(s * 3) * 0.08 : graze * down;
          else if (m.anim === 'head' && m.parent != null) m.obj.rotation.x = nod * down;
          else if (m.anim === 'head') m.obj.rotation.x = walk ? Math.sin(s * 3) * 0.08 : graze * down;
          else if (m.anim === 'wing') m.obj.rotation.z = (m.side || 1) * Math.sin(s * 9) * 0.6;
          else if (m.anim === 'tail') m.obj.rotation.y = Math.sin(s * 5) * 0.4;
        }
      }
    : undefined;
  return { object3d: shadowed(g), anim };
}

// Maillage simple (objets, outils) avec un des matériaux partagés
export function assembleMesh(geoOrMesh, mat = 'tool') {
  const o = geoOrMesh.isObject3D ? geoOrMesh : new THREE.Mesh(geoOrMesh, materiaux()[mat]);
  return { object3d: shadowed(o) };
}
