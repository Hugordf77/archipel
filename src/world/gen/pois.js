// Passe 3 — points d'intérêt : gabarits paramétriques avec règles de placement
// (emprise, pente, altitude, côte, rivière, sommet, terrain plat), disposition des
// villages, recettes par archétype, petites découvertes partout, puis aplanissement.
import { mulberry32, weighted } from '../random.js';
import { bilinear, stableId, smooth } from './grid.js';
import { Z } from './zones.js';

export const POI_TYPES = [
  'village', 'moulin_vent', 'moulin_eau', 'epave', 'epave_geante', 'barque_echouee', 'cimetiere_bateaux', 'phare',
  'tour_guet', 'ruines', 'temple', 'cercle_pierres', 'arche', 'grotte', 'cabane_ermite', 'campement', 'rucher',
  'arche_fleurie', 'verger', 'puits_isole', 'pont_corde', 'cascade', 'sources_chaudes', 'observatoire', 'statue',
  'arbre_geant', 'rocher_baleine', 'oasis', 'ruines_ensablees', 'bateau_dunes', 'recif', 'epave_immergee', 'decouverte',
  'belvedere',
];
const TYPE_ID = Object.fromEntries(POI_TYPES.map((t, i) => [t, i]));

export const POI_LABELS = {
  village: 'Village', moulin_vent: 'Moulin à vent', moulin_eau: 'Moulin à eau', epave: 'Épave', epave_geante: 'Grande épave',
  barque_echouee: 'Barque échouée', cimetiere_bateaux: 'Cimetière de bateaux', phare: 'Phare', tour_guet: 'Tour de guet',
  ruines: 'Ruines', temple: 'Temple', cercle_pierres: 'Cercle de pierres', arche: 'Arche de pierre', grotte: 'Grotte marine',
  cabane_ermite: 'Cabane de l\'ermite', campement: 'Campement', rucher: 'Ruchers', arche_fleurie: 'Arche fleurie',
  verger: 'Verger', puits_isole: 'Vieux puits', pont_corde: 'Pont de corde', cascade: 'Cascade', sources_chaudes: 'Sources chaudes',
  observatoire: 'Observatoire', statue: 'Statue géante', arbre_geant: 'Arbre géant', rocher_baleine: 'Rocher de la Baleine',
  oasis: 'Oasis', ruines_ensablees: 'Ruines ensablées', bateau_dunes: 'Bateau des dunes', recif: 'Récif', epave_immergee: 'Épave engloutie',
  belvedere: 'Belvédère',
};

// recettes : [type, probabilité] ; probabilité 1 = obligatoire
const RECIPES = {
  montagne: [['tour_guet', 1], ['cabane_ermite', 0.6], ['grotte', 0.5], ['cercle_pierres', 0.3], ['sources_chaudes', 0.25], ['observatoire', 0.12], ['ruines', 0.3], ['statue', 0.05]],
  village: [['village', 1], ['moulin_vent', 1], ['moulin_eau', 0.85], ['verger', 0.6], ['phare', 0.35], ['rucher', 0.3], ['puits_isole', 0.2]],
  fleurs: [['rucher', 1], ['arche_fleurie', 1], ['moulin_vent', 1], ['verger', 0.4], ['cercle_pierres', 0.35], ['campement', 0.3], ['puits_isole', 0.3]],
  foret: [['arbre_geant', 1], ['cabane_ermite', 1], ['campement', 0.5], ['ruines', 0.4], ['rucher', 0.2], ['cercle_pierres', 0.25]],
  cratere: [['sources_chaudes', 1], ['tour_guet', 0.6], ['temple', 0.4], ['grotte', 0.5], ['ruines', 0.3]],
  falaises: [['phare', 1], ['arche', 1], ['grotte', 0.6], ['ruines', 0.4], ['campement', 0.25], ['cercle_pierres', 0.25]],
  lagon: [['epave', 1], ['recif', 1], ['campement', 0.35], ['phare', 0.2]],
  dunes: [['oasis', 1], ['ruines_ensablees', 1], ['bateau_dunes', 1], ['campement', 0.5], ['temple', 0.3]],
  jumelles: [['pont_corde', 1], ['phare', 0.4], ['campement', 0.4], ['ruines', 0.3], ['cercle_pierres', 0.2]],
  curiosite: [['landmark', 1], ['barque_echouee', 0.3]],
};
const GENERIC = [['epave', 0.16], ['barque_echouee', 0.3], ['ruines', 0.1], ['puits_isole', 0.08], ['cercle_pierres', 0.06], ['campement', 0.08], ['observatoire', 0.02], ['statue', 0.02], ['cimetiere_bateaux', 0.03], ['epave_immergee', 0.25]];
const FALLBACK = ['campement', 'ruines', 'puits_isole', 'cercle_pierres', 'barque_echouee', 'rucher', 'cabane_ermite'];

// règle de placement : un score (de signe quelconque), ou NO pour refuser l'emplacement
const NO = -1e9;

const ROOFS = ['#f19b86', '#86c6bb', '#f2c86a', '#c7b2e6', '#9fd6c2', '#7fa6d9'];
const WALLS = ['#fbf3e6', '#f9e1e3', '#e6f0f6', '#f6ead2', '#eef6e6'];

