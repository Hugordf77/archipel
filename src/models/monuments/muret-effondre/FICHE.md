# Muret effondré — MON-010

Dossier `src/models/monuments/muret-effondre/` · Ruines et monuments

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| MON-010 | Muret effondré | Brouillon (en attente de revue d'Evis-critique) | `part:muret_effondre` | 20 × 1,11 × 2,51 | — (monuments : 4 000) |

## DA retenue

- Mur de pierres sèches en ruine, coupe-vent des bergers près du cercle (BRF-PV-08, élément PV-W).
- Tracé (`physique.js`, `troncons(len)`, partagé avec le constructeur) : longueur hors tout `len`
  (12 à 24 m, 20 par défaut) le long de X, en trois tronçons (36 %, 30 %, 34 % du reste) séparés par deux
  brèches de 2,2 m.
- Assises : une première de 2 ou 3 moellons couchés bout à bout (0,6 m de haut, 0,72 m d'épaisseur), une
  seconde sur le milieu de chaque tronçon (15 à 85 %), à joints décalés, dont une pierre manque ;
  bouts de tronçon tombés à la hauteur de la première assise. Moellons de `forme.js` (MON-009) : section
  carré arrondi, bouts arrondis, chacun son identifiant de contour (trait d'encre aux joints).
- Éboulis (`eboulis(len)`) : une pierre tombée par tronçon (côté alterné) et une au pied de chaque bout
  tourné vers une brèche, hors du passage.
- Mousse côté vent (+Z) : taches du kit (`patch`) sur le dessus de trois pierres au plus de la seconde
  assise.
- Type de lieu `muret_effondre` en DIRX : l'axe du mur (+X) suit l'angle `rot` (rot 2,109, perpendiculaire
  au vent) ; +Z regarde alors l'angle rot + π/2 = 3,680, le côté d'où vient le vent.
- Physique : cercles de 0,45 m le long de chaque tronçon (pas ≤ 0,55 m, rentrés de 0,3 m aux bouts), un
  cercle de 0,42 m par pierre tombée ; aucun dans les brèches.

## Mesures (25/10/2026)

`node scripts/modeles/mesure.mjs MON-010 --json` : aucune règle en échec.

| Ligne | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Triangles | 3 785 fin · budget 4 000 | ≤ budget | true |
| Gabarit | 20 × 1,11 × 2,51 m | ± 25 % | true |
| Couleurs | aucun noir | — | true |
| Facettes | aucune primitive sous le seuil | indicatif | — |
| Physique / forme | 37 obstacles : 98 % de l'emprise couverte, débord 0,31 m | ≥ 85 %, débord ≤ 0,4 m | true |

Critères BRF-PV-08, contrôlés sur la géométrie construite par `partModel` (script hors dépôt) :

| len | Hauteur du mur | Brèches : libre entre pierres / entre obstacles | Sommets dans les brèches | Obstacles dans les brèches | Triangles | Couverture / débord |
| --- | --- | --- | --- | --- | --- | --- |
| 12 | 1,02 m | 2,2 / 1,9 m (×2) | 0 | 0 | 2 656 | 99 % / 0,28 m |
| 20 | 1,02 m | 2,2 / 1,9 m (×2) | 0 | 0 | 3 785 | 98 % / 0,31 m |
| 24 | 1,02 m | 2,2 / 1,9 m (×2) | 0 | 0 | 3 898 | 98 % / 0,36 m |

La hauteur hors sol va de 0,6 m (première assise seule, bouts des tronçons) à 1,02 m ; la boîte fait
1,11 m avec la partie enterrée (0,06 à 0,09 m).

## Écarts restants

- Budget serré : 3 785 triangles à 20 m, 3 898 à 24 m ; c'est pourquoi `len` est borné à 24 m (au-delà,
  le débord d'obstacle dépassait 0,4 m et le budget était atteint).
- Passage des brèches vérifié sur les données (aucun obstacle, aucune géométrie au-dessus de 5 cm) ; pas
  encore de test de marche en jeu : le muret n'est pas posé (recette de `gen/pois.js` à faire par le
  World Designer). La clé de cache des géométries des îles arrondit `len` au mètre : poser des longueurs
  entières.
- Vérification visuelle au catalogue seulement (`captures/pv08-muret-6vues.png`,
  `captures/pv08-muret-gros-plans.png`).

## Historique

- 25/10/2026 : modèle créé (TASK-ILE-VERTE-007, BRF-PV-08), type de lieu `muret_effondre` (DIRX) ajouté
  dans `src/models/lieux.js`. Statut brouillon, en attente de la revue d'Evis-critique.
