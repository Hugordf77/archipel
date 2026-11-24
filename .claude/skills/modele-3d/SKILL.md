---
name: modele-3d
description: Créer, corriger ou critiquer un modèle 3D de l'Archipel avec un contexte ciblé, des mesures structurées et des contrôles visuels sélectifs.
---

# Procédure de référence : modèles 3D de l'Archipel

Cette skill est la procédure complète pour Evis et Evis-critique. Pour chaque tâche, ne charge que les éléments requis ci-dessous. Les consignes des agents restent limitées à leur rôle, sécurité et format de réponse.

## 1. Constituer le contexte minimal

À partir de l'identifiant ou du nom, repère le chemin via le registre (`src/models/index.gen.js` ou la référence concrète trouvée dans `src/models/registry.js`). Pour un nouveau modèle, utilise uniquement la catégorie et le prochain identifiant nécessaires, après avoir vérifié les conventions concernées.

Lis seulement :

- l'identifiant, le chemin et les entrées de registre nécessaires pour retrouver le modèle ;
- son `FICHE.md` et son constructeur (`index.js` ou le fichier indiqué par le registre) ;
- son `physique.js` s'il existe ou si les mesures de physique l'exigent ;
- sa `reference.png` ou la référence fournie, si elle existe ;
- les sections de `docs/DA.md` applicables au défaut ou au type de modèle ;
- les mesures structurées pertinentes, et le diff/rapport du tour précédent pour une correction.

N'ouvre pas le README entier, le catalogue complet, les fiches d'autres modèles ni des captures sans lien avec la tâche. Lis une aide de `kit/`, une source de dépendance ou un autre modèle seulement si le code du modèle établit une dépendance concrète. Ne touche pas aux fichiers qui portent des changements locaux sans rapport avec le modèle travaillé.

## 2. Repérer les dépendances avec Graphify

Au début de la tâche, vérifie si `graphify-out/graph.json` existe à la racine du dépôt. Si Graphify et ce graphe sont disponibles, pars de l'identifiant du modèle et de son dossier, puis interroge le graphe pour repérer ses dépendances directes utiles, les aides partagées de `src/models/kit/` et les points d'entrée concernés. Utilise la commande documentée `graphify query "<question ciblée sur l'identifiant, le dossier et ses dépendances>"` depuis la racine du dépôt. Lis ensuite uniquement les sources ainsi repérées qui sont pertinentes, la fiche et le constructeur du modèle, sa référence si elle existe, et les règles de `docs/DA.md` qui s'appliquent. N'ouvre pas tout `src/models/`, le catalogue complet ni tout le README par défaut.

Le graphe sert à orienter la lecture : le code et les tests restent la source de vérité. Vérifie les relations utiles dans les imports et le code réels. Si Graphify ou son graphe est absent, si la requête ne trouve rien ou si le résultat paraît incomplet, reviens à la recherche textuelle ciblée et aux imports réels ; ne prétends pas avoir interrogé un graphe absent. Pour construire un graphe initial, Graphify documente `graphify extract <chemin-du-dépôt> --code-only` ; pour l'actualiser, `graphify update <chemin-du-dépôt>`. Ces commandes écrivent des sorties locales : n'effectue pas de construction ou mise à jour lourde dans le cadre d'une correction sans examiner d'abord son impact. `graphify-out/` contient notamment `graph.json`, `GRAPH_REPORT.md` et des fichiers auxiliaires/cache ; il est ignoré par Git.

## 3. Mesurer avant et cadrer le brief

Lance la commande structurée :

```sh
node scripts/modeles/mesure.mjs <id> --json
```

Dans le brief de travail ou la critique, identifie chaque ligne par son nom et relève sa valeur, son seuil/règle et `ok`. Présente toutes les règles en échec (`ok: false`) en premier, puis les valeurs utiles aux défauts examinés. Garde chaque échec visible, même s'il n'est pas lié au défaut du tour ; ne le masque pas, ne le réinterprète pas comme réussi et ne remplace pas les vérifications existantes. Une valeur sans verdict (`ok: null`) reste à vérifier si la règle s'applique.

Pour une comparaison avec une référence, mesure les proportions sur la même vue et chiffre les écarts seulement quand les repères sont comparables. Inscris les écarts restants pertinents dans le `FICHE.md`.

## 4. Construire ou corriger

Travaille dans le dossier du modèle : constructeur, `physique.js` si nécessaire et `FICHE.md`. Applique les règles artistiques pertinentes de `docs/DA.md` et utilise les aides existantes du `src/models/kit/` ainsi que le contrat des pièces `{ geo, pivot, anim, side, phase, parent? }` lorsque pertinents.

