// Physique : mobilier de l'île de départ, par pièce (le jeu les pose autour de chacune, world/home/props.js).
// Données pures, sans import (lisibles par le Worker) : obstacles [[x, z, r]] en mètres, dans le
// repère du modèle (pied à l'origine, face vers +Z).

export default {
  parasol: { obstacles: [] },
  bureauEtude: { obstacles: [[-0.55, 0, 0.6], [0.55, 0, 0.6]] },
  pontRiviere: { obstacles: [] },
  pupitreHibou: { obstacles: [[0, 0, 0.45], [-1.7, -0.5, 0.6]] },
  panneauPlace: { obstacles: [[0, 0, 0.25]] },
  bancBois: { obstacles: [[0, 0, 0.7]] },
  lanterneJardin: { obstacles: [[0, 0, 0.2]] },
};
