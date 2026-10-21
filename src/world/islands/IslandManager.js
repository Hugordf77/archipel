// Gestionnaire des îles de l'archipel : toutes les silhouettes dès le démarrage, puis
// trois niveaux de détail (silhouette, île entière à 4 m, tuiles au mètre), lieux
// fusionnés par île, eau douce, végétation instanciée, faune, planchers, obstacles,
// relief pour la marche, découvertes et fenêtre de profondeur pour l'océan.
// La construction passe par une file de travaux plafonnée (4 ms par image).
import * as THREE from 'three';
import { U, ORIGIN, LAYER_SHADOW, nextId } from '../../core/globals.js';
import { toonMaterial, foliageMaterial, grassMaterial } from '../../render/shaders/materials.js';
import { ISLANDS, islandsInRange } from './regions.js';
import { KINDS, KIND_RADIUS, STRIDE, TREES } from './gen/kinds.js';
import { Surface, TILE } from './gen/surface.js';
import { bloomColorOf } from './gen/zones.js';
import { BIOMES, PALETTES_HERBE, paletteHerbe } from './biomes.js';
import { kindModel, CAP_COLORS, ROCKY } from '../../models/vegetation.js';
import { GRIMPE } from '../../models/physique.gen.js';
import { HerbeSystem } from '../../render/herbe/HerbeSystem.js';
import { partModel, rotY, recolorPart } from '../../models/lieux.js';
import { MAT } from '../../models/kit/materials.js';
import { buildRivers, buildLake, buildFallFoam } from '../env/rivers.js';
import { setGroundProvider, addObstacles, removeObstacles } from '../navigation.js';

export const LOD_DIST = [220, 600]; // au-delà : silhouette (LOD2)
const HYST = 30;
const DEPTH_SIZE = 1536;
const DEPTH_RES = 512;
const SMALL_DIST = 90; // petite végétation visible jusqu'à cette distance du centre des tuiles
const BUDGET_MS = 4;

const SHADOW_KINDS = new Set([...TREES, 'rocher', 'rocher_mousse', 'filon_cuivre', 'filon_fer', 'obsidienne', 'souche']);
const GRASSY = new Set(['herbe']);
// obstacles bas : on peut trébucher dessus en courant trop vite (les arbres, eux, arrêtent)
const LOW_KINDS = new Set(['arbuste', 'buisson_baies', 'buisson_fleuri', 'rocher', 'rocher_mousse', 'souche', 'bois_mort', 'filon_cuivre', 'filon_fer', 'obsidienne', 'cristal', 'potiron']);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

function composeItem(items, k, grass, out) {
  const sc = items[k + 5];
  const vr = items[k + 6];
  _p.set(items[k + 1], items[k + 2] - 0.04, items[k + 3]);
  _q.setFromAxisAngle(_up, items[k + 4]);
  if (grass) _s.set(sc * 1.3, sc * (1.1 + vr * 0.5), sc * 1.3);
  else _s.set(sc, sc, sc);
  return out.compose(_p, _q, _s);
}

function meshGeometry(d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(d.colors, 3));
  g.setIndex(new THREE.BufferAttribute(d.index, 1));
  g.computeBoundingSphere();
  return g;
}

// géométries des éléments de lieux mises en cache (maisons, lanternes… se répètent)
const BLOOMS = [];
const bloomColor = (i) => (BLOOMS[i] ||= new THREE.Color(bloomColorOf(i)));
const partCache = new Map();
const flat = (g) => (g.index ? g.toNonIndexed() : g);
function partGeometries(p) {
  const key = JSON.stringify([p.t, p.v, p.len && Math.round(p.len), p.w && Math.round(p.w), p.d && Math.round(p.d), p.size && Math.round(p.size * 10), p.kind, p.stone, p.sand, p.rise && Math.round(p.rise * 2), p.count, p.merchant, p.x1 !== undefined ? Math.round(Math.hypot(p.x1 - p.x, p.z1 - p.z)) : 0, p.y1 !== undefined ? Math.round((p.y1 - p.y) * 2) : 0]);
  let c = partCache.get(key);
  if (c) return c;
  const m = partModel(p);
  if (!m) return null;
  c = {
    solid: m.solid?.parts.length ? flat(m.solid.build()) : null,
    glow: m.glow?.parts.length ? flat(m.glow.build()) : null,
    anim: (m.anim || []).map((a) => ({ ...a, geo: a.builder.build() })),
    wheel: m.wheel ? m.wheel.build() : null,
    obstacles: m.obstacles || [],
    decks: m.decks || [],
  };
  if (partCache.size > 900) partCache.delete(partCache.keys().next().value);
  partCache.set(key, c);
  return c;
}

// Accumulateur de géométrie : les éléments de lieux sont transformés directement dans des tampons
// qui grossissent, ce qui évite un clone par élément et la fusion finale (≈ 40 ms sur un village).
const ACC_ATTRS = [['position', 3], ['normal', 3], ['color', 3], ['aId', 1], ['aTint', 1], ['aSway', 1]];
const _nm = new THREE.Matrix3();
const _bc = new THREE.Vector3();
const _bp = new THREE.Vector3();
class GeoAcc {
  constructor() {
    this.n = 0;
    this.cap = 0;
    this.a = {};
    // boîte englobante tenue à jour élément par élément (pas de passe complète à l'assemblage)
    this.box = new THREE.Box3();
  }

  reserve(n) {
    if (this.n + n <= this.cap) return;
    const cap = Math.max(4096, (this.n + n) * 2);
    for (const [name, size] of ACC_ATTRS) {
      const next = new Float32Array(cap * size);
      if (this.a[name]) next.set(this.a[name].subarray(0, this.n * size));
      this.a[name] = next;
    }
    this.cap = cap;
  }

