import * as THREE from 'three';
import { U, nextId } from '../../core/globals.js';
import { NOISE, MRT_OUT } from '../../render/shaders/chunks.js';
import { buildClumpGeometry } from '../../render/foliage.js';
import { cloudAtlas } from '../../render/textures.js';
import { FS_VERT } from '../../render/shaders/post.js';
import { genererVoute, ETOILES_COULEURS } from './voute.js';

// Le monde courbé fait plonger l'horizon sous l'horizontale. Le ciel est donc
// exprimé dans un « espace ciel » relevé de uHorizonDip : l'horizon peint
// coïncide toujours avec le bord du rouleau, quel que soit l'angle de caméra.
const SKY_SPACE = /* glsl */ `
uniform float uHorizonDip;
vec3 toSkySpace(vec3 d) {
  float el = asin(clamp(d.y, -1.0, 1.0)) + uHorizonDip;
  vec2 hz = normalize(d.xz + vec2(1e-5));
  return vec3(hz.x * cos(el), sin(el), hz.y * cos(el));
}
vec3 fromSkySpace(vec3 d) {
  float el = asin(clamp(d.y, -1.0, 1.0)) - uHorizonDip;
  vec2 hz = normalize(d.xz + vec2(1e-5));
  return vec3(hz.x * cos(el), sin(el), hz.y * cos(el));
}
`;

// ---------------------------------------------------------------------------
// Dôme céleste peint : dégradé brossé, soleil, lune, étoiles
// ---------------------------------------------------------------------------
const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w * 0.99999;
}
`;

const skyFrag = /* glsl */ `
${NOISE}
${MRT_OUT}
${SKY_SPACE}
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uSunSkyDir;
uniform vec3 uMoonDir;
uniform float uStars;
uniform float uNight;
uniform float uTime;
uniform float uRain;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
// éclairs rouges de la tornade (tornade.js) : lueur du ciel dans sa direction
uniform float uEclair;
uniform vec3 uEclairPos;
// voûte nocturne (lot « ciel » : voute, vie, nettete)
uniform float uVoute;
uniform float uVie;
uniform float uNettete;
uniform sampler2D uVouteTex;
uniform mat3 uVouteRot;
uniform float uVouteGraine;
uniform float uPxAngle;
uniform vec3 uEtCol[3];
uniform vec4 uBerger;
uniform vec3 uFilA;
uniform vec3 uFilB;
uniform vec2 uFilT;
varying vec3 vDir;

