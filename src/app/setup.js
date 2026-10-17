import * as THREE from 'three';

// Importé en tout premier : les couleurs de la palette sont des valeurs
// d'affichage utilisées telles quelles (pas de conversion sRGB → linéaire),
// le rendu étant pensé comme une peinture et non comme un rendu physique.
THREE.ColorManagement.enabled = false;
