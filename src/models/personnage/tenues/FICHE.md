# Tenues — PER-008 à PER-019, PER-027

Dossier `src/models/personnage/tenues/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-008 | T-shirt | Validé | `piece:tshirt` | 0,56 × 1,66 × 0,53 | — |
| PER-009 | Pull rayé | Validé | `piece:pull` | 0,56 × 1,66 × 0,53 | — |
| PER-010 | Gilet | Validé | `piece:gilet` | 0,56 × 1,66 × 0,53 | — |
| PER-011 | Robe trapèze | Validé | `piece:robe` | 0,56 × 1,66 × 0,54 | — |
| PER-012 | Short | Validé | `piece:short` | 0,56 × 1,66 × 0,53 | — |
| PER-013 | Jupe | Validé | `piece:jupe` | 0,56 × 1,66 × 0,53 | — |
| PER-014 | Pantalon roulé | Validé | `piece:pantalon` | 0,56 × 1,66 × 0,53 | — |
| PER-015 | Salopette | Validé | `piece:salopette` | 0,56 × 1,66 × 0,53 | — |
| PER-016 | Baskets rondes | Validé | `piece:baskets` | 0,56 × 1,66 × 0,52 | — |
| PER-017 | Bottes de pluie | Validé | `piece:bottes` | 0,56 × 1,66 × 0,52 | — |
| PER-018 | Sandales | Validé | `piece:sandales` | 0,56 × 1,66 × 0,52 | — |
| PER-019 | Écharpe sauge | Validé | `piece:echarpe` | 0,68 × 1,68 × 0,62 | — |
| PER-027 | Bottes de marche | Validé | `piece:marche` | 0,56 × 1,66 × 0,53 | — |

## DA retenue

Géométrie dessinée avec le corps (`../corps/index.js` pour le gabarit aventurier, `../corps/chibi.js`
pour le chibi). Tenue de départ des planches de l'utilisateur (`docs/personnage-2/references/`), en
volumes modelés, rien de peint (ombres et plis viennent des volumes) :

- **Plis modelés** (21/11/2026, `plis` de `../corps/index.js`) : le tube du vêtement est déformé autour de son
  axe avant d'être posé (crêtes et creux de quelques millimètres, normales refaites, couture des profils
  tournés lissée), rien de peint : manche du pull (plis au creux du coude, fronces au-dessus du revers ;
  4 anneaux au lieu de 1), cuisse de la salopette et du pantalon (plis tirés en biais depuis l'entrejambe ;
  5 anneaux au lieu de 3), bas de jambe (creux du genou, pli doux devant, tassement au-dessus du revers ;
  7 anneaux au lieu de 4), robe et jupe (six godets qui s'ouvrent vers l'ourlet, sans triangle de plus).
  Coût : +360 triangles (tenue de départ 8 717, pire cas 8 901).
- **Physique** (21/11/2026) : vent du monde en m/s (brise de 4 m/s, `cheveux.js` `VENT`) ; pans de l'écharpe
  moins sensibles au vent (`PAN.vent` 4 → 2,2) et battement de 0,25 par m/s : ils flottent dans la brise sans
  être plaqués contre leurs butées ; robe et jupe sur la même physique que les cheveux (`JUPE`,
  `DYN_JUPE` : traîne à la course, se soulève au saut, bat au vent, balancement de la marche et roulis du
  bassin ajoutés, bornés) ; le chibi garde ses ressorts d'origine. Pas d'os pour le bas des jambes de
  pantalon : il ne descend que de 8 cm sous le genou (le mouvement ne se lirait pas, ou découvrirait la
  botte).
- **Pull rayé** (PER-009, couleur du haut, corail par défaut) : rayures horizontales de 5,5 cm en
  tranches du profil du torse (couleur, puis crème `#f6ead2`) ; manches bouffantes (épaule ronde de
  6,4 cm, manche 6,2 → 6,6 → 5,4 cm) en trois tranches raccordées anneau sur anneau (même axe, mêmes
  rayons : aucune fente), retroussées au coude : gros revers crème en bourrelet tourné (r 4 → 6,8 cm,
  3,6 cm de haut, os de l'avant-bras), avant-bras nu ; col rond crème (caché par l'écharpe).
