# Équipe d'agents — Archipel

Cette note décrit une organisation de travail, pas une hiérarchie ni une automatisation garantie par l'environnement. Les fichiers d'agents sont des consignes de rôles ; l'agent coordinateur qui conduit la tâche les appelle explicitement et transmet leurs livrables. Aucun agent ne s'auto-déclenche ni ne transmet automatiquement son résultat, sauf capacité confirmée par l'hôte.

## Équipe disponible

| Rôle | Définition | Responsabilité | Peut modifier |
| --- | --- | --- | --- |
| Coordinateur de tâche | Agent principal de la session, sans nouveau rôle spécialisé dans ce dépôt | Priorités, brief, périmètre, affectation, consolidation et décision de suite | Selon le mandat explicite de la tâche |
| Evis | `.claude/agents/evis.md` | Production et correction d'un modèle 3D selon `.claude/skills/modele-3d/SKILL.md` | Dossier du modèle demandé, selon sa consigne |
| Evis-critique | `.claude/agents/evis-critique.md` | Revue indépendante en lecture seule d'un modèle | Aucun fichier |
| Archipel-Calibrateur | `.claude/agents/archipel-calibrateur.md` | Correction ciblée de la génération/calibration d'une île existante | Sources ciblées sous `src/world/islands/`, tests directement concernés si nécessaires |
| Archipel-Critique | `.claude/agents/archipel-critique.md` | Revue indépendante en lecture seule d'une île ou d'une zone | Aucun fichier |
| Locomotion-Physique | `.claude/agents/locomotion-physique.md` | Physique déterministe du personnage à pied, ses trajectoires et son intégration au sol/collisions | Moteur et réglages de locomotion ; `Player.js` et navigation seulement avec mandat ciblé |
| Archipel-Intégrateur | `.claude/agents/archipel-integrateur.md` | Technical Artist du workflow de l’open world : intégration, contrôles techniques et rapport d’intégration d’une zone | `production/integration/`, tests d’intégration sous `tests/` |

Les rôles « coordinateur » et « responsable » décrivent l'affectation et la transmission pour une tâche. Ils n'affirment pas qu'un agent est techniquement subordonné à un autre. Les relations automatiques et l'accès effectif aux outils dépendent de l'hôte.

## Workflow modèle 3D

1. Le coordinateur formule l'identifiant, le défaut, le périmètre et les contrôles attendus.
2. Evis produit la correction et remet son compte rendu avec mesures avant/après et limites.
3. Les scripts et tests déterministes existants vérifient les invariants concernés ; ils restent la source de vérité pour les résultats mesurables.
4. Evis-critique est appelé si la silhouette, les proportions, couleurs, animation ou rendu ont changé, ou si un diagnostic indépendant est demandé. Il retourne un verdict en lecture seule.
5. Le coordinateur arbitre les constats, décide d'une itération ou clôt le travail.

## Workflow îles

1. Le coordinateur transmet à Archipel-Calibrateur une île ou une zone, un défaut observable, les contraintes préservées et les critères d'acceptation.
2. Archipel-Calibrateur inspecte les dépendances utiles, apporte une correction bornée et livre les fichiers ainsi que les contrôles exécutés.
3. Les tests et scripts déterministes du dépôt sont exécutés pour les contraintes couvertes.
4. Archipel-Critique examine les changements indépendamment si la génération, la composition ou le rendu a changé, ou à la demande de diagnostic. Il ne modifie rien.
5. Le coordinateur tranche les constats et la prochaine action.

Le dépôt ne définit pas encore de grille DA ni de seuils d'acceptation visuelle propres aux îles. Les reviewers doivent donc distinguer observations et critères objectifs ; le coordinateur peut consigner une grille validée ultérieurement, sans inventer une hiérarchie.


## Workflow physique du personnage

1. Le coordinateur transmet à Locomotion-Physique un scénario reproductible, le résultat attendu et le périmètre (moteur pur ou raccord au monde).
2. Locomotion-Physique localise la cause, ajoute un test déterministe et corrige uniquement le moteur/réglage concerné ; `Player.js` ou `navigation.js` requièrent un brief d'intégration explicite.
3. Les tests de locomotion sont lancés ; une modification du raccord réel déclenche aussi la suite complète.
4. Si la cause s'avère être la géométrie, l'animation ou le relief, l'agent documente les preuves et renvoie le travail au coordinateur pour routage vers Evis, Archipel-Calibrateur ou un responsable visuel. Aucun reviewer physique spécialisé n'est défini pour l'instant.
5. Le coordinateur examine les résultats, les limites de couverture et la suite.

## Outils déterministes

Les scripts, mesures et tests déjà présents doivent être lancés directement par l'agent conducteur de l'étape concernée. Ne crée pas un agent LLM distinct pour répéter des assertions déterministes. Un reviewer peut vérifier leur exécution et interprétation, mais ne les remplace pas.

## Format de transmission

Chaque transfert contient :

- brief et identifiants/périmètre exacts ;
- chemins pertinents et contraintes à préserver ;
- résultat attendu et contrôles à lancer ;
- compte rendu avec chemins touchés, résultats observés, limites et décision demandée.

N'inclus pas de contexte général sans lien avec la tâche. N'agrandis pas le périmètre en cas de dépendance partagée : arrête-toi et demande un mandat explicite au coordinateur.

## Workflow de l'open world (quatre rôles)

Le suivi de production des 19 zones (`docs/PRODUCTION.md`) associe quatre rôles fonctionnels aux agents ci-dessus, sans créer d'organisation parallèle (`production/agents.json`) :

| Rôle | Agent | Sections du checklist | Relecteur indépendant |
| --- | --- | --- | --- |
| World Designer | Archipel-Calibrateur | B (world design), F (narration) | Archipel-Critique |
| Asset Artist | Evis | D (assets) | Evis-critique |
| Gameplay Agent | Locomotion-Physique | C (gameplay) | Archipel-Critique |
| Technical Artist | Archipel-Intégrateur | E (intégration), G (QA) | Archipel-Critique |

L'orchestrateur est la couche déterministe de `src/production/orchestrateur.js` (et la commande `npm run prod`), pilotée par le coordinateur de session : il crée les tâches, gère dépendances et tentatives, et ne lance jamais une tâche aux prérequis manquants. Lancer un agent reste le geste du coordinateur, avec le brief produit par `npm run prod -- brief TASK-…`. Le journal `production/journal.jsonl` est la seule source de vérité des statuts ; le checklist, la carte de chantier et le dashboard en sont des vues.
