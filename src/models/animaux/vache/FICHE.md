# Vache — ANI-003

Dossier `src/models/animaux/vache/` · Animaux · modèle vedette · planche de référence : `reference.png`

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| ANI-003 | Vache | À retravailler (en attente du verdict d'Evis-critique) | `species:vache` | 0,84 × 1,59 × 1,98 | 10 000 triangles (allégé : 3 500) |

## DA retenue

Reprise du 19/10/2026 d'après la planche 6 vues, G étant la hauteur au garrot (0,86 m avant l'échelle 1,4,
soit 1,21 m).

- **Corps d'un seul tenant** : union lisse (`union`, kit) du tonneau, de la croupe carrée, des épaules et du
  garrot, du poitrail, d'un ventre à peine tombant, des cuisses et des avant-bras. Raccords larges (k de 6 à
  10 cm) : ni bosse d'épaule, ni masse posée, ni creux serré. Maillé en grille (`grille`, 32 × 22), pôles au
  poitrail et à la croupe, normales tirées du champ. Les pointes de hanche sont les coins hauts de la croupe :
  des bosses à part trouaient les taches.
- **Taches** : `patch` sur la surface de l'union, contour de 20 à 32 côtés, arêtes recoupées là où le corps
  bombe (option `tol`, sans fente), décollées de 6 mm. À droite (−x, profil de la planche) : selle, épaule,
  haricot, croupe, petite tache, cuisse ; à gauche : épaule, flanc, croupe, cuisse, bas du flanc.
- **Tête d'un seul tenant** : union du crâne rond, du front, des joues, des arcades, de la mâchoire et du
  museau (face avant aplatie), avec deux naseaux creusés (formes creuses penchées). Grille dont le pôle est au
  centre du museau : la frontière rose / crème suit un parallèle (bord net, mêmes sommets des deux côtés, pas
  de pli). Le fond des naseaux est un ovale sombre posé dans le creux. Une ligne de bouche fine passe sous le
  museau. Les yeux sont des perles à reflet (`eye`, detail 2), hauts et écartés. La tache de l'œil gauche
  (`patch`) va du front à l'oreille. La peau de la tête partage l'identifiant du cou et du corps : pas de
  trait à la nuque ni sous la gorge.