- **Salopette** (PER-015, couleur du bas, denim par défaut) : bas du torse sous la ceinture et bassin en
  denim ; ceinture brique `#d4574a` (profil tourné à 0,80 m, 1,8 cm de relief) et deux boutons de laiton
  `#f2c14e` ; bavette bombée qui épouse le torse (0,797 → 0,987 m, ±0,10 m, 8 mm, coins ronds) et sa
  poche ; bretelles larges (3,4 cm, rubans plats qui suivent la surface du torse) du coin de la bavette
  par-dessus l'épaule, croisées dans le dos jusqu'à la ceinture ; gros boutons de laiton aux coins de la
  bavette (sphères 10 segments aplaties sur la surface) ; jambes larges (cuisse 9,2 cm, bourrelet doux à
  mi-cuisse et au genou), retroussées en gros revers plus clair (`mixHex(denim, crème, 0,35)`, r 6,6 →
  9,4 cm, de 0,236 à 0,30 m) au-dessus des bottes de marche (haut de tige visible à 0,228 m) ; pousse de
  trois feuilles (`leafGeo`, verts `PAL.leaf` / `leafDeep`) épinglée à la bretelle gauche (x < 0, côté
  `ARM_L`) sous la clavicule.
- **Bottes de marche** (PER-027, `marche`, brun cuir `#9c6644`, chaussures du look par défaut) : tige
  basse tournée sur l'os du tibia (jusqu'à 0,228 m, revers en bourrelet), pied au bout rond, semelle
  épaisse crème `#f3e6c8`, deux lacets en bourrelets sur le cou-de-pied ; 0,27 m de long.
