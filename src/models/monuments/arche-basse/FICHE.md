# Arche basse — MON-011

Dossier `src/models/monuments/arche-basse/` · Ruines et monuments

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| MON-011 | Arche basse | Brouillon (en attente de revue d'Evis-critique) | `part:arche_basse` | 4,71 × 3,37 × 0,85 | — (monuments : 4 000) |

## DA retenue

- Porte de pierres levées à l'entrée de la table du plateau (BRF-PV-09, élément PV-A) : deux montants
  (pierres levées de `forme.js`, 0,95 × 2,82 × 0,75 m, sommet presque plat) à x = ±1,88 m, et un
  linteau couché (moellon de 4,6 × 0,56 × 0,82 m) posé dessus, à peine de travers. Bien plus basse et
  plus sobre que l'arche marine STR-011 (12,64 m), design propre.
- Teintes de pierre du kit (`STONE`, `STONE_D`), taches de mousse du kit (`patch`) : une sur le dessus
  du linteau, une sur une face de chaque montant.
- Passage le long de Z ; type de lieu `arche_basse` en DIRZ : l'axe de passage suit `rot`
  (cap du chemin −0,698 rad).
- Physique : un obstacle par montant (r 0,55 m) ; rien sous le linteau.

## Mesures (25/10/2026)

`node scripts/modeles/mesure.mjs MON-011 --json` : aucune règle en échec.

| Ligne | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Triangles | 1 234 fin · budget 4 000 | ≤ budget | true |
| Gabarit | 4,71 × 3,37 × 0,85 m (registre identique) | ± 25 % | true |
| Couleurs | aucun noir | — | true |
| Facettes | aucune primitive sous le seuil | indicatif | — |
| Physique / forme | 2 obstacles : 98 % de l'emprise couverte, débord 0,21 m | ≥ 85 %, débord ≤ 0,4 m | true |

Critères BRF-PV-09, contrôlés sur la géométrie construite par `partModel` (script hors dépôt) :

| Critère | Mesure | Seuil |
| --- | --- | --- |
| Hauteur hors tout | 3,26 m hors sol (boîte 3,37 m avec 0,1 m enterré) | 3,2 à 3,8 m |
| Ouverture entre montants (0 à 2,2 m de haut) | 2,81 m | ≥ 2,6 m |
| Hauteur libre sous le linteau | 2,66 m | ≥ 2,2 m |
| Largeur libre entre obstacles | 2,66 m | chemin de 2,4 m |
| Obstacles | [−1,88, 0, 0,55] et [1,88, 0, 0,55] : montants seulement | — |

## Écarts restants

- Hauteur hors sol 3,26 m : dans la plage, près du bas.
- « Test de pas climbable sous l'arche » non exécuté : l'arche n'est pas encore posée en jeu (recette à
  faire par le World Designer) ; seules les données (obstacles, hauteur libre) sont vérifiées.
- Vérification visuelle au catalogue seulement (`captures/pv09-arche-basse-6vues.png`).

## Historique

- 25/10/2026 : modèle créé (TASK-ILE-VERTE-007, BRF-PV-09), type de lieu `arche_basse` (DIRZ) ajouté
  dans `src/models/lieux.js`. Statut brouillon, en attente de la revue d'Evis-critique.
