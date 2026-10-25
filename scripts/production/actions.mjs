// Opérations du workflow, partagées par la ligne de commande (prod.mjs) et le serveur de dev
// (middleware /__production de vite.config.js) : lancer un chantier, enregistrer un rapport et
// déclencher ses contrôles, décider d'une revue, intégrer. Chaque opération écrit dans le journal
// par depot.ajouter() ; les vues (dashboard, carte, checklist) se recalculent depuis le journal.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ajouter, charger, empreinteFichier, RACINE } from './depot.mjs';
import { executerControles } from './controles.mjs';
import { nouvelObjectif, planifier, avancer, brouillonsRapport, brief, slugZone } from '../../src/production/orchestrateur.js';
import { REVUE } from '../../src/production/statuts.js';

const EVT_REVUE = { accepte: 'review.accepted', refuse: 'review.rejected', bloque: 'review.blocked', humain: 'review.human' };

export const avancerTout = ({ racine = RACINE } = {}) => faireAvancer(racine);

function faireAvancer(racine) {
  let total = 0;
  // une tâche terminée peut en rendre d'autres prêtes : on répète jusqu'à stabilité
  for (let i = 0; i < 5; i++) {
    const { etat } = charger(racine);
    const d = avancer(etat);
    if (!d.length) break;
    total += ajouter(d, { racine }).ajoutes.length;
  }
  return total;
}

export function lancerChantier(entree, { racine = RACINE, acteur = 'humain' } = {}) {
  const { etat, ctx } = charger(racine);
  const o = ajouter(nouvelObjectif(etat, ctx, entree, acteur), { racine });
  const objectif = o.ajoutes[0].donnees.objective;
  const p = ajouter(planifier(o.etat, ctx, objectif.objective_id), { racine });
  const prets = faireAvancer(racine);
  return { objectif, taches: p.ajoutes.filter((e) => e.type === 'task.created').map((e) => e.donnees.task.task_id), suspendues: p.ajoutes.filter((e) => e.type === 'task.blocked').map((e) => e.donnees.task_id), prets };
}

export function creerTache(entree, { racine = RACINE, acteur = 'humain' } = {}) {
  const { etat } = charger(racine);
  const n = [...etat.taches.values()].filter((t) => t.zone_id === entree.zone_id).length + 1;
  const task = {
    task_id: `TASK-${slugZone(entree.zone_id)}-${String(n).padStart(3, '0')}`,
    objective_id: entree.objective_id || null, zone_id: entree.zone_id, title: entree.title, description: entree.description,
    assigned_agent: entree.assigned_agent, priority: entree.priority || 'P3', dependencies: entree.dependencies || [],
    input_references: entree.input_references || ['production/zones.json'], expected_deliverables: entree.expected_deliverables,
    acceptance_criteria: entree.acceptance_criteria, validation_method: entree.validation_method, checklist_items: entree.checklist_items || [], retry_count: 0,
  };
  ajouter([{ type: 'task.created', acteur, cle: `task:${task.task_id}:created`, donnees: { task } }], { racine });
  faireAvancer(racine);
  return { task_id: task.task_id };
}

export function demarrer(taskId, { racine = RACINE, acteur = 'orchestrateur' } = {}) {
  const { etat } = charger(racine);
  const t = etat.taches.get(taskId);
  return ajouter([{ type: 'task.started', acteur, cle: `started:${taskId}:${t?.historique.length}`, donnees: { task_id: taskId } }], { racine }).ajoutes.length;
}

export async function lancerValidation(taskId, { racine = RACINE } = {}) {
  const { etat, ctx } = charger(racine);
  const t = etat.taches.get(taskId);
  if (!t) throw new Error(`tâche inconnue : ${taskId}`);
  const vid = `VAL-${taskId.replace(/^TASK-/, '')}-${String(t.validations.length + 1).padStart(2, '0')}`;
  ajouter([{ type: 'validation.started', acteur: 'controles', cle: `validation:${vid}`, donnees: { task_id: taskId, validation_id: vid } }], { racine });
  const { controles, empreintes } = await executerControles(t, etat, ctx, racine);
  const echec = controles.some((c) => c.statut === 'echoue');
  const nonExecute = controles.some((c) => c.statut === 'non_execute');
  const type = echec ? 'validation.failed' : nonExecute ? 'validation.human_review' : 'validation.passed';
  ajouter([{ type, acteur: 'controles', cle: `validation:${vid}:fin`, donnees: { task_id: taskId, validation_id: vid, controles, empreintes } }], { racine });
  faireAvancer(racine);
  return { validation_id: vid, resultat: type.split('.')[1], controles };
}

// rapport d'un agent : livrables déclarés avec leur empreinte, rapport, puis contrôles automatiques
export async function soumettreRapport(rapport, { racine = RACINE } = {}) {
  const { etat } = charger(racine);
  const fichiersDisque = {};
  for (const p of rapport.livrables_fournis || []) {
    const abs = path.join(racine, p);
    if (fs.existsSync(abs)) fichiersDisque[p] = { sha256: empreinteFichier(abs), taille: fs.statSync(abs).size };
  }
  const absents = (rapport.livrables_fournis || []).filter((p) => !fichiersDisque[p]);
  if (absents.length) throw new Error(`livrables annoncés mais absents du disque : ${absents.join(', ')}`);
  ajouter(brouillonsRapport(etat, rapport, fichiersDisque), { racine });
  const apres = charger(racine).etat.taches.get(rapport.task_id);
  if (apres.status !== 'review') return { statut: apres.status, validation: null };
  return { statut: 'review', validation: await lancerValidation(rapport.task_id, { racine }) };
}