- **Autres hauts** : t-shirt (épaule et manchon court, bras nu), gilet (manches longues, poignets crème,
  patte crème bombée et trois boutons), robe trapèze (manches bouffantes, jupe tournée de 0,85 à 0,42 m sur
  l'os `SKIRT`, évasée sous les poings).
- **Autres bas** : pantalon roulé (jambes de la salopette, sans bavette), short (manchon jusqu'à mi-cuisse,
  jambes nues), jupe (tournée de 0,81 à 0,50 m sur `SKIRT`).
- **Autres chaussures** : baskets (dessus, semelle claire, bouton de lacet), bottes de pluie (tige haute
  jusqu'à 0,318 m sur le tibia, revers, pied, semelle), sandales (pied nu, semelle, bride). Avec un
  pantalon, le revers de jambe descend à 0,15 m au-dessus des baskets et des sandales ; il est caché dans
  les bottes de pluie.
- **Écharpe** (PER-019, refaite le 03/11/2026 à la demande de l'utilisateur) : gros boudin de tissu
  noué lâche autour du cou (tore 8 × 16, rayon de section 4,6 cm au lieu de 2,6, centre à 1,066 m,
  penché de 0,15 rad vers l'avant : 1,3 cm au moins entre l'écharpe et le crâne, le bas du menton à
  1,112 m passe au-dessus), validé ; nœud rond sur le côté gauche du cou (sphère 10 × 6, même identifiant
  que le boudin, soudés) ; **deux pans qui flottent derrière l'épaule gauche** (étape 5, planche vue de
  dos) : rubans plats (`panFlottant` : section à 8 côtés, 1,3 cm d'épaisseur, de 0,35 w au sortir du nœud
  à w au bout, un peu bombés et vrillés, face plate tournée vers l'arrière), 30 et 23 cm de dessin, vers
  l'arrière, le dehors et un peu le bas ; bouts effilochés en deux pointes rondes séparées d'une encoche
  (pas de franges fines). Chacun sur son os à ressort (`SCARF`, `SCARF_B`, pivots dans le nœud ; ressort
  `PAN` de `cheveux.js`, même physique que les pics, poussé par l'accélération du torse et le vent
  ressenti, `DYN_PANS`) : ils traînent derrière à la course (≈ 0,2 à 0,3 rad de plus, en plus de la
  penchée du buste), flottent au saut (levés en arrière et en dehors jusqu'aux butées), restent calmes au
  repos et quand on tourne sur place ; butées : bascule −0,12 à +0,50 rad, roulis −0,10 à +0,45 rad,
  vrille ±0,06 rad, vérifiées hors du torse, du cou, du sac, de la tête et du bras au repos
  (`tests/echarpe-sac.test.js`). Identifiants : pan du haut `head`, pan du bas `body` (sur le sac `hair`,
  les manches `limb`, l'anneau `trim`). Vert sauge `#6aa898` (`CLOTH_COLORS` indice 10 ; couleur du
  look par défaut), pan du bas 7 % plus sombre. 536 triangles (anneau 256, nœud 100, pans 2 × 90 ; 688
  à l'étape 4).
- **Encre** : identifiants distincts pour chaque pièce qui en recouvre une autre (table `ENC` de
  `../corps/index.js`).
- Profils tournés dans le sens montant (un profil descendant a ses faces vers l'intérieur).

Sauvegarde : `marche` est dans `PIECES` (prix 0) et dans `STARTER` (les garde-robes existantes la
possèdent) ; sa couleur `#9c6644` est ajoutée à la fin de `SHOE_COLORS` (indice 7, les indices existants
ne bougent pas). Une sauvegarde qui porte des baskets les garde ; les baskets restent dans `STARTER` (hors
de la boutique).

Règles communes : `docs/DA.md`.

## Écarts restants

- Triangles (`mesure.mjs`, visage et épée compris, 03/11/2026, étape 5, sac au dos partout) : de 7 900
  (robe) à 8 720 (t-shirt, gilet) ; tenue de départ (écharpe et sac) 8 688 ; pire cas lunettes 8 872.
  Allègements sans perte visible : fonds cachés du torse et du bassin (un cône), boutons de laiton 10 × 3,
  pousse `leafGeo(8, 4)`, cuisses de la salopette à 3 anneaux, premier point de la tige des bottes (dans le
  pied), lacets à 4 côtés, bretelles de la salopette arrêtées sous le sac.
- La pousse est sur la bretelle côté `ARM_L` (x < 0) ; sur la planche, vue de face, elle est du même côté
  que le pan d'écharpe, qui la cacherait ici (pan à x +0,065) : à revoir avec l'écharpe (étape 5).
- Écharpe : tête baissée (salut, nage), le menton peut toucher le boudin ; le bras qui balance loin en
  arrière peut frôler les pans (seul le bras au repos est vérifié) ; les pans ne s'enroulent pas (pièces
  rigides sur un os chacune) ; au repos ils restent à demi levés (pose de la planche), pas pendus.
- T-shirt, gilet, robe, short, jupe, pantalon, baskets, bottes de pluie et sandales : portage fonctionnel
  (étape 6) ; avec la robe et la jupe, les poings écartés frôlent le tissu.
- Lacets : deux bourrelets, sans nœud ni lacets sur la tige ; pas de bout renforcé ni de passant.
- Vérifié sur un rendu logiciel hors jeu ; captures en jeu à faire.

## Historique

- 18/10/2026 : fiche créée.
- 02/11/2026 : tenues ajustées au gabarit héros (`captures/p2-e1-<tenue>-6vues.png`).
- 03/11/2026 : tenue des planches sur le gabarit aventurier (pull rayé, salopette, bottes de marche
  PER-027, pousse de feuilles) ; autres tenues portées au gabarit.
- 03/11/2026 : écharpe épaisse vert sauge (boudin noué, pans ronds effilochés) ; bras allégés.
- 03/11/2026 : étape 5 : deux pans plats qui flottent derrière l'épaule gauche, sur deux os à ressort
  (`SCARF`, `SCARF_B`) ; salopette et bottes allégées pour faire place au sac (voir
  `../accessoires/FICHE.md`) ; rendu logiciel hors jeu (repos, course, saut) ; captures en jeu à faire.
- 23/11/2026 : pull à manches longues (demande de l'utilisateur) : avant-bras couverts jusqu'au poignet, bande crème à mi-avant-bras, revers crème au poignet (plus de revers au coude) ; matières dessinées par le shader du joueur (`materials.js`, `CHARACTER` et `PLIS`) : tricot côtelé à mailles en V, jean en sergé délavé par plaques, cuir à grain et éraflures, joues rosées. Empreintes du personnage non écrites (déjà en écart).
