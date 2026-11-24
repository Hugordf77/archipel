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

// Peinture du sol (à inclure après NOISE) : variation de pigment, comme une couche de gouache
// irrégulière, et touches peintes sur l'herbe. wA : position absolue.
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

// Herbe en tapis, variation de la grande échelle à la petite (à inclure après NOISE ; uTime,
// uWindDir et uWindStrength déclarés par WIND ou à part) : plaques de 15 à 40 m (teinte ± 6°,
// valeur ± 8 %), ondes de vent en rafales qui filent dans le sens du vent, touches de
// pinceau en aplats et voile pastel. Les brins et le sol (terrain) lisent les mêmes : le lointain
// raccorde au tapis. p : position absolue (xz).
export const HERBE = /* glsl */ `
vec3 hueRot(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
// plaques : teinte (x) et valeur (y) de -1 à 1, pointes jaunies (z) de 0 à 1
// Grande échelle (70 à 150 m) en plus : des étendues plus dorées et plus claires (M bas : teinte vers
// le jaune, pointes jaunies) et d'autres plus fraîches et plus profondes (M haut) ; jamais des taches
vec3 herbePlaque(vec2 p) {
  float h = vnoise(p / 31.0 + 3.7) * 0.7 + vnoise(p / 17.0 - 5.1) * 0.3;
  float v = vnoise(p / 23.0 - 9.3) * 0.7 + vnoise(p / 14.0 + 2.9) * 0.3;
  float M = vnoise(p / 150.0 + 21.7) * 0.7 + vnoise(p / 73.0 - 8.1) * 0.3;
  float m = smoothstep(0.2, 0.8, M) * 2.0 - 1.0;
  float z = max(smoothstep(0.45, 0.8, vnoise(p / 19.0 + 11.3)), smoothstep(-0.2, -0.9, m) * 0.6);
  return vec3((h * 2.0 - 1.0) * 0.8 + m * 0.7, (v * 2.0 - 1.0) * 0.85 - m * 0.45, z);
}
// teinte (± 6 à 10°), valeur (± 8 %) et saturation un peu retenue (pas de vert fluo)
vec3 herbeVarie(vec3 c, vec3 pl) {
  vec3 r = hueRot(c, pl.x * 0.105) * (1.0 + 0.08 * pl.y);
  return mix(vec3(dot(r, vec3(0.299, 0.587, 0.114))), r, 0.9);
}
// sol nu (0 à 1) : passé 20° de pente, la terre se découvre par plaques irrégulières (bruit de 3 et
// 9 m), entière vers 39° ; les brins s'y effacent (materiau.js) et le terrain y prend la terre
float solNu(vec2 p, float ny) {
  float m = vnoise(p / 9.0 + 1.7) * 0.6 + vnoise(p / 3.1 - 4.2) * 0.4;
  float pente = smoothstep(0.94, 0.78, ny + (m - 0.5) * 0.14);
  return pente * smoothstep(0.62, 0.38, m - pente * 0.3);
}
// onde de vent (0 à 1) : rafales en plaques (environ 26 × 13 m, allongées en travers du vent) qui
// filent à 5 m/s ; dans chaque rafale, des vagues serrées de 4 m qui la traversent à 7 m/s. Entre
// les rafales, un souffle faible (0,15). Plus de bandes régulières sur tout le pré.
float herbeOnde(vec2 p) {
  vec2 d = normalize(uWindDir + vec2(0.0001));
  vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
  vec2 g = vec2((q.x - uTime * 5.0) / 13.0, q.y / 26.0);
  float gust = smoothstep(0.42, 0.82, vnoise(g) * 0.7 + vnoise(g * 2.3 + 7.1) * 0.3);
  float ph = (q.x - uTime * 7.0) / 4.0 + vnoise(vec2(q.y / 9.0, q.x / 17.0)) * 1.2;
  float ripple = 0.55 + 0.45 * sin(ph * 6.2831853);
  return (0.15 + 0.85 * gust) * ripple * uWindStrength;
}
// touches de pinceau : traits allongés dans le sens du vent (environ 3,5 × 0,7 m), en aplats de
// gouache (valeur par paliers de 4,5 %, de −9 à +9 %) ; facteur à multiplier à la couleur
float herbePinceau(vec2 p) {
  vec2 d = normalize(uWindDir + vec2(0.0001));
  vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
  float a = vnoise(vec2(q.x / 3.6, q.y / 0.7)) * 0.65 + vnoise(vec2(q.x / 2.2 + 13.1, q.y / 0.45 - 7.7)) * 0.35;
  return 1.0 + 0.09 * floor((a * 2.0 - 1.0) * 2.0 + 0.5) * 0.5;
}
// voile pastel : un lavis de gouache crème par-dessus la couleur (k : 0 à 1)
vec3 herbePastel(vec3 c, float k) {
  return mix(c, vec3(0.97, 0.95, 0.86), k);
}
`;

