// Aide « Collisions » de la fiche : ce qui bloque et ce qui porte, tel que le jeu l'emploie.
//   obstacles    : cercles [x, z, r] (lieux des îles : partModel ; île de départ : physique.js du dossier)
//   encombrement : rayon gardé libre autour d'une espèce de la végétation (kinds.js, obstacle de
//                  navigation) ou d'un article de décor posé (CATALOG[k].r)
//   planchers    : surfaces marchables { x0, z0, x1, z1, w, y0, y1, sag } (jetées, ponts) ; hauteur en t :
//                  y0 + (y1 − y0) t − sin(πt) × sag, comme world/islands/IslandManager.js
// Le dessin : colonne d'obstacle (disque au sol, cercles à 0 et à la hauteur montrée, quatre arêtes),
// cercle d'encombrement en pointillés, ruban de plancher ; par-dessus le modèle (aides).
import * as THREE from 'three';

export const COULEURS = { obstacle: 0xe8705f, encombrement: 0xd99a2b, plancher: 0x3f9f8a };

// physique d'un modèle (fiche du registre, paramètres) ; deps : partModel, KIND_RADIUS, CATALOG, et les
// physique.js des dossiers (chemin → export par défaut) pour les pièces de l'île de départ
export function physiqueDe(m, params, { partModel, KIND_RADIUS, CATALOG, physiques }) {
  const [kind, key] = m.ref.split(':');
  const vide = { obstacles: [], encombrement: null, planchers: [] };
  if (kind === 'part') {
    const md = partModel({ x: 0, y: 0, z: 0, rot: 0, t: key, ...m.defaults, ...params });
    return { ...vide, obstacles: md?.obstacles || [], planchers: md?.decks || [] };
  }
  if (kind === 'kind') return { ...vide, encombrement: KIND_RADIUS[key] || null };
  if (kind === 'decor') return { ...vide, encombrement: CATALOG[key]?.r ?? null };
  if (kind === 'ile') {
    const p = physiques[m.source.replace(/index\.js$/, 'physique.js')];
    return { ...vide, obstacles: (p?.[key] || p)?.obstacles || [] };
  }
  return vide;
}

const ligne = (couleur, dash) => (dash
  ? new THREE.LineDashedMaterial({ color: couleur, dashSize: 0.12, gapSize: 0.08, depthTest: false, transparent: true })
  : new THREE.LineBasicMaterial({ color: couleur, depthTest: false, transparent: true }));
function cercle(r, y, mat, n = 48) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(new THREE.Vector3(Math.cos((i / n) * Math.PI * 2) * r, y, Math.sin((i / n) * Math.PI * 2) * r));
  const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
  if (mat.isLineDashedMaterial) l.computeLineDistances();
  l.renderOrder = 10;
  return l;
}

// groupe à poser à l'origine du modèle ; hauteur : haut des colonnes d'obstacle (m)
export function objetCollisions(phys, hauteur = 1.8) {
  const g = new THREE.Group();
  g.name = 'collisions';
  const lo = ligne(COULEURS.obstacle);
  const disque = new THREE.MeshBasicMaterial({ color: COULEURS.obstacle, transparent: true, opacity: 0.22, depthTest: false, side: THREE.DoubleSide });
  for (const [x, z, r] of phys.obstacles) {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), disque);
    d.position.y = 0.02;
    d.renderOrder = 9;
    c.add(d, cercle(r, 0.02, lo), cercle(r, hauteur, lo));
    const aretes = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      aretes.push(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r, hauteur, Math.sin(a) * r));
    }
    const s = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(aretes), lo);
    s.renderOrder = 10;
    c.add(s);
    g.add(c);
  }
  if (phys.encombrement) g.add(cercle(phys.encombrement, 0.03, ligne(COULEURS.encombrement, true)));
  const plancher = new THREE.MeshBasicMaterial({ color: COULEURS.plancher, transparent: true, opacity: 0.35, depthTest: false, side: THREE.DoubleSide });
  for (const d of phys.planchers) {
    const dx = d.x1 - d.x0;
    const dz = d.z1 - d.z0;
    const len = Math.hypot(dx, dz) || 1e-6;
    const nx = (-dz / len) * (d.w / 2);
    const nz = (dx / len) * (d.w / 2);
    const N = d.sag ? 24 : 1;
    const pos = [];
    const bord = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = d.y0 + (d.y1 - d.y0) * t - Math.sin(t * Math.PI) * (d.sag || 0) + 0.02;
      const x = d.x0 + dx * t;
      const z = d.z0 + dz * t;
      pos.push(x - nx, y, z - nz, x + nx, y, z + nz);
      bord.push([x - nx, y, z - nz], [x + nx, y, z + nz]);
    }
    const idx = [];
    for (let i = 0; i < N; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const ruban = new THREE.Mesh(geo, plancher);
    ruban.renderOrder = 9;
    const contour = [...bord.filter((_, i) => i % 2 === 0), ...bord.filter((_, i) => i % 2 === 1).reverse()].map((p) => new THREE.Vector3(...p));
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(contour), ligne(COULEURS.plancher));
    l.renderOrder = 10;
    g.add(ruban, l);
  }
  return g;
}
