// État de production : rejoue le journal d'événements (production/journal.jsonl) pour reconstruire
// objectifs, tâches, livrables, validations, intégrations et éléments de checklist. Le journal est
// la seule source de vérité des statuts ; la carte, le checklist et le dashboard en sont des vues.
// Chaque événement est vérifié avant d'être appliqué (acteur autorisé, transition permise) : un
// événement refusé lève une ErreurWorkflow et ne modifie rien. Module pur.
//
// Événement : { seq, id: 'EVT-000001', type, at: ISO 8601, acteur, cle (idempotence), donnees }
import { transitionPermise, TENTATIVES_MAX } from './statuts.js';
import { itemsDeZone } from './checklist.js';
import { verifierTache, verifierRapport, verifierControle } from './contrats.js';

export class ErreurWorkflow extends Error {}
const refuse = (msg) => { throw new ErreurWorkflow(msg); };

// contexte statique : zones, éléments de checklist et rôles, indexés
export function contexte(zonesData, agentsData) {
  const zones = [...zonesData.zones].sort((a, b) => a.ordre - b.ordre);
  const items = zones.flatMap(itemsDeZone);
  return {
    zones,
    zoneParId: new Map(zones.map((z) => [z.id, z])),
    items,
    itemParId: new Map(items.map((i) => [i.id, i])),
    itemIds: new Set(items.map((i) => i.id)),
    roles: agentsData.roles,
    roleParId: new Map(agentsData.roles.map((r) => [r.id, r])),
    relecteurParId: new Map(agentsData.relecteurs.map((r) => [r.id, r])),
  };
}

export function etatInitial() {
  return {
    objectifs: new Map(), taches: new Map(), livrables: new Map(), validations: new Map(),
    integrations: new Map(), items: new Map(), approbations: new Map(), evenements: [], cles: new Set(),
  };
}

const ITEM_DEFAUT = { specification: 'a_specifier', production: 'backlog', validation: 'not_checked', integration: 'not_integrated' };
// état d'un élément de checklist : valeurs par défaut tant qu'aucun événement ne l'a touché
export function etatItem(etat, ctx, id) {
  const def = ctx.itemParId.get(id);
  const base = { ...ITEM_DEFAUT, specification: def && !def.applicable ? 'non_applicable' : 'a_specifier', taches: [], preuves: [], historique: [], mis_a_jour: null };
  return etat.items.get(id) || base;
}

function majItem(etat, ctx, id, champs, evt, preuve) {
  const cur = etatItem(etat, ctx, id);
  const next = { ...cur, ...champs, historique: [...cur.historique, evt.id], mis_a_jour: evt.at };
  if (preuve) next.preuves = [...cur.preuves, { preuve, evenement: evt.id }];
  etat.items.set(id, next);
}

// propage l'avancement d'une tâche à ses éléments de checklist, sans faire reculer un élément terminé
function propager(etat, ctx, t, champs, evt) {
  for (const id of t.checklist_items) {
    const cur = etatItem(etat, ctx, id);
    const c = { ...champs };
    if (cur.production === 'completed' && c.production && c.production !== 'completed') delete c.production;
    if (!cur.taches.includes(t.task_id)) c.taches = [...cur.taches, t.task_id];
    majItem(etat, ctx, id, c, evt);
  }
}

function tache(etat, id) {
  return etat.taches.get(id) || refuse(`tâche inconnue : ${id}`);
}

function passer(t, axe, champ, vers) {
  if (!transitionPermise(axe, t[champ], vers)) refuse(`transition refusée pour ${t.task_id} (${axe}) : ${t[champ]} → ${vers}`);
  t[champ] = vers;
}

const estHumain = (a) => a === 'humain' || a.startsWith('humain:');
function exiger(cond, msg) { if (!cond) refuse(msg); }

// échec (contrôles ou revue) : correction ciblée, ou intervention humaine au-delà des tentatives
function echec(t, evt, defauts) {
  t.retry_count += 1;
  t.echecs.push({ evenement: evt.id, at: evt.at, defauts });
  t.defauts = defauts;
  if (t.retry_count >= TENTATIVES_MAX) {
    t.status = 'blocked';
    t.validation_status = 'human_review';
    t.intervention_humaine = true;
    t.blocage = { raison: `limite de ${TENTATIVES_MAX} tentatives atteinte : intervention humaine`, depuis: evt.at, dependances: [] };
  } else {
    passer(t, 'production', 'status', 'rework');
  }
}

