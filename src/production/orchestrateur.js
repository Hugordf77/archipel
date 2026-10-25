// Orchestrateur : règles déterministes qui transforment un objectif de production en tâches
// atomiques, une par agent responsable, reliées par leurs dépendances, puis font avancer le
// workflow. Il ne produit que des brouillons d'événements { type, acteur, cle, donnees } : c'est le
// journal (scripts/production/depot.mjs) qui les numérote, les vérifie (etat.js) et les enregistre.
// Aucun appel à un LLM ici : lancer un agent reste le geste du coordinateur de session, avec le
// brief produit par brief(). Module pur.
import { etatItem } from './etat.js';

export const slugZone = (zoneId) => zoneId.replace(/^ZONE-/, '');
const draft = (type, acteur, cle, donnees) => ({ type, acteur, cle, donnees });

// Étape 3 du workflow : les informations suffisent-elles ? Les manques non bloquants deviennent
// des hypothèses explicites ; les manques bloquants suspendent seulement les tâches qui en dépendent.
export function analyserPrerequis(zone) {
  const manques = [];
  const hypotheses = [];
  const zonesJeu = zone.jeu?.zones || [];
  if (!zonesJeu.length) manques.push({ sujet: 'monde', bloque: ['gameplay', 'technical-artist'], texte: 'La zone n’existe pas encore dans le monde du jeu (ZONES de src/world/archipel.js) : aire, relief et îles à créer avant tout test en jeu.' });
  if (zone.jeu?.correspondance === 'proposition' && zonesJeu.length) hypotheses.push(`Correspondance proposée avec les zones du jeu ${zonesJeu.join(', ')} : à confirmer par l’utilisateur.`);
  if (zonesJeu.length) hypotheses.push('Monde ouvert à l’étape « bases » (GEN_VERSION 4) : ni lieux, ni villages, ni faune, ni ressources hors arbres ; les points d’intérêt et activités restent à spécifier.');
  if (zone.confiance === 'proposition') hypotheses.push('Description issue de l’illustration de la carte : mécaniques non confirmées.');
  return { suffisant: !manques.length, manques, hypotheses };
}

export function prochainObjectif(etat) {
  return `OBJ-${String(etat.objectifs.size + 1).padStart(4, '0')}`;
}

export function nouvelObjectif(etat, ctx, entree, acteur = 'humain') {
  const zone = ctx.zoneParId.get(entree.zone_id);
  if (!zone) throw new Error(`zone inconnue : ${entree.zone_id}`);
  const id = prochainObjectif(etat);
  const pre = analyserPrerequis(zone);
  const objective = {
    objective_id: id,
    title: entree.title || `Préparer ${zone.nom} pour une première version explorable`,
    description: entree.description || `Établir le checklist de ${zone.nom}, combler les manques obligatoires et intégrer ce qui peut l’être.`,
    zone_id: zone.id,
    priority: entree.priority || zone.priorite,
    expected_result: entree.expected_result || 'Éléments obligatoires produits, contrôlés, revus et intégrés ; manques restants identifiés avec leur tâche.',
    acceptance_criteria: entree.acceptance_criteria?.length ? entree.acceptance_criteria : [
      'Chaque élément obligatoire du checklist a une tâche ou une preuve',
      'Aucune tâche terminée sans contrôles réussis et revue indépendante',
      'Statut de la zone calculé par le dashboard à partir du journal',
    ],
    constraints: entree.constraints || ['Aucune nouvelle dépendance npm', 'Modèles 3D : skill modele-3d et docs/DA.md', 'Tests verts avant intégration'],
    owner: entree.owner || 'humain',
    clarifications: pre.manques.map((m) => m.texte),
    hypotheses: pre.hypotheses,
  };
  return [draft('objective.created', acteur, `objective:${id}`, { objective })];
}

