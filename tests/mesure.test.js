// Mesures d'un modèle face à la DA (scripts/modeles/mesure.mjs) : chaque règle chiffrée rend une ligne et
// un verdict ; les valeurs connues du mouton et de la vache sont retrouvées.
import { describe, it, expect } from 'vitest';
import { mesurer, texte } from '../scripts/modeles/mesure.mjs';

const ligne = (r, nom) => r.lignes.find((l) => l.nom === nom);

describe('mesure.mjs', () => {
  it('mesure une créature refaite : budget, sabots, jonctions, tête, museau', async () => {
    const r = await mesurer('ANI-001');
    expect(ligne(r, 'Triangles').ok).toBe(true);
    expect(ligne(r, 'Triangles').valeur).toMatch(/9\s?898 fin · 3\s?334 allégé/);
    for (const nom of ['Sabots', 'Pattes / garrot', 'Jonctions patte-corps', 'Tête attachée', 'Museau', 'Couleurs']) expect(ligne(r, nom)?.ok, nom).toBe(true);
    expect(texte(r)).toMatch(/^ANI-001 · Mouton/);
  }, 60000);

  it('relève la physique face à la forme visible : tronc trop large, plancher collé aux planches', async () => {
    const arbre = await mesurer('ARB-001');
    expect(ligne(arbre, 'Physique / forme').ok).toBe(false); // écart connu (docs/DA.md, § 10)
    const pont = await mesurer('STR-004');
    expect(ligne(pont, 'Plancher').ok).toBe(true);
    const chaumiere = await mesurer('BAT-002');
    expect(ligne(chaumiere, 'Physique / forme').ok).toBe(true);
  }, 60000);
});
