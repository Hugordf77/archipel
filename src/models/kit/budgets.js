// Budgets de triangles des modèles (docs/DA.md, « Budgets ») : un plafond par catégorie pour la version
// fine ; au-delà de LOD_SEUIL triangles, une version allégée aux mêmes pièces est obligatoire (vue au-delà
// de LOD_DISTANCE m). Une fiche peut fixer son propre budget (budget: { triangles, lod }), validé par
// l'utilisateur ; toute hausse se demande. ECARTS : dépassements connus, relevés le 18/10/2026, à
// résorber (un modèle repris doit sortir de cette liste).
export const LOD_SEUIL = 4000;
export const LOD_DISTANCE = 20;

export const BUDGETS = {
  arbres: 1500, // instanciés par centaines ; repères uniques : voir ECARTS
  plantes: 1000,
  rochers: 800,
  batiments: 4000,
  ouvrages: 3000,
  monuments: 4000,
  bateaux: 4500, // montures, vues de près
  decor: 3500,
  objets: 1800,
  animaux: 3500, // petite faune : viser 1 500
  personnage: 9000, // un seul exemplaire, vu de près
};

// identifiant → triangles mesurés au relevé (version fine, variante la plus lourde)
export const ECARTS = {
  'ARB-008': 3600, 'ARB-014': 3582, 'ARB-015': 2708,
  'PLA-004': 1228, 'PLA-014': 1696, 'PLA-018': 7088, 'PLA-019': 2710,
  'BAT-002': 6776, 'BAT-003': 9328, 'BAT-009': 4244, 'BAT-012': 8264,
  'STR-002': 20428, 'STR-021': 5404, 'STR-022': 7872, 'STR-023': 4960,
  'DEC-009': 4768,
  'ANI-027': 4668, 'ANI-028': 5358,
};

// budget d'un modèle (fiche du registre) : le sien s'il en a un, sinon celui de sa catégorie
export const budgetDe = (m) => m.budget?.triangles ?? BUDGETS[m.category];
