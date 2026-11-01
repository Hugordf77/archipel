# Habillage de forteresse du navire — BAT-020

Dossier `src/models/batiments/navire-fort/` · Bâtiments · pièce de la forteresse-navire du Plateau venté
(`docs/forteresse-navire/memory.md`), ajoutée le 01/11/2026 à la demande de l'utilisateur : « que ça fasse
vraiment forteresse, style château ambulant ». `reference.png` : copie de l'aperçu (199 × 112) de
`production/references/forteresse-navire.png`.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-020 | Habillage de forteresse du navire | Non revu par Evis-critique (vérifié sur captures en jeu, 01/11/2026) | `part:navire_fort` | 21,53 × 13,27 × 59,13 | 6 000 de près, 2 500 allégé (fiche) |

Budget propre (`budget: { triangles: 6000, lod: 2500 }`) pris sur la marge des ≈ 60 000 triangles accordés
par l'utilisateur le 26/10/2026 pour la forteresse-navire (aucun dépassement : 42 590 posés en tout).

## DA retenue

Posée à l'origine du navire, dans son repère, et calée sur la coque BAT-014 (`navire-coque/physique.js` :
`station`, `demiLargeur`, `lisse`, `TRONCONS`, `OUVERTURE`) : elle suit la coque si celle-ci change.

- **Échauguettes** aux quatre angles du château (z = −20,9) et du gaillard (z = 22,9) : fût enduit de
  0,85 m de rayon sur un cul-de-lampe de bois, collé au bordage, fenêtre vers le large, toit conique
  d'ardoise au galbe évasé, larmier, épi.
- **Créneaux** : merlons de bois (0,36 × 0,7 × 0,55 m, arêtes adoucies) tous les 1,8 m sur la crête des
  pavois, suivant la courbe de la coque ; aucun à l'ouverture de l'escalier, près des échauguettes ni sur
  la pointe de la proue (z > 29,5).
- **Maisonnettes accrochées** (4) : caisson enduit à pans de bois, deux fenêtres au large, une fenêtre sur
  le bout tourné vers le milieu, plancher sur trois consoles qui partent de la coque, appentis d'ardoise
  contre le bordage, coussin de mousse. Deux au château (z −26 et −27), une à bâbord au milieu (z 4,8),
  une à tribord à l'avant (z 16,5) ; toutes hors des hublots et de l'escalier.
- **Tuyaux de cuivre** (4) : sortent de la coque 2,5 m sous le pont, coude, montent 1,5 m au-dessus du
  pavois, pavillon évasé, collier, patte d'attache au pavois.
- Couleurs fixes (`tint: 0`) des formes communes : `ENDUIT`, `POUTRE`, `POUTRE_F`, `BLEU`, `BLEU_F`,
  `CUIVRE`, `CUIVRE_F`, `MOUSSE`. Identifiants de contour : murs, bois, toits, cuivre.
- **Version allégée** (`v: 1`) : tours de 8 côtés, un merlon sur deux, fenêtres simplifiées, sans
  consoles, coussins de mousse, épis, colliers ni pattes, pavillons simplifiés.

## Physique (`physique.js`)

Ni obstacle ni plancher : tout est accroché au-dehors des flancs, à plus de 8 m du sol, ou posé sur la crête
du pavois, au-dessus de son plancher étroit que le joueur n'atteint pas depuis le pont.

## Mesures

`node scripts/modeles/mesure.mjs BAT-020` (01/11/2026) : **aucune règle en échec** ; 5 984 triangles de près,
2 444 allégé. Indicatif : l'épi des échauguettes est un cylindre de 6 côtés (sous le seuil de 8, invisible
à cette taille ; 8 côtés passeraient le budget). Contrôle de fuites du navire avec toutes les pièces : une
seule sortie, le pied de l'escalier (485 m² de pont).

## Écarts restants

- Pas de planche six vues ni de revue Evis-critique : vérifié sur les captures en jeu
  `captures/navire-fort-jeu-{flanc,babord,poupe,loin}.png`.
- Les créneaux sont sur le pavois de BAT-014 sans le modifier : si le pavois change (ouverture pour une
  passerelle), retirer les merlons de l'ouverture.

## Historique

- 01/11/2026 : création, avec l'abaissement de la coque (pont de 20 à 13 m). Premier jet à 7 756 triangles,
  ramené à 5 984 (merlons tous les 1,8 m, tours de 10 côtés, un collier par tuyau, un anneau par
  échauguette ; au loin, un merlon sur deux).
