# Forteresse-navire du Plateau venté — mémoire de chantier

Ce document pilote un **chantier en plusieurs sessions** : l'IA qui le reprend construit, une étape
par session, l'énorme village-forteresse en forme de navire échoué au milieu du Plateau venté. Il a
été rédigé le 26/10/2026 au soir, **avant tout chantier** : rien n'est encore construit. Code,
commentaires et documents restent en français.

**Règle d'or : ce fichier est la source de vérité du chantier.** Chaque session commence par le lire
en entier, fait **une seule étape** du tableau de bord (§0), puis met à jour ce tableau et le journal
(§0 et §14) dans le même commit que l'étape. Une session qui s'arrête au milieu d'une étape l'écrit
aussi (statut « en cours » et ce qui reste).

---

## 0. Tableau de bord (à tenir à jour à chaque session)

Statuts : `à faire` · `en cours` · `à revoir` (refusé en revue) · `fait` · `bloqué` (raison dans la
colonne Notes).

| Étape | Contenu | Statut | Commit | Mesures (triangles de près / allégé, règles en échec) | Notes |
| --- | --- | --- | --- | --- | --- |
| E0 | Préparation : branche, image pleine taille, emplacement tranché | en cours | `8003a33` | | §2, §7. Fait : branche `claude/forteresse-navire`, emplacement (b) tranché le 27/10 (§1, §7). Reste : **fichier** de l'image pleine taille (envoyée le 27/10 dans le chat seulement, rien sur le disque) à déposer dans `production/references/forteresse-navire.png` **avant la planche référence / modèle de E2**, puis la copier en `reference.png` dans chaque dossier de pièce. |
| E1 | Formes communes `forme.js` (copie des aides de BAT-013 + nouvelles) | fait | (ce commit, voir journal) | sans objet (aucun modèle) ; aides : loft 256 tri. pour 5 stations × 32, plaque 9 × 5 : 144, hublot : 96, rivet : 12, voile 9 × 7 : 320 | §5 ; copies vérifiées identiques à leurs sources |
| E2 | BAT-014 Coque et berceau | fait | (commit de E2, voir journal) | 11 966 / 4 336 ; aucune règle en échec ; 74 planchers (pire 2,9 cm), aucun obstacle (voulu) | §6.1 ; écarts et décisions en « Fait le 27/10 » de §6.1 ; Evis-critique : 3 tours, dernier point corrigé selon sa proposition |
| E3 | BAT-015 Maison de pont (3 variantes) | à faire | | | §6.2 |
| E4 | BAT-016 Tourelle (2 variantes) | à faire | | | §6.3 |
| E5 | BAT-017 Tour-moulin centrale | à faire | | | §6.4 |
| E6 | BAT-018 Mât et voile (2 variantes) | à faire | | | §6.5 |
| E7 | BAT-019 Escalier et passerelle | à faire | | | §6.6 |
| E8 | Pose composée (code du monde) et plan d'implantation | à faire | | | §8 |
| E9 | Vérification en jeu, captures, réglages | à faire | | | §10 |
| E10 | Livraison : LIVRAISONS.md, rapport, graphe | à faire | | | §11 |

Budget cumulé (à tenir à jour) : **11 966 / 60 000** triangles de près (BAT-014 ; rien n'est encore posé en jeu, E8).

---

## 1. Décisions de l'utilisateur (ne pas rediscuter)

| Date | Décision |
| --- | --- |
| 26/10/2026 | Une forteresse **très imposante en plein milieu du Plateau venté**. |
| 26/10/2026 | Budget total accordé : **environ 60 000 triangles de près**, en **pièces modulaires**, chacune avec son budget propre (`budget: { triangles, lod }` dans sa fiche) et une version allégée (variante `v: 1`, « Allégé (au loin) »). |
| 26/10/2026 | Emplacement : **plein centre du dôme** du plateau ; le cercle de pierres prévu par le plan devient le parvis. |
| 26/10/2026 | Après des concepts en pierre puis dans la DA des moulins : « plus dans la DA du château ambulant » ; retenu : **concept « Navire de maisons »** (« le bateau est excellent »). |
| 26/10/2026 | « Ne fais pas de chantier ce soir » ; ce document doit permettre de construire **étape par étape, en plusieurs parties**. |
| 27/10/2026 | Emplacement (§7) : **option (b)**, centre du dôme **(644, 316)**, navire tourné de 90° (**rot = 5,25 rad**, flanc au vent), escalier côté cercle de pierres (parvis). Les ailes de la tour-moulin restent face au vent (élément tourné de −π/2 dans le plan, §8 : 5,25 − π/2 = 3,68, comme les moulins-tours). |

Contrainte de `docs/DA.md` §1 : **design original**. On garde l'esprit (accumulation fantaisiste de
maisons, bois, enduit et cuivre mêlés, cheminées qui fument, voiles), jamais la silhouette d'un film :
**pas de pattes, pas de visage, immobile**.

Ce qui demande **une question à l'utilisateur** (une seule question à la fois, avec recommandation) :
un dépassement de budget d'une pièce ou du total ; le choix d'emplacement de §7 ; toute nouvelle
dépendance npm ; toute modification de `src/models/kit/` ou d'un modèle existant (BAT-013 compris) ;
la fusion de la branche.

## 2. Référence

- `production/references/forteresse-navire.png` : **aperçu de 199 × 112 px** seulement.
- Pleine taille (1 680 × 944) : importations Canva de l'utilisateur, média `MAHZJEbPC1w`. Le
  connecteur Canva ne rend qu'une vignette signée (l'URL agrandie répond 403). **E0 : demander à
  l'utilisateur d'exporter l'image pleine taille** et de la déposer à la place de l'aperçu, puis la
  copier comme `reference.png` dans chaque dossier de pièce.
- Concepts non retenus (non commités) : `production/references/concepts-forteresse/`.

### Lecture de l'image (aperçu agrandi × 5, 995 × 560 px ; gauche → droite)

- **Coque** longue et ventrue, **proue à gauche**, poupe à droite. Longueur ≈ 730 px (x 140 → 870),
  quille → pont ≈ 190 px (y 245 → 435) : **hauteur / longueur ≈ 0,26**. Bordages de bois brun chaud ;
  **deux grandes plaques ovales bombées de cuivre/cuir rivetées** superposées sur le flanc avant
  (x 270–450) ; hublots ronds ; **bord de pont débordant couvert de mousse et d'herbe** qui retombe sur la
  coque. La poupe est plus haute, plus sombre, chargée de galeries.
- **Beaupré** : longue poutre qui sort de la proue (y ≈ 305), d'où pendent des cordages, une échelle de
  corde et une petite nacelle presque jusqu'au sol.
- **Berceau** : la coque repose sur des **piliers de rocher et de pierre moussue** (y 400 → 470) au
  sommet d'une butte herbue ; hauteur ≈ 0,06 à 0,08 de la longueur.
