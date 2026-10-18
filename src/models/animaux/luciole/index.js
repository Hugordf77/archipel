// Luciole (ANI-019) : halo lumineux qui pulse la nuit (aucune pièce).
import { fiche, species } from '../../kit/fiches.js';

export const espece = { speed: 0.6, scale: 1, insect: 'glow', glow: [0xe9f5a0, 0.5], height: 1.4, night: true, parts: () => [] };

export default fiche('ANI-019', 'luciole', 'Luciole', species('luciole', espece));
