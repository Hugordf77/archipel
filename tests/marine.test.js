import { describe, expect, it } from 'vitest';
import { MARINE_CELL_SIZE, marineCellKey, marineCellSeed } from '../src/world/marineSeed.js';

describe('éléments marins procéduraux', () => {
  it('utilise des cellules stables', () => {
    expect(MARINE_CELL_SIZE).toBe(150);
    expect(marineCellKey(-2, 7)).toBe('-2,7');
  });

  it('produit la même graine pour la même cellule', () => {
    const a = marineCellSeed('corail-azur-4821', 4, -3);
    const b = marineCellSeed('corail-azur-4821', 4, -3);
    const c = marineCellSeed('corail-azur-4821', 5, -3);
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('sépare les mondes de graines différentes', () => {
    expect(marineCellSeed('lagon-nacre-1000', 0, 0)).not.toBe(marineCellSeed('lagon-nacre-1001', 0, 0));
  });
});
