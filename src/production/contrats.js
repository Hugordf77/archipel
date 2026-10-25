// Contrats du workflow : tâche, rapport d'exécution d'un agent, résultat de contrôle. Validation
// écrite à la main (aucune dépendance) : chaque fonction rend la liste des erreurs, vide si valide.
// Module pur.
import { PRODUCTION, VALIDATION, INTEGRATION, PRIORITES, CONTROLE } from './statuts.js';
import { ITEM_RE } from './checklist.js';

export const TASK_RE = /^TASK-[A-Z0-9-]+-\d{3}$/;
export const OBJ_RE = /^OBJ-\d{4}$/;
export const NATURES = ['fichier', 'specification', 'test', 'rapport'];
// contrôles automatiques connus de scripts/production/controles.mjs
export const CONTROLES = ['fichiers', 'json', 'perimetre', 'references-catalogue', 'fiche-zone', 'tests', 'suite', 'build'];

const estTexte = (v) => typeof v === 'string' && v.trim().length > 0;
const estListe = (v) => Array.isArray(v);
// chemin relatif au dépôt, sans remontée ni chemin absolu
export const cheminSur = (p) => estTexte(p) && !p.startsWith('/') && !p.split(/[\\/]/).includes('..');

export function verifierTache(t, ctx) {
  const e = [];
  if (!t || typeof t !== 'object') return ['tâche absente'];
  if (!TASK_RE.test(t.task_id || '')) e.push(`task_id invalide : ${t.task_id}`);
  if (t.objective_id != null && !OBJ_RE.test(t.objective_id)) e.push(`objective_id invalide : ${t.objective_id}`);
  if (!ctx.zoneParId.has(t.zone_id)) e.push(`zone inconnue : ${t.zone_id}`);
  for (const k of ['title', 'description']) if (!estTexte(t[k])) e.push(`${k} manquant`);
  if (!ctx.roleParId.has(t.assigned_agent)) e.push(`agent inconnu : ${t.assigned_agent}`);
  if (!PRIORITES[t.priority]) e.push(`priorité inconnue : ${t.priority}`);
  if (t.status !== undefined && !PRODUCTION[t.status]) e.push(`statut inconnu : ${t.status}`);
  if (t.validation_status !== undefined && !VALIDATION[t.validation_status]) e.push(`statut de validation inconnu : ${t.validation_status}`);
  if (t.integration_status !== undefined && !INTEGRATION[t.integration_status]) e.push(`statut d'intégration inconnu : ${t.integration_status}`);
  for (const k of ['dependencies', 'input_references', 'expected_deliverables', 'acceptance_criteria', 'checklist_items']) {
    if (!estListe(t[k])) e.push(`${k} doit être une liste`);
  }
  if (estListe(t.acceptance_criteria) && !t.acceptance_criteria.length) e.push('critères d’acceptation vides : la tâche ne peut pas être créée');
  if (estListe(t.acceptance_criteria) && t.acceptance_criteria.some((c) => !estTexte(c))) e.push('critère d’acceptation vide');
  if (estListe(t.expected_deliverables)) {
    if (!t.expected_deliverables.length) e.push('aucun livrable attendu');
    for (const d of t.expected_deliverables) {
      if (!cheminSur(d?.path)) e.push(`chemin de livrable invalide : ${d?.path}`);
      if (!NATURES.includes(d?.nature)) e.push(`nature de livrable inconnue : ${d?.nature}`);
    }
  }
  if (estListe(t.checklist_items)) {
    for (const id of t.checklist_items) {
      const m = ITEM_RE.exec(id);
      if (!m || m[1] !== t.zone_id || !ctx.itemIds.has(id)) e.push(`élément de checklist inconnu ou d’une autre zone : ${id}`);
    }
  }
  const vm = t.validation_method;
  if (!vm || !estListe(vm.controles) || !vm.controles.length) e.push('validation_method.controles manquant');
  else for (const c of vm.controles) if (!CONTROLES.includes(c)) e.push(`contrôle inconnu : ${c}`);
  if (vm?.controles?.includes('tests') && !(estListe(vm.tests) && vm.tests.length && vm.tests.every(cheminSur))) e.push('validation_method.tests requis pour le contrôle « tests »');
  if (vm && vm.revue && !ctx.relecteurParId.has(vm.revue)) e.push(`relecteur inconnu : ${vm.revue}`);
  if (!Number.isInteger(t.retry_count ?? 0) || (t.retry_count ?? 0) < 0) e.push('retry_count invalide');
  return e;
}

