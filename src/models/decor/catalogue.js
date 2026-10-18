// Décor achetable à l'échoppe (prix en coquillages) : chaque entrée a son build() → Object3D,
// animé au besoin par userData.anim(dt, t).
import * as THREE from 'three';
import { Builder, G } from '../../render/builder.js';
import { toonMaterial, glowMaterial } from '../../render/shaders/materials.js';
import { LAYER_SHADOW } from '../../core/globals.js';
import { PAL } from '../kit/palette.js';

// ---------------------------------------------------------------------------
// Catalogue de l'échoppe (prix en coquillages)
// ---------------------------------------------------------------------------
function mesh(b, opts = {}) {
  const m = new THREE.Mesh(b.build(), toonMaterial({ vertexColors: true, aId: true, ...opts }));
  m.layers.enable(LAYER_SHADOW);
  return m;
}

function halo(y, size = 1.3, color = 0xffc27a) {
  const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(color, size));
  h.position.y = y;
  h.renderOrder = 10;
  h.userData.halo = true;
  return h;
}

export const CATALOG = {
  pierre: {
    name: 'Pierres de chemin', price: 4, r: 0.45, desc: 'Trois galets plats pour tracer un sentier.',
    build() {
      const b = new Builder();
      [[0, 0, 0.36], [0.5, 0.25, 0.28], [-0.45, 0.3, 0.3]].forEach(([x, z, r], i) => b.add(G.rock(r, i + 3), i % 2 ? PAL.stone : PAL.rock, { p: [x, 0.02, z], s: [1, 0.22, 1] }));
      return mesh(b, { rim: 0.5 });
    },
  },
  pot: {
    name: 'Pot de fleurs', price: 6, r: 0.32, desc: 'Un pot rond et des fleurs qui dansent.',
    build() {
      const b = new Builder();
      b.add(G.cyl(0.24, 0.18, 0.32, 14), '#e8987a', { p: [0, 0.16, 0] });
      b.add(G.torus(0.24, 0.05, 6, 16), '#f0a88a', { p: [0, 0.32, 0], r: [Math.PI / 2, 0, 0] });
      b.add(G.sphere(0.22, 12, 8), PAL.leaf, { p: [0, 0.4, 0], s: [1, 0.55, 1] });
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        b.add(G.sphere(0.07, 8, 6), [PAL.coral, PAL.butter, PAL.lilac][i % 3], { p: [Math.cos(a) * 0.14, 0.5 + (i % 2) * 0.05, Math.sin(a) * 0.14] });
      }
      return mesh(b);
    },
  },
  cloture: {
    name: 'Bout de clôture', price: 5, r: 0.5, desc: 'Trois piquets arrondis et deux traverses.',
    build() {
      const b = new Builder();
      for (const x of [-0.7, 0, 0.7]) {
        b.add(G.cyl(0.07, 0.08, 0.8, 8), PAL.woodLight, { p: [x, 0.38, 0] });
        b.add(G.sphere(0.08, 8, 6), PAL.woodLight, { p: [x, 0.78, 0] });
      }
      b.add(G.box(1.5, 0.08, 0.06, 0.03), PAL.wood, { p: [0, 0.55, 0] });
      b.add(G.box(1.5, 0.08, 0.06, 0.03), PAL.wood, { p: [0, 0.3, 0] });
      return mesh(b);
    },
  },
  lanterne: {
    name: 'Lanterne en papier', price: 12, r: 0.3, desc: 'Elle s\'allume toute seule à la tombée de la nuit.',
    build() {
      const g = new THREE.Group();
      const b = new Builder();
      b.add(G.cyl(0.05, 0.06, 1.4, 8), PAL.woodDark, { p: [0, 0.7, 0] });
      b.add(G.box(0.4, 0.05, 0.05, 0.02), PAL.woodDark, { p: [0.15, 1.38, 0] });
      g.add(mesh(b));
      const l = new Builder();
      l.add(G.sphere(0.2, 14, 10), '#ffd2b8', { p: [0.3, 1.12, 0], s: [1, 1.2, 1] });
      l.add(G.cyl(0.1, 0.1, 0.05, 10), PAL.coral, { p: [0.3, 1.36, 0] });
      l.add(G.cyl(0.1, 0.1, 0.05, 10), PAL.coral, { p: [0.3, 0.88, 0] });
      g.add(mesh(l, { emissive: 0xffa060, emissiveNight: true, rim: 0.3 }));
      const h = halo(1.12, 1.5);
      h.position.x = 0.3;
      g.add(h);
      return g;
    },
  },
  champi: {
    name: 'Lampe champignon', price: 14, r: 0.35, desc: 'Un gros champignon qui luit doucement la nuit.',
    build() {
      const g = new THREE.Group();
      const b = new Builder();
      b.add(G.cyl(0.09, 0.13, 0.45, 12), PAL.white, { p: [0, 0.22, 0] });
      g.add(mesh(b));
      const c = new Builder();
      c.add(G.sphere(0.34, 16, 12), '#f7b6c8', { p: [0, 0.5, 0], s: [1, 0.6, 1] });
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        c.add(G.sphere(0.05, 8, 6), PAL.white, { p: [Math.cos(a) * 0.2, 0.66, Math.sin(a) * 0.2] });
      }
      g.add(mesh(c, { emissive: 0xd9709a, emissiveNight: true }));
      g.add(halo(0.5, 1.6, 0xffa8c8));
      return g;
    },
  },
  nichoir: {
    name: 'Nichoir', price: 16, r: 0.3, desc: 'Une petite maison pour les oiseaux de passage.',
    build() {
      const b = new Builder();
      b.add(G.cyl(0.05, 0.06, 1.4, 8), PAL.woodDark, { p: [0, 0.7, 0] });
      b.add(G.box(0.36, 0.38, 0.32, 0.06), PAL.sky, { p: [0, 1.55, 0] });
      b.add(G.cone(0.3, 0.25, 4), PAL.coral, { p: [0, 1.86, 0], r: [0, Math.PI / 4, 0] });
      b.add(G.cyl(0.07, 0.07, 0.04, 12), '#5b4a63', { p: [0, 1.58, 0.16], r: [Math.PI / 2, 0, 0] });
      b.add(G.cyl(0.015, 0.015, 0.12, 5), PAL.woodDark, { p: [0, 1.46, 0.2], r: [Math.PI / 2, 0, 0] });
      return mesh(b);
    },
  },
  banc: {
    name: 'Banc rond', price: 18, r: 0.75, desc: 'Pour faire une pause et regarder les nuages.',
    build() {
      const b = new Builder();
      b.add(G.box(1.4, 0.1, 0.45, 0.04), PAL.woodLight, { p: [0, 0.45, 0] });
      b.add(G.box(1.4, 0.34, 0.08, 0.04), PAL.wood, { p: [0, 0.72, -0.22] });
      for (const x of [-0.55, 0.55]) b.add(G.box(0.08, 0.45, 0.4, 0.03), PAL.woodDark, { p: [x, 0.22, 0] });
      b.add(G.sphere(0.13, 10, 8), PAL.coral, { p: [-0.4, 0.55, -0.05], s: [1, 0.6, 1] });
      return mesh(b);
    },
  },
  fanions: {
    name: 'Guirlande de fanions', price: 20, r: 0.3, desc: 'Des petits drapeaux pastel entre deux piquets.',
    build() {
      const b = new Builder();
      for (const x of [-1.1, 1.1]) b.add(G.cyl(0.05, 0.06, 1.7, 8), PAL.woodDark, { p: [x, 0.85, 0] });
      const cols = [PAL.coral, PAL.butter, PAL.mint, PAL.lilac, PAL.sky];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = -1.0 + t * 2.0;
        const y = 1.6 - Math.sin(t * Math.PI) * 0.3;
        b.add(G.cone(0.1, 0.22, 3), cols[i % cols.length], { p: [x, y - 0.12, 0], r: [Math.PI, 0, 0], s: [1, 1, 0.25] });
      }
      return mesh(b, { wind: 0.4, side: THREE.DoubleSide });
    },
  },
  hamac: {
    name: 'Hamac', price: 35, r: 1.0, desc: 'Tendu entre deux poteaux, parfait pour rêvasser.',
    build() {
      const b = new Builder();
      for (const x of [-1.2, 1.2]) b.add(G.cyl(0.07, 0.09, 1.5, 8), PAL.woodDark, { p: [x, 0.75, 0] });
      for (let i = 0; i < 8; i++) {
        const t = (i + 0.5) / 8;
        const x = -1.0 + t * 2.0;
        const y = 1.15 - Math.sin(t * Math.PI) * 0.45;
        b.add(G.box(0.27, 0.05, 0.7, 0.02), i % 2 ? PAL.mint : PAL.white, { p: [x, y, 0], r: [0, 0, Math.cos(t * Math.PI) * 0.4] });
      }
      return mesh(b);
    },
  },
  telescope: {
    name: 'Télescope', price: 45, r: 0.45, desc: 'Pour observer les étoiles les soirs de révision.',
    build() {
      const b = new Builder();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        b.add(G.cyl(0.03, 0.04, 1.0, 6), PAL.woodDark, { p: [Math.cos(a) * 0.18, 0.47, Math.sin(a) * 0.18], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] });
      }
      b.add(G.cyl(0.09, 0.12, 0.8, 12), PAL.sky, { p: [0, 1.05, 0.1], r: [-1.0, 0, 0] });
      b.add(G.torus(0.12, 0.03, 6, 14), PAL.butter, { p: [0, 1.25, -0.2], r: [-1.0 + Math.PI / 2, 0, 0] });
      return mesh(b);
    },
  },
  moulin: {
    name: 'Moulin à vent', price: 50, r: 0.7, desc: 'Ses ailes tournent avec la brise.',
    build() {
      const g = new THREE.Group();
      const b = new Builder();
      b.add(G.cyl(0.32, 0.5, 1.6, 12), PAL.cream, { p: [0, 0.8, 0] });
      b.add(G.cone(0.48, 0.55, 12), PAL.roof, { p: [0, 1.85, 0] });
      b.add(G.box(0.3, 0.45, 0.05, 0.05), PAL.wood, { p: [0, 0.25, 0.45] });
      g.add(mesh(b));
      const s = new Builder();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        s.add(G.box(0.18, 0.75, 0.03, 0.03), i % 2 ? PAL.white : PAL.mint, { p: [Math.sin(a) * 0.42, Math.cos(a) * 0.42, 0], r: [0, 0, -a] });
      }
      s.add(G.sphere(0.07, 8, 6), PAL.butter);
      const sails = mesh(s);
      sails.position.set(0, 1.5, 0.42);
      g.add(sails);
      g.userData.anim = (dt) => {
        sails.rotation.z -= dt * 1.2;
      };
      return g;
    },
  },
  arche: {
    name: 'Arche fleurie', price: 55, r: 0.25, desc: 'Une arche couverte de fleurs pour une entrée de jardin.',
    build() {
      const b = new Builder();
      for (const x of [-0.75, 0.75]) b.add(G.cyl(0.07, 0.08, 1.8, 8), PAL.woodLight, { p: [x, 0.9, 0] });
      b.add(G.torus(0.75, 0.07, 8, 24, Math.PI), PAL.woodLight, { p: [0, 1.8, 0] });
      for (let i = 0; i < 16; i++) {
        const a = (i / 15) * Math.PI;
        const r = i % 2 ? 0.1 : 0.13;
        b.add(G.sphere(r, 8, 6), i % 3 === 0 ? PAL.leaf : [PAL.blossom, PAL.white, PAL.butter][i % 3], { p: [Math.cos(a) * 0.75, 1.8 + Math.sin(a) * 0.75, (i % 2 ? 0.06 : -0.06)] });
      }
      return mesh(b);
    },
  },
  statue: {
    name: 'Statue du hibou', price: 70, r: 0.5, desc: 'Un hommage en pierre au bibliothécaire de l\'île.',
    build() {
      const b = new Builder();
      b.add(G.box(0.7, 0.4, 0.7, 0.08), PAL.stone, { p: [0, 0.2, 0] });
      b.add(G.sphere(0.32, 14, 10), '#d9d2e0', { p: [0, 0.72, 0], s: [1, 1.1, 0.95] });
      b.add(G.sphere(0.27, 14, 10), '#d9d2e0', { p: [0, 1.15, 0] });
      for (const sx of [-1, 1]) {
        b.add(G.sphere(0.09, 10, 8), '#f2edf4', { p: [sx * 0.1, 1.18, 0.22], s: [1, 1, 0.5] });
        b.add(G.cone(0.07, 0.16, 8), '#c9c0d2', { p: [sx * 0.18, 1.42, -0.02], r: [0, 0, -sx * 0.4] });
      }
      return mesh(b, { rim: 1.4 });
    },
  },
  // Stations fabriquées : elles partagent le placement et la persistance du décor,
  // mais ne sont pas proposées à l'achat dans l'échoppe.
  etabli: {
    name: 'Établi', r: 0.7, station: 'etabli', desc: 'Un établi pour fabriquer outils et matériaux.',
    build() {
      const b = new Builder();
      b.add(G.box(1.35, 0.18, 0.72, 0.08), PAL.woodLight, { p: [0, 0.92, 0] });
      b.add(G.box(1.18, 0.62, 0.12, 0.04), PAL.wood, { p: [0, 0.53, -0.22] });
      for (const x of [-0.52, 0.52]) b.add(G.box(0.12, 0.82, 0.58, 0.04), PAL.woodDark, { p: [x, 0.42, 0] });
      b.add(G.box(0.34, 0.1, 0.24, 0.04), PAL.stone, { p: [-0.32, 1.06, 0.02] });
      b.add(G.cyl(0.04, 0.04, 0.34, 8), PAL.stoneWarm, { p: [0.28, 1.12, 0.02], r: [0, 0, Math.PI / 2] });
      return mesh(b);
    },
  },
  four: {
    name: 'Four', r: 0.62, station: 'four', desc: 'Un four doux pour cuisiner.',
    build() {
      const b = new Builder();
      b.add(G.cyl(0.55, 0.62, 0.82, 16), PAL.cream, { p: [0, 0.42, 0] });
      b.add(G.cone(0.63, 0.28, 16), PAL.roof, { p: [0, 0.97, 0] });
      b.add(G.arc ? G.arc(0.22, 0.3, 0.2, 12) : G.torus(0.22, 0.035, 8, 16), PAL.woodDark, { p: [0, 0.3, 0.48], r: [Math.PI / 2, 0, 0] });
      b.add(G.box(0.1, 0.16, 0.04, 0.02), PAL.butter, { p: [0, 0.17, 0.54] });
      return mesh(b);
    },
  },
  couture: {
    name: 'Table de couture', r: 0.65, station: 'couture', desc: 'Une petite table de couture.',
    build() {
      const b = new Builder();
      b.add(G.box(1.2, 0.16, 0.68, 0.08), PAL.woodLight, { p: [0, 0.82, 0] });
      for (const x of [-0.48, 0.48]) b.add(G.box(0.1, 0.74, 0.55, 0.03), PAL.wood, { p: [x, 0.38, 0] });
      b.add(G.box(0.44, 0.28, 0.04, 0.02), PAL.lilac, { p: [0.12, 1.04, 0.08] });
      b.add(G.torus(0.16, 0.025, 6, 14), PAL.coral, { p: [-0.3, 1.02, 0.03], r: [Math.PI / 2, 0, 0] });
      return mesh(b);
    },
  },
  chantier: {
    name: 'Chantier naval', r: 1.0, station: 'chantier', desc: 'Un établi robuste pour préparer son bateau.',
    build() {
      const b = new Builder();
      b.add(G.box(1.8, 0.18, 0.82, 0.08), PAL.woodLight, { p: [0, 0.78, 0] });
      for (const x of [-0.7, 0.7]) b.add(G.box(0.14, 0.68, 0.72, 0.04), PAL.woodDark, { p: [x, 0.36, 0] });
      b.add(G.box(1.3, 0.14, 0.3, 0.04), PAL.sky, { p: [0, 1.03, -0.05] });
      b.add(G.cone(0.18, 0.3, 8), PAL.coral, { p: [0.55, 1.24, 0.12] });
      return mesh(b);
    },
  },
  fontaine: {
    name: 'Fontaine', price: 90, r: 0.95, desc: 'Une vasque ronde qui gazouille au soleil.',
    build() {
      const g = new THREE.Group();
      const b = new Builder();
      b.add(G.cyl(0.9, 1.0, 0.35, 24), PAL.stone, { p: [0, 0.17, 0] });
      b.add(G.torus(0.9, 0.1, 8, 28), PAL.stoneWarm, { p: [0, 0.36, 0], r: [Math.PI / 2, 0, 0] });
      b.add(G.cyl(0.12, 0.16, 0.8, 12), PAL.stone, { p: [0, 0.6, 0] });
      b.add(G.cyl(0.42, 0.18, 0.14, 16), PAL.stoneWarm, { p: [0, 1.0, 0] });
      g.add(mesh(b));
      const w = new Builder();
      w.add(G.cyl(0.84, 0.84, 0.04, 24), '#9fdcf0', { p: [0, 0.33, 0] });
      w.add(G.cyl(0.36, 0.36, 0.03, 16), '#9fdcf0', { p: [0, 1.06, 0] });
      w.add(G.sphere(0.1, 10, 8), '#e8f8ff', { p: [0, 1.2, 0], s: [1, 1.6, 1] });
      const water = mesh(w, { rim: 1.2, emissive: 0x406070, outline: 0.5 });
      g.add(water);
      g.userData.anim = (dt, t) => {
        water.scale.y = 1 + Math.sin(t * 6) * 0.06;
      };
      return g;
    },
  },
};

export const CATALOG_ORDER = ['pierre', 'cloture', 'pot', 'lanterne', 'champi', 'nichoir', 'banc', 'fanions', 'hamac', 'telescope', 'moulin', 'arche', 'statue', 'fontaine'];
