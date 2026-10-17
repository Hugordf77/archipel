import { describe, expect, it } from 'vitest';
import { approachVelocity, normalizePlanarInput } from '../src/game/movement.js';

const vector = (x = 0, z = 0) => ({ x, y: 0, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; }, multiplyScalar(n) { this.x *= n; this.y *= n; this.z *= n; return this; }, add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; } });

function simulate(fps, seconds, desiredSpeed = 3.3, acceleration = 15) {
  const velocity = vector();
  const desired = vector(0, desiredSpeed);
  const delta = vector();
  const dt = 1 / fps;
  for (let i = 0; i < Math.round(fps * seconds); i++) approachVelocity(velocity, desired, acceleration * dt, delta);
  return velocity.z;
}

describe('physique légère du joueur', () => {
  it('accélère progressivement sans dépasser la vitesse cible', () => {
    const v = vector();
    const delta = vector();
    approachVelocity(v, vector(0, 3.3), 15 / 60, delta);
    expect(v.z).toBeCloseTo(0.25);
    for (let i = 0; i < 60; i++) approachVelocity(v, vector(0, 3.3), 15 / 60, delta);
    expect(v.z).toBeCloseTo(3.3);
  });

  it('freine avec une décélération bornée', () => {
    const v = vector(0, 3.3);
    const delta = vector();
    approachVelocity(v, vector(), 19 / 60, delta);
    expect(v.z).toBeCloseTo(3.3 - 19 / 60);
    expect(v.z).toBeGreaterThan(0);
  });

  it('normalise les diagonales sans réduire une entrée analogique faible', () => {
    const diagonal = normalizePlanarInput(vector(1, 1));
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
    const analog = normalizePlanarInput(vector(0.3, 0.4));
    expect(analog.x).toBeCloseTo(0.3);
    expect(analog.z).toBeCloseTo(0.4);
  });

  it('reste stable entre 30, 60 et 120 Hz', () => {
    const speeds = [30, 60, 120].map((fps) => simulate(fps, 0.4));
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThan(0.02);
  });
});
