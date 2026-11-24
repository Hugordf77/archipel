# Buissons — PLA-001 à PLA-003

Dossier `src/models/plantes/buissons/` · Plantes, fleurs et cultures · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PLA-001 | Arbuste | Validé | `kind:arbuste` | 2,48 × 1,9 × 2,29 | — |
| PLA-002 | Buisson à baies | Validé | `kind:buisson_baies` | 2,11 × 2,1 × 2,16 | — |
| PLA-003 | Buisson fleuri | Validé | `kind:buisson_fleuri` | 1,84 × 1,93 × 1,75 | — |

## DA retenue

Refonte du 23/11/2026 (demande de l'utilisateur : « les buissons, refonds-les en détail ») : un buisson
composé et planté, plus une boule posée au sol.

- 4 à 5 masses de feuillage inégales et décalées (une haute, une basse en avant), plusieurs verts ;
  l'arbuste a une masse roussie (`#c7b56e`).
- Tiges de bois (`#8f6a50`) qui sortent du sol et filent vers le cœur de chaque masse.
- Baies (PLA-002) en cinq grappes de trois sur la surface haute, rouges et une grappe bleue ; fleurs
  (PLA-003) à corolle aplatie rose ou crème et cœur jaune, sur le dessus et les flancs hauts.
- Feuillage en grappes de feuilles (`grappesAtlas`, `render/textures.js`), plus de pompons ronds.
- Triangles : 320, 886, 814 (budget 1 000).

Règles communes : `docs/DA.md`.

## Écarts restants

- « Physique / forme » (déjà en échec avant la refonte) : encombrement plus petit que le pied visible,
  PLA-002 −31 % (−41 % avant), PLA-003 −45 % (−35 % avant). Non corrigé : changer l'encombrement
  changerait les collisions en jeu.

## Historique

- 18/10/2026 : fiche créée.
- 23/11/2026 : refonte des trois buissons (masses, tiges, grappes de baies, fleurs à cœur, feuillage en grappes) ; empreintes PLA-001 à 003 non écrites (le fichier porte du travail non commité).
