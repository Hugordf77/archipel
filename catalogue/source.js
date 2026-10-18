// Ligne du constructeur d'un modèle dans son fichier source (dossier du modèle), pour ouvrir l'éditeur
// au bon endroit : la fonction qui le dessine, sinon la branche de sa famille, sinon sa fiche.
const FONCTIONS = { flotteur: 'flotteurGeometry', crayon: 'crayonGeometry', outils: 'outilGeometry', hibou: 'buildHibou', albatros: 'buildAlbatros', avatar: 'buildAvatarGeometry' };
const FAUNE = { mouette: 'gullGeometry', crabe: 'crabGeometry', papillon: 'butterflyGeometry' };
// types dont le constructeur porte un autre nom (lieux.js, fiches de l'île de départ)
const ALIAS = { banc_vue: 'banc', coffre_cache: 'coffre', epave_geante: 'epave', parasol: 'parasolPlage' };

export function ligneSource(m, text) {
  if (!text) return 1;
  const [kind, key = ''] = m.ref.split(':');
  const camel = key.replace(/_(\w)/g, (_, c) => c.toUpperCase());
  const candidates = [
    FONCTIONS[kind] && `function ${FONCTIONS[kind]}(`,
    kind === 'faune' && `function ${FAUNE[key]}(`,
    kind === 'boat' && 'function dessin(',
    kind === 'decor' && `export const ${key} = {`,
    kind === 'collect' && `kind === '${key}'`,
    kind === 'marine' && `type === '${key}'`,
    kind === 'collect' && 'function collectibleMesh(',
    kind === 'marine' && 'function marineMesh(',
    ['part', 'kind', 'ile', 'species'].includes(kind) && `function ${ALIAS[key] || camel}(`,
    kind === 'species' && 'export const espece',
    kind === 'hair' && `\n  ${key}: {`,
    key && `'${key}'`,
    // pièce de tenue dessinée dans une branche « sinon » (sandales) : le code de son emplacement (dernière
    // étiquette : top, bottom, shoes…)
    kind === 'piece' && `av.${m.tags?.at(-1)} ===`,
    `'${m.id}'`,
  ].filter(Boolean);
  for (const c of candidates) {
    const i = text.indexOf(c);
    if (i >= 0) return text.slice(0, i + (c.startsWith('\n') ? 1 : 0)).split('\n').length;
  }
  return 1;
}