  push(g, m, p) {
    const pos = g.attributes.position.array;
    const n = pos.length / 3;
    this.reserve(n);
    if (!g.boundingSphere) g.computeBoundingSphere();
    const bs = g.boundingSphere;
    _bc.copy(bs.center).applyMatrix4(m);
    this.box.expandByPoint(_bp.copy(_bc).addScalar(bs.radius));
    this.box.expandByPoint(_bp.copy(_bc).addScalar(-bs.radius));
    const o = this.n;
    const e = m.elements;
    const P = this.a.position;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3];
      const y = pos[i * 3 + 1];
      const z = pos[i * 3 + 2];
      const j = (o + i) * 3;
      P[j] = e[0] * x + e[4] * y + e[8] * z + e[12];
      P[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      P[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    const nor = g.attributes.normal?.array;
    if (nor) {
      const ne = _nm.getNormalMatrix(m).elements;
      const N = this.a.normal;
      for (let i = 0; i < n; i++) {
        const x = nor[i * 3];
        const y = nor[i * 3 + 1];
        const z = nor[i * 3 + 2];
        const j = (o + i) * 3;
        N[j] = ne[0] * x + ne[3] * y + ne[6] * z;
        N[j + 1] = ne[1] * x + ne[4] * y + ne[7] * z;
        N[j + 2] = ne[2] * x + ne[5] * y + ne[8] * z;
      }
    }
    for (const [name, size] of ACC_ATTRS) {
      if (name === 'position' || name === 'normal') continue;
      const src = g.attributes[name]?.array;
      if (src) this.a[name].set(src, o * size);
      else this.a[name].fill(name === 'color' ? 1 : 0, o * size, (o + n) * size);
    }
    if (p) recolorPart(p, this.a.color, this.a.aTint, o, o + n);
    this.n += n;
  }

  build() {
    const g = new THREE.BufferGeometry();
    // tampon presque plein : on garde une vue (pas de copie) ; sinon on copie pour rendre la mémoire
    const view = this.n > this.cap * 0.75;
    for (const [name, size] of ACC_ATTRS) {
      const arr = view ? this.a[name].subarray(0, this.n * size) : this.a[name].slice(0, this.n * size);
      g.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    g.boundingSphere = this.box.getBoundingSphere(new THREE.Sphere());
    g.boundingBox = this.box.clone();
    this.a = {};
    return g;
  }
}

export class IslandManager {
  constructor({ root, leafTex, onDiscover = null, hiddenItems = null, terraDiffs = null, onNear = null, onPoi = null }) {
    this.root = root;
    this.onDiscover = onDiscover;
    this.hiddenItems = hiddenItems;
    this.terraDiffs = terraDiffs;
    this.onNear = onNear;
    this.onPoi = onPoi;
    this.fauna = null;
    this.entries = new Map();
    this.jobs = [];
    this.inflight = 0;
    this.req = 0;
    this.last = { x: Infinity, z: Infinity };
    this.refreshT = 0;
    this.stats = { jobs: 0, jobMs: 0, maxFrameMs: 0, workerMs: [], tileMs: [], requests: 0, errors: 0 };
    this.discovered = new Set();
    this.seenPois = new Set();
    this.player = { x: 0, z: 0 };

    this.terrainId = nextId();
    this.mats = {
      tile: toonMaterial({ vertexColors: true, terrain: true, paths: false, id: this.terrainId, rim: 0.6 }),
      solid: toonMaterial({ ...MAT.solid }),
      glow: toonMaterial({ ...MAT.glow }),
      foliage: foliageMaterial({ leafTex, ...MAT.foliage }),
      grass: grassMaterial({ id: this.terrainId, palette: paletteHerbe('prairie') }),
      flower: toonMaterial({ ...MAT.flower }),
      far: toonMaterial({ vertexColors: true, rim: 0.4, outline: 0.6 }),
      silhouette: toonMaterial({ vertexColors: true, terrain: true, paths: false, id: this.terrainId, rim: 0.4 }),
      struct: toonMaterial({ ...MAT.struct }),
      structGlow: toonMaterial({ ...MAT.structGlow }),
      proxy: new THREE.MeshBasicMaterial(),
    };
    // herbe en tapis des tuiles au mètre (brins procéduraux, render/herbe/)
    this.herbe = new HerbeSystem({ id: this.terrainId });
    this._focus = new THREE.Vector3();
    this.proxyGeo = new THREE.IcosahedronGeometry(1, 1);
    this.anims = []; // ailes de moulin, roues à aubes

    this.worker = new Worker(new URL('./worldWorker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this.onMessage(e.data);
    this.worker.onerror = (e) => console.error('worker', e.message);

    this.depth = { cx: Infinity, cz: Infinity, pending: false, tex: null };
    setGroundProvider((x, z) => this.heightAt(x, z));
  }

  // ---------------------------------------------------------------------------
  update(dt, px, pz) {
    const t0 = performance.now();
    this.player.x = px;
    this.player.z = pz;
    this.refreshT -= dt;
    if (this.refreshT <= 0 || Math.hypot(px - this.last.x, pz - this.last.z) > 20) {
      this.refreshT = 0.25;
      this.last.x = px;
      this.last.z = pz;
      this.refresh(px, pz);
    }
    if (!this.depth.pending && Math.hypot(px - this.depth.cx, pz - this.depth.cz) > 220) this.requestDepth(px, pz);
    for (const e of this.entries.values()) if (e.want === 0 && e.plan) this.updateTiles(e, px, pz);
    this.herbe.update(this._focus.set(px - ORIGIN.x, 0, pz - ORIGIN.z));
    this.herbe.regrow(dt);
    this.smallT = (this.smallT || 0) - dt;
    if (this.smallT <= 0) {
      this.smallT = 0.3;
      this.updateSmall(px, pz);
    }
    this.pump();
    // travaux de construction, dans la limite du budget
    while (this.jobs.length && performance.now() - t0 < BUDGET_MS) {
      const job = this.jobs.shift();
      const j0 = performance.now();
      try {
        job();
      } catch (err) {
        this.stats.errors++;
        console.error('île : construction', err);
      }
      const jm = performance.now() - j0;
      this.stats.jobs++;
      this.stats.jobMs += jm;
      if (jm > 8) {
        (this.stats.slow ||= []).push([job.label || job.toString().slice(6, 60), Math.round(jm)]);
        if (this.stats.slow.length > 30) this.stats.slow.shift();
      }
    }
    // ailes des moulins et roues à aubes
    const wind = U.uWindStrength.value;
    for (const a of this.anims) {
      if (!a.obj.parent?.visible) continue;
      a.obj.rotation[a.axis] += dt * a.speed * (a.wind ? 0.4 + wind * 0.7 : 1);
    }
    const fm = performance.now() - t0;
    this.stats.maxFrameMs = Math.max(this.stats.maxFrameMs, fm);
    // répartition des images : combien dépassent le budget de 4 ms (et 8 ms)
    this.stats.frames = (this.stats.frames || 0) + 1;
    if (fm > BUDGET_MS + 0.5) this.stats.over4 = (this.stats.over4 || 0) + 1;
    if (fm > 8) this.stats.over8 = (this.stats.over8 || 0) + 1;
  }

  refresh(px, pz) {
    for (const desc of ISLANDS) {
      let e = this.entries.get(desc.id);
      if (!e) {
        const group = new THREE.Group();
        group.name = `ile-${desc.id}`;
        group.position.set(desc.x, 0, desc.z);
        this.root.add(group);
        e = { desc, group, want: -1, lod1: null, lod2: null, near: null, pending: [false, false, false], plan: null, surf: null, tiles: new Map(), tilePending: new Set(), window: null, hole: null, hidden: new Set(), obstacles: [], decks: [], items: null };
        this.entries.set(desc.id, e);
      }
      const d = Math.hypot(desc.x - px, desc.z - pz) - desc.r;
      e.d = d;
      // l'archipel est fini : au pire, une île reste en silhouette (jamais déchargée)
      let want = 2;
      for (let l = 0; l < 2; l++) {
        const lim = LOD_DIST[l] + (e.want !== -1 && e.want <= l ? HYST : 0);
        if (d < lim) {
          want = l;
          break;
        }
      }
      e.want = want;
      if (want === 0 && e.plan && !e.near && !e.nearQueued) {
        e.nearQueued = true;
        this.queueNear(e);
      }
      if (want !== 0 && e.near && e.d > 300) this.dropNear(e);
      if (e.lod1 && want === 2 && e.d > 900) this.dropLod1(e);
      this.applyVisibility(e);
      if (d < 70 && !this.discovered.has(desc.id)) {
        this.discovered.add(desc.id);
        this.onDiscover?.(desc);
      }
      // lieux découverts à pied
      if (e.plan && d < 60) {
        const lx = px - desc.x;
        const lz = pz - desc.z;
        for (const p of e.plan.pois) {
          if (this.seenPois.has(p.id) || !p.r && p.type !== 'oasis' && p.type !== 'rocher_baleine') continue;
          if (Math.hypot(p.x - lx, p.z - lz) < Math.max(25, p.r + 15)) {
            this.seenPois.add(p.id);
            this.onPoi?.(e, p);
          }
        }
      }
    }
  }

  applyVisibility(e) {
    const w = e.want;
    const has1 = !!e.lod1;
    if (e.lod2) e.lod2.visible = w === 2 || (w >= 0 && !has1);
    if (has1) {
      e.lod1.group.visible = w >= 0 && w <= 1;
      if (e.lod1.far) e.lod1.far.visible = !(w === 0 && e.near);
    }
    if (e.near) e.near.visible = w === 0;
    for (const t of e.tiles.values()) t.group.visible = w === 0 && t.active;
  }

  pump() {
    if (this.inflight >= 2) return;
    let best = null;
    for (const e of this.entries.values()) {
      if (e.want < 0) continue;
      let lod = -1;
      if (!e.lod2 && !e.pending[2] && e.want === 2) lod = 2;
      if (e.want <= 1 && !e.lod1 && !e.pending[1]) lod = 1;
      if (lod < 0) continue;
      const score = e.d + (lod === 2 ? 60 : 0);
      if (!best || score < best.score) best = { e, lod, score };
    }
    // tuiles au mètre : priorité aux plus proches
    let tile = null;
    for (const e of this.entries.values()) {
      if (e.want !== 0 || !e.plan || !e.window) continue;
      for (const key of e.window.keys) {
        if (e.tiles.has(key) || e.tilePending.has(key)) continue;
        const [tx, tz] = key.split(',').map(Number);
        const cx = e.desc.x + (tx + 0.5) * TILE;
        const cz = e.desc.z + (tz + 0.5) * TILE;
        const d = Math.hypot(cx - this.player.x, cz - this.player.z);
        if (!tile || d < tile.d) tile = { e, tx, tz, key, d };
      }
    }
    if (tile && (!best || tile.d < best.score + 50)) {
      tile.e.tilePending.add(tile.key);
      this.inflight++;
      this.worker.postMessage({ type: 'tile', desc: tile.e.desc, tx: tile.tx, tz: tile.tz, terra: this.terraDiffs?.(tile.e.desc.id) || null, req: ++this.req });
      return;
    }
    if (!best) return;
    best.e.pending[best.lod] = true;
    this.inflight++;
    this.stats.requests++;
    this.worker.postMessage({ type: 'island', desc: best.e.desc, lod: best.lod, req: ++this.req });
  }

  requestDepth(px, pz) {
    const cx = Math.round(px / 64) * 64;
    const cz = Math.round(pz / 64) * 64;
    const islands = islandsInRange(cx, cz, DEPTH_SIZE * 0.75);
    this.depth.pending = true;
    this.worker.postMessage({ type: 'depth', islands, cx, cz, size: DEPTH_SIZE, res: DEPTH_RES, req: ++this.req });
  }

  onMessage(m) {
    if (m.type === 'error') {
      this.inflight = Math.max(0, this.inflight - 1);
      this.stats.errors++;
      console.error('Worker de génération :', m.message);
      const e = this.entries.get(m.id);
      if (e && m.lod !== undefined) e.pending[m.lod] = false;
      return;
    }
    if (m.type === 'depth') {
      this.depth.pending = false;
      this.depth.cx = m.cx;
      this.depth.cz = m.cz;
      this.depth.size = m.size;
      if (!this.depth.tex || this.depth.res !== m.res) {
        this.depth.tex?.dispose();
        const tex = new THREE.DataTexture(m.data, m.res, m.res, THREE.RedFormat, THREE.HalfFloatType);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        this.depth.tex = tex;
        this.depth.res = m.res;
        U.uDepthTex.value = tex;
      } else this.depth.tex.image.data = m.data;
      this.depth.tex.needsUpdate = true;
      this.applyOrigin();
      return;
    }
    this.inflight = Math.max(0, this.inflight - 1);
    const e = this.entries.get(m.id);
    if (m.type === 'tile') {
      this.stats.tileMs.push(m.ms);
      if (this.stats.tileMs.length > 200) this.stats.tileMs.shift();
      if (m.planMs) this.stats.planMiss = (this.stats.planMiss || 0) + 1;
      if (!e) return;
      const key = `${m.tile.tx},${m.tile.tz}`;
      e.tilePending.delete(key);
      if (e.want !== 0) return;
      this.job('tuile', () => this.buildTile(e, m.tile));
      return;
    }
    this.stats.workerMs.push(m.ms);
    if (this.stats.workerMs.length > 200) this.stats.workerMs.shift();
    if (!e) return;
    // le LOD1 reste « en cours » jusqu'à son assemblage (lod1-assemblage), plusieurs travaux plus
    // tard : sinon pump le redemande entre-temps et l'île reçoit un second groupe « ile-4m »
    if (m.lod === 2 || e.want < 0) e.pending[m.lod] = false;
    if (e.want < 0) return;
    if (m.lod === 2) this.job('lod2', () => this.buildLod2(e, m));
    else this.queueLod1(e, m);
  }

  // ajoute un travail nommé (les travaux lents sont relevés avec leur nom dans stats.slow)
  job(label, fn) {
    fn.label = label;
    this.jobs.push(fn);
  }

  applyOrigin() {
    if (this.depth.size) {
      const s = this.depth.size;
      U.uDepthBounds.value.set(this.depth.cx - s / 2 - ORIGIN.x, this.depth.cz - s / 2 - ORIGIN.z, s, s);
    }
    for (const e of this.entries.values()) this.applyHole(e);
  }

  // ---------------------------------------------------------------------------
  // LOD2 : silhouette
  buildLod2(e, m) {
    if (!this.entries.has(e.desc.id) || e.lod2) return;
    const mesh = new THREE.Mesh(meshGeometry(m.mesh), this.mats.silhouette);
    mesh.name = 'silhouette';
    e.group.add(mesh);
    e.lod2 = mesh;
    this.applyVisibility(e);
  }

  // LOD1 : plan reçu, île entière au pas de 4 m, lieux, eau douce, végétation lointaine
  queueLod1(e, m) {
    const plan = m.plan;
    const group = new THREE.Group();
    group.name = 'ile-4m';
    group.visible = false;
    const L = { group, terrain: null, far: null, pois: null };
    this.job('lod1-relief', () => {
      if (!this.entries.has(e.desc.id)) return;
      e.plan = plan;
      e.surf = new Surface(plan, this.terraDiffs?.(e.desc.id) || null);
      e.decks = this.collectDecks(e, plan);
      const mat = toonMaterial({ vertexColors: true, terrain: true, paths: false, id: this.terrainId, rim: 0.6, hole: true });
      L.terrain = new THREE.Mesh(meshGeometry(m.mesh), mat);
      L.terrain.name = 'relief-4m';
      group.add(L.terrain);
      if (m.far && m.far.index.length) {
        L.far = new THREE.Mesh(meshGeometry(m.far), this.mats.far);
        L.far.name = 'vegetation-lointaine';
        group.add(L.far);
      }
    });
    this.job('lod1-eau', () => {
      if (!this.entries.has(e.desc.id)) return;
      const r = buildRivers(plan.rivers);
      if (r) group.add(r);
      for (const lake of plan.lakes) group.add(buildLake(lake, plan));
      const f = buildFallFoam(plan.falls);
      if (f) group.add(f);
    });
    // lieux : un travail par lieu, puis fusion par matériau
    const acc = { solid: new GeoAcc(), glow: new GeoAcc(), anim: [], obstacles: [] };
    const all = [...plan.pois.map((p) => ({ parts: p.parts })), { parts: plan.pathParts }, { parts: plan.micro.map((q) => ({ ...q, t: q.t })) }];
    const queue = all.flatMap((c) => c.parts);
    let cursor = 0;
    // découpé en tranches de 3 ms : le travail se remet en tête de file tant qu'il reste des éléments
    const collect = () => {
      cursor = this.collectParts(e, queue, cursor, acc);
      if (cursor < queue.length) this.jobs.unshift(collect);
    };
    collect.label = 'lieux';
    this.jobs.push(collect);
    this.job('lod1-assemblage', () => {
      if (!this.entries.has(e.desc.id)) return;
      if (acc.solid.n) {
        const mesh = new THREE.Mesh(acc.solid.build(), this.mats.struct);
        mesh.name = 'lieux';
        mesh.layers.enable(LAYER_SHADOW);
        group.add(mesh);
      }
      if (acc.glow.n) group.add(new THREE.Mesh(acc.glow.build(), this.mats.structGlow));
      for (const a of acc.anim) {
        group.add(a.holder);
        this.anims.push(a);
      }
      e.poiObstacles = acc.obstacles;
      e.pending[1] = false;
      // jamais deux groupes « ile-4m » : l'ancien, que plus rien ne cacherait, s'en va
      if (e.lod1) this.dropLod1(e);
      e.lod1 = L;
      e.group.add(group);
      this.applyHole(e);
      if (e.want === 0 && !e.near && !e.nearQueued) {
        e.nearQueued = true;
        this.queueNear(e);
      }
      this.applyVisibility(e);
    });
  }

  collectParts(e, parts, start, acc) {
    if (!this.entries.has(e.desc.id)) return parts.length;
    const surf = e.surf;
    const t0 = performance.now();
    let k = start;
    for (; k < parts.length; k++) {
      if (k > start && performance.now() - t0 > 3) break;
      const p = parts[k];
      const c = partGeometries(p);
      if (!c) continue;
      const ry = rotY(p.t, p.rot || 0);
      // posé sur le relief au mètre (sauf ce qui a sa propre hauteur : plates-formes, ponts, jetées…)
      const y = p.t === 'jetee' || p.t === 'barque_amarree' || p.t === 'casiers' ? 0 : p.y && p.y !== 0 ? p.y : surf.height(p.x, p.z);
      _m.compose(_p.set(p.x, y, p.z), _q.setFromAxisAngle(_up, ry), _s.set(1, 1, 1));
      if (c.solid) acc.solid.push(c.solid, _m, p);
      if (c.glow) acc.glow.push(c.glow, _m, null);
      for (const a of c.anim) {
        const holder = new THREE.Group();
        holder.position.set(a.pivot[0], a.pivot[1], a.pivot[2]).applyMatrix4(_m);
        holder.quaternion.setFromAxisAngle(_up, ry);
        const spin = new THREE.Group();
        spin.add(new THREE.Mesh(a.geo, this.mats.struct));
        holder.add(spin);
        acc.anim.push({ holder, obj: spin, axis: a.axis, speed: a.speed, wind: a.wind });
      }
      if (c.wheel && p.wx !== undefined) {
        const holder = new THREE.Group();
        holder.position.set(p.wx, p.wy + 0.4, p.wz);
        holder.quaternion.setFromAxisAngle(_up, ry);
        const spin = new THREE.Group();
        spin.add(new THREE.Mesh(c.wheel, this.mats.struct));
        holder.add(spin);
        acc.anim.push({ holder, obj: spin, axis: 'x', speed: 1.2, wind: false });
      }
      const cs = Math.cos(ry);
      const sn = Math.sin(ry);
      for (const [ox, oz, r] of c.obstacles) acc.obstacles.push({ x: e.desc.x + p.x + ox * cs + oz * sn, z: e.desc.z + p.z - ox * sn + oz * cs, r });
    }
    return k;
  }

  // planchers praticables (jetées, ponts) en coordonnées locales à l'île
  collectDecks(e, plan) {
    const decks = [];
    const parts = [...plan.pois.flatMap((p) => p.parts), ...plan.pathParts];
    for (const p of parts) {
      if (p.t !== 'jetee' && p.t !== 'pont' && p.t !== 'pont_corde') continue;
      const c = partGeometries(p);
      if (!c) continue;
      const ry = rotY(p.t, p.rot || 0);
      const cs = Math.cos(ry);
      const sn = Math.sin(ry);
      const base = p.t === 'jetee' ? 0 : p.y;
      for (const d of c.decks) {
        decks.push({
          x0: p.x + d.x0 * cs + d.z0 * sn, z0: p.z - d.x0 * sn + d.z0 * cs,
          x1: p.x + d.x1 * cs + d.z1 * sn, z1: p.z - d.x1 * sn + d.z1 * cs,
          w: d.w, y0: base + d.y0, y1: base + d.y1, sag: d.sag || 0,
        });
      }
    }
    return decks;
  }

  // ---------------------------------------------------------------------------
  // Premier plan : végétation complète, obstacles, faune, interactions
  queueNear(e) {
    const plan = e.plan;
    const near = new THREE.Group();
    near.name = 'premier-plan';
    near.visible = false;
    const { items, ids } = plan;
    const byKind = new Map();
    for (let k = 0; k < items.length; k += STRIDE) {
      const kind = items[k];
      let l = byKind.get(kind);
      if (!l) byKind.set(kind, (l = []));
      l.push(k);
    }
    const ctx = { kinds: new Map(), slotOf: new Map(), crowns: [], proxyOf: new Map(), obstacles: [], idx: new Map() };
    for (let k = 0; k < ids.length; k++) ctx.idx.set(ids[k], k);
    for (const [ki, list] of byKind) {
      // rempli par tranches de 3 ms : le travail se remet en tête de file jusqu'à la dernière instance
      const st = { i: 0, meshes: null };
      const job = () => {
        if (this.buildKind(e, near, plan, ki, list, ctx, st)) this.jobs.unshift(job);
      };
      job.label = 'vegetation';
      this.jobs.push(job);
    }
    this.job('premier-plan', () => {
      if (!this.entries.has(e.desc.id) || e.want !== 0 && e.d > 300) {
        e.nearQueued = false;
        return;
      }
      if (ctx.crowns.length) {
        const cnt = ctx.crowns.length / 5;
        const px = new THREE.InstancedMesh(this.proxyGeo, this.mats.proxy, cnt);
        for (let i = 0; i < cnt; i++) {
          const o = i * 5;
          _m.compose(_p.set(ctx.crowns[o], ctx.crowns[o + 1], ctx.crowns[o + 2]), _q.identity(), _s.set(ctx.crowns[o + 3] * 0.9, ctx.crowns[o + 3] * 0.9 * ctx.crowns[o + 4], ctx.crowns[o + 3] * 0.9));
          px.setMatrixAt(i, _m);
        }
        px.layers.set(LAYER_SHADOW);
        px.computeBoundingSphere();
        near.add(px);
        ctx.proxy = px;
      }
      e.items = ctx;
      e.near = near;
      e.group.add(near);
      e.obstacles = [...ctx.obstacles, ...(e.poiObstacles || [])];
      addObstacles(e.obstacles);
      const hidden = this.hiddenItems?.(e.desc.id);
      if (hidden) for (const id of hidden) this.setItemVisibleById(e, Number(id), false);
      this.fauna?.addIsland(e);
      this.onNear?.(e, true);
      this.applyVisibility(e);
    });
  }

  // touffes d'herbe récoltables : peintes dans la palette du tapis de leur biome (une par biome)
  grassMat(biome) {
    if (!biome || !PALETTES_HERBE[biome] || biome === 'prairie') return this.mats.grass;
    this.grassMats ||= new Map();
    let m = this.grassMats.get(biome);
    if (!m) this.grassMats.set(biome, (m = grassMaterial({ id: this.terrainId, palette: paletteHerbe(biome) })));
    return m;
  }

  buildKind(e, near, plan, ki, list, ctx, st) {
    if (!this.entries.has(e.desc.id)) return false;
    const items = plan.items;
    const kind = KINDS[ki];
    const model = kindModel(kind);
    const biome = BIOMES[e.desc.biome] || BIOMES.prairie;
    const rock = new THREE.Color(biome.pal.rock);
    const flowers = biome.flowers.map((c) => new THREE.Color(c));
    const count = list.length;
    const first = !st.meshes;
    const meshes = (st.meshes ||= []);
    const add = (geo, mat, shadow = false) => {
      if (!first) return meshes[st.slot++];
      const im = new THREE.InstancedMesh(geo, mat, count);
      im.name = kind;
      if (shadow) im.layers.enable(LAYER_SHADOW);
      meshes.push(im);
      near.add(im);
      return im;
    };
    st.slot = 0;
    const solid = model.solid ? add(model.solid, model.glow ? this.mats.glow : this.mats.solid, SHADOW_KINDS.has(kind)) : null;
    const leaves = model.clumpGeo ? add(model.clumpGeo, this.mats.foliage) : null;
    const grass = model.grassGeo ? add(model.grassGeo, this.grassMat(e.desc.biome)) : null;
    const flower = model.flowerGeo ? add(model.flowerGeo, this.mats.flower) : null;
    const rad = KIND_RADIUS[kind] || 0;
    const grimpe = GRIMPE[kind];
    if (first) ctx.kinds.set(ki, { meshes, grass: !!grass });
    const t0 = performance.now();
    let i = st.i;
    for (; i < count; i++) {
      if (i > st.i && (i & 63) === 0 && performance.now() - t0 > 3) break;
      const k = list[i];
      const idx = k / STRIDE;
      ctx.slotOf.set(idx, i);
      const x = items[k + 1];
      const y = items[k + 2];
      const z = items[k + 3];
      const rot = items[k + 4];
      const sc = items[k + 5];
      const vr = items[k + 6];
      composeItem(items, k, !!grass, _m);
      for (const im of meshes) im.setMatrixAt(i, _m);
      const b = 0.9 + vr * 0.18;
      if (solid) {
        if (ROCKY.has(kind)) _c.copy(rock).multiplyScalar(b);
        else if (kind === 'champi_geant' || kind === 'champi_petit') _c.copy(CAP_COLORS[Math.floor(vr * CAP_COLORS.length) % CAP_COLORS.length]);
        else _c.setRGB(b, b, b);
        solid.setColorAt(i, _c);
      }
      if (leaves) leaves.setColorAt(i, _c.setRGB(b, b * 1.01, b * 0.98));
      if (grass) grass.setColorAt(i, _c.setRGB(0.8 * b, 0.9 * b, 0.65 * b));
      if (flower) flower.setColorAt(i, flowers[Math.floor(vr * 997) % flowers.length]);
      if (rad > 0) {
        const o = { x: e.desc.x + x, z: e.desc.z + z, r: rad * sc, low: LOW_KINDS.has(kind) && sc < 1.15 };
        // tronc grimpable : pied du modèle (4 cm sous le sol, comme composeItem), rotation et échelle ;
        // il disparaît avec l'obstacle (île déchargée, arbre coupé)
        if (grimpe) o.grimpe = { kind, x: o.x, y: y - 0.04, z: o.z, rot, sc, def: grimpe };
        ctx.obstacles.push(o);
        ctx.idxObs ||= new Map();
        ctx.idxObs.set(idx, o);
      }
      if (model.crowns) {
        const pids = [];
        for (const [cx, cy, cz, cr, sq] of model.crowns) {
          pids.push(ctx.crowns.length / 5);
          ctx.crowns.push(x + (cx * Math.cos(rot) + cz * Math.sin(rot)) * sc, y + cy * sc, z + (-cx * Math.sin(rot) + cz * Math.cos(rot)) * sc, cr * sc, sq);
        }
        ctx.proxyOf.set(idx, pids);
      }
    }
    st.i = i;
    if (i < count) return true;
    for (const im of meshes) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
    }
    return false;
  }

  dropNear(e) {
    if (!e.near) return;
    e.near.traverse((o) => o.isInstancedMesh && o.dispose());
    e.group.remove(e.near);
    e.near = null;
    e.nearQueued = false;
    removeObstacles(e.obstacles);
    e.obstacles = [];
    e.items = null;
    e.hidden = new Set();
    for (const t of e.tiles.values()) this.disposeTile(e, t);
    e.tiles.clear();
    e.window = null;
    e.hole = null;
    this.applyHole(e);
    this.fauna?.removeIsland(e.desc.id);
    this.onNear?.(e, false);
  }

  dropLod1(e) {
    if (!e.lod1) return;
    e.lod1.group.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh && o.geometry && !partCacheHas(o.geometry)) o.geometry.dispose();
      if (o.material?.uniforms?.uHole) o.material.dispose();
    });
    this.anims = this.anims.filter((a) => !isAncestor(e.lod1.group, a.obj));
    e.group.remove(e.lod1.group);
    e.lod1 = null;
    e.plan = null;
    e.surf = null;
    e.decks = [];
  }

