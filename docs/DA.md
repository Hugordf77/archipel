# Direction artistique des modèles de l'Archipel

Ce document fixe les règles de forme, de couleur, d'encre, d'animation, de physique et de budget des
modèles 3D. Chaque règle dit comment on la vérifie : `node scripts/modeles/mesure.mjs <id>` (mesures
chiffrées), les tests (`npm test`), la planche du catalogue et la capture en jeu (skill `modele-3d`).
Une règle qu'on ne tient pas s'écrit dans les « écarts restants » du `FICHE.md` du modèle.

## 1. Style

- **Jouet peint.** Volumes simples et ronds, comme taillés dans du bois tendre puis peints à la gouache.
  Le rendu du jeu fait le reste : toon à 4 paliers, peinture Kuwahara, encre teintée par la couleur de
  l'objet. On ne peint pas d'ombre, de reflet ni de texture dans les couleurs des sommets.
- **Esprit des jeux cosy, design original.** Aucun asset, personnage ou silhouette repris d'un jeu ou d'un
  film existant ; une planche de référence sert de cible de proportions et d'ambiance, pas de modèle à
  copier trait pour trait.
- **Lisible d'abord.** Chaque modèle se reconnaît à sa silhouette seule, en ombre chinoise, à 15 m.

## 2. Proportions

| Règle | Seuil | Vérification |
| --- | --- | --- |
| Tête grosse et portée haut | museau au repos au-dessus du garrot ; tête ≥ 35 % de la longueur du corps | `mesure.mjs` : « tête / corps », « museau au repos » |
| Pattes courtes | longueur de patte = 25 à 35 % de la hauteur au garrot | `mesure.mjs` : « pattes / garrot » |
| Formes rondes | aucun angle vif visible : boîtes arrondies (`G.box` rayon ≥ 0,02 m), sphères, profils tournés | planche, gros plans |
| Silhouette lisible à 15 m | se reconnaît sur la capture en jeu « de loin » | `jeu.js` |
| Gabarit tenu | taille mesurée à ± 15 % du gabarit de la planche (± 25 % pour le registre) | `mesure.mjs` : « gabarit », `tests/models.test.js` |

## 3. Couleurs

- **Palette pastel chaude** : `src/models/kit/palette.js` (`PAL`) et les teintes des lieux
  (`kit/lieux.js`). Une couleur nouvelle reste douce : saturation modérée, valeur claire.
- **Jamais de noir pur.** Le plus sombre est l'encre des yeux, `#3d3049` (`EYE`, `kit/accessoires.js`).
  `mesure.mjs` signale toute couleur de sommet plus sombre (« noir »).
- **Ombres chaudes pour la faune** : matériau `fauna` à `warmShadow` (`kit/materials.js`) ; un pelage
  blanc ne vire pas au violet.
- **Robes par teinte d'instance** : le pelage est dessiné en blanc (`tint: 1`) et prend la couleur de la
  robe ; yeux, museau, sabots, cornes, colliers sont en `tint: 0` (couleur fixe). Les toits et volets
  des maisons suivent la même logique (`tint: 1`, murs `tint: 0.5`).

## 4. Formes vues de près

S'applique aux créatures, au personnage, au décor et à tout ce qu'on regarde à moins de 3 m.

- **Aucune facette visible** : sphères et ellipsoïdes à 10 segments ou plus (`G.sphere(r, w, h)` avec
  `w ≥ 10`) ; `mesure.mjs` liste les primitives en dessous, avec leur `fichier:ligne`.
- **Les bons outils du kit** :
  - membres, cornes, queues : `limb` (tube lisse le long d'une courbe, sans bouchon interne) ;
  - visages : `skinMesh` (peau d'un seul tenant, museau tiré du visage) ;
  - oreilles : `leafGeo` (feuille creusée) ;
  - cloches, sabots, pots : profils tournés (`G.lathe`) ;
  - laine : `curls` (boucles sur un fond de laine) ; taches : `patch` (épousent la surface).
- **Aucune fente aux jointures** : une pièce qui en rejoint une autre s'y enfonce (pattes dans le corps,
  cou dans le poitrail) ; pas de cylindres bout à bout qui laissent voir un joint.
- **Aucun losange, aucune pièce plate en « autocollant »** : un œil, un nez, une tache ont du volume et
  épousent la surface (`onSkin`, `patch`), jamais un disque posé à plat.

## 5. Encre (contours)

Les contours sont tracés aux changements d'identifiant de contour (`aId`, un par `Builder`).

- **Les pattes sortent du dessous du corps** : la jonction visible patte-corps est à moins de 3 cm sous le
  ventre, jamais sur le flanc (`mesure.mjs` : « jonctions patte-corps »).
- **Identifiant partagé pour les pièces soudées** (cou et corps : `part(…, id)`) : pas de trait d'encre au
  raccord.
- **Jamais d'identifiant partagé pour des pièces qui se recouvrent** (oreille devant la tête, collier sur
  le cou) : le trait doit les séparer.

