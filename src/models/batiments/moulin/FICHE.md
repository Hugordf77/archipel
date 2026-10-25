# Moulin à vent — BAT-004

Dossier `src/models/batiments/moulin/` · Bâtiments · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-004 | Moulin à vent | Validé (tour crème) ; variante « Pierre du plateau » en attente de revue | `part:moulin` | 7,66 × 10,43 × 4,6 | — |

## DA retenue

- **Tour crème (v 0, par défaut)** : inchangée. Socle de pierre, tour tronconique crème, toit conique
  teinté (`tint: 1`, couleur `color` de l'élément par `recolorPart`), porte, lucarne, quatre ailes de
  toile sur la face +Z, animées par le vent (`anim: [{ axis: 'z', speed: 0.8, wind: true }]`, moyeu
  [0 ; 6,6 ; 2]).
- **Pierre du plateau (v 1, BRF-PV-05)** : variante pour les moulins des crêtes du Plateau venté.
  Tour plus large au pied (r 2,0 → 1,55 m sur 5,5 m) en `STONE_D`, deux bandeaux d'assises et douze
  moellons en saillie (`STONE`) qui disent la maçonnerie ; toit de bardeaux galbé (profil tourné, bord
  retroussé, deux rangs marqués), teinté comme le toit crème ; mêmes ailes et même animation au vent,
  moyeu [0 ; 6,4 ; 2,25], avancé pour dégager le bord du toit. Obstacle du pied inchangé (r 2,2 m).
- Pas de nouveau type de lieu : la variante passe par `v: 1` dans l'élément `moulin` (clé du cache
  des géométries des îles : `p.v` y figure). La recette `moulin_vent` de `gen/pois.js` ne pose pas
  encore `v` : c'est au World Designer de le faire pour PV-M1 à M3.

## Mesures (25/10/2026)

`node scripts/modeles/mesure.mjs BAT-004 --json` (mesure la variante par défaut, triangles = maximum
des variantes) :

| Ligne | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Physique / forme | 1 obstacle : 100 % de l'emprise couverte, débord 0,41 m | ≥ 85 %, débord ≤ 0,4 m | **false** (écart antérieur, tour crème) |
| Triangles | 3 388 fin (pierre) ; 1 320 (crème) · budget 4 000 | ≤ budget | true |
| Gabarit | 7,66 × 10,43 × 4,6 m | ± 25 % du registre | true |
| Couleurs | aucun noir | — | true |

Contrôle des critères (script de géométrie hors dépôt, `partModel` du jeu) :

| Critère BRF-PV-05 | Crème (v 0) | Pierre (v 1) |
| --- | --- | --- |
| Hauteur hors tout, ailes au repos / ailes à la verticale | 10,43 / 11,3 m | 10,23 / 11,1 m |
| Envergure des ailes (diamètre balayé) | 9,4 m | 9,4 m |
| Animation au vent | `wind: true` | `wind: true` |
| Obstacle du pied | [0, 0, 2,2] | [0, 0, 2,2] |
| Débord de l'obstacle (même calcul que `mesure.mjs`) | 0,41 m | 0,36 m |
| Jeu entre le plan des ailes et la tour | 0,35 m | 0,29 m |

## Écarts restants

- Tour crème : débord d'obstacle 0,41 m pour 0,4 m (règle DA §7), antérieur à cette tâche, non repris.
- Pierre du plateau : lisibilité « à 15 m » jugée seulement sur la planche du catalogue
  (`captures/pv05-moulin-pierre-6vues.png` : tour, toit et quatre ailes distincts) ; pas encore de
  capture en jeu, le moulin n'étant pas posé avec `v: 1` sur le plateau. Seuil chiffré à formaliser par
  Evis-critique.
- Les moellons sont des boîtes arrondies simples (`bx`) : à vérifier de près.

## Historique

- 18/10/2026 : fiche créée.
- 25/10/2026 : variante « Pierre du plateau » (v 1) pour le Plateau venté (TASK-ILE-VERTE-007,
  BRF-PV-05) ; la tour crème par défaut est inchangée (empreinte de la première construction
  identique). Statut de la variante : brouillon, en attente de la revue d'Evis-critique.
