// Lot « ciel » : la voûte nocturne est déterministe pour une graine, ses couleurs restent pastel (jamais
// sombres), la nuit reste un bleu profond et l'étoile du berger ne brille qu'au crépuscule.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { genererVoute, zenithVoute, ARCHE_HEURE, VOUTE_GRAINE, ETOILES_COULEURS, NEBULEUSES_COULEURS } from '../src/world/env/voute.js';
import { GRADE_KEYS, soleilDir, etoileDuBerger } from '../src/world/env/daycycle.js';

// comme en jeu (src/app/setup.js) : les couleurs hexadécimales sont prises telles quelles
THREE.ColorManagement.enabled = false;

const lum = (c) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
const rgb = (hex) => new THREE.Color(hex).toArray();
const norme = (v) => Math.hypot(...v);

describe('voûte nocturne', () => {
  it('est identique pour une même graine et change avec la graine', () => {
    expect(genererVoute(VOUTE_GRAINE)).toEqual(genererVoute(VOUTE_GRAINE));
    expect(genererVoute(3)).toEqual(genererVoute(3));
    expect(genererVoute(3).galaxie).not.toEqual(genererVoute(VOUTE_GRAINE).galaxie);
    expect(genererVoute(3).etoiles).not.toBe(genererVoute(VOUTE_GRAINE).etoiles);
  });

  it('a des directions unitaires, des nébuleuses près de la bande et un pôle au nord', () => {
    for (const graine of [VOUTE_GRAINE, 1, 42, 999]) {
      const v = genererVoute(graine);
      for (const d of [v.pole, v.galaxie, v.centre, ...v.nebuleuses.map((n) => n.dir), ...v.amas.map((a) => a.dir)]) {
        expect(norme(d)).toBeCloseTo(1, 6);
      }
      // centre galactique dans le plan de la galaxie
      expect(Math.abs(v.centre.reduce((s, c, i) => s + c * v.galaxie[i], 0))).toBeLessThan(1e-6);
      for (const n of v.nebuleuses) {
        expect(Math.abs(n.dir.reduce((s, c, i) => s + c * v.galaxie[i], 0))).toBeLessThan(0.35);
      }
      expect(v.pole[1]).toBeGreaterThan(0.5);
      expect(v.pole[2]).toBeLessThan(0);
      expect(v.nebuleuses).toHaveLength(5);
      expect(v.amas).toHaveLength(6);
    }
  });

  it('fait passer l\'arche de la voie lactée au zénith vers 1 h', () => {
    for (const graine of [VOUTE_GRAINE, 1, 42, 999]) {
      const g = genererVoute(graine).galaxie;
      const z = zenithVoute(ARCHE_HEURE);
      expect(Math.abs(z.reduce((s, c, i) => s + c * g[i], 0)), String(graine)).toBeLessThan(1e-6);
      // à midi, l'arche est loin du zénith (elle ne gêne pas le jour, de toute façon sans étoiles)
      const m = zenithVoute(ARCHE_HEURE - 12);
      expect(Math.abs(m.reduce((s, c, i) => s + c * g[i], 0))).toBeGreaterThan(0.2);
    }
  });

  it('peint étoiles et nébuleuses en pastel, jamais sombres ni néon', () => {
    for (const hex of [...ETOILES_COULEURS, ...NEBULEUSES_COULEURS]) {
      const c = rgb(hex);
      expect(lum(c), hex).toBeGreaterThan(0.55);
      // saturation douce (écart max-min rapporté au max)
      expect((Math.max(...c) - Math.min(...c)) / Math.max(...c), hex).toBeLessThan(0.45);
    }
  });
});

describe('nuit', () => {
  it('reste un bleu profond lisible au zénith comme à l\'horizon', () => {
    const nuit = GRADE_KEYS.find((k) => k.name === 'nuit');
    for (const hex of [nuit.skyTop, nuit.skyHorizon]) {
      const c = rgb(hex);
      expect(lum(c), hex).toBeGreaterThan(0.12);
      expect(c[2], hex).toBeGreaterThan(c[0] + 0.15);
    }
  });

  it('montre l\'étoile du berger au crépuscule seulement', () => {
    const vis = (h) => etoileDuBerger(h, soleilDir(h).y).w;
    expect(vis(20.5)).toBeGreaterThan(0.5);
    expect(vis(5.5)).toBeGreaterThan(0.5);
    for (const h of [12, 16, 23, 2]) expect(vis(h), String(h)).toBe(0);
  });
});