const HANDLERS = {
  'objective.created'(etat, ctx, evt) {
    const o = evt.donnees.objective;
    exiger(evt.acteur === 'orchestrateur' || estHumain(evt.acteur), 'seul l’orchestrateur ou un humain crée un objectif');
    exiger(o && /^OBJ-\d{4}$/.test(o.objective_id), 'objective_id invalide');
    exiger(!etat.objectifs.has(o.objective_id), `objectif déjà existant : ${o.objective_id}`);
    exiger(ctx.zoneParId.has(o.zone_id), `zone inconnue : ${o.zone_id}`);
    exiger(Array.isArray(o.acceptance_criteria) && o.acceptance_criteria.length > 0, 'objectif sans critères d’acceptation');
    etat.objectifs.set(o.objective_id, { ...o, taches: [], created_at: evt.at, statut: 'ouvert' });
  },
  'task.created'(etat, ctx, evt) {
    exiger(evt.acteur === 'orchestrateur' || estHumain(evt.acteur), 'seul l’orchestrateur ou un humain crée une tâche');
    const t = { status: 'backlog', validation_status: 'not_checked', integration_status: 'not_integrated', retry_count: 0, ...evt.donnees.task };
    const erreurs = verifierTache(t, ctx);
    exiger(!erreurs.length, `tâche invalide : ${erreurs.join(' ; ')}`);
    exiger(!etat.taches.has(t.task_id), `tâche déjà existante : ${t.task_id}`);
    for (const d of t.dependencies) exiger(etat.taches.has(d), `dépendance inexistante : ${d}`);
    exiger(t.status === 'backlog', 'une tâche naît au statut backlog');
    if (t.objective_id) exiger(etat.objectifs.has(t.objective_id), `objectif inconnu : ${t.objective_id}`);
    etat.taches.set(t.task_id, {
      ...t, created_at: evt.at, updated_at: evt.at, criteres_initiaux: [...t.acceptance_criteria],
      livrables: [], rapports: [], validations: [], revues: [], integrations: [], echecs: [], defauts: [],
      historique: [], intervention_humaine: false, blocage: null,
    });
    if (t.objective_id) etat.objectifs.get(t.objective_id).taches.push(t.task_id);
  },
  'task.ready'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(evt.acteur === 'orchestrateur' || estHumain(evt.acteur), 'seul l’orchestrateur prépare une tâche');
    for (const d of t.dependencies) {
      const dep = tache(etat, d);
      exiger(dep.status === 'completed' && dep.validation_status === 'passed', `prérequis non satisfait : ${d} (${dep.status}, ${dep.validation_status})`);
    }
    passer(t, 'production', 'status', 'ready');
    t.blocage = null;
  },
  'task.started'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(evt.acteur === 'orchestrateur' || evt.acteur === t.assigned_agent, `seul ${t.assigned_agent} ou l’orchestrateur démarre ${t.task_id}`);
    exiger(t.status === 'ready' || t.status === 'rework', `${t.task_id} n’est pas prête (${t.status})`);
    passer(t, 'production', 'status', 'in_progress');
    propager(etat, ctx, t, { production: 'in_progress' }, evt);
  },
  'task.blocked'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(evt.acteur === 'orchestrateur' || evt.acteur === t.assigned_agent || estHumain(evt.acteur), 'acteur non autorisé à bloquer la tâche');
    exiger(typeof evt.donnees.raison === 'string' && evt.donnees.raison.trim(), 'un blocage doit être motivé');
    passer(t, 'production', 'status', 'blocked');
    t.blocage = { raison: evt.donnees.raison, depuis: evt.at, dependances: evt.donnees.dependances || [] };
    propager(etat, ctx, t, { production: 'blocked' }, evt);
  },
  'task.unblocked'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(evt.acteur === 'orchestrateur' || estHumain(evt.acteur), 'seul l’orchestrateur ou un humain débloque');
    exiger(!t.intervention_humaine || estHumain(evt.acteur), 'limite de tentatives atteinte : décision humaine requise');
    passer(t, 'production', 'status', evt.donnees.vers || 'backlog');
    if (estHumain(evt.acteur) && t.intervention_humaine) {
      t.intervention_humaine = false;
      t.validation_status = 'not_checked';
    }
    t.blocage = null;
  },
  'deliverable.created'(etat, ctx, evt) {
    const d = evt.donnees.deliverable;
    const t = tache(etat, d.task_id);
    exiger(evt.acteur === t.assigned_agent, `seul ${t.assigned_agent} déclare les livrables de ${t.task_id}`);
    exiger(t.status === 'in_progress', `${t.task_id} n’est pas en cours (${t.status})`);
    exiger(!etat.livrables.has(d.deliverable_id), `livrable déjà déclaré : ${d.deliverable_id}`);
    // jamais de remplacement silencieux d'un livrable validé
    for (const l of etat.livrables.values()) {
      if (l.path !== d.path || l.remplace_par) continue;
      // protégé dès qu'il a été accepté en revue (tâche terminée) ; refusé, il se corrige librement
      if (l.accepte) {
        const ok = etat.approbations.get(l.path);
        exiger(ok && ok.livrable === l.deliverable_id, `${d.path} est un livrable validé (${l.deliverable_id}) : remplacement soumis à approbation humaine`);
        etat.approbations.delete(l.path);
      }
      l.remplace_par = d.deliverable_id;
    }
    etat.livrables.set(d.deliverable_id, { ...d, validation: 'not_checked', integration: 'not_integrated', cree_le: evt.at });
    t.livrables.push(d.deliverable_id);
  },
  'deliverable.replacement_approved'(etat, ctx, evt) {
    exiger(estHumain(evt.acteur), 'seul un humain approuve le remplacement d’un livrable validé');
    const l = etat.livrables.get(evt.donnees.deliverable_id) || refuse(`livrable inconnu : ${evt.donnees.deliverable_id}`);
    exiger(evt.donnees.raison, 'approbation sans raison');
    etat.approbations.set(l.path, { livrable: l.deliverable_id, raison: evt.donnees.raison, evenement: evt.id });
  },
  'task.report_submitted'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    const r = evt.donnees.report;
    exiger(evt.acteur === t.assigned_agent, `seul ${t.assigned_agent} soumet le rapport de ${t.task_id}`);
    const erreurs = verifierRapport(r, t, ctx);
    exiger(!erreurs.length, `rapport invalide : ${erreurs.join(' ; ')}`);
    exiger(t.status === 'in_progress', `${t.task_id} n’est pas en cours (${t.status})`);
    const declares = new Set(t.livrables.map((id) => etat.livrables.get(id)).filter((l) => !l.remplace_par).map((l) => l.path));
    for (const p of r.livrables_fournis) exiger(declares.has(p), `livrable fourni sans déclaration (deliverable.created) : ${p}`);
    t.rapports.push({ evenement: evt.id, at: evt.at, ...r });
    if (r.etat_final === 'bloque') {
      passer(t, 'production', 'status', 'blocked');
      t.blocage = { raison: r.dependances_restantes.join(' ; ') || r.resume, depuis: evt.at, dependances: r.dependances_restantes };
      propager(etat, ctx, t, { production: 'blocked' }, evt);
      return;
    }
    passer(t, 'production', 'status', 'review');
    propager(etat, ctx, t, { production: 'review' }, evt);
  },
  'validation.started'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(evt.acteur === 'controles', 'seuls les contrôles automatiques lancent une validation');
    exiger(t.status === 'review' || t.status === 'completed', `${t.task_id} n’a pas de livrable à contrôler (${t.status})`);
    exiger(!etat.validations.has(evt.donnees.validation_id), 'validation déjà existante');
    passer(t, 'validation', 'validation_status', 'running');
    etat.validations.set(evt.donnees.validation_id, { validation_id: evt.donnees.validation_id, task_id: t.task_id, debut: evt.at, resultat: 'running', controles: [] });
    t.validations.push(evt.donnees.validation_id);
  },
  'validation.passed'(etat, ctx, evt) { finValidation(etat, ctx, evt, 'passed'); },
  'validation.failed'(etat, ctx, evt) { finValidation(etat, ctx, evt, 'failed'); },
  'validation.human_review'(etat, ctx, evt) { finValidation(etat, ctx, evt, 'human_review'); },
  'review.accepted'(etat, ctx, evt) { revue(etat, ctx, evt, 'accepte'); },
  'review.rejected'(etat, ctx, evt) { revue(etat, ctx, evt, 'refuse'); },
  'review.blocked'(etat, ctx, evt) { revue(etat, ctx, evt, 'bloque'); },
  'review.human'(etat, ctx, evt) { revue(etat, ctx, evt, 'humain'); },
  'task.completed'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(evt.acteur === 'orchestrateur' || estHumain(evt.acteur), 'seul l’orchestrateur clôt une tâche');
    exiger(t.validation_status === 'passed', `${t.task_id} : contrôles non réussis (${t.validation_status})`);
    exiger(t.revues.at(-1)?.decision === 'accepte', `${t.task_id} : aucune revue indépendante acceptée`);
    passer(t, 'production', 'status', 'completed');
    for (const id of t.livrables) { const l = etat.livrables.get(id); if (!l.remplace_par) l.accepte = true; }
    passer(t, 'integration', 'integration_status', t.integration_status === 'integrated' ? 'integrated' : 'integration_ready');
    propager(etat, ctx, t, { specification: 'specifie', production: 'completed', validation: 'passed' }, evt);
  },
  'task.reopened'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(estHumain(evt.acteur), 'seul un humain rouvre une tâche terminée');
    exiger(evt.donnees.raison, 'réouverture sans raison');
    passer(t, 'production', 'status', 'rework');
  },
  'task.criteria_changed'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(estHumain(evt.acteur), 'les critères d’acceptation ne changent que par décision humaine');
    exiger(Array.isArray(evt.donnees.acceptance_criteria) && evt.donnees.acceptance_criteria.length && evt.donnees.raison, 'nouveaux critères et raison requis');
    t.acceptance_criteria = [...evt.donnees.acceptance_criteria];
    // périmètre réduit : les éléments retirés gardent leur état et ne seront pas comptés faits par cette tâche
    if (evt.donnees.checklist_items) {
      exiger(evt.donnees.checklist_items.every((id) => t.checklist_items.includes(id)), 'le périmètre d’une tâche ne peut que se réduire');
      for (const id of t.checklist_items.filter((x) => !evt.donnees.checklist_items.includes(x))) {
        const cur = etatItem(etat, ctx, id);
        majItem(etat, ctx, id, { taches: cur.taches.filter((x) => x !== t.task_id), production: cur.production === 'completed' ? 'completed' : 'backlog' }, evt);
      }
      t.checklist_items = [...evt.donnees.checklist_items];
    }
  },
  'integration.started'(etat, ctx, evt) {
    const t = tache(etat, evt.donnees.task_id);
    exiger(['orchestrateur', 'technical-artist'].includes(evt.acteur), 'seul le Technical Artist ou l’orchestrateur intègre');
    exiger(t.status === 'completed' && t.validation_status === 'passed', `${t.task_id} : intégration avant validation refusée`);
    passer(t, 'integration', 'integration_status', 'integrating');
    etat.integrations.set(evt.donnees.integration_id, { integration_id: evt.donnees.integration_id, task_id: t.task_id, debut: evt.at, version: evt.donnees.version, resultat: 'integrating' });
    t.integrations.push(evt.donnees.integration_id);
  },
  'integration.completed'(etat, ctx, evt) { finIntegration(etat, ctx, evt, 'integrated'); },
  'integration.failed'(etat, ctx, evt) { finIntegration(etat, ctx, evt, 'integration_failed'); },
  'checklist.item.updated'(etat, ctx, evt) {
    const { item_id: id, changements = {}, preuve, note } = evt.donnees;
    exiger(ctx.itemIds.has(id), `élément de checklist inconnu : ${id}`);
    const def = ctx.itemParId.get(id);
    const champs = Object.keys(changements);
    exiger(champs.length, 'aucun changement');
    for (const c of champs) exiger(['specification', 'production', 'validation', 'integration'].includes(c), `champ inconnu : ${c}`);
    if (evt.acteur === 'audit') {
      // constat d'audit : une preuve vérifiable, et seulement sur un élément jamais touché
      exiger(preuve, 'constat d’audit sans preuve');
      exiger(!etat.items.has(id), `${id} a déjà un historique : un constat d’audit ne le réécrit pas`);
      exiger(changements.validation === undefined || changements.validation === 'not_checked', 'un constat d’audit ne vaut pas validation');
    } else if (!estHumain(evt.acteur)) {
      // le World Designer définit les critères de complétude de toute la zone ; les autres rôles, leur section
      exiger(evt.acteur === def.role || evt.acteur === 'world-designer', `${evt.acteur} ne met pas à jour ${id} (responsable : ${def.role})`);
      exiger(champs.every((c) => c === 'specification'), 'un agent ne met à jour que la spécification d’un élément');
    }
    const cur = etatItem(etat, ctx, id);
    for (const axe of ['production', 'validation', 'integration']) {
      if (axe in changements && evt.acteur !== 'audit') exiger(transitionPermise(axe, cur[axe], changements[axe]), `transition refusée pour ${id} (${axe}) : ${cur[axe]} → ${changements[axe]}`);
    }
    if (changements.specification === 'non_applicable') exiger(!def.obligatoire || estHumain(evt.acteur), 'un élément obligatoire ne devient non applicable que par décision humaine');
    majItem(etat, ctx, id, { ...changements, ...(note ? { note } : {}) }, evt, preuve);
  },
  'delivery.decided'(etat, ctx, evt) {
    exiger(estHumain(evt.acteur), 'la décision de livraison est humaine');
    const z = ctx.zoneParId.get(evt.donnees.zone_id) || refuse('zone inconnue');
    exiger(['livrer', 'refuser'].includes(evt.donnees.decision) && evt.donnees.raison, 'décision (livrer ou refuser) et raison requises');
    majItem(etat, ctx, `${z.id}.H01`, { specification: 'specifie', production: 'completed', validation: evt.donnees.decision === 'livrer' ? 'passed' : 'failed' }, evt, evt.donnees.raison);
  },
};

