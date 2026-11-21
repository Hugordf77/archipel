# Personnage 2.0 : état des lieux et directions

Chantier sur la branche `claude/personnage-2` (worktree `.claude/worktrees/personnage-2`, configuration
`personnage`, port 5182). Objectif : un héros fantasy façon anime, original, dans la DA gouache
(`docs/DA.md`). Ce document fixe le point de départ chiffré et les directions proposées ; la construction
attend la validation de l'utilisateur.

## 1. État des lieux (02/11/2026, `v3-archipel` à `06e4352`)

### Mesures (`node scripts/modeles/mesure.mjs PER-001 --json`)

| Mesure | Valeur | Verdict |
| --- | --- | --- |
| Triangles (avatar par défaut) | 8 566 / 9 000 | ok |
| Gabarit | 0,82 × 1,64 × 0,77 m (coiffé ; 1,48 m sans les pics) | ok |
| Couleurs | aucun noir | ok |
| Facettes | 11 primitives sous 10 segments (oreilles, mains, boutons, baskets…) | **échec** |
| Version allégée | aucune (DA § 8 : obligatoire au-delà de 4 000) | écart |

Tenues et accessoires : de 7 454 (robe) à 8 878 triangles (sandales) ; bob 7 736 (il retire des mèches).

Répartition des triangles de l'avatar par défaut (os principal de chaque triangle) :

