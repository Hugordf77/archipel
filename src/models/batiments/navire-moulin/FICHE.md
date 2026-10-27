# Tour-moulin centrale du navire-forteresse — BAT-017

Dossier `src/models/batiments/navire-moulin/` · Bâtiments · pièce de la forteresse-navire du Plateau venté
(`docs/forteresse-navire/memory.md`, §6.4) : version en hauteur du moulin-tour BAT-013, sans ses annexes.
`reference.png` : copie de l'aperçu (199 × 112) de `production/references/forteresse-navire.png`.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-017 | Tour-moulin centrale du navire-forteresse | Validé par Evis-critique (1er tour, 27/10/2026) | `part:navire_moulin` | 13,78 × 20,79 × 9,3 | 9 000 de près, 4 000 allégé (fiche) |

Budget propre (`budget: { triangles: 9000, lod: 4000 }`) : part de la tour-moulin dans les ≈ 60 000
triangles accordés par l'utilisateur le 26/10/2026 pour la forteresse-navire.

## DA retenue

- **Repère** : pied au centre du socle, ailes vers +Z, porte vers −Z. Type de lieu `navire_moulin`
  (`src/models/lieux.js`), rangé en DIRZ : +Z (les ailes) regarde l'angle `rot`.
- **Tour** : socle de pierre de 6,4 m (0,4 m, dalle quadrillée de près) ; quatre étages à colombages en
  tronc de pyramide (6,0 → 5,5 ; 5,44 → 4,98 ; 4,92 → 4,46 ; 4,4 → 3,96 m de côté, de 0,4 à 11 m) qui
  s'affinent sans marche, comme BAT-013 : enduit `#f4e4c6`, poteaux d'angle inclinés, sablières, décharges,
  baies encadrées (deux par face aux deux premiers étages, une au-dessus) ; porte de 1,6 m sur −Z, porte de
  galerie sur +Z.
- **Galerie à garde-corps** au plancher du dernier étage (8,6 m, 6,2 m de côté) : plancher, poteaux
  d'angle, lisses, trois montants et décharges en V par côté, trois consoles par côté.
- **Cou et tête** : cou en tronc (3,96 → 3,0 m, de 11,1 à 12,6 m) ; tête de 3,1 × 7,2 m (12,6 → 14,5 m,
  faîtage 15,5 m) en enduit et pans de bois comme BAT-013 (trois fenêtres par flanc, une à l'arrière),
  débordant à l'avant (+3 m) sous un **capot** en demi-couronne autour du moyeu et loin à l'arrière (−4,2 m)
  sur deux jambes de force, sous un **toit cintré** `#c98a52`.
- **Ailes** : quatre bras en croix de 8 m, longeron, toile crème en trapèze (0,75 → 1,7 m) décalée sur le
  côté du longeron, rive, trois lattes ; pièce animée
  `anim: [{ pivot: [0, 13,9, 3,7], axis: 'z', speed: 0.6, wind: true }]`.
- **Sur le pont** (y = 20 m) : faîtage à 35,5 m, moyeu à 33,9 m, bout des ailes à 41,9 m (visés ≈ 36, 34
  et 42 en §3 et §6.4). Les ailes tournent dans le plan z ≈ 3,9 à 4,1 m, devant le capot (z ≤ 3,06) et la
  galerie (z ≤ 3,17) ; bas du disque à y = 5,9 m.
- Couleurs fixes (`tint: 0`). Identifiants de contour : murs, bois, toit.
- **Version allégée** (`v: 1`) : une baie par face, une lisse et une console par côté de galerie, pas de
  décharges sur le cou, une fenêtre par flanc de tête, arcs à 8 et 6 segments, ailes sans rive ni lattes,
  sections carrées.

## Physique (`physique.js`)

- Constantes de forme (`SOCLE`, `ETAGES`, `GALERIE`, `COU`, `TETE`, `MOYEU`, `R_AILE`).
- **Neuf cercles** au lieu des « un au centre, quatre aux angles » de memory.md §6.4 : un central de 2,7 m,
  quatre aux angles et quatre au milieu des faces, de 1,12 m, centrés à 0,9 m du bord du socle. Avec cinq
  cercles, aucun réglage ne tient à la fois 85 % de l'emprise et un débord ≤ 0,4 m (83 % ou 0,45 m : les
  grandes faces n'ont de sommets qu'aux coins).
- Effet connu (calcul d'Evis-critique avec la règle `obstacleAt(r × 0,9)` du jeu) : entre deux cercles d'une
  face, le centre du joueur peut arriver en (± 1,15 ; 3,09), son corps entre alors de 0,21 m dans le mur du
  rez et de 0,41 m dans la plinthe du socle (0,4 m de haut). Ajouter des cercles n'y change rien, les
  rapprocher du mur dépasse le débord permis. Du même ordre que les approximations de BAT-013.
- Aucun plancher : intérieur non visitable.

## Mesures

`node scripts/modeles/mesure.mjs BAT-017 --json` (27/10/2026) : **aucune règle en échec** ; triangles 6 056
de près (tour 5 592 + ailes 464), 2 328 allégé (2 160 + 168) ; gabarit 13,78 × 20,79 × 9,3 m ; aucun noir ;
aucune primitive sous le seuil ; physique 9 obstacles, 86 % de l'emprise couverte, débord 0,38 m.

## Écarts restants et notes pour la pose (E8)

- **Disque des ailes** : à la pose de la variante du montage, il peut toucher la maison 5 ; à vérifier en E8.
- **Vent** : les ailes regardent +Z ; à accorder avec le vent commun à prévoir pour la flamme (BAT-016) et la
  fumée (BAT-015).
- Tête en enduit et pans de bois (DA de BAT-013), et non « de bois » au sens strict de §6.4.
- Faces à l'ombre lavande (`uShadowTint`), comme BAT-013.
- Pas de capture en jeu : la pièce sera posée en E8.

## Captures (27/10/2026, catalogue)

- `captures/navire-moulin-6vues.png`, `captures/navire-moulin-allege-6vues.png`
- `captures/navire-moulin-gros-plans.png` : porte et socle, galerie et consoles, capot et moyeu, tête de
  l'arrière, aile (toile, lattes, rive), allégé.

## Historique

- 27/10/2026 : création (forteresse-navire, étape E5). Physique réglée avant revue (neuf cercles).
  1er tour d'Evis-critique : **valide**, sans défaut.
