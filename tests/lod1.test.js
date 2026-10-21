// LOD1 des îles (relief au pas de 4 m, lieux, végétation lointaine) : une seule demande au Worker
// tant que l'assemblage n'est pas fini, et jamais deux groupes « ile-4m » dans une île (l'orphelin
// restait visible : végétation lointaine en polyèdres au travers des arbres proches).
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { installCanvasStub } from './helpers/canvas.js';

installCanvasStub();

const PLAN = { pois: [], pathParts: [], micro: [], rivers: [], lakes: [], falls: [] };

async function ile() {
  const { IslandManager } = await import('../src/world/islands/IslandManager.js');
  const man = Object.create(IslandManager.prototype);
  const e = { desc: { id: 'ile-test', x: 0, z: 0 }, want: 1, d: 200, pending: [false, false, false], group: new THREE.Group(), lod1: null, lod2: null, near: null, tiles: new Map(), tilePending: new Set() };
  man.entries = new Map([['ile-test', e]]);
  man.jobs = [];
  man.anims = [];
  man.inflight = 0;
  man.stats = { workerMs: [], tileMs: [] };
  man.player = { x: 0, z: 0 };
  man.worker = { postMessage: () => man.inflight++ };
  man.applyHole = () => {};
  return { man, e };
}

// exécute les seuls travaux d'assemblage en file (relief, eau et lieux demandent un vrai plan)
function assemble(man) {
  const jobs = man.jobs.filter((j) => j.label === 'lod1-assemblage');
  man.jobs = man.jobs.filter((j) => j.label !== 'lod1-assemblage');
  for (const j of jobs) j();
}

describe('LOD1 des îles', () => {
  it('reste en cours entre la réponse du Worker et l’assemblage : pas de seconde demande', async () => {
    const { man, e } = await ile();
    e.pending[1] = true;
    man.inflight = 1;
    man.onMessage({ type: 'lod', id: 'ile-test', lod: 1, ms: 1, plan: PLAN });
    expect(e.pending[1]).toBe(true);
    const avant = man.inflight;
    man.pump();
    expect(man.inflight).toBe(avant);
    assemble(man);
    expect(e.pending[1]).toBe(false);
    expect(e.lod1).not.toBeNull();
  });

  it('un second assemblage remplace le premier groupe au lieu de le laisser orphelin', async () => {
    const { man, e } = await ile();
    man.queueLod1(e, { plan: PLAN });
    man.queueLod1(e, { plan: PLAN });
    assemble(man);
    const groupes = e.group.children.filter((c) => c.name === 'ile-4m');
    expect(groupes).toHaveLength(1);
    expect(groupes[0]).toBe(e.lod1.group);
  });
});
