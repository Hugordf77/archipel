// Workflow de production de bout en bout, sur un dépôt temporaire : chantier, dépendances, rapport
// d'agent, contrôles réels (fichiers, JSON, schéma de fiche, périmètre), revue indépendante,
// tentatives limitées, livrables validés protégés, intégration distincte, journal chaîné et reprise.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { charger, ajouter, empreinteFichier, RACINE } from '../scripts/production/depot.mjs';
import { lancerChantier, demarrer, soumettreRapport, decider, lancerValidation, creerTache, evenement } from '../scripts/production/actions.mjs';
import { constatsAudit } from '../scripts/production/audit.mjs';
import { brouillonsRapport } from '../src/production/orchestrateur.js';
import { bilanZone, bilanMonde } from '../src/production/completude.js';
import { TENTATIVES_MAX } from '../src/production/statuts.js';

let r;
beforeEach(() => {
  r = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-workflow-'));
  fs.mkdirSync(path.join(r, 'production'));
  for (const f of ['zones.json', 'agents.json']) fs.copyFileSync(path.join(RACINE, 'production', f), path.join(r, 'production', f));
  fs.mkdirSync(path.join(r, 'src/models'), { recursive: true });
  fs.copyFileSync(path.join(RACINE, 'src/models/releves.gen.js'), path.join(r, 'src/models/releves.gen.js'));
});
const o = () => ({ racine: r });
const ecrire = (p, contenu) => {
  fs.mkdirSync(path.dirname(path.join(r, p)), { recursive: true });
  fs.writeFileSync(path.join(r, p), typeof contenu === 'string' ? contenu : JSON.stringify(contenu, null, 2));
};
const tache = (id) => charger(r).etat.taches.get(id);
const FICHE = 'production/fiches/ZONE-ILE-VERTE.json';
const fiche = (extra = {}) => ({
  zone_id: 'ZONE-ILE-VERTE', version: 1, perimetre: { regions: ['home'], centre: { x: 0, z: 0 }, rayon: 450 }, relief: 'collines', biomes: ['prairie'],
  chemins: { principaux: [], secondaires: [] }, acces: [{ nom: 'Ponton', statut: 'proposition' }], sorties: [{ nom: 'Ponton', statut: 'proposition' }],
  connexions: [{ zone: 'ZONE-PLAINES-COLOREES', moyen: 'bateau', statut: 'proposition' }], reperes: [{ nom: 'Moulin', statut: 'proposition' }],
  points_interet: [{ nom: 'Maison', statut: 'proposition' }], espaces_vides: [], narration: { fonction: 'Le souvenir du départ', statut: 'proposition' },
  ambiance: { visuelle: 'prairie pastel', statut: 'proposition' }, ...extra,
});
const rapport = (task, agent, livrables, extra = {}) => ({
  task_id: task, agent, etat_final: 'termine', resume: 'travail fait', fichiers: livrables.map((p) => ({ path: p, action: 'cree', nature: 'specification' })),
  livrables_attendus: livrables, livrables_fournis: livrables, tests: [], erreurs: [], hypotheses: [], decisions: [], checklist: [], dependances_restantes: [], prochaine_etape: 'revue', ...extra,
});
// la fiche du World Designer, produite, contrôlée et acceptée par un relecteur indépendant
async function ficheAcceptee() {
  if (!charger(r).etat.taches.size) lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
  demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
  ecrire(FICHE, fiche());
  const s = await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
  expect(s.validation.resultat).toBe('passed');
  decider('TASK-ILE-VERTE-001', 'accepte', { commentaire: 'conforme' }, { ...o(), acteur: 'archipel-critique' });
}

