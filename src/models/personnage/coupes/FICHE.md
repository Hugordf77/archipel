# Coupes — PER-026 (PER-002 à PER-007 retirées)

Dossier `src/models/personnage/coupes/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-026 | Coupe : En pics | Validé | `hair:pics` | 0,77 × 1,67 × 0,78 | 9 000 (personnage) |
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

- **Une seule coupe, en pics**, à la manière d'un garçon de film d'animation peint : volume rond (la
  calotte décentrée vers le haut et l'arrière) hérissé de 23 mèches en pics.
- **Mèches** : tubes effilés à bout rond (`limb` du kit, 7 côtés, 3 anneaux, bout en dôme), aplatis
  contre le crâne (épaisseur 0,5 de la largeur) dans un repère propre à chaque mèche : axe = sens du
  coiffé ramené dans le plan de la calotte puis décollé d'un angle, épaisseur = normale de la calotte.
  Pas d'angle vif : la pointe garde un rayon de 10 % de la largeur.
- **Groupes** :
  - frange (5 mèches couchées, larges dès le pied, enfoncées de 3 cm) : pointes en zigzag au-dessus
    des sourcils ; identifiant de contour à part (`ID.limb`) : elle recouvre la calotte, le trait
    d'encre l'en détache (DA, § 5) ;
  - côtés (4 mèches couchées, teinte foncée) : balayés vers l'arrière au-dessus des oreilles, qui
    restent visibles ;
  - couronne (7 pics dressés en feuille, pied fin enfoui à 4,5 cm, os `HAIR_A`) : vers le haut et
    l'arrière, 15 à 16 cm ;
  - arrière (7 mèches dressées, teinte foncée, os `HAIR_B`) : vers l'arrière puis la nuque.
- **Couleurs** : celle choisie au miroir (`HAIR_COLORS`), mèches de côté et d'arrière à 86 %.
- **Physique** (`entities/character/cheveux.js`, branchée dans `Character.hairPush`) : couronne
  (`HAIR_A`) et arrière (`HAIR_B`) sont des pendules raides fixés à la tête, poussés par l'accélération
  du crâne (racine prise sur la vitesse du moteur, plus la moitié de celle due à la pose, lissées sur
  40 ms) et par le vent ressenti (vent du monde + vent de course), exprimés dans le repère de la tête.
  Ressort à ≈ 2 oscillations par seconde, amortissement 0,32, sous-pas fixes de 1/240 s ; cible saturée
  en douceur sous les butées (couronne −0,30 / +0,32 rad, roulis 0,26 ; arrière −0,16 / +0,40, roulis
  0,24), butées souples, angles de l'os bornés. Aux butées, les pointes restent à 12 % hors du crâne et
  4 % hors de la calotte (`tests/cheveux.test.js`).
- **En jeu** (`captures/physique-courbe.png`) : départ, couronne en arrière (−0,25) ; course, couchée de
  0,15 en moyenne, rebond de ± 0,08 à la foulée ; appel, en arrière ; chute libre, couronne redressée et
  arrière qui flotte jusqu'à sa butée ; réception, tout se couche (−0,30) ; arrêt brusque, la couronne
  part en avant (+0,22), rebondit une fois et se pose en moins d'une seconde ; roulade, couronne plaquée
  (−0,27), arrière projeté vers le haut.

Règles communes : `docs/DA.md`.

## Écarts restants

- La coupe grandit le personnage : 1,48 → 1,67 m hors tout (pics de la couronne) ; voulu, la
  silhouette en pics se lit à 15 m.
- 8 543 triangles pour l'avatar par défaut (+ 600 par rapport au carré), au plus 8 855 selon la tenue :
  sous le budget de 9 000, avec peu de marge pour un futur accessoire de tête.
- Pics de la même famille de couleur que la calotte : sous un ciel couvert, la couronne se lit surtout
  par sa silhouette.

## Historique

- 18/10/2026 : fiche créée.
- 21/10/2026 : six coupes remplacées par une seule coupe en pics (PER-026) ; PER-002 à PER-007 retirées ;
  anciennes sauvegardes migrées (`captures/pics-v7-*.png`).
- 21/10/2026 : physique des pics (inertie du crâne et vent ressenti, ressorts amortis bornés) ;
  `captures/physique-*.png`, courbe `captures/physique-courbe.png`.
