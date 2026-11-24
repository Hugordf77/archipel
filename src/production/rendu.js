// Chantiers de rendu (docs/RENDU.md) : machine à états et portes de qualité, rejouées depuis le journal
// de production (production/journal.jsonl, même chaîne que les zones). Module pur : etat.js branche les
// gestionnaires ; le banc (scripts/rendu/banc/) calcule mesures et verdicts et les inscrit par
// scripts/rendu/banc/chantier.mjs.
//
//   BRIEF → AUDIT → HYPOTHESES → IMPLEMENTATION → MESURE → CRITIQUE ─┬→ VALIDATION → LIVRAISON
//                                     ↑                               ├→ ITERATION (au plus 3) → IMPLEMENTATION
//                                     └── ITERATION ← ESCALADE ←──────┘ (après 3 itérations, accord humain)
// Aucun état sauté ; un chantier interrompu reprend à son état courant (relu dans le journal).

export const ETATS = ['BRIEF', 'AUDIT', 'HYPOTHESES', 'IMPLEMENTATION', 'MESURE', 'CRITIQUE', 'VALIDATION', 'ITERATION', 'ESCALADE', 'LIVRAISON', 'ABANDON'];
export const ITERATIONS_MAX = 3;
export const SUIVANTS = {
  BRIEF: ['AUDIT', 'ABANDON'],
  AUDIT: ['HYPOTHESES', 'ABANDON'],
  HYPOTHESES: ['IMPLEMENTATION', 'ABANDON'],
  IMPLEMENTATION: ['MESURE', 'ABANDON'],
  MESURE: ['CRITIQUE', 'ABANDON'],
  CRITIQUE: ['VALIDATION', 'ITERATION', 'ESCALADE', 'ABANDON'],
  VALIDATION: ['LIVRAISON', 'ITERATION', 'ABANDON'],
  ITERATION: ['IMPLEMENTATION', 'ABANDON'],
  ESCALADE: ['ITERATION', 'ABANDON'],
  LIVRAISON: [],
  ABANDON: [],
};

// rôles autorisés à faire entrer un chantier dans chaque état (humain : toujours)
export const ROLES_ETAT = {
  AUDIT: ['qa-visuelle', 'technical-artist'],
  HYPOTHESES: ['technical-artist'],
  IMPLEMENTATION: ['technical-artist', 'evis'],
  MESURE: ['qa-visuelle', 'ingenieur-performance'],
  CRITIQUE: ['directeur-artistique'],
  VALIDATION: ['orchestrateur', 'integrateur'],
  ITERATION: ['orchestrateur'],
  ESCALADE: ['orchestrateur'],
  LIVRAISON: ['integrateur'],
  ABANDON: [],
};

export const PORTES = ['tests', 'empreintes', 'gpu', 'metriques', 'critique'];

// Seuils des portes (consigne du chantier rendu, 24/11/2026). satMax : seuil provisoire de la DA
// (« saturation modérée », docs/DA.md), à confirmer par l'utilisateur.
export const SEUILS = {
  noirPur: 0.001,
  ombreSoleil: [0.4, 0.6],
  partOmbreMin: 0.02,
  satMax: 0.85,
  ssimHorsZone: 0.97,
  critiqueMin: 7,
  gpuImage: 12,
  cadrageReference: 'gameplay',
};

export const CRITERES_CRITIQUE = ['lumiere', 'ombres', 'matieres', 'profondeur', 'couleur', 'silhouettes', 'coherence', 'lisibilite', 'bruit', 'vie'];