describe('chantier et dépendances', () => {
  it('crée l’objectif et une tâche par agent, reliées par des dépendances explicites', () => {
    const c = lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    expect(c.objectif.objective_id).toBe('OBJ-0001');
    expect(c.taches).toEqual(['TASK-ILE-VERTE-001', 'TASK-ILE-VERTE-002', 'TASK-ILE-VERTE-003', 'TASK-ILE-VERTE-004']);
    const { etat } = charger(r);
    const t = c.taches.map((id) => etat.taches.get(id));
    expect(t.map((x) => x.assigned_agent)).toEqual(['world-designer', 'asset-artist', 'gameplay', 'technical-artist']);
    expect(t.map((x) => x.status)).toEqual(['ready', 'backlog', 'backlog', 'backlog']);
    expect(t[3].dependencies).toEqual(['TASK-ILE-VERTE-002', 'TASK-ILE-VERTE-003']);
    for (const x of t) {
      expect(x.acceptance_criteria.length).toBeGreaterThan(0);
      expect(x.validation_status).toBe('not_checked');
      expect(x.integration_status).toBe('not_integrated');
    }
  });

  it('ne démarre jamais une tâche dont les prérequis ne sont pas terminés et validés', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    expect(() => demarrer('TASK-ILE-VERTE-002', { ...o(), acteur: 'asset-artist' })).toThrow(/pas prête/);
    expect(() => evenement('task.ready', 'orchestrateur', { task_id: 'TASK-ILE-VERTE-004' }, o())).toThrow(/prérequis non satisfait/);
    await ficheAcceptee();
    expect(tache('TASK-ILE-VERTE-002').status).toBe('ready');
    expect(tache('TASK-ILE-VERTE-003').status).toBe('ready');
    expect(tache('TASK-ILE-VERTE-004').status).toBe('backlog');
  });

  it('suspend les tâches qui dépendent d’une clarification, laisse avancer les autres', () => {
    // une zone encore absente du monde du jeu
    const fz = path.join(r, 'production/zones.json');
    const zd = JSON.parse(fs.readFileSync(fz, 'utf8'));
    zd.zones.find((z) => z.id === 'ZONE-LAC-CELESTE').jeu.zones = [];
    fs.writeFileSync(fz, JSON.stringify(zd));
    const c = lancerChantier({ zone_id: 'ZONE-LAC-CELESTE' }, o());
    expect(c.objectif.clarifications[0]).toMatch(/n’existe pas encore dans le monde/);
    expect(c.suspendues).toEqual(['TASK-LAC-CELESTE-003', 'TASK-LAC-CELESTE-004']);
    expect(tache('TASK-LAC-CELESTE-001').status).toBe('ready');
    const { etat, ctx } = charger(r);
    expect(bilanZone(ctx.zoneParId.get('ZONE-LAC-CELESTE'), etat, ctx).statut).toBe('bloquee');
  });

  it('refuse une dépendance inexistante et une tâche sans critères', () => {
    const base = { zone_id: 'ZONE-ILE-VERTE', title: 't', description: 'd', assigned_agent: 'gameplay', expected_deliverables: [{ path: 'tests/zones/t.test.js', nature: 'test' }], acceptance_criteria: ['vert'], validation_method: { controles: ['fichiers'] } };
    expect(() => creerTache({ ...base, dependencies: ['TASK-ILE-VERTE-999'] }, o())).toThrow(/dépendance inexistante/);
    expect(() => creerTache({ ...base, acceptance_criteria: [] }, o())).toThrow(/critères/);
    expect(creerTache(base, o()).task_id).toBe('TASK-ILE-VERTE-001');
  });
});

