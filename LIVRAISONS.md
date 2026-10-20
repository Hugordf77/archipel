# Livraisons — Archipel

Point d'entrée pour une IA ou un nouvel arrivant : ce qui est livré, où ça vit, comment le vérifier, ce
qui est en cours. Mis à jour le 20/10/2026. À tenir à jour à chaque livraison (section « État courant »
et domaine concerné).

## Démarrer

- Jeu : `npm run dev`, puis http://localhost:5173 (les agents utilisent la configuration `ile` de
  `.claude/launch.json`, port 5174, pour ne pas gêner la partie de l'utilisateur).
- Catalogue des modèles : `/catalogue.html` ; tableau de bord de production : `/dashboard.html`.
- Tests : `npm test` (13 fichiers) ; build : `npm run build`.
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

- Inventaire et fabrication : `src/gameplay/Inventory.js` (`craft`), recettes `src/data/recipes.json`,
  objets `src/data/items.js`, interface `src/ui/inventoryUI.js`.
- Tests : `tests/progression.test.js` (fabriquer une station depuis les ressources de base, rien n'est
  consommé si le sac est plein, seules les stations posées à portée sont proposées).

### Modèles 3D

- **Rangement** : un dossier par modèle vedette, `src/models/<catégorie>/<modèle>/` (`index.js`,
  `physique.js`, `FICHE.md`, `reference.png`) ; aides partagées `src/models/kit/` ; index générés
  `index.gen.js`, `releves.gen.js`, `physique.gen.js`.
- **Outils** : `npm run modeles:mesure -- <id>`, `modeles:empreinte`, `modeles:index`, `modeles:fiches`,
  `modeles:releve` ; captures `scripts/modeles/planche.js` (catalogue) et `scripts/modeles/jeu.js` (jeu).
- **Repris d'après planche ou description** : vache ANI-003 (commit `0fbb0fe`, troupeau à Pommeraie),
  cerf ANI-004 (`7252b94`), mouton ANI-001 (`10e3a8e`). Chèvre ANI-002 et nouvelle passe sur le mouton :
  en cours, non commitées.
- **Agents** : Evis (production) et Evis-critique (revue en lecture seule), règles `docs/DA.md`.

### Îles et monde

- Archipel fini de neuf îles : `src/world/islands/regions.js` et archétypes ; génération
  `src/world/islands/gen/` (relief, érosion, hydrologie, zones, surface, plan, lieux, chemins, faune) ;
  `IslandManager.js` (LOD, tuiles, Worker `worldWorker.js`).
- Carte : `src/ui/mapPanel.js`, brouillard `src/world/fog.js` ; minicarte `src/ui/minimap.js` (nouvelle).
- Agents : `archipel-calibrateur` (corrections ciblées d'une île) et `archipel-critique` (revue).

### Manette, audio, interface

- Manette DualSense : `src/core/Gamepad.js` (vibrations, aide contextuelle), tests `tests/gamepad.test.js`.
- Audio procédural : `src/audio/AudioEngine.js`.
- Tableau de bord de production : `dashboard.html`, `dashboard/` (`management.json` : relations entre
  agents).

## État courant (20/10/2026)

- Branche `v3-archipel`. Derniers commits : cerf (`7252b94`), kit à zones et onglons (`51fca44`),
  vache (`0fbb0fe`).
- **Non commité** : physique et locomotion du joueur, épée, sauvegarde et réglages, audio, manette,
  minicarte (`src/ui/minimap.js`, non suivi), tableau de bord (`dashboard.html`, `dashboard/`, `public/`),
  agents d'équipe, chèvre et mouton, calibration d'îles (`gen/surface.js`, `gen/zones.js`).
- **Tests** : 147 sur 148. Seul échec : `tests/empreintes.test.js`, parce que le personnage (PER-001 à
  PER-003) a pris 160 triangles avec l'épée. Changement voulu : une fois validé,
  `npm run modeles:empreinte -- --ecrire`.
- **Graphe du code** : construit le 20/10/2026 sur `src/` (code seul, 282 fichiers, 1 719 nœuds,
  74 communautés). Les `FICHE.md` et les planches n'y sont pas : lire les dossiers des modèles.
  Seul `graphify-out/GRAPH_REPORT.md` est versionné ; `graph.json` et `graph.html` se régénèrent avec
  `/graphify src --update` (ou `/graphify src` sur un clone neuf).

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
