# Graph Report - src  (2026-10-21)

## Corpus Check
- 392 files · ~273,510 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1901 nodes · 5252 edges · 95 communities (83 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Lieux et bâtiments
- Moteur de locomotion
- Petite faune (modèles)
- Arbres de la végétation
- Îles, obstacles et troncs
- Jeu (Game)
- Manette
- Pose de locomotion
- Cerf et formes
- Rendu du monde et de l’eau
- Récolte et objets
- Personnage animé
- Navigation à voile
- Personnage et visage
- Apparence du joueur
- Herbe en tapis (rendu)
- Raccord Player et moteur
- Fleurs et faune des îles
- Terrain et détails
- Grille et flore des îles
- Squelette et cinématique inverse
- Récolte (Gather)
- Vache
- Grand arbre et palmier
- Espèces et surface des îles
- Végétation lointaine et biomes
- Carte, brouillard, minicarte
- Ateliers
- Assemblage des modèles
- Moteur audio
- Interface (DOM)
- Objets à collecter
- Moteur audio
- Pipeline de rendu
- Bateaux
- Relief
- Carte, brouillard, minicarte
- Démarrage et outils de dev
- Sauvegarde et réglages
- Espèces et surface des îles
- Rendu du monde et de l’eau
- Chèvre
- Mouton
- Carte d’herbe du Worker
- Hydrologie et chemins
- Faune de l’île de départ
- Récolte et objets
- Démarrage, réglages et audio
- Caméra
- Décor posé par le joueur
- Vol en aigle
- Relevés des animaux de ferme
- Faune des îles
- Retours de locomotion
- Vol en aigle
- Registre des modèles
- Cycle du jour
- Objets marins
- Terrain et détails
- Entrées clavier
- Saisons
- Moteur audio
- Hibou
- Météo
- Réglages de locomotion
- Sauvegarde et réglages
- Mouton
- Faune de l’île de départ
- Budgets des modèles

## God Nodes (most connected - your core abstractions)
1. `fiche()` - 102 edges
2. `G` - 101 edges
3. `lire()` - 87 edges
4. `Builder` - 75 edges
5. `Game` - 60 edges
6. `AudioEngine` - 54 edges
7. `bx()` - 48 edges
8. `IslandManager` - 40 edges
9. `GamepadInput` - 36 edges
10. `groundAt()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `buildAvatarGeometry()` --references--> `W`  [EXTRACTED]
  models/personnage/corps/index.js → data/harvest.js
- `vache()` --indirect_call--> `h()`  [INFERRED]
  models/animaux/vache/index.js → ui/dom.js
- `construire()` --indirect_call--> `h()`  [INFERRED]
  models/bateaux/commun.js → ui/dom.js
- `flowerGeometry()` --indirect_call--> `h()`  [INFERRED]
  models/plantes/fleurs/index.js → ui/dom.js
- `cristal()` --indirect_call--> `h()`  [INFERRED]
  models/rochers/mineraux/index.js → ui/dom.js

## Import Cycles
- None detected.

## Communities (95 total, 12 thin omitted)

### Community 0 - "Lieux et bâtiments"
Cohesion: 0.05
Nodes (73): arbreGeant(), barque(), barqueAmarree(), barqueEchouee(), epave(), ancre(), boueeEchouee(), cabane() (+65 more)

### Community 1 - "Moteur de locomotion"
Cohesion: 0.07
Nodes (83): AIR, airStep(), approach(), BANKING, bankStep(), BASE, bonk(), bonkStep() (+75 more)

### Community 2 - "Petite faune (modèles)"
Cohesion: 0.09
Nodes (39): espece, espece, espece, espece, espece, espece, BUTTERFLY_PIVOTS, CRAB_LEG_PIVOTS (+31 more)

### Community 3 - "Arbres de la végétation"
Cohesion: 0.07
Nodes (55): arbreFruitier(), arbrePompon(), bambou(), bouleau(), arbreCerisier(), champiGeant(), pin(), pine() (+47 more)

### Community 4 - "Îles, obstacles et troncs"
Cohesion: 0.06
Nodes (25): PALETTES_HERBE, ACC_ATTRS, _bc, bloomColor(), BLOOMS, _bp, _c, composeItem() (+17 more)

### Community 6 - "Manette"
Cohesion: 0.06
Nodes (15): _aim, BTN, center(), GamepadInput, identifyController(), PAD_DEFAULTS, padName(), pickFocus() (+7 more)

### Community 7 - "Pose de locomotion"
Cohesion: 0.10
Nodes (43): airPose(), ARM_DYN, _ax, bankAngle(), bankDrop(), blendGait(), bodyBank(), bonkPose() (+35 more)

### Community 8 - "Cerf et formes"
Cohesion: 0.06
Nodes (42): ANDOUILLERS, ARRIERE, AVANT, avec(), AXE_TETE, axis, C0, CC (+34 more)

### Community 9 - "Rendu du monde et de l’eau"
Cohesion: 0.10
Nodes (24): ORIGIN, U, ARCHIPEL, smooth(), worldLimit(), buildLake(), buildRivers(), riverMaterial() (+16 more)

### Community 10 - "Récolte et objets"
Cohesion: 0.08
Nodes (19): HARVEST, TIER_NAMES, TOOL_NAMES, W, BUGS, FISH, FLOWER_COLORS, itemIcon() (+11 more)

### Community 11 - "Personnage animé"
Cohesion: 0.09
Nodes (18): ARM_BONES, BASE, buildDust(), Character, damp(), FIDGETS, PuffPool, axisInRoot() (+10 more)

### Community 12 - "Navigation à voile"
Cohesion: 0.09
Nodes (12): FaceAtlas, damp(), idealTrim(), lerpAngle(), pointOfSail(), Sailing, smoothDamp(), BOAT_ORDER (+4 more)

### Community 13 - "Personnage et visage"
Cohesion: 0.11
Nodes (25): CHAR_IDS, BLINKABLE, EXPRESSIONS, EYE, FACE, MOUTH, SHAPES, B (+17 more)

### Community 14 - "Apparence du joueur"
Cohesion: 0.12
Nodes (27): CLOTH_COLORS, CLOTH_NAMES, EYES, HAIR_COLORS, HAIRS, index(), PIECES, piecesOf() (+19 more)

### Community 15 - "Herbe en tapis (rendu)"
Cohesion: 0.10
Nodes (14): champDeSecours(), dataTexture(), HerbeSystem, NO_CUT, patchGeometry(), PRESET_ORDER, herbeMaterial(), bladesAt() (+6 more)

### Community 16 - "Raccord Player et moteur"
Cohesion: 0.11
Nodes (14): arriveIntent(), climbable(), interpolate(), stepMotor(), advanceGaitPhase(), strideLength(), angleDelta(), damp() (+6 more)

### Community 17 - "Fleurs et faune des îles"
Cohesion: 0.11
Nodes (12): MAT, archeGlycine(), lavandeGeante(), C, Flowers, Grid, pickWeighted(), rng() (+4 more)

### Community 18 - "Terrain et détails"
Cohesion: 0.15
Nodes (28): parasolPlage(), transat(), grassMaterial(), contexts, waterDepthAt(), buildCliff(), buildDetails(), cliffColumns() (+20 more)

### Community 19 - "Grille et flore des îles"
Cohesion: 0.10
Nodes (24): placeFlora(), bicubic(), bilinear(), cr(), MinHeap, stableId(), astar(), buildPaths() (+16 more)

### Community 20 - "Squelette et cinématique inverse"
Cohesion: 0.08
Nodes (28): applyJoints(), ARM, _ax, boneToRoot(), _c, _chain, clamp(), _d (+20 more)

### Community 22 - "Vache"
Cohesion: 0.07
Nodes (29): ARRIERE, AVANT, AXE_TETE, axis, CC, COL, CORPS, CR (+21 more)

### Community 23 - "Grand arbre et palmier"
Cohesion: 0.13
Nodes (12): grandArbre(), trunkAlong(), palmier(), ile(), PAL, palmFrondGeometry(), rng(), segment() (+4 more)

### Community 24 - "Espèces et surface des îles"
Cohesion: 0.11
Nodes (20): BLOOM_RGB, buildLOD1(), buildLOD2(), buildTile(), f32, GRASSY, gridIndex(), halfToFloat() (+12 more)

### Community 25 - "Végétation lointaine et biomes"
Cohesion: 0.12
Nodes (21): BIOMES, rgb(), buildFarVeg(), hex(), SHAPES, buildPlan(), BLOOM, BLOOM_COLORS (+13 more)

### Community 26 - "Carte, brouillard, minicarte"
Cohesion: 0.13
Nodes (20): KINDS, fmtKm(), openCartographerPanel(), openLogbookPanel(), islandShape(), openMapPanel(), shapeCache, MiniMap (+12 more)

### Community 27 - "Ateliers"
Cohesion: 0.13
Nodes (20): chantier, couture, etabli, four, article(), decor(), arche, fontaine (+12 more)

### Community 28 - "Assemblage des modèles"
Cohesion: 0.12
Nodes (24): chevre(), CURL_COAT, CURL_COAT_LITE, EAR, EAR_IN, EAR_IN_LITE, EAR_LITE, espece (+16 more)

### Community 29 - "Moteur audio"
Cohesion: 0.18
Nodes (20): nextId(), assembleBuilder(), assembleCreature(), assembleKind(), assembleMesh(), assemblePart(), flat(), _id (+12 more)

### Community 31 - "Objets à collecter"
Cohesion: 0.15
Nodes (3): h(), replay(), UI

### Community 32 - "Moteur audio"
Cohesion: 0.17
Nodes (11): _zero, Collectibles, seeded(), build(), buildAlbatros(), SPECIES, halo(), mesh() (+3 more)

### Community 34 - "Bateaux"
Cohesion: 0.14
Nodes (7): fsCam, fsGeo, FSPass, makeRT(), Pipeline, QUALITY, SunShadow

### Community 35 - "Relief"
Cohesion: 0.18
Nodes (14): caracteristiques, dessin(), boat(), construire(), hull(), materials(), sailGeometry(), caracteristiques (+6 more)

### Community 36 - "Carte, brouillard, minicarte"
Cohesion: 0.23
Nodes (17): fbm(), GX, GY, makeNoise(), ridged(), mulberry32(), partModel(), clamp() (+9 more)

### Community 37 - "Démarrage et outils de dev"
Cohesion: 0.16
Nodes (14): pick(), weighted(), ARCHETYPES, islandTraits(), MILL_COLORS, VILLAGES, WRECKS, BY_ZONE (+6 more)

### Community 38 - "Sauvegarde et réglages"
Cohesion: 0.15
Nodes (14): addObstacle(), addObstacles(), bridgeY(), cellKey(), _co, _d, grid, near() (+6 more)

### Community 39 - "Espèces et surface des îles"
Cohesion: 0.16
Nodes (14): createDefaultState(), dayKeyOf(), LEGACY_KEYS, LEGACY_SETTINGS, MARINE_IDS, migrate(), randomSeed(), SEED_A (+6 more)

### Community 40 - "Rendu du monde et de l’eau"
Cohesion: 0.18
Nodes (13): ENCOMBREMENT, GRIMPE, FOREST_TREES, SLOPE_MAX, ZONE_TABLE, KIND_INDEX, KIND_RADIUS, KINDS (+5 more)

### Community 41 - "Chèvre"
Cohesion: 0.21
Nodes (12): buildClumpGeometry(), buildShadowProxies(), rng(), canvas(), cloudAtlas(), leafAtlas(), paperTexture(), rng() (+4 more)

### Community 42 - "Mouton"
Cohesion: 0.18
Nodes (16): densiteHerbeBiome(), B_NONE, BIOME_DRY, BIOME_TALL, BUILT, CONIFERS, CROWN, G_NONE (+8 more)

### Community 43 - "Carte d’herbe du Worker"
Cohesion: 0.25
Nodes (13): hydraulic(), thermal(), accumulate(), carveRivers(), chaikin(), DI, DJ, findLakes() (+5 more)

### Community 44 - "Hydrologie et chemins"
Cohesion: 0.24
Nodes (10): Fauna, makeButterfly(), makeCrab(), makeGull(), rand(), skeleton(), _zero, butterflyGeometry() (+2 more)

### Community 46 - "Récolte et objets"
Cohesion: 0.20
Nodes (10): JOURS, MOIS, game, CHANNEL_LABELS, CHANNELS, PENTA, choice(), hourLabel() (+2 more)

### Community 47 - "Démarrage, réglages et audio"
Cohesion: 0.19
Nodes (4): CameraRig, damp(), lerpAngle(), wrapAngle()

### Community 48 - "Caméra"
Cohesion: 0.23
Nodes (4): uid(), Decor, removeObstacle(), removeObstacles()

### Community 50 - "Vol en aigle"
Cohesion: 0.18
Nodes (10): Parts, rejoue(), rejoue(), surTete(), T(), vache(), versCorps(), versTete() (+2 more)

### Community 53 - "Retours de locomotion"
Cohesion: 0.24
Nodes (9): POSE, toolCache, toolMesh(), canStand(), groundAt(), isHome(), pickGround(), terrainY() (+1 more)

### Community 54 - "Vol en aigle"
Cohesion: 0.18
Nodes (9): FICHES, BY_ID, CATEGORIES, categoryOf(), MODELS, ORDRE, STATUTS, TAILLES (+1 more)

### Community 55 - "Registre des modèles"
Cohesion: 0.18
Nodes (10): canonicalHour(), COLOR_FIELDS, DayCycle, grey, KEYS, MOON_LIGHT, MOON_SKY, PREPARED (+2 more)

### Community 56 - "Cycle du jour"
Cohesion: 0.29
Nodes (5): hashString(), DRIFTING, LABELS, MarineManager, markerFor()

### Community 57 - "Objets marins"
Cohesion: 0.40
Nodes (10): blocked(), buildGrass(), champsMaison(), rng(), slopeAt(), smooth(), solSousHerbe(), terrainColorSampler() (+2 more)

### Community 59 - "Entrées clavier"
Cohesion: 0.29
Nodes (9): anneauGeo(), BELL, clocheSuisse(), collar(), collier(), HOOF, HOOF_SMOOTH, profilCarre() (+1 more)

### Community 60 - "Saisons"
Cohesion: 0.22
Nodes (7): applySeason(), AUTUMN, BLOSSOM, cellHash(), SEASONS, WARM, WINTER

### Community 62 - "Hibou"
Cohesion: 0.32
Nodes (4): damp(), Owl, build(), buildHibou()

### Community 63 - "Météo"
Cohesion: 0.39
Nodes (3): makePrecip(), seeded(), Weather

### Community 64 - "Réglages de locomotion"
Cohesion: 0.33
Nodes (5): CLIMB_STATES, BASE_TUNING, cache, REACTIF, SURFACES

### Community 65 - "Sauvegarde et réglages"
Cohesion: 0.47
Nodes (3): loadSave(), openDB(), writeSave()

### Community 66 - "Mouton"
Cohesion: 0.40
Nodes (5): affine(), leafGeo(), patch(), union(), _up

## Knowledge Gaps
- **271 isolated node(s):** `game`, `BTN`, `_aim`, `PAD_DEFAULTS`, `PS_GLYPHS` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `groundAt()` connect `Retours de locomotion` to `Moteur audio`, `Manette`, `Sauvegarde et réglages`, `Rendu du monde et de l’eau`, `Récolte et objets`, `Raccord Player et moteur`, `Décor posé par le joueur`, `Caméra`, `Récolte (Gather)`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `Pipeline de rendu` to `Moteur audio`, `Récolte et objets`, `Interface (DOM)`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `toonMaterial()` connect `Moteur audio` to `Petite faune (modèles)`, `Relief`, `Îles, obstacles et troncs`, `Hydrologie et chemins`, `Fleurs et faune des îles`, `Terrain et détails`, `Relevés des animaux de ferme`, `Moteur audio`, `Hibou`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `game`, `BTN`, `_aim` to the rest of the system?**
  _271 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lieux et bâtiments` be split into smaller, more focused modules?**
  _Cohesion score 0.05171996124031008 - nodes in this community are weakly interconnected._
- **Should `Moteur de locomotion` be split into smaller, more focused modules?**
  _Cohesion score 0.07338935574229692 - nodes in this community are weakly interconnected._
- **Should `Petite faune (modèles)` be split into smaller, more focused modules?**
  _Cohesion score 0.09131652661064425 - nodes in this community are weakly interconnected._