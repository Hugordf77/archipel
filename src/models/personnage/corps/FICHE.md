# Corps et visage — PER-001

Dossier `src/models/personnage/corps/` · Personnage · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-001 | Corps et visage | Validé | `avatar` | 0,82 × 1,64 × 0,77 (coiffé) | 9 000 (personnage) |

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
- Bob : dôme calé sur la calotte de la coupe en pics (centre en z −0,085, échelle 1,2 × 0,74 × 1,24),
  ruban suivi ; plus rien ne le traverse.

Règles communes : `docs/DA.md`.

## Écarts restants

- `mesure.mjs` : ✗ « Facettes », 11 primitives sous 10 segments (oreilles `G.sphere(0.062, 8, 6)`,
  boutons, mains…, `corps/index.js`), antérieur à la reprise du visage ; plus visible depuis que la
  coupe en pics laisse les oreilles dégagées. À reprendre avec la marge de triangles (8 878 au plus).

## Historique

- 18/10/2026 : fiche créée.
- 21/10/2026 : yeux repris (blanc visible, iris marron, pupille, trait de cils), même taille apparente ; expressions vérifiées sur l'atlas et en jeu (`captures/atlas-yeux-v2.png`, `captures/yeux-v2-*.png`).
