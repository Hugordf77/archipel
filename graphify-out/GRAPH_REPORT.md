# Graph Report - src  (2026-10-22)

## Corpus Check
- 394 files · ~287,653 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2502 nodes · 6523 edges · 171 communities (158 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ace1d3fe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- models/lieux.js
- motor.js
- builder.js
- fiches.js
- toonMaterial
- AudioEngine
- Game
- surface.js
- GamepadInput
- mulberry32
- pose.js
- cerf/index.js
- zones.js
- mapPanel.js
- navigation.js
- forme.js
- vache/index.js
- props.js
- ciel/relief.js
- Player.js
- IslandManager
- corps/index.js
- HerbeSystem.js
- grid.js
- avatar.js
- heightAt
- rig.js
- flowers.js
- Character.js
- Gather
- mouton/index.js
- Game.js
- IslandManager.js
- physique.gen.js
- h
- Sailing.js
- U
- items.js
- Character
- bateaux/commun.js
- Pipeline.js
- World.js
- decor/index.js
- state.js
- Gather.js
- AirRide
- settingsPanel.js
- marine.js
- Inventory
- LocoFeedback
- accessoires.js
- .queueLod1
- IslandFauna
- registry.js
- daycycle.js
- Decor
- Interactions
- Input
- FaceAtlas
- weather.js
- .push
- textures.js
- feedback.js
- Cerf — ANI-004
- Fauna
- Abeille — ANI-018
- Grand albatros (monture) — ANI-028
- Canard — ANI-014
- Chèvre — ANI-002
- Crabe — ANI-010
- Écureuil — ANI-008
- Escargot géant — ANI-023
- Faune depart — ANI-024 à ANI-026
- Flamant rose — ANI-013
- Grenouille — ANI-015
- Hérisson — ANI-007
- Hibou cartographe — ANI-027
- Lapin — ANI-006
- Lézard — ANI-022
- Luciole — ANI-019
- Mouette — ANI-011
- Mouton — ANI-001
- Papillon — ANI-017
- Perroquet — ANI-012
- Phoque — ANI-020
- Pingouin — ANI-021
- Poisson — ANI-016
- Renard — ANI-005
- Tortue — ANI-009
- Vache — ANI-003
- Arbre fruitier — ARB-002
- Arbre géant (lieu) — ARB-015
- Arbre pompon — ARB-001
- Bambou — ARB-011
- Bouleau — ARB-008
- Cerisier — ARB-003
- Champignon géant — ARB-013
- Coniferes — ARB-004 à ARB-006
- Érable — ARB-010
- Fougère arborescente — ARB-012
- Grand arbre de l'île de départ — ARB-014
- Palmier — ARB-007
- Saule — ARB-009
- Barque — NAV-002
- Canots — NAV-005 à NAV-006
- Epaves — NAV-007 à NAV-008
- Goélette — NAV-004
- Mouillage — NAV-009 à NAV-011
- Radeau — NAV-001
- Voilier — NAV-003
- Bibliothèque-souche du hibou — BAT-003
- Cabane d'ermite — BAT-009
- Chaumière du joueur — BAT-002
- Échoppe — BAT-012
- Étal du marché — BAT-011
- Maison de village — BAT-001
- Moulin à eau — BAT-005
- Moulin à vent — BAT-004
- Observatoire — BAT-010
- Phare — BAT-006
- Temple — BAT-008
- Tour de guet — BAT-007
- Ateliers — DEC-014 à DEC-017
- Curiosites — DEC-010 à DEC-018
- Jardin — DEC-001 à DEC-009
- Cercle de pierres — MON-004
- Curiosites — MON-006 à MON-008
- Grotte — MON-003
- Ruines — MON-001 à MON-002
- Statue géante — MON-005
- Campement — OBJ-005 à OBJ-006
- Coffre — OBJ-001 à OBJ-002
- Curiosites — OBJ-003 à OBJ-023
- Flotteur de pêche — OBJ-020
- Lagon — OBJ-010 à OBJ-011
- Mer — OBJ-017 à OBJ-022
- Ruche — OBJ-007
- Tresors — OBJ-012 à OBJ-016
- Arche — STR-011
- Bassin chaud — STR-010
- Cascade — STR-027
- Champs — STR-007 à STR-012
- Chemins — STR-003 à STR-013
- Jetée — STR-001
- Mobilier depart — STR-020 à STR-026
- Mobilier — STR-014 à STR-019
- Ponton — STR-002
- Puits — STR-006
- Accessoires — PER-020 à PER-023
- Corps et visage — PER-001
- Coupes — PER-002 à PER-007
- Crayon d'étude — PER-024
- Outils — PER-025
- Tenues — PER-008 à PER-019
- Bord de l eau — PLA-010 à PLA-011
- Buissons — PLA-001 à PLA-003
- Cactus — PLA-004 à PLA-005
- Champs — PLA-007 à PLA-012
- Fleur géante — PLA-017
- Fleurs — PLA-014 à PLA-015
- Herbe — PLA-016
- Raretes — PLA-018 à PLA-019
- Sous bois — PLA-006 à PLA-013
- Blocs — ROC-001 à ROC-002
- Bois — ROC-007 à ROC-010
- Mineraux — ROC-003 à ROC-006
- budgets.js
- .setTileItemVisible
- ruines/physique.js

## God Nodes (most connected - your core abstractions)
1. `fiche()` - 102 edges
2. `G` - 102 edges
3. `lire()` - 87 edges
4. `Builder` - 76 edges
5. `Game` - 61 edges
6. `AudioEngine` - 54 edges
7. `bx()` - 48 edges
8. `toonMaterial()` - 45 edges
9. `groundAt()` - 44 edges
10. `h()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `buildTerrain()` --indirect_call--> `L()`  [INFERRED]
  src/world/islands/gen/terrain.js → src/ui/icons.js
- `buildAvatarGeometry()` --references--> `W`  [EXTRACTED]
  src/models/personnage/corps/index.js → src/data/harvest.js
- `buildRig()` --indirect_call--> `bone()`  [INFERRED]
  src/entities/locomotion/rig.js → src/models/kit/formes.js
- `buildAlbatros()` --indirect_call--> `geo()`  [INFERRED]
  src/models/animaux/albatros/index.js → src/entities/locomotion/trunk.js
- `mouton()` --indirect_call--> `geo()`  [INFERRED]
  src/models/animaux/mouton/index.js → src/entities/locomotion/trunk.js

## Import Cycles
- 3-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/corps/index.js -> src/entities/character/Character.js`
- 3-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/coupes/index.js -> src/entities/character/Character.js`
- 4-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/corps/index.js -> src/models/personnage/coupes/index.js -> src/entities/character/Character.js`
- 4-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/crayon/index.js -> src/models/personnage/coupes/index.js -> src/entities/character/Character.js`

## Communities (171 total, 13 thin omitted)

### Community 0 - "models/lieux.js"
Cohesion: 0.05
Nodes (68): arbreGeant(), barque(), barqueAmarree(), barqueEchouee(), epave(), ancre(), boueeEchouee(), cabane() (+60 more)

### Community 1 - "motor.js"
Cohesion: 0.08
Nodes (81): AIR, airStep(), approach(), BANKING, bankStep(), BASE, bonk(), bonkStep() (+73 more)

### Community 2 - "builder.js"
Cohesion: 0.08
Nodes (56): arbreFruitier(), arbrePompon(), bambou(), bouleau(), arbreCerisier(), champiGeant(), pin(), pine() (+48 more)

### Community 3 - "fiches.js"
Cohesion: 0.09
Nodes (41): makeButterfly(), makeCrab(), makeGull(), skeleton(), _zero, espece, espece, espece (+33 more)

### Community 4 - "toonMaterial"
Cohesion: 0.06
Nodes (49): nextId(), _zero, damp(), Owl, Collectibles, seeded(), build(), buildHibou() (+41 more)

### Community 5 - "AudioEngine"
Cohesion: 0.09
Nodes (3): AudioEngine, midiToHz(), rand()

### Community 6 - "Game"
Cohesion: 0.09
Nodes (3): Game, setBridge(), setWaterProvider()

### Community 7 - "surface.js"
Cohesion: 0.08
Nodes (35): buildFarVeg(), hex(), SHAPES, KIND_INDEX, KIND_RADIUS, KINDS, SMALL, TREES (+27 more)

### Community 8 - "GamepadInput"
Cohesion: 0.08
Nodes (13): _aim, BTN, center(), GamepadInput, identifyController(), PAD_DEFAULTS, padName(), pickFocus() (+5 more)

### Community 9 - "mulberry32"
Cohesion: 0.10
Nodes (41): GX, GY, mulberry32(), pick(), weighted(), ARCHETYPES, islandTraits(), VILLAGES (+33 more)

### Community 10 - "pose.js"
Cohesion: 0.10
Nodes (43): airPose(), ARM_DYN, _ax, bankAngle(), bankDrop(), blendGait(), bodyBank(), bonkPose() (+35 more)

### Community 11 - "cerf/index.js"
Cohesion: 0.06
Nodes (44): ANDOUILLERS, ARRIERE, AVANT, avec(), AXE_TETE, axis, C0, CC (+36 more)

### Community 12 - "zones.js"
Cohesion: 0.09
Nodes (37): makeNoise(), MURS, densiteHerbeBiome(), BIOME_IDS, distanceField(), slopeAt(), B_NONE, BIOME_DRY (+29 more)

### Community 13 - "mapPanel.js"
Cohesion: 0.09
Nodes (32): CARNET, fmtKm(), openLogbookPanel(), hex(), islandShape(), openMapPanel(), palOf(), shapeCache (+24 more)

### Community 14 - "navigation.js"
Cohesion: 0.11
Nodes (26): CATALOG, CATALOG_ORDER, addObstacle(), blockedByObstacle(), bridgeY(), canStand(), cellKey(), cielSous() (+18 more)

### Community 15 - "forme.js"
Cohesion: 0.13
Nodes (35): ridged(), ZONE_BY_ID, MILL_COLORS, alpine(), BIOME_INDEX, coastDist(), coastGrid(), COLLINES (+27 more)

### Community 16 - "vache/index.js"
Cohesion: 0.07
Nodes (36): ARRIERE, AVANT, AXE_TETE, axis, CC, COL, CORPS, CR (+28 more)

### Community 17 - "props.js"
Cohesion: 0.16
Nodes (22): grandArbre(), grandArbreClumps(), trunkAlong(), bibliotheque(), chaumiere(), echoppe(), ile(), PAL (+14 more)

### Community 18 - "ciel/relief.js"
Cohesion: 0.13
Nodes (28): fbm(), _c, cascadeTexture(), IlesCelestes, _m, _p, _q, _s (+20 more)

### Community 19 - "Player.js"
Cohesion: 0.10
Nodes (16): arriveIntent(), climbable(), createMotor(), setProfile(), advanceGaitPhase(), strideLength(), tuningFor(), angleDelta() (+8 more)

### Community 20 - "IslandManager"
Cohesion: 0.12
Nodes (4): IslandManager, meshGeometry(), islandsInRange(), setGroundProvider()

### Community 21 - "corps/index.js"
Cohesion: 0.12
Nodes (23): CHAR_IDS, HAIR_COLORS, SKINS, SH, _h, B, box(), ID (+15 more)

### Community 22 - "HerbeSystem.js"
Cohesion: 0.10
Nodes (14): champDeSecours(), dataTexture(), HerbeSystem, NO_CUT, patchGeometry(), PRESET_ORDER, herbeMaterial(), bladesAt() (+6 more)

### Community 23 - "grid.js"
Cohesion: 0.11
Nodes (22): hydraulic(), thermal(), bicubic(), cr(), Grid, MinHeap, accumulate(), carveRivers() (+14 more)

### Community 24 - "avatar.js"
Cohesion: 0.13
Nodes (26): CLOTH_COLORS, CLOTH_NAMES, defaultAvatar(), EYES, HAIRS, index(), pick(), piecesOf() (+18 more)

### Community 25 - "heightAt"
Cohesion: 0.18
Nodes (26): blocked(), buildGrass(), champsMaison(), rng(), slopeAt(), smooth(), solSousHerbe(), terrainColorSampler() (+18 more)

### Community 26 - "rig.js"
Cohesion: 0.09
Nodes (27): applyJoints(), ARM, _ax, boneToRoot(), _c, _chain, clamp(), _d (+19 more)

### Community 27 - "flowers.js"
Cohesion: 0.12
Nodes (11): archeGlycine(), lavandeGeante(), C, Flowers, Grid, pickWeighted(), rng(), rosetteBase() (+3 more)

### Community 28 - "Character.js"
Cohesion: 0.10
Nodes (20): ARM_BONES, BASE, buildDust(), FIDGETS, PuffPool, BLINKABLE, cellUV(), EXPRESSIONS (+12 more)

### Community 30 - "mouton/index.js"
Cohesion: 0.12
Nodes (24): EAR, EAR_IN, EAR_IN_LITE, EAR_LITE, espece, mouton(), _up, collar() (+16 more)

### Community 31 - "Game.js"
Cohesion: 0.10
Nodes (18): JOURS, MOIS, game, legacyHours(), relinkDiscoveries(), KINDS, nearbyStations(), openCartographerPanel() (+10 more)

### Community 32 - "IslandManager.js"
Cohesion: 0.09
Nodes (23): CAP_COLORS, ROCKY, PALETTES_HERBE, ACC_ATTRS, _bc, bloomColor(), BLOOMS, _bp (+15 more)

### Community 34 - "h"
Cohesion: 0.15
Nodes (3): h(), replay(), UI

### Community 35 - "Sailing.js"
Cohesion: 0.16
Nodes (9): ORIGIN, damp(), idealTrim(), lerpAngle(), pointOfSail(), Sailing, smoothDamp(), setSeaConditions() (+1 more)

### Community 36 - "U"
Cohesion: 0.12
Nodes (9): CameraRig, damp(), lerpAngle(), wrapAngle(), U, buildClouds(), computeHorizonDip(), rng() (+1 more)

### Community 37 - "items.js"
Cohesion: 0.14
Nodes (12): BUGS, FISH, itemIcon(), ITEMS, SHAPES, STATION_NAMES, TIERS, TOOLS (+4 more)

### Community 38 - "Character"
Cohesion: 0.14
Nodes (9): PIECES, Character, damp(), climbRenderFrame(), climbRootFrame(), handWeightTarget(), perchHandTarget(), crayonGeometry() (+1 more)

### Community 39 - "bateaux/commun.js"
Cohesion: 0.17
Nodes (16): caracteristiques, dessin(), boat(), construire(), hull(), materials(), sailGeometry(), caracteristiques (+8 more)

### Community 40 - "Pipeline.js"
Cohesion: 0.12
Nodes (7): fsCam, fsGeo, FSPass, makeRT(), Pipeline, QUALITY, SunShadow

### Community 41 - "World.js"
Cohesion: 0.18
Nodes (12): buildClumpGeometry(), buildShadowProxies(), rng(), buildOcean(), buildPond(), buildRiver(), buildWaterfall(), WATER_PHYSICS (+4 more)

### Community 42 - "decor/index.js"
Cohesion: 0.14
Nodes (18): chantier, couture, etabli, four, arche, fontaine, moulin, statue (+10 more)

### Community 43 - "state.js"
Cohesion: 0.16
Nodes (17): createDefaultState(), dayKeyOf(), LEGACY_KEYS, LEGACY_SETTINGS, MARINE_IDS, migrate(), randomSeed(), SEED_A (+9 more)

### Community 44 - "Gather.js"
Cohesion: 0.16
Nodes (14): flowerItemFor(), HARVEST, rollBug(), rollDrops(), rollFish(), strikeTime(), TIER_NAMES, TOOL_NAMES (+6 more)

### Community 45 - "AirRide"
Cohesion: 0.20
Nodes (6): AirRide, damp(), build(), buildAlbatros(), smooth(), worldLimit()

### Community 46 - "settingsPanel.js"
Cohesion: 0.23
Nodes (13): CHANNEL_LABELS, CHANNELS, PENTA, exportSave(), loadSave(), openDB(), readImportFile(), writeSave() (+5 more)

### Community 47 - "marine.js"
Cohesion: 0.16
Nodes (8): hashString(), Parts, m(), zoneM(), DRIFTING, LABELS, MarineManager, markerFor()

### Community 50 - "accessoires.js"
Cohesion: 0.25
Nodes (13): buildRig(), chevre(), espece, anneauGeo(), BELL, clocheSuisse(), collier(), eye() (+5 more)

### Community 51 - ".queueLod1"
Cohesion: 0.19
Nodes (10): DIRX, DIRZ, partModel(), rotY(), buildFallFoam(), buildLake(), buildRivers(), riverMaterial() (+2 more)

### Community 53 - "registry.js"
Cohesion: 0.18
Nodes (9): FICHES, BY_ID, CATEGORIES, categoryOf(), MODELS, ORDRE, STATUTS, TAILLES (+1 more)

### Community 54 - "daycycle.js"
Cohesion: 0.18
Nodes (10): canonicalHour(), COLOR_FIELDS, DayCycle, grey, KEYS, MOON_LIGHT, MOON_SKY, PREPARED (+2 more)

### Community 59 - "weather.js"
Cohesion: 0.39
Nodes (3): makePrecip(), seeded(), Weather

### Community 60 - ".push"
Cohesion: 0.33
Nodes (3): RECOLOR, recolorPart(), GeoAcc

### Community 61 - "textures.js"
Cohesion: 0.67
Nodes (6): canvas(), cloudAtlas(), leafAtlas(), paperTexture(), rng(), tileNoise()

### Community 62 - "feedback.js"
Cohesion: 0.40
Nodes (4): BASE_TUNING, cache, REACTIF, SURFACES

### Community 63 - "Cerf — ANI-004"
Cohesion: 0.33
Nodes (5): Cerf — ANI-004, DA retenue, Exceptions accordées par l'utilisateur (19/10/2026), Historique, Écarts restants

### Community 65 - "Abeille — ANI-018"
Cohesion: 0.40
Nodes (4): Abeille — ANI-018, DA retenue, Historique, Écarts restants

### Community 66 - "Grand albatros (monture) — ANI-028"
Cohesion: 0.40
Nodes (4): DA retenue, Grand albatros (monture) — ANI-028, Historique, Écarts restants

### Community 67 - "Canard — ANI-014"
Cohesion: 0.40
Nodes (4): Canard — ANI-014, DA retenue, Historique, Écarts restants

### Community 68 - "Chèvre — ANI-002"
Cohesion: 0.40
Nodes (4): Chèvre — ANI-002, DA retenue, Historique, Écarts restants

### Community 69 - "Crabe — ANI-010"
Cohesion: 0.40
Nodes (4): Crabe — ANI-010, DA retenue, Historique, Écarts restants

### Community 70 - "Écureuil — ANI-008"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Écarts restants, Écureuil — ANI-008

### Community 71 - "Escargot géant — ANI-023"
Cohesion: 0.40
Nodes (4): DA retenue, Escargot géant — ANI-023, Historique, Écarts restants

### Community 72 - "Faune depart — ANI-024 à ANI-026"
Cohesion: 0.40
Nodes (4): DA retenue, Faune depart — ANI-024 à ANI-026, Historique, Écarts restants

### Community 73 - "Flamant rose — ANI-013"
Cohesion: 0.40
Nodes (4): DA retenue, Flamant rose — ANI-013, Historique, Écarts restants

### Community 74 - "Grenouille — ANI-015"
Cohesion: 0.40
Nodes (4): DA retenue, Grenouille — ANI-015, Historique, Écarts restants

### Community 75 - "Hérisson — ANI-007"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Hérisson — ANI-007, Écarts restants

### Community 76 - "Hibou cartographe — ANI-027"
Cohesion: 0.40
Nodes (4): DA retenue, Hibou cartographe — ANI-027, Historique, Écarts restants

### Community 77 - "Lapin — ANI-006"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Lapin — ANI-006, Écarts restants

### Community 78 - "Lézard — ANI-022"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Lézard — ANI-022, Écarts restants

### Community 79 - "Luciole — ANI-019"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Luciole — ANI-019, Écarts restants

### Community 80 - "Mouette — ANI-011"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mouette — ANI-011, Écarts restants

### Community 81 - "Mouton — ANI-001"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mouton — ANI-001, Écarts restants

### Community 82 - "Papillon — ANI-017"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Papillon — ANI-017, Écarts restants

### Community 83 - "Perroquet — ANI-012"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Perroquet — ANI-012, Écarts restants

### Community 84 - "Phoque — ANI-020"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Phoque — ANI-020, Écarts restants

### Community 85 - "Pingouin — ANI-021"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Pingouin — ANI-021, Écarts restants

### Community 86 - "Poisson — ANI-016"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Poisson — ANI-016, Écarts restants

### Community 87 - "Renard — ANI-005"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Renard — ANI-005, Écarts restants

### Community 88 - "Tortue — ANI-009"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Tortue — ANI-009, Écarts restants

### Community 89 - "Vache — ANI-003"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Vache — ANI-003, Écarts restants

### Community 90 - "Arbre fruitier — ARB-002"
Cohesion: 0.40
Nodes (4): Arbre fruitier — ARB-002, DA retenue, Historique, Écarts restants

### Community 91 - "Arbre géant (lieu) — ARB-015"
Cohesion: 0.40
Nodes (4): Arbre géant (lieu) — ARB-015, DA retenue, Historique, Écarts restants

### Community 92 - "Arbre pompon — ARB-001"
Cohesion: 0.40
Nodes (4): Arbre pompon — ARB-001, DA retenue, Historique, Écarts restants

### Community 93 - "Bambou — ARB-011"
Cohesion: 0.40
Nodes (4): Bambou — ARB-011, DA retenue, Historique, Écarts restants

### Community 94 - "Bouleau — ARB-008"
Cohesion: 0.40
Nodes (4): Bouleau — ARB-008, DA retenue, Historique, Écarts restants

### Community 95 - "Cerisier — ARB-003"
Cohesion: 0.40
Nodes (4): Cerisier — ARB-003, DA retenue, Historique, Écarts restants

### Community 96 - "Champignon géant — ARB-013"
Cohesion: 0.40
Nodes (4): Champignon géant — ARB-013, DA retenue, Historique, Écarts restants

### Community 97 - "Coniferes — ARB-004 à ARB-006"
Cohesion: 0.40
Nodes (4): Coniferes — ARB-004 à ARB-006, DA retenue, Historique, Écarts restants

### Community 98 - "Érable — ARB-010"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Écarts restants, Érable — ARB-010

### Community 99 - "Fougère arborescente — ARB-012"
Cohesion: 0.40
Nodes (4): DA retenue, Fougère arborescente — ARB-012, Historique, Écarts restants

### Community 100 - "Grand arbre de l'île de départ — ARB-014"
Cohesion: 0.40
Nodes (4): DA retenue, Grand arbre de l'île de départ — ARB-014, Historique, Écarts restants

### Community 101 - "Palmier — ARB-007"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Palmier — ARB-007, Écarts restants

### Community 102 - "Saule — ARB-009"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Saule — ARB-009, Écarts restants

### Community 103 - "Barque — NAV-002"
Cohesion: 0.40
Nodes (4): Barque — NAV-002, DA retenue, Historique, Écarts restants

### Community 104 - "Canots — NAV-005 à NAV-006"
Cohesion: 0.40
Nodes (4): Canots — NAV-005 à NAV-006, DA retenue, Historique, Écarts restants

### Community 105 - "Epaves — NAV-007 à NAV-008"
Cohesion: 0.40
Nodes (4): DA retenue, Epaves — NAV-007 à NAV-008, Historique, Écarts restants

### Community 106 - "Goélette — NAV-004"
Cohesion: 0.40
Nodes (4): DA retenue, Goélette — NAV-004, Historique, Écarts restants

### Community 107 - "Mouillage — NAV-009 à NAV-011"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mouillage — NAV-009 à NAV-011, Écarts restants

### Community 108 - "Radeau — NAV-001"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Radeau — NAV-001, Écarts restants

### Community 109 - "Voilier — NAV-003"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Voilier — NAV-003, Écarts restants

### Community 110 - "Bibliothèque-souche du hibou — BAT-003"
Cohesion: 0.40
Nodes (4): Bibliothèque-souche du hibou — BAT-003, DA retenue, Historique, Écarts restants

### Community 111 - "Cabane d'ermite — BAT-009"
Cohesion: 0.40
Nodes (4): Cabane d'ermite — BAT-009, DA retenue, Historique, Écarts restants

### Community 112 - "Chaumière du joueur — BAT-002"
Cohesion: 0.40
Nodes (4): Chaumière du joueur — BAT-002, DA retenue, Historique, Écarts restants

### Community 113 - "Échoppe — BAT-012"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Écarts restants, Échoppe — BAT-012

### Community 114 - "Étal du marché — BAT-011"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Écarts restants, Étal du marché — BAT-011

### Community 115 - "Maison de village — BAT-001"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Maison de village — BAT-001, Écarts restants

### Community 116 - "Moulin à eau — BAT-005"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Moulin à eau — BAT-005, Écarts restants

### Community 117 - "Moulin à vent — BAT-004"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Moulin à vent — BAT-004, Écarts restants

### Community 118 - "Observatoire — BAT-010"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Observatoire — BAT-010, Écarts restants

### Community 119 - "Phare — BAT-006"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Phare — BAT-006, Écarts restants

### Community 120 - "Temple — BAT-008"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Temple — BAT-008, Écarts restants

### Community 121 - "Tour de guet — BAT-007"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Tour de guet — BAT-007, Écarts restants

### Community 122 - "Ateliers — DEC-014 à DEC-017"
Cohesion: 0.40
Nodes (4): Ateliers — DEC-014 à DEC-017, DA retenue, Historique, Écarts restants

### Community 123 - "Curiosites — DEC-010 à DEC-018"
Cohesion: 0.40
Nodes (4): Curiosites — DEC-010 à DEC-018, DA retenue, Historique, Écarts restants

### Community 124 - "Jardin — DEC-001 à DEC-009"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Jardin — DEC-001 à DEC-009, Écarts restants

### Community 125 - "Cercle de pierres — MON-004"
Cohesion: 0.40
Nodes (4): Cercle de pierres — MON-004, DA retenue, Historique, Écarts restants

### Community 126 - "Curiosites — MON-006 à MON-008"
Cohesion: 0.40
Nodes (4): Curiosites — MON-006 à MON-008, DA retenue, Historique, Écarts restants

### Community 127 - "Grotte — MON-003"
Cohesion: 0.40
Nodes (4): DA retenue, Grotte — MON-003, Historique, Écarts restants

### Community 128 - "Ruines — MON-001 à MON-002"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Ruines — MON-001 à MON-002, Écarts restants

### Community 129 - "Statue géante — MON-005"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Statue géante — MON-005, Écarts restants

### Community 130 - "Campement — OBJ-005 à OBJ-006"
Cohesion: 0.40
Nodes (4): Campement — OBJ-005 à OBJ-006, DA retenue, Historique, Écarts restants

### Community 131 - "Coffre — OBJ-001 à OBJ-002"
Cohesion: 0.40
Nodes (4): Coffre — OBJ-001 à OBJ-002, DA retenue, Historique, Écarts restants

### Community 132 - "Curiosites — OBJ-003 à OBJ-023"
Cohesion: 0.40
Nodes (4): Curiosites — OBJ-003 à OBJ-023, DA retenue, Historique, Écarts restants

### Community 133 - "Flotteur de pêche — OBJ-020"
Cohesion: 0.40
Nodes (4): DA retenue, Flotteur de pêche — OBJ-020, Historique, Écarts restants

### Community 134 - "Lagon — OBJ-010 à OBJ-011"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Lagon — OBJ-010 à OBJ-011, Écarts restants

### Community 135 - "Mer — OBJ-017 à OBJ-022"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mer — OBJ-017 à OBJ-022, Écarts restants

### Community 136 - "Ruche — OBJ-007"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Ruche — OBJ-007, Écarts restants

### Community 137 - "Tresors — OBJ-012 à OBJ-016"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Tresors — OBJ-012 à OBJ-016, Écarts restants

### Community 138 - "Arche — STR-011"
Cohesion: 0.40
Nodes (4): Arche — STR-011, DA retenue, Historique, Écarts restants

### Community 139 - "Bassin chaud — STR-010"
Cohesion: 0.40
Nodes (4): Bassin chaud — STR-010, DA retenue, Historique, Écarts restants

### Community 140 - "Cascade — STR-027"
Cohesion: 0.40
Nodes (4): Cascade — STR-027, DA retenue, Historique, Écarts restants

### Community 141 - "Champs — STR-007 à STR-012"
Cohesion: 0.40
Nodes (4): Champs — STR-007 à STR-012, DA retenue, Historique, Écarts restants

### Community 142 - "Chemins — STR-003 à STR-013"
Cohesion: 0.40
Nodes (4): Chemins — STR-003 à STR-013, DA retenue, Historique, Écarts restants

### Community 143 - "Jetée — STR-001"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Jetée — STR-001, Écarts restants

### Community 144 - "Mobilier depart — STR-020 à STR-026"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mobilier depart — STR-020 à STR-026, Écarts restants

### Community 145 - "Mobilier — STR-014 à STR-019"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mobilier — STR-014 à STR-019, Écarts restants

### Community 146 - "Ponton — STR-002"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Ponton — STR-002, Écarts restants

### Community 147 - "Puits — STR-006"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Puits — STR-006, Écarts restants

### Community 148 - "Accessoires — PER-020 à PER-023"
Cohesion: 0.40
Nodes (4): Accessoires — PER-020 à PER-023, DA retenue, Historique, Écarts restants

### Community 149 - "Corps et visage — PER-001"
Cohesion: 0.40
Nodes (4): Corps et visage — PER-001, DA retenue, Historique, Écarts restants

### Community 150 - "Coupes — PER-002 à PER-007"
Cohesion: 0.40
Nodes (4): Coupes — PER-002 à PER-007, DA retenue, Historique, Écarts restants

### Community 151 - "Crayon d'étude — PER-024"
Cohesion: 0.40
Nodes (4): Crayon d'étude — PER-024, DA retenue, Historique, Écarts restants

### Community 152 - "Outils — PER-025"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Outils — PER-025, Écarts restants

### Community 153 - "Tenues — PER-008 à PER-019"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Tenues — PER-008 à PER-019, Écarts restants

### Community 154 - "Bord de l eau — PLA-010 à PLA-011"
Cohesion: 0.40
Nodes (4): Bord de l eau — PLA-010 à PLA-011, DA retenue, Historique, Écarts restants

### Community 155 - "Buissons — PLA-001 à PLA-003"
Cohesion: 0.40
Nodes (4): Buissons — PLA-001 à PLA-003, DA retenue, Historique, Écarts restants

### Community 156 - "Cactus — PLA-004 à PLA-005"
Cohesion: 0.40
Nodes (4): Cactus — PLA-004 à PLA-005, DA retenue, Historique, Écarts restants

### Community 157 - "Champs — PLA-007 à PLA-012"
Cohesion: 0.40
Nodes (4): Champs — PLA-007 à PLA-012, DA retenue, Historique, Écarts restants

### Community 158 - "Fleur géante — PLA-017"
Cohesion: 0.40
Nodes (4): DA retenue, Fleur géante — PLA-017, Historique, Écarts restants

### Community 159 - "Fleurs — PLA-014 à PLA-015"
Cohesion: 0.40
Nodes (4): DA retenue, Fleurs — PLA-014 à PLA-015, Historique, Écarts restants

### Community 160 - "Herbe — PLA-016"
Cohesion: 0.40
Nodes (4): DA retenue, Herbe — PLA-016, Historique, Écarts restants

### Community 161 - "Raretes — PLA-018 à PLA-019"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Raretes — PLA-018 à PLA-019, Écarts restants

### Community 162 - "Sous bois — PLA-006 à PLA-013"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Sous bois — PLA-006 à PLA-013, Écarts restants

### Community 163 - "Blocs — ROC-001 à ROC-002"
Cohesion: 0.40
Nodes (4): Blocs — ROC-001 à ROC-002, DA retenue, Historique, Écarts restants

### Community 164 - "Bois — ROC-007 à ROC-010"
Cohesion: 0.40
Nodes (4): Bois — ROC-007 à ROC-010, DA retenue, Historique, Écarts restants

### Community 165 - "Mineraux — ROC-003 à ROC-006"
Cohesion: 0.40
Nodes (4): DA retenue, Historique, Mineraux — ROC-003 à ROC-006, Écarts restants

## Knowledge Gaps
- **594 isolated node(s):** `JOURS`, `MOIS`, `game`, `PENTA`, `BTN` (+589 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AudioEngine` connect `AudioEngine` to `settingsPanel.js`, `Game.js`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `mulberry32()` connect `mulberry32` to `models/lieux.js`, `builder.js`, `toonMaterial`, `Game`, `surface.js`, `zones.js`, `forme.js`, `marine.js`, `ciel/relief.js`, `.queueLod1`, `IslandFauna`, `grid.js`, `Game.js`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `IslandFauna` connect `IslandFauna` to `toonMaterial`, `settingsPanel.js`, `Game.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `JOURS`, `MOIS`, `game` to the rest of the system?**
  _594 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `models/lieux.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05442711255751319 - nodes in this community are weakly interconnected._
- **Should `motor.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07669703203056127 - nodes in this community are weakly interconnected._
- **Should `builder.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07626582278481013 - nodes in this community are weakly interconnected._