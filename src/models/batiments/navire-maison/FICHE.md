# Maison de pont du navire-forteresse — BAT-015

Dossier `src/models/batiments/navire-maison/` · Bâtiments · pièce de la forteresse-navire du Plateau venté
(`docs/forteresse-navire/memory.md`, §6.2), dans la DA du moulin-tour BAT-013. `reference.png` : copie de
l'aperçu (199 × 112) de `production/references/forteresse-navire.png` (pleine taille pas encore déposée).

| Identifiant | Nom | Statut | Référence du jeu | Taille (m, forme 0) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-015 | Maison de pont du navire-forteresse | Validé par Evis-critique (2e tour, 27/10/2026) | `part:navire_maison` | 9,84 × 12,52 × 8,82 | 3 500 de près, 1 500 allégé, par forme (fiche) |

Budget propre (`budget: { triangles: 3500, lod: 1500 }`) : part des maisons dans les ≈ 60 000 triangles
accordés par l'utilisateur le 26/10/2026 pour la forteresse-navire.

## DA retenue

- **Repère** : pied au centre de l'emprise, façade et porte vers +Z (la rue). Type de lieu `navire_maison`
  (`src/models/lieux.js`), rangé en DIRZ : +Z regarde l'angle `rot`.
- **Commun aux trois formes** : socle de pierre arrondi (0,3 m, dalle quadrillée dessus de près, comme
  BAT-013) ; rez de bois en bordages de ≈ 0,5 m (`#b8875a` / `#a3774f`) ; étages à colombages (enduit
  `#f4e4c6`, poutres `#c07a45` / `#a5653b` : sablière, poteaux de baie, décharges) en encorbellement sur la
  façade et le dos, portés par des consoles ; poteaux d'angle chanfreinés ; sablières entre niveaux ;
  fenêtres à croisillons (cadre, vitre, appui) ; porte de planches de 1,6 m sur la rue.
- **Forme 0, grande à pignon** (9 × 7 m) : rez de bois, un étage à colombages (encorbellement 0,25 m),
  combles sous un toit de mousse à deux pans épais (`#a9bf6c` / `#bdd07f`), pignon sur rue (faîtage le long
  de Z, à 10,5 m) avec poinçon et contrefiches ; oriel vitré sur deux consoles au milieu de la façade de
  l'étage ; fenêtre des combles ; cheminée de briques crème sur le pan +X, 1,5 m au-dessus du toit.
- **Forme 1, étroite et haute** (5 × 5 m) : rez de bois, deux étages à colombages (encorbellement 0,2 m),
  balcon de bois au 2e (plancher sur trois consoles, balustres, lisse) devant une porte-fenêtre ; toit
  pointu d'ardoise `#3d6f90` (pyramide à ≈ 62°, faîtage à 13,5 m, débord 0,3 m) sur un larmier, arêtiers
  `#355f7c`, épi de bois.
- **Forme 2, basse à appentis** (7 × 4 m) : rez de bois seul ; toit de mousse d'une seule pente, haut sur
  le dos (4,6 m, adossé) et bas sur la façade ; dos rehaussé et joues triangulaires en bordages ; petite
  cheminée.
- **Fumée** : grappe de bouffées `#f4f1ea` aplaties (échelle y 0,8) et soudées, la première assise dans le
  chapeau de la cheminée, qui dérivent vers le dos de la maison (−Z local) ; 4 bouffées de près, 2 au
  loin ; léger balancement au vent (`sway` 0,6). Animation reportée (memory.md §6.2 : « plus tard »).
- Couleurs fixes (`tint: 0`). Identifiants de contour : murs, bois, toit, fumée.
- **Version allégée** (`v: 1`) : mêmes volumes ; bordages du rez de 1 m, sans croisillons, appuis,
  sablières basses ni pans de bois des pignons, sections carrées, socle sans dalle, balcon à balustres
  espacés, 2 bouffées.
- Lecture de la fiche de memory.md §6.2 : les niveaux se comptent **rez compris**. Forme 0 « 2 étages +
  combles » = rez + 1 étage + combles (faîtage 10,5 m) ; forme 1 « 3 étages » = rez + 2 étages.

## Physique (`physique.js`)

- `FORMES` (dimensions, niveaux, encorbellement, faîtage) et `forme(p)` ; obstacles : grille de cercles de
  1,2 m sur l'emprise du rez (centres à 0,92 m des murs, espacés de 1,7 m au plus), plus un cercle de
  0,55 m à chaque coin du socle. Aucun plancher : intérieur non visitable.
- `mesure.mjs` ne mesure la physique que de la forme par défaut (0) ; les trois formes ont été mesurées
  avec les mêmes règles (`mesure-formes.mjs` du scratchpad de la session E3) :

| Forme | Triangles près / allégé | Obstacles | Emprise couverte | Débord | Taille (m) |
| --- | --- | --- | --- | --- | --- |
| 0 | 3 144 / 1 248 | 34 | 98 % | 0,36 m | 9,84 × 12,52 × 8,82 |
| 1 | 2 506 / 1 142 | 13 | 95 % | 0,33 m | 5,80 × 14,55 × 6,70 |
| 2 | 1 504 / 568 | 19 | 98 % | 0,35 m | 7,50 × 7,83 × 5,49 |

## Mesures

`node scripts/modeles/mesure.mjs BAT-015 --json` (27/10/2026) : **aucune règle en échec** ; triangles
3 144 au plus (forme 0) pour un budget de 3 500 ; gabarit 9,84 × 12,52 × 8,82 m ; aucun noir ; aucune
primitive sous le seuil ; physique 34 obstacles, 98 % de l'emprise couverte, débord 0,36 m.

## Écarts restants et notes pour la pose (E8)

- **Fumée** : sa dérive suit la maison (−Z local) ; deux maisons face à face fument en sens opposés. À la
  pose, choisir l'orientation des maisons ou ajouter un paramètre de vent commun (recommandation
  d'Evis-critique). Grappe un peu régulière (« chenille ») : décalage latéral et dérive croissante possibles
  sans coût.
- **Faces aveugles** : dos de la forme 2 (adossée, rehausse en pan uni) et dos du rez de la forme 1 : à
  tourner vers un voisin à la pose.
- **Rues** : les cercles débordent de 0,28 à 0,36 m, ce qui retire ≈ 0,6 à 0,7 m à chaque rue entre deux
  maisons ; une rue visible de 2,2 m n'en laisse que ≈ 1,5 m de libre. Aucun cercle ne doit sortir de
  l'emprise du pont (ils bloquent à toutes les hauteurs : memory.md, note E2 de §6.1).
- Faces à l'ombre lavande (`uShadowTint`), comme BAT-013 ; `warmShadow` demande l'accord de l'utilisateur.
- Pas de capture en jeu : la pièce sera posée en E8.

## Captures (27/10/2026, catalogue)

- `captures/navire-maison-{0,1,2}-6vues.png`, `captures/navire-maison-{0,1,2}-allege-6vues.png`
- `captures/navire-maison-gros-plans.png` : porte et rez à hauteur d'homme, oriel et consoles, cheminée et
  fumée, toit pointu et balcon, fumée allégée, porte de la forme 2.

## Historique

- 27/10/2026 : création (forteresse-navire, étape E3). 1er tour d'Evis-critique « à reprendre » : fumée en
  bonhomme de neige qui ne touche pas la cheminée, toit « pointu » de la forme 1 en chapeau plat. Corrigé :
  grappe de bouffées soudées, assises et dérivantes ; faîtage de la forme 1 de 11,6 à 13,5 m, débord de
  0,45 à 0,3 m. 2e tour : **valide**.
