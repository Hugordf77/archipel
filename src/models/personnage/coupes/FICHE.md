# Coupes — PER-026 (PER-002 à PER-007 retirées)

Dossier `src/models/personnage/coupes/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-026 | Coupe : En pics | Validé | `hair:pics` | 0,82 × 1,64 × 0,77 | 9 000 (personnage) |
| PER-002 | Coupe : Bol court | Retiré | `hair:bol` | — | — |
| PER-003 | Coupe : Carré frangé | Retiré | `hair:carre` | — | — |
| PER-004 | Coupe : Queue haute | Retiré | `hair:queue` | — | — |
| PER-005 | Coupe : Deux macarons | Retiré | `hair:macarons` | — | — |
| PER-006 | Coupe : Boucles | Retiré | `hair:boucles` | — | — |
| PER-007 | Coupe : Longs lisses | Retiré | `hair:longs` | — | — |

Les coupes retirées gardent leur numéro (règle du registre) et montrent l'avatar d'aujourd'hui ; une
sauvegarde qui en porte une retombe sur la coupe en pics (`sanitizeAvatar`, `entities/character/avatar.js` ;
test `tests/cheveux.test.js`). Le miroir ne propose plus de coupe, seulement la couleur.

## DA retenue

- **Une seule coupe, ébouriffée en pics** (choix de l'utilisateur le 21/10/2026 : « ébouriffé en
  pics », pas une couronne) : volume rond (calotte décentrée vers le haut et l'arrière, 18 × 12
  segments) hérissé de 23 mèches de longueurs, de sens et de décollements inégaux, sans symétrie.
- **Mèches** : tubes effilés à bout rond (`limb` du kit, bout en dôme), aplatis contre le crâne
  (épaisseur 0,5 de la largeur) dans un repère propre à chaque mèche : axe = sens du coiffé ramené dans
  le plan de la calotte puis décollé d'un angle, épaisseur = normale de la calotte. Pas d'angle vif :
  la pointe garde un rayon de 10 % de la largeur. Toutes ont un identifiant de contour à part
  (`ID.limb`) : elles recouvrent la calotte, le trait d'encre les en détache (DA, § 5).
- **Groupes** :
  - frange (5 mèches couchées, 10 côtés et 4 anneaux : aucune facette de près) : inégales, en zigzag,
    pointes au-dessus des sourcils ;
  - côtés (4 mèches, 7 côtés) : balayés vers l'arrière, décollés (0,45 à 0,5 rad) pour déborder de la
    silhouette, oreilles visibles ;
  - dessus (8 pics en feuille, os `HAIR_A`) : chacun dans son sens, décollés de 0,5 à 0,7 rad, 13 à
    18 cm, pointes qui rebiquent ;
  - arrière (6 mèches couchées vers la nuque, 6 côtés, os `HAIR_B`) : rang haut clair (3), rang bas
    foncé (3), pointes en zigzag ; vues de dos, elles se lisent comme la frange.
- **Avec le bob** : ni dessus ni rang haut de l'arrière (le chapeau les couvre) ; le dôme du bob est
  calé sur la calotte (`corps/index.js`), plus rien ne le traverse.
- **Couleurs** : celle choisie au miroir (`HAIR_COLORS`) ; rang bas de l'arrière à 86 %.
- **Physique** (`entities/character/cheveux.js`, branchée dans `Character.hairPush`) : dessus
  (`HAIR_A`) et arrière (`HAIR_B`) sont des pendules raides fixés à la tête, poussés par l'accélération
  du crâne (racine prise sur la vitesse du moteur, plus la moitié de celle due à la pose, lissées sur
  40 ms) et par le vent ressenti (vent du monde + vent de course), exprimés dans le repère de la tête.
  Ressort à ≈ 2 oscillations par seconde, amortissement 0,32, sous-pas fixes de 1/240 s ; cible saturée
  en douceur sous les butées (dessus −0,24 / +0,18 rad, roulis 0,16 ; arrière −0,08 / +0,40, roulis
  0,24 ; vrille ± 0,15), butées souples, angles de l'os bornés. Aux butées, les pointes restent à 18 %
  hors du crâne et 4,7 % hors de la calotte (`tests/cheveux.test.js`).
- **En jeu** (`captures/physique-eb-courbe.png`, `captures/physique-eb-planche.png`) : départ, dessus
  en arrière (−0,23) et nuque soulevée (+0,35) ; course, dessus couché de 0,1 à 0,2, nuque qui flotte
  (+0,1 à +0,24) au rythme de la foulée ; chute libre, dessus redressé, nuque à sa butée ; réception,
  tout se couche ; arrêt brusque, le dessus part en avant (+0,17), rebondit une fois et se pose en
  moins d'une seconde ; roulade, aucune valeur aberrante, retour au repos.

Règles communes : `docs/DA.md`.

## Écarts restants

- La coupe grandit le personnage : 1,48 → 1,64 m hors tout, 0,67 → 0,82 m de large (pics du dessus et
  des côtés) ; voulu, la silhouette ébouriffée se lit à 15 m.
- 8 566 triangles pour l'avatar par défaut, au plus 8 878 selon la tenue : sous le budget de 9 000,
  avec peu de marge pour un futur accessoire de tête.
- Vue de profil, les mèches de côté et du dessus restent assez proches de la calotte : la tête se lit
  surtout par sa silhouette.

## Historique

- 18/10/2026 : fiche créée.
- 21/10/2026 : six coupes remplacées par une seule coupe en pics (PER-026) ; PER-002 à PER-007 retirées ;
  anciennes sauvegardes migrées (`captures/pics-v7-*.png`).
- 21/10/2026 : physique des pics (inertie du crâne et vent ressenti, ressorts amortis bornés) ;
  `captures/physique-*.png`, courbe `captures/physique-courbe.png`.
- 21/10/2026 : reprise après Evis-critique (bob traversé, mèches de dos en « autocollants », facettes
  de la frange) et retour de l'utilisateur : la couronne régulière devient un ébouriffé en pics
  (`captures/ebouriffe-final-planche.png`, `captures/physique-eb-*.png`).
