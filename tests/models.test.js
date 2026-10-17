// Registre des modèles 3D : identifiants, constructions (non vides, sans NaN, à la taille
// déclarée) et couverture de tout ce que le jeu construit (recensement sur des îles générées
// et sur les tables du jeu).
import { describe, it, expect, beforeAll } from 'vitest';
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
    o.geometry.computeBoundingBox();
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

describe('usage des modèles', () => {
  const refs = () => new Set(R.MODELS.map((m) => m.ref));

  it('recense tout ce que construisent les îles de l’archipel (végétation, lieux, curiosités, chemins, faune)', async () => {
    const { ISLANDS } = await import('../src/world/islands/regions.js');
    const { buildPlan } = await import('../src/world/islands/gen/plan.js');
    const { KINDS, STRIDE } = await import('../src/world/islands/gen/kinds.js');
    const used = new Set();
    for (const d of ISLANDS) {
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
    const { SPECIES } = await import('../src/models/animals/especes.js');
    const { BOATS } = await import('../src/models/boats/bateaux.js');
    const { CATALOG } = await import('../src/models/decor/catalogue.js');
    const { KINDS: TREASURES } = await import('../src/gameplay/collectibles.js');
    const { MARINE_TYPES } = await import('../src/models/props/objets.js');
    const { HAIRS, PIECES } = await import('../src/entities/character/avatar.js');
    const { OUTILS } = await import('../src/models/props/outils.js');
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
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../src/models/structures/lieux.js', import.meta.url), 'utf8');
    const cases = [...src.matchAll(/case '(\w+)'/g)].map((m) => m[1]);
    const micro = [...src.slice(src.indexOf('const MICRO')).matchAll(/^ {2}(\w+): \(\) =>/gm)].map((m) => m[1]);
    expect(cases.length).toBeGreaterThan(35);
    expect(micro.length).toBe(16);
    const known = refs();
    expect([...cases, ...micro].map((t) => `part:${t}`).filter((r) => !known.has(r))).toEqual([]);
  });
});
