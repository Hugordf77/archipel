// Animaux : API que le jeu importe. SPECIES réunit les 23 espèces de la faune des îles (ANI-001 à
// ANI-023), une par dossier, dans l'ordre du registre. Chaque pièce d'une espèce :
// { geo, pivot [x, y, z], anim, side, phase, parent? } ; le jeu les instancie (IslandFauna).
// Ongulés : pièces dessinées à la main. Le pelage est teinté par animal (tint 1, sommets clairs
// multipliés par la couleur de la robe) ; yeux, museau, sabots, cornes et bois ne le sont pas.
// Ongulés refaits (catalogue ANI-001 à ANI-004) : visage, cou porté par la pièce « head » (la vache
// a un cou articulé, pièce « neck »), pattes à sabots, robes teintées par animal. graze : angle de
// broutage (rad) de la tête, ou du cou s'il y en a un ; nod : angle de la tête portée par le cou ;
// muzzle : bout du museau dans le repère de la tête ; top : haut de la tête (m, avant l'échelle).
import { espece as mouton } from './mouton/index.js';
import { espece as chevre } from './chevre/index.js';
import { espece as vache } from './vache/index.js';
import { espece as cerf } from './cerf/index.js';
import { espece as renard } from './renard/index.js';
import { espece as lapin } from './lapin/index.js';
import { espece as herisson } from './herisson/index.js';
import { espece as ecureuil } from './ecureuil/index.js';
import { espece as tortue } from './tortue/index.js';
import { espece as crabe } from './crabe/index.js';
import { espece as mouette } from './mouette/index.js';
import { espece as perroquet } from './perroquet/index.js';
import { espece as flamant } from './flamant/index.js';
import { espece as canard } from './canard/index.js';
import { espece as grenouille } from './grenouille/index.js';
import { espece as poisson } from './poisson/index.js';
import { espece as papillon } from './papillon/index.js';
import { espece as abeille } from './abeille/index.js';
import { espece as luciole } from './luciole/index.js';
import { espece as phoque } from './phoque/index.js';
import { espece as pingouin } from './pingouin/index.js';
import { espece as lezard } from './lezard/index.js';
import { espece as escargot } from './escargot/index.js';

export const SPECIES = {
  mouton, chevre, vache, cerf, renard, lapin, herisson, ecureuil,
  tortue, crabe, mouette, perroquet, flamant, canard, grenouille, poisson,
  papillon, abeille, luciole, phoque, pingouin, lezard, escargot,
};

export { butterflyGeometry, crabGeometry, gullGeometry, GULL_PIVOTS, BUTTERFLY_PIVOTS, CRAB_LEG_PIVOTS } from './faune-depart/index.js';
export { buildHibou } from './hibou/index.js';
export { buildAlbatros } from './albatros/index.js';
