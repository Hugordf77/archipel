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

### Personnage (tête, cheveux, visage)

- **Où** : coupe PER-026 `src/models/personnage/coupes/index.js` ; tête, crâne et visage sculpté
  `src/models/personnage/tete.js` ; forme du gabarit `gabarit.js` (`FACE.forme`) ; traits peints et
  expressions `src/entities/character/face.js` ; physique des cheveux `src/entities/character/cheveux.js`
  et `Character.js` ; fiches `coupes/FICHE.md` et `corps/FICHE.md`.
- **Cheveux, lot 1** (21/11/2026, non commité) : mèches en lame (racine épaisse, pointe nulle, courbe en
  S ; 60 triangles par mèche), implantation inchangée.
- **Visage** (21/11/2026, non commité) : visage sculpté d'un seul tenant (nez, arcades, pommettes, lèvres,
  menton ; grille 22 × 20), normales relevées sans perdre leur direction gauche-droite (plus de visage
  blanc de profil), crâne caché retiré ; yeux peints en amande, grands mais sobres ; sourcils fins. Un
  essai d'yeux en volume (globes et paupières sur os) a été retiré à la demande de l'utilisateur.
- **Vent, cheveux et vêtements** (21/11/2026, non commité) : vent du monde en m/s (brise de 4 m/s) ; frange
  sur son os à ressort `HAIR_D` ; réglages par groupe (dessus et épi raides, nuque lourde, frange légère),
  retard des pointes, battement au vent ; roulis du dessus et de la nuque ouverts ; robe et jupe sur la
  physique des cheveux ; écharpe réglée pour la brise ; plis modelés (manches, salopette, robe, jupe).
  Mesures par geste dans `coupes/FICHE.md`.
- **Budget** : 9 500 triangles pour les fiches de l'avatar (hausse accordée le 21/11/2026,
  `src/models/personnage/fiche.js`, `BUDGET_PERSO`) ; lames de cheveux au bout en ogive, épi à 8 côtés.
