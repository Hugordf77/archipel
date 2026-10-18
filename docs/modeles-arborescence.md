# Modèles 3D : un dossier par modèle

Ce document est la table de correspondance de la réorganisation de `src/models/` : chaque modèle du
registre (196 identifiants) a un dossier à lui, ou partage le dossier de sa famille. Aucun sommet
n'a changé pendant le déménagement : `tests/empreintes.test.js` compare chaque modèle et chaque variante
à `tests/fixtures/empreintes.json` (triangles, sommets, boîte, sommes de contrôle, pose animée,
obstacles, planchers, encombrement, tables du jeu).

## Arborescence

```
src/models/
  kit/                  aides partagées et testées (aucun modèle ici)
    formes.js           bone, blob, limb, surface, hull, skinMesh, leafGeo, patch, scatter
    laine.js            curls et géométries de boucles CURL*
    accessoires.js      collar (collier et cloche), eye, legs (sabots HOOF*)
    pieces.js           part, quad, birdParts : contrat des pièces de créature
    lieux.js            teintes des lieux (bois, pierre, mousse…), bx, seg
    vegetal.js          segment, treeTrunk, écorce : troncs de la végétation
    fiches.js           fabriques des fiches du registre (kind, part, ile, species…)
    tables.js           relais : lieux.js et vegetation.js s'y inscrivent, l'assemblage seul les y lit
    assemble.js, materials.js, palette.js, shapes.js
  <catégorie>/<modèle>/
    index.js            le modèle : construction, robes, version allégée, fiche (export par défaut)
    physique.js         données pures, sans import (lisibles par le Worker)
    FICHE.md            DA retenue, écarts restants, historique
    reference.png       planche 6 vues, quand elle existe
  <catégorie>/index.js  l'API de la catégorie que le jeu importe (SPECIES, BOATS, CATALOG…)
  lieux.js              table type → constructeur des lieux (partModel, rotY, recolorPart)
  vegetation.js         table espèce → constructeur de la végétation (kindModel, ROCKY, CAP_COLORS)
  index.gen.js          généré (npm run modeles:index) : toutes les fiches, avec leur source
  physique.gen.js       généré (npm run modeles:index) : encombrement par espèce, pour le Worker
  releves.gen.js        généré (npm run modeles:releve) : TAILLES et USAGE
  registry.js           CATEGORIES, STATUTS, MODELS (lus dans index.gen.js)
```

Les dossiers de catégorie reprennent les identifiants du registre : `arbres`, `plantes`, `rochers`,
`batiments`, `ouvrages`, `monuments`, `bateaux`, `decor`, `objets`, `animaux`, `personnage`.

