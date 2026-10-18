// Accessoires du personnage (PER-020 à PER-023) : bob, barrette, lunettes et sac, présentés sur l'avatar.
// Leur géométrie est dessinée avec le corps (../corps/index.js, buildAvatarGeometry) : la fiche y renvoie.
import { PIECES } from '../../../entities/character/avatar.js';
import { fiche } from '../../kit/fiches.js';
import { Character } from '../../../entities/character/Character.js';
import { perso } from '../fiche.js';

export default ['bob', 'barrette', 'lunettes', 'sac']
  .map((k, i) => fiche(`PER-${String(i + 20).padStart(3, '0')}`, `accessoire-${k}`, PIECES[k].name, perso(() => Character, { accessory: k }, `piece:${k}`), { tags: ['accessoire'], source: 'src/models/personnage/corps/index.js' }));
