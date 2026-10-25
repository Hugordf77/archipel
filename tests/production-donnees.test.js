// Données du suivi de production : les 19 zones, leurs identifiants et leurs références, le checklist,
// les rôles d'agents et le journal versionné (chaîne intacte, rejeu sans refus).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zonesData from '../production/zones.json';
import agentsData from '../production/agents.json';
import { contexte } from '../src/production/etat.js';
import { MODELE_CHECKLIST } from '../src/production/checklist.js';
import { verifierTache } from '../src/production/contrats.js';
import { ZONES, ZONE_BY_ID } from '../src/world/archipel.js';
import { charger, RACINE } from '../scripts/production/depot.mjs';

const ctx = contexte(zonesData, agentsData);
const NOMS = [
  'L’Île Verte', 'Les Falaises Oubliées', 'L’Île Volcanique', 'La Forêt Brumeuse', 'Le Lac Céleste', 'L’Archipel des Tempêtes',
  'L’Île de Pierre', 'Les Plaines Colorées', 'L’Île Sous-Marine', 'L’Île des Cieux', 'L’Île Désolée', 'Le Village Englouti',
  'L’Île des Géants', 'La Côte aux Coquillages', 'L’Île de l’Aube Perdue', 'Les Îlots Secrets', 'Les Grottes Cachées',
  'Le Désert de l’Île Sèche', 'L’Île du Silence', 'Les Cascades Sacrées',
];

