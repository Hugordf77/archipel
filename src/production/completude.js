// Complétude des zones et statut calculé pour la carte de chantier. Tout découle de l'état rejoué
// (etat.js) : aucune couleur ni pourcentage n'est saisi à la main. Module pur.
//
// Indicateurs (docs/PRODUCTION.md, « Calcul de la complétude ») :
//   conception = éléments applicables spécifiés / éléments applicables
//   production = éléments obligatoires au travail terminé / éléments obligatoires applicables
//                (hors décision de livraison H01, qui ne compte que pour « livrable »)
//   jouable    = éléments obligatoires « jouables » validés ET intégrés / obligatoires jouables
// Les éléments optionnels sont comptés à part, jamais dans ces trois scores ; les non applicables
// sortent du dénominateur ; un élément bloqué ou non vérifié ne compte pas comme fait ; pas de
// crédit partiel. Un élément critique non validé et intégré rend la zone non livrable, quel que
// soit son score.
import { etatItem } from './etat.js';
import { STATUTS_ZONE, PRIORITES } from './statuts.js';
import { SECTIONS } from './checklist.js';

const ratio = (n, d) => (d ? n / d : null);
const actives = new Set(['backlog', 'ready', 'in_progress', 'review', 'rework']);

export function bilanZone(zone, etat, ctx) {
  const elements = ctx.items.filter((i) => i.zone_id === zone.id).map((def) => ({ def, st: etatItem(etat, ctx, def.id) }));
  const applicables = elements.filter((e) => e.st.specification !== 'non_applicable');
  // la décision de livraison (section H) clôt la zone : elle compte pour « livrable », pas pour le chantier
  const obligatoires = applicables.filter((e) => e.def.obligatoire && e.def.section !== 'H');
  const optionnels = applicables.filter((e) => !e.def.obligatoire);
  const jouables = obligatoires.filter((e) => e.def.jouable);
  const taches = [...etat.taches.values()].filter((t) => t.zone_id === zone.id);
  const fait = (e) => e.st.production === 'completed';
  const valideIntegre = (e) => e.st.validation === 'passed' && e.st.integration === 'integrated';

  const tacheActive = (e) => taches.find((t) => t.checklist_items.includes(e.def.id) && actives.has(t.status));
  const manquants = obligatoires.filter((e) => !fait(e)).map((e) => {
    const t = tacheActive(e) || taches.find((x) => x.checklist_items.includes(e.def.id) && x.status === 'blocked');
    return {
      item: e.def.id, cle: e.def.cle, titre: e.def.titre, section: e.def.section, categorie: e.def.categorie,
      critique: e.def.critique, jouable: e.def.jouable, priorite: e.def.priorite,
      pourquoi: e.def.critique ? 'Élément critique : sans lui la zone n’est pas livrable' : e.def.jouable ? 'Requis pour que la zone soit jouable' : 'Élément obligatoire du checklist',
      critere: e.def.critere, specification: e.st.specification, production: e.st.production,
      tache: t?.task_id || null, agent: t?.assigned_agent || e.def.role, bloque: e.st.production === 'blocked' || t?.status === 'blocked',
    };
  });
  const bloques = [
    ...taches.filter((t) => t.status === 'blocked' || t.integration_status === 'integration_failed').map((t) => ({ type: 'tache', id: t.task_id, raison: t.blocage?.raison || t.integration_status, agent: t.assigned_agent })),
    ...obligatoires.filter((e) => e.st.production === 'blocked' && !taches.some((t) => t.status === 'blocked' && t.checklist_items.includes(e.def.id))).map((e) => ({ type: 'element', id: e.def.id, raison: 'élément bloqué', agent: e.def.role })),
  ];
  const critiques = obligatoires.filter((e) => e.def.critique && !valideIntegre(e)).map((e) => e.def.id);

  const scores = {
    conception: ratio(applicables.filter((e) => e.st.specification === 'specifie').length, applicables.length),
    production: ratio(obligatoires.filter(fait).length, obligatoires.length),
    jouable: ratio(jouables.filter(valideIntegre).length, jouables.length),
  };
  const commencee = taches.length > 0 || applicables.some((e) => e.st.production !== 'backlog' || e.st.specification === 'specifie');
  let statut;
  if (bloques.length) statut = 'bloquee';
  else if (!commencee) statut = 'non_commencee';
  else if (manquants.some((m) => !m.tache)) statut = 'en_construction';
  else if (manquants.length) statut = 'partielle';
  else if (obligatoires.some((e) => e.st.validation !== 'passed')) statut = 'en_validation';
  else if (jouables.some((e) => e.st.integration !== 'integrated')) statut = 'validee';
  else statut = 'jouable';
  const decision = etatItem(etat, ctx, `${zone.id}.H01`);
  const livrable = statut === 'jouable' && !critiques.length && decision.validation === 'passed';

  // prochain jalon : le premier manque, critique d'abord, puis par priorité et section
  const ordreP = Object.keys(PRIORITES);
  const prochain = [...manquants].sort((a, b) => (b.critique - a.critique) || (ordreP.indexOf(a.priorite) - ordreP.indexOf(b.priorite)) || a.cle.localeCompare(b.cle))[0] || null;
  const dependants = ctx.zones.filter((z) => (z.dependances || []).some((d) => d.zone === zone.id)).map((z) => z.id);
  const derniere = taches.map((t) => t.updated_at).concat(elements.map((e) => e.st.mis_a_jour)).filter(Boolean).sort().at(-1) || null;

  return {
    zone: zone.id, statut, ...STATUTS_ZONE[statut], scores, livrable, critiques, decision: decision.validation === 'passed' ? 'livrer' : decision.validation === 'failed' ? 'refuser' : null,
    compte: {
      obligatoires: obligatoires.length, obligatoires_faits: obligatoires.filter(fait).length,
      optionnels: optionnels.length, optionnels_faits: optionnels.filter(fait).length,
      non_applicables: elements.length - applicables.length, jouables: jouables.length, jouables_faits: jouables.filter(valideIntegre).length,
      a_specifier: applicables.filter((e) => e.st.specification === 'a_specifier').length,
    },
    manquants, bloques, prochain, dependants,
    taches: taches.map((t) => t.task_id), derniere_activite: derniere,
  };
}

