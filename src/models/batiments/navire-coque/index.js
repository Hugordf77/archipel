// Coque et berceau du navire-forteresse (BAT-014), première pièce de la forteresse-navire du Plateau venté
// (docs/forteresse-navire/memory.md §6.1), d'après la référence de l'utilisateur (reference.png) : longue
// coque ventrue de 64 m échouée sur des piliers de rocher moussus. Bordages en bandes de bois brun chaud
// qui suivent les lignes de la coque, quille, étrave ; pavois coiffé d'une lisse de mousse qui déborde et
// retombe en coulures, ouvert sur le flanc +X à l'arrivée de l'escalier ; pont de planches avec sa tonture,
// château de poupe (+3 m) et gaillard d'avant (+2 m) à façades et rambardes ; tableau de poupe à deux
// rangées de fenêtres et galerie en encorbellement ; plaques de cuivre bombées et rivetées (deux sur +X, une
// sur −X), hublots cerclés ; beaupré à cordages, échelle de corde et nacelle. Rien n'est posé sur le pont
// (maisons, tours et mâts sont d'autres pièces). Repère du navire : +Z vers la proue, +X flanc de
// l'escalier. Variante 1 : version allégée, pour la vue lointaine.
import * as THREE from 'three';
import { Builder, G } from '../../../render/builder.js';
import { nextId } from '../../../core/globals.js';
import { mulberry32 } from '../../../core/random.js';
import { lire, seg } from '../../kit/lieux.js';
import { fiche, part } from '../../kit/fiches.js';
import physique, { station, demiSection, demiLargeur, pont, pontPrincipal, lisse, CHATEAU, GAILLARD, POUPE, PROUE, BORDE, OUVERTURE, TRONCONS, PAVOIS, POINTE } from './physique.js';
import {
  loft, plaqueBombee, hublot, rivets, tris, prisme, rect, oc, barre, panDeBois, poser, bloc, mousse, touffe, hexa, coinsBoite,
  BORDAGE, BORDAGE_F, PONT, CUIVRE, CUIVRE_F, POUTRE, POUTRE_F, ENDUIT, VITRE, MOUSSE, MOUSSE_C, MOUSSE_ROC, MOUSSE_ROC_F, CORDAGE, BOIS_TOIT,
} from './forme.js';

const F = { tint: 0 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// stations du loft : plus serrées vers la proue ; −7,4 et −4,6 bordent l'ouverture du pavois (escalier)
const Z_COQUE = [-32, -29.5, -27, -24, -21, -18, -14.5, -11, -7.4, -6, -4.6, -1.5, 2, 5.5, 9, 12.5, 16, 19, 22, 24.5, 26.5, 28.3, 29.8, 31, 31.7, 32];
const Z_LEGER = [-32, -26, -20, -12, -7.4, -4.6, 4, 12, 20, 25, 28.5, 31, 32];

// --- appui sur la coque ------------------------------------------------------------------------
// point et normale extérieure du flanc s (±1) à (z, y)
function surCoque(s, z, y) {
  const X = (zz, yy) => demiLargeur(station(zz), yy);
  const e = 0.05;
  const dy = (X(z, y + e) - X(z, y - e)) / (2 * e);
  const dz = (X(z + e, y) - X(z - e, y)) / (2 * e);
  return { p: V(s * X(z, y), y, z), n: V(s, -dy, -dz).normalize() };
}
// géométrie dessinée dans le plan z = 0 (u le long de la coque, v vers le haut, w vers l'extérieur) épousant
// le flanc s autour de (zc, yc) ; u va vers −Z sur +X et vers +Z sur −X (repère direct, faces dehors)
function epouser(geo, s, zc, yc, w0 = 0) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const { p, n } = surCoque(s, zc - s * pos.getX(i), yc + pos.getY(i));
    const w = pos.getZ(i) + w0;
    pos.setXYZ(i, p.x + n.x * w, p.y + n.y * w, p.z + n.z * w);
  }
  geo.computeVertexNormals();
  return geo;
}
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const AXE_Z = V(0, 0, 1);
const versNormale = (n) => {
  _e.setFromQuaternion(_q.setFromUnitVectors(AXE_Z, n));
  return [_e.x, _e.y, _e.z];
};

