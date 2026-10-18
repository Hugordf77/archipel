---
name: modele-3d
description: Créer ou reprendre un modèle 3D de l'Archipel (créature, bâtiment, bateau, objet…) d'après une planche de référence ou une description, avec la méthode éprouvée sur la vache et le mouton - planche 6 vues, écarts chiffrés, construction, mesures, captures comparées, note du catalogue, commit. Déclencher dès que l'utilisateur demande de refaire, reprendre, améliorer, modéliser ou corriger un modèle du jeu (par son identifiant ANI-001, BAT-005… ou par son nom), de comparer un modèle à sa référence, ou d'en vérifier la physique.
---

# Créer ou reprendre un modèle de l'Archipel

Règles de DA : `docs/DA.md` (à relire, pas à recopier). Rangement : `docs/modeles-arborescence.md`.
Chaque modèle vit dans `src/models/<catégorie>/<modèle>/` : `index.js` (constructeur et fiche),
`physique.js` (obstacles, encombrement, planchers), `FICHE.md` (DA retenue, écarts, historique),
`reference.png` (planche, quand il y en a une).

## Outils

| Outil | Où | Ce qu'il fait |
| --- | --- | --- |
| `node scripts/modeles/mesure.mjs <id>` | terminal | pièces, triangles (fin, allégé) et budget, gabarit, couleurs, facettes, sabots, pattes / garrot, tête / corps, museau au repos et en broutant, tête attachée, jonctions patte-corps, physique / forme visible ; ✓ ou ✗ par règle |
| `planche.js` | page du catalogue | `const { planche } = await import('/scripts/modeles/planche.js'); await planche({ id, nom })` → `captures/<nom>-6vues.png`, `-broutage`, `-gros-plans`, `-reference-vs-modele` |
| `jeu.js` | page du jeu | `const { jeu } = await import('/scripts/modeles/jeu.js'); await jeu({ espece, nom })` (ou `{ x, z, nom }`) → `captures/<nom>-jeu-pres.png`, `-jeu-loin.png`, coût en triangles par espèce |
| aide « Collisions » | fiche du catalogue | colonnes d'obstacle, cercle d'encombrement, rubans de plancher, légende chiffrée |
| `npm run modeles:empreinte` | terminal | tout autre modèle doit garder son empreinte |

Serveur : `preview_start` avec la configuration `ile` (`.claude/launch.json`) ; le catalogue est sur
`/catalogue.html`, le jeu sur `/`.

## Méthode

1. **Planche 6 vues.** Lire la référence (`reference.png`, image fournie ou description). Faire la planche
   du modèle actuel (`planche.js`) et la mesurer (`mesure.mjs <id>`). Pour un modèle neuf : choisir son
   identifiant (prochain numéro libre de sa catégorie, `npm run catalogue`), créer son dossier, sa fiche
   (`export default fiche(…)`, `src/models/kit/fiches.js`), puis `npm run modeles:index` et
   `npm run modeles:fiches -- <catégorie>/<dossier>`. Ranger une planche fournie en `reference.png`.
2. **Écarts chiffrés.** Tableau référence / modèle : gabarit (L × H × P), proportions (tête / corps,
   pattes / garrot), position des yeux, couleurs (codes), pièces manquantes ; chaque écart en cm ou en %.
   Les écrire dans « Écarts restants » du `FICHE.md` avant de construire.
3. **Construction.** Dans le dossier du modèle seulement. Aides du `kit/` (`limb`, `skinMesh`, `leafGeo`,
   `curls`, `patch`, `collar`, `legs`, `eye`…) plutôt que des primitives ; contrat des pièces
   `{ geo, pivot, anim, side, phase, parent? }` ; physique dans `physique.js` (données pures, sans
   import). Changer une aide du `kit/` employée ailleurs, ou monter un budget : demander d'abord.
4. **Mesures.** `mesure.mjs <id>` jusqu'à ce que chaque règle passe (ou que l'écart soit voulu et
   écrit) ; `npm test` ; `npm run modeles:empreinte` : seul le modèle travaillé change. Puis, sur ce seul
   changement voulu : `npm run modeles:empreinte -- --ecrire` et `npm run modeles:releve` (taille).
5. **Captures comparées.** Planche « référence / modèle », broutage et gros plans (`planche.js`) ;
   capture en jeu de près et de loin (`jeu.js`) ; aide « Collisions » sur la fiche. Les lire : les
   défauts se voient sur l'image, pas dans le code.
6. **Note du catalogue.** `catalogue/notes.json` : statut (`valide` ou `a-retravailler`) et note datée
   (ce qui a changé, triangles fin / allégé, ce qui reste). `FICHE.md` : DA retenue, écarts restants,
   historique (une ligne datée).
7. **Commit.** Un commit par modèle, `git add` avec des chemins explicites (jamais `-A`, jamais les
   fichiers de la manette : `src/app/Game.js`, `src/core/Gamepad.js`, `src/entities/AirRide.js`,
   `src/ui/settingsPanel.js`, `tests/gamepad.test.js`), tests verts.

## Pièges connus

- **Canvas figé dans un onglet en arrière-plan** : mettre l'onglet devant (`tabs_select`) ; sinon le
  rendu est suspendu et la planche est vide ou périmée. `viewer.resize()` après un changement de taille
  (`planche.js` le fait).
- **Pose à remettre au repos (t = 0)** avant les vues fixes : `it.anim(0, 0)` (`planche.js` le fait).
- **Panneau replié, fenêtre de 0 × 0** : `planche.js` refuse une vue de moins de 200 px ; agrandir la
  fenêtre (`resize_window`) ou déplier le panneau.
- **Sauvegarde** : `__ile.game.skipSave = true` avant tout test en jeu, et de nouveau après chaque
  rechargement à chaud (`jeu.js` le fait à chaque appel) ; jamais de test sur le port du joueur.
- **Cycles d'import** : une fiche (`export default fiche(…)`) appelle ses fabriques au chargement ; un
  dossier ne doit pas importer `lieux.js`, `vegetation.js` ni le registre (`kit/tables.js` explique
  pourquoi). Le test « se chargent depuis chaque point d'entrée » le vérifie.
- **Encre** : un identifiant partagé (`part(…, id)`) seulement entre pièces soudées.

## Compte rendu attendu

Tableau avant / après (triangles fin et allégé, gabarit, mesures de `mesure.mjs`, coût en jeu), les
captures (`captures/…`), les écarts restants, le commit.
