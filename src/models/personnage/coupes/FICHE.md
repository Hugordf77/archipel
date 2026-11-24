# Coupes — PER-026 (PER-002 à PER-007 retirées)

Dossier `src/models/personnage/coupes/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-026 | Coupe : En pics | Validé | `hair:pics` | 0,68 × 1,68 × 0,62 | 9 500 (avatar, 21/11/2026) |
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
- **Mèches en lame** (21/11/2026, `lame`, `LAME`) : tube `limb` tracé sur l'axe droit de la mèche, puis
  chaque sommet déformé dans le repère de la mèche (t = y / L) : x' = x + curl(t), z' = z · ép(t) +
  bend(t), normales recalculées ; `mechePoint` suit la même formule. Largeur [0,95, 1, 0,9, 0,6, 0] de la
  demi-largeur aux points [0, 0,3, 0,55, 0,8, 1] de l'axe (`AXE`, `largeur`) : bout en ogive convexe (revue
  du 21/11/2026 ; avant, [0,95, 1, 0,62, 0] aux tiers, pointe en chevron droit), pointe nulle (bout ouvert
  mais fermé) ; épaisseur `flat` × (1,4 → 0,7) : racine épaisse, lame vers la pointe ; deux sommets de la
  section sur les tranchants ; courbe en S latérale (pointe décalée de 8 % de la longueur, dans le sens de
  la vrille ; 11e champ facultatif) ; arc dans l'épaisseur inchangé (−bend · L · t²). 6 côtés × 6 anneaux :
  72 triangles par mèche ; épi à 8 côtés (96), vu dans son axe. Pied enfoncé de 3 à 4,5 cm dans la calotte.
- **Zones** (`MECHES`, `ZONES`) :
  - frange (os `HAIR_D`, depuis le 21/11/2026 ; avant, os de la tête) : cinq grosses mèches couchées, pointes aux sourcils, celle du milieu
    entre les yeux ; deux mèches dressées au-dessus ;
  - côtés (os `HAIR_C`) : deux mèches couchées par côté (tempe, derrière l'oreille) et une
    dressée au-dessus de l'oreille, qui en couvre le haut (le bas de l'oreille reste visible) ;
  - nuque (os `HAIR_B`) : quatre mèches foncées qui descendent sur le col, trois dressées pour
    le volume de dos ;
  - dessus (os `HAIR_A`) : six pics dressés autour du sommet, pointes qui rebiquent ;
  - épi (os `HAIR_A`) : trois pics plus hauts au sommet.
- **Encre** (5 identifiants pour tout le personnage) : calotte et masse de nuque `hair`, aucune mèche
  `head` (crâne, visage) ; rang du bas : frange limb / trim alternés, la mèche entre les yeux `body`,
  côtés limb ou trim (jamais `body`, les oreilles), nuque body / hair au milieu (sur le cou `limb` et le
  col `trim`), trim / hair au bord ; rangs dressés : un identifiant qu'aucune mèche touchée n'a, `hair`
  seulement pour les pics du dos (21/11/2026 : la mèche dressée du milieu de la nuque passe en `limb` et
  le pic du dessus à 2,1 rad en `hair`, le pied plus large des lames les mettant au contact de leurs
  voisines). Deux mèches qui se touchent (axes à moins de 1,5 fois la somme des rayons : 44 paires) n'ont
  jamais le même identifiant (`tests/cheveux.test.js`).
- **Crâne caché** : `sousCalotte(p)` dit si un point est toujours sous la calotte (à sa taille sous le bob)
  ou la masse de la nuque ; le crâne (`../tete.js`, `craneGeometry`) y retire ses triangles.
- **Avec le bob** : seules les mèches couchées restent (ni dressées, ni dessus, ni épi), calotte à 95 % :
  rien ne traverse le chapeau.
- **Couleurs** : celle du miroir (`HAIR_COLORS`, brun `#5a3d36` par défaut) ; mèches de la nuque et
  derrière l'oreille, masse de nuque à 86 %.
