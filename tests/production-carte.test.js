// Carte de chantier : la vue réelle du dashboard (dashboard/chantier.js, sans DOM) calculée depuis
// des journaux construits par le vrai workflow. Couleurs, motifs et libellés suivent les statuts.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { charger, ajouter, RACINE } from '../scripts/production/depot.mjs';
import { lancerChantier } from '../scripts/production/actions.mjs';
import { constatsAudit } from '../scripts/production/audit.mjs';
import { vueCarte, assetsDeZone } from '../dashboard/chantier.js';
import zonesData from '../production/zones.json';
import { STATUTS_ZONE } from '../src/production/statuts.js';

let r;
beforeEach(() => {
  r = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-carte-'));
  fs.mkdirSync(path.join(r, 'production'));
  for (const f of ['zones.json', 'agents.json']) fs.copyFileSync(path.join(RACINE, 'production', f), path.join(r, 'production', f));
  ajouter(constatsAudit(charger(r).ctx, RACINE).brouillons, { racine: r });
});
const evts = () => charger(r).evenements;
// le <g> d'une zone dans le SVG
const groupe = (svg, id) => svg.match(new RegExp(`<g class="zone-carte[^"]*" data-zone="${id}"[\\s\\S]*?</g>\\s*</g>`))[0];
// tous les éléments obligatoires d'une zone produits et validés (intégrés sauf `sauf`)
function zoneTerminee(zoneId, sauf = null) {
  const { ctx } = charger(r);
  const ids = ctx.items.filter((i) => i.zone_id === zoneId && i.obligatoire && i.section !== 'H').map((i) => i.id);
  const d = [];
  for (const id of ids) {
    if (!charger(r).etat.items.has(id)) d.push({ type: 'checklist.item.updated', acteur: 'audit', cle: `t:${id}`, donnees: { item_id: id, changements: { specification: 'specifie', production: 'completed', integration: id === sauf ? 'not_integrated' : 'integrated' }, preuve: 'test' } });
    d.push({ type: 'checklist.item.updated', acteur: 'humain', cle: `v1:${id}`, donnees: { item_id: id, changements: { validation: 'running' } } });
    d.push({ type: 'checklist.item.updated', acteur: 'humain', cle: `v2:${id}`, donnees: { item_id: id, changements: { validation: 'passed' }, preuve: 'revue humaine (test)' } });
  }
  d.push({ type: 'delivery.decided', acteur: 'humain', cle: `liv:${zoneId}`, donnees: { zone_id: zoneId, decision: 'livrer', raison: 'test' } });
  ajouter(d, { racine: r });
}