// --- coque -----------------------------------------------------------------------------------------
// loft de la quille au haut de la coque : section de −X (haut) à +X (haut) par le fond ; une bande de
// couleur par rangée (bordages de ≈ 1 m qui suivent les lignes), rangée du milieu : fond plat de la quille
function bordages(b, o) {
  const nDemi = o.leger ? 8 : 20;
  const n = 2 * nDemi + 1;
  const section = (st, t) => {
    const i = Math.round(t * n);
    if (i <= nDemi) {
      const [x, y] = demiSection(st, (Math.PI / 2) * (1 - i / nDemi));
      return [-x, y];
    }
    return demiSection(st, (Math.PI / 2) * ((i - nDemi - 1) / nDemi));
  };
  const zs = o.leger ? Z_LEGER : Z_COQUE;
  loft(zs.map(station), n, section, { bandes: 1 }).forEach((g, i) => {
    const col = i === nDemi ? POUTRE_F : (i % 2 ? BORDAGE_F : BORDAGE);
    b.add(g, col, { id: o.idCoque, ...F });
  });
  // tableau de poupe : plan à z = POUPE, de la quille au haut du pavois (éventail depuis le centre)
  const st = station(POUPE);
  const T = lisse(POUPE);
  const bord = [[-(st.W + 0.08), T]];
  for (let i = 0; i <= n; i++) bord.push(section(st, i / n));
  bord.push([st.W + 0.08, T]);
  const c = V(0, (st.K + T) / 2, POUPE);
  const L = [];
  for (let i = 0; i + 1 < bord.length; i++) L.push([c, V(bord[i][0], bord[i][1], POUPE), V(bord[i + 1][0], bord[i + 1][1], POUPE), V(0, 0, -1)]);
  L.push([c, V(bord[bord.length - 1][0], T, POUPE), V(bord[0][0], T, POUPE), V(0, 0, -1)]);
  b.add(tris(L), BORDAGE_F, { id: o.idCoque, ...F });
  // étrave : poutre qui suit le profil de la proue, de la quille au-dessus de la lisse
  const K = (z) => station(z).K;
  const avant = [[25, K(25) - 0.1], [27.5, K(27.5) - 0.1], [29.5, K(29.5) - 0.12], [31, K(31) - 0.12], [32.2, K(32)], [32.35, (K(32) + station(32).H) / 2], [32.4, station(32).H], [32.45, lisse(PROUE) + 0.45]];
  for (let i = 0; i + 1 < avant.length; i++) {
    const [za, ya] = avant[i];
    const [zb, yb] = avant[i + 1];
    barre(b, POUTRE_F, [0, ya, za], [0, yb, zb], oc(o, 0.95, 0.55, 0.12), { id: o.idBois });
  }
}

