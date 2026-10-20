# Graph Report - src  (2026-10-20)

## Corpus Check
- 282 files · ~244,925 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1719 nodes · 5356 edges · 74 communities (58 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Lieux et ouvrages (modèles)
- Moteur de locomotion du joueur
- Végétation et Builder
- Décor et objets posés (modèles)
- Fiches et index des modèles
- Faune de départ et hibou
- Moteur audio procédural
- Manette DualSense
- Bateaux et navigation à voile
- Matériaux toon et aléatoire
- Cerf (modèle)
- Relief de l'île de départ
- Pose et retours de locomotion
- Vache (modèle)
- Plan d'île : lieux, chemins, apparitions
- Avatar, miroir et boutique
- Surface et tuiles des îles
- Fleurs de l'île de départ
- Récolte et filet
- Monde, eau et feuillage
- Carte, minicarte et régions
- Boucle de jeu et sauvegarde
- Physique des modèles (encombrement)
- Gestionnaire d'îles : végétation
- Interface (UI, DOM)
- Personnage : corps et coupes
- Pipeline de rendu peint
- Saisons, archipel et limites
- Navigation et obstacles
- Gestionnaire d'îles : activation
- Terrain, hydrologie, érosion
- Outils de récolte
- Zones et bruit
- Vol de l'aigle (AirRide)
- Personnage (Character)
- Réglages et écriture de sauvegarde
- Objets et inventaire (UI)
- Mouton et laine
- Ciel, textures et caméra
- Visage du personnage
- Inventaire (logique)
- Kit : accessoires (yeux, pattes)
- État de sauvegarde (state)
- Relief des îles
- Bateaux échoués et étals
- Registre et relevés
- Cycle jour et nuit
- Kit : formes (taches, grilles)
- Faune des îles
- Petite végétation
- Caméra (CameraRig)
- Interactions et visée
- Décor posé (logique)
- Assemblage des modèles
- Worker du monde et biomes
- Entrées clavier
- Atlas du visage
- Rivières et LOD des tuiles
- Pièces de lieux et planchers
- Météo
- Géométrie accumulée des îles
- Préchargement des modèles
- Brouillard de la carte
- Barre d'outils
- Tenues et accessoires du personnage
- Budgets des modèles
- Pièces communes du personnage
- Visibilité des objets d'île
- Point d'entrée

## God Nodes (most connected - your core abstractions)
1. `fiche()` - 102 edges
2. `G` - 102 edges
3. `lire()` - 87 edges
4. `Builder` - 76 edges
5. `Game` - 59 edges
6. `AudioEngine` - 49 edges
7. `bx()` - 48 edges
8. `toonMaterial()` - 43 edges
9. `groundAt()` - 43 edges
10. `h()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `buildAvatarGeometry()` --references--> `W`  [EXTRACTED]
  models/personnage/corps/index.js → data/harvest.js
- `vache()` --indirect_call--> `h()`  [INFERRED]
  models/animaux/vache/index.js → ui/dom.js
- `construire()` --indirect_call--> `h()`  [INFERRED]
  models/bateaux/commun.js → ui/dom.js
- `buildProps()` --indirect_call--> `col()`  [INFERRED]
  world/home/props.js → models/kit/vegetal.js
- `flowerGeometry()` --indirect_call--> `h()`  [INFERRED]
  models/plantes/fleurs/index.js → ui/dom.js

## Import Cycles
- 3-file cycle: `entities/character/Character.js -> models/personnage/index.js -> models/personnage/corps/index.js -> entities/character/Character.js`
- 3-file cycle: `entities/character/Character.js -> models/personnage/index.js -> models/personnage/coupes/index.js -> entities/character/Character.js`
- 4-file cycle: `entities/character/Character.js -> models/personnage/index.js -> models/personnage/crayon/index.js -> models/personnage/coupes/index.js -> entities/character/Character.js`
- 4-file cycle: `entities/character/Character.js -> models/personnage/index.js -> models/personnage/corps/index.js -> models/personnage/coupes/index.js -> entities/character/Character.js`

## Communities (74 total, 16 thin omitted)

### Community 0 - "Lieux et ouvrages (modèles)"
Cohesion: 0.06
Nodes (57): arbreGeant(), epave(), ancre(), boueeEchouee(), cabane(), moulinEau(), moulin(), observatoire() (+49 more)

### Community 1 - "Moteur de locomotion du joueur"
Cohesion: 0.07
Nodes (62): AIR, airStep(), arriveIntent(), bonk(), bonkStep(), canJump(), clamp(), climbable() (+54 more)

### Community 2 - "Végétation et Builder"
Cohesion: 0.09
Nodes (51): arbreFruitier(), arbrePompon(), bambou(), bouleau(), arbreCerisier(), champiGeant(), pin(), pine() (+43 more)

### Community 3 - "Décor et objets posés (modèles)"
Cohesion: 0.07
Nodes (44): grandArbre(), grandArbreClumps(), trunkAlong(), bibliotheque(), chaumiere(), echoppe(), chantier, couture (+36 more)

### Community 4 - "Fiches et index des modèles"
Cohesion: 0.13
Nodes (19): fiche(), ILE_DEPART, outil(), PREFIXES, species(), birdParts(), part(), quad() (+11 more)

### Community 5 - "Faune de départ et hibou"
Cohesion: 0.05
Nodes (41): Fauna, makeButterfly(), makeCrab(), makeGull(), Parts, rand(), skeleton(), _zero (+33 more)

### Community 6 - "Moteur audio procédural"
Cohesion: 0.10
Nodes (3): AudioEngine, midiToHz(), rand()

### Community 7 - "Manette DualSense"
Cohesion: 0.08
Nodes (13): _aim, BTN, center(), GamepadInput, identifyController(), PAD_DEFAULTS, padName(), pickFocus() (+5 more)

### Community 8 - "Bateaux et navigation à voile"
Cohesion: 0.08
Nodes (25): damp(), idealTrim(), lerpAngle(), pointOfSail(), Sailing, smoothDamp(), caracteristiques, dessin() (+17 more)

### Community 9 - "Matériaux toon et aléatoire"
Cohesion: 0.11
Nodes (21): nextId(), hashString(), mulberry32(), damp(), _zero, Collectibles, seeded(), SPECIES (+13 more)

### Community 10 - "Cerf (modèle)"
Cohesion: 0.06
Nodes (41): ANDOUILLERS, ARRIERE, AVANT, avec(), AXE_TETE, axis, C0, CC (+33 more)

### Community 11 - "Relief de l'île de départ"
Cohesion: 0.14
Nodes (34): parasolPlage(), transat(), blocked(), buildGrass(), rng(), slopeAt(), terrainColorSampler(), tuftGeometry() (+26 more)

### Community 12 - "Pose et retours de locomotion"
Cohesion: 0.12
Nodes (25): LocoFeedback, airPose(), bankAngle(), blendGait(), bonkPose(), clamp(), crouchPose(), fallenPose() (+17 more)

### Community 13 - "Vache (modèle)"
Cohesion: 0.07
Nodes (36): ARRIERE, AVANT, AXE_TETE, axis, CC, COL, CORPS, CR (+28 more)

### Community 14 - "Plan d'île : lieux, chemins, apparitions"
Cohesion: 0.12
Nodes (30): weighted(), islandTraits(), placeFlora(), bilinear(), stableId(), sealLakes(), buildPaths(), costGrid() (+22 more)

### Community 15 - "Avatar, miroir et boutique"
Cohesion: 0.13
Nodes (27): CLOTH_COLORS, CLOTH_NAMES, defaultAvatar(), EYES, HAIR_COLORS, HAIRS, index(), pick() (+19 more)

### Community 16 - "Surface et tuiles des îles"
Cohesion: 0.12
Nodes (28): FOREST_TREES, SLOPE_MAX, ZONE_TABLE, KIND_INDEX, KIND_RADIUS, KINDS, SMALL, TREES (+20 more)

### Community 17 - "Fleurs de l'île de départ"
Cohesion: 0.11
Nodes (12): MAT, archeGlycine(), lavandeGeante(), C, Flowers, Grid, pickWeighted(), rng() (+4 more)

### Community 19 - "Monde, eau et feuillage"
Cohesion: 0.15
Nodes (16): buildClumpGeometry(), buildShadowProxies(), rng(), buildLake(), buildOcean(), buildPond(), buildRiver(), buildWaterfall() (+8 more)

### Community 20 - "Carte, minicarte et régions"
Cohesion: 0.15
Nodes (20): pick(), fmtKm(), openLogbookPanel(), islandShape(), openMapPanel(), shapeCache, contexts, MiniMap (+12 more)

### Community 23 - "Gestionnaire d'îles : végétation"
Cohesion: 0.09
Nodes (21): CAP_COLORS, ROCKY, ACC_ATTRS, _bc, bloomColor(), BLOOMS, _bp, _c (+13 more)

### Community 24 - "Interface (UI, DOM)"
Cohesion: 0.15
Nodes (3): h(), replay(), UI

### Community 25 - "Personnage : corps et coupes"
Cohesion: 0.20
Nodes (18): CHAR_IDS, FACE, B, box(), ID, mixHex(), PARENT, tint() (+10 more)

### Community 26 - "Pipeline de rendu peint"
Cohesion: 0.12
Nodes (7): fsCam, fsGeo, FSPass, makeRT(), Pipeline, QUALITY, SunShadow

### Community 27 - "Saisons, archipel et limites"
Cohesion: 0.13
Nodes (17): JOURS, MOIS, KINDS, openCartographerPanel(), smooth(), worldLimit(), applySeason(), AUTUMN (+9 more)

### Community 28 - "Navigation et obstacles"
Cohesion: 0.17
Nodes (18): ORIGIN, addObstacle(), addObstacles(), blockedByObstacle(), canStand(), cellKey(), _co, _d (+10 more)

### Community 30 - "Terrain, hydrologie, érosion"
Cohesion: 0.20
Nodes (15): hydraulic(), thermal(), MinHeap, accumulate(), carveRivers(), chaikin(), DI, DJ (+7 more)

### Community 31 - "Outils de récolte"
Cohesion: 0.15
Nodes (16): flowerItemFor(), HARVEST, rollBug(), rollDrops(), rollFish(), strikeTime(), TIER_NAMES, TOOL_NAMES (+8 more)

### Community 32 - "Zones et bruit"
Cohesion: 0.18
Nodes (17): fbm(), GX, GY, makeNoise(), distanceField(), slopeAt(), BLOOM, BLOOM_COLORS (+9 more)

### Community 33 - "Vol de l'aigle (AirRide)"
Cohesion: 0.24
Nodes (5): AirRide, damp(), bridgeY(), groundAt(), pickGround()

### Community 34 - "Personnage (Character)"
Cohesion: 0.19
Nodes (4): Character, damp(), REST, crayonGeometry()

### Community 36 - "Réglages et écriture de sauvegarde"
Cohesion: 0.23
Nodes (13): CHANNEL_LABELS, CHANNELS, PENTA, exportSave(), loadSave(), openDB(), readImportFile(), writeSave() (+5 more)

### Community 37 - "Objets et inventaire (UI)"
Cohesion: 0.17
Nodes (11): BUGS, FISH, itemIcon(), ITEMS, SHAPES, STATION_NAMES, TIERS, TOOLS (+3 more)

### Community 38 - "Mouton et laine"
Cohesion: 0.16
Nodes (15): CURL_COAT, CURL_COAT_LITE, EAR, EAR_IN, EAR_IN_LITE, EAR_LITE, espece, _up (+7 more)

### Community 39 - "Ciel, textures et caméra"
Cohesion: 0.24
Nodes (11): U, canvas(), cloudAtlas(), leafAtlas(), paperTexture(), rng(), tileNoise(), buildClouds() (+3 more)

### Community 40 - "Visage du personnage"
Cohesion: 0.17
Nodes (11): BASE, buildDust(), FIDGETS, PuffPool, BLINKABLE, cellUV(), EXPRESSIONS, EYE (+3 more)

### Community 42 - "Kit : accessoires (yeux, pattes)"
Cohesion: 0.23
Nodes (15): chevre(), mouton(), anneauGeo(), BELL, clocheSuisse(), collar(), collier(), eye() (+7 more)

### Community 43 - "État de sauvegarde (state)"
Cohesion: 0.19
Nodes (14): createDefaultState(), dayKeyOf(), LEGACY_KEYS, LEGACY_SETTINGS, legacyHours(), MARINE_IDS, migrate(), randomSeed() (+6 more)

### Community 44 - "Relief des îles"
Cohesion: 0.30
Nodes (12): ridged(), bicubic(), clamp(), cr(), smooth(), baseGrid(), baseHeight(), cache (+4 more)

### Community 45 - "Bateaux échoués et étals"
Cohesion: 0.18
Nodes (7): barque(), barqueAmarree(), barqueEchouee(), etal(), maison(), MURS, v3()

### Community 46 - "Registre et relevés"
Cohesion: 0.18
Nodes (9): FICHES, BY_ID, CATEGORIES, categoryOf(), MODELS, ORDRE, STATUTS, TAILLES (+1 more)

### Community 47 - "Cycle jour et nuit"
Cohesion: 0.18
Nodes (10): canonicalHour(), COLOR_FIELDS, DayCycle, grey, KEYS, MOON_LIGHT, MOON_SKY, PREPARED (+2 more)

### Community 48 - "Kit : formes (taches, grilles)"
Cohesion: 0.18
Nodes (11): queue(), rejoue(), rejoue(), affine(), blob(), grille(), grilleZones(), leafGeo() (+3 more)

### Community 50 - "Petite végétation"
Cohesion: 0.22
Nodes (3): Grid, smallVegetation(), Surface

### Community 51 - "Caméra (CameraRig)"
Cohesion: 0.18
Nodes (3): CameraRig, damp(), lerpAngle()

### Community 54 - "Assemblage des modèles"
Cohesion: 0.36
Nodes (11): assembleBuilder(), assembleCreature(), assembleKind(), assemblePart(), flat(), _id, materiaux(), shadowed() (+3 more)

### Community 55 - "Worker du monde et biomes"
Cohesion: 0.23
Nodes (7): BIOMES, buildFarVeg(), hex(), SHAPES, keyOf(), planOf(), plans

### Community 59 - "Rivières et LOD des tuiles"
Cohesion: 0.28
Nodes (4): buildFallFoam(), buildRivers(), riverMaterial(), meshGeometry()

### Community 60 - "Pièces de lieux et planchers"
Cohesion: 0.29
Nodes (6): DIRX, DIRZ, partModel(), rotY(), flat(), partGeometries()

### Community 61 - "Météo"
Cohesion: 0.39
Nodes (3): makePrecip(), seeded(), Weather

### Community 62 - "Géométrie accumulée des îles"
Cohesion: 0.33
Nodes (3): RECOLOR, recolorPart(), GeoAcc

### Community 63 - "Préchargement des modèles"
Cohesion: 0.29
Nodes (3): flowerGeometry(), kindModel(), islandsInRange()

### Community 64 - "Brouillard de la carte"
Cohesion: 0.38
Nodes (6): boundFog(), FOG_TOTAL, inBounds(), regionBits(), reveal(), revealedCount()

## Knowledge Gaps
- **214 isolated node(s):** `JOURS`, `MOIS`, `game`, `PENTA`, `BTN` (+209 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GamepadInput` connect `Manette DualSense` to `Saisons, archipel et limites`, `Interactions et visée`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `IslandManager` connect `Gestionnaire d'îles : activation` to `Visibilité des objets d'île`, `Saisons, archipel et limites`, `Matériaux toon et aléatoire`, `Gestionnaire d'îles : végétation`, `Rivières et LOD des tuiles`, `Pièces de lieux et planchers`, `Géométrie accumulée des îles`, `Préchargement des modèles`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Game` connect `Boucle de jeu et sauvegarde` to `Clics et caresses`, `Jeu : coffres, coquillages, outils dev`, `Point d'entrée`, `Interactions et visée`, `Jeu : touches et panneaux`, `Saisons, archipel et limites`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `JOURS`, `MOIS`, `game` to the rest of the system?**
  _214 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lieux et ouvrages (modèles)` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Should `Moteur de locomotion du joueur` be split into smaller, more focused modules?**
  _Cohesion score 0.07205452775073028 - nodes in this community are weakly interconnected._
- **Should `Végétation et Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.08982456140350877 - nodes in this community are weakly interconnected._