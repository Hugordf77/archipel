// Petites fonctions déterministes du contrôleur, sans état global.
// Les vecteurs fournis sont réutilisés par l'appelant pour éviter les allocations.
export function normalizePlanarInput(input) {
  const lengthSq = input.x * input.x + input.z * input.z;
  if (lengthSq > 1) {
    const inverseLength = 1 / Math.sqrt(lengthSq);
    input.x *= inverseLength;
    input.z *= inverseLength;
  }
  return input;
}

export function approachVelocity(current, desired, maxChange, delta) {
  delta.set(desired.x - current.x, 0, desired.z - current.z);
  const lengthSq = delta.x * delta.x + delta.z * delta.z;
  const limit = Math.max(0, maxChange);
  if (lengthSq > limit * limit && lengthSq > 0) {
    delta.multiplyScalar(limit / Math.sqrt(lengthSq));
  }
  current.add(delta);
  return current;
}
