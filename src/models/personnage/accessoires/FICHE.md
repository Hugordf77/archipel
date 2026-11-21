# Accessoires — PER-020 à PER-023

Dossier `src/models/personnage/accessoires/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-020 | Bob | Validé | `piece:bob` | 0,79 × 1,51 × 0,77 | — |
| PER-021 | Barrette | Validé | `piece:barrette` | 0,67 × 1,48 × 0,69 | — |
| PER-022 | Lunettes rondes | Validé | `piece:lunettes` | 0,67 × 1,48 × 0,72 | — |
| PER-023 | Sac à dos (emplacement « dos ») | Validé | `piece:sac` | 0,67 × 1,48 × 0,69 | — |

## DA retenue

Géométrie dessinée avec le corps (`../corps/index.js` pour le gabarit héros, `../corps/chibi.js` pour le
chibi). Sur le héros (02/11/2026) :

- **Bob, barrette** : dessinés pour le crâne chibi, mis à l'échelle de la tête (`TETE_K`), calés sur la
  calotte de la coupe (`onCap`). Avec la coupe volumineuse (03/11/2026), le bob ne garde que les mèches
  couchées (rien ne le traverse) ; la barrette est posée sur les mèches au-dessus de la tempe droite.
- **Lunettes** : verres sur une sphère un peu plus grande que le crâne, branches du bord extérieur du
  verre jusqu'au-dessus de l'oreille, toutes les positions calculées depuis `FACE` (plus de 0,152 /
  0,302 en dur).
- **Sac à dos** (03/11/2026, personnage 2.0 étape 5 ; emplacement « dos », porté par défaut avec l'écharpe,
  orange brique `#e07a4f`, `CLOTH_COLORS` indice 11) : sur son os à ressort `BAG` (pivot au haut du sac),
  porté haut (le haut à 1,025 m de dessin, sous l'anneau de l'écharpe, vers les omoplates ; le bas sur la
  ceinture), plaqué au dos et penché comme lui (0,08 rad) ; corps en coussin (superellipsoïde `boule`,
  26 × 24 × 13,6 cm de dessin, exposant 0,45 : flancs plats, coins ronds, rien d'anguleux), poche avant
  dans la moitié basse avec son rabat au bord libre décollé et une boucle de laiton `#f2c14e` ; bretelles
  en rubans plats sur le torse, du haut du sac (enfouies dedans) par-dessus l'épaule, sous les bretelles
  de la salopette (moins décollées) puis sous l'anneau de l'écharpe, jusque sous le bras. Il rebondit un
  peu (ressort `SAC` de `cheveux.js`, `DYN_SAC` : bascule de −0,03 à +0,08 rad, roulis ±0,04 rad,
  rebond vertical ±1,4 cm de dessin) à la foulée et à la réception. 380 triangles (corps, poche, rabat,
  boucle 200, bretelles 180) ; avec lui, les bretelles de la salopette s'arrêtent sous le sac (−96).
  Chibi : il ne porte qu'une pièce ; le sac au dos lui est passé comme accessoire s'il n'en a pas d'autre
  (`buildAvatarGeometry`), sa géométrie ne change pas.
- **Épée de dos avec le sac** (`GABARIT.epeeSac`, sur l'os `BAG` : elle rebondit avec lui) : debout sur la
  droite du sac (x −0,10 de dessin), à plat sur sa face arrière, tournée de −0,9 rad (la garde ne dépasse
  presque plus de l'épaule, de face), garde au-dessus du sac ; la poche est décalée de 1,2 cm à gauche.
  Sans sac : `GABARIT.epee`, sur le torse, comme avant. Les mains qui balancent n'y vont pas.

Règles communes : `docs/DA.md`.

## Écarts restants

- Tailles du registre périmées (héros : 0,49 × 1,65 à 1,72 × 0,44 à 0,47 m).
- Triangles (`mesure.mjs`, 03/11/2026, étape 5, sac au dos dans tous les cas) : bob 7 664, barrette
  8 644, lunettes 8 872 (pire cas du personnage), sac 8 688 (look par défaut) ; budget 9 000.
- La barrette est petite à côté de la nouvelle masse de cheveux et à moitié prise dans les mèches.
- Sac : pas de poignée sur le dessus, pas de poches latérales ni de sangle verticale sur la poche
  (planche) ; le dessous et l'arrière sont à 8 côtés (facettes discrètes de près).
- Épée sur le sac : elle couvre le tiers droit du sac ; la garde (0,20 m, pièce de `Character.js`) dépasse
  encore un peu derrière l'épaule droite vue de face.
- Le bras qui balance loin en arrière peut frôler le flanc du sac (non testé : seuls torse, sac, tête et
  bras au repos le sont, `tests/echarpe-sac.test.js`).

## Historique

- 18/10/2026 : fiche créée.
- 02/11/2026 : accessoires ajustés au gabarit héros (`captures/p2-e1-<accessoire>-6vues.png`).
- 03/11/2026 : bob et barrette suivent la coupe volumineuse (personnage 2.0, étape 4).
- 03/11/2026 : sac à dos refait au dos (étape 5) : os à ressort `BAG`, coussin, poche à rabat, boucle de
  laiton, bretelles sous celles de la salopette ; épée posée sur le sac (`GABARIT.epeeSac`) ; rendu
  logiciel hors jeu (repos, course, saut) ; captures en jeu à faire.
