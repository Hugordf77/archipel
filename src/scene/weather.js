import * as THREE from 'three';
import { U } from './globals.js';
import { CURVE } from '../shaders/chunks.js';

// Pluie fine et neige légère, entièrement animées sur le GPU.
// Elles sont dessinées par-dessus la peinture (calque superposé) pour garder
// des traits nets, comme des hachures de crayon sur l'aquarelle.

const precipVert = /* glsl */ `
${CURVE}
attribute vec4 aSeed;
uniform float uTime;
uniform float uSpeed;
uniform float uHeight;
uniform float uRadius;
uniform float uAmount;
uniform float uLen;
uniform float uWidth;
uniform float uSway;
uniform vec3 uCenter;
uniform vec2 uWindXZ;
varying vec2 vUv;
varying float vAlpha;
void main() {
  float fall = uTime * uSpeed * (0.75 + aSeed.w * 0.5);
  float y = mod(aSeed.y * uHeight - fall, uHeight);
  vec3 wp = vec3(
    uCenter.x + (aSeed.x - 0.5) * 2.0 * uRadius + uWindXZ.x * y * 0.25 + sin(uTime * 1.3 + aSeed.w * 40.0) * uSway,
    uCenter.y - 1.0 + y,
    uCenter.z + (aSeed.z - 0.5) * 2.0 * uRadius + uWindXZ.y * y * 0.25 + cos(uTime * 1.1 + aSeed.x * 30.0) * uSway
  );
  vec4 mv = viewMatrix * applyCurve(vec4(wp, 1.0));
  mv.x += position.x * uWidth;
  mv.y += position.y * uLen;
  vUv = position.xy + 0.5;
  // densité : on n'affiche qu'une partie des gouttes selon l'intensité
  float on = step(aSeed.w, uAmount);
  vAlpha = on * smoothstep(0.0, 1.5, y) * smoothstep(uHeight, uHeight - 2.0, y);
  gl_Position = projectionMatrix * mv;
  if (on < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const precipFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uRound;
uniform float uOpacity;
varying vec2 vUv;
varying float vAlpha;
void main() {
  float a;
  if (uRound > 0.5) {
    a = smoothstep(0.5, 0.2, length(vUv - 0.5));
  } else {
    a = smoothstep(0.0, 0.35, vUv.y) * (1.0 - abs(vUv.x - 0.5) * 2.0);
  }
  gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
}
`;

function makePrecip(count, opts) {
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) seeds[i] = Math.random();
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uSpeed: { value: opts.speed },
      uHeight: { value: 16 },
      uRadius: { value: 22 },
      uAmount: { value: 0 },
      uLen: { value: opts.len },
      uWidth: { value: opts.width },
      uSway: { value: opts.sway || 0 },
      uCenter: { value: new THREE.Vector3() },
      uWindXZ: { value: new THREE.Vector2(0.6, 0.25) },
      uColor: { value: new THREE.Color(opts.color) },
      uRound: { value: opts.round ? 1 : 0 },
      uOpacity: { value: opts.opacity },
    },
    vertexShader: precipVert,
    fragmentShader: precipFrag,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 30;
  return mesh;
}

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };
}

export class Weather {
  constructor(overlayScene) {
    this.rainMesh = makePrecip(1400, { speed: 17, len: 0.55, width: 0.025, color: '#e8f2ff', opacity: 0.55 });
    this.snowMesh = makePrecip(900, { speed: 1.6, len: 0.09, width: 0.09, color: '#ffffff', opacity: 0.9, round: true, sway: 0.5 });
    overlayScene.add(this.rainMesh, this.snowMesh);
    this.mode = 'auto';
    this.rain = 0;
    this.snow = 0;
    this.target = { rain: 0, snow: 0 };
    this.checkTimer = 0;
    this.label = 'clair';
    this.baseSnow = 0; // neige saisonnière (hiver)
    this.accum = 0;
  }

  setMode(mode) {
    this.mode = mode;
    this.decide();
  }

  // En automatique : une averse ou quelques flocons de temps en temps (tirage par tranche de 2 h)
  decide() {
    const d = new Date();
    let kind = 'clair';
    if (this.mode === 'pluie' || this.mode === 'neige') kind = this.mode;
    else if (this.mode === 'auto') {
      const r = seeded(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${Math.floor(d.getHours() / 2)}`);
      const roll = r();
      const winter = [11, 0, 1].includes(d.getMonth());
      if (roll < 0.035) kind = 'tempete';
      else if (roll < 0.14) kind = winter && r() < 0.6 ? 'neige' : 'pluie';
    } else if (this.mode === 'tempete') kind = 'tempete';
    this.label = kind;
    // tempête : forte pluie, vent fort, la mer repousse les bateaux vers l'île
    this.storm = kind === 'tempete';
    this.target.rain = kind === 'pluie' ? 0.75 : kind === 'tempete' ? 1 : 0;
    this.target.snow = kind === 'neige' ? 0.8 : 0;
  }

  update(dt, center) {
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) {
      this.checkTimer = 30;
      this.decide();
    }
    const k = 1 - Math.exp(-dt / 6);
    this.rain += (this.target.rain - this.rain) * k;
    this.snow += (this.target.snow - this.snow) * k;
    U.uRain.value = this.rain;
    // la neige se dépose lentement, puis fond
    const settle = this.snow > 0.3 ? dt / 90 : -dt / 60;
    this.accum = Math.min(0.75, Math.max(0, this.accum + settle));
    U.uSnow.value = Math.max(this.accum, this.baseSnow);
    for (const [mesh, amt] of [[this.rainMesh, this.rain], [this.snowMesh, this.snow]]) {
      const u = mesh.material.uniforms;
      u.uAmount.value = amt;
      u.uCenter.value.set(center.x, center.y, center.z);
      mesh.visible = amt > 0.01;
    }
  }
}
