// Registre des modèles 3D : identifiants, constructions (non vides, sans NaN, à la taille
// déclarée) et couverture de tout ce que le jeu construit (recensement sur des îles générées
// et sur les tables du jeu).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as THREE from 'three';
import { installCanvasStub } from './helpers/canvas.js';

installCanvasStub();
let R;
beforeAll(async () => {
  R = await import('../src/models/registry.js');
});

const box = new THREE.Box3();
function measure(object3d) {
  object3d.updateMatrixWorld(true);
  box.makeEmpty();
  let verts = 0;
  let nan = false;
  object3d.traverse((o) => {
    if (!o.geometry) return;
    const pos = o.geometry.attributes.position;
    verts += pos.count;
    for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) nan = true;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  return { verts, nan, size: box.getSize(new THREE.Vector3()).toArray() };
}

describe('registre des modèles', () => {
  it('a des identifiants uniques, au préfixe de leur catégorie, numérotés sans trou', () => {
    const ids = R.MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(R.MODELS.map((m) => m.slug)).size).toBe(ids.length);
    for (const c of R.CATEGORIES) {
      const nums = R.MODELS.filter((m) => m.category === c.id).map((m) => {
        expect(m.id).toMatch(new RegExp(`^${c.prefix}-\\d{3}$`));
        return Number(m.id.slice(4));
      });
      expect(nums.length, c.id).toBeGreaterThan(0);
      // numérotation continue : un modèle retiré garde sa place, au statut « retire »
      expect(nums).toEqual(nums.map((_, i) => i + 1));
    }
    for (const m of R.MODELS) {
      expect(Object.keys(R.STATUTS)).toContain(m.status);
      expect(m.source).toMatch(/^src\/models\/.+\.js$/);
      expect(typeof m.build).toBe('function');
    }
  });

  it('construit chaque modèle et chaque variante : non vide, sans NaN, à la taille déclarée (±25 %)', () => {
    for (const m of R.MODELS) {
      if (m.status === 'retire') continue;
      const runs = [R.defaultParams(m), ...m.variants.map((v) => v.params)];
      runs.forEach((params, k) => {
        const { object3d, anim } = m.build(params);
        const r = measure(object3d); // pose de repos
        anim?.(0.016, 0.5);
        expect(r.verts, `${m.id} vide`).toBeGreaterThan(0);
        expect(r.nan, `${m.id} NaN`).toBe(false);
        if (k > 0) return; // les variantes changent la taille (petite / grande maison…)
        r.size.forEach((s, a) => {
          const d = m.size[a];
          expect(Math.abs(s - d), `${m.id} axe ${'xyz'[a]} : ${s.toFixed(2)} m au lieu de ${d} m`).toBeLessThanOrEqual(Math.max(0.25 * d, 0.05));
        });
      });
    }
  });
});

