// Tenues du personnage (PER-008 à PER-019) : hauts, bas, chaussures et écharpe, présentés sur l'avatar.
// Leur géométrie est dessinée avec le corps (../corps/index.js, buildAvatarGeometry) : la fiche y renvoie.
import { PIECES } from '../../../entities/character/avatar.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

export default ['tshirt', 'pull', 'gilet', 'robe', 'short', 'jupe', 'pantalon', 'salopette', 'baskets', 'bottes', 'sandales', 'echarpe']
  .map((k, i) => fiche(`PER-${String(i + 8).padStart(3, '0')}`, `tenue-${k}`, PIECES[k].name, perso(() => Character, { [PIECES[k].slot]: k }, `piece:${k}`), { tags: ['tenue', PIECES[k].slot], source: 'src/models/personnage/corps/index.js' }));
