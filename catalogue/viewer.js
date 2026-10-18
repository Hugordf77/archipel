// Vue 3D d'une fiche (ou d'une comparaison de 2 à 4 modèles à la même échelle) : orbite et
// rotation automatique, sol quadrillé au mètre, silhouette du personnage (1,4 m), lumière
// jour / soir / nuit, rendu du jeu (peinture et contours du Pipeline) ou rendu brut, fil de fer,
// boîte englobante cotée en mètres, animations des modèles.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { U } from '../src/core/globals.js';
import { Pipeline } from '../src/render/Pipeline.js';
import { prepareUniforms, setLight, skyBackground, boxOf, statsOf, makeSilhouette, makeGrid, disposeObject, fmtMeters } from './scene.js';

const GAP = 1.2; // écart entre deux modèles comparés (m)

export class Viewer {
  constructor(stage) {
    this.stage = stage;
    this.canvas = document.createElement('canvas');
    this.dims = document.createElement('div');
    this.dims.className = 'dims';
    stage.prepend(this.canvas);
    stage.append(this.dims);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.pipeline = new Pipeline(this.renderer);
    // fiche vue de près : qualité haute, comme les vignettes (traits moins crénelés)
    this.pipeline.settings.quality = 'high';
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 500);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.autoRotateSpeed = 1.1;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    // aides (grille, silhouette, boîte) : matériaux simples, dessinés par-dessus la peinture
    // après une passe de profondeur du modèle (le composite du jeu ne garde que les matériaux
    // toon à deux sorties)
    this.helpers = new THREE.Scene();
    this.silhouette = makeSilhouette();
    this.helpers.add(this.silhouette);
    this.boxHelper = new THREE.Box3Helper(new THREE.Box3(), 0x9f6b48);
    this.boxHelper.material.depthTest = false;
    this.boxHelper.renderOrder = 9;
    this.helpers.add(this.boxHelper);
    this.depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.wireMat = new THREE.MeshBasicMaterial({ color: 0x5b4a63, wireframe: true });
    this.items = [];
    this.grid = null;
    this.opts = { light: 'jour', render: 'jeu', wire: false, bbox: true, rotate: true, anim: true, grid: true, scale: true };
    this.t = 0;
    this.running = false;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(stage);
    this.labels = [];
  }

  resize() {
    const r = this.stage.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.pipeline.setSize(r.width, r.height);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }

  // models : [{ m, params }] — un modèle (fiche) ou 2 à 4 (comparaison)
  show(models, { keepView = false } = {}) {
    this.clear();
    let x = 0;
    for (const { m, params } of models) {
      const built = m.build(params);
      const obj = built.object3d;
      const holder = new THREE.Group();
      holder.add(obj);
      this.root.add(holder);
      const box = boxOf(holder);
      // rangés de gauche à droite, à la même échelle
      holder.position.set(x - box.min.x, 0, 0);
      x += box.max.x - box.min.x + GAP;
      this.items.push({ m, params, holder, obj, anim: built.anim, stats: statsOf(obj) });
    }
    // centrage de l'ensemble
    const all = boxOf(this.root);
    const cx = (all.min.x + all.max.x) / 2;
    const cz = (all.min.z + all.max.z) / 2;
    for (const it of this.items) {
      it.holder.position.x -= cx;
      it.holder.position.z -= cz;
    }
    this.box = boxOf(this.root);
    const size = this.box.getSize(new THREE.Vector3());
    // silhouette à gauche du premier modèle
    this.silhouette.position.set(this.box.min.x - 0.75, 0, this.box.max.z - Math.min(size.z, 1.2) * 0.5);
    if (this.grid) {
      this.helpers.remove(this.grid);
      this.grid.geometry.dispose();
    }
    this.grid = makeGrid(Math.max(size.x + 2, size.z), this.opts.light === 'nuit' ? 0x7a74a8 : 0xb69a7a);
    this.helpers.add(this.grid);
    if (!keepView) this.frame();
    this.apply();
    this.buildLabels();
    return this.items;
  }

  frame() {
    const box = this.box.clone().union(new THREE.Box3().setFromObject(this.silhouette));
    this.silhouette.updateMatrixWorld(true);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y * 1.15, size.z, 0.6);
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = (r * 0.66) / Math.tan(fov / 2) + 0.4;
    this.camera.position.set(center.x + dist * 0.5, center.y + dist * 0.38, center.z + dist * 0.78);
    this.camera.near = Math.max(0.01, dist / 300);
    this.camera.far = dist * 50 + 50;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.minDistance = r * 0.25;
    this.controls.maxDistance = dist * 4;
    this.controls.update();
  }

  clear() {
    for (const it of this.items) {
      this.root.remove(it.holder);
      disposeObject(it.obj);
    }
    this.items = [];
  }

  set(key, value) {
    this.opts[key] = value;
    this.apply();
  }

  apply() {
    const o = this.opts;
    prepareUniforms();
    setLight(o.light);
    skyBackground(o.light, this.scene.background);
    if (this.grid) {
      this.grid.visible = o.grid;
      this.grid.material.color.set(o.light === 'nuit' ? 0x7a74a8 : 0xb69a7a);
    }
    this.silhouette.visible = o.scale;
    this.controls.autoRotate = o.rotate;
    this.boxHelper.visible = o.bbox && this.items.length === 1;
    if (this.box) this.boxHelper.box.copy(this.box);
    this.dims.hidden = !o.bbox;
    this.pipeline.forceShadow = true;
  }

  // étiquettes : cotes de la boîte (fiche) ou noms des modèles (comparaison)
  buildLabels() {
    this.dims.replaceChildren();
    this.labels = [];
    const add = (cls, text, at) => {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      this.dims.append(el);
      this.labels.push({ el, at });
    };
    const b = this.box;
    if (this.items.length === 1) {
      const s = b.getSize(new THREE.Vector3());
      add('dim-label', fmtMeters(s.x), new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, b.max.z));
      add('dim-label', fmtMeters(s.y), new THREE.Vector3(b.max.x, (b.min.y + b.max.y) / 2, b.max.z));
      add('dim-label', fmtMeters(s.z), new THREE.Vector3(b.max.x, b.min.y, (b.min.z + b.max.z) / 2));
    } else {
      for (const it of this.items) {
        const ib = boxOf(it.holder);
        add('compare-label', `${it.m.id} · ${it.m.name}`, new THREE.Vector3((ib.min.x + ib.max.x) / 2, ib.min.y, ib.max.z + 0.35));
      }
    }
  }

  placeLabels() {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      v.copy(l.at).project(this.camera);
      const hidden = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1;
      l.el.style.display = hidden ? 'none' : '';
      l.el.style.left = `${((v.x + 1) / 2) * r.width}px`;
      l.el.style.top = `${((1 - v.y) / 2) * r.height}px`;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frameStep(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  frameStep(dt) {
    const o = this.opts;
    this.t += dt;
    U.uTime.value += dt;
    if (o.anim) for (const it of this.items) it.anim?.(dt, this.t);
    this.controls.update();
    // les deux renderers (vignettes, fiche) ont chacun leur carte d'ombre
    U.uShadowMap.value = this.pipeline.shadow.rt.depthTexture;
    this.pipeline.shadowCenter.copy(this.controls.target);
    const r = this.renderer;
    if (o.wire) {
      this.scene.overrideMaterial = this.wireMat;
      r.setRenderTarget(null);
      r.autoClear = true;
      r.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
    } else if (o.render === 'jeu') {
      this.pipeline.render(this.scene, this.camera);
      // profondeur du modèle dans l'image finale, pour que les aides passent derrière lui
      const bg = this.scene.background;
      this.scene.background = null;
      this.scene.overrideMaterial = this.depthOnly;
      r.setRenderTarget(null);
      r.autoClear = false;
      r.clearDepth();
      r.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
      this.scene.background = bg;
    } else {
      this.pipeline.shadow.render(r, this.scene, this.pipeline.shadowCenter);
      r.setRenderTarget(null);
      r.autoClear = true;
      r.render(this.scene, this.camera);
    }
    r.autoClear = false;
    r.render(this.helpers, this.camera);
    r.autoClear = true;
    if (o.bbox) this.placeLabels();
  }

  // image de la vue courante (planches contact, captures)
  snapshot() {
    this.frameStep(0);
    return this.canvas.toDataURL('image/png');
  }
}
