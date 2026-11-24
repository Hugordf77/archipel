// Budgets GPU par poste du banc de rendu (ms par image, banc synchrone de scripts/rendu/gpu.js, vue de
// référence : cadrage « gameplay », 1600 × 900). Dépassement d'un poste ou de l'image = échec de la porte
// GPU. Image ≤ 12 ms en Haut (consigne du chantier rendu, 24/11/2026) ; les postes : relevé de
// référence du même jour plus une marge, à ne relever qu'avec l'accord de l'utilisateur.
export const BUDGETS = {
  high: { image: 12, gbuffer: 8.5, ombres: 1.5, peinture: 2.5, composition: 1.2, particules: 0.3 },
  medium: { image: 12, gbuffer: 8.5, ombres: 1.2, peinture: 2, composition: 1, particules: 0.3 },
  low: { image: 10, gbuffer: 7, ombres: 0.8, peinture: 1, composition: 0.8, particules: 0.3 },
};

export const budgetsDe = (qualite) => BUDGETS[qualite] || BUDGETS.high;

// { ok, depassements: [{ poste, mesure, budget }] } ; un poste absent de la mesure n'est pas jugé
export function verifierBudgets(postes, budgets) {
  const depassements = [];
  for (const [poste, budget] of Object.entries(budgets)) {
    const v = postes?.[poste];
    if (typeof v === 'number' && v > budget) depassements.push({ poste, mesure: v, budget });
  }
  return { ok: depassements.length === 0, depassements };
}
