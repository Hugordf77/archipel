// Matériau des brins d'herbe en tapis : chaque brin est construit dans le shader de sommets à partir
// de son indice (position.z), de sa place dans le brin (position.xy : côté, hauteur relative) et de
// l'origine de sa cellule (attribut d'instance aCell, coordonnées de l'île). Les textures de la tuile
// donnent la densité, la hauteur et la sécheresse (carte d'herbe du Worker), la hauteur du sol
// (mêmes triangles que le maillage) et sa couleur, et l'herbe fauchée. Couleur : palette du biome
// (biomes.js, PALETTES_HERBE), du pied à la pointe. Brins pliés par le vent, avec
// des ondes qui traversent le pré, couchés sous les pousseurs (joueur, animaux, aigle), plus bas près
// de la caméra ; ni ombre portée ni contour (identifiant du terrain).
import * as THREE from 'three';
import { U } from '../../core/globals.js';
import { NOISE, HERBE, CURVE, WIND, SHADOW, TOON, MRT_OUT } from '../shaders/chunks.js';
import { TOUFFE, PULL, JIT } from './placement.js';

const f = (x) => x.toFixed(4);
const herbeVert = /* glsl */ `
const float TOUFFE = ${f(TOUFFE)};
const float PULL = ${f(PULL)};
const float JIT = ${f(JIT)};
${CURVE}
${WIND}
${NOISE}
${HERBE}
${SHADOW}
${TOON}
attribute vec2 aCell;
uniform sampler2D uChamp;
uniform sampler2D uSol;
uniform highp sampler2D uHaut;
uniform vec2 uTile;
uniform vec3 uFocus;
uniform vec4 uRings;
uniform vec4 uCounts;
uniform float uWidth;
// palette de l'île : pied, milieu, pointe et herbe sèche
uniform vec3 uPied;
uniform vec3 uMilieu;
uniform vec3 uPointe;
uniform vec3 uSec;
// palette du biome voisin, mêlée par le canal A de la carte d'herbe (biomes mêlés au nœud)
uniform vec3 uPied2;
uniform vec3 uMilieu2;
uniform vec3 uPointe2;
uniform vec3 uSec2;
// pousseurs (x, z de la scène, rayon, force) : joueur, animaux, souffle de l'aigle
uniform vec4 uPushers[8];
// herbe fauchée (0 à 1) au demi-mètre, 129 × 129 sur la tuile
uniform sampler2D uCoupe;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vAlbedo;
varying float vShadow;
varying vec3 vLantern;
varying float vViewDist;
varying float vT;

// distance au joueur, allongée de 0 à 18 % par un bruit de 7 m : les bords d'anneaux ne sont plus
// des cercles. Allongée seulement : la densité voulue ne dépasse jamais celle de l'anneau dessiné
// (placement.js, ringOf, compte sans ce bruit)
float ringDist(vec2 wxz) {
  return length(wxz - uFocus.xz) * (1.0 + 0.18 * vnoise(wxz / 7.0 + 17.3));
}

// même calcul que bladesAt (render/herbe/placement.js)
float bladesAt(float d) {
  float f = uRings.w;
  if (d <= uRings.x * (1.0 - f)) return uCounts.x;
  if (d <= uRings.x) return mix(uCounts.x, uCounts.y, smoothstep(uRings.x * (1.0 - f), uRings.x, d));
  if (d <= uRings.y * (1.0 - f)) return uCounts.y;
  if (d <= uRings.y) return mix(uCounts.y, uCounts.z, smoothstep(uRings.y * (1.0 - f), uRings.y, d));
  if (d <= uRings.z * (1.0 - f)) return uCounts.z;
  if (d <= uRings.z) return mix(uCounts.z, 0.0, smoothstep(uRings.z * (1.0 - f), uRings.z, d));
  return 0.0;
}

// hauteur du sol dans la tuile (l : 0 à 64), sur les mêmes triangles que le maillage (diagonale b–d)
float groundH(vec2 l, out vec3 n) {
  vec2 c = clamp(floor(l), 0.0, 63.0);
  vec2 f = clamp(l - c, 0.0, 1.0);
  ivec2 i = ivec2(c);
  float ha = texelFetch(uHaut, i, 0).r;
  float hb = texelFetch(uHaut, i + ivec2(1, 0), 0).r;
  float hd = texelFetch(uHaut, i + ivec2(0, 1), 0).r;
  float he = texelFetch(uHaut, i + ivec2(1, 1), 0).r;
  n = normalize(vec3(-((hb - ha) + (he - hd)) * 0.5, 1.0, -((hd - ha) + (he - hb)) * 0.5));
  if (f.x + f.y <= 1.0) return ha + (hb - ha) * f.x + (hd - ha) * f.y;
  return he + (hd - he) * (1.0 - f.x) + (hb - he) * (1.0 - f.y);
}

// ombre du soleil en une seule lecture (à mi-hauteur du brin)
float shadow1(vec3 wp) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(wp, 1.0);
  vec3 c = sc.xyz / sc.w;
  if (max(abs(c.x - 0.5), abs(c.y - 0.5)) < 0.47 && c.z <= 1.0) return texture(uShadowMap, vec3(c.xy, c.z - 0.0015));
  // au-delà : la carte large (SHADOW, chunks.js)
  sc = uShadowMatrix2 * vec4(wp, 1.0);
  c = sc.xyz / sc.w;
  float e = max(abs(c.x - 0.5), abs(c.y - 0.5));
  if (e > 0.5 || c.z > 1.0) return 1.0;
  return mix(1.0, texture(uShadowMap2, vec3(c.xy, c.z - 0.0008)), smoothstep(0.5, 0.4, e));
}

void main() {
  float side = position.x;
  float t = position.y;
  float i = position.z;
  // place du brin (même calcul que placeBrin de placement.js) : suite R2 décalée par cellule (tout
  // préfixe reste bien réparti), tournée ou retournée par cellule (8 symétries), brin bougé de ±JIT
  vec2 cellId = floor(aCell * 0.5 + 0.5);
  vec2 jit = vec2(hash12(cellId * 1.37 + 11.0), hash12(cellId * 1.91 - 7.0));
  vec2 p = fract(vec2(0.5) + i * vec2(0.7548776662, 0.5698402910) + jit) - 0.5;
  float sym = floor(hash12(cellId * 0.53 + 2.0) * 8.0);
  if (mod(sym, 2.0) >= 1.0) p = p.yx;
  if (mod(floor(sym * 0.5), 2.0) >= 1.0) p.x = -p.x;
  if (sym >= 4.0) p.y = -p.y;
  p += (vec2(hash12(cellId * 3.1 + i * 0.37), hash12(cellId * 2.3 - i * 0.53)) - 0.5) * (2.0 * JIT);
  vec2 pos0 = aCell + 1.0 + p * 2.0;
  // brin effacé d'avance (densité des anneaux × carte d'herbe, au point avant la touffe, avec un brin
  // de marge) : ni recherche de touffe ni reste du calcul
  // nombre de brins voulu ici (anneaux), calculé une fois au point avant la touffe (à moins de 35 cm
  // du brin)
  float n = bladesAt(ringDist((modelMatrix * vec4(pos0.x, 0.0, pos0.y, 1.0)).xz));
  {
    vec2 lp = clamp(pos0 - uTile, 0.0, 64.0);
    vec2 ch = texture(uChamp, (lp + 0.5) / 65.0).rg;
    if (n * ch.r - i < -1.0 || ch.g < 0.004) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
  }
  // touffes : centre le plus proche sur la grille de TOUFFE m, cherché dans les 2 × 2 mailles du
  // côté du brin (placement.js cherche dans les 3 × 3 : écart rare et sans effet visible) ; le brin
  // glisse de PULL vers lui
  vec2 gq = pos0 / TOUFFE - 0.5;
  vec2 g0 = floor(gq);
  vec2 tc = pos0;
  vec2 tid = g0;
  float td = 1e9;
  for (int b = 0; b <= 1; b++) {
    for (int a = 0; a <= 1; a++) {
      vec2 id = g0 + vec2(float(a), float(b));
      float hc = hash12(id * 1.11 + 3.3);
      vec2 c = (id + vec2(hc, fract(hc * 11.7 + 0.37))) * TOUFFE;
      float dd = dot(c - pos0, c - pos0);
      if (dd < td) {
        td = dd;
        tc = c;
        tid = id;
      }
    }
  }
  vec2 local = clamp(mix(pos0, tc, PULL), uTile, uTile + 64.0);
  // la touffe : hauteur (une sur dix environ reste rase), en dôme ; penchant commun ; valeur
  float th = hash12(tid * 2.17 + 0.5);
  float tl = fract(th * 7.13 + 0.31);
  float tv = fract(th * 13.7 + 0.71);
  // tapis uniforme : ni dôme ni touffe rase (plus de groupes ronds), hauteur à ± 10 % par touffe
  float tuftH = mix(0.9, 1.1, th);
  vec2 lt = local - uTile;
  vec2 uv = (lt + 0.5) / 65.0;
  vec4 champ = texture(uChamp, uv);
  vec3 n0;
  float gy = groundH(lt, n0);
  vec4 base = modelMatrix * vec4(local.x, gy, local.y, 1.0);
  // densité : anneaux autour du joueur × carte d'herbe ; le brin de rang i rétrécit en douceur
  float keep = clamp(n * champ.r - i, 0.0, 1.0);
  float r1 = hash12(cellId * 0.71 + i * 0.6180339);
  float r2 = hash12(cellId * 1.13 - i * 0.4142135 + 5.0);
  float camD = distance(cameraPosition.xz, base.xz);
  float lod = mix(0.45, 1.0, smoothstep(2.0, 7.0, camD));
  float cut = texture(uCoupe, lt / 64.0 * (128.0 / 129.0) + 0.5 / 129.0).r;
  float hgt = champ.g * 1.45 * (0.85 + 0.3 * r1) * tuftH * keep * lod * mix(1.0, 0.15, cut);
  // terre découverte sur les pentes (solNu, même masque que le terrain) : les brins s'y effacent
  hgt *= 1.0 - smoothstep(0.25, 0.75, solNu((base.xyz + uWorldOffset).xz, n0.y));
  // SILHOUETTES ET RYTHME (23/11) : trois sortes de brins (courant ; plus court ; haut et fin, herbe folle)
  // et des plaques un peu plus rases de 6 à 14 m (le pré respire, sans trous) ; tapis 10 % plus bas
  vec2 wB = (base.xyz + uWorldOffset).xz;
  float sorte = hash12(cellId * 1.71 + i * 0.377 + 9.0);
  float hS = 1.0;
  float wS = 1.0;
  if (sorte < 0.25) hS = 0.72;
  else if (sorte < 0.37) { hS = 1.3; wS = 0.7; }
  float ras = smoothstep(0.3, 0.62, vnoise(wB / 9.0 + 5.3) * 0.7 + vnoise(wB / 3.7 - 1.1) * 0.3);
  hgt *= 0.9 * hS * mix(0.78, 1.0, ras);
  if (hgt < 0.01) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // moins de brins au loin : plus larges, pour couvrir le sol autant (même calcul que bladeWidth
  // de placement.js : part^−0,72, au plus × 10) ; brin effilé
  float part = max(n / uCounts.w, 1.0 / 24.4);
  // lame effilée : pointe fine (plus de triangle tronqué à 30 %), un peu plus étroite de près ; au loin,
  // élargie comme avant pour couvrir le sol
  float pres = smoothstep(0.5, 1.0, part);
  float w = uWidth * pow(part, -0.72) * wS * mix(1.0, 0.82, pres) * (1.0 - 0.94 * pow(t, 1.25));
  // pré peigné : brins couchés de 15 à 35° sous le vent, chaque touffe avec son penchant (± 26°)
  // et chaque brin le sien (± 10°), la courbure croissant vers la pointe ; la tige garde sa longueur
  // (hgt). Face du brin tournée au hasard (± 70° autour de la normale au penchant) : vus d'en haut,
  // les brins ne forment plus des tirets alignés
  vec2 wd = normalize(uWindDir + vec2(0.0001));
  float a = atan(wd.y, wd.x) + (tl - 0.5) * 0.9 + (r2 - 0.5) * 0.35;
  vec2 bendDir = vec2(cos(a), sin(a));
  float fa = a + 1.5708 + (hash12(cellId * 0.29 + i * 0.913) - 0.5) * 2.4;
  vec2 across = vec2(cos(fa), sin(fa));
  float lean = mix(0.26, 0.61, hash12(cellId * 0.37 + i * 0.2718 + 3.0));
  vec3 off = vec3(across.x, 0.0, across.y) * side * w * 0.5;
  off += vec3(bendDir.x, 0.0, bendDir.y) * hgt * sin(lean) * t * t;
  off.y = hgt * t * (1.0 - (1.0 - cos(lean)) * t);
  vec3 wp = base.xyz + mat3(modelMatrix) * off;
  // vent : balancement commun, et ondes qui traversent le pré en bandes (pointes couchées et
  // éclaircies ; la même onde teinte le sol, voir HERBE)
  vec3 wA = base.xyz + uWorldOffset;
  wp += windOffset(base.xyz, 0.6 * hgt * t * t, r1 * 6.0);
  vec2 wdir = normalize(uWindDir + vec2(0.0001));
  float wave = herbeOnde(wA.xz);
  wp.xz += wdir * wave * hgt * 0.45 * t * t;
  wp.y -= wave * hgt * 0.15 * t * t;
  // couchée sous le joueur (ses pieds restent visibles), les animaux et le souffle de l'aigle
  vec2 pushV = vec2(0.0);
  float push = 0.0;
  for (int k = 0; k < 8; k++) {
    vec4 P = uPushers[k];
    if (P.z <= 0.0) continue;
    vec2 dp = base.xz - P.xy;
    float pk = smoothstep(P.z, 0.0, length(dp)) * P.w;
    pushV += normalize(dp + 0.0001) * pk;
    push = max(push, pk);
  }
  float pl = length(pushV);
  if (pl > 1.0) pushV /= pl;
  wp.xz += pushV * hgt * 0.8 * t;
  wp.y -= push * hgt * 0.55 * t;
  // couleur : palette de l'île du pied à la pointe, tirée vers l'herbe sèche par la sécheresse ;
  // la couleur du sol (à la luminance du milieu) n'y entre qu'à 25 % : le tapis suit les zones
  // (fleurs, marais, lisière) sans reprendre la pâleur du sol peint
  vec3 sol = texture(uSol, uv).rgb;
  const vec3 LUM = vec3(0.299, 0.587, 0.114);
  // palettes du biome de la tuile et du biome voisin, mêlées au nœud (canal A)
  vec3 cPied = mix(uPied, uPied2, champ.a);
  vec3 cMil = mix(uMilieu, uMilieu2, champ.a);
  vec3 cPointe = mix(uPointe, uPointe2, champ.a);
  vec3 cSec = mix(uSec, uSec2, champ.a);
  vec3 zone = clamp(sol * (dot(cMil, LUM) / max(dot(sol, LUM), 0.04)) / max(cMil, vec3(0.02)), 0.6, 1.5);
  vec3 tint = mix(vec3(1.0), zone, 0.25);
  // sécheresse : teinte d'ensemble, et des brins tout secs là seulement où elle dépasse 0,4
  float dry = champ.b * 0.6;
  float hue = hash12(cellId * 2.31 + i * 0.7071);
  dry = max(dry, step(hue, (champ.b - 0.4) / 0.6) * 0.9);
  // plaques de 15 à 40 m (teinte, valeur, pointes jaunies), comme le sol sous l'herbe
  vec3 plq = herbePlaque(wA.xz);
  vec3 pied = herbeVarie(mix(cPied, cSec * 0.72, dry) * tint, plq);
  vec3 mil = herbeVarie(mix(cMil, cSec * 0.86, dry) * tint, plq);
  vec3 pointe = herbeVarie(mix(cPointe, cSec, dry) * tint, plq);
  pointe = mix(pointe, pointe * vec3(1.1, 1.05, 0.8), 0.4 * plq.z);
  // par touffe : valeur à ± 7 %, pointes plus claires pour les hautes ; par brin : ± 3 % seulement
  // (ni poivre ni sel) ; l'onde éclaircit les pointes de 15 %
  float nv = (0.97 + 0.06 * r2) * (0.98 + 0.04 * tv);
  vec3 blade = (t < 0.5 ? mix(pied, mil, t * 2.0) : mix(mil, pointe, t * 2.0 - 1.0)) * nv;
  blade *= 1.0 + 0.15 * wave * t;
  // chaume fauché : coupe nette, plus jaune
  vAlbedo = mix(blade, mil * vec3(1.1, 1.02, 0.75), cut * step(0.5, t));
  // au loin, le détail (pied sombre, pointe claire) s'estompe vers la couleur moyenne du tapis,
  // celle du sol sous l'herbe (paletteHerbe, sol) : ni trous visibles ni bord d'anneau
  // fondu selon la distance à la caméra (14 à 45 m), pas au joueur : aucun disque plus sombre ne le
  // suit, le détail s'estompe comme une perspective
  float detail = 1.0 - smoothstep(14.0, 45.0, distance(cameraPosition, base.xyz));
  vAlbedo = mix(mix(mil, pointe, 0.25) * 0.9, vAlbedo, mix(0.4, 1.0, detail));
  // occlusion au pied : le cœur du tapis reste plus sombre (× 0,65 de près)
  vAlbedo *= mix(1.0 - 0.28 * detail, 1.0, smoothstep(0.0, 0.7, t));
  // peint : touches de pinceau en aplats, puis voile pastel (comme le sol sous l'herbe)
  vAlbedo = herbePastel(vAlbedo * herbePinceau(wA.xz), 0.2);
  vT = t;
  // normale proche de celle du sol (sinon le contour dessine des plis d'encre sur le terrain)
  vec3 bn = vec3(bendDir.x, 0.0, bendDir.y);
  vNormalW = normalize(n0 + bn * 0.35 * t);
  vShadow = shadow1(base.xyz + n0 * 0.05 + vec3(0.0, 0.5 * hgt, 0.0));
  vLantern = lanternLight(vec3(1.0), base.xyz, n0);
  vWorldPos = wp;
  vec4 mv = viewMatrix * applyCurve(vec4(wp, 1.0));
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const herbeFrag = /* glsl */ `
${NOISE}
${SHADOW}
${TOON}
${MRT_OUT}
uniform float uId;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vAlbedo;
varying float vShadow;
varying vec3 vLantern;
varying float vViewDist;
varying float vT;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 col = toonShade(vAlbedo, N, V, vShadow, 0.3);
  // ombre un peu plus marquée qu'au sol, sans tomber au noir (toonShade garde déjà un plancher)
  col *= mix(0.8, 1.0, vShadow);
  // contre-jour : soleil derrière le pré, les pointes s'illuminent (BotW)
  float back = max(dot(-V, uSunDir), 0.0);
  col += uSunColor * vAlbedo * back * back * back * smoothstep(0.4, 1.0, vT) * 0.7 * vShadow * (1.0 - uNight);
  col += vAlbedo * vLantern;
  col += eclairRouge(vAlbedo, vWorldPos, N);
  col = applyFog(col, vViewDist, vWorldPos);
  writeGBuffer(col, N, uId, 0.0);
}
`;

// shared : uniformes communs à toutes les tuiles (joueur, anneaux, nombres de brins, largeur), par
// référence ; les textures et l'origine de la tuile sont propres à chaque matériau.
// palette : { pied, milieu, pointe, sec } en RVB (biomes.js, paletteHerbe)
export function herbeMaterial({ id, shared, champ, sol, haut, coupe, x0, z0, palette, palette2 = palette }) {
  return new THREE.ShaderMaterial({
    name: 'herbe',
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...U,
      ...shared,
      uId: { value: id },
      uPied: { value: new THREE.Color().fromArray(palette.pied) },
      uMilieu: { value: new THREE.Color().fromArray(palette.milieu) },
      uPointe: { value: new THREE.Color().fromArray(palette.pointe) },
      uSec: { value: new THREE.Color().fromArray(palette.sec) },
      uPied2: { value: new THREE.Color().fromArray(palette2.pied) },
      uMilieu2: { value: new THREE.Color().fromArray(palette2.milieu) },
      uPointe2: { value: new THREE.Color().fromArray(palette2.pointe) },
      uSec2: { value: new THREE.Color().fromArray(palette2.sec) },
      uChamp: { value: champ },
      uSol: { value: sol },
      uHaut: { value: haut },
      uCoupe: { value: coupe },
      uTile: { value: new THREE.Vector2(x0, z0) },
    },
    vertexShader: herbeVert,
    fragmentShader: herbeFrag,
    side: THREE.DoubleSide,
  });
}
