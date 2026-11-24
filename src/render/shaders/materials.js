import * as THREE from 'three';
import { U, nextId } from '../../core/globals.js';
import { NOISE, PAINT, HERBE, FAMILLE, CURVE, WIND, SHADOW, TOON, MRT_OUT } from './chunks.js';

// ---------------------------------------------------------------------------
// Matériau toon générique (décors, terrain, personnages)
// ---------------------------------------------------------------------------
// Bascule des arbres entre la version proche (feuilles une à une, arbresProches.js) et la version forêt
// (touffes) : décidée par instance dans le shader, à la distance (horizontale) de l'arbre au joueur.
// LOD_LOIN : l'instance disparaît en deçà de uLodProche ; LOD_PROCHE : au-delà. Uniformes partagés,
// réglés par world/islands/arbresProches.js.
export const LOD_ARBRES = {
  uLodProche: { value: 0 },
  uLodCentre: { value: new THREE.Vector2(1e9, 1e9) },
};
const LOD_GLSL = /* glsl */ `
#if defined(LOD_LOIN) || defined(LOD_PROCHE)
uniform float uLodProche;
uniform vec2 uLodCentre;
// vrai si l'instance (repère m) n'est pas de cette version : ses sommets sont envoyés hors du cadre
bool horsLod(mat4 m) {
  float dl = distance(m[3].xz, uLodCentre);
  #ifdef LOD_LOIN
  return dl < uLodProche;
  #else
  return dl >= uLodProche;
  #endif
}
#endif
`;
const HORS_CADRE = 'gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return;';

const toonVert = /* glsl */ `
${CURVE}
${WIND}
${LOD_GLSL}
uniform float uWindAmount;
uniform vec3 uPlayerPos;
#ifdef CHARACTER
// matières du joueur : position et normale de la pose de dessin (les motifs suivent le tissu)
varying vec3 vPosP;
varying vec3 vNorP;
#endif
#ifdef ROCHE
// rochers : origine et échelle de l'instance, position dans le repère du modèle
varying vec3 vOrig;
varying vec3 vPosR;
varying float vSc;
#endif
#ifdef ECORCE
// écorce peinte : position et normale dans le repère du modèle (projection sur deux plans verticaux)
varying vec3 vPosL;
varying vec3 vNorL;
varying float vEcorce;
#endif
#ifdef CHEVEUX
// cheveux du joueur : position rapportée à la calotte de la coupe (1 = sa surface) et sens des brins
// (de la calotte vers la pointe des mèches), porté par les os des mèches qui bougent
uniform vec3 uCapC;
uniform vec3 uCapR;
varying vec3 vCapL;
varying vec3 vBrinT;
varying float vCheveu;  // ≥ 1 : sommet des cheveux (aSway posé par la coupe, coupes/index.js)
varying vec3 vBrinL;    // sens des brins, repère de liaison (pour tracer les brins sur la mèche)
varying vec3 vNorB;     // normale, repère de liaison
varying vec3 vPosB;     // position, repère de liaison
#endif
#ifdef PLIS
// plis des vêtements du joueur (22/11/2026) : aux jointures qui plient le tissu (taille, épaules, coudes,
// hanches, genoux), côté intérieur du pli. Par os : pivot (repère du modèle) et os parent de la jointure de
// l'os (w, −1 : aucune) ; axe de l'os, du pivot vers le bas du membre, et l'os enfant dont la jointure plie
// aussi les sommets de cet os (w, −1 : aucun). Réglés par Character.setAvatar.
uniform vec4 uPliOs[24];
uniform vec4 uPliAxe[24];
// pour chacune des deux jointures (celle de l'os, celle de son enfant) : distance au pivot le long du membre
// (m), côté intérieur du pli (normale · sens du pli), côté (normale · travers), flexion (≈ angle, rad)
varying vec4 vPliA;
varying vec4 vPliC;
varying float vTissu; // 1 : tissu qui se plie (Parts.on(…, tissu), aSway −1), 0 : le reste (sac, bottes…)
#endif
#ifdef USE_AID
attribute float aId;
varying float vId;
#endif
#if defined(USE_TINT) || defined(CHEVEUX)
attribute float aTint;
#endif
#if defined(USE_SWAY) || defined(CHEVEUX) || defined(PLIS)
attribute float aSway;
#endif
#ifdef FACE
varying vec2 vUv;
#endif
#include <skinning_pars_vertex>
#if defined(PLIS) && defined(USE_SKINNING)
// jointure de l'os parent p et de l'os enfant c (pivot et axe de c), vue d'un sommet (pos, nor : repère du
// modèle) : le sens du pli est le chemin que fait l'axe de l'enfant en tournant par rapport au parent
vec4 pliJointure(float p, float c, vec3 pos, vec3 nor) {
  vec4 J = uPliOs[int(c)];
  vec3 ax = uPliAxe[int(c)].xyz;
  mat3 Rrel = mat3(bindMatrixInverse) * inverse(mat3(getBoneMatrix(p))) * mat3(getBoneMatrix(c)) * mat3(bindMatrix);
  vec3 d = Rrel * ax - ax;
  float flex = length(d);
  vec3 dedans = d / max(flex, 1e-5);
  vec3 cote = normalize(cross(ax, dedans) + vec3(1e-6));
  return vec4(dot(pos - J.xyz, ax), dot(nor, dedans), dot(nor, cote), flex);
}
#endif
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vColor;
varying float vViewDist;
void main() {
  vec3 transformed = position;
  vec3 objectNormal = normal;
  #ifdef CHEVEUX
  vec3 posLiaison = position;
  #endif
  #ifdef USE_SKINNING
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  #endif
  #ifdef PLIS
  vTissu = 1.0 - step(-0.5, aSway);
  vPliA = vec4(0.0);
  vPliC = vec4(0.0);
  #ifdef USE_SKINNING
  // l'os du sommet (Parts.build : skinIndex.x) ; sa jointure (avec son parent) et celle de son enfant
  if (vTissu > 0.5) {
    float os = skinIndex.x;
    float parent = uPliOs[int(os)].w;
    float enfant = uPliAxe[int(os)].w;
    if (parent >= 0.0) vPliA = pliJointure(parent, os, position, normal);
    if (enfant >= 0.0) vPliC = pliJointure(os, enfant, position, normal);
  }
  #endif
  #endif
  #ifdef FACE
  vUv = uv;
  #endif
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  #if defined(LOD_LOIN) || defined(LOD_PROCHE)
  if (horsLod(m)) { ${HORS_CADRE} }
  #endif
  #ifdef CHEVEUX
  vCapL = (posLiaison - uCapC) / uCapR;
  vCheveu = aSway;
  // sens des brins : l'axe de la mèche (aSway : tangage, aTint : lacet), ou depuis la calotte
  vec3 brinL = normalize(posLiaison - uCapC);
  if (aSway > 1.001) {
    float lacet = (aTint - 0.5) * 6.2831853;
    float tangage = (aSway - 1.5) * 3.1415927;
    brinL = vec3(cos(tangage) * cos(lacet), sin(tangage), cos(tangage) * sin(lacet));
  }
  vBrinL = brinL;
  vNorB = normal;
  vPosB = posLiaison;
  #ifdef USE_SKINNING
  brinL = (skinMatrix * vec4(brinL, 0.0)).xyz;
  #endif
  vBrinT = normalize(mat3(m) * brinL);
  #endif
  #ifdef ECORCE
  vPosL = transformed;
  vNorL = objectNormal;
  vEcorce = 1.0;
  #ifdef USE_TINT
  vEcorce = aTint;
  #endif
  #endif
  vec4 wp = m * vec4(transformed, 1.0);
  #ifdef USE_WIND
  float hgt = max(position.y, 0.0);
  #ifdef USE_SWAY
  hgt = aSway;
  #endif
  wp.xyz += windOffset(wp.xyz, uWindAmount * hgt * hgt, m[3].x * 0.7 + m[3].z * 0.3 + wp.x * 0.37);
  // la végétation s'écarte doucement au passage du personnage
  vec2 dp = wp.xz - uPlayerPos.xz;
  float pd = length(dp);
  float push = smoothstep(0.9, 0.0, pd) * min(hgt * 2.2, 1.0);
  wp.xz += normalize(dp + 0.0001) * push * 0.22;
  wp.y -= push * 0.06;
  #endif
  vWorldPos = wp.xyz;
  #ifdef CHARACTER
  vPosP = position;
  vNorP = normal;
  #endif
  #ifdef ROCHE
  vOrig = m[3].xyz;
  vPosR = transformed;
  vSc = length(m[0].xyz);
  #endif
  vNormalW = normalize(transpose(inverse(mat3(m))) * objectNormal);
  vColor = vec3(1.0);
  #ifdef USE_COLOR
  vColor = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
  #ifdef USE_TINT
  vColor *= mix(vec3(1.0), instanceColor, aTint);
  #else
  vColor *= instanceColor;
  #endif
  #endif
  #ifdef USE_AID
  vId = aId;
  #endif
  vec4 cp = applyCurve(wp);
  vec4 mv = viewMatrix * cp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const toonFrag = /* glsl */ `
