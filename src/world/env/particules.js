import * as THREE from 'three';
import { U } from '../../core/globals.js';
import { NOISE, SHADOW } from '../../render/shaders/chunks.js';

// Particules d'ambiance (23/11/2026) : poussière dorée qui accroche le soleil, et lucioles. Tout le
// mouvement est dans le shader (aucune simulation au processeur) : chaque particule a une graine fixe et
// vit dans une boîte posée sur le monde (coordonnées absolues, repliée autour de la caméra) : elle ne suit
// pas la caméra, on passe à travers. Dessinées par-dessus la peinture (calque de la météo, sans Kuwahara,
// qui effacerait des points si fins), mais cachées par le décor : chaque fragment compare sa profondeur à
// celle de la scène (Pipeline.sceneRT) et s'efface en douceur devant une surface proche.
//
// Trois couches :
//   0. poussière proche (boîte de 60 × 9 m) : points de 2 à 4 cm, ivoire doré, visibles surtout au soleil et
//      face à lui (diffusion vers l'avant), presque rien à l'ombre ; éclats rares et lents ;
//   1. poussière lointaine (boîte de 420 × 26 m, vers l'horizon et non dans le ciel) : petites taches de lumière vers les clairières au soleil et
//      l'horizon, très pâles, qui se fondent dans l'air ;
//   2. lucioles (boîte de 60 × 7 m) : rares, jaune pâle à vert pâle, s'allument et s'éteignent lentement ;
//      surtout au crépuscule et la nuit, un peu dans les sous-bois à l'ombre le jour.
// Densité modulée par des zones (bruit de 40 à 90 m) : pas de répartition uniforme.

const COUCHES = [
  { n: 900, boite: [60, 9, 60], couche: 0 },
  { n: 260, boite: [420, 26, 420], couche: 1 },
  { n: 48, boite: [60, 7, 60], couche: 2 },
];

const vert = /* glsl */ `
${NOISE}
attribute vec2 aCoin;
attribute vec4 aGraine;   // xyz : position dans la boîte (0 à 1), w : aléa
attribute vec4 aBoite;    // xyz : taille de la boîte (m), w : couche
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec3 uWorldOffset;
uniform vec2 uRes;
varying vec2 vCoin;
varying float vCouche;
varying float vAlea;
varying vec3 vPos;
varying float vTaille;   // taille à l'écran (px) : les points trop petits pâlissent au lieu de scintiller
varying float vVie;      // lucioles : allumage (0 à 1)
void main() {
  vec3 B = aBoite.xyz;
  float couche = aBoite.w;
  float a = aGraine.w;
  vec3 cam = cameraPosition + uWorldOffset;
  // dérive : le vent (lent), une errance par bruit (chaque particule la sienne), une montée et descente
  float t = uTime;
  vec2 wd = normalize(uWindDir + vec2(1e-4));
  float vit = couche > 1.5 ? 0.12 : mix(0.25, 0.6, a) * (0.4 + 0.6 * uWindStrength);
  vec3 p0 = aGraine.xyz * B;
  vec3 err = vec3(vnoise(vec2(t * 0.07 + a * 41.0, a * 13.0)) - 0.5,
                  vnoise(vec2(t * 0.05 + a * 17.0, a * 7.0 + 3.0)) - 0.5,
                  vnoise(vec2(t * 0.06 + a * 29.0, a * 5.0 + 9.0)) - 0.5);
  float amp = couche > 1.5 ? 6.0 : 2.5;
  vec3 drift = vec3(wd.x, 0.0, wd.y) * t * vit + err * amp + vec3(0.0, sin(t * 0.21 + a * 30.0) * 0.6, 0.0);
  // boîte repliée autour de la caméra : poussière proche et lucioles sur une couche de 7 à 9 m autour de
  // la hauteur des yeux (au-dessus, le ciel vide ; en dessous, le sol les cacherait)
  vec3 centre = cam + vec3(0.0, couche > 1.5 ? -1.5 : (couche > 0.5 ? 2.0 : -1.0), 0.0);
  vec3 rel = fract((p0 + drift - centre) / B + 0.5) - 0.5;
  vec3 wA = centre + rel * B;
  vec3 wp = wA - uWorldOffset;
  vPos = wp;
  // taille (m) : poussière 2 à 4 cm, lointaine 20 à 40 cm (des taches de lumière, pas des grains),
  // lucioles 13 à 20 cm avec leur halo (le cœur est petit, dans le fragment)
  float taille = couche < 0.5 ? mix(0.022, 0.042, fract(a * 7.1)) : couche < 1.5 ? mix(0.2, 0.42, fract(a * 3.3)) : mix(0.13, 0.2, a);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float dist = -mv.z;
  // taille à l'écran : jamais moins de 2 px (au-delà, c'est l'opacité qui baisse), plafonnée
  float px = taille / max(dist, 0.1) * projectionMatrix[1][1] * 0.5 * uRes.y;
  float pxC = clamp(px, 2.0, couche > 1.5 ? 10.0 : 6.0);
  vTaille = px;
  vec4 cp = projectionMatrix * mv;
  cp.xy += aCoin * pxC / uRes * 2.0 * cp.w;
  gl_Position = cp;
  vCoin = aCoin;
  vCouche = couche;
  vAlea = a;
  // lucioles : allumage lent (cycle de 4 à 9 s), éteintes une bonne part du temps
  float cyc = t / mix(4.0, 9.0, fract(a * 5.7)) + a * 11.0;
  vVie = smoothstep(0.0, 0.35, sin(cyc * 6.2831853) * 0.5 + 0.2);
}
`;