  // ---------------------------------------------------------------------------
  // Tuiles au mètre (3 × 3 autour du joueur) : quand toutes sont prêtes, elles
  // remplacent d'un coup le relief à 4 m (trou découpé dans son shader).
  updateTiles(e, px, pz) {
    const lx = px - e.desc.x;
    const lz = pz - e.desc.z;
    const ext = e.plan.ext;
    const tmax = Math.ceil(ext / TILE);
    const ctx = Math.floor(lx / TILE);
    const ctz = Math.floor(lz / TILE);
    const keyW = `${ctx},${ctz}`;
    if (e.window?.center === keyW) {
      if (!e.window.active) this.tryActivate(e);
      return;
    }
    const keys = [];
    for (let tz = ctz - 1; tz <= ctz + 1; tz++) {
      for (let tx = ctx - 1; tx <= ctx + 1; tx++) {
        if (tx < -tmax || tz < -tmax || tx >= tmax || tz >= tmax) continue;
        if (!this.tileHasLand(e.plan, tx, tz)) continue;
        keys.push(`${tx},${tz}`);
      }
    }
    e.window = { center: keyW, keys, active: false, rect: [(ctx - 1) * TILE, (ctz - 1) * TILE, (ctx + 2) * TILE, (ctz + 2) * TILE] };
    this.tryActivate(e);
  }

