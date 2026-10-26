# Forteresse-navire du Plateau venté — mémoire de chantier

Document de reprise pour l'IA qui construira, étape par étape, l'énorme village-forteresse en forme de
navire échoué au milieu du Plateau venté. Rédigé le 26/10/2026 au soir, **avant tout chantier** : rien
n'est construit. Tout le code, les commentaires et les documents restent en français.

Lire ce fichier en entier avant d'agir, puis `CLAUDE.md`, `LIVRAISONS.md` (état courant),
`.claude/skills/modele-3d/SKILL.md` (version de la copie principale) et `docs/DA.md`.

---

## 1. Décisions de l'utilisateur (à ne pas rediscuter)

| Date | Décision |
| --- | --- |
| 26/10/2026 | Une forteresse **très imposante en plein milieu du Plateau venté**. |
| 26/10/2026 | Budget total accordé **≈ 60 000 triangles de près**, en **pièces modulaires**, chacune avec son budget propre (`budget: { triangles, lod }` dans sa fiche) et sa version allégée « Allégé (au loin) ». |
| 26/10/2026 | Emplacement : **plein centre du dôme** du plateau ; le cercle de pierres prévu par le plan devient le parvis. |
| 26/10/2026 | Après trois séries de concepts (pierre, puis DA des moulins), l'utilisateur a demandé « plus dans la DA du château ambulant », puis a retenu le **concept « Navire de maisons »** : « le bateau est excellent ». |
| 26/10/2026 | « Ne fais pas de chantier ce soir » : seul ce document est livré. |

Contrainte de `docs/DA.md` §1 : **design original**. On garde l'esprit (accumulation fantaisiste de
maisons, matériaux mêlés, cheminées qui fument, voiles), jamais la silhouette d'un film : **pas de
pattes, pas de visage, immobile**.

## 2. La référence

