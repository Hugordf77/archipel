# Corps et visage — PER-001

Dossier `src/models/personnage/corps/` · Personnage · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-001 | Corps et visage | Validé | `avatar` | 0,67 × 1,48 × 0,69 | — |

## DA retenue

- Chibi d'environ 1,45 m, tête à 40 % de la hauteur ; un seul maillage à liaison rigide (une pièce = un
  os), animation procédurale (`entities/character/Character.js`).
- **Visage peint** sur une calotte posée sur l'os de la tête (`entities/character/face.js`, atlas
  1024 × 1024 de 4 × 4 cases : yeux en haut, bouches en bas, superposés par le shader).
- **Yeux à la manière des films d'animation peints** (21/10/2026) : petits, à l'emprise de l'ancien œil
  d'encre réduite de 8 % (`SIZE` 0,92 : le blanc se lit comme une partie de l'œil) ; blanc crème
  `#fdf8f0` ; iris marron (anneau `#5c3a2b`, cœur `#8a5a3c`) de 44 % de la largeur de l'œil, allongé
  comme l'œil, placé haut sous la paupière (un liseré de blanc sur les côtés, un croissant dessous) ;
  pupille d'encre `#3d3049`, un reflet blanc ; trait de cils épais en haut (11 → 13 mm), contour fin
  ailleurs, ombre douce de la paupière. Trois formes au choix du joueur (ovales, ronds, en amande).
- Expressions : paupière baissée (endormi, concentré, effort) = l'iris descend pour qu'on en voie la
  moitié basse ; surprise = œil 12 % plus grand et iris à 82 % (plus de blanc) ; clignement et joie
  restent des traits.

Règles communes : `docs/DA.md`.

## Écarts restants

Aucun relevé pour l’instant.

## Historique

- 18/10/2026 : fiche créée.
- 21/10/2026 : yeux repris (blanc visible, iris marron, pupille, trait de cils), même taille apparente ; expressions vérifiées sur l'atlas et en jeu (`captures/atlas-yeux-v2.png`, `captures/yeux-v2-*.png`).