// Une couche d'étoiles : au plus une étoile par cellule d'une grille posée sur la sphère de rayon n,
// gardée seulement si elle tombe loin des bords de sa cellule (jamais coupée). Rayon en pixels (taille
// d'un pixel : uPxAngle), apparition par éclat quand uStars monte (heure bleue), touche à 4 branches pour
// les plus brillantes. Renvoie la couleur prémultipliée et son opacité ; masque : détail à garder net.
vec4 etoiles(vec3 v, float n, float proba, float densite, float rMax, float bMin, float h, inout float masque) {
  vec3 cell = floor(v * n);
  float g = uVouteGraine;
  if (hash13(cell + g) > proba * densite) return vec4(0.0);
  vec3 sp = vec3(hash13(cell + 1.7 + g), hash13(cell + 3.1 + g), hash13(cell + 5.3 + g)) * 0.5 + 0.25;
  vec3 sd = normalize(cell + sp);
  vec3 q = sd * n - cell;
  if (any(lessThan(q, vec3(0.2))) || any(greaterThan(q, vec3(0.8)))) return vec4(0.0);
  // beaucoup d'étoiles faibles, quelques brillantes
  float b = mix(bMin, 1.0, pow(hash13(cell + 7.9 + g), 2.5));
  float seuil = (1.0 - b) * 0.85;
  float vis = smoothstep(seuil, seuil + 0.2, uStars);
  if (vis <= 0.0) return vec4(0.0);
  float marge = 0.2 / (n * uPxAngle);
  float r = min(mix(0.5, rMax, b), marge - 0.9);
  vec3 o = v - sd;
  float dpx = length(o) / uPxAngle;
  float s = smoothstep(r + 0.9, max(r - 0.7, 0.0), dpx);
  if (b > 0.75 && marge > 3.0) {
    vec3 t1 = normalize(cross(sd, abs(sd.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec2 p = vec2(dot(o, t1), dot(o, cross(sd, t1))) / uPxAngle;
    float L = min(r * 3.2, marge - 0.5);
    float br = max(exp(-p.y * p.y * 1.6) * smoothstep(L, 0.0, abs(p.x)), exp(-p.x * p.x * 1.6) * smoothstep(L, 0.0, abs(p.y)));
    s = max(s, br * smoothstep(0.75, 1.0, b) * 0.8);
  }
  // scintillement doux, plus fort près de l'horizon
  float ph = hash13(cell + 11.3 + g) * 6.2831;
  float amp = uVie * mix(0.5, 0.15, smoothstep(0.0, 0.35, h));
  float tw = 1.0 + amp * (0.6 * sin(uTime * (1.7 + b * 2.6) + ph) + 0.4 * sin(uTime * 4.7 + ph * 3.0));
  float c = hash13(cell + 13.7 + g);
  vec3 tint = c < 0.4 ? uEtCol[0] : c < 0.82 ? uEtCol[1] : uEtCol[2];
  float a = clamp(s * vis * (0.4 + 0.75 * b) * tw, 0.0, 1.0);
  masque = max(masque, a);
  return vec4(tint * a, a);
}

void main() {
  float masque = 0.0;
  vec3 d = toSkySpace(normalize(vDir));
  float h = d.y;
  float az = atan(d.z, d.x);
  // traits horizontaux comme des coups de brosse
  float stroke = fbm(vec2(az * 2.5, h * 9.0) + vec2(uTime * 0.004, 0.0));
  float stroke2 = vnoise(vec2(az * 9.0, h * 40.0));
  float hh = h + (stroke - 0.5) * 0.06 + (stroke2 - 0.5) * 0.012;
  // DÉGRADÉ EN PROFONDEUR (23/11) : horizon lumineux, bleu du milieu, zénith plus profond et plus saturé ;
  // une bande à peine cyan au-dessus de l'horizon ; le ciel s'éclaircit du côté du soleil et se creuse à
  // l'opposé (diffusion) ; avant, le bleu du haut était atteint dès 12° et tout le reste était un aplat
  float jourS = 1.0 - uNight;
  vec3 zenith = mix(uSkyTop, uSkyTop * uSkyTop * 1.25, 0.45 * jourS);
  vec3 col = mix(uSkyHorizon, uSkyTop, pow(smoothstep(-0.01, 0.3, hh), 0.75));
  col = mix(col, zenith, smoothstep(0.22, 0.95, hh));
  col = mix(col, col * vec3(0.95, 1.03, 1.05), smoothstep(0.02, 0.1, hh) * smoothstep(0.38, 0.12, hh) * 0.7 * jourS);
  float sd = dot(d, uSunSkyDir);
  col *= 1.0 + (0.07 * smoothstep(0.2, 1.0, sd) - 0.06 * smoothstep(0.0, -0.9, sd) * smoothstep(0.0, 0.5, hh)) * jourS;
  // bande chaude du côté du soleil près de l'horizon
  float sunAmt = max(dot(d, uSunSkyDir), 0.0);
  float horizonBand = smoothstep(0.16, -0.01, hh);
  col = mix(col, uSunGlow, horizonBand * pow(sunAmt, 1.5) * 0.6 * (1.0 - uNight * 0.8));
  // L'ASTRE (d'après le ciel de l'utilisateur, ciel.js) : le rendu est en 8 bits, rien ne dépasse le blanc ;
  // le disque est donc le seul blanc franc du ciel, et tout ce qui l'entoure reste en dessous, plus chaud et
  // plus saturé (halo serré, puis halo large) : c'est l'écart qui le fait briller. Bas sur l'horizon, il
  // rougit et ses halos s'élargissent. Les rayons et le voile sont ajoutés après la peinture (post.js).
  float jour = (1.0 - uNight) * (1.0 - uRain * 0.8);
  float soleilBas = smoothstep(0.45, 0.0, uSunSkyDir.y);
  vec3 astre = mix(vec3(1.0, 0.95, 0.84), uSunGlow * vec3(1.05, 0.88, 0.72) + vec3(0.05, 0.02, 0.0), soleilBas * 0.85);
  // halos : mêlés au ciel (et non ajoutés : ils ne montent jamais au blanc), saturés et plus chauds que le
  // disque. Large : l'air chargé de lumière sur des dizaines de degrés ; serré : la couronne.
  vec3 haloCol = mix(uSunGlow, astre, 0.35) * vec3(1.0, 0.94, 0.86);
  float lhc = dot(haloCol, vec3(0.299, 0.587, 0.114));
  haloCol *= min(1.0, 0.8 / max(lhc, 1e-3));
  col = mix(col, haloCol, clamp(pow(sunAmt, mix(12.0, 6.0, soleilBas)) * mix(0.42, 0.6, soleilBas), 0.0, 1.0) * jour);
  col = mix(col, haloCol * 1.04, clamp(pow(sunAmt, mix(220.0, 130.0, soleilBas)) * 0.9, 0.0, 1.0) * jour);
  // disque net (bord anticrénelé au pixel près), blanc au cœur, assombri et réchauffé vers le bord
  float ang = acos(clamp(dot(d, uSunSkyDir), -1.0, 1.0));
  const float RAYON_SOLEIL = 0.036;
  float disc = smoothstep(RAYON_SOLEIL + uPxAngle * 1.2, RAYON_SOLEIL - uPxAngle * 1.2, ang) * jour;
  vec3 coeur = mix(vec3(1.0, 0.995, 0.97), astre, soleilBas * 0.35);
  vec3 discCol = mix(coeur, coeur * vec3(1.0, 0.93, 0.84), smoothstep(0.45, 1.0, ang / RAYON_SOLEIL) * 0.55);
  col = mix(col, discCol, disc);
  // gardé net après la peinture, comme les étoiles (alpha des normales, repris par la composition)
  masque = max(masque, disc);
  // lune (croissant)
  float moonAmt = dot(d, uMoonDir);
  float moon = smoothstep(0.99955, 0.9997, moonAmt);
  vec3 offs = normalize(uMoonDir + vec3(0.009, 0.006, 0.0));
  float bite = smoothstep(0.99955, 0.9997, dot(d, offs));
  col = mix(col, vec3(1.0, 0.97, 0.86), moon * (1.0 - bite * 0.9) * uNight);
  col += vec3(0.6, 0.7, 1.0) * pow(max(moonAmt, 0.0), 80.0) * 0.3 * uNight;
  // voûte : voie lactée et nébuleuses (carte précalculée, peinte avec le reste), étoiles nettes
  if (uVoute > 0.5 && uStars > 0.01 && h > -0.02) {
    vec3 v = uVouteRot * d;
    vec4 carte = texture(uVouteTex, vec2(atan(v.z, v.x) / 6.2831853 + 0.5, asin(clamp(v.y, -1.0, 1.0)) / 3.1415927 + 0.5));
    // la lune et le bas du ciel pâlissent la voie lactée
    float lune = 1.0 - 0.6 * pow(max(moonAmt, 0.0), 6.0);
    col += carte.rgb * 1.1 * uStars * smoothstep(0.0, 0.3, h) * lune;
    float densite = mix(0.35, 4.0, carte.a);
    float bas = smoothstep(0.0, 0.06, h);
    vec4 e = etoiles(v, 120.0, 0.1, densite, 0.9, 0.0, h, masque);
    col = col * (1.0 - e.a * bas) + e.rgb * bas;
    e = etoiles(v, 50.0, 0.12, densite, 1.6, 0.25, h, masque);
    col = col * (1.0 - e.a * bas) + e.rgb * bas;
    e = etoiles(v, 22.0, 0.14, min(densite, 1.5), 2.4, 0.55, h, masque);
    col = col * (1.0 - e.a * bas) + e.rgb * bas;
    masque *= bas;
  }
  // étoile du berger : planète brillante au-dessus du soleil couché (ou levant)
  float berger = uBerger.w * uVie;
  if (berger > 0.0) {
    float dpx = length(d - uBerger.xyz) / uPxAngle;
    float a = (smoothstep(3.2, 1.6, dpx) + exp(-dpx * 0.18) * 0.22) * berger;
    col = mix(col, vec3(1.0, 0.97, 0.9), clamp(a, 0.0, 1.0));
    masque = max(masque, smoothstep(3.2, 1.6, dpx) * berger);
  }
  // étoile filante : tête claire, traînée peinte qui s'affine (uFilT : avancée, intensité)
  if (uFilT.y > 0.0 && h > 0.0) {
    vec3 nf = normalize(cross(uFilA, uFilB));
    float tot = acos(clamp(dot(uFilA, uFilB), -1.0, 1.0));
    vec3 pr = normalize(d - nf * dot(d, nf));
    float sf = atan(dot(cross(uFilA, pr), nf), dot(uFilA, pr)) / tot;
    float tete = min(uFilT.x, 1.0);
    float queue = uFilT.x - 0.45;
    float le = clamp((sf - queue) / max(tete - queue, 1e-3), 0.0, 1.0) * step(queue, sf) * step(sf, tete);
    float w = mix(0.3, 1.3, le);
    float a = le * le * smoothstep(w + 0.9, 0.0, abs(dot(d, nf)) / uPxAngle) * uFilT.y;
    col = mix(col, vec3(1.0, 0.96, 0.88), a);
    masque = max(masque, a);
  }
  // étoiles d'avant la voûte (voute = 0)
  if (uVoute < 0.5 && uStars > 0.01 && h > 0.0) {
    vec3 p = d * 160.0;
    vec3 cell = floor(p);
    vec3 f = fract(p);
    float hs = hash13(cell);
    if (hs > 0.972) {
      vec3 sp = vec3(hash13(cell + 1.7), hash13(cell + 3.1), hash13(cell + 5.3)) * 0.6 + 0.2;
      float s = smoothstep(0.18, 0.0, length(f - sp));
      float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hs * 3.0) + hs * 50.0);
      float st = s * tw * uStars * smoothstep(0.0, 0.05, h);
      col += vec3(1.0, 0.95, 0.85) * st;
      masque = max(masque, min(st, 1.0));
    }
  }
  // NUAGES PEINTS DANS LE DÔME (23/11), deux couches qui dérivent sous le vent à des vitesses différentes
  // (les bouffées de nuages restent devant) : voiles d'altitude, longs et fins, et banc bas sur l'horizon,
  // éclairés comme les bouffées (uCloudLit, uCloudShade), réchauffés du côté du soleil
  if (h > -0.01) {
    float pluie = 1.0 - uRain * 0.5;
    vec3 eclaire = mix(uCloudLit, uSunGlow, pow(sunAmt, 4.0) * 0.55 * jourS);
    // voiles : plan à 1 de haut vu d'en bas, bruit étiré dans le vent
    vec2 pv = d.xz / (d.y + 0.12);
    vec2 vt = vec2(0.82, 0.57);
    vec2 q = vec2(dot(pv, vt), dot(pv, vec2(-vt.y, vt.x)));
    q.x += uTime * 0.0035;
    float vo = fbm(vec2(q.x * 1.3, q.y * 4.5)) * 0.75 + vnoise(vec2(q.x * 5.0, q.y * 16.0) + 3.1) * 0.25;
    float voile = smoothstep(0.5, 0.78, vo) * smoothstep(0.04, 0.25, h) * smoothstep(1.0, 0.55, h);
    col = mix(col, eclaire * 1.02, voile * 0.42 * pluie);
    // banc bas : masses douces posées sur l'horizon, dessous plus froid, sommets éclairés
    float ba = fbm(vec2(az * 3.2 + uTime * 0.0012, 1.7)) ;
    float haut = 0.025 + 0.06 * ba * ba + 0.02 * vnoise(vec2(az * 14.0, 4.0));
    float banc = smoothstep(haut, haut - 0.018, h) * smoothstep(0.3, 0.55, ba);
    vec3 bancCol = mix(mix(uCloudShade, uSkyHorizon, 0.45), eclaire, smoothstep(haut - 0.04, haut, h));
    col = mix(col, bancCol, banc * 0.75 * pluie);
  }
  // lueur rouge des éclairs de la tornade : large halo dans sa direction, plus fort près de l'horizon
  if (uEclair > 0.001) {
    float vE = max(dot(normalize(vDir), normalize(uEclairPos - cameraPosition)), 0.0);
    col += vec3(1.0, 0.15, 0.1) * uEclair * (pow(vE, 10.0) * 0.45 + pow(vE, 60.0) * 0.5);
  }
  // sous l'horizon : brume marine
  col = mix(col, uSkyHorizon * vec3(0.94, 0.97, 1.0), smoothstep(0.0, -0.05, h));
  // tramage d'un quart de niveau : pas de paliers dans les grands dégradés
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  // détails fins marqués dans l'alpha des normales (≤ 0,2 : sous le seuil des contours) ; la composition
  // les reprend nets, après la peinture
  writeGBuffer(col, -normalize(vDir), 0.0, clamp(masque, 0.0, 1.0) * 0.2 * uNettete);
}
`;

// ---------------------------------------------------------------------------
// Nuages : bouffées billboard à normales sphériques, placées en espace ciel
// ---------------------------------------------------------------------------
const cloudVert = /* glsl */ `
${SKY_SPACE}
attribute vec2 aCorner;
attribute vec4 aData;
uniform float uCloudRot;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalW;
varying float vShade;
varying float vHeight;
varying vec3 vVue;
void main() {
  // position en espace ciel (relative à la caméra), tournée lentement
  float c = cos(uCloudRot);
  float s = sin(uCloudRot);
  vec3 rel = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);
  float r = length(rel);
  vec3 dirW = fromSkySpace(rel / r);
  vHeight = rel.y / r;
  vec4 wp = vec4(cameraPosition + dirW * r, 1.0);
  vVue = dirW;
  vec4 mv = viewMatrix * wp;
  float ang = aData.y * 6.2831;
  vec2 corner = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * aCorner;
  mv.xy += corner * aData.x;
  vec3 n = normal;
  n = vec3(c * n.x - s * n.z, n.y, s * n.x + c * n.z);
  vec3 cornerW = transpose(mat3(viewMatrix)) * vec3(corner, 0.0);
  vNormalW = normalize(n + cornerW * 0.45);
  float idx = aData.w;
  vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0));
  vUv = (aCorner * 0.5 + 0.5 + cell) * 0.5;
  vShade = aData.z;
  gl_Position = projectionMatrix * mv;
}
`;
const cloudFrag = /* glsl */ `
${MRT_OUT}
uniform sampler2D uLeafTex;
uniform vec3 uSunDir;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uSunGlow;
uniform vec3 uSkyHorizon;
uniform float uNight;
uniform float uRain;
uniform float uId;
varying vec2 vUv;
varying vec3 vNormalW;
varying float vShade;
varying float vHeight;
varying vec3 vVue;
void main() {
  vec4 tex = texture(uLeafTex, vUv);
  if (tex.a < 0.5) discard;
  vec3 N = normalize(vNormalW);
  float ndl = dot(N, uSunDir) * 0.5 + 0.5;
  // rampe plus douce (volume plutôt qu'aplats durs)
  float r = smoothstep(0.3, 0.5, ndl) * 0.45 + smoothstep(0.52, 0.72, ndl) * 0.35 + smoothstep(0.72, 0.92, ndl) * 0.2;
  // dessous froid (ombre teintée de ciel), sommets chauds
  vec3 ombre = mix(uCloudShade, uCloudShade * vec3(0.94, 0.97, 1.08), smoothstep(0.1, -0.6, N.y));
  vec3 col = mix(ombre, uCloudLit * mix(vec3(1.0), vec3(1.03, 1.0, 0.95), smoothstep(0.3, 0.9, N.y)), r);
  col = mix(col, col * 0.93, (1.0 - vShade) * 0.4);
  // liseré argenté : l'astre derrière le nuage allume son bord
  float jourN = 1.0 - uNight;
  float dos = pow(max(dot(normalize(vVue), uSunDir), 0.0), 6.0);
  float bord = smoothstep(0.35, 0.85, 1.0 - abs(dot(N, normalize(vVue))));
  col += mix(uCloudLit, uSunGlow, 0.5) * dos * bord * 0.45 * jourN;
  col *= 0.97 + 0.06 * tex.g;
  col = mix(col, col * vec3(0.78, 0.8, 0.88), uRain * 0.6);
  // brume vers l'horizon
  col = mix(col, uSkyHorizon, smoothstep(0.12, 0.0, vHeight) * 0.45);
  writeGBuffer(col, N, uId, 0.5);
}
`;

// ---------------------------------------------------------------------------
// Carte de la voûte, calculée une fois au chargement (équirectangulaire, espace voûte) : RGB = lueur
// de la voie lactée, des nébuleuses et des amas (à ajouter au ciel), A = densité d'étoiles
// ---------------------------------------------------------------------------
const VOUTE_FRAG = /* glsl */ `
${NOISE}
uniform vec3 uGal;
uniform vec3 uGalC;
uniform vec3 uBruit;
uniform vec4 uNeb[5];
uniform vec3 uNebCol[5];
uniform vec4 uAmas[6];
varying vec2 vUv;
float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise3(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return s;
}
void main() {
  float lon = (vUv.x - 0.5) * 6.2831853;
  float lat = (vUv.y - 0.5) * 3.1415927;
  vec3 v = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  // bande galactique ondulée, plus large et plus claire vers le centre
  float g = dot(v, uGal) + (fbm3(v * 3.0 + uBruit) - 0.5) * 0.12;
  float coeur = pow(max(dot(v, uGalC), 0.0), 3.0);
  float largeur = 0.12 + 0.1 * coeur;
  float bande = exp(-g * g / (largeur * largeur));
  float nuees = fbm3(v * 9.0 + uBruit.yzx);
  float lueur = bande * (0.35 + 0.85 * nuees) * (0.55 + 0.9 * coeur);
  // bandes de poussière : filaments sombres le long du milieu de l'arche
  float poussiere = exp(-pow((g - 0.025 * coeur) / 0.05, 2.0)) * smoothstep(0.38, 0.62, fbm3(v * 6.0 + uBruit.zxy));
  lueur *= 1.0 - 0.75 * poussiere;
  vec3 col = lueur * mix(vec3(0.74, 0.72, 0.96), vec3(1.0, 0.9, 0.8), coeur) * 0.42;
  // nébuleuses pastel : nuées bosselées
  for (int i = 0; i < 5; i++) {
    float dd = 1.0 - dot(v, uNeb[i].xyz);
    float r = uNeb[i].w;
    float f = exp(-dd * 2.0 / (r * r));
    float forme = smoothstep(0.25, 0.75, fbm3(v * 16.0 + float(i) * 7.3 + uBruit));
    col += uNebCol[i] * f * (0.25 + forme) * 0.22;
  }
  float densite = 0.3 + 1.6 * bande * (0.4 + nuees) * (1.0 - 0.7 * poussiere);
  // amas : beaucoup d'étoiles serrées, lueur douce
  for (int i = 0; i < 6; i++) {
    float dd = 1.0 - dot(v, uAmas[i].xyz);
    float f = exp(-dd * 2.0 / (uAmas[i].w * uAmas[i].w));
    densite += f * 3.5;
    col += vec3(0.86, 0.88, 1.0) * f * 0.12;
  }
  gl_FragColor = vec4(col, clamp(densite / 4.0, 0.0, 1.0));
}
`;

// Prépare la carte de la voûte (une passe de shader dans une cible de 1024 × 512)
function preparerVoute(renderer, voute) {
  const rt = new THREE.WebGLRenderTarget(1024, 512, { depthBuffer: false, generateMipmaps: false });
  rt.texture.wrapS = THREE.RepeatWrapping;
  rt.texture.minFilter = THREE.LinearFilter;
  rt.texture.magFilter = THREE.LinearFilter;
  const v3 = (a) => new THREE.Vector3(...a);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uGal: { value: v3(voute.galaxie) },
      uGalC: { value: v3(voute.centre) },
      uBruit: { value: v3(voute.bruit) },
      uNeb: { value: voute.nebuleuses.map((n) => new THREE.Vector4(...n.dir, n.rayon)) },
      uNebCol: { value: voute.nebuleuses.map((n) => new THREE.Color(n.couleur).multiplyScalar(n.force)) },
      uAmas: { value: voute.amas.map((a) => new THREE.Vector4(...a.dir, a.rayon)) },
    },
    vertexShader: FS_VERT,
    fragmentShader: VOUTE_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, new THREE.Camera());
  renderer.setRenderTarget(prev);
  mat.dispose();
  quad.geometry.dispose();
  return rt;
}

function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildClouds() {
  const rand = rng(12);
  const clumps = [];
  // 24/11/2026 (demande de l'utilisateur : « supprime les nuages encombrants ») : 7 bouffées au lieu de 18,
  // toutes hautes dans le ciel ; plus aucune posée sur l'horizon, devant les reliefs et les paysages lointains
  const count = 7;
  const R = 520;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.25;
    // élévation en espace ciel (radians) : au-dessus des reliefs (≥ 0,2 rad, soit ~11°)
    const el = 0.2 + rand() * 0.14;
    const cx = Math.cos(a) * Math.cos(el) * R;
    const cy = Math.sin(el) * R;
    const cz = Math.sin(a) * Math.cos(el) * R;
    const n = 5 + Math.floor(rand() * 5);
    const scale = 13 + rand() * 12;
    const tx = -Math.sin(a);
    const tz = Math.cos(a);
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const off = (u - 0.5) * scale * 2.8;
      const r = scale * (0.5 + Math.sin(u * Math.PI) * 0.65) * (0.8 + rand() * 0.3);
      clumps.push({
        x: cx + tx * off + (rand() - 0.5) * scale * 0.3,
        y: cy + r * 0.25 + (rand() - 0.5) * scale * 0.15,
        z: cz + tz * off + (rand() - 0.5) * scale * 0.3,
        r,
        squash: 0.6,
        density: 0.1,
      });
    }
  }
  const geo = buildClumpGeometry(clumps, 99, { sizeMul: 1.05, minQuads: 10, maxQuads: 24 });
  const mat = new THREE.ShaderMaterial({
    name: 'cloud',
    glslVersion: THREE.GLSL3,
    uniforms: { ...U, uLeafTex: { value: cloudAtlas() }, uId: { value: nextId() } },
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;
  mesh.name = 'clouds';
  return mesh;
}

export class Sky {
  constructor() {
    this.group = new THREE.Group();
    const geo = new THREE.SphereGeometry(900, 48, 24);
    this.voute = genererVoute();
    const mat = new THREE.ShaderMaterial({
      name: 'sky',
      glslVersion: THREE.GLSL3,
      uniforms: {
        ...U,
        uVouteTex: { value: null },
        uVouteRot: { value: new THREE.Matrix3() },
        uVouteGraine: { value: this.voute.etoiles },
        uPxAngle: { value: 0.001 },
        uEtCol: { value: ETOILES_COULEURS.map((c) => new THREE.Color(c)) },
        uFilA: { value: new THREE.Vector3(1, 0, 0) },
        uFilB: { value: new THREE.Vector3(0, 1, 0) },
        uFilT: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.clouds = buildClouds();
    this.group.add(this.dome, this.clouds);
    // repère du pôle céleste : est (a) et point haut de l'équateur céleste au sud (c)
    const p = new THREE.Vector3(...this.voute.pole);
    this.pole = p;
    this.poleA = new THREE.Vector3().crossVectors(p, new THREE.Vector3(0, 1, 0)).normalize();
    this.poleC = new THREE.Vector3().crossVectors(this.poleA, p);
    this.filante = { t: -1, dur: 1, attente: 8 + Math.random() * 20 };
  }

  // carte de la voûte : une passe au chargement (renderer prêt)
  prepare(renderer) {
    if (this.vouteRT) return;
    this.vouteRT = preparerVoute(renderer, this.voute);
    this.dome.material.uniforms.uVouteTex.value = this.vouteRT.texture;
  }

  // la voûte tourne autour du pôle céleste au fil des heures (un tour par jour canonique)
  tourneVoute(heure) {
    const th = (heure / 24) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const a = this.poleA;
    const b = this.poleC;
    const p = this.pole;
    const e1 = [a.x * c + b.x * s, a.y * c + b.y * s, a.z * c + b.z * s];
    const e3 = [-a.x * s + b.x * c, -a.y * s + b.y * c, -a.z * s + b.z * c];
    this.dome.material.uniforms.uVouteRot.value.set(...e1, p.x, p.y, p.z, ...e3);
  }

  // étoile filante rare (une toutes les 20 à 60 s), seulement la nuit et avec le réglage « vie »
  filantes(dt) {
    const f = this.filante;
    const u = this.dome.material.uniforms;
    if (f.t < 0) {
      f.attente -= dt;
      if (f.attente > 0 || U.uStars.value < 0.5 || U.uVie.value < 0.5) return;
      const az = Math.random() * Math.PI * 2;
      const el = 0.45 + Math.random() * 0.6;
      const a = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
      // vers le bas, un peu de biais
      const az2 = az + (Math.random() - 0.5) * 0.5;
      const el2 = el - 0.12 - Math.random() * 0.14;
      u.uFilA.value.copy(a);
      u.uFilB.value.set(Math.cos(az2) * Math.cos(el2), Math.sin(el2), Math.sin(az2) * Math.cos(el2));
      f.t = 0;
      f.dur = 0.7 + Math.random() * 0.5;
      f.attente = 20 + Math.random() * 40;
    }
    f.t += dt / f.dur;
    if (f.t >= 1.45) {
      f.t = -1;
      u.uFilT.value.set(0, 0);
      return;
    }
    u.uFilT.value.set(f.t, Math.sin(Math.min(f.t / 1.45, 1) * Math.PI));
  }

  update(camera, dt, heure = 0) {
    this.dome.position.copy(camera.position);
    this.dome.material.uniforms.uPxAngle.value = THREE.MathUtils.degToRad(camera.fov) / window.innerHeight;
    this.tourneVoute(heure);
    this.filantes(dt);
    U.uCloudRot.value += dt * 0.004 * (1 + U.uRain.value * 2);
  }
}

// Calcule l'angle (radians) dont l'horizon du rouleau plonge sous l'horizontale
export function computeHorizonDip(camera, origin, forward, curvature) {
  let best = -Infinity;
  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  for (let s = 0; s <= 3000; s += s < 80 ? 1.5 : s < 600 ? 8 : 40) {
    const px = origin.x + forward.x * s;
    const pz = origin.z + forward.y * s;
    const py = -curvature * s * s;
    const hd = Math.hypot(px - cx, pz - cz);
    const el = Math.atan2(py - cy, hd);
    if (el > best) best = el;
  }
  return Math.max(0, -best);
}
