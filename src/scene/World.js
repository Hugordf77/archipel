import * as THREE from 'three';
import { U, ORIGIN } from './globals.js';
import { buildTerrain, buildHeightTexture, buildPathTexture, LAYOUT, heightAt } from './terrain.js';
import { buildOcean, buildPond, buildRiver, buildWaterfall } from './water.js';
import { buildProps } from './props.js';
import { buildClumpGeometry, buildShadowProxies } from './foliage.js';
import { buildGrass } from './grass.js';
import { Flowers } from './flowers.js';
import { buildDetails, animateDetails } from './details.js';
import { Sky } from './sky.js';
import { DayCycle } from './daycycle.js';
import { leafAtlas } from './textures.js';
import { foliageMaterial, glowMaterial } from '../shaders/materials.js';
import { NOISE, CURVE } from '../shaders/chunks.js';

export const SMOKE_VERT = /* glsl */ `
${CURVE}
attribute float aFade;
attribute float aSeed;
varying vec2 vUv;
varying float vFade;
varying float vSeed;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sc = length(instanceMatrix[0].xyz);
  vec4 mv = viewMatrix * applyCurve(wp);
  mv.xy += position.xy * sc;
  vUv = position.xy + 0.5;
  vFade = aFade;
  vSeed = aSeed;
  gl_Position = projectionMatrix * mv;
}
`;
export const SMOKE_FRAG = /* glsl */ `
${NOISE}
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outNormal;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vSeed;
void main() {
  // bouffée ronde au bord irrégulier, comme une touche de gouache diluée
  float n = vnoise(vUv * 3.5 + vSeed) * 0.6 + vnoise(vUv * 7.0 - vSeed) * 0.4;
  float d = length(vUv - 0.5) * 2.0 + (n - 0.5) * 0.45;
  float a = smoothstep(1.0, 0.6, d);
  vec3 col = mix(uCloudShade, uCloudLit, smoothstep(0.15, 0.85, vUv.y + (n - 0.5) * 0.3));
  outColor = vec4(col, a * vFade * 0.75);
  outNormal = vec4(0.0);
}
`;

export class World {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.name = 'archipel';
    // tout le contenu du monde (coordonnées absolues) : décalé de -ORIGIN
    this.root = new THREE.Group();
    this.root.name = 'monde';
    this.scene.add(this.root);
    // détails de l'île de départ, masqués quand on navigue au loin
    this.homeDetail = new THREE.Group();
    this.homeDetail.name = 'ile-depart-details';
    this.root.add(this.homeDetail);
    U.uHeightTex.value = buildHeightTexture();
    U.uPathTex.value = buildPathTexture();

    this.terrain = buildTerrain();
    this.root.add(this.terrain);

    this.props = buildProps();
    this.root.add(this.props.mesh, this.props.glassMesh);
    this.obstacles = this.props.obstacles;
    this.spots = this.props.spots;

    // eaux
    this.ocean = buildOcean();
    this.pond = buildPond();
    this.river = buildRiver();
    this.waterfall = buildWaterfall();
    this.scene.add(this.ocean);
    this.homeDetail.add(this.pond, this.river, this.waterfall);
    this.spots.waterfallFoam = this.waterfall.userData.foamPos;

    // détails (falaise sculptée, plage, bassin, lieux) : avant la végétation
    this.details = buildDetails(this.spots, this.obstacles, this.terrain.userData.terrainId);
    this.obstacles.push(...this.details.obstacles);
    this.props.clumps.push(...this.details.clumps);
    this.homeDetail.add(this.details.group);

    // feuillages
    const leafTex = leafAtlas();
    this.leafTex = leafTex;
    const fGeo = buildClumpGeometry(this.props.clumps, 3);
    this.foliage = new THREE.Mesh(
      fGeo,
      foliageMaterial({ leafTex, color: 0xffffff, color2: 0xf2f7d8, vertexColors: true, wind: 0.11 }),
    );
    this.foliage.name = 'foliage';
    this.foliage.frustumCulled = false;
    this.root.add(this.foliage);
    this.homeDetail.add(buildShadowProxies(this.props.clumps));

