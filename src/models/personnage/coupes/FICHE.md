# Coupes — PER-026 (PER-002 à PER-007 retirées)

Dossier `src/models/personnage/coupes/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-026 | Coupe : En pics | Validé | `hair:pics` | 0,68 × 1,68 × 0,62 | 9 000 (personnage) |
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

Gabarit aventurier (personnage 2.0, planches `docs/personnage-2/references/`, 03/11/2026) ; le chibi garde
la coupe du 02/11/2026, déplacée telle quelle dans `chibi.js` (géométrie et mouvement identiques, vérifiés
par empreinte).

- **Masse volumineuse et ébouriffée** : une calotte ronde plus large et plus haute que le crâne (ellipsoïde
  0,222 × 0,2 × 0,225 m, centre 7,5 cm au-dessus et 5,5 cm derrière celui du crâne, 14 × 9 segments),
  qui laisse le front sous la frange et les oreilles sous les mèches de côté ; une masse de nuque
  (10 × 7, foncée) qui couvre l'arrière du crâne jusqu'au cou ; **29 mèches épaisses** en trois rangs
  qui rayonnent depuis le sommet, de longueurs et de sens inégaux. Largeur, pointes comprises,
  0,68 m = 1,68 × le crâne (masse ≈ 1,35 ×) ; sommet des pics à HC + 0,375 (1,675 m).
- **Mèches** : tubes `limb` effilés à bout rond, aplatis en feuille, pied enfoncé de 3 à 4,5 cm dans la
  calotte. Couchées : épaisseur 0,62 de la largeur, profil 0,9 / 1 / 0,8 / 0,18 ; dressées : 0,66,
  profil 0,82 / 1 / 0,72 / 0,16 (avant le 03/11 : 0,5 et une pointe à 0,1, mèches deux fois plus minces).
  Demi-largeurs 3,6 à 6,6 cm.
- **Zones** (`MECHES`, `ZONES`) :
  - frange (os `HEAD`, 8 côtés) : cinq grosses mèches couchées, pointes aux sourcils, celle du milieu
    entre les yeux ; deux mèches dressées au-dessus ;
  - côtés (os `HAIR_C`, 7 côtés) : deux mèches couchées par côté (tempe, derrière l'oreille) et une
    dressée au-dessus de l'oreille, qui en couvre le haut (le bas de l'oreille reste visible) ;
  - nuque (os `HAIR_B`, 7 côtés) : quatre mèches foncées qui descendent sur le col, trois dressées pour
    le volume de dos ;
  - dessus (os `HAIR_A`, 6 côtés) : six pics dressés autour du sommet, pointes qui rebiquent ;
  - épi (os `HAIR_A`, 7 côtés) : trois pics plus hauts au sommet.
- **Encre** (5 identifiants pour tout le personnage) : calotte et masse de nuque `hair`, aucune mèche
  `head` (crâne, visage) ; rang du bas : frange limb / trim alternés, la mèche entre les yeux `body`,
  côtés limb ou trim (jamais `body`, les oreilles), nuque body / hair au milieu (sur le cou `limb` et le
  col `trim`), trim / hair au bord ; rangs dressés : un identifiant qu'aucune mèche touchée n'a, `hair`
  seulement pour les pics du dos. Deux mèches qui se touchent (axes à moins de 1,5 fois la somme des
  rayons : 43 paires) n'ont jamais le même identifiant (`tests/cheveux.test.js`).
- **Avec le bob** : seules les mèches couchées restent (ni dressées, ni dessus, ni épi), calotte à 95 % :
  rien ne traverse le chapeau.
- **Couleurs** : celle du miroir (`HAIR_COLORS`, brun `#5a3d36` par défaut) ; mèches de la nuque et
  derrière l'oreille, masse de nuque à 86 %.
- **Physique** (`entities/character/cheveux.js`, `Character.hairPush`) : trois pendules raides et bornés
  fixés à la tête, mêmes ressort et poussée (inertie du crâne, vent ressenti), bras de levier 0,13 :
  - dessus et épi (`HAIR_A`, pivot HC + 0,2, z −0,07) : butées −0,24 / +0,18 rad, roulis 0,16 ;
  - nuque (`HAIR_B`, pivot HC + 0,06, z −0,06) : −0,06 / +0,3 (en arrière), roulis 0,1 ;
  - côtés (`HAIR_C`, os ajouté le 03/11/2026, enfant de la tête, pivot HC + 0,16, z −0,03) : −0,1 /
    +0,15, roulis 0,06 ;
  vrille ± 0,15. Aux butées, les pointes et les deux tiers des mèches restent à 5,5 % hors du crâne
  déformé, 39 % hors des oreilles, 24 % hors de la calotte. À la course, nuque et côtés partent en
  arrière ; personnage qu'on fait tourner : résidu 0,032 rad (somme des trois) après 2 s.

Règles communes : `docs/DA.md`.

## Écarts restants

- Planche : les mèches de la planche sont plus nombreuses et plus fines dans le détail (traits peints) ;
  ici 29 volumes pleins. Le dessus de la calotte se voit entre les pics vus d'en haut (taches ovales des
  pieds des pics dressés, lisibles comme des écailles).
- Vue de profil, la tempe devant l'oreille est moins couverte que sur la planche.
- La barrette (PER-021) est petite à côté de la nouvelle masse et à moitié prise dans les mèches.
- Triangles : cheveux 2 588 (calotte 224, nuque 120, mèches 2 244) ; personnage 8 868 par défaut, au plus
  8 960 (gilet).
- Contrôles visuels sur rendu logiciel hors jeu (encre aux changements d'identifiant) ; course, saut,
  rotation sur place, bob et nuit à 15 m à vérifier en jeu.

## Historique

- 18/10/2026 : fiche créée.
- 21/10/2026 : six coupes remplacées par une seule coupe en pics (PER-026) ; PER-002 à PER-007 retirées ;
  anciennes sauvegardes migrées (`captures/pics-v7-*.png`).
- 21/10/2026 : physique des pics (inertie du crâne et vent ressenti, ressorts amortis bornés) ;
  `captures/physique-*.png`, courbe `captures/physique-courbe.png`.
- 21/10/2026 : reprise après Evis-critique (bob traversé, mèches de dos en « autocollants », facettes
  de la frange) et retour de l'utilisateur : la couronne régulière devient un ébouriffé en pics
  (`captures/ebouriffe-final-planche.png`, `captures/physique-eb-*.png`).
- 02/11/2026 : coupe mise à l'échelle de la tête du gabarit (`TETE_K`), levier inchangé ; chibi
  identique ; `tests/cheveux.test.js` vert.
- 03/11/2026 : personnage 2.0, étape 4 : grosse masse ébouriffée des planches (calotte, masse de nuque,
  29 mèches épaisses en trois rangs), os `HAIR_C` des côtés, identifiants de contour alternés et
  vérifiés ; test « tourner sur place » rendu déterministe ; coupe du chibi gardée dans `chibi.js`.
