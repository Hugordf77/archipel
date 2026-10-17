# Archipel

Un jeu d'exploration 3D en Three.js où l'on découvre un archipel d'îles procédurales, récolte des
ressources, aménage son île et navigue entre des paysages peints. Le rendu pastel et les formes
douces gardent une ambiance chaleureuse et contemplative.

## Lancer le jeu

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 (Chrome, Safari ou Firefox récents, WebGL2 requis).

Version de production : `npm run build` puis `npm run preview`.

## Commandes

| Action | Clavier | Manette (DualSense, DualShock, Xbox) |
| --- | --- | --- |
| Courir | ZQSD (AZERTY) / WASD (QWERTY) / flèches | stick gauche à fond |
| Marcher | Alt + direction | stick gauche à moitié |
| Sprinter | Maj | L3 (un clic, jusqu'à ce qu'on lâche le stick) |
| Sauter | Espace (maintenu : plus haut) | ✕ quand rien n'est à portée |
| Roulade | C | ◯ |
| Interagir avec l'objet proche | E ou Entrée | ✕ |
| Utiliser l'outil tenu | E | □ |
| Aller quelque part | clic gauche | — |
| Tourner la caméra | glisser la souris · molette pour zoomer | stick droit · L2 / R2 |
| Barre rapide | 1 à 8 | L1 / R1, croix ← → |
| Naviguer / déplacer le bateau | commandes affichées dans le jeu | |

## Déplacements

Le personnage a une vraie locomotion physique, pensée comme dans Zelda ou Mario : on sent son poids,
son élan et l'effort qu'il fait.