describe('rapport, contrôles et revue', () => {
  it('un rapport conforme déclenche les contrôles ; la revue indépendante termine la tâche et met à jour le checklist', async () => {
    await ficheAcceptee();
    const t = tache('TASK-ILE-VERTE-001');
    expect([t.status, t.validation_status, t.integration_status]).toEqual(['completed', 'passed', 'integration_ready']);
    const { etat } = charger(r);
    const v = etat.validations.get(t.validations[0]);
    expect(v.controles.map((c) => [c.controle, c.statut])).toEqual([['fichiers', 'reussi'], ['json', 'reussi'], ['fiche-zone', 'reussi'], ['perimetre', 'reussi']]);
    expect(etat.livrables.get(t.livrables[0]).sha256_valide).toMatch(/^[0-9a-f]{64}$/);
    const st = etat.items.get('ZONE-ILE-VERTE.B06');
    expect([st.specification, st.production, st.validation]).toEqual(['specifie', 'completed', 'passed']);
  });

  it('l’agent producteur ne peut pas approuver son propre livrable, ni un relecteur d’un autre domaine', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche());
    await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
    for (const acteur of ['world-designer', 'archipel-calibrateur', 'evis-critique']) {
      expect(() => decider('TASK-ILE-VERTE-001', 'accepte', {}, { ...o(), acteur })).toThrow(/relecteur/);
    }
    expect(tache('TASK-ILE-VERTE-001').status).toBe('review');
  });

  it('refuse un rapport hors périmètre, un livrable absent et un rapport signé par un autre agent', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche());
    await expect(soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE], { fichiers: [{ path: 'src/app/Game.js', action: 'modifie', nature: 'fichier' }] }), o())).rejects.toThrow(/hors du périmètre/);
    await expect(soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', ['production/fiches/absente.json']), o())).rejects.toThrow(/absents du disque/);
    await expect(soumettreRapport(rapport('TASK-ILE-VERTE-001', 'gameplay', [FICHE]), o())).rejects.toThrow();
    expect(tache('TASK-ILE-VERTE-001').status).toBe('in_progress');
  });

  it('un échec de contrôle renvoie en correction avec les défauts, et les tentatives sont limitées', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    for (let i = 1; i <= TENTATIVES_MAX; i++) {
      demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
      ecrire(FICHE, fiche({ biomes: [], essai: i }));
      const s = await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
      expect(s.validation.resultat).toBe('failed');
      const t = tache('TASK-ILE-VERTE-001');
      expect(t.retry_count).toBe(i);
      expect(t.defauts.join()).toMatch(/biomes requis/);
      expect(t.status).toBe(i < TENTATIVES_MAX ? 'rework' : 'blocked');
    }
    const t = tache('TASK-ILE-VERTE-001');
    expect(t.validation_status).toBe('human_review');
    expect(t.intervention_humaine).toBe(true);
    expect(t.echecs).toHaveLength(TENTATIVES_MAX); // preuves de chaque échec conservées
    expect(() => demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' })).toThrow();
    expect(() => evenement('task.unblocked', 'orchestrateur', { task_id: 'TASK-ILE-VERTE-001', vers: 'ready' }, o())).toThrow(/décision humaine/);
    evenement('task.unblocked', 'humain', { task_id: 'TASK-ILE-VERTE-001', vers: 'ready' }, o());
    expect(tache('TASK-ILE-VERTE-001').status).toBe('ready');
  });

  it('un livrable refusé en revue se corrige sans approbation humaine', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche());
    await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
    decider('TASK-ILE-VERTE-001', 'refuse', { criteres_echoues: ['B08'], correction_attendue: 'repère mesuré' }, { ...o(), acteur: 'archipel-critique' });
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche({ reperes: [{ nom: 'Sommet', statut: 'proposition' }] }));
    const s = await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
    expect(s.validation.resultat).toBe('passed');
    expect(tache('TASK-ILE-VERTE-001').livrables).toHaveLength(2);
  });

  it('un refus de revue exige critères échoués et correction attendue', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche());
    await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
    expect(() => decider('TASK-ILE-VERTE-001', 'refuse', {}, { ...o(), acteur: 'archipel-critique' })).toThrow(/critères échoués/);
    const t = decider('TASK-ILE-VERTE-001', 'refuse', { criteres_echoues: ['B09 sans positions'], correction_attendue: 'positions des points d’intérêt' }, { ...o(), acteur: 'archipel-critique' });
    expect([t.status, t.retry_count]).toEqual(['rework', 1]);
    expect(t.defauts[0]).toMatch(/B09 sans positions → positions/);
  });

  it('les critères d’acceptation ne changent que par décision humaine', () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    const d = { task_id: 'TASK-ILE-VERTE-001', acceptance_criteria: ['plus rien'], raison: 'facilité' };
    expect(() => evenement('task.criteria_changed', 'world-designer', d, o())).toThrow(/décision humaine/);
    evenement('task.criteria_changed', 'humain', d, o());
    const t = tache('TASK-ILE-VERTE-001');
    expect(t.acceptance_criteria).toEqual(['plus rien']);
    expect(t.criteres_initiaux.length).toBeGreaterThan(1);
  });

  it('un humain peut réduire le périmètre d’une tâche : les éléments retirés ne seront pas comptés faits', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    const avant = tache('TASK-ILE-VERTE-001');
    const garde = avant.checklist_items.filter((id) => id !== 'ZONE-ILE-VERTE.B10' && id !== 'ZONE-ILE-VERTE.F01');
    expect(() => evenement('task.criteria_changed', 'humain', { task_id: avant.task_id, acceptance_criteria: ['x'], checklist_items: [...garde, 'ZONE-ILE-VERTE.C01'], raison: 'r' }, o())).toThrow(/réduire/);
    evenement('task.criteria_changed', 'humain', { task_id: avant.task_id, acceptance_criteria: avant.acceptance_criteria, checklist_items: garde, raison: 'F01 attend la vision narrative' }, o());
    await ficheAcceptee();
    const { etat } = charger(r);
    expect(etat.items.get('ZONE-ILE-VERTE.B06').production).toBe('completed');
    expect(etat.items.get('ZONE-ILE-VERTE.F01').production).not.toBe('completed');
  });
});

