import * as THREE from 'three';
import { U, LAYER_SHADOW, CHAR_ID } from '../core/globals.js';
import { paperTexture } from './textures.js';
import {
  FS_VERT, TENSOR_FRAG, BLUR_FRAG, KUWAHARA_ANISO_FRAG, KUWAHARA_SIMPLE_FRAG, COMPOSITE_FRAG,
} from './shaders/post.js';

// Lot « lumière » (0 à 1, presque gratuit : calcul dans les shaders existants) : relief (paliers,
// ombre profonde, terminateur), rebond (lumière du sol), rim (contre-jour), brume (de hauteur et
// perspective aérienne), etalonnage (par heure, composition). Pipeline.settings[clé] (nombre) remplace
// la valeur de la qualité ; null la rend.
export const LUMIERE = ['relief', 'rebond', 'rim', 'brume', 'etalonnage'];
const LUMIERE_ON = { relief: 1, rebond: 1, rim: 1, brume: 1, etalonnage: 1 };

export const QUALITY = {
  low: { pixelRatio: 1, paintScale: 0.5, aniso: false, radius: 3, shadow: 1024, shadowEvery: 3, lumiere: LUMIERE_ON, label: 'Bas' },
  medium: { pixelRatio: 1.25, paintScale: 0.5, aniso: true, radius: 3, shadow: 2048, shadowEvery: 2, lumiere: LUMIERE_ON, label: 'Moyen' },
  high: { pixelRatio: 1.6, paintScale: 0.55, aniso: true, radius: 3.5, kernelMul: 1.5, shadow: 2048, shadowEvery: 1, lumiere: LUMIERE_ON, label: 'Haut' },
};

// ---------------------------------------------------------------------------
// Ombre portée du soleil / de la lune (carte de profondeur orthographique)
// ---------------------------------------------------------------------------
class SunShadow {
  constructor(size = 2048) {
    this.size = size;
    this.cam = new THREE.OrthographicCamera(-34, 34, 34, -34, 1, 200);
    this.cam.layers.set(LAYER_SHADOW);
    this.mat = new THREE.MeshDepthMaterial();
    this.bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.alloc(size);
    U.uShadowOn.value = 1;
  }

  alloc(size) {
    if (this.rt) this.rt.dispose();
    this.size = size;
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true });
    this.rt.depthTexture = new THREE.DepthTexture(size, size);
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    // comparaison matérielle (PCF 2x2 gratuit à chaque lecture)
    this.rt.depthTexture.compareFunction = THREE.LessEqualCompare;
    this.rt.depthTexture.minFilter = THREE.LinearFilter;
    this.rt.depthTexture.magFilter = THREE.LinearFilter;
    U.uShadowMap.value = this.rt.depthTexture;
    U.uShadowTexel.value.set(1 / size, 1 / size);
  }

  render(renderer, scene, center) {
    const dir = U.uSunDir.value;
    this.cam.position.set(center.x + dir.x * 90, center.y + dir.y * 90, center.z + dir.z * 90);
    this.cam.lookAt(center);
    this.cam.updateMatrixWorld();
    U.uShadowMatrix.value.copy(this.bias).multiply(this.cam.projectionMatrix).multiply(this.cam.matrixWorldInverse);
    const prev = scene.overrideMaterial;
    scene.overrideMaterial = this.mat;
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, this.cam);
    scene.overrideMaterial = prev;
  }
}

// ---------------------------------------------------------------------------
// Passe plein écran
// ---------------------------------------------------------------------------
const fsGeo = new THREE.BufferGeometry();
fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
fsGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

class FSPass {
  constructor(fragmentShader, uniforms, defines = {}) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: FS_VERT,
      fragmentShader,
      uniforms,
      defines,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(fsGeo, this.material);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
  }

  get u() {
    return this.material.uniforms;
  }

  render(renderer, target) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, fsCam);
  }
}