- **Physique** (`entities/character/cheveux.js`, `Character.js`, 21/11/2026) : quatre pendules bornés fixés à
  la tête, poussés par l'inertie du crâne et le vent ressenti (vent du monde en m/s : brise de 4 m/s par
  temps calme, `VENT`, plus les rafales, la tempête, le vent de course ou de vol), chacun à ses réglages
  (`GROUPES`) avec une poussée filtrée (les pointes suivent après les racines : retard 0 à 50 ms) et un
  battement au vent, à sa fréquence et sa phase :
  - dessus et épi (`HAIR_A`, pivot HC + 0,2, z −0,07) : raides (k 190) ; butées −0,24 / +0,18 rad,
    roulis 0,32 (0,16 avant, ouvert pour le vent : pointes à 21 % hors du crâne) ;
  - nuque (`HAIR_B`, pivot HC + 0,06, z −0,06) : lourde (k 120, bien amortie, vent × 0,8) ; −0,06 / +0,3,
    roulis 0,3 (0,1 avant ; pointes à 9 % hors du crâne) ;
  - côtés (`HAIR_C`, pivot HC + 0,16, z −0,03) : −0,1 / +0,15, roulis 0,06 (les oreilles) ;
  - frange (`HAIR_D`, os ajouté le 21/11/2026, pivot HC + 0,15, z 0,07 ; direction et levier tirés des
    mèches : (0 ; −0,61 ; 0,79), 0,156 m) : légère et vive (k 105, vent × 4,5) ; se soulève jusqu'à
    −0,4 rad, ne se plaque jamais contre le front (butée 0) ; roulis jusqu'à 0,14, permis seulement en
    proportion du soulèvement (`zLeve` 0,5) ; pas de vrille (ses pointes entreraient dans le front).
  Vrille ± 0,15 (frange 0). Aux butées : pointes et deux tiers des mèches à 8,1 % hors du crâne, 43,5 % hors
  des oreilles, 22 % hors de la calotte ; frange jamais dans le front (1,005, comme au repos). Personnage
  qu'on fait tourner sur place (sans vent) : résidu 0,012 rad après 2 s. Écart de mouvement entre 30, 60
  et 144 images par seconde et 240 : 0,003 rad au plus. Mesures à 60 i/s (`stepHair`, gestes de
  `tests/cheveux.test.js`) :

  | Geste | Groupe | Angle maxi (rad) | Retour au calme (s) |
  | --- | --- | --- | --- |
  | départ de course | dessus, épi | 0.187 | 0,52 |
  | départ de course | nuque | 0.170 | 0,63 |
  | départ de course | côtés | 0.150 | 0,35 |
  | départ de course | frange | 0.000 | 0,02 |
  | arrêt brusque | dessus, épi | 0.180 | 0,70 |
  | arrêt brusque | nuque | 0.067 | 0,60 |
  | arrêt brusque | côtés | 0.142 | 0,73 |
  | arrêt brusque | frange | 0.290 | 0,98 |
  | saut | dessus, épi | 0.198 | 0,73 |
  | saut | nuque | 0.281 | 0,65 |
  | saut | côtés | 0.065 | 0,57 |
  | saut | frange | 0.396 | 0,80 |
  | roulade | dessus, épi | 0.240 | 0,62 |
  | roulade | nuque | 0.300 | 0,82 |
  | roulade | côtés | 0.150 | 0,73 |
  | roulade | frange | 0.400 | 1,00 |
  | demi-tour sur place | dessus, épi | 0.150 | 0,67 |
  | demi-tour sur place | nuque | 0.150 | 0,57 |
  | demi-tour sur place | côtés | 0.150 | 0,73 |
  | demi-tour sur place | frange | 0.000 | 0,02 |

Règles communes : `docs/DA.md`.

## Écarts restants

- Planche : implantation encore en oursin (29 lames qui rayonnent du sommet, sans épi ni raie) ; taches
  ovales des pieds des mèches dressées sur la calotte ; frange en cinq lames régulières (lot 2 à venir).
- Vue de profil, la tempe devant l'oreille est moins couverte que sur la planche.
- La barrette (PER-021) est petite à côté de la nouvelle masse et à moitié prise dans les mèches.
- Triangles (21/11/2026) : cheveux 2 504 (calotte 224, nuque 120, mèches 2 160) ; personnage 9 137 par
  défaut, pire cas 9 321 (PER-022) ; budget propre des fiches de l'avatar 9 500 (`../fiche.js`,
  `BUDGET_PERSO`, accordé par l'utilisateur le 21/11/2026).
- La frange vue de face garde des aplats cernés d'encre (identifiants alternés), plus ronds qu'avant.
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
- 21/11/2026 : mèches en lame (racine épaisse, pointe nulle, courbe en S ; 60 triangles par mèche, −504
  pour la coupe), deux identifiants de contour changés ; `sousCalotte` pour le crâne caché. Captures
  `captures/cheveux-avant-*`, `captures/cheveux-lot1-planche-vues.png`.
- 21/11/2026 : frange sur son os à ressort (`HAIR_D`) ; réglages par groupe, retard, battement, vent du monde
  en m/s ; roulis du dessus et de la nuque ouverts ; `sature` corrigé pour une butée nulle (NaN).
  Captures `captures/vent-cheveux-planche.png`.
- 21/11/2026 : revue Evis-critique, 3e défaut : lames au bout en ogive (6 anneaux, 72 triangles), épi à
  8 côtés ; budget de l'avatar porté à 9 500. Captures `captures/ogive-planche.png`.