export function placePOIs(P) {
  const { H, n, s, ext, zone, slope, coastDist, wetDist, water, rivers, falls, lakes, desc, ctx } = P;
  const rng = mulberry32(desc.seed ^ 0x9015e7);
  const arch = ctx.arch;
  const r = desc.r;
  const pois = [];
  const placed = []; // emprises { x, z, r }
  const stamps = [];
  const hAt = (x, z) => bilinear(H, n, (x + ext) / s, (z + ext) / s);
  const cellAt = (x, z) => Math.max(0, Math.min(n - 1, Math.round((z + ext) / s))) * n + Math.max(0, Math.min(n - 1, Math.round((x + ext) / s)));
  const zoneAt = (x, z) => zone[cellAt(x, z)];
  // pente et dénivelé sur une emprise circulaire
  const site = (x, z, rr) => {
    let lo = Infinity;
    let hi = -Infinity;
    let sl = 0;
    let wet = false;
    for (let a = 0; a < 8; a++) {
      const px = x + Math.cos(a * 0.785) * rr;
      const pz = z + Math.sin(a * 0.785) * rr;
      const h = hAt(px, pz);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      const k = cellAt(px, pz);
      sl = Math.max(sl, slope[k]);
      if (water[k]) wet = true;
    }
    const h0 = hAt(x, z);
    return { h: h0, lo: Math.min(lo, h0), hi: Math.max(hi, h0), rel: (Math.max(hi, h0) - Math.min(lo, h0)) / Math.max(1, rr * 2), sl, wet };
  };
  // relax : dernier recours pour atteindre le minimum de lieux (toutes zones, pente et écart plus tolérants)
  let relax = false;
  const free = (x, z, rr, gap = relax ? 2 : 5) => placed.every((p) => Math.hypot(p.x - x, p.z - z) >= p.r + rr + gap);
  // meilleur emplacement selon une règle (score < 0 : refusé)
  const find = (rr, rule, step = 2) => {
    let best = null;
    const st = n > 90 ? step : 1;
    for (let j = 1; j < n - 1; j += st) {
      for (let i = 1; i < n - 1; i += st) {
        const x = -ext + i * s;
        const z = -ext + j * s;
        const k = j * n + i;
        if (H[k] < -1) continue;
        const sc0 = rule(x, z, k);
        if (sc0 <= NO || !free(x, z, rr)) continue;
        const sc = sc0 + rng() * 0.05;
        if (!best || sc > best.sc) best = { x, z, k, sc };
      }
    }
    return best;
  };
  const add = (type, x, z, rr, parts = [], extra = {}) => {
    const y = hAt(x, z);
    const poi = { id: stableId(desc.seed, TYPE_ID[type] ?? 99, x, z), type, label: POI_LABELS[type] || type, x, z, y, r: rr, parts, ...extra };
    pois.push(poi);
    placed.push({ x, z, r: rr });
    return poi;
  };
  // aplanit une plate-forme (bâtiments) ; y par défaut : hauteur moyenne
  const stamp = (x, z, rr, y = null, fall = 6) => {
    const yy = y ?? Math.max(1.4, site(x, z, rr * 0.7).h);
    stamps.push({ x, z, r: rr, y: yy, fall });
    return yy;
  };
  const dirToSea = (x, z) => {
    // gradient de la distance à la côte : vers la mer
    const e = s;
    const gx = bilinear(coastDist, n, (x + e + ext) / s, (z + ext) / s) - bilinear(coastDist, n, (x - e + ext) / s, (z + ext) / s);
    const gz = bilinear(coastDist, n, (x + ext) / s, (z + e + ext) / s) - bilinear(coastDist, n, (x + ext) / s, (z - e + ext) / s);
    return Math.atan2(-gz, -gx);
  };
  const coastAt = (x, z) => bilinear(coastDist, n, (x + ext) / s, (z + ext) / s);
  // terres « principales » : composantes connexes assez grandes (les îlots du lagon n'accueillent pas de lieu)
  const comp = new Int32Array(n * n).fill(-1);
  const sizes = [];
  {
    const stack = new Int32Array(n * n);
    for (let k0 = 0; k0 < n * n; k0++) {
      if (comp[k0] >= 0 || H[k0] <= 0.2 || water[k0] === 1) continue;
      const id = sizes.length;
      let sp = 0;
      let size = 0;
      stack[sp++] = k0;
      comp[k0] = id;
      while (sp) {
        const c = stack[--sp];
        size++;
        const ci = c % n;
        const cj = (c - ci) / n;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const i = ci + di;
            const j = cj + dj;
            if (i < 0 || j < 0 || i >= n || j >= n) continue;
            const k = j * n + i;
            if (comp[k] >= 0 || H[k] <= 0.2 || water[k] === 1) continue;
            comp[k] = id;
            stack[sp++] = k;
          }
        }
      }
      sizes.push(size);
    }
  }
  const biggest = Math.max(1, ...sizes);
  const mainLand = (k) => comp[k] >= 0 && sizes[comp[k]] >= Math.max(30, biggest * 0.2);
  P.comp = comp;
  P.compSizes = sizes;
  const land = (k) => H[k] > 1.3 && !water[k] && mainLand(k);
  const isFlat = (st, max = 0.22) => st.sl < max && st.rel < (relax ? 0.25 : 0.12) && !st.wet;
  const P1 = { x: 0, z: 0 };

  // -------------------------------------------------------------------------
  const builders = {
    village() {
      const bay = ctx.bay ? { x: ctx.bay.x * r, z: ctx.bay.z * r } : { x: Math.cos(ctx.landA) * r * 0.8, z: Math.sin(ctx.landA) * r * 0.8 };
      // petites îles : place plus petite, maisons plus serrées
      const small = r < 75;
      const plazaR = small ? 9 : 14;
      const rings = small ? [9, 15, 21, 27] : [11, 18, 25, 32];
      const best = find(small ? 10 : 16, (x, z, k) => {
        if (!land(k) || H[k] > 16) return NO;
        const d = Math.hypot(x - bay.x, z - bay.z);
        if (d < (small ? 12 : 22) || d > 85) return NO;
        const st = site(x, z, plazaR);
        if (st.sl > (small ? 0.32 : 0.24) || st.wet) return NO;
        return 2 - d * 0.012 - st.sl * 4 - st.rel * 3;
      });
      if (!best) return null;
      const cx = best.x;
      const cz = best.z;
      const plazaY = stamp(cx, cz, 7, null, 8);
      const toBay = Math.atan2(bay.z - cz, bay.x - cx);
      const houses = Math.max(4, Math.min(14, 6 + Math.floor((r - 52) / 12)));
      const parts = [{ t: 'puits', x: cx, z: cz, y: plazaY, rot: 0 }];
      const slots = [];
      for (const ring of rings) {
        const count = Math.floor((Math.PI * 2 * ring) / 9.5);
        const off = rng() * Math.PI;
        for (let q = 0; q < count; q++) {
          const a = off + (q / count) * Math.PI * 2;
          // la grand-rue descend vers la jetée : pas de maison dessus
          const da = Math.abs(((a - toBay + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (da < 0.32) continue;
          slots.push({ x: cx + Math.cos(a) * ring, z: cz + Math.sin(a) * ring, a, ring });
        }
      }
      const homes = [];
      for (const sl of slots) {
        if (homes.length >= houses) break;
        const k = cellAt(sl.x, sl.z);
        if (!land(k)) continue;
        const st = site(sl.x, sl.z, 4);
        if (st.sl > 0.4 || st.wet || st.h > plazaY + 7) continue;
        if (homes.some((h) => Math.hypot(h.x - sl.x, h.z - sl.z) < (small ? 7.6 : 8.6))) continue;
        homes.push(sl);
      }
      if (homes.length < 4) return null;
      homes.forEach((hm, i) => {
        const y = stamp(hm.x, hm.z, 3.6, null, 4);
        const big = i === 0;
        parts.push({ t: 'maison', x: hm.x, z: hm.z, y, rot: Math.atan2(cx - hm.x, cz - hm.z), v: big ? 2 : Math.floor(rng() * 2), roof: ROOFS[Math.floor(rng() * ROOFS.length)], wall: WALLS[Math.floor(rng() * WALLS.length)], merchant: big });
        if (rng() < 0.45) {
          const pa = hm.a + (rng() < 0.5 ? 0.25 : -0.25);
          parts.push({ t: 'potager', x: cx + Math.cos(pa) * (hm.ring + 4.5), z: cz + Math.sin(pa) * (hm.ring + 4.5), y: 0, rot: pa });
        }
      });
      // étals du marché, bancs et lanternes le long de la grand-rue
      for (let q = 0; q < 3; q++) {
        const a = toBay + Math.PI * 0.5 + (q - 1) * 0.9;
        parts.push({ t: 'etal', x: cx + Math.cos(a) * 5.5, z: cz + Math.sin(a) * 5.5, y: plazaY, rot: a + Math.PI, v: q });
      }
      parts.push({ t: 'banc', x: cx + Math.cos(toBay + Math.PI) * 4.8, z: cz + Math.sin(toBay + Math.PI) * 4.8, y: plazaY, rot: toBay });
      for (let d = 8; d < Math.hypot(bay.x - cx, bay.z - cz) - 8; d += 9) {
        const px = cx + Math.cos(toBay) * d + Math.cos(toBay + Math.PI / 2) * 2.4;
        const pz = cz + Math.sin(toBay) * d + Math.sin(toBay + Math.PI / 2) * 2.4;
        if (land(cellAt(px, pz))) parts.push({ t: 'lanterne', x: px, z: pz, y: 0, rot: 0 });
      }
      // linge étendu entre deux maisons voisines
      for (let i = 0; i + 1 < homes.length && i < 6; i += 2) {
        const a = homes[i];
        const b = homes[i + 1];
        if (Math.hypot(a.x - b.x, a.z - b.z) < 14) parts.push({ t: 'linge', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y: 0, rot: Math.atan2(b.z - a.z, b.x - a.x), len: Math.hypot(a.x - b.x, a.z - b.z) - 6 });
      }
      // jetée : depuis le rivage le plus proche de l'anse, vers le large
      let shore = null;
      for (let q = 0; q < 64; q++) {
        const a = toBay + (q / 64 - 0.5) * 1.6;
        for (let d = 10; d < 90; d += 2) {
          const px = cx + Math.cos(a) * d;
          const pz = cz + Math.sin(a) * d;
          const h = hAt(px, pz);
          if (h < 0.6) {
            if (h > -0.4 && (!shore || d < shore.d)) shore = { x: px, z: pz, d };
            break;
          }
        }
      }
      let jetty = null;
      if (shore) {
        const a = dirToSea(shore.x, shore.z);
        let len = 6;
        while (len < 22 && hAt(shore.x + Math.cos(a) * len, shore.z + Math.sin(a) * len) > -1.4) len += 2;
        jetty = { x: shore.x, z: shore.z, rot: a, len: Math.max(10, len) };
        parts.push({ t: 'jetee', x: shore.x, z: shore.z, y: 0, rot: a, len: jetty.len });
        const boats = 1 + Math.floor(rng() * 3);
        for (let q = 0; q < boats; q++) {
          const d = jetty.len - 2 - q * 4.5;
          const side = q % 2 ? 1 : -1;
          parts.push({ t: 'barque_amarree', x: shore.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * 2.4 * side, z: shore.z + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * 2.4 * side, y: 0, rot: a + (rng() - 0.5) * 0.3, v: q });
        }
        parts.push({ t: 'casiers', x: shore.x + Math.cos(a) * 3 + Math.cos(a - Math.PI / 2) * 2, z: shore.z + Math.sin(a) * 3 + Math.sin(a - Math.PI / 2) * 2, y: 0, rot: a });
      }
      const radius = Math.max(...homes.map((hm) => Math.hypot(hm.x - cx, hm.z - cz))) + 6;
      // zone bâtie et champs cultivés autour
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          const x = -ext + i * s;
          const z = -ext + j * s;
          if (Math.hypot(x - cx, z - cz) < radius && land(k) && zone[k] !== Z.ROCHE) zone[k] = Z.VILLAGE;
        }
      }
      const fields = [];
      for (let q = 0; q < 4 && fields.length < 3; q++) {
        const a = toBay + Math.PI + (rng() - 0.5) * 2.4;
        const d = radius + 10 + rng() * 14;
        const fx = cx + Math.cos(a) * d;
        const fz = cz + Math.sin(a) * d;
        const st = site(fx, fz, 9);
        if (st.sl > 0.25 || st.wet || !land(cellAt(fx, fz))) continue;
        if (fields.some((f) => Math.hypot(f.x - fx, f.z - fz) < 20)) continue;
        const f = { x: fx, z: fz, w: 16 + rng() * 6, d: 10 + rng() * 4, rot: a, crop: ['ble', 'potiron', 'tournesol'][fields.length % 3] };
        fields.push(f);
        placed.push({ x: fx, z: fz, r: f.w / 2 });
        parts.push({ t: 'cloture_champ', x: fx, z: fz, y: 0, rot: a, w: f.w, d: f.d });
        if (rng() < 0.5) parts.push({ t: 'epouvantail', x: fx, z: fz, y: 0, rot: a });
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const k = j * n + i;
            const dx = -ext + i * s - fx;
            const dz = -ext + j * s - fz;
            const u = dx * ca + dz * sa;
            const v = -dx * sa + dz * ca;
            if (Math.abs(u) < f.w / 2 && Math.abs(v) < f.d / 2 && land(k)) zone[k] = Z.CULTURES;
          }
        }
      }
      return add('village', cx, cz, radius, parts, { name: `Village ${/^[AEIOUÉÎ]/.test(P.traits.village) ? `d'${P.traits.village}` : `de ${P.traits.village}`}`, plaza: { x: cx, z: cz }, jetty, fields, door: { x: cx, z: cz } });
    },
    moulin_vent() {
      const target = ctx.hill ? { x: ctx.hill.x * r, z: ctx.hill.z * r } : null;
      // point haut : d'abord parmi les 25 % de terres les plus hautes, sinon partout
      const lands = [];
      for (let k = 0; k < H.length; k++) if (land(k)) lands.push(H[k]);
      lands.sort((a, b) => a - b);
      const q75 = lands.length ? lands[Math.floor(lands.length * 0.75)] : 0;
      const top = lands.length ? lands[lands.length - 1] : 1;
      // une butte un peu raide convient : la plate-forme du moulin est aplanie ensuite
      const rule = (minH) => (x, z, k) => {
        if (!land(k) || H[k] < minH || zone[k] === Z.FORET || zone[k] === Z.VILLAGE) return NO;
        const st = site(x, z, 4);
        if (st.sl > 0.6 || st.wet) return NO;
        // haut et dégagé (exposé au vent), de préférence sur la colline prévue
        return (H[k] / Math.max(1, top)) * 4 - st.sl * 2 - (target ? Math.hypot(x - target.x, z - target.z) * 0.006 : 0);
      };
      // sur les petites îles le village couvre presque toute la terre : le moulin peut se poser
      // en lisière du village (on n'évite alors que la place et les maisons, pas toute l'emprise)
      const vil = pois.find((p) => p.type === 'village');
      const vi = vil ? placed.findIndex((q) => q.x === vil.x && q.z === vil.z) : -1;
      const before = placed.slice();
      if (vi >= 0) {
        placed.splice(vi, 1, { x: vil.x, z: vil.z, r: 10 });
        for (const q of vil.parts) if (q.t === 'maison' || q.t === 'potager') placed.push({ x: q.x, z: q.z, r: 4 });
      }
      const best = find(5, rule(q75)) || find(5, rule(-Infinity));
      placed.splice(0, placed.length, ...before);
      if (!best) return null;
      const y = stamp(best.x, best.z, 4.5);
      return add('moulin_vent', best.x, best.z, 4.5, [{ t: 'moulin', x: best.x, z: best.z, y, rot: P.traits.windAngle + Math.PI, color: P.traits.mill.color }], { name: `Moulin ${P.traits.mill.label}`, animated: 'ailes' });
    },
    moulin_eau() {
      let best = null;
      const vil = pois.find((p) => p.type === 'village');
      for (const rv of rivers) {
        const p = rv.pts;
        for (let a = 8; a < p.length - 8; a += 4) {
          const w = p[a + 3];
          if (w < 2.4) continue;
          const dx = p[a + 4] - p[a - 4];
          const dz = p[a + 5] - p[a - 3];
          const drop = p[a - 2] - p[a + 6];
          const nx = -dz;
          const nz = dx;
          const nl = Math.hypot(nx, nz) || 1;
          const hx = p[a] + (nx / nl) * (w / 2 + 3.5);
          const hz = p[a + 1] + (nz / nl) * (w / 2 + 3.5);
          const k = cellAt(hx, hz);
          if (!land(k) || !free(hx, hz, 5)) continue;
          const sc = drop * 2 - (vil ? Math.hypot(hx - vil.x, hz - vil.z) * 0.01 : 0) - site(hx, hz, 4).sl * 3;
          if (!best || sc > best.sc) best = { sc, hx, hz, wx: p[a] + (nx / nl) * (w / 2), wz: p[a + 1] + (nz / nl) * (w / 2), lvl: p[a + 2], rot: Math.atan2(dz, dx) };
        }
      }
      if (!best) return null;
      const y = stamp(best.hx, best.hz, 4);
      return add('moulin_eau', best.hx, best.hz, 5, [{ t: 'moulin_eau', x: best.hx, z: best.hz, y, rot: best.rot, wx: best.wx, wz: best.wz, wy: best.lvl }], { animated: 'roue' });
    },
    epave(big = false) {
      const len = big ? 24 : 14;
      const best = find(big ? 11 : 7, (x, z, k) => {
        const h = H[k];
        if (arch === 'lagon') {
          // sur le récif : eau très peu profonde, côté large
          if (h > 0.3 || h < -1.2 || coastAt(x, z) > 6) return NO;
          return 1 + Math.hypot(x, z) / r;
        }
        if (zone[k] !== Z.PLAGE || h < 0.15 || h > 1.1) return NO;
        return 1 - Math.abs(h - 0.6) - site(x, z, 5).sl * 2;
      });
      if (!best) return null;
      const a = dirToSea(best.x, best.z) + Math.PI / 2 + (rng() - 0.5) * 0.6;
      const y = hAt(best.x, best.z);
      const chest = { x: best.x + Math.cos(a + Math.PI / 2) * 3, z: best.z + Math.sin(a + Math.PI / 2) * 3 };
      return add(big ? 'epave_geante' : 'epave', best.x, best.z, big ? 11 : 7, [{ t: big ? 'epave_geante' : 'epave', x: best.x, z: best.z, y, rot: a, len }, { t: 'coffre', x: chest.x, z: chest.z, y: hAt(chest.x, chest.z), rot: a, loot: true }], { name: `Épave ${P.traits.wreck.replace(/^le /, 'du ').replace(/^la /, 'de la ').replace(/^l'/, "de l'")}`, interact: { kind: 'coffre', x: chest.x, z: chest.z } });
    },
    barque_echouee() {
      const best = find(3, (x, z, k) => {
        if (zone[k] !== Z.PLAGE || H[k] < 0.2 || H[k] > 1.2) return NO;
        const vil = pois.find((p) => p.type === 'village');
        if (vil && Math.hypot(x - vil.x, z - vil.z) < vil.r + 25) return NO;
        return 1 - site(x, z, 3).sl;
      });
      if (!best) return null;
      const a = dirToSea(best.x, best.z) + (rng() - 0.5) * 1.2;
      const v = Math.floor(rng() * 3); // 0 barque échouée (réparable), 1 coque retournée, 2 radeau démonté
      return add('barque_echouee', best.x, best.z, 3, [{ t: 'barque_echouee', x: best.x, z: best.z, y: hAt(best.x, best.z), rot: a, v }], v === 0 ? { interact: { kind: 'reparer', x: best.x, z: best.z } } : {});
    },
    cimetiere_bateaux() {
      const best = find(10, (x, z, k) => (zone[k] === Z.PLAGE && H[k] > 0.2 && H[k] < 1 ? 1 - site(x, z, 9).sl : NO));
      if (!best) return null;
      const parts = [];
      for (let q = 0; q < 4; q++) {
        const px = best.x + (rng() - 0.5) * 14;
        const pz = best.z + (rng() - 0.5) * 14;
        parts.push({ t: 'barque_echouee', x: px, z: pz, y: hAt(px, pz), rot: rng() * 6.28, v: q % 3 });
      }
      return add('cimetiere_bateaux', best.x, best.z, 10, parts);
    },
    phare() {
      const best = find(4, (x, z, k) => {
        const cd = coastAt(x, z);
        if (!land(k) || cd > 16 || cd < 3) return NO;
        const st = site(x, z, 3.5);
        if (st.sl > 0.6) return NO;
        // cap : beaucoup de mer autour
        let sea = 0;
        for (let a = 0; a < 12; a++) if (hAt(x + Math.cos(a * 0.52) * 22, z + Math.sin(a * 0.52) * 22) < 0) sea++;
        return sea * 0.3 + H[k] * 0.05 - st.sl;
      });
      if (!best) return null;
      const y = stamp(best.x, best.z, 3.6, null, 4);
      return add('phare', best.x, best.z, 4, [{ t: 'phare', x: best.x, z: best.z, y, rot: dirToSea(best.x, best.z) }], { name: `Phare du Cap ${P.traits.village.split('-')[0]}` });
    },
    tour_guet() {
      const best = find(3, (x, z, k) => {
        if (!land(k)) return NO;
        const st = site(x, z, 3);
        if (st.sl > (arch === 'cratere' ? 1.15 : 0.85)) return NO;
        return H[k] - st.sl * 6;
      }, 1);
      if (!best) return null;
      const y = stamp(best.x, best.z, 3, null, 4);
      return add('tour_guet', best.x, best.z, 3.5, [{ t: 'tour_guet', x: best.x, z: best.z, y, rot: rng() * 6.28, stone: desc.biome === 'glace' || arch === 'cratere' }], { interact: { kind: 'tour', x: best.x, z: best.z } });
    },
    flat(type, rr, zones, extraRule = null) {
      const best = find(rr, (x, z, k) => {
        if (!land(k) || (zones && !relax && !zones.includes(zone[k]))) return NO;
        const st = site(x, z, rr);
        if (!isFlat(st, relax ? 0.55 : 0.3)) return NO;
        return 1 - st.sl * 3 + (extraRule ? extraRule(x, z, k) : 0);
      });
      return best;
    },
    ruines(sand = false) {
      const best = this.flat('ruines', 6, sand ? [Z.DUNE, Z.PRAIRIE] : null, (x, z, k) => H[k] * 0.02);
      if (!best) return null;
      const y = stamp(best.x, best.z, 6, null, 5);
      return add(sand ? 'ruines_ensablees' : 'ruines', best.x, best.z, 6, [{ t: 'ruines', x: best.x, z: best.z, y: y - (sand ? 0.6 : 0), rot: rng() * 6.28, sand }]);
    },
    temple() {
      const best = this.flat('temple', 6, null, (x, z, k) => H[k] * 0.03);
      if (!best) return null;
      const y = stamp(best.x, best.z, 6, null, 6);
      return add('temple', best.x, best.z, 6, [{ t: 'temple', x: best.x, z: best.z, y, rot: rng() * 6.28 }]);
    },
    cercle_pierres() {
      const best = this.flat('cercle', 5, [Z.PRAIRIE, Z.FLEURS, Z.ALPAGE, Z.CLAIRIERE, Z.MAQUIS]);
      if (!best) return null;
      return add('cercle_pierres', best.x, best.z, 5, [{ t: 'cercle_pierres', x: best.x, z: best.z, y: 0, rot: rng() * 6.28, count: 7 + Math.floor(rng() * 3) }]);
    },
    arche() {
      const best = find(6, (x, z, k) => {
        const cd = coastAt(x, z);
        if (cd > 6 || H[k] < -1.5 || H[k] > 3) return NO;
        let rocky = 0;
        for (let a = 0; a < 8; a++) if (zone[cellAt(x + Math.cos(a) * 10, z + Math.sin(a) * 10)] === Z.ROCHE) rocky++;
        return 1 + rocky * 0.3;
      });
      if (!best) return null;
      return add('arche', best.x, best.z, 6, [{ t: 'arche', x: best.x, z: best.z, y: Math.min(0, hAt(best.x, best.z)), rot: dirToSea(best.x, best.z) + Math.PI / 2, size: 1 + rng() * 0.4 }]);
    },
    grotte() {
      const best = find(4, (x, z, k) => {
        const cd = coastAt(x, z);
        if (cd > 10 || H[k] < 0.4 || H[k] > 9) return NO;
        let rocky = 0;
        for (let a = 0; a < 8; a++) if (slope[cellAt(x + Math.cos(a) * 6, z + Math.sin(a) * 6)] > 0.5) rocky++;
        return rocky > 1 ? rocky * 0.3 : NO;
      });
      if (!best) return null;
      return add('grotte', best.x, best.z, 4, [{ t: 'grotte', x: best.x, z: best.z, y: hAt(best.x, best.z) - 0.3, rot: dirToSea(best.x, best.z) + Math.PI }]);
    },
    cabane_ermite() {
      const best = this.flat('cabane', 4.5, [Z.CLAIRIERE, Z.LISIERE, Z.FORET, Z.PRAIRIE]);
      if (!best) return null;
      const y = stamp(best.x, best.z, 4, null, 4);
      return add('cabane_ermite', best.x, best.z, 4.5, [{ t: 'cabane', x: best.x, z: best.z, y, rot: rng() * 6.28 }, { t: 'potager', x: best.x + 4, z: best.z + 1, y: 0, rot: 0 }, { t: 'bois_pile', x: best.x - 3, z: best.z + 2.5, y: 0, rot: 0.5 }]);
    },
    campement() {
      const best = this.flat('camp', 5, [Z.CLAIRIERE, Z.PRAIRIE, Z.PLAGE, Z.DUNE, Z.FLEURS, Z.MAQUIS]);
      if (!best) return null;
      const a = rng() * 6.28;
      return add('campement', best.x, best.z, 5, [
        { t: 'feu_camp', x: best.x, z: best.z, y: 0, rot: 0 },
        { t: 'tente', x: best.x + Math.cos(a) * 3.5, z: best.z + Math.sin(a) * 3.5, y: 0, rot: a + Math.PI, v: 0 },
        { t: 'tente', x: best.x + Math.cos(a + 2.2) * 3.5, z: best.z + Math.sin(a + 2.2) * 3.5, y: 0, rot: a + 2.2 + Math.PI, v: 1 },
        { t: 'rondin', x: best.x + Math.cos(a + 4.2) * 2.2, z: best.z + Math.sin(a + 4.2) * 2.2, y: 0, rot: a + 4.2 + Math.PI / 2 },
      ], { interact: { kind: 'feu', x: best.x, z: best.z } });
    },
    rucher() {
      const best = this.flat('rucher', 3.5, [Z.FLEURS, Z.PRAIRIE, Z.LISIERE], (x, z) => {
        let f = 0;
        for (let a = 0; a < 6; a++) if (zoneAt(x + Math.cos(a) * 12, z + Math.sin(a) * 12) === Z.FLEURS) f++;
        return f * 0.2;
      });
      if (!best) return null;
      const parts = [];
      for (let q = 0; q < 4; q++) parts.push({ t: 'ruche', x: best.x + (q - 1.5) * 1.6, z: best.z + (q % 2) * 0.8, y: 0, rot: rng() * 0.4 });
      return add('rucher', best.x, best.z, 3.5, parts);
    },
    arche_fleurie() {
      const best = this.flat('arche_fleurie', 2.5, [Z.FLEURS, Z.PRAIRIE]);
      if (!best) return null;
      return add('arche_fleurie', best.x, best.z, 2.5, [{ t: 'arche_fleurie', x: best.x, z: best.z, y: 0, rot: P.traits.windAngle }]);
    },
    verger() {
      const vil = pois.find((p) => p.type === 'village');
      const best = this.flat('verger', 12, [Z.PRAIRIE, Z.FLEURS, Z.CLAIRIERE], (x, z) => (vil ? -Math.hypot(x - vil.x, z - vil.z) * 0.01 : 0));
      if (!best) return null;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          if (Math.hypot(-ext + i * s - best.x, -ext + j * s - best.z) < 12 && land(k) && slope[k] < 0.3) zone[k] = Z.VERGER;
        }
      }
      return add('verger', best.x, best.z, 12, [], { orchard: { x: best.x, z: best.z, r: 12, rot: rng() * 6.28 } });
    },
    puits_isole() {
      const best = this.flat('puits', 2.5, [Z.PRAIRIE, Z.CLAIRIERE, Z.MAQUIS, Z.DUNE]);
      if (!best) return null;
      return add('puits_isole', best.x, best.z, 2.5, [{ t: 'puits', x: best.x, z: best.z, y: 0, rot: rng() * 6.28 }]);
    },
    pont_corde() {
      // créé par la passe des chemins si deux terres restent séparées (voir paths.js)
      return null;
    },
    sources_chaudes() {
      const best = find(5, (x, z, k) => {
        if (!land(k)) return NO;
        const st = site(x, z, 4);
        if (st.sl > 0.5 || st.wet) return NO;
        // de préférence au bord d'un lac (cratère) ou d'une rivière
        return 1.5 - Math.min(40, wetDist[k]) * 0.03 - st.sl * 2;
      });
      if (!best) return null;
      const y = stamp(best.x, best.z, 4.5, null, 4);
      const parts = [];
      for (let q = 0; q < 3; q++) parts.push({ t: 'bassin_chaud', x: best.x + Math.cos(q * 2.1) * 2.6, z: best.z + Math.sin(q * 2.1) * 2.6, y, rot: q, size: 1 + q * 0.3 });
      return add('sources_chaudes', best.x, best.z, 5, parts);
    },
    observatoire() {
      if (P.hmax < 30) return null;
      const best = this.flat('obs', 5, null, (x, z, k) => H[k] * 0.05);
      if (!best) return null;
      const y = stamp(best.x, best.z, 5);
      return add('observatoire', best.x, best.z, 5, [{ t: 'observatoire', x: best.x, z: best.z, y, rot: rng() * 6.28 }]);
    },
    statue() {
      const best = this.flat('statue', 5, null, (x, z, k) => H[k] * 0.02);
      if (!best) return null;
      const y = stamp(best.x, best.z, 5);
      return add('statue', best.x, best.z, 5, [{ t: 'statue', x: best.x, z: best.z, y, rot: dirToSea(best.x, best.z) + Math.PI }]);
    },
    arbre_geant() {
      const best = this.flat('arbre', 6, [Z.FORET, Z.CLAIRIERE, Z.LISIERE, Z.PRAIRIE, Z.CHAMPIGNONS]);
      if (!best) return null;
      return add('arbre_geant', best.x, best.z, 6, [{ t: 'arbre_geant', x: best.x, z: best.z, y: 0, rot: rng() * 6.28, kind: desc.biome === 'champignons' ? 'champi' : desc.biome === 'glace' ? 'sapin' : 'chene' }]);
    },
    oasis() {
      const lake = lakes[0];
      if (!lake) return null;
      let sx = 0;
      let sz = 0;
      for (const c of lake.cells) {
        sx += -ext + (c % n) * s;
        sz += -ext + Math.floor(c / n) * s;
      }
      const x = sx / lake.cells.length;
      const z = sz / lake.cells.length;
      pois.push({ id: stableId(desc.seed, TYPE_ID.oasis, x, z), type: 'oasis', label: POI_LABELS.oasis, x, z, y: lake.level, r: 0, parts: [] });
      return pois[pois.length - 1];
    },
    bateau_dunes() {
      const best = find(4, (x, z, k) => (zone[k] === Z.DUNE && coastAt(x, z) > 25 ? 1 - site(x, z, 4).sl : NO));
      if (!best) return null;
      return add('bateau_dunes', best.x, best.z, 4, [{ t: 'barque_echouee', x: best.x, z: best.z, y: hAt(best.x, best.z) - 0.3, rot: rng() * 6.28, v: 3 }]);
    },
    recif() {
      const parts = [];
      for (let q = 0; q < 40 && parts.length < 10; q++) {
        const a = rng() * 6.28;
        const d = r * (0.85 + rng() * 0.45);
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const h = hAt(x, z);
        if (h < -3 || h > -0.4) continue;
        parts.push({ t: 'recif', x, z, y: h, rot: rng() * 6.28, size: 0.8 + rng() * 0.8 });
      }
      if (!parts.length) return null;
      return add('recif', parts[0].x, parts[0].z, 0, parts);
    },
    epave_immergee() {
      const best = find(6, (x, z, k) => (H[k] < -2.5 && H[k] > -6 && coastAt(x, z) < 30 ? 1 : NO));
      if (!best) return null;
      return add('epave_immergee', best.x, best.z, 6, [{ t: 'epave', x: best.x, z: best.z, y: hAt(best.x, best.z) + 0.6, rot: rng() * 6.28, len: 12, sunk: true }]);
    },
    // belvédère : un banc tourné vers la mer et un cairn ; trouve toujours une place sur une île émergée
    belvedere() {
      const rule = (strict) => (x, z, k) => {
        if (H[k] < 0.8 || water[k] || (strict && !mainLand(k))) return NO;
        return Math.min(H[k], 30) * 0.03 - site(x, z, 2).sl * 2;
      };
      const best = find(2, rule(true)) || find(2, rule(false));
      if (!best) return null;
      const a = dirToSea(best.x, best.z);
      return add('belvedere', best.x, best.z, 2, [
        { t: 'banc_vue', x: best.x, z: best.z, y: 0, rot: a },
        { t: 'cairn', x: best.x + Math.cos(a + 1.7) * 1.8, z: best.z + Math.sin(a + 1.7) * 1.8, y: 0, rot: rng() * 6.28 },
      ]);
    },
    landmark() {
      const lm = ctx.landmark;
      if (lm === 'phare') return this.phare();
      if (lm === 'epave_geante') return this.epave(true);
      if (lm === 'arche') return this.arche();
      if (lm === 'statue') return this.statue();
      // rocher de la baleine : repère du relief lui-même
      let bk = 0;
      for (let k = 0; k < H.length; k++) if (H[k] > H[bk]) bk = k;
      const x = -ext + (bk % n) * s;
      const z = -ext + Math.floor(bk / n) * s;
      pois.push({ id: stableId(desc.seed, TYPE_ID.rocher_baleine, x, z), type: 'rocher_baleine', label: POI_LABELS.rocher_baleine, x, z, y: H[bk], r: 0, parts: [] });
      return pois[pois.length - 1];
    },
  };
  const make = (type) => {
    if (type === 'epave') return builders.epave(false);
    if (type === 'ruines_ensablees') return builders.ruines(true);
    return builders[type] ? builders[type]() : null;
  };

  // recette de l'archétype, puis ajouts génériques
  for (const [type, p] of RECIPES[arch] || []) if (p >= 1 || rng() < p) make(type);
  for (const [type, p] of GENERIC) if (rng() < p && !pois.some((q) => q.type === type || (type === 'epave' && q.type === 'epave_geante'))) make(type);
  // cascades : chaque chute nommée devient une découverte
  for (const f of falls) {
    if (!free(f.x, f.z, 3, 1)) continue;
    add('cascade', f.x, f.z, 3, [{ t: 'cascade', x: f.x, z: f.z, y: f.bottom, rot: Math.atan2(f.dz, f.dx), top: f.top, w: f.w }], { name: 'Cascade' });
  }
  // minimum de lieux selon la taille
  const want = r > 60 ? 4 : 1;
  const counted = () => pois.filter((p) => !['recif', 'epave_immergee', 'cascade'].includes(p.type)).length;
  for (let q = 0; q < FALLBACK.length && counted() < want; q++) if (!pois.some((p) => p.type === FALLBACK[q])) make(FALLBACK[q]);
  if (counted() < want) {
    relax = true;
    for (const t of ['campement', 'cercle_pierres', 'puits_isole', 'barque_echouee', 'belvedere', 'belvedere', 'belvedere', 'belvedere']) {
      if (counted() >= want) break;
      if (t === 'belvedere' || !pois.some((p) => p.type === t)) make(t);
    }
  }
  P.stamps = stamps;
  P.placed = placed;
  return pois;
}

