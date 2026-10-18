// Relais des tables du jeu : lieux.js (type de lieu → constructeur) et la végétation (espèce → modèle)
// s'y inscrivent en se chargeant ; l'assemblage d'un modèle seul (catalogue, tests) les y lit. Sans ce
// relais, l'assemblage importerait les tables, qui importent les dossiers de modèle, dont les fiches
// emploient l'assemblage : un cycle d'import qui casse selon l'ordre de chargement.
export const TABLES = { lieux: null, vegetation: null };

// table inscrite, ou erreur explicite si son module n'a pas été chargé
export function table(nom) {
  if (!TABLES[nom]) throw new Error(`table « ${nom} » non chargée : importer src/models/${nom === 'lieux' ? 'lieux' : 'vegetation'}.js`);
  return TABLES[nom];
}
