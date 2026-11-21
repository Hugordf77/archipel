# Livraisons — Archipel

Point d'entrée pour une IA ou un nouvel arrivant : ce qui est livré, où ça vit, comment le vérifier, ce
qui est en cours. Mis à jour le 02/11/2026. À tenir à jour à chaque livraison (section « État courant »
et domaine concerné).

## Démarrer

- Jeu : `npm run dev`, puis http://localhost:5173 (les agents utilisent la configuration `ile` de
  `.claude/launch.json`, port 5174, pour ne pas gêner la partie de l'utilisateur).
- Catalogue des modèles : `/catalogue.html` ; tableau de bord de production : `/dashboard.html`.
- Tests : `npm test` (27 fichiers) ; build : `npm run build`.
- Outils de développement en jeu : `window.__ile` (`tp`, `setHour`, `frame`, `look`, `settle`, `capture`,
  `game.skipSave`).

## Où trouver le contexte

| Besoin | Lire |
| --- | --- |
| Vue d'ensemble, commandes, déplacements, sauvegarde, arborescence | `README.md` |
| Carte du code : communautés, nœuds centraux, liens inattendus | `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html` ; requête : `graphify query "<question>"` |
| Règles de direction artistique des modèles | `docs/DA.md` |
| Rangement des modèles (un dossier par modèle) | `docs/modeles-arborescence.md` |
| Équipe d'agents et qui modifie quoi | `.claude/agents/equipe-production.md`, puis le fichier de chaque agent |
| Méthode pour créer ou reprendre un modèle | `.claude/skills/modele-3d/SKILL.md` |
| Fiche d'un modèle (DA retenue, écarts, historique) | `src/models/<catégorie>/<modèle>/FICHE.md` |

## Livré, par domaine

### Physique et locomotion du joueur

- **Moteur pur et déterministe** (ni THREE ni DOM) : `src/entities/locomotion/motor.js`. Modèle « cap +
  vitesse » : inertie de rotation par ressort amorti borné, glisse latérale, dérapage et demi-tour,
  roulade et enchaînement, saut, chute, rebords, pentes. Pas fixe de 1/120 s avec accumulateur : même
  trajectoire quelle que soit la cadence d'image.