// gabarit des quatre tâches d'un chantier de zone
function gabarits(zone) {
  const z = zone.id;
  const slug = slugZone(z).toLowerCase();
  const fiche = `production/fiches/${z}.json`;
  const testZone = `tests/zones/${slug}.test.js`;
  return [
    {
      role: 'world-designer', sections: ['B', 'F'], titre: `Fiche de zone : ${zone.nom}`,
      description: `Rédiger la fiche structurée de ${zone.nom} : périmètre, relief, biomes, chemins, accès et sorties, connexions, repères, points d’intérêt (avec positions du jeu quand la zone existe), espaces vides, fonction narrative et ambiance. Distinguer ce qui est attesté par le code de ce qui reste proposé.`,
      livrables: [{ path: fiche, nature: 'specification', description: 'Fiche de zone (JSON, schéma fiche-zone)' }],
      controles: ['fichiers', 'json', 'fiche-zone', 'perimetre'], revue: 'archipel-critique',
      criteres: ['La fiche respecte le schéma fiche-zone (contrôle automatique)', 'Chaque point d’intérêt existant cite sa source dans le code', 'Les éléments non attestés sont marqués « proposition »'],
      entrees: ['production/zones.json', 'src/world/archipel.js', 'src/world/islands/regions.js', 'src/world/islands/gen/forme.js', 'docs/PRODUCTION.md'],
      deps: [],
    },
    {
      role: 'asset-artist', sections: ['D'], titre: `Inventaire des assets : ${zone.nom}`,
      description: `Établir l’inventaire des assets de ${zone.nom} lié au catalogue (identifiants ARB-…, BAT-…), séparer existants réutilisables et manquants, et spécifier chaque manque (identifiant proposé, catégorie, critères DA). Ne déclarer « produit » qu’un fichier réellement créé.`,
      livrables: [{ path: `production/assets/${z}.json`, nature: 'specification', description: 'Inventaire des assets (JSON)' }],
      controles: ['fichiers', 'json', 'references-catalogue', 'perimetre'], revue: 'evis-critique',
      criteres: ['Toutes les références existantes sont des identifiants du registre (contrôle automatique)', 'Chaque manque est une spécification explicite, pas un asset annoncé comme créé'],
      entrees: [fiche, 'src/models/registry.js', 'src/models/releves.gen.js', 'docs/DA.md'],
      deps: ['world-designer'],
    },
    {
      role: 'gameplay', sections: ['C'], titre: `Tests d’accès, de sortie et d’activités : ${zone.nom}`,
      description: `Écrire un test fonctionnel de ${zone.nom} sur les vrais modules du jeu : accès (débarquement), sortie (retour à la mer), points d’intérêt atteignables à pied, activités et ressources de la zone. Aucune modification du code du jeu sans brief dédié.`,
      livrables: [{ path: testZone, nature: 'test', description: 'Test fonctionnel de la zone (Vitest)' }],
      controles: ['fichiers', 'perimetre', 'tests'], tests: [testZone], revue: 'archipel-critique',
      criteres: ['Le test passe avec npm test', 'Le test échoue si l’accès ou la sortie disparaît (assertion sur des positions réelles)'],
      entrees: [fiche, 'src/world/navigation.js', 'src/world/islands/regions.js', 'src/world/islands/gen/forme.js', 'src/data/harvest.js'],
      deps: ['world-designer'],
    },
    {
      role: 'technical-artist', sections: ['E', 'G'], titre: `Intégration et QA : ${zone.nom}`,
      description: `Vérifier l’intégration technique de ${zone.nom} (région chargée, références, collisions, échelles, budget du Worker), lancer les tests de la zone et la suite complète, et consigner un rapport reproductible (commandes, résultats, échecs connus).`,
      livrables: [{ path: `production/integration/${z}.json`, nature: 'rapport', description: 'Rapport d’intégration (JSON)' }],
      controles: ['fichiers', 'json', 'perimetre', 'tests', 'suite', 'build'], tests: [testZone], revue: 'archipel-critique',
      criteres: ['Tests de la zone verts', 'Suite complète sans nouvel échec (échecs connus listés dans production/echecs-connus.json)', 'Build de production réussi', 'Chaque contrôle non exécuté est déclaré comme tel'],
      entrees: [fiche, `production/assets/${z}.json`, testZone, 'src/world/islands/IslandManager.js'],
      deps: ['asset-artist', 'gameplay'],
    },
  ];
}