const frag = /* glsl */ `
${NOISE}
${SHADOW}
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform vec2 uNearFar;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSunGlow;
uniform float uNight;
uniform float uRain;
uniform float uTime;
uniform vec3 uWorldOffset;
uniform float uForce;
varying vec2 vCoin;
varying float vCouche;
varying float vAlea;
varying vec3 vPos;
varying float vTaille;
varying float vVie;
out vec4 fragColor;
float lin(float z) {
  float n = uNearFar.x;
  float f = uNearFar.y;
  return n * f / (f - z * (f - n));
}
void main() {
  // disque doux (bord fondu)
  float r = length(vCoin);
  if (r > 1.0) discard;
  float disque = smoothstep(1.0, 0.15, r);
  // caché par le décor : profondeur de la scène au même pixel, fondu sur 1,5 m devant une surface
  float zs = texture(tDepth, gl_FragCoord.xy / uRes).r;
  float devant = smoothstep(0.0, 1.5, lin(zs) - lin(gl_FragCoord.z));
  if (devant <= 0.0) discard;
  vec3 V = normalize(vPos - cameraPosition);
  float dist = length(vPos - cameraPosition);
  float jour = (1.0 - uNight) * (1.0 - uRain);
  vec3 wA = vPos + uWorldOffset;
  // zones : la poussière se rassemble dans certains airs (clairières, prés au soleil), jamais partout
  float zone = smoothstep(0.35, 0.75, vnoise(wA.xz / 90.0 + 2.7) * 0.7 + vnoise(wA.xz / 37.0 - 4.1) * 0.3);
  // trop près de l'œil : effacée (pas de grosse tache floue)
  float sous = 1.0 - smoothstep(0.5, 2.5, dist);
  vec3 col;
  float alpha;
  if (vCouche < 1.5) {
    // lumière : à l'ombre portée presque rien ; face au soleil (diffusion vers l'avant) bien plus visible
    float sh = sampleShadow(vPos, -V);
    float face = pow(max(dot(V, uSunDir), 0.0), 3.0);
    float lum = (0.45 + 1.5 * face) * mix(0.12, 1.0, sh) * jour;
    // éclats rares et lents (une particule sur six, un instant toutes les 5 à 12 s)
    float ec = pow(max(sin(uTime * mix(0.5, 1.2, vAlea) + vAlea * 60.0), 0.0), 60.0) * step(0.83, fract(vAlea * 13.7));
    lum += ec * 1.2 * sh * jour;
    col = mix(vec3(1.0, 0.95, 0.82), uSunColor * vec3(1.0, 0.9, 0.7), 0.5) * mix(vec3(1.0), uSunGlow, 0.25);
    if (vCouche < 0.5) {
      alpha = 0.95 * lum * mix(0.35, 1.0, zone) * (1.0 - sous) * (1.0 - smoothstep(30.0, 44.0, dist));
    } else {
      // lointaine : rien de près, de plus en plus présente vers 80 à 200 m, dans l'air au soleil
      alpha = 0.4 * lum * zone * smoothstep(50.0, 110.0, dist) * (1.0 - smoothstep(170.0, 210.0, dist));
    }
    // un point plus petit qu'un pixel pâlit (pas de scintillement)
    alpha *= clamp(vTaille / 2.0, 0.3, 1.0);
  } else {
    // lucioles : crépuscule et nuit surtout ; le jour, à peine, et seulement à l'ombre
    float sh = sampleShadow(vPos, vec3(0.0, 1.0, 0.0));
    float soir = max(uNight, smoothstep(0.35, 0.05, uSunDir.y));
    float present = max(soir, (1.0 - sh) * 0.25 * jour) * (1.0 - uRain);
    // la plupart à peine visibles, quelques-unes plus claires
    float eclat = mix(0.35, 1.0, step(0.8, fract(vAlea * 9.1)));
    col = mix(vec3(1.0, 0.86, 0.42), vec3(0.78, 1.0, 0.55), fract(vAlea * 4.3));
    // cœur net, lueur large et très faible
    disque = smoothstep(0.3, 0.0, r) + disque * 0.22;
    alpha = present * vVie * eclat * 0.85 * mix(0.4, 1.0, zone) * (1.0 - sous) * (1.0 - smoothstep(26.0, 34.0, dist));
  }
  alpha *= disque * devant * uForce;
  if (alpha < 0.003) discard;
  fragColor = vec4(col * alpha, alpha);
}
`;

