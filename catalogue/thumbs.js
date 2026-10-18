// Vignettes du catalogue : un seul WebGLRenderer partagé (rendu du jeu, Pipeline à 256 px),
// rendu paresseux des cartes visibles (IntersectionObserver), cache IndexedDB par identifiant
// et empreinte du code source du modèle (modifier un constructeur régénère sa vignette).
import * as THREE from 'three';
import { U } from '../src/core/globals.js';
import { Pipeline } from '../src/render/Pipeline.js';
import { prepareUniforms, setLight, boxOf, frameBox, disposeObject } from './scene.js';

const SIZE = 256;
const VERSION = 2; // à changer si le cadrage ou le rendu des vignettes change
const DB = 'archipel-catalogue';
const STORE = 'vignettes';

// code source brut des modèles (servi par le middleware de dev, hors du graphe de modules pour
// ne pas recharger la page à chaque retouche), pour l'empreinte des vignettes
const COMMON = ['assemble', 'materials', 'palette', 'shapes', 'formes', 'laine', 'accessoires', 'pieces'].map((k) => `src/models/kit/${k}.js`);
const textCache = new Map();
export async function sourceText(path) {
  if (!textCache.has(path)) {
    textCache.set(path, fetch(`/__catalogue/source?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''));
  }
  return textCache.get(path);
}
export function forgetSources() {
  textCache.clear();
}
function fnv(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
export async function fingerprint(m, params) {
  const own = await sourceText(m.source);
  const common = await Promise.all(COMMON.map(sourceText));
  return fnv([VERSION, m.id, JSON.stringify(params), own, ...common].join('\u0000'));
}

// petite base IndexedDB (clé → data URL) ; le catalogue marche aussi sans elle
let dbp = null;
function db() {
  dbp ||= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}
async function cacheGet(key) {
  const d = await db();
  if (!d) return null;
  return new Promise((resolve) => {
    const r = d.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  });
}
async function cachePut(key, url) {
  const d = await db();
  if (!d) return;
  d.transaction(STORE, 'readwrite').objectStore(STORE).put(url, key);
}

export class Thumbs {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.pipeline = new Pipeline(this.renderer);
    this.pipeline.settings.quality = 'high';
    this.pipeline.dynScale = 1;
    this.pipeline.setSize(SIZE, SIZE);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f3e6cf');
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 500);
    this.queue = [];
    this.busy = false;
    this.urls = new Map(); // id → data URL de la session
    this.observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        this.observer.unobserve(e.target);
        this.request(e.target.__model, e.target, e.target.__params);
      }
    }, { rootMargin: '300px 0px' });
  }

  // une carte entre dans la file quand elle approche de l'écran ; params : réglages par défaut
  watch(el, m, params) {
    el.__model = m;
    el.__params = params;
    const known = this.urls.get(m.id);
    if (known) this.show(el, known);
    else this.observer.observe(el);
  }

  show(el, url) {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = url;
    el.replaceChildren(img);
  }

  async request(m, el, params) {
    const key = `${m.id}:${await fingerprint(m, params)}`;
    const cached = await cacheGet(key);
    if (cached) {
      this.urls.set(m.id, cached);
      this.show(el, cached);
      return;
    }
    this.queue.push({ m, el, key, params });
    this.pump();
  }

  // une vignette par image d'animation, pour garder la page fluide
  pump() {
    if (this.busy || !this.queue.length) return;
    this.busy = true;
    requestAnimationFrame(() => {
      const job = this.queue.shift();
      try {
        const url = this.render(job.m, job.params);
        this.urls.set(job.m.id, url);
        cachePut(job.key, url);
        this.show(job.el, url);
      } catch (err) {
        console.warn(`vignette ${job.m.id}`, err);
        job.el.replaceChildren(Object.assign(document.createElement('span'), { className: 'muted', textContent: '—' }));
      }
      this.busy = false;
      this.pump();
    });
  }

  // rendu du jeu (peinture et contours) d'un modèle en lumière de jour
  render(m, params) {
    const { object3d, anim } = m.build(params);
    anim?.(0, 0.6);
    prepareUniforms();
    setLight('jour');
    this.scene.add(object3d);
    const box = boxOf(object3d);
    const center = frameBox(this.camera, box);
    this.pipeline.shadowCenter.copy(center);
    this.pipeline.forceShadow = true;
    U.uShadowMap.value = this.pipeline.shadow.rt.depthTexture;
    this.pipeline.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/webp', 0.86);
    this.scene.remove(object3d);
    disposeObject(object3d);
    return url;
  }

  // vignettes à refaire (rechargement à chaud d'un constructeur)
  invalidate() {
    this.urls.clear();
    forgetSources();
  }
}