export function bilanMonde(etat, ctx) {
  const zones = ctx.zones.map((z) => bilanZone(z, etat, ctx));
  const taches = [...etat.taches.values()];
  const parStatut = Object.fromEntries(Object.keys(STATUTS_ZONE).map((k) => [k, zones.filter((z) => z.statut === k).length]));
  // progression par catégorie (section) et par rôle : éléments obligatoires au travail terminé
  const parSection = Object.entries(SECTIONS).map(([s, def]) => {
    const els = ctx.items.filter((i) => i.section === s && i.obligatoire).map((d) => etatItem(etat, ctx, d.id)).filter((st) => st.specification !== 'non_applicable');
    return { section: s, label: def.label, total: els.length, faits: els.filter((st) => st.production === 'completed').length, valides: els.filter((st) => st.validation === 'passed').length };
  });
  const parAgent = ctx.roles.map((r) => {
    const ts = taches.filter((t) => t.assigned_agent === r.id);
    const els = ctx.items.filter((i) => i.role === r.id && i.obligatoire).map((d) => etatItem(etat, ctx, d.id)).filter((st) => st.specification !== 'non_applicable');
    const compte = (s) => ts.filter((t) => t.status === s).length;
    return {
      role: r.id, label: r.role, agent: r.agent, total: els.length, faits: els.filter((st) => st.production === 'completed').length,
      taches: ts.length, en_cours: compte('in_progress'), bloquees: compte('blocked'), revue: compte('review'), corrections: compte('rework'), terminees: compte('completed'),
      dernier_rapport: ts.flatMap((t) => t.rapports.map((rp) => ({ task_id: t.task_id, at: rp.at, etat_final: rp.etat_final, resume: rp.resume }))).sort((a, b) => b.at.localeCompare(a.at))[0] || null,
      erreurs: ts.flatMap((t) => t.echecs.map((e) => ({ task_id: t.task_id, ...e }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5),
    };
  });
  // dépendances critiques : tâches en attente d'un prérequis non terminé, zones attendues par d'autres
  const critiquesDeps = taches.filter((t) => t.status === 'backlog' && t.dependencies.length).map((t) => ({
    task_id: t.task_id, zone: t.zone_id, attend: t.dependencies.filter((d) => { const x = etat.taches.get(d); return !(x.status === 'completed' && x.validation_status === 'passed'); }),
  })).filter((d) => d.attend.length);
  return {
    zones, parStatut, parSection, parAgent, critiquesDeps,
    compte: {
      zones: zones.length,
      taches: taches.length,
      bloquees: taches.filter((t) => t.status === 'blocked').length,
      manquants: zones.reduce((n, z) => n + z.manquants.length, 0),
      validations_echouees: [...etat.validations.values()].filter((v) => v.resultat === 'failed').length,
      zones_integrees: zones.filter((z) => z.compte.jouables && z.compte.jouables_faits === z.compte.jouables).length,
      zones_jouables: zones.filter((z) => z.statut === 'jouable').length,
      a_valider: taches.filter((t) => t.status === 'review' || t.validation_status === 'human_review').length,
    },
  };
}