**Vedette** : un dossier pour un modèle (créature, bâtiment, bateau, monument, ouvrage notable, tout
modèle doté de son propre constructeur ou d'une planche). **Famille** : un dossier pour une série
d'objets proches (index.js exporte alors une liste de fiches ; physique.js est indexé par type).

Deux anciens chemins restent, réduits à une ligne de réexport, parce que des fichiers d'un autre outil
(non modifiables ici) les importent encore : `boats/bateaux.js` (lu par `src/app/Game.js`) et
`animals/albatros.js` (lu par `src/entities/AirRide.js`).

## Contrat d'un dossier

- `index.js` exporte par défaut sa fiche (ou une liste pour une famille) :
  `{ id, slug, nom, categorie, ref, build, variants?, params?, defaults?, tags?, budget?: { triangles, lod? } }`.
  Il exporte aussi ce que le jeu consomme (constructeur de lieu, espèce, pièces).
- `physique.js` : `export default { encombrement?: r, obstacles?: [[x, z, r]], planchers?: [...] }`, sans
  aucun import. Quand l'emprise dépend des paramètres (taille de maison, longueur de jetée), les
  valeurs sont des fonctions pures de ces paramètres, que le constructeur appelle. Une famille indexe
  ces données par type : `{ pin: { encombrement: 0.5 }, … }`.
- Statuts et notes restent dans `catalogue/notes.json` ; tailles et usages restent relevés
  (`npm run modeles:releve`).

## Correspondance

Anciens fichiers : `animals/especes.js` (23 espèces et aides), `animals/ileDepart.js`, `animals/hibou.js`,
`animals/albatros.js`, `vegetation/especes.js` (`BUILDERS`), `structures/lieux.js` (`switch` et `MICRO`),
`buildings/gabarits.js` (`STRUCTURES`), `buildings/ileDepart.js`, `boats/bateaux.js`, `decor/catalogue.js`,
`props/objets.js`, `props/outils.js`, `character/personnage.js` ; encombrement : `world/islands/gen/kinds.js`
(`KIND_RADIUS`) ; obstacles de l'île de départ : `world/home/props.js`.

### Arbres (ARB)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `arbres/arbre-pompon/` | vedette | ARB-001 | `vegetation/especes.js` `BUILDERS.arbre_pompon` |
| `arbres/arbre-fruitier/` | vedette | ARB-002 | `BUILDERS.arbre_fruitier` |
| `arbres/cerisier/` | vedette | ARB-003 | `BUILDERS.arbre_cerisier` |
| `arbres/coniferes/` | famille | ARB-004 pin, ARB-005 pin givré, ARB-006 sapin enneigé | `BUILDERS.pin`, `pin_givre`, `sapin_neige`, `pine()` |
| `arbres/palmier/` | vedette | ARB-007 | `BUILDERS.palmier` |
| `arbres/bouleau/` | vedette | ARB-008 | `BUILDERS.bouleau` |
| `arbres/saule/` | vedette | ARB-009 | `BUILDERS.saule` |
| `arbres/erable/` | vedette | ARB-010 | `BUILDERS.erable` |
| `arbres/bambou/` | vedette | ARB-011 | `BUILDERS.bambou` |
| `arbres/fougere-arborescente/` | vedette | ARB-012 | `BUILDERS.fougere_arbo` |
| `arbres/champignon-geant/` | vedette | ARB-013 | `BUILDERS.champi_geant` |
| `arbres/grand-arbre/` | vedette | ARB-014 | `buildings/ileDepart.js` `trunkAlong`, `grandArbre`, `grandArbreClumps` |
| `arbres/arbre-geant/` | vedette | ARB-015 | `structures/lieux.js` `arbreGeant` |

### Plantes (PLA)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `plantes/buissons/` | famille | PLA-001 arbuste, PLA-002 buisson à baies, PLA-003 buisson fleuri | `BUILDERS.arbuste`, `buisson_baies`, `buisson_fleuri` |
| `plantes/cactus/` | famille | PLA-004 cactus, PLA-005 cactus fleuri | `BUILDERS.cactus`, `cactus_fleur` |
| `plantes/sous-bois/` | famille | PLA-006 fougère, PLA-013 petit champignon | `BUILDERS.fougere`, `champi_petit` |
| `plantes/champs/` | famille | PLA-007 lavande, PLA-008 tournesol, PLA-009 blé, PLA-012 potiron | `BUILDERS.lavande`, `tournesol`, `ble`, `potiron` |
| `plantes/bord-de-l-eau/` | famille | PLA-010 roseau, PLA-011 nénuphar | `BUILDERS.roseau`, `nenuphar` |
| `plantes/fleurs/` | famille | PLA-014 massif de fleurs, PLA-015 fleur des champs | `BUILDERS.fleurs`, `fleur_champ`, `flowerGeometry`, `fieldFlowerGeometry` |
| `plantes/herbe/` | vedette | PLA-016 | `BUILDERS.herbe` (touffe de `render/grass.js`) |
| `plantes/fleur-geante/` | vedette | PLA-017 | `structures/lieux.js` `MICRO.fleur_geante` |
| `plantes/raretes/` | famille | PLA-018 lavande géante, PLA-019 arche de glycine | `buildings/ileDepart.js` `lavandeGeante`, `archeGlycine` |

### Rochers, bois et minerais (ROC)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `rochers/blocs/` | famille | ROC-001 rocher, ROC-002 rocher moussu | `BUILDERS.rocher`, `rocher_mousse` |
| `rochers/mineraux/` | famille | ROC-003 cristal, ROC-004 filon de cuivre, ROC-005 filon de fer, ROC-006 obsidienne | `BUILDERS.cristal`, `filon_cuivre`, `filon_fer`, `obsidienne`, `ore()` |
| `rochers/bois/` | famille | ROC-007 souche, ROC-008 bois mort, ROC-009 pile de bois, ROC-010 rondin | `BUILDERS.souche`, `bois_mort` ; `structures/lieux.js` `boisPile`, `rondin` |

### Bâtiments (BAT)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `batiments/maison-village/` | vedette | BAT-001 | `structures/lieux.js` `maison` |
| `batiments/chaumiere/` | vedette | BAT-002 | `buildings/ileDepart.js` `chaumiere` ; obstacles de `world/home/props.js` |
| `batiments/bibliotheque-souche/` | vedette | BAT-003 | `buildings/ileDepart.js` `bibliotheque` ; obstacle de `world/home/props.js` |
| `batiments/moulin/` | vedette | BAT-004 | `structures/lieux.js` `moulin` |
| `batiments/moulin-eau/` | vedette | BAT-005 | `structures/lieux.js` `moulinEau` |
| `batiments/phare/` | vedette | BAT-006 | `buildings/gabarits.js` `STRUCTURES.phare` |
| `batiments/tour-guet/` | vedette | BAT-007 | `structures/lieux.js` `tourGuet` |
| `batiments/temple/` | vedette | BAT-008 | `buildings/gabarits.js` `STRUCTURES.temple` |
| `batiments/cabane-ermite/` | vedette | BAT-009 | `buildings/gabarits.js` `STRUCTURES.cabane` |
| `batiments/observatoire/` | vedette | BAT-010 | `structures/lieux.js` `observatoire` |
| `batiments/etal-marche/` | vedette | BAT-011 | `structures/lieux.js` `etal` |
| `batiments/echoppe/` | vedette | BAT-012 | `buildings/ileDepart.js` `echoppe` ; obstacles de `world/home/props.js` |

### Ouvrages et aménagements (STR)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `ouvrages/jetee/` | vedette | STR-001 | `structures/lieux.js` `jetee` (plancher) |
| `ouvrages/ponton/` | vedette | STR-002 | `buildings/ileDepart.js` `ponton` |
| `ouvrages/chemins/` | famille | STR-003 pont, STR-004 pont de corde, STR-005 escalier, STR-013 panneau | `structures/lieux.js` `pont`, `pontCorde`, `escalier`, `panneau` (planchers) |
| `ouvrages/puits/` | vedette | STR-006 | `structures/lieux.js` `puits` |
| `ouvrages/champs/` | famille | STR-007 clôture, STR-008 potager, STR-009 épouvantail, STR-012 arche fleurie | `clotureChamp`, `potager`, `epouvantail` (et `MICRO.epouvantail`), `archeFleurie` |
| `ouvrages/bassin-chaud/` | vedette | STR-010 | `structures/lieux.js` `bassinChaud` |
| `ouvrages/arche/` | vedette | STR-011 | `structures/lieux.js` `arche` |
| `ouvrages/mobilier/` | famille | STR-014 corde à linge, STR-015 lanterne, STR-016 lanterne de pierre, STR-017 banc, STR-018 banc avec vue, STR-019 casiers | `linge`, `lanterne`, `MICRO.lanterne_pierre`, `banc`, `MICRO.banc_vue`, `casiers` |
| `ouvrages/mobilier-depart/` | famille | STR-020 parasol et transats, STR-021 bureau d'étude, STR-022 pont de la rivière, STR-023 pupitre du hibou, STR-024 panneau de la place, STR-025 banc de bois, STR-026 lanterne de jardin | `buildings/ileDepart.js` `parasolPlage`, `transat`, `bureauEtude`, `pontRiviere`, `pupitreHibou`, `panneauPlace`, `bancBois`, `lanterneJardin` ; obstacles de `world/home/props.js` |
| `ouvrages/cascade/` | vedette | STR-027 | `structures/lieux.js` `cascade` |

### Ruines et monuments (MON)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `monuments/ruines/` | vedette | MON-001 ruines, MON-002 ruines ensablées | `buildings/gabarits.js` `STRUCTURES.ruines` (+ dune de `partModel`) |
| `monuments/grotte/` | vedette | MON-003 | `buildings/gabarits.js` `STRUCTURES.grotte` |
| `monuments/cercle-pierres/` | vedette | MON-004 | `structures/lieux.js` `cerclePierres` |
| `monuments/statue-geante/` | vedette | MON-005 | `structures/lieux.js` `statue` |
| `monuments/curiosites/` | famille | MON-006 totem, MON-007 autel, MON-008 cairn | `MICRO.totem`, `autel`, `cairn` |

### Bateaux et épaves (NAV)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `bateaux/radeau/` | vedette | NAV-001 | `boats/bateaux.js` `BOATS.radeau` et branche `radeau` de `buildBoat` |
| `bateaux/barque/` | vedette | NAV-002 | `BOATS.barque`, branche `barque` (rames) |
| `bateaux/voilier/` | vedette | NAV-003 | `BOATS.voilier`, branche `voilier` |
| `bateaux/goelette/` | vedette | NAV-004 | `BOATS.goelette`, dernière branche |
| `bateaux/canots/` | famille | NAV-005 barque amarrée, NAV-006 barque échouée | `structures/lieux.js` `barque`, `barqueEchouee` |
| `bateaux/epaves/` | famille | NAV-007 épave, NAV-008 grande épave | `structures/lieux.js` `epave` |
| `bateaux/mouillage/` | famille | NAV-009 ancre, NAV-010 bouée, NAV-011 bouée échouée | `MICRO.ancre`, `MICRO.bouee_echouee` ; la bouée qui flotte reste dessinée par `objets/mer` (`marineMesh`), sa fiche est ici |

`bateaux/commun.js` garde `buildBoat` (matériaux, voiles, bôme) et la coque arrondie partagée ;
chaque bateau apporte ses caractéristiques et son dessin.

### Décor achetable (DEC)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `decor/jardin/` | famille | DEC-001 à DEC-009 (pierres, pot, clôture, lanterne, champignon, nichoir, banc, fanions, hamac) | `decor/catalogue.js` `CATALOG` |
| `decor/curiosites/` | famille | DEC-010 télescope, DEC-011 moulin, DEC-012 arche, DEC-013 statue, DEC-018 fontaine | `CATALOG` |
| `decor/ateliers/` | famille | DEC-014 établi, DEC-015 four, DEC-016 couture, DEC-017 chantier | `CATALOG` |

`decor/commun.js` garde `mesh` et `halo`. L'emprise `r` de chaque article vient de `physique.js`.

### Objets et petites découvertes (OBJ)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `objets/coffre/` | vedette | OBJ-001 coffre, OBJ-002 coffre caché | `structures/lieux.js` `coffre`, `MICRO.coffre_cache` |
| `objets/curiosites/` | famille | OBJ-003 tonneaux, OBJ-004 charrette, OBJ-008 nid, OBJ-009 cercle de champignons, OBJ-023 nichoir | `MICRO.tonneaux`, `charrette`, `nid`, `cercle_champi`, `nichoir` |
| `objets/campement/` | famille | OBJ-005 feu de camp, OBJ-006 tente | `structures/lieux.js` `feuCamp`, `tente` |
| `objets/ruche/` | vedette | OBJ-007 | `structures/lieux.js` `ruche` |
| `objets/lagon/` | famille | OBJ-010 récif, OBJ-011 corail | `structures/lieux.js` `recif` ; `BUILDERS.corail` |
| `objets/tresors/` | famille | OBJ-012 coquillage, OBJ-013 étoile de mer, OBJ-014 pêche, OBJ-015 perle, OBJ-016 verre poli | `props/objets.js` `collectibleMesh` |
| `objets/mer/` | famille | OBJ-017 bouteille, OBJ-018 caisse, OBJ-019 algue, OBJ-021 récif marin, OBJ-022 banc de poissons | `props/objets.js` `marineMesh`, `MARINE_TYPES` |
| `objets/flotteur-peche/` | vedette | OBJ-020 | `props/outils.js` `flotteurGeometry` |

### Animaux (ANI)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `animaux/mouton/` | vedette | ANI-001 (planche) | `animals/especes.js` `mouton()`, `SPECIES.mouton`, `EAR*` |
| `animaux/chevre/` | vedette | ANI-002 | `chevre()`, `SPECIES.chevre` |
| `animaux/vache/` | vedette | ANI-003 (planche) | `vache()`, `SPECIES.vache` |
| `animaux/cerf/` | vedette | ANI-004 | `cerf()`, `SPECIES.cerf` |
| `animaux/renard/` … `animaux/escargot/` | vedettes | ANI-005 à ANI-023 | `SPECIES.<espèce>` (renard par `quad`, mouette et perroquet par `birdParts`) |
| `animaux/faune-depart/` | famille | ANI-024 mouette, ANI-025 crabe, ANI-026 papillon | `animals/ileDepart.js` |
| `animaux/hibou/` | vedette | ANI-027 | `animals/hibou.js` |
| `animaux/albatros/` | vedette | ANI-028 | `animals/albatros.js` |

Espèces ANI-005 à ANI-023, une par dossier : `renard`, `lapin`, `herisson`, `ecureuil`, `tortue`,
`crabe`, `mouette`, `perroquet`, `flamant`, `canard`, `grenouille`, `poisson`, `papillon`, `abeille`,
`luciole`, `phoque`, `pingouin`, `lezard`, `escargot`.

### Personnage (PER)

| Dossier | Genre | Modèles | Ancien emplacement |
| --- | --- | --- | --- |
| `personnage/corps/` | vedette | PER-001 | `character/personnage.js` `buildAvatarGeometry`, torse ; tenues et accessoires y sont dessinés |
| `personnage/coupes/` | famille | PER-002 à PER-007 | `character/personnage.js` `HAIR_STYLES`, calotte, mèches |
| `personnage/tenues/` | famille | PER-008 à PER-019 | fiches seules (géométrie dans `personnage/corps/`) |
| `personnage/accessoires/` | famille | PER-020 à PER-023 | fiches seules (géométrie dans `personnage/corps/`) |
| `personnage/crayon/` | vedette | PER-024 | `props/outils.js` `crayonGeometry` |
| `personnage/outils/` | vedette | PER-025 | `props/outils.js` `outilGeometry`, `OUTILS` |

`personnage/commun.js` garde le squelette (`HC`, `B`, `PARENT`, `REST`, `ID`), les teintes et
l'assemblage des pièces par os.

### Aides partagées

| Nouveau | Ancien |
| --- | --- |
| `kit/formes.js` | `animals/especes.js` : `bone`, `blob`, `limb`, `surface`, `hull`, `skinMesh`, `leafGeo`, `patch`, `scatter` |
| `kit/laine.js` | `animals/especes.js` : `curls`, `CURL`, `CURL_S`, `CURL_LITE`, `CURL_S_LITE` |
| `kit/accessoires.js` | `animals/especes.js` : `collar`, `BELL`, `eye`, `EYE`, `legs`, `HOOF`, `HOOF_SMOOTH` |
| `kit/pieces.js` | `animals/especes.js` : `part`, `quad`, `birdParts` |
| `kit/lieux.js` | `structures/lieux.js` : teintes, `bx`, `seg` ; `buildings/gabarits.js` : teintes |
| `kit/vegetal.js` | `vegetation/especes.js` : `segment`, `treeTrunk`, `BARK`, `col` |
| `kit/fiches.js` | `registry.js` : fabriques `kind`, `part`, `ile`, `species`, `homeCreature`, `outil` (et `boat` dans `bateaux/commun.js`, `decor` dans `decor/commun.js`, `collect` dans `objets/tresors/`, `marine` dans `objets/mer/`, `perso` dans `personnage/fiche.js`) |
| `kit/tables.js` | nouveau : rompt le cycle assemblage → tables → dossiers → fiches → assemblage |
| `kit/assemble.js`, `kit/materials.js`, `kit/palette.js`, `kit/shapes.js` | mêmes fichiers à la racine de `src/models/` |
| `lieux.js` | `structures/lieux.js` : `partModel` (le `switch` devient une table), `rotY`, `recolorPart` |
| `vegetation.js` | `vegetation/especes.js` : `kindModel`, `ROCKY`, `CAP_COLORS` |
| `releves.gen.js` | `registry.js` : tables `TAILLES` et `USAGE` (`scripts/releve-modeles.mjs` devient `scripts/modeles/releve.mjs`) |
| `physique.gen.js` | `world/islands/gen/kinds.js` : `KIND_RADIUS`, désormais lu dans le `physique.js` de chaque espèce |

Retiré : `STRUCTURES.epave` de `buildings/gabarits.js`, que rien n'appelait (l'épave des îles est
celle de `structures/lieux.js`, aujourd'hui `bateaux/epaves/`).