describe('livrables validés et intégration', () => {
  it('un livrable validé ne peut pas être remplacé sans approbation humaine', async () => {
    await ficheAcceptee();
    evenement('task.reopened', 'humain', { task_id: 'TASK-ILE-VERTE-001', raison: 'nouvelle exigence' }, o());
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche({ relief: 'nouvelles collines' }));
    await expect(soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o())).rejects.toThrow(/approbation humaine/);
    const ancien = tache('TASK-ILE-VERTE-001').livrables[0];
    evenement('deliverable.replacement_approved', 'humain', { deliverable_id: ancien, raison: 'relief retravaillé' }, o());
    const s = await soumettreRapport(rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), o());
    expect(s.validation.resultat).toBe('passed');
    expect(charger(r).etat.livrables.get(ancien).remplace_par).toBeTruthy(); // l'ancienne version reste dans l'historique
  });

  it('l’intégration est une étape distincte : refusée avant validation, et le fichier intégré doit être celui validé', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    expect(() => evenement('integration.started', 'technical-artist', { task_id: 'TASK-ILE-VERTE-001', integration_id: 'INT-X-01', version: 'v' }, o())).toThrow(/avant validation/);
    await ficheAcceptee();
    expect(tache('TASK-ILE-VERTE-001').integration_status).toBe('integration_ready');
    ajouter([{ type: 'integration.started', acteur: 'technical-artist', cle: 'i1', donnees: { task_id: 'TASK-ILE-VERTE-001', integration_id: 'INT-ILE-VERTE-001-01', version: 'test' } }], o());
    const ok = [{ controle: 'fichiers', statut: 'reussi', detail: 'présent' }];
    const fin = (cle, d) => ajouter([{ type: 'integration.completed', acteur: 'controles', cle, donnees: { task_id: 'TASK-ILE-VERTE-001', integration_id: 'INT-ILE-VERTE-001-01', ...d } }], o());
    expect(() => fin('i2', { controles: ok, empreintes: { [FICHE]: '0'.repeat(64) } })).toThrow(/changé depuis sa validation/);
    expect(() => fin('i3', { controles: [{ controle: 'suite', statut: 'non_execute', detail: '' }] })).toThrow(/post-intégration/);
    fin('i4', { controles: ok });
    const t = tache('TASK-ILE-VERTE-001');
    expect([t.status, t.validation_status, t.integration_status]).toEqual(['completed', 'passed', 'integrated']);
  });
});