function makeRT(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// Pipeline complet
// ---------------------------------------------------------------------------
export class Pipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.settings = {
      quality: 'medium',
      paint: true,
      paintStrength: 1,
      outline: 1,
      paper: 0.85,
      wobble: 1,
      // lot « lumière » : null = valeur de la qualité, sinon 0 à 1
      relief: null,
      rebond: null,
      rim: null,
      brume: null,
      etalonnage: null,
    };
    // teinte du rebond visée (biome sous le joueur, Game.updateZone) ; U.uBounceColor la rejoint
    this.rebondCible = U.uBounceColor.value.clone();
    this.focusDim = 0;
    this.dynScale = 1; // résolution adaptative (0.7 à 1)
    this.adaptT = 0;
    this.shadow = new SunShadow(2048);
    this.shadowCenter = new THREE.Vector3(0, 1, 0);
    this.paper = paperTexture();

    this.tensorPass = new FSPass(TENSOR_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.blurPass = new FSPass(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.kuwaPass = new FSPass(KUWAHARA_ANISO_FRAG, {
      tSrc: { value: null },
      tTensor: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uRadius: { value: 4 },
      uHardness: { value: 8 },
      uSharpness: { value: 8 },
      uAlpha: { value: 1 },
      uBrush: { value: 1 },
    }, { KR: 5 });
    this.kuwaSimplePass = new FSPass(KUWAHARA_SIMPLE_FRAG, {
      tSrc: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uRadius: { value: 3 },
    }, { KR: 3 });
    this.compPass = new FSPass(COMPOSITE_FRAG, {
      tPaint: { value: null },
      tScene: { value: null },
      uCharId: { value: CHAR_ID },
      tNormal: { value: null },
      tDepth: { value: null },
      tPaper: { value: this.paper },
      uResolution: { value: new THREE.Vector2() },
      uTime: U.uTime,
      uNear: { value: 0.1 },
      uFar: { value: 2000 },
      uOutline: { value: 1 },
      uOutlineWidth: { value: 1.6 },
      uInk: { value: new THREE.Vector3(0.5, 0.42, 0.6) },
      uPaper: { value: 1 },
      uWobble: { value: 1 },
      uGrade: { value: 1 },
      uFocusDim: { value: 0 },
      uPool: { value: 1 },
      uGradeLow: U.uGradeLow,
      uGradeHigh: U.uGradeHigh,
      uGradeLift: U.uGradeLift,
      uGradeCS: U.uGradeCS,
      uHourGrade: { value: 0 },
    });
    this.setSize(window.innerWidth, window.innerHeight);
  }

  get q() {
    return QUALITY[this.settings.quality];
  }

  setQuality(name) {
    if (!QUALITY[name]) return;
    this.settings.quality = name;
    this.forceShadow = true;
    this.dynScale = 1;
    this.adaptAvg = 0;
    if (this.shadow.size !== this.q.shadow) this.shadow.alloc(this.q.shadow);
    this.setSize(this.width, this.height);
  }

  // taille du noyau Kuwahara figée à la compilation (boucles déroulées)
  updateKernel() {
    const strength = this.settings.paintStrength || 1;
    const kr = Math.max(2, Math.min(8, Math.round(this.q.radius * strength * (this.q.kernelMul || 1.35))));
    const ks = Math.max(2, Math.min(6, Math.round(this.q.radius * strength)));
    if (this.kuwaPass.material.defines.KR !== kr) {
      this.kuwaPass.material.defines.KR = kr;
      this.kuwaPass.material.needsUpdate = true;
    }
    if (this.kuwaSimplePass.material.defines.KR !== ks) {
      this.kuwaSimplePass.material.defines.KR = ks;
      this.kuwaSimplePass.material.needsUpdate = true;
    }
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;
    const pr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, this.q.pixelRatio) * this.dynScale);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    const W = Math.max(1, Math.floor(w * pr));
    const H = Math.max(1, Math.floor(h * pr));
    this.W = W;
    this.H = H;
    if (this.sceneRT) this.sceneRT.dispose();
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, {
      count: 2,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.sceneRT.textures[1].minFilter = THREE.NearestFilter;
    this.sceneRT.textures[1].magFilter = THREE.NearestFilter;
    this.sceneRT.depthTexture = new THREE.DepthTexture(W, H);
    this.sceneRT.depthTexture.type = THREE.UnsignedIntType;

    const pw = Math.max(1, Math.floor(W * this.q.paintScale));
    const ph = Math.max(1, Math.floor(H * this.q.paintScale));
    this.PW = pw;
    this.PH = ph;
    for (const k of ['tensorRT', 'blurRT', 'blurRT2', 'paintRT']) if (this[k]) this[k].dispose();
    const half = { type: THREE.HalfFloatType };
    this.tensorRT = makeRT(pw, ph, half);
    this.blurRT = makeRT(pw, ph, half);
    this.blurRT2 = makeRT(pw, ph, half);
    this.paintRT = makeRT(pw, ph);
    this.compPass.u.uResolution.value.set(W, H);
  }

  // Ajuste la résolution pour tenir ~60 images/s (appelé avec la durée réelle de l'image)
  adapt(frameMs) {
    if (document.hidden || !(frameMs > 0) || frameMs > 200) return;
    this.adaptAvg = this.adaptAvg ? this.adaptAvg * 0.97 + frameMs * 0.03 : frameMs;
    this.adaptT += frameMs / 1000;
    if (this.adaptT < 2.5) return;
    this.adaptT = 0;
    let next = this.dynScale;
    // trop lent : d'abord moins d'herbe (onSlow rend true s'il a allégé), puis la résolution ;
    // de la marge : la résolution d'abord, puis l'herbe (onFast)
    if (this.adaptAvg > 18.2) {
      if (this.onSlow?.()) return;
      next = Math.max(0.7, this.dynScale - 0.1);
    } else if (this.adaptAvg < 15.2) {
      if (this.dynScale < 1) next = Math.min(1, this.dynScale + 0.05);
      else this.onFast?.();
    }
    if (Math.abs(next - this.dynScale) > 0.001) {
      this.dynScale = next;
      this.setSize(this.width, this.height);
    }
  }

  // valeur d'un réglage du lot « lumière » (0 à 1)
  lumiere(k) {
    const v = this.settings[k];
    return v === null || v === undefined ? this.q.lumiere?.[k] ?? 0 : Math.max(0, Math.min(1, +v || 0));
  }

  appliqueLumiere() {
    U.uRelief.value = this.lumiere('relief');
    U.uBounce.value = this.lumiere('rebond');
    U.uRimBoost.value = this.lumiere('rim');
    U.uAerial.value = this.lumiere('brume');
    this.compPass.u.uHourGrade.value = this.lumiere('etalonnage');
    U.uBounceColor.value.lerp(this.rebondCible, 0.03);
  }

  render(scene, camera, overlayScene = null) {
    const r = this.renderer;
    const s = this.settings;
    r.autoClear = false;
    this.appliqueLumiere();

    // 1. ombres (pas forcément à chaque image : la scène bouge peu)
    this.frameNo = (this.frameNo || 0) + 1;
    if (this.frameNo % (this.q.shadowEvery || 1) === 0 || this.forceShadow) {
      this.shadow.render(r, scene, this.shadowCenter);
      this.forceShadow = false;
    }

    // 2. scène → G-buffer (couleur + normales/id) + profondeur
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(scene, camera);

    // 3. peinture
    let paintTex = this.sceneRT.textures[0];
    if (s.paint) {
      this.updateKernel();
      const tx = 1 / this.PW;
      const ty = 1 / this.PH;
      if (this.q.aniso) {
        this.tensorPass.u.tSrc.value = this.sceneRT.textures[0];
        this.tensorPass.u.uTexel.value.set(tx, ty);
        this.tensorPass.render(r, this.tensorRT);
        this.blurPass.u.tSrc.value = this.tensorRT.texture;
        this.blurPass.u.uDir.value.set(tx, 0);
        this.blurPass.render(r, this.blurRT);
        this.blurPass.u.tSrc.value = this.blurRT.texture;
        this.blurPass.u.uDir.value.set(0, ty);
        this.blurPass.render(r, this.blurRT2);
        this.kuwaPass.u.tSrc.value = this.sceneRT.textures[0];
        this.kuwaPass.u.tTensor.value = this.blurRT2.texture;
        this.kuwaPass.u.uTexel.value.set(tx, ty);
        this.kuwaPass.u.uRadius.value = this.q.radius * s.paintStrength;
        this.kuwaPass.render(r, this.paintRT);
      } else {
        this.kuwaSimplePass.u.tSrc.value = this.sceneRT.textures[0];
        this.kuwaSimplePass.u.uTexel.value.set(tx, ty);
        this.kuwaSimplePass.u.uRadius.value = Math.round(this.q.radius * s.paintStrength);
        this.kuwaSimplePass.render(r, this.paintRT);
      }
      paintTex = this.paintRT.texture;
    }

    // 4. composition finale
    const cu = this.compPass.u;
    cu.tPaint.value = paintTex;
    cu.tScene.value = this.sceneRT.textures[0];
    cu.tNormal.value = this.sceneRT.textures[1];
    cu.tDepth.value = this.sceneRT.depthTexture;
    cu.uNear.value = camera.near;
    cu.uFar.value = camera.far;
    cu.uOutline.value = s.outline;
    cu.uPaper.value = s.paper;
    cu.uWobble.value = s.wobble;
    cu.uFocusDim.value = this.focusDim;
    cu.uPool.value = s.paint ? 1 : 0;
    r.setRenderTarget(null);
    r.clear(true, true, true);
    this.compPass.render(r, null);

    // 5. calque superposé (pluie, neige) dessiné sans peinture
    if (overlayScene) {
      r.clearDepth();
      r.render(overlayScene, camera);
    }
  }

  // Capture du canvas (rend une image puis lit le tampon)
  capture(scene, camera, overlayScene) {
    this.render(scene, camera, overlayScene);
    return this.renderer.domElement.toDataURL('image/png');
  }
}