// Familles de couleur des feuillus des îles (à inclure après NOISE ; version forêt et version proche lisent
// la même fonction, donc un arbre garde sa couleur en changeant de version). pos : origine absolue de
// l'arbre (xz), nC : normale de la couronne. Une famille par arbre, pas une couleur par touffe :
//   - part chaude w : surtout la zone (bosquets de 50 à 110 m qui roussissent ensemble), un peu l'arbre ;
//   - famille : or, ambre ou rouille (angle de teinte de 32 à 72° depuis le vert) ;
//   - les arbres restés verts ont des accents d'un côté de la couronne (secteurs de la normale), dans les
//     zones déjà chaudes seulement.
// Seules les couleurs vertes tournent (érable, cerisier gardent la leur). uAutomne : saison (Game).
export const FAMILLE = /* glsl */ `
uniform float uAutomne;
vec3 rotTeinte(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
vec3 familleArbre(vec3 c, vec2 pos, vec3 nC) {
  float t = hash12(floor(pos * 2.0) + 0.37);
  float t2 = fract(t * 17.31 + 0.13);
  float zone = vnoise(pos / 110.0 + 5.3) * 0.7 + vnoise(pos / 47.0 - 1.9) * 0.3;
  float w = clamp((zone - 0.42) * 2.4 + (t - 0.5) * 0.8, 0.0, 1.0);
  vec3 sd = floor(nC * 1.6 + 0.5);
  float acc = step(0.6, hash12(sd.xz * 3.1 + sd.y * 7.7 + floor(pos * 2.0) * 0.13));
  float verte = smoothstep(0.0, 0.08, c.g - max(c.r, c.b));
  float k = max(w, acc * 0.6 * smoothstep(0.35, 0.6, zone)) * uAutomne * verte;
  vec3 r = rotTeinte(c, -mix(0.55, 1.25, t2) * k);
  float l = dot(r, vec3(0.299, 0.587, 0.114));
  // l'or plus clair, réchauffé et un peu plus saturé (un vert tourné vers le jaune vire au kaki sinon) ;
  // la rouille plus sourde et plus sombre (ni orange fluo ni rouge vif)
  r = mix(vec3(l), r, 1.0 + k * mix(0.06, -0.14, t2)) * (1.0 + k * mix(0.03, -0.1, t2));
  r *= mix(vec3(1.0), vec3(1.06, 1.0, 0.88), k * (1.0 - 0.5 * t2));
  return r;
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
// seconde carte, large (± 170 m autour du joueur), moins fine : les arbres au-delà de la première
uniform highp sampler2DShadow uShadowMap2;
uniform mat4 uShadowMatrix2;
uniform vec2 uShadowTexel2;
float shadowLarge(vec3 wp, vec3 N) {
  vec4 sc = uShadowMatrix2 * vec4(wp + N * 0.15, 1.0);
  vec3 c = sc.xyz / sc.w;
  float e = max(abs(c.x - 0.5), abs(c.y - 0.5));
  if (e > 0.5 || c.z > 1.0) return 1.0;
  float z = c.z - 0.0007;
  vec2 o = uShadowTexel2 * 0.8;
  float s = texture(uShadowMap2, vec3(c.xy + vec2(-o.x, -o.y), z));
  s += texture(uShadowMap2, vec3(c.xy + vec2(o.x, -o.y), z));
  s += texture(uShadowMap2, vec3(c.xy + vec2(-o.x, o.y), z));
  s += texture(uShadowMap2, vec3(c.xy + vec2(o.x, o.y), z));
  // s'efface vers le bord de la carte : pas de limite nette au loin
  return mix(1.0, s * 0.25, smoothstep(0.5, 0.4, e));
}
float sampleShadow(vec3 wp, vec3 N) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(wp + N * 0.05, 1.0);
  vec3 c = sc.xyz / sc.w;
  float e = max(abs(c.x - 0.5), abs(c.y - 0.5));
  if (e > 0.5 || c.z > 1.0) return shadowLarge(wp, N);
  float z = c.z - 0.0012;
  // 4 lectures avec comparaison matérielle = ombre douce
  vec2 o = uShadowTexel * 1.25;
  float s = texture(uShadowMap, vec3(c.xy + vec2(-o.x, -o.y), z));
  s += texture(uShadowMap, vec3(c.xy + vec2(o.x, -o.y), z));
  s += texture(uShadowMap, vec3(c.xy + vec2(-o.x, o.y), z));
  s += texture(uShadowMap, vec3(c.xy + vec2(o.x, o.y), z));
  s *= 0.25;
  // passage en fondu vers la carte large sur le dernier dixième de la carte fine
  float f = smoothstep(0.42, 0.5, e);
  return f > 0.0 ? mix(s, shadowLarge(wp, N), f) : s;
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
// lot « lumière » (0 à 1, 0 = rendu d'origine ; Pipeline.settings et QUALITY) : relief (paliers
// plus nets, ombre plus profonde, terminateur chaud), rebond (lumière renvoyée par le sol, teinte du
// biome uBounceColor), rim (contre-jour plus franc), brume (de hauteur et perspective aérienne)
uniform float uRelief;
uniform float uBounce;
uniform vec3 uBounceColor;
uniform float uRimBoost;
uniform float uAerial;
uniform vec3 uSkyHorizon;
// éclairs rouges de la tornade : éclat et position (scène)
uniform float uEclair;
uniform vec3 uEclairPos;

float toonRamp(float x) {
  // relief : transitions resserrées, paliers plus nets
  float k = mix(1.0, 0.55, uRelief);
  float b = 0.0;
  b += smoothstep(uBands.x - 0.035 * k, uBands.x + 0.035 * k, x) * 0.36;
  b += smoothstep(uBands.y - 0.04 * k, uBands.y + 0.04 * k, x) * 0.34;
  b += smoothstep(uBands.z - 0.05 * k, uBands.z + 0.05 * k, x) * 0.30;
  return b;
}

vec3 toonShade(vec3 albedo, vec3 N, vec3 V, float shadow, float rimAmount) {
  // neige : les faces tournées vers le ciel blanchissent
  albedo = mix(albedo, vec3(0.96, 0.97, 1.0), uSnow * smoothstep(0.55, 0.85, N.y));
  float ndl = dot(N, uSunDir);
  float x = ndl * 0.5 + 0.5;
  x *= mix(0.42, 1.0, shadow);
  // relief : l'ombre portée tombe franchement dans le premier palier
  x *= mix(1.0, mix(0.75, 1.0, shadow), uRelief);
  float r = toonRamp(x);
  float day = 1.0 - uNight;
  // ombre : teinte froide (violet/bleu), lumière : teinte chaude du soleil
  vec3 warm = vec3(dot(uShadowTint, vec3(0.333))) * vec3(1.06, 0.98, 0.92);
  vec3 shadowCol = albedo * mix(uShadowTint, warm, uWarmShadow);
  // relief : ombre plus profonde et plus saturée vers sa teinte, jamais grise (pelages exceptés)
  vec3 deep = albedo * uShadowTint * uShadowTint * 1.3;
  shadowCol = mix(shadowCol, deep, 0.6 * uRelief * (1.0 - uWarmShadow));
  vec3 litCol = albedo * uSunColor * mix(0.94, 1.0, uRelief);
  vec3 col = mix(shadowCol, litCol, r);
  // terminateur : bande chaude et saturée côté lumière, à la limite ombre / lumière
  float term = smoothstep(uBands.x - 0.01, uBands.x + 0.025, x) * smoothstep(uBands.x + 0.17, uBands.x + 0.05, x);
  vec3 hot = albedo * uSunColor * mix(vec3(1.0), uRimColor, 0.7);
  float lh = dot(hot, vec3(0.299, 0.587, 0.114));
  hot = mix(vec3(lh), hot, 1.7) * vec3(1.06, 0.97, 0.9);
  col = mix(col, max(hot, vec3(0.0)), term * 0.42 * uRelief * day);
  // ambiance hémisphérique légère
  vec3 amb = mix(uGroundAmbient, uSkyAmbient, N.y * 0.5 + 0.5);
  col += albedo * amb * 0.1 * (1.0 - 0.6 * uBounce);
  // rebond : le sol renvoie sa couleur (biome) côté ombre, surtout sur les faces tournées vers lui ;
  // le ciel débouche un peu les faces du dessus restées à l'ombre
  float toGround = 0.35 + 0.65 * clamp(0.5 - 0.5 * N.y, 0.0, 1.0);
  vec3 bounce = uBounceColor * toGround * 0.14 + uSkyAmbient * clamp(N.y, 0.0, 1.0) * 0.03;
  col += albedo * bounce * (1.0 - r) * uBounce * mix(1.0, 0.3, uNight);
  // lumière du ciel dans l'ombre (le jour) : la voûte bleue débouche les ombres, surtout les faces
  // tournées vers le haut ; puis plancher : une ombre garde au moins 44 % de la valeur de la même
  // surface au soleil (froide, lisible, jamais noire). Réglé par « rebond » (uBounce)
  vec3 ciel = uSkyAmbient * (0.5 + 0.5 * clamp(N.y, 0.0, 1.0));
  col += albedo * ciel * (1.0 - r) * 0.14 * day * uBounce;
  const vec3 LW = vec3(0.299, 0.587, 0.114);
  float lPlancher = dot(litCol, LW) * 0.44 * day * uBounce;
  float lCol = dot(col, LW);
  col *= clamp(lPlancher / max(lCol, 1e-4), 1.0, 1.8);
  // rim light chaude, plus forte en contre-jour ; rim : plus nette et franche dos au soleil
  float fres = 1.0 - max(dot(N, V), 0.0);
  float back = smoothstep(-0.4, 0.7, dot(-V, uSunDir));
  float rim = mix(smoothstep(0.55, 0.88, fres) * (0.3 + 0.7 * back),
                  smoothstep(0.62, 0.8, fres) * (0.2 + 1.1 * back * back), uRimBoost);
  col += uRimColor * rim * mix(0.4, 0.5, uRimBoost) * rimAmount * mix(1.0, 0.45, uNight);
  return col;
}

// ÉCLAIR ROUGE (tornade) : lumière d'un point lointain (uEclairPos), portée d'environ 900 m, surtout sur les
// faces tournées vers lui ; wp : position du fragment (scène)
vec3 eclairRouge(vec3 albedo, vec3 wp, vec3 N) {
  if (uEclair < 0.001) return vec3(0.0);
  vec3 dE = uEclairPos - wp;
  float dd = length(dE);
  float att = 1.0 / (1.0 + dd * dd / 90000.0) * smoothstep(1400.0, 300.0, dd);
  return albedo * vec3(1.0, 0.16, 0.1) * uEclair * att * (0.35 + 0.9 * max(dot(N, dE / max(dd, 1.0)), 0.0)) * 1.6;
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

// wp : position du fragment (repère de la scène ; ORIGIN.y = 0, donc y est l'altitude)
vec3 applyFog(vec3 col, float dist, vec3 wp) {
  float f = smoothstep(uFogRange.x, uFogRange.y, dist);
  vec3 fogCol = uFogColor;
  if (uAerial > 0.0) {
    // perspective aérienne colorée : chaude face au soleil, froide (teinte des ombres) à l'opposé
    vec3 vd = normalize(wp - cameraPosition);
    float sunF = pow(max(dot(vd, uSunDir), 0.0), 3.0) * (1.0 - uNight);
    vec3 warmF = uFogColor * mix(vec3(1.0), uSunColor * vec3(1.1, 0.95, 0.8), 0.55);
    vec3 coolF = uFogColor * mix(vec3(1.0), uShadowTint * 1.35, 0.2);
    fogCol = mix(uFogColor, mix(coolF, warmF, sunF), uAerial);
    // voile dès 40 m, et brume de hauteur : plus dense au ras de l'eau et dans les creux
    // la perspective aérienne (plus bas) porte maintenant la profondeur : le brouillard classique, qui
    // blanchissait les montagnes le matin, ne compte plus que pour moitié
    f *= mix(1.0, 0.5, uAerial);
    float aer = 1.0 - exp(-max(dist - 60.0, 0.0) / 1400.0);
    float hf = exp(-max(wp.y, 0.0) / 30.0);
    float haze = (1.0 - exp(-dist / 1100.0)) * hf * 0.3;
    f = max(f, max(aer * 0.16, haze) * uAerial);
    // PERSPECTIVE AÉRIENNE (23/11) : passé 70 m, le contraste et la saturation baissent et la couleur glisse
    // vers l'horizon du ciel (teinté par la brume chaude ou froide ci-dessus) ; l'air en altitude est plus
    // clair : les sommets gardent leur silhouette. Plans : premier plan net, forêts du milieu voilées,
    // collines puis montagnes de plus en plus dans l'air
    float altF = exp(-max(wp.y, 0.0) / 150.0);
    float pa = (1.0 - exp(-max(dist - 70.0, 0.0) / 650.0)) * mix(0.4, 1.0, altF) * uAerial;
    float lA = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lA), col, 1.0 - 0.3 * pa);
    col = mix(col, mix(uSkyHorizon, fogCol, 0.45), pa * 0.45);
  }
  return mix(col, fogCol, f * 0.92);
}
`;