// Étape 4 : décomposition en tâches atomiques. Une tâche par rôle, limitée aux éléments
// obligatoires non encore validés ; les tâches qui dépendent d'une clarification sont suspendues.
export function planifier(etat, ctx, objectiveId) {
  const obj = etat.objectifs.get(objectiveId);
  if (!obj) throw new Error(`objectif inconnu : ${objectiveId}`);
  if (obj.taches.length) return []; // déjà planifié : idempotent
  const zone = ctx.zoneParId.get(obj.zone_id);
  const pre = analyserPrerequis(zone);
  const existantes = [...etat.taches.values()].filter((t) => t.zone_id === zone.id).length;
  const drafts = [];
  const idParRole = new Map();
  let n = existantes;
  for (const g of gabarits(zone)) {
    const items = ctx.items.filter((i) => i.zone_id === zone.id && i.obligatoire && g.sections.includes(i.section))
      // à produire, ou existant mais jamais vérifié (constat d'audit) : la tâche le vérifie contre la fiche
      .filter((i) => { const st = etatItem(etat, ctx, i.id); return st.specification !== 'non_applicable' && !(st.production === 'completed' && st.validation === 'passed'); });
    if (!items.length) continue;
    n += 1;
    const id = `TASK-${slugZone(zone.id)}-${String(n).padStart(3, '0')}`;
    idParRole.set(g.role, id);
    const task = {
      task_id: id, objective_id: objectiveId, zone_id: zone.id, title: g.titre, description: g.description,
      assigned_agent: g.role, priority: obj.priority,
      dependencies: g.deps.map((r) => idParRole.get(r)).filter(Boolean),
      input_references: g.entrees,
      expected_deliverables: g.livrables,
      acceptance_criteria: [...g.criteres, ...items.map((i) => `${i.id} — ${i.critere}`)],
      validation_method: { controles: g.controles, ...(g.tests ? { tests: g.tests } : {}), revue: g.revue },
      checklist_items: items.map((i) => i.id),
      retry_count: 0,
    };
    drafts.push(draft('task.created', 'orchestrateur', `task:${id}:created`, { task }));
    const suspendue = pre.manques.find((m) => m.bloque.includes(g.role));
    if (suspendue) drafts.push(draft('task.blocked', 'orchestrateur', `task:${id}:clarification`, { task_id: id, raison: `En attente de clarification : ${suspendue.texte}`, dependances: ['clarification'] }));
  }
  return drafts;
}

const depOk = (etat, d) => { const t = etat.taches.get(d); return t && t.status === 'completed' && t.validation_status === 'passed'; };

// Fait avancer ce qui peut l'être sans jugement : tâches dont les prérequis sont satisfaits → prêtes ;
// tâches contrôlées et acceptées en revue → terminées. Jamais une tâche aux prérequis manquants.
export function avancer(etat) {
  const drafts = [];
  for (const t of etat.taches.values()) {
    const k = `${t.task_id}:${t.historique.length}`;
    if (t.status === 'backlog' && t.dependencies.every((d) => depOk(etat, d))) drafts.push(draft('task.ready', 'orchestrateur', `ready:${k}`, { task_id: t.task_id }));
    if (t.status === 'review' && t.validation_status === 'passed' && t.revues.at(-1)?.decision === 'accepte') drafts.push(draft('task.completed', 'orchestrateur', `completed:${k}`, { task_id: t.task_id }));
  }
  return drafts;
}

