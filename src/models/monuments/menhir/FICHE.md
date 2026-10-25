# Menhir — MON-009

Dossier `src/models/monuments/menhir/` · Ruines et monuments

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| MON-009 | Menhir | Brouillon (en attente de revue d'Evis-critique) | `part:menhir` | 1 × 3,21 × 0,6 | — (monuments : 4 000) |

## DA retenue

- Pierre levée seule du Plateau venté (BRF-PV-06, éléments PV-P1 à P3), plus haute que les pierres du
  cercle MON-004 (1,6 à 2,8 m) et de la même famille : teintes `STONE`, `STONE_D` et `MOSS` du kit.
- Forme (`forme.js`, `pierreLevee`) : dalle de section « carré arrondi » (superellipse), plus large
  (X) qu'épaisse (Z), qui s'amincit vers le haut et finit en sommet rond un peu en biseau ; surface
  lisse (sommets fusionnés), léger relief de taille. Enfoncée de 0,1 m.
- Orientation : faces larges vers ±Z ; type de lieu `menhir` en DIRZ, donc +Z regarde l'angle `rot`
  (rot 3,680 : face au vent). Pierre penchée sous le vent (vers −Z) de 0,04 à 0,08 rad.
- Mousse côté vent : deux taches lobées du kit (`patch`) qui épousent la face +Z, couleur fixe
  (`tint: 0`), sans pièce plate posée en autocollant.
- Variantes (`v`) : 0 Dressé (1,0 × 3,2 × 0,5 m), 1 Trapu (1,12 × 2,75 × 0,55), 2 Élancé
  (0,86 × 3,45 × 0,45) ; un léger travers et le relief viennent du hasard du lieu.
- Physique : un obstacle unique au pied, r 0,6 / 0,65 / 0,55 m selon la variante.
- `forme.js` sert aussi au muret effondré (MON-010, `moellon`) et à l'arche basse (MON-011,
  `pierreLevee`, `mousse`) : le changer change leurs empreintes.

## Mesures (25/10/2026)

`node scripts/modeles/mesure.mjs MON-009 --json` : aucune règle en échec.

| Ligne | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Triangles | 526 fin (maximum des variantes) · budget 4 000 | ≤ budget | true |
| Gabarit | 1 × 3,21 × 0,6 m (registre identique) | ± 25 % | true |
| Couleurs | aucun noir | — | true |
| Facettes | aucune primitive sous le seuil | indicatif | — |
| Physique / forme | 1 obstacle : 100 % de l'emprise couverte, débord 0,4 m | ≥ 85 %, débord ≤ 0,4 m | true |

Critères BRF-PV-06, contrôlés sur la géométrie construite par `partModel` (script hors dépôt) :

| Variante | Hauteur hors sol | Largeur au pied | Épaisseur au pied | Sommet décalé (vers −Z) | Obstacle | Débord |
| --- | --- | --- | --- | --- | --- | --- |
| 0 Dressé | 3,09 m | 1,0 m | 0,52 m | 0,18 m | r 0,6 | 0,4 m |
| 1 Trapu | 2,65 m | 1,12 m | 0,56 m | 0,10 m | r 0,65 | 0,37 m |
| 2 Élancé | 3,34 m | 0,86 m | 0,48 m | 0,26 m | r 0,55 | 0,35 m |

Plages demandées : 2,5 à 3,5 m ; 0,8 à 1,2 m ; 0,4 à 0,6 m ; obstacle 0,5 à 0,7 m. Rotation :
`rotY('menhir', 3,680)` = −2,11 rad, soit +Z vers l'angle 3,680.

## Écarts restants

- Variante 0 : débord d'obstacle 0,40 m, à la limite de la règle (≤ 0,4 m).
- Mousse et pierre partagent un identifiant de contour (pas de trait d'encre entre elles : la mousse se
  lit comme une tache peinte) ; à confirmer par la revue.
- Le sommet garde de petits pans visibles au biseau sur la planche (quatre anneaux de dôme).
- Pas de capture en jeu : aucun menhir n'est encore posé (recette de `gen/pois.js` à faire par le World
  Designer). Vérification visuelle faite au catalogue (`captures/pv06-menhir-v0-6vues.png`, `-v1`,
  `-v2`).

## Historique

- 25/10/2026 : modèle créé (TASK-ILE-VERTE-007, BRF-PV-06), type de lieu `menhir` (DIRZ) ajouté dans
  `src/models/lieux.js`. Statut brouillon, en attente de la revue d'Evis-critique.
