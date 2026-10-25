// Modèle du checklist de l'open world : les mêmes sections (B à H) pour chaque zone, un élément par
// exigence. L'identifiant d'un élément est stable : `<zone>.<clé>` (ZONE-ILE-VERTE.B06). Les statuts
// ne vivent pas ici : ils viennent du journal (etat.js). Module pur.
//
// Champs d'un élément du modèle :
//   cle, titre, description, section, role (agent responsable), obligatoire, jouable (requis pour la
//   préparation jouable), critique (bloque la livraison quoi qu'indique le score), critere
//   (acceptation), verification (méthode), preuve (attendue).
// La section A (identité et pilotage) est portée par la fiche de zone elle-même (zones.json).

export const SECTIONS = {
  B: { label: 'World design', role: 'world-designer' },
  C: { label: 'Gameplay', role: 'gameplay' },
  D: { label: 'Assets', role: 'asset-artist' },
  E: { label: 'Intégration technique', role: 'technical-artist' },
  F: { label: 'Narration et ambiance', role: 'world-designer' },
  G: { label: 'QA', role: 'technical-artist' },
  H: { label: 'Livraison', role: 'humain' },
};

// [clé, titre, obligatoire, jouable, critique, critère d'acceptation, méthode de vérification, preuve]
const O = true;
const F = false;
const MODELE = [
  ['B01', 'Limites et périmètre', O, F, F, 'Emprise de la zone définie (centre, rayon ou contour) en coordonnées du jeu', 'schema', 'Fiche de zone : champ perimetre'],
  ['B02', 'Relief', O, O, F, 'Relief généré ou modelé, conforme à la fiche', 'tests', 'Test de génération du relief'],
  ['B03', 'Biomes', O, F, F, 'Biome(s) choisis parmi ceux du jeu (biomes.js)', 'schema', 'Fiche de zone : champ biomes'],
  ['B04', 'Chemins principaux', O, O, F, 'Chemins reliant accès et points d’intérêt majeurs', 'tests', 'Test de chemins'],
  ['B05', 'Chemins secondaires', F, F, F, 'Chemins de détour vers les lieux mineurs', 'revue', 'Revue de la fiche'],
  ['B06', 'Accès et sorties', O, O, O, 'Au moins un accès et une sortie atteignables (bateau, vol ou passage)', 'tests', 'Test d’accès et de sortie'],
  ['B07', 'Connexions aux autres zones', O, F, F, 'Connexions déclarées vers des zones existantes', 'schema', 'Fiche de zone : champ connexions'],
  ['B08', 'Points de repère', O, F, F, 'Au moins un repère visible de loin', 'revue', 'Fiche et capture'],
  ['B09', 'Points d’intérêt', O, O, F, 'Liste des points d’intérêt avec position et fonction', 'schema', 'Fiche de zone : champ points_interet'],
  ['B10', 'Zones cachées', F, F, F, 'Lieux secrets décrits et accessibles', 'revue', 'Revue de la fiche'],
  ['B11', 'Verticalité', F, F, F, 'Niveaux de hauteur exploitables décrits', 'revue', 'Revue de la fiche'],
  ['B12', 'Obstacles', F, F, F, 'Obstacles naturels qui guident le parcours', 'revue', 'Revue de la fiche'],
  ['B13', 'Espaces vides recensés', O, F, F, 'Espaces non conçus listés (ou liste vide justifiée)', 'schema', 'Fiche de zone : champ espaces_vides'],
  ['C01', 'Activités principales', O, O, F, 'Activités jouables listées et reliées à un système du jeu', 'tests', 'Test fonctionnel'],
  ['C02', 'Exploration', O, F, F, 'Parcours d’exploration décrit', 'revue', 'Revue de la fiche'],
  ['C03', 'Interactions', O, O, F, 'Interactions implémentées et testées', 'tests', 'Test fonctionnel'],
  ['C04', 'Collecte et ressources', O, F, F, 'Ressources récoltables définies (harvest.js)', 'tests', 'Test de récolte'],
  ['C05', 'Objets interactifs', F, F, F, 'Objets interactifs posés et testés', 'tests', 'Test fonctionnel'],
  ['C06', 'Ennemis', F, F, F, 'Ennemis prévus (le jeu n’en a pas aujourd’hui)', 'revue', 'Décision de conception'],
  ['C07', 'Énigmes', F, F, F, 'Énigmes prévues et résolubles', 'tests', 'Test fonctionnel'],
  ['C08', 'Récompenses', O, F, F, 'Récompenses définies et obtenues en jeu', 'tests', 'Test de progression'],
  ['C09', 'Progression', O, F, F, 'Place de la zone dans la progression', 'revue', 'Revue de la fiche'],
  ['C10', 'Conditions d’accès', O, O, O, 'Conditions d’accès définies et vérifiées', 'tests', 'Test d’accès'],
  ['C11', 'Conditions de sortie', O, O, O, 'Le joueur peut toujours quitter la zone', 'tests', 'Test de sortie'],
  ['D01', 'Terrain', O, O, F, 'Terrain rendu en jeu (relief, surface, couleurs)', 'tests', 'Test de génération et capture'],
  ['D02', 'Végétation', O, F, F, 'Espèces végétales choisies dans le catalogue', 'references', 'Références au catalogue'],
  ['D03', 'Rochers', F, F, F, 'Rochers du catalogue', 'references', 'Références au catalogue'],
  ['D04', 'Architecture', F, F, F, 'Bâtiments et ouvrages du catalogue', 'references', 'Références au catalogue'],
  ['D05', 'Décors', F, F, F, 'Décors du catalogue', 'references', 'Références au catalogue'],
  ['D06', 'Objets interactifs (modèles)', F, F, F, 'Modèles des objets interactifs', 'references', 'Références au catalogue'],
  ['D07', 'Matériaux et textures', O, F, F, 'Palette du biome et matériaux définis', 'revue', 'Palette et capture'],
  ['D08', 'Effets visuels', F, F, F, 'Effets propres à la zone', 'revue', 'Capture'],
  ['D09', 'Audio', F, F, F, 'Sons d’ambiance de la zone', 'revue', 'Écoute en jeu'],
  ['D10', 'Inventaire des assets', O, F, F, 'Assets existants liés au catalogue, manquants spécifiés', 'references', 'Fichier d’inventaire validé'],
  ['E01', 'Région chargée dans le monde', O, O, O, 'La zone est chargée par le monde du jeu (archipel.js)', 'tests', 'Test de chargement'],
  ['E02', 'Ressources importées et référencées', O, O, F, 'Toutes les références résolues', 'references', 'Contrôle des références'],
  ['E03', 'Collisions', O, O, O, 'Sol et obstacles praticables, pas de chute à travers le monde', 'tests', 'Test de collisions'],
  ['E04', 'Échelles', O, F, F, 'Tailles dans la tolérance du registre (±25 %)', 'tests', 'Test des modèles'],
  ['E05', 'Dépendances techniques', O, F, F, 'Aucune dépendance manquante', 'references', 'Contrôle des références'],
  ['E06', 'Build sans erreur', O, O, F, 'npm run build réussit', 'build', 'Sortie du build'],
  ['E07', 'Performances', O, O, F, 'Budget du Worker et des triangles respecté', 'tests', 'Test de budget'],
  ['F01', 'Fonction narrative', O, F, F, 'Souvenir porté par la zone (« chaque île est une mémoire »)', 'revue', 'Fiche de zone : champ narration'],
  ['F02', 'Histoire du lieu', F, F, F, 'Histoire du lieu rédigée', 'revue', 'Revue de la fiche'],
  ['F03', 'Objets mémoriels', F, F, F, 'Objets mémoriels définis', 'revue', 'Revue de la fiche'],
  ['F04', 'Ambiance visuelle et éclairage', O, F, F, 'Ambiance et éclairage décrits puis vérifiés', 'revue', 'Capture'],
  ['F05', 'Ambiance sonore', F, F, F, 'Ambiance sonore décrite', 'revue', 'Écoute en jeu'],
  ['F06', 'Météo et effets d’environnement', F, F, F, 'Météo propre à la zone', 'revue', 'Capture'],
  ['G01', 'Exploration complète', O, O, F, 'Tous les points d’intérêt atteignables', 'tests', 'Test de navigation'],
  ['G02', 'Accès et sorties testés', O, O, O, 'Test automatisé d’accès et de sortie vert', 'tests', 'Résultat de test'],
  ['G03', 'Collisions testées', O, O, F, 'Test de collisions vert', 'tests', 'Résultat de test'],
  ['G04', 'Interactions testées', O, O, F, 'Test des interactions vert', 'tests', 'Résultat de test'],
  ['G05', 'Objets collectables', F, F, F, 'Collectables testés', 'tests', 'Résultat de test'],
  ['G06', 'Sauvegarde et chargement', O, O, O, 'L’état de la zone survit à une sauvegarde et un rechargement', 'tests', 'Test de progression'],
  ['G07', 'Régression', O, O, F, 'Suite complète sans nouvel échec', 'tests', 'npm test'],
  ['G08', 'Performance mesurée', O, F, F, 'Mesure de cadence ou de budget enregistrée', 'tests', 'Mesure'],
  ['G09', 'Cohérence visuelle revue', O, F, F, 'Revue indépendante (archipel-critique) acceptée', 'revue', 'Verdict de revue'],
  ['H01', 'Décision de livraison', O, F, F, 'Décision humaine enregistrée', 'humain', 'Événement de décision'],
];

export const MODELE_CHECKLIST = MODELE.map(([cle, titre, obligatoire, jouable, critique, critere, verification, preuve]) => {
  const section = cle[0];
  return {
    cle, titre, section, categorie: SECTIONS[section].label, role: SECTIONS[section].role,
    obligatoire, jouable, critique, critere, verification, preuve,
    description: `${SECTIONS[section].label} — ${titre}`,
  };
});
export const MODELE_PAR_CLE = new Map(MODELE_CHECKLIST.map((m) => [m.cle, m]));

export const itemId = (zoneId, cle) => `${zoneId}.${cle}`;
export const ITEM_RE = /^(ZONE-[A-Z0-9-]+)\.([B-H]\d{2})$/;

// éléments d'une zone : le modèle, moins ce que la zone déclare non applicable, avec la priorité de
// la zone (P1 pour les éléments critiques)
export function itemsDeZone(zone) {
  const na = new Set(zone.non_applicable || []);
  return MODELE_CHECKLIST.map((m) => ({
    ...m,
    id: itemId(zone.id, m.cle),
    zone_id: zone.id,
    applicable: !na.has(m.cle),
    priorite: m.critique ? 'P1' : zone.priorite,
  }));
}
