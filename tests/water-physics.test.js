import { describe, expect, it } from 'vitest';
import { WATER_PHYSICS, waterSurfaceAt, waveHeightAt } from '../src/scene/water.js';
import { U } from '../src/scene/globals.js';

describe('physique déterministe de l’eau', () => {
  it('retourne la même vague pour une position, un temps et un vent donnés', () => {
    const a = waveHeightAt(42.5, -18.2, 8, 12, 0.8, 0.6, 1.4, 0.4);
    const b = waveHeightAt(42.5, -18.2, 8, 12, 0.8, 0.6, 1.4, 0.4);
    expect(a).toBe(b);
    expect(Number.isFinite(a)).toBe(true);
  });

  it('atténue la houle à l’approche du rivage', () => {
    const shallow = waveHeightAt(31, 0, 0.2, 8, 1, 0, 1, 0.4);
    const deep = waveHeightAt(31, 0, 12, 8, 1, 0, 1, 0.4);
    expect(Math.abs(shallow)).toBeLessThanOrEqual(Math.abs(deep));
  });

  it('échantillonne les mêmes coordonnées et le même temps à 30, 60 et 120 Hz', () => {
    const samples = [30, 60, 120].map((fps) => {
      const dt = 1 / fps;
      let value = 0;
      let time = 0;
      for (let i = 0; i < fps * 2; i++) {
        value = waveHeightAt(18, -74, 10, time, 0.7, 0.4, 1.2, 0.38);
        time += dt;
      }
      return value;
    });
    expect(Math.max(...samples) - Math.min(...samples)).toBeLessThan(0.02);
  });

  it('garde l’eau du bassin à son niveau dédié et partage le temps shader', () => {
    const before = U.uTime.value;
    U.uTime.value = 4;
    expect(waterSurfaceAt(-2, -7)).toBeGreaterThan(0.7);
    expect(WATER_PHYSICS.stormWaveAmplitude).toBeGreaterThan(WATER_PHYSICS.calmWaveAmplitude);
    U.uTime.value = before;
  });
});