  tileHasLand(plan, tx, tz) {
    const { H, n, s, ext } = plan;
    const i0 = Math.max(0, Math.floor((tx * TILE + ext) / s));
    const i1 = Math.min(n - 1, Math.ceil(((tx + 1) * TILE + ext) / s));
    const j0 = Math.max(0, Math.floor((tz * TILE + ext) / s));
    const j1 = Math.min(n - 1, Math.ceil(((tz + 1) * TILE + ext) / s));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (H[j * n + i] > -1.5) return true;
    return false;
  }

  tryActivate(e) {
    const w = e.window;
    if (!w || w.active || !e.lod1) return;
    if (!w.keys.every((k) => e.tiles.has(k))) return;
    w.active = true;
    for (const [key, t] of e.tiles) {
      t.active = w.keys.includes(key);
      if (!t.active) {
        this.disposeTile(e, t);
        e.tiles.delete(key);
      }
    }
    e.hole = w.keys.length ? w.rect : null;
    this.applyHole(e);
    this.applyVisibility(e);
  }

  applyHole(e) {
    const mat = e.lod1?.terrain?.material;
    if (!mat) return;
    const v = mat.uniforms.uHole.value;
    if (!e.hole) v.set(1e9, 1e9, -1e9, -1e9);
    else v.set(e.desc.x + e.hole[0] - ORIGIN.x, e.desc.z + e.hole[1] - ORIGIN.z, e.desc.x + e.hole[2] - ORIGIN.x, e.desc.z + e.hole[3] - ORIGIN.z);
  }