- **Réglages** : `locomotion/tuning.js` (une table en unités SI ; profil `realiste` par défaut, `reactif`
  avec moins d'inertie ; `SURFACES` : vitesse, accélération et adhérence par sol).
- **Pose et retours** : `locomotion/pose.js` (`locomotionPose`, inclinaison, tête en course),
  `locomotion/feedback.js` (`LocoFeedback` : pas, poussière, sons), `locomotion/movement.js`
  (`approachVelocity`, `normalizePlanarInput`).
- **Raccord au monde** : `src/entities/Player.js` (sol, eau, nage, obstacles, glissement le long d'un
  obstacle) ; navigation `src/world/navigation.js` (`groundAt`, `obstacleAt`, `waterDepth`).
- **Tests** : `tests/locomotion.test.js` (cadence, allures, inertie, dérapage, roulade, saut, chute et
  rebords, pentes, clic pour aller, pose, trébucher, tête en course), `tests/player-movement.test.js`,
  `tests/water-physics.test.js`, `tests/collisions.test.js`.
- **Agent** : `locomotion-physique` (défauts reproductibles de déplacement, saut, chute, roulade, pente,
  collision ; ne touche pas aux modèles).
- **Grimper aux arbres, données des troncs** (partie C) : `grimpe: { tronc: [[x, y, z, r], …], sommet }`
  dans le `physique.js` des espèces grimpables (palmier pour l'instant), table `GRIMPE` de
  `physique.gen.js` ; l'obstacle de chaque arbre d'île porte `grimpe: { kind, x, y, z, rot, sc, def }`
  (`IslandManager.js`, `buildKind`), les 6 palmiers de la maison aussi (`world/home/props.js`,
  `PALMIER_MAISON`) ; `troncMonde()` (`world/navigation.js`) donne l'axe en coordonnées du monde. Format :
  `docs/modeles-arborescence.md`. Tests : `tests/troncs.test.js` (polyligne à moins de 1 cm du maillage :
  5,2 mm pour le palmier d'île, 3,7 mm pour la maison ; tronc qui disparaît avec son obstacle).
- **Grimper aux palmiers, moteur** (partie A, agent `locomotion-physique`) : états `CLIMB` et `CLIMB_TOP`
  dans `motor.js` (pas fixe), géométrie pure du tronc `locomotion/trunk.js` (`trunkFrame`, n(θ)), réglages
  « grimper aux troncs » de `tuning.js` (montée 1,5, descente 1,8, glissade 4 m/s, tour 2,4 rad/s,
  accroche au bord du corps à 0,45 m, saut arrière 4,5 m/s ± 60°, saut du sommet × 1,15,
  `regrabDelay` 0,35 s). `Player` : `env.trunks` (`troncsProches` de `navigation.js`), `climbing`,
  `savePosition()` (jamais sur un tronc), champs `climb*` de `loco`. Commandes : saut = s'accrocher puis
  sauter, roulade = lâcher, stick brut (`intent.stick`) haut/bas = monter/descendre, gauche/droite =
  tourner. Tests : `tests/grimpe.test.js` (23, dont l'intégration réelle `Player` + `navigation.js`).
- **Grimper aux palmiers, pose et retours** (partie B) : familles `climb` et `perch` (`pose.js` :
  `climbPose`, `perchPose`, cibles des mains `climbHandTarget` sur la vraie courbe de l'axe, corps
  incliné selon la corde pieds → mains `trunkChord`) ; `Character.js` : mains sur l'écorce par
  cinématique inverse (`reachHand` en charnière « côté » avec mémoire, `rig.js`), cycle lié à la
  position sur le tronc (interpolée à l'image), bascule du poirier en 0,4 s, glissement des prises,
  vitesse des bras bornée aux changements de prise, saut arrière dos cambré, vitesse verticale lissée en
  l'air (saut relâché tôt). Caméra : `CameraRig.climbFollow` (trois quarts, tourne avec θ, recul,
  visée relevée, en suivi seulement). Retours : `feedback.js` (toc boisé, frottement d'écorce, copeaux,
  bruissement des palmes, vibrations), `AudioEngine.woodKnock`, `barkRub`, `palmRustle`, rappel des
  commandes aux 3 premières accroches (`state.player.aideGrimpe`). Sur un tronc : ni épée, ni aigle, ni
  récolte, ni interaction (`Game.js`, `Gather.js`, `AirRide.js`). Tests : `tests/grimpe-pose.test.js`
  (7, sur le vrai personnage et le vrai moteur). Captures : `captures/grimpe-*.png` (non versionnées).

### Coup d'épée

- **Déclenchement** : clavier V (`src/app/Game.js`, `handleKey`, vers la ligne 568 ; refusé en action, assis,
  à bord, en vol, à la nage ou en pose de décor) ; manette □ (`src/core/Gamepad.js`, vers la ligne 447 ;
  l'outil de récolte reste prioritaire sur une cible).
- **Animation** : `src/entities/character/Character.js`. L'épée est portée dans le dos (`backSword`),
  dégainée pour la pose `swordAttack` puis rengainée (`drawSword`, `stowSword`) ; élan au-dessus de
  l'épaule puis frappe, cycle de 0,7 s ; action de 0,82 s.
- **Aides** : réglages (`src/ui/settingsPanel.js`), bandeau d'aide (`Game.js`), aide manette (`Gamepad.js`).
- **Pas encore d'effet** : le rappel de fin d'action est vide (`Game.js`, `playAction('swordAttack', 0.82, () => {})`) ;
  aucune cible n'est touchée.

### Sauvegarde

- **Stockage** : `src/core/db.js`, IndexedDB (base `ile-etude`, magasin `kv`, clé `save`) avec repli
  localStorage ; `exportSave`, `readImportFile`.
- **Modèle** : `src/core/state.js`, `SAVE_VERSION = 2`, `createDefaultState`, `migrate` (complète les
  anciennes sauvegardes et rattache les îles notées de l'ancienne génération).
- **Écriture** : `Game.markDirty()` puis `saveNow()` (délais de 2 s et 5 s), à la mise en arrière-plan et à
  la fermeture de la page (`pagehide`). `game.skipSave = true` bloque toute écriture : à poser avant tout
  test en jeu.
- **Réglages** : export, import et réinitialisation dans `src/ui/settingsPanel.js`.
- **Tests** : `tests/progression.test.js` (dont une sauvegarde migrée qui garde stations et ressources).

### Fabrication et progression

- Inventaire et fabrication : `src/gameplay/Inventory.js` (`craft`, `discard`, `freeSlot`), recettes
  `src/data/recipes.json`, objets `src/data/items.js`, barre rapide `src/ui/inventoryUI.js`.
- **Inventaire V2 (plein écran, 21/10/2026)** : `src/ui/inventoryScreen.js` (touche I, △ à la manette),
  logique pure `src/ui/inventoryLogic.js` (8 onglets de catégories : Tout, Ressources, Jardin, Nourriture,
  Faune, Artisanat, Outils, Chantier ; tri par catégorie, nombre ou nom ; pages de 5 × 4 ; déplacement
  dans la grille ; actions et fiche tirées des données), aperçu 3D du personnage
  `src/ui/inventoryPreview.js` (second personnage dans un petit canevas, 0,3 ms par image). Le jeu est en
  pause (`game.paused`, `Game.frame`) ; l'atelier est l'onglet voisin dans le même habillage. Pas de
  « manger » ni de cœurs (aucune faim ni santé dans le jeu) ; rareté en étoiles seulement pour poissons
  et insectes (champ `rarity` existant).
- Tests : `tests/inventaire.test.js` (catégories, tri, pagination, grille, pastilles, actions, fiches).
  Captures : `captures/inventaire-v2-*.png` (non versionnées).
- Tests : `tests/progression.test.js` (fabriquer une station depuis les ressources de base, rien n'est
  consommé si le sac est plein, seules les stations posées à portée sont proposées).

### Modèles 3D

- **Rangement** : un dossier par modèle vedette, `src/models/<catégorie>/<modèle>/` (`index.js`,
  `physique.js`, `FICHE.md`, `reference.png`) ; aides partagées `src/models/kit/` ; index générés
  `index.gen.js`, `releves.gen.js`, `physique.gen.js`.
- **Outils** : `npm run modeles:mesure -- <id>`, `modeles:empreinte`, `modeles:index`, `modeles:fiches`,
  `modeles:releve` ; captures `scripts/modeles/planche.js` (catalogue) et `scripts/modeles/jeu.js` (jeu).
- **Repris d'après planche ou description** : vache ANI-003 (commit `0fbb0fe`, troupeau posé à la main),
  cerf ANI-004 (`7252b94`), mouton ANI-001 (`10e3a8e`). Chèvre ANI-002 et nouvelle passe sur le mouton :
  en cours, non commitées.
- **Agents** : Evis (production) et Evis-critique (revue en lecture seule), règles `docs/DA.md`.
- **Nef effondrée du plateau MON-014** (26/10/2026, branche `claude/ruine-alternative`) : ruine alternative
  à MON-012, même planche (`production/references/ruines-plateau.png`), autre composition (nef de chapelle,
  colonnade, chevet à baie haute, bannière) ; `src/models/monuments/ruines-alternative/`, type de lieu
  `ruines_alternative`, budget propre 8 000 / 4 000 (7 860 / 3 760) ; Evis-critique valide au 2e tour.
  `forme.js` reprend le code de MON-013 (non commité) : à fusionner.
- **Forteresse-navire du Plateau venté, pièces BAT-014 à BAT-019** (27/10 au 01/11/2026, fusionnées dans
  `v3-archipel` le 01/11) : coque et berceau (`navire-coque`, formes communes `forme.js`), maison de pont
  (3 formes), tourelle (2), tour-moulin centrale, mât et voile (2), escalier du flanc et passerelle (2) ;
  chacune avec son budget propre et sa version allégée ; fiches et mesures dans chaque `FICHE.md`, suivi
  dans `docs/forteresse-navire/memory.md` (tableau de bord §0, journal §14). Evis-critique : toutes
  validées, sauf BAT-019 (1er tour corrigé, fini sans 2e tour à la demande de l'utilisateur). Le 01/11 :
  coque abaissée (pont de 20 à 13 m), variante en vol sans berceau ; **BAT-020** habillage de forteresse
  (échauguettes, créneaux, maisonnettes, tuyaux) et **BAT-021** hélices et encombrement (hélices de poupe,
  rotors, linge, tonneaux, ancres, lanternes), sans revue Evis-critique. L'escalier BAT-019 n'est plus
  utilisé par le navire volant.

### Îles et monde

- **Lieux posés à la main** (26/10/2026, branche `claude/ruine-alternative`) : champ `poses` d'une île
  (`archipel.js`, repère de l'île), `poserLieux` (`gen/pois.js`) : un lieu par pose, plate-forme aplanie de
  rayon r, sans tirage. Les sections (`gen/sections.js`) gardent les lieux dont l'ancrage est dans leur
  carré ; `IslandManager.collectDecks` prend les planchers de tout élément qui en déclare. Plateau venté :
  trois moulins-tours BAT-013 sur les sites PV-M1 à M3 du plan, nef effondrée MON-014 sur la traversée
  (local 756, 312). Test `tests/zones/plateau-vente-poses.test.js`. La corniche est faite (voir
  ci-dessous) ; pas encore de chemins (BRF-PV-01, 03 et 04 restent à faire).
- **Montée de la corniche du Vent** (21/11/2026, branche `claude/plateau-corniche`, BRF-PV-02, éléments
  PV-T1 et PV-T2) : le Plateau venté se gravit à pied par une rampe taillée le long de la face ouest de
  l'escarpement, du pied P0 (350, −936, 20,9 m) au palier A (432, −728, 66,3 m), 258 m. Données :
  `terrassements` de la Grande Île (`archipel.js`, repère de l'île : 16 points, demi-largeur 6 m, talus 8 m,
  palier de 6 m). Code : `terrasser`, `traceCorniche` et `arrondir` de `gen/forme.js` (polyligne arrondie par
  Chaikin, hauteur visée linéaire, bande à la hauteur visée, talus fondu, palier plat prioritaire), appelés
  par `buildPlan` après l'érosion et les rivières, avant les zones (la route redevient prairie) ; relief fin
  coupé sur la bande. Seules les cases de la zone `plateau-vente` sont touchées (H identique ailleurs).
  Mesures : pente max 0,192, dévers 0,061, virages de 11,6 m de rayon au moins, aucune roche sur la route ;
  l'escarpement frontal REP-03 reste infranchissable. Test `tests/zones/plateau-corniche.test.js` (7). En jeu
  (serveur `corniche`, port 5183) : marche réelle de P0 à A, touche avant seule, sans chute.
- **Le Navire-forteresse vole autour du Plateau venté** (01/11/2026, commit `4867f67`) : décor, on ne
  monte pas à bord (choix de l'utilisateur ; la pose au sol de `27fd499` est retirée). Éléments et
  trajectoire dans `src/world/plateau/forteresse-navire.js` (`ELEMENTS`, `VOL`, `vol(t)` : cercle de 190 m
  autour du dôme, y 108, un tour en 6 min, houle, roulis, tangage) ; `NavireVolant.js`, créé et mis à jour
  par `IslandManager` : deux versions assemblées un élément par image (de près sous 450 m, cachée au-delà
  de 3 200 m), ailes de la tour-moulin et hélices animées. Vérifier : `npx vitest run
  tests/zones/navire-volant.test.js`, en jeu `__ile.game.islands.navire`.

- **Open world, bases** (22/10/2026, génération 4) : « L'archipel des souvenirs », 6 × 4 km tracé
  d'après la carte de référence de l'utilisateur (4 m par pixel, départ en (0, 0) au sud de la Grande
  Île, nord = −Z). Bases seulement : relief, côtes, eau douce, arbres ; ni lieux, ni villages, ni
  faune, ni ressources (ni petite végétation, ni éléments de la mer) pour l'instant.
  - Données : `src/world/archipel.js`, seule source de vérité. Il contient :
    - 47 îles, dont 25 îlots, pitons et bancs, en pixels de la carte (silhouette en polygone ou en
      cercle, reliefs posés à la main) ;
    - 24 zones nommées (biome, part de forêt, table d'arbres, devise) ;
    - une limite rectangulaire (`worldLimit` : brume dès 100 m avant le bord, courant au-delà,
      demi-tour à 250 m).
  - Relief : `gen/forme.js`. La côte du polygone est déformée par le bruit ; plages et falaises ;
    monts, chaînes, collines, plateaux, cuvettes, volcan, pitons, dunes. Zone et biome par case ; ligne
    des neiges selon la latitude, jamais sur le volcan.
  - Plan : `buildPlanForme` de `gen/plan.js`, `computeZonesForme` de `gen/zones.js`,
    `placeFloraForme` de `gen/flora.js` (arbres seulement, `DENSITE_FORME` 0,5). Seuls les lacs
    voulus restent : Lac céleste, oasis, cuvette de l'Île aux lueurs. Rivières selon la surface des
    terres.
  - Sections : les îles de plus de 420 m de rayon sont découpées en carrés de 512 m (`gen/sections.js`,
    `sectionsOf` de `regions.js`). Chaque section est une île du moteur taillée dans le plan de l'île
    entière, sans raccord visible. Le plan de la Grande Île se calcule une fois dans le Worker (1,2 s
    dans Node) ; une section se taille en 2 ms.
  - Listes de `regions.js` :
    - `ILES` : les îles entières, pour la carte, la minicarte et le journal (les îlots ne comptent pas) ;
    - `ISLANDS` : ce que charge le moteur (117 entrées, dont 30 sections pour la Grande Île) ;
    - `zoneAt(x, z)` : la zone nommée sous un point.
  - Étiquettes :
    - carte (M) : les 24 noms de zones, toujours, pâles tant que la zone n'est pas découverte ;
    - minicarte : la zone courante ;
    - en jeu : un bandeau à l'entrée de chaque zone (`UI.zoneBanner`, `Game.updateZone`).
  - Moteur : caméra et brume portées à 4 km (repères visibles de loin), océan agrandi, palette d'herbe
    par tuile.
  - Sauvegarde : `GEN_VERSION` 4. Le monde repart de zéro (brouillard, îles notées, lieux, récoltes,
    terrassements, épingles) ; inventaire, maison et bateaux sont gardés, joueur et bateau ramenés au
    départ.
  - Captures : `captures/open-world-*.png` (carte, Sommet givré, forêt, Lac céleste, volcan, Îles
    célestes, désert, Île aux lueurs, bandeau d'entrée).
  - Tests : `tests/world.test.js` (zones, chenaux de 70 m au moins, repères, sections, bases, Lac
    céleste, limite, migration v4).
- **Montagnes, collines et nature** (22/10/2026, `gen/forme.js`, `gen/zones.js`, `gen/flora.js`) :
  - Massifs : relief alpin (`alpine`, bruit en crêtes multifractal) sur l'enveloppe des monts et des
    chaînes, avec arêtes, sommets multiples et vallées en arbre.
  - Neige : ligne des neiges de 82 m au nord à 232 m au sud (`snowLine`), au bord irrégulier ; la
    neige tient jusqu'à une pente de 1,7, au-delà les parois sont en roche givrée (`givre`).
  - Volcan : ravines sur les flancs et lac de cratère.
  - Collines propres à chaque zone (`collines` des zones de `archipel.js`, sinon selon le biome),
    fondues d'une zone à l'autre ; bords des plateaux et des lacs déformés.
  - Nature : espèces d'arbres par zone et décor naturel par micro-zone (`DECOR` : arbustes, buissons
    fleuris, rochers, rochers moussus, fougères, souches, lavande, petits champignons), allégé pour
    les espèces lourdes (`POIDS`). Ce décor ne se récolte pas (`Gather.js`) ; les arbres, si.
  - Mesuré en jeu (Forêt des souvenirs) : 2,5 M triangles, ombres comprises.
  - Plan de la Grande Île : 1,5 à 2,2 s dans Node, une fois par partie, dans le Worker.
- **Îles célestes** (22/10/2026), à la place des pitons en mer :
  - Cinq îles flottantes (`ARCHIPEL.ciel`), de 92 à 228 m d'altitude, au nord de la Grande Île.
  - Modules : `src/world/ciel/relief.js` (pur : contour, dessus, dessous, maillage, arbres, ruisseau
    et cascade) et `IlesCelestes.js` (rendu).
  - Praticables : le sol dépend de la hauteur du joueur (`setGroundRef` de `navigation.js`, posée par
    `Player` et `AirRide` ; `cielSous`). On marche dessus, on tombe par le bord, on s'y pose avec
    l'aigle, le bateau passe dessous.
  - Les arbres des îles du ciel ne gênent que qui marche dessus (obstacles avec `ymin`).
  - Sauvegarde : `state.player.y` est enregistré ; au chargement, on revient sur l'île du ciel.
  - Outil de test : `__ile.tp(x, z, y)` ; sans `y`, on se pose sur le dessus.
  - Tests : `tests/ciel.test.js`.
- **Lieux, chemins et faune** (passe des lieux, 25/10/2026) : l'ancien archipel de neuf îles rondes à
  archétypes est supprimé (code, fixtures, textes). Un seul `buildPlan` (`gen/plan.js`) ; lieux et villages
  (`gen/pois.js`), chemins (`gen/paths.js`), petites découvertes, faune (`gen/spawns.js`) et petite
  végétation des tuiles ne tournent que pour une île qui décrit ses lieux, `desc.lieux` :
  - `recette` [[type, probabilité]…] dans l'ordre (1 = obligatoire), `generiques` (petits lieux tirés en
    plus, minimum selon la taille) ;
  - `accostage` [x, z] (plage d'arrivée, vers laquelle descend le village), `village`, `epave` (noms),
    `moulin` (couleur, `MOULINS`), `faune` (troupeaux posés à la main).
  `placeFloraForme` évite alors les lieux et les chemins et plante haies, vergers et cultures. Aucune île du
  jeu n'en décrit encore. Banc d'essai : l'île d'essai à forme `tests/fixtures/ile-essai.js` (absente du
  jeu, 3 zones réelles, 5 variantes). La recette s'applique à l'île entière : pour une zone de la Grande
  Île (Plateau venté), il faudra la borner à la zone.
- Carte : `src/ui/mapPanel.js`, brouillard `src/world/fog.js` ; minicarte `src/ui/minimap.js`.
- **Herbe en tapis** (refonte « façon Breath of the Wild / Genshin », V2 livrée le 21/10/2026) : brins
  procéduraux générés par le shader (`src/render/herbe/` : `placement.js` pur, `materiau.js`,
  `HerbeSystem.js`), trois anneaux de densité autour du joueur selon la qualité (Haut 96 → 24 → 6
  brins/m² jusqu'à 60 m, Moyen 64 → 16 → 4, Bas 32 → 8), textures 65 × 65 par tuile au mètre.
  - Couleur : palette par biome (`PALETTES_HERBE` de `world/islands/biomes.js` : pied, milieu, pointe,
    sec ; île de départ = prairie), sécheresse vers « sec », couleur du sol à 25 % au plus. Sous l'herbe,
    le sol prend le « milieu ombré » de la palette en proportion de la densité (`ZONE_HERBE` de
    `gen/zones.js` × biome), au relief de 4 m comme au mètre et sur le pré de départ (`champsMaison`).
  - Variation (`HERBE` de `shaders/chunks.js`, partagé par les brins et le terrain) : plaques de 15 à
    40 m, ondes de vent en bandes de 6 à 12 m ; par brin, valeur ± 4 % et hauteur ± 25 % seulement.
  - Forme : 10 cm au pied (anneau A), élargis au loin en part^−0,72 ; pré peigné dans le vent (15 à
    35°). Lumière : ombre à mi-hauteur (× 0,62 en plus de la rampe toon), occlusion au pied, contre-jour.
  - Raccord au loin : le détail du tapis s'estompe avec la distance vers sa couleur moyenne, que prend
    aussi le sol sous l'herbe ; fondus d'anneaux longs (40 %), anneau B plus dense (Haut 32 brins/m²,
    Moyen 24) ; villages herbus jusqu'au pied des murs (maisons au cercle de leurs murs), pentes
    herbues jusqu'à 1 (falaises au-delà).
  - Peint et pastel : touches de pinceau en aplats (traits de 3,5 × 0,7 m dans le vent, ± 9 %) et
    voile de gouache crème (20 %), sur les brins, le sol herbeux et les touffes (`HERBE` de
    `shaders/chunks.js` : `herbePinceau`, `herbePastel`).
  - Touffes récoltables dans la palette du tapis (`grassMaterial` avec palette, un par biome).
  - Carte d'herbe du Worker (`gen/herbe.js`, `tile.herbe`) : zone × biome × pente × eau × ombre des
    couronnes × chemins × lieux × altitude × massifs et trouées ; `champDeSecours` (0,88, 0,37 m) si
    une tuile n'en a pas. Canal A : part du biome voisin (`biomesTuile`, `tile.biome2`), mêlée par le
    shader à la palette de la tuile. Bruits sur réseaux alignés sur le monde (massifs, bruit fin et fissures au pas
    de 2 m, première octave des massifs et trouées au pas de 4 m) ; eau, côte et fissures sautées quand
    la tuile n'en a pas (21/11/2026 : 0,62 ms par tuile seule, 0,68 ms sous la suite complète, Forêt des
    souvenirs ; plafond du test 0,9 ms).
  - Résolution adaptative : l'herbe ne descend plus sous « Moyen » (sauf qualité « Bas » choisie),
    la résolution prend le relais (`HerbeSystem.stepDown`, plancher `PRESET_FLOOR`).
  - Raccord : `IslandManager.js` (tuiles, terrassement, `grassMat`), `Game.js`
    (`state.settings.herbe` : « touffes » pour l'ancienne herbe seule). Tests : `tests/herbe.test.js`,
    `tests/herbe-champ.test.js`. Captures et mesures : `captures/herbe-v2-*.png`,
    `captures/references-herbe/mesure-couleurs.py` (aide de cadrage : `captures/_herbe2.js`).
- Agents : `archipel-calibrateur` (corrections ciblées d'une île) et `archipel-critique` (revue).

### Production de l’open world (workflow, checklist des 19 zones, carte de chantier)

- **Référence** : `docs/PRODUCTION.md` (architecture, rôles, contrats, statuts, calcul de complétude,
  procédures, schéma Mermaid). Livré le 24/10/2026 sur le monde ouvert (GEN_VERSION 4).
- **Source de vérité** : journal en ajout seul `production/journal.jsonl` (événements chaînés SHA-256, clés
  d’idempotence, lots atomiques, verrou). Définitions : `production/zones.json` (19 zones `ZONE-…`, chacune
  reliée aux identifiants des `ZONES` d’`archipel.js`, `home` pour Ton île ; `cascades-sacrees` sans zone du
  checklist), `production/agents.json` (4 rôles, relecteurs, chemins autorisés), `production/echecs-connus.json`.
- **Modules purs** `src/production/` : `statuts.js` (production / validation / intégration séparés,
  transitions), `checklist.js` (57 éléments par zone, sections B à H), `contrats.js` (tâche, rapport, fiche de
  zone, inventaire, rapport d’intégration), `etat.js` (rejeu et règles : relecteur indépendant, 3 tentatives,
  livrable validé protégé, intégration après validation, périmètre réduit par un humain), `completude.js`
  (conception, production, jouable, statut de zone, non livrable si critique), `orchestrateur.js` (objectif →
  4 tâches, dépendances, clarifications, brief).
- **Node** `scripts/production/` : `depot.mjs` (journal), `controles.mjs` (fichiers, json, perimetre,
  fiche-zone, references-catalogue, tests, suite, build), `actions.mjs` (opérations et middleware
  `/__production` de `vite.config.js`), `audit.mjs` (171 constats vérifiés sur le monde ouvert), `prod.mjs`
  (`npm run prod -- etat | verifier | audit | chantier | brief | demarrer | rapport | valider | revue |
  integrer | perimetre | livraison`).
- **Carte de chantier** : `dashboard/chantier.js` dans le tableau de bord (`/dashboard.html#chantier`) :
  silhouettes réelles du monde ouvert (islandgen, comme la carte M), aires des zones du jeu, statut calculé par
  zone (couleur, motif, icône, libellé), filtres, recherche d’asset, fiche de zone à onglets, centres
  production / validation / agents / assets, actions réelles en dev ; carte de référence alignée (4 m par pixel).
  Le tableau de bord (`dashboard.html`, `dashboard/`) vient de la copie principale, où il n’était pas commité.
- **Agents** (`.claude/agents/`, copiés de la copie principale) : rôles du workflow ajoutés à
  `archipel-calibrateur` (World Designer), `evis` (Asset Artist), `locomotion-physique` (Gameplay) ; nouvel
  agent `archipel-integrateur` (Technical Artist) ; relecteurs `archipel-critique` et `evis-critique`.
- **Tests** : `tests/production-donnees.test.js`, `tests/production-workflow.test.js`,
  `tests/production-carte.test.js` (32).

### Manette, audio, interface

- Manette DualSense : `src/core/Gamepad.js` (vibrations, aide contextuelle), tests `tests/gamepad.test.js`.
  Un panneau peut lire lui-même la manette : `sheet.padScreen(pad, dt)` (utilisé par l'inventaire V2).
- Sons doux de l'inventaire : `AudioEngine.menu(kind)` (ouverture, fermeture, curseur, onglet, refus).
- Audio procédural : `src/audio/AudioEngine.js`.
- Tableau de bord de production : `dashboard.html`, `dashboard/` (`management.json` : relations entre
  agents).

### Ciel nocturne (branche `claude/ciel`)

- **Voûte** : catalogue pur et déterministe `src/world/env/voute.js` (`genererVoute(graine)` : plan galactique
  dont l'arche passe au zénith vers 1 h, 5 nébuleuses pastel, 6 amas, pôle céleste au nord à 38°).
  `src/world/env/sky.js` : carte équirectangulaire 1024 × 512 calculée une fois au chargement
  (`preparerVoute`, appelée par `Game` via `sky.prepare`), peinte avec le reste ; trois couches d'étoiles
  procédurales (`etoiles`) à éclats, couleurs et tailles variés ; rotation d'un tour par jour canonique.
- **Netteté** : le dôme marque les étoiles dans l'alpha des normales du G-buffer (id 0, ≤ 0,2) ;
  `COMPOSITE_FRAG` (`post.js`) les reprend nettes après la peinture Kuwahara.
- **Vie** : scintillement, apparition par éclat à l'heure bleue, étoiles filantes (une toutes les 20 à 60 s),
  étoile du berger (`etoileDuBerger`, `daycycle.js`).
- **Réglages** : `CIEL` dans `src/render/Pipeline.js` (`pipeline.settings.voute`, `vie`, `nettete` ; `null`
  = valeur de la qualité ; low sans `vie`).
- **Vérifier** : `tests/voute.test.js` ; en console, `S = await import('/scripts/rendu/serie.js');
  await S.ciel(__ile, 'apres')` puis `python3 scripts/rendu/planche.py --ciel avant apres`. Plan et mesures :
  `docs/ciel/plan.md` (étoiles au zénith à 23 h : 0 → 2 843 px en medium ; +0,2 ms en medium).

## État courant (21/11/2026)

- **Serveur unique** (décision de l'utilisateur, 21/11) : on joue et on travaille sur la copie principale
  seulement, `v3-archipel`, configuration `ile`, port 5174. Les worktrees ne servent plus de version de jeu.
  Fusions du 21/11 : `claude/personnage-2` (avance rapide sur `77c70ac`, travail du worktree `personnage-2`
  commité : gabarit chibi plus grand, visage, tenues, caméra, id d'encre « trim ») et `claude/plateau-corniche`
  (`f7b7d4a`, fusion `bfca952`). Le travail non commité de la copie principale (chèvre, mouton, fleurs PLA-015,
  skill, README, catalogue) est resté en place ; `releves.gen.js` et `empreintes.json` refusionnés à trois voies
  sans conflit.
- **Corniche du Plateau venté** : BRF-PV-02 fait (voir « Îles et monde »). Suite du plan du plateau : BRF-PV-03
  (replats), puis BRF-PV-01 (bornage des lieux) et BRF-PV-04 (chemins). Journal de production non mis à jour.
- **Trait et grain encrés, passe « netteté »** (21/11, `src/render/shaders/post.js`, `Pipeline.js`) :
  - trait stable (`uBoil` 0 : la variation à la main est figée, le trait ne bout plus) ;
  - trait anticrénelé : huit voisins (croix et diagonales), maximum pour le trait, moyenne pour sa
    couverture ; largeur jamais sous un pixel (silhouettes lointaines continues) ; `uOutlineWidth` 1,8 ;
  - aplats nets : accent adaptatif type CAS sur la peinture en basse résolution, borné aux couleurs voisines
    (`uSharp` 0,6, réglage `settings.sharp`) ;
  - papier serré (`uGrainScale` 2,5 : plus de taches de 100 à 200 px), plus léger (± 5,5 %), grain imprimé
    d'un pixel fixe, granulation 0,13.
  Coût mesuré (`scripts/rendu/gpu.js`, même vue) : la composition ne change pas de façon mesurable avec ou
  sans le trait et l'accent. Captures `captures/encre-avant-*`, `encre-apres-*`, `encre-apres2-*`
  (`scripts/rendu/serie.js`, lieux plus le Plateau venté). Reste, pour une image vraiment nette sur un écran
  Retina : la qualité « Moyen » plafonne à 1,25 × et la résolution adaptative descend à 0,7 (image étirée
  d'environ 2,3 fois) ; à traiter avec le coût du G-buffer et de la peinture.
- **Herbe, chantier 1** (21/11, non commité) : audit en jeu (captures `captures/herbe-avant-*`, planche
  `herbe-avant-planche.png` ; lieu `plateau` ajouté à `scripts/rendu/serie.js`). Constats : herbe tombée
  en « Bas » par la résolution adaptative alors qu'elle coûte ≈ 0,1 ms au GPU ; motif régulier (même
  suite R2 dans chaque cellule) ; disque sombre autour du joueur (fondu de détail et occlusion centrés
  sur lui) ; palette par tuile en damier dans `grande-ile~3-3` ; Plateau venté clairsemé (fleurs × 0,75,
  altitude × 0,5) sur sol rose et bleu ; ondes de vent en bandes régulières. Lot 1 fait : carte d'herbe
  0,79 → 0,62 ms par tuile (budget de 0,5 ms pas encore tenu), plancher « Moyen » de l'herbe (captures
  `herbe-lot1-*`, planche `herbe-lot1-planche.png`). Lot 2 fait : touffes et clairières (centres au
  hasard sur une grille de 1,1 m, brins tirés de 30 % vers le leur ; hauteur en dôme, penchant et
  valeur par touffe, une sur dix rase), motif R2 tourné ou retourné par cellule et brins bougés de
  ±16 cm, face des brins tournée au hasard (± 70°) : plus de briques ni de tirets alignés
  (`placement.js` : `placeBrin`, `touffe`, miroir du shader de `materiau.js` ; tests de dispersion,
  1,4 → 7,5, et de motif non répété). Coût GPU de l'herbe 0,11 → 0,38 ms (G-buffer, 36 000 brins,
  Grande Île ; brins effacés avant la recherche de touffe). Captures `herbe-lot2-*`, planche
  `herbe-lot2-planche.png`. Lot 3 fait : plus de disque sombre autour du joueur (le fondu du détail
  et l'occlusion au pied suivent la distance à la caméra, de 14 à 45 m, et non plus au joueur) ; bords
  d'anneaux irréguliers (`ringDist` : distance allongée de 0 à 18 % par un bruit de 7 m, calculée une
  fois par brin). Coût inchangé (0,39 ms). Captures `herbe-lot3-*`, planche `herbe-lot3-planche.png`.
  Lot 4 fait : biomes mêlés au nœud (`gen/herbe.js` : `poidsBiomes`, part lissée de chaque biome par
  case, tente de ± 2 cases soit ± 8 m, dans la marge des sections ; `biomesTuile`, biome principal du
  centre et biome voisin le plus présent, `tile.biome2` ; canal A = part du voisin ; densité, hauteur
  et sécheresse mêlées de même ; seconde palette `uPied2`… dans `materiau.js`). Plus de bloc à bord
  droit dans `grande-ile~3-3` ; test de continuité (couleur à 2,5/255 près, densité à ±1). Coût :
  +0,03 ms par tuile sur la section mêlée, rien ailleurs. Captures `herbe-lot4-*`, planche
  `herbe-lot4-planche.png`. Lot 5 fait : altitude à seuils absolus (`ALT_A` 90 m, `ALT_B` 180 m ; avant,
  moitié du point le plus haut de chaque section, qui jaunissait et clairsemait le Plateau venté à 60 m
  et changeait d'une section à l'autre) ; frange d'herbe haute sur 6 m hors des forêts (canal 7 de la
  base) ; relief : creux plus hauts, crêtes plus rases et plus sèches (courbure au pas du plan, canal 8) ;
  pied des arbres et des rochers plus haut (anneau plus dense × hauteur) ; bord des chemins un peu plus
  ras (test : 0,24 m) ; vent en rafales (`herbeOnde` de `chunks.js` : plaques de 26 × 13 m à 5 m/s,
  vagues de 4 m dedans ; aussi sur le sol herbeux). Coût : carte d'herbe 0,62 → 0,68 ms seule (0,79 ms
  sous la suite complète, plafond 0,9 ms : marge mince) ; GPU inchangé (0,38 ms). Captures
  `herbe-lot5-*`, planche `herbe-lot5-planche.png`. Reste : dans les prés fleuris de la Grande Île, le
  sol est peint aux couleurs des fleurs mais aucune fleur n'y pousse (petite végétation réservée aux îles
  qui décrivent leurs lieux) : rose et bleu entre les touffes. Réglé à la demande de l'utilisateur
  (21/11) : plus de bandes aux couleurs des fleurs peintes sur le sol des prés fleuris (`zoneColors` de
  `zones.js` : le sol y prend le vert sous l'herbe comme ailleurs ; les fleurs posées gardent leurs
  couleurs) ; tapis bien réparti partout (touffes plus légères : `PULL` 0,15, dôme 0,85, touffes rases à
  55 % au lieu de 30 %). Captures `herbe-sol-*`, planche `herbe-sol-planche.png`.
  Pré fourni façon BotW (21/11, demande de l'utilisateur) : Moyen reprend l'ancien Haut (10/32/60 m,
  384/128/32 brins par cellule), Haut va à 12/38/72 m (384/160/40) ; sous-bois herbu (0,5 à 0,8 au lieu de
  0,15 à 0,35) ; aucune zone herbeuse sous 0,85 (hors dunes, cultures, roselière) ; trouées moitié moins
  creusées ; brins 20 % plus hauts. Coût GPU de l'herbe 0,39 → 0,72 ms (56 600 brins, Grande Île) ;
  plafonds du test de brins relevés (Haut 200 000, Moyen 130 000). Planche `herbe-botw-planche.png`.
  Tapis uniforme (21/11, demande de l'utilisateur : plus de groupes ronds) : `PULL` 0, ni dôme ni touffe
  rase, hauteur ± 10 % et valeur ± 2 % par touffe ; test de répartition inversé (aucun regroupement).
  Planche `herbe-uni-planche.png`.
- **Arbres en détail, chantier 2** (21/11, non commité) : audit (captures `captures/arbres-avant-*`, planche
  `arbres-avant-planche.png`) : couronnes en billboards (`render/foliage.js`), tronc sans racines ni
  branches ; Forêt des souvenirs à 4,17 M triangles (troncs 1,3 M, feuillages 0,44 M, ombres 0,96 M).
  Branche `claude/arbres-v2-11841d` : son seul commit (LOD1 en double) est déjà dans `v3-archipel`.
  Lot A : aides `troncRameux` (tronc lisse évasé, racines, branches maîtresses) et `couronneMasses`
  (masses avec trouées, satellites facultatifs) dans `kit/vegetal.js`, autorisées par l'utilisateur ;
  `treeTrunk` inchangé (les autres arbres aussi). Lot B : arbre-pompon repris (374 triangles, voir sa
  `FICHE.md`), revu par Evis-critique ; forêt à 4,94 M triangles (+0,77 M), plateau 2,03 M (+0,16 M).
  Empreinte : seul ARB-001 change (non écrite : `empreintes.json` porte le travail non commité de
  l'utilisateur) ; `modeles:releve` non lancé pour la même raison. Lot C : érable repris (410 triangles,
  quatre racines, houppier plus ovale, voir sa `FICHE.md`) ; branches effilées en pointe dans
  `troncRameux` (pompon inchangé en triangles) ; forêt à 4,89 M triangles. Pas de revue Evis-critique de
  l'érable. Suite : D (variantes et version allégée au loin, budget de la forêt), E (bouleau).
- Échecs connus seulement : empreintes, numérotation MON, champs de fleurs (PLA-015 en cours) ;
  `tests/cheveux.test.js` (« restent calmes et bornées… ») est instable (un échec sur trois passages).

## État au 02/11/2026


- **Fusion du 02/11/2026 : assemblage** (`claude/assemblage`, worktree `.claude/worktrees/assemblage`,
  configuration `assemblage`, port 5180), fusionné dans `v3-archipel` par avance rapide. Contenu :
  - lot 1 lumière (`hourGrade`, `scripts/rendu/`), copie conforme du travail non commité du worktree
    `ombres-lumiere` (le commiter à l'identique, ou abandonner cette copie là-bas) ;
  - ciel, lot B (nuit) de `claude/ciel` ; restent le lot A (couchers) et le lot C (nuages du crépuscule,
    reflets), ce dernier après `volcan`, qui réécrit les nuages de `sky.js` ;
  - inventaire V2 de `claude/inventaire-v2-c40733` (écran plein écran, touche I) ;
  - personnage de `claude/keen-hopper-d637c8` : coupe en pics (PER-026), physique des pics
    (`src/entities/character/cheveux.js`, `tests/cheveux.test.js`), yeux peints ;
  - dirigeables NAV-012 (`src/world/ciel/Dirigeables.js`, `src/models/bateaux/dirigeable/`, branchés dans
    `IslandManager`), copie conforme de la part « dirigeables » du travail non commité de `volcan` ; la
    forteresse suspendue à un ballon et le volcan restent dans `volcan`.
  Pas dans l'assemblage : 2 commits de `claude/forteresse-navire` (E9), 1 commit de `claude/arbres-v2-11841d`.
  Le travail non commité de la copie principale est resté en place (`releves.gen.js`, `tests/models.test.js`
  et `.claude/launch.json` portent les deux). Échecs connus seulement : empreintes, numérotation MON.

- **Fusions du 01/11/2026** : `claude/forteresse-navire` fusionnée trois fois dans `v3-archipel` par avance
  rapide (`7af3da8` navire posé, `e48af84` coque abaissée et BAT-020, `43f6a73` navire volant et BAT-021).
  Le travail non commité de la copie principale (mouton, chèvre, fleurs PLA-015, skill `modele-3d`, README,
  catalogue, `.claude/launch.json`) est resté en place à chaque fois ; `releves.gen.js`,
  `tests/models.test.js` et `tests/fixtures/empreintes.json` y portent la branche et ce travail (fusion clé
  par clé de l'empreinte, sans conflit). Échecs connus : numérotation MON sans MON-012/013 ; empreintes
  (PER-001 à 023, `ileDepart.obstacles`, PLA-015 en cours) ; champs de fleurs (PLA-015 en cours) ; coût de
  la carte d'herbe, instable sous charge.
- **Forteresse-navire du Plateau venté** : le navire vole en décor autour du plateau (E8c) ; reste E9
  (réglages en jeu) et E10 ; pas de revue Evis-critique de BAT-020 ni de BAT-021. Tout est dans
  `docs/forteresse-navire/memory.md` (à lire en premier). Serveur du worktree : configuration `forteresse`
  (port 5175).

- **Branche `claude/ruine-alternative`** (worktree `.claude/worktrees/ruine-alternative`, depuis `d33a27a`) :
  MON-014 et la pose des moulins-tours et de la nef sur le Plateau venté. `tests/models.test.js`
  (« numérotés sans trou ») échoue sur cette branche tant que MON-012/013 (non commités, worktree
  `plateau-vente-modeles`) n'y sont pas. Rapport `production/rapports/RUINE-ALTERNATIVE.json`, non
  enregistré dans le journal.

- **Décisions du 25/10/2026** : les 12 rapprochements de zones proposés sont confirmés ; Les Cascades Sacrées
  devient la 20e zone du checklist (`ZONE-CASCADES-SACREES`, 9 constats d’audit) ; pas de PDF, la référence
  du checklist reste la demande initiale. Commits `a2248c9` (équipe d’agents) et `387dc1b` (production).
- **Production de l’open world (24/10/2026)**, commitée le 25/10 : workflow, checklist des 19 zones et carte de
  chantier (voir le domaine « Production de l’open world »). Journal `production/journal.jsonl` : audit initial
  (171 constats) puis chantier pilote OBJ-0001 sur L’Île Verte avec les quatre agents et leurs relecteurs :
  fiche de zone (World Designer, acceptée), inventaire des assets (Asset Artist, refusé deux fois puis accepté
  à la 3e tentative), test de zone `tests/zones/ile-verte.test.js` (Gameplay, 14 tests), rapport
  d’intégration (Technical Artist) ; les quatre tâches sont intégrées (suite sans nouvel échec). Éléments non
  couverts retirés du périmètre par règle de l’utilisateur et laissés en manques. Statut calculé de la zone :
  en construction, non livrable (production 68 %, jouable 50 %).
- **Défaut P01 corrigé (25/10/2026, TASK-ILE-VERTE-005)** : aux raccords des sections de la Grande Île,
  `IslandManager.heightAt` rendait un sol plus haut que le relief affiché (marge de 2 cases de `cropPlan` trop
  étroite pour l’interpolation bicubique, maximum des sections) : marches invisibles jusqu’à 0,465 m dans l’Île
  Verte, 1,2 m au Sommet givré. Correction : relief de la section propre de chaque île parente (carré fermé),
  marge en secours, maximum entre îles conservé (une première version, refusée en revue, écrasait le relief des
  îles qui se recouvrent). Écart aux raccords 1,217 m → 0, 0 marche ; test `tests/zones/raccords-grande-ile.test.js`
  (dont le cas Grande Île + Volcan endormi). Non vérifié en jeu ; le secours (section du carré non chargée) garde
  l’écart d’origine.
- **Nettoyage de l'ancien monde (25/10/2026)**, commits `6f3f0ef` (suppression, passe des lieux, tests) et
  `f3128c5` (relevé `USAGE` par zone du monde ouvert, `usedIn` des empreintes seul mis à jour). Le monde
  généré est identique octet pour octet (178 empreintes : plans, LOD1, LOD2, sections, tuiles). Budget du
  Worker mesuré sur le monde ouvert : 36 îles entières, plan + LOD1 de 14 à 17 ms en moyenne (au pire
  100 ms, Cascades sacrées) ; plan de la Grande Île 1,1 à 1,5 s ; section + LOD1 au plus 13 ms ; tuile
  p95 7 ms. Copie principale : les fichiers non suivis de l'ancien système de production sont déplacés
  dans `/Users/hugo/developer/archipel-sauvegarde-ancien-monde-2026-10-25/` (voir son `LISEZMOI.md`).
- **Fusion (25/10/2026)** : `v3-archipel` avancée (avance rapide) sur `claude/charming-khorana-a24b36` : le
  monde ouvert est la ligne principale. Avant la fusion, les doublons non suivis de la copie principale ont
  rejoint la sauvegarde (`avant-fusion/`, avec le correctif complet du travail en cours) ; le travail en cours
  (chèvre, mouton, fleurs PLA-015, skill `modele-3d`, section Evis du README, notes du catalogue,
  `launch.json`) a été remis puis réappliqué, toujours non commité. Avec la reprise de PLA-015 en cours (216
  triangles par touffe au lieu de 68), « champs de fleurs » de `tests/world.test.js` échoue : 1,36 M
  triangles sur une tuile entièrement fleurie de l'île d'essai pour un plafond de 800 000 (l'ancienne île
  aux Mille Fleurs, moins dense, passait à 0,71 M).
- **Constats sur le monde ouvert, à trancher** (relevés en migrant les tests, non corrigés) :
  - carte d'herbe discontinue entre deux tuiles de biomes différents (palette par tuile) : raccord visible
    possible aux frontières de biomes (section `grande-ile~3-3`, île d'essai) ; continue dans un même biome
    (21/11/2026 : réglé, biomes mêlés au nœud, voir « État courant ») ;
  - carte d'herbe à 0,70–0,83 ms par tuile dans les sections de la Grande Île (0,92–0,94 ms sous la suite
    complète) contre un budget de 0,5 ms mesuré sur l'ancien archipel : plafond provisoire du test à 1,2 ms
    (21/11/2026 : ramenée à 0,62 ms, plafond à 0,9 ms, voir « État courant ») ;
  - l'échec connu des empreintes couvre plus que PER-001 à PER-004 : tout le personnage (PER-005 à PER-023)
    et la grimpe des palmiers de la maison (`ileDepart.obstacles.44` à `49`), déjà avant le nettoyage.
- **Open world, bases** (branche `claude/charming-khorana-a24b36`, fusionnée dans `v3-archipel` le 25/10/2026). Ce qui est livré :
  - les îles de la carte de référence, avec leur relief, leurs côtes, l'eau douce et les arbres ;
  - les 24 zones étiquetées ;
  - les sections de 512 m ;
  - la remise à zéro du monde dans la sauvegarde.

  Reprend le correctif du LOD1 en double (`f888202` de `claude/arbres-v2-11841d`).
- **Montagnes, collines, nature et Îles célestes** livrées le 22/10/2026 (deux commits sur la même
  branche).
- **À faire ensuite** :
  - lieux et villages (Côte aux villages, moulins du Plateau venté, phare de l'Île du silence, ruines) ;
  - routes entre les régions ;
  - grottes ;
  - faune, ressources et éléments de la mer.

  La passe des lieux (`pois`, `paths`, `spawns`) tourne sur les îles à forme qui décrivent leurs lieux
  (`desc.lieux`) ; à borner par zone pour la Grande Île.
- **Bouleau** écarté des forêts du monde ouvert (`LOURDS` de `gen/flora.js`) : son modèle fait
  environ 1 800 triangles contre 100 à 180 pour les autres arbres. À revoir avec les arbres V2.
- **Budget mesuré en jeu** (Forêt des souvenirs, onglet caché) : 4,3 M triangles, ombres comprises.
  L'essentiel vient de la végétation complète des sections proches et de l'herbe.

- **Inventaire V2** (branche `claude/inventaire-v2-c40733`, fusionnée le 02/11/2026 par l'assemblage) : écran
  plein écran à la place du panneau Sac. Choix de DA validés par l'utilisateur le 21/10/2026 :
  regroupement en 8 onglets, voile violet et cases claires, fond bleu pastel pour la barre rapide, aperçu
  3D (gardé plutôt qu'un portrait fixe). Carnet et Réglages, depuis l'écran, ouvrent les panneaux
  existants. Reste à essayer avec une vraie manette (testé avec une DualSense simulée).
- Branche `v3-archipel`. Derniers commits : herbe V2, lettres A à F (palettes et sol, variation, forme
  et couverture, lumière, touffes récoltables, carte d'herbe du Worker) et réglage de l'ombre.
- **Herbe V2** : sol des îles plus foncé et plus saturé sous l'herbe, validé par l'utilisateur le
  21/10/2026 (choix de DA) ; palette glace resaturée (0,45) pour tenir la fourchette des références.
- **Lot 2 de la grimpe à faire** : autres arbres à tronc dégagé (sommet `suspendu`), un commit par
  espèce ; la noix de coco au sommet attend l'accord de l'utilisateur (progression).
- **Non commité** (hors de ce chantier) : tableau de bord (`dashboard.html`, `dashboard/`,
  `vite.config.js`), agents d'équipe et skill `modele-3d`, `README.md`, chèvre, mouton et fleurs
  (PLA-015), `tests/fixtures/empreintes.json`.
- **Tests** : 302 sur 303. Échec connu : `tests/empreintes.test.js` (personnage : 160 triangles de
  l'épée, changement voulu à valider puis `npm run modeles:empreinte -- --ecrire` ; voir aussi les
  constats ci-dessus). « Budget du Worker » (`tests/world.test.js`) et coût de la carte d'herbe
  (`tests/herbe-champ.test.js`) : mesures de temps, sensibles à la charge.
- **Graphe du code** : mis à jour le 25/10/2026 après le nettoyage de l'ancien monde.
  - Commande : `graphify update src`, sans LLM, code seul.
  - Résultat : 2 558 nœuds, 6 605 liens, 179 communautés, nommées automatiquement d’après leur nœud
    central (`forme.js`, `surface.js`, `zones.js`…).
  - Attention : la commande écrit dans `src/graphify-out/`. Il faut déplacer `GRAPH_REPORT.md`,
    `graph.json` et `graph.html` dans `graphify-out/`, puis supprimer `src/graphify-out/`.
  - Les `FICHE.md` et les planches n'y sont pas : lire les dossiers des modèles.
  Seul `graphify-out/GRAPH_REPORT.md` est versionné ; `graph.json` et `graph.html` se régénèrent avec
  `graphify update src` (sortie dans `src/graphify-out/`, à déplacer dans `graphify-out/`) ou
  `/graphify src --update`.

## Règles de travail pour toute IA

- `git add` avec des chemins explicites, jamais `-A` ni `.` ; un commit par changement cohérent ; tests
  verts avant de commiter.
- Modèles 3D : passer par Evis et `docs/DA.md` ; les empreintes des autres modèles restent identiques.
  Les agents de modèles ne touchent pas aux fichiers du jeu et de la manette (liste dans
  `.claude/agents/evis.md`).
- Tests en jeu : `__ile.game.skipSave = true` avant toute téléportation et après chaque rechargement ;
  jamais sur le port où joue l'utilisateur.
- Aucune nouvelle dépendance npm sans accord ; code, commentaires et documents en français.
- À chaque livraison : mettre à jour ce fichier, puis le graphe (`/graphify src --update`).
