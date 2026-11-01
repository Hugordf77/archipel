# Escalier et passerelle du navire-forteresse — BAT-019

Dossier `src/models/batiments/navire-escalier/` · Bâtiments · pièce de la forteresse-navire du Plateau venté
(`docs/forteresse-navire/memory.md`, §6.6). `reference.png` : copie de l'aperçu (199 × 112) de
`production/references/forteresse-navire.png`.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m, forme 0) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-019 | Escalier et passerelle du navire-forteresse | Corrigé après le 1er tour d'Evis-critique ; 2e tour non fait (arrêté, fini sans revue à la demande de l'utilisateur, 01/11/2026) | `part:navire_escalier` | 3,67 × 21,8 × 31,12 | 2 500 de près, 1 000 allégé, par forme (fiche) |

Budget propre (`budget: { triangles: 2500, lod: 1000 }`) : part de l'escalier dans les ≈ 60 000 triangles
accordés par l'utilisateur le 26/10/2026 pour la forteresse-navire.

## DA retenue

- **Forme 0, escalier du flanc** : dans le **repère du navire** (posé à l'origine de la coque, §8, élément
  13), le long du flanc +X (axe en x = 10,8, largeur 2,4 m). Palier d'arrivée dans l'ouverture du pavois
  (`OUVERTURE` de BAT-014, z −7,4 → −4,6), du bord du pont (x = 8,5) à la rambarde extérieure, puis **cinq
  volées de onze marches** (hauteur 0,334 m, giron 0,4 m) et quatre paliers de 1,6 m ; le pied arrive en
  z ≈ 23,6, vers la proue, côté cercle de pierres (emplacement (b) tranché par l'utilisateur, §7).
- Marches ajourées en planches de deux tons (`PONT`, `BORDAGE` de la coque), deux limons, paliers en
  `BOIS_TOIT`. **Chevalets** : deux poteaux de 32 cm à arêtes adoucies (`oc`, comme les piliers du berceau)
  et une croix de Saint-André ; deux sous le palier d'arrivée, un au milieu de chaque palier intermédiaire,
  contreventé dans l'axe par deux contrefiches à 45° par poteau (vers le limon de la volée qui arrive et de
  celle qui part ; portée 2,6 m, raccourcie pour que leur pied reste à 0,4 m du sol au moins).
- Rambardes des deux côtés : lisse en pente le long des nez de marche, un seul poteau par jonction
  volée / palier (tête à la plus haute des deux lisses), poteaux toutes les trois marches.
- **Forme 1, passerelle** : 6 m de long, 1,8 m de large, montée de 2 m (du pont principal au gaillard),
  sur deux limons, tasseaux en travers, rambardes de 1,3 m.
- Couleurs fixes (`tint: 0`), matériaux des formes communes de la coque. Un identifiant de contour (bois).
- **Version allégée** (`v: 1`) : une rampe à la place des marches ; à la place des limons et des
  rambardes, des **joues pleines** de 0,9 m (elles dépassent de 0,58 m) le long des volées et des paliers :
  des lisses sans poteaux flotteraient au loin ; chevalets sans croix, contrefiches gardées. Passerelle
  allégée : lisses et poteaux des deux bouts.

## Physique (`physique.js`)

- **Aucun obstacle** (voulu) : chevalets et poteaux sont sous les planchers de l'escalier ; des obstacles
  sans hauteur gêneraient sur les marches (§6.6 : aucun sur les marches).
- **Planchers** : un plancher plat par marche (la pente d'une volée ne passe pas la règle des planchers),
  un par palier ; les rambardes portent des planchers étroits à 1,6 m au-dessus de leur marche, plus haut
  que le saut (≈ 1,23 m) : on ne tombe pas de l'escalier. Les rambardes en travers du palier d'arrivée sont
  décalées de 5 cm vers le pavois pour fermer l'ouverture jusqu'à ses poteaux.
- Passerelle : un plancher en pente ; ses rambardes n'ont pas de plancher (on n'en tomberait que sur le
  pont).