// petites découvertes (environ une tous les 40 m) : cairns, bancs avec vue, nichoirs…
const MICRO = [
  ['cairn', [Z.ALPAGE, Z.ROCHE, Z.MAQUIS, Z.PRAIRIE], 1],
  ['banc_vue', [Z.PRAIRIE, Z.FLEURS, Z.ALPAGE, Z.MAQUIS, Z.CLAIRIERE], 1],
  ['nichoir', [Z.LISIERE, Z.FORET, Z.VERGER], 1],
  ['rondin', [Z.FORET, Z.CLAIRIERE, Z.LISIERE], 1],
  ['cercle_champi', [Z.FORET, Z.CLAIRIERE, Z.CHAMPIGNONS], 1],
  ['lanterne_pierre', [Z.PRAIRIE, Z.CLAIRIERE, Z.ALPAGE], 0.6],
  ['ancre', [Z.PLAGE], 1],
  ['tonneaux', [Z.PLAGE, Z.VILLAGE], 0.8],
  ['autel', [Z.CLAIRIERE, Z.ALPAGE, Z.PRAIRIE], 0.5],
  ['fleur_geante', [Z.FLEURS, Z.CLAIRIERE, Z.CHAMPIGNONS], 1],
  ['charrette', [Z.PRAIRIE, Z.CULTURES, Z.VILLAGE], 0.6],
  ['nid', [Z.ROCHE, Z.PLAGE, Z.ALPAGE], 0.7],
  ['coffre_cache', [Z.FORET, Z.ROCHE, Z.PLAGE, Z.DUNE], 0.25],
  ['totem', [Z.CLAIRIERE, Z.DUNE, Z.MAQUIS], 0.4],
  ['epouvantail', [Z.CULTURES], 1],
  ['bouee_echouee', [Z.PLAGE], 0.7],
];
export function placeMicro(P, pois) {
  const { H, n, s, ext, zone, slope, water, desc } = P;
  const rng = mulberry32(desc.seed ^ 0x51c0f0);
  const out = [];
  const step = 40;
  const hAt = (x, z) => bilinear(H, n, (x + ext) / s, (z + ext) / s);
  for (let gz = -ext; gz < ext; gz += step) {
    for (let gx = -ext; gx < ext; gx += step) {
      const x = gx + rng() * step;
      const z = gz + rng() * step;
      const i = Math.round((x + ext) / s);
      const j = Math.round((z + ext) / s);
      if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) continue;
      const k = j * n + i;
      if (H[k] < 0.3 || water[k] || slope[k] > 0.5) continue;
      if ((P.placed || []).some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 4)) continue;
      const opts = MICRO.filter(([, zs]) => zs.includes(zone[k]));
      if (!opts.length) continue;
      const type = weighted(rng, opts.map(([t, , w]) => [t, w]));
      const rot = type === 'banc_vue' ? Math.atan2(z, x) : rng() * 6.28;
      out.push({ id: stableId(desc.seed, 200 + MICRO.findIndex((m) => m[0] === type), x, z), t: type, x, z, y: hAt(x, z), rot, loot: type === 'coffre_cache' });
    }
  }
  return out;
}

// aplanissement des plates-formes (après érosion et rivières, avant les grilles finales)
export function applyStamps(P) {
  const { H, A, n, s, ext } = P;
  for (const st of P.stamps || []) {
    const reach = st.r + st.fall;
    const i0 = Math.max(0, Math.floor((st.x - reach + ext) / s));
    const i1 = Math.min(n - 1, Math.ceil((st.x + reach + ext) / s));
    const j0 = Math.max(0, Math.floor((st.z - reach + ext) / s));
    const j1 = Math.min(n - 1, Math.ceil((st.z + reach + ext) / s));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * n + i;
        const d = Math.hypot(-ext + i * s - st.x, -ext + j * s - st.z);
        const w = smooth(reach, st.r, d);
        if (w <= 0) continue;
        H[k] = H[k] * (1 - w) + st.y * w;
        if (A) A[k] = Math.round(A[k] * (1 - w));
      }
    }
  }
}
