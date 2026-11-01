# Coque et berceau du navire-forteresse — BAT-014

Dossier `src/models/batiments/navire-coque/` · Bâtiments · première pièce de la forteresse-navire du
Plateau venté (`docs/forteresse-navire/memory.md`, §6.1), d'après la référence de l'utilisateur
(`reference.png`, copie de `production/references/forteresse-navire.png` : **aperçu de 199 × 112**, la
pleine taille n'est pas encore déposée).

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| BAT-014 | Coque et berceau du navire-forteresse | Relu par Evis-critique (3 tours) ; dernier défaut corrigé selon sa proposition | `part:navire_coque` | 19,35 × 23,16 × 75,55 (coque abaissée le 01/11/2026) | 12 000 de près, 5 000 allégé (fiche) |

Budget propre (`budget: { triangles: 12000, lod: 5000 }`) : part de la coque dans les ≈ 60 000 triangles
accordés par l'utilisateur le 26/10/2026 pour la forteresse-navire.

## DA retenue

- **Repère du navire** (memory.md §3) : origine au sol au centre de l'emprise, +Z vers la proue, +X flanc
  de l'escalier. Type de lieu `navire_coque` (`src/models/lieux.js`), rangé en DIRZ : +Z (la proue)
  regarde l'angle `rot`.
- **Coque par sections** (`loft` de `forme.js`) entre 26 stations (13 au loin) interpolées sans
  dépassement (cubique monotone) sur la table de memory.md §6.1. Quille relevée aux deux bouts sur la
  planche du 27/10 : dessous de quille 8,5 m au tableau, 4 m au maître-bau, 6 m à z = 22, 9,5 m à z = 28,
  16 m à l'étrave (le ventre remonte en rond vers la proue). Section en quart de super-ellipse (exposant
  2,4) sur un fond plat (la quille, `#a5653b`) ; 20 points par demi-section (8 au loin) ; **bordages en
  bandes alternées** `#b8875a` / `#a3774f` d'environ 1 m qui suivent les lignes de la coque (une
  géométrie par bande, normales lissées sur toute la coque). Le haut de la coque suit le pont principal.
- **Pont** : tonture `y = 20 + 0,0007 z²` ; château de poupe +3 m (z < −20), gaillard d'avant +2 m
  (z > 22). Planches de ≈ 0,8 m (22 bandes `#c98a52` / `#b8875a`, 4 au loin). Façade du château à
  colombages (enduit, porte, quatre fenêtres), façade du gaillard en bordages (porte, deux fenêtres),
  rambardes (lisse haute à 1,27 m) aux deux ressauts et en travers de la pointe (z = 28).
- **Pavois** de 1,1 m au-dessus du pont, en **ressauts francs** au château et au gaillard (comme un
  galion), poteaux aux ressauts ; **lisse de mousse en coussin** (`#a9bf6c` / `#bdd07f`) qui déborde de
  0,5 m et retombe, coulures de mousse dessous ; ouverture de 2,8 m sur +X (z −7,4 → −4,6) à l'arrivée de
  l'escalier, bordée de deux poteaux.
- **Poupe** : tableau plat de la quille à la lisse, quatre fenêtres basses, galerie en encorbellement
  (plancher, quatre consoles, balustrade sur trois côtés, porte et deux fenêtres), gardée au loin.
