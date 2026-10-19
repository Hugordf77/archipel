// Mesures d'un modèle face à la DA (docs/DA.md) : pièces, triangles (fin et allégé) face au budget,
// gabarit, couleurs trop sombres, primitives à facettes ; pour une créature : sabots, pattes / garrot,
// tête / corps, museau au repos et en broutant, tête attachée, jonctions patte-corps ; pour un modèle
// qui a une physique : écart entre physique et forme visible (tronc, emprise, planchers).
//   node scripts/modeles/mesure.mjs <id> [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { installCanvasStub } from '../../tests/helpers/canvas.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (rel) => (process.env.VITEST ? path.join(RACINE, rel) : pathToFileURL(path.join(RACINE, rel)).href);
const nb = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('fr-FR');
const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

// --- outils géométriques -------------------------------------------------------------------
// matrices des pièces d'une créature pour une part de broutage k (0 : au repos, 1 : museau dans l'herbe)
function pose(parts, def, k) {
  const out = [];
  for (const p of parts) {
    const a = p.anim === 'neck' ? k * def.graze : p.anim === 'head' ? k * (p.parent != null ? def.nod ?? 0 : def.graze) : 0;
    const m = new THREE.Matrix4().makeTranslation(...p.pivot).multiply(new THREE.Matrix4().makeRotationX(a));
    if (p.parent != null) m.premultiply(out[p.parent]);
    out.push(m);
  }
  return out;
}
// boîte exacte d'une pièce placée par m (sommets transformés, pas la boîte tournée)
function boite(geo, m) {
  const b = new THREE.Box3();
  const v = new THREE.Vector3();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m));
  return b;
}
// rayons verticaux sur une géométrie (dessous d'un corps, dessus d'un plancher)
const _rc = new THREE.Raycaster();
const MAT = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
// (légèrement décalés : un rayon pile sur une arête du maillage passe entre deux triangles)
function touche(mesh, x, y, z, haut) {
  _rc.set(new THREE.Vector3(x + 0.00137, y, z + 0.00173), new THREE.Vector3(0, haut ? 1 : -1, 0));
  return _rc.intersectObject(mesh, false);
}

