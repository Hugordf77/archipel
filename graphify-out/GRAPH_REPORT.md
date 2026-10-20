# Graph Report - src  (2026-10-20)

## Corpus Check
- 284 files · ~261,734 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1840 nodes · 5280 edges · 90 communities (80 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Lieux et bâtiments
- Arbres de la végétation
- Îles, obstacles et troncs
- Petite faune (modèles)
- Moteur audio
- Jeu (Game)
- Récolte et objets
- Faune de l’île de départ
- Manette
- Cerf et formes
- Rendu du monde et de l’eau
- Pose de locomotion
- Carte, brouillard, minicarte
- Apparence du joueur
- Personnage et visage
- Personnage animé
- Terrain et détails
- Raccord Player et moteur
- Vache
- Fleurs et faune des îles
- Squelette et cinématique inverse
- Récolte en jeu
- Sauvegarde et réglages
- Vol en aigle
- Mouton
- Grand arbre et palmier
- Moteur : saut, chute, réception
- Navigation à voile
- Espèces et surface des îles
- Ateliers
- Hydrologie et chemins
- Démarrage et outils de dev
- Zones, bruit et flore
- Moteur : états et inclinaison
- Interface (DOM)
- Pipeline de rendu
- Assemblage des modèles
- Lieux et apparitions
- Bateaux
- Végétation lointaine et biomes
- Objets marins
- Objets à collecter
- Chèvre
- Caméra
- Faune des îles
- Retours de locomotion
- Registre des modèles
- Cycle du jour
- Interactions
- Décoration
- Accroche aux troncs
- Relief
- Clavier et souris
- Hibou
- Saisons
- Atlas du visage
- Grimpe : pas sur le tronc
- Surface d’île
- Réglages de locomotion
- Moteur : rotation et pente
- Textures peintes
- Météo
- Grille
- Budgets des modèles

## God Nodes (most connected - your core abstractions)
1. `fiche()` - 102 edges
2. `G` - 101 edges
3. `lire()` - 87 edges
4. `Builder` - 75 edges
5. `Game` - 59 edges
6. `AudioEngine` - 53 edges
7. `bx()` - 48 edges
8. `groundAt()` - 43 edges
9. `IslandManager` - 39 edges
10. `h()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `partModel()` --calls--> `mulberry32()`  [EXTRACTED]
  models/lieux.js → core/random.js
- `buildAvatarGeometry()` --references--> `W`  [EXTRACTED]
  models/personnage/corps/index.js → data/harvest.js
- `vache()` --indirect_call--> `h()`  [INFERRED]
  models/animaux/vache/index.js → ui/dom.js
- `construire()` --indirect_call--> `h()`  [INFERRED]
  models/bateaux/commun.js → ui/dom.js
- `flowerGeometry()` --indirect_call--> `h()`  [INFERRED]
  models/plantes/fleurs/index.js → ui/dom.js

## Import Cycles
- None detected.

## Communities (90 total, 10 thin omitted)

### Community 0 - "Lieux et bâtiments"
Cohesion: 0.06
Nodes (74): arbreGeant(), barque(), barqueAmarree(), barqueEchouee(), epave(), ancre(), boueeEchouee(), cabane() (+66 more)

### Community 1 - "Arbres de la végétation"
Cohesion: 0.07
Nodes (54): arbreFruitier(), arbrePompon(), bambou(), bouleau(), arbreCerisier(), champiGeant(), pin(), pine() (+46 more)

### Community 2 - "Îles, obstacles et troncs"
Cohesion: 0.06
Nodes (28): ENCOMBREMENT, GRIMPE, ACC_ATTRS, _bc, BLOOMS, _bp, _c, composeItem() (+20 more)

### Community 3 - "Petite faune (modèles)"
Cohesion: 0.12
Nodes (14): fiche(), outil(), PREFIXES, species(), birdParts(), part(), quad(), colonnes (+6 more)

### Community 4 - "Moteur audio"
Cohesion: 0.08
Nodes (6): AudioEngine, CHANNEL_LABELS, CHANNELS, midiToHz(), PENTA, rand()

### Community 6 - "Récolte et objets"
Cohesion: 0.07
Nodes (19): HARVEST, TIER_NAMES, TOOL_NAMES, W, BUGS, FISH, FLOWER_COLORS, itemIcon() (+11 more)

### Community 7 - "Faune de l’île de départ"
Cohesion: 0.07
Nodes (36): Fauna, makeButterfly(), makeCrab(), makeGull(), Parts, rand(), skeleton(), _zero (+28 more)

### Community 8 - "Manette"
Cohesion: 0.08
Nodes (13): _aim, BTN, center(), GamepadInput, identifyController(), PAD_DEFAULTS, padName(), pickFocus() (+5 more)

### Community 9 - "Cerf et formes"
Cohesion: 0.05
Nodes (46): ANDOUILLERS, ARRIERE, AVANT, avec(), AXE_TETE, axis, C0, CC (+38 more)

### Community 10 - "Rendu du monde et de l’eau"
Cohesion: 0.09
Nodes (26): ORIGIN, U, buildClumpGeometry(), buildShadowProxies(), rng(), buildLake(), buildRivers(), riverMaterial() (+18 more)

### Community 11 - "Pose de locomotion"
Cohesion: 0.10
Nodes (43): airPose(), ARM_DYN, _ax, bankAngle(), bankDrop(), blendGait(), bodyBank(), bonkPose() (+35 more)

### Community 12 - "Carte, brouillard, minicarte"
Cohesion: 0.09
Nodes (33): pick(), KINDS, fmtKm(), openCartographerPanel(), openLogbookPanel(), islandShape(), openMapPanel(), shapeCache (+25 more)

### Community 13 - "Apparence du joueur"
Cohesion: 0.11
Nodes (29): CLOTH_COLORS, CLOTH_NAMES, defaultAvatar(), EYES, HAIR_COLORS, index(), PIECES, piecesOf() (+21 more)

### Community 14 - "Personnage et visage"
Cohesion: 0.10
Nodes (26): CHAR_IDS, HAIRS, BLINKABLE, EXPRESSIONS, EYE, FACE, MOUTH, SHAPES (+18 more)

### Community 15 - "Personnage animé"
Cohesion: 0.09
Nodes (18): ARM_BONES, BASE, buildDust(), Character, damp(), FIDGETS, PuffPool, axisInRoot() (+10 more)

### Community 16 - "Terrain et détails"
Cohesion: 0.14
Nodes (32): parasolPlage(), transat(), kindModel(), blocked(), buildGrass(), rng(), slopeAt(), terrainColorSampler() (+24 more)

### Community 17 - "Raccord Player et moteur"
Cohesion: 0.10
Nodes (18): arriveIntent(), climbable(), createMotor(), interpolate(), resetMotor(), setProfile(), stepMotor(), advanceGaitPhase() (+10 more)

### Community 18 - "Vache"
Cohesion: 0.07
Nodes (34): ARRIERE, AVANT, AXE_TETE, axis, CC, COL, CORPS, CR (+26 more)

### Community 19 - "Fleurs et faune des îles"
Cohesion: 0.10
Nodes (14): _zero, SPECIES, MAT, archeGlycine(), lavandeGeante(), C, Flowers, Grid (+6 more)

### Community 20 - "Squelette et cinématique inverse"
Cohesion: 0.08
Nodes (28): applyJoints(), ARM, _ax, boneToRoot(), _c, _chain, clamp(), _d (+20 more)

### Community 22 - "Sauvegarde et réglages"
Cohesion: 0.13
Nodes (23): exportSave(), loadSave(), openDB(), readImportFile(), writeSave(), createDefaultState(), dayKeyOf(), LEGACY_KEYS (+15 more)

### Community 23 - "Vol en aigle"
Cohesion: 0.15
Nodes (12): AirRide, damp(), POSE, toolCache, toolMesh(), canStand(), groundAt(), isHome() (+4 more)

### Community 24 - "Mouton"
Cohesion: 0.11
Nodes (26): CURL_COAT, CURL_COAT_LITE, EAR, EAR_IN, EAR_IN_LITE, EAR_LITE, espece, mouton() (+18 more)

### Community 25 - "Grand arbre et palmier"
Cohesion: 0.13
Nodes (12): grandArbre(), trunkAlong(), palmier(), ile(), PAL, palmFrondGeometry(), rng(), segment() (+4 more)

### Community 26 - "Moteur : saut, chute, réception"
Cohesion: 0.22
Nodes (28): airStep(), bonk(), bonkStep(), emit(), fallenStep(), gaitSpeed(), land(), locoStep() (+20 more)

### Community 27 - "Navigation à voile"
Cohesion: 0.12
Nodes (11): damp(), idealTrim(), lerpAngle(), pointOfSail(), Sailing, smoothDamp(), BOAT_ORDER, BOATS (+3 more)

### Community 28 - "Espèces et surface des îles"
Cohesion: 0.14
Nodes (25): KIND_INDEX, KIND_RADIUS, KINDS, SMALL, TREES, reliefContext(), BLOOM_RGB, buildDepthWindow() (+17 more)

### Community 29 - "Ateliers"
Cohesion: 0.13
Nodes (20): chantier, couture, etabli, four, article(), decor(), arche, fontaine (+12 more)

### Community 30 - "Hydrologie et chemins"
Cohesion: 0.15
Nodes (20): hydraulic(), thermal(), MinHeap, accumulate(), carveRivers(), chaikin(), DI, DJ (+12 more)

### Community 31 - "Démarrage et outils de dev"
Cohesion: 0.12
Nodes (19): JOURS, MOIS, game, addObstacle(), addObstacles(), bridgeY(), cellKey(), _co (+11 more)

### Community 32 - "Zones, bruit et flore"
Cohesion: 0.15
Nodes (22): fbm(), GX, GY, makeNoise(), FOREST_TREES, placeFlora(), SLOPE_MAX, ZONE_TABLE (+14 more)

### Community 33 - "Moteur : états et inclinaison"
Cohesion: 0.12
Nodes (24): AIR, BANKING, bankStep(), BASE, canJump(), CLIMBING, exitStep(), GRIP (+16 more)

### Community 34 - "Interface (DOM)"
Cohesion: 0.15
Nodes (3): h(), replay(), UI

### Community 35 - "Pipeline de rendu"
Cohesion: 0.12
Nodes (7): fsCam, fsGeo, FSPass, makeRT(), Pipeline, QUALITY, SunShadow

### Community 36 - "Assemblage des modèles"
Cohesion: 0.20
Nodes (18): nextId(), assembleBuilder(), assembleCreature(), assembleKind(), assembleMesh(), assemblePart(), flat(), _id (+10 more)

### Community 37 - "Lieux et apparitions"
Cohesion: 0.16
Nodes (19): mulberry32(), weighted(), bilinear(), stableId(), FALLBACK, GENERIC, MICRO, placeMicro() (+11 more)

### Community 38 - "Bateaux"
Cohesion: 0.18
Nodes (14): caracteristiques, dessin(), boat(), construire(), hull(), materials(), sailGeometry(), caracteristiques (+6 more)

### Community 39 - "Végétation lointaine et biomes"
Cohesion: 0.20
Nodes (11): BIOMES, buildFarVeg(), hex(), SHAPES, slopeAt(), sealLakes(), buildPlan(), applyStamps() (+3 more)

### Community 40 - "Objets marins"
Cohesion: 0.22
Nodes (8): hashString(), marine(), MARINE_TYPES, marineMesh(), DRIFTING, LABELS, MarineManager, markerFor()

### Community 41 - "Objets à collecter"
Cohesion: 0.23
Nodes (8): Collectibles, seeded(), halo(), mesh(), glowMaterial(), toonMaterial(), coastRadius(), blockedByObstacle()

### Community 42 - "Chèvre"
Cohesion: 0.28
Nodes (13): chevre(), espece, anneauGeo(), BELL, clocheSuisse(), collier(), eye(), legs() (+5 more)

### Community 43 - "Caméra"
Cohesion: 0.19
Nodes (4): CameraRig, damp(), lerpAngle(), wrapAngle()

### Community 46 - "Registre des modèles"
Cohesion: 0.18
Nodes (9): FICHES, BY_ID, CATEGORIES, categoryOf(), MODELS, ORDRE, STATUTS, TAILLES (+1 more)

### Community 47 - "Cycle du jour"
Cohesion: 0.18
Nodes (10): canonicalHour(), COLOR_FIELDS, DayCycle, grey, KEYS, MOON_LIGHT, MOON_SKY, PREPARED (+2 more)

### Community 50 - "Accroche aux troncs"
Cohesion: 0.32
Nodes (11): climbBase(), grab(), trunkLimits(), tryGrab(), CACHE, geo(), trunkClosest(), trunkFrame() (+3 more)

### Community 51 - "Relief"
Cohesion: 0.38
Nodes (10): ridged(), clamp(), smooth(), baseGrid(), baseHeight(), cache, interior(), landness() (+2 more)

### Community 53 - "Hibou"
Cohesion: 0.27
Nodes (5): damp(), Owl, build(), buildHibou(), ILE_DEPART

### Community 54 - "Saisons"
Cohesion: 0.22
Nodes (7): applySeason(), AUTUMN, BLOSSOM, cellHash(), SEASONS, WARM, WINTER

### Community 56 - "Grimpe : pas sur le tronc"
Cohesion: 0.28
Nodes (9): approach(), clearClimb(), climbStep(), leaveTrunk(), rebase(), snapStep(), stickAxis(), trunkJump() (+1 more)

### Community 58 - "Réglages de locomotion"
Cohesion: 0.33
Nodes (5): CLIMB_STATES, BASE_TUNING, cache, REACTIF, SURFACES

### Community 59 - "Moteur : rotation et pente"
Cohesion: 0.48
Nodes (7): clamp(), gripAt(), lerp(), rotate(), slopeFactor(), steer(), turnParams()

### Community 60 - "Textures peintes"
Cohesion: 0.67
Nodes (6): canvas(), cloudAtlas(), leafAtlas(), paperTexture(), rng(), tileNoise()

### Community 61 - "Météo"
Cohesion: 0.38
Nodes (3): makePrecip(), seeded(), Weather

### Community 62 - "Grille"
Cohesion: 0.33
Nodes (3): bicubic(), cr(), Grid

## Knowledge Gaps
- **260 isolated node(s):** `game`, `BTN`, `_aim`, `PS_GLYPHS`, `MOVE` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `groundAt()` connect `Vol en aigle` to `Jeu (Game)`, `Manette`, `Objets à collecter`, `Rendu du monde et de l’eau`, `Apparence du joueur`, `Interactions`, `Raccord Player et moteur`, `Décoration`, `Récolte en jeu`, `Démarrage et outils de dev`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `mulberry32()` connect `Lieux et apparitions` to `Zones, bruit et flore`, `Lieux et bâtiments`, `Arbres de la végétation`, `Assemblage des modèles`, `Objets marins`, `Faune des îles`, `Carte, brouillard, minicarte`, `Fleurs et faune des îles`, `Relief`, `Espèces et surface des îles`, `Hydrologie et chemins`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `Moteur audio` to `Démarrage et outils de dev`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `game`, `BTN`, `_aim` to the rest of the system?**
  _260 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lieux et bâtiments` be split into smaller, more focused modules?**
  _Cohesion score 0.05732390215148836 - nodes in this community are weakly interconnected._
- **Should `Arbres de la végétation` be split into smaller, more focused modules?**
  _Cohesion score 0.07367737747484583 - nodes in this community are weakly interconnected._
- **Should `Îles, obstacles et troncs` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._