// Étape 6 : brouillons des livrables et du rapport d'un agent. fichiers : { path: { sha256, taille } }
// calculés par le dépôt Node ; un livrable absent du disque n'est pas déclaré.
export function brouillonsRapport(etat, rapport, fichiers) {
  const t = etat.taches.get(rapport.task_id);
  if (!t) throw new Error(`tâche inconnue : ${rapport.task_id}`);
  const tentative = t.retry_count;
  const drafts = [];
  let i = t.livrables.length;
  for (const p of rapport.livrables_fournis || []) {
    const f = fichiers[p];
    if (!f) continue;
    i += 1;
    const nature = t.expected_deliverables.find((d) => d.path === p)?.nature || rapport.fichiers?.find((x) => x.path === p)?.nature || 'fichier';
    drafts.push(draft('deliverable.created', rapport.agent, `livrable:${t.task_id}:${p}:${f.sha256}`, {
      deliverable: { deliverable_id: `DLV-${slugZone(t.zone_id)}-${t.task_id.slice(-3)}-${String(i).padStart(2, '0')}`, task_id: t.task_id, path: p, nature, sha256: f.sha256, taille: f.taille, version: tentative + 1 },
    }));
  }
  drafts.push(draft('task.report_submitted', rapport.agent, `rapport:${t.task_id}:${tentative}:${t.rapports.length}`, { task_id: t.task_id, report: rapport }));
  return drafts;
}

// Brief transmis à l'agent : contrat de tâche, entrées ciblées, périmètre et modèle de rapport.
export function brief(etat, ctx, taskId) {
  const t = etat.taches.get(taskId);
  if (!t) throw new Error(`tâche inconnue : ${taskId}`);
  const role = ctx.roleParId.get(t.assigned_agent);
  const zone = ctx.zoneParId.get(t.zone_id);
  const items = t.checklist_items.map((id) => { const d = ctx.itemParId.get(id); return `- ${id} ${d.titre} — critère : ${d.critere}`; });
  const defauts = t.defauts.length ? ['', '## Défauts à corriger (tentative précédente)', ...t.defauts.map((d) => `- ${d}`)] : [];
  const modele = {
    task_id: t.task_id, agent: t.assigned_agent, etat_final: 'termine', resume: '…',
    fichiers: t.expected_deliverables.map((d) => ({ path: d.path, action: 'cree', nature: d.nature })),
    livrables_attendus: t.expected_deliverables.map((d) => d.path), livrables_fournis: t.expected_deliverables.map((d) => d.path),
    tests: [{ commande: 'npx vitest run <fichier>', resultat: 'reussi', detail: '…' }],
    erreurs: [], hypotheses: [], decisions: [], checklist: t.checklist_items, dependances_restantes: [], prochaine_etape: '…',
  };
  return [
    `# Brief ${t.task_id} — ${t.title}`,
    '',
    `Agent : ${role.role} (\`${role.agent}\`, ${role.fichier}). Zone : ${zone.nom} (${zone.id}). Priorité : ${t.priority}.`,
    `Statuts : production ${t.status}, validation ${t.validation_status}, intégration ${t.integration_status}, tentatives ${t.retry_count}.`,
    '',
    '## Travail', t.description,
    '', '## Entrées (ne charger que celles-ci)', ...t.input_references.map((r) => `- ${r}`),
    '', '## Livrables attendus', ...t.expected_deliverables.map((d) => `- \`${d.path}\` (${d.nature}) : ${d.description || ''}`),
    '', '## Critères d’acceptation (fixés avant le travail, non modifiables par l’agent)', ...t.acceptance_criteria.map((c) => `- ${c}`),
    '', '## Éléments du checklist', ...items,
    '', '## Validation', `Contrôles automatiques : ${t.validation_method.controles.join(', ')}${t.validation_method.tests ? ` ; tests : ${t.validation_method.tests.join(', ')}` : ''}. Revue indépendante : ${t.validation_method.revue}.`,
    '', '## Périmètre', `Fichiers modifiables : ${role.chemins_autorises.join(', ')}. Tout autre chemin fait échouer le contrôle « perimetre ».`,
    ...defauts,
    '', '## Rapport à rendre', `Écrire le rapport JSON dans \`production/rapports/${t.task_id}.json\`, puis : \`npm run prod -- rapport production/rapports/${t.task_id}.json\`.`,
    '```json', JSON.stringify(modele, null, 2), '```',
  ].join('\n');
}