// Rapport d'exécution commun aux quatre agents
//   { task_id, agent, etat_final: 'termine' | 'bloque' | 'partiel', resume,
//     fichiers: [{ path, action: 'cree' | 'modifie', nature }],
//     livrables_attendus: [path], livrables_fournis: [path],
//     tests: [{ commande, resultat: 'reussi' | 'echoue' | 'non_execute', detail }],
//     erreurs: [texte], hypotheses: [texte], decisions: [texte], checklist: [item],
//     dependances_restantes: [texte], prochaine_etape: texte }
export const ETATS_FINAUX = ['termine', 'bloque', 'partiel'];

export function verifierRapport(r, tache, ctx) {
  const e = [];
  if (!r || typeof r !== 'object') return ['rapport absent'];
  if (r.task_id !== tache?.task_id) e.push(`task_id du rapport (${r.task_id}) différent de la tâche`);
  if (r.agent !== tache?.assigned_agent) e.push(`agent du rapport (${r.agent}) différent de l’agent affecté (${tache?.assigned_agent})`);
  if (!ETATS_FINAUX.includes(r.etat_final)) e.push(`etat_final inconnu : ${r.etat_final}`);
  if (!estTexte(r.resume)) e.push('résumé manquant');
  for (const k of ['fichiers', 'livrables_attendus', 'livrables_fournis', 'tests', 'erreurs', 'hypotheses', 'checklist', 'dependances_restantes']) {
    if (!estListe(r[k])) e.push(`${k} doit être une liste`);
  }
  if (!estTexte(r.prochaine_etape)) e.push('prochaine_etape manquante');
  if (estListe(r.fichiers)) {
    for (const f of r.fichiers) {
      if (!cheminSur(f?.path)) e.push(`chemin invalide : ${f?.path}`);
      if (!['cree', 'modifie'].includes(f?.action)) e.push(`action inconnue pour ${f?.path} : ${f?.action}`);
      if (!NATURES.includes(f?.nature)) e.push(`nature inconnue pour ${f?.path} : ${f?.nature}`);
    }
  }
  if (estListe(r.tests)) {
    for (const t of r.tests) {
      if (!estTexte(t?.commande)) e.push('test sans commande');
      if (!['reussi', 'echoue', 'non_execute'].includes(t?.resultat)) e.push(`résultat de test inconnu : ${t?.resultat}`);
    }
  }
  // un rapport « terminé » fournit tous les livrables attendus de la tâche
  if (tache && r.etat_final === 'termine' && estListe(r.livrables_fournis)) {
    const fournis = new Set(r.livrables_fournis);
    for (const d of tache.expected_deliverables) if (!fournis.has(d.path)) e.push(`livrable attendu non fourni : ${d.path}`);
  }
  if (tache && estListe(r.checklist)) {
    const permis = new Set(tache.checklist_items);
    for (const id of r.checklist) if (!permis.has(id)) e.push(`élément de checklist hors de la tâche : ${id}`);
  }
  // chemins autorisés du rôle
  const role = ctx?.roleParId.get(tache?.assigned_agent);
  if (role && estListe(r.fichiers)) {
    for (const f of r.fichiers) {
      if (cheminSur(f?.path) && !role.chemins_autorises.some((p) => f.path === p || f.path.startsWith(p))) e.push(`hors du périmètre de ${role.id} : ${f.path}`);
    }
  }
  return e;
}