Aucun changement de budget de triangles ni d'aide partagée du `kit/` sans autorisation préalable. Pas de nouvelle dépendance npm. Ne modifie pas les îles, le gameplay ni le moteur de rendu dans le cadre d'une tâche de modèle. Garde les empreintes des autres modèles inchangées.
Le design reste original : ne reprends aucun asset ni personnage existant.

## 5. Vérifier les changements

Relance `node scripts/modeles/mesure.mjs <id> --json` après modification et compare les règles, valeurs et échecs avant/après. Conserve les tests et commandes générées déjà prévus par le projet lorsque le changement les concerne ; ne remplace ni ne supprime ces contrôles. Vérifie l'empreinte des modèles : les autres modèles doivent rester identiques. N'écris les empreintes qu'après un changement voulu, pour le seul modèle concerné (`npm run modeles:empreinte -- --ecrire`). Lance `npm run modeles:releve` après un changement voulu de modèle. Lance `npm test` pour le travail de modèle avant un commit.

Ajoute au Git par chemins explicites seulement ; jamais `git add -A` ni `git add .`. Préserve tout fichier ayant des changements locaux hors du modèle. Un commit par modèle lorsqu'un commit fait partie de la tâche.

## 6. Critique visuelle sélective

Fais une vérification visuelle si le changement peut affecter la silhouette, les proportions, les couleurs, l'animation ou le rendu en jeu. Une modification de donnée sans effet visuel (par exemple une valeur de collision seule) ne requiert pas de refaire les planches et captures : vérifie la donnée avec les contrôles pertinents et dis pourquoi la vue est omise.

Choisis uniquement la vue qui permet de juger le défaut traité : profil pour une proportion, vue de face ou trois-quarts pour une silhouette, gros plan pour une jonction ou une facette, pose animée pour le broutage, vue en jeu pour la lisibilité/rendu à distance, aide « Collisions » pour obstacle, encombrement ou plancher. Utilise la comparaison référence/modèle seulement si une référence existe et éclaire le défaut. Ne regénère pas systématiquement la planche 6 vues, les vues de broutage, les gros plans, les captures de jeu de près et de loin et les collisions à chaque tour.

Dans le catalogue, `planche.js` permet de produire les vues choisies ; dans le jeu, `jeu.js` produit les vues en jeu. Mets l'onglet au premier plan avant capture. Avant tout test en jeu, verrouille la sauvegarde (`__ile.game.skipSave = true`) ; répète après chaque rechargement à chaud. N'utilise jamais le port où joue le joueur.

Evis-critique classe les défauts par effet visible et retourne au plus trois défauts prioritaires par tour, avec cause `fichier:ligne` et correction proposée. Ne demande pas de captures pour des défauts sans effet visuel.

## 7. Livrer

Mets à jour le `FICHE.md` (DA retenue, écarts restants pertinents, une ligne d'historique datée) et `catalogue/notes.json` si la tâche de modèle l'exige (statut et note datée, changements, triangles, reste à faire). Livre le code, les mesures structurées avant/après, les vérifications pertinentes, les chemins des captures réellement produites et les contrôles visuels omis avec leur raison. Ne prétends pas avoir exécuté un contrôle non lancé.

## Outils et pièges

- `node scripts/modeles/mesure.mjs <id> --json` renvoie l'identifiant, le nom, la source et les lignes `{ nom, valeur, ok, regle }`.
- Les vues catalogue sont produites par `scripts/modeles/planche.js` ; les vues en jeu par `scripts/modeles/jeu.js` ; l'aide « Collisions » est disponible sur la fiche du catalogue.
- `npm run modeles:empreinte` contrôle les empreintes ; `npm run modeles:releve` actualise tailles et usage ; les commandes d'indexation/fiches servent aux ajouts ou renommages, pas à une correction ordinaire.
- Les cycles d'import sont documentés dans `src/models/kit/tables.js` ; consulte ce fichier uniquement si une dépendance/import du modèle est en cause.
- Les erreurs de capture déjà connues : onglet en arrière-plan (canvas suspendu), pose à remettre au repos, fenêtre trop petite. Ne régénère une vue que si elle est utile à l'évaluation.

## Format de critique

```md
## Verdict : valide | à reprendre

## Mesures
| Échec (tous les `ok: false`) ou mesure utile | Valeur | Seuil/règle | ok |

## Défauts prioritaires (0 à 3)
1. [fort | moyen | faible] défaut visible — cause : src/models/…:ligne — correction : …

## Vérification visuelle
- Vue consultée : … (ou aucune, car …)
```
