// Statuts du suivi de production : trois axes séparés (production, validation, intégration), jamais
// fusionnés, et les transitions autorisées sur chacun. Module pur (dashboard, scripts Node, tests).
// Une tâche peut être terminée sans être validée ; un livrable validé sans être intégré.

export const PRODUCTION = {
  backlog: 'À définir',
  ready: 'Prête',
  in_progress: 'En cours',
  blocked: 'Bloquée',
  review: 'À valider',
  rework: 'À corriger',
  completed: 'Travail terminé',
};

export const VALIDATION = {
  not_checked: 'Non contrôlé',
  running: 'Contrôles en cours',
  passed: 'Contrôles réussis',
  failed: 'Contrôles échoués',
  human_review: 'Validation humaine nécessaire',
};

export const INTEGRATION = {
  not_integrated: 'Non intégrée',
  integration_ready: 'Prête à intégrer',
  integrating: 'Intégration en cours',
  integrated: 'Intégrée',
  integration_failed: "Échec d'intégration",
};

// spécification d'un élément de checklist (complétude de conception)
export const SPECIFICATION = {
  a_specifier: 'À spécifier',
  specifie: 'Spécifié',
  non_applicable: 'Non applicable',
};

// résultat d'un contrôle automatique : un contrôle non exécuté n'est jamais « réussi »
export const CONTROLE = { reussi: 'Réussi', echoue: 'Échoué', non_execute: 'Non exécuté' };

// décision de revue indépendante
export const REVUE = {
  accepte: 'Accepté',
  refuse: 'Refusé avec défauts',
  bloque: 'Bloqué par une dépendance',
  humain: 'En attente de validation humaine',
};

export const PRIORITES = { P1: 'Critique', P2: 'Haute', P3: 'Normale', P4: 'Basse' };

// transitions autorisées : état courant → états suivants possibles
export const TRANSITIONS = {
  production: {
    backlog: ['ready', 'blocked'],
    ready: ['in_progress', 'blocked', 'backlog'],
    in_progress: ['review', 'blocked'],
    blocked: ['ready', 'in_progress', 'backlog'],
    review: ['completed', 'rework', 'blocked'],
    rework: ['in_progress', 'review', 'blocked'],
    // rouvrir un travail terminé passe par une décision humaine tracée (task.reopened)
    completed: ['rework'],
  },
  validation: {
    not_checked: ['running'],
    running: ['passed', 'failed', 'human_review'],
    passed: ['running'],
    failed: ['running', 'human_review'],
    human_review: ['passed', 'failed', 'running'],
  },
  integration: {
    not_integrated: ['integration_ready'],
    integration_ready: ['integrating', 'not_integrated'],
    integrating: ['integrated', 'integration_failed'],
    integration_failed: ['integrating', 'not_integrated'],
    // remplacer une version intégrée exige une approbation humaine (deliverable.replaced)
    integrated: ['not_integrated'],
  },
};

export function transitionPermise(axe, de, vers) {
  return de === vers || Boolean(TRANSITIONS[axe]?.[de]?.includes(vers));
}

// nombre de tentatives automatiques avant intervention humaine
export const TENTATIVES_MAX = 3;

// statut calculé d'une zone (completude.js) : couleur, motif, icône et libellé, pour ne pas reposer
// sur la seule couleur. Le rouge reste le signal principal du chantier incomplet.
export const STATUTS_ZONE = {
  non_commencee: { label: 'Non commencée', couleur: '#8e979f', motif: 'pointille', icone: '○', rang: 0 },
  bloquee: { label: 'Bloquée', couleur: '#7d1f24', motif: 'hachures', icone: '⛔', rang: 1 },
  en_construction: { label: 'En construction', couleur: '#d2343b', motif: 'plein', icone: '▲', rang: 2 },
  partielle: { label: 'Partielle, manques en cours', couleur: '#e58a2e', motif: 'tirets', icone: '◐', rang: 3 },
  en_validation: { label: 'En validation', couleur: '#7f58c4', motif: 'points', icone: '◇', rang: 4 },
  validee: { label: 'Validée, intégration en attente', couleur: '#5fae7f', motif: 'contour', icone: '✓', rang: 5 },
  jouable: { label: 'Intégrée et jouable', couleur: '#1f8a5b', motif: 'plein', icone: '★', rang: 6 },
};