// Fiche de zone (livrable du World Designer, production/fiches/<zone>.json). Chaque information porte
// un statut : « atteste » (vérifié dans le code, avec sa source) ou « proposition » (à confirmer).
//   { zone_id, version, perimetre: { regions, centre: { x, z }, rayon, source }, relief, biomes,
//     chemins: { principaux, secondaires }, acces: [lieu], sorties: [lieu], connexions: [{ zone, moyen, statut }],
//     reperes: [lieu], points_interet: [lieu], zones_cachees, verticalite, obstacles,
//     espaces_vides: [{ description, statut }], narration: { fonction, statut }, ambiance: { visuelle, eclairage, statut } }
//   lieu : { id?, nom, type?, position?: { x, z }, fonction?, statut, source? }
export const STATUTS_INFO = ['atteste', 'proposition'];
export function verifierFiche(f, zone, { biomes = [], zones = [] } = {}) {
  const e = [];
  if (!f || typeof f !== 'object') return ['fiche absente'];
  if (f.zone_id !== zone.id) e.push(`zone_id ${f.zone_id} au lieu de ${zone.id}`);
  const p = f.perimetre;
  if (!p || !Number.isFinite(p.centre?.x) || !Number.isFinite(p.centre?.z) || !(p.rayon > 0)) e.push('perimetre : centre { x, z } et rayon requis (B01)');
  if (!estListe(f.biomes) || !f.biomes.length) e.push('biomes requis (B03)');
  else for (const b of f.biomes) if (!biomes.includes(b)) e.push(`biome inconnu du jeu : ${b}`);
  const lieu = (l, ou) => {
    if (!estTexte(l?.nom)) e.push(`${ou} : nom manquant`);
    if (!STATUTS_INFO.includes(l?.statut)) e.push(`${ou} « ${l?.nom} » : statut atteste ou proposition requis`);
    if (l?.statut === 'atteste' && !cheminSur(l?.source?.split(/[ :#]/)[0])) e.push(`${ou} « ${l?.nom} » : un élément attesté cite sa source dans le code`);
    if (l?.position && !(Number.isFinite(l.position.x) && Number.isFinite(l.position.z))) e.push(`${ou} « ${l?.nom} » : position invalide`);
  };
  for (const k of ['acces', 'sorties', 'points_interet', 'reperes']) {
    if (!estListe(f[k]) || !f[k].length) e.push(`${k} : au moins une entrée`);
    else f[k].forEach((l) => lieu(l, k));
  }
  if (!estListe(f.connexions)) e.push('connexions : liste requise (B07)');
  else for (const c of f.connexions) if (!zones.includes(c?.zone)) e.push(`connexion vers une zone inconnue : ${c?.zone}`);
  if (!estListe(f.espaces_vides)) e.push('espaces_vides : liste requise, éventuellement vide (B13)');
  if (!estTexte(f.narration?.fonction)) e.push('narration.fonction requise (F01)');
  if (!estTexte(f.ambiance?.visuelle)) e.push('ambiance.visuelle requise (F04)');
  return e;
}

// Inventaire des assets (livrable de l'Asset Artist, production/assets/<zone>.json)
//   { zone_id, version, existants: [{ id: 'ARB-001', usage, source }],
//     manquants: [{ id_propose, categorie, description, criteres_da: [], statut: 'specification' }] }
// Un manque n'est « produit » que s'il cite un fichier qui existe (vérifié par le contrôle).
export function verifierInventaire(inv, zone, idsCatalogue) {
  const e = [];
  if (!inv || typeof inv !== 'object') return ['inventaire absent'];
  if (inv.zone_id !== zone.id) e.push(`zone_id ${inv.zone_id} au lieu de ${zone.id}`);
  if (!estListe(inv.existants)) e.push('existants : liste requise');
  else for (const a of inv.existants) if (!idsCatalogue.has(a?.id)) e.push(`référence absente du catalogue : ${a?.id}`);
  if (!estListe(inv.manquants)) e.push('manquants : liste requise');
  else {
    for (const m of inv.manquants) {
      if (!estTexte(m?.id_propose) || !estTexte(m?.description)) e.push('manque sans identifiant proposé ou description');
      if (m?.statut !== 'specification' && !(m?.statut === 'produit' && cheminSur(m?.chemin))) e.push(`manque ${m?.id_propose} : statut « specification », ou « produit » avec son chemin`);
    }
  }
  return e;
}

// Rapport d'intégration (livrable du Technical Artist, production/integration/<zone>.json)
//   { zone_id, version, commit, controles: [{ nom, commande, resultat, detail }], problemes: [] }
export function verifierRapportIntegration(r, zone) {
  const e = [];
  if (!r || typeof r !== 'object') return ['rapport absent'];
  if (r.zone_id !== zone.id) e.push(`zone_id ${r.zone_id} au lieu de ${zone.id}`);
  if (!estListe(r.controles) || !r.controles.length) e.push('controles : au moins un contrôle');
  else for (const c of r.controles) {
    if (!estTexte(c?.nom) || !estTexte(c?.commande)) e.push('contrôle sans nom ou sans commande');
    if (!['reussi', 'echoue', 'non_execute'].includes(c?.resultat)) e.push(`résultat inconnu : ${c?.resultat}`);
  }
  if (!estListe(r.problemes)) e.push('problemes : liste requise');
  return e;
}

// résultat d'un contrôle : { controle, statut: 'reussi' | 'echoue' | 'non_execute', detail, commande? }
export function verifierControle(c) {
  const e = [];
  if (!CONTROLES.includes(c?.controle)) e.push(`contrôle inconnu : ${c?.controle}`);
  if (!CONTROLE[c?.statut]) e.push(`statut de contrôle inconnu : ${c?.statut}`);
  return e;
}