function finValidation(etat, ctx, evt, resultat) {
  const t = tache(etat, evt.donnees.task_id);
  const v = etat.validations.get(evt.donnees.validation_id) || refuse('validation inconnue');
  const humain = estHumain(evt.acteur);
  exiger(evt.acteur === 'controles' || (humain && t.validation_status === 'human_review'), 'seuls les contrôles (ou un humain sur validation humaine) concluent');
  exiger(v.task_id === t.task_id, 'validation d’une autre tâche');
  const controles = evt.donnees.controles || [];
  for (const c of controles) { const e = verifierControle(c); exiger(!e.length, e.join(' ; ')); }
  if (resultat === 'passed' && !humain) {
    // un contrôle non exécuté n'est jamais compté comme réussi
    exiger(controles.length && controles.every((c) => c.statut === 'reussi'), 'validation réussie avec des contrôles échoués ou non exécutés');
  }
  if (humain) t.validation_status = 'running';
  passer(t, 'validation', 'validation_status', resultat);
  Object.assign(v, { resultat, fin: evt.at, controles, empreintes: evt.donnees.empreintes || {} });
  const livrables = t.livrables.map((id) => etat.livrables.get(id)).filter((l) => !l.remplace_par);
  for (const l of livrables) {
    l.validation = resultat;
    if (resultat === 'passed') l.sha256_valide = evt.donnees.empreintes?.[l.path] || l.sha256;
  }
  if (resultat === 'failed') {
    const defauts = controles.filter((c) => c.statut !== 'reussi').map((c) => `${c.controle} : ${c.detail}`);
    if (t.status === 'review') echec(t, evt, defauts);
    propager(etat, ctx, t, { validation: 'failed' }, evt);
  } else if (resultat === 'human_review') {
    propager(etat, ctx, t, { validation: 'human_review' }, evt);
  }
}