// --- mesure ------------------------------------------------------------------------------------
export async function mesurer(id) {
  installCanvasStub();
  const R = await import(url('src/models/registry.js'));
  const B = await import(url('src/models/kit/budgets.js'));
  const m = R.BY_ID.get(id);
  if (!m) throw new Error(`modèle inconnu : ${id}`);
  const lignes = [];
  const ligne = (nom, valeur, ok = null, regle = '') => lignes.push({ nom, valeur, ok, regle });

  // pièces, triangles, gabarit
  const runs = [R.defaultParams(m), ...m.variants.map((v) => v.params)];
  const construits = runs.map((p) => m.build(p).object3d);
  const obj = construits[0];
  let meshes = 0;
  obj.traverse((o) => { if (o.geometry) meshes++; });
  const t = construits.map((o) => { let s = 0; o.traverse((x) => { if (x.geometry) s += tris(x.geometry); }); return Math.round(s); });
  const budget = B.budgetDe(m);
  const [kind, key] = m.ref.split(':');
  let def = null;
  if (kind === 'species') def = (await import(url('src/models/animaux/index.js'))).SPECIES[key];
  const parts = def?.parts?.() || [];
  const lod = def?.lod?.() || null;
  const tParts = (ps) => Math.round(ps.reduce((a, p) => a + tris(p.geo), 0));
  ligne('Pièces', parts.length ? `${parts.length} pièce${parts.length > 1 ? 's' : ''}${lod ? ` (allégé : ${lod.length})` : ''}` : `${meshes} maillage${meshes > 1 ? 's' : ''}`, lod ? lod.length === parts.length : null, lod ? 'version allégée aux mêmes pièces' : '');
  const tmax = Math.max(...t);
  const tLod = lod ? tParts(lod) : null;
  ligne('Triangles', `${tmax.toLocaleString('fr-FR')} fin${tLod != null ? ` · ${tLod.toLocaleString('fr-FR')} allégé` : ''} · budget ${budget.toLocaleString('fr-FR')}${m.budget?.lod ? ` / ${m.budget.lod.toLocaleString('fr-FR')}` : ''}${B.ECARTS[m.id] ? ' (écart connu)' : ''}`,
    tmax <= budget && (tmax <= B.LOD_SEUIL || !def || !!lod) && (tLod == null || tLod <= (m.budget?.lod ?? B.LOD_SEUIL)), `≤ budget ; au-delà de ${B.LOD_SEUIL}, version allégée`);
  obj.updateMatrixWorld(true);
  const bb = new THREE.Box3();
  obj.traverse((o) => {
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); // le feuillage a sa propre boîte
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (o.isInstancedMesh) b.applyMatrix4(new THREE.Matrix4().fromArray(o.instanceMatrix.array));
    bb.union(b);
  });
  const taille = bb.getSize(new THREE.Vector3());
  ligne('Gabarit (L × H × P)', `${nb(taille.x)} × ${nb(taille.y)} × ${nb(taille.z)} m (registre : ${m.size.map((v) => nb(v)).join(' × ')})`,
    m.size.every((d, a) => Math.abs(taille.getComponent(a) - d) <= Math.max(0.25 * d, 0.05)), '± 25 % du registre');

  // couleurs plus sombres que l'encre des yeux
  const eye = new THREE.Color('#3d3049');
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const seuil = lum(eye.r, eye.g, eye.b) * 0.9;
  let sombres = 0;
  obj.traverse((o) => {
    const c = o.geometry?.attributes.color;
    if (!c) return;
    for (let i = 0; i < c.count; i++) if (lum(c.getX(i), c.getY(i), c.getZ(i)) < seuil) sombres++;
  });
  ligne('Couleurs', sombres ? `${sombres} sommets plus sombres que l'encre des yeux (#3d3049)` : 'aucun noir', sombres === 0, 'jamais de noir pur');

  // primitives à facettes dans le fichier du modèle
  const src = fs.readFileSync(path.join(RACINE, m.source), 'utf8').split('\n');
  const facettes = [];
  src.forEach((l, i) => {
    for (const mt of l.matchAll(/G\.(sphere|cyl|cone)\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)) {
      const args = mt[2].split(',').map((s) => s.trim());
      const seg = mt[1] === 'sphere' ? Number(args[1] ?? 18) : mt[1] === 'cyl' ? Number(args[3] ?? 18) : Number(args[2] ?? 18);
      const min = mt[1] === 'sphere' ? 10 : 8;
      if (Number.isFinite(seg) && seg < min) facettes.push(`${m.source.replace('src/models/', '')}:${i + 1} G.${mt[1]}(… ${seg} segments)`);
    }
  });
  const pres = ['animaux', 'personnage', 'decor'].includes(m.category);
  ligne('Facettes', facettes.length ? `${facettes.length} primitive${facettes.length > 1 ? 's' : ''} sous le seuil (sphères 10, cylindres et cônes 8) : ${facettes.slice(0, 6).join(' · ')}${facettes.length > 6 ? ' …' : ''}` : 'aucune primitive sous le seuil',
    pres ? facettes.length === 0 : null, pres ? 'vu de près : aucune facette' : 'vu de loin : indicatif');

  // créature : sabots, proportions, broutage, jonctions
  if (parts.length) {
    const s = def.scale || 1;
    const legs = parts.map((p, i) => [p, i]).filter(([p]) => p.anim === 'leg');
    const M0 = pose(parts, def, 0);
    const corps = new THREE.Mesh(parts[0].geo, MAT);
    corps.matrixWorld.copy(M0[0]);
    corps.matrixAutoUpdate = false;
    const cb = boite(parts[0].geo, M0[0]);
    if (legs.length) {
      const pieds = legs.map(([p, i]) => Math.abs(boite(p.geo, M0[i]).min.y) * s);
      ligne('Sabots', `au sol à ${nb(Math.max(...pieds) * 100, 1)} cm`, Math.max(...pieds) <= 0.01, '± 1 cm');
      // patte visible : du sol au dessous du corps, à l'aplomb de la hanche
      const ventre = legs.map(([p]) => {
        const h = touche(corps, p.pivot[0], -1, p.pivot[2], true)[0];
        return h ? h.point.y : cb.min.y;
      });
      const patte = Math.min(...ventre) * s;
      const garrot = cb.max.y * s;
      // fourchette de la DA (25 à 35 %), sauf exception accordée par l'utilisateur et écrite dans la fiche
      // (exceptions: { pattes: [min, max] }) : elle est alors affichée
      const exc = m.exceptions?.pattes;
      const [pmin, pmax] = exc ?? [0.25, 0.35];
      const fourchette = `${nb(pmin * 100, 0)} à ${nb(pmax * 100, 0)} %`;
      ligne('Pattes / garrot', `${nb((patte / garrot) * 100, 0)} % (patte ${nb(patte)} m, garrot ${nb(garrot)} m)${exc ? ` · exception de la fiche : ${fourchette}` : ''}`,
        patte / garrot >= pmin && patte / garrot <= pmax, exc ? `${fourchette} (exception de la fiche)` : fourchette);
      // jonctions : hauteur, au-dessus du dessous du corps à son aplomb, des points de patte hors du corps
      // (une patte qui sort du flanc a des points hors du corps plus hauts que le ventre)
      let jonction = 0;
      for (const [p, i] of legs) {
        const pos = p.geo.attributes.position;
        const v = new THREE.Vector3();
        const pivot = touche(corps, p.pivot[0], -1, p.pivot[2], true)[0]?.point.y ?? cb.min.y;
        for (let k = 0; k < pos.count; k += 2) {
          v.fromBufferAttribute(pos, k).applyMatrix4(M0[i]);
          if (v.y < pivot - 0.05) continue;
          const dedans = touche(corps, v.x, v.y, v.z, true).length && touche(corps, v.x, v.y, v.z, false).length;
          if (dedans) continue;
          const dessous = touche(corps, v.x, -1, v.z, true)[0]?.point.y ?? pivot;
          jonction = Math.max(jonction, (v.y - dessous) * s);
        }
      }
      ligne('Jonctions patte-corps', `${nb(Math.max(0, jonction) * 100, 1)} cm au-dessus du ventre`, jonction < 0.03, '< 3 cm (les pattes sortent du dessous)');
    }
    const hi = parts.findIndex((p) => p.anim === 'head');
    if (hi >= 0) {
      const tete = boite(parts[hi].geo, M0[hi]).getSize(new THREE.Vector3());
      const lc = cb.max.z - cb.min.z;
      ligne('Tête / corps', `${nb((Math.max(tete.x, tete.y, tete.z) / lc) * 100, 0)} %`, Math.max(tete.x, tete.y, tete.z) / lc >= 0.35, '≥ 35 % de la longueur du corps');
      let attachee = true;
      let sous = false;
      for (const k of [0, 0.5, 1]) {
        const Mk = pose(parts, def, k);
        const hb = boite(parts[hi].geo, Mk[hi]);
        const pi = parts[hi].parent;
        const holder = pi != null ? boite(parts[pi].geo, Mk[pi]) : boite(parts[0].geo, Mk[0]);
        if (!hb.intersectsBox(holder)) attachee = false;
        if (hb.min.y * s < -0.01) sous = true;
      }
      ligne('Tête attachée', attachee && !sous ? 'oui, au repos, à mi-course et en broutant' : `${attachee ? '' : 'tête détachée '}${sous ? 'tête sous le sol' : ''}`, attachee && !sous, 'jamais détachée, jamais sous le sol');
      if (def.muzzle) {
        const mu = (k) => new THREE.Vector3(...def.muzzle).applyMatrix4(pose(parts, def, k)[hi]).y * s;
        ligne('Museau', `au repos ${nb(mu(0))} m (garrot ${nb(cb.max.y * s)} m) · en broutant ${nb(mu(1))} m`, mu(1) < 0.12 && mu(1) > 0 && mu(0) > cb.max.y * s * 0.8, 'broutant < 0,12 m ; au repos, tête portée haut');
      }
    }
  }

  // physique et forme visible
  const L = await import(url('src/models/lieux.js'));
  const physique = await physiqueDe(m, kind, key, L, R);
  if (physique) for (const [nom, valeur, ok, regle] of physique) ligne(nom, valeur, ok, regle);
  return { id: m.id, nom: m.name, source: m.source, lignes };
}

