# Moulin-tour du plateau — BAT-013

Dossier `src/models/batiments/moulin-tour/` · Bâtiments · d'après la référence de l'utilisateur
(`reference.png`, copie de `production/references/moulin-tour-plateau.png`, 808 × 632)

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-013 | Moulin-tour du plateau | Brouillon (en attente de revue d'Evis-critique) | `part:moulin_tour` | 8,12 × 15,3 × 9,84 | 8 000 de près, 4 000 allégé (fiche) |

Budget propre au modèle (`budget: { triangles: 8000, lod: 4000 }` dans la fiche du registre) : accordé
par l'utilisateur le 26/10/2026 (TASK-ILE-VERTE-010), au-dessus des 4 000 de la catégorie.

## DA retenue

- **Tour à plan carré, quatre faces détaillées**, sur un socle de pierre (3 × 3 m, 0,45 m) : cinq étages
  à colombages en léger retrait vers le haut (côtés 2,8 ; 2,56 ; 2,32 ; 2,1 ; 1,92 m), enduit crème
  `#f4e4c6`, poutres brun-orangé `#c07a45` / `#a5653b`. Chaque face d'étage porte une sablière basse,
  deux poteaux qui encadrent la baie, des décharges en Λ dans les travées libres et une baie encadrée
  (vitre, cadre biseauté, croisillon, appui) ; poteaux d'angle chanfreinés ; sablières hautes en
  encorbellement (dalle débordante) à chaque plancher. Seule exception : la face +X du rez, entièrement
  cachée par l'annexe, n'a pas de pan de bois.
- **Galerie à garde-corps** au plancher du dernier étage (7,55 m, comme la galerie de la référence,
  à 83 % de la hauteur du corps) : plancher débordant de 0,6 m, poteaux d'angle, lisses haute et basse,
  montant central et décharges en V sur chaque côté, deux consoles par face ; porte de galerie sur +Z.
- **Chapeau, cou et tête de bois** : jupe de bardeaux (tronc de pyramide) sur le dernier plancher, cou
  carré à colombages, tête de 1,64 × 3,4 m qui déborde à l'avant (+Z, côté ailes, jusqu'à 1,65 m) et à
  l'arrière (−1,75 m), fenêtres sur ses flancs et à l'arrière, petit toit de bois à deux pans (faîtage
  le long de Z, à 12,12 m) qui déborde devant et derrière, pignons crème ; palier et arbre des ailes.
- **Six ailes longues à lattis** (rayon 4,1 m, à 60°) : longeron brun, toile crème (deux tons) décalée
  sur le côté du longeron, rive extérieure et sept lattes en façade ; moyeu et nez. Pièce animée
  `anim: [{ axis: 'z', speed: 0.7, wind: true }]`, moyeu [0 ; 11,2 ; 2,05], plan des ailes à 0,55 m
  devant la galerie.
- **Annexe à colombages accolée à la face +X** (x 1,3 à 4,0 ; z ±1,45 ; murs 2,35 m) : porte et
  fenêtre en façade +Z, deux fenêtres au dos, fenêtre au pignon +X (poinçon et contrefiches), toit de
  mousse à deux pans épais et chanfreinés (`#a9bf6c`, `#bdd07f`) avec faîtage en bourrelet.
- **Maisonnette percée d'une arche** (centre [2,1 ; −5,0], 2,4 × 3,9 m) : passage voûté traversant le
  long de X, ouverture de 2,5 m sur 2,45 m sous clé ; piédroits enduits, voûte et tympans d'une seule
  extrusion, archivolte et piédroits de bois aux deux bouts, entrait, pignon crème et poinçon, une
  fenêtre sur chaque long pan, toit de mousse comme l'annexe.
