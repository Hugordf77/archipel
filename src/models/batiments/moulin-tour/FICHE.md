# Moulin-tour du plateau — BAT-013

Dossier `src/models/batiments/moulin-tour/` · Bâtiments · d'après la référence de l'utilisateur
(`reference.png`, copie de `production/references/moulin-tour-plateau.png`, 808 × 632)

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-013 | Moulin-tour du plateau | Brouillon (en attente de revue d'Evis-critique) | `part:moulin_tour` | 8,24 × 15,3 × 9,65 | 8 000 de près, 4 000 allégé (fiche) |

Budget propre au modèle (`budget: { triangles: 8000, lod: 4000 }` dans la fiche du registre) : accordé
par l'utilisateur le 26/10/2026 (TASK-ILE-VERTE-010), au-dessus des 4 000 de la catégorie.

## DA retenue

- **Tour à plan carré, quatre faces détaillées**, sur un socle de pierre arrondi (3 × 3 m, 0,45 m) :
  cinq étages à colombages, chacun en tronc de pyramide (côté au pied → en tête : 2,7 → 2,59 ; 2,53 →
  2,42 ; 2,36 → 2,25 ; 2,19 → 2,09 ; 2,03 → 1,92 m ; tête d'un étage = pied du suivant + 0,06), si bien
  que la silhouette s'affine sans marche jusqu'au cou. Enduit crème `#f4e4c6`, poutres brun-orangé
  `#c07a45` / `#a5653b`. Chaque face porte, inclinée comme le mur (atan((s − t) / 2h)), une sablière
  basse, deux poteaux qui encadrent la baie, des décharges en Λ dans les travées libres et une baie
  encadrée (vitre, cadre biseauté, croisillon, appui) ; poteaux d'angle chanfreinés qui suivent l'arête
  inclinée ; sablières hautes à peine débordantes (côté en tête + 0,12). La face +X du rez, cachée par
  l'annexe, n'a pas de pan de bois ; la face +Z du rez, derrière l'avancée, n'a que des décharges.
- **Galerie à garde-corps** au plancher du dernier étage (7,55 m, comme la galerie de la référence,
  à 83 % de la hauteur du corps) : plancher débordant, poteaux d'angle, lisses haute et basse,
  montant central et décharges en V sur chaque côté, deux consoles par face ; porte de galerie sur +Z.
- **Cou et tête de bois** : le cou prolonge l'affinement (tronc 1,92 → 1,5 m, de 9,1 à 10,42 m),
  poteaux d'angle inclinés, entretoise et décharge sur chaque face. Tête de 1,64 × 4,05 m qui déborde
  à l'avant (+Z, jusqu'à 1,65 m) sous un **capot en demi-couronne** (rayon 0,92 à 1,0 m, centré sur le
  moyeu, sommet à 12,2 m, fermé par un demi-disque crème) et loin à l'arrière (−2,4 m, sur deux jambes
  de force) ; **toit cintré** en arc surbaissé (corde 1,72 m, flèche 0,52 m, 8 segments) de l'arrière
  jusque dans le capot, pignon arrière en segment de disque ; deux fenêtres sur chaque flanc, une à
  l'arrière ; palier et arbre des ailes.
- **Six ailes longues à lattis** (rayon 4,1 m, à 60°) : longeron brun, toile crème (deux tons) en
  trapèze, 0,35 m au pied et 0,85 m au bout, décalée sur le côté du longeron, rive fine (4 cm) sur le
  bord extérieur, deux lattes discrètes en façade (`TOILE_B`) ; moyeu et nez. Pièce animée
  `anim: [{ axis: 'z', speed: 0.7, wind: true }]`, moyeu [0 ; 11,2 ; 2,05], plan des ailes à 0,55 m
  devant la galerie.
- **Avancée à pignon sur la face +Z** (comme à gauche de la tour dans la référence ; x ±0,85, z 1,2 à
  2,25, murs 2,3 m) : porte en façade, une fenêtre sur chaque côté, pignon crème à poinçon et
  contrefiches, petit toit de bois à deux pans et faîtage.
- **Annexe à colombages accolée à la face +X** (x 1,3 à 4,0 ; z ±1,45 ; murs 2,35 m) : porte et
  fenêtre en façade +Z, deux fenêtres au dos, fenêtre au pignon +X (poinçon et contrefiches), toit de
  mousse à deux pans épais et chanfreinés (`#a9bf6c`, `#bdd07f`) avec faîtage en bourrelet.
