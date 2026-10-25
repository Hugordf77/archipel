// Contrôles automatiques du workflow (Node) : déterministes, exécutés sur les livrables d'une tâche
// selon sa validation_method. Chaque contrôle rend { controle, statut, detail, commande? } ; un
// contrôle inconnu ou impossible à lancer est « non_execute », jamais « reussi ».
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { BIOMES } from '../../src/world/islands/biomes.js';
import { verifierFiche, verifierInventaire, verifierRapportIntegration, cheminSur } from '../../src/production/contrats.js';
import { empreinteFichier, lireJSON } from './depot.mjs';

const r = (controle, statut, detail, commande) => ({ controle, statut, detail, ...(commande ? { commande } : {}) });

// identifiants du catalogue : clés de TAILLES dans releves.gen.js (généré depuis le registre)
export function idsCatalogue(racine) {
  const src = fs.readFileSync(path.join(racine, 'src/models/releves.gen.js'), 'utf8');
  const bloc = src.slice(src.indexOf('export const TAILLES'), src.indexOf('export const USAGE'));
  return new Set([...bloc.matchAll(/'([A-Z]{3}-\d{3})'/g)].map((m) => m[1]));
}

function lancer(cmd, args, racine, delai = 600000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: racine, env: { ...process.env, FORCE_COLOR: '0' } });
    let sortie = '';
    const minuteur = setTimeout(() => p.kill('SIGKILL'), delai);
    p.stdout.on('data', (d) => { sortie += d; });
    p.stderr.on('data', (d) => { sortie += d; });
    p.on('error', (err) => { clearTimeout(minuteur); resolve({ code: -1, sortie: String(err) }); });
    p.on('close', (code) => { clearTimeout(minuteur); resolve({ code, sortie }); });
  });
}

// Vitest avec rapport JSON : échecs par nom complet
export async function vitest(racine, fichiersTests = []) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prod-vitest-')), 'r.json');
  const args = ['vitest', 'run', ...fichiersTests, '--reporter=json', `--outputFile=${out}`];
  const { code, sortie } = await lancer('npx', args, racine);
  if (!fs.existsSync(out)) return { lance: false, code, sortie: sortie.slice(-2000), commande: `npx ${args.slice(0, -2).join(' ')}` };
  const j = lireJSON(out);
  const echecs = j.testResults.flatMap((f) => f.assertionResults.filter((a) => a.status === 'failed').map((a) => ({ fichier: path.relative(racine, f.name), test: a.fullName })));
  return { lance: true, code, total: j.numTotalTests, reussis: j.numPassedTests, echecs, fichiers: j.numTotalTestSuites, commande: `npx vitest run ${fichiersTests.join(' ')}`.trim() };
}

