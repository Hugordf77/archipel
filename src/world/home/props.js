import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, G } from '../../render/builder.js';
import { nextId, LAYER_SHADOW } from '../../core/globals.js';
import { LAYOUT, heightAt } from './terrain.js';
import { toonMaterial } from '../../render/shaders/materials.js';
import { PAL } from '../../models/palette.js';
import { rng, segment, palmFrondGeometry } from '../../models/shapes.js';
import { chaumiere, bibliotheque, pupitreHibou, bureauEtude, trunkAlong, grandArbre, grandArbreClumps, ponton, pontRiviere, echoppe, panneauPlace, bancBois, lanterneJardin } from '../../models/home.js';

// Palette pastel chaude (couleurs « gouache »)
export { PAL } from '../../models/palette.js';


const UP = new THREE.Vector3(0, 1, 0);

export { palmFrondGeometry } from '../../models/shapes.js';

export function buildProps() {
  const statics = [];
  const glass = new Builder(nextId());
  const clumps = [];
  const obstacles = [];
  const lanterns = [];
  const spots = { plots: [] };
  const push = (b) => statics.push(b.build());

  // -------------------------------------------------------------------------
  // Maison du joueur : chaumière ronde au toit gonflé
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.house;
    const y = heightAt(x, z) - 0.05;
    const b = new Builder();
    chaumiere(b, glass, x, y, z);
    push(b);
    obstacles.push({ x, z, r: 2.55 });
    obstacles.push({ x: x - 2.0, z: z + 2.6, r: 0.3 });
    spots.house = { x, z: z + 3.1 };
  }

  // -------------------------------------------------------------------------
  // Bibliothèque du hibou : souche géante sur le plateau
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.library;
    const y = heightAt(x, z) - 0.1;
    const b = new Builder();
    bibliotheque(b, glass, x, y, z);
    push(b);
    obstacles.push({ x, z, r: 3.4 });

    // pupitre du hibou + chariot de livres
    const o = LAYOUT.owl;
    const oy = heightAt(o.x, o.z);
    const p = new Builder();
    pupitreHibou(p, o, oy);
    const cx = o.x - 1.7;
    const cz = o.z - 0.5;
    push(p);
    obstacles.push({ x: o.x, z: o.z, r: 0.45 }, { x: cx, z: cz, r: 0.6 });
    spots.owl = { x: o.x, z: o.z + 1.2, perch: new THREE.Vector3(o.x + 1.0, oy + 1.38, o.z - 0.1), lectern: new THREE.Vector3(o.x, oy + 1.1, o.z) };
  }

  // -------------------------------------------------------------------------
  // Bureau d'étude sous le grand arbre
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.desk;
    const y = heightAt(x, z);
    const b = new Builder();
    bureauEtude(b, glass, x, y, z);
    const sz = z - 0.85;
    push(b);
    obstacles.push({ x: x - 0.55, z, r: 0.6 }, { x: x + 0.55, z, r: 0.6 });
    spots.desk = { x, z: sz, seatY: y + 0.52, deskTop: new THREE.Vector3(x, y + 0.86, z), potPos: new THREE.Vector3(x - 0.25, y + 0.86, z - 0.2) };
  }

  // -------------------------------------------------------------------------
  // Grand arbre
  // -------------------------------------------------------------------------

  {
    const { x, z } = LAYOUT.tree;
    const y = heightAt(x, z) - 0.1;
    const b = new Builder();
    const top = grandArbre(b, x, y, z);
    push(b);
    clumps.push(...grandArbreClumps(top));
    obstacles.push({ x, z, r: 0.95 });
    spots.tree = { x, z, top };
  }

  // -------------------------------------------------------------------------
  // Petits arbres « pompons », arbre en fleurs et buissons
  // -------------------------------------------------------------------------
  // [x, z, espèce, échelle] — 0 pompon, 1 fruitier, 2 cerisier, 3 conifère rond, 4 saule
  const smallTrees = [
    [-16.5, -6.5, 0, 1.0], [-18.5, 6.5, 3, 1.15], [17.5, -3.0, 0, 0.8], [-7.5, 14.5, 0, 1.0], [12.5, 12.5, 3, 1.3],
    [-15.5, 12.5, 1, 1.0], [16.5, 14.5, 0, 0.8], [-8, -19.5, 3, 1.2], [12.5, -20.5, 0, 1.1], [0.5, -22.5, 3, 0.9],
    [-6.5, -4.5, 4, 1.15], [3.0, -6.5, 2, 1.0], [-11.5, -10.5, 0, 0.9], [17.0, -14.5, 3, 1.0],
    [9.8, 14.2, 2, 0.85], [17.8, 10.2, 0, 1.15], [14.2, 17.4, 1, 0.9], [-19.2, -8.5, 0, 0.8],
    [1.0, -19.0, 2, 0.9], [-10.5, -16.5, 3, 1.1], [-20.5, -1.5, 3, 0.85],
  ];
  smallTrees.forEach(([x, z, kind, sc], i) => {
    const y = heightAt(x, z) - 0.05;
    const b = new Builder();
    if (kind === 3) {
      // conifère rond : étages de boules de plus en plus petites
      const top = trunkAlong(b, x, z, y, 1.1 * sc, 0.26 * sc, 0.18 * sc, 0.2, 30 + i);
      push(b);
      const tiers = [[1.3, 0.55], [1.05, 1.45], [0.8, 2.2], [0.5, 2.8]];
      const cols = ['#5fae8e', '#6cbd98', '#7cc8a0', '#8fd4a6'];
      tiers.forEach(([r, dy], k) => clumps.push({ x: top.x, y: top.y + dy * sc, z: top.z, r: r * sc, squash: 0.62, color: new THREE.Color(cols[k]), density: 1.2 }));
      obstacles.push({ x, z, r: 0.4 * sc });
      return;
    }
    if (kind === 4) {
      // saule : couronne + rideaux de feuilles qui retombent
      const top = trunkAlong(b, x, z, y, 2.4 * sc, 0.34 * sc, 0.2 * sc, 1.1, 40 + i);
      push(b);
      clumps.push({ x: top.x, y: top.y + 0.7 * sc, z: top.z, r: 1.55 * sc, squash: 0.62, color: new THREE.Color('#9bd18c') });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        clumps.push({ x: top.x + Math.cos(a) * 1.45 * sc, y: top.y - 0.35 * sc, z: top.z + Math.sin(a) * 1.45 * sc, r: 0.62 * sc, squash: 1.9, color: new THREE.Color(k % 2 ? '#a9d98e' : '#b6df96'), density: 1.6 });
      }
      obstacles.push({ x, z, r: 0.5 * sc });
      return;
    }
    const h = (1.8 + (i % 3) * 0.4) * sc;
    const top = trunkAlong(b, x, z, y, h, 0.28 * sc, 0.18 * sc, 0.5, 30 + i);
    push(b);
    const base = kind === 2 ? new THREE.Color(PAL.blossom) : new THREE.Color(i % 2 ? PAL.leaf : PAL.leafLight);
    const alt = kind === 2 ? new THREE.Color('#f9cfd8') : new THREE.Color(PAL.leafDeep);
    const r = (1.35 + (i % 4) * 0.15) * sc;
    clumps.push({ x: top.x, y: top.y + r * 0.6, z: top.z, r, color: base });
    if (kind !== 1) clumps.push({ x: top.x + 0.5 * sc, y: top.y + r * 1.25, z: top.z - 0.3 * sc, r: r * 0.65, color: alt });
    if (kind === 1) {
      // arbre fruitier : petites pêches
      const fb = new Builder();
      for (let k = 0; k < 7; k++) {
        const a = k * 1.1;
        fb.add(G.sphere(0.16 * sc, 10, 8), '#f7b48a', { p: [top.x + Math.cos(a) * r * 0.85, top.y + r * 0.35 + (k % 2) * 0.5, top.z + Math.sin(a) * r * 0.85] });
      }
      push(fb);
    }
    obstacles.push({ x, z, r: 0.45 * sc });
  });

  const bushes = [
    [6.2, 1.5], [11.8, 0.8], [-13.8, 3.2], [-9.2, -1.8], [4.0, -15.0], [9.6, -15.6],
    [-0.5, -9.8], [-4.4, -9.6], [14.6, -5.0], [-17.0, -1.0], [7.5, 9.5], [-12.0, 9.0],
    [18.5, 3.0], [-19.5, -4.5], [1.0, 15.5],
  ];
  bushes.forEach(([x, z], i) => {
    const y = heightAt(x, z);
    const r = 0.75 + (i % 3) * 0.18;
    const col = new THREE.Color(i % 3 === 0 ? PAL.leafDeep : PAL.leaf);
    clumps.push({ x, y: y + r * 0.55, z, r, squash: 0.75, color: col, density: 1.3 });
    if (i % 2 === 0) clumps.push({ x: x + r * 0.7, y: y + r * 0.4, z: z + 0.2, r: r * 0.7, squash: 0.75, color: col, density: 1.3 });
    obstacles.push({ x, z, r: r * 0.8, low: true });
    // baies rouges ou bleues sur certains buissons
    if (i % 4 === 2) {
      const bb = new Builder();
      const berry = i % 8 === 2 ? '#e9786f' : '#8fa6e6';
      for (let k = 0; k < 14; k++) {
        const a = k * 2.4;
        const yy = y + r * (0.35 + (k % 4) * 0.18);
        bb.add(G.sphere(0.055, 7, 5), berry, { p: [x + Math.cos(a) * r * 0.92, yy, z + Math.sin(a) * r * 0.92] });
      }
      push(bb);
    }
    // quelques fleurs sur certains buissons
    if (i % 3 === 1) {
      const fb = new Builder();
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + i;
        fb.add(G.sphere(0.09, 8, 6), [PAL.coral, PAL.white, PAL.butter][k % 3], { p: [x + Math.cos(a) * r * 0.7, y + r * 0.9 + (k % 2) * 0.15, z + Math.sin(a) * r * 0.7] });
      }
      push(fb);
    }
  });

  // -------------------------------------------------------------------------
  // Palmiers sur la plage
  // -------------------------------------------------------------------------
  const frond = palmFrondGeometry();
  const palms = [[-20.5, 11.5], [-22.5, 4.5], [20.0, 12.5], [22.0, -6.5], [-14.5, 19.0], [5.0, 23.0]];
  palms.forEach(([x, z], i) => {
    const y = heightAt(x, z) - 0.1;
    const b = new Builder();
    const out = new THREE.Vector3(x, 0, z).normalize();
    const pts = [];
    const n = 6;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      pts.push(new THREE.Vector3(x + out.x * t * t * 1.8, y + t * 4.3, z + out.z * t * t * 1.8));
    }
    for (let k = 0; k < n; k++) {
      const r0 = THREE.MathUtils.lerp(0.3, 0.17, k / n);
      const r1 = THREE.MathUtils.lerp(0.3, 0.17, (k + 1) / n);
      segment(b, PAL.palmTrunk, pts[k], pts[k + 1], r0, r1, 12);
      b.add(G.torus(r1 * 1.02, 0.045, 6, 14), '#c49d74', { p: [pts[k + 1].x, pts[k + 1].y - 0.05, pts[k + 1].z], r: [Math.PI / 2, 0, 0] });
    }
    const top = pts[n];
    b.add(G.sphere(0.32, 12, 10), '#a5c97e', { p: [top.x, top.y + 0.05, top.z] });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i;
      b.add(G.sphere(0.17, 10, 8), '#a8794f', { p: [top.x + Math.cos(a) * 0.25, top.y - 0.18, top.z + Math.sin(a) * 0.25] });
    }
    push(b);
    const fl = new Builder();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + i;
      fl.add(frond, k % 2 ? PAL.palm : '#93d38f', { p: [top.x, top.y + 0.1, top.z], r: [0, -a, 0.15 + (k % 3) * 0.12], s: 1.05 - (k % 2) * 0.15 });
    }
    statics.push(fl.build());
    obstacles.push({ x, z, r: 0.4 });
  });

  // -------------------------------------------------------------------------
  // Rochers
  // -------------------------------------------------------------------------
  const rocks = [
    [-9.5, -11.0, 1.1], [-7.8, -10.6, 0.7], [4.0, -10.2, 0.9], [16.2, -10.0, 1.0], [-14.0, -12.5, 1.2],
    [21.5, 4.0, 0.8], [-23.0, -3.0, 0.9], [-19.0, 16.0, 0.7], [14.5, 21.5, 0.6], [-3.6, -6.2, 0.5],
    [-0.6, -5.6, 0.45], [24.5, -1.5, 0.7], [-8.0, 24.0, 0.8], [2.0, -25.5, 1.3], [-12.0, -22.0, 1.1],
  ];
  rocks.forEach(([x, z, r], i) => {
    const y = heightAt(x, z);
    const b = new Builder();
    b.add(G.rock(r, i * 3.7), i % 2 ? PAL.rock : PAL.rockWarm, { p: [x, y + r * 0.25, z], s: [1, 0.72, 1], r: [0, i, 0] });
    if (r > 0.8) b.add(G.rock(r * 0.5, i * 1.3 + 5), PAL.rock, { p: [x + r * 0.9, y + r * 0.1, z + r * 0.3], s: [1, 0.7, 1] });
    push(b);
    obstacles.push({ x, z, r: r * 0.9 });
  });

  // -------------------------------------------------------------------------
  // Ponton
  // -------------------------------------------------------------------------
  {
    const P = LAYOUT.pier;
    const b = new Builder();
    ponton(b, P);
    push(b);
    spots.pierEnd = { x: P.x, z: P.z1 - 0.6 };
  }

  // -------------------------------------------------------------------------
  // Pont sur la rivière (plateau)
  // -------------------------------------------------------------------------
  {
    const b = new Builder();
    const z = -14.2;
    const x0 = -5.4;
    const x1 = -1.6;
    const base = LAYOUT.upperH - 0.02;
    pontRiviere(b, x0, x1, z, base);
    push(b);
    spots.bridge = { x0, x1, z, base, w: 1.5 };
  }

  // -------------------------------------------------------------------------
  // Échoppe de décorations
  // -------------------------------------------------------------------------
  {
    const { x, z } = LAYOUT.shop;
    const y = heightAt(x, z);
    const b = new Builder();
    echoppe(b, x, y, z);
    push(b);
    obstacles.push({ x, z: z - 0.6, r: 0.75 }, { x, z: z + 0.6, r: 0.75 }, { x: x + 0.3, z: z + 1.75, r: 0.45 });
    spots.shop = { x: x - 1.5, z };
  }

  // -------------------------------------------------------------------------
  // Potager : parcelles vides + clôture
  // -------------------------------------------------------------------------
  {
    const { x: gx, z: gz } = LAYOUT.garden;
    const b = new Builder();
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 4; i++) {
        const px = gx - 3 + i * 2;
        const pz = gz - 2 + j * 2;
        const y = heightAt(px, pz);
        // bordure de terre + paillage clair (jamais de terre nue en bloc)
        b.add(G.box(1.55, 0.16, 1.55, 0.08), PAL.soil, { p: [px, y + 0.02, pz] });
        b.add(G.box(1.36, 0.06, 1.36, 0.03), '#e6cf9d', { p: [px, y + 0.11, pz] });
        const rr = rng(i * 7 + j * 13 + 5);
        for (let k = 0; k < 16; k++) {
          const sx = (rr() - 0.5) * 1.15;
          const sz = (rr() - 0.5) * 1.15;
          b.add(G.box(0.26 + rr() * 0.12, 0.018, 0.035, 0.008), rr() > 0.5 ? '#f3dfaa' : '#d6b980', { p: [px + sx, y + 0.145, pz + sz], r: [0, rr() * Math.PI, 0] });
        }
        spots.plots.push({ x: px, z: pz, y: y + 0.15 });
      }
    }
    // clôture (ouverture côté nord, face au chemin)
    const x0 = gx - 4.4;
    const x1 = gx + 4.4;
    const z0 = gz - 3.3;
    const z1 = gz + 3.3;
    const posts = [];
    for (let x = x0; x <= x1 + 0.01; x += 1.1) posts.push([x, z1]);
    for (let z = z0; z < z1; z += 1.1) {
      posts.push([x0, z]);
      posts.push([x1, z]);
    }
    for (let x = x0 + 1.1; x < x1; x += 1.1) if (Math.abs(x - gx) > 1.3) posts.push([x, z0]);
    for (const [px, pz] of posts) {
      const y = heightAt(px, pz);
      b.add(G.cyl(0.07, 0.08, 0.8, 8), PAL.woodLight, { p: [px, y + 0.35, pz] });
      b.add(G.sphere(0.08, 8, 6), PAL.woodLight, { p: [px, y + 0.76, pz] });
      obstacles.push({ x: px, z: pz, r: 0.25 });
    }
    const rail = (ax, az, cx, cz) => {
      const ya = heightAt(ax, az);
      const yc = heightAt(cx, cz);
      segment(b, PAL.wood, new THREE.Vector3(ax, ya + 0.55, az), new THREE.Vector3(cx, yc + 0.55, cz), 0.04, 0.04, 6);
      segment(b, PAL.wood, new THREE.Vector3(ax, ya + 0.3, az), new THREE.Vector3(cx, yc + 0.3, cz), 0.04, 0.04, 6);
    };
    rail(x0, z1, x1, z1);
    rail(x0, z0, x0, z1);
    rail(x1, z0, x1, z1);
    rail(x0, z0, gx - 1.3, z0);
    rail(gx + 1.3, z0, x1, z0);
    // arrosoir posé près de l'entrée
    const wy = heightAt(gx + 1.7, z0 + 0.6);
    b.add(G.cyl(0.18, 0.2, 0.3, 12), PAL.sky, { p: [gx + 1.7, wy + 0.15, z0 + 0.6] });
    segment(b, PAL.sky, new THREE.Vector3(gx + 1.85, wy + 0.15, z0 + 0.6), new THREE.Vector3(gx + 2.15, wy + 0.38, z0 + 0.6), 0.04, 0.03, 6);
    push(b);
    spots.garden = { x: gx, z: gz, entrance: { x: gx, z: z0 - 0.8 } };
  }

  // -------------------------------------------------------------------------
  // Panneau indicateur sur la place
  // -------------------------------------------------------------------------
  {
    const x = 0.6;
    const z = 2.0;
    const y = heightAt(x, z);
    const b = new Builder();
    panneauPlace(b, x, y, z);
    push(b);
    obstacles.push({ x, z, r: 0.25 });
  }

  // -------------------------------------------------------------------------
  // Banc près du bassin
  // -------------------------------------------------------------------------
  {
    const x = -5.2;
    const z = -3.4;
    const y = heightAt(x, z);
    const b = new Builder();
    bancBois(b, x, y, z);
    push(b);
    obstacles.push({ x, z, r: 0.7 });
  }

  // -------------------------------------------------------------------------
  // Lanternes (lumières ponctuelles la nuit)
  // -------------------------------------------------------------------------
  const lanternSpots = [
    [-8.8, 4.9], [7.0, 2.2], [3.4, 2.3], [LAYOUT.pier.x + 1.0, LAYOUT.pier.z1 - 0.4, LAYOUT.pier.h],
    [LAYOUT.pier.x - 1.6, LAYOUT.pier.z0 - 0.2], [-1.6, 5.4], [11.0, -6.4], [8.9, -13.8], [14.6, 4.8], [-4.8, -4.4],
  ];
  for (const [x, z, fixedY] of lanternSpots) {
    const y = fixedY ?? heightAt(x, z);
    const b = new Builder();
    lanterneJardin(b, glass, x, y, z);
    push(b);
    obstacles.push({ x, z, r: 0.2 });
    lanterns.push(new THREE.Vector3(x, y + 1.72, z));
  }

  // -------------------------------------------------------------------------
  // Assemblage
  // -------------------------------------------------------------------------
  const geo = mergeGeometries(statics, false);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, toonMaterial({ vertexColors: true, aId: true }));
  mesh.name = 'props';
  mesh.layers.enable(LAYER_SHADOW);
  const glassMesh = new THREE.Mesh(
    glass.build(),
    toonMaterial({ vertexColors: true, aId: true, emissive: 0xffa94a, emissiveNight: true, rim: 0.2 }),
  );
  glassMesh.name = 'glass';
  return { mesh, glassMesh, clumps, obstacles, lanterns, spots };
}
