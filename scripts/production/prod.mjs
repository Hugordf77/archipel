// Ligne de commande du workflow de production : npm run prod -- <commande> [arguments] [--option valeur]
// Toutes les écritures passent par le journal (production/journal.jsonl) ; la carte de chantier du
// dashboard (/dashboard.html#chantier) se met à jour d'elle-même.
//
//   etat [ZONE]                         bilan du monde ou d'une zone
//   verifier                            intégrité du journal et des données (code 1 en cas d'erreur)
//   audit                               constats d'audit initial (zones reliées au jeu)
//   chantier ZONE [--titre …]           objectif + plan de tâches + tâches prêtes
//   avancer                             prépare les tâches débloquées, clôt les tâches acceptées
//   brief TASK                          brief à transmettre à l'agent responsable
//   demarrer TASK [--acteur role]       passe la tâche « en cours »
//   rapport fichier.json                rapport d'agent : livrables, contrôles automatiques
//   valider TASK                        relance les contrôles automatiques
//   revue TASK --acteur relecteur --decision accepte|refuse|bloque|humain
//         [--criteres "a ; b"] [--correction …] [--preuves "a ; b"] [--commentaire …]
//   integrer TASK                       intégration et tests post-intégration
//   bloquer TASK --raison …  |  debloquer TASK [--vers backlog|ready]   (humain)
//   perimetre TASK --retirer "ZONE-….C07 ; …" --raison …                 (humain)
//   livraison ZONE --decision livrer|refuser --raison …                  (humain)
import fs from 'node:fs';
import path from 'node:path';
import { charger, ajouter, RACINE } from './depot.mjs';
import { constatsAudit } from './audit.mjs';
import * as A from './actions.mjs';
import { bilanZone, bilanMonde } from '../../src/production/completude.js';
import { PRODUCTION, VALIDATION, INTEGRATION } from '../../src/production/statuts.js';

const [cmd, ...reste] = process.argv.slice(2);
const pos = [];
const opt = {};
for (let i = 0; i < reste.length; i++) {
  if (reste[i].startsWith('--')) opt[reste[i].slice(2)] = reste[i + 1] === undefined || reste[i + 1].startsWith('--') ? true : reste[++i];
  else pos.push(reste[i]);
}
const liste = (s) => (typeof s === 'string' ? s.split(';').map((x) => x.trim()).filter(Boolean) : []);
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
const marque = (c) => (c.statut === 'reussi' ? '✓' : c.statut === 'echoue' ? '✗' : '–');

function afficherZone(b, zone) {
  console.log(`${b.icone} ${zone.nom} (${zone.id}) — ${b.label}${b.livrable ? ' · livrable' : ' · non livrable'}`);
  console.log(`  conception ${pct(b.scores.conception)} · production ${pct(b.scores.production)} · jouable ${pct(b.scores.jouable)} · obligatoires ${b.compte.obligatoires_faits}/${b.compte.obligatoires} · optionnels ${b.compte.optionnels_faits}/${b.compte.optionnels}`);
  if (b.bloques.length) console.log(`  bloqué : ${b.bloques.map((x) => `${x.id} (${x.raison})`).join(' ; ')}`);
  if (b.prochain) console.log(`  prochain jalon : ${b.prochain.item} ${b.prochain.titre} → ${b.prochain.agent}${b.prochain.tache ? ` (${b.prochain.tache})` : ' (aucune tâche)'}`);
}

