// Perroquet (ANI-012) : oiseau tropical rouge aux ailes bleue et verte (gabarit d'oiseau du kit).
import { birdParts } from '../../kit/pieces.js';
import { fiche, species } from '../../kit/fiches.js';

export const espece = {
  speed: 3.5, scale: 0.7, fly: 'circle', height: 7,
  parts: () => birdParts('#e8705f', '#5b9fd8', '#f6d27a', '#7fc48b'),
};

export default fiche('ANI-012', 'perroquet', 'Perroquet', species('perroquet', espece));