${NOISE}
${PAINT}
${SHADOW}
${TOON}
${MRT_OUT}
uniform vec3 uColor;
uniform float uId;
uniform float uOutline;
uniform float uRim;
uniform vec3 uEmissive;
uniform float uEmissiveNight;
uniform float uPigment;
#ifdef EMISSIVE_VCOLOR
uniform float uEmissiveVC;
#endif
#ifdef FACE
uniform sampler2D uFaceTex;
uniform vec4 uEyeCell;
uniform vec4 uMouthCell;
varying vec2 vUv;
#endif
#ifdef TERRAIN
uniform sampler2D uPathTex;
uniform vec4 uHeightBounds;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
${HERBE}
#endif
#ifdef TERRAIN_HOLE
// rectangle (local) où les tuiles au mètre remplacent ce relief simplifié
uniform vec4 uHole;
#endif
uniform vec3 uWorldOffset;
#ifdef USE_AID
varying float vId;
#endif
#ifdef CHARACTER
uniform vec3 uSkyTop;
uniform float uJoueur;
varying vec3 vPosP;
varying vec3 vNorP;
#endif
#ifdef CHEVEUX
uniform float uCheveux;
varying vec3 vCapL;
varying vec3 vBrinT;
varying float vCheveu;
varying vec3 vBrinL;
varying vec3 vNorB;
varying vec3 vPosB;
#endif
#ifdef PLIS
uniform float uPlis;
uniform vec3 uPeau;
varying vec4 vPliA;
varying vec4 vPliC;
varying float vTissu;
// plis d'une jointure J (vPliA ou vPliC) : trois ou quatre plis serrés du côté intérieur, en arcs qui
// s'incurvent vers la jointure sur les côtés, d'autant plus marqués que le membre se plie ; rien du côté
// extérieur (le tissu y est tendu) ni sur un membre droit. Rend la hauteur du relief (m) ; creux : fond des
// plis (0 à 1, pour l'ombre peinte)
float pliJointure(vec4 J, inout float creux) {
  float a = smoothstep(0.1, 0.8, J.w) * smoothstep(-0.15, 0.65, J.y) * exp(-J.x * J.x / 0.0025);
  float s = sin((J.x + 0.025 * J.z * J.z) * 170.0 + J.z * 0.7);
  creux = max(creux, a * smoothstep(0.35, 0.95, -s));
  return a * 0.0055 * s;
}
#endif
#ifdef ROCHE
varying vec3 vOrig;
varying vec3 vPosR;
varying float vSc;
#endif
#ifdef ECORCE
uniform sampler2D uEcorceTex;
varying vec3 vPosL;
varying vec3 vNorL;
varying float vEcorce;
#endif
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vColor;
varying float vViewDist;
void main() {
  #ifdef TERRAIN_HOLE
  if (vWorldPos.x > uHole.x && vWorldPos.x < uHole.z && vWorldPos.z > uHole.y && vWorldPos.z < uHole.w) discard;
  #endif
  vec3 N = normalize(vNormalW);
  #ifdef DOUBLE_SIDED
  if (!gl_FrontFacing) N = -N;
  #endif
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 albedo = uColor * vColor;
  // position absolue pour les bruits (continue quand l'origine se recentre)
  vec3 wA = vWorldPos + uWorldOffset;
  // variation de pigment, comme une couche de gouache irrégulière
  float pv = pigmentVar(wA);
  albedo *= 1.0 + (pv - 0.5) * 0.16 * uPigment;
  // CHEVEUX : les mèches gardent leur couleur peinte, avec des brins : un motif qui ne dépend que de la
  // direction depuis la calotte, donc étiré le long de chaque mèche (des lignes qui suivent les pics), en
  // paquets (basse fréquence) et en brins (haute fréquence) ; racines plus sombres, pointes plus claires.
  // Masque : les sommets marqués par la coupe (vCheveu)
  float cheveu = 0.0;
  float brins = 0.5;
  #ifdef CHEVEUX
  float rl = length(vCapL);
  cheveu = step(0.5, vCheveu) * uCheveux;
  if (cheveu > 0.0) {
    // repère de la mèche : le long des brins (v), en travers (u), dans le plan de sa surface
    vec3 Tb = normalize(vBrinL);
    vec3 Bx = normalize(cross(Tb, normalize(vNorB)) + vec3(1e-5));
    float u = dot(vPosB, Bx);
    float v = dot(vPosB, Tb);
    // brins (environ 8 mm : cinq ou six par mèche), paquets plus larges, et quelques raies sombres entre
    // eux ; tous très étirés le long de la mèche : des touches de pinceau, pas des cheveux un par un.
    // Valeur moyenne gardée (la couleur peinte ne fonce pas)
    float fins = vnoise(vec2(u * 120.0, v * 4.0));
    float paquets = vnoise(vec2(u * 45.0 + 11.0, v * 2.0));
    brins = 0.6 * paquets + 0.4 * fins;
    float raie = smoothstep(0.66, 0.82, vnoise(vec2(u * 85.0 + 5.3, v * 3.0)));
    float pointe = smoothstep(1.0, 1.8, rl);
    // les brins se lisent en reflets clairs, à peine creusés de raies : des cheveux, pas du bois veiné
    albedo *= (0.93 + 0.14 * brins) * (1.0 - 0.1 * raie) * mix(0.9, 1.08, pointe);
    albedo += albedo * 0.22 * smoothstep(0.62, 0.9, fins) * smoothstep(0.3, 0.7, paquets);
  }
  #endif
  #ifdef ECORCE
  // écorce peinte (brosse sèche verticale, textures.js) projetée sur les deux plans verticaux du modèle,
  // et sur le plan horizontal pour les branches couchées ; creux refroidis (jamais de gris)
  vec3 an = abs(normalize(vNorL));
  float ea = texture(uEcorceTex, vec2(vPosL.x * 2.2, vPosL.y * 0.9)).r;
  float eb = texture(uEcorceTex, vec2(vPosL.z * 2.2, vPosL.y * 0.9)).r;
  float ec = mix(ea, eb, an.x / max(an.x + an.z, 1e-3));
  ec = mix(ec, texture(uEcorceTex, vPosL.xz * 2.2).r, smoothstep(0.6, 0.9, an.y));
  vec3 brosse = albedo * (0.62 + 0.76 * ec);
  brosse = mix(brosse, brosse * vec3(0.86, 0.86, 1.07), smoothstep(0.45, 0.2, ec) * 0.6);
  albedo = mix(albedo, brosse, vEcorce);
  #endif
  #ifdef ROCHE
  // ROCHERS (ROC-001, ROC-002) : la forme reste celle du modèle ; la matière vient d'ici. Repère du
  // modèle (vPosR) pour ce qui suit la pierre, monde (pr) pour ce qui se raccorde au sol.
  {
    const vec3 LR = vec3(0.299, 0.587, 0.114);
    float mousseP = smoothstep(0.03, 0.1, albedo.g - max(albedo.r, albedo.b));
    float roc = 1.0 - mousseP;
    vec2 o = vOrig.xz + uWorldOffset.xz;
    float t = hash12(floor(o * 3.0) + 0.71);
    #ifdef MOUSSU
    // rocher moussu : le chapeau de mousse du modèle (un couvercle plat) est remplacé par une mousse peinte
    // sur la pierre (4. plus bas), qui épouse sa forme
    if (mousseP > 0.5) discard;
    #endif
    // 1. relief ciselé : facettes douces et strates, en relief d'ombrage (comme les plis, au pixel)
    vec3 dirS = normalize(vec3(fract(t * 13.1) - 0.5, 1.6, fract(t * 5.7) - 0.5));
    float sS = dot(vPosR, dirS) * 7.0 + vnoise(vPosR.xz * 3.0 + t * 9.0) * 2.0;
    float hR = (vnoise(vPosR.xz * 2.2 + vPosR.y * 1.3) * 0.7 + vnoise(vPosR.zy * 4.1 + 3.3) * 0.3) * 0.11
             + smoothstep(0.3, 0.7, sin(sS) * 0.5 + 0.5) * 0.012;
    vec3 dpx = dFdx(vWorldPos);
    vec3 dpy = dFdy(vWorldPos);
    vec3 r1 = cross(dpy, N);
    vec3 r2 = cross(N, dpx);
    float det = dot(dpx, r1);
    vec3 grad = (dFdx(hR) * r1 + dFdy(hR) * r2) / (abs(det) + 1e-12) * sign(det);
    N = normalize(N - grad * vSc * roc * 0.9);
    // 2. teinte de chaque rocher (chaud ocre ou froid ardoise) et valeur ; strates un peu plus claires
    vec3 teinte = mix(vec3(0.93, 0.95, 1.06), vec3(1.06, 0.98, 0.88), t) * (0.94 + 0.12 * fract(t * 7.3));
    float strate = smoothstep(0.2, 0.9, sin(sS) * 0.5 + 0.5);
    albedo = mix(albedo, albedo * teinte * (0.94 + 0.1 * strate), roc);
    // 3. lichen ocre en petites taches, rare
    vec3 pr = vPosR * vSc + vec3(o.x, 0.0, o.y);
    float lic = smoothstep(0.76, 0.84, vnoise(pr.xz * 2.6 + pr.y * 1.7)) * roc;
    albedo = mix(albedo, vec3(0.88, 0.72, 0.42) * (dot(albedo, LR) / 0.62), lic * 0.4);
    // 4. mousse sur le dessus (faces au ciel, bord brouillé), vert sourd accordé au tapis
    float dessus = smoothstep(0.5, 0.88, N.y + (vnoise(pr.xz * 1.8) - 0.5) * 0.5);
    float mo = dessus * smoothstep(0.4, 0.7, vnoise(pr.xz * 0.9 + 3.1)) * roc * 0.7;
    #ifdef MOUSSU
    // tapis de mousse épais sur le dessus et coulant un peu sur les flancs, bord frangé
    float haut = smoothstep(0.25, 0.55, vPosR.y + (vnoise(vPosR.xz * 4.0 + t * 5.0) - 0.5) * 0.3);
    mo = max(mo, smoothstep(0.05, 0.45, N.y + 0.25) * haut * 0.95);
    #endif
    albedo = mix(albedo, vec3(0.52, 0.62, 0.36) * (0.9 + 0.2 * vnoise(pr.xz * 6.0)), mo);
    // 5. pied : ancré dans le sol, plus sombre et plus froid sur le premier tiers de mètre
    float pied = 1.0 - smoothstep(0.0, 0.28 * vSc, vWorldPos.y - vOrig.y);
    albedo *= mix(vec3(1.0), vec3(0.84, 0.85, 0.92), pied * 0.45);
  }
  #endif
  #ifdef FACE
  // visage peint : bouche puis yeux (atlas prémultiplié), sur la couleur de peau
  vec4 fm = texture(uFaceTex, uMouthCell.xy + vUv * uMouthCell.zw);
  albedo = albedo * (1.0 - fm.a) + fm.rgb;
  vec4 fe = texture(uFaceTex, uEyeCell.xy + vUv * uEyeCell.zw);
  albedo = albedo * (1.0 - fe.a) + fe.rgb;
  #endif
  #ifdef TERRAIN
  #ifndef NO_PATH
  // chemins peints : bord net mais irrégulier, lisière plus foncée
  vec2 puv = (vWorldPos.xz - uHeightBounds.xy) / uHeightBounds.zw;
  float pd = texture(uPathTex, puv).r * 2.0;
  float pw = 0.6 + (vnoise(wA.xz * 1.3) - 0.5) * 0.22 + (vnoise(wA.xz * 4.0) - 0.5) * 0.06;
  float onGround = smoothstep(0.72, 0.9, vWorldPos.y) * smoothstep(0.7, 0.85, N.y);
  float inner = smoothstep(pw + 0.04, pw - 0.04, pd) * onGround;
  float rim = (smoothstep(pw + 0.16, pw + 0.04, pd) - inner) * onGround;
  albedo = mix(albedo, vec3(0.86, 0.75, 0.56), clamp(rim, 0.0, 1.0) * 0.45);
  vec3 pathCol = vec3(0.965, 0.9, 0.76) * (0.95 + 0.08 * vnoise(wA.xz * 2.2));
  albedo = mix(albedo, pathCol, inner);
  #endif
  // rides de sable sur la plage
  float sand = smoothstep(0.78, 0.6, vWorldPos.y) * smoothstep(-0.2, 0.08, vWorldPos.y) * smoothstep(0.85, 0.95, N.y);
  float ripple = sin(dot(wA.xz, vec2(0.8, 0.6)) * 6.0 + vnoise(wA.xz * 0.7) * 5.0);
  albedo *= 1.0 - sand * smoothstep(0.6, 0.95, ripple) * 0.05;
  // terre et roche (relief) : sur le sol vert, passé 20° de pente, la terre chaude d'automne se
  // découvre par plaques (solNu, HERBE : les brins s'y effacent) ; lisière un peu plus sombre
  const vec3 LT = vec3(0.299, 0.587, 0.114);
  float verte = smoothstep(0.03, 0.1, albedo.g - max(albedo.r, albedo.b)) * smoothstep(0.75, 0.95, vWorldPos.y);
  float nu = solNu(wA.xz, N.y) * verte;
  vec3 terre = mix(vec3(0.57, 0.47, 0.37), vec3(0.67, 0.57, 0.43), vnoise(wA.xz / 5.0 + 7.7));
  terre *= clamp(dot(albedo, LT) / 0.42, 0.75, 1.15);
  albedo = mix(albedo, terre, nu * 0.75);
  albedo *= 1.0 - 0.32 * nu * (1.0 - nu) * verte;
  // touches peintes sur l'herbe et strates dans la falaise
  float grassMask = smoothstep(0.75, 0.9, N.y) * smoothstep(0.75, 0.95, vWorldPos.y);
  albedo = grassTouches(albedo, wA, grassMask);
  // sol herbeux (vert) : mêmes plaques et mêmes ondes de vent que les brins du tapis
  float herbeuse = grassMask * smoothstep(0.03, 0.1, albedo.g - max(albedo.r, albedo.b));
  albedo = mix(albedo, herbeVarie(albedo, herbePlaque(wA.xz)), herbeuse);
  albedo *= 1.0 + 0.1 * herbeOnde(wA.xz) * herbeuse;
  albedo = mix(albedo, herbePastel(albedo * herbePinceau(wA.xz), 0.2), herbeuse);
  float cliff = 1.0 - smoothstep(0.55, 0.8, N.y);
  float strata = sin(vWorldPos.y * 5.5 + vnoise(wA.xz * 0.5) * 3.0);
  albedo = mix(albedo, albedo * (0.93 + 0.08 * strata), cliff);
  // roche des falaises et des montagnes : grès chaud en bas, pierre plus claire et froide (lavande) en
  // altitude (limite brouillée de ± 25 m, pas de bandes), veines rose poussiéreux de 20 à 30 m, grain de
  // 3 m ; à la valeur de la couleur peinte (la DA des zones garde la main), neige épargnée
  float altR = vWorldPos.y + (vnoise(wA.xz / 60.0) - 0.5) * 50.0;
  vec3 roche = mix(vec3(0.8, 0.63, 0.5), vec3(0.74, 0.7, 0.8), smoothstep(50.0, 180.0, altR));
  roche = mix(roche, vec3(0.86, 0.66, 0.62), smoothstep(0.55, 0.8, vnoise(wA.xz / 27.0 + wA.y * 0.02)) * 0.5);
  roche *= clamp(dot(albedo, LT) / 0.5, 0.7, 1.15) * (0.92 + 0.12 * vnoise(wA.xz * 0.35 + wA.y * 0.5));
  // neige : presque blanche seulement (les parois claires du biome givré, #c9d8e8, ne sont pas de la neige ;
  // l'ancien seuil de 0,72 coupait toutes les retouches de roche sur ces montagnes)
  float neige = smoothstep(0.86, 0.95, min(albedo.r, min(albedo.g, albedo.b)));
  albedo = mix(albedo, roche, cliff * 0.55 * (1.0 - neige));
  // coulées d'érosion : traînées verticales le long de la paroi (bruit étiré dans la pente, 1 m de large,
  // 12 m de haut), plus sombres et plus froides dans les creux ; et arêtes un peu plus claires au soleil
  vec2 hz = normalize(vec2(-N.z, N.x) + vec2(1e-4));
  float uC = dot(wA.xz, hz);
  float coulee = vnoise(vec2(uC * 1.1, wA.y / 12.0)) * 0.65 + vnoise(vec2(uC * 3.3 + 5.0, wA.y / 5.0)) * 0.35;
  albedo *= mix(vec3(1.0), mix(vec3(0.84, 0.85, 0.94), vec3(1.07, 1.03, 0.97), coulee), cliff * 0.7 * (1.0 - neige));
  // MONTAGNES (23/11, 2e passe), à lire de loin (silhouettes des îles au-delà de 600 m, même shader) :
  // 1. ravines larges (8 m × 70 m) sur toutes les pentes, creux froids et arêtes claires ;
  float altM = vWorldPos.y + (vnoise(wA.xz / 80.0) - 0.5) * 40.0;
  // deux octaves fixes dans le monde : la fine (8 m) de près, la large (40 m × 300 m) prend le relais au
  // loin, où la fine fait moins d'un pixel et disparaît sous la peinture (rien ne glisse en marchant)
  float loinM = smoothstep(250.0, 700.0, vViewDist);
  float rav = mix(vnoise(vec2(uC * 0.12, wA.y / 70.0)) * 0.7 + vnoise(vec2(uC * 0.35 + 3.0, wA.y / 30.0)) * 0.3,
                  vnoise(vec2(uC / 40.0 + 9.1, wA.y / 260.0)) * 0.7 + vnoise(vec2(uC / 17.0, wA.y / 110.0)) * 0.3, loinM);
  float penteM = 1.0 - smoothstep(0.6, 0.92, N.y);
  albedo *= mix(vec3(1.0), mix(vec3(0.8, 0.81, 0.92), vec3(1.08, 1.05, 0.98), smoothstep(0.3, 0.7, rav)), penteM * mix(0.55, 0.65, loinM) * (1.0 - neige));
  // 2. maquis et bosquets sur les flancs raides, de 20 à 150 m : taches de vert profond ou d'olive (des
  //    forêts vues de loin), qui donnent l'échelle et cassent le rose uniforme des parois ;
  float maq = smoothstep(0.5, 0.68, mix(vnoise(wA.xz / 22.0 + 7.3) * 0.65 + vnoise(wA.xz / 9.0 - 2.1) * 0.35,
                                         vnoise(wA.xz / 110.0 + 2.2) * 0.65 + vnoise(wA.xz / 45.0 - 6.4) * 0.35, loinM));
  float bandeM = smoothstep(15.0, 35.0, altM) * smoothstep(160.0, 120.0, altM) * smoothstep(0.42, 0.62, N.y) * smoothstep(0.92, 0.8, N.y) * (1.0 - neige);
  vec3 bois = mix(vec3(0.34, 0.46, 0.31), vec3(0.52, 0.47, 0.29), vnoise(wA.xz / 60.0)) * (0.88 + 0.24 * vnoise(wA.xz / 4.0));
  albedo = mix(albedo, bois * clamp(dot(albedo, LT) / 0.5, 0.75, 1.1), maq * bandeM * 0.6);
  // 3. en altitude : poudre claire sur les replats au-dessus de 170 m (pas sur les parois)
  float poudre = smoothstep(170.0, 230.0, altM) * smoothstep(0.62, 0.86, N.y) * smoothstep(0.38, 0.62, vnoise(wA.xz / 14.0));
  albedo = mix(albedo, vec3(0.93, 0.93, 0.97), poudre * 0.6 * (1.0 - neige));
  #endif
  #ifdef PLIS
  // PLIS DES VÊTEMENTS (le tissu marqué : pull, manches, salopette, jupe ; pas la peau, sa couleur ; ni le
  // sac, les bottes, la ceinture) : un relief d'ombrage, au pixel, fait des plis des jointures qui se plient
  // (taille, épaules, coudes, hanches, genoux), côté intérieur ; les creux un peu plus sombres. Au repos,
  // membres droits : rien (restent les plis modelés, corps/index.js)
  float tissu = uPlis * vTissu * (1.0 - cheveu) * smoothstep(0.06, 0.14, distance(vColor, uPeau));
  if (tissu > 0.0) {
    float creux = 0.0;
    // hauteur du relief (m)
    float hP = pliJointure(vPliA, creux) + pliJointure(vPliC, creux);
    vec3 dpx = dFdx(vWorldPos);
    vec3 dpy = dFdy(vWorldPos);
    vec3 r1 = cross(dpy, N);
    vec3 r2 = cross(N, dpx);
    float det = dot(dpx, r1);
    vec3 grad = (dFdx(hP) * r1 + dFdy(hP) * r2) / (abs(det) + 1e-12) * sign(det);
    N = normalize(N - grad * tissu);
    albedo *= 1.0 - 0.34 * tissu * creux;
  }
  #endif
  #if defined(CHARACTER) && defined(PLIS)
  // MATIÈRES DU JOUEUR (23/11/2026) : motifs dans le repère de la pose de dessin (ils suivent le tissu),
  // projetés sur deux plans verticaux mêlés selon la normale ; reconnus par la couleur et le marquage :
  //   tricot (tissu souple, pas bleu) : côtes de 1,1 cm et mailles en V de 0,8 cm ;
  //   jean (tissu bleu) : sergé en diagonale et délavé par plaques (genoux, devant), coutures plus claires ;
  //   cuir (pièces rigides brun foncé : bottes, ceinture, sac) : grain et éraflures claires ;
  //   peau : joues et nez un peu rosés (repère de la tête), rien d'autre.
  // Le joueur est repris à 65 % hors peinture (post.js) : les détails fins restent lisibles de près.
  if (uJoueur > 0.0) {
    const vec3 LJ = vec3(0.299, 0.587, 0.114);
    vec3 nP = normalize(vNorP);
    float wx = abs(nP.x) / max(abs(nP.x) + abs(nP.z), 1e-3);
    float u = mix(vPosP.x, vPosP.z, wx);
    float v = vPosP.y;
    float peau = 1.0 - smoothstep(0.06, 0.14, distance(vColor, uPeau));
    float bleu = smoothstep(0.04, 0.14, albedo.b - albedo.r);
    float souple = vTissu * (1.0 - cheveu) * (1.0 - peau);
    float tricot = souple * (1.0 - bleu);
    float jean = souple * bleu;
    float lJ = dot(albedo, LJ);
    float cuir = (1.0 - vTissu) * (1.0 - cheveu) * (1.0 - peau) * smoothstep(0.02, 0.08, albedo.r - albedo.b) * (1.0 - smoothstep(0.38, 0.5, lJ));
    // tricot : colonnes de côtes, chaque maille en V (décalée d'une demi-maille par colonne)
    float colK = u / 0.011;
    float kx = abs(fract(colK) - 0.5) * 2.0;
    float row = fract(v / 0.008 + kx * 0.45 + floor(colK) * 0.5);
    float maille = (0.9 + 0.12 * smoothstep(0.15, 0.55, row) * smoothstep(1.0, 0.7, row)) * (0.96 + 0.06 * (1.0 - kx));
    albedo *= mix(1.0, maille, tricot);
    // jean : sergé (diagonales de 5 mm), délavé par plaques, grain
    float serge = smoothstep(0.35, 0.65, fract((u + v) / 0.005));
    float dela = smoothstep(0.5, 0.82, vnoise(vec2(u, v) * 9.0 + 3.1) * 0.7 + vnoise(vec2(u, v) * 23.0) * 0.3);
    vec3 jeanCol = albedo * (0.9 + 0.13 * serge);
    jeanCol = mix(jeanCol, mix(vec3(lJ), jeanCol, 0.7) * 1.2 + vec3(0.03, 0.04, 0.05), dela * 0.6);
    albedo = mix(albedo, jeanCol, jean);
    // cuir : grain fin, éraflures claires aux arêtes (où la normale tourne vite)
    float grain = vnoise(vec2(u, v) * 140.0) * 0.6 + vnoise(vec2(u, v) * 45.0) * 0.4;
    float arete = smoothstep(0.6, 2.4, length(fwidth(nP)) / max(length(fwidth(vPosP)), 1e-4) * 0.01);
    albedo = mix(albedo, albedo * (0.86 + 0.2 * grain) + vec3(0.08, 0.05, 0.03) * arete, cuir);
    // peau : joues rosées (devant de la tête, sous les yeux), un peu de rose au bout du nez
    float joue = peau * smoothstep(1.3, 1.36, vPosP.y) * smoothstep(1.5, 1.42, vPosP.y) * smoothstep(0.0, 0.5, nP.z);
    albedo = mix(albedo, albedo * vec3(1.06, 0.9, 0.9), joue * 0.5);
  }
  #endif
  float sh = sampleShadow(vWorldPos, N);
  vec3 col = toonShade(albedo, N, V, sh, uRim);
  col += lanternLight(albedo, vWorldPos, N);
  col += eclairRouge(albedo, vWorldPos, N);
  #ifdef CHARACTER
  // liseré de lune : le joueur reste lisible la nuit
  float fresC = 1.0 - max(dot(N, V), 0.0);
  col += vec3(0.62, 0.66, 0.95) * smoothstep(0.5, 0.9, fresC) * 0.34 * uNight;
  // LUMIÈRE DÉTAILLÉE DU JOUEUR : il doit appartenir à la scène, pas flotter dessus. Toutes ces lumières
  // suivent l'astre et passent sous les ombres portées (sous un arbre, le joueur s'éteint avec le sol).
  float jourC = 1.0 - uNight;
  vec3 avantJoueur = col;
  float ndlC = dot(N, uSunDir);
  float soleilC = sh * smoothstep(-0.05, 0.25, ndlC);
  // 1. reflet : une tache claire franche (deux paliers, comme peinte) et un lustre plus large, doux
  vec3 Hc = normalize(uSunDir + V);
  float nh = max(dot(N, Hc), 0.0);
  float reflet = smoothstep(0.86, 0.9, pow(nh, 30.0)) * 0.35 + smoothstep(0.3, 0.9, pow(nh, 5.0)) * 0.1;
  col += uSunColor * reflet * soleilC * jourC * 0.5 * (1.0 - cheveu);
  #ifdef CHEVEUX
  // reflet des cheveux : une bande le long des brins (Kajiya-Kay), deux lobes (un net, blanc ; un large, de
  // la couleur des cheveux), décalés par les brins : la bande se casse en mèches
  if (cheveu > 0.0) {
    vec3 T = normalize(vBrinT);
    vec3 T1 = normalize(T + N * (brins - 0.5) * 0.6);
    vec3 T2 = normalize(T + N * (0.3 + (brins - 0.5) * 0.4));
    float s1 = sqrt(max(1.0 - dot(T1, Hc) * dot(T1, Hc), 0.0));
    float s2 = sqrt(max(1.0 - dot(T2, Hc) * dot(T2, Hc), 0.0));
    float bande = smoothstep(0.78, 0.92, pow(s1, 36.0)) * (0.4 + 0.9 * brins);
    float lustre = pow(s2, 10.0);
    col += (uSunColor * bande * 0.3 + albedo * uSunColor * lustre * 0.32) * soleilC * jourC;
  }
  #endif
  // 2. contre-jour : l'astre derrière le joueur dessine un liseré chaud sur sa silhouette, du côté
  // éclairé seulement (un vrai bord de lumière, pas un halo tout autour)
  float dos = smoothstep(-0.1, 0.65, dot(-V, uSunDir));
  float bordC = smoothstep(0.5, 0.82, fresC) * smoothstep(-0.35, 0.2, ndlC);
  col += uSunColor * mix(vec3(1.0), uRimColor, 0.4) * bordC * dos * mix(0.25, 1.0, sh) * jourC * 0.6;
  // 3. ciel et sol : le dessus prend la teinte du ciel, le dessous le rebond du sol (biome)
  col += albedo * (uSkyAmbient * max(N.y, 0.0) * 0.1 + uBounceColor * max(-N.y, 0.0) * 0.22) * mix(1.0, 0.4, uNight);
  // 4. diffusion sous la surface : bande chaude et saturée juste avant le terminateur (peau, tissu)
  float diff = smoothstep(-0.2, 0.05, ndlC) * smoothstep(0.32, 0.02, ndlC);
  col += albedo * vec3(1.0, 0.42, 0.28) * diff * 0.24 * jourC * mix(0.35, 1.0, sh);
  // 5. reflet du ciel en incidence rasante (Fresnel), surtout sur les faces tournées vers le haut
  col += mix(uSkyHorizon, uSkyTop, 0.5) * pow(fresC, 4.0) * clamp(N.y + 0.35, 0.0, 1.0) * 0.14 * jourC;
  col = mix(avantJoueur, col, uJoueur);
  #endif
  col += uEmissive * mix(1.0, uNight, uEmissiveNight);
  #ifdef EMISSIVE_VCOLOR
  // lueur propre à chaque sommet (maillages fusionnés de plusieurs couleurs)
  col += vColor * uEmissiveVC * mix(1.0, uNight, uEmissiveNight);
  #endif
  col = applyFog(col, vViewDist, vWorldPos);
  float id = uId;
  #ifdef USE_AID
  id = vId;
  #endif
  writeGBuffer(col, N, id, uOutline);
}
`;

export function toonMaterial(opts = {}) {
  const {
    color = 0xffffff,
    vertexColors = false,
    id = nextId(),
    outline = 1,
    rim = 1,
    wind = 0,
    emissive = 0x000000,
    emissiveNight = false,
    side = THREE.FrontSide,
    aId = false,
    terrain = false,
    paths = true,
    hole = false,
    pigment = 1,
    tintMask = false,
    sway = false,
    emissiveVColor = 0,
    face = null,
    character = false,
    warmShadow = 0,
    // écorce peinte (texture de render/textures.js, ecorceTexture) ; lod : 'loin' ou 'proche' (arbres)
    ecorce = null,
    lod = null,
    // joueur : brins et reflet des cheveux (calotte de la coupe posée par Character.setAvatar) ; plis animés
    // des vêtements aux jointures (Character.setAvatar : peau, jointures)
    cheveux = false,
    plis = false,
    // rochers : relief ciselé, teinte par rocher, strates, lichen, mousse, pied (ROCHE) ; 'mousse' : rocher
    // moussu (MOUSSU)
    roche = false,
  } = opts;
  const defines = {};
  if (wind > 0) defines.USE_WIND = '';
  if (ecorce) defines.ECORCE = '';
  if (lod === 'loin') defines.LOD_LOIN = '';
  if (lod === 'proche') defines.LOD_PROCHE = '';
  if (aId) defines.USE_AID = '';
  if (terrain) defines.TERRAIN = '';
  if (terrain && !paths) defines.NO_PATH = '';
  if (hole) defines.TERRAIN_HOLE = '';
  if (tintMask) defines.USE_TINT = '';
  if (sway) defines.USE_SWAY = '';
  if (emissiveVColor > 0) defines.EMISSIVE_VCOLOR = '';
  if (face) defines.FACE = '';
  if (character) defines.CHARACTER = '';
  if (cheveux) defines.CHEVEUX = '';
  if (plis) defines.PLIS = '';
  if (roche) defines.ROCHE = '';
  if (roche === 'mousse') defines.MOUSSU = '';
  return new THREE.ShaderMaterial({
    name: 'toon',
    glslVersion: THREE.GLSL3,
    defines,
    uniforms: {
      ...U,
      uColor: { value: new THREE.Color(color) },
      uId: { value: id },
      uOutline: { value: outline },
      uRim: { value: rim },
      uWarmShadow: { value: warmShadow },
      uWindAmount: { value: wind },
      uEmissive: { value: new THREE.Color(emissive) },
      uEmissiveNight: { value: emissiveNight ? 1 : 0 },
      uPigment: { value: pigment },
      uEmissiveVC: { value: emissiveVColor },
      uFaceTex: { value: face },
      uEyeCell: { value: new THREE.Vector4(0, 0.8, 0.25, 0.2) },
      uMouthCell: { value: new THREE.Vector4(0, 0.4, 0.25, 0.2) },
      uHole: { value: new THREE.Vector4(1e9, 1e9, -1e9, -1e9) },
      uEcorceTex: { value: ecorce },
      ...LOD_ARBRES,
      uCapC: { value: new THREE.Vector3() },
      uCapR: { value: new THREE.Vector3(1, 1, 1) },
      uCheveux: { value: 0 },
      uPlis: { value: plis ? 1 : 0 },
      uPeau: { value: new THREE.Color(1, 0.8, 0.7) },
      // jointures des plis (PLIS) : sans jointure par défaut (w = −1), réglées par Character.setAvatar
      ...(plis && {
        uPliOs: { value: Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 0, -1)) },
        uPliAxe: { value: Array.from({ length: 24 }, () => new THREE.Vector4(0, -1, 0, -1)) },
      }),
    },
    vertexShader: toonVert,
    fragmentShader: toonFrag,
    vertexColors,
    side,
  });
}

// ---------------------------------------------------------------------------
// Feuillages et nuages : touffes de billboards à normales sphériques
// ---------------------------------------------------------------------------
const foliageVert = /* glsl */ `
${CURVE}
${WIND}
${LOD_GLSL}
attribute vec2 aCorner;
attribute vec4 aData;   // x: taille, y: aléa, z: ombrage interne (0 coeur, 1 surface), w: index atlas
attribute vec3 aCenter; // centre de la touffe
uniform float uWindAmount;
uniform float uCurveMul;
#if defined(LOD_LOIN) || defined(LOD_PROCHE)
// arbre : origine absolue et normale de la touffe (famille de couleur, FAMILLE)
varying vec2 vArbre;
varying vec3 vNorC;
#endif
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vShade;
varying float vRand;
varying float vViewDist;
varying vec3 vColor;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  #if defined(LOD_LOIN) || defined(LOD_PROCHE)
  if (horsLod(m)) { ${HORS_CADRE} }
  #endif
  vec4 wp = m * vec4(position, 1.0);
  vec3 center = (m * vec4(aCenter, 1.0)).xyz;
  float isc = length(m[0].xyz);
  #ifdef USE_WIND
  wp.xyz += windOffset(center, uWindAmount, center.x * 0.37 + center.z * 0.21);
  wp.xyz += vec3(sin(uTime * 3.1 + aData.y * 40.0), 0.0, cos(uTime * 2.7 + aData.y * 31.0)) * 0.035 * uWindAmount * uWindStrength * 4.0;
  #endif
  vWorldPos = wp.xyz;
  vec3 nW = normalize(mat3(m) * normal);
  #if defined(LOD_LOIN) || defined(LOD_PROCHE)
  vArbre = m[3].xz + uWorldOffset.xz;
  vNorC = nW;
  #endif
  vec4 cp = wp;
  cp.y += (applyCurve(wp).y - wp.y) * uCurveMul;
  vec4 mv = viewMatrix * cp;
  float ang = aData.y * 6.2831 + sin(uTime * 0.8 + aData.y * 10.0) * 0.06;
  float c = cos(ang);
  float s = sin(ang);
  vec2 corner = mat2(c, s, -s, c) * aCorner;
  mv.xy += corner * aData.x * isc;
  vec3 cornerW = transpose(mat3(viewMatrix)) * vec3(corner, 0.0);
  #ifdef LOD_LOIN
  // arbres : bombé de chaque touffe réduit (elle ne se lit plus comme une boule ; la couronne porte le volume)
  vNormalW = normalize(nW + cornerW * 0.22);
  #else
  vNormalW = normalize(nW + cornerW * 0.45);
  #endif
  float idx = aData.w;
  vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0));
  vUv = (aCorner * 0.5 + 0.5 + cell) * 0.5;
  vShade = aData.z;
  vRand = aData.y;
  vColor = vec3(1.0);
  #ifdef USE_COLOR
  vColor = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vColor *= instanceColor;
  #endif
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const foliageFrag = /* glsl */ `
${NOISE}
${FAMILLE}
${SHADOW}
${TOON}
${MRT_OUT}
#ifdef VITRAIL
uniform float uVitrail;
#endif
uniform sampler2D uLeafTex;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uId;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vShade;
varying float vRand;
varying float vViewDist;
varying vec3 vColor;
#if defined(LOD_LOIN) || defined(LOD_PROCHE)
varying vec2 vArbre;
varying vec3 vNorC;
#endif
void main() {
  vec4 tex = texture(uLeafTex, vUv);
  if (tex.a < 0.5) discard;
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  {
  vec3 albedo = mix(uColor, uColor2, vRand) * vColor;
  #if defined(LOD_LOIN) || defined(LOD_PROCHE)
  albedo = familleArbre(albedo, vArbre, normalize(vNorC));
  #endif
  albedo *= mix(0.62, 1.0, vShade);
  #ifdef LOD_LOIN
  // grappes de feuilles : la valeur peinte de chaque feuille (claire en haut, sombre au cœur) compte davantage
  albedo *= 0.62 + 0.55 * tex.g;
  #else
  albedo *= 0.9 + 0.2 * tex.g;
  #endif
  #ifdef LOD_LOIN
  // touffes d'un arbre : l'ombre est lue un peu en avant de la couronne (normale tirée vers son enveloppe),
  // hors du volume qui la projette (arbresProches : couronnes en lobes) ; le côté au soleil reste éclairé
  float sh = sampleShadow(vWorldPos + N * 0.6, N);
  #else
  float sh = sampleShadow(vWorldPos, N);
  #endif
  vec3 col = toonShade(albedo, N, V, sh, 1.0);
  #ifdef VITRAIL
  // translucidité vers le soleil (voir feuilleFrag) : le bord des touffes s'allume en contre-jour
  vec3 axe = normalize(-uSunDir + N * 0.32);
  float sss = pow(max(dot(V, axe), 0.0), 2.4) * mix(0.22, 1.0, sh) * (1.0 - uNight) * mix(0.4, 1.0, vShade);
  col += mix(albedo * 1.15, uSunColor * vec3(1.0, 0.97, 0.8), 0.45) * sss * uVitrail * 0.6;
  // épaule : la lumière qui traverse ne pousse jamais le feuillage au jaune fluo (valeur plafonnée en
  // douceur à 0,86, teinte gardée)
  {
    float lF = dot(col, vec3(0.299, 0.587, 0.114));
    col *= lF > 0.7 ? (0.7 + 0.16 * (1.0 - exp(-(lF - 0.7) / 0.16))) / lF : 1.0;
  }
  #endif
  col += lanternLight(albedo, vWorldPos, N);
  col += eclairRouge(albedo, vWorldPos, N);
  col = applyFog(col, vViewDist, vWorldPos);
  writeGBuffer(col, N, uId, 0.5);
  }
}
`;