// footprint : cellules de 10 cm occupées par la géométrie entre 5 cm et 1,8 m de haut
function emprise(geos) {
  const cells = new Map();
  const v = new THREE.Vector3();
  for (const [g, m] of geos) {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (m) v.applyMatrix4(m);
      if (v.y < 0.05 || v.y > 1.8) continue;
      cells.set(`${Math.round(v.x * 10)}|${Math.round(v.z * 10)}`, [Math.round(v.x * 10) / 10, Math.round(v.z * 10) / 10]);
    }
  }
  return [...cells.values()];
}
function couverture(obstacles, cells) {
  if (!cells.length) return null;
  const dedans = cells.filter(([x, z]) => obstacles.some(([ox, oz, r]) => (x - ox) ** 2 + (z - oz) ** 2 <= r * r)).length / cells.length;
  let debord = 0;
  for (const [ox, oz, r] of obstacles) {
    for (let a = 0; a < 24; a++) {
      const x = ox + Math.cos((a / 24) * Math.PI * 2) * r;
      const z = oz + Math.sin((a / 24) * Math.PI * 2) * r;
      const d = Math.min(...cells.map(([cx, cz]) => Math.hypot(cx - x, cz - z)));
      debord = Math.max(debord, d);
    }
  }
  return { dedans, debord };
}
async function physiqueDe(m, kind, key, L, R) {
  const out = [];
  if (kind === 'kind') {
    const { KIND_RADIUS } = await import(url('src/world/islands/gen/kinds.js'));
    const { kindModel } = await import(url('src/models/vegetation.js'));
    const r = KIND_RADIUS[key];
    const solid = kindModel(key).solid;
    if (!r) return [['Encombrement', 'aucun (on passe au travers)', null, '']];
    const pts = [];
    if (solid) {
      const pos = solid.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.15 && pos.getY(i) < 1.0) pts.push([pos.getX(i), pos.getZ(i)]);
    }
    if (!pts.length) return [['Encombrement', `r ${nb(r)} m ; pas de tronc mesurable entre 0,15 et 1 m`, null, '']];
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const d = pts.map(([x, z]) => Math.hypot(x - cx, z - cz)).sort((a, b) => a - b);
    const visible = d[Math.floor(d.length * 0.9)];
    out.push(['Physique / forme', `encombrement r ${nb(r)} m · pied visible r ${nb(visible)} m (écart ${nb(((r - visible) / visible) * 100, 0)} %)`, Math.abs(r - visible) / visible <= 0.15, 'tronc bloqué à son rayon visible ± 15 %']);
    return out;
  }
  let obstacles = [];
  let planchers = [];
  const geos = [];
  if (kind === 'part') {
    const md = L.partModel({ x: 0, y: 0, z: 0, rot: 0, t: key, ...m.defaults, ...R.defaultParams(m) });
    obstacles = md.obstacles || [];
    planchers = md.decks || [];
    if (md.solid) geos.push([md.solid.build(), null]);
    for (const a of md.anim || []) geos.push([a.builder.build(), new THREE.Matrix4().makeTranslation(...a.pivot)]);
    if (md.wheel) geos.push([md.wheel.build(), new THREE.Matrix4().makeTranslation(2.05, 1.45, 0)]);
  } else if (kind === 'ile') {
    const f = path.join(RACINE, m.source.replace(/index\.js$/, 'physique.js'));
    if (!fs.existsSync(f)) return null;
    const p = (await import(url(path.relative(RACINE, f)))).default;
    obstacles = (p[key] || p).obstacles || [];
    m.build().object3d.traverse((o) => { if (o.geometry) geos.push([o.geometry, null]); });
  } else return null;
  const cells = emprise(geos);
  if (obstacles.length) {
    const c = couverture(obstacles, cells);
    const murs = ['batiments', 'monuments'].includes(m.category);
    if (c) out.push(['Physique / forme', `${obstacles.length} obstacle${obstacles.length > 1 ? 's' : ''} : ${nb(c.dedans * 100, 0)} % de l'emprise couverte, débord ${nb(c.debord)} m`, murs ? c.dedans >= 0.85 && c.debord <= 0.4 : c.debord <= 0.4, murs ? '≥ 85 % de l\'emprise, débord ≤ 0,4 m' : 'débord ≤ 0,4 m']);
  } else if (cells.length > 40) out.push(['Physique / forme', 'aucun obstacle : on passe au travers', null, 'à vérifier (passage voulu ?)']);
  for (const d of planchers) {
    const g = geos[0][0];
    const pos = g.attributes.position;
    let ecart = 0;
    for (let i = 0; i <= 20; i++) {
      const tt = i / 20;
      const x = d.x0 + (d.x1 - d.x0) * tt;
      const z = d.z0 + (d.z1 - d.z0) * tt;
      const y = d.y0 + (d.y1 - d.y0) * tt - Math.sin(tt * Math.PI) * (d.sag || 0);
      let top = -Infinity;
      for (let k = 0; k < pos.count; k++) {
        const vy = pos.getY(k);
        if (vy < y - 0.5 || vy > y + 0.2) continue;
        if (Math.hypot(pos.getX(k) - x, pos.getZ(k) - z) < 0.3) top = Math.max(top, vy);
      }
      if (Number.isFinite(top)) ecart = Math.max(ecart, Math.abs(top - y));
    }
    out.push(['Plancher', `${nb(Math.hypot(d.x1 - d.x0, d.z1 - d.z0))} × ${nb(d.w)} m, à ${nb(ecart * 100, 1)} cm du dessus des planches`, ecart <= 0.05, '± 5 cm']);
  }
  return out;
}

export function texte({ id, nom, source, lignes }) {
  const w = Math.max(...lignes.map((l) => l.nom.length));
  return [`${id} · ${nom} · ${source.replace('src/models/', '')}`,
    ...lignes.map((l) => `${l.ok === true ? '✓' : l.ok === false ? '✗' : '·'} ${l.nom.padEnd(w)}  ${l.valeur}${l.regle && l.ok !== true ? `   [${l.regle}]` : ''}`)].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const id = process.argv[2];
  if (!id) {
    console.log('usage : node scripts/modeles/mesure.mjs <id> [--json]');
    process.exit(1);
  }
  const r = await mesurer(id);
  console.log(process.argv.includes('--json') ? JSON.stringify(r, null, 1) : texte(r));
}
