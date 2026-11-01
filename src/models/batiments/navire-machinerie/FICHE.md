# Hélices et encombrement du navire — BAT-021

Dossier `src/models/batiments/navire-machinerie/` · Bâtiments · pièce de la forteresse-navire du Plateau
venté (`docs/forteresse-navire/memory.md`), ajoutée le 01/11/2026 pour le navire volant
(`src/world/plateau/NavireVolant.js`) à la demande de l'utilisateur : « des hélices sur le dos du navire »,
« un design plus encombré et vivant ». `reference.png` : copie de l'aperçu (199 × 112) de
`production/references/forteresse-navire.png`.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-021 | Hélices et encombrement du navire | Non revu par Evis-critique (vérifié sur captures en jeu, 01/11/2026) | `part:navire_machinerie` | 20,65 × 16,29 × 57,81 | 5 000 de près, 1 600 allégé, pales comprises (fiche) |

Budget propre pris sur la marge des ≈ 60 000 triangles accordés le 26/10/2026 pour la forteresse-navire
(prévu à 4 000 / 1 500, réglé à 5 000 / 1 600 pour garder tout l'encombrement demandé).

## DA retenue

Posée à l'origine du navire, dans son repère, calée sur la coque BAT-014 (`navire-coque/physique.js`) et
sur l'habillage BAT-020 (échauguettes, tuyaux, maisonnettes) ; tout est sur les flancs ou à la poupe, le
pont étant occupé par les maisons, la tour-moulin et les voiles.

- **Hélices de poupe** (2, animées autour de Z, sens opposés, 4,5 rad/s) : nacelle de cuivre fuselée de
  3,4 m à (± 4,4 ; 7), deux bras vers la coque, trois pales de bois vrillées de 2,6 m, bouts de cuivre.
- **Rotors sur le dos du château** (2, animés autour de Y, 3,2 rad/s) : mât de bois de 5 m aux angles de la
  poupe (± 5,6 ; −30,6), boîtier de cuivre, quatre pales horizontales de 2 m, sous la voile du mât
  d'artimon et hors des maisons de poupe.
- **Cordes à linge** (3) le long des flancs, d'un tuyau à une échauguette ou d'une maisonnette à un tuyau,
  linge de six couleurs de la palette.
- **Étagères** (3) entre les hublots : planche sur deux consoles, garde-fou de corde, trois tonneaux cerclés
  de cuivre et une caisse.
- **Ancres** (2) contre le bordage de la proue (z 20,5), jas, bras et pattes de cuivre, chaîne en maillons
  alternés depuis l'écubier.
- **Lanternes** (4) pendues sous les échauguettes.
- **Version allégée** (`v: 1`) : tours de 6 côtés, pales sans bouts, moins de linge, consoles, cercles et
  lanternes retirés, chaîne en une barre.

## Physique (`physique.js`)

Ni obstacle ni plancher (pièce du navire volant, décor).

## Mesures

`node scripts/modeles/mesure.mjs BAT-021` (01/11/2026) : aucune règle en échec ; 4 860 triangles de près
(pales comprises), 1 524 allégé. Indicatif : chapeau des lanternes en cône de 6 côtés.

## Écarts restants

- Pas de planche six vues ni de revue Evis-critique : vérifié sur les captures en jeu
  `captures/navire-vol-{1,2,3,4}.png`.
- Les hélices tournent à vitesse fixe, sans lien avec la marche du navire.

## Historique

- 01/11/2026 : création, avec le passage du navire en vol (décor qui tourne autour du plateau).