- **Escalier de bois** en diagonale du flanc (x ≈ 640, y ≈ 380) jusqu'au sol (x ≈ 690, y ≈ 440), vers un
  chemin de terre qui serpente sur la butte.
- **Pont** (gauche → droite) : tourelle de proue à **coupole ocre-orangé** et lanterne (x ≈ 165) ; **mât
  de misaine** à voile carrée crème marquée d'un emblème bleu (x ≈ 235) ; **grande maison à pignon** à
  colombages, deux étages et combles, toit de mousse (x 330–470) ; **tour-moulin centrale**, le point le
  plus haut (sommet y ≈ 10), étages empilés à colombages, tête de bois, **quatre ailes à toile**
  (x 480–610) ; **cheminées** fines qui fument blanc (x ≈ 240 et 640) ; **tourelle ronde** à toit conique
  bleu ardoise pointu (x ≈ 675) ; **grand mât** à grande voile carrée à emblème (x ≈ 760) ; **maisons de
  poupe** en gradins à petits pignons et toits ardoise, **mâts d'artimon** à petites voiles (x 800–870) ;
  **flammes bleu ardoise** au vent en haut des mâts et des tours.
- Hauteur hors tout (sol → haut des ailes) ≈ 460 px : **≈ 0,63 de la longueur**.
- Le personnage de l'image est minuscule : l'échelle se fixe par §3, pas par lui.

## 3. Dimensions cibles et repère (personnage de 1,1 m)

**Repère du navire** (celui de toutes les pièces posées sur lui) : origine au sol, au centre de
l'emprise ; **+Z vers la proue** ; **+X : flanc de l'escalier** ; y vers le haut.

| Élément | Cible |
| --- | --- |
| Coque, proue → poupe (hors beaupré) | **64 m**, de z = −32 (poupe) à z = +32 (étrave) |
| Largeur au maître-bau | 18 m (demi-largeur 9 m au pont) |
| Berceau de rocher | dessous de quille à y ≈ 4 m au milieu, 5 à 7 m aux extrémités |
| Pont principal | **y = 20 m** au milieu, avec tonture (relevé vers les bouts, voir §6.1) |
| Gaillard d'avant | pont surélevé de 2 m, z +22 → +32 |
| Château de poupe | pont surélevé de 3 m, z −32 → −20 |
| Maisons de pont | 2 à 3 étages, 7 à 11 m au-dessus du pont ; portes de 1,6 m |
| Tour-moulin centrale | corps jusqu'à ≈ 36 m du sol, moyeu ≈ 34 m, ailes de 8 m → **≈ 42 m hors tout** |
| Mâts | 14 à 18 m au-dessus du pont |
| Beaupré | 10 m hors de l'étrave |
| Passages | **≥ 2,2 m** (rues du pont, portes de passage) ; **marches ≤ 0,4 m** ; palier toutes les 12 à 16 marches |

## 4. Branche, environnement, protocole de session

### Branche et dossiers

- Partir de `claude/ruine-alternative` (commit `d83e2b7` ou suivant) : elle contient BAT-013, MON-014,
  la pose à la main (§8) et ce document.
- **E0 crée la branche `claude/forteresse-navire`**, dans le worktree existant
  `.claude/worktrees/ruine-alternative` (`git switch -c claude/forteresse-navire`) ou dans un nouveau
  worktree avec un lien `node_modules` vers celui de la copie principale.