describe('carte de chantier', () => {
  it('représente les 20 zones, chacune avec son statut calculé', () => {
    const { svg, bilan } = vueCarte(evts());
    const zones = [...svg.matchAll(/data-zone="(ZONE-[A-Z0-9-]+)" data-statut="([a-z_]+)"/g)];
    expect(zones).toHaveLength(20);
    for (const [, id, statut] of zones) expect(bilan.get(id).statut).toBe(statut);
  });

  it('une zone incomplète apparaît en rouge, avec son libellé et son icône', () => {
    const g = groupe(vueCarte(evts()).svg, 'ZONE-ILE-VERTE');
    expect(g).toContain('data-statut="en_construction"');
    expect(g).toContain(`stroke="${STATUTS_ZONE.en_construction.couleur}"`);
    expect(STATUTS_ZONE.en_construction.couleur).toBe('#d2343b');
    expect(g).toMatch(/aria-label="L’Île Verte, En construction, production \d+ %/);
    expect(g).toContain('▲ L’Île Verte');
  });

  it('une zone bloquée se reconnaît sans la couleur : hachures, icône et libellé', () => {
    lancerChantier({ zone_id: 'ZONE-LAC-CELESTE' }, { racine: r });
    ajouter([{ type: 'task.blocked', acteur: 'humain', cle: 'bl', donnees: { task_id: 'TASK-LAC-CELESTE-001', raison: 'attente d’une décision de conception' } }], { racine: r });
    const g = groupe(vueCarte(evts()).svg, 'ZONE-LAC-CELESTE');
    expect(g).toContain('data-statut="bloquee"');
    expect(g).toContain('fill="url(#m-hachures)"');
    expect(g).toContain('⛔ Le Lac Céleste');
    expect(g).toMatch(/aria-label="Le Lac Céleste, Bloquée/);
    // chaque statut a une icône et un libellé distincts
    const s = Object.values(STATUTS_ZONE);
    expect(new Set(s.map((x) => x.icone)).size).toBe(s.length);
    expect(new Set(s.map((x) => x.label)).size).toBe(s.length);
  });

  it('une zone validée puis intégrée affiche le statut calculé approprié', () => {
    zoneTerminee('ZONE-ILE-DESOLEE', 'ZONE-ILE-DESOLEE.G02');
    let v = vueCarte(evts());
    expect(v.bilan.get('ZONE-ILE-DESOLEE').statut).toBe('validee');
    expect(v.bilan.get('ZONE-ILE-DESOLEE').livrable).toBe(false); // G02 critique non intégré
    zoneTerminee('ZONE-ILOTS-SECRETS');
    v = vueCarte(evts());
    const b = v.bilan.get('ZONE-ILOTS-SECRETS');
    expect([b.statut, b.livrable, b.scores.production, b.scores.jouable]).toEqual(['jouable', true, 1, 1]);
    expect(groupe(v.svg, 'ZONE-ILOTS-SECRETS')).toContain('fill="url(#m-jouable)"');
  });

  it('la sélection d’une zone ouvre sa fiche, et les manques affichés sont ceux du checklist', () => {
    const v = vueCarte(evts(), { zone: 'ZONE-FALAISES-OUBLIEES', onglet: 'manques', manques: true });
    expect(v.fiche).toContain('Les Falaises Oubliées');
    expect(v.fiche).toContain('ZONE-FALAISES-OUBLIEES');
    const manques = v.bilan.get('ZONE-FALAISES-OUBLIEES').manquants.map((m) => m.item);
    expect(manques.length).toBeGreaterThan(0);
    for (const id of manques) expect(v.fiche).toContain(id);
    const listes = [...v.manques.matchAll(/data-item="([^"]+)"/g)].map((m) => m[1]);
    const attendus = [...v.bilan.values()].flatMap((b) => b.manquants.map((m) => m.item));
    expect(listes.sort()).toEqual(attendus.sort());
  });

  it('les filtres estompent les zones qui ne correspondent pas (statut, recherche d’asset)', () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, { racine: r });
    let v = vueCarte(evts(), { statut: 'partielle' });
    expect(groupe(v.svg, 'ZONE-ILE-VERTE')).not.toContain('estompee');
    expect(groupe(v.svg, 'ZONE-LAC-CELESTE')).toContain('estompee');
    const verte = assetsDeZone(zonesData.zones.find((z) => z.id === 'ZONE-ILE-VERTE'));
    const volcan = assetsDeZone(zonesData.zones.find((z) => z.id === 'ZONE-ILE-VOLCANIQUE'));
    const modele = verte.find((m) => !volcan.includes(m));
    v = vueCarte(evts(), { q: modele.id.toLowerCase() });
    expect(groupe(v.svg, 'ZONE-ILE-VERTE')).not.toContain('estompee');
    expect(groupe(v.svg, 'ZONE-ILE-VOLCANIQUE')).toContain('estompee');
  });

  it('reflète une mise à jour du journal et signale les événements refusés', () => {
    lancerChantier({ zone_id: 'ZONE-ILE-VERTE' }, { racine: r });
    expect(vueCarte(evts()).bilan.get('ZONE-ILE-VERTE').statut).toBe('partielle'); // manques couverts par des tâches
    ajouter([{ type: 'task.blocked', acteur: 'humain', cle: 'b', donnees: { task_id: 'TASK-ILE-VERTE-001', raison: 'attente du PDF de référence' } }], { racine: r });
    expect(groupe(vueCarte(evts()).svg, 'ZONE-ILE-VERTE')).toContain('data-statut="bloquee"');
    const faux = { seq: 999, id: 'EVT-999', type: 'task.started', at: new Date().toISOString(), acteur: 'gameplay', cle: 'faux', donnees: { task_id: 'TASK-INCONNUE-001' } };
    expect(vueCarte([...evts(), faux]).erreurs[0].erreur).toMatch(/tâche inconnue/);
  });
});