describe('zones de l’open world', () => {
  it('enregistre les 19 zones de la liste et la 20e (Cascades Sacrées), dans l’ordre, avec des identifiants stables et uniques', () => {
    expect(ctx.zones.map((z) => z.nom)).toEqual(NOMS);
    const ids = ctx.zones.map((z) => z.id);
    expect(new Set(ids).size).toBe(20);
    for (const id of ids) expect(id).toMatch(/^ZONE-[A-Z0-9-]+$/);
    expect(ctx.zones.map((z) => z.ordre)).toEqual(NOMS.map((_, i) => i + 1));
  });

  it('chaque fiche est complète et ses références pointent vers des zones existantes', () => {
    const ids = new Set(ctx.zones.map((z) => z.id));
    for (const z of ctx.zones) {
      for (const k of ['description', 'type', 'priorite', 'responsable', 'confiance']) expect(z[k], `${z.id}.${k}`).toBeTruthy();
      expect(['P1', 'P2', 'P3', 'P4']).toContain(z.priorite);
      expect(ctx.roleParId.has(z.responsable)).toBe(true);
      for (const c of z.connexions) expect(ids.has(c), `${z.id} → ${c}`).toBe(true);
      for (const d of z.dependances) expect(ids.has(d.zone), `${z.id} attend ${d.zone}`).toBe(true);
    }
  });

  it('relie chaque zone aux zones du monde ouvert (archipel.js), chacune une seule fois', () => {
    const utilisees = new Set();
    for (const z of ctx.zones) {
      expect(z.jeu.zones.length, z.id).toBeGreaterThan(0);
      expect(['nom', 'confirmee']).toContain(z.jeu.correspondance); // toutes validées le 25/10/2026
      for (const id of z.jeu.zones) {
        expect(id === 'home' || ZONE_BY_ID.has(id), `${z.id} : zone du jeu ${id}`).toBe(true);
        expect(utilisees.has(id), `${id} reliée à deux zones`).toBe(false);
        utilisees.add(id);
      }
      // « nom » : le nom de la zone du jeu est bien celui du checklist (à la casse et à l'apostrophe près)
      const norme = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/^(l'|le |la |les )/, '');
      if (z.jeu.correspondance === 'nom') expect(z.jeu.zones.map((id) => norme(ZONE_BY_ID.get(id).name))).toContain(norme(z.nom).replace('sèche', 'séchée'));
    }
    // les zones du jeu sans zone du checklist sont déclarées, aucune n'est oubliée en silence
    const hors = zonesData.reference.zones_du_jeu_hors_checklist;
    expect(ZONES.map((z) => z.id).filter((id) => !utilisees.has(id))).toEqual(hors);
    expect(utilisees.has('home')).toBe(true);
  });
});

describe('checklist', () => {
  it('donne un identifiant unique à chaque élément de chaque zone', () => {
    expect(ctx.items).toHaveLength(20 * MODELE_CHECKLIST.length);
    expect(ctx.itemIds.size).toBe(ctx.items.length);
    for (const i of ctx.items) expect(i.id).toMatch(/^ZONE-[A-Z0-9-]+\.[B-H]\d{2}$/);
  });

  it('chaque élément a catégorie, responsable, critère, méthode et preuve ; les critiques sont obligatoires', () => {
    for (const m of MODELE_CHECKLIST) {
      for (const k of ['titre', 'categorie', 'role', 'critere', 'verification', 'preuve']) expect(m[k], `${m.cle}.${k}`).toBeTruthy();
      if (m.critique) expect(m.obligatoire, m.cle).toBe(true);
      expect(m.role === 'humain' || ctx.roleParId.has(m.role), m.cle).toBe(true);
    }
    expect(MODELE_CHECKLIST.filter((m) => m.obligatoire).length).toBeGreaterThan(MODELE_CHECKLIST.filter((m) => !m.obligatoire).length);
  });

  it('refuse une tâche qui cite un élément d’une autre zone, un contrôle ou un statut inconnu', () => {
    const t = {
      task_id: 'TASK-ILE-VERTE-099', zone_id: 'ZONE-ILE-VERTE', title: 't', description: 'd', assigned_agent: 'gameplay', priority: 'P2',
      dependencies: [], input_references: [], expected_deliverables: [{ path: 'tests/zones/x.test.js', nature: 'test' }], acceptance_criteria: ['c'],
      validation_method: { controles: ['fichiers'] }, checklist_items: ['ZONE-ILE-VERTE.C10'],
    };
    expect(verifierTache(t, ctx)).toEqual([]);
    expect(verifierTache({ ...t, checklist_items: ['ZONE-ILE-DESOLEE.C10'] }, ctx).join()).toMatch(/autre zone/);
    expect(verifierTache({ ...t, validation_method: { controles: ['magie'] } }, ctx).join()).toMatch(/contrôle inconnu/);
    expect(verifierTache({ ...t, status: 'termine' }, ctx).join()).toMatch(/statut inconnu/);
    expect(verifierTache({ ...t, acceptance_criteria: [] }, ctx).join()).toMatch(/critères/);
  });
});

describe('agents et journal du dépôt', () => {
  it('associe les quatre rôles à des agents et des relecteurs présents dans .claude/agents/', () => {
    expect(agentsData.roles.map((r) => r.id)).toEqual(['world-designer', 'asset-artist', 'gameplay', 'technical-artist']);
    for (const r of [...agentsData.roles, ...agentsData.relecteurs.filter((x) => x.fichier)]) {
      expect(fs.existsSync(path.join(RACINE, r.fichier)), r.fichier).toBe(true);
    }
    // aucun rôle ne relit son propre travail
    for (const rel of agentsData.relecteurs) for (const r of agentsData.roles) if (rel.revoit.includes(r.id)) expect(rel.id).not.toBe(r.agent);
  });

  it('le journal versionné est intact, se rejoue sans refus et ses preuves d’audit existent', () => {
    const { evenements, integrite, erreurs } = charger(RACINE);
    expect(integrite).toEqual([]);
    expect(erreurs).toEqual([]);
    for (const e of evenements.filter((x) => x.acteur === 'audit')) {
      for (const p of e.donnees.preuve.replace(/ \(zones du jeu.*$/, '').split(' ; ')) expect(fs.existsSync(path.join(RACINE, p)), p).toBe(true);
    }
  });
});