  buildTile(e, tile) {
    if (!this.entries.has(e.desc.id) || e.want !== 0) return;
    const key = `${tile.tx},${tile.tz}`;
    if (e.tiles.has(key)) return;
    const group = new THREE.Group();
    group.name = `tuile-${key}`;
    const mesh = new THREE.Mesh(meshGeometry(tile), this.mats.tile);
    mesh.layers.enable(LAYER_SHADOW);
    group.add(mesh);
    // petite végétation (herbe, fleurs des champs, roseaux, blé, nénuphars) : matrices et
    // couleurs calculées par le Worker, simplement branchées ici
    const small = new THREE.Group();
    small.name = 'petite-vegetation';
    const kinds = new Map();
    const span = Math.max(1, tile.maxTop - tile.minTop);
    const sphere = new THREE.Sphere(new THREE.Vector3(tile.x0 + TILE / 2, (tile.maxTop + tile.minTop) / 2, tile.z0 + TILE / 2), Math.hypot(TILE / 2, TILE / 2, span / 2) + 3);
    for (const gq of tile.groups) {
      const kind = KINDS[gq.ki];
      const model = kindModel(kind);
      const geo = model.grassGeo || model.flowerGeo || model.solid;
      if (!geo) continue;
      const mat = model.grassGeo ? this.grassMat(e.desc.biome) : model.flowerGeo ? this.mats.flower : this.mats.solid;
      const im = new THREE.InstancedMesh(geo, mat, 0);
      im.instanceMatrix = new THREE.InstancedBufferAttribute(gq.mats, 16);
      im.instanceColor = new THREE.InstancedBufferAttribute(gq.cols, 3);
      im.count = gq.offs.length;
      im.boundingSphere = sphere;
      small.add(im);
      kinds.set(gq.ki, { im, list: gq.offs });
    }
    group.add(small);
    const t = { key, tx: tile.tx, tz: tile.tz, x0: tile.x0, z0: tile.z0, group, mesh, small, kinds, data: tile, active: false, hidden: new Set() };
    // index construits à la demande (récolte, éléments cachés) : rien à payer à l'arrivée de la tuile
    let slots = null;
    let idIndex = null;
    Object.defineProperty(t, 'slots', {
      get: () => {
        if (!slots) {
          slots = new Map();
          for (const [ki, rec] of kinds) rec.list.forEach((k, i) => slots.set(k / STRIDE, { ki, i }));
        }
        return slots;
      },
    });
    Object.defineProperty(t, 'idIndex', {
      get: () => {
        if (!idIndex) {
          idIndex = new Map();
          for (let k = 0; k < tile.ids.length; k++) idIndex.set(tile.ids[k], k);
        }
        return idIndex;
      },
    });
    group.visible = false;
    e.group.add(group);
    e.tiles.set(key, t);
    this.herbe.addTile(e, t, tile);
    const hidden = this.hiddenItems?.(e.desc.id);
    if (hidden && hidden.length) for (const id of hidden) if (t.idIndex.has(Number(id))) this.setTileItemVisible(t, t.idIndex.get(Number(id)), false);
    this.tryActivate(e);
  }

