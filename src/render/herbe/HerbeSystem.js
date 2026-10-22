// Herbe en tapis des îles : brins procéduraux dessinés par anneaux autour du joueur (placement.js,
// materiau.js). Pour chaque tuile au mètre active : trois textures 65 × 65 (carte d'herbe du Worker,
// hauteur et couleur du sol, lues dans le maillage de la tuile) et trois maillages instanciés, un par
// anneau, qui partagent le même patch de brins et ne diffèrent que par le nombre de brins dessinés
// par cellule (drawRange) et la liste de leurs cellules (attribut d'instance aCell). Les listes ne
// sont recalculées que si le joueur ou la caméra bouge de plus de MOVE m, ou si la caméra tourne de
// plus de TURN rad. Herbe couchée par des pousseurs (joueur, animaux, aigle) et fauchée à l'épée
// (masque par tuile qui repousse).
import * as THREE from 'three';
import { ORIGIN } from '../../core/globals.js';
import { herbeMaterial } from './materiau.js';
import { paletteHerbe } from '../../world/islands/biomes.js';
import { BLADES, BLADE_VERTS, BLADE_WIDTH, HERBE_PRESETS, cellsForTile } from './placement.js';

const V = 65; // nœuds par côté d'une tuile (TILE + 1)
const MOVE = 0.25;
const TURN = (1 * Math.PI) / 180;
// herbe fauchée : masque de 129 × 129 sur la tuile (au demi-mètre), qui repousse en REGROW s
const CUT_N = 129;
const CUT_STEP = 0.5;
const REGROW = 120;
const PUSHERS = 8;
// préréglages du plus léger au plus dense
const PRESET_ORDER = ['low', 'medium', 'high'];
// masque vide partagé par les tuiles jamais fauchées
const NO_CUT = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
  tex.needsUpdate = true;
  return tex;
})();

// patch : BLADES brins de 7 sommets (côté, hauteur relative, rang du brin) et 5 triangles ; un
// anneau dessine les n premiers brins (drawRange de n × 15 indices)
function patchGeometry() {
  const pos = new Float32Array(BLADES * BLADE_VERTS * 3);
  const idx = new Uint16Array(BLADES * 15);
  const prof = [[-1, 0], [1, 0], [-1, 1 / 3], [1, 1 / 3], [-1, 2 / 3], [1, 2 / 3], [0, 1]];
  const tri = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];
  for (let b = 0; b < BLADES; b++) {
    for (let v = 0; v < BLADE_VERTS; v++) {
      const k = (b * BLADE_VERTS + v) * 3;
      pos[k] = prof[v][0];
      pos[k + 1] = prof[v][1];
      pos[k + 2] = b;
    }
    for (let q = 0; q < 15; q++) idx[b * 15 + q] = b * BLADE_VERTS + tri[q];
  }
  return { position: new THREE.BufferAttribute(pos, 3), index: new THREE.BufferAttribute(idx, 1) };
}

// Carte d'herbe de secours, pour une tuile sans champ du Worker : herbe là où le sol est peint en
// vert (ni chemin, ni sable, ni roche), densité (0,88) et hauteur (0,37 m) de prairie ordinaire.
export function champDeSecours(tile) {
  const out = new Uint8Array(V * V * 4);
  for (let k = 0; k < V * V; k++) {
    const r = tile.colors[k * 3];
    const g = tile.colors[k * 3 + 1];
    const b = tile.colors[k * 3 + 2];
    const green = g > r * 1.03 && g > b * 1.05 && tile.positions[k * 3 + 1] > 0.6;
    out[k * 4] = green ? 224 : 0;
    out[k * 4 + 1] = 79;
    out[k * 4 + 2] = 30;
  }
  return out;
}