## Mesures

`node scripts/modeles/mesure.mjs BAT-019` (01/11/2026) : **aucune règle en échec** (181 planchers à moins de
3 cm du dessus des planches). Empreinte ajoutée (5 065 lignes, aucune retirée) ; `npx vitest run` 305 / 307
(échecs connus : empreintes, numérotation MON).

| Forme | Triangles près / allégé | Planchers |
| --- | --- | --- |
| 0, escalier du flanc | 2 436 / 708 | 181 |
| 1, passerelle | 240 / 108 | 1 |

Contrôles avec la coque (scripts du scratchpad de la session E7, d'après `fuites.mjs` de §15) :
- marge entre la coque et le limon intérieur : **0,48 m** au moins (en z = −4,8, au palier d'arrivée) ;
- palier d'arrivée : recouvre de 0,2 m le plancher du pont, 2 cm plus haut ;
- remplissage depuis le milieu du pont, planchers de la coque et de l'escalier, seuil 0,4 m (à pied) puis
  1,23 m (saut) : **une seule sortie vers le sol, au pied de l'escalier** (z = 23,65).

## Écarts au cahier des charges (§6.6), voulus

- **Aucun obstacle**, pas même sur les chevalets (§6.6 en prévoyait) : les obstacles n'ont pas de hauteur
  et bloqueraient aussi les marches au-dessus (§6.1, « Fait le 27/10 »).
- **5 volées de 11 marches + un palier** au lieu de « 5 volées de 12 marches » : on garde 60 hauteurs de
  0,334 m (la douzième de chaque volée est le palier).
- **Tracé** : axe en x = 10,8 constant, pied en z ≈ 23,6, au lieu de (13 ; 26) : l'escalier longe la coque
  (marge 0,48 m) au lieu de s'en écarter.
- **Un plancher plat par marche** au lieu d'un plancher incliné par volée (la règle des planchers n'est pas
  tenue sur la pente d'une volée).

## Écarts restants et notes pour la pose (E8)

- **Sens de l'escalier** : la référence le montre descendant vers la poupe ; il descend ici vers la proue,
  pour que le pied soit du côté du cercle de pierres (parvis, §7).
- **Pied** : la dernière marche est à 0,33 m au-dessus de l'origine du navire ; le sol de l'île sous le pied
  doit y être (aplanissement de E8), sinon allonger les chevalets ou ajouter une marche.
- **Passerelle** : pied au bas de la rampe, montée vers +Z ; ouverture à faire dans la rambarde du gaillard
  (ou du château) en E8, puis refaire le contrôle de fuites avec toutes les pièces.
- Pas de capture en jeu : la pièce sera posée en E8.

## Captures (01/11/2026, catalogue)

- `captures/navire-escalier-{0,1}-6vues.png`, `captures/navire-escalier-{0,1}-allege-6vues.png`
- `captures/navire-escalier-gros-plans.png` : palier d'arrivée, palier intermédiaire, pied, chevalets.

## Historique

- 01/11/2026 : création (forteresse-navire, étape E7). Fente de 5 cm fermée au palier d'arrivée côté proue
  avant revue. 1er tour d'Evis-critique « à reprendre » : allégé illisible (lisses sans poteaux qui
  flottent, volées réduites à une planche), chevalets de 20 m frêles (poteaux de 22 cm à arêtes vives, une
  seule diagonale, rien dans l'axe), poteaux doublés aux jonctions (oreilles de 33 cm). Corrigé : joues
  pleines au loin, chevalets arrondis, croisés et contreventés (un par palier), un poteau par jonction ;
  lisses arrondies non faites (+336 triangles, hors budget). 2e tour lancé puis arrêté par l'utilisateur, qui a demandé de finir
  sans revue : les corrections n'ont été vues que sur les planches refaites.