describe('journal : traçabilité, idempotence, reprise', () => {
  it('les constats d’audit ont une preuve et ne valent jamais validation', () => {
    expect(() => ajouter([{ type: 'checklist.item.updated', acteur: 'audit', cle: 'a', donnees: { item_id: 'ZONE-ILE-VERTE.B02', changements: { validation: 'passed' }, preuve: 'x' } }], o())).toThrow(/ne vaut pas validation/);
    expect(() => ajouter([{ type: 'checklist.item.updated', acteur: 'audit', cle: 'b', donnees: { item_id: 'ZONE-ILE-VERTE.B02', changements: { production: 'completed' } } }], o())).toThrow(/sans preuve/);
    const { ctx } = charger(r);
    const { brouillons, ecarts } = constatsAudit(ctx, RACINE);
    expect(ecarts).toEqual([]);
    expect(brouillons).toHaveLength(19 * 9);
  });

  it('une commande répétée n’écrit rien de plus ; un lot refusé n’écrit rien', () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    const n = charger(r).evenements.length;
    const d = { type: 'task.blocked', acteur: 'humain', cle: 'blocage-1', donnees: { task_id: 'TASK-ILE-VERTE-001', raison: 'attente' } };
    ajouter([d], o());
    expect(ajouter([d], o()).ignores).toEqual(['blocage-1']);
    expect(() => ajouter([{ ...d, cle: 'x', donnees: { task_id: 'TASK-ILE-VERTE-002', raison: 'attente' } }, { type: 'task.started', acteur: 'gameplay', cle: 'y', donnees: { task_id: 'TASK-ILE-VERTE-001' } }], o())).toThrow();
    expect(charger(r).evenements.length).toBe(n + 1);
    // la même commande humaine, plus tard, est bien enregistrée (débloquer deux fois dans la vie d'une tâche)
    evenement('task.unblocked', 'humain', { task_id: 'TASK-ILE-VERTE-001', vers: 'ready' }, o());
    evenement('task.blocked', 'humain', { task_id: 'TASK-ILE-VERTE-001', raison: 'attente' }, o());
    expect(evenement('task.unblocked', 'humain', { task_id: 'TASK-ILE-VERTE-001', vers: 'ready' }, o())).toBeGreaterThan(0);
    expect(tache('TASK-ILE-VERTE-001').status).toBe('ready');
  });

  it('détecte une ligne modifiée ou supprimée et refuse alors toute écriture', () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    const f = path.join(r, 'production/journal.jsonl');
    const lignes = fs.readFileSync(f, 'utf8').trim().split('\n');
    fs.writeFileSync(f, `${[lignes[0].replace('Préparer', 'Préparé'), ...lignes.slice(1)].join('\n')}\n`);
    expect(charger(r).integrite[0].erreur).toMatch(/modifié/);
    expect(() => evenement('task.blocked', 'humain', { task_id: 'TASK-ILE-VERTE-001', raison: 'x' }, o())).toThrow(/corrompu/);
    fs.writeFileSync(f, `${lignes.slice(1).join('\n')}\n`);
    expect(charger(r).integrite.length).toBeGreaterThan(0);
  });

  it('une validation interrompue se relance sans corrompre l’état ; les vues sont identiques après redémarrage', async () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, o());
    demarrer('TASK-ILE-VERTE-001', { ...o(), acteur: 'world-designer' });
    ecrire(FICHE, fiche());
    // rapport enregistré, puis contrôles lancés et « coupés » avant leur conclusion
    const { etat } = charger(r);
    ajouter(brouillonsRapport(etat, rapport('TASK-ILE-VERTE-001', 'world-designer', [FICHE]), { [FICHE]: { sha256: empreinteFichier(path.join(r, FICHE)), taille: 1 } }), o());
    ajouter([{ type: 'validation.started', acteur: 'controles', cle: 'v-coupee', donnees: { task_id: 'TASK-ILE-VERTE-001', validation_id: 'VAL-COUPEE' } }], o());
    expect(tache('TASK-ILE-VERTE-001').validation_status).toBe('running');
    const v = await lancerValidation('TASK-ILE-VERTE-001', o());
    expect(v.resultat).toBe('passed');
    const a = charger(r);
    const b = charger(r);
    expect(JSON.stringify(bilanMonde(a.etat, a.ctx))).toBe(JSON.stringify(bilanMonde(b.etat, b.ctx)));
    expect(a.erreurs).toEqual([]);
  });
});