- **Auvent** de bois sur consoles au-dessus de la porte de la tour (face +Z).
- Couleurs fixes (`tint: 0`) : le type n'est pas recoloré par `recolorPart`. Identifiants de contour :
  murs, bois et toits de mousse séparés (trait d'encre entre enduit et poutres).
- **Version allégée** (variante 1, `v: 1`, « Allégé (au loin) ») : mêmes volumes et même animation ;
  sans croisillons, appuis, sablières basses, lattes ni rives d'ailes, consoles, croix de la galerie,
  poinçons ; poteaux à section carrée, cadres sans tableau, socles non quadrillés.
- Type de lieu `moulin_tour` (`src/models/lieux.js`), rangé en DIRZ comme `moulin` : +Z (les ailes)
  regarde l'angle `rot`. Le modèle n'est pas posé sur le plateau (travail du World Designer).

## Mesures (26/10/2026)

`node scripts/modeles/mesure.mjs BAT-013 --json` : aucune règle en échec (modèle neuf : pas de mesure
« avant »).

| Ligne | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Triangles | 6 792 fin (maximum des variantes) · budget 8 000 / 4 000 | ≤ budget | true |
| Gabarit | 8,12 × 15,3 × 9,84 m (registre identique) | ± 25 % du registre | true |
| Couleurs | aucun noir | jamais de noir pur | true |
| Physique / forme | 12 obstacles : 88 % de l'emprise couverte, débord 0,35 m | ≥ 85 %, débord ≤ 0,4 m | true |
| Pièces | 2 maillages | — | null |
| Facettes | aucune primitive sous le seuil | vu de loin : indicatif | null |

Triangles par variante (`node scripts/modeles/empreinte.mjs BAT-013`) : 6 792 de près (v 0), 3 578
allégé (v 1). `mesure.mjs` ne mesure la version allégée que pour les espèces (`def.lod`) : pour un lieu,
le chiffre allégé vient de l'empreinte.

Critères de TASK-ILE-VERTE-010 contrôlés sur la géométrie construite par `partModel` :

| Critère | Valeur | Attendu |
| --- | --- | --- |
| Hauteur hors tout, ailes comprises | 15,3 m (un bras à la verticale) ; 14,75 m au plus bas de la rotation | 14 à 17 m |
| Faîte de la tête / haut du corps | 12,12 m / 9,10 m | — |
| Rayon des ailes | 4,1 m (envergure 8,2 m) | — |
| Passage de l'arche (entre obstacles) | 2,5 m ; ouverture visible 2,5 m, 2,45 m sous clé | ≥ 2,4 m |
| Obstacles | tour (3), annexe (3), piédroits (6) | pied de la tour et des annexes |
| Triangles | 6 792 / 3 578 | ≤ 8 000 / ≤ 4 000 |

## Proportions face à la référence

Vue comparable : la référence montre la tour de trois quarts, face +X large (43 px) et face +Z étroite
(24 px) à gauche, d'où un azimut d'environ 29° depuis +X vers +Z ; le modèle est rendu sous cet azimut,
6° d'inclinaison, champ de 14° (capture `bat013-moulin-tour-reference-vs-modele.png`).

Repères de la référence (pixels de `reference.png`) : pied de la tour y 420 (± 5 : il se perd dans la
falaise), haut du corps (dernière sablière) y 212, faîte de la tête y 142, moyeu (545 ; 158), rayon des
ailes 95 px (bouts vertical haut et bas à 98 et 92 px du moyeu), largeur du corps aux trois quarts de
sa hauteur (y 264) 551 → 618, soit 67 px. Repères du modèle : pied 0 m, haut du corps 9,10 m, faîte
12,12 m, moyeu 11,2 m, rayon 4,1 m, largeur aux poteaux d'angle de l'étage 3 à 6,83 m ; tous projetés
par la caméra de la vue comparable.

| Rapport | Référence | Modèle | Écart | Tolérance |
| --- | --- | --- | --- | --- |
| Corps de la tour, hauteur / largeur | 3,10 (208 / 67 px) | 2,86 | −7,8 % (± 2,5 % selon le pied) | ± 15 % |
| Rayon des ailes / hauteur de la tour (pied → faîte de la tête) | 0,342 (95 / 278 px) | 0,348 | +1,8 % | ± 15 % |
| Rayon des ailes / hauteur du corps | 0,457 | 0,465 | +1,8 % | indicatif |

## Écarts restants

- Corps un peu plus large que la référence (−7,8 % sur hauteur / largeur), dans la tolérance.
- Pied : la tour de la référence descend la falaise sur une base de poteaux ; le modèle pose tout à
  plat sur un socle (le terrain et la butte sont gérés par le jeu).
- L'avancée à pignon de la référence, à gauche de la tour, n'est pas reprise : un auvent sur consoles
  couvre la porte. La galerie couverte qui prolonge la maisonnette de la référence n'est pas reprise.
- Maisonnette plus grande que dans la référence : le passage traversant doit laisser 2,4 m libres.
- Faces à l'ombre : l'enduit crème vire au lavande sous l'éclairage toon du matériau `struct` du jeu
  (la référence le peint beige gris) ; vitres bleu-gris (sombres dans la référence).
- Ailes : la référence les peint en planches crème presque pleines ; le modèle montre davantage le
  lattis brun (sept lattes par aile).
- Socles au dessus quadrillé (pas de 0,42 m, environ 240 triangles de près, sans effet visible) :
  l'emprise de `mesure.mjs` ne voit que des sommets ; sans eux, l'intérieur de la tour et de l'annexe
  passait pour du vide (premier essai : 52 % couverts, débord 1,33 m) ; à juger par la revue.
- Version allégée : le jeu ne bascule pas encore de version par lieu selon la distance (les lieux
  sont fusionnés dans le LOD1 de l'île, jusqu'à 220 m) ; la variante `v: 1` existe, sa bascule à 20 m
  reste à brancher par l'intégration (moteur, hors du périmètre du modèle).
- Pas de capture en jeu : le modèle n'est pas encore posé (recette de `gen/pois.js` au World
  Designer). Contrôle visuel fait au catalogue.

## Captures (26/10/2026, catalogue, rendu « jeu »)

- `captures/bat013-moulin-tour-4-faces.png` : avant, arrière, gauche, droite.
- `captures/bat013-moulin-tour-trois-quarts.png` : trois-quarts avant et arrière.
- `captures/bat013-moulin-tour-reference-vs-modele.png` : référence et modèle sur la vue comparable,
  repères mesurés.
- `captures/bat013-moulin-tour-gros-plans.png` : galerie, porte et auvent, arche, tête.
- `captures/bat013-moulin-tour-lod.png` : version fine et version allégée.

## Historique

- 26/10/2026 : modèle créé d'après la référence de l'utilisateur (TASK-ILE-VERTE-010, OBJ-0002), type de
  lieu `moulin_tour` ; budget propre de 8 000 / 4 000 triangles accordé par l'utilisateur. Statut :
  brouillon, en attente de la revue d'Evis-critique.
