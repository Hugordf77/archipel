# Graph Report - src  (2026-10-21)

## Corpus Check
- 393 files · ~277,724 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2446 nodes · 6293 edges · 179 communities (167 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b9c59cde`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- globals.js
- CameraRig
- Game.js
- Game
- decor.js
- season.js
- navigation.js
- settingsPanel.js
- AudioEngine
- GamepadInput
- Interactions
- Input
- toonMaterial
- corps/index.js
- relief.js
- surface.js
- mulberry32
- marine.js
- avatar.js
- Gather.js
- Inventaire plein écran
- groundAt
- hibou/index.js
- Player.js
- Sailing.js
- Character.js
- PuffPool
- FaceAtlas
- homeFauna.js
- vache
- flowers.js
- IslandFauna
- feedback.js
- LocoFeedback
- motor.js
- pose.js
- rig.js
- Gather
- Inventory
- fiches.js
- cerf/index.js
- accessoires.js
- mouton/index.js
- vache/index.js
- vegetation.js
- physique.gen.js
- models/lieux.js
- props.js
- bateaux/commun.js
- herbe.js
- decor/index.js
- HerbeSystem.js
- registry.js
- assemble.js
- budgets.js
- cercle-pierres/index.js
- .push
- ruines/physique.js
- .buildKind
- IslandManager.js
- IslandManager
- Pipeline.js
- heightAt
- HerbeSystem
- h
- Aperçu du personnage (inventaire)
- Hotbar
- mapPanel.js
- daycycle.js
- Weather
- zones.js
- worldWorker.js
- gen/terrain.js
- islandgen.js
- plan.js
- Abeille — ANI-018
- Grand albatros (monture) — ANI-028
- Canard — ANI-014
- Cerf — ANI-004
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

## God Nodes (most connected - your core abstractions)
1. `fiche()` - 102 edges
2. `G` - 102 edges
3. `lire()` - 87 edges
4. `Builder` - 76 edges
5. `Game` - 60 edges
6. `AudioEngine` - 55 edges
7. `bx()` - 48 edges
8. `groundAt()` - 44 edges
9. `toonMaterial()` - 43 edges
10. `h()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `buildRig()` --indirect_call--> `bone()`  [INFERRED]
  src/entities/locomotion/rig.js → src/models/kit/formes.js
- `buildAvatarGeometry()` --references--> `W`  [EXTRACTED]
  src/models/personnage/corps/index.js → src/data/harvest.js
- `buildAlbatros()` --indirect_call--> `geo()`  [INFERRED]
  src/models/animaux/albatros/index.js → src/entities/locomotion/trunk.js
- `mouton()` --indirect_call--> `geo()`  [INFERRED]
  src/models/animaux/mouton/index.js → src/entities/locomotion/trunk.js
- `champsMaison()` --indirect_call--> `geo()`  [INFERRED]
  src/render/grass.js → src/entities/locomotion/trunk.js

## Import Cycles
- 3-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/corps/index.js -> src/entities/character/Character.js`
- 3-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/coupes/index.js -> src/entities/character/Character.js`
- 4-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/corps/index.js -> src/models/personnage/coupes/index.js -> src/entities/character/Character.js`
- 4-file cycle: `src/entities/character/Character.js -> src/models/personnage/index.js -> src/models/personnage/crayon/index.js -> src/models/personnage/coupes/index.js -> src/entities/character/Character.js`

## Communities (179 total, 12 thin omitted)

### Community 12 - "globals.js"
Cohesion: 0.12
Nodes (19): U, rng(), buildClumpGeometry(), buildShadowProxies(), World, buildLake(), rng(), buildClouds() (+11 more)

### Community 48 - "CameraRig"
Cohesion: 0.15
Nodes (4): damp(), wrapAngle(), lerpAngle(), CameraRig

### Community 23 - "Game.js"
Cohesion: 0.11
Nodes (20): JOURS, MOIS, game, todayKey(), dayKeyOf(), SEED_A, SEED_B, LEGACY_KEYS (+12 more)

### Community 5 - "Game"
Cohesion: 0.08
Nodes (3): Game, setWaterProvider(), setBridge()

### Community 27 - "decor.js"
Cohesion: 0.12
Nodes (9): ORIGIN, uid(), nearbyStations(), Decor, CATALOG, removeObstacle(), removeObstacles(), blockedByObstacle() (+1 more)

### Community 59 - "season.js"
Cohesion: 0.24
Nodes (9): SEASONS, seasonOf(), AUTUMN, BLOSSOM, WINTER, WARM, cellHash(), applySeason() (+1 more)

### Community 31 - "navigation.js"
Cohesion: 0.14
Nodes (19): waterLevelAt(), terrainY(), isHome(), pierY(), bridgeY(), waterDepth(), grid, cellKey() (+11 more)

### Community 44 - "settingsPanel.js"
Cohesion: 0.23
Nodes (13): CHANNELS, CHANNEL_LABELS, PENTA, openDB(), loadSave(), writeSave(), exportSave(), readImportFile() (+5 more)

### Community 4 - "AudioEngine"
Cohesion: 0.09
Nodes (3): midiToHz(), rand(), AudioEngine

### Community 6 - "GamepadInput"
Cohesion: 0.08
Nodes (13): BTN, _aim, PAD_DEFAULTS, stick(), padName(), PS_GLYPHS, identifyController(), RAW_SONY (+5 more)

### Community 10 - "toonMaterial"
Cohesion: 0.12
Nodes (26): nextId(), seeded(), Collectibles, halo(), MARINE_TYPES, marineMesh(), marine(), collectibleMesh() (+18 more)

### Community 19 - "corps/index.js"
Cohesion: 0.14
Nodes (21): CHAR_IDS, FACE, SH, B, PARENT, REST, box(), tint() (+13 more)

### Community 49 - "relief.js"
Cohesion: 0.30
Nodes (12): GX, GY, fbm(), ridged(), smooth(), clamp(), segDist(), cache (+4 more)

### Community 14 - "surface.js"
Cohesion: 0.10
Nodes (24): makeNoise(), Grid, cr(), bicubic(), Surface, PATH, PATH_EDGE, pathPaint() (+16 more)

### Community 32 - "mulberry32"
Cohesion: 0.16
Nodes (19): mulberry32(), pick(), weighted(), KINDS, fmtKm(), openLogbookPanel(), openCartographerPanel(), ARCHETYPES (+11 more)

### Community 61 - "marine.js"
Cohesion: 0.29
Nodes (5): hashString(), DRIFTING, LABELS, markerFor(), MarineManager

### Community 11 - "avatar.js"
Cohesion: 0.11
Nodes (32): randomSeed(), createDefaultState(), SKINS, HAIR_COLORS, CLOTH_COLORS, CLOTH_NAMES, SHOE_COLORS, HAIRS (+24 more)

### Community 39 - "Gather.js"
Cohesion: 0.15
Nodes (18): HARVEST, TOOL_NAMES, TIER_NAMES, strikeTime(), flowerItemFor(), rollDrops(), W, rollFish() (+10 more)

### Community 8 - "Inventaire plein écran"
Cohesion: 0.09
Nodes (35): SHAPES, TIERS, TOOLS, ITEMS, STATION_NAMES, itemIcon(), GROUPS, CAT_ORDER (+27 more)

### Community 50 - "groundAt"
Cohesion: 0.34
Nodes (3): damp(), AirRide, groundAt()

### Community 63 - "hibou/index.js"
Cohesion: 0.27
Nodes (5): damp(), Owl, buildHibou(), build(), ILE_DEPART

### Community 17 - "Player.js"
Cohesion: 0.11
Nodes (13): damp(), SLIDE_ANGLES, STEPPING, minmod(), Player, lerpAngle(), angleDelta(), climbable() (+5 more)

### Community 24 - "Sailing.js"
Cohesion: 0.14
Nodes (11): damp(), lerpAngle(), smoothDamp(), pointOfSail(), idealTrim(), Sailing, BOATS, BOAT_ORDER (+3 more)

### Community 13 - "Character.js"
Cohesion: 0.10
Nodes (21): damp(), BASE, FIDGETS, ARM_BONES, Character, EYE, MOUTH, EXPRESSIONS (+13 more)

### Community 51 - "homeFauna.js"
Cohesion: 0.27
Nodes (8): rand(), _zero, skeleton(), makeGull(), makeCrab(), makeButterfly(), Fauna, gullGeometry()

### Community 47 - "vache"
Cohesion: 0.16
Nodes (11): Parts, rejoue(), versCorps(), T(), versTete(), surTete(), rejoue(), vache() (+3 more)

### Community 15 - "flowers.js"
Cohesion: 0.10
Nodes (14): _zero, MAT, lavandeGeante(), archeGlycine(), C, ZONES, rng(), pickWeighted() (+6 more)

### Community 67 - "feedback.js"
Cohesion: 0.33
Nodes (5): CLIMB_STATES, BASE_TUNING, SURFACES, REACTIF, cache

### Community 2 - "motor.js"
Cohesion: 0.07
Nodes (83): LOCO, AIR, BANKING, GRIP, ON_THE_SPOT, HAND_STATES, CLIMBING, wrapAngle() (+75 more)

### Community 7 - "pose.js"
Cohesion: 0.09
Nodes (46): clamp(), CADENCE, STRIDE, RUN_BLEND, SPRINT_BLEND, smooth(), footPitch(), LOCO_FAMILY (+38 more)

### Community 20 - "rig.js"
Cohesion: 0.08
Nodes (29): clamp(), wrap(), FOOT_HALF_GAP, ARM, _q, _e, _p, applyJoints() (+21 more)

### Community 1 - "fiches.js"
Cohesion: 0.09
Nodes (44): espece, espece, espece, espece, espece, espece, GULL_PIVOTS, BUTTERFLY_PIVOTS (+36 more)

### Community 9 - "cerf/index.js"
Cohesion: 0.06
Nodes (42): axis, NP, HP, HW, CORPS, CC, CR, versCorps() (+34 more)

### Community 45 - "accessoires.js"
Cohesion: 0.23
Nodes (15): chevre(), mouton(), HOOF, HOOF_SMOOTH, eye(), BELL, collar(), legs() (+7 more)

### Community 37 - "mouton/index.js"
Cohesion: 0.15
Nodes (18): _up, EAR, EAR_IN, EAR_LITE, EAR_IN_LITE, _up, hull(), patch() (+10 more)

### Community 21 - "vache/index.js"
Cohesion: 0.07
Nodes (29): axis, COL, NP, HP, HW, CORPS, CC, CR (+21 more)

### Community 3 - "vegetation.js"
Cohesion: 0.08
Nodes (51): arbreFruitier(), arbrePompon(), bambou(), bouleau(), arbreCerisier(), champiGeant(), pin(), pinGivre() (+43 more)

### Community 0 - "models/lieux.js"
Cohesion: 0.06
Nodes (66): arbreGeant(), barque(), barqueAmarree(), barqueEchouee(), epave(), ancre(), boueeEchouee(), cabane() (+58 more)

### Community 29 - "props.js"
Cohesion: 0.17
Nodes (18): trunkAlong(), grandArbre(), grandArbreClumps(), bibliotheque(), chaumiere(), echoppe(), segment(), palmFrondGeometry() (+10 more)

### Community 40 - "bateaux/commun.js"
Cohesion: 0.18
Nodes (14): caracteristiques, dessin(), materials(), hull(), sailGeometry(), construire(), boat(), caracteristiques (+6 more)

### Community 41 - "herbe.js"
Cohesion: 0.15
Nodes (17): MURS, NONE, BIOME_DRY, BIOME_TALL, CONIFERS, CROWN, BUILT, maisonR() (+9 more)

### Community 25 - "decor/index.js"
Cohesion: 0.13
Nodes (20): etabli, four, couture, chantier, decor(), article(), telescope, moulin (+12 more)

### Community 66 - "HerbeSystem.js"
Cohesion: 0.32
Nodes (5): mesh(), NO_CUT, champDeSecours(), dataTexture(), herbeMaterial()

### Community 54 - "registry.js"
Cohesion: 0.18
Nodes (9): FICHES, CATEGORIES, STATUTS, ORDRE, MODELS, BY_ID, categoryOf(), TAILLES (+1 more)

### Community 42 - "assemble.js"
Cohesion: 0.25
Nodes (17): materiaux(), _id, shadowed(), single(), assembleKind(), flat(), assemblePart(), assembleBuilder() (+9 more)

### Community 70 - "cercle-pierres/index.js"
Cohesion: 0.47
Nodes (3): rng(), UP, cerclePierres()

### Community 46 - ".push"
Cohesion: 0.16
Nodes (9): DIRZ, DIRX, rotY(), partModel(), RECOLOR, recolorPart(), flat(), partGeometries() (+1 more)

### Community 65 - ".buildKind"
Cohesion: 0.28
Nodes (4): ROCKY, SHADOW_KINDS, LOW_KINDS, composeItem()

### Community 33 - "IslandManager.js"
Cohesion: 0.09
Nodes (22): CAP_COLORS, riverMaterial(), buildRivers(), buildFallFoam(), LOD_DIST, GRASSY, _m, _q (+14 more)

### Community 16 - "IslandManager"
Cohesion: 0.14
Nodes (3): kindModel(), meshGeometry(), IslandManager

### Community 35 - "Pipeline.js"
Cohesion: 0.13
Nodes (7): QUALITY, SunShadow, fsGeo, fsCam, FSPass, makeRT(), Pipeline

### Community 26 - "heightAt"
Cohesion: 0.22
Nodes (23): rng(), slopeAt(), blocked(), terrainColorSampler(), buildGrass(), smooth(), champsMaison(), solSousHerbe() (+15 more)

### Community 30 - "HerbeSystem"
Cohesion: 0.11
Nodes (10): PRESET_ORDER, patchGeometry(), HerbeSystem, bladeWidth(), couverture(), HERBE_PRESETS, smooth(), bladesAt() (+2 more)

### Community 38 - "h"
Cohesion: 0.17
Nodes (3): UI, h(), replay()

### Community 174 - "Aperçu du personnage (inventaire)"
Cohesion: 0.50
Nodes (3): build(), STUDIO_SUN, characterPreview()

### Community 36 - "mapPanel.js"
Cohesion: 0.18
Nodes (17): shapeCache, islandShape(), openMapPanel(), contexts, terrainColor(), MiniMap, inBounds(), FOG_TOTAL (+9 more)

### Community 55 - "daycycle.js"
Cohesion: 0.18
Nodes (10): KEYS, COLOR_FIELDS, PREPARED, sunTimes(), canonicalHour(), tmpColor, grey, MOON_SKY (+2 more)

### Community 68 - "Weather"
Cohesion: 0.38
Nodes (3): makePrecip(), seeded(), Weather

### Community 56 - "zones.js"
Cohesion: 0.20
Nodes (13): bloomColor(), densiteHerbeBiome(), ZONE_NAMES, ZONE_HERBE, FOREST, BLOOM, quantile(), hex() (+5 more)

### Community 57 - "worldWorker.js"
Cohesion: 0.21
Nodes (8): BIOMES, rgb(), hex(), SHAPES, buildFarVeg(), plans, keyOf(), planOf()

### Community 34 - "gen/terrain.js"
Cohesion: 0.18
Nodes (17): thermal(), hydraulic(), MinHeap, DI, DJ, priorityFlood(), accumulate(), findLakes() (+9 more)

### Community 58 - "islandgen.js"
Cohesion: 0.27
Nodes (10): FOREST_TREES, ZONE_TABLE, SLOPE_MAX, KINDS, KIND_INDEX, KIND_RADIUS, TREES, SMALL (+2 more)

### Community 22 - "plan.js"
Cohesion: 0.14
Nodes (26): placeFlora(), bilinear(), slopeAt(), distanceField(), stableId(), sealLakes(), DI, DJ (+18 more)

### Community 73 - "Abeille — ANI-018"
Cohesion: 0.40
Nodes (4): Abeille — ANI-018, DA retenue, Écarts restants, Historique

### Community 74 - "Grand albatros (monture) — ANI-028"
Cohesion: 0.40
Nodes (4): Grand albatros (monture) — ANI-028, DA retenue, Écarts restants, Historique

### Community 75 - "Canard — ANI-014"
Cohesion: 0.40
Nodes (4): Canard — ANI-014, DA retenue, Écarts restants, Historique

### Community 69 - "Cerf — ANI-004"
Cohesion: 0.33
Nodes (5): Cerf — ANI-004, Exceptions accordées par l'utilisateur (19/10/2026), DA retenue, Écarts restants, Historique

### Community 76 - "Chèvre — ANI-002"
Cohesion: 0.40
Nodes (4): Chèvre — ANI-002, DA retenue, Écarts restants, Historique

### Community 77 - "Crabe — ANI-010"
Cohesion: 0.40
Nodes (4): Crabe — ANI-010, DA retenue, Écarts restants, Historique

### Community 78 - "Écureuil — ANI-008"
Cohesion: 0.40
Nodes (4): Écureuil — ANI-008, DA retenue, Écarts restants, Historique

### Community 79 - "Escargot géant — ANI-023"
Cohesion: 0.40
Nodes (4): Escargot géant — ANI-023, DA retenue, Écarts restants, Historique

### Community 80 - "Faune depart — ANI-024 à ANI-026"
Cohesion: 0.40
Nodes (4): Faune depart — ANI-024 à ANI-026, DA retenue, Écarts restants, Historique

### Community 81 - "Flamant rose — ANI-013"
Cohesion: 0.40
Nodes (4): Flamant rose — ANI-013, DA retenue, Écarts restants, Historique

### Community 82 - "Grenouille — ANI-015"
Cohesion: 0.40
Nodes (4): Grenouille — ANI-015, DA retenue, Écarts restants, Historique

### Community 83 - "Hérisson — ANI-007"
Cohesion: 0.40
Nodes (4): Hérisson — ANI-007, DA retenue, Écarts restants, Historique

### Community 84 - "Hibou cartographe — ANI-027"
Cohesion: 0.40
Nodes (4): Hibou cartographe — ANI-027, DA retenue, Écarts restants, Historique

### Community 85 - "Lapin — ANI-006"
Cohesion: 0.40
Nodes (4): Lapin — ANI-006, DA retenue, Écarts restants, Historique

### Community 86 - "Lézard — ANI-022"
Cohesion: 0.40
Nodes (4): Lézard — ANI-022, DA retenue, Écarts restants, Historique

### Community 87 - "Luciole — ANI-019"
Cohesion: 0.40
Nodes (4): Luciole — ANI-019, DA retenue, Écarts restants, Historique

### Community 88 - "Mouette — ANI-011"
Cohesion: 0.40
Nodes (4): Mouette — ANI-011, DA retenue, Écarts restants, Historique

### Community 89 - "Mouton — ANI-001"
Cohesion: 0.40
Nodes (4): Mouton — ANI-001, DA retenue, Écarts restants, Historique

### Community 90 - "Papillon — ANI-017"
Cohesion: 0.40
Nodes (4): Papillon — ANI-017, DA retenue, Écarts restants, Historique

### Community 91 - "Perroquet — ANI-012"
Cohesion: 0.40
Nodes (4): Perroquet — ANI-012, DA retenue, Écarts restants, Historique

### Community 92 - "Phoque — ANI-020"
Cohesion: 0.40
Nodes (4): Phoque — ANI-020, DA retenue, Écarts restants, Historique

### Community 93 - "Pingouin — ANI-021"
Cohesion: 0.40
Nodes (4): Pingouin — ANI-021, DA retenue, Écarts restants, Historique

### Community 94 - "Poisson — ANI-016"
Cohesion: 0.40
Nodes (4): Poisson — ANI-016, DA retenue, Écarts restants, Historique

### Community 95 - "Renard — ANI-005"
Cohesion: 0.40
Nodes (4): Renard — ANI-005, DA retenue, Écarts restants, Historique

### Community 96 - "Tortue — ANI-009"
Cohesion: 0.40
Nodes (4): Tortue — ANI-009, DA retenue, Écarts restants, Historique

### Community 97 - "Vache — ANI-003"
Cohesion: 0.40
Nodes (4): Vache — ANI-003, DA retenue, Écarts restants, Historique

### Community 98 - "Arbre fruitier — ARB-002"
Cohesion: 0.40
Nodes (4): Arbre fruitier — ARB-002, DA retenue, Écarts restants, Historique

### Community 99 - "Arbre géant (lieu) — ARB-015"
Cohesion: 0.40
Nodes (4): Arbre géant (lieu) — ARB-015, DA retenue, Écarts restants, Historique

### Community 100 - "Arbre pompon — ARB-001"
Cohesion: 0.40
Nodes (4): Arbre pompon — ARB-001, DA retenue, Écarts restants, Historique

### Community 101 - "Bambou — ARB-011"
Cohesion: 0.40
Nodes (4): Bambou — ARB-011, DA retenue, Écarts restants, Historique

### Community 102 - "Bouleau — ARB-008"
Cohesion: 0.40
Nodes (4): Bouleau — ARB-008, DA retenue, Écarts restants, Historique

### Community 103 - "Cerisier — ARB-003"
Cohesion: 0.40
Nodes (4): Cerisier — ARB-003, DA retenue, Écarts restants, Historique

### Community 104 - "Champignon géant — ARB-013"
Cohesion: 0.40
Nodes (4): Champignon géant — ARB-013, DA retenue, Écarts restants, Historique

### Community 105 - "Coniferes — ARB-004 à ARB-006"
Cohesion: 0.40
Nodes (4): Coniferes — ARB-004 à ARB-006, DA retenue, Écarts restants, Historique

### Community 106 - "Érable — ARB-010"
Cohesion: 0.40
Nodes (4): Érable — ARB-010, DA retenue, Écarts restants, Historique

### Community 107 - "Fougère arborescente — ARB-012"
Cohesion: 0.40
Nodes (4): Fougère arborescente — ARB-012, DA retenue, Écarts restants, Historique

### Community 108 - "Grand arbre de l'île de départ — ARB-014"
Cohesion: 0.40
Nodes (4): Grand arbre de l'île de départ — ARB-014, DA retenue, Écarts restants, Historique

### Community 109 - "Palmier — ARB-007"
Cohesion: 0.40
Nodes (4): Palmier — ARB-007, DA retenue, Écarts restants, Historique

### Community 110 - "Saule — ARB-009"
Cohesion: 0.40
Nodes (4): Saule — ARB-009, DA retenue, Écarts restants, Historique

### Community 111 - "Barque — NAV-002"
Cohesion: 0.40
Nodes (4): Barque — NAV-002, DA retenue, Écarts restants, Historique

### Community 112 - "Canots — NAV-005 à NAV-006"
Cohesion: 0.40
Nodes (4): Canots — NAV-005 à NAV-006, DA retenue, Écarts restants, Historique

### Community 113 - "Epaves — NAV-007 à NAV-008"
Cohesion: 0.40
Nodes (4): Epaves — NAV-007 à NAV-008, DA retenue, Écarts restants, Historique

### Community 114 - "Goélette — NAV-004"
Cohesion: 0.40
Nodes (4): Goélette — NAV-004, DA retenue, Écarts restants, Historique

### Community 115 - "Mouillage — NAV-009 à NAV-011"
Cohesion: 0.40
Nodes (4): Mouillage — NAV-009 à NAV-011, DA retenue, Écarts restants, Historique

### Community 116 - "Radeau — NAV-001"
Cohesion: 0.40
Nodes (4): Radeau — NAV-001, DA retenue, Écarts restants, Historique

### Community 117 - "Voilier — NAV-003"
Cohesion: 0.40
Nodes (4): Voilier — NAV-003, DA retenue, Écarts restants, Historique

### Community 118 - "Bibliothèque-souche du hibou — BAT-003"
Cohesion: 0.40
Nodes (4): Bibliothèque-souche du hibou — BAT-003, DA retenue, Écarts restants, Historique

### Community 119 - "Cabane d'ermite — BAT-009"
Cohesion: 0.40
Nodes (4): Cabane d'ermite — BAT-009, DA retenue, Écarts restants, Historique

### Community 120 - "Chaumière du joueur — BAT-002"
Cohesion: 0.40
Nodes (4): Chaumière du joueur — BAT-002, DA retenue, Écarts restants, Historique

### Community 121 - "Échoppe — BAT-012"
Cohesion: 0.40
Nodes (4): Échoppe — BAT-012, DA retenue, Écarts restants, Historique

### Community 122 - "Étal du marché — BAT-011"
Cohesion: 0.40
Nodes (4): Étal du marché — BAT-011, DA retenue, Écarts restants, Historique

### Community 123 - "Maison de village — BAT-001"
Cohesion: 0.40
Nodes (4): Maison de village — BAT-001, DA retenue, Écarts restants, Historique

### Community 124 - "Moulin à eau — BAT-005"
Cohesion: 0.40
Nodes (4): Moulin à eau — BAT-005, DA retenue, Écarts restants, Historique

### Community 125 - "Moulin à vent — BAT-004"
Cohesion: 0.40
Nodes (4): Moulin à vent — BAT-004, DA retenue, Écarts restants, Historique

### Community 126 - "Observatoire — BAT-010"
Cohesion: 0.40
Nodes (4): Observatoire — BAT-010, DA retenue, Écarts restants, Historique

### Community 127 - "Phare — BAT-006"
Cohesion: 0.40
Nodes (4): Phare — BAT-006, DA retenue, Écarts restants, Historique

### Community 128 - "Temple — BAT-008"
Cohesion: 0.40
Nodes (4): Temple — BAT-008, DA retenue, Écarts restants, Historique

### Community 129 - "Tour de guet — BAT-007"
Cohesion: 0.40
Nodes (4): Tour de guet — BAT-007, DA retenue, Écarts restants, Historique

### Community 130 - "Ateliers — DEC-014 à DEC-017"
Cohesion: 0.40
Nodes (4): Ateliers — DEC-014 à DEC-017, DA retenue, Écarts restants, Historique

### Community 131 - "Curiosites — DEC-010 à DEC-018"
Cohesion: 0.40
Nodes (4): Curiosites — DEC-010 à DEC-018, DA retenue, Écarts restants, Historique

### Community 132 - "Jardin — DEC-001 à DEC-009"
Cohesion: 0.40
Nodes (4): Jardin — DEC-001 à DEC-009, DA retenue, Écarts restants, Historique

### Community 133 - "Cercle de pierres — MON-004"
Cohesion: 0.40
Nodes (4): Cercle de pierres — MON-004, DA retenue, Écarts restants, Historique

### Community 134 - "Curiosites — MON-006 à MON-008"
Cohesion: 0.40
Nodes (4): Curiosites — MON-006 à MON-008, DA retenue, Écarts restants, Historique

### Community 135 - "Grotte — MON-003"
Cohesion: 0.40
Nodes (4): Grotte — MON-003, DA retenue, Écarts restants, Historique

### Community 136 - "Ruines — MON-001 à MON-002"
Cohesion: 0.40
Nodes (4): Ruines — MON-001 à MON-002, DA retenue, Écarts restants, Historique

### Community 137 - "Statue géante — MON-005"
Cohesion: 0.40
Nodes (4): Statue géante — MON-005, DA retenue, Écarts restants, Historique

### Community 138 - "Campement — OBJ-005 à OBJ-006"
Cohesion: 0.40
Nodes (4): Campement — OBJ-005 à OBJ-006, DA retenue, Écarts restants, Historique

### Community 139 - "Coffre — OBJ-001 à OBJ-002"
Cohesion: 0.40
Nodes (4): Coffre — OBJ-001 à OBJ-002, DA retenue, Écarts restants, Historique

### Community 140 - "Curiosites — OBJ-003 à OBJ-023"
Cohesion: 0.40
Nodes (4): Curiosites — OBJ-003 à OBJ-023, DA retenue, Écarts restants, Historique

### Community 141 - "Flotteur de pêche — OBJ-020"
Cohesion: 0.40
Nodes (4): Flotteur de pêche — OBJ-020, DA retenue, Écarts restants, Historique

### Community 142 - "Lagon — OBJ-010 à OBJ-011"
Cohesion: 0.40
Nodes (4): Lagon — OBJ-010 à OBJ-011, DA retenue, Écarts restants, Historique

### Community 143 - "Mer — OBJ-017 à OBJ-022"
Cohesion: 0.40
Nodes (4): Mer — OBJ-017 à OBJ-022, DA retenue, Écarts restants, Historique

### Community 144 - "Ruche — OBJ-007"
Cohesion: 0.40
Nodes (4): Ruche — OBJ-007, DA retenue, Écarts restants, Historique

### Community 145 - "Tresors — OBJ-012 à OBJ-016"
Cohesion: 0.40
Nodes (4): Tresors — OBJ-012 à OBJ-016, DA retenue, Écarts restants, Historique

### Community 146 - "Arche — STR-011"
Cohesion: 0.40
Nodes (4): Arche — STR-011, DA retenue, Écarts restants, Historique

### Community 147 - "Bassin chaud — STR-010"
Cohesion: 0.40
Nodes (4): Bassin chaud — STR-010, DA retenue, Écarts restants, Historique

### Community 148 - "Cascade — STR-027"
Cohesion: 0.40
Nodes (4): Cascade — STR-027, DA retenue, Écarts restants, Historique

### Community 149 - "Champs — STR-007 à STR-012"
Cohesion: 0.40
Nodes (4): Champs — STR-007 à STR-012, DA retenue, Écarts restants, Historique

### Community 150 - "Chemins — STR-003 à STR-013"
Cohesion: 0.40
Nodes (4): Chemins — STR-003 à STR-013, DA retenue, Écarts restants, Historique

### Community 151 - "Jetée — STR-001"
Cohesion: 0.40
Nodes (4): Jetée — STR-001, DA retenue, Écarts restants, Historique

### Community 152 - "Mobilier depart — STR-020 à STR-026"
Cohesion: 0.40
Nodes (4): Mobilier depart — STR-020 à STR-026, DA retenue, Écarts restants, Historique

### Community 153 - "Mobilier — STR-014 à STR-019"
Cohesion: 0.40
Nodes (4): Mobilier — STR-014 à STR-019, DA retenue, Écarts restants, Historique

### Community 154 - "Ponton — STR-002"
Cohesion: 0.40
Nodes (4): Ponton — STR-002, DA retenue, Écarts restants, Historique

### Community 155 - "Puits — STR-006"
Cohesion: 0.40
Nodes (4): Puits — STR-006, DA retenue, Écarts restants, Historique

### Community 156 - "Accessoires — PER-020 à PER-023"
Cohesion: 0.40
Nodes (4): Accessoires — PER-020 à PER-023, DA retenue, Écarts restants, Historique

### Community 157 - "Corps et visage — PER-001"
Cohesion: 0.40
Nodes (4): Corps et visage — PER-001, DA retenue, Écarts restants, Historique

### Community 158 - "Coupes — PER-002 à PER-007"
Cohesion: 0.40
Nodes (4): Coupes — PER-002 à PER-007, DA retenue, Écarts restants, Historique

### Community 159 - "Crayon d'étude — PER-024"
Cohesion: 0.40
Nodes (4): Crayon d'étude — PER-024, DA retenue, Écarts restants, Historique

### Community 160 - "Outils — PER-025"
Cohesion: 0.40
Nodes (4): Outils — PER-025, DA retenue, Écarts restants, Historique

### Community 161 - "Tenues — PER-008 à PER-019"
Cohesion: 0.40
Nodes (4): Tenues — PER-008 à PER-019, DA retenue, Écarts restants, Historique

### Community 162 - "Bord de l eau — PLA-010 à PLA-011"
Cohesion: 0.40
Nodes (4): Bord de l eau — PLA-010 à PLA-011, DA retenue, Écarts restants, Historique

### Community 163 - "Buissons — PLA-001 à PLA-003"
Cohesion: 0.40
Nodes (4): Buissons — PLA-001 à PLA-003, DA retenue, Écarts restants, Historique

### Community 164 - "Cactus — PLA-004 à PLA-005"
Cohesion: 0.40
Nodes (4): Cactus — PLA-004 à PLA-005, DA retenue, Écarts restants, Historique

### Community 165 - "Champs — PLA-007 à PLA-012"
Cohesion: 0.40
Nodes (4): Champs — PLA-007 à PLA-012, DA retenue, Écarts restants, Historique

### Community 166 - "Fleur géante — PLA-017"
Cohesion: 0.40
Nodes (4): Fleur géante — PLA-017, DA retenue, Écarts restants, Historique

### Community 167 - "Fleurs — PLA-014 à PLA-015"
Cohesion: 0.40
Nodes (4): Fleurs — PLA-014 à PLA-015, DA retenue, Écarts restants, Historique

### Community 168 - "Herbe — PLA-016"
Cohesion: 0.40
Nodes (4): Herbe — PLA-016, DA retenue, Écarts restants, Historique

### Community 169 - "Raretes — PLA-018 à PLA-019"
Cohesion: 0.40
Nodes (4): Raretes — PLA-018 à PLA-019, DA retenue, Écarts restants, Historique

### Community 170 - "Sous bois — PLA-006 à PLA-013"
Cohesion: 0.40
Nodes (4): Sous bois — PLA-006 à PLA-013, DA retenue, Écarts restants, Historique

### Community 171 - "Blocs — ROC-001 à ROC-002"
Cohesion: 0.40
Nodes (4): Blocs — ROC-001 à ROC-002, DA retenue, Écarts restants, Historique

### Community 172 - "Bois — ROC-007 à ROC-010"
Cohesion: 0.40
Nodes (4): Bois — ROC-007 à ROC-010, DA retenue, Écarts restants, Historique

### Community 173 - "Mineraux — ROC-003 à ROC-006"
Cohesion: 0.40
Nodes (4): Mineraux — ROC-003 à ROC-006, DA retenue, Écarts restants, Historique

## Knowledge Gaps
- **574 isolated node(s):** `JOURS`, `MOIS`, `game`, `PENTA`, `_aim` (+569 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AudioEngine` connect `AudioEngine` to `settingsPanel.js`, `Game.js`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `IslandFauna` connect `IslandFauna` to `toonMaterial`, `flowers.js`, `settingsPanel.js`, `Game.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `GamepadInput` connect `GamepadInput` to `Interactions`, `Game.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `JOURS`, `MOIS`, `game` to the rest of the system?**
  _574 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `globals.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12312312312312312 - nodes in this community are weakly interconnected._
- **Should `Game.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11330049261083744 - nodes in this community are weakly interconnected._
- **Should `Game` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._