function revue(etat, ctx, evt, decision) {
  const t = tache(etat, evt.donnees.task_id);
  const role = ctx.roleParId.get(t.assigned_agent);
  const rel = ctx.relecteurParId.get(estHumain(evt.acteur) ? 'humain' : evt.acteur);
  exiger(rel && rel.revoit.includes(role.id), `${evt.acteur} n’est pas relecteur des livrables de ${role.id}`);
  exiger(evt.acteur !== t.assigned_agent && evt.acteur !== role.agent, 'l’agent producteur ne peut pas approuver son propre livrable');
  exiger(t.status === 'review', `${t.task_id} n’est pas en revue (${t.status})`);
  if (decision === 'accepte') exiger(t.validation_status === 'passed', `${t.task_id} : revue avant contrôles réussis (${t.validation_status})`);
  const d = evt.donnees;
  if (decision === 'refuse') exiger(Array.isArray(d.criteres_echoues) && d.criteres_echoues.length && d.correction_attendue, 'un refus indique les critères échoués et la correction attendue');
  t.revues.push({ evenement: evt.id, at: evt.at, relecteur: evt.acteur, decision, criteres_echoues: d.criteres_echoues || [], preuves: d.preuves || [], correction_attendue: d.correction_attendue || null, commentaire: d.commentaire || null });
  if (decision === 'refuse') {
    echec(t, evt, d.criteres_echoues.map((c) => `${c} → ${d.correction_attendue}`));
    propager(etat, ctx, t, { production: 'rework' }, evt);
  } else if (decision === 'bloque') {
    passer(t, 'production', 'status', 'blocked');
    t.blocage = { raison: d.commentaire || 'bloqué par une dépendance (revue)', depuis: evt.at, dependances: d.dependances || [] };
  } else if (decision === 'humain') {
    t.validation_status = 'human_review';
  }
}

