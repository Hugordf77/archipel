# Un ciel vivant : état des lieux et plan (02/11/2026)

Worktree `.claude/worktrees/ciel`, branche `claude/ciel` (depuis `claude/ombres-lumiere`), serveur
configuration `ciel` (port 5178). En attente de validation : rien n'est construit.

## Base de travail

La branche `claude/ombres-lumiere` est identique à `v3-archipel` (`935b8de`) : le lot 1 lumière (`hourGrade`,
`scripts/rendu/`, `tests/lumiere.test.js`) n'existe que **non commité** dans le worktree `ombres-lumiere`.
Il est recopié ici, non commité lui aussi (`git diff` du worktree + fichiers non suivis). Avant toute livraison,
il faut commiter `ombres-lumiere`, puis rebaser `claude/ciel` dessus.

## État des lieux chiffré

Outils : `scripts/rendu/serie.js` (`LIEUX_CIEL`, `HEURES_CIEL`, `ciel(__ile, préfixe)`, nuages figés),
`python3 scripts/rendu/planche.py --ciel avant` (planche `captures/planche-ciel-avant.jpg`, relevés
`captures/stats-ciel-avant.json`). Cadrages : `ouest-coucher`, `est-lever`, `zenith-nuit`, `horizon-marin` ;
heures 5 h 30, 6 h 45, 18 h 15, 19 h 30, 20 h 30, 23 h, 2 h ; qualité medium, 1280 × 720.

| Constat | Mesure |
| --- | --- |
| Les étoiles sont **effacées par la peinture** | zénith à 23 h : 382 px d'étoiles sans peinture ; **0 px** en low, medium et high (luminance max 0,18 à 0,22 sur un fond à 0,16) |
| Masque « détail du ciel » (essai jetable en mémoire) | 61 px (low), 113 px (medium), 211 px (high) : les étoiles survivent, mais elles font 1 à 2 px et sont rares |
| Nuit plate | zénith à 23 h et à 2 h identiques ; contraste p5-p95 = 0,008 ; plus sombre `rgb(26, 34, 94)` : bleu profond, aucune alerte « noir » |
| Dégradé à deux teintes | horizon de la même couleur sur tout le tour ; à l'est au coucher, pas de ceinture de Vénus ni d'ombre de la Terre |
| Lune | position fixe (`MOON_SKY`), visible dès 18 h 15 (fondue par `uNight`) |
| Eau | reflète `mix(uSkyHorizon, uSkyTop, 0.25)`, sans azimut : pas de bande chaude du côté du soleil |
| Coût (medium, 1600 × 900, ciel plein cadre) | dôme ≈ 0,04 ms ; nuages ≈ 0,01 ms ; image complète ≈ 5,2 ms |

## Pistes chiffrées

Coûts estimés en medium (à remesurer à chaque étape avec `banc`). Budget total : +0,8 ms.

