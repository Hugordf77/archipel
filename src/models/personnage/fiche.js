// Fabrique des fiches du personnage : un avatar complet (entities/character/Character.js), habillé
// de la pièce présentée ; animé au repos. personnage() rend la classe Character, que la fiche importe
// elle-même : lue à la construction seulement, elle ne crée pas de cycle au chargement des modules
// (Character importe la géométrie du personnage, donc ces dossiers).
import { defaultAvatar } from '../../entities/character/avatar.js';

// Budget de triangles des fiches de l'avatar : 9 500 (hausse accordée par l'utilisateur le 21/11/2026 pour
// arrondir les lames de cheveux en gardant les plis des vêtements ; catégorie personnage : 9 000, kit/budgets.js)
export const BUDGET_PERSO = { triangles: 9500 };

export function perso(personnage, over = {}, ref = 'avatar') {
  return {
    ref, usedIn: ['personnage joueur'], tags: ['animé'], budget: BUDGET_PERSO,
    params: { skin: [0, 5], hairColor: [0, 7] },
    build(q = {}) {
      const c = new (personnage())({ ...defaultAvatar(), ...over, ...q });
      return { object3d: c.root, anim: (dt) => c.update(dt, 0) };
    },
  };
}