| Partie | Triangles | Partie | Triangles |
| --- | --- | --- | --- |
| Tête (crâne 616, calotte 432, oreilles, frange, côtés) | 2 086 | Bras + avant-bras + mains (×2) | 1 392 |
| Dessus des cheveux (`HAIR_A`, 8 pics) | 616 | Cuisses + tibias + pieds (×2) | 1 544 |
| Arrière des cheveux (`HAIR_B`, 6 mèches) | 396 | Bassin | 168 |
| Torse (pull rayé en 15 tranches, salopette) | 1 548 | Écharpe (pans) | 216 |
| Visage peint (calotte de l'atlas) | 440 | Épée de dos | 160 |

Les cheveux pèsent environ 2 200 triangles ; il reste 434 triangles de marge.

### Coût GPU (`scripts/rendu/gpu.js`, `banc`, 30 répétitions, médiane de 3)

Personnage cadré à 3 m, 12 h, qualité courante (rendu interne 512 × 384) : G-buffer 6,07 ms avec,
5,20 ms sans, soit **≈ +0,9 ms**. Mesure bruitée (l'image complète sort plus chère *sans* personnage) ;
elle sera reprise dans les mêmes conditions à chaque étape. Ombre : +0,01 ms.

### Captures (non versionnées, `captures/`)

- `p2-avant-cat-6vues.png`, `p2-avant-cat-gros-plans.png` : planche du catalogue (`scripts/modeles/planche.js`).
- `p2-avant-planche-visage.png` : neutre, clignement, joie, surprise, effort, endormi ; atlas `p2-avant-atlas.png`.
- `p2-avant-planche-jeu.png` : en jeu à 3, 8 et 15 m, à 8 h, 12 h, 18 h 30 et 23 h.
- `p2-avant-planche-vues.png` : 6 vues en jeu.

Outils de la série (mêmes cadrages avant et après chaque étape) : `scripts/rendu/personnage.js`, à appeler
depuis la console du jeu, et `scripts/rendu/planche_perso.py <avant> [<après>]`. Le lieu de pose est un pré
de la Grande Île (−100, −400) : sur l'île de départ, un poteau, une barrière ou un buisson gênait chaque vue.

### Constats visuels

- La tête fait 37 % de la hauteur sans les pics, soit 2,7 têtes ; les jambes font 28 %.
- Sur le visage, le toon pose une **bande d'ombre horizontale** en travers des joues, à toutes les heures.
  La grosse sphère du crâne reçoit ses 4 paliers d'un seul tenant. À traiter à l'étape 2.
- Vue de profil, la tête se lit surtout par la masse des cheveux.
- Les oreilles sont à facettes (8 × 6) : on les voit depuis que les pics les dégagent.
- L'épée de dos (`ExtrudeGeometry`, garde en boîte) a des arêtes vives : écart à la DA § 4.
- À 15 m, la silhouette se lit surtout par les pics et le haut rouge. La nuit, le haut devient brun-violet et
  la silhouette se perd dans l'herbe.
- En jeu, la caméra suit à **14 m** (`defaultCam`) : le personnage se voit surtout de loin.

## 2. Ce qui dépend des proportions

| Domaine | Où | Valeur actuelle | Effet d'un corps plus grand |
| --- | --- | --- | --- |
| Squelette | `models/personnage/commun.js` (`REST`, `HC` 1,12) | hanches 0,46, épaules 0,775 | tout est à replacer |
| Crâne, visage, cheveux, bob | `face.js` (`FACE.R` 0,28), `coupes/` (`onCap`, `CAP_C`) | calculés depuis `FACE` et `HC` | suivent si l'on change `FACE` ; les butées des pics sont à revérifier (`tests/cheveux.test.js`) |
| Corps et tenues | `corps/index.js` (profil `TORSO`, positions absolues) | torse 0,42 à 0,86 | à redessiner, tenues comprises |
| Lunettes | `corps/index.js` (branches à x 0,152 et 0,302) | en dur | à recalculer depuis `FACE` |
| Bras, pieds (IK) | `locomotion/rig.js` (`UPPER`, `LOWER`, `FOOT_HALF_GAP` lus dans `REST`) | 0,155 + 0,165 m | automatique |
| Main au sol | `locomotion/tuning.js` (`handShoulderX/Y`, `handReach`) | 0,17 / 0,775 / 0,38 | **à recalculer** (`locomotion-physique`) |
| Capsule | `Player.js` (`radius`) | 0,30 m | à garder ou réduire à 0,27 (`locomotion-physique`) |
| Nage | `Player.js` (surface − 0,66) | tête juste hors de l'eau | ≈ `HC·cos(0,55) − 0,29` |
| Caméra | `CameraRig.js` (`lookOffset` 0,7 ; `CLIMB_LOOK` 0,9 ; `TOP_LOOK` 0,4), `Game.js` (`defaultCam` 14 m) | visée à 47 % de la hauteur | visée à rehausser (0,85 à 0,95) |
| Épée | `Character.js` (`backSword`, attachée au torse) | lame 0,35 m, poignée 0,19 m | à replacer au dos ; le coup d'épée suit les bras |
| Poses | `Character.js`, `locomotion/pose.js` | amplitudes en radians, quelques décalages en mètres (accroupi −0,16…) | foulée plus longue à cadence égale ; les décalages sont à mettre à l'échelle |
| Grimpe | `pose.js` (mains sur le tronc par IK) | — | bras plus longs, prise plus haute ; `tests/grimpe-pose.test.js` |
| Bateau, monture | `Sailing.js` (`seat`), `AirRide.js` | assis au siège | genoux plus hauts : vérifier qu'ils ne traversent pas la coque |
| Aperçu de l'inventaire | `ui/inventoryPreview.js` (caméra à y 1,05, visée 0,66) | cadré sur 1,64 m | à recadrer |
| Miroir | caméra du jeu | — | inchangé (le joueur pivote) |
| Poussière, cheveux | `Character.js` (`spawnDust`, `hairPush` à `HC + 0,25`) | en dur ou depuis `HC` | suivent `HC` |
| Empreintes | `tests/fixtures/empreintes.json` | PER-001 à 026 | régénérées pour PER-xxx seulement |

## 3. Directions

Planche indicative (dessin 2D à l'échelle, ombres chinoises et palette) : `captures/p2-directions.png`.
Les hauteurs s'entendent sans les cheveux. Le personnage garde à peu près sa taille actuelle : portes,
bateaux, grimpe et caméra gardent leur échelle. C'est la tête qui rapetisse et le corps qui s'allonge.

| | A · Mousse des vents | B · Cartographe du ciel | C · Veilleur des souvenirs |
| --- | --- | --- | --- |
| Rapport | 4,5 têtes · 1,50 m · tête 33 cm (22 %) | 5 têtes · 1,58 m · tête 32 cm (20 %) | 5,5 têtes · 1,64 m · tête 30 cm (18 %) |
| Jambes | 47 % | 48 % | 50 % |
| Yeux / épaules / hanches | 1,31 / 1,10 / 0,70 m | 1,40 / 1,20 / 0,76 m | 1,47 / 1,28 / 0,82 m |
| Pièce de mouvement | longue écharpe corail (2 os à ressort) | 2 pans arrière de veste (2 os) + queue de nuque | cape courte asymétrique (2 os) |
| Tenue | veste de toile crème à col marin, ceinture de corde, culotte ardoise, bottes à revers, sacoche | veste courte moutarde ouverte, tunique prune, large ceinture à boucle-boussole, sacoche à cartes en bandoulière, brassards, bottes hautes souples | tunique longue crème, cape lilas, ceinture corail, lanterne des souvenirs à la hanche |
| Emblème | rose des vents en spirale (le vent) | l'île-étoile : îlot rond sous une étoile à 4 branches (les îles célestes) | spirale-souvenir sur la lanterne et l'agrafe de cape |
| Couleur dominante | corail sur crème | moutarde et prune | crème et lilas |
| Triangles (estimation) | ≈ 8 800 | ≈ 8 950 (crâne à 20 × 12) | ≈ 9 600 : **hausse ou simplification** |
| Caméra (`lookOffset`) | 0,85 | 0,90 | 0,95 |
| Nage (décalage) | ≈ −0,85 | ≈ −0,92 | ≈ −0,98 |
| Gain | plus proche du héros-enfant ; transition douce depuis le chibi ; écharpe lisible de jour comme de nuit | silhouette en V (épaules, taille, jambes), le plus « héros d'aventure » ; sacoche et pans donnent du mouvement à 15 m | le plus élégant ; la lanterne garde la silhouette lisible la nuit |
| Risque DA | faible | moyen : plus de pièces, toutes à arrondir | moyen à fort : visage moins enfantin, cape large à garder ronde |
| Risque de ressemblance | faible à moyen : l'écharpe longue rouge avec robe à capuche est la signature d'un jeu contemplatif connu ; on écarte robe et capuche, et l'écharpe s'arrête à la taille | faible : ni bonnet, ni tunique verte ou bleue, ni oreilles pointues ; moutarde et prune ne sont la couleur d'aucun héros connu | moyen : cape et épée dans le dos forment un archétype courant |

### Recommandation

**B, Cartographe du ciel**, avec deux idées reprises des autres directions : la rose des vents de A sur
l'agrafe de la sacoche, et une lanterne, plus petite que dans C, en option si la nuit l'exige.

Raisons :
- c'est la seule direction qui marque épaules et taille tout en gardant une grosse tête (5 têtes) ;
- elle tient dans 9 000 triangles si le crâne passe à 20 × 12 et si la tunique remplace les tranches du
  pull ;
- ses couleurs ne renvoient à aucun héros connu.

Les tenues PER-008 à PER-019 seraient adaptées au nouveau torse ; les tranches du pull rayé et la bavette
de la salopette suivent le profil. La tenue « Cartographe » deviendrait la tenue de départ.

### Questions ouvertes pour la validation

1. Direction (A, B ou C) et rapport de têtes.
2. Capsule : garder 0,30 m (aucun réglage du monde à revoir) ou passer à 0,27 m (plus proche du corps
   visible, avis de `locomotion-physique`).
3. Variante « 1.0 chibi » derrière un réglage pendant le chantier : oui, sauf avis contraire.

## 4. Direction retenue (03/11/2026) : l'aventurier, d'après les planches de l'utilisateur

La direction B est abandonnée (personnage filiforme). La cible est le garçon des planches
`references/planche-personnage.webp` et `references/concept-ameliore.webp` : le même qu'avant (cheveux
bruns en pics, pull rayé, salopette, écharpe verte, sac, bottes), en plus détaillé. Le gabarit `heros`
devient le gabarit `aventurier` (`src/models/personnage/gabarit.js`) ; le chibi reste derrière
`?gabarit=chibi`.

### Étape 1 : gabarit et maquette des volumes nus

| Mesure | Planche (brief) | Gabarit aventurier |
| --- | --- | --- |
| Sommet du crâne / avec cheveux | 1,50 / ≈ 1,68 m | 1,486 / 1,66 m (`mesure.mjs` : 0,56 × 1,66 × 0,52 m) |
| Crâne | ≈ 0,38 m, FACE.R ≈ 0,19, HC ≈ 1,30 | FACE.R 0,19 (× 1,06 × 0,98), HC 1,30, menton 1,114 |
| Épaule (os) | épaules ≈ 0,40 m avec les manches | ±0,165 à 0,96 m ; manche bouffante r 0,066 : ≈ 0,46 m |
| Bras | ronds, poings ≈ 0,06 m à l'entrejambe, écartés ≈ 14° (planche : poing à ±0,245) | coude 0,775, poing 0,60 ; épaule → centre du poing 0,36 m ; écart au repos 0,23 rad (`ecartBras`), poing à ±0,248 |
| Jambes | ≈ 40 %, cuisses et mollets épais | hanche ±0,10 à 0,62 m (37 % de 1,66), genou 0,35, cheville 0,085 ; cuisse r 0,092, mollet r 0,084 |
| Torse, bassin | trapu ; planche : buste en colonne ≈ 0,32 m, bassin ≈ 0,33 × 0,23 m | torse en colonne 0,70 → 1,10 (r 0,165, profondeur × 0,84) ; bassin droit 0,575 → 0,78 (r 0,172, profondeur × 0,72) |
| Bottes | ≈ 0,24 m (planche : ≈ 0,31), semelle épaisse claire | 0,27 × 0,18 m, tige jusqu'à 0,22 m, plus large que le bas du pantalon |
| Triangles | 9 000 | 7 046 (maquette sans tenue ni visage nouveau) ; `mesure.mjs` : 0,56 × 1,67 × 0,53 m |

Raccords qui suivent le gabarit sans retouche : visée de la caméra (`visee` 0,85), nage (`NAGE` ≈ 0,82),
prises de grimpe (`CLIMB`), `FLEX` des cuisses, `BODY_Y_K` ≈ 1,51, main au sol (`tuning.js`), aperçu de
l'inventaire (`apercu`), épée de dos (`epee`, z −0,17 dans le repère du torse).

Raccords recalés par `locomotion-physique` (valeurs propres au gabarit, chibi inchangé) : main au sol
`pliMain` 0,52 et `penchMain` 0,2 (paume à 1,2 à 2,2 cm du plat) ; grimpe `prise` haut 0,08 / bas 0,08 /
`serre` 0 (mains entre +1,5 et +4,3 mm de l'écorce sur 32 variantes) ; `ecartBras` 0,03 (pose.js,
`ARM_BASE`). Avis : démarche, saut, nage sans retouche ; capsule gardée à 0,30 m jusqu'au corps
définitif ; à vérifier : bottes et genoux assis au bateau (13 cm plus bas, 12 cm plus en avant que le
chibi), gestes d'attente qui fixent l'écart des bras à 0,2 en dur (`Character.js`), limiteur `ARM_RATE`
de `Character.js` pendant la prise (cause de fond des mains dans l'écorce), test des cheveux instable
(`tests/cheveux.test.js`, dépend de `Math.random` au repos).

Corrections d'Evis-critique appliquées : buste en colonne, bassin droit, bras allongés et écartés,
bottes plus hautes.

Captures (non versionnées) : `captures/p2-e1b-vue-*.png` (6 vues à 12 h),
`captures/p2-e1b-references-vs-modele.png` (planche de l'utilisateur au-dessus, modèle en dessous, mêmes
vues), `captures/p2-e1b-jeu-*.png` (3, 8 et 15 m à 8 h, 12 h, 18 h 30 et 23 h).

Restent pour les étapes suivantes : cou visible sous le menton (couvert par l'écharpe, étape 5), bande
d'ombre du visage (étape 3), masse des cheveux trop étroite (ancienne coupe mise à l'échelle, étape 4),
revers du pantalon et salopette (étape 2), silhouette de nuit (écharpe et sac, étape 5).

### Étape 3 (avancée à la demande de l'utilisateur, 03/11) : visage refait

- **Forme** : visage ovale de manga (`src/models/personnage/tete.js`, réglages `FACE.forme` du gabarit) :
  joues pleines, mâchoire affinée, menton doux (bas du menton à 0,20 m sous le centre du crâne), nuque
  qui rentre ; anneaux du crâne resserrés vers la mâchoire à triangles constants (616). La calotte peinte
  (`face.js`, `faceGeometry`) subit la même déformation. Chibi inchangé (pas de `forme`).
- **Bande d'ombre** : normales du visage tournées vers l'avant (`redresse`, `lumiere` 1,1) ; plus de bande
  en travers des joues.
- **Atlas** (`face.js`) : 4 × 5 cases. Grands yeux bruns (iris en dégradé foncé en haut, clair en bas,
  pupille d'encre, deux reflets blancs, trait de cils épais en haut avec un crochet, trait léger en bas),
  sourcils épais en fuseau, nez en point rosé, joues rosées ovales, bouches refaites. Nouvelles cases :
  yeux `pensif` (regard levé de côté), bouches `coin` (sourire en coin) et `detendue`. Nouvelles
  expressions : `determine` (coup d'épée), `pensif`, `somnolent` (état fatigué) ; `endormi` = yeux fermés,
  bouche détendue ; `joie` = yeux en arcs, grande bouche ouverte avec la langue.
- Cou : profil tourné court sous le menton, col du pull relevé (Evis, étape 2).
- Triangles : 8 662 par défaut, 8 974 au plus (lunettes, sac).
- Captures : `captures/p2-e3-visage-*.png`, `captures/p2-e3-visages-references-vs-modele.png`.

### Étape 4 (03/11) : coupe volumineuse et écharpe épaisse (Evis), corps réduit de 12 %

- Coupe : 29 mèches épaisses (frange 7 dont une entre les yeux, côtés 6 sur le nouvel os HAIR_C, nuque 7,
  dessus 6, épi 3), calotte et masse de nuque ; 0,68 m de large pointes comprises ; 2 588 triangles.
  Physique : HAIR_A (dessus), HAIR_B (nuque), HAIR_C (côtés), ressorts bornés. Test des cheveux rendu
  déterministe (5 passages verts). Chibi inchangé (`coupes/chibi.js`).
- Écharpe vert sauge (`#6aa898`, « sauge », ajoutée en fin de `CLOTH_COLORS`) : boudin de 4,6 cm de
  section, pans de 6,4 × 3,8 cm effilochés en pointes rondes. Bras allégés (1 156 → 860 triangles).
- Corps réduit de 12 % sous le cou à la demande de l'utilisateur : `reduit(AVENTURIER_DESSIN, 0.88)` dans
  `gabarit.js`. Les pièces restent dessinées dans les positions de `dessin` ; `Parts.build` (`commun.js`)
  les porte au squelette (`versReel` : corps × 0,88 depuis les pieds, tête et cheveux descendus de
  `teteDy` = 0,133 m, à leur taille). REST, HC, caméra (`visee`), aperçu, épée, nage et locomotion lisent
  le gabarit réduit. Hauteur : 1,54 m avec les cheveux (`mesure.mjs` : 0,68 × 1,54 × 0,62 m). Tests de
  locomotion, pose, grimpe, nage et cheveux verts sans retouche.
- Captures : `captures/p2-e4-references-vs-modele.png`, `captures/p2-e4-visages-references-vs-modele.png`.
- Restent : taches ovales des pieds de pics vus d'en haut, tempe moins couverte de profil, sac et pans
  d'écharpe (étape 5), épée de dos à replacer avec le sac.