## 6. Animation

- **Contrat des pièces** : `{ geo, pivot, anim, side, phase, parent? }` (`kit/pieces.js`) ; `anim` vaut
  `leg`, `head`, `neck`, `wing`, `tail`, `hop` ou `none` ; une pièce à `parent` a son pivot dans le repère
  de ce parent, et vient après lui.
- **Cou articulé** : les ongulés ont une pièce `neck` qui porte la tête (`parent`), pour brouter sans
  casser la nuque.
- **Broutage** : museau à moins de 12 cm du sol en broutant ; tête jamais sous le sol ; tête toujours
  attachée (`mesure.mjs` : « museau », « tête attachée » ; `tests/models.test.js`).
- **Sabots au sol** à ± 1 cm au repos (`mesure.mjs` : « sabots »).

## 7. Physique

La collision colle à la forme visible. Les données vivent dans le `physique.js` du dossier ; l'aide
« Collisions » du catalogue les dessine (colonne d'obstacle, cercle d'encombrement, ruban de plancher).

- **Un tronc est bloqué à son rayon visible, à ± 15 %** près (`mesure.mjs` : « physique / forme »).
- **Les obstacles couvrent l'emprise des murs** : au moins 85 % de l'emprise au sol (jusqu'à 1,8 m de
  haut) est dans un cercle d'obstacle, et aucun cercle ne déborde de plus de 0,4 m dans le vide.
- **Les planchers suivent les surfaces marchables** : à ± 5 cm du dessus des planches, sur toute leur
  longueur.
- **L'encombrement** (végétation, décor posé) est le rayon que la génération des îles laisse libre ; il
  sert aussi d'obstacle de navigation : la règle du tronc s'y applique.

## 8. Budgets

Plafonds de triangles de la version fine, par catégorie (`src/models/kit/budgets.js`, vérifiés par
`tests/models.test.js`) :

| Catégorie | Budget | Catégorie | Budget |
| --- | --- | --- | --- |
| arbres (instanciés) | 1 500 | bateaux | 4 500 |
| plantes | 1 000 | décor | 3 500 |
| rochers | 800 | objets | 1 800 |
| bâtiments | 4 000 | animaux | 3 500 (petite faune : viser 1 500) |
| ouvrages | 3 000 | personnage | 9 000 |
| monuments | 4 000 | | |

- **Au-delà de 4 000 triangles, version allégée obligatoire** (`lod`), aux mêmes pièces (pivots,
  animations, parents), vue au-delà de 20 m.
- **Toute hausse de budget se demande à l'utilisateur** ; une fiche peut alors porter son propre budget
  (`budget: { triangles, lod }`, comme le mouton : 10 000 et 3 400 ; les fiches de l'avatar : 9 500,
  accordé le 21/11/2026, `src/models/personnage/fiche.js`).
- **Écarts connus** (relevés le 18/10/2026, liste `ECARTS`) : 18 modèles, surtout les pièces uniques de
  l'île de départ (ponton : 20 428 triangles). Un modèle repris doit sortir de la liste.

## 9. Contrôle

- **Planche 6 vues** dans le catalogue (`scripts/modeles/planche.js`) : face, dos, profil, dessus,
  3/4 avant, 3/4 arrière, plus deux poses de broutage et les gros plans (tête, pattes) ; composée
  « référence / modèle » quand il y a une `reference.png`.
- **Capture en jeu de près et de loin** (`scripts/modeles/jeu.js`), sauvegarde verrouillée, avec le
  coût en triangles par espèce, et l'aide « Collisions » sur la fiche.
- **Écarts chiffrés** : `mesure.mjs` avant et après, consignés dans le `FICHE.md` et la note du
  catalogue.

## 10. Écarts connus à reprendre

- **Arbres et grandes plantes** : l'encombrement (0,55 m pour l'arbre pompon) est plus de deux fois le
  rayon visible du tronc (≈ 0,24 m) ; le joueur bute dans le vide autour des arbres.
- **Petite faune** (ANI-005 à ANI-023) : primitives à 4 à 8 segments, formes en boules ; à reprendre une à
  une, planche à l'appui.
