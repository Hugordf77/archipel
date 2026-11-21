# Arbre pompon — ARB-001

Dossier `src/models/arbres/arbre-pompon/` · Arbres · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| ARB-001 | Arbre pompon | Validé | `kind:arbre_pompon` | 4,29 × 4,72 × 4,26 | — |

## DA retenue

- **Tronc** : un seul tube lisse (`troncRameux` de `kit/vegetal.js`), courbe, évasé au pied (1,5 × r0 sous
  le sol), effilé de 0,24 à 0,15 m jusqu'à la fourche à 1,9 m ; trois racines rondes qui naissent bas
  dans le pied et s'enfoncent à 2 à 2,6 × r0 ; quatre branches maîtresses, une par masse, qui partent
  10 cm sous la fourche et s'arrêtent dans la masse (on les voit dans les trouées).
- **Houppier** : quatre masses franches (`couronneMasses`, sans touffes satellites), trois autour à 2,15
  à 2,3 m et une au sommet à 3,25 m, rayons 1,0 à 1,05 m, écartées pour laisser des trouées de ciel ;
  verts `#8fd08a`, `#86c884` (masse à l'ombre), `#a6dc92` (sommet).
- **Enveloppe** calée sur la forme lointaine (`farveg.js`, `SHAPES.arbre_pompon` : 1,25 à 4,1 m de haut,
  1,5 m de rayon) : pas de saut au changement de LOD ; ombre portée : une couronne de 1,5 m.
- 374 triangles (210 avant).

Règles communes : `docs/DA.md`.

## Écarts restants

- **Physique / forme** en échec : encombrement 0,55 m pour un pied visible de 0,33 m (68 % d'écart, 117 %
  avant). Ramener l'encombrement vers 0,40 m (`physique.js`) change le placement des arbres dans tout le
  monde : décision de l'utilisateur.
- Coût en forêt : la Forêt des souvenirs passe de 4,17 à 4,94 M triangles par image (5 752 pompons
  dessinés) ; version allégée au loin prévue (lot D du chantier arbres).
- Même forme pour tous les individus (taille et orientation seules) ; variantes prévues (lot D).

## Historique

- 18/10/2026 : fiche créée.
- 21/11/2026 : arbres en détail, lot B : tronc évasé, racines, branches maîtresses, houppier en quatre
  masses avec trouées ; revue Evis-critique (houppier « brocoli », racines en planches, houppier trop haut
  par rapport à la forme lointaine) prise en compte. Captures `captures/arbres-b3-pompon-*`, planche
  `captures/arbres-lotB-planche.png`.
- 21/11/2026 : lot C (aide partagée) : branches effilées en pointe et plus avant dans les masses (plus de
  bout coupé) ; toujours 374 triangles. Planche `captures/arbres-c2-pompon-6vues.png`.
