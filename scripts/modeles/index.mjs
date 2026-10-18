// Index des modèles : recense les dossiers de modèle (src/models/<catégorie>/<dossier>/index.js) et
// écrit src/models/index.gen.js, que lit le registre : toutes les fiches, avec leur fichier source.
//   npm run modeles:index                        réécrit l'index
//   node scripts/modeles/index.mjs --verifier    vérifie qu'il est à jour (code de sortie 1 sinon)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODELES = path.join(RACINE, 'src/models');
export const INDEX = path.join(MODELES, 'index.gen.js');
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
    'const avec = (f, source) => (Array.isArray(f) ? f : [f]).map((m) => ({ source, ...m }));',
    '',
    'export const FICHES = [',
    ...list.map((d) => `  ...avec(${nom(d)}, 'src/models/${d}/index.js'),`),
    '];',
    '',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const attendu = indexGenere();
  const n = dossiers().length;
  if (process.argv[2] === '--verifier') {
    const actuel = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
    if (actuel !== attendu) {
      console.log('src/models/index.gen.js n\'est pas à jour : lancer npm run modeles:index');
      process.exit(1);
    }
    console.log(`index à jour (${n} dossiers)`);
  } else {
    fs.writeFileSync(INDEX, attendu);
    console.log(`${n} dossiers de modèle → ${path.relative(RACINE, INDEX)}`);
  }
}
