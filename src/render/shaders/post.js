// Shaders de post-process « peinture » :
//   1. tenseur de structure (orientation locale des contours de couleur)
//   2. flou gaussien séparable du tenseur
//   3. Kuwahara anisotrope (8 secteurs, poids polynomiaux — Kyprianidis 2011)
//      ou Kuwahara classique 4 quadrants (qualité basse)
//   4. composition : contours encrés (profondeur + normales + id), tremblement,
//      grain de papier, granulation des pigments, étalonnage doux

import { NOISE } from './chunks.js';

export const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const TENSOR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel; // texel de la résolution « peinture »
varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main() {
  vec3 gx = (
    -1.0 * s(vec2(-1, -1)) - 2.0 * s(vec2(-1, 0)) - 1.0 * s(vec2(-1, 1)) +
     1.0 * s(vec2( 1, -1)) + 2.0 * s(vec2( 1, 0)) + 1.0 * s(vec2( 1, 1))
  ) / 4.0;
  vec3 gy = (
    -1.0 * s(vec2(-1, -1)) - 2.0 * s(vec2(0, -1)) - 1.0 * s(vec2(1, -1)) +
     1.0 * s(vec2(-1,  1)) + 2.0 * s(vec2(0,  1)) + 1.0 * s(vec2(1,  1))
  ) / 4.0;
  gl_FragColor = vec4(dot(gx, gx), dot(gy, gy), dot(gx, gy), 1.0);
}
`;

export const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uDir; // direction * texel
varying vec2 vUv;
void main() {
  // gaussienne sigma ~2, 9 échantillons
  float w[5];
  w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216; w[3] = 0.0540540541; w[4] = 0.0162162162;
  vec4 c = texture2D(tSrc, vUv) * w[0];
  for (int i = 1; i < 5; i++) {
    c += texture2D(tSrc, vUv + uDir * float(i)) * w[i];
    c += texture2D(tSrc, vUv - uDir * float(i)) * w[i];
  }
  gl_FragColor = c;
}
`;

