// Nef effondrée du plateau (MON-014), ruine alternative à la grande ruine (MON-012), dans le style et la
// palette de la planche de l'utilisateur (reference.png) mais d'une autre composition : nef de chapelle
// ouverte au ciel sur un dallage surélevé (deux marches d'entrée), colonnade de deux rangées de quatre
// colonnes à chapiteau dont plusieurs brisées, arcade de deux arcs brisés qui court encore sur trois
// colonnes de gauche, chevet plein au pignon brisé percé d'une grande baie haute à meneau, bannière bleu
// ardoise pendue au chevet, côté nef ; façade d'entrée réduite à deux moignons et au départ du portail
// ogival effondré ; contreforts à degrés derrière le chevet ; tambours de colonnes et chapiteau tombés,
// éboulis, mousse, lierre et fougères. Type de lieu ruines_alternative (DIRZ : l'axe de la nef suit rot).
// Variante 1 : version allégée, pour la vue lointaine.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import { pan, baieOgivale, colonne, tambour, escalier, eboulis, verdir, mousse, lierre, touffe, bloc, hexa, coinsBoite, gradins, teinte } from './forme.js';
import physique, {
  CONTRE, GIRON, NEF, DALLAGE, CHEVET, VITRAIL, FACADE, PORTAIL, COLONNES, ARCADE, CONTREFORTS, ESC, TAMBOURS, CHAPITEAU, EBOULIS, FOUGERES,
} from './physique.js';

// bannière : bleu ardoise, blason crème ; perche et pattes de bois ocre (palette de la planche)
const BLEU = '#3d6f90';
const BLEU_F = '#355f7c';
const BLASON = '#efe3c8';
const OCRE = '#cda066';
const OCRE_F = '#b38552';
const F = { tint: 0 };

// --- bannière ------------------------------------------------------------------------------
// toile de L × H pendue sous la perche (repère : axe de la perche à l'origine, toile dans le plan z),
// queue d'aronde en bas, plis légers ; blason (anneau, tige, deux paires de feuilles) sur les deux faces.
// Le balancement au vent (aSway, matériau des lieux) croît du haut vers le bas de la toile.
function toile(o, L, H) {
  const t = new Builder(nextId());
  const cols = o.leger ? 2 : 4;
  const rows = o.leger ? 3 : 6;
  const encoche = 0.36;
  const bas = (u) => H - encoche * (1 - Math.abs(2 * u - 1));
  const pli = (x, y) => 0.035 * Math.sin(((x + L / 2) / L) * Math.PI * 2 + (-y / H) * 1.5) * (0.3 - y / H);
  const pt = (u, v) => [-L / 2 + u * L, -0.08 - v * (bas(u) - 0.08)];
  // les deux faces (épaisseur 2,4 cm), en quadrillage qui suit les plis
  const face = (sens, couleur) => {
    const pos = [];
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, c]) => {
        const [x, y] = pt(a / cols, c / rows);
        return [x, y, pli(x, y) + sens * 0.012];
      });
      for (const k of sens > 0 ? [0, 3, 2, 0, 2, 1] : [0, 1, 2, 0, 2, 3]) pos.push(...q[k]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    t.add(g, couleur, F);
  };
  face(1, BLEU);
  face(-1, BLEU_F);
  // blason : triangles 2D posés sur les plis, de part et d'autre de la toile
  const cy = -H * 0.42;
  const tris = [];
  const seg = o.leger ? 8 : 12;
  const [r0, r1] = [0.17, 0.21];
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2;
    const a1 = ((k + 1) / seg) * Math.PI * 2;
    const p = (r, a) => [Math.cos(a) * r, cy + Math.sin(a) * r];
    tris.push([p(r0, a0), p(r1, a0), p(r1, a1)], [p(r0, a0), p(r1, a1), p(r0, a1)]);
  }
  // tige, du bas de l'anneau jusqu'au-dessus (tronçons pour suivre les plis)
  for (let k = 0; k < 4; k++) {
    const ya = cy - 0.42 + (0.72 * k) / 4;
    const yb = cy - 0.42 + (0.72 * (k + 1)) / 4;
    tris.push([[-0.022, ya], [0.022, ya], [0.022, yb]], [[-0.022, ya], [0.022, yb], [-0.022, yb]]);
  }
  // deux paires de feuilles lancéolées qui partent de la tige, une feuille au bout
  if (!o.leger) {
    for (const [y, dx, dy] of [[cy - 0.16, 0.27, 0.2], [cy + 0.02, 0.22, 0.2]]) {
      for (const s of [-1, 1]) {
        const a = [s * 0.015, y];
        const b = [s * dx, y + dy];
        const l = Math.hypot(dx, dy);
        const [nx, ny] = [(-dy / l) * 0.035, (dx / l) * 0.035];
        const m = [s * (dx * 0.5 + nx), y + dy * 0.5 + ny];
        const n = [s * (dx * 0.5 - nx), y + dy * 0.5 - ny];
        tris.push(s > 0 ? [a, n, b] : [a, b, n], s > 0 ? [a, b, m] : [a, m, b]);
      }
    }
    tris.push([[-0.05, cy + 0.3], [0.05, cy + 0.3], [0, cy + 0.44]], [[-0.05, cy + 0.3], [0, cy + 0.22], [0.05, cy + 0.3]]);
  }
  for (const sens of [1, -1]) {
    const pos = [];
    for (const tr of tris) {
      for (const k of sens > 0 ? [0, 1, 2] : [0, 2, 1]) {
        const [x, y] = tr[k];
        pos.push(x, y, pli(x, y) + sens * 0.02);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    t.add(g, BLASON, { id: t.defaultId, ...F });
  }
  // ourlet du haut, qui enserre la perche
  t.add(hexa(coinsBoite(L + 0.04, 0.12, 0.07, o.rand, { jit: 0.004 }), 0.02, o.leger), BLEU_F, { p: [0, -0.04, 0], ...F });
  const g = t.build();
  const sw = g.attributes.aSway.array;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) sw[i] = 2.2 * Math.min(1, Math.max(0, -pos.getY(i) / H));
  return g;
}

