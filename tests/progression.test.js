import { describe, expect, it } from 'vitest';
import { Inventory } from '../src/game/Inventory.js';
import { nearbyStations } from '../src/game/decor.js';
import { migrate } from '../src/game/state.js';

describe('boucle de fabrication et stations', () => {
  it('fabrique une station depuis les ressources de base', () => {
    const inv = new Inventory();
    inv.add('bois', 6);
    inv.add('pierre', 4);
    const result = inv.craft({ out: 'etabli', n: 1, in: { bois: 6, pierre: 4 } });
    expect(result).toEqual({ ok: true, left: 0 });
    expect(inv.count('bois')).toBe(0);
    expect(inv.count('pierre')).toBe(0);
    expect(inv.count('etabli')).toBe(1);
  });

  it('ne consomme rien si le résultat ne peut pas entrer dans le sac', () => {
    const slots = Array.from({ length: 32 }, () => ({ id: 'hache_bois', n: 1 }));
    slots[0] = { id: 'bois', n: 6 };
    slots[1] = { id: 'pierre', n: 4 };
    const inv = new Inventory(slots);
    const before = inv.serialize();
    const result = inv.craft({ out: 'hache_bois', n: 40, in: { bois: 6, pierre: 4 } });
    expect(result).toEqual({ ok: false, why: 'plein' });
    expect(inv.serialize()).toEqual(before);
  });

  it('expose uniquement les stations réellement posées à portée', () => {
    const decor = [
      { type: 'etabli', x: 3, z: 4 },
      { type: 'four', x: 50, z: 50 },
      { type: 'banc', x: 1, z: 1 },
    ];
    expect([...nearbyStations(decor, 0, 0)].sort()).toEqual(['etabli', 'main']);
  });

  it('préserve stations posées et ressources dans une sauvegarde migrée', () => {
    const station = { id: 'dc_test', type: 'etabli', x: 4.2, z: -3.5, rot: 0.4 };
    const migrated = migrate({ version: 2, decor: [station], bag: [{ id: 'planche', n: 3 }] });
    expect(migrated.decor).toEqual([station]);
    expect(migrated.bag[0]).toEqual({ id: 'planche', n: 3 });
  });
});