export const KUWAHARA_ANISO_FRAG = /* glsl */ `
${NOISE}
uniform sampler2D tSrc;
uniform float uBrush;
uniform sampler2D tTensor;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uHardness;
uniform float uSharpness;
uniform float uAlpha;
varying vec2 vUv;

// Poids d'un secteur : moyenne pondérée par l'inverse de la variance
vec4 sectorWeight(vec4 m, vec3 s) {
  float n = max(m.w, 1e-5);
  vec3 mean = m.rgb / n;
  vec3 v = abs(s / n - mean * mean);
  float sigma2 = v.r + v.g + v.b;
  float w = 1.0 / (1.0 + pow(uHardness * 1000.0 * sigma2, 0.5 * uSharpness));
  return vec4(mean * w, w);
}

void main() {
  // orientation et anisotropie depuis le tenseur lissé
  vec3 g = texture2D(tTensor, vUv).xyz;
  float disc = sqrt(max(g.y * g.y - 2.0 * g.x * g.y + g.x * g.x + 4.0 * g.z * g.z, 0.0));
  float l1 = 0.5 * (g.y + g.x + disc);
  float l2 = 0.5 * (g.y + g.x - disc);
  vec2 v = vec2(l1 - g.x, -g.z);
  vec2 t = length(v) > 0.0 ? normalize(v) : vec2(0.0, 1.0);
  float phi = -atan(t.y, t.x);
  float A = (l1 + l2 > 0.0) ? (l1 - l2) / (l1 + l2) : 0.0;

  float a = uRadius * clamp((uAlpha + A) / uAlpha, 0.1, 2.0);
  float b = uRadius * clamp(uAlpha / (uAlpha + A), 0.1, 2.0);
  float cp = cos(phi);
  float sp = sin(phi);
  mat2 R = mat2(cp, -sp, sp, cp);
  mat2 S = mat2(0.5 / a, 0.0, 0.0, 0.5 / b);
  mat2 SR = S * R;
  // le noyau est borné par KR (constante de compilation) : la boucle se déroule,
  // ce qui est bien plus rapide que des bornes dynamiques sur ANGLE/Metal
  a = min(a, float(KR));
  b = min(b, float(KR));
  S = mat2(0.5 / a, 0.0, 0.0, 0.5 / b);
  SR = S * R;

  float zeta = 2.0 / uRadius;
  float zeroCross = 0.58;
  float sinZ = sin(zeroCross);
  float eta = (zeta + cos(zeroCross)) / (sinZ * sinZ);

  // 8 accumulateurs explicites (pas de tableaux indexés : bien plus rapide sur GPU)
  vec4 m0 = vec4(0.0), m1 = vec4(0.0), m2 = vec4(0.0), m3 = vec4(0.0);
  vec4 m4 = vec4(0.0), m5 = vec4(0.0), m6 = vec4(0.0), m7 = vec4(0.0);
  vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
  vec3 s4 = vec3(0.0), s5 = vec3(0.0), s6 = vec3(0.0), s7 = vec3(0.0);

  for (int j = -KR; j <= KR; j++) {
    for (int i = -KR; i <= KR; i++) {
      vec2 vv = SR * vec2(float(i), float(j));
      float r2 = dot(vv, vv);
      if (r2 > 0.25) continue;
      vec3 c = texture2D(tSrc, vUv + vec2(float(i), float(j)) * uTexel).rgb;
      vec3 cc = c * c;
      float vxx = zeta - eta * vv.x * vv.x;
      float vyy = zeta - eta * vv.y * vv.y;
      float w0 = max(0.0, vv.y + vxx); w0 *= w0;
      float w2 = max(0.0, -vv.x + vyy); w2 *= w2;
      float w4 = max(0.0, -vv.y + vxx); w4 *= w4;
      float w6 = max(0.0, vv.x + vyy); w6 *= w6;
      vec2 v2 = 0.70710678 * vec2(vv.x - vv.y, vv.x + vv.y);
      vxx = zeta - eta * v2.x * v2.x;
      vyy = zeta - eta * v2.y * v2.y;
      float w1 = max(0.0, v2.y + vxx); w1 *= w1;
      float w3 = max(0.0, -v2.x + vyy); w3 *= w3;
      float w5 = max(0.0, -v2.y + vxx); w5 *= w5;
      float w7 = max(0.0, v2.x + vyy); w7 *= w7;
      float gw = exp(-3.125 * r2) / max(w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7, 1e-5);
      w0 *= gw; w1 *= gw; w2 *= gw; w3 *= gw; w4 *= gw; w5 *= gw; w6 *= gw; w7 *= gw;
      m0 += vec4(c * w0, w0); s0 += cc * w0;
      m1 += vec4(c * w1, w1); s1 += cc * w1;
      m2 += vec4(c * w2, w2); s2 += cc * w2;
      m3 += vec4(c * w3, w3); s3 += cc * w3;
      m4 += vec4(c * w4, w4); s4 += cc * w4;
      m5 += vec4(c * w5, w5); s5 += cc * w5;
      m6 += vec4(c * w6, w6); s6 += cc * w6;
      m7 += vec4(c * w7, w7); s7 += cc * w7;
    }
  }
  vec4 o = sectorWeight(m0, s0) + sectorWeight(m1, s1) + sectorWeight(m2, s2) + sectorWeight(m3, s3)
         + sectorWeight(m4, s4) + sectorWeight(m5, s5) + sectorWeight(m6, s6) + sectorWeight(m7, s7);
  vec3 col = o.rgb / max(o.w, 1e-30);
  // traînées de pinceau orientées le long des formes (plus marquées là où l'image est anisotrope)
  vec2 p = vUv / uTexel;
  vec2 rp = vec2(cp * p.x - sp * p.y, sp * p.x + cp * p.y);
  float streak = vnoise(rp * vec2(0.07, 0.6)) * 0.6 + vnoise(rp * vec2(0.15, 1.3)) * 0.4;
  col *= 1.0 + (streak - 0.5) * uBrush * (0.05 + 0.07 * A);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const KUWAHARA_SIMPLE_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;
void main() {
  const int r = KR;
  vec3 mean[4];
  vec3 sq[4];
  float n[4];
  for (int k = 0; k < 4; k++) { mean[k] = vec3(0.0); sq[k] = vec3(0.0); n[k] = 0.0; }
  for (int j = -r; j <= r; j++) {
    for (int i = -r; i <= r; i++) {
      vec3 c = texture2D(tSrc, vUv + vec2(float(i), float(j)) * uTexel).rgb;
      if (i <= 0 && j <= 0) { mean[0] += c; sq[0] += c * c; n[0] += 1.0; }
      if (i >= 0 && j <= 0) { mean[1] += c; sq[1] += c * c; n[1] += 1.0; }
      if (i <= 0 && j >= 0) { mean[2] += c; sq[2] += c * c; n[2] += 1.0; }
      if (i >= 0 && j >= 0) { mean[3] += c; sq[3] += c * c; n[3] += 1.0; }
    }
  }
  float best = 1e9;
  vec3 col = vec3(0.0);
  for (int k = 0; k < 4; k++) {
    vec3 m = mean[k] / n[k];
    vec3 v = abs(sq[k] / n[k] - m * m);
    float sig = v.r + v.g + v.b;
    if (sig < best) { best = sig; col = m; }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export const COMPOSITE_FRAG = /* glsl */ `