// --- pavois, lisse de mousse, coulures -----------------------------------------------------------------
// un pavois par tronçon (château, pont principal, gaillard), de la tonture du pont principal à sa lisse ;
// poteaux aux ressauts et à l'ouverture de l'escalier
function pavois(b, o) {
  const zs = o.leger ? Z_LEGER : Z_COQUE;
  const dans = (z0, z1) => [z0, ...zs.filter((z) => z > z0 + 0.2 && z < z1 - 0.2), z1];
  // lisse en coussin : dessus presque plat (0,19 à 0,22 m) sur un demi-mètre, où porte son plancher
  const P = o.leger
    ? [[-BORDE - 0.02, -0.05], [-0.1, 0.2], [0.45, 0.1], [0.5, -0.3]]
    : [[-BORDE - 0.02, -0.05], [-BORDE + 0.04, 0.19], [-0.05, 0.22], [0.25, 0.2], [0.48, 0.0], [0.46, -0.32]];
  for (const s of [-1, 1]) {
    for (const [z0, z1, h] of TRONCONS) {
      // le flanc +X s'ouvre entre OUVERTURE[0] et OUVERTURE[1] (arrivée de l'escalier)
      const morceaux = s > 0 && !h ? [[z0, OUVERTURE[0]], [OUVERTURE[1], z1]] : [[z0, z1]];
      for (const [za, zb] of morceaux) {
        const sts = dans(za, zb).map((z) => ({ ...station(z), T: pontPrincipal(z) + h + PAVOIS }));
        // face extérieure, en bordages d'environ 1 m (léger fruit vers l'extérieur)
        const rangs = Math.max(1, Math.round((h + PAVOIS) / 0.95));
        loft(sts, rangs, (st, t) => [s * (st.W + 0.08 * t), st.H + (st.T - st.H) * t], { bandes: 1, inverser: s < 0 })
          .forEach((g, i) => b.add(g, i % 2 ? BORDAGE_F : BORDAGE, { id: o.idCoque, ...F }));
        // face intérieure (du pont principal à la lisse ; cachée sous le château et le gaillard)
        b.add(loft(sts, 1, (st, t) => [s * (st.W - BORDE + 0.08 * t), t ? st.T : st.H - 0.05], { inverser: s > 0 })[0], BORDAGE_F, { id: o.idCoque, ...F });
        // lisse de mousse : du bord intérieur, par-dessus, jusqu'à la retombée extérieure
        const cap = (st, t) => {
          const [dx, dy] = P[Math.round(t * (P.length - 1))];
          return [s * (st.W + 0.08 + dx), st.T + dy];
        };
        loft(sts, P.length - 1, cap, { bandes: 1, inverser: s > 0 }).forEach((g, i) => b.add(g, i % 2 ? MOUSSE_C : MOUSSE, { id: o.idToit, ...F }));
      }
    }
    // poteaux : aux deux ressauts (du pont principal au-dessus de la lisse haute) et à l'ouverture
    for (const z of [CHATEAU, GAILLARD]) {
      const y1 = Math.max(lisse(z - 0.01), lisse(z + 0.01)) + 0.5;
      const y0 = pontPrincipal(z) - 0.05;
      b.add(prisme(oc(o, 0.5, 0.5, 0.1), y1 - y0), POUTRE_F, { p: [s * (station(z).W - 0.1), (y0 + y1) / 2, z], id: o.idBois, ...F });
    }
    if (o.leger) continue;
    // coulures de mousse sous la lisse, hors de l'ouverture et des bouts effilés (où la coque rentre, elles
    // s'en écarteraient)
    for (let z = -26; z < 20; z += 3 + o.rand() * 1.4) {
      if (s > 0 && z > OUVERTURE[0] - 0.6 && z < OUVERTURE[1] + 0.6) continue;
      const st = station(z);
      const lg = 0.5 + o.rand() * 0.9;
      const larg = 0.3 + o.rand() * 0.25;
      const coul = [MOUSSE, MOUSSE_C, MOUSSE_ROC][Math.floor(o.rand() * 3)];
      b.add(hexa(coinsBoite(0.12, lg, larg, o.rand, { jit: 0.03, retrait: -0.15 }), 0, true), coul, { p: [s * (st.W + 0.58), lisse(z) - 0.25 - lg / 2, z], id: o.idToit, ...F });
    }
  }
  // poteaux qui bordent l'ouverture du pavois (au-dessus de la crête de mousse)
  for (const z of OUVERTURE) {
    const y0 = pontPrincipal(z) - 0.05;
    const y1 = lisse(z) + 0.5;
    b.add(prisme(oc(o, 0.36, 0.36, 0.08), y1 - y0), POUTRE_F, { p: [station(z).W - 0.1, (y0 + y1) / 2, z], id: o.idBois, ...F });
  }
}

