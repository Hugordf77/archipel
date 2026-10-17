// Domaines du savoir, niveaux et projets d'île.
// Module pur (aucune dépendance navigateur) : partagé par le jeu, les tests et les scripts.

export const LEVELS = [
  { n: 1, name: 'Graine', hint: 'école primaire' },
  { n: 2, name: 'Pousse', hint: 'collège' },
  { n: 3, name: 'Bouton', hint: 'lycée' },
  { n: 4, name: 'Fleur', hint: 'culture solide' },
  { n: 5, name: 'Arbre', hint: 'spécialiste' },
  { n: 6, name: 'Forêt', hint: 'érudit' },
];

export const DOMAINS = [
  { id: 'histoire', name: 'Histoire', color: '#e8a07a' },
  { id: 'geographie', name: 'Géographie', color: '#8fc4ec' },
  { id: 'svt', name: 'Sciences de la vie et de la Terre', short: 'SVT', color: '#a6d98f' },
  { id: 'physique', name: 'Physique-chimie', color: '#9cc8ec' },
  { id: 'maths', name: 'Mathématiques', color: '#f4a28c' },
  { id: 'astronomie', name: 'Astronomie et espace', short: 'Astronomie', color: '#a99be0' },
  { id: 'francais', name: 'Langue française', color: '#f6d27a' },
  { id: 'litterature', name: 'Littérature', color: '#f7b6c8' },
  { id: 'langues', name: 'Langues étrangères', short: 'Langues', color: '#8fd6c3' },
  { id: 'philosophie', name: 'Philosophie', color: '#c7b2e6' },
  { id: 'arts', name: 'Arts et architecture', short: 'Arts', color: '#f3b77e' },
  { id: 'musique', name: 'Musique', color: '#ef9bb5' },
  { id: 'economie', name: 'Économie et société', short: 'Économie', color: '#e0b56a' },
  { id: 'droit', name: 'Droit et institutions', short: 'Droit', color: '#b8a48e' },
  { id: 'informatique', name: 'Informatique et numérique', short: 'Informatique', color: '#7cc8b0' },
  { id: 'nature', name: 'Nature, écologie et cultures du monde', short: 'Nature et cultures', color: '#9fd08a' },
];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);
export const domainById = (id) => DOMAINS.find((d) => d.id === id);

// Cotes de type Elo : une question de niveau n vaut 500 + 200 n (700 → 1700)
export const RATING_START = 1000;
export const defaultQuestionRating = (niveau) => 500 + 200 * niveau;
export const levelOfRating = (r) => Math.min(6, Math.max(1, Math.round((r - 500) / 200)));

// Projets d'île : on les débloque avec les points de savoir de leurs domaines
// (cumulés), puis on paie chaque étape en coquillages.
export const PROJECTS = {
  observatoire: { name: 'Observatoire', domains: ['astronomie', 'physique'] },
  serre: { name: 'Serre', domains: ['svt', 'nature'] },
  theatre: { name: 'Petit théâtre', domains: ['litterature', 'musique', 'arts'] },
  atelier: { name: 'Atelier', domains: ['informatique', 'maths', 'physique'] },
  musee: { name: 'Musée', domains: ['histoire', 'geographie', 'economie', 'droit'] },
  salon: { name: 'Salon de thé', domains: ['langues', 'philosophie', 'francais'] },
};
export const PROJECT_IDS = Object.keys(PROJECTS);

// Trois étapes par projet : seuil de points de savoir et prix en coquillages
export const PROJECT_STAGES = [
  { points: 40, cost: 400, label: 'Fondations' },
  { points: 160, cost: 700, label: 'Charpente' },
  { points: 400, cost: 1000, label: 'Finitions' },
];