- **Vérifier** : `node scripts/modeles/mesure.mjs PER-026 --json` (9 137 triangles, pire cas 9 321, budget
  9 500) ; `npx vitest run tests/cheveux.test.js tests/echarpe-sac.test.js` ; captures `S.serie` de
  `scripts/rendu/personnage.js` (vues et expressions) et planche du catalogue.

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
- **Vaches et moutons dans le monde ouvert** (23/11/2026, non commité) : champ `faune` d'une île
  (`archipel.js`, repère de l'île, m : `{ sp, x, z, count, r, robes, nom }`), posé sans tirage par
  `poserTroupeaux` (`gen/spawns.js`), même pour une île qui ne décrit pas ses lieux ; `cropPlan`
  (`gen/sections.js`) garde chaque troupeau dans la section de son point, recentré. Grande Île, cinq
  troupeaux (coordonnées du monde) :
  - moutons ANI-001 sur le haut du Plateau venté : « de la Corniche », 6 dont un noir, en (468, −780),
    sous le Moulin de la Corniche ; « du Large », 5, en (684, −884) ;
  - vaches ANI-003 aux robes mêlées : « de la Côte », 4, en (−32, −532), et « du Bocage », 3, en
    (−196, −420), sur la Côte aux villages ; « du Lac céleste », 3, en (668, −1388).
  Comportement de faune existant (`IslandFauna` : errance dans le rayon r, broutage, fuite, sommeil la
  nuit, caresse, herbe couchée). À l'apparition, les bêtes sont réparties en spirale de tournesol (avant,
  plusieurs naissaient l'une dans l'autre et restaient ainsi tant que le joueur était à plus de 200 m) ;
  la caresse note l'espèce dans le journal de l'île entière (`Game.petAnimal` : section → île). Modèles
  du catalogue inchangés. Test `tests/zones/troupeaux.test.js` (5 : nombre et robes ; pré de prairie ou de
  fleurs, pente ≤ 0,22, hors de l'eau, dans sa zone ; ni arbre ni obstacle dans le rayon d'errance, loin
  des lieux et de la corniche ; une seule section, loin de ses bords ; reste du plan inchangé) ;
  `tests/world.test.js` adapté (la Grande Île n'a pour faune que ses troupeaux). En jeu : 21 bêtes chargées
  sur leurs sections, caresse « Vache » notée sous `grande-ile` ; captures
  `captures/troupeaux-moutons-corniche.png`, `troupeaux-vaches-cote.png`, `troupeaux-vaches-lac.png`.
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

### Écran-titre (menu de démarrage)

- **Livré le 22/11/2026** : au lancement, le héros se tient sur le rebord est du Plateau venté
  (866, −881), à l'aube (heure forcée 6,65), et regarde le large ; caméra lente en quatre plans (le large, le
  vent, l'archipel, le profil ; 65 s en boucle, fondu au papier entre deux plans) ; vent du large forcé
  (cheveux et écharpe par la physique existante, `VENT.brise` 6,5) ; nom « Archipel » et sous-titre
  « L'archipel des souvenirs », « Appuyez sur une touche », puis Continuer (si une partie existe), Nouvelle
  partie (confirmation si une partie existe : monde vierge, réglages gardés, la page recharge sans titre),
  Options (panneau des réglages). Clavier (flèches, ZQSD, Entrée, Échap), souris (survol, clic) et manette
  (croix, stick, ✕, ◯). Le Moulin du Large, à 10 m au sud, reste hors du cadre (test).
- **Où** : scène et orchestration `src/app/Titre.js` ; logique pure (lieu, plans, menu) `src/ui/titreLogic.js` ;
  habillage `src/ui/titreScreen.js` et styles « Écran-titre » de `src/ui/style.css` ; démarrage `Game.js`
  (`titre`, `demarrerPartie`, boucle du titre dans `frame`, touches, clics) ; manette `Gamepad.dispatch` ;
  `IslandManager.decouvrir` (pas de découverte d'île pendant le titre).
- **Musique** : thème original au piano « L'aube sur le plateau » (`src/audio/pianoTitre.js`), mi bémol
  majeur, 3/4, noire à 72, 32 mesures (1 min 21 s en boucle), synthèse additive en Web Audio (environ 14 % d'un
  cœur du fil audio), canal Musique. `AudioEngine` : `retenirMusique`, `jouerTheme`, `arreterTheme`,
  `libererMusique` (Illumoria attend la fin du titre puis entre en fondu de 4 s). Écoute hors jeu :
  `captures/titre-piano-ecoute.wav` (non versionné).
- **Pendant le titre** : aucune sauvegarde de position, ni découverte, ni lancement compté ; au départ, heure,
  météo, vent, caméra et interface reviennent, le héros retrouve sa place sous le papier (îles préchargées).
- **Outils** : `?titre=0` passe le titre ; `__ile.tp`, `look`, `frame`, `settle`, `shot` le passent d'eux-mêmes
  (`__ile.passerTitre()`), `__ile.capture` cadre le plan en cours.
- **Vérifier** : `npx vitest run tests/titre.test.js` (20 tests) ; captures `captures/titre-final-*.jpg`, planche
  `captures/titre-final-planche.png`, plans `captures/titre-plans4-planche.png`.

### Android (APK prototype)

- **Publié le 22/11/2026** : coque Android sans dépendance (`android/`, une
  WebView plein écran en paysage qui sert `dist/` depuis l'APK sous `https://appassets.androidplatform.net/` ;
  Retour = Échap, arrière-plan = `pagehide` donc sauvegarde) ; workflow `.github/workflows/apk.yml` (npm ci,
  vite build, Gradle 8.10.2, plugin Android 8.7.3, JDK 17, `assembleDebug` ; artefact à chaque exécution,
  pré-version GitHub pour une étiquette `v*`, notes `android/NOTES-VERSION.md`). Détails et limites :
  `android/LISEZMOI.md`.
- **Version** : `v0.1.0-prototype`, pré-version de https://github.com/Hugordf77/archipel/releases (dépôt public,
  branche par défaut `v3-archipel`), APK de 1,8 Mo construit par le workflow. **Reste** : essai sur un vrai
  téléphone ; actions du workflow à mettre à jour (Node 20 déprécié, `setup-java@v5`) ; APK signé en débogage (clé de
  signature à mettre dans les secrets pour des mises à jour sans désinstaller) ; commandes tactiles réduites.

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

## État courant (24/11/2026)

- **Chantier rendu 2 : outillage de la phase 0** (24/11) : méthode `docs/RENDU.md`. Banc de captures
  déterministe `scripts/rendu/banc/` (7 cadrages nommés, 1600 × 900 fixe, qualité Haut, attente du chargement
  réel, origine lue dans le jeu, temps, vent, nuages et météo figés, rejet automatique des captures vides ou
  à caméra enterrée, paires A/B), bascules `Pipeline.PASSES` (nouveau réglage `ombres`), métriques Python
  (`metriques.py`, SSIM par zone), planche, budgets GPU par poste (`budgets.js`, trois passes, médiane),
  machine à états des chantiers dans le journal (`src/production/rendu.js`, événements `rendu.*`, CLI
  `chantier.mjs`), section `/dashboard.html#rendu`, agent `rendu-critique` ; tests `tests/rendu-banc.test.js`
  (10) ; tests chronométrés à part (`npm run test:chronos`). Référence `captures/banc/r0-reference/` :
  aucun noir pur ni blanc brûlé ; ombre/soleil 0,53 à 0,71 (hors cible 0,40–0,60 sur 6 cadrages sur 7) ;
  image de la vue de jeu 18,2 ms en Haut (G-buffer 12,4 à 13,2 ms ; budget 12 ms) : les deux premiers
  constats du chantier 3.

- **Chantier rendu 1 : suite remise au vert, existant commité** (24/11) : 407 tests sur 408 ; seul échec, accepté
  et listé dans `production/echecs-connus.json` : le trou MON-012 / MON-013 du registre (modèles restés non
  commités dans le worktree `claude/plateau-vente-modeles`, décision de l'utilisateur). Relevés des tailles
  et empreintes régénérés (seuls changent les modèles retravaillés : ARB-001, 002, 003, 008, 009, 010,
  PLA-001 à 003, PLA-015, PER-*, NAV-012 qui n'avait pas de référence, obstacles de l'île de départ) ;
  ARB-008 sort des écarts de budget (490 triangles) ; fleur des champs PLA-015 ramenée de 216 à 120
  triangles (tige ouverte, une feuille par tige, quatre pétales élargis : 1,36 M → 0,76 M triangles de
  fleurs dans la tuile la plus fleurie, plafond 0,8 M) ; manches du pull : les deux premiers tronçons de
  l'avant-bras sans bout rond caché (9 641 → 9 401 triangles au pire cas, budget 9 500) ; test des
  empreintes : nombre de modèles lu dans la référence au lieu de 197. Non commités exprès :
  `.claude/launch.json` (serveurs de worktree, contraire au serveur unique), `public/audio/Illumoria.mp3`
  (licence à confirmer), `src/graphify-out/` (sortie générée).

- **Refonte visuelle de l'environnement, passe 1** (23/11, non commité ; brief « ultra visual overhaul »
  de l'utilisateur, à mener par phases) : GLSL seulement, aucun réglage ni gameplay changé.
  - Ombres jamais noires (`toonShade`, `shaders/chunks.js`) : lumière du ciel dans l'ombre (`uSkyAmbient`,
    × 0,14) et plancher (une ombre garde au moins 44 % de la valeur de la même surface au soleil, le jour),
    les deux sous le réglage « rebond » ; herbe : ombre × 0,8 au lieu de × 0,62, occlusion au pied 0,28 au
    lieu de 0,35 (`herbe/materiau.js`). Mesure (Grande Île, 9 h) : ombre d'arbre sur l'herbe 40 % → 49 % de
    la valeur au soleil avec un plancher de 38 % (relevé à 44 % ensuite), bleutée au lieu de bleu nuit.
  - Herbe et sol herbeux (`HERBE`) : étendues de 70 à 150 m plus dorées ou plus fraîches (`herbePlaque`),
    saturation retenue à 90 % (`herbeVarie`) ; brins et sol lisent la même fonction, donc pas de raccord.
  - Terre découverte (`solNu`, `HERBE`) : passé 20° de pente, plaques de terre chaude sourde (bruits de 3
    et 9 m), entière vers 39° ; brins effacés au même masque (`materiau.js`) ; terrain : branche `TERRAIN`
    de `materials.js` (sol vert seulement, lisière un peu sombre). Contredit en partie « pentes herbues
    jusqu'à 1 » de la carte d'herbe : à trancher par l'utilisateur.
  - Roche des falaises et montagnes (`TERRAIN`) : grès chaud en bas, pierre claire lavande en altitude
    (50 → 180 m, limite brouillée de ± 25 m), veines rose poussiéreux, à 40 % sur la couleur peinte, neige
    épargnée.
  - Captures : `captures/ultra-avant-*`, `ultra-apres3-*`, planches `captures/ultra-planche-9.png`,
    `ultra-planche-17h5.png`, `ultra-planche-pente.png`. Coût GPU non mesuré au banc (quelques bruits de
    plus par pixel de terrain et par brin).
  - Tests : 7 échecs, tous connus (empreintes, registre ×2, budgets, champs de fleurs, temps de la carte
    d'herbe et budget du Worker sous charge).
  - Suite du brief : rochers, composition des forêts, profondeur atmosphérique ; silhouettes des arbres
    (géométrie, donc empreintes) non touchées ; l'étalonnage par heure (`daycycle.js`, validé) non plus.
- **Buissons refaits, personnage : manches longues et matières** (23/11, non commité) :
  - Buissons PLA-001 à 003 (`plantes/buissons/index.js`, voir la FICHE) : 4 à 5 masses inégales, tiges
    de bois, baies en grappes, fleurs à cœur jaune ; feuillage de toutes les touffes non arbres en
    grappes de feuilles (`IslandManager.js`, matériau `foliage` : `grappesAtlas`). 320, 886, 814
    triangles (budget 1 000). « Physique / forme » toujours en échec sur PLA-002 et 003 (déjà avant).
    Empreintes : seuls PLA-001 à 003 s'ajoutent aux écarts connus (non écrites).
  - Personnage : pull à manches longues jusqu'au poignet (`corps/index.js` : bande crème à
    mi-avant-bras, revers au poignet) ; matières dans le shader du joueur (`materials.js`, bloc
    `CHARACTER` et `PLIS`, motifs dans le repère de la pose de dessin, `vPosP`, `vNorP`) : tricot côtelé
    à mailles en V, jean en sergé délavé par plaques, cuir à grain et éraflures aux arêtes, joues rosées.
  - Captures `captures/perso-avant-*`, `perso-apres-*` (la fenêtre a changé de taille entre les deux),
    planche `captures/perso-planche.png` ; `captures/buisson-apres-*`, planche `captures/buissons-planche.png`.
  - Tests des modèles et du monde : seuls les échecs connus.
- **Refonte visuelle, passe 5 : touffes des arbres lointains, montagnes** (23/11, non commité ; demande de
  l'utilisateur : « les chunks des feuilles arbre loin et travaille davantage les montagnes ») :
  - Touffes de la version forêt : nouvelle texture `grappesAtlas()` (`render/textures.js` : 60 à 80
    feuilles pointues dans une enveloppe à lobes, sous-couche sombre trouée, valeur claire en haut et au
    bord), à la place du pompon festonné (`leafAtlas`, gardé pour les buissons) ; `foliageArbre`
    (`IslandManager.js`) ; dans `foliageMaterial` (`LOD_LOIN`) bombé de chaque touffe réduit (0,45 → 0,22)
    et valeur peinte de chaque feuille plus marquée. Géométrie et empreintes inchangées.
  - Montagnes (`TERRAIN`) : cause trouvée du peu d'effet des passes 1 et 3 : le test de neige (trois
    canaux au-dessus de 0,72) prenait les parois claires du biome givré (`#c9d8e8`) pour de la neige et y
    coupait roche, coulées, ravines et maquis ; désormais 0,86 à 0,95. Seconde octave fixe dans le monde,
    qui prend le relais de 250 à 700 m (là où la fine fait moins d'un pixel sous la peinture) : ravines de
    40 × 300 m, massifs boisés de 110 m. Ravines larges, maquis et bosquets sur les flancs (20 à 150 m),
    poudre claire sur les replats au-dessus de 170 m ; roche des parois à 55 %. Brouillard classique à
    moitié quand la perspective aérienne est active (il blanchissait les montagnes le matin).
  - Captures `captures/mont-b-*` (avant), `mont-c-*` à `mont-f-*` ; planche
    `captures/montagnes-arbres-planche.png` (montagnes à 9 h et 17 h 30, puis arbres de la Grande Île).
  - Reste : buissons (toujours des boules), silhouettes des montagnes (relief) et des arbres (géométrie).
- **Refonte visuelle, passe 4 : ciel, air, particules, herbe** (23/11, non commité ; second brief de
  l'utilisateur, « la passe précédente ne se voit pas assez ») :
  - Audit : la peinture Kuwahara (0,55 de la résolution) efface les détails fins du sol et de la roche ; le
    ciel atteignait son bleu final dès 12° (aplat sur 80 % du ciel) ; perspective aérienne plafonnée à 16 % ;
    aucune particule d'ambiance ; voile de l'astre (`ASTRE`) qui blanchissait toute l'image face au soleil
    le matin.
  - Ciel (`sky.js`) : dégradé à plusieurs étages (zénith plus profond, bande à peine cyan, ciel plus clair
    côté soleil, creusé à l'opposé), tramage d'un quart de niveau ; deux couches de nuages peintes dans le
    dôme (voiles d'altitude étirés dans le vent, banc bas sur l'horizon), dérives différentes ; bouffées :
    rampe plus douce, dessous froids, sommets chauds, liseré argenté à contre-jour.
  - Air (`applyFog`, `TOON`) : passé 70 m, contraste et saturation baissent et la couleur glisse vers
    l'horizon du ciel (`uSkyHorizon`, désormais déclaré par `TOON` ; doublons retirés de `water.js`,
    `rivers.js` et de la branche `CHARACTER`) ; moins en altitude (sommets lisibles). Voile de l'astre
    (`Pipeline.soleil`) : 0,1 soleil haut, entier au coucher.
  - Particules (`src/world/env/particules.js`, nouveau ; `Game` : création, `update` avant le rendu ;
    réglage `pipeline.settings.particules`, 0 à 1) : poussière dorée proche (900, couche de 9 m autour des
    yeux), poussière lointaine (260, vers l'horizon), lucioles (48, crépuscule, nuit, sous-bois à l'ombre).
    Tout le mouvement dans le shader (vent, errance par bruit, montée et descente), boîtes posées sur le
    monde ; dessinées après la peinture mais cachées par le décor (profondeur de la scène) ; éclairées par
    le soleil, éteintes à l'ombre portée (`sampleShadow`), plus visibles face au soleil ; zones par bruit.
    Coût mesuré 0,05 ms (banc, Haut).
  - Herbe (`herbe/materiau.js`) : lames effilées (plus de triangle tronqué), un peu plus étroites de près ;
    trois sortes de brins (courant, plus court, haut et fin) ; plaques un peu plus rases de 6 à 14 m ; tapis
    10 % plus bas. Un premier essai (brins larges et courts) faisait des copeaux : retiré.
  - Feuillages : translucidité baissée (× 0,6) et plafond doux de la valeur (0,86, teinte gardée) : plus
    de jaune fluo face au soleil ; or des familles moins poussé (`FAMILLE`).
  - Coût de l'image (banc, Haut, Grande Île, 16 h) : 10,15 ms dont G-buffer 7,25 ms (pas de mesure
    « avant » dans la même vue).
  - Captures `captures/ciel-a-*`, `part-*`, `herbe-c-*` (essai retiré), `herbe-d-*`, `final-*` ; planche
    `captures/aurelia-planche.png` (état d'origine | maintenant).
  - Tests : 8 échecs dans la suite complète lancée pendant que le jeu tournait : les 5 connus plus trois
    chronos sous charge ; relancés seuls, seul le chrono de la carte d'herbe (Worker, non touché) échoue.
  - Pas fait : silhouettes des arbres et des montagnes (géométrie : empreintes, relief) ; transitions
    feuilles mortes et mousse au sol.
- **Refonte visuelle, passe 3 : rochers et montagnes** (23/11, non commité) : shaders seulement.
  - Rochers des îles (`rocher`, `rocher_mousse` ; `ROCHE` dans `toonFrag`, `materials.js` ; matériaux
    `solidRoche` et `solidMousse` d'`IslandManager.js`) : relief ciselé en relief d'ombrage (bruits du repère
    du modèle), teinte chaude ou froide et valeur par rocher, strates inclinées, lichen ocre rare, mousse sur
    le dessus, pied plus sombre et plus froid. ROC-002 (`MOUSSU`) : le chapeau de mousse (un couvercle plat
    qui ne dépassait que de 7 cm) n'est plus dessiné, la mousse est peinte sur la pierre et coule un peu sur
    les flancs. Filons et obsidienne inchangés ; rochers des îles célestes (`IlesCelestes.js`) non plus.
  - Falaises et montagnes (`TERRAIN`) : coulées d'érosion verticales (bruit étiré dans la paroi, creux plus
    froids, arêtes plus claires), en plus du grès et de la pierre lavande de la passe 1. Peu visibles de très
    loin (brume et peinture) : voulu discret.
  - Non fait : silhouettes des montagnes (relief du Worker : changerait le terrain, les plans et leurs
    empreintes) et forme des rochers (`G.rock`, aide partagée du kit : accord nécessaire).
  - Captures `captures/roches-avant-*`, `roches-apres2-*` (gros plans d'un rocher et d'un rocher moussu à
    10 h et 17 h 30, pente et plateau) ; planche `captures/roches-planche.png`. Fiche `rochers/blocs/FICHE.md`.
  - Tests : 6 échecs, tous connus.
- **Refonte visuelle, passe 2 : familles de couleur des feuillus** (23/11, non commité) : shaders seulement,
  aucun modèle ni empreinte changé.
  - `FAMILLE` (`shaders/chunks.js`, `familleArbre`) : une famille par arbre, calculée dans le shader d'après
    son origine (version forêt `foliageFrag`, version proche et feuilles qui tombent `feuilleFrag` : même
    couleur aux deux distances). Part chaude surtout par zone (bosquets de 50 à 110 m qui roussissent
    ensemble), un peu par arbre ; famille or, ambre ou rouille (teinte tournée de 32 à 72° depuis le vert ;
    or réchauffé et un peu saturé, rouille plus sourde) ; les arbres restés verts ont des accents d'un côté de
    la couronne, dans les zones chaudes seulement. Seules les couleurs vertes tournent (érable et cerisier
    gardent les leurs).
  - Saison : `U.uAutomne` (`globals.js`), réglé dans `Game.applySettings` d'après `seasonOf` (automne 1,
    hiver 0,4, printemps et été 0,2 : quelques arbres dorés toute l'année).
  - Feuilles qui tombent : `iSol` passe à 4 composantes (`arbresProches.js` : + origine xz de l'arbre).
  - Captures `captures/arbres-apres*-grande-ile-*`, planche `captures/arbres-planche.png` (passe 1 | passe 2,
    9 h et 17 h 30).
  - Tests : 5 échecs, tous connus (empreintes non écrites des arbres fractals, registre ×2, budgets, champs
    de fleurs). Constat : juste après un rechargement et une téléportation, `serie.js` capture parfois sans
    brins d'herbe (tuiles d'herbe pas encore prêtes) ; en jeu, l'herbe revient.

- **Vaches et moutons dans le monde ouvert** (23/11, non commité ; détail dans « Îles et monde ») :
  `archipel.js` (champ `faune` de la Grande Île), `gen/spawns.js`, `gen/plan.js`, `gen/sections.js`,
  `entities/fauna/islandFauna.js` (répartition à l'apparition), `Game.petAnimal` (une ligne),
  `tests/zones/troupeaux.test.js`, `tests/world.test.js`. `npm test` : 7 échecs, tous connus (empreintes,
  numérotation MON, champs de fleurs, budgets ARB-008, tailles du registre, temps de la carte d'herbe et
  d'une mise à jour de l'herbe sous charge ; `herbe.test.js` passe seul). Graphe mis à jour
  (`graphify update src`, copié de `src/graphify-out/` vers `graphify-out/`).

- **Arbres fractals de l'utilisateur** (22/11, non commité) : tous les feuillus des îles (pompon ARB-001,
  fruitier ARB-002, cerisier ARB-003, bouleau ARB-008, saule ARB-009, érable ARB-010) sont l'arbre de
  l'utilisateur (« Jeux vidéo aprentissage/src/arbre.js ») porté dans `src/models/kit/arbreFractal.js`
  (nouveau fichier : `squelette` identique feuille par feuille à l'original, vérifié sur les 20 412 feuilles ;
  ajout `retombee` pour le saule), une recette par espèce dans son `index.js`.
  - Deux versions, bascule par instance dans les shaders (`LOD_ARBRES`, `render/shaders/materials.js`) :
    version forêt au-delà d'environ 30 m (bois jusqu'à la 4e génération, réindexé ; neuf touffes peintes
    tirées vers l'enveloppe du houppier ; 386 à 396 triangles, 778 pour le fruitier) et version proche
    (`world/islands/arbresProches.js`, au plus 40 arbres par espèce, rayon 30 m en Haut, 24 m en Moyen,
    aucun en Bas, `Game.applySettings`) : une feuille de l'original sur huit (2 552), cartes pliées sur la
    nervure, atlas peint (`feuillesAtlas`, `render/textures.js` : ovale, érable, fleurs, lancéolée), bois
    jusqu'à la 2e génération, écorce peinte (`ecorceTexture`, aussi sur la version forêt), teinte
    d'exposition, translucidité vers le soleil (`feuilleMaterial`, aussi `vitrail` sur les touffes).
  - Vent : ramure balancée (bois et feuilles par la même formule, à l'attache), frémissement des feuilles ;
    160 feuilles tombent en spirale des arbres proches (tout le mouvement dans le shader, `CHUTE`).
  - Formes lointaines (`farveg.js`) recalées sur l'enveloppe des nouveaux houppiers (plus larges : 2,4 m
    de rayon pour le pompon).
  - Coût (banc synchrone `scripts/rendu/gpu.js`, Haut, cœur de la Forêt des souvenirs, caméra derrière le
    joueur) : forêt seule ≈ 2,0 ms de G-buffer, version proche + 0,6 ms (54 arbres, 12 400 triangles
    chacun) ; à la vue « grande-ile » de `serie.js` : G-buffer 5,6 ms (5,55 ms avant le changement).
  - Captures : `captures/fractal-a3-especes.png` (catalogue, six espèces), `captures/fractal-b2-*`
    (forêt de près, de loin, le soir ; Grande Île et Plateau venté à 11 h et 18 h 30).
  - Tests : `npm test` : 6 échecs. Les connus : empreintes (non écrites), numérotation MON, champs de
    fleurs, et sous charge le temps de la carte d'herbe (0,92 ms pour 0,9 ; passe seul, marge réduite par
    les couronnes plus larges). Deux attendent l'utilisateur : tailles du registre (`releves.gen.js` à
    régénérer, il porte du travail non commité) et `ARB-008` à retirer de `ECARTS` (`kit/budgets.js` :
    le bouleau tient désormais son budget ; retouche refusée à l'agent).
  - Reste : catalogue (montre la version forêt seule : la version proche demanderait de toucher
    `kit/assemble.js`) ; encombrement des troncs (`physique.js`) plus large que leur pied visible (décision
    de l'utilisateur : changerait le placement des arbres) ; arbres de l'île de départ, Arbre géant
    ARB-015.
- **Joueur : cheveux, écharpe en vrai tissu, plis animés** (22/11, non commité ; fichiers du personnage
  touchés avec l'accord de l'utilisateur, en plus de leur travail non commité) :
  - Cheveux (`materials.js`, `CHEVEUX`) : brins en reflets clairs le long de chaque mèche (environ cinq à
    six par mèche), paquets, racines plus sombres, pointes plus claires, reflet en bande (Kajiya-Kay) qui
    se casse sur les brins, plus de pastille ronde. Les mèches sont marquées à la construction
    (`coupes/index.js` : `sway` 1 à 2 et `tint` = sens de la mèche ; `cap: CAP` dans la coupe) ;
    `Character.setAvatar` passe la calotte au shader (`uCapC`, `uCapR`, `uCheveux`). Planche
    `captures/cheveux-planche.png`.
  - Écharpe : les deux pans sont des rubans simulés (`entities/character/tissu.js`, pur : Verlet à pas fixe
    de 1/120 s, contraintes de longueur, de cisaillement et de pli, gravité, pression du vent sur la face
    avec battement, collisions avec des sphères ; `echarpeTissu.js` : forme de repos des pans dessinés,
    épinglés au nœud, sphères torse, épaules, tête et sac, os SCARF et SCARF_B repliés). Ils tombent le long
    du dos au calme, se soulèvent et claquent au vent. Tests `tests/tissu.test.js` (5) ;
    `tests/echarpe-sac.test.js` adapté (le bout du pan ondule de 4 à 13 cm dans la brise, reste à sa
    longueur du nœud). Captures `captures/echarpe-a1-planche.png`, `echarpe-a2-planche.png` (calme et tempête).
  - Plis du pull et de la salopette (`materials.js`, `PLIS`), repris le 22/11 au soir à la demande de
    l'utilisateur (« corrige les plis ») : la première version donnait un aspect de plastique mouillé (bruit
    fixe en diagonale et vaguelettes de vent permanentes, sur tout ce qui n'est pas la peau, sac, bottes et
    ceinture compris ; ses plis d'articulation ne sortaient presque jamais : les sommets de la salopette au
    genou sont hors du rayon de mélange des os). Désormais : seuls les tissus souples sont marqués
    (`Parts.on(os, id, true)`, `commun.js` : `aSway` −1 ; torse et bassin, manches, avant-bras, cuisses,
    tibias, jupe et robe ; pas la bavette, la poche, les bretelles, la ceinture, le sac, les bottes) ; aux
    jointures qui se plient (taille, coudes, hanches, genoux : `PLI_JOINTURES` de `Character.js`, pivots et
    axes passés par `uPliOs`, `uPliAxe`), trois ou quatre plis en arcs du côté intérieur du pli (le sens où
    l'axe de l'os enfant tourne par rapport au parent), d'autant plus marqués que le membre se plie, creux
    un peu plus sombres ; membres droits : rien (restent les plis modelés). Pas de pli à l'épaule (hachures
    sur les rayures du pull), plus de vent dans ce relief (le vent reste aux cheveux et à l'écharpe).
    Captures `captures/plis-avant-face.png` (avant), `plis-apres-face.png`, `plis-apres-34.png`,
    `plis-apres-dos.png` (repos), `plis-apres-marche.png`, `plis-apres-course.png`, planche
    `plis-apres-planche.png`.
  - Lot 4 (jupe et robe en vrai tissu) abandonné : l'utilisateur ne veut pas de robe (22/11). La jupe et
    la robe gardent leur pendule (`cheveux.js`, `JUPE`). Captures de l'ancien pendule prises avant l'arrêt :
    `captures/jupe-avant-*.png`. Revue Evis-critique non faite.
- **Ombres, lumière du joueur, troncs** (22/11, non commité) :
  - Ombres : la ligne qui recentrait la carte d'ombre sur le joueur avait disparu le 22/10 (commit
    `ace1d3f`, remplacée par un second `islands.update`, qui tournait donc deux fois par image) : les ombres
    restaient centrées sur l'origine flottante, jusqu'à 2 km du joueur (ni ombre des arbres, ni ombre du
    joueur). Rétablie dans `Game.update`, à la hauteur de la cible (Plateau venté), doublon retiré.
    Seconde carte d'ombre, large (± 170 m, `Pipeline.js`, `SunShadow`), qui prend le relais de la fine
    (± 34 m) en fondu (`SHADOW`, `chunks.js` ; herbe : `shadow1`, `render/herbe/materiau.js`) ; centre calé
    sur les texels (pas de scintillement) ; la carte large une image sur deux. Coût des deux cartes
    0,5 à 0,8 ms (banc), environ 0,5 ms par image en Haut.
  - Feuillus : ombre portée en trois lobes (`lobesCouronne`) ; les feuillages lisent l'ombre un peu en
    avant de la couronne (plus d'assombrissement par leur propre volume d'ombre).
  - Joueur (`toonFrag`, branche `CHARACTER`, réglage `U.uJoueur`, 0 à 1) : reflet franc et lustre côté
    soleil, liseré chaud à contre-jour du côté éclairé, ciel sur le dessus et rebond du sol dessous,
    bande chaude de diffusion au terminateur, reflet du ciel en incidence rasante ; tout passe sous les
    ombres portées. Planche `captures/joueur-planche.png` (avant | après, face, contre-jour, ombre d'arbre).
  - Troncs (`troncFractal`, `kit/arbreFractal.js`) : × 1,6 (les grosses branches de moins en moins, via
    `grossit`), cinq contreforts qui se prolongent en racines rondes plongeant dans le sol, fût cannelé à
    16 côtés de près ; 490 à 500 triangles en version forêt (882 pour le fruitier), 2 676 de bois de près.
    Écart encombrement / pied visible réduit (pompon : 135 % → 89 %). Captures `captures/arbres-d2-tronc-*`.
- **Soleil et lumière de l'astre** (22/11, non commité) :
  - Ciel (`sky.js`) : le rendu est en 8 bits (rien ne dépasse le blanc), donc le disque est le seul blanc
    franc du ciel ; net (bord anticrénelé au pixel, rayon 0,036 rad), assombri et réchauffé vers le bord,
    gardé net après la peinture (masque des détails, comme les étoiles) ; halo serré (couronne) et halo
    large mêlés au ciel sous le blanc, saturés et plus chauds ; bas sur l'horizon, l'astre rougit et ses
    halos s'élargissent.
  - Rayons (`post.js`, `ASTRE_FRAG` ; `Pipeline.js`, `astrePass`, quart de résolution) : flou radial vers
    l'astre d'une source « fond de ciel autour de l'astre » tirée de la profondeur : les rayons sont coupés
    par les troncs, feuillages, reliefs et nuages. Composition : rayons et voile en fondu « écran », discrets
    sur le ciel, plus forts sur ce qui se dresse devant l'astre ; voile réglé sur la part visible de l'astre ;
    le disque n'est pas voilé. Coupé la nuit, sous la pluie, astre couché ou dans le dos (réglage
    `pipeline.settings.astre` : null actif, 0 coupé, jusqu'à 1,5).
  - Translucidité vers le soleil : feuilles une à une (0,8), touffes des arbres (0,7), touffes des autres
    végétaux (0,45).
  - Écran-titre : `Titre.cadrer()` recalcule maintenant la courbure et la plongée de l'horizon comme
    `CameraRig` ; elle restait à 0,3 rad (valeur par défaut) : le ciel peint se calait 17° trop bas et le
    soleil d'aube passait sous la mer (d'où le disque « presque invisible »). Le ciel du titre change donc
    aussi (nuages et horizon chaud visibles).
  - Coût : passe des rayons 0,027 ms (409 × 307, Haut) ; image entière inchangée au bruit de mesure près
    (≈ 11,1 ms avec ou sans, vue « grande-ile », 18 h 12).
  - Captures : `captures/soleil-b0-*` (avant), `soleil-b2-*`, `soleil-b4-arbre-contre-jour-*`,
    `soleil-b5-titre-aube.png`, planche `captures/soleil-planche.png`.
  - Non fait : étalonnage en split-tone par heure laissé tel quel (palette `daycycle.js` validée) ; rayons
    invisibles quand l'astre est hors du cadre (effet d'écran).
