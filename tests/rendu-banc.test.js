// Banc de rendu et chantiers de rendu (docs/RENDU.md) : machine à états rejouée par le vrai journal de
// production (dépôt temporaire), portes de qualité, cadrages, bascules A/B, budgets GPU et formules des
// métriques d'image (metriques.py --autotest).
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { charger, ajouter, RACINE } from '../scripts/production/depot.mjs';
import { evaluerPortes, verifierCritique, ITERATIONS_MAX, PORTES, CRITERES_CRITIQUE, SUIVANTS, ETATS } from '../src/production/rendu.js';
import { CADRAGES, viseeSoleil } from '../scripts/rendu/banc/cadrages.js';
import { BUDGETS, verifierBudgets } from '../scripts/rendu/banc/budgets.js';

let r;
beforeEach(() => {
  r = fs.mkdtempSync(path.join(os.tmpdir(), 'rendu-chantier-'));
  fs.mkdirSync(path.join(r, 'production'));
  for (const f of ['zones.json', 'agents.json']) fs.copyFileSync(path.join(RACINE, 'production', f), path.join(r, 'production', f));
});
const ID = 'REN-001';
let n = 0;
const evt = (type, acteur, donnees) => ajouter([{ type, acteur, cle: `t:${n++}`, donnees }], { racine: r });
const etat = (vers, acteur, d = {}) => evt('rendu.etat', acteur, { chantier_id: ID, vers, ...d });
const chantier = () => charger(r).etat.rendu.get(ID);
const notes = (v) => Object.fromEntries(CRITERES_CRITIQUE.map((k) => [k, v]));
const passe = Object.fromEntries(PORTES.map((p) => [p, { verdict: 'passe' }]));
const echoue = { ...passe, gpu: { verdict: 'echec', details: 'image 14 ms' } };
const ouvrir = () => evt('rendu.chantier.ouvert', 'orchestrateur', { chantier_id: ID, titre: 'Lumière', brief: 'ombres plus lisibles', critere: { metrique: 'contraste_local', sens: 1, gainMin: 0.002 }, cadrages_vises: ['gameplay'] });
const jusquaCritique = (portes = passe) => {
  etat('AUDIT', 'qa-visuelle', { serie: 's0', metriques: {}, causes: [{ cause: 'src/render/shaders/chunks.js:213', defaut: 'ombre trop claire' }] });
  etat('HYPOTHESES', 'technical-artist', { hypotheses: [{ id: 'H1', texte: 'a', gain: 3, cout: 1 }, { id: 'H2', texte: 'b', gain: 1, cout: 1 }] });
  etat('IMPLEMENTATION', 'technical-artist', { hypothese: 'H1', fichiers: ['src/render/shaders/chunks.js'], bascule: 'pipeline.settings.ombres' });
  etat('MESURE', 'qa-visuelle', { avant: 's0', apres: 's1', comparaison: {}, gpu: {}, tests: {} });
  etat('CRITIQUE', 'directeur-artistique', { critique: { notes: notes(8), defauts: [] }, portes });
};