// --- ponts, façades des ressauts, rambardes ------------------------------------------------------------
// rambarde de A à B (points [x, z]) au niveau y : poteaux, lisse haute (et basse de près) à 1,27 m, au ras
// du dessus des lisses de mousse voisines, plus haut que le saut du joueur (son plancher : y + 1,3,
// RAMBARDE de physique.js)
function rambarde(b, o, A, B, y) {
  const lg = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const n = Math.max(2, Math.round(lg / (o.leger ? 3 : 1.5)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    b.add(prisme(rect(0.12, 0.12), 1.29), POUTRE_F, { p: [A[0] + (B[0] - A[0]) * t, y + 0.645, A[1] + (B[1] - A[1]) * t], id: o.idBois, ...F });
  }
  for (const yy of o.leger ? [1.27] : [0.6, 1.27]) barre(b, POUTRE, [A[0], y + yy, A[1]], [B[0], y + yy, B[1]], oc(o, 0.1, 0.12, 0.03), { id: o.idBois });
}
const demiPont = (z, y) => demiLargeur(station(z), Math.min(y, station(z).H)) - BORDE;
function ponts(b, o) {
  const zs = o.leger ? Z_LEGER : Z_COQUE;
  // planches de ≈ 0,8 m de près (le pont se voit à moins de 3 m entre les maisons), 4 au loin
  const n = o.leger ? 4 : 22;
  const plancher = (z0, z1, haut) => {
    const m = [z0, ...zs.filter((z) => z > z0 + 0.2 && z < z1 - 0.2), z1];
    const sts = m.map((z) => ({ z, y: haut(z), x: demiPont(z, haut(z)) }));
    loft(sts, n, (st, t) => [-st.x + 2 * st.x * t, st.y], { bandes: 1, inverser: true }).forEach((g, i) => b.add(g, i % 2 ? BORDAGE : PONT, { id: o.idPont, ...F }));
  };
  plancher(POUPE, CHATEAU, (z) => pontPrincipal(z) + 3);
  plancher(CHATEAU, GAILLARD, pontPrincipal);
  plancher(GAILLARD, PROUE, (z) => pontPrincipal(z) + 2);
  // façade du château de poupe (z = CHATEAU, vers +Z) : enduit, pans de bois, porte et quatre fenêtres
  const yc0 = pontPrincipal(CHATEAU);
  const yc1 = yc0 + 3;
  const xc = demiPont(CHATEAU, yc0);
  b.add(prisme(rect(2 * xc, 0.3), 3), ENDUIT, { p: [0, yc0 + 1.5, CHATEAU - 0.15], id: o.idMur, ...F });
  const fc = new Builder(o.idBois);
  const fen = (x) => ({ x, w: 0.9, h: 0.95, yc: yc0 + 1.65 });
  panDeBois(fc, 2 * xc, yc0, yc1, [fen(-5.6), fen(-2.8), { x: 0, w: 1.2, h: 2.15, yb: yc0 - 0.03, porte: true }, fen(2.8), fen(5.6)], o);
  poser(b, fc, 0, 0, CHATEAU);
  rambarde(b, o, [-xc + 0.15, CHATEAU - 0.1], [xc - 0.15, CHATEAU - 0.1], yc1);
  // façade du gaillard d'avant (z = GAILLARD, vers −Z) : bordages, petite porte, deux fenêtres
  const yg0 = pontPrincipal(GAILLARD);
  const yg1 = yg0 + 2;
  const xg = demiPont(GAILLARD, yg0);
  b.add(prisme(rect(2 * xg, 0.3), 2), BORDAGE_F, { p: [0, yg0 + 1, GAILLARD + 0.15], id: o.idCoque, ...F });
  const fg = new Builder(o.idBois);
  panDeBois(fg, 2 * xg, yg0, yg1, [{ x: -3, w: 0.6, h: 0.6, yc: yg0 + 1.2 }, { x: 0, w: 1.0, h: 1.65, yb: yg0 - 0.03, porte: true }, { x: 3, w: 0.6, h: 0.6, yc: yg0 + 1.2 }], o);
  poser(b, fg, Math.PI, 0, GAILLARD);
  rambarde(b, o, [-xg + 0.15, GAILLARD + 0.1], [xg - 0.15, GAILLARD + 0.1], yg1);
  // rambarde de la pointe : au-delà, la proue effilée n'est pas un pont
  const xp = demiPont(POINTE, yg1);
  rambarde(b, o, [-xp + 0.1, POINTE], [xp - 0.1, POINTE], pontPrincipal(POINTE) + 2);
}

// --- poupe : fenêtres du tableau, galerie en encorbellement, pavois du château --------------------------
const GALERIE = { y: 19.6, demi: 4.4, prof: 1.3 };
// fenêtre seule sur une face (cadre, vitre, croisillon, poteaux) centrée en x
function panFenetre(f, x, yc, w, h, o) {
  const g = new Builder(o.idBois);
  panDeBois(g, w + 0.4, yc - h / 2 - 0.15, yc + h / 2 + 0.15, [{ x: 0, w, h, yc }], { ...o, sens: 0 });
  f.addBuilt(g.build(), { p: [x, 0, 0] });
}
function poupe(b, o) {
  const { y, demi, prof } = GALERIE;
  const zb = POUPE - prof;
  // plancher, consoles, balustrade sur trois côtés
  b.add(prisme(oc(o, 2 * demi, prof + 0.05, 0.06), 0.2), POUTRE_F, { p: [0, y - 0.1, POUPE - (prof - 0.05) / 2], id: o.idBois, ...F });
  for (const x of o.leger ? [-3, 3] : [-3.6, -1.2, 1.2, 3.6]) barre(b, POUTRE_F, [x, y - 1.5, POUPE - 0.05], [x, y - 0.2, zb + 0.15], rect(0.16, 0.16), { id: o.idBois });
  rambarde(b, o, [-demi + 0.06, zb + 0.06], [demi - 0.06, zb + 0.06], y);
  for (const s of [-1, 1]) rambarde(b, o, [s * (demi - 0.06), zb + 0.06], [s * (demi - 0.06), POUPE - 0.1], y);
  // tableau : rangée basse de quatre fenêtres, porte et deux fenêtres sur la galerie
  const f = new Builder(o.idBois);
  for (const x of [-3, -1, 1, 3]) panFenetre(f, x, 15.6, 0.8, 1.1, o);
  for (const x of [-2.4, 2.4]) panFenetre(f, x, y + 1.0, 0.9, 1.2, o);
  panDeBois(f, 2.2, y, y + 2.2, [{ x: 0, w: 1.0, h: 1.85, yb: y + 0.02, porte: true }], { ...o, leger: true });
  poser(b, f, Math.PI, 0, POUPE);
  // dos du pavois de poupe, vu du château (le tableau ne se voit que de l'arrière), et sa mousse
  const st = station(POUPE);
  const yp = pont(POUPE);
  b.add(prisme(rect(2 * (st.W - BORDE), 0.06), lisse(POUPE) - yp), BORDAGE_F, { p: [0, (lisse(POUPE) + yp) / 2, POUPE + BORDE - 0.03], id: o.idCoque, ...F });
  b.add(prisme(oc(o, 0.5, 0.4, 0.12), 2 * st.W + 0.4).clone().rotateZ(Math.PI / 2), MOUSSE, { p: [0, lisse(POUPE) + 0.12, POUPE + 0.12], id: o.idToit, ...F });
}

// --- cuivres : plaques bombées rivetées, hublots ----------------------------------------------------
// plaques : flanc, centre (z, y), taille L × H, flèche
const PLAQUES = [[1, 12.5, 10.4, 9, 5, 0.5], [1, 8.2, 14.9, 7, 4, 0.42], [-1, 9.5, 12.8, 8, 4.5, 0.45]];
const HUBLOTS = [-22, -16, -10, -4, 2, 8, 14, 19];
const Y_HUBLOT = 17.6;
function cuivres(b, o) {
  for (const [s, zc, yc, L, H, f] of PLAQUES) {
    const id = nextId();
    b.add(epouser(plaqueBombee(L, H, f, o.leger ? 10 : 16), s, zc, yc), CUIVRE, { id, ...F });
    // liseré de rivets près du bord
    const n = Math.round((L + H) * 0.6);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const u = Math.cos(a) * (L / 2) * 0.86;
      const v = Math.sin(a) * (H / 2) * 0.86;
      const { p, n: nn } = surCoque(s, zc - s * u, yc + v);
      const w = f * (1 - 0.86 * 0.86) + 0.03;
      pts.push([p.x + nn.x * w, p.y + nn.y * w, p.z + nn.z * w]);
    }
    rivets(b, o, pts, { t: 0.13, id });
  }
  const r = 0.42;
  for (const s of [-1, 1]) {
    for (const z of HUBLOTS) {
      const { p, n } = surCoque(s, z, Y_HUBLOT);
      const rot = versNormale(n);
      const vitre = p.clone().addScaledVector(n, o.leger ? 0.04 : 0.03);
      if (!o.leger) b.add(hublot(r, 8, true), CUIVRE_F, { p: p.toArray(), r: rot, id: o.idCuivre, ...F });
      b.add(new THREE.CircleGeometry(o.leger ? r + 0.12 : r + 0.01, 8), o.leger ? CUIVRE_F : VITRE, { p: vitre.toArray(), r: rot, id: o.idMur, ...F });
    }
  }
}

