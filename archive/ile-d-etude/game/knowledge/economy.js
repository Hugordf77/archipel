// Barème des coquillages et des points de savoir (calibré par scripts/sim-economy.mjs).
// Ce qui rapporte le plus : retenir dans la durée (rappels espacés, maîtrise).

export const ECO = {
  // facteur global des gains de quiz (les sessions Pomodoro gardent 1 coquillage par minute)
  scale: 0.5,
  // nouvelle bonne réponse, par niveau (Graine/Pousse 1, Bouton/Fleur 2, Arbre/Forêt 3)
  base: [0, 1, 1, 2, 2, 3, 3],
  anchoredBonus: 3, // × niveau, en passant à « ancrée »
  masteredBonus: 6, // × niveau, en passant à « maîtrisée »
  // points de savoir (non dépensables), × niveau
  pointsNew: 1,
  pointsAnchored: 2,
  pointsMastered: 4,
  // petits bonus fixes
  bonus: { firstQuiz: 5, challenge: 10, qotd: 5 },
  // au-delà de 200 coquillages de quiz dans la journée, gains divisés par deux
  dailySoftCap: 200,
  softFactor: 0.5,
  // réponses au hasard : 5 erreurs de moins de 2 s d'affilée → 2 min sans gains
  fastMs: 2000,
  fastStreak: 5,
  pauseMs: 120000,
  // temps de lecture minimal pour être payé (on ne peut pas avoir lu la question avant)
  minReadBase: 1200,
  msPerChar: 18,
  minReadMax: 5000,
  // les gains d'une réponse « hésitante » (« je le savais, j'ai cliqué trop vite »)
  hesitantFactor: 0.5,
};

export const baseReward = (niveau) => ECO.base[Math.min(6, Math.max(1, niveau))];

// rappel espacé réussi : base × (1 + 0,5 × min(4, log2(intervalle + 1)))
export const recallMultiplier = (intervalDays) => 1 + 0.5 * Math.min(4, Math.log2(Math.max(0, intervalDays) + 1));

export const minReadMs = (chars) => Math.min(ECO.minReadMax, Math.max(ECO.minReadBase, chars * ECO.msPerChar));