- `production/references/forteresse-navire.png` : aperçu de 199 × 112 px seulement (copie de l'image
  que l'utilisateur a validée).
- **Pleine taille (1 680 × 944) : dans les importations Canva de l'utilisateur**, média `MAHZJEbPC1w`
  (généré le 26/10/2026). Le connecteur Canva ne donne qu'une vignette signée : **demander à
  l'utilisateur d'exporter l'image en pleine taille** dans `production/references/forteresse-navire.png`
  avant de mesurer des proportions fines. Sans elle, travailler avec la lecture ci-dessous.
- Autres concepts (non retenus, non commités) : `production/references/concepts-forteresse/`.

### Lecture de l'image (gauche → droite ; mesures en px sur l'aperçu agrandi × 5, 995 × 560)

- **Coque** longue et ventrue, **proue à gauche**, poupe à droite. Longueur ≈ 730 px (x 140 → 870),
  hauteur de la quille au pont ≈ 190 px (y 245 → 435) : **hauteur / longueur ≈ 0,26**. Flancs bombés
  en **bordages de bois** brun chaud, avec de **grandes plaques ovales de cuivre/cuir rivetées** sur le
  flanc avant (deux plaques bombées superposées vers x 270–450), des hublots ronds, un **bord de pont
  débordant couvert de mousse et d'herbe** qui retombe sur la coque. La poupe est plus haute, plus
  sombre, chargée de galeries.
- **Beaupré** : une longue poutre sort de la proue vers la gauche (y ≈ 305), d'où pendent cordages,
  une échelle de corde et une petite nacelle jusqu'au sol.
- **Berceau** : la coque repose sur des **piliers de rocher et de pierre moussue** (y 400 → 470), au
  sommet d'une butte herbue ; hauteur ≈ 40–60 px (**≈ 0,06 à 0,08 de la longueur**).
- **Escalier de bois** en diagonale, du flanc (x ≈ 640, y ≈ 380) jusqu'au sol (x ≈ 690, y ≈ 440),
  vers un chemin de terre qui serpente sur la butte.
- **Pont** chargé de maisons (de gauche à droite) :
  1. **tourelle de proue** à coupole ocre-orangé et lanterne (x ≈ 165, la plus à gauche) ;
  2. **mât de misaine** (x ≈ 235) avec voile carrée crème marquée d'un emblème bleu ;
  3. **grande maison à pignon** à colombages, deux étages et combles, toit de mousse (x 330–470) ;
  4. **tour-moulin centrale**, la plus haute (sommet y ≈ 10) : étages empilés à colombages, tête de bois
     et **quatre ailes à toile** (x 480–610) ;
  5. **cheminées** fines qui fument blanc (x ≈ 240 et 640) ;
  6. **tourelle ronde** à toit conique bleu ardoise pointu (x ≈ 675) ;
  7. **grand mât** (x ≈ 760) avec grande voile carrée crème à emblème ;
  8. **maisons de poupe** en gradins, petits pignons à toits ardoise, **mâts d'artimon** avec petites voiles
     (x 800–870) ;
  9. **flammes bleu ardoise** au vent en haut des mâts et des tours.
- Hauteur hors tout (sol → haut des ailes) ≈ 460 px : **≈ 0,63 de la longueur**.
- Personnage sur le chemin (x ≈ 235, y ≈ 485) : très petit, l'échelle de l'image n'est pas celle du
  jeu ; on fixe l'échelle par les dimensions cibles ci-dessous.

## 3. Dimensions cibles (personnage de 1,1 m)

| Élément | Cible |
| --- | --- |
| Longueur de coque (proue → poupe, hors beaupré) | **64 m** (axe local Z, proue vers +Z) |
| Largeur au maître-bau | 18 m |
| Berceau de rocher | 3,5 à 4,5 m |
| Coque (quille → pont) | 16 m ; pont principal à **≈ 20 m** du sol |
| Maisons de pont | 2 à 3 étages, 7 à 11 m au-dessus du pont ; portes de 1,6 m |
| Tour-moulin centrale | sommet du corps ≈ 36 m du sol, moyeu ≈ 34 m, ailes de 8 m de rayon → **≈ 42 m hors tout** |
| Mâts | 14 à 18 m au-dessus du pont |
| Beaupré | 10 m hors de la proue |
| Passages | ≥ 2,2 m (rues du pont, portes de passage) ; marches ≤ 0,4 m ; paliers tous les 12 à 16 marches |

## 4. Découpage en pièces (proposition à suivre)

Chaque pièce est un **modèle du registre** (un dossier `src/models/batiments/<slug>/` avec `index.js`,
`physique.js`, `FICHE.md`, `reference.png`) et un **type de lieu** dans `src/models/lieux.js`. Les
identifiants libres sur la branche `claude/ruine-alternative` commencent à **BAT-014** (vérifier avec
`grep -rhoE "fiche\('BAT-[0-9]+" src/models | sort -u` : un autre worktree a peut-être pris des
numéros entre-temps ; les numéros doivent rester continus, voir §9).

| Id provisoire | Pièce (slug, type de lieu) | Contenu | Budget de près / allégé | Exemplaires |
| --- | --- | --- | --- | --- |
| BAT-014 | Coque et berceau (`navire-coque`, `navire_coque`) | Berceau de piliers rocheux moussus ; coque en couples (profil tourné ou extrudé par tranches) en bordages ; plaques de cuivre bombées rivetées ; hublots ; bord de pont moussu débordant ; beaupré, cordages ; plancher du pont | 12 000 / 5 000 | 1 |
| BAT-015 | Maison de pont (`navire-maison`, `navire_maison`) | Maison à colombages dans la DA de BAT-013 ; variantes v : 0 grande à pignon (2 étages + combles), 1 étroite haute, 2 basse à appentis ; oriel, balcon, cheminée qui fume (voir §6) ; toit de mousse ou d'ardoise | 3 500 / 1 500 | 5 |
| BAT-016 | Tourelle (`navire-tourelle`, `navire_tourelle`) | Tourelle ronde sur encorbellement ; variantes : toit conique ardoise pointu, coupole cuivre à lanterne (proue) | 2 000 / 800 | 4 |
| BAT-017 | Tour-moulin centrale (`navire-moulin`, `navire_moulin`) | Étages empilés en tronc de pyramide (reprendre `tronc`, `panDeBois` de BAT-013 en les adaptant), galerie, tête de bois, **quatre ailes à toile animées au vent** (`anim: [{ axis: 'z', wind: true }]`) | 9 000 / 4 000 | 1 |
| BAT-018 | Mât et voile (`navire-mat`, `navire_mat`) | Mât, vergue, voile carrée crème bombée à emblème bleu (toile en quadrillage avec `aSway`, comme la bannière de MON-014), flamme bleu ardoise ; variantes grand / petit | 1 500 / 600 | 3 |
| BAT-019 | Escaliers et passerelles (`navire-escalier`, `navire_escalier`) | Escalier de bois du sol au pont en volées et paliers, rambardes, passerelles entre maisons | 2 500 / 1 000 | 1 à 2 |

Total visé ≈ 12 000 + 5 × 3 500 + 4 × 2 000 + 9 000 + 3 × 1 500 + 2 × 2 500 = **56 000** (≤ 60 000
accordés). Si une pièce dépasse, rogner d'abord les répétitions (moins de maisons) avant de demander.

## 5. DA et palette

- **Base** : la DA de BAT-013 (`src/models/batiments/moulin-tour/`, lire sa `FICHE.md` et ses aides
  `prisme`, `oc`, `tronc`, `panDeBois`, `poteau`, `planche`, `toitMousse`). Jouet peint, volumes doux,
  aucune arête vive (`docs/DA.md` §2), aucun noir (§3).
- **Couleurs reprises** : enduit `#f4e4c6` ; poutres `#c07a45` / `#a5653b` ; bois de toit `#c98a52` ;
  porte `#ad6d40` ; vitre `#a9bfcc` ; toile `#f7ecc8` / `#f1e1b6` ; mousse `#a9bf6c` / `#bdd07f` ;
  bleu ardoise des toits et flammes `#3d6f90` / `#355f7c` ; pierre du berceau `#ddcfb8`, `#d4c8b1`,
  `#c9c3b6`, `#b9b7af` (palette de MON-014).
- **Couleurs nouvelles** (à valider sur la planche, saturation modérée, valeur claire) : bordages
  `#b8875a` / `#a3774f` ; cuivre `#cf8f5c` / `#b97a4c` ; rivets `#e2b07c` ; cordage `#e9d8b4` (`ROPE` de
  `kit/lieux.js`) ; fumée blanche `#f4f1ea`.
- Les toits de mousse et l'herbe du bord de pont sont la signature (comme les toits de BAT-013).

## 6. Assemblage en jeu : un lieu composé

La pose à la main existe déjà sur la branche (commit `e97d344`) :

- `src/world/archipel.js:87` : champ `poses` de la Grande Île (`{ t, at: [x, z], rot, r, nom }`, repère de
  l'île) ;
- `src/world/islands/gen/pois.js:689` : `poserLieux(P)` crée un lieu par pose, avec **un seul élément**
  `parts: [{ t, x, z, y, rot }]`, aplanit une plate-forme de rayon `r` (stamp, chute 6 m) ;
- `src/world/islands/gen/sections.js:88` : les sections de 512 m gardent les lieux dont l'ancrage est
  dans leur carré, éléments recentrés ;
- `src/world/islands/IslandManager.js:572` : `collectDecks` prend les planchers (`decks`) de tout
  élément qui en déclare (base `p.y` + `y0` du plancher, rotation `rotY`).

**À ajouter (étape 7)** : une pose composée. Proposition minimale : un champ optionnel `elements` dans
la pose, liste `{ t, dx, dz, dy = 0, rot = 0, v }` dans le repère du navire (proue vers +Z) ; dans
`poserLieux`, chaque élément devient une `part` : position tournée par la rotation de la pose
(attention à la convention DIRZ : `rotY = π/2 − rot` dans `lieux.js`), `y` = hauteur de la plate-forme
+ `dy`. Garder un seul lieu (un seul `id`, une seule entrée pour la découverte) et un seul aplanissement
(rayon ≈ 34 m, ou une suite de stamps le long de l'axe si le dôme n'est pas assez plat).
Mettre à jour `tests/zones/plateau-vente-poses.test.js` (aujourd'hui : exactement 3 moulins-tours et la
nef, un élément par lieu) et `tests/world.test.js` (accepte les seuls lieux posés).

Fumées : il n'y a pas de système de particules pour les lieux ; faire la fumée comme des boules de
nuage fixes légèrement animées (`anim`) ou la laisser pour plus tard (la noter dans la FICHE).

## 7. Emplacement (à vérifier en début de chantier)

- Centre du dôme, repère de l'île : **(644, 316)**, sol à 64,4 m, dénivelé de 6,1 m sur 35 m de rayon
  (mesuré le 26/10/2026 sur le plan réel, script en §10).
- Monde = repère de l'île + (−4, −1 164) : centre ≈ (640, −848).
- Voisins : cercle de pierres prévu (624, 278) à 43 m ; muret effondré prévu (612, 271) à 52 m ; menhir
  P3 (577, 317) à 67 m ; nef effondrée MON-014 posée en (756, 312) à 112 m ; Moulin du Large (868, 292).
  Route de la corniche (à venir) : rester à ≥ 25 m de `route_complete`
  (`production/fiches/ZONE-ILE-VERTE.json#plan_plateau_vente.montee`).
- **Orientation proposée** : proue face au vent, voiles gonflées : `rot = windAngle + π = 3,68 rad`
  (comme les moulins). Vérifier qu'avec 64 m de long l'avant ne mord pas le cercle de pierres : avec
  cette orientation le cercle tombe à ≈ 37 m en avant du centre et ≈ 22 m sur le côté, donc **contre la
  proue**. Deux solutions à mesurer puis à proposer à l'utilisateur en une question : décaler le centre
  vers (660, 340), ou tourner le navire de 90° (flanc au vent, escalier côté cercle = parvis).
- Rayon aplani : ≈ 34 m ; contrôler que tout reste dans la zone `plateau-vente` (P.ZI) et hors de l'eau.

## 8. Étapes (une étape = un commit, tests verts sauf échecs connus)

Avant tout : `__ile.game.skipSave = true` avant chaque téléportation ; serveur sur le **port 5175**
lancé en arrière-plan depuis le worktree (`npx vite --port 5175 --strictPort`) car `preview_start` lit
le `launch.json` de la copie principale (ne pas le modifier) ; ouvrir `http://127.0.0.1:5175/`.

0. **Préparer** : nouvelle branche `claude/forteresse-navire` depuis `claude/ruine-alternative`
   (même worktree `.claude/worktrees/ruine-alternative`, ou un nouveau worktree avec un lien
   `node_modules` vers celui de la copie principale). Demander l'image pleine taille (§2).
1. **Coque et berceau (BAT-014)** : volume d'abord (profil de coque, berceau, pont plat), mesure, planche
   6 vues + comparaison à la référence ; puis bordages, plaques de cuivre, hublots, bord moussu,
   beaupré. Physique : cercles le long du berceau et de la coque au sol ; plancher du pont (rectangle
   ou suite de planchers). Revue Evis-critique (3 tours au plus).
2. **Maison de pont (BAT-015)**, trois variantes, dans la DA de BAT-013. Revue.
3. **Tourelle (BAT-016)**, deux variantes. Revue.
4. **Tour-moulin centrale (BAT-017)**, ailes animées. Revue.
5. **Mât et voile (BAT-018)**. Revue.
6. **Escaliers et passerelles (BAT-019)** : volées de 12 à 16 marches de ≤ 0,4 m, paliers ; planchers de
   chaque volée (`decks` inclinés : `y0` ≠ `y1`) ; aucun obstacle sur les marches. Revue.
7. **Assemblage** : pose composée (§6), plan d'implantation des éléments sur le pont (tableau `elements`
   commenté dans `archipel.js` ou dans un fichier de plan dédié, par exemple
   `src/world/plateau/forteresse-navire.js`, importé par `archipel.js`). Vérifier le budget total en jeu
   (somme des triangles des éléments ≤ 60 000).
8. **Pose et vérification en jeu** : captures de près, de loin (depuis le Moulin de la Corniche et la
   nef), du pont ; marche réelle du sol au pont par l'escalier ; aucune marche invisible ; le personnage
   ne traverse ni la coque ni les maisons.
9. **Livraison** : `LIVRAISONS.md` (domaines Modèles 3D et Îles et monde, État courant), rapport
   `production/rapports/FORTERESSE-NAVIRE.json` (format de `docs/PRODUCTION.md`, sans écrire dans
   `production/journal.jsonl`), graphe (`graphify update src`, puis déplacer `src/graphify-out/*` dans
   `graphify-out/`).

Pour chaque pièce (procédure de la skill `modele-3d`) :

```sh
node scripts/modeles/mesure.mjs BAT-0xx --json      # aucune règle en échec
npm run modeles:index                               # seules les lignes de la pièce
npm run modeles:releve                              # seules les lignes de la pièce
npx vitest run                                      # voir §9 pour les échecs connus
```

## 9. Pièges connus (vécus le 26/10/2026)

- **Empreintes** : `tests/fixtures/empreintes.json` échoue déjà sur des écarts connus non validés
  (PER-001 à PER-023, `ileDepart.obstacles` 44 à 49). **Ne jamais lancer
  `npm run modeles:empreinte -- --ecrire`**. Ajouter seulement les clés de la pièce (fiches, modeles,
  physique) avec un petit script (§10). Relancer `npm run modeles:releve` **avant** de calculer
  l'empreinte : la fiche porte la taille relevée (`size`) et l'usage (`usedIn`) ; une pose sur une île
  change `usedIn`.
- **Numérotation** : `tests/models.test.js` exige des identifiants continus par catégorie. Sur
  `claude/ruine-alternative`, MON-014 existe sans MON-012/013 (non commités dans le worktree
  `plateau-vente-modeles`) : ce test échoue, accepté par l'utilisateur. Les BAT doivent rester continus
  (BAT-014, 015…).
- `tests/models.test.js` : le compte `TYPES_DE_LIEUX` (61 aujourd'hui) augmente d'un par nouveau type ;
  c'est la seule assertion à toucher.
- Coût de la carte d'herbe (`tests/herbe-champ.test.js`) : échoue sous charge, relancer seul.
- **Règle d'emprise des obstacles** (`mesure.mjs`, bâtiments et monuments) : ≥ 85 % de l'emprise
  (sommets entre 5 cm et 1,8 m) dans un cercle, débord ≤ 0,4 m. Les grandes faces planes n'ont de
  sommets qu'aux coins : un cercle au milieu d'une grande dalle « déborde ». Mettre les cercles sur les
  faces (deux rangées pour un mur épais) et des pièces plus courtes là où il faut des sommets.
- **Plancher** (`mesure.mjs`) : contrôlé sur la ligne médiane, sommets à moins de 0,3 m, de y − 0,5 à
  y + 0,2 ; aucun ornement (mousse, feuilles) sur la ligne médiane d'un plancher.
- `pan()` (MON-014, `forme.js`) : `haut()` évalué au milieu d'un bloc, d'où des blocs en surplomb aux
  marches des gradins ; corrigé par `haut.coupes` (joint forcé). Le hasard est consommé dans l'ordre :
  toute retouche déplace les pierres suivantes ; un hasard par partie (`mulberry32(graine + 977 k)`).
- Navigateur intégré : si le panneau est masqué, `requestAnimationFrame` s'arrête (captures figées) :
  afficher le panneau. Une partie chargée peut démarrer en vol (`game.player.mode === 'air'`) :
  `game.airRide.finishRide()`. `__ile.look()` cadre mal si la caméra passe sous le relief : relever
  `pitch` (0,3 à 0,35) ou changer de côté.
- Le serveur vite du worktree partage le `node_modules` de la copie principale : il recalcule une fois
  le cache `node_modules/.vite`.
- Garde-fou des hooks : avant la première commande Bash, la création d'un fichier ou une commande
  « destructive » (amend, reset…), il demande d'énoncer les faits (demande, effet, retour arrière). Le
  `git commit --amend` a été refusé : faire un commit de correction à la place.
- Ne jamais toucher à la copie principale (travail non commité de l'utilisateur), au worktree
  `plateau-vente-modeles`, ni à `v3-archipel`. `git add` par chemins explicites.

## 10. Scripts utiles (à recopier dans le scratchpad de la session)

Ajouter les seules clés d'une pièce aux empreintes, sur une passe complète (mêmes identifiants
qu'en test) :

```js
// node ajout-empreinte.mjs BAT-014
import fs from 'node:fs';
const R = '<chemin du worktree>/';
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

Lister **tous** les écarts d'empreinte (la commande du projet s'arrête à 40), regroupés :

```js
const out = [];
(function ec(a, b, c) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a && !b) || (!a && b)) return out.push(c);
  if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) ec(a[k], b[k], c ? `${c}.${k}` : k); return; }
  if (a !== b) out.push(c);
})(ref, e, '');
// attendu : modeles.PER-001 à PER-023 et ileDepart.obstacles.44 à 49, rien d'autre
```

Triangles par ligne d'appel du constructeur (pour savoir où couper) : remplacer temporairement
`Builder.prototype.add` dans un script Node, relever la ligne de `new Error().stack` qui pointe dans
`index.js`, additionner `position.count / 3`. Construire aussi `{ v: 1 }` : `mesure.mjs` ne donne pas
les triangles de la variante allégée d'un lieu.

Relief d'un site sur le plan réel :

```js
const { ILE_BY_ID } = await import(R + 'src/world/islands/regions.js');
const { buildPlan } = await import(R + 'src/world/islands/gen/plan.js');
const d = ILE_BY_ID.get('grande-ile');
const p = buildPlan(d); // ≈ 1,3 s
const cell = (x, z) => Math.round((z + p.ext) / p.s) * p.n + Math.round((x + p.ext) / p.s);
// p.H[cell(x, z)] : hauteur (grille de 4 m) ; p.ZI[...] === p.zones.indexOf('plateau-vente') : dans la zone
```

Captures du catalogue : `window.__catalogue.ouvrir(id, params)`, `v.pipeline.setSize(900, 900)`,
caméra placée à la main (voir `scripts/modeles/planche.js`, fonctions `vue` et `compose`, non
exportées : les recopier dans la page), puis `POST /__capture?name=…` qui écrit dans `captures/`. Le
décalage du modèle dans la vue est `v.items[0].holder.position`.

## 11. Critères de réussite

- Silhouette lisible de loin comme un **navire de maisons échoué sur la butte**, depuis la corniche et
  depuis la nef.
- Chaque pièce : `mesure.mjs` sans règle en échec, budget propre tenu, version allégée sous son
  plafond, revue Evis-critique « valide ».
- En jeu : on monte du sol au pont à pied par l'escalier, on circule sur le pont entre les maisons
  (passages ≥ 2,2 m), on ne traverse rien, aucun obstacle sur les marches.
- Total ≤ 60 000 triangles de près ; tests verts hors échecs connus (§9).