  disposeTile(e, t) {
    this.herbe.removeTile(t);
    t.mesh.geometry.dispose();
    t.small.traverse((o) => o.isInstancedMesh && o.dispose());
    e.group.remove(t.group);
  }

  // petite végétation visible seulement de près
  updateSmall(px, pz) {
    for (const e of this.entries.values()) {
      for (const t of e.tiles.values()) {
        const cx = e.desc.x + t.x0 + TILE / 2;
        const cz = e.desc.z + t.z0 + TILE / 2;
        t.small.visible = Math.hypot(cx - px, cz - pz) < SMALL_DIST + TILE * 0.5;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Récolte : éléments de l'île (arbres, rochers…) et des tuiles (fleurs, herbes…)
  setItemVisibleById(e, id, vis) {
    if (e.items?.idx.has(id)) return this.setItemVisible(e, { tile: null, idx: e.items.idx.get(id) }, vis);
    for (const t of e.tiles.values()) if (t.idIndex.has(id)) return this.setTileItemVisible(t, t.idIndex.get(id), vis);
    return false;
  }

  setItemVisible(e, ref, vis) {
    if (ref.tile) {
      const t = e.tiles.get(ref.tile);
      return t ? this.setTileItemVisible(t, ref.idx, vis) : false;
    }
    const ctx = e.items;
    if (!ctx) return false;
    const idx = ref.idx;
    if (!vis === e.hidden.has(idx)) return true;
    const items = e.plan.items;
    const rec = ctx.kinds.get(items[idx * STRIDE]);
    if (!rec) return false;
    const i = ctx.slotOf.get(idx);
    if (vis) composeItem(items, idx * STRIDE, rec.grass, _m);
    else _m.makeScale(0, 0, 0);
    for (const im of rec.meshes) {
      im.setMatrixAt(i, _m);
      im.instanceMatrix.needsUpdate = true;
    }
    const o = ctx.idxObs?.get(idx);
    if (o) (vis ? addObstacles : removeObstacles)([o]);
    const pids = ctx.proxyOf.get(idx);
    if (pids && ctx.proxy) {
      for (const p of pids) {
        const c = p * 5;
        const cr = ctx.crowns;
        if (vis) _m.compose(_p.set(cr[c], cr[c + 1], cr[c + 2]), _q.identity(), _s.set(cr[c + 3] * 0.9, cr[c + 3] * 0.9 * cr[c + 4], cr[c + 3] * 0.9));
        else _m.makeScale(0, 0, 0);
        ctx.proxy.setMatrixAt(p, _m);
      }
      ctx.proxy.instanceMatrix.needsUpdate = true;
    }
    if (vis) e.hidden.delete(idx);
    else e.hidden.add(idx);
    return true;
  }

  setTileItemVisible(t, idx, vis) {
    if (!vis === t.hidden.has(idx)) return true;
    const slot = t.slots.get(idx);
    if (!slot) return false;
    const rec = t.kinds.get(slot.ki);
    if (vis) composeItem(t.data.items, idx * STRIDE, GRASSY.has(KINDS[slot.ki]), _m);
    else _m.makeScale(0, 0, 0);
    rec.im.setMatrixAt(slot.i, _m);
    rec.im.instanceMatrix.needsUpdate = true;
    if (vis) t.hidden.delete(idx);
    else t.hidden.add(idx);
    return true;
  }

  // éléments récoltables à portée d'un point (coordonnées absolues)
  itemsNear(x, z, r) {
    const out = [];
    for (const e of this.entries.values()) {
      if (!e.items || !e.plan) continue;
      const lx = x - e.desc.x;
      const lz = z - e.desc.z;
      if (Math.abs(lx) > e.plan.ext + r || Math.abs(lz) > e.plan.ext + r) continue;
      const it = e.plan.items;
      const ids = e.plan.ids;
      for (let k = 0; k < it.length; k += STRIDE) {
        const dx = it[k + 1] - lx;
        const dz = it[k + 3] - lz;
        if (dx * dx + dz * dz > r * r) continue;
        const idx = k / STRIDE;
        if (e.hidden.has(idx)) continue;
        out.push({ e, ref: { tile: null, idx }, id: ids[idx], kind: KINDS[it[k]], x: e.desc.x + it[k + 1], y: it[k + 2], z: e.desc.z + it[k + 3], scale: it[k + 5], variant: it[k + 6], d: Math.sqrt(dx * dx + dz * dz) });
      }
      for (const t of e.tiles.values()) {
        if (!t.active) continue;
        if (lx < t.x0 - r || lx > t.x0 + TILE + r || lz < t.z0 - r || lz > t.z0 + TILE + r) continue;
        const ti = t.data.items;
        for (let k = 0; k < ti.length; k += STRIDE) {
          const dx = ti[k + 1] - lx;
          const dz = ti[k + 3] - lz;
          if (dx * dx + dz * dz > r * r) continue;
          const idx = k / STRIDE;
          if (t.hidden.has(idx)) continue;
          out.push({ e, ref: { tile: t.key, idx }, id: t.data.ids[idx], kind: KINDS[ti[k]], x: e.desc.x + ti[k + 1], y: ti[k + 2], z: e.desc.z + ti[k + 3], scale: ti[k + 5], variant: ti[k + 6], d: Math.sqrt(dx * dx + dz * dz) });
        }
      }
    }
    return out;
  }

  // espèce d'un identifiant d'élément (pour la repousse)
  kindOfId(e, id) {
    const k = e.items?.idx.get(id);
    if (k !== undefined) return KINDS[e.plan.items[k * STRIDE]];
    for (const t of e.tiles.values()) {
      const q = t.idIndex.get(id);
      if (q !== undefined) return KINDS[t.data.items[q * STRIDE]];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Terrassement à la pelle : un point entier du maillage au mètre, par pas de 0,5 m
  vertexAt(x, z) {
    const e = this.entryAt(x, z);
    if (!e) return null;
    const lx = x - e.desc.x;
    const lz = z - e.desc.z;
    const i = Math.round(lx);
    const j = Math.round(lz);
    const t = e.tiles.get(`${Math.floor(i / TILE)},${Math.floor(j / TILE)}`);
    if (!t || !t.active) return null;
    return { e, i, j, h: e.surf.height(i, j) };
  }

  terraform(e, i, j) {
    // la surface lit les différences de la sauvegarde ; on recalcule les sommets voisins
    e.surf.terraCount = (e.surf.terraCount || 0) + 1;
    for (const t of e.tiles.values()) {
      const pos = t.mesh.geometry.attributes.position;
      const nor = t.mesh.geometry.attributes.normal;
      const col = t.mesh.geometry.attributes.color;
      let touched = false;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const vi = i + di - t.x0;
          const vj = j + dj - t.z0;
          if (vi < 0 || vj < 0 || vi > TILE || vj > TILE) continue;
          const k = vj * (TILE + 1) + vi;
          const x = i + di;
          const z = j + dj;
          const h = e.surf.height(x, z);
          pos.setY(k, h);
          const hl = e.surf.height(x - 1, z);
          const hr = e.surf.height(x + 1, z);
          const hd = e.surf.height(x, z - 1);
          const hu = e.surf.height(x, z + 1);
          const nx = (hl - hr) / 2;
          const nz = (hd - hu) / 2;
          const inv = 1 / Math.sqrt(nx * nx + 1 + nz * nz);
          nor.setXYZ(k, nx * inv, inv, nz * inv);
          if (di === 0 && dj === 0) col.setXYZ(k, 0.79, 0.64, 0.5);
          touched = true;
        }
      }
      if (touched) {
        pos.needsUpdate = true;
        nor.needsUpdate = true;
        col.needsUpdate = true;
        // l'herbe suit le sol creusé (hauteur et couleur)
        if (t.herbe) this.herbe.readGround(t);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Requêtes du jeu
  entryAt(x, z) {
    for (const e of this.entries.values()) {
      if (!e.surf) continue;
      const ext = e.plan.ext;
      if (Math.abs(x - e.desc.x) < ext && Math.abs(z - e.desc.z) < ext) return e;
    }
    return null;
  }

  heightAt(x, z) {
    let best = null;
    for (const e of this.entries.values()) {
      if (!e.surf) continue;
      const lx = x - e.desc.x;
      const lz = z - e.desc.z;
      const ext = e.plan.ext - 1;
      if (Math.abs(lx) > ext || Math.abs(lz) > ext) continue;
      let h = e.surf.height(lx, lz);
      for (const d of e.decks) {
        const dx = d.x1 - d.x0;
        const dz = d.z1 - d.z0;
        const l2 = dx * dx + dz * dz || 1e-9;
        const t = ((lx - d.x0) * dx + (lz - d.z0) * dz) / l2;
        if (t < 0 || t > 1) continue;
        const ex = lx - d.x0 - dx * t;
        const ez = lz - d.z0 - dz * t;
        if (ex * ex + ez * ez > (d.w / 2) * (d.w / 2)) continue;
        const y = d.y0 + (d.y1 - d.y0) * t - Math.sin(t * Math.PI) * d.sag;
        if (y > h - 0.4) h = Math.max(h, y);
      }
      if (best === null || h > best) best = h;
    }
    return best;
  }

  // niveau de l'eau (lacs et rivières), sinon la mer
  waterLevelAt(x, z) {
    for (const e of this.entries.values()) {
      if (!e.surf) continue;
      const lx = x - e.desc.x;
      const lz = z - e.desc.z;
      if (Math.abs(lx) > e.plan.ext || Math.abs(lz) > e.plan.ext) continue;
      return e.surf.waterLevel(lx, lz);
    }
    return 0;
  }

  nearest(x, z) {
    let best = null;
    for (const e of this.entries.values()) {
      const d = Math.hypot(e.desc.x - x, e.desc.z - z) - e.desc.r;
      if (!best || d < best.d) best = { desc: e.desc, d, entry: e };
    }
    return best;
  }

  async preload(px, pz, timeout = 7000) {
    const t0 = performance.now();
    // préchauffage pendant l'écran de chargement : modèles de végétation et maisons, construits une fois
    for (const kind of KINDS) {
      try {
        kindModel(kind);
      } catch {
        /* espèce sans modèle */
      }
    }
    for (let v = 0; v < 3; v++) for (const merchant of [false, true]) partGeometries({ t: 'maison', v, merchant });
    for (const t of ['moulin', 'feu_camp', 'cairn', 'ruines', 'cabane', 'epave', 'barque_echouee', 'phare', 'ruche', 'banc_vue', 'tonneaux', 'panneau', 'potager', 'etal', 'totem', 'puits', 'arbre_geant', 'tour_guet', 'temple', 'arche']) {
      try {
        partGeometries({ t, x: 0, z: 0, y: 0, rot: 0 });
      } catch {
        /* modèle qui exige d'autres paramètres : construit à la demande */
      }
    }
    this.refresh(px, pz);
    while (performance.now() - t0 < timeout) {
      this.pump();
      while (this.jobs.length) {
        try {
          this.jobs.shift()();
        } catch (err) {
          console.error(err);
        }
      }
      const missing = [...this.entries.values()].some((e) => (e.want >= 0 && e.want <= 1 && !e.lod1) || (e.want === 2 && !e.lod2));
      if (!missing && !this.depth.pending && this.depth.tex) return true;
      if (!this.depth.pending && !this.depth.tex) this.requestDepth(px, pz);
      await new Promise((r) => setTimeout(r, 30));
    }
    return false;
  }

  info() {
    const shown = [0, 0, 0];
    let tiles = 0;
    for (const e of this.entries.values()) {
      if (e.want === 0 && e.near) shown[0]++;
      else if (e.lod1?.group.visible) shown[1]++;
      else if (e.lod2?.visible) shown[2]++;
      tiles += [...e.tiles.values()].filter((t) => t.active).length;
    }
    const w = this.stats.workerMs;
    const tm = this.stats.tileMs;
    return {
      islands: this.entries.size,
      shown,
      tiles,
      inflight: this.inflight,
      jobs: this.jobs.length,
      workerAvg: w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0,
      workerMax: w.length ? Math.max(...w) : 0,
      tileAvg: tm.length ? tm.reduce((a, b) => a + b, 0) / tm.length : 0,
      tileMax: tm.length ? Math.max(...tm) : 0,
      jobAvg: this.stats.jobs ? this.stats.jobMs / this.stats.jobs : 0,
      maxFrameMs: this.stats.maxFrameMs,
      frames: this.stats.frames || 0,
      over4: this.stats.over4 || 0,
      over8: this.stats.over8 || 0,
      errors: this.stats.errors,
    };
  }
}

function partCacheHas(geo) {
  for (const c of partCache.values()) if (c.solid === geo || c.glow === geo || c.wheel === geo || c.anim.some((a) => a.geo === geo)) return true;
  return false;
}
function isAncestor(parent, obj) {
  for (let o = obj; o; o = o.parent) if (o === parent) return true;
  return false;
}
