# Archipel

Un jeu d'exploration 3D en Three.js où l'on découvre un archipel de neuf îles, récolte des
ressources, aménage son île et navigue entre des paysages peints. Le rendu pastel et les formes
douces gardent une ambiance chaleureuse et contemplative.

## Lancer le jeu

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 (Chrome, Safari ou Firefox récents, WebGL2 requis).

Version de production : `npm run build` puis `npm run preview`.

Catalogue des modèles 3D : `npm run catalogue` (ouvre http://localhost:5173/catalogue.html).

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
- `src/entities/locomotion/` :
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

## Archipel

Le monde est un archipel fini : un carré de 2,4 × 2,4 km, l'île de départ au centre et neuf îles
fixes, une par archétype. `src/world/archipel.js` est la seule source de vérité : nom, position,
rayon, biome, graine et retouches de chaque île, ainsi que les éléments de la mer.

| Île | Identifiant | Archétype · biome | Centre (x, z) | Rayon |
| --- | --- | --- | --- | --- |
| Village de Pommeraie | `village-pommeraie` | village au moulin · prairie | (−170, 400) | 80 m |
| Île aux Mille Fleurs | `ile-aux-mille-fleurs` | champs de fleurs · prairie | (250, 430) | 66 m |
| Rocher Percé | `rocher-perce` | îlot-curiosité · glace | (−320, −330) | 42 m |
| Falaises de Nacre | `falaises-de-nacre` | falaises au phare · tropical | (760, −160) | 74 m |
| Mont des Aigles | `mont-des-aigles` | montagne · pins | (−700, −480) | 135 m |
| Bois des Lanternes | `bois-des-lanternes` | forêt profonde · champignons | (−820, 160) | 100 m |
| Cratère de Braise | `cratere-de-braise` | cratère · volcan | (180, −820) | 95 m |
| Dunes du Mirage | `dunes-du-mirage` | dunes · dunes | (820, 330) | 88 m |
| Lagon Turquoise | `lagon-turquoise` | lagon · atoll | (640, 700) | 72 m |

- **Génération** : relief, eau, végétation, lieux et chemins restent produits par la chaîne de
  `src/world/islands/gen/` (dans un Web Worker), mais pour cette liste fixe. Les retouches à la main
  passent par `overrides` : `pois` (lieux imposés), `removePois` (lieux interdits), `name`, `traits`
  (nom du village, couleur du moulin, curiosité…).
- **Niveaux de détail** : toutes les silhouettes sont chargées au démarrage, puis l'île entière à 4 m
  (moins de 600 m) et les tuiles au mètre (moins de 220 m).
- **Mer** : 48 éléments à positions fixes (bouées, bouteilles, caisses, algues, récifs, bancs de
  poissons).
- **Limite du monde** : dès 1,1 km du centre, la brume du large referme la vue ; au-delà de 1,2 km,
  un courant doux ramène le bateau (et l'albatros) vers l'archipel ; au-delà de 1,4 km, demi-tour
  automatique. Le radeau va jusqu'à 600 m, la barque jusqu'à 1 050 m, voilier et goélette jusqu'à la
  limite.
- **Carte et journal** : la carte est bornée à l'archipel (« Tout l'archipel » le montre en entier),
  les îles inconnues y sont en pointillés ; le journal compte « X / 9 îles » et la part de
  l'archipel découverte.
- **Migration** (`GEN_VERSION` 3) : une sauvegarde du monde infini rattache chaque île de son journal
  à l'île de l'archipel du même archétype ; récoltes, terrassements, éléments marins ramassés,
  épingles et brouillard sont ramenés à l'archipel.

Tests : `tests/world.test.js` (archipel, limite du large avec le vrai bateau, migration, et la chaîne
de génération sur les 9 îles et 45 variantes), `tests/marine.test.js`.

## Catalogue des modèles

`npm run catalogue` ouvre le catalogue numéroté de tous les modèles 3D du jeu (196 aujourd'hui), pour
les voir, les comparer et les retravailler.

- **Registre** : `src/models/registry.js`. Chaque modèle a un identifiant stable (préfixe de
  catégorie et trois chiffres, jamais réattribué ; un modèle retiré passe au statut « retiré »), son
  constructeur, ses variantes et paramètres, sa taille mesurée, les îles qui l'emploient et un
  statut. Préfixes : ARB arbres, PLA plantes, ROC rochers et minerais, BAT bâtiments, STR ouvrages,
  MON ruines et monuments, NAV bateaux et épaves, DEC décor achetable, OBJ objets, ANI animaux,
  PER personnage.
- **Règle** : tout constructeur de modèle vit dans `src/models/` (par catégorie) ; le jeu et le
  catalogue l'importent depuis le même endroit, avec les mêmes réglages de matériaux
  (`src/models/materials.js`).
- **Site** : barre latérale (catégories, recherche, filtres de statut), grille de vignettes peintes
  (un seul renderer partagé, rendu paresseux, cache IndexedDB par empreinte du code source).
- **Fiche** : vue 3D en orbite, grille au mètre, silhouette de 1,4 m, lumière jour / soir / nuit,
  rendu du jeu ou rendu brut, fil de fer, boîte cotée, statistiques (triangles, sommets, matériaux,
  appels de dessin), variantes, paramètres et animations. « Copier l'id », « Ouvrir la source »
  (VS Code, à la ligne du constructeur).
- **Travail** : statut et notes de chaque modèle, enregistrés dans `catalogue/notes.json`
  (versionné) par le serveur de dev ; comparaison de 2 à 4 modèles à la même échelle ; exports CSV
  et JSON de l'inventaire, planche contact PNG d'une catégorie (rangée aussi dans `captures/`).
  Modifier un constructeur met la fiche et les vignettes à jour sans recharger la page.
- **Relevés** : après un changement voulu d'un modèle, `npm run modeles:releve` remesure les tailles
  et recense l'usage de chaque modèle sur les neuf îles.

Tests : `tests/models.test.js` (identifiants, constructions, tailles à ±25 %, recensement de tout
ce que le jeu construit) et `tests/catalogue-notes.test.js`.

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
  app/        point d'entrée, réglages de départ, Game (orchestration), caméra
  core/       globales et uniforms, aléatoire, bruit, sauvegarde, clavier, manette
  world/      archipel.js, navigation, mer, brouillard de la carte
    home/     île de départ : relief, aménagements, détails, fleurs
    env/      eau, ciel, météo, journée, saisons, rivières
    islands/  îles de l'archipel : descriptions, LOD, Worker
      gen/    relief, érosion, hydrologie, zones, lieux, chemins, végétation, faune
  entities/   joueur, personnage, locomotion, faune, bateau, hibou, vol
  gameplay/   récolte, interactions, inventaire, trésors, décor posé
  models/     registre et constructeurs 3D par catégorie : vegetation, buildings, structures,
              animals, boats, decor, props, character ; matériaux, palette, assemblage
  render/     pipeline de peinture, builder, feuillage, herbe, textures, shaders
  ui/         interface du jeu et panneaux
  audio/      moteur audio procédural
  data/       objets, recettes
catalogue/    site du catalogue des modèles (catalogue.html à la racine), notes.json
scripts/      relevé des modèles (tailles, usage)
tests/        Vitest
```

## Sauvegarde

La progression est enregistrée automatiquement dans le navigateur. La sauvegarde contient les
différences persistantes du joueur (récoltes, terrassements, découvertes), rangées par identifiant
d'île, plutôt que la géométrie des îles. Les données de génération sont versionnées pour appliquer les migrations nécessaires au
chargement d'une ancienne sauvegarde.

Three.js est épinglé en version 0.170.0, Vite en 5.4.11, polices Fredoka et Nunito embarquées.
