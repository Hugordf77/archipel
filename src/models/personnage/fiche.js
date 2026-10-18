// Fabrique des fiches du personnage : un avatar complet (entities/character/Character.js), habillé
// de la pièce présentée ; animé au repos. personnage() rend la classe Character, que la fiche importe
// elle-même : lue à la construction seulement, elle ne crée pas de cycle au chargement des modules
// (Character importe la géométrie du personnage, donc ces dossiers).
import { defaultAvatar } from '../../entities/character/avatar.js';

export function perso(personnage, over = {}, ref = 'avatar') {
  return {
    ref, usedIn: ['personnage joueur'], tags: ['animé'],
    params: { skin: [0, 5], hairColor: [0, 7] },
    build(q = {}) {
      const c = new (personnage())({ ...defaultAvatar(), ...over, ...q });
      return { object3d: c.root, anim: (dt) => c.update(dt, 0) };
    },
  };
}