// --- portes -----------------------------------------------------------------------------------------
// chantier : { critere: { metrique, sens: +1 | -1, gainMin }, cadrages_vises: [..], modele?: 'ARB-001' }
// comparaison : comparaison.json du banc ; gpu : { cadrage: { postes, verdict } } (série après) ;
// tests : { echecs: [nom], acceptes: [nom] } ; empreintes : [ids changés] ; critique : sortie JSON du DA
export function evaluerPortes({ chantier = {}, comparaison, gpu, tests, empreintes, critique, seuils = SEUILS }) {
  const P = {};
  const vises = new Set(chantier.cadrages_vises || []);
  // tests : seuls des échecs acceptés et listés
  if (!tests) P.tests = { verdict: 'absent' };
  else {
    const hors = (tests.echecs || []).filter((n) => !(tests.acceptes || []).includes(n));
    P.tests = { verdict: hors.length ? 'echec' : 'passe', details: hors.length ? `échecs non acceptés : ${hors.join(' ; ')}` : `${(tests.echecs || []).length} échec(s), tous acceptés` };
  }
  // empreintes : seul le modèle travaillé change (aucun, si le chantier ne touche pas de modèle)
  if (!empreintes) P.empreintes = { verdict: 'absent' };
  else {
    const autres = empreintes.filter((id) => id !== chantier.modele);
    P.empreintes = { verdict: autres.length ? 'echec' : 'passe', details: autres.length ? `modèles changés hors chantier : ${autres.join(', ')}` : 'aucun autre modèle changé' };
  }
  // GPU : budgets par poste tenus sur tous les cadrages, image ≤ 12 ms sur la vue de référence
  if (!gpu) P.gpu = { verdict: 'absent' };
  else {
    const fautes = [];
    for (const [cad, g] of Object.entries(gpu)) {
      if (!g) continue;
      for (const d of g.verdict?.depassements || []) fautes.push(`${cad} : ${d.poste} ${d.mesure} > ${d.budget} ms`);
    }
    const ref = gpu[seuils.cadrageReference]?.postes?.image;
    if (typeof ref !== 'number') fautes.push(`vue de référence ${seuils.cadrageReference} non mesurée`);
    else if (ref > seuils.gpuImage) fautes.push(`image ${ref} ms > ${seuils.gpuImage} ms sur ${seuils.cadrageReference}`);
    P.gpu = { verdict: fautes.length ? 'echec' : 'passe', details: fautes.join(' ; ') || `image ${ref} ms sur ${seuils.cadrageReference}` };
  }
  // métriques : pas de noir pur, ombre/soleil dans la cible, saturation sous le seuil, gain mesurable sur
  // le critère visé, pas de régression SSIM hors des cadrages visés
  if (!comparaison) P.metriques = { verdict: 'absent' };
  else {
    const fautes = [];
    let gain = null;
    const k = chantier.critere;
    for (const [cad, c] of Object.entries(comparaison.cadrages || {})) {
      if (c.erreur) {
        fautes.push(`${cad} : ${c.erreur}`);
        continue;
      }
      const a = c.apres;
      if (a.noir_pur > seuils.noirPur) fautes.push(`${cad} : noir pur ${a.noir_pur}`);
      if (a.sat_max > seuils.satMax) fautes.push(`${cad} : saturation max ${a.sat_max} > ${seuils.satMax}`);
      if (typeof a.ombre_soleil === 'number' && (a.part_ombre ?? 1) >= seuils.partOmbreMin) {
        const [lo, hi] = seuils.ombreSoleil;
        if (a.ombre_soleil < lo || a.ombre_soleil > hi) fautes.push(`${cad} : ombre/soleil ${a.ombre_soleil} hors [${lo}, ${hi}]`);
      }
      if (!vises.has(cad) && c.ssim < seuils.ssimHorsZone) fautes.push(`${cad} (hors zone visée) : SSIM ${c.ssim} < ${seuils.ssimHorsZone}`);
      if (k && vises.has(cad) && typeof c.delta?.[k.metrique] === 'number') gain = (gain ?? 0) + c.delta[k.metrique] * (k.sens || 1);
    }
    if (k) {
      if (gain === null) fautes.push(`critère visé ${k.metrique} non mesuré sur les cadrages visés`);
      else if (gain < (k.gainMin ?? 0)) fautes.push(`gain sur ${k.metrique} : ${gain.toFixed(4)} < ${k.gainMin ?? 0}`);
    }
    P.metriques = { verdict: fautes.length ? 'echec' : 'passe', details: fautes.join(' ; ') || (gain !== null ? `gain ${gain.toFixed(4)} sur ${k.metrique}` : 'seuils tenus') };
  }
  // critique : ≥ 7/10 sur les critères touchés, aucun défaut « fort » ouvert
  if (!critique) P.critique = { verdict: 'absent' };
  else {
    const fautes = [];
    const touches = chantier.criteres_touches?.length ? chantier.criteres_touches : CRITERES_CRITIQUE;
    for (const c of touches) {
      const n = critique.notes?.[c];
      if (typeof n !== 'number') fautes.push(`${c} non noté`);
      else if (n < seuils.critiqueMin) fautes.push(`${c} ${n}/10`);
    }
    for (const d of critique.defauts || []) if (d.gravite === 'fort') fautes.push(`défaut fort : ${d.defaut}`);
    P.critique = { verdict: fautes.length ? 'echec' : 'passe', details: fautes.join(' ; ') || 'notes ≥ 7, aucun défaut fort' };
  }
  return { portes: P, ok: PORTES.every((p) => P[p]?.verdict === 'passe') };
}

