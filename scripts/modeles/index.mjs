// Index des modèles : recense les dossiers de modèle (src/models/<catégorie>/<dossier>/index.js) et écrit
//   src/models/index.gen.js     toutes les fiches, avec leur fichier source (lu par le registre)
//   src/models/physique.gen.js  l'encombrement de chaque espèce de la végétation, lu dans le physique.js de
//                               son dossier (module pur : le Worker le lit par world/islands/gen/kinds.js)
//   npm run modeles:index                        réécrit les deux fichiers
//   node scripts/modeles/index.mjs --verifier    vérifie qu'ils sont à jour (code de sortie 1 sinon)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODELES = path.join(RACINE, 'src/models');
export const INDEX = path.join(MODELES, 'index.gen.js');
export const PHYSIQUE = path.join(MODELES, 'physique.gen.js');
// dossiers de catégorie, dans l'ordre du registre
export const CATEGORIES = ['arbres', 'plantes', 'rochers', 'batiments', 'ouvrages', 'monuments', 'bateaux', 'decor', 'objets', 'animaux', 'personnage'];

// dossiers de modèle « catégorie/dossier » (ceux qui ont un index.js), triés
export function dossiers() {
  const out = [];
  for (const cat of CATEGORIES) {
    const dir = path.join(MODELES, cat);
    if (!fs.existsSync(dir)) continue;
    for (const d of fs.readdirSync(dir).sort()) if (fs.existsSync(path.join(dir, d, 'index.js'))) out.push(`${cat}/${d}`);
  }
  return out;
}

const nom = (d) => d.replace(/[^a-z0-9]+/gi, '_');
export function indexGenere(list = dossiers()) {
  return [
    '// Généré par « npm run modeles:index » (scripts/modeles/index.mjs) : ne pas modifier à la main.',
    '// Une entrée par dossier de modèle : sa fiche (ou celles de sa famille), avec son fichier source.',
    ...list.map((d) => `import ${nom(d)} from './${d}/index.js';`),
    '',
    '// source : fichier de la fiche ; physique : son physique.js, quand le dossier en a un',
    'const avec = (f, source, physique) => (Array.isArray(f) ? f : [f]).map((m) => ({ source, ...(physique && { physique }), ...m }));',
    '',
    'export const FICHES = [',
    ...list.map((d) => `  ...avec(${nom(d)}, 'src/models/${d}/index.js'${fs.existsSync(path.join(MODELES, d, 'physique.js')) ? `, 'src/models/${d}/physique.js'` : ''}),`),
    '];',
    '',
  ].join('\n');
}

// fiches d'un dossier (export par défaut de son index.js : une fiche, ou une liste pour une famille)
// (sous vitest, chemin absolu : l'URL file:// encode l'espace du dossier et n'est pas résolue)
const url = (f) => (process.env.VITEST ? f : pathToFileURL(f).href);
export async function fichesDe(d) {
  const f = (await import(url(path.join(MODELES, d, 'index.js')))).default;
  return { famille: Array.isArray(f), fiches: Array.isArray(f) ? f : [f] };
}

// encombrement des espèces : pour chaque fiche « kind:espèce » d'un dossier qui a un physique.js
export async function physiqueGeneree(list = dossiers()) {
  if (!globalThis.document) {
    const { installCanvasStub } = await import(url(path.join(RACINE, 'tests/helpers/canvas.js')));
    installCanvasStub();
  }
  const lignes = [];
  const imports = [];
  const especes = [];
  for (const d of list) {
    if (!fs.existsSync(path.join(MODELES, d, 'physique.js'))) continue;
    const { famille, fiches } = await fichesDe(d);
    const kinds = fiches.filter((m) => m.ref?.startsWith('kind:')).map((m) => [m.id, m.ref.slice(5)]);
    if (!kinds.length) continue;
    imports.push(`import ${nom(d)} from './${d}/physique.js';`);
    for (const [id, k] of kinds) especes.push([id, `  ${k}: ${nom(d)}${famille ? `.${k}` : ''}.encombrement,`]);
  }
  especes.sort(([a], [b]) => (CATEGORIES.indexOf(PREF[a.slice(0, 3)]) - CATEGORIES.indexOf(PREF[b.slice(0, 3)])) || a.localeCompare(b));
  lignes.push(
    '// Généré par « npm run modeles:index » (scripts/modeles/index.mjs) : ne pas modifier à la main.',
    '// Encombrement (m) de chaque espèce de la végétation, lu dans le physique.js de son dossier. Module pur,',
    '// sans Three : le Worker le lit (world/islands/gen/kinds.js).',
    ...imports,
    '',
    'export const ENCOMBREMENT = {',
    ...especes.map(([, l]) => l),
    '};',
    '',
  );
  return lignes.join('\n');
}
const PREF = { ARB: 'arbres', PLA: 'plantes', ROC: 'rochers', BAT: 'batiments', STR: 'ouvrages', MON: 'monuments', NAV: 'bateaux', DEC: 'decor', OBJ: 'objets', ANI: 'animaux', PER: 'personnage' };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const fichiers = [[INDEX, indexGenere()], [PHYSIQUE, await physiqueGeneree()]];
  const n = dossiers().length;
  if (process.argv[2] === '--verifier') {
    let ok = true;
    for (const [f, attendu] of fichiers) {
      const actuel = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
      if (actuel !== attendu) {
        console.log(`${path.relative(RACINE, f)} n'est pas à jour : lancer npm run modeles:index`);
        ok = false;
      }
    }
    if (!ok) process.exit(1);
    console.log(`index à jour (${n} dossiers)`);
  } else {
    for (const [f, contenu] of fichiers) fs.writeFileSync(f, contenu);
    console.log(`${n} dossiers de modèle → ${fichiers.map(([f]) => path.relative(RACINE, f)).join(', ')}`);
  }
}
