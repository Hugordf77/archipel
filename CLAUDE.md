# Archipel — consignes pour l'IA

Jeu web 3D (Three.js r170, Vite, Vitest) : un archipel de neuf îles peintes, explorées à pied, en bateau
et en vol. Tout le code, les commentaires et les documents sont en français.

## Lire d'abord

1. `LIVRAISONS.md` : ce qui est livré (locomotion, épée, sauvegarde, fabrication, modèles, îles, manette,
   audio), où ça vit, comment le vérifier, et l'état courant (travail non commité, tests en échec).
2. `graphify-out/GRAPH_REPORT.md` : carte du code (communautés, nœuds centraux, liens inattendus).
   Pour une question d'architecture (« qu'est-ce qui appelle X ? », « comment Y rejoint Z ? »), interroger
   le graphe avant de parcourir les fichiers : `graphify query "<question>"`. Après de gros changements :
   `/graphify src --update`.
3. Selon la tâche : `README.md` (commandes, déplacements, sauvegarde, arborescence), `docs/DA.md` (règles
   des modèles 3D), `docs/modeles-arborescence.md`, `.claude/agents/equipe-production.md` (équipe
   d’agents : Evis, Evis-critique, archipel-calibrateur, archipel-critique, locomotion-physique,
   archipel-integrateur), `docs/PRODUCTION.md` (workflow des 19 zones : journal `production/journal.jsonl`,
   `npm run prod`, carte de chantier `/dashboard.html#chantier`).

## Règles essentielles

- `git add` avec des chemins explicites, jamais `-A` ni `.` ; tests verts (`npm test`) avant de commiter.
- Modèles 3D : skill `modele-3d` et `docs/DA.md` ; `npm run modeles:empreinte` ne doit changer que pour le
  modèle travaillé.
- Tests en jeu : `__ile.game.skipSave = true` avant toute téléportation et après chaque rechargement ;
  serveur des agents sur le port 5174 (configuration `ile`), jamais sur celui où joue l'utilisateur.
- Aucune nouvelle dépendance npm sans accord de l'utilisateur.
- À chaque livraison : mettre à jour `LIVRAISONS.md` (domaine et « État courant »), puis le graphe.