describe('chantier de rendu : machine à états dans le journal', () => {
  it('va du brief à la livraison sans sauter d’état, avec validation de l’utilisateur et commit', () => {
    ouvrir();
    jusquaCritique();
    etat('VALIDATION', 'orchestrateur');
    expect(() => etat('LIVRAISON', 'integrateur', { commit: 'abc1234' })).toThrow(/validation de l’utilisateur/);
    etat('LIVRAISON', 'integrateur', { commit: 'abc1234', validation_utilisateur: { citation: 'valide', at: '2026-11-24' } });
    const c = chantier();
    expect(c.etat).toBe('LIVRAISON');
    expect(c.historique.map((h) => h.etat)).toEqual(['BRIEF', 'AUDIT', 'HYPOTHESES', 'IMPLEMENTATION', 'MESURE', 'CRITIQUE', 'VALIDATION', 'LIVRAISON']);
    // journal intact et rejoué à l'identique (reprise après interruption)
    expect(charger(r).integrite).toEqual([]);
  });

  it('refuse un état sauté, un rôle non autorisé et des données incomplètes, sans rien écrire', () => {
    ouvrir();
    const avant = fs.readFileSync(path.join(r, 'production/journal.jsonl'), 'utf8');
    expect(() => etat('IMPLEMENTATION', 'technical-artist', { hypothese: 'H1', fichiers: ['x'], bascule: 'pipeline.settings.x' })).toThrow(/interdit/);
    expect(() => etat('AUDIT', 'directeur-artistique', { serie: 's', metriques: {}, causes: [{ cause: 'a.js:1' }] })).toThrow(/ne peut pas/);
    expect(() => etat('AUDIT', 'qa-visuelle', { serie: 's', metriques: {}, causes: [{ cause: 'quelque part' }] })).toThrow(/fichier:ligne/);
    expect(fs.readFileSync(path.join(r, 'production/journal.jsonl'), 'utf8')).toBe(avant);
    etat('AUDIT', 'qa-visuelle', { serie: 's', metriques: {}, causes: [{ cause: 'a.js:1' }] });
    expect(() => etat('HYPOTHESES', 'technical-artist', { hypotheses: [{ id: 'H1', texte: 'a', gain: 1, cout: 2 }, { id: 'H2', texte: 'b', gain: 3, cout: 1 }] })).toThrow(/classées/);
    etat('HYPOTHESES', 'technical-artist', { hypotheses: [{ id: 'H1', texte: 'a', gain: 3, cout: 1 }] });
    expect(() => etat('IMPLEMENTATION', 'technical-artist', { hypothese: 'H1', fichiers: ['x'], bascule: 'aucune' })).toThrow(/bascule/);
  });

  it('itère au plus trois fois sur une porte en échec, puis escalade vers l’utilisateur', () => {
    ouvrir();
    jusquaCritique(echoue);
    expect(() => etat('VALIDATION', 'orchestrateur')).toThrow(/porte non passée/);
    for (let i = 1; i <= ITERATIONS_MAX; i++) {
      if (i > 1) {
        etat('IMPLEMENTATION', 'technical-artist', { hypothese: 'H1', fichiers: ['x'], bascule: 'pipeline.settings.ombres' });
        etat('MESURE', 'qa-visuelle', { avant: 's0', apres: `s${i}`, comparaison: {}, gpu: {}, tests: {} });
        etat('CRITIQUE', 'directeur-artistique', { critique: { notes: notes(8), defauts: [] }, portes: echoue });
      }
      etat('ITERATION', 'orchestrateur');
    }
    etat('IMPLEMENTATION', 'technical-artist', { hypothese: 'H1', fichiers: ['x'], bascule: 'pipeline.settings.ombres' });
    etat('MESURE', 'qa-visuelle', { avant: 's0', apres: 's9', comparaison: {}, gpu: {}, tests: {} });
    etat('CRITIQUE', 'directeur-artistique', { critique: { notes: notes(8), defauts: [] }, portes: echoue });
    expect(() => etat('ITERATION', 'orchestrateur')).toThrow(/escalade/);
    etat('ESCALADE', 'orchestrateur');
    expect(chantier().etat).toBe('ESCALADE');
    // seul l'utilisateur relance un tour ou abandonne
    expect(() => etat('ITERATION', 'orchestrateur')).toThrow();
    etat('ABANDON', 'humain');
    expect(SUIVANTS[chantier().etat]).toEqual([]);
  });

  it('rejette une critique hors contrat (notes, plus de trois défauts, cause sans fichier:ligne)', () => {
    expect(verifierCritique({ notes: notes(8), defauts: [] })).toEqual([]);
    expect(verifierCritique({ notes: { lumiere: 8 }, defauts: [] }).length).toBeGreaterThan(0);
    const d = { gravite: 'moyen', defaut: 'x', cause: 'src/a.js:3' };
    expect(verifierCritique({ notes: notes(8), defauts: [d, d, d, d] })).toContain('au plus 3 défauts prioritaires');
    expect(verifierCritique({ notes: notes(8), defauts: [{ ...d, cause: 'le shader' }] })[0]).toMatch(/fichier:ligne/);
    expect(ETATS).toContain('ESCALADE');
  });
});