describe('dossiers de modèle', () => {
  it('index.gen.js est à jour (npm run modeles:index)', async () => {
    const fs = await import('node:fs');
    const { indexGenere, INDEX } = await import('../scripts/modeles/index.mjs');
    expect(fs.readFileSync(INDEX, 'utf8')).toBe(indexGenere());
  });

  it('se chargent depuis chaque point d’entrée (aucun cycle d’import cassé selon l’ordre de chargement)', async () => {
    const fs = await import('node:fs');
    const { dossiers } = await import('../scripts/modeles/index.mjs');
    const entrees = [
      '../src/models/registry.js', '../src/models/kit/fiches.js', '../src/models/kit/assemble.js',
      '../src/entities/Sailing.js', '../src/entities/character/Character.js', '../src/gameplay/Gather.js',
      '../src/world/islands/IslandManager.js', '../src/world/home/props.js',
      // l'API de chaque catégorie, et le premier dossier de chacune
      ...['arbres', 'plantes', 'rochers', 'batiments', 'ouvrages', 'monuments', 'bateaux', 'decor', 'objets', 'animaux', 'personnage']
        .flatMap((c) => [`../src/models/${c}/index.js`, ...dossiers().filter((d) => d.startsWith(`${c}/`)).slice(0, 1).map((d) => `../src/models/${d}/index.js`)])
        .filter((f) => fs.existsSync(new URL(f, import.meta.url))),
    ];
    for (const f of entrees) {
      vi.resetModules();
      await expect(import(f), f).resolves.toBeTruthy();
    }
  }, 60000);

  it('physique.gen.js est à jour et donne un encombrement à chaque espèce de la végétation', async () => {
    const fs = await import('node:fs');
    const { physiqueGeneree, PHYSIQUE } = await import('../scripts/modeles/index.mjs');
    expect(fs.readFileSync(PHYSIQUE, 'utf8')).toBe(await physiqueGeneree());
    const { KINDS, KIND_RADIUS } = await import('../src/world/islands/gen/kinds.js');
    for (const k of KINDS) expect(typeof KIND_RADIUS[k], k).toBe('number');
  }, 30000);

  it('ouvrent leur source à la ligne du constructeur (catalogue, « Ouvrir la source »)', async () => {
    const fs = await import('node:fs');
    const { ligneSource } = await import('../catalogue/source.js');
    for (const m of R.MODELS) {
      const text = fs.readFileSync(new URL(`../${m.source}`, import.meta.url), 'utf8');
      expect(ligneSource(m, text), m.id).toBeGreaterThan(1);
    }
    // quelques constructeurs attendus
    const ligne = (id) => {
      const m = R.BY_ID.get(id);
      const text = fs.readFileSync(new URL(`../${m.source}`, import.meta.url), 'utf8');
      return text.split('\n')[ligneSource(m, text) - 1].trim();
    };
    expect(ligne('ANI-001')).toMatch(/^function mouton\(/);
    expect(ligne('BAT-001')).toMatch(/^export function maison\(/);
    expect(ligne('STR-018')).toMatch(/^export function banc\(/);
    expect(ligne('NAV-002')).toMatch(/^export function dessin\(/);
    expect(ligne('DEC-011')).toMatch(/^export const moulin = \{/);
  });

  it('rangent chaque fiche dans le dossier de sa catégorie, sous src/models', async () => {
    const { FICHES } = await import('../src/models/index.gen.js');
    expect(FICHES.length).toBeGreaterThan(0);
    for (const f of FICHES) {
      expect(f.categorie, f.id).toBe(R.categoryOf(f.id).id);
      expect(f.source, f.id).toMatch(new RegExp(`^src/models/${f.categorie}/[a-z0-9-]+/index\\.js$`));
    }
  });
});

describe('budgets de triangles (docs/DA.md)', () => {
  const tri = (o) => {
    let t = 0;
    o.traverse((x) => { if (x.geometry) t += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3; });
    return Math.round(t);
  };
  it('tiennent le budget de leur catégorie ou de leur fiche, sauf écarts connus qui ne grossissent pas', async () => {
    const B = await import('../src/models/kit/budgets.js');
    for (const m of R.MODELS) {
      const t = Math.max(...[R.defaultParams(m), ...m.variants.map((v) => v.params)].map((p) => tri(m.build(p).object3d)));
      const budget = B.budgetDe(m);
      if (B.ECARTS[m.id]) {
        expect(t, `${m.id} : écart connu qui grossit`).toBeLessThanOrEqual(B.ECARTS[m.id]);
        expect(t, `${m.id} tient son budget : le retirer de ECARTS (kit/budgets.js)`).toBeGreaterThan(budget);
      } else expect(t, `${m.id} : ${t} triangles pour un budget de ${budget}`).toBeLessThanOrEqual(budget);
    }
  });

  it('donnent une version allégée aux mêmes pièces aux espèces de plus de 4 000 triangles', async () => {
    const B = await import('../src/models/kit/budgets.js');
    const { SPECIES } = await import('../src/models/animaux/index.js');
    const t = (parts) => parts.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0);
    for (const [sp, d] of Object.entries(SPECIES)) {
      const fin = t(d.parts());
      if (fin <= B.LOD_SEUIL) continue;
      expect(d.lod, `${sp} : ${fin} triangles sans version allégée`).toBeTypeOf('function');
      expect(d.lodDist ?? 20, sp).toBeGreaterThanOrEqual(B.LOD_DISTANCE);
      const m = R.MODELS.find((x) => x.ref === `species:${sp}`);
      expect(t(d.lod()), sp).toBeLessThanOrEqual(m.budget?.lod ?? B.LOD_SEUIL);
    }
  });
});

describe('usage des modèles', () => {
  const refs = () => new Set(R.MODELS.map((m) => m.ref));

  it('recense tout ce que construisent les îles de l’archipel et l’île d’essai (végétation, lieux, curiosités, chemins, faune)', async () => {
    const { ILES } = await import('../src/world/islands/regions.js');
    const { ILE_ESSAI } = await import('./fixtures/ile-essai.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { KINDS, STRIDE } = await import('../src/world/islands/gen/kinds.js');
    const used = new Set();
    for (const d of [...ILES, ILE_ESSAI]) {
      const p = buildPlan(d);
      for (let k = 0; k < p.items.length; k += STRIDE) used.add(`kind:${KINDS[p.items[k]]}`);
      for (const poi of p.pois) for (const q of poi.parts || []) used.add(`part:${q.t}`);
      for (const q of p.micro) used.add(`part:${q.t}`);
      for (const q of p.pathParts) used.add(`part:${q.t}`);
      for (const s of p.spawners) used.add(`species:${s.sp}`);
    }
    expect(used.size).toBeGreaterThan(40);
    const known = refs();
    const missing = [...used].filter((r) => !known.has(r));
    expect(missing).toEqual([]);
  });

  it('couvre les tables du jeu : espèces, bateaux, décor, trésors, mer, faune, coupes, tenues, outils', async () => {
    const { KINDS } = await import('../src/world/islands/gen/kinds.js');
    const { SPECIES } = await import('../src/models/animaux/index.js');
    const { BOATS } = await import('../src/models/bateaux/index.js');
    const { CATALOG } = await import('../src/models/decor/index.js');
    const { KINDS: TREASURES } = await import('../src/gameplay/collectibles.js');
    const { MARINE_TYPES } = await import('../src/models/objets/index.js');
    const { HAIRS, PIECES } = await import('../src/entities/character/avatar.js');
    const { OUTILS } = await import('../src/models/personnage/index.js');
    const need = [
      ...KINDS.map((k) => `kind:${k}`),
      ...Object.keys(SPECIES).map((k) => `species:${k}`),
      ...Object.keys(BOATS).map((k) => `boat:${k}`),
      ...Object.keys(CATALOG).map((k) => `decor:${k}`),
      ...Object.keys(TREASURES).map((k) => `collect:${k}`),
      ...MARINE_TYPES.map((k) => `marine:${k}`),
      ...Object.keys(HAIRS).map((k) => `hair:${k}`),
      ...Object.keys(PIECES).map((k) => `piece:${k}`),
      'faune:mouette', 'faune:crabe', 'faune:papillon', 'hibou', 'albatros', 'avatar', 'crayon', 'flotteur',
      ...['chaumiere', 'bibliotheque', 'bureauEtude', 'grandArbre', 'ponton', 'pontRiviere', 'echoppe', 'parasol', 'panneauPlace', 'bancBois', 'lanterneJardin', 'pupitreHibou', 'lavandeGeante', 'archeGlycine'].map((k) => `ile:${k}`),
    ];
    const known = refs();
    expect(need.filter((r) => !known.has(r))).toEqual([]);
    // chaque outil du jeu est une variante de PER-025
    const outils = R.BY_ID.get('PER-025').variants.map((v) => v.params.outil);
    expect(outils).toEqual(OUTILS);
  });

  it('couvre chaque élément de lieu que sait construire le jeu', async () => {
    const { TYPES_DE_LIEUX } = await import('../src/models/lieux.js');
    expect(TYPES_DE_LIEUX).toHaveLength(62);
    const known = refs();
    expect(TYPES_DE_LIEUX.map((t) => `part:${t}`).filter((r) => !known.has(r))).toEqual([]);
  });
});

describe('ongulés refaits (mouton, chèvre, vache, cerf)', () => {
  // gabarit visé (L × H × P, m, échelle comprise), entrée du registre, hauteur maximale du museau en
  // broutant, budget de triangles (mouton et vache, refaits d'après leur planche, ont droit à 10 000 :
  // boucles de laine, peaux d'un seul tenant vues de près ; le cerf, repris d'après sa description, à 6 000 ;
  // au loin, une version allégée) ; exact :
  // nombre de triangles figé (géométrie inchangée)
  const ONGULES = {
    mouton: { size: [0.5, 0.9, 1.12], id: 'ANI-001', graze: 0.12, tris: 10000 },
    chevre: { size: [0.6, 1.05, 1.2], id: 'ANI-002', graze: 0.12, tris: 1500, exact: 1096 },
    vache: { size: [0.9, 1.6, 1.85], id: 'ANI-003', graze: 0.12, tris: 10000 },
    cerf: { size: [0.8, 2.0, 1.7], id: 'ANI-004', graze: 0.12, tris: 6000 },
  };
  // matrices des pièces pour une part de broutage k (0 : tête portée, 1 : museau dans l'herbe), comme
  // le jeu : la tête (ou le cou) plie jusqu'à graze, la tête portée par un cou jusqu'à nod
  const pose = (THREE, parts, def, k) => {
    const out = [];
    for (const p of parts) {
      const a = p.anim === 'neck' ? k * def.graze : p.anim === 'head' ? k * (p.parent != null ? def.nod ?? 0 : def.graze) : 0;
      const m = new THREE.Matrix4().makeTranslation(...p.pivot).multiply(new THREE.Matrix4().makeRotationX(a));
      if (p.parent != null) m.premultiply(out[p.parent]);
      out.push(m);
    }
    return out;
  };
  // boîte exacte d'une pièce placée par m (par défaut : à son pivot, au repos)
  const partBox = (THREE, p, m = new THREE.Matrix4().makeTranslation(...p.pivot)) => {
    const pos = p.geo.attributes.position;
    const v = new THREE.Vector3();
    const b = new THREE.Box3();
    for (let i = 0; i < pos.count; i++) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m));
    return b;
  };

  it('posent quatre sabots bien répartis au sol et tiennent le budget (9 pièces, triangles)', async () => {
    const { SPECIES } = await import('../src/models/animaux/index.js');
    for (const [sp, o] of Object.entries(ONGULES)) {
      const def = SPECIES[sp];
      const parts = def.parts();
      expect(parts.length, sp).toBeLessThanOrEqual(9);
      const tris = parts.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0);
      expect(tris, sp).toBeLessThanOrEqual(o.tris);
      if (o.exact) expect(tris, `${sp} : géométrie modifiée`).toBe(o.exact);
      const legs = parts.filter((p) => p.anim === 'leg');
      expect(legs, sp).toHaveLength(4);
      for (const l of legs) expect(Math.abs(partBox(THREE, l).min.y * def.scale), sp).toBeLessThanOrEqual(0.01);
      // quatre sabots bien répartis : deux à l'avant, deux à l'arrière, écartés d'au moins la
      // moitié de la longueur du corps, jamais l'un sur l'autre
      const feet = legs.map((l) => {
        const b = partBox(THREE, l);
        return [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2];
      });
      const body = partBox(THREE, parts[0]);
      expect(feet.filter(([, z]) => z > 0), sp).toHaveLength(2);
      expect(feet.filter(([, z]) => z < 0), sp).toHaveLength(2);
      expect(Math.min(...feet.filter(([, z]) => z > 0).map(([, z]) => z)) - Math.max(...feet.filter(([, z]) => z < 0).map(([, z]) => z)), sp).toBeGreaterThan(0.5 * (body.max.z - body.min.z));
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.hypot(feet[i][0] - feet[j][0], feet[i][1] - feet[j][1]) * def.scale, `${sp} sabots ${i} et ${j}`).toBeGreaterThan(0.15);
    }
  });

  it('gardent la tête attachée au corps, par le cou s’il y en a un, et broutent l’herbe (museau près du sol)', async () => {
    const { SPECIES } = await import('../src/models/animaux/index.js');
    for (const [sp, o] of Object.entries(ONGULES)) {
      const def = SPECIES[sp];
      const parts = def.parts();
      // une pièce portée l'est par une pièce qui la précède (le jeu chaîne les matrices dans l'ordre)
      parts.forEach((p, i) => p.parent != null && expect(p.parent, sp).toBeLessThan(i));
      const hi = parts.findIndex((p) => p.anim === 'head');
      const head = parts[hi];
      for (const k of [0, 0.5, 1]) {
        const m = pose(THREE, parts, def, k);
        const body = partBox(THREE, parts[0], m[0]);
        const hb = partBox(THREE, head, m[hi]);
        const holder = head.parent != null ? partBox(THREE, parts[head.parent], m[head.parent]) : body;
        expect(hb.intersectsBox(holder), `${sp} : tête détachée à k = ${k}`).toBe(true);
        expect(holder.intersectsBox(body), `${sp} : cou détaché à k = ${k}`).toBe(true);
        // la tête ne passe pas sous le sol
        expect(hb.min.y * def.scale, `${sp} à k = ${k}`).toBeGreaterThan(-0.01);
      }
      const muzzle = (k) => new THREE.Vector3(...def.muzzle).applyMatrix4(pose(THREE, parts, def, k)[hi]).y * def.scale;
      expect(muzzle(1), sp).toBeLessThan(o.graze);
      expect(muzzle(1), sp).toBeGreaterThan(0);
      // au repos, la tête est portée bien plus haut
      expect(muzzle(0), sp).toBeGreaterThan(0.45);
    }
  });

  it('font sortir les pattes de la vache du dessous du corps, jamais du flanc', async () => {
    const { SPECIES } = await import('../src/models/animaux/index.js');
    const def = SPECIES.vache;
    const parts = def.parts();
    // enveloppe du corps : les surfaces de son union lisse (tonneau, croupe, épaules, poitrail, ventre,
    // cuisses, avant-bras ; { c, rad, n } : |x|^n + |y|^n + |z|^n = 1). L'union lisse les contient toutes :
    // un point hors de toutes est hors du corps ou dans un raccord, d'où un test au moins aussi strict
    const shells = parts[0].shell;
    expect(shells.length).toBeGreaterThan(0);
    const F = (e, q) => e.rad.reduce((a, r, i) => a + Math.abs((q[i] - e.c[i]) / r) ** e.n, 0);
    const bottomAt = (x, z) => Math.min(...shells.map((e) => {
      const q = Math.abs((x - e.c[0]) / e.rad[0]) ** e.n + Math.abs((z - e.c[2]) / e.rad[2]) ** e.n;
      return q >= 1 ? Infinity : e.c[1] - e.rad[1] * (1 - q) ** (1 / e.n);
    }));
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const q = new THREE.Vector3();
    for (const l of parts.filter((p) => p.anim === 'leg')) {
      // point le plus haut de la patte (arêtes échantillonnées) hors de l'enveloppe, au repos
      const pos = l.geo.attributes.position;
      let top = -Infinity;
      for (let t = 0; t < pos.count; t += 3) {
        for (let e = 0; e < 3; e++) {
          a.fromBufferAttribute(pos, t + e);
          b.fromBufferAttribute(pos, t + ((e + 1) % 3));
          for (let k = 0; k <= 8; k++) {
            q.copy(a).lerp(b, k / 8).add(new THREE.Vector3(...l.pivot));
            if (q.y > top && shells.every((s) => F(s, q.toArray()) > 1)) top = q.y;
          }
        }
      }
      // moins de 3 cm au-dessus du bas du ventre à l'aplomb de la hanche
      expect((top - bottomAt(l.pivot[0], l.pivot[2])) * def.scale).toBeLessThan(0.03);
    }
  });

  it('ont une version allégée (au loin) aux mêmes pièces, nettement plus légère', async () => {
    const { SPECIES } = await import('../src/models/animaux/index.js');
    const tri = (parts) => parts.reduce((a, p) => a + (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3, 0);
    for (const [sp, def] of Object.entries(SPECIES)) {
      if (!def.lod) continue;
      const hi = def.parts();
      const lo = def.lod();
      // le jeu réutilise les matrices de la version fine : mêmes pièces, pivots, animations, parents
      expect(lo.length, sp).toBe(hi.length);
      lo.forEach((p, i) => {
        expect(p.anim, sp).toBe(hi[i].anim);
        expect(p.parent, sp).toBe(hi[i].parent);
        expect(p.pivot, sp).toEqual(hi[i].pivot);
      });
      expect(tri(lo), sp).toBeLessThanOrEqual(3400);
      expect(tri(lo), sp).toBeLessThan(tri(hi) * 0.4);
    }
  });

  it('ont la taille du gabarit (±15 %) et une variante par robe', () => {
    for (const o of Object.values(ONGULES)) {
      const m = R.BY_ID.get(o.id);
      const { object3d } = m.build(R.defaultParams(m));
      const r = measure(object3d);
      r.size.forEach((s, a) => expect(Math.abs(s - o.size[a]) / o.size[a], `${o.id} axe ${'xyz'[a]} : ${s.toFixed(2)} m`).toBeLessThanOrEqual(0.15));
      expect(m.variants.length, o.id).toBeGreaterThanOrEqual(2);
    }
  });
});
