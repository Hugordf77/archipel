# Chantiers de rendu — méthode

Workflow d'ingénierie du rendu de l'Archipel : une machine à états versionnée dans le journal de production,
des mesures automatiques, des portes de qualité bloquantes, une reprise après interruption et la trace de
chaque passe. Aucune amélioration n'est déclarée faite sans preuve chiffrée et visuelle. Identité à
préserver : automne, peinture Kuwahara, encre, toon, formes rondes ; ni gameplay, ni commandes, ni carte,
ni échelle changés.

## Outils (phase 0)

| Outil | Rôle | Commande |
| --- | --- | --- |
| `scripts/rendu/banc/cadrages.js` | 7 cadrages fixes et nommés : gameplay, face-soleil, contre-jour, foret, montagnes, nuit, personnage | — |
| `scripts/rendu/banc/banc.js` | Banc de captures déterministe (dans la page du jeu) | `const B = await import('/scripts/rendu/banc/banc.js'); await B.serie(__ile, 'r1-avant', { ab: ['ombres'] })` |
| `Pipeline.PASSES` (`src/render/Pipeline.js`) | Bascules A/B : chaque passe derrière `pipeline.settings.<réglage>` | option `ab` du banc |
| `scripts/rendu/banc/metriques.py` | Métriques d'image, SSIM par zone | `python3 scripts/rendu/banc/metriques.py compare r1-avant r1-apres` |
| `scripts/rendu/banc/planche.py` | Planche avant / après annotée | `python3 scripts/rendu/banc/planche.py r1-avant r1-apres` |
| `scripts/rendu/banc/budgets.js` + `scripts/rendu/gpu.js` | Coût GPU par poste, budgets | mesuré par le banc (option `gpu`, défaut) |
| `scripts/rendu/banc/chantier.mjs` | Chantier : ouvrir, faire avancer, calculer les portes | `node scripts/rendu/banc/chantier.mjs statut` |
| `/dashboard.html#rendu` | Chantiers, portes, courbes par mesure, séries et planches | serveur `ile` |

Garanties du banc : image de 1600 × 900 quelle que soit la fenêtre, qualité Haut, résolution adaptative
coupée ; attente du chargement réel (îles posées, plus de travail en vol, tuiles et herbe stables sur quatre
relevés) ; origine du monde lue dans le jeu (`__ile.U.uWorldOffset` ; la navigation et le joueur sont en
coordonnées absolues, la scène est décalée) ; joueur posé et sol mesuré par en dessous (jamais sur une île
céleste) ; heure, météo, vent, nuages et horloge des shaders figés ; capture rejetée si mer ou ciel seuls
(part du G-buffer d'identifiant non nul), herbe absente (identifiant du terrain, style 0), image plate ou
caméra sous le relief — la capture rejetée est gardée (`<cadrage>--rejet.png`), deux essais. GPU : trois
passes du banc synchrone, médiane par poste, dispersion consignée. Sorties : `captures/banc/<série>/`
(non versionné). Tests : `tests/rendu-banc.test.js` ; tests chronométrés à part : `npm run test:chronos`.
Le banc tourne plus de 45 s : le lancer sans l'attendre, puis lire `manifeste.json`.

Métriques (par cadrage) : percentiles de luminance p1 / p50 / p99, noir pur (canal max ≤ 3/255), blanc brûlé
(canal min ≥ 252/255), saturation moyenne et max (centile 99,5), contraste local (écart type sur 9 px),
hautes fréquences (part d'énergie au-delà de 0,25 de Nyquist : détail visible après la peinture),
ombre/soleil (paire A/B `ombres` : valeur médiane à l'ombre portée rapportée au soleil), SSIM global et par
zone (grille 4 × 4).

## Machine à états d'un chantier

```
BRIEF → AUDIT → HYPOTHESES → IMPLEMENTATION → MESURE → CRITIQUE ─┬→ VALIDATION → LIVRAISON
                                  ↑                               ├→ ITERATION (au plus 3) → IMPLEMENTATION
                                  └── ITERATION ← ESCALADE ←──────┘ (après 3 itérations ; l'utilisateur décide)
```

Chaque passage est un événement `rendu.etat` du journal (`production/journal.jsonl`, chaîne SHA-256),
vérifié par `src/production/rendu.js` avant écriture : état sauté, rôle non autorisé ou données incomplètes
= refus, rien d'écrit. Un chantier interrompu reprend à l'état relu dans le journal (`statut`).

| Entrée dans | Rôle | Données exigées |
| --- | --- | --- |
| AUDIT | qa-visuelle, technical-artist | série du banc, métriques, causes `fichier:ligne` |
| HYPOTHESES | technical-artist | hypothèses `{ id, texte, gain, cout }` classées par gain / coût |
| IMPLEMENTATION | technical-artist, evis | hypothèse retenue, fichiers, bascule `pipeline.settings.<passe>` |
| MESURE | qa-visuelle, ingenieur-performance | séries avant / après, comparaison, GPU, tests |
| CRITIQUE | directeur-artistique | sortie JSON de `rendu-critique`, verdicts des cinq portes |
| VALIDATION | orchestrateur, integrateur | toutes les portes passées |
| ITERATION / ESCALADE | orchestrateur | une porte en échec ; escalade après 3 itérations |
| LIVRAISON | integrateur | citation de la validation de l'utilisateur, commit |
| ABANDON | humain | — |

## Portes de qualité (bloquantes)

| Porte | Passe si |
| --- | --- |
| tests | échecs de `npm test` tous listés dans `production/echecs-connus.json` (chronos à part) |
| empreintes | seul le modèle du chantier change (`node scripts/modeles/empreinte.mjs`) |
| gpu | budgets par poste tenus (`budgets.js`), image ≤ 12 ms en Haut sur « gameplay » |
| metriques | noir pur ≤ 0,1 %, ombre/soleil dans [0,40 ; 0,60] (part d'ombre ≥ 2 %), saturation max ≤ 0,85 (seuil DA provisoire), gain sur le critère visé, SSIM ≥ 0,97 hors des cadrages visés, aucune capture rejetée |
| critique | notes ≥ 7/10 sur les critères touchés, aucun défaut « fort » |

Puis validation de l'utilisateur sur la planche avant le commit d'un chantier visible.

## Équipe (rôles stricts)

| Rôle | Qui | Sortie |
| --- | --- | --- |
| Directeur artistique critique | agent `rendu-critique` (lecture seule) | JSON : 10 notes, ≤ 3 défauts `fichier:ligne` |
| Technical artist rendu | session principale | shaders (`chunks.js`, `materials.js`, `post.js`, `sky.js`), pipeline |
| Evis | agent `evis` (skill `modele-3d`) | géométrie ; empreinte du seul modèle travaillé |
| Ingénieur performance | session principale | banc GPU, budgets, niveaux de détail |
| QA visuelle | session principale | banc de captures, métriques, régressions, artefacts |
| Intégrateur | agent `archipel-integrateur` | tests, empreintes, LIVRAISONS, graphe, commit par chantier |

## Sortie attendue à chaque chantier

Tableau des métriques avant / après, coût GPU, verdicts des portes, planche, défauts restants, et une seule
question à l'utilisateur : valider, itérer ou abandonner.

## Feuille de route

1. Suite au vert, existant commité (fait le 24/11/2026). 2. Outillage de la phase 0 (ce document).
3. Lumière globale (ombres douces à contact, occlusion ambiante d'écran légère, rebond). 4. Végétation.
5. Matières (terrain multi-échelle, roche, eau, personnage). 6. Atmosphère. 7. Performance et niveaux de détail.
