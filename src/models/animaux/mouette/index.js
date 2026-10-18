// Mouette (ANI-011) : oiseau de mer qui tourne en cercle (gabarit d'oiseau du kit).
import { birdParts } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 4, scale: 0.9, fly: 'circle', height: 9,
  parts: () => birdParts('#fbf7f2', '#d8dce8', '#f6b45e'),
};

export default fiche('ANI-011', 'mouette', 'Mouette', species('mouette', espece));