function finIntegration(etat, ctx, evt, resultat) {
  const t = tache(etat, evt.donnees.task_id);
  const integ = etat.integrations.get(evt.donnees.integration_id) || refuse('intégration inconnue');
  exiger(['controles', 'orchestrateur', 'technical-artist'].includes(evt.acteur), 'acteur non autorisé à conclure une intégration');
  const controles = evt.donnees.controles || [];
  if (resultat === 'integrated') {
    exiger(controles.length && controles.every((c) => c.statut === 'reussi'), 'intégration sans tests post-intégration réussis');
    // le fichier intégré est bien celui qui a été validé
    for (const id of t.livrables) {
      const l = etat.livrables.get(id);
      if (l.remplace_par) continue;
      const sha = evt.donnees.empreintes?.[l.path];
      exiger(!sha || !l.sha256_valide || sha === l.sha256_valide, `${l.path} a changé depuis sa validation : nouvelle validation requise`);
      l.integration = 'integrated';
    }
  }
  passer(t, 'integration', 'integration_status', resultat);
  Object.assign(integ, { resultat, fin: evt.at, controles, preuves: evt.donnees.preuves || [], version: evt.donnees.version || integ.version });
  if (resultat === 'integrated') propager(etat, ctx, t, { integration: 'integrated' }, evt);
}

