# Cerf — ANI-004

Dossier `src/models/animaux/cerf/` · Animaux · modèle vedette · pas de planche : description de la commande du
19/10/2026 (cerf de jeu cosy, élancé mais attendrissant, famille de la vache et du mouton)

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| ANI-004 | Cerf | À retravailler (en attente du verdict d'Evis-critique) | `species:cerf` | 0,86 × 2,16 × 1,51 | 6 000 triangles (allégé : 2 500) |

## Exceptions accordées par l'utilisateur (19/10/2026)

- **Pattes visibles de 40 à 45 % de la hauteur au garrot**, au lieu des 25 à 35 % de `docs/DA.md` : un cerf élancé.
  L'exception est écrite dans la fiche (`exceptions: { pattes: [0.4, 0.45] }`) ; `mesure.mjs` la lit, l'applique et
  l'affiche (« exception de la fiche : 40 à 45 % »).
- **Budget propre** : 6 000 triangles de près, 2 500 au plus pour la version allégée au-delà de 20 m.

## DA retenue

Reprise complète du 19/10/2026, G étant la hauteur au garrot (0,97 m avant l'échelle 1,2, soit 1,16 m).

- **Corps d'un seul tenant** : union lisse (`union`, kit) de la cage thoracique, des épaules et du garrot, d'un
  poitrail profond, des reins, d'une croupe ronde, d'un ventre qui remonte vers les cuisses (taille marquée), des
  cuisses et des avant-bras. Maillé en grille à zones (`grilleZones`, nouvelle aide du kit, 28 × 20) : le ventre et
  l'intérieur des cuisses sont crème sur une bande de méridiens qui s'élargit sous le ventre et se resserre entre les
  cuisses ; le miroir blanc est sur les derniers parallèles autour de la queue. Bords nets, sans fente, sans boule
  posée.
- **Taches d'été** : quatorze petites taches claires (`patch`) en deux rangées de part et d'autre de l'échine, du
  garrot à la croupe, à demi teintées par la robe (tint 0,35).
- **Cou articulé** : pièce `neck` (pivot dans le poitrail, incliné de 0,48 rad, long de 0,5 m avant l'échelle),
  union élancée, large à l'attache ; elle porte la tête (`parent`). Peau du corps, du cou et de la tête sous un même
  identifiant : pas de trait d'encre aux raccords. Tache crème de la gorge (`patch`) sous la mâchoire.
- **Broutage** : cou 2,15 rad, tête −0,95 rad ; museau à 5 cm du sol, tête jamais sous le sol, bois au-dessus.
- **Tête d'un seul tenant** : union du crâne rond, d'un front large, des joues, des arcades, d'un museau court au bout
  arrondi, de la mâchoire et d'une truffe bombée, chanfrein incliné de 40°. Grille à zones dont le pôle est au centre
  de la truffe : truffe brun sombre `#5c4442` (jamais noire), puis bout du museau et menton crème, sur des parallèles
  (bord net). Naseaux en virgules sombres, petit reflet sur la truffe. Longueur de la tête (peau) : 44 % du corps.
- **Yeux en amande** : perles sombres allongées le long du visage (1,45 × 0,88), coin avant plus bas, reflet posé sur
  la perle.
- **Oreilles** : grandes feuilles creusées (`leafGeo`, 19 cm), portées sur les côtés et un peu relevées, intérieur rosé
  `#f0cdbf` vers l'avant, contour séparé de la tête.
- **Bois** : pivot en peau (identifiant de la tête), meule en anneau (`anneauGeo`, 6 × 12) ; merrain en `limb` à
  8 côtés, rayons par point (3 cm à 1,2 cm), qui part vers l'arrière et l'extérieur puis remonte vers l'avant ; trois
  andouillers vers l'avant (œil, chevillure, empaumure), pointes arrondies, crème-beige `#e7d4ae`. Meule, merrain et
  andouillers d'un même bois partagent leur identifiant ; un trait les sépare de la tête.
- **Pattes** : tubes lisses (`limb`, 8 côtés, un anneau par point) aux rayons marqués (coude, genou, canon, boulet,
  paturon) ; jarret en angle à l'arrière. Elles sortent du dessous du corps (jonction à 0 cm). Deux onglons sombres
  arrondis `#4a3c3a` par pied (`onglonGeo`, nouvelle aide du kit, 10 × 4), fente nette. Pas d'ergots : à cette taille,
  ils se lisaient comme des points détachés.
- **Queue** courte (`limb`, 10 côtés), dos teinté, dessous blanc (côtés du tube), un peu aplatie ; elle remue.
- **Robes** : fauve d'été `#c98f5f`, brun d'hiver `#8d6a52` (pelage `tint 1`) ; ventre, gorge, bout du museau et
  intérieur des cuisses crème `#f3e3c8`, miroir `#fbf3e4` (`tint 0`). Rien de plus sombre que l'encre des yeux.
- **Version allégée** (au-delà de 20 m) : mêmes 8 pièces, pivots, animations et parents ; mêmes zones et mêmes taches,
  moins de facettes ; sans naseaux ni reflet de truffe. 2 184 triangles.
- **Physique** : comme la vache, pas de `physique.js` : le jeu ne fait buter ni le joueur ni la faune sur les animaux
  (`okAt` ne regarde que le relief et l'eau ; `obstacleAt` ne lit que les obstacles fixes des îles).
- **En jeu** : Île aux Mille Fleurs (un cerf, clairière), farouche (`shy: 7`), il s'écarte du joueur.

Mesures (`node scripts/modeles/mesure.mjs ANI-004`) : 8 pièces (allégé : 8), 5 909 triangles fin et 2 184 allégé,
gabarit 0,86 × 2,16 × 1,51 m, pattes / garrot 42 % (exception de la fiche), jonctions patte-corps à 0 cm, tête / corps
84 % (pièce de tête entière, bois compris), museau à 1,29 m au repos et 0,05 m en broutant, aucune facette, aucun
noir. Toutes les lignes sont en ✓.

Proportions face à la description (G = 1,16 m) :

| Mesure | Cible | Avant (17/10) | Modèle | Écart |
| --- | --- | --- | --- | --- |
| Pattes visibles (sous le poitrail) | 0,40 à 0,45 G | 0,67 G | 0,42 G | dans la fourchette |
| Pattes arrière visibles (sous la cuisse) | — | — | 0,48 G | plus longues (taille remontée) |
| Longueur de la tête (peau) / corps | ≈ 45 % | tête et cou d'une pièce | 44 % | −2 % |
| Profondeur du corps | poitrail profond | 0,41 G | 0,59 G | voulu |
| Longueur du corps | — | 0,95 G | 0,94 G | — |
| Haut des bois | — | 1,82 G | 1,86 G | — |
| Envergure des bois | — | 0,73 m | 0,86 m | — |
| Museau en broutant | < 12 cm | 26 cm | 5 cm | tenu |
| Jonctions patte-corps | < 3 cm | 7,9 cm | 0 cm | tenu |
| Primitives à facettes | 0 | 2 | 0 | tenu |
| Triangles fin / allégé | ≤ 6 000 / ≤ 2 500 | 1 376 / — | 5 909 / 2 184 | tenu |

Règles communes : `docs/DA.md`.

## Écarts restants

- **Taches sur la robe d'hiver** : la commande veut des taches l'été et aucune l'hiver. Les robes ne sont qu'une teinte
  par instance : tous les cerfs partagent la même géométrie, et aucune teinte ne peut effacer une tache sur le brun
  sans l'assombrir sur le fauve. Les taches sont donc à demi teintées (tint 0,35) : claires sur le fauve, plus
  discrètes sur le brun, mais présentes l'hiver. Pour les retirer, il faudrait une géométrie par robe dans
  `src/entities/fauna/islandFauna.js`, hors du dossier du modèle.
- **Gorge** : tache crème sous la mâchoire (`patch`, contour lobé), et non une bande le long du cou. Une bande de
  méridiens faisait une étiquette à bords droits. Vu de profil, le contour lobé est un peu dentelé.
- **Profondeur du gabarit** : 1,51 m, soit −11 % sur la cible du test (1,7 m ± 15 %). Le cerf est plus ramassé que
  l'ancien (1,92 m) : corps de 0,94 G, tête portée haut.
- **Raccords** : la peau du cou entre dans le poitrail et dans la tête sans trait (identifiant partagé), mais un léger
  pli d'ombrage marque les croisements, comme sur la vache. Les pattes, pièces animées, ont leur trait à la sortie du
  ventre, avec de petites dents d'encre au bord du tube.
- **Broutage** : le cou plie de 123°. Tête baissée, il sort du bas du poitrail. À mi-course, le museau passe à 0,63 m
  et la tête paraît un peu basse.
- **Bois de face** : les andouillers pointent vers l'avant et se cachent derrière le merrain. De face, la silhouette
  est un V à fourches, et l'empaumure ne se lit que de 3/4 et de profil. La meule est un anneau lisse, sans perlures.
- **Entrejambe** : l'union lisse comble l'espace entre les cuisses. Vue de derrière et de dessous, une peau crème relie
  les cuisses jusqu'à mi-hauteur.
- **Version allégée** : 2 184 triangles, soit 37 % de la fine (le test exige moins de 40 %). La marge est faible si la
  version fine baisse.
- **Sans planche** : les proportions sont tenues contre la description seule. Une planche 6 vues permettrait des écarts
  chiffrés en cm, comme pour la vache.
- **Première construction** : environ 0,1 s (fine et allégée, mesurée sous Node), mémorisée ensuite. C'est un léger
  à-coup à l'arrivée sur l'Île aux Mille Fleurs.

## Historique

- 17/10/2026 : ANI-004 validé au catalogue.
- 18/10/2026 : fiche créée.
- 19/10/2026 : refonte complète d'après la description (tour 1). Corps d'un seul tenant (union lisse, grille à zones :
  ventre, intérieur des cuisses, miroir), cou articulé qui porte la tête, tête d'un seul tenant à truffe brune et bout
  crème, yeux en amande, grandes oreilles creusées, bois en `limb` à trois andouillers et meule, pattes fines (exception
  40 à 45 % du garrot) à onglons fendus, queue blanche dessous, taches d'été, version allégée. 5 909 triangles (allégé :
  2 184).