export function foliageMaterial(opts = {}) {
  const {
    color = 0x8fd18a,
    color2 = 0xb4e39a,
    leafTex,
    wind = 0.12,
    id = nextId(),
    vertexColors = false,
    // arbres : lod 'loin' (version forêt, voir LOD_ARBRES) et translucidité des touffes vers le soleil
    lod = null,
    vitrail = 0,
  } = opts;
  const defines = {};
  if (wind > 0) defines.USE_WIND = '';
  if (lod === 'loin') defines.LOD_LOIN = '';
  if (lod === 'proche') defines.LOD_PROCHE = '';
  if (vitrail > 0) defines.VITRAIL = '';
  return new THREE.ShaderMaterial({
    name: 'foliage',
    glslVersion: THREE.GLSL3,
    defines,
    uniforms: {
      ...U,
      uLeafTex: { value: leafTex },
      uColor: { value: new THREE.Color(color) },
      uColor2: { value: new THREE.Color(color2) },
      uId: { value: id },
      uWindAmount: { value: wind },
      uCurveMul: { value: 1.0 },
      uVitrail: { value: vitrail },
      ...LOD_ARBRES,
    },
    vertexShader: foliageVert,
    fragmentShader: foliageFrag,
    vertexColors,
  });
}

// ---------------------------------------------------------------------------
// Feuilles une à une (portage du matériau « feuille » de l'utilisateur, da.js) : cartes pliées et
// découpées (atlas peint, textures.js), teinte d'exposition par feuille, éclairage toon du jeu (ombres
// teintées, paliers), translucidité vers le soleil (« vitrail ») et liseré. Le vent : la ramure se balance
// comme le bois (même formule, calculée à l'attache de la feuille), et chaque feuille frémit autour de
// son attache, plus fort dans les rafales. CHUTE : feuilles qui tombent (arbresProches.js), tout le
// mouvement calculé ici (chute en spirale, culbute, dérive au vent, pose et effacement au sol).
// ---------------------------------------------------------------------------
const feuilleVert = /* glsl */ `
${CURVE}
${WIND}
${LOD_GLSL}
uniform float uWindAmount;
uniform float uFlutter;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vNorC;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vViewDist;
varying vec2 vArbre;
#ifdef CHUTE
attribute vec3 iDepart;  // point de départ (repère du groupe)
attribute vec4 iChute;   // phase, vitesse (cycles/s), culbute, taille
// iSol.zw : origine de l'arbre (famille de couleur)
attribute vec4 iSol;     // hauteur du sol sous le départ, case de l'atlas
mat3 rotAxe(vec3 a, float t) {
  float c = cos(t);
  float s = sin(t);
  return mat3(c + a.x * a.x * (1.0 - c), a.y * a.x * (1.0 - c) + a.z * s, a.z * a.x * (1.0 - c) - a.y * s,
              a.x * a.y * (1.0 - c) - a.z * s, c + a.y * a.y * (1.0 - c), a.z * a.y * (1.0 - c) + a.x * s,
              a.x * a.z * (1.0 - c) + a.y * s, a.y * a.z * (1.0 - c) - a.x * s, c + a.z * a.z * (1.0 - c));
}
#else
attribute vec3 aAncre;
attribute float aSway;
attribute vec2 aFeuille;
attribute vec3 aNorC;
#endif
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  #if defined(LOD_LOIN) || defined(LOD_PROCHE)
  if (horsLod(m)) { ${HORS_CADRE} }
  #endif
  vColor = vec3(1.0);
  #ifdef USE_COLOR
  vColor = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vColor *= instanceColor;
  #endif
  #ifdef CHUTE
  // p : 0 au départ, 1 au sol ; la feuille tourne en spirale et dérive dans le sens du vent
  float p = fract(uTime * iChute.y + iChute.x);
  float h = max(iDepart.y - iSol.x, 0.5);
  float a = iChute.x * 6.2831 + p * 9.0;
  float r = 0.35 + 0.45 * sin(p * 7.0 + iChute.x * 6.0);
  vec2 wd = normalize(uWindDir + vec2(1e-4)) * uWindStrength * p * h * 0.6;
  // posée au sol sur la fin de sa course, puis effacée
  float y = max(iDepart.y - h * p * 1.12, iSol.x + 0.02);
  vec3 c = vec3(iDepart.x + cos(a) * r + wd.x, y, iDepart.z + sin(a) * r + wd.y);
  float t = uTime * iChute.z + iChute.x * 17.0;
  vec3 ax = normalize(vec3(sin(t * 0.37), 0.6, cos(t * 0.29)));
  float pose = smoothstep(0.86, 0.95, p);
  mat3 R = rotAxe(ax, t * (1.0 - pose)) ;
  vec3 lp = R * (position - vec3(0.0, 0.5, 0.0));
  // à plat une fois posée
  lp = mix(lp, vec3(lp.x, 0.0, lp.y), pose);
  float taille = iChute.w * smoothstep(0.0, 0.05, p) * (1.0 - smoothstep(0.95, 1.0, p));
  vec4 wp = m * vec4(c + lp * taille, 1.0);
  vec3 nL = mix(R * normal, vec3(0.0, 1.0, 0.0), pose);
  vNormalW = normalize(mat3(m) * nL);
  vNorC = vNormalW;
  float cell = iSol.y;
  vUv = vec2(mod(cell, 2.0) * 0.5, (1.0 - floor(cell / 2.0)) * 0.5) + uv * 0.5;
  #else
  vec3 anc = (m * vec4(aAncre, 1.0)).xyz;
  vec4 wp = m * vec4(position, 1.0);
  // frémissement : la feuille tourne un peu autour de son attache, plus fort dans les rafales
  vec3 d = wp.xyz - anc;
  float ph = aFeuille.x * 6.2831;
  float gust = 0.6 + 0.4 * sin(dot((anc + uWorldOffset).xz, uWindDir) * 0.15 - uTime * 0.9);
  float ang = (sin(uTime * (4.0 + aFeuille.y * 5.0) + ph) * 0.6 + sin(uTime * 9.3 + ph * 3.0) * 0.25) * uFlutter * uWindStrength * (0.35 + gust);
  vec3 ax = normalize(vec3(uWindDir.y, 0.35, -uWindDir.x) + vec3(sin(ph), 0.0, cos(ph)) * 0.5);
  wp.xyz += cross(ax, d) * ang;
  // balancement de la ramure : la formule du bois (toonVert, USE_SWAY), calculée à l'attache
  wp.xyz += windOffset(anc, uWindAmount * aSway * aSway, m[3].x * 0.7 + m[3].z * 0.3 + anc.x * 0.37);
  vNormalW = normalize(mat3(m) * normal);
  vNorC = normalize(mat3(m) * aNorC);
  vUv = uv;
  #endif
  #ifdef CHUTE
  vArbre = (modelMatrix * vec4(iSol.z, 0.0, iSol.w, 1.0)).xz + uWorldOffset.xz;
  #else
  vArbre = m[3].xz + uWorldOffset.xz;
  #endif
  vWorldPos = wp.xyz;
  vec4 cp = applyCurve(wp);
  vec4 mv = viewMatrix * cp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const feuilleFrag = /* glsl */ `