export const TYPES = Object.keys(HANDLERS);

// applique un événement (lève ErreurWorkflow s'il est refusé ; l'état reste alors intact)
export function appliquer(etat, evt, ctx) {
  const h = HANDLERS[evt.type] || refuse(`type d’événement inconnu : ${evt.type}`);
  if (evt.cle && etat.cles.has(evt.cle)) return false; // doublon : ignoré (idempotence)
  // un refus en cours de route ne laisse pas d'état à moitié appliqué
  const { evenements, ...reste } = etat;
  const sauvegarde = structuredClone(reste);
  try {
    h(etat, ctx, evt);
  } catch (err) {
    Object.assign(etat, sauvegarde);
    throw err;
  }
  const tid = evt.donnees?.task_id || evt.donnees?.task?.task_id || evt.donnees?.deliverable?.task_id;
  const t = tid && etat.taches.get(tid);
  if (t) {
    t.updated_at = evt.at;
    t.historique.push(evt.id);
  }
  if (evt.cle) etat.cles.add(evt.cle);
  evenements.push(evt);
  return true;
}

// rejoue un journal ; un événement refusé est écarté et signalé (journal modifié à la main)
export function rejouer(evenements, ctx) {
  const etat = etatInitial();
  const erreurs = [];
  for (const evt of evenements) {
    try {
      appliquer(etat, evt, ctx);
    } catch (err) {
      if (!(err instanceof ErreurWorkflow)) throw err;
      erreurs.push({ evenement: evt.id, type: evt.type, erreur: err.message });
    }
  }
  return { etat, erreurs };
}