async function main() {
  switch (cmd) {
    case 'etat': {
      const { ctx, etat, integrite, erreurs } = charger();
      if (pos[0]) {
        const zone = ctx.zoneParId.get(pos[0]);
        if (!zone) throw new Error(`zone inconnue : ${pos[0]}`);
        const b = bilanZone(zone, etat, ctx);
        afficherZone(b, zone);
        for (const m of b.manquants) console.log(`  ✗ ${m.item} ${m.titre}${m.critique ? ' [critique]' : ''} — ${m.agent}${m.tache ? ` · ${m.tache}` : ''}`);
        for (const id of b.taches) {
          const t = etat.taches.get(id);
          console.log(`  · ${id} ${t.title} — ${t.assigned_agent} · ${PRODUCTION[t.status]} / ${VALIDATION[t.validation_status]} / ${INTEGRATION[t.integration_status]} · tentatives ${t.retry_count}`);
        }
      } else {
        const m = bilanMonde(etat, ctx);
        m.zones.forEach((b, i) => afficherZone(b, ctx.zones[i]));
        console.log(`\n${m.compte.taches} tâches · ${m.compte.bloquees} bloquées · ${m.compte.manquants} manques obligatoires · ${m.compte.validations_echouees} validations échouées · ${m.compte.zones_jouables} zones jouables`);
      }
      if (integrite.length || erreurs.length) console.log(`\n⚠ intégrité : ${integrite.length} erreur(s) ; événements refusés au rejeu : ${erreurs.length}`);
      break;
    }
    case 'verifier': {
      const { ctx, evenements, integrite, erreurs } = charger();
      const ids = new Set(ctx.zones.map((z) => z.id));
      const donnees = [];
      if (ctx.zones.length !== 20) donnees.push(`${ctx.zones.length} zones au lieu de 20`);
      for (const z of ctx.zones) for (const c of [...z.connexions, ...z.dependances.map((d) => d.zone)]) if (!ids.has(c)) donnees.push(`${z.id} → zone inconnue ${c}`);
      console.log(`${evenements.length} événements · chaîne : ${integrite.length ? 'ROMPUE' : 'intègre'} · refusés au rejeu : ${erreurs.length} · données : ${donnees.length ? donnees.join(' ; ') : 'cohérentes'}`);
      for (const e of [...integrite, ...erreurs]) console.log(`  ✗ ${e.evenement || `ligne ${e.ligne}`} : ${e.erreur}`);
      process.exitCode = integrite.length || erreurs.length || donnees.length ? 1 : 0;
      break;
    }
    case 'audit': {
      const { ctx } = charger();
      const { brouillons, ecarts } = constatsAudit(ctx, RACINE);
      const r = ajouter(brouillons);
      console.log(`${r.ajoutes.length} constat(s) ajouté(s), ${r.ignores.length} déjà présent(s)`);
      for (const e of ecarts) console.log(`  ⚠ ${e}`);
      break;
    }
    case 'chantier': {
      const r = A.lancerChantier({ zone_id: pos[0], title: opt.titre, description: opt.description });
      console.log(`${r.objectif.objective_id} « ${r.objectif.title} »`);
      console.log(`tâches : ${r.taches.join(', ') || 'aucune (rien à faire)'}${r.suspendues.length ? ` · suspendues : ${r.suspendues.join(', ')}` : ''} · événements « prête » : ${r.prets}`);
      for (const c of r.objectif.clarifications) console.log(`  ? ${c}`);
      for (const h of r.objectif.hypotheses) console.log(`  ~ ${h}`);
      break;
    }
    case 'avancer':
      console.log(`${A.avancerTout()} événement(s)`);
      break;
    case 'brief':
      console.log(A.texteBrief(pos[0]));
      break;
    case 'demarrer':
      console.log(`${A.demarrer(pos[0], { acteur: opt.acteur || 'orchestrateur' })} événement(s)`);
      break;
    case 'rapport': {
      const rapport = JSON.parse(fs.readFileSync(path.resolve(pos[0]), 'utf8'));
      const r = await A.soumettreRapport(rapport);
      console.log(`${rapport.task_id} : ${r.statut}`);
      if (r.validation) {
        console.log(`validation ${r.validation.validation_id} : ${r.validation.resultat}`);
        for (const c of r.validation.controles) console.log(`  ${marque(c)} ${c.controle} : ${c.detail}`);
      }
      break;
    }
    case 'valider': {
      const v = await A.lancerValidation(pos[0]);
      console.log(`validation ${v.validation_id} : ${v.resultat}`);
      for (const c of v.controles) console.log(`  ${marque(c)} ${c.controle} : ${c.detail}`);
      break;
    }
    case 'revue': {
      const t = A.decider(pos[0], opt.decision, { criteres_echoues: liste(opt.criteres), correction_attendue: opt.correction, preuves: liste(opt.preuves), commentaire: opt.commentaire }, { acteur: opt.acteur || 'humain' });
      console.log(`${t.task_id} : ${PRODUCTION[t.status]} / ${VALIDATION[t.validation_status]} / ${INTEGRATION[t.integration_status]} · tentatives ${t.retry_count}`);
      break;
    }
    case 'integrer': {
      const r = await A.integrer(pos[0], { acteur: opt.acteur || 'technical-artist' });
      console.log(`${r.integration_id} (${r.version}) : ${r.resultat}`);
      for (const c of r.controles) console.log(`  ${marque(c)} ${c.controle} : ${c.detail}`);
      break;
    }
    case 'bloquer':
      console.log(`${A.evenement('task.blocked', opt.acteur || 'humain', { task_id: pos[0], raison: opt.raison })} événement(s)`);
      break;
    case 'debloquer':
      console.log(`${A.evenement('task.unblocked', 'humain', { task_id: pos[0], vers: opt.vers || 'backlog' })} événement(s)`);
      break;
    case 'perimetre': {
      // humain : réduit le périmètre d'une tâche (éléments retirés et critères correspondants)
      const { etat } = charger();
      const t = etat.taches.get(pos[0]);
      if (!t) throw new Error(`tâche inconnue : ${pos[0]}`);
      const retires = new Set(liste(opt.retirer));
      const items = t.checklist_items.filter((id) => !retires.has(id));
      const criteres = t.acceptance_criteria.filter((c) => ![...retires].some((id) => c.startsWith(`${id} `)));
      console.log(`${A.evenement('task.criteria_changed', 'humain', { task_id: pos[0], acceptance_criteria: criteres, checklist_items: items, raison: opt.raison }, {})} événement(s) ; ${retires.size} élément(s) retiré(s)`);
      break;
    }
    case 'livraison':
      console.log(`${A.evenement('delivery.decided', 'humain', { zone_id: pos[0], decision: opt.decision, raison: opt.raison })} événement(s)`);
      break;
    default:
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exitCode = 1;
});