- **Oreilles** en `leafGeo` creusées (intérieur rose vers l'avant), à l'horizontale ; la gauche prend la tache à
  sa base. **Cornes** en `limb` à 10 côtés, base annelée, pointe arrondie, « dehors, haut, un peu dedans ».
- **Cou** court et épais (16 × 12), relevé sur le collier de la planche (nuque y 0,92 / z 0,26, gorge y 0,65 /
  z 0,48) : incliné de 0,89 rad. Broutage : cou 1,45 rad, tête −0,35 rad.
- **Collier rond** (`collier`, kit : tube de 2 cm à 10 côtés, boucle en rectangle arrondi sur le flanc gauche)
  et **cloche suisse** (`clocheSuisse`, kit) : tronc de pyramide aux arêtes arrondies (section en
  superellipse), bord ourlé, bouche sombre, battant visible, anneau. Collier et cloche ont chacun leur
  identifiant (trait sur le cou).
- **Pattes** au tiers de G : tubes lisses (`limb`, 10 côtés), avec des rayons par point pour marquer le genou,
  le jarret, le boulet et le paturon. Deux onglons lisses (10 × 5) à semelle plate et face intérieure droite
  (fente nette) ; ergots discrets à l'arrière du boulet.
- **Pis** en quatre quartiers soudés (union), trayons à 10 côtés ; **queue** en `limb` à 10 côtés, courbe en S ;
  **houppe** de six mèches effilées et évasées (teinte des taches).
- **Robes** : pie brune `#8a5a3c`, pie noire `#4d4453` (éclaircie : plus claire que l'encre des yeux
  `#3d3049`), pie rouge `#b8643c`.
- **Velours** : rendu par la forme seule (peaux sans facette, arêtes adoucies, liseré de lumière du matériau
  `fauna`), shader commun inchangé.
- **Version allégée** (au-delà de 20 m) : mêmes 8 pièces, pivots, animations et parents ; 3 104 triangles.
- **Physique** : le jeu ne fait buter ni le joueur ni la faune sur les animaux. `okAt` (faune) ne regarde que le
  relief et l'eau ; `obstacleAt` (joueur) ne lit que les obstacles fixes des îles. Pas de `physique.js`.
- **En jeu** : pas encore placée dans le monde ouvert (étape « bases » : pas de faune). Un troupeau de 3 vaches
  aux robes mêlées se pose à la main par les lieux d'une île (`lieux.faune`, `gen/spawns.js`) : c'est le cas
  de l'île d'essai des tests (`tests/fixtures/ile-essai.js`).

Mesures (`node scripts/modeles/mesure.mjs ANI-003`) : 8 pièces (allégé : 8), 9 785 triangles fin et 3 104
allégé, gabarit 0,84 × 1,59 × 1,98 m, pattes / garrot 34 %, jonctions patte-corps à 0 cm, tête / corps 62 %,
museau à 1,05 m au repos et 0,04 m en broutant, aucune facette, aucun noir. Toutes les lignes sont en ✓.

Proportions face à la planche (G = 0,862 m avant l'échelle) :

| Mesure | Planche | Modèle | Écart |
| --- | --- | --- | --- |
| Pattes visibles | 0,33 G | 0,338 G | +2,3 % |
| Profondeur du corps | 0,64 à 0,67 G | 0,675 G | +0,7 % au-dessus de la fourchette |
| Longueur du corps | 1,1 G | 1,115 G | +1,3 % |
| Largeur du corps | 0,58 G | 0,602 G | +3,7 % |
| Longueur de la tête | 0,45 G | 0,461 G (41 % du corps) | +2,3 % |
| Haut du crâne | 1,21 G | 1,234 G | +2,0 % |
| Pointe des cornes | 1,31 G | 1,318 G | +0,6 % |
| Envergure des oreilles | 0,70 G | 0,693 G | −1,0 % |
| Museau rose / tête | 72 % | 70 % | −2,5 % |
| Museau devant le poitrail | 0,32 G | 0,318 G | −0,7 % |

Règles communes : `docs/DA.md`.

## Écarts restants

- **Velours** : la douceur feutrée de la planche n'est rendue que par la forme et le liseré du matériau. Le
  shader commun n'a pas de duvet, et on n'y touche pas pour un modèle.
- **Cloche en broutant** : la cloche suit le cou. Tête baissée, elle pointe vers l'avant au lieu de pendre : le
  contrat des pièces n'a pas d'animation de pendule.
- **Raccord tête / cou** : il n'y a pas de trait (identifiant partagé), mais un léger pli d'ombrage marque
  l'endroit où la peau de la tête entre dans le cou (deux surfaces qui se croisent).
- **Dessous du corps** : sur les coins bas des avant-bras et des cuisses, les cordes du maillage passent
  jusqu'à 1,8 cm sous la vraie surface. La silhouette du ventre y reste un peu polygonale, vue d'en dessous.
- **Genoux, jarrets, ergots** : ils sont marqués, mais discrets à distance de jeu. Les ergots ne se lisent que
  de près.
- **Profondeur du corps** : 0,675 G, à peine au-dessus de la fourchette de la planche (0,64 à 0,67 G).
- **Taches** : placées d'après les vues de profil et de dessus. La selle descend surtout sur le flanc droit ; sur
  la planche, la bande du dessus est plus symétrique.
- **Première construction** : environ 0,25 s (fine et allégée), mémorisée ensuite. C'est un léger à-coup à
  l'arrivée du premier troupeau.

## Historique

- 18/10/2026 : fiche créée ; ANI-003 validé au catalogue (3 480 triangles).
- 19/10/2026 : reprise d'après la planche (tour 1). Corps et tête d'un seul tenant (union lisse), museau rose à
  bord net, naseaux creusés, cloche suisse et collier rond à boucle, pattes au tiers de G avec onglons fendus et
  ergots, houppe en mèches, version allégée, troupeau de 3 vaches à Pommeraie. 9 785 triangles (allégé :
  3 104).
