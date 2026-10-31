# Mât et voile du navire-forteresse — BAT-018

Dossier `src/models/batiments/navire-mat/` · Bâtiments · pièce de la forteresse-navire du Plateau venté
(`docs/forteresse-navire/memory.md`, §6.5). `reference.png` : copie de l'aperçu (199 × 112) de
`production/references/forteresse-navire.png`.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m, forme 0) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-018 | Mât et voile du navire-forteresse | Validé par Evis-critique (2e tour, 31/10/2026) | `part:navire_mat` | 11,5 × 18,22 × 2,63 | 1 500 de près, 600 allégé, par forme (fiche) |

Budget propre (`budget: { triangles: 1500, lod: 600 }`) : part des mâts dans les ≈ 60 000 triangles
accordés par l'utilisateur le 26/10/2026 pour la forteresse-navire.

## DA retenue

- **Repère** : pied au centre, vergues le long de X, voiles bombées vers +Z. Type de lieu `navire_mat`
  (`src/models/lieux.js`), rangé en DIRZ.
- **Commun** : collier de pied tourné (rayon 0,4 m), mât effilé (0,3 → 0,18 m, 10 côtés de près, 8 au loin)
  et pomme ; hune sur deux élongis, en arrière des vergues ; vergues de bois ; voiles carrées crème
  (`#f7ecc8` / `#f1e1b6`) bombées de 0,7 m vers +Z, **emblème bleu** `#3d6f90` à l'échelle de la voile
  (0,38 × sa largeur), balancement qui croît vers le bas (`toile()` des formes communes) ; **flamme**
  bleue en tête (vers +X local) ; quatre **haubans** du dessous de la hune à un taquet de bois sur le pont,
  en arrière du mât, loin des voiles.
- **Forme 0, grand mât** (18 m) : basse voile de 10,6 × 5 m sous une vergue de 11,5 m à 9,6 m, hune à
  10,7 m, hunier de 8,3 × 4,2 m sous une vergue de 9 m à 15,6 m.
- **Forme 1, petit mât** (14 m) : une vergue de 8,5 m à 11,6 m, voile de 7,8 × 5 m, hune à 12,4 m.
- **Emblème des deux faces** (`toile()`) : la toile dessinée est faite de cellules planes ; bombée vers +Z,
  elle passe sous la surface vraie `pli()`. L'emblème de la face suit `pli()` (au-dessus des cordes), celui
  du dos suit la toile dessinée (interpolée dans la cellule) : tous deux restent 8 mm devant leur face.
  Contrôle par lancer de rayons depuis −Z (script `embleme-dos.mjs` du scratchpad de la session E6) :
  0 sommet de l'emblème du dos caché sur 126, pour les trois voiles.
- Couleurs fixes (`tint: 0`). Identifiants de contour : bois, toile, cordages.
- **Version allégée** (`v: 1`) : mât à 8 côtés, sans pomme ni élongis, vergues à 6 côtés, toile au
  quadrillage moitié et emblème sans feuilles (il se lit comme un « Φ », acceptable au loin), haubans à
  4 côtés.

## Physique (`physique.js`)

- `FORMES` (hauteur, vergues, hune), `PIED`, `HAUBANS` ; un cercle de 0,42 m au pied du mât (§6.5 : 0,4 m)
  et un de 0,16 m sur le taquet de chaque hauban (on ne traverse pas leur pied). Aucun plancher.

## Mesures

`node scripts/modeles/mesure.mjs BAT-018 --json` (31/10/2026) : **aucune règle en échec**. Les deux formes,
avec les mêmes règles (`mesure-formes.mjs` de §15 de memory.md) :

| Forme | Triangles près / allégé | Obstacles | Emprise couverte | Débord |
| --- | --- | --- | --- | --- |
| 0, grand mât | 1 224 / 480 | 5 | 100 % | 0,12 m |
| 1, petit mât | 872 / 348 | 5 | 100 % | 0,12 m |

## Écarts restants et notes pour la pose (E8)

- **Vent** : la flamme flotte vers +X local et les voiles bombent vers +Z ; à accorder avec la flamme de
  BAT-016, la fumée de BAT-015 et les ailes de BAT-017 sur un vent commun.
- **Pieds des haubans** (± 2,3 ; −0,5) et (± 1,9 ; −1,4) : vérifier à la pose qu'ils ne tombent ni dans une
  maison ni sur un ressaut du pont.
- La `toile()` de `forme.js` n'est employée que par BAT-018 ; MON-014 garde sa propre copie (inchangée).
- Pas de capture en jeu : la pièce sera posée en E8.

## Captures (31/10/2026, catalogue)

- `captures/navire-mat-{0,1}-6vues.png`, `captures/navire-mat-{0,1}-allege-6vues.png`
- `captures/navire-mat-gros-plans.png` (2e tour) : pied et taquets, hune et vergue, tête et flamme, emblème
  de face, emblème de dos, hunier de dos.

## Historique

- 31/10/2026 : création (forteresse-navire, étape E6). 1er tour d'Evis-critique « à reprendre » : anneau de
  l'emblème caché au dos des voiles (la toile en cellules planes passe derrière l'emblème posé sur la
  surface vraie). Corrigé dans `toile()` : emblème du dos posé sur la toile dessinée, celui de la face sur
  la surface vraie ; taquets et cercles au pied des haubans. 2e tour : **valide**.