// perche de bois parallèle au mur (face en zMur), tenue par deux pattes scellées, bannière pendue
function banniere(b, o, { x0, x1, y, z, zMur, xb, L, H }) {
  b.add(G.cyl(0.05, 0.05, x1 - x0, o.leger ? 6 : 8), OCRE, { p: [(x0 + x1) / 2, y, z], r: [0, 0, Math.PI / 2], id: nextId(), ...F });
  const idPom = nextId();
  for (const x of [x0, x1]) b.add(hexa(coinsBoite(0.15, 0.15, 0.15, o.rand, { jit: 0.005 }), 0.05, true), OCRE_F, { p: [x, y, z], id: idPom, ...F });
  const lp = z - zMur + 0.12;
  for (const x of [x0 + 0.42, x1 - 0.2]) b.add(hexa(coinsBoite(0.09, 0.09, lp, o.rand, { jit: 0.005 }), 0.02, true), OCRE_F, { p: [x, y, z - lp / 2], id: nextId(), ...F });
  b.addBuilt(toile(o, L, H), { p: [xb, y, z] });
}

// chapiteau tombé : corbeille couchée sur le flanc et tailloir de travers, à côté
function chapiteauTombe(b, o, [x, z]) {
  const r = COLONNES.r;
  const prof = [[0, 0], [r * 0.95, 0], [r * 1.05, 0.08], [r * 1.3, 0.3], [r * 1.42, 0.4], [0, 0.4]];
  b.add(G.lathe(prof, o.leger ? 6 : 8), teinte(o), { p: [x, r * 1.3, z], r: [0, 0.7, Math.PI / 2], id: nextId(), ...F });
  bloc(b, o, { c: [x + 0.55, 0.1, z + 0.3], L: r * 3, H: 0.2, D: r * 3, r: [0.12, 0.4, 0.08], plat: true });
}