${NOISE}
uniform sampler2D tPaint;
uniform sampler2D tScene;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tPaper;
uniform float uCharId;
uniform vec2 uResolution;
uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uOutline;
uniform float uOutlineWidth;
uniform vec3 uInk;
uniform float uPaper;
uniform float uWobble;
uniform float uGrade;
uniform float uFocusDim;
uniform float uPool;
// étalonnage par heure (daycycle.js) et sa force (0 = étalonnage fixe seul)
uniform vec3 uGradeLow;
uniform vec3 uGradeHigh;
uniform vec3 uGradeLift;
uniform vec2 uGradeCS;
uniform float uHourGrade;
varying vec2 vUv;

// courbe douce : contraste autour de 0,5 sur la luminance (teinte conservée), épaule qui ne brûle
// pas les pastels, tons partagés ombres / hautes lumières, saturation, plancher teinté (jamais noir)
vec3 hourGrade(vec3 col) {
  float l = max(dot(col, vec3(0.299, 0.587, 0.114)), 1e-4);
  float lc = clamp(0.55 + (l - 0.55) * uGradeCS.x, 0.0, 1.2);
  // pied de courbe : les sombres (cheveux, encre) ne s'écrasent pas vers le noir
  lc = max(lc, l * 0.72);
  lc = lc > 0.86 ? 0.86 + 0.14 * (1.0 - exp(-(lc - 0.86) / 0.14)) : lc;
  vec3 c = col * (lc / l);
  c *= mix(uGradeLow, uGradeHigh, smoothstep(0.12, 0.8, lc));
  float l2 = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l2), c, uGradeCS.y);
  c = clamp(c, 0.0, 1.0);
  return uGradeLift + c * (1.0 - uGradeLift);
}

float linDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).r;
  return uNear * uFar / (uFar - z * (uFar - uNear));
}

vec3 decodeN(vec2 e) {
  vec2 a = e * 2.0 - 1.0;
  return vec3(a, sqrt(max(0.0, 1.0 - dot(a, a))));
}

float edgeAt(float d0, vec4 n0, vec2 uv) {
  float d1 = linDepth(uv);
  vec4 n1 = texture2D(tNormal, uv);
  bool sameId = abs(n0.b - n1.b) < 0.002;
  float rel = (d1 - d0) / d0;
  // silhouette : le voisin est nettement plus loin
  float sil = smoothstep(0.05, 0.14, rel);
  if (sameId && n0.a < 0.75) sil = 0.0;
  // frontière entre deux objets (seulement côté objet le plus proche)
  float idE = (!sameId && rel > -0.015) ? 1.0 : 0.0;
  // pli de surface sur un même objet dur
  float crease = 0.0;
  if (sameId && n0.a > 0.75) crease = smoothstep(0.3, 0.6, 1.0 - dot(decodeN(n0.xy), decodeN(n1.xy)));
  return max(max(sil, idE * 0.85), crease * 0.55);
}