- **Trois allures** : marche (jusqu'à 2,6 m/s), course (5,4 m/s), sprint (8,2 m/s). L'accélération
  est forte au départ puis s'adoucit : la course est atteinte en 0,5 s, le sprint en 1 s environ.
- **Inertie de rotation** : le cap tourne par un ressort amorti, avec une vitesse de rotation limitée
  par l'adhérence. En pleine course, un léger coup de stick engage le corps dans une courbe qui
  s'élargit avec la vitesse (≈ 0,4 m en marche, ≈ 1,8 m en course, ≈ 5 m au sprint). Le corps se penche
  vers l'intérieur, dépasse d'environ 1° l'angle visé puis se stabilise. Au sprint, une petite glisse
  latérale accompagne les virages serrés.
- **Dérapage et demi-tour** : en inversant la direction à pleine course, il freine pieds en avant
  (poussière, bruit de frottement, vibration), pivote d'un bond puis repart avec une petite relance.
  Lâcher le stick en plein sprint donne un court dérapage d'arrêt ; en marche, il fait demi-tour sur
  place.
- **Roulade** : elle donne de l'élan (au moins 5,2 m/s, +1,8 m/s). La relancer juste au moment où la
  précédente se termine (fenêtre parfaite de 0,36 à 0,52 s) ajoute +1,2 m/s, jusqu'à 11,5 m/s. La
  vitesse gagnée s'étiole doucement ensuite. Contre un obstacle, il rebondit, sonné, sans dégât.
- **Saut et chute** : saut d'environ 1 m, plus court si on relâche tôt. Le saut est encore accordé
  juste après avoir quitté un rebord, et un appui juste avant l'atterrissage est retenu. Au sprint, on
  fait un saut long. Les rebords de plus de 35 cm font tomber pour de vrai ; les petites marches (40 cm)
  se montent seules. Une chute rapide se termine par une roulade de réception.
- **Trébucher** : au sprint (au-delà de 6,4 m/s), un obstacle bas percuté de face fait basculer
  par-dessus. Ça concerne les buissons, les rochers moyens, les souches, les troncs morts et la
  lavande. Le personnage atterrit à plat ventre, glisse un peu, puis se relève. Saut ou roulade le
  relèvent plus vite. En simple course, l'obstacle arrête sans faire tomber ; les arbres et les
  maisons arrêtent toujours.
- **Pentes et sols** : on ralentit en montée et l'on accélère un peu en descente. On glisse là où l'on
  ne pourrait pas grimper (au-delà de 55°). Le sable freine, l'eau peu profonde éclabousse.
- **Animation** : les pas suivent la distance parcourue. Au sprint, le buste se penche d'environ 24°,
  les avant-bras pompent, les genoux montent et le visage montre l'effort. La tête annonce les virages,
  et les cheveux comme l'écharpe réagissent aux accélérations. La tête suit la course : elle
  accompagne la penchée, hoche à chaque appui et roule avec les hanches. Le champ de vision s'élargit
  un peu au sprint.
- **Chaque pas se sent** : la caméra balance légèrement, et la manette donne une petite vibration
  alternée gauche / droite. Les deux croissent avec la vitesse et se coupent dans les réglages.

**Architecture** :
- `src/game/locomotion/` :
  - `tuning.js` : tous les réglages, en unités SI, avec un profil « Élan réaliste » et un profil
    « Réactif » ;
  - `motor.js` : physique pure, déterministe, au pas fixe de 1/120 s ;
  - `pose.js` : poses pures ;
  - `feedback.js` : sons, bouffées, vibrations et caméra.
- `Player.js` fournit au moteur le sol, l'eau et les collisions, et gère le clic pour aller et les
  sièges.
- `Character.js` applique les poses et lisse les changements de famille de pose par
  inertialisation.

**Réglages** :
- **Réglages → Déplacements** : profil de sensation et secousses de caméra.
- **Réglages → Manette** : vibrations, inversion de l'axe vertical, sensibilité.

Tests : `tests/locomotion.test.js` (moteur et poses) et `tests/gamepad.test.js`.

## Génération des îles

Les îles sont calculées de façon déterministe à partir de la graine de l'archipel. Une même graine
recrée les mêmes régions, reliefs, lieux et ressources. La génération est exécutée dans un Web
Worker afin de laisser le fil principal disponible pour le rendu et les contrôles.

- **Régions** : îles de tailles et biomes variés, voisinage espacé, archétypes distribués pour éviter
  les silhouettes répétitives et présence garantie d'îles remarquables près du départ.
- **Relief et eau** : champs de terrain procéduraux, reliefs par archétype, érosion thermique et
  hydraulique, cuvettes, lacs, rivières et cascades lorsque les conditions le permettent.
- **Zones et lieux** : micro-zones écologiques colorent le terrain ; des points d'intérêt adaptés
  au relief sont reliés par un réseau de chemins praticables.
- **Végétation et faune** : placement déterministe selon le biome, l'altitude et la proximité de
  l'eau ou des lieux. La faune proche est animée, puis simplifiée ou masquée à distance.
- **Détails progressifs** : un niveau de détail lointain donne la silhouette et les repères ; les
  détails proches et les tuiles de terrain sont chargés progressivement autour du joueur.
- **Persistance** : la sauvegarde conserve la graine et les changements du joueur. `GEN_VERSION`
  versionne la génération ; les migrations préservent les découvertes compatibles et réassocient
  les données persistantes aux îles générées par la nouvelle version.

Les temps mesurés par le Worker sont inclus dans ses résultats de génération. La suite Vitest
`tests/world.test.js` couvre notamment le déterminisme, l'intégrité des rivières et des lacs, les
lieux et chemins, la migration, les statistiques de 1 000 îles et les budgets de génération. Les
temps et statistiques sont des mesures de test local, pas une garantie de performance sur chaque
appareil.

## Rendu (shaders GLSL sur mesure)

1. **Toon** : rampe douce à 4 paliers, ombres teintées violet/bleu (jamais noires), rim light chaude,
   ombres portées (PCF matériel), lanternes ponctuelles la nuit.
2. **Peinture** : tenseur de structure → Kuwahara anisotrope 8 secteurs (poids polynomiaux) en
   demi-résolution, traînées de pinceau orientées, accumulation de pigment aux bords, grain de papier.
3. **Contours** : détection sur profondeur, normales et identifiant d'objet (MRT), épaisseur variable,
   encre teintée par la couleur de l'objet, léger tremblement animé.
4. **Monde courbé** : l'horizon plonge comme un rouleau ; ciel et nuages suivent l'horizon courbé.
5. **Eau** : dégradé de profondeur (carte de hauteurs), écume animée, reflets peints, vagues.
6. **Végétation** : herbe instanciée pliée par le vent et le joueur, feuillages en touffes de
   billboards à normales sphériques.
7. **Ciel** : dégradé brossé, nuages billboard, soleil, lune, étoiles ; cycle jour/nuit calé sur
   l'heure réelle et la saison.
8. **Météo** : pluie fine ou neige légère de temps en temps (ou forcée dans les réglages).

Qualités **Bas / Moyen / Haut** dans les réglages, avec une résolution adaptative qui vise 60 images/s.

## Arborescence

```
src/
  main.js, setup.js
  scene/    monde, terrain, eau, ciel, feuillage, herbe, faune, météo, pipeline de rendu
  world/    régions, biomes, noms, modèles, streaming et génération procédurale
    gen/    terrain, érosion, hydrologie, zones, lieux, chemins, végétation et apparitions
  shaders/  morceaux GLSL, matériaux toon/feuillage/herbe, post-process peinture
  game/     jeu, joueur, navigation, récolte, interactions et sauvegarde
  ui/       interface du jeu et panneaux
  audio/    moteur audio procédural
```

## Sauvegarde

La progression est enregistrée automatiquement dans le navigateur. La sauvegarde contient la
graine du monde et les différences persistantes du joueur, plutôt que la géométrie complète des
îles. Les données de génération sont versionnées pour appliquer les migrations nécessaires au
chargement d'une ancienne sauvegarde.

Three.js est épinglé en version 0.170.0, Vite en 5.4.11, polices Fredoka et Nunito embarquées.
