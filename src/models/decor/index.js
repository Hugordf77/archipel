// Décor : API que le jeu importe (gameplay/decor.js). CATALOG réunit les articles de l'échoppe, un
// dossier par famille (jardin, curiosités, ateliers), dans l'ordre du registre (DEC-001 à DEC-018).
import { pierre, pot, cloture, lanterne, champi, nichoir, banc, fanions, hamac } from './jardin/index.js';
import { telescope, moulin, arche, statue, fontaine } from './curiosites/index.js';
import { etabli, four, couture, chantier } from './ateliers/index.js';

// Catalogue de l'échoppe (prix en coquillages ; r : encombrement, voir physique.js)
export const CATALOG = {
  pierre, pot, cloture, lanterne, champi, nichoir, banc, fanions, hamac,
  telescope, moulin, arche, statue, etabli, four, couture, chantier, fontaine,
};
export const CATALOG_ORDER = ['pierre', 'cloture', 'pot', 'lanterne', 'champi', 'nichoir', 'banc', 'fanions', 'hamac', 'telescope', 'moulin', 'arche', 'statue', 'fontaine'];