void main() {
  vec2 px = 1.0 / uResolution;
  float boil = floor(uTime * 5.0);
  // léger tremblement « papier » de la peinture (statique)
  vec2 pd = vec2(vnoise(vUv * vec2(70.0, 40.0)), vnoise(vUv * vec2(70.0, 40.0) + 7.3)) - 0.5;
  vec2 puv0 = vUv + pd * px * 2.2 * uWobble;
  vec3 col = texture2D(tPaint, puv0).rgb;
  // le joueur échappe en partie à la peinture : visage net sur un décor peint ; les détails fins du ciel
  // (étoiles, étoile filante) aussi : le dôme (id 0) les marque dans l'alpha des normales, sous 0,2
  vec4 nC = texture2D(tNormal, vUv);
  float isChar = step(uCharId - 0.002, nC.b);
  float cielNet = nC.b < 0.001 ? clamp(nC.a * 5.0, 0.0, 1.0) : 0.0;
  col = mix(col, texture2D(tScene, vUv).rgb, max(isChar * 0.65, cielNet));
  // accumulation de pigment aux frontières des aplats (effet aquarelle/gouache)
  if (uPool > 0.0) {
    vec2 o = px * 2.5;
    vec3 nb = texture2D(tPaint, puv0 + vec2(o.x, 0.0)).rgb + texture2D(tPaint, puv0 - vec2(o.x, 0.0)).rgb
            + texture2D(tPaint, puv0 + vec2(0.0, o.y)).rgb + texture2D(tPaint, puv0 - vec2(0.0, o.y)).rgb;
    nb *= 0.25;
    float diff = length(nb - col);
    float darker = step(dot(col, vec3(0.333)), dot(nb, vec3(0.333)) + 0.01);
    col *= 1.0 - smoothstep(0.02, 0.16, diff) * uPool * mix(0.06, 0.16, darker);
  }

  // ---- contours encrés ----
  if (uOutline > 0.0) {
    vec2 lw = vec2(vnoise(vUv * vec2(26.0, 15.0) + boil * 3.1), vnoise(vUv * vec2(26.0, 15.0) + boil * 1.7 + 5.0)) - 0.5;
    vec2 luv = vUv + lw * px * 2.6 * uWobble;
    vec4 n0 = texture2D(tNormal, luv);
    if (n0.a > 0.25) {
      float d0 = linDepth(luv);
      float width = uOutlineWidth * (0.7 + 0.6 * vnoise(vUv * vec2(12.0, 7.0) + boil * 0.37)) * clamp(14.0 / d0, 0.55, 1.5);
      if (n0.a < 0.75) width *= 0.8;
      // contour du joueur un peu plus appuyé
      if (n0.b > uCharId - 0.002) width *= 1.25;
      float e = 0.0;
      e = max(e, edgeAt(d0, n0, luv + vec2( 1.0,  0.0) * px * width));
      e = max(e, edgeAt(d0, n0, luv + vec2(-1.0,  0.0) * px * width));
      e = max(e, edgeAt(d0, n0, luv + vec2( 0.0,  1.0) * px * width));
      e = max(e, edgeAt(d0, n0, luv + vec2( 0.0, -1.0) * px * width));
      // encre teintée par la couleur de l'objet, plus sombre et saturée
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 sat = mix(vec3(l), col, 1.35);
      vec3 ink = sat * uInk;
      float fade = smoothstep(260.0, 70.0, d0);
      col = mix(col, ink, e * uOutline * mix(0.45, 0.88, fade));
    }
  }

  // ---- grain de papier & granulation ----
  vec2 puv = gl_FragCoord.xy / 512.0;
  float paper = texture2D(tPaper, puv).r;
  float paper2 = texture2D(tPaper, puv * 0.37 + 0.31).r;
  col *= mix(1.0, 0.9 + 0.2 * paper, uPaper);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * col * 1.12, (1.0 - paper2) * 0.16 * uPaper * (1.0 - lum));

  // ---- étalonnage : saturation douce, ombres lavande, vignette chaude ----
  float lum2 = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum2), col, 1.0 + 0.16 * uGrade);
  col += vec3(0.025, 0.008, 0.045) * smoothstep(0.55, 0.0, lum2) * uGrade;
  float vig = smoothstep(0.45, 1.05, length((vUv - 0.5) * vec2(1.25, 1.0)));
  col = mix(col, col * vec3(0.86, 0.8, 0.86), vig * 0.55 * uGrade);
  // étalonnage par heure
  col = mix(col, hourGrade(col), uHourGrade);
  // mode concentration : léger voile
  col = mix(col, col * 0.75 + vec3(0.04, 0.03, 0.06), uFocusDim);
  gl_FragColor = vec4(col, 1.0);
}
`;