function dataTexture(data, format, type, filter) {
  const tex = new THREE.DataTexture(data, V, V, format, type);
  tex.magFilter = filter;
  tex.minFilter = filter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export class HerbeSystem {
  constructor({ id }) {
    this.id = id;
    this.patch = patchGeometry();
    this.enabled = true;
    this.preset = HERBE_PRESETS.medium;
    this.presetName = 'medium';
    this.wanted = 'medium';
    this.camera = null;
    // uniformes communs à toutes les tuiles (par référence)
    this.shared = {
      uFocus: { value: new THREE.Vector3() },
      uRings: { value: new THREE.Vector4() },
      uCounts: { value: new THREE.Vector4() },
      uWidth: { value: BLADE_WIDTH },
      uPushers: { value: Array.from({ length: PUSHERS }, () => new THREE.Vector4()) },
    };
    this.regrowT = 0;
    this.applyPreset();
    this.tiles = new Set();
    this.lastFocus = new THREE.Vector3(Infinity, 0, Infinity);
    this.lastCam = new THREE.Vector3(Infinity, 0, Infinity);
    this.lastQuat = new THREE.Quaternion();
    this.dirty = true;
    this.frustum = new THREE.Frustum();
    this._m = new THREE.Matrix4();
    this._s = new THREE.Sphere(new THREE.Vector3(), 2.5);
    this._lists = [[], [], []];
    this.stats = { cells: 0, blades: 0, updateMs: 0, updates: 0 };
  }

  applyPreset() {
    const P = this.preset;
    this.shared.uRings.value.set(P.rings[0], P.rings[1], P.rings[2], P.fade);
    this.shared.uCounts.value.set(P.blades[0], P.blades[1], P.blades[2], BLADES);
    this.dirty = true;
  }

  // préréglage voulu (qualité du jeu) ; la résolution adaptative peut descendre en dessous (stepDown)
  setPreset(name) {
    if (!HERBE_PRESETS[name]) return;
    this.wanted = name;
    this.use(name);
  }

  use(name) {
    if (name === this.presetName) return;
    this.presetName = name;
    this.preset = HERBE_PRESETS[name];
    this.applyPreset();
  }

  // Le jeu ralentit : un cran d'herbe en moins (rend false s'il n'y en a plus à enlever)
  stepDown() {
    if (!this.enabled) return false;
    const i = PRESET_ORDER.indexOf(this.presetName);
    if (i <= 0) return false;
    this.use(PRESET_ORDER[i - 1]);
    return true;
  }

  // Le jeu a de la marge : un cran de plus, sans dépasser la qualité choisie
  stepUp() {
    const i = PRESET_ORDER.indexOf(this.presetName);
    const max = PRESET_ORDER.indexOf(this.wanted || 'medium');
    if (i >= max) return false;
    this.use(PRESET_ORDER[i + 1]);
    return true;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!on) for (const t of this.tiles) for (const r of t.herbe.rings) r.mesh.visible = false;
    this.dirty = true;
  }

  // Tuile au mètre ajoutée par IslandManager (t : sa tuile, tile : les données du Worker) ; id :
  // identifiant du terrain sous l'herbe (sans contour entre brins et sol), celui des îles par défaut ;
  // palette du biome de la tuile, sinon de l'île (île de départ : « maison »)
  addTile(e, t, tile, id = this.id) {
    const champ = dataTexture(tile.herbe ? new Uint8Array(tile.herbe) : champDeSecours(tile), THREE.RGBAFormat, THREE.UnsignedByteType, THREE.LinearFilter);
    const haut = new Float32Array(V * V);
    const sol = new Uint8Array(V * V * 4);
    const hautTex = dataTexture(haut, THREE.RedFormat, THREE.FloatType, THREE.NearestFilter);
    const solTex = dataTexture(sol, THREE.RGBAFormat, THREE.UnsignedByteType, THREE.LinearFilter);
    const palette = paletteHerbe(tile.biome || e.desc.biome || 'maison');
    const material = herbeMaterial({ id, shared: this.shared, champ, sol: solTex, haut: hautTex, coupe: NO_CUT, x0: t.x0, z0: t.z0, palette });
    const rings = [0, 1, 2].map((r) => {
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', this.patch.position);
      geo.setIndex(this.patch.index);
      const cells = new THREE.InstancedBufferAttribute(new Float32Array(2 * 256), 2);
      cells.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aCell', cells);
      geo.instanceCount = 0;
      const mesh = new THREE.Mesh(geo, material);
      mesh.name = `herbe-anneau-${r}`;
      mesh.frustumCulled = false;
      mesh.visible = false;
      t.group.add(mesh);
      return { mesh, geo, cells };
    });
    t.herbe = { e, champ, champData: champ.image.data, hautTex, solTex, haut, sol, material, rings, coupe: null, coupeTex: null };
    this.readGround(t);
    this.tiles.add(t);
    this.dirty = true;
  }

  // hauteur et couleur du sol lues dans le maillage de la tuile (à l'arrivée et après un terrassement)
  readGround(t) {
    const H = t.herbe;
    const pos = t.mesh.geometry.attributes.position.array;
    const col = t.mesh.geometry.attributes.color.array;
    for (let k = 0; k < V * V; k++) {
      H.haut[k] = pos[k * 3 + 1];
      H.sol[k * 4] = Math.round(Math.min(1, col[k * 3]) * 255);
      H.sol[k * 4 + 1] = Math.round(Math.min(1, col[k * 3 + 1]) * 255);
      H.sol[k * 4 + 2] = Math.round(Math.min(1, col[k * 3 + 2]) * 255);
      H.sol[k * 4 + 3] = 255;
    }
    H.hautTex.needsUpdate = true;
    H.solTex.needsUpdate = true;
  }

  removeTile(t) {
    const H = t.herbe;
    if (!H) return;
    for (const r of H.rings) {
      t.group.remove(r.mesh);
      r.geo.dispose();
    }
    H.material.dispose();
    H.coupeTex?.dispose();
    H.champ.dispose();
    H.hautTex.dispose();
    H.solTex.dispose();
    t.herbe = null;
    this.tiles.delete(t);
  }

  // Pousseurs de l'image : liste de { x, z (absolus), r (m), s (0 à 1) }, PUSHERS au plus
  setPushers(list) {
    const P = this.shared.uPushers.value;
    for (let k = 0; k < PUSHERS; k++) {
      const p = list[k];
      if (p) P[k].set(p.x - ORIGIN.x, p.z - ORIGIN.z, p.r, p.s);
      else P[k].set(0, 0, 0, 0);
    }
  }

  // Fauche l'herbe dans un disque (x, z absolus, rayon r) : rend la part de l'herbe touchée qui
  // était haute (0 si le disque ne touche que du sol nu ou de l'herbe déjà fauchée).
  cut(x, z, r) {
    let cells = 0;
    let grass = 0;
    for (const t of this.tiles) {
      if (!t.active) continue;
      const H = t.herbe;
      const lx = x - H.e.desc.x - t.x0;
      const lz = z - H.e.desc.z - t.z0;
      if (lx < -r || lz < -r || lx > V - 1 + r || lz > V - 1 + r) continue;
      if (!H.coupe) {
        H.coupe = new Uint8Array(CUT_N * CUT_N);
        H.coupeTex = new THREE.DataTexture(H.coupe, CUT_N, CUT_N, THREE.RedFormat, THREE.UnsignedByteType);
        H.coupeTex.unpackAlignment = 1;
        H.coupeTex.magFilter = H.coupeTex.minFilter = THREE.LinearFilter;
        H.material.uniforms.uCoupe.value = H.coupeTex;
      }
      const i0 = Math.max(0, Math.floor((lx - r) / CUT_STEP));
      const i1 = Math.min(CUT_N - 1, Math.ceil((lx + r) / CUT_STEP));
      const j0 = Math.max(0, Math.floor((lz - r) / CUT_STEP));
      const j1 = Math.min(CUT_N - 1, Math.ceil((lz + r) / CUT_STEP));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const d = Math.hypot(i * CUT_STEP - lx, j * CUT_STEP - lz);
          if (d > r) continue;
          const k = j * CUT_N + i;
          const v = Math.round(255 * Math.min(1, (r - d) / 0.4));
          const ci = Math.min(V - 1, Math.round(i * CUT_STEP));
          const cj = Math.min(V - 1, Math.round(j * CUT_STEP));
          const dens = H.champData[(cj * V + ci) * 4] / 255;
          cells++;
          grass += dens * (1 - H.coupe[k] / 255);
          if (v > H.coupe[k]) H.coupe[k] = v;
        }
      }
      H.coupeTex.needsUpdate = true;
    }
    return cells ? grass / cells : 0;
  }

  // Repousse de l'herbe fauchée (appelée à chaque image, travail une fois par seconde)
  regrow(dt) {
    this.regrowT += dt;
    if (this.regrowT < 1) return;
    const step = Math.max(1, Math.round((255 * this.regrowT) / REGROW));
    this.regrowT = 0;
    for (const t of this.tiles) {
      const H = t.herbe;
      if (!H.coupe) continue;
      let any = false;
      const c = H.coupe;
      for (let k = 0; k < c.length; k++) {
        if (!c[k]) continue;
        c[k] = c[k] > step ? c[k] - step : 0;
        if (c[k]) any = true;
      }
      if (any) H.coupeTex.needsUpdate = true;
      else {
        H.coupeTex.dispose();
        H.coupe = null;
        H.coupeTex = null;
        H.material.uniforms.uCoupe.value = NO_CUT;
      }
    }
  }

  // Une fois par image : focus = joueur (coordonnées de la scène)
  update(focus) {
    const cam = this.camera;
    if (!cam) return;
    this.shared.uFocus.value.copy(focus);
    if (!this.enabled) return;
    const moved = focus.distanceTo(this.lastFocus) > MOVE || cam.position.distanceTo(this.lastCam) > MOVE || cam.quaternion.angleTo(this.lastQuat) > TURN;
    if (!moved && !this.dirty) return;
    const t0 = performance.now();
    this.lastFocus.copy(focus);
    this.lastCam.copy(cam.position);
    this.lastQuat.copy(cam.quaternion);
    this.dirty = false;
    cam.updateMatrixWorld();
    this._m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this._m);
    const P = this.preset;
    let cells = 0;
    let blades = 0;
    for (const t of this.tiles) {
      const H = t.herbe;
      const show = t.active && t.group.visible !== false;
      if (!show) {
        for (const r of H.rings) r.mesh.visible = false;
        continue;
      }
      const e = H.e;
      // repère de l'île : scène = île + desc − ORIGIN
      const ox = e.desc.x - ORIGIN.x;
      const oz = e.desc.z - ORIGIN.z;
      const fx = focus.x - ox;
      const fz = focus.z - oz;
      const s = this._s;
      const visible = (cx, cz) => {
        const i = Math.max(0, Math.min(V - 1, Math.round(cx - t.x0)));
        const j = Math.max(0, Math.min(V - 1, Math.round(cz - t.z0)));
        s.center.set(cx + ox, H.haut[j * V + i] + 0.5, cz + oz);
        return this.frustum.intersectsSphere(s);
      };
      cells += cellsForTile(t.x0, t.z0, V - 1, fx, fz, P, this._lists, visible);
      for (let r = 0; r < 3; r++) {
        const list = this._lists[r];
        const R = H.rings[r];
        const count = list.length / 2;
        if (count > R.cells.count) {
          const cap = Math.max(count, R.cells.count * 2);
          R.cells = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
          R.cells.setUsage(THREE.DynamicDrawUsage);
          R.geo.setAttribute('aCell', R.cells);
        }
        R.cells.array.set(list);
        R.cells.clearUpdateRanges();
        R.cells.addUpdateRange(0, list.length);
        R.cells.needsUpdate = true;
        R.geo.instanceCount = count;
        R.geo.setDrawRange(0, P.blades[r] * 15);
        R.mesh.visible = count > 0 && P.blades[r] > 0;
        blades += count * P.blades[r];
      }
    }
    this.stats.cells = cells;
    this.stats.blades = blades;
    this.stats.updateMs = performance.now() - t0;
    this.stats.updates++;
  }
}

