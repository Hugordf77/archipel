// Vérification des réponses, tolérante et bienveillante.
// Réponses courtes : casse, accents, articles, pluriels et une petite faute de
// frappe sur les mots longs sont pardonnés. Module pur (testé par Vitest).

const ARTICLES = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux',
  'the', 'a', 'an', 'el', 'los', 'las', 'una', 'der', 'die', 'das', 'ein', 'eine', 'il', 'lo', 'gli', 'i',
]);

// minuscules, sans accents ni ponctuation, espaces simples
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[œ]/g, 'oe')
    .replace(/[æ]/g, 'ae')
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9.,\- ]+/g, ' ')
    .replace(/[.,\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// forme canonique : sans articles en tête, mots au singulier
export function canon(s) {
  const words = normalize(s).split(' ').filter(Boolean);
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.map((w) => (w.length > 3 && !/^\d+$/.test(w) ? w.replace(/(s|x)$/, '') : w)).join(' ');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function checkShort(variants, input) {
  const c = canon(input);
  if (!c) return false;
  return variants.some((v) => {
    const cv = canon(v);
    return cv === c || (cv.length >= 8 && !/\d/.test(cv) && levenshtein(cv, c) <= 1);
  });
}

// « 8 849 », « 8849,5 », « 1,5e3 » → nombre
export function parseNumber(s) {
  if (typeof s === 'number') return s;
  const t = String(s ?? '').replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}

// given selon le type :
//   qcm : index dans q.choix · vf : booléen · courte / estim : texte saisi
//   chrono : éléments dans l'ordre choisi · assoc : objet { gauche: droite }
export function checkAnswer(q, given) {
  switch (q.type) {
    case 'qcm':
      return given === q.reponse;
    case 'vf':
      return given === q.reponse;
    case 'courte':
      return checkShort(q.reponses, given);
    case 'chrono':
      return Array.isArray(given) && given.length === q.elements.length && given.every((e, i) => e === q.elements[i]);
    case 'assoc':
      return !!given && q.paires.every(([l, r]) => given[l] === r);
    case 'estim': {
      const v = parseNumber(given);
      if (!Number.isFinite(v)) return false;
      return Math.abs(v - q.reponse) <= Math.abs(q.reponse) * (q.tolerance / 100);
    }
    default:
      return false;
  }
}

// Bonne réponse affichée après coup
export function answerText(q) {
  switch (q.type) {
    case 'qcm':
      return q.choix[q.reponse];
    case 'vf':
      return q.reponse ? 'Vrai' : 'Faux';
    case 'courte':
      return q.reponses[0];
    case 'chrono':
      return q.elements.join(' → ');
    case 'assoc':
      return q.paires.map(([l, r]) => `${l} : ${r}`).join(' · ');
    case 'estim':
      return `${q.reponse.toLocaleString('fr-FR')}${q.unite ? ` ${q.unite}` : ''}`;
    default:
      return '';
  }
}

// longueur de texte à lire (pour le temps de lecture minimal)
export function readingLength(q) {
  let n = q.enonce.length;
  if (q.choix) n += q.choix.join(' ').length;
  if (q.elements) n += q.elements.join(' ').length;
  if (q.paires) n += q.paires.flat().join(' ').length;
  return n;
}

export function shuffled(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