// --- beaupré, cordages, échelle de corde, nacelle ----------------------------------------------------
// le beaupré naît dans sa bitte, poteau planté dans le gaillard au-delà de la rambarde de la pointe (hors
// des planchers) qui monte au-dessus de la poutre et en cache le pied
const BEAUPRE = { a: [0, 24.08, 29.0], b: [0, 28.8, 42.0] };
function beaupre(b, o) {
  const [ax, ay, az] = BEAUPRE.a;
  const [bx, by, bz] = BEAUPRE.b;
  const yb = pont(az) - 0.05;
  b.add(prisme(oc(o, 0.7, 0.6, 0.1), ay + 0.5 - yb), POUTRE_F, { p: [0, (ay + 0.5 + yb) / 2, az], id: o.idBois, ...F });
  seg(b, POUTRE_F, ax, ay, az, bx, by, bz, 0.36, 0.2, o.leger ? 6 : 8, { id: o.idBois, ...F });
  b.add(G.sphere(0.26, 10, 8), BOIS_TOIT, { p: [bx, by, bz], id: o.idBois, ...F });
  const le = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t];
  const corde = (A, B, r = 0.045) => seg(b, CORDAGE, ...A, ...B, r, r, o.leger ? 4 : 5, { id: o.idCorde, ...F });
  // sous-barbe vers l'étrave, haubans vers les flancs du gaillard
  corde(le(0.97), [0, 14.5, 32.4]);
  for (const s of [-1, 1]) corde(le(0.97), [s * 2.3, lisse(29) + 0.1, 29]);
  // cordage pendu qui porte la nacelle (petite corbeille tournée) ; un autre qui pend librement
  const pn = le(0.8);
  const yn = 3.0;
  corde(pn, [pn[0], yn + 1.6, pn[2]]);
  if (!o.leger) corde(le(0.62), [0.1, 9.5, le(0.62)[2] + 0.2], 0.04);
  const prof = [[0.08, 0], [0.45, 0.04], [0.55, 0.5], [0.6, 0.66], [0.52, 0.7]];
  b.add(G.lathe(prof, o.leger ? 6 : 10), BOIS_TOIT, { p: [pn[0], yn, pn[2]], id: o.idCorde, ...F });
  for (const a of [0, Math.PI]) corde([pn[0] + Math.cos(a) * 0.52, yn + 0.68, pn[2] + Math.sin(a) * 0.52], [pn[0], yn + 1.6, pn[2]], 0.03);
  // échelle de corde : deux montants, barreaux tous les 0,7 m (de près)
  const pe = le(0.42);
  const y0 = 2.3;
  for (const s of [-1, 1]) corde([s * 0.24, pe[1] - 0.1, pe[2]], [s * 0.24, y0, pe[2] + 0.35], 0.035);
  if (o.leger) return;
  for (let y = y0 + 0.2; y < pe[1] - 0.4; y += 0.7) {
    const t = (y - y0) / (pe[1] - 0.1 - y0);
    b.add(prisme(rect(0.06, 0.06), 0.5).clone().rotateZ(Math.PI / 2), POUTRE, { p: [0, y, pe[2] + 0.35 * (1 - t)], id: o.idCorde, ...F });
  }
}