export function decider(taskId, decision, details = {}, { racine = RACINE, acteur = 'humain' } = {}) {
  if (!REVUE[decision]) throw new Error(`décision inconnue : ${decision} (${Object.keys(REVUE).join(', ')})`);
  const { etat } = charger(racine);
  const t = etat.taches.get(taskId);
  ajouter([{ type: EVT_REVUE[decision], acteur, cle: `revue:${taskId}:${t?.historique.length}`, donnees: { task_id: taskId, ...details } }], { racine });
  faireAvancer(racine);
  return charger(racine).etat.taches.get(taskId);
}

function versionGit(racine) {
  try {
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: racine }).toString().trim();
    const sale = execFileSync('git', ['status', '--porcelain'], { cwd: racine }).toString().trim().length > 0;
    return `${head}${sale ? '+modifications-non-commitees' : ''}`;
  } catch {
    return 'inconnue';
  }
}

// intégration : étape distincte de la production, avec tests post-intégration et version
export async function integrer(taskId, { racine = RACINE, acteur = 'technical-artist' } = {}) {
  const { etat, ctx } = charger(racine);
  const t = etat.taches.get(taskId);
  if (!t) throw new Error(`tâche inconnue : ${taskId}`);
  const iid = `INT-${taskId.replace(/^TASK-/, '')}-${String(t.integrations.length + 1).padStart(2, '0')}`;
  const version = versionGit(racine);
  ajouter([{ type: 'integration.started', acteur, cle: `integration:${iid}`, donnees: { task_id: taskId, integration_id: iid, version } }], { racine });
  const tests = t.validation_method.tests || [];
  const { controles, empreintes } = await executerControles(t, etat, ctx, racine, { controles: ['fichiers', ...(tests.length ? ['tests'] : []), 'suite'], tests });
  const ok = controles.every((c) => c.statut === 'reussi');
  const preuves = controles.map((c) => `${c.controle} : ${c.statut} — ${c.detail}`);
  ajouter([{ type: ok ? 'integration.completed' : 'integration.failed', acteur: 'controles', cle: `integration:${iid}:fin`, donnees: { task_id: taskId, integration_id: iid, version, controles, empreintes, preuves } }], { racine });
  return { integration_id: iid, resultat: ok ? 'integrated' : 'integration_failed', version, controles };
}

export function evenement(type, acteur, donnees, { racine = RACINE } = {}) {
  // clé liée à l'état courant : une commande relancée à l'identique est ignorée, la même commande
  // plus tard (après d'autres événements) est bien enregistrée
  const { etat } = charger(racine);
  const t = donnees.task_id && etat.taches.get(donnees.task_id);
  const cle = t ? `${type}:${t.task_id}:${t.historique.length}` : `${type}:${JSON.stringify(donnees)}:${etat.evenements.length}`;
  const r = ajouter([{ type, acteur, cle, donnees }], { racine });
  faireAvancer(racine);
  return r.ajoutes.length;
}

export function texteBrief(taskId, { racine = RACINE } = {}) {
  const { etat, ctx } = charger(racine);
  return brief(etat, ctx, taskId);
}

// Middleware de dev : GET /__production rend les données brutes (le dashboard rejoue lui-même le
// journal avec les mêmes modules) ; POST /__production { action, ... } exécute une opération.
// Le dashboard agit au nom de l'humain : il ne peut ni rendre un rapport d'agent ni signer une revue
// d'agent.
export function productionMiddleware(racine = RACINE) {
  const send = (res, code, body) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };
  const ACTIONS = {
    'lancer-chantier': (b) => lancerChantier({ zone_id: b.zone_id, title: b.title, description: b.description }, { racine }),
    'creer-tache': (b) => creerTache(b.task, { racine }),
    demarrer: (b) => ({ ajoutes: demarrer(b.task_id, { racine }) }),
    valider: (b) => lancerValidation(b.task_id, { racine }),
    revue: (b) => decider(b.task_id, b.decision, { criteres_echoues: b.criteres_echoues, correction_attendue: b.correction_attendue, commentaire: b.commentaire, preuves: b.preuves }, { racine, acteur: 'humain' }),
    debloquer: (b) => ({ ajoutes: evenement('task.unblocked', 'humain', { task_id: b.task_id, vers: b.vers || 'backlog' }, { racine }) }),
    integrer: (b) => integrer(b.task_id, { racine, acteur: 'orchestrateur' }),
    avancer: () => ({ ajoutes: faireAvancer(racine) }),
    brief: (b) => ({ texte: texteBrief(b.task_id, { racine }) }),
  };
  return (req, res) => {
    if (req.method === 'GET') {
      try {
        const { evenements, integrite, erreurs } = charger(racine);
        send(res, 200, { evenements, integrite, erreurs, version: versionGit(racine) });
      } catch (err) {
        send(res, 500, { error: err.message });
      }
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'méthode non prise en charge' });
      return;
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        const b = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const fn = ACTIONS[b.action];
        if (!fn) throw new Error(`action inconnue : ${b.action}`);
        send(res, 200, { ok: true, resultat: await fn(b) });
      } catch (err) {
        send(res, 400, { error: err.message });
      }
    });
  };
}
