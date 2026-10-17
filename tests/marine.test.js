// Éléments de la mer à positions fixes (ARCHIPEL.marine) : construction, ramassage, sauvegarde.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ARCHIPEL } from '../src/world/archipel.js';
import { MarineManager } from '../src/world/marine.js';

// interactions factices : on garde ce qui est proposé au joueur
function fakeInteractions() {
  const items = new Map();
  return { items, add: (it) => items.set(it.id, it), remove: (id) => items.delete(id) };
}

describe('éléments marins fixes', () => {
  it('construit chaque élément de l’archipel à sa place, sauf ceux déjà ramassés', () => {
    const root = new THREE.Group();
    const taken = [ARCHIPEL.marine[0].id];
    const m = new MarineManager({ root, interactions: fakeInteractions(), taken });
    expect(m.records).toHaveLength(ARCHIPEL.marine.length - 1);
    for (const rec of m.records) {
      const src = ARCHIPEL.marine.find((e) => e.id === rec.id);
      expect(rec.obj.position.x).toBe(src.x);
      expect(rec.obj.position.z).toBe(src.z);
    }
  });

  it('donne le même aspect à chaque partie (variation tirée de l’identifiant)', () => {
    const a = new MarineManager({ root: new THREE.Group() });
    const b = new MarineManager({ root: new THREE.Group() });
    expect(a.records.map((r) => r.obj.rotation.y)).toEqual(b.records.map((r) => r.obj.rotation.y));
  });

  it('ramasse bouteilles et caisses une seule fois et le garde en mémoire', () => {
    const I = fakeInteractions();
    const got = [];
    const m = new MarineManager({ root: new THREE.Group(), interactions: I, onCollect: (r) => got.push(r.id) });
    const rec = m.records.find((r) => r.type === 'bouteille');
    expect(I.items.has(rec.id)).toBe(true);
    I.items.get(rec.id).action();
    I.items.get(rec.id)?.action();
    m.collect(rec);
    expect(got).toEqual([rec.id]);
    expect(rec.obj.visible).toBe(false);
    expect(I.items.has(rec.id)).toBe(false);
    expect(m.serializeTaken()).toEqual([rec.id]);
  });
});