// --- contrat de la sortie du directeur artistique critique ------------------------------------------
export function verifierCritique(c) {
  const e = [];
  if (!c || typeof c !== 'object') return ['critique absente'];
  for (const k of CRITERES_CRITIQUE) {
    const n = c.notes?.[k];
    if (typeof n !== 'number' || n < 0 || n > 10) e.push(`note « ${k} » manquante ou hors 0–10`);
  }
  if (!Array.isArray(c.defauts) || c.defauts.length > 3) e.push('au plus 3 défauts prioritaires');
  for (const d of c.defauts || []) {
    if (!['fort', 'moyen', 'faible'].includes(d.gravite)) e.push(`gravité invalide : ${d.gravite}`);
    if (!/^[\w./-]+:\d+$/.test(d.cause || '')) e.push(`cause sans fichier:ligne : ${d.cause}`);
  }
  return e;
}

// --- gestionnaires d'événements (branchés dans etat.js) ---------------------------------------------
// refuse(msg) lève l'erreur du workflow ; estHumain(acteur)
export function gestionnairesRendu({ refuse, estHumain }) {
  const exiger = (c, m) => { if (!c) refuse(m); };
  const chantier = (etat, id) => etat.rendu.get(id) || refuse(`chantier de rendu inconnu : ${id}`);
  return {
    'rendu.chantier.ouvert'(etat, ctx, evt) {
      const d = evt.donnees;
      exiger(evt.acteur === 'orchestrateur' || estHumain(evt.acteur), 'seul l’orchestrateur ou un humain ouvre un chantier de rendu');
      exiger(/^REN-\d{3}$/.test(d.chantier_id || ''), 'chantier_id invalide (REN-000)');
      exiger(!etat.rendu.has(d.chantier_id), `chantier déjà ouvert : ${d.chantier_id}`);
      exiger(d.titre && d.brief, 'un chantier a un titre et un brief');
      exiger(d.critere?.metrique, 'un chantier vise un critère mesurable (critere.metrique)');
      etat.rendu.set(d.chantier_id, {
        chantier_id: d.chantier_id, titre: d.titre, brief: d.brief, critere: d.critere,
        cadrages_vises: d.cadrages_vises || [], criteres_touches: d.criteres_touches || [], modele: d.modele || null,
        etat: 'BRIEF', iterations: 0, ouvert: evt.at, maj: evt.at, historique: [{ etat: 'BRIEF', evenement: evt.id, at: evt.at, acteur: evt.acteur }],
        audit: null, hypotheses: [], implementation: null, mesures: [], critiques: [], portes: null, validation: null, commit: null,
      });
    },
    'rendu.etat'(etat, ctx, evt) {
      const d = evt.donnees;
      const c = chantier(etat, d.chantier_id);
      const vers = d.vers;
      exiger(ETATS.includes(vers), `état inconnu : ${vers}`);
      exiger((SUIVANTS[c.etat] || []).includes(vers), `${c.chantier_id} : ${c.etat} → ${vers} interdit (suivants : ${(SUIVANTS[c.etat] || []).join(', ') || 'aucun'})`);
      exiger(estHumain(evt.acteur) || (ROLES_ETAT[vers] || []).includes(evt.acteur), `${evt.acteur} ne peut pas faire passer un chantier en ${vers}`);
      if (vers === 'AUDIT') {
        exiger(d.metriques && d.serie, 'audit : série du banc et métriques requises');
        exiger(Array.isArray(d.causes) && d.causes.length && d.causes.every((x) => /:\d+$/.test(x.cause || '')), 'audit : causes avec fichier:ligne requises');
        c.audit = { serie: d.serie, metriques: d.metriques, planche: d.planche || null, causes: d.causes };
      }
      if (vers === 'HYPOTHESES') {
        exiger(Array.isArray(d.hypotheses) && d.hypotheses.length, 'au moins une hypothèse');
        for (const h of d.hypotheses) exiger(h.id && h.texte && typeof h.gain === 'number' && typeof h.cout === 'number', 'hypothèse : id, texte, gain et coût chiffrés');
        const r = d.hypotheses.map((h) => h.gain / Math.max(h.cout, 0.01));
        exiger(r.every((v, i) => i === 0 || r[i - 1] >= v), 'hypothèses classées par gain / coût décroissant');
        c.hypotheses = d.hypotheses;
      }
      if (vers === 'IMPLEMENTATION') {
        exiger(c.hypotheses.some((h) => h.id === d.hypothese), `hypothèse inconnue : ${d.hypothese}`);
        exiger(Array.isArray(d.fichiers) && d.fichiers.length, 'fichiers modifiés requis');
        exiger(/^pipeline\.settings\.\w+$/.test(d.bascule || ''), 'implémentation derrière une bascule pipeline.settings.<passe>');
        c.implementation = { hypothese: d.hypothese, fichiers: d.fichiers, bascule: d.bascule };
      }
      if (vers === 'MESURE') {
        exiger(d.avant && d.apres && d.comparaison, 'mesure : séries avant et après, comparaison');
        exiger(d.gpu && d.tests, 'mesure : coût GPU et résultat des tests');
        c.mesures.push({ evenement: evt.id, avant: d.avant, apres: d.apres, comparaison: d.comparaison, gpu: d.gpu, tests: d.tests, empreintes: d.empreintes || [], captures: d.captures || [] });
      }
      if (vers === 'CRITIQUE') {
        const e = verifierCritique(d.critique);
        exiger(!e.length, `critique invalide : ${e.join(' ; ')}`);
        exiger(d.portes && PORTES.every((p) => d.portes[p]?.verdict), 'verdicts de toutes les portes requis');
        c.critiques.push({ evenement: evt.id, critique: d.critique });
        c.portes = d.portes;
      }
      if (vers === 'VALIDATION') exiger(c.portes && PORTES.every((p) => c.portes[p].verdict === 'passe'), 'validation demandée avec une porte non passée');
      if (vers === 'ITERATION') {
        exiger(c.iterations < ITERATIONS_MAX || (c.etat === 'ESCALADE' && estHumain(evt.acteur)), `${ITERATIONS_MAX} itérations faites : escalade vers l'utilisateur`);
        if (c.etat === 'CRITIQUE') exiger(c.portes && PORTES.some((p) => c.portes[p].verdict !== 'passe'), 'itération sans porte en échec : demander la validation');
        c.iterations += 1;
      }
      if (vers === 'ESCALADE') exiger(c.iterations >= ITERATIONS_MAX, `escalade avant ${ITERATIONS_MAX} itérations`);
      if (vers === 'LIVRAISON') {
        exiger(d.validation_utilisateur && d.validation_utilisateur.citation, 'livraison sans validation de l’utilisateur (citation)');
        exiger(/^[0-9a-f]{7,40}$/.test(d.commit || ''), 'livraison : commit requis');
        c.validation = d.validation_utilisateur;
        c.commit = d.commit;
      }
      if (vers === 'ABANDON') exiger(estHumain(evt.acteur), 'seul l’utilisateur abandonne un chantier');
      c.etat = vers;
      c.maj = evt.at;
      c.historique.push({ etat: vers, evenement: evt.id, at: evt.at, acteur: evt.acteur });
    },
  };
}