export async function executerControles(tache, etat, ctx, racine, { controles = tache.validation_method.controles, tests = tache.validation_method.tests || [] } = {}) {
  const zone = ctx.zoneParId.get(tache.zone_id);
  const role = ctx.roleParId.get(tache.assigned_agent);
  const livrables = tache.expected_deliverables.map((d) => d.path);
  const abs = (p) => path.join(racine, p);
  const resultats = [];
  const empreintes = {};
  for (const p of livrables) if (fs.existsSync(abs(p))) empreintes[p] = empreinteFichier(abs(p));

  for (const c of controles) {
    try {
      if (c === 'fichiers') {
        const absents = livrables.filter((p) => !fs.existsSync(abs(p)));
        resultats.push(absents.length ? r(c, 'echoue', `livrables absents : ${absents.join(', ')}`) : r(c, 'reussi', `${livrables.length} livrable(s) présent(s)`));
      } else if (c === 'json') {
        const fautifs = [];
        for (const p of livrables.filter((x) => x.endsWith('.json'))) {
          try { lireJSON(abs(p)); } catch (err) { fautifs.push(`${p} (${err.message})`); }
        }
        resultats.push(fautifs.length ? r(c, 'echoue', `JSON invalide : ${fautifs.join(' ; ')}`) : r(c, 'reussi', 'JSON lisible'));
      } else if (c === 'perimetre') {
        const rapport = tache.rapports.at(-1);
        const chemins = [...livrables, ...(rapport?.fichiers || []).map((f) => f.path)];
        const hors = chemins.filter((p) => !cheminSur(p) || !role.chemins_autorises.some((a) => p === a || p.startsWith(a)));
        resultats.push(hors.length ? r(c, 'echoue', `hors du périmètre de ${role.id} : ${hors.join(', ')}`) : r(c, 'reussi', `${chemins.length} chemin(s) dans le périmètre de ${role.id}`));
      } else if (c === 'fiche-zone') {
        const p = livrables.find((x) => x.startsWith('production/fiches/'));
        const fiche = lireJSON(abs(p));
        const e = verifierFiche(fiche, zone, { biomes: Object.keys(BIOMES), zones: ctx.zones.map((z) => z.id) });
        // les sources citées par les éléments attestés existent
        for (const l of ['acces', 'sorties', 'points_interet', 'reperes'].flatMap((k) => fiche[k] || [])) {
          const src = l.statut === 'atteste' && l.source?.split(/[ :#]/)[0];
          if (src && !fs.existsSync(abs(src))) e.push(`source introuvable : ${l.source}`);
        }
        resultats.push(e.length ? r(c, 'echoue', e.join(' ; ')) : r(c, 'reussi', 'fiche conforme au schéma fiche-zone'));
      } else if (c === 'references-catalogue') {
        const p = livrables.find((x) => x.startsWith('production/assets/'));
        const inv = lireJSON(abs(p));
        const e = verifierInventaire(inv, zone, idsCatalogue(racine));
        for (const m of inv.manquants || []) if (m.statut === 'produit' && !fs.existsSync(abs(m.chemin))) e.push(`asset annoncé produit mais absent : ${m.chemin}`);
        resultats.push(e.length ? r(c, 'echoue', e.join(' ; ')) : r(c, 'reussi', `${inv.existants.length} référence(s) au catalogue résolue(s), ${inv.manquants.length} manque(s) spécifié(s)`));
      } else if (c === 'tests') {
        const absents = tests.filter((t) => !fs.existsSync(abs(t)));
        if (absents.length) { resultats.push(r(c, 'echoue', `fichiers de test absents : ${absents.join(', ')}`)); continue; }
        const v = await vitest(racine, tests);
        if (!v.lance) resultats.push(r(c, 'non_execute', `Vitest n’a pas produit de rapport (code ${v.code}) : ${v.sortie}`, v.commande));
        else if (!v.total) resultats.push(r(c, 'echoue', 'aucun test exécuté', v.commande));
        else resultats.push(v.echecs.length ? r(c, 'echoue', `${v.echecs.length} échec(s) : ${v.echecs.map((x) => x.test).join(' ; ')}`, v.commande) : r(c, 'reussi', `${v.reussis}/${v.total} tests réussis`, v.commande));
      } else if (c === 'suite') {
        const connus = fs.existsSync(path.join(racine, 'production/echecs-connus.json')) ? lireJSON(path.join(racine, 'production/echecs-connus.json')).echecs : [];
        const v = await vitest(racine);
        if (!v.lance) { resultats.push(r(c, 'non_execute', `Vitest n’a pas produit de rapport (code ${v.code})`, 'npx vitest run')); continue; }
        const nouveaux = v.echecs.filter((x) => !connus.some((k) => k.test === x.test));
        const connusVus = v.echecs.length - nouveaux.length;
        resultats.push(nouveaux.length
          ? r(c, 'echoue', `${nouveaux.length} nouvel(s) échec(s) : ${nouveaux.map((x) => `${x.fichier} › ${x.test}`).join(' ; ')}`, 'npx vitest run')
          : r(c, 'reussi', `${v.reussis}/${v.total} réussis ; ${connusVus} échec(s) connu(s) (production/echecs-connus.json), aucun nouveau`, 'npx vitest run'));
      } else if (c === 'build') {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-build-'));
        const b = await lancer('npx', ['vite', 'build', '--outDir', dir, '--emptyOutDir'], racine);
        resultats.push(b.code === 0 ? r(c, 'reussi', 'build réussi', 'npx vite build') : r(c, 'echoue', b.sortie.slice(-1500), 'npx vite build'));
      } else {
        resultats.push(r(c, 'non_execute', 'contrôle inconnu de controles.mjs'));
      }
    } catch (err) {
      resultats.push(r(c, 'echoue', `erreur pendant le contrôle : ${err.message}`));
    }
  }
  // le rapport d'intégration est lui-même vérifié quand il fait partie des livrables
  const integ = livrables.find((x) => x.startsWith('production/integration/'));
  if (integ && fs.existsSync(abs(integ)) && controles.includes('json')) {
    try {
      const e = verifierRapportIntegration(lireJSON(abs(integ)), zone);
      if (e.length) resultats.push(r('json', 'echoue', `rapport d’intégration : ${e.join(' ; ')}`));
    } catch { /* déjà signalé par le contrôle json */ }
  }
  return { controles: resultats, empreintes };
}
