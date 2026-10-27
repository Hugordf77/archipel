# Tourelle du navire-forteresse — BAT-016

Dossier `src/models/batiments/navire-tourelle/` · Bâtiments · pièce de la forteresse-navire du Plateau venté
(`docs/forteresse-navire/memory.md`, §6.3), dans la DA du moulin-tour BAT-013. `reference.png` : copie de
l'aperçu (199 × 112) de `production/references/forteresse-navire.png` (pleine taille pas encore déposée).

| Identifiant | Nom | Statut | Référence du jeu | Taille (m, forme 0) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-016 | Tourelle du navire-forteresse | Validé par Evis-critique (2e tour, 27/10/2026) | `part:navire_tourelle` | 4,8 × 14,37 × 4,8 | 2 000 de près, 800 allégé, par forme (fiche) |

Budget propre (`budget: { triangles: 2000, lod: 800 }`) : part des tourelles dans les ≈ 60 000 triangles
accordés par l'utilisateur le 26/10/2026 pour la forteresse-navire.

## DA retenue

- **Repère** : pied au centre, porte vers +Z. Type de lieu `navire_tourelle` (`src/models/lieux.js`), rangé
  en DIRZ : +Z regarde l'angle `rot`.
- **Corps commun** (profils tournés à 16 côtés de près, 8 au loin) :
  - socle de pierre (rayon 1,7 m, 2,2 m de haut ; empattement et cordon) percé d'une porte de 1,6 m ;
  - **encorbellement** : neuf consoles en équerre à pied coupé (≈ 1 m de haut, 0,32 m de saillie), tous
    les 36° sauf au-dessus de la porte (cinq au loin), sous un plancher annulaire ;
  - fût enduit (rayon 1,95 m, diamètre 3,9 m, de 2,3 à 7 m) à huit poteaux et trois lisses de bois ;
    trois fenêtres à croisillons entre les poteaux (au-dessus de la porte, et à ± 135° dans le panneau
    bas) ; corniche.
  - Hauteur du **corps** (« 6 à 8 m » de memory.md §6.3) : 7,22 m jusqu'à la corniche.
- **Forme 0, toit d'ardoise** : larmier, cône d'ardoise `#3d6f90` très pointu (5,6 m) au galbe évasé,
  épi de bois et boule, **flamme** bleue (`flamme()` de `navire-coque/forme.js`, qui flotte vers +X local).
  14,37 m hors tout.
- **Forme 1, coupole de cuivre (proue)** : coupole `#cf8f5c` en quart d'ellipse, six **côtes continues**
  `#b97a4c` (nervures qui suivent chaque point du profil, sans joint), lanterne vitrée (collet, vitrage,
  montants, chapeau de cuivre, boule). 11,2 m hors tout.
- Couleurs fixes (`tint: 0`). Identifiants de contour : murs, bois, toit.
- **Version allégée** (`v: 1`) : profils à 8 côtés, cinq consoles, six poteaux, une lisse, sans boules, côtes
  ni croisillons ; quatre montants de lanterne.

## Physique (`physique.js`)

- `SOCLE` et `FUT` (rayons, hauteurs) ; un cercle d'obstacle de 1,85 m au pied (socle, empattement,
  chambranle), à 5 % sous le rayon du fût (± 15 % demandés en §6.3). Le fût ne déborde du cercle qu'au-dessus
  de ≈ 1,5 m (consoles), plus haut que le personnage. Aucun plancher.

## Mesures

`node scripts/modeles/mesure.mjs BAT-016 --json` (27/10/2026) : **aucune règle en échec**. Les deux formes
mesurées avec les mêmes règles (script `mesure-formes.mjs` de §15 de memory.md, rendu générique) :

| Forme | Triangles près / allégé | Emprise couverte | Débord | Taille (m) |
| --- | --- | --- | --- | --- |
| 0, ardoise | 1 590 / 578 | 100 % | 0,24 m | 4,8 × 14,37 × 4,8 |
| 1, coupole | 1 934 / 614 | 100 % | 0,24 m | 4,4 × 11,2 × 4,54 |

## Écarts restants et notes pour la pose (E8)

- **Vent** : la flamme flotte vers +X local et la fumée de BAT-015 dérive vers −Z local : elles tournent avec
  leur pièce. Un angle de vent commun, donné par la pose, est à prévoir en E8 (avant les mâts d'E6, qui
  portent aussi des flammes).
- **Socle** peu contrasté avec l'enduit du fût à l'ombre (`PIERRES[1]`) : à reprendre si la vue en jeu le
  confirme (assises, ou roche plus sombre).
- Consoles en prismes à arêtes vives : une section chanfreinée les adoucirait (point mineur).
- Coupole allégée facettée de près (8 côtés) : acceptable au-delà de 20 m.
- Faces à l'ombre lavande (`uShadowTint`), comme BAT-013.
- Pas de capture en jeu : la pièce sera posée en E8.

## Captures (27/10/2026, catalogue)

- `captures/navire-tourelle-{0,1}-6vues.png`, `captures/navire-tourelle-{0,1}-allege-6vues.png`
- `captures/navire-tourelle-gros-plans.png` (2e tour) : porte et consoles, consoles d'en bas, toit et
  flamme, coupole et côtes, côte de profil, socle et consoles en 3/4.

## Historique

- 27/10/2026 : création (forteresse-navire, étape E4). Avant revue : fenêtres latérales déplacées entre
  deux poteaux (± 135°), consoles dégagées de la porte. 1er tour d'Evis-critique « à reprendre » : côtes de
  la coupole en tronçons droits à crans, consoles réduites à des dents. Corrigé : côtes continues, neuf
  vraies consoles d'un mètre. 2e tour : **valide**.