${NOISE}
${FAMILLE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform sampler2D uLeafTex;
uniform float uId;
uniform float uVitrail;
uniform float uRim;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vNorC;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vViewDist;
varying vec2 vArbre;
void main() {
  vec4 t = texture(uLeafTex, vUv);
  if (t.a < 0.5) discard;
  vec3 N = normalize(vNormalW);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorldPos);
  // la feuille garde son orientation (elle accroche la lumière), tirée vers la normale de la couronne
  vec3 Nl = normalize(mix(N, normalize(vNorC), 0.45));
  // valeur peinte de la feuille ; ses clairs (liseré, nervures) un peu dorés
  float val = t.r;
  vec3 albedo = vColor * (0.6 + 0.8 * val);
  // famille de couleur de l'arbre, la même que sa version forêt (FAMILLE) ; feuille qui tombe : celle de
  // son arbre (iSol.zw), sans accent de couronne
  #ifdef CHUTE
  albedo = familleArbre(albedo, vArbre, vec3(0.0, 1.0, 0.0));
  #else
  albedo = familleArbre(albedo, vArbre, normalize(vNorC));
  #endif
  albedo = mix(albedo, albedo * vec3(1.08, 1.04, 0.86), smoothstep(0.7, 0.92, val));
  // ombre lue un peu en avant de la couronne (voir foliageFrag) : pas d'ombre de son propre volume
  float sh = sampleShadow(vWorldPos + normalize(vNorC) * 0.6, Nl);
  vec3 col = toonShade(albedo, Nl, V, sh, uRim);
  // translucidité : l'œil regarde le soleil à travers la feuille (N * 0,32 : les feuilles ne s'allument
  // pas toutes en même temps) ; une feuille à l'ombre transmet peu
  vec3 axe = normalize(-uSunDir + N * 0.32);
  float sss = pow(max(dot(V, axe), 0.0), 2.4) * mix(0.22, 1.0, sh) * (1.0 - uNight);
  col += mix(albedo * 1.2, uSunColor * vec3(1.0, 0.97, 0.8), 0.45) * sss * uVitrail * (0.4 + 0.6 * val) * 0.65;
  // épaule : la lumière qui traverse ne pousse jamais le feuillage au jaune fluo (valeur plafonnée en
  // douceur à 0,86, teinte gardée)
  {
    float lF = dot(col, vec3(0.299, 0.587, 0.114));
    col *= lF > 0.7 ? (0.7 + 0.16 * (1.0 - exp(-(lF - 0.7) / 0.16))) / lF : 1.0;
  }
  col += lanternLight(albedo, vWorldPos, Nl);
  col += eclairRouge(albedo, vWorldPos, Nl);
  col = applyFog(col, vViewDist, vWorldPos);
  writeGBuffer(col, Nl, uId, 0.5);
}
`;

// leafTex : atlas des feuilles (textures.js, feuillesAtlas) ; wind : balancement de la ramure (celui du
// bois, MAT.solid) ; flutter : frémissement des feuilles ; chute : feuilles qui tombent
export function feuilleMaterial({ leafTex, wind = 0.06, flutter = 0.22, vitrail = 1, rim = 0.6, id = nextId(), lod = 'proche', chute = false } = {}) {
  // feuilles des arbres : teinte par sommet ; feuilles qui tombent : teinte par instance seulement
  const defines = chute ? { CHUTE: '' } : { USE_COLOR: '' };
  if (lod === 'loin') defines.LOD_LOIN = '';
  if (lod === 'proche') defines.LOD_PROCHE = '';
  return new THREE.ShaderMaterial({
    name: 'feuille',
    glslVersion: THREE.GLSL3,
    defines,
    uniforms: {
      ...U,
      uLeafTex: { value: leafTex },
      uId: { value: id },
      uWindAmount: { value: wind },
      uFlutter: { value: flutter },
      uVitrail: { value: vitrail },
      uRim: { value: rim },
      ...LOD_ARBRES,
    },
    vertexShader: feuilleVert,
    fragmentShader: feuilleFrag,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// Herbe : touffes instanciées, pliées par le vent et par le joueur. Avec une palette (PALETTE) :
// touffes récoltables des îles, peintes dans la palette du tapis (render/herbe/), plus hautes et
// plus foncées que lui, lisibles comme un massif ; sans palette : oyats et catalogue.
// ---------------------------------------------------------------------------
const grassVert = /* glsl */ `
${CURVE}
${WIND}
uniform vec3 uPlayerPos;
#ifdef PALETTE
uniform float uTall;
#endif
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vH;
varying float vViewDist;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(position, 1.0);
  vec3 base = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float h = uv.y;
  // près de la caméra : touffes plus basses et plus fines (lisibles en gros plan)
  float camD = distance(cameraPosition.xz, base.xz);
  float lod = mix(0.42, 1.0, smoothstep(3.0, 9.0, camD));
  vec3 local = wp.xyz - base;
  local.y *= lod;
  local.xz *= mix(0.65, 1.0, lod);
  #ifdef PALETTE
  local.y *= uTall;
  #endif
  wp.xyz = base + local;
  wp.xyz += windOffset(base, 0.28 * h * h, base.x * 0.9 + base.z * 0.4);
  vec3 d = wp.xyz - uPlayerPos;
  float dl = length(d.xz);
  float push = smoothstep(1.1, 0.0, dl) * h;
  wp.xz += normalize(d.xz + 0.0001) * push * 0.35;
  wp.y -= push * 0.18;
  vWorldPos = wp.xyz;
  vColor = vec3(1.0);
  #ifdef USE_INSTANCING_COLOR
  vColor = instanceColor;
  #endif
  vH = h;
  vec4 mv = viewMatrix * applyCurve(wp);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const grassFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform float uId;
