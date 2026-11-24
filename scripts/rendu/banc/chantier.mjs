// Chantiers de rendu en ligne de commande (docs/RENDU.md) : ouvre un chantier, le fait avancer d'un état
// (événement vérifié et chaîné dans production/journal.jsonl), calcule les portes de qualité.
//   node scripts/rendu/banc/chantier.mjs statut [REN-001]
//   node scripts/rendu/banc/chantier.mjs ouvrir REN-001 --titre "…" --brief "…" --metrique ombre_soleil
//        --sens -1 --gain 0.03 --cadrages gameplay,face-soleil --criteres lumiere,ombres [--modele ARB-001]
//   node scripts/rendu/banc/chantier.mjs etat REN-001 AUDIT --acteur qa-visuelle --donnees audit.json
//   node scripts/rendu/banc/chantier.mjs portes REN-001 --avant r1-avant --apres r1-apres
//        [--critique critique.json] [--sans-tests]      → captures/banc/<après>/portes.json
// Les mesures viennent du banc : captures/banc/<série>/manifeste.json (GPU, rejets) et comparaison.json
// (metriques.py compare). Un état refusé par la machine (rendu.js) n'écrit rien.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ajouter, charger, RACINE } from '../../production/depot.mjs';
import { vitest } from '../../production/controles.mjs';
import { evaluerPortes, SUIVANTS } from '../../../src/production/rendu.js';

const BANC = path.join(RACINE, 'captures/banc');
const lire = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function options(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const k = args[i].slice(2);
      const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      o[k] = v;
    } else o._.push(args[i]);
  }
  return o;
}

export function statut(id) {
  const { etat } = charger();
  const liste = id ? [etat.rendu.get(id)].filter(Boolean) : [...etat.rendu.values()];
  return liste.map((c) => ({
    chantier: c.chantier_id, titre: c.titre, etat: c.etat, iterations: c.iterations,
    suivants: SUIVANTS[c.etat], portes: c.portes && Object.fromEntries(Object.entries(c.portes).map(([k, v]) => [k, v.verdict])),
    dernier: c.historique.at(-1),
  }));
}

export function ouvrir(id, o) {
  const donnees = {
    chantier_id: id, titre: o.titre, brief: o.brief,
    critere: { metrique: o.metrique, sens: Number(o.sens || 1), gainMin: Number(o.gain || 0) },
    cadrages_vises: o.cadrages ? String(o.cadrages).split(',') : [],
    criteres_touches: o.criteres ? String(o.criteres).split(',') : [],
    modele: o.modele || null,
  };
  return ajouter([{ type: 'rendu.chantier.ouvert', acteur: o.acteur || 'orchestrateur', cle: `rendu.ouvert:${id}`, donnees }]).ajoutes;
}

export function avancer(id, vers, o) {
  const { etat } = charger();
  const c = etat.rendu.get(id);
  const extra = o.donnees ? lire(path.resolve(o.donnees)) : {};
  const donnees = { ...extra, chantier_id: id, vers };
  // clé : un même passage relancé à l'identique n'écrit rien (reprise après interruption)
  const cle = `rendu.etat:${id}:${c ? c.historique.length : 0}:${vers}`;
  return ajouter([{ type: 'rendu.etat', acteur: o.acteur || 'orchestrateur', cle, donnees }]).ajoutes;
}

// modèles dont l'empreinte a changé par rapport à la référence versionnée
async function empreintesChangees() {
  const { calculer, ecarts, REFERENCE } = await import('../../modeles/empreinte.mjs');
  const ref = lire(REFERENCE);
  const e = JSON.parse(JSON.stringify(await calculer()));
  const ids = new Set();
  for (const d of ecarts(ref, e)) {
    const m = d.match(/^(?:modeles|fiches|physique)\.([A-Z]{3}-\d{3})/);
    if (m) ids.add(m[1]);
    else ids.add(d.split(' : ')[0].split('.').slice(0, 2).join('.'));
  }
  return [...ids];
}

export async function portes(id, o) {
  const { etat } = charger();
  const c = etat.rendu.get(id);
  if (!c) throw new Error(`chantier inconnu : ${id}`);
  // comparaison avant / après (métriques et SSIM par zone)
  execFileSync('python3', [path.join(RACINE, 'scripts/rendu/banc/metriques.py'), 'compare', o.avant, o.apres], { stdio: 'ignore' });
  const comparaison = lire(path.join(BANC, o.apres, 'comparaison.json'));
  const manifeste = lire(path.join(BANC, o.apres, 'manifeste.json'));
  const gpu = Object.fromEntries(Object.entries(manifeste.cadrages).map(([k, v]) => [k, v.gpu ? { postes: v.gpu.postes, verdict: v.gpu.verdict } : null]));
  let tests = null;
  if (!o['sans-tests']) {
    const r = await vitest(RACINE);
    const acceptes = lire(path.join(RACINE, 'production/echecs-connus.json')).echecs.map((e) => e.test);
    tests = { lance: r.lance, total: r.total, echecs: (r.echecs || []).map((e) => e.test), acceptes };
  }
  const empreintes = await empreintesChangees();
  const critique = o.critique ? lire(path.resolve(o.critique)) : null;
  const res = evaluerPortes({ chantier: c, comparaison, gpu, tests, empreintes, critique });
  if (manifeste.rejets?.length) res.portes.metriques = { verdict: 'echec', details: `captures rejetées : ${manifeste.rejets.map((r) => r.nom).join(', ')}` };
  const out = { chantier_id: id, avant: o.avant, apres: o.apres, ...res, tests, empreintes };
  fs.writeFileSync(path.join(BANC, o.apres, 'portes.json'), JSON.stringify(out, null, 2));
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = options(rest);
  const [id, vers] = o._;
  const affiche = (v) => console.log(JSON.stringify(v, null, 2));
  try {
    if (cmd === 'statut') affiche(statut(id));
    else if (cmd === 'ouvrir') affiche(ouvrir(id, o));
    else if (cmd === 'etat') affiche(avancer(id, vers, o));
    else if (cmd === 'portes') affiche(await portes(id, o));
    else {
      console.log('usage : chantier.mjs statut [id] | ouvrir <id> … | etat <id> <ÉTAT> … | portes <id> --avant <série> --apres <série>');
      process.exitCode = 2;
    }
  } catch (err) {
    console.error(`refusé : ${err.message}`);
    process.exitCode = 1;
  }
}