- **Écran-titre** (22/11) : menu de démarrage sur le Plateau venté avec thème au piano (voir
  « Écran-titre »). Non essayé avec une vraie manette (DualSense simulée) ; le chemin « Tout effacer et
  recommencer » est couvert par les tests, pas joué en vrai (la sauvegarde du navigateur n'a pas été effacée).
- **APK Android** (22/11) : `v0.1.0-prototype` publiée sur GitHub (voir « Android »), pas encore essayée sur
  un téléphone ; le build « HEAD + écran-titre » passe (3,3 Mo, sans Illumoria).
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
- **Personnage** (21/11/2026, non commité) : cheveux lot 1 (mèches en lame), visage sculpté aux yeux peints
  sobres, vent et physique des cheveux (frange mobile), physique de la robe et de la jupe, plis des
  vêtements, lames de cheveux en ogive (voir « Personnage ») ; 8 688 → 9 137 triangles (pire cas 9 321),
  budget de l'avatar porté à 9 500 (accord de l'utilisateur). Revue Evis-critique : ses trois défauts
  traités (nez, mâchoire, lames), sans second tour de revue. Empreintes : seul le personnage change (fiches PER et table du personnage, nouvel os `HAIR_D` ;
  non écrites, `empreintes.json` porte le travail non commité de l'utilisateur). Test « restent calmes… »
  de `tests/cheveux.test.js` : vert à chaque passage le 21/11 (deux suites complètes, huit passages
  seuls), résidu ramené de 0,032 à 0,012 rad sous un seuil de 0,03 et vent du monde coupé dans ce test ;
  l'échec d'un passage sur trois n'a pas été reproduit. Constat à vérifier : à la grimpe, la peau devant
  les yeux entre jusqu'à 7 à 8 cm dans l'écorce au pire moment du scénario de `tests/grimpe-pose.test.js`.
- Échecs connus seulement : empreintes, numérotation MON, champs de fleurs (PLA-015 en cours). Sous forte
  charge (jeu et agents en parallèle), les tests de temps de l'herbe et du Worker peuvent échouer ; ils
  passent au calme.

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
