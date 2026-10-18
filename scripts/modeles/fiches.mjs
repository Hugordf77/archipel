// Squelettes FICHE.md : crée la fiche de travail de chaque dossier de modèle qui n'en a pas (jamais
// d'écrasement) : identité des modèles, DA retenue, écarts restants, historique, pré-remplis avec les
// statuts et notes du catalogue (catalogue/notes.json).
//   npm run modeles:fiches                 tous les dossiers sans FICHE.md
//   npm run modeles:fiches -- animaux/ours  un seul dossier
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dossiers, fichesDe } from './index.mjs';
import { installCanvasStub } from '../../tests/helpers/canvas.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
installCanvasStub();
const { CATEGORIES, STATUTS, BY_ID } = await import(path.join(RACINE, 'src/models/registry.js'));
const { notes } = JSON.parse(fs.readFileSync(path.join(RACINE, 'catalogue/notes.json'), 'utf8'));

const nombre = (v) => String(v).replace('.', ',');
const jour = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : null);
const aujourdhui = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

export function ficheMd(d, fiches) {
  const [cat] = d.split('/');
  const label = CATEGORIES.find((c) => c.id === cat)?.label || cat;
  const famille = fiches.length > 1;
  const titre = famille ? `${d.split('/')[1].replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())} — ${fiches[0].id} à ${fiches.at(-1).id}` : `${fiches[0].nom} — ${fiches[0].id}`;
  const ref = fs.existsSync(path.join(RACINE, 'src/models', d, 'reference.png'));
  const lignes = fiches.map((f) => {
    const m = BY_ID.get(f.id);
    const statut = STATUTS[notes[f.id]?.status || m.status];
    const b = f.budget ? `${f.budget.triangles.toLocaleString('fr-FR')} triangles${f.budget.lod ? ` (allégé : ${f.budget.lod.toLocaleString('fr-FR')})` : ''}` : '—';
    return `| ${f.id} | ${f.nom} | ${statut} | \`${f.ref}\` | ${m.size.map(nombre).join(' × ')} | ${b} |`;
  });
  const avec = (s) => fiches.filter((f) => notes[f.id]?.note && (notes[f.id].status || 'valide') === s);
  const bloc = (fs_) => fs_.map((f) => `- **${f.id}** (note du ${jour(notes[f.id].updatedAt)}) : ${notes[f.id].note}`);
  const da = bloc(avec('valide'));
  const ecarts = bloc([...avec('a-retravailler'), ...avec('brouillon')]);
  const hist = fiches.filter((f) => notes[f.id]?.updatedAt).map((f) => `- ${jour(notes[f.id].updatedAt)} : ${f.id} ${STATUTS[notes[f.id].status || 'valide'].toLowerCase()} au catalogue.`);
  return [
    `# ${titre}`,
    '',
    `Dossier \`src/models/${d}/\` · ${label} · ${famille ? 'famille' : 'modèle vedette'}${ref ? ' · planche de référence : `reference.png`' : ''}`,
    '',
    '| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |',
    '| --- | --- | --- | --- | --- | --- |',
    ...lignes,
    '',
    '## DA retenue',
    '',
    ...(da.length ? da : ['À écrire : forme, proportions, couleurs et détails retenus pour ce modèle.']),
    '',
    'Règles communes : `docs/DA.md`.',
    '',
    '## Écarts restants',
    '',
    ...(ecarts.length ? ecarts : ['Aucun relevé pour l’instant.']),
    '',
    '## Historique',
    '',
    ...hist,
    `- ${aujourdhui} : fiche créée.`,
    '',
  ].join('\n');
}

const cible = process.argv[2];
let n = 0;
for (const d of cible ? [cible] : dossiers()) {
  const f = path.join(RACINE, 'src/models', d, 'FICHE.md');
  if (fs.existsSync(f)) continue;
  const { fiches } = await fichesDe(d);
  fs.writeFileSync(f, ficheMd(d, fiches));
  n++;
}
console.log(`${n} FICHE.md créée${n > 1 ? 's' : ''}`);