// --- assemblage ----------------------------------------------------------------------------
// sommet le plus haut à moins de 0,8 m de x (pour y faire partir un brin de lierre)
const pres = (sommets, x) => sommets.reduce((m, s, i) => (Math.abs((s.x0 + s.x1) / 2 - x) < 0.8 && (m < 0 || s.y > sommets[m].y) ? i : m), -1);
// sous-Builder posé de façon que son axe X suive Z (son +Z regarde vers −X)
const leLongDeZ = (b, sb, x) => b.addBuilt(sb.build(), { p: [x, 0, 0], r: [0, -Math.PI / 2, 0] });

export function ruinesAlternative(p) {
  const b = new Builder();
  const leger = p.v === 1;
  // un hasard par partie (une retouche de l'une ne déplace pas les pierres des autres)
  const h = (k) => ({ rand: mulberry32(1409 + 977 * k), leger });
  let o = h(0);

  // dallage d'une assise : deux bandes de grandes dalles traversantes (joint en long près de l'axe),
  // bordées de pavés sous les colonnes
  const dal = new Builder();
  const { x: dx, bord } = DALLAGE;
  for (const [xa, xb, lg] of [[-dx, bord - dx, [0.55, 0.8]], [bord - dx, 0.15, [1.6, 2.4]], [0.15, dx - bord, [1.6, 2.4]], [dx - bord, dx, [0.55, 0.8]]]) {
    pan(dal, o, { x0: DALLAGE.z0, x1: DALLAGE.z1, y0: 0, z: -(xa + xb) / 2, ep: xb - xa, assise: NEF, haut: () => NEF, longBas: lg, usure: false, e: 0.03, jit: 0.012 });
  }
  leLongDeZ(b, dal, 0);
  escalier(b, o, { ...ESC, c: CONTRE, g: GIRON });

  o = h(1);
  // chevet : pignon brisé, grande baie haute à meneau
  const vitrail = baieOgivale({ ...VITRAIL, z: CHEVET.z, ep: CHEVET.ep, n: 3, appui: true, meneau: true });
  const chevet = pan(b, o, {
    ...CHEVET, y0: 0, long: [2.0, 2.8], longBas: [0.9, 1.3], trous: [vitrail.trou],
    haut: gradins([[-3.0, 4.8], [-1.6, 6.8], [-0.4, 8.5], [0.9, 7.6], [2.3, 5.4], [9, 3.4]]),
  });
  vitrail.dessiner(b, o);
  // contrefort à degrés, plus haut contre le mur
  CONTREFORTS.forEach((c, i) => {
    const cb = new Builder();
    const s = pan(cb, h(10 + i), { x0: c.z0, x1: c.z1, y0: 0, z: 0, ep: c.ep, assise: 0.65, longBas: [0.7, 1.0], haut: gradins([[c.z0 + 0.45, 1.95], [9, 3.4]]) });
    verdir(cb, h(12 + i), s.sommets, { part: 0.7 });
    leLongDeZ(b, cb, c.x);
  });

  o = h(2);
  // façade d'entrée : moignons de part et d'autre du portail, dont il ne reste que la naissance gauche
  const portail = baieOgivale({ ...PORTAIL, z: FACADE.z, ep: FACADE.ep, n: 4, garde: [2, 0] });
  const facade = pan(b, o, {
    ...FACADE, y0: NEF, long: [1.5, 2.1], longBas: [0.7, 1.0], trous: [portail.trou],
    haut: gradins([[-2.6, 3.4], [-1.2, 5.1], [1.6, 0], [2.7, 2.6], [9, 1.7]]),
  });
  portail.dessiner(b, o);

  o = h(3);
  // colonnade : deux rangées de quatre colonnes, entières ou brisées
  const { X, Z, r, HAUT } = COLONNES;
  const tetes = [];
  for (const [sx, hauteurs] of [[-1, COLONNES.gauche], [1, COLONNES.droite]]) {
    Z.forEach((z, i) => tetes.push(colonne(b, o, { x: sx * X, y0: NEF, z, h: hauteurs[i], r, brisee: hauteurs[i] < HAUT })));
  }

  o = h(4);
  // arcade sur les trois premières colonnes de gauche (axe X du sous-Builder = Z du modèle)
  const ab = new Builder();
  const arcs = ARCADE.arcs.map((xc) => baieOgivale({ xc, yb: ARCADE.y0, ys: ARCADE.y0, w: ARCADE.w, R: ARCADE.R, t: ARCADE.t, z: 0, ep: ARCADE.ep, n: 3 }));
  const arcade = pan(ab, o, {
    x0: Z[2] - r * 1.5, x1: Z[0] + r * 1.5, y0: ARCADE.y0, z: 0, ep: ARCADE.ep, assise: ARCADE.assise, long: [1.3, 1.8], trous: arcs.map((a) => a.trou),
    haut: gradins([[-1.6, 6.6], [0.4, 7.5], [9, 6.9]]),
  });
  for (const a of arcs) a.dessiner(ab, o);
  // mousse sur l'arcade, lierre qui retombe le long des colonnes (dehors : +Z, côté nef : −Z)
  const as = arcade.sommets;
  verdir(ab, h(5), as, { part: 0.6, bas: NEF, brins: [
    { i: pres(as, Z[1]), longueur: 3.6, taille: 0.36 }, { i: pres(as, Z[0]), longueur: 2.6, taille: 0.34, dz: -1 },
    { i: pres(as, Z[2]), longueur: 1.8, taille: 0.32, dz: -1 },
  ] });
  leLongDeZ(b, ab, -X);

  o = h(6);
  // tambours et chapiteau tombés, éboulis
  for (const [x, y0, z, L, cap] of TAMBOURS) tambour(b, o, { x, y0, z, r, L, cap });
  chapiteauTombe(b, o, CHAPITEAU);
  eboulis(b, o, EBOULIS);

  o = h(7);
  // mousse sur les sommets, lierre qui retombe (jamais dans la nef ni dans le portail)
  const cs = chevet.sommets;
  verdir(b, o, cs, { part: 0.4, brins: [
    { i: pres(cs, -1.6), longueur: 5.0, taille: 0.42 }, { i: pres(cs, 1.5), longueur: 3.6, taille: 0.4 },
    { i: pres(cs, 2.9), longueur: 2.6, taille: 0.36 }, { i: pres(cs, -2.8), longueur: 3.2, taille: 0.38, dz: -1 },
    { i: pres(cs, 0.3), longueur: 2.4, taille: 0.4, dz: -1 },
  ] });
  const fs = facade.sommets;
  verdir(b, o, fs, { part: 0.55, brins: [{ i: pres(fs, -2.0), longueur: 3.6, taille: 0.38 }, { i: pres(fs, 2.4), longueur: 1.8, taille: 0.34 }] });
  for (const s of tetes) if (o.rand() < 0.35) mousse(b, o, s, { coulure: false });
  // lierre sur la colonne entière isolée à l'avant droit, mousse au bord du dallage
  lierre(b, o, { x: X, y: NEF + HAUT, z: Z[0] + r + 0.04, longueur: 3.0, taille: 0.34, bas: NEF });
  for (const [sx, z] of [[-1, 3.1], [1, -4.2]]) {
    mousse(b, o, { x0: sx * 3.0 - 0.3, x1: sx * 3.0 + 0.3, y: NEF - 0.02, z, D: 0.55 }, { coulure: false });
  }
  // fougères : sur la bordure du dallage, dans les éboulis
  for (const [x, y, z, taille] of FOUGERES) touffe(b, o, { x, y, z, taille });

  o = h(8);
  // bannière au chevet, côté nef, à gauche de la baie (vue depuis l'entrée, dans l'axe)
  const zMur = CHEVET.z + CHEVET.ep / 2;
  banniere(b, o, { x0: -3.15, x1: -1.55, y: 5.75, z: zMur + 0.15, zMur, xb: -2.35, L: 0.8, H: 2.0 });

  return { solid: b, obstacles: lire(physique.obstacles, p), decks: lire(physique.planchers, p) };
}

export default fiche('MON-014', 'ruines-alternative', 'Nef effondrée du plateau', part('ruines_alternative'), {
  variants: [{ label: 'De près', params: { v: 0 } }, { label: 'Allégé (au loin)', params: { v: 1 } }],
  // budget propre, accord de l'utilisateur le 26/10/2026 (ruine alternative) : 8 000 de près, 4 000 allégé
  budget: { triangles: 8000, lod: 4000 },
  tags: ['plateau'],
});
