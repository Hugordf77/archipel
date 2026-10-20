// Morceaux GLSL partagés par tous les shaders de la scène.
// Tous les matériaux de la scène écrivent dans deux cibles (MRT) :
//   location 0 : couleur peinte
//   location 1 : normale (vue) xy, identifiant d'objet, style de contour
// Style de contour : 1 = objet dur, 0.5 = objet « doux » (feuillages, nuages), 0 = pas de contour.

export const MRT_OUT = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outNormal;
void writeGBuffer(vec3 color, vec3 worldNormal, float id, float outlineStyle) {
  outColor = vec4(color, 1.0);
  vec3 vn = normalize((viewMatrix * vec4(worldNormal, 0.0)).xyz);
  outNormal = vec4(vn.xy * 0.5 + 0.5, id, outlineStyle);
}
`;

export const NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
`;

// Peinture du sol partagée par le terrain et les brins d'herbe (à inclure après NOISE) : variation
// de pigment, comme une couche de gouache irrégulière, et touches peintes sur l'herbe. La base des
// brins prend ainsi exactement la teinte du terrain sous elle. wA : position absolue.
export const PAINT = /* glsl */ `
float pigmentVar(vec3 wA) {
  return vnoise(wA.xz * 0.45 + wA.y * 0.6) * 0.65 + vnoise(wA.xz * 1.7 - wA.y) * 0.35;
}
vec3 grassTouches(vec3 albedo, vec3 wA, float grassMask) {
  float patchN = vnoise(wA.xz * 0.12) * 0.7 + vnoise(wA.xz * 0.37) * 0.3;
  albedo = mix(albedo, albedo * vec3(0.9, 1.04, 0.92), grassMask * smoothstep(0.45, 0.7, patchN));
  albedo = mix(albedo, albedo * vec3(1.06, 1.05, 0.9), grassMask * smoothstep(0.5, 0.3, patchN) * 0.8);
  return albedo;
}
`;

// Monde courbé « en rouleau » : l'horizon plonge selon la distance le long de la caméra.
export const CURVE = /* glsl */ `
uniform vec3 uWorldOffset;
uniform vec3 uCurveOrigin;
uniform vec2 uCurveDir;
uniform float uCurvature;
uniform float uCurveSide;
vec4 applyCurve(vec4 wp) {
  vec2 d = wp.xz - uCurveOrigin.xz;
  float along = max(dot(d, uCurveDir), 0.0);
  float side = dot(d, vec2(-uCurveDir.y, uCurveDir.x));
  wp.y -= uCurvature * (along * along + uCurveSide * side * side);
  return wp;
}
`;

export const WIND = /* glsl */ `
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
// Balancement + rafales qui traversent l'île dans la direction du vent.
vec3 windOffset(vec3 wp, float amount, float phase) {
  wp += uWorldOffset;
  phase += uWorldOffset.x * 0.37 + uWorldOffset.z * 0.21;
  float gust = 0.6 + 0.4 * sin(dot(wp.xz, uWindDir) * 0.15 - uTime * 0.9);
  float sway = sin(uTime * 1.7 + phase + wp.x * 0.3 + wp.z * 0.2) * 0.6
             + sin(uTime * 2.9 + phase * 1.7) * 0.25;
  vec2 dir = normalize(uWindDir + vec2(0.0001));
  return vec3(dir.x, 0.0, dir.y) * (sway * 0.5 + gust) * amount * uWindStrength;
}
`;

export const SHADOW = /* glsl */ `
uniform highp sampler2DShadow uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowOn;
uniform vec2 uShadowTexel;
float sampleShadow(vec3 wp, vec3 N) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(wp + N * 0.05, 1.0);
  vec3 c = sc.xyz / sc.w;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float z = c.z - 0.0012;
  // 4 lectures avec comparaison matérielle = ombre douce
  vec2 o = uShadowTexel * 1.25;
  float s = texture(uShadowMap, vec3(c.xy + vec2(-o.x, -o.y), z));
  s += texture(uShadowMap, vec3(c.xy + vec2(o.x, -o.y), z));
  s += texture(uShadowMap, vec3(c.xy + vec2(-o.x, o.y), z));
  s += texture(uShadowMap, vec3(c.xy + vec2(o.x, o.y), z));
  return s * 0.25;
}
`;

// Éclairage toon : rampe douce à 4 paliers, ombres teintées, rim light chaude,
// lanternes ponctuelles la nuit et brouillard atmosphérique.
export const TOON = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmbient;
uniform vec3 uGroundAmbient;
uniform vec3 uShadowTint;
// part (0 à 1) de l'ombre ramenée vers un gris chaud de même luminance : pelages clairs sans
// reflet violet (faune) ; 0 pour tous les autres matériaux
uniform float uWarmShadow;
uniform vec3 uRimColor;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform vec3 uBands;
uniform float uNight;
uniform float uSnow;
uniform vec3 uLanternPos[10];
uniform vec3 uLanternColor;

float toonRamp(float x) {
  float b = 0.0;
  b += smoothstep(uBands.x - 0.035, uBands.x + 0.035, x) * 0.36;
  b += smoothstep(uBands.y - 0.04, uBands.y + 0.04, x) * 0.34;
  b += smoothstep(uBands.z - 0.05, uBands.z + 0.05, x) * 0.30;
  return b;
}

vec3 toonShade(vec3 albedo, vec3 N, vec3 V, float shadow, float rimAmount) {
  // neige : les faces tournées vers le ciel blanchissent
  albedo = mix(albedo, vec3(0.96, 0.97, 1.0), uSnow * smoothstep(0.55, 0.85, N.y));
  float ndl = dot(N, uSunDir);
  float x = ndl * 0.5 + 0.5;
  x *= mix(0.42, 1.0, shadow);
  float r = toonRamp(x);
  // ombre : teinte froide (violet/bleu), lumière : teinte chaude du soleil
  vec3 warm = vec3(dot(uShadowTint, vec3(0.333))) * vec3(1.06, 0.98, 0.92);
  vec3 shadowCol = albedo * mix(uShadowTint, warm, uWarmShadow);
  vec3 litCol = albedo * uSunColor * 0.94;
  vec3 col = mix(shadowCol, litCol, r);
  // ambiance hémisphérique légère
  vec3 amb = mix(uGroundAmbient, uSkyAmbient, N.y * 0.5 + 0.5);
  col += albedo * amb * 0.1;
  // rim light chaude, plus forte en contre-jour
  float fres = 1.0 - max(dot(N, V), 0.0);
  float back = smoothstep(-0.4, 0.7, dot(-V, uSunDir));
  float rim = smoothstep(0.55, 0.88, fres) * (0.3 + 0.7 * back);
  col += uRimColor * rim * 0.4 * rimAmount * mix(1.0, 0.45, uNight);
  return col;
}

vec3 lanternLight(vec3 albedo, vec3 wp, vec3 N) {
  if (uNight < 0.01) return vec3(0.0);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    vec3 d = uLanternPos[i] - wp;
    float dist = length(d);
    float att = smoothstep(5.5, 0.4, dist);
    float l = max(dot(N, d / max(dist, 0.001)), 0.0) * 0.7 + 0.3;
    acc += att * l;
  }
  return albedo * uLanternColor * acc * uNight * 0.9;
}

vec3 applyFog(vec3 col, float dist) {
  float f = smoothstep(uFogRange.x, uFogRange.y, dist);
  return mix(col, uFogColor, f * 0.92);
}
`;