// --- berceau : piliers de rocher moussus, rochers à demi enterrés, fougères ---------------------------
// piliers : z, décalage x, cap ; tous sous la quille, donc sous les planchers du pont (physique.js)
const PILIERS = [[-25, 0.3, 0.2], [-15, -0.4, -0.3], [-5, 0.2, 0.25], [5, -0.3, -0.2], [15, 0.4, 0.3], [24, 0, -0.1]];
const ROCHERS = [[-20.5, -3.0], [-10, 3.2], [0.2, -3.0], [10, 3.0], [19.5, -2.4], [-29, 1.2]];
// roche du berceau, plus chaude et plus sombre que la pierre taillée de MON-014 (toujours à l'ombre de la
// coque, la pierre crème y vire au lavande)
const ROCHE = ['#b8a07e', '#a8916f', '#b09a78'];
// rocher : bloc très déformé (jit, casse, retrait) aux arêtes largement abattues (chanfrein ≈ 1/4 de la
// plus petite dimension), teinte de ROCHE
function rocher(b, o, { c, L, H, D, r }) {
  const m = Math.min(L, H, D);
  bloc(b, o, { c, L, H, D, r, couleur: ROCHE[Math.floor(o.rand() * ROCHE.length)], jit: m * 0.2, casse: m * 0.18, retrait: 0.12, plat: true, e: m * 0.25 });
}
// coulure de mousse sur la face d'un rocher (centre c, normale horizontale d'angle a) : coussin chanfreiné
// qui s'effile vers le bas, enfoncé dans la roche (demi : un peu moins que la demi-largeur du rocher)
function coulure(b, o, c, a, demi) {
  const lg = 0.9 + o.rand() * 0.9;
  const [dx, dz] = [Math.cos(a), -Math.sin(a)];
  b.add(hexa(coinsBoite(0.3, lg, 0.7 + o.rand() * 0.5, o.rand, { jit: 0.04, retrait: -0.35 }), 0.06), o.rand() < 0.5 ? MOUSSE_ROC : MOUSSE_ROC_F, { p: [c[0] + dx * demi, c[1] - lg * 0.3, c[2] + dz * demi], r: [0, a, 0], id: o.idToit, ...F });
}
function berceau(b, o) {
  const r = () => o.rand() - 0.5;
  for (const [z, x, cap] of PILIERS) {
    const haut = station(z).K + 0.25;
    // pied : deux gros rochers à demi enterrés, de part et d'autre du fût, coussin de mousse dessus
    for (const s of [-1, 1]) {
      const [L, H, D] = [4.6 + o.rand() * 1.2, 2.0 + o.rand() * 0.6, 3.6 + o.rand() * 1.0];
      const [px, pz] = [x + s * 1.5, z + s * 0.7 + r() * 0.8];
      rocher(b, o, { c: [px, H / 2 - 0.55, pz], L, H, D, r: [r() * 0.1, cap + s * 0.35, r() * 0.1] });
      mousse(b, o, { x0: px - L * 0.35, x1: px + L * 0.35, y: H - 0.65, z: pz, D: D * 0.75 });
    }
    // fût : rochers empilés qui s'affinent jusque dans la quille, de plus en plus décalés et tournés
    const y0 = 1.2;
    const nb = Math.max(2, Math.ceil((haut - y0) / 1.8));
    const hb = (haut - y0) / nb;
    const [ox, oz] = [r(), r()];
    for (let k = 0; k < nb; k++) {
      const w = 3.9 - k * 0.35 + o.rand() * 0.4;
      const c = [x + ox * 0.35 * k + r() * 0.2, y0 + hb * (k + 0.5), z + oz * 0.35 * k + r() * 0.2];
      const a = cap + r();
      rocher(b, o, { c, L: w, H: hb + 0.2, D: w * (0.82 + o.rand() * 0.15), r: [r() * 0.08, a, r() * 0.08] });
      // mousse qui coule du premier ressaut sur les flancs visibles du dehors (±X)
      if (k === 0) for (const s of [-1, 1]) coulure(b, o, [c[0], c[1] + hb * 0.45, c[2]], s > 0 ? a : a + Math.PI, w * 0.4);
    }
    for (const s of [-1, 1]) touffe(b, o, { x: x + s * (3.2 + o.rand() * 0.6), y: 0.05, z: z + r() * 2, taille: 0.8 + o.rand() * 0.35 });
  }
  for (const [z, x] of ROCHERS) {
    const [L, H, D] = [2.6 + o.rand() * 1.0, 1.3 + o.rand() * 0.6, 2.2 + o.rand() * 0.8];
    rocher(b, o, { c: [x, H / 2 - 0.35, z], L, H, D, r: [r() * 0.2, o.rand() * 3, r() * 0.2] });
    if (o.rand() < 0.6) mousse(b, o, { x0: x - L * 0.3, x1: x + L * 0.3, y: H - 0.45, z, D: D * 0.7 });
    if (o.rand() < 0.5) touffe(b, o, { x: x + Math.sign(x) * (L * 0.5 + 0.3), y: 0.05, z: z + r(), taille: 0.6 });
  }
}

