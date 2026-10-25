# Cercle de pierres — MON-004

Dossier `src/models/monuments/cercle-pierres/` · Ruines et monuments · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| MON-004 | Cercle de pierres | Validé | `part:cercle_pierres` | 8,73 × 2,73 × 8,8 | — |

## DA retenue

À écrire : forme, proportions, couleurs et détails retenus pour ce modèle.

Règles communes : `docs/DA.md`.

## Constat pour le Plateau venté (BRF-PV-07, 25/10/2026)

**MON-004 convient au cercle PV-C ; aucun nouveau modèle, aucun paramètre ajouté.**

- Le modèle dresse `count` pierres (5 à 12, 8 par défaut) régulièrement sur un cercle de 4 m, la
  pierre k à l'angle local 2πk/count, un obstacle de 0,45 m par pierre. Le type `cercle_pierres` n'est
  ni DIRZ ni DIRX : sa rotation en jeu est `rotation.y = rot`, et une pierre d'angle local a se trouve à
  l'angle monde a − rot (cap compté comme atan2(dz, dx), même convention que les caps de la fiche).
- Le plan dit « rot sans effet visible » : c'est inexact. Le cercle étant régulier, `rot` place
  exactement les intervalles. Pour qu'un intervalle (milieu entre deux pierres) regarde l'allée au cap
  2,443 rad, il suffit de poser `rot = π/count − 2,443` (modulo 2π) : 4,189 rad pour 9 pierres,
  4,233 pour 8, 4,289 pour 7. Un paramètre d'intervalle dans le modèle n'apporterait rien de plus :
  il n'est pas ajouté, et le rendu comme l'empreinte de MON-004 restent inchangés.
- Ce réglage relève de la recette du constructeur `cercle_pierres` de `src/world/islands/gen/pois.js`
  (option `count` et `rot` imposés pour PV-C, tirage actuel conservé sans option) : travail du World
  Designer, non fait ici.
- Largeur libre de l'intervalle (rayon 4 m, pierres de 0,7 m, obstacles de 0,45 m), calculée : 9 pierres
  ≈ 2,0 m entre pierres et 1,84 m entre obstacles ; 8 pierres ≈ 2,36 et 2,16 m ; 7 pierres ≈ 2,77 et
  2,57 m. Avec 9 pierres, l'intervalle est plus étroit que le chemin principal (2,4 m) mais praticable ;
  7 pierres donnent un passage plus large que le chemin. Choix à faire par le World Designer.

## Écarts restants

`node scripts/modeles/mesure.mjs MON-004 --json` (25/10/2026, inchangé par cette tâche) :

- Physique / forme : 8 obstacles, 80 % de l'emprise couverte, débord 3,61 m (`ok: false`) : la pierre
  plate centrale n'a pas d'obstacle et l'emprise mesurée inclut le centre. Antérieur, non repris.
- Facettes (indicatif) : sphère de mousse à 8 segments (`index.js:17`).

## Historique

- 18/10/2026 : fiche créée.
- 25/10/2026 : constat BRF-PV-07 (TASK-ILE-VERTE-007) : MON-004 réutilisé tel quel pour le cercle du
  Plateau venté ; orientation de l'intervalle par `rot` ; aucun changement de code.
