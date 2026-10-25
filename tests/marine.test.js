// Éléments de la mer à positions fixes (ARCHIPEL.marine, vide à l'étape « bases » du monde ouvert) :
// construction, ramassage, sauvegarde, sur une liste d'essai au large du départ.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MarineManager } from '../src/world/marine.js';

const ARCHIPEL = {
  marine: [
    { id: 'mer-essai-1', type: 'recif', x: 120, z: 160 },
    { id: 'mer-essai-2', type: 'bouteille', x: -140, z: 130 },
    { id: 'mer-essai-3', type: 'caisse', x: 180, z: 90 },
    { id: 'mer-essai-4', type: 'poissons', x: -60, z: 210 },
    { id: 'mer-essai-5', type: 'bouee', x: 60, z: 240 },
    { id: 'mer-essai-6', type: 'algue', x: -200, z: 60 },
    { id: 'mer-essai-7', type: 'bouteille', x: 220, z: 200 },
  ],
};

// interactions factices : on garde ce qui est proposé au joueur
function fakeInteractions() {
  const items = new Map();
  return { items, add: (it) => items.set(it.id, it), remove: (id) => items.delete(id) };
}

describe('éléments marins fixes', () => {
  it('construit chaque élément de l’archipel à sa place, sauf ceux déjà ramassés', () => {
    const root = new THREE.Group();
    const taken = [ARCHIPEL.marine[0].id];
    const m = new MarineManager({ root, interactions: fakeInteractions(), taken, list: ARCHIPEL.marine });
    expect(m.records).toHaveLength(ARCHIPEL.marine.length - 1);
    for (const rec of m.records) {
      const src = ARCHIPEL.marine.find((e) => e.id === rec.id);
      expect(rec.obj.position.x).toBe(src.x);
      expect(rec.obj.position.z).toBe(src.z);
    }
  });

  it('donne le même aspect à chaque partie (variation tirée de l’identifiant)', () => {
    const a = new MarineManager({ root: new THREE.Group(), list: ARCHIPEL.marine });
    const b = new MarineManager({ root: new THREE.Group(), list: ARCHIPEL.marine });
    expect(a.records.map((r) => r.obj.rotation.y)).toEqual(b.records.map((r) => r.obj.rotation.y));
  });

  it('ramasse bouteilles et caisses une seule fois et le garde en mémoire', () => {
    const I = fakeInteractions();
    const got = [];
    const m = new MarineManager({ root: new THREE.Group(), interactions: I, onCollect: (r) => got.push(r.id), list: ARCHIPEL.marine });
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