describe('portes de qualité', () => {
  const comp = (apres, delta = {}, ssim = 0.99) => ({ cadrages: { gameplay: { ssim, apres, delta }, nuit: { ssim: 0.99, apres: { noir_pur: 0, sat_max: 0.6 }, delta: {} } } });
  const base = { noir_pur: 0, sat_max: 0.7, ombre_soleil: 0.5, part_ombre: 0.1 };
  const gpu = { gameplay: { postes: { image: 10 }, verdict: { ok: true, depassements: [] } } };
  const ch = { critere: { metrique: 'contraste_local', sens: 1, gainMin: 0.002 }, cadrages_vises: ['gameplay'], criteres_touches: ['lumiere', 'ombres'] };
  const ok = { chantier: ch, comparaison: comp(base, { contraste_local: 0.004 }), gpu, tests: { echecs: ['a'], acceptes: ['a'] }, empreintes: [], critique: { notes: { lumiere: 8, ombres: 7 }, defauts: [] } };

  it('passent toutes sur un chantier conforme', () => {
    expect(evaluerPortes(ok).ok).toBe(true);
  });
  it('échouent chacune sur sa propre faute', () => {
    expect(evaluerPortes({ ...ok, tests: { echecs: ['b'], acceptes: ['a'] } }).portes.tests.verdict).toBe('echec');
    expect(evaluerPortes({ ...ok, empreintes: ['ARB-001'] }).portes.empreintes.verdict).toBe('echec');
    expect(evaluerPortes({ ...ok, chantier: { ...ch, modele: 'ARB-001' }, empreintes: ['ARB-001'] }).portes.empreintes.verdict).toBe('passe');
    expect(evaluerPortes({ ...ok, gpu: { gameplay: { postes: { image: 13 }, verdict: { ok: true, depassements: [] } } } }).portes.gpu.details).toMatch(/13 ms/);
    expect(evaluerPortes({ ...ok, gpu: {} }).portes.gpu.verdict).toBe('echec');
    const m = (apres, delta, ssim) => evaluerPortes({ ...ok, comparaison: comp(apres, delta, ssim) }).portes.metriques;
    expect(m({ ...base, noir_pur: 0.01 }, { contraste_local: 0.004 }).details).toMatch(/noir pur/);
    expect(m({ ...base, ombre_soleil: 0.7 }, { contraste_local: 0.004 }).details).toMatch(/ombre\/soleil/);
    expect(m({ ...base, sat_max: 0.95 }, { contraste_local: 0.004 }).details).toMatch(/saturation/);
    expect(m(base, { contraste_local: 0.0001 }).details).toMatch(/gain/);
    const horsZone = evaluerPortes({ ...ok, comparaison: { cadrages: { ...comp(base, { contraste_local: 0.004 }).cadrages, nuit: { ssim: 0.9, apres: { noir_pur: 0, sat_max: 0.5 }, delta: {} } } } });
    expect(horsZone.portes.metriques.details).toMatch(/hors zone visée/);
    expect(evaluerPortes({ ...ok, critique: { notes: { lumiere: 6, ombres: 8 }, defauts: [] } }).portes.critique.verdict).toBe('echec');
    expect(evaluerPortes({ ...ok, critique: { notes: { lumiere: 8, ombres: 8 }, defauts: [{ gravite: 'fort', defaut: 'trou' }] } }).portes.critique.verdict).toBe('echec');
    expect(evaluerPortes({ chantier: ch }).ok).toBe(false);
  });
});

describe('banc de captures', () => {
  it('a les sept cadrages nommés, complets et posés', () => {
    expect(Object.keys(CADRAGES)).toEqual(['gameplay', 'face-soleil', 'contre-jour', 'foret', 'montagnes', 'nuit', 'personnage']);
    for (const [nom, c] of Object.entries(CADRAGES)) {
      expect(c.titre, nom).toBeTruthy();
      expect(c.heure, nom).toBeGreaterThanOrEqual(0);
      expect(c.exige, nom).toBeTruthy();
      if (c.perso) continue;
      expect(c.joueur).toHaveLength(2);
      expect(c.cam).toHaveLength(3);
      expect(c.vise || c.visee, nom).toBeTruthy();
    }
    // visée vers l'astre : la caméra regarde le soleil, ou lui tourne le dos
    expect(viseeSoleil({ visee: 'soleil', distance: 10, pente: 0 }, [1, 0.3, 0], [0, 5, 0])).toEqual([10, 5, 0]);
    expect(viseeSoleil({ visee: 'dos-soleil', distance: 10, pente: 0 }, [1, 0.3, 0], [0, 5, 0])[0]).toBe(-10);
  });

  it('met chaque passe derrière un réglage de Pipeline.settings (bascule A/B)', () => {
    const src = fs.readFileSync(path.join(RACINE, 'src/render/Pipeline.js'), 'utf8');
    const reglages = src.slice(src.indexOf('this.settings = {'), src.indexOf('};', src.indexOf('this.settings = {')));
    const passes = src.slice(src.indexOf('export const PASSES'), src.indexOf('};', src.indexOf('export const PASSES')));
    expect([...passes.matchAll(/reglage: '(\w+)'/g)].length).toBeGreaterThan(4);
    for (const m of passes.matchAll(/reglage: '(\w+)'/g)) {
      // particules : réglage lu par Game.frame, absent par défaut (vaut 1)
      if (m[1] === 'particules') continue;
      expect(reglages, m[1]).toMatch(new RegExp(`\\b${m[1]}:`));
    }
    expect(src).toMatch(/U\.uShadowOn\.value = s\.ombres === 0 \? 0 : 1/);
  });

  it('juge les budgets GPU par poste', () => {
    expect(BUDGETS.high.image).toBe(12);
    expect(verifierBudgets({ image: 11, gbuffer: 7 }, BUDGETS.high).ok).toBe(true);
    const v = verifierBudgets({ image: 12.5, ombres: 2 }, BUDGETS.high);
    expect(v.depassements.map((d) => d.poste)).toEqual(['image', 'ombres']);
  });

  it('calcule les métriques d’image justes sur des images synthétiques (Python)', () => {
    const out = execFileSync('python3', [path.join(RACINE, 'scripts/rendu/banc/metriques.py'), '--autotest'], { encoding: 'utf8' });
    expect(JSON.parse(out.trim().split('\n').at(-1))).toEqual({ autotest: 'ok' });
  }, 60000);
});