- **Interdit** : la copie principale (`/Users/hugo/developer/Island test`, travail non commité de
  l'utilisateur), le worktree `plateau-vente-modeles`, la branche `v3-archipel`, toute fusion.
  `git add` par chemins explicites, jamais `-A` ni `.`.

### Début de session (dans cet ordre)

1. Lire ce fichier en entier, puis `CLAUDE.md`, `LIVRAISONS.md` (État courant),
   `/Users/hugo/developer/Island test/.claude/skills/modele-3d/SKILL.md` (version à jour, non commitée
   dans la copie principale) et `docs/DA.md`.
2. `git status --short && git log --oneline -5` dans le worktree : rien de non commité qui ne soit
   décrit dans le journal (§14).
3. Prendre la **première étape non faite** du tableau de bord (ou celle « en cours ») ; annoncer à
   l'utilisateur ce que fera la session.
4. Mesurer avant de toucher (skill `modele-3d` §3) quand l'étape reprend une pièce existante.

### Fin de session (dans cet ordre)

1. Contrôles de l'étape (§12) ; tests (§12) ; captures produites listées.
2. Mettre à jour le **tableau de bord** (statut, commit, mesures), le **budget cumulé** et le
   **journal** (§14) de ce fichier.
3. Commit unique de l'étape (fichiers de la pièce + ce document), message en français qui cite
   l'étape (« Forteresse-navire E3 : … »).
4. Dire à l'utilisateur ce qui est fait, ce qui reste, et la prochaine étape.

### Serveur et navigateur

- `preview_start` lit le `launch.json` de la **copie principale** (ne pas le modifier) : lancer vite en
  arrière-plan depuis le worktree, `npx vite --port 5175 --strictPort`, puis ouvrir
  `http://127.0.0.1:5175/catalogue.html#BAT-0xx` ou `http://127.0.0.1:5175/`. Jamais 5173 (partie de
  l'utilisateur) ni 5174 (agents). L'arrêter en fin de session.
- En jeu : `__ile.game.skipSave = true` **avant toute téléportation et après chaque rechargement**.
- Garder le panneau du navigateur **affiché** pendant les captures (panneau masqué : rendu figé).

## 5. Formes communes (E1)

Les aides de BAT-013 (`src/models/batiments/moulin-tour/index.js`) ne sont pas exportées et **BAT-013
ne doit pas changer** (son empreinte). Créer `src/models/batiments/navire-coque/forme.js` (le dossier
de la première pièce, comme `ruines-modules/forme.js` pour les ruines) et y **recopier** en le disant
dans l'en-tête :

- de BAT-013 : `tris`, `prisme`, `rect`, `octo`, `oc`, `plaque`, `panZ`, `panX`, `pignonZ`, `pignonX`,
  `tronc`, `cadre`, `socle`, `barre`, `planche`, `fenetre`, `porte`, `panDeBois`, `poser`, `poteau`,
  `angles`, `facesTronc`, `toitMousse` (lignes 30 à 445 du fichier) ;
- de MON-014 (`src/models/monuments/ruines-alternative/forme.js`) : `hexa`, `coinsBoite`, `bloc` (rochers
  du berceau), `feuille`, `touffe`, `mousse` ;
- la toile de bannière de MON-014 (`toile`, `index.js`) pour les voiles et flammes ;
- nouvelles aides : `loft(stations, n)` (coque, §6.1), `plaqueBombee(L, H, f, seg)` (calotte de cuivre),
  `hublot(r)` (anneau tourné), `rivets(...)` (petits hexaèdres alignés, seulement de près).

Les pièces suivantes importent ce `forme.js`. Aucune modification de `src/models/kit/` sans accord.

### Fait le 27/10/2026 : `src/models/batiments/navire-coque/forme.js`

Tout est exporté. Contexte `o = { rand, leger, idBois, idMur, idToit }` (BAT-013 lit `leger`, `idBois`,
`idMur`, `idToit`, `sens` ; MON-014 lit `rand`, `leger`).

- **Palette** : `ENDUIT`, `POUTRE`, `POUTRE_F`, `BOIS_TOIT`, `PORTE`, `VITRE`, `TOILE`, `TOILE_B`, `MOUSSE`,
  `MOUSSE_C` (BAT-013) ; `BLEU`, `BLEU_F`, `BLASON`, `PIERRES`, `MOUSSE_ROC`, `MOUSSE_ROC_F`, `FEUILLES`
  (MON-014 ; sa `MOUSSE` devient `MOUSSE_ROC`) ; nouvelles : `BORDAGE`, `BORDAGE_F`, `PONT`, `CUIVRE`,
  `CUIVRE_F`, `RIVET`, `CORDAGE`, `FUMEE`.
- **Copies** (texte identique à la source, contrôlé par `verif-forme.mjs` du scratchpad de la session) :
  celles de la liste ci-dessus, plus `archivolte`, `coque`, `segmentDisque` (tête de la tour-moulin, E5) et
  `teinte`. Pas copiées : `voute`, `galerie`, `tete`, `ailes` de BAT-013 (propres au moulin : BAT-017 les
  réécrit à son échelle).
- **`toile(o, L, H, { face, dos, blason, ech, encoche, creux, cols, rows, ourlet })`** : sans option,
  sommets, couleurs et balancement identiques à la bannière de MON-014 (écart 0, de près et allégée).
  Voile : `{ face: TOILE, dos: TOILE_B, blason: BLEU, ech: 4, encoche: 0, creux: 0.8, cols: 6, rows: 8 }`
  → 320 triangles pour 9 × 7 m (allégée : quadrillage divisé par deux, sans feuilles du blason).
- **`loft(stations, n, section, { bandes, inverser })`** : `section(st, t)` → `[x, y]`, t de 0 à 1,
  n + 1 points ; une section de −X à +X **par le bas** donne des normales vers l'extérieur. `bandes: k` :
  une géométrie par bande de k rangées (couleurs alternées le long des lignes de la coque, normales
  lissées communes). Renvoie une liste de géométries indexées. 2 triangles par case :
  (stations − 1) × n × 2.
- **`plaqueBombee(L, H, f, seg = 16)`** : calotte dans le plan z = 0, flèche vers +Z, bord en biseau
  jusqu'à z = −0,06 ; 9 × seg triangles (144 pour 16). Plane : la courber sur la coque en E2 si un jour
  apparaît.
- **`hublot(r, cotes = 12)`** : cerclage tourné, axe +Z, de z = −0,04 à +0,11 ; 8 × cotes triangles ;
  la vitre (disque `VITRE`) se pose à part.
- **`rivets(b, o, points, { t = 0.12, couleur, id })`** : 12 triangles par rivet, aucun en allégé ; passer
  l'`id` de la plaque (pas de trait d'encre autour de chaque rivet).

## 6. Pièces : fiches de construction

Chaque pièce : dossier `src/models/batiments/<slug>/` avec `index.js` (constructeur + `export default
fiche(...)`), `physique.js` (données pures), `FICHE.md` (format de `moulin-tour/FICHE.md`),
`reference.png` ; type de lieu dans `src/models/lieux.js` (entrée de `LIEUX`, et `DIRZ` : +Z regarde
l'angle `rot`) ; `+1` au compte `TYPES_DE_LIEUX` de `tests/models.test.js` (seule assertion à toucher).
Variantes : `variants: [{ label: 'De près', params: { v: 0 } }, { label: 'Allégé (au loin)', params: { v: 1 } }]`
plus, si besoin, un paramètre de forme (`forme: 0 | 1 | 2`) pour les variantes de dessin. Hasard
reproductible : `mulberry32(graine + 977 * k)`, un hasard par partie. Couleurs fixes (`tint: 0`).

Identifiants : **BAT-014 à BAT-019** si personne ne les a pris (vérifier :
`grep -rhoE "fiche\('BAT-[0-9]+" src/models | sort -u`). Ils doivent rester continus.

### 6.1 BAT-014 — Coque et berceau (`navire-coque`, type `navire_coque`) — 12 000 / 5 000

**Coque par sections (loft).** Stations le long de Z ; à chaque station, une section en U (super-
ellipse) entre le dessous de quille et le pont ; 16 points par demi-section (8 en allégé) ; faces entre
stations voisines ; bordages en **bandes de couleur alternées** tous les 0,9 m de hauteur
(`#b8875a` / `#a3774f`, sommets dupliqués à chaque changement de bande) plutôt qu'en planches séparées.

| z (m) | demi-largeur au pont | demi-largeur au fond | dessous de quille y | pont y |
| --- | --- | --- | --- | --- |
| −32 (tableau de poupe) | 6,0 | 2,0 | 7,0 | 24,0 (château) |
| −24 | 8,5 | 4,0 | 5,0 | 23,2 (château) |
| −12 | 9,0 | 5,0 | 4,2 | 20,3 |
| 0 | 9,0 | 5,0 | 4,0 | 20,0 |
| +12 | 8,6 | 4,4 | 4,2 | 20,3 |
| +22 | 6,5 | 2,5 | 5,5 | 22,0 (gaillard) |
| +28 | 3,5 | 0,8 | 8,0 | 22,6 |
| +32 (étrave) | 0,4 | 0,2 | 12,0 | 23,0 |

Tonture du pont principal entre z −20 et +22 : `y = 20 + 0,0007 z²` (ressaut de 3 m au château, 2 m au
gaillard, avec une rambarde). À ajuster sur la planche « référence / modèle » : hauteur / longueur de
coque visée **0,26**, hors tout / longueur **0,63** (§2).

**Détails** (de près seulement, sauf mention) : tableau de poupe plat avec deux rangées de fenêtres à
meneaux et une galerie de bois en encorbellement (garder la galerie en allégé) ; **deux plaques de
cuivre bombées** ovales (≈ 9 × 5 m et 7 × 4 m) sur le flanc avant +X, et une sur le flanc −X, avec un
liseré de rivets ; 8 à 10 **hublots** par flanc à y ≈ 15 m ; **lisse de pont** moussue qui déborde de
0,4 m et retombe en coulures (`#a9bf6c` / `#bdd07f`), interrompue à l'arrivée de l'escalier
(x = +9, z ≈ −6) ; **beaupré** (cylindre à 8 côtés, 10 m, incliné de 20°) avec cordages
(`seg` de `kit/lieux.js`, couleur `ROPE`) et une petite nacelle.

**Berceau.** 6 à 8 piliers de rochers moussus sous la quille (blocs `hexa` empilés, 3 à 6 m de haut,
2 à 4 m de côté), plus de gros rochers à demi enterrés autour ; touffes d'herbe et fougères au pied.

**Pont.** Plancher de bois (bandes `#c98a52` / `#b8875a`) qui épouse la tonture ; rien n'est posé
dessus dans cette pièce (les maisons sont d'autres pièces).

**Physique** (`physique.js`) :
- obstacles : cercles sur les piliers et les rochers du berceau (la coque elle-même est au-dessus de
  1,8 m : le joueur au sol bute sur le berceau et, sous la coque, sur le bord du plancher — voir le piège
  « plancher partout » de §13) ;
- planchers : le pont en tronçons le long de Z (`{ x0: 0, z0, x1: 0, z1, w, y0, y1 }`, pente = tonture),
  largeur `w` = largeur du pont − 0,6 m ; le château et le gaillard à part ; contrôler chaque plancher
  à ± 5 cm avec `mesure.mjs`.

#### Fait le 27/10/2026 (E2) : écarts à cette fiche et ce que les pièces suivantes doivent savoir

- **Aucun obstacle** : les obstacles n'ont pas de hauteur (`navigation.js:137` ; le `ymin` des îles
  célestes n'est pas transmis par la pose des lieux, `IslandManager.js:566`) ; des cercles sous la quille
  bloqueraient aussi le pont. Le berceau est tout entier sous les planchers ; le bord des planchers fait
  mur au sol. **Valable pour toutes les pièces posées sur le pont** : leurs obstacles bloqueront aussi
  le sol dessous, qui est sous les planchers du pont (sans effet), mais ils ne doivent pas déborder hors
  de l'emprise du pont.
- **Quille relevée aux bouts** (planche référence / modèle) : K = 8,5 / 5,2 / 4,2 / 4 / 4,3 / 6 / 9,5 / 16
  aux huit stations ; le haut de la coque suit le pont principal (`pontPrincipal`).
- **Pavois de 1,1 m** (et non 0,9) en **ressauts francs** à z = −20 et z = 22, poteaux aux ressauts ;
  lisse de mousse en coussin, crête à 1,32 m du pont : plus haut que le saut du joueur (≈ 1,23 m :
  `tuning.js`, `Player.js:227`), marge 7 cm. Planchers étroits sur le coussin (bord intérieur à W − 0,6) :
  on ne traverse pas le pavois, ni à pied ni d'un saut. Rambardes de 1,27 m (plancher à 1,3 m) au
  château, au gaillard et en travers de la **pointe (z = 28)** : au-delà, la proue n'est pas accessible.
- **Pont** : planchers jusqu'au pavois, chaque tronçon à la largeur de son bout le plus large (débord
  ≤ 0,45 m sous les planchers du pavois). Hauteurs : `pont(z)` de `navire-coque/physique.js` (château
  +3, gaillard +2) ; les pièces posées dessus prennent `dy = pont(z)` à leur emplacement.
- **Ouverture de l'escalier** : flanc +X, z −7,4 → −4,6 (`OUVERTURE`), deux poteaux ; le bord du plancher
  du pont y est à x ≈ W − 0,3 + débord (≈ 8,7 à 9,1). E7 : le palier d'arrivée doit chevaucher ce bord ;
  c'est aujourd'hui la seule sortie du pont (contrôle `fuites.mjs`).
- **Château et gaillard** ne sont pas encore accessibles depuis le pont principal (ressauts de 3 et 2 m
  sous des rambardes de 1,27 m) : à prévoir en E7 et E8 (escalier ou passerelle avec planchers, et une
  ouverture dans la rambarde ; refaire `fuites.mjs` et le contrôle de saut).
- Beaupré de 13,8 m né dans sa bitte (z = 29, au-delà de la rambarde de la pointe), nacelle et échelle
  de corde au-dessus de 2,3 m (hors de l'emprise mesurée des obstacles).
- Formes communes : `hublot(r, cotes, simple)` a gagné l'option `simple` (profil de trois points).

### 6.2 BAT-015 — Maison de pont (`navire-maison`, type `navire_maison`) — 3 500 / 1 500

DA de BAT-013 : rez de bois sur poteaux, étages à colombages en léger encorbellement, toits de mousse
ou d'ardoise bleue, pignons crème. Paramètre `forme` :
- `0` grande à pignon : 9 × 7 m au sol, 2 étages + combles, faîtage à 10,5 m, toit de mousse, oriel
  sur le pignon, cheminée qui dépasse de 1,5 m ;
- `1` étroite et haute : 5 × 5 m, 3 étages, toit pointu d'ardoise `#3d6f90`, balcon de bois au 2e ;
- `2` basse à appentis : 7 × 4 m, 1 étage, toit en appentis moussu adossé, petite cheminée.
Portes de 1,6 m sur le côté de la rue ; fenêtres à croisillons (`fenetre`, `cadre`).
Physique : cercles sur l'emprise au sol (rangées sur les faces, deux rangées si > 4 m de large),
aucun plancher (intérieur non visitable).
Fumée : boules de nuage `#f4f1ea` (sphères ≥ 10 segments) en grappe au-dessus de la cheminée ; si une
animation lente est utile, pièce `anim` (`axis: 'y'`, vitesse faible). Sinon, la noter « plus tard ».

### 6.3 BAT-016 — Tourelle (`navire-tourelle`, type `navire_tourelle`) — 2 000 / 800

Tourelle ronde en bois et enduit sur encorbellement de consoles ; diamètre 3,5 à 4 m, 6 à 8 m de haut.
`forme` `0` : toit conique bleu ardoise très pointu + flamme bleue ; `forme` `1` (proue) : **coupole de
cuivre** `#cf8f5c` à côtes et **lanterne** vitrée au sommet. Profils tournés (`G.lathe`, ≥ 8 côtés).
Physique : un cercle au rayon visible du fût (± 15 %).

### 6.4 BAT-017 — Tour-moulin centrale (`navire-moulin`, type `navire_moulin`) — 9 000 / 4 000

Version en hauteur de BAT-013 (sans ses annexes) posée sur le pont : 4 étages en tronc de pyramide
(de 6 m à 4 m de côté), galerie à garde-corps au dernier étage, tête de bois débordante sous un toit
cintré, **quatre ailes à toile** (rayon 8 m) en pièce animée `anim: [{ builder: ailes(o), pivot: [0,
yMoyeu, zMoyeu], axis: 'z', speed: 0.6, wind: true }]` (comme `moulinTour`, `index.js:509`). Hauteur du
corps au-dessus du pont ≈ 16 m (le corps s'arrête à ≈ 36 m du sol une fois posé). Ailes face à +Z
(proue) : la pose tourne le navire face au vent.
Physique : cercles du socle de la tour (un au centre, quatre aux angles).

### 6.5 BAT-018 — Mât et voile (`navire-mat`, type `navire_mat`) — 1 500 / 600

Mât (cylindre effilé ≥ 8 côtés), hune, une ou deux vergues, **voile carrée crème bombée** à emblème
bleu (quadrillage comme la bannière de MON-014, `aSway` croissant vers le bas), **flamme** bleu ardoise
en tête. `forme` `0` grand (18 m), `1` petit (14 m, une vergue). Haubans : 4 cordages fins (`seg`).
Physique : un cercle de 0,4 m au pied du mât.

### 6.6 BAT-019 — Escalier et passerelle (`navire-escalier`, type `navire_escalier`) — 2 500 / 1 000

Escalier de bois **du sol au pont (20 m)** le long du flanc +X : 60 marches de 0,33 m (giron 0,4 m),
en **5 volées de 12 marches** et 4 paliers de 1,6 m, largeur 2,4 m, rambardes ; posé sur des chevalets
de bois et appuyé contre la coque. Tracé dans le repère du navire : pied en (x = +13, z = +26, y = 0),
arrivée au pont en (x = +9, z = −6, y = 20), soit ≈ 32 m de long (vérifier qu'aucune volée ne traverse la
coque : la coque fait 9 m de demi-largeur au pont mais moins en bas ; garder l'escalier à x ≥ 10).
`forme` `1` : passerelle droite de 6 m avec rambardes (entre deux maisons ou vers la tourelle de proue).
Physique : **un plancher incliné par volée** (`y0` → `y1`), un plancher plat par palier ; obstacles sur
les chevalets seulement, **aucun sur les marches**.

## 7. Emplacement (E0 : à trancher avec l'utilisateur)

- Centre du dôme, repère de l'île : **(644, 316)** ; sol à 64,4 m ; dénivelé de 6,1 m sur 35 m de rayon
  (mesuré le 26/10/2026 sur le plan réel, script en §15). Monde = repère de l'île + (−4, −1 164).
- Voisins : cercle de pierres prévu (624, 278) à 43 m ; muret prévu (612, 271) à 52 m ; menhir P3
  (577, 317) à 67 m ; nef effondrée MON-014 (756, 312) à 112 m ; Moulin du Large (868, 292) ; route de la
  corniche à venir (`production/fiches/ZONE-ILE-VERTE.json#plan_plateau_vente.montee.route_complete`) :
  rester à ≥ 25 m.
- Orientation naturelle : **proue face au vent**, `rot = windAngle + π = 3,68 rad` (comme les moulins :
  voiles et ailes au vent). Avec 64 m de long, le cercle de pierres tombe alors à ≈ 37 m devant le centre
  et ≈ 22 m sur le côté : **contre la proue**.
- Question à poser en E0 (une seule, avec mesures à l'appui) : (a) **centre décalé vers (660, 340)**,
  proue au vent, cercle en parvis au pied de l'escalier ; ou (b) centre (644, 316) et navire **tourné de
  90°** (flanc au vent), escalier côté cercle. Mesurer pour chaque option : dénivelé sous l'emprise
  (64 × 18 m), distance au cercle et au muret, cases hors zone `plateau-vente`.
- Aplanissement : un stamp de rayon ≈ 34 m, ou une file de stamps le long de l'axe ; le berceau peut
  absorber 2 à 3 m de dénivelé (piliers plus longs du côté bas).

### Tranché le 27/10/2026 : option (b)

Mesures (`site.mjs` de §15, plan réel avec les poses de `e97d344`, emprise 64 × 18 m puis avec
l'escalier jusqu'à x = +15, pas de 2 m) :

| Mesure | (a) (660, 340), rot 3,68 | **(b) (644, 316), rot 5,25** | centre, rot 3,68 (réf.) |
| --- | --- | --- | --- |
| Dénivelé sous la coque | 7,0 m (61,2 → 68,3) | **5,6 m (60,7 → 66,3)** | 5,9 m |
| Hors zone `plateau-vente` | 0 / 429 | 0 / 429 | 0 / 429 |
| Cercle : bord de coque / pied d'escalier | 40 m / 60 m, côté −X | **28 m / 24 m, côté +X** | 14 m / 37 m, côté −X |
| Muret, menhir P3, nef (bord de coque) | 51, 53, 74 m | 42, 48, 90 m | 23, 36, 81 m |
| Hauteurs proue / poupe / flanc +X / flanc −X | 61,2 / 65,5 / 64,5 / 65,3 | 61,4 / 61,2 / 61,3 / 65,0 | 63,1 / 64,3 / 61,9 / 64,7 |

En (a), le cercle tombe devant la proue du côté opposé à l'escalier : pas de parvis. En (b), le sommet
du dôme est sous le flanc −X (≈ 4 m plus haut que le flanc +X) : le stamp et des piliers plus longs
côté +X l'absorbent. Pied de l'escalier (13, 26) → île (646, 287) ; route de la corniche à plus de
200 m.

## 8. Pose composée (E8 : code du monde)

État actuel (commit `e97d344`) :
- `src/world/archipel.js:87` : champ `poses` de la Grande Île (`{ t, at: [x, z], rot, r, nom }`,
  repère de l'île), recopié dans la description par `ileM` (`archipel.js:297`) ;
- `src/world/islands/gen/pois.js:689` : `poserLieux(P)` : un lieu par pose, **un seul élément**
  (`parts: [{ t, x, z, y, rot }]`), plate-forme aplanie de rayon `r` (stamp, chute 6 m) ;
- `src/world/islands/gen/plan.js` : `poserLieux` après le tirage, `applyStamps` commun ;
- `src/world/islands/gen/sections.js:88` : les sections de 512 m gardent les lieux dont l'ancrage est
  dans leur carré, éléments recentrés ;
- `src/world/islands/IslandManager.js:572` : `collectDecks` prend les planchers de tout élément qui en
  déclare (base `p.y` + `y0`, rotation `rotY`).

À faire :
1. Nouveau fichier de plan `src/world/plateau/forteresse-navire.js` (données pures, importables par le
   Worker) : `export const NAVIRE = { at, rot, r, nom: 'Le Navire-forteresse', elements: [...] }`,
   éléments `{ t, dx, dz, dy, rot, v, forme }` **dans le repère du navire** (§3), `dy` = hauteur du pont à
   cet endroit (tonture comprise). `archipel.js` l'importe et l'ajoute aux `poses` de la Grande Île.
2. Dans `poserLieux`, si la pose a `elements` : un seul lieu (un `id`, une découverte, un `label`), une
   `part` par élément : position = centre + rotation de (dx, dz) par l'angle du navire, `rot` de la part =
   `rot` du navire + `rot` de l'élément ; **convention DIRZ** : le modèle est tourné de `π/2 − rot`
   (`rotY` de `src/models/lieux.js`), donc (dx, dz) du repère du navire → monde :
   `x = cx + dz·cos(rot) + dx·sin(rot)`, `z = cz + dz·sin(rot) − dx·cos(rot)` (rotation de `π/2 − rot`
   autour de Y ; à **vérifier par un test** :
   la proue (dz = +32) doit tomber dans la direction `rot`, et le flanc de l'escalier (dx > 0) du bon côté).
   `y` de la part = hauteur de la plate-forme + `dy` ; transmettre `v` et `forme`.
3. `partGeometries` (`IslandManager.js:66`) met en cache par clé `[t, v, …]` : **ajouter `forme`** à la
   clé, sinon deux formes d'une même pièce partagent la même géométrie.
4. Tests : étendre `tests/zones/plateau-vente-poses.test.js` (aujourd'hui exactement 3 moulins-tours et
   la nef, un élément par lieu) : le navire est un lieu, ses éléments sont tous dans la zone, la proue est
   du côté `rot`, aucun arbre sous l'emprise, relief inchangé loin de lui ; `tests/world.test.js` accepte
   les seuls lieux posés (déjà fait pour un élément par lieu : adapter).

### Plan d'implantation proposé (repère du navire ; à ajuster sur les captures)

| # | Élément | t / forme | dx | dz | dy (pont) | rot |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Coque et berceau | `navire_coque` | 0 | 0 | 0 | 0 |
| 2 | Tourelle de proue (coupole cuivre) | `navire_tourelle` / 1 | 0 | +28 | 22,6 | 0 |
| 3 | Mât de misaine (petit) | `navire_mat` / 1 | 0 | +23 | 22,0 | 0 |
| 4 | Grande maison à pignon | `navire_maison` / 0 | −3 | +12 | 20,1 | 0 |
| 5 | Maison étroite et haute | `navire_maison` / 1 | +5 | +7 | 20,0 | π/2 |
| 6 | Tour-moulin centrale | `navire_moulin` | +1 | −1 | 20,0 | −π/2 (ailes au vent) |
| 7 | Maison basse à appentis | `navire_maison` / 2 | −5 | −6 | 20,0 | −π/2 |
| 8 | Tourelle ronde ardoise | `navire_tourelle` / 0 | +6 | −11 | 20,1 | 0 |
| 9 | Grand mât | `navire_mat` / 0 | 0 | −15 | 20,2 | 0 |
| 10 | Maison de poupe (grande) | `navire_maison` / 0 | −2 | −25 | 23,4 | π |
| 11 | Maison de poupe (étroite) | `navire_maison` / 1 | +4 | −28 | 23,7 | π |
| 12 | Mât d'artimon (petit) | `navire_mat` / 1 | −5 | −29 | 23,8 | 0 |
| 13 | Escalier du flanc | `navire_escalier` / 0 | 0 | 0 | 0 | 0 |
| 14 | Passerelle vers la tourelle de proue | `navire_escalier` / 1 | 0 | +19 | 20,6 | 0 |

Rues du pont : garder une allée d'au moins **2,5 m** de chaque côté de la tour-moulin et le long du
flanc +X depuis l'arrivée de l'escalier (x = +9, z = −6). Budget de ce plan : 12 000 + 4 × 3 500 (maisons
4, 5, 7, 10 ; 11 en plus si le budget le permet) + 2 × 2 000 + 9 000 + 3 × 1 500 + 2 500 + passerelle
(≈ 600) ≈ **46 600** sans la maison 11, **50 100** avec ; reste ≈ 10 000 de marge.

## 9. DA et palette

- **Base** : DA de BAT-013 (jouet peint, volumes doux, aucune arête vive, `docs/DA.md` §2 ; aucun noir,
  §3 ; « Lisible d'abord » : silhouette reconnaissable à 15 m). Lire `moulin-tour/FICHE.md`.
- **Reprises** : enduit `#f4e4c6` ; poutres `#c07a45` / `#a5653b` ; bois de toit `#c98a52` ; porte
  `#ad6d40` ; vitre `#a9bfcc` ; toile `#f7ecc8` / `#f1e1b6` ; mousse `#a9bf6c` / `#bdd07f` ; ardoise et
  flammes `#3d6f90` / `#355f7c` ; blason `#efe3c8` ; pierre du berceau `#ddcfb8`, `#d4c8b1`, `#c9c3b6`,
  `#b9b7af` ; vert mousse des rochers `#aab35c` / `#7f9b55`.
- **Nouvelles** (à valider sur la première planche) : bordages `#b8875a` / `#a3774f` ; cuivre `#cf8f5c` /
  `#b97a4c` ; rivets `#e2b07c` ; cordage `#e9d8b4` (`ROPE`, `kit/lieux.js`) ; fumée `#f4f1ea`.
- Signature : herbe et mousse qui débordent du pont, toits de mousse, voiles crème à emblème bleu.

## 10. Vérification en jeu (E9)

- Téléporter (après `skipSave`) : au pied de l'escalier ; sur le pont ; sur la corniche près du Moulin
  de la Corniche (repère de l'île 422, 378) ; près de la nef (756, 312). Captures `__ile.capture(nom)` →
  `captures/navire-*-jeu.png` ; cadrage `__ile.look(x, z, { dist, pitch })` (pitch 0,3 si la caméra
  passe sous le relief).
- **Marche réelle** : du sol au pont par l'escalier (le personnage monte chaque volée, aucun blocage),
  tour du pont, passage entre les maisons, descente. Relever `game.islands.heightAt(x, z)` le long de
  l'escalier (doit monter par paliers de ≤ 0,4 m) et du pont (tonture continue).
- Rien ne se traverse : coque, maisons, tour, mâts ; le joueur au sol ne passe pas sous le pont.
- Budget en jeu : somme des triangles des éléments posés ≤ 60 000 (compter par `partGeometries` ou en
  construisant chaque part).

## 11. Livraison (E10)

`LIVRAISONS.md` (domaines Modèles 3D et Îles et monde, État courant) ; `FICHE.md` de chaque pièce à
jour ; rapport `production/rapports/FORTERESSE-NAVIRE.json` au format de `docs/PRODUCTION.md` (sans
écrire dans `production/journal.jsonl`) ; graphe : `graphify update src`, puis déplacer
`src/graphify-out/*` dans `graphify-out/` et supprimer `src/graphify-out/` ; ce document : tableau de
bord tout « fait », journal complété.

## 12. Contrôles de chaque pièce (avant son commit)

```sh
node scripts/modeles/mesure.mjs BAT-0xx --json   # aucune règle en échec (les écrire, échecs en premier)
npm run modeles:index                            # git diff : seules les lignes de la pièce
npm run modeles:releve                           # idem ; AVANT l'empreinte (taille et usage de la fiche)
node <scratchpad>/ajout-empreinte.mjs BAT-0xx    # §15 ; jamais --ecrire
node <scratchpad>/ecarts-tous.mjs                # seuls les écarts connus (§13)
npx vitest run                                   # échecs connus seulement (§13)
```

- Triangles de la version allégée : construire `{ v: 1 }` (non affiché par `mesure.mjs` pour un lieu).
- Planches dans `captures/` : 6 vues (avant, arrière, gauche, droite, dessus, 3/4), gros plans, version
  allégée, référence / modèle. Nommer `navire-<piece>-*.png`.
- **Revue Evis-critique** (agent `evis-critique`, lecture seule) avant le commit ; corriger ce qu'il
  refuse ; 3 tours au plus ; noter le verdict dans la `FICHE.md` et le journal.

## 13. Pièges connus (vécus le 26/10/2026)

- **Empreintes** : `tests/fixtures/empreintes.json` échoue déjà (écarts connus non validés : PER-001 à
  PER-023, `ileDepart.obstacles` 44 à 49). **Jamais `npm run modeles:empreinte -- --ecrire`.** Ajouter les
  seules clés de la pièce (§15). Relancer `npm run modeles:releve` **avant** : la fiche porte `size` (taille
  relevée) et `usedIn` (usage dans les îles) ; une pose sur une île change `usedIn` (mettre à jour ce
  seul champ au commit de pose).
- **Numérotation** : `tests/models.test.js` exige des identifiants continus par catégorie. Sur cette
  lignée, MON-014 existe sans MON-012/013 : le test « numérotés sans trou » **échoue déjà**, accepté par
  l'utilisateur ; les BAT doivent rester continus.
- `tests/herbe-champ.test.js` (coût de la carte d'herbe) : échoue sous charge ; relancer seul.
- **Emprise des obstacles** (`mesure.mjs`, bâtiments et monuments) : ≥ 85 % des sommets entre 5 cm et
  1,8 m dans un cercle, débord ≤ 0,4 m. Les grandes faces n'ont de sommets qu'aux coins : un cercle au
  milieu d'une grande face « déborde ». Cercles sur les faces, deux rangées pour un mur épais, pièces
  plus courtes là où il faut des sommets.
- **Planchers** : `mesure.mjs` les contrôle sur leur ligne médiane (sommets à < 0,3 m, entre y − 0,5 et
  y + 0,2) ; rien d'ornemental sur cette ligne. En jeu, un plancher **est le sol partout dans son
  rectangle**, quelle que soit la hauteur du joueur (`IslandManager.heightAt`, `y > h − 0,4`) : sous le
  pont, le bord du plancher agit comme une falaise. Ne pas faire déborder un plancher hors de sa surface.
- `free()` du joueur (`src/entities/Player.js`) : sur un plancher, une marche n'est montée que si
  `dy < stepUp` (0,4 m) : marches de 0,33 m, pas plus.
- **Hasard consommé dans l'ordre** : toute retouche d'une partie déplace ce qui suit dans le même
  hasard ; un hasard par partie.
- `pan()` de MON-014 : évalué au milieu des blocs → surplombs ; corrigé par `haut.coupes`.
- Navigateur intégré : panneau masqué → rendu figé ; partie qui démarre en vol (`player.mode === 'air'`)
  → `game.airRide.finishRide()` ; un script `javascript_tool` de plus de 45 s est coupé : découper.
- Le vite du worktree partage le `node_modules` de la copie principale (cache `.vite` recalculé une fois).
- **Hooks de garde** : avant la première commande Bash d'une session, la création d'un fichier ou une
  commande jugée destructive, ils demandent d'énoncer les faits (demande, effet, retour arrière).
  `git commit --amend` refusé : faire un commit de correction.

- **Planchers sur une pente** (27/10, E2) : `mesure.mjs` compare la hauteur d'un plancher, en chaque
  échantillon, au plus haut sommet à moins de 0,3 m ; sur une pente de 0,9, le sommet de la crête voisine
  est à ± 0,27 m : échec assuré. D'où les ressauts francs du pavois. Un sommet décoratif à moins de
  0,3 m et moins de 0,2 m au-dessus d'un plancher le fait échouer (seuil de porte, pied de beaupré,
  coulure trop près de la crête là où la coque rentre).
- **Fuites et saut** (27/10, E2) : un plancher n'arrête que le centre du joueur (rayon 0,3 m, `Player.js:45`)
  et qu'à pied (montée < 0,4 m) ; en l'air, on franchit jusqu'à ≈ 1,23 m. Contrôles du scratchpad de la
  session E2 à recopier : `fuites.mjs` (remplissage du pont), `critique/fuites-saut.mjs 1.23`,
  `critique/penetration.mjs`, `critique/berceau.mjs`.
- **Panneau du navigateur masqué** (27/10, E2) : `requestAnimationFrame` ne tourne plus et `planche()`
  ne rend rien ; dans la page, `window.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 16)`
  avant les captures (à refaire après chaque rechargement).

## 14. Journal du chantier (une ligne datée par session)

- 26/10/2026 : concept validé ; budget, emplacement de principe, découpage et plan rédigés (ce
  document : commit `d83e2b7`, puis renforcé pour un chantier en plusieurs sessions). Rien de construit.
- 27/10/2026 : E0 en cours. Branche `claude/forteresse-navire` créée depuis `26d1fe8` dans le worktree
  `ruine-alternative`. Emplacement mesuré (`site.mjs`) et tranché par l'utilisateur : option (b), centre
  (644, 316), rot 5,25 ; tour-moulin à −π/2 dans le plan. Image pleine taille demandée, pas encore
  déposée (l'aperçu 199 × 112 reste en place).
- 27/10/2026 : image pleine taille envoyée par l'utilisateur **dans le chat seulement** (aucun fichier
  sur le disque, introuvable dans le worktree, Téléchargements, Bureau, Documents) : elle confirme la
  lecture de §2 ; E0 reste ouvert pour le fichier. **E1 fait** : `navire-coque/forme.js` (copies
  vérifiées identiques à BAT-013 et MON-014, toile par défaut identique à la bannière de la nef, normales
  du loft, de la plaque et du hublot vers l'extérieur ; le hublot était retourné au premier jet, profil
  inversé). Contrôles : `modeles:index` et `modeles:releve` sans changement (le dossier n'a pas de fiche),
  empreintes : seuls les écarts connus (162, PER-001 à 023 et `ileDepart.obstacles`), `npx vitest run`
  305 / 307 (échecs connus : empreintes, numérotation MON). Pas de planche ni de revue evis-critique :
  E1 ne produit aucun modèle. Prochaine étape : E2, BAT-014 coque et berceau.
- 27/10/2026 : l'utilisateur dit avoir déposé l'image pleine taille, mais le fichier du worktree est
  toujours l'aperçu (199 × 112, 26/10 22:11) et aucune autre copie n'existe : **E0 reste ouvert**,
  `reference.png` de BAT-014 = l'aperçu. **E2 fait** : BAT-014 `navire-coque` (index.js, physique.js,
  FICHE.md, reference.png), type `navire_coque` (lieux.js, DIRZ), compte des types 61 → 62. Evis-critique,
  3 tours : 1er « à reprendre » (berceau en caisses lavande, pavois traversable, planches de 2,2 m),
  2e « à reprendre » (corps dans le pavois, saut par-dessus bord, coulures plates), 3e « à reprendre »
  pour le seul pied du beaupré, corrigé selon sa proposition (bitte) et vérifié en gros plan. Mesures :
  aucune règle en échec, 11 966 / 4 336 triangles, 74 planchers (pire 2,9 cm). Index et relevé : seules
  les lignes de BAT-014 ; empreinte ajoutée par `ajout-empreinte.mjs` (2 098 lignes ajoutées, aucune
  retirée), écarts : seulement les connus (162) ; `npx vitest run` 305 / 307 (échecs connus). Planches :
  `captures/navire-coque-{6vues,allege-6vues,reference-vs-modele,gros-plans,beaupre}.png`. Prochaine
  étape : E3, BAT-015 maison de pont (3 formes).

## 15. Scripts (à recopier dans le scratchpad de la session ; `R` = chemin du worktree + `/`)

`ajout-empreinte.mjs` — ajoute les seules clés d'une pièce, calculées sur une passe complète (mêmes
identifiants de contour qu'en test) :

```js
import fs from 'node:fs';
const R = '/Users/hugo/developer/Island test/.claude/worktrees/ruine-alternative/';
const { calculer, REFERENCE } = await import(R + 'scripts/modeles/empreinte.mjs');
const ID = process.argv[2];
const e = JSON.parse(JSON.stringify(await calculer()));
const ref = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
for (const k of ['fiches', 'modeles', 'physique']) {
  if (!e[k][ID]) continue; // physique : seulement pour les lieux
  const ordre = Object.keys(e[k]);
  const avant = ordre.slice(0, ordre.indexOf(ID)).reverse().find((x) => x in ref[k]);
  const neuf = {};
  if (!avant) neuf[ID] = e[k][ID];
  for (const [x, v] of Object.entries(ref[k])) {
    if (x === ID) continue;
    neuf[x] = v;
    if (x === avant) neuf[ID] = e[k][ID];
  }
  ref[k] = neuf;
}
fs.writeFileSync(REFERENCE, `${JSON.stringify(ref, null, 1)}\n`);
```

`ecarts-tous.mjs` — tous les écarts d'empreinte (la commande du projet s'arrête à 40) :

```js
import fs from 'node:fs';
const R = '/Users/hugo/developer/Island test/.claude/worktrees/ruine-alternative/';
const { calculer, REFERENCE } = await import(R + 'scripts/modeles/empreinte.mjs');
const e = JSON.parse(JSON.stringify(await calculer()));
const ref = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
const out = [];
(function ec(a, b, c) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a && !b) || (!a && b)) return out.push(c);
  if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) ec(a[k], b[k], c ? `${c}.${k}` : k); return; }
  if (a !== b) out.push(c);
})(ref, e, '');
console.log(out.length, 'écarts');
console.log([...new Set(out.map((c) => c.split('.').slice(0, 2).join('.')))].join(' '));
// attendu : modeles.PER-001 à PER-023 et ileDepart.obstacles, rien d'autre
```

`triangles.mjs` — triangles par ligne d'appel du constructeur (pour savoir où couper) :

```js
const R = '/Users/hugo/developer/Island test/.claude/worktrees/ruine-alternative/';
const { Builder } = await import(R + 'src/render/builder.js');
const comptes = new Map();
const add0 = Builder.prototype.add;
Builder.prototype.add = function (geo, ...rest) {
  const l = new Error().stack.split('\n').find((s) => s.includes('/<slug>/index.js'));
  const k = l ? l.match(/index\.js:(\d+)/)[1] : '?';
  comptes.set(k, (comptes.get(k) || 0) + (geo.index ? geo.index.count : geo.attributes.position.count) / 3);
  return add0.call(this, geo, ...rest);
};
const { constructeur } = await import(R + 'src/models/batiments/<slug>/index.js'); // nom réel
for (const v of [0, 1]) {
  comptes.clear();
  const g = constructeur({ v }).solid.build();
  console.log(`v${v}`, g.attributes.position.count / 3, [...comptes].sort((a, b) => b[1] - a[1]).slice(0, 15));
}
```

`site.mjs` — relief et zone d'un emplacement sur le plan réel (≈ 1,3 s) :

```js
const R = '/Users/hugo/developer/Island test/.claude/worktrees/ruine-alternative/';
const { ILE_BY_ID } = await import(R + 'src/world/islands/regions.js');
const { buildPlan } = await import(R + 'src/world/islands/gen/plan.js');
const p = buildPlan(ILE_BY_ID.get('grande-ile'));
const ZPL = p.zones.indexOf('plateau-vente');
const cell = (x, z) => Math.round((z + p.ext) / p.s) * p.n + Math.round((x + p.ext) / p.s);
// rectangle 64 × 18 m centré en (cx, cz), axe à l'angle rot : min, max de p.H, cases où p.ZI !== ZPL
```

Captures du catalogue (dans la page, via `javascript_tool`) : `const v = window.__catalogue.ouvrir(id,
params)`, `v.pipeline.setSize(900, 900)`, couper rotation, animation, grille ; placer `v.camera` à la
main (recopier `vue` et `compose` de `scripts/modeles/planche.js`, non exportées), `v.snapshot()`, puis
`fetch('/__capture?name=…', { method: 'POST', body: dataURL })` qui écrit dans `captures/`. Décalage du
modèle dans la vue : `v.items[0].holder.position`. Faire **une vue par appel** si le rendu est lent
(limite de 45 s par script).

## 16. Critères de réussite

- De loin (corniche, nef) : se lit comme un **navire de maisons échoué sur la butte**, point le plus
  haut du plateau ; de près : bordages, cuivre, mousse, maisons à colombages dans la DA des moulins.
- Chaque pièce : `mesure.mjs` sans règle en échec, budget propre tenu, allégé sous son plafond, revue
  Evis-critique « valide ».
- En jeu : on monte du sol au pont par l'escalier, on circule sur le pont (passages ≥ 2,2 m), rien ne se
  traverse, aucun obstacle sur les marches.
- Total posé ≤ 60 000 triangles de près ; tests verts hors échecs connus (§13).