- **Proue** : étrave qui suit le profil, du dessous de la quille au-dessus de la lisse ; beaupré de
  13,8 m incliné de 20° (10 m hors de l'étrave), né dans sa bitte plantée dans le gaillard au-delà de
  la rambarde de la pointe, sous-barbe et haubans, cordage pendu et nacelle tournée
  (bas à 3 m du sol), échelle de corde jusqu'à 2,3 m.
- **Cuivres** : deux plaques bombées ovales sur le flanc +X (9 × 5 et 7 × 4 m), une sur −X (8 × 4,5 m),
  épousant la coque, liseré de rivets ; huit hublots cerclés par flanc à 17,6 m.
- **Berceau** : six piliers de rochers empilés (deux rochers de pied à demi enterrés de 4,6 à 5,8 m,
  fût de rochers qui s'affinent jusque dans la quille), six rochers à demi enterrés, coussins et
  coulures de mousse, fougères. Roche propre, plus chaude et plus sombre que la pierre taillée de
  MON-014 (`#b8a07e`, `#a8916f`, `#b09a78`) : toujours à l'ombre de la coque, la pierre crème y virait au
  lavande. Rochers très déformés aux arêtes largement abattues (chanfrein ≈ 1/4 de la plus petite
  dimension).
- Couleurs fixes (`tint: 0`). Identifiants de contour : enduit, coque, pont, bois, mousse, cuivre,
  cordages ; un par plaque de cuivre (ses rivets le partagent) et par rocher.
- **Version allégée** (`v: 1`) : mêmes volumes ; 13 stations, 8 points par demi-section, 4 planches,
  lisse plus simple, sans coulures, rivets, cerclages de hublots (disques de cuivre), barreaux de
  l'échelle, sous-barbe pendante ; rambardes à une lisse, rochers à six faces.

## Physique (`physique.js`)

- **Aucun obstacle** (écart voulu à memory.md §6.1) : en jeu, les obstacles n'ont pas de hauteur
  (`navigation.js:137` ; le `ymin` des îles célestes n'est pas transmis par la pose des lieux,
  `IslandManager.js:566`) : des cercles sous la quille arrêteraient aussi le joueur sur le pont. Le
  berceau est tout entier sous les planchers du pont ; un plancher est le sol dans tout son rectangle
  (`IslandManager.heightAt`) et le joueur ne monte pas plus de 0,4 m d'un coup (`Player.js:230`) : le
  bord des planchers, à 13 m (20 m avant le 01/11/2026), fait mur et personne ne passe sous la coque.
- **Planchers (74)** :
  - pont principal, château et gaillard en tronçons qui suivent la tonture (corde à moins de 7 mm),
    jusqu'à la face intérieure du pavois ; chaque tronçon prend la largeur de son bout le plus large
    (débord de 0,45 m au plus, sous le plancher du pavois) ;
  - **pavois** : bandes de 0,7 m sur le coussin de la lisse de mousse, centrées sur son bord intérieur
    (de W − 0,6 à W + 0,1 : le joueur, de rayon 0,3 m, s'arrête un rayon avant la face du pavois) ;
    depuis le pont, une marche de 1,3 m (4,3 m au château) que le joueur ne monte ni à pied
    (< 0,4 m) ni d'un saut (≈ 1,23 m au plus : `tuning.js`, `Player.js:227`) ;
  - tableau (faîtage de mousse) et rambardes des ressauts et de la pointe (sur leur lisse haute, à
    1,3 m ; bandes de 0,84 m, le joueur s'arrête un rayon avant la rambarde des deux côtés).
- Contrôles (scripts du scratchpad de la session, refaits par Evis-critique) : remplissage sur une
  grille de 10 cm depuis le milieu du pont, à pied (montée < 0,4 m) et d'un saut (montée < 1,23 m) : on
  n'atteint le sol que par l'ouverture de l'escalier ; corps du joueur dans le pavois : 1 cm au pire ;
  4 720 sommets bas du berceau, tous sous les planchers. L'ouverture de l'escalier, que BAT-019 (E7)
  raccordera, est la seule sortie. Château et gaillard
  ne sont pas encore accessibles (passerelle et escalier : E7, E8).

## Mesures

`node scripts/modeles/mesure.mjs BAT-014 --json` (27/10/2026, version livrée) : **aucune règle en
échec**.

| Ligne | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Triangles | 11 966 fin · budget 12 000 / 5 000 | ≤ budget | true |
| Gabarit | 19,35 × 30,18 × 75,55 m | ± 25 % du registre | true |
| Couleurs | aucun noir | jamais de noir pur | true |
| Physique / forme | aucun obstacle | à vérifier (passage voulu ?) | null : voulu, voir Physique |
| Planchers | 74, pire écart 2,9 cm | ± 5 cm | true |
| Facettes | aucune primitive sous le seuil | indicatif | null |

Triangles allégés (constructeur avec `{ v: 1 }`) : 4 336.

## Proportions face à la référence

Aperçu de 199 × 112 seulement : rapports d'ensemble, pas de détails fins (memory.md §2).

| Rapport | Référence (aperçu × 5) | Modèle | Écart |
| --- | --- | --- | --- |
| Coque, quille → pont / longueur | 0,26 | 0,25 (16 m / 64 m au maître-bau) | −4 % |
| Berceau / longueur | 0,06 à 0,08 | 0,06 au maître-bau, 0,11 à 0,13 aux bouts | tient |

Hors tout / longueur (0,63) : se juge avec la tour-moulin (E5) et la pose composée (E8).

## Écarts restants

- Référence en aperçu seulement : planche référence / modèle à refaire quand la pleine taille sera
  déposée.
- Pavois en ressauts francs au lieu d'une lisse en rampe : une rampe ne se contrôle pas par la règle des
  planchers (sur la pente, la mesure compare le plancher aux sommets de la crête voisine).
- Pavois de 1,1 m (memory.md visait 0,9 m) et rambardes de 1,27 m : plus haut que le saut du joueur,
  avec 7 cm de marge seulement. Toute surface plus haute que le pont près du pavois (marches, seuils des
  pièces suivantes) demande de refaire le contrôle de saut.
- Pointe de la proue (z > 28) inaccessible, fermée par une rambarde : trop effilée pour un pont.
- Coussin de mousse des rochers de pied en fine bande (copie à l'identique de `mousse` de MON-014).
- Faces à l'ombre : comme pour BAT-013, l'ombre globale (`uShadowTint`) tire vers le violet ; le réglage
  `warmShadow` du matériau `struct` demande l'accord de l'utilisateur et n'est pas touché.
- Plaques de cuivre peu contrastées à l'ombre (`#cf8f5c` sur `#b8875a`).
- Version allégée : la bascule par distance relève de l'intégration (E8, E9).
- Pas de capture en jeu : la pièce sera posée en E8.

## Captures (27/10/2026, catalogue)

- `captures/navire-coque-6vues.png`, `captures/navire-coque-allege-6vues.png`
- `captures/navire-coque-reference-vs-modele.png` (aperçu de la référence)
- `captures/navire-coque-gros-plans.png` (3e tour) : proue et cuivres, poupe, pont et ressaut, berceau à
  hauteur d'homme, pont à hauteur d'homme, gaillard et rambarde de la pointe.
- `captures/navire-coque-beaupre.png` : bitte et pied du beaupré, après le 3e tour.

## Historique

- 27/10/2026 : création (forteresse-navire, étape E2). 1er tour d'Evis-critique « à reprendre » :
  berceau en caisses lisses et lavande, pavois traversable (chute de 20 m), planches de 2,2 m. Corrigé :
  roche propre et rochers déformés, planchers de pavois sur une lisse en coussin et ressauts francs,
  rambardes à 1,1 m, pont jusqu'au pavois, 22 planches ; hublots simplifiés et moins de rivets pour
  tenir le budget.
  2e tour « à reprendre » : corps du joueur 0,29 m dans le pavois, pavois franchissable d'un saut,
  coulures du berceau en plaques plates. Corrigé : planchers de crête recentrés, pavois à 1,1 m et
  rambardes à 1,27 m, rambarde de la pointe avancée à z = 28, coulures chanfreinées, effilées et enfoncées
  dans la roche. 3e tour « à reprendre » pour un seul point (pied du beaupré qui flotte au-dessus du
  gaillard), corrigé selon sa proposition (bitte de beaupré) et vérifié en gros plan ; Evis-critique
  n'avait pas d'autre objection. Mesures : aucune règle en échec, 11 966 / 4 336 triangles.
- 01/11/2026 : **coque abaissée** à la demande de l'utilisateur (« réduire la coque », option « moins
  haute ») : pont principal de 20 à 13 m (`HAUT_PONT` de `physique.js`), quilles des stations × 0,65 ;
  ce qui suit le pont garde son écart au pont (galerie de poupe, beaupré), ce qui est peint sur la coque
  est mis à l'échelle × 0,65 (plaques de cuivre, hublots à 11,4 m, fenêtres du tableau, cordages du
  beaupré). Largeur et longueur inchangées : les pièces du pont restent en place (dy = `pont(z)`). Mesures :
  aucune règle en échec, 11 814 triangles, gabarit 19,35 × 23,16 × 75,55. Détails de forteresse ajoutés
  à part (BAT-020, `navire-fort`). Pas de nouvelle revue Evis-critique.