    // herbe
    this.grass = buildGrass(this.terrain, this.obstacles);
    this.homeDetail.add(this.grass);
    // fleurs : massifs dès le jour 1 (+ ceux de l'ancienne version)
    this.flowers = new Flowers(this.obstacles);
    this.homeDetail.add(this.flowers.group);

    // ciel
    this.sky = new Sky();
    this.scene.add(this.sky.group);

    // lanternes : positions des lumières + halos
    this.lanterns = this.props.lanterns;
    this.applyOrigin();
    const halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMaterial(0xffc27a, 1.6), this.lanterns.length);
    const m = new THREE.Matrix4();
    this.lanterns.forEach((p, i) => halo.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    halo.frustumCulled = false;
    halo.renderOrder = 10;
    this.halo = halo;
    this.homeDetail.add(halo);

    this.dayCycle = new DayCycle();
    this.rain = 0;
    this.buildSmoke();
  }

  // Fumée de cheminée : billboards peints semi-transparents qui gonflent et s'estompent
  buildSmoke() {
    const { x, z } = LAYOUT.house;
    // sommet de la cheminée (voir props.js : maison posée à heightAt - 0.05, cheminée à +4.9)
    this.smokeBase = new THREE.Vector3(x + 1.0, heightAt(x, z) - 0.05 + 4.95, z - 0.7);
    const N = 7;
    const geo = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    geo.index = plane.index;
    geo.setAttribute('position', plane.attributes.position);
    this.smokeFade = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
    this.smokeSeed = new THREE.InstancedBufferAttribute(new Float32Array(N).map(() => Math.random() * 10), 1);
    geo.setAttribute('aFade', this.smokeFade);
    geo.setAttribute('aSeed', this.smokeSeed);
    const mat = new THREE.ShaderMaterial({
      name: 'fumee',
      glslVersion: THREE.GLSL3,
      uniforms: { ...U },
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.smoke = new THREE.InstancedMesh(geo, mat, N);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 8;
    this.smokeT = Array.from({ length: N }, (_, i) => i / N);
    this.root.add(this.smoke);
  }

  // Après un recentrage de l'origine : tout ce qui est exprimé en local
  applyOrigin() {
    this.root.position.set(-ORIGIN.x, 0, -ORIGIN.z);
    this.root.updateMatrixWorld(true);
    this.lanterns.forEach((p, i) => U.uLanternPos.value[i].set(p.x - ORIGIN.x, p.y, p.z - ORIGIN.z));
    U.uHeightBounds.value.set(-40 - ORIGIN.x, -40 - ORIGIN.z, 80, 80);
  }

  // Au large, l'île de départ ne garde que ses grandes masses (relief, décor fusionné, feuillages)
  setHomeDetail(on) {
    if (this.homeDetail.visible === on) return;
    this.homeDetail.visible = on;
    this.smoke.visible = on;
  }

  // L'océan suit le joueur (pas aligné sur la grille : les vagues ne glissent pas)
  followOcean(localX, localZ) {
    this.ocean.position.set(Math.round(localX / 4) * 4, 0, Math.round(localZ / 4) * 4);
  }

  update(dt, camera) {
    U.uTime.value += dt;
    const state = this.dayCycle.update(this.rain);
    this.sky.update(camera, dt);
    this.halo.material.uniforms.uIntensity.value = U.uNight.value * 0.85;
    const t = U.uTime.value;
    const sb = this.smokeBase;
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < this.smokeT.length; i++) {
      const k = (this.smokeT[i] = (this.smokeT[i] + dt * 0.1) % 1);
      const size = 0.35 + k * 1.25;
      mtx.makeScale(size, size, size);
      mtx.setPosition(sb.x + Math.sin(k * 4 + t * 0.4 + i) * 0.25 + k * 1.4, sb.y + 0.15 + k * 3.0, sb.z + k * 0.6);
      this.smoke.setMatrixAt(i, mtx);
      this.smokeFade.setX(i, Math.sin(Math.min(1, k * 1.25) * Math.PI) * (1 - k));
    }
    this.smoke.instanceMatrix.needsUpdate = true;
    this.smokeFade.needsUpdate = true;
    animateDetails(this.details.anim, t);
    return state;
  }
}

export { LAYOUT };
