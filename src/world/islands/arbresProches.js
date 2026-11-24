// Arbres proches : les feuillus à moins d'environ 30 m du joueur passent en version détaillée (feuilles une
// à une, bois fin, écorce peinte : kit/arbreFractal.js, arbreProche), et quelques feuilles s'en détachent
// et tombent. Les forêts restent dessinées par île en version forêt (touffes) ; la bascule se fait dans les
// shaders, par instance (LOD_ARBRES, render/shaders/materials.js) : la version forêt s'efface en deçà de
// uLodProche, la version proche au-delà. Ce module choisit les arbres proches (au plus CAPACITE par
// espèce : la distance de bascule se resserre dans les forêts denses), remplit leurs instances et règle
// les uniformes, quelques fois par seconde. Rien à recalculer dans les maillages des îles.
import * as THREE from 'three';
import { ORIGIN, U } from '../../core/globals.js';
import { LOD_ARBRES } from '../../render/shaders/materials.js';
import { kindModel } from '../../models/vegetation.js';
import { KINDS } from './gen/kinds.js';

const CAPACITE = 40; // arbres détaillés par espèce, au plus
const MARGE = 5; // m : la version proche couvre un peu plus loin que la bascule (le joueur avance entre deux choix)
const PERIODE = 0.15; // s entre deux choix
const N_CHUTE = 160; // feuilles qui tombent, en tout

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _c = new THREE.Color();

// carte de feuille pliée (même forme que les feuilles des arbres) pour les feuilles qui tombent
function carteChute() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.34, 0, -0.04, 0, 0, 0, 0.34, 0, -0.04, -0.34, 1, -0.14, 0, 1, -0.1, 0.34, 1, -0.14], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0.5, 0, 1, 0, 0, 1, 0.5, 1, 1, 1], 2));
  g.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4]);
  g.computeVertexNormals();
  return g;
}

export class ArbresProches {
  // mats : { bois, feuilles, chute } ; rayon : distance de bascule visée (m), 0 = pas de version proche
  constructor({ root, mats, rayon = 30 }) {
    this.root = root;
    this.mats = mats;
    this.rayon = rayon;
    this.especes = new Map(); // espèce → { bois, feuilles, anc, col, forme, n } (null : pas de version proche)
    this.t = 0;
    this.proches = []; // arbres détaillés : { esp, m (repère du groupe des îles) }
    // feuilles qui tombent : tout le mouvement est dans le shader (feuilleMaterial, CHUTE)
    const geo = carteChute();
    const chute = new THREE.InstancedMesh(geo, mats.chute, N_CHUTE);
    chute.frustumCulled = false;
    chute.name = 'feuilles-qui-tombent';
    this.iDepart = new THREE.InstancedBufferAttribute(new Float32Array(N_CHUTE * 3), 3);
    this.iChute = new THREE.InstancedBufferAttribute(new Float32Array(N_CHUTE * 4), 4);
    // hauteur du sol, case de l'atlas, origine de l'arbre (xz : famille de couleur, FAMILLE de chunks.js)
    this.iSol = new THREE.InstancedBufferAttribute(new Float32Array(N_CHUTE * 4), 4);
    geo.setAttribute('iDepart', this.iDepart);
    geo.setAttribute('iChute', this.iChute);
    geo.setAttribute('iSol', this.iSol);
    // hasard reproductible : phase, vitesse (une chute toutes les 7 à 12 s), culbute ; taille posée au départ
    let s = 12345;
    this.rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    this.taille = new Float32Array(N_CHUTE);
    this.cycle = new Float64Array(N_CHUTE).fill(-1);
    for (let j = 0; j < N_CHUTE; j++) {
      this.iChute.setXYZW(j, this.rand(), 1 / (7 + this.rand() * 5), 1.5 + this.rand() * 2.5, 0);
      this.taille[j] = 0.75 + this.rand() * 0.5;
      chute.setMatrixAt(j, _m.identity());
      chute.setColorAt(j, _c.setRGB(1, 1, 1));
    }
    this.chute = chute;
    root.add(chute);
  }

  // instances détaillées d'une espèce (créées au premier arbre proche de cette espèce)
  espece(kind) {
    let esp = this.especes.get(kind);
    if (esp !== undefined) return esp;
    const model = kindModel(kind);
    esp = null;
    if (typeof model.detail === 'function') {
      const d = model.detail();
      const bois = new THREE.InstancedMesh(d.solid, this.mats.bois, CAPACITE);
      const feuilles = new THREE.InstancedMesh(d.leafGeo, this.mats.feuilles, CAPACITE);
      for (const im of [bois, feuilles]) {
        im.count = 0;
        im.frustumCulled = false;
        im.name = `${kind}-proche`;
        this.root.add(im);
      }
      // feuilles qui tombent : la couleur, la taille et la forme des feuilles de l'espèce ; départs : leurs
      // attaches (une feuille = 6 sommets)
      const anc = d.leafGeo.attributes.aAncre;
      const col = d.leafGeo.attributes.color;
      const pos = d.leafGeo.attributes.position;
      const uvs = d.leafGeo.attributes.uv;
      const forme = (uvs.getX(2) > 0.75 ? 1 : 0) + (uvs.getY(0) < 0.25 ? 2 : 0);
      // longueur d'une feuille : du pied (sommet 1) au bout de la nervure (sommet 4)
      const longueur = _v.fromBufferAttribute(pos, 4).distanceTo(new THREE.Vector3().fromBufferAttribute(pos, 1));
      esp = { bois, feuilles, anc, col, forme, longueur, n: 0 };
    }
    this.especes.set(kind, esp);
    return esp;
  }

