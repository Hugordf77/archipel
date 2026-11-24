// Garde-fou des réorganisations de src/models : chaque modèle et chaque variante gardent exactement
// leur géométrie (triangles, sommets, boîte, positions, attributs, pose animée), leur physique
// (obstacles, planchers, encombrement) et les tables que le jeu importe. Après un changement voulu :
// node scripts/modeles/empreinte.mjs --ecrire
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { calculer, ecarts, REFERENCE } from '../scripts/modeles/empreinte.mjs';

describe('empreintes des modèles', () => {
  it('sont identiques à la référence (géométrie, physique, tables du jeu)', async () => {
    const ref = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
    const e = JSON.parse(JSON.stringify(await calculer()));
    // autant de modèles que la référence : un modèle ajouté ou retiré du registre se voit ici
    expect(Object.keys(e.modeles)).toHaveLength(Object.keys(ref.modeles).length);
    expect(ecarts(ref, e)).toEqual([]);
  }, 120000);
});