export class Particules {
  constructor(overlayScene) {
    let total = 0;
    for (const c of COUCHES) total += c.n;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('aCoin', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const graine = new Float32Array(total * 4);
    const boite = new Float32Array(total * 4);
    // suite pseudo-aléatoire fixe (mêmes particules à chaque chargement)
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    let k = 0;
    for (const c of COUCHES) {
      for (let i = 0; i < c.n; i++, k++) {
        graine.set([rnd(), rnd(), rnd(), rnd()], k * 4);
        boite.set([...c.boite, c.couche], k * 4);
      }
    }
    geo.setAttribute('aGraine', new THREE.InstancedBufferAttribute(graine, 4));
    geo.setAttribute('aBoite', new THREE.InstancedBufferAttribute(boite, 4));
    geo.instanceCount = total;
    this.material = new THREE.ShaderMaterial({
      name: 'particules',
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...U,
        tDepth: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uNearFar: { value: new THREE.Vector2(0.1, 2000) },
        uForce: { value: 1 },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'particules';
    overlayScene.add(this.mesh);
  }

  // force : 0 (coupées) à 1 ; la profondeur et la taille de la scène viennent du pipeline (avant le rendu)
  update(pipeline, camera, force = 1) {
    const u = this.material.uniforms;
    this.mesh.visible = force > 0 && !!pipeline.sceneRT;
    if (!this.mesh.visible) return;
    u.tDepth.value = pipeline.sceneRT.depthTexture;
    u.uRes.value.set(pipeline.W, pipeline.H);
    u.uNearFar.value.set(camera.near, camera.far);
    u.uForce.value = force;
  }
}