  // entries : îles du gestionnaire ; px, pz : position absolue du joueur
  update(entries, px, pz, dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = PERIODE;
    const R = this.rayon;
    const listes = new Map();
    if (R > 0) {
      for (const e of entries.values()) {
        if (!e.near?.visible || !e.items) continue;
        const g = e.group.position;
        for (const [ki, rec] of e.items.kinds) {
          const kind = KINDS[ki];
          const im = rec.meshes[0];
          if (!im || !this.espece(kind)) continue;
          const a = im.instanceMatrix.array;
          let l = listes.get(kind);
          for (let i = 0; i < im.count; i++) {
            const o = i * 16;
            // arbre abattu ou caché : échelle nulle
            if (a[o] * a[o] + a[o + 1] * a[o + 1] + a[o + 2] * a[o + 2] < 1e-6) continue;
            const d = Math.hypot(g.x + a[o + 12] - px, g.z + a[o + 14] - pz);
            if (d >= R + MARGE) continue;
            if (!l) listes.set(kind, (l = []));
            l.push({ d, e, rec, i });
          }
        }
      }
    }
    // distance de bascule : resserrée si une espèce a plus d'arbres proches que sa capacité
    let D = R;
    for (const l of listes.values()) {
      l.sort((x, y) => x.d - y.d);
      if (l.length > CAPACITE) D = Math.min(D, l[CAPACITE].d - MARGE);
    }
    D = Math.max(D, 0);
    LOD_ARBRES.uLodProche.value = D;
    LOD_ARBRES.uLodCentre.value.set(px - ORIGIN.x, pz - ORIGIN.z);
    this.proches.length = 0;
    for (const [kind, esp] of this.especes) {
      if (!esp) continue;
      const l = listes.get(kind) || [];
      let n = 0;
      for (const c of l) {
        if (c.d >= D + MARGE || n >= CAPACITE) break;
        const g = c.e.group.position;
        const far = c.rec.meshes;
        _m.fromArray(far[0].instanceMatrix.array, c.i * 16);
        _m.elements[12] += g.x;
        _m.elements[13] += g.y;
        _m.elements[14] += g.z;
        esp.bois.setMatrixAt(n, _m);
        esp.feuilles.setMatrixAt(n, _m);
        // teinte d'instance : celle de l'arbre de la forêt (bois et touffes)
        if (far[0].instanceColor) esp.bois.setColorAt(n, _c.fromArray(far[0].instanceColor.array, c.i * 3));
        if (far[1]?.instanceColor) esp.feuilles.setColorAt(n, _c.fromArray(far[1].instanceColor.array, c.i * 3));
        this.proches.push({ esp, m: _m.clone() });
        n++;
      }
      esp.n = n;
      for (const im of [esp.bois, esp.feuilles]) {
        im.count = n;
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      }
    }
    this.chutes();
  }

  // Feuilles qui tombent : chacune repart d'une feuille d'un arbre proche au début de sa chute (sa taille
  // est alors nulle : le changement de départ ne se voit pas) ; sans arbre proche, elles s'éteignent.
  chutes() {
    const t = U.uTime.value;
    const P = this.proches;
    let change = false;
    for (let j = 0; j < N_CHUTE; j++) {
      const u = t * this.iChute.getY(j) + this.iChute.getX(j);
      const cycle = Math.floor(u);
      // une fois par chute, à son début (taille encore nulle : le changement de départ ne se voit pas) ;
      // une feuille découverte en pleine course attend la chute suivante
      if (cycle === this.cycle[j]) continue;
      this.cycle[j] = cycle;
      if (!P.length || u - cycle > 0.04) {
        if (this.iChute.getW(j) !== 0) {
          this.iChute.setW(j, 0);
          change = true;
        }
        continue;
      }
      const a = P[Math.floor(this.rand() * P.length)];
      const k = Math.floor((this.rand() * a.esp.anc.count) / 6) * 6;
      _v.fromBufferAttribute(a.esp.anc, k).applyMatrix4(a.m);
      this.iDepart.setXYZ(j, _v.x, _v.y, _v.z);
      this.iSol.setXYZW(j, a.m.elements[13] + 0.03, a.esp.forme, a.m.elements[12], a.m.elements[14]);
      const echelle = Math.hypot(a.m.elements[0], a.m.elements[1], a.m.elements[2]);
      this.iChute.setW(j, this.taille[j] * a.esp.longueur * echelle);
      this.chute.setColorAt(j, _c.fromBufferAttribute(a.esp.col, k).multiplyScalar(1.05));
      change = true;
    }
    if (change) {
      this.iDepart.needsUpdate = true;
      this.iChute.needsUpdate = true;
      this.iSol.needsUpdate = true;
      this.chute.instanceColor.needsUpdate = true;
    }
  }
}