uniform vec3 uTipColor;
#ifdef PALETTE
uniform vec3 uPied;
uniform vec3 uMilieu;
uniform vec3 uPointe;
#endif
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vH;
varying float vViewDist;
void main() {
  vec3 N = vec3(0.0, 1.0, 0.0);
  vec3 V = normalize(cameraPosition - vWorldPos);
  #ifdef PALETTE
  // palette du tapis, plus foncée (× 0,82) ; la couleur du sol (à la luminance du milieu) n'y entre
  // qu'à 25 %, comme pour les brins ; pied dans l'ombre du massif
  const vec3 LUM = vec3(0.299, 0.587, 0.114);
  vec3 zone = clamp(vColor * (dot(uMilieu, LUM) / max(dot(vColor, LUM), 0.04)) / max(uMilieu, vec3(0.02)), 0.6, 1.5);
  vec3 tint = mix(vec3(1.0), zone, 0.25) * 0.82;
  float hh = smoothstep(0.0, 1.0, vH);
  vec3 albedo = (hh < 0.5 ? mix(uPied, uMilieu, hh * 2.0) : mix(uMilieu, uPointe, hh * 2.0 - 1.0)) * tint;
  albedo *= mix(0.65, 1.0, smoothstep(0.0, 0.7, vH));
  // voile pastel, comme le tapis
  albedo = mix(albedo, vec3(0.97, 0.95, 0.86), 0.2);
  #else
  vec3 albedo = mix(vColor * 0.86, mix(vColor, uTipColor, 0.55) * 1.08, smoothstep(0.0, 1.0, vH));
  #endif
  float sh = sampleShadow(vWorldPos, N);
  vec3 col = toonShade(albedo, N, V, sh, 0.4);
  col += lanternLight(albedo, vWorldPos, N);
  col = applyFog(col, vViewDist, vWorldPos);
  writeGBuffer(col, N, uId, 0.0);
}
`;

// palette (facultative) : { pied, milieu, pointe } en RVB (biomes.js, paletteHerbe) ; tall :
// hauteur relative des touffes peintes dans la palette
export function grassMaterial(opts = {}) {
  const { id, tipColor = 0xd8efa0, palette = null, tall = 1.35 } = opts;
  const pal = palette
    ? {
        uPied: { value: new THREE.Color().fromArray(palette.pied) },
        uMilieu: { value: new THREE.Color().fromArray(palette.milieu) },
        uPointe: { value: new THREE.Color().fromArray(palette.pointe) },
        uTall: { value: tall },
      }
    : {};
  return new THREE.ShaderMaterial({
    name: 'grass',
    glslVersion: THREE.GLSL3,
    defines: palette ? { PALETTE: '' } : {},
    uniforms: {
      ...U,
      uId: { value: id },
      uTipColor: { value: new THREE.Color(tipColor) },
      ...pal,
    },
    vertexShader: grassVert,
    fragmentShader: grassFrag,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// Lueurs additives (lucioles, halos de lanternes) — n'altèrent pas la normale
// ---------------------------------------------------------------------------
const glowVert = /* glsl */ `
${CURVE}
uniform float uSize;
varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sc = length(modelMatrix[0].xyz);
  #ifdef USE_INSTANCING
  wp = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  sc *= length(instanceMatrix[0].xyz);
  #endif
  vec4 mv = viewMatrix * applyCurve(wp);
  mv.xy += position.xy * uSize * sc;
  vUv = position.xy + 0.5;
  gl_Position = projectionMatrix * mv;
}
`;
const glowFrag = /* glsl */ `
layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outNormal;
uniform vec3 uGlowColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a = a * a;
  outColor = vec4(uGlowColor * uIntensity, a * uIntensity);
  outNormal = vec4(0.0);
}
`;

export function glowMaterial(color = 0xffc070, size = 1) {
  return new THREE.ShaderMaterial({
    name: 'glow',
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...U,
      uGlowColor: { value: new THREE.Color(color) },
      uIntensity: { value: 1 },
      uSize: { value: size },
    },
    vertexShader: glowVert,
    fragmentShader: glowFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