- **Maisonnette percée d'une arche** (centre [2,1 ; −5,0], 2,2 × 3,4 m, piédroits de 0,45 m) :
  passage voûté traversant le long de X, ouverture de 2,5 m sur 2,45 m sous clé ; piédroits enduits, voûte et tympans d'une seule
  extrusion, archivolte et piédroits de bois aux deux bouts, entrait, pignon crème et poinçon, une
  fenêtre sur chaque long pan, toit de mousse comme l'annexe.
- **Arêtes adoucies** (DA §2) : socles en boîtes arrondies du kit (`bx`), dalles, poteaux et faîtages
  à section chanfreinée, toits de mousse chanfreinés, toit de la tête cintré ; les arêtes des murs sont
  couvertes par les poteaux d'angle et les sablières.
- Couleurs fixes (`tint: 0`) : le type n'est pas recoloré par `recolorPart`. Identifiants de contour :
  murs, bois et toits de mousse séparés (trait d'encre entre enduit et poutres).
- **Version allégée** (variante 1, `v: 1`, « Allégé (au loin) ») : mêmes volumes et même animation ;
  sans croisillons, appuis, sablières basses, lattes ni rives d'ailes, consoles, croix de la galerie,
  poinçons, fenêtres des côtés de l'avancée ; une fenêtre par flanc de tête ; poteaux, dalles et
  faîtages à section carrée, cadres sans tableau, socles en prismes simples, sans dalle quadrillée.
- Type de lieu `moulin_tour` (`src/models/lieux.js`), rangé en DIRZ comme `moulin` : +Z (les ailes)
  regarde l'angle `rot`. Le modèle n'est pas posé sur le plateau (travail du World Designer).

## Mesures (26/10/2026, après la revue d'Evis-critique)

`node scripts/modeles/mesure.mjs BAT-013 --json` : aucune règle en échec, avant comme après.

| Ligne | Avant (1er tour) | Après (2e tour) | Règle | ok |
| --- | --- | --- | --- | --- |
| Triangles | 6 792 fin · budget 8 000 / 4 000 | 7 884 fin · budget 8 000 / 4 000 | ≤ budget | true |
| Gabarit | 8,12 × 15,3 × 9,84 m | 8,24 × 15,3 × 9,65 m (registre relevé) | ± 25 % du registre | true |
| Couleurs | aucun noir | aucun noir | jamais de noir pur | true |
| Physique / forme | 12 obstacles, 88 %, débord 0,35 m | 13 obstacles, 95 %, débord 0,38 m | ≥ 85 %, débord ≤ 0,4 m | true |
| Pièces | 2 maillages | 2 maillages | — | null |
| Facettes | aucune primitive sous le seuil | aucune primitive sous le seuil | vu de loin : indicatif | null |

Triangles par variante (`node scripts/modeles/empreinte.mjs BAT-013`) : 7 884 de près (v 0), 3 814
allégé (v 1) ; au 1er tour, 6 792 et 3 578. `mesure.mjs` ne mesure la version allégée que pour les
espèces (`def.lod`) : pour un lieu, le chiffre allégé vient de l'empreinte.

Critères de TASK-ILE-VERTE-010 contrôlés sur la géométrie construite par `partModel` :

| Critère | Valeur | Attendu |
| --- | --- | --- |
| Hauteur hors tout, ailes comprises | 15,3 m (un bras à la verticale) ; 14,75 m au plus bas de la rotation | 14 à 17 m |
| Sommet du capot de la tête / haut du corps | 12,2 m / 9,10 m | — |
| Rayon des ailes | 4,1 m (envergure 8,2 m) | — |
| Passage de l'arche (entre obstacles) | 2,5 m ; ouverture visible 2,5 m, 2,45 m sous clé | ≥ 2,4 m |
| Obstacles | tour et avancée (4), annexe (3), piédroits (6) | pied de la tour et des annexes |
| Triangles | 7 884 / 3 814 | ≤ 8 000 / ≤ 4 000 |

## Proportions face à la référence

Vue comparable : la référence montre la tour de trois quarts, face +X large (43 px) et face +Z étroite
(24 px) à gauche, d'où un azimut d'environ 29° depuis +X vers +Z ; le modèle est rendu sous cet azimut,
6° d'inclinaison, champ de 14°, soleil venant de +X (la face éclairée dans la référence), capture
`bat013-moulin-tour-reference-vs-modele.png`.

Repères de la référence (pixels de `reference.png`) : pied de la tour y 420 (± 5 : il se perd dans la
falaise), haut du corps (dernière sablière) y 212, faîte de la tête y 142, moyeu (545 ; 158), rayon des
ailes 95 px (bouts vertical haut et bas à 98 et 92 px du moyeu), largeur du corps aux trois quarts de
sa hauteur (y 264) 551 → 618, soit 67 px. Repères du modèle : pied 0 m, haut du corps 9,10 m, sommet
du capot 12,2 m, moyeu 11,2 m, rayon 4,1 m, largeur aux poteaux d'angle de l'étage 3 à 6,83 m (côté
2,14 m + poteaux) ; tous projetés par la caméra de la vue comparable.

| Rapport | Référence | 1er tour | 2e tour | Écart (2e tour) | Tolérance |
| --- | --- | --- | --- | --- | --- |
| Corps de la tour, hauteur / largeur | 3,10 (208 / 67 px) | 2,86 | 2,82 | −9,3 % (± 2,5 % selon le pied) | ± 15 % |
| Rayon des ailes / hauteur de la tour (pied → sommet de la tête) | 0,342 (95 / 278 px) | 0,348 | 0,346 | +1,4 % | ± 15 % |
| Rayon des ailes / hauteur du corps | 0,457 | 0,465 | 0,465 | +1,8 % | indicatif |

## Écarts restants

- Corps un peu plus large que la référence (−9,3 % sur hauteur / largeur), dans la tolérance : les
  étages hauts sont plus larges qu'au 1er tour pour que la silhouette s'affine sans marche.
- Pied : la tour de la référence descend la falaise sur une base de poteaux ; le modèle pose tout à
  plat sur un socle (le terrain et la butte sont gérés par le jeu). La galerie couverte qui prolonge la
  maisonnette de la référence n'est pas reprise.
- Maisonnette plus grande que dans la référence : le passage traversant doit laisser 2,4 m libres
  (piédroits ramenés à 0,45 m).
- Faces à l'ombre : l'enduit crème vire au lavande sous l'ombre violette globale du rendu
  (`uShadowTint`), pas par sa couleur ; le réglage `warmShadow` du matériau `struct` (kit) demande
  l'accord de l'utilisateur et n'est pas touché. Vitres bleu-gris (sombres dans la référence).
- **Limite de l'outil de mesure** : `mesure.mjs` ne voit l'emprise que par les sommets. De près, une
  dalle quadrillée (pas d'environ 0,5 m, ≈ 180 triangles, couverte par les murs sauf un liseré) repose
  sur le dessus de chaque socle. Sans elle, avec les obstacles du 1er tour, la mesure donne 77 % et un
  débord de 1,27 m : la couverture passe (le relecteur trouvait 93,8 %), mais les cercles qui
  traversent l'intérieur vide de la tour et de l'annexe « débordent ». Une recherche d'obstacles sans
  dalle demande 26 petits cercles en chapelet le long des murs, avec des trous par où le joueur
  entrerait dans la tour : écartée. La version allégée n'a pas de dalle.
- Version allégée : le jeu ne bascule pas encore de version par lieu selon la distance ; sa bascule à
  20 m relève de l'intégration (moteur, hors du périmètre du modèle).
- Pas de capture en jeu : le modèle n'est pas encore posé (recette de `gen/pois.js` au World
  Designer). Contrôle visuel fait au catalogue.

## Captures (26/10/2026, catalogue, rendu « jeu »)

- `captures/bat013-moulin-tour-4-faces.png` : avant, arrière, gauche, droite.
- `captures/bat013-moulin-tour-trois-quarts.png` : trois-quarts avant et arrière.
- `captures/bat013-moulin-tour-reference-vs-modele.png` : référence et modèle sur la vue comparable,
  soleil depuis +X, repères mesurés.
- `captures/bat013-moulin-tour-gros-plans.png` : galerie, avancée et annexe, arche, tête.
- Captures du 1er tour gardées pour comparaison : mêmes noms suivis de `-t1`.
- `captures/bat013-moulin-tour-lod.png` : version fine et version allégée.

## Historique

- 26/10/2026 : modèle créé d'après la référence de l'utilisateur (TASK-ILE-VERTE-010, OBJ-0002), type de
  lieu `moulin_tour` ; budget propre de 8 000 / 4 000 triangles accordé par l'utilisateur. Statut :
  brouillon, en attente de la revue d'Evis-critique.
- 26/10/2026 : reprise après le refus d'Evis-critique (ressemblance à la référence) : étages en tronc
  de pyramide aux faces inclinées et cou en tronc (silhouette continue), tête allongée vers l'arrière
  sous un capot en demi-couronne et un toit cintré, toiles d'ailes en trapèze et lattis allégé,
  maisonnette plus discrète, avancée à pignon à la place de l'auvent, socles arrondis ; comparaison
  refaite avec le soleil depuis +X. Statut : brouillon, en attente d'une nouvelle revue.
