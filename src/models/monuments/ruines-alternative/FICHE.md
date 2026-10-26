# Nef effondrée du plateau — MON-014

Dossier `src/models/monuments/ruines-alternative/` · Monuments · ruine alternative à la grande ruine
MON-012, d'après la planche de l'utilisateur (`reference.png`, copie de
`production/references/ruines-plateau.png`, 1 312 × 1 199) : même style et même palette, autre
composition, lisible comme un autre lieu.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| MON-014 | Nef effondrée du plateau | Validé par Evis-critique (2e tour, 26/10/2026) | `part:ruines_alternative` | 10,17 × 8,78 × 14,41 | 8 000 de près, 4 000 allégé (fiche) |

Budget propre au modèle (`budget: { triangles: 8000, lod: 4000 }` dans la fiche du registre) : accord
de l'utilisateur le 26/10/2026, au-dessus des 4 000 de la catégorie, comme MON-012.

## DA retenue

- **Composition choisie par l'utilisateur** (composition A sur trois proposées) : nef de chapelle
  effondrée avec colonnade, ouverte au ciel, axe le long de Z, entrée vers +Z, chevet vers −Z.
  Silhouette longue et rythmée (14 m de long), à l'opposé de la façade compacte de MON-012.
- **Dallage surélevé** (0,9 m, d'une assise) : grandes dalles traversantes au milieu, joint en long à
  0,15 m de l'axe, bordure de pavés de 0,5 m sous les colonnes ; **deux marches** d'entrée de 0,3 m
  (giron 0,45 m, 3,2 m de large), puis le bord du dallage.
- **Colonnade** : deux rangées de quatre colonnes à chapiteau (x ±2,55, tous les 2,4 m, fût de 0,24 m,
  4,2 m au-dessus du dallage) : base moulurée, fût tourné, corbeille à quatre feuilles d'acanthe,
  tailloir. Brisées : à gauche la dernière (1,5 m), à droite la deuxième (2,3 m) et la troisième
  (0,8 m), cassure en biseau au sommet.
- **Arcade** de deux arcs brisés (ouverture 1,72 m, claveaux de 0,3 m) qui court encore sur les trois
  premières colonnes de gauche, mur de 0,58 m en gradins jusqu'à 7,5 m.
- **Chevet** plein, du sol, 7,8 m de large et 0,9 m d'épaisseur, pignon brisé en gradins jusqu'à
  8,5 m, plus haut à gauche ; **grande baie haute à meneau** (1,7 m d'ouverture, naissance à 4,7 m,
  pierre d'appui) ; **contrefort à degrés** derrière l'angle gauche (3,4 m puis 1,95 m).
- **Façade d'entrée** réduite à deux moignons posés sur le dallage, sans le dépasser : à gauche jusqu'à 5,1 m avec les deux
  premiers claveaux du **portail ogival effondré** (3,2 m d'ouverture), à droite jusqu'à 2,6 m.
- **Bannière** bleu ardoise `#3d6f90` au blason crème, pendue côté nef au chevet, à gauche de la baie,
  sur une perche ocre `#cda066` : vue dans l'axe depuis l'entrée. Toile au vent (`aSway`).
- **Ruines au sol** : deux tambours de colonnes tombés (un au sol à droite, un sur la bordure du
  dallage entre deux colonnes, hors du passage), un chapiteau tombé, sept éboulis.
- **Végétation** : mousse sur les sommets (vert clair `#aab35c`, vert mousse `#7f9b55`), lierre qui
  retombe du chevet, de la façade, de l'arcade le long des colonnes et sur la colonne isolée à l'avant
  droit, six touffes de fougères (feuilles libres à deux faces).
- **Pierre** : blocs irréguliers aux arêtes douces (hexaèdre chanfreiné, un identifiant de contour par
  bloc), palette de la planche (`#ddcfb8`, `#d4c8b1`, `#c9c3b6`, `#b9b7af`), aucun noir. Un joint tombe
  sur chaque marche des gradins (aucun bloc ne surplombe le vide).
- **Formes partagées** : `forme.js` du dossier, reprise des éléments modulaires des ruines (MON-013,
  `ruines-modules/forme.js`, non commités à la création de ce modèle), avec ces ajouts : arc brisé
  partiel (`garde`), colonne brisée, tambour couché, touffe de fougère, joint forcé aux marches des
  gradins.
- **Version allégée** (variante 1, `v: 1`, « Allégé (au loin) ») : mêmes volumes ; blocs sans chanfrein,
  fûts à 6 côtés, sans feuilles d'acanthe, lierre plus clairsemé, fougères à 3 feuilles, bannière à
  maillage réduit.
- Type de lieu `ruines_alternative` (`src/models/lieux.js`), rangé en DIRZ : l'axe de la nef (+Z,
  l'entrée) regarde l'angle `rot`.

## Physique

`physique.js` (données pures, plan de la ruine partagé avec le constructeur) :

- obstacles : deux rangées de cercles sur les faces du chevet (r 0,2), de la façade hors du portail
  (r 0,26) et du contrefort ; une rangée sur la bordure de pavés de chaque côté du dallage (r 0,32) ;
  un cercle de 0,42 m par colonne ; tambours, chapiteau et éboulis ;
- passages libres : nef de 4,26 m entre les cercles des colonnes, portail de 3,22 m, escalier sans
  obstacle ;
- planchers : les deux marches et le dallage de la nef (9,9 × 6,3 m à 0,9 m).

## Mesures (26/10/2026, après le 1er tour de revue)

`node scripts/modeles/mesure.mjs MON-014 --json` : aucune règle en échec.

| Mesure | Valeur | Seuil/règle | ok |
| --- | --- | --- | --- |
| Triangles | 7 860 de près · 3 760 allégé (mesure par variante) | ≤ 8 000 / 4 000 (fiche) | oui |
| Gabarit (L × H × P) | 10,17 × 8,78 × 14,41 m | ± 25 % du registre | oui |
| Couleurs | aucun noir | jamais de noir pur | oui |
| Physique / forme | 178 obstacles : 87 % de l'emprise couverte, débord 0,4 m | ≥ 85 %, ≤ 0,4 m | oui |
| Plancher (2 marches, 3,14 m de large) | à 0,8 cm du dessus des blocs | ± 5 cm | oui |
| Plancher (dallage) | 9,9 × 6,3 m à 0,7 cm | ± 5 cm | oui |
| Facettes | aucune primitive sous le seuil | indicatif (vu de loin) | — |

`mesure.mjs` ne donne pas les triangles de la variante allégée d'un lieu (seulement le maximum des
variantes) : 3 760 relevés en construisant `ruinesAlternative({ v: 1 })`.

## Écarts restants

- Végétation plus clairsemée que sur la planche (buissons, herbe haute) : le budget passe d'abord
  dans la pierre ; l'herbe du jeu habille le pied de la ruine.
- La part de l'emprise non couverte (13 %) est surtout l'escalier (aucun obstacle voulu) et les
  pointes des fougères.
- `forme.js` double le code des éléments modulaires (MON-013) : à fusionner quand MON-013 sera commité.

## Captures (26/10/2026, catalogue, rendu « jeu »)

- `captures/mon014-ruines-alternative-vues.png` : avant, arrière, gauche, droite, dessus, 3/4 avant ;
- `captures/mon014-ruines-alternative-gros-plans.png` : portail et escalier, arcade, bannière et baie,
  colonnes brisées et tambours ;
- `captures/mon014-ruines-alternative-lod.png` : version allégée (avant, gauche, 3/4) ;
- `captures/mon014-ruines-alternative-reference-vs-modele.png` : planche et modèle.

## Historique

- 26/10/2026 : création (composition A, nef et colonnade, choisie par l'utilisateur), type de lieu
  `ruines_alternative`, budget propre 8 000 / 4 000 accordé par l'utilisateur.
- 26/10/2026 : 1er tour d'Evis-critique (à reprendre) : moignons de la façade ramenés sur le dallage
  (ils le dépassaient de 0,5 m dans le vide), plancher des marches élargi à 3,14 m, largeur libre du
  portail corrigée (3,22 m).
- 26/10/2026 : 2e tour d'Evis-critique : valide, aucun défaut restant.