// --- assemblage -------------------------------------------------------------------------------------
export function navireCoque(p) {
  const b = new Builder();
  const leger = p.v === 1;
  const ids = { idMur: b.defaultId, idCoque: nextId(), idPont: nextId(), idBois: nextId(), idToit: nextId(), idCuivre: nextId(), idCorde: nextId() };
  // un hasard par partie (une retouche de l'une ne déplace pas les autres)
  const h = (k) => ({ rand: mulberry32(2014 + 977 * k), leger, ...ids });
  bordages(b, h(0));
  pavois(b, h(1));
  ponts(b, h(2));
  poupe(b, h(3));
  cuivres(b, h(4));
  beaupre(b, h(5));
  berceau(b, h(6));
  return { solid: b, obstacles: lire(physique.obstacles, p), decks: lire(physique.planchers, p) };
}

export default fiche('BAT-014', 'navire-coque', 'Coque et berceau du navire-forteresse', part('navire_coque'), {
  variants: [{ label: 'De près', params: { v: 0 } }, { label: 'Allégé (au loin)', params: { v: 1 } }],
  // budget accordé par l'utilisateur le 26/10/2026 (forteresse-navire, ≈ 60 000 en pièces) : 12 000 de
  // près, 5 000 allégé
  budget: { triangles: 12000, lod: 5000 },
  tags: ['plateau', 'forteresse'],
});
