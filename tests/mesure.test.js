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

  it('applique l’exception de pattes écrite dans la fiche (cerf : 40 à 45 % du garrot) et l’affiche', async () => {
    const r = await mesurer('ANI-004');
    const pattes = ligne(r, 'Pattes / garrot');
    expect(pattes.ok).toBe(true);
    expect(pattes.valeur).toMatch(/exception de la fiche : 40 à 45 %/);
    expect(pattes.regle).toMatch(/exception de la fiche/);
    // sans exception, la fourchette de la DA
    expect(ligne(await mesurer('ANI-003'), 'Pattes / garrot').regle).toBe('25 à 35 %');
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
