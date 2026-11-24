# Bouleau — ARB-008

Dossier `src/models/arbres/bouleau/` · Arbres · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| ARB-008 | Bouleau | Validé | `kind:bouleau` | 2,9 × 4,84 × 2,96 | — |

## DA retenue

- **Espèce** : graine 5, tronc de 3,6 m, branches peu ouvertes (26°) et peu courbées ; 5,2 m ; écorce
  blanche `#f1ece3` ; feuillage clair.
- **Arbre fractal de l'utilisateur** (portage de « Jeux vidéo aprentissage/src/arbre.js », `kit/arbreFractal.js`,
  identique feuille par feuille à l'original pour la même recette) : une branche est une chaîne de segments
  courbés qui porte trois branches filles ; six générations, tronc évasé au pied (contrefort), feuilles sur
  les deux dernières générations, teinte des feuilles par exposition (cœur sombre et froid, périphérie
  claire).
- **Deux versions**, bascule par instance dans les shaders (`LOD_ARBRES`, `world/islands/arbresProches.js`) :
  version proche à moins d'environ 30 m du joueur (au plus 40 arbres par espèce) : une feuille de l'original
  sur huit (2 552), agrandie, en carte pliée sur la nervure (atlas peint `feuillesAtlas`), bois jusqu'à la
  2e génération, écorce peinte (`ecorceTexture`), translucidité vers le soleil et liseré ; version forêt
  au-delà : bois jusqu'à la 4e génération, neuf touffes peintes (une par sous-arbre), normales tirées vers
  l'enveloppe du houppier (la couronne s'éclaire d'un bloc).
- **Vent** : la ramure se balance (bois et feuilles, même formule à l'attache), chaque feuille frémit, et
  des feuilles se détachent des arbres proches et tombent en spirale (`arbresProches.js`, 160 feuilles).
- **Tronc** (`troncFractal`) : celui de l'original grossi × 1,6 (les grosses branches de moins en moins,
  les rameaux restent fins), cinq contreforts au pied, creusés entre eux, qui se prolongent en racines
  basses et rondes plongeant dans le sol ; de près, fût à 16 côtés cannelé (peau de vieux tronc).
- **Forme lointaine** (`farveg.js`) : l'enveloppe du houppier (`couronneFractal`) ; ombre portée : trois
  lobes, un par tiers de la couronne (`lobesCouronne`).
- 490 triangles en version forêt (3 600 avant) ; version proche : 2 676 triangles de bois et 10 208
  de feuilles.

Règles communes : `docs/DA.md`.

## Écarts restants

- **Gabarit** : le registre (`releves.gen.js`) garde la taille de l'ancien modèle ; à régénérer
  (`npm run modeles:releve`), non lancé car le fichier porte du travail non commité de l'utilisateur.
- **Physique / forme** en échec : l'encombrement (`physique.js`) dépasse le pied visible du tronc de
  l'arbre fractal ; le ramener change le placement des arbres dans tout le monde : décision de
  l'utilisateur.
- Empreinte changée (non écrite : `empreintes.json` porte le travail non commité de l'utilisateur).
- Tous les individus d'une espèce ont la même ramure (taille et orientation seules changent).

## Historique

- 18/10/2026 : fiche créée.
- 22/11/2026 : remplacé par l'arbre fractal de l'utilisateur (version forêt, version proche aux feuilles
  une à une, écorce et feuilles peintes, vent, feuilles qui tombent). Captures `captures/fractal-a3-especes.png`,
  `captures/fractal-b2-*`.
- 22/11/2026 : troncs plus épais et sculptés (contreforts, racines, cannelures de près), ombre portée en
  trois lobes ; captures `captures/arbres-d2-tronc-*`, `captures/ombres-apres2-*`.