| # | Piste | Gain visuel | Coût GPU | Risque DA | Remarque |
| --- | --- | --- | --- | --- | --- |
| 0 | Masque « détail du ciel » : le dôme écrit l'intensité des détails fins dans `outNormal.a` (≤ 0,2, sous le seuil des contours), la composition recompose `tScene` net à ces pixels (comme `uCharId`) | prérequis des étoiles | ≈ 0,01 ms (un échantillon déjà lu) | faible | essai concluant |
| 1 | Dégradé à 5 bandes par clé (zénith, haut, milieu, horizon, côté soleil), azimut, ceinture de Vénus et ombre de la Terre, halos de Mie et de Rayleigh peints ; clés ajoutées autour du lever et du coucher | très fort | ≈ 0,03 ms | moyen (néon) : plafond de chroma testé | réglé avec `hourGrade` |
| 2 | Soleil aplati et orangé à l'horizon, halo qui s'étale ; lune avec halo pastel | fort | < 0,01 ms | faible | |
| 3 | Nuages du crépuscule : dessous orange et rose, liseré face au soleil, sommets violets ; nuit bleu ardoise éclairée par la lune | très fort | ≈ 0,02 ms | faible | **conflit avec `volcan`** (voir plus bas) |
| 4 | Voûte : petite carte précalculée au chargement (voie lactée, poussière, nébuleuses pastel, amas) + étoiles procédurales nettes (magnitudes, couleurs, tailles), densité lue dans la carte ; rotation lente autour d'un axe incliné | très fort | ≈ 0,08 ms ; précalcul unique < 20 ms ; cubemap 6 × 512² ≈ 6 Mo | moyen (photo NASA) : la voie lactée passe par la peinture (touches de gouache), seules les étoiles ponctuelles échappent | catalogue en JS pur, testable |
| 5 | Vie : scintillement par étoile (plus fort à l'horizon), étoiles filantes (une toutes les 20 à 60 s), apparition par magnitude à l'heure bleue, étoile du berger au crépuscule | fort | ≈ 0,01 ms | faible | |
| 6 | Survie à la peinture : 0 + étoiles les plus brillantes en petites touches à 4 branches | indispensable | inclus dans 0 et 4 | faible | captures low, medium, high |
| 7 | Reflets : l'eau échantillonne la même fonction de ciel (bandes, azimut), semis d'étoiles atténué | moyen | ≈ 0,05 ms | moyen (lisibilité de l'eau) | `water.js`, `rivers.js` |
| opt. | Aurore pastel rare | moyen | ≈ 0,05 ms si active | fort (kitsch) | à évaluer après 4 |
| opt. | Lucioles de ciel | faible | — | se confond avec les étoiles | déconseillé |

Total estimé : ≈ 0,2 à 0,3 ms en medium.

## Ordre proposé

- **Lot A, couchers** : 0, 1, 2 ; palettes enrichies (`daycycle.js`) ; tests « palettes sans noir » et
  « chroma plafonné ».
- **Lot B, nuit** : 4, 5, 6 ; test « carte étoilée déterministe pour une graine ».
- **Lot C, après fusion de `volcan`** : 3, 7.

Interrupteurs : famille `CIEL` dans `Pipeline.js` sur le modèle de `LUMIERE` (`bandes`, `voute`, `vie`,
`nuagesCrep`, `refletsCiel`). Low : `bandes` seul (gratuit) ; medium et high : tout.

## Lot B, nuit : construit (02/11/2026, non commité, en attente de validation en jeu)

- **Netteté** (`nettete`) : le dôme écrit l'intensité des étoiles, de l'étoile filante et de l'étoile du
  berger dans `outNormal.a` (× 0,2, id 0) ; `COMPOSITE_FRAG` (`post.js`) reprend `tScene` à ces pixels.
- **Voûte** (`voute`) : `src/world/env/voute.js` (`genererVoute`, pur et déterministe : plan galactique
  incliné de 42 à 50° dont l'arche passe au zénith vers 1 h, centre galactique, 5 nébuleuses pastel, 6 amas,
  pôle céleste au nord à 38°). `sky.js` : carte équirectangulaire 1024 × 512 calculée une fois
  (`preparerVoute`, appelée par `Game` via `sky.prepare`) ; trois couches d'étoiles procédurales (`etoiles`,
  grilles 120, 50 et 22) dont la densité suit la carte ; touches à 4 branches pour les plus brillantes ;
  rotation d'un tour par jour canonique (`tourneVoute`).
- **Vie** (`vie`) : scintillement par étoile, plus fort près de l'horizon ; apparition par éclat quand
  `uStars` monte ; étoiles filantes (une toutes les 20 à 60 s, `filantes`) ; étoile du berger
  (`etoileDuBerger`, `daycycle.js`).
- **Qualités** : `CIEL` dans `Pipeline.js` ; low sans `vie`.
- **Mesures** : étoiles au zénith à 23 h (pixels nettement plus clairs que leur voisinage) : 1 759 (low),
  2 843 (medium), 4 841 (high), contre 0 avant. Contraste p5-p95 : 0,008 → 0,362. Plancher inchangé
  (luminance min 0,146, `rgb(26, 34, 95)`), aucune alerte. Coût : +0,2 ms dans le G-buffer en medium, ciel
  plein cadre (1161 × 966).
- **Captures** : `captures/planche-ciel-avant-apres.jpg`, `captures/ciel-nuit-planche.jpg`,
  `captures/ciel-nuit-qualites.jpg`.
- **Tests** : `tests/voute.test.js` (déterminisme pour une graine, arche au zénith vers 1 h, couleurs
  pastel, nuit bleu profond, étoile du berger au crépuscule seulement).

## Conflits avec `volcan`

Le worktree `volcan` (non commité) réécrit les nuages de `sky.js` : grappes posées dans le monde à 380-470 m,
46 grappes, dérive `uCloudDrift` / `uCloudBox`, brume `uFogColor` / `uFogRange`, et retire `uSunGlow`,
`uSkyHorizon`, `uNight` et `uCloudRot` du shader des nuages. Les lots A et B ne touchent que le dôme
(`skyFrag`, `Sky` hors nuages) et `daycycle.js` : conflit peu probable. Le lot C modifierait `cloudFrag` :
conflit certain si on le fait avant la fusion de `volcan`.
