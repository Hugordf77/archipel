# Corps et visage — PER-001

Dossier `src/models/personnage/corps/` · Personnage · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-001 | Corps et visage | Validé | `avatar` | 0,56 × 1,66 × 0,53 (coiffé) | 9 500 (avatar, 21/11/2026) |

## DA retenue

- **Gabarit aventurier** (personnage 2.0, d'après les planches de l'utilisateur,
  `docs/personnage-2/plan.md` § 4) : ≈ 4 têtes, 1,50 m au crâne (1,66 m coiffé), crâne ovale de manga
  (`../tete.js`, `FACE.forme`) centré à 1,30 m, menton à 1,083 m ; os de repos : `../gabarit.js`
  (`AVENTURIER.REST`), que la géométrie lit.
  - torse : profil tourné en colonne de 0,70 à 1,10 m (rayon 0,165, 16 côtés, profondeur × 0,84) ;
    bassin droit de 0,575 à 0,78 m (rayon 0,172, profondeur × 0,72) ;
  - cou court et doux (03/11/2026) : profil tourné du torse (r 0,068 à 1,02 m) jusque sous le menton
    (r 0,05), en retrait de 1,2 cm vers la nuque ; caché de face par le col ou l'écharpe, 1 à 2 cm
    visibles sous la nuque ;
  - bras (allégés le 03/11/2026 pour la coupe : 860 triangles au lieu de 1 156) : manche bouffante du
    pull en trois tranches `limb` de 10 côtés raccordées anneau sur anneau, l'épaule en dôme (bout rond de
    la tranche du haut, plus de sphère d'épaule), bout rond au coude ; revers crème au coude (10
    segments) ; avant-bras 10 côtés, 2 anneaux, bout rond ; mains rondes (sphère 10 × 6 de 6 cm) ;
    t-shirt et robe : épaule 10 × 7, tubes 10 côtés ;
  - jambes : cuisse 12 côtés (pantalon 8 → 9,2 → 8,5 cm), tibia 12 côtés ; jambes nues 10 côtés ;
  - oreilles : `oreilles()` de `../tete.js` (coordinateur, 03/11/2026 : grandes, rondes, à hauteur des
    yeux, décollées vers l'avant ; sphère 10 × 6, identifiant à part).
- **Surface du torse** (`surf`, `surTorse`) : point et normale du profil tourné à une hauteur et un angle
  donnés ; bavette, poche, bretelles, boutons et pousse s'y posent (aucun nombre de l'ancien gabarit).
- **Encre** : cinq identifiants réservés au joueur (`CHAR_IDS`, dont `trim` = 255/255 ajouté le
  03/11/2026 dans `core/globals.js`, que la composition traite comme les quatre autres) ; table `ENC` de
  `index.js` : aucune pièce de la tenue de départ ne touche une voisine du même identifiant, sauf le bout
  de la bretelle gauche dans la ceinture (au dos, sans le sac) et les bretelles du sac qui passent sous
  l'anneau de l'écharpe (`trim` tous deux). Avec le sac, les bretelles de la salopette prennent toutes deux
  `head` (leur croisement est caché) et le sac `hair`.
- **Os à ressort du dos** (03/11/2026, étape 5) : `SCARF` et `SCARF_B` (pans de l'écharpe) et `BAG` (sac),
  enfants du torse, dans `PARENT`, `B` et les `REST` de dessin des deux gabarits (chibi : `SCARF_B` et
  `BAG` sur le pivot du torse, sans effet sur ses poids de peau). Ressorts : `Character.js` (§ 3 de la
  dynamique), réglages `PAN` et `SAC` de `cheveux.js`, données `DYN_PANS` et `DYN_SAC` de `index.js` ;
  l'accélération est mesurée au torse (`Character.inertia`, la même mesure que les cheveux à la tête).
- Tenues et accessoires portés par l'aventurier (pull rayé, salopette et bottes de marche par défaut) : voir `../tenues/FICHE.md` et `../accessoires/FICHE.md`.
- **Gabarit chibi** (`./chibi.js`, `?gabarit=chibi`) : gardé tel quel pendant le chantier, fichier
  inchangé ; il ne connaît pas les bottes de marche : `buildAvatarGeometry` lui passe des baskets. Chibi d'environ 1,45 m, tête à 40 %
  de la hauteur.
- Un seul maillage à liaison rigide (une pièce = un os), animation procédurale
  (`entities/character/Character.js`).
- **Visage sculpté** (21/11/2026, `../tete.js`, `visageGeometry`) : la calotte du visage est une grille
  22 × 20 (880 triangles), plus serrée au centre, déformée comme le crâne puis bosselée le long de sa
  normale par des volumes doux (`VOLUMES`) : nez (arête et pointe ronde, larges d'au moins deux mailles de
  la grille ; pointe à ≈ 1,2 cm), arcades, front, pommettes, creux et lèvre du haut, pli et coins de la
  bouche, lèvre du bas, creux sous la lèvre, menton ; diagonales de la grille en miroir de part et d'autre
  du nez (symétrique). Le masque descend jusque sous le menton (`FACE.BOT` 1,15 rad, au lieu de 0,7).
  Normales (`redresse`) : relevées (pente de 0,3 vers le haut) en gardant leur direction gauche-droite
  (avant, toutes tournées vers l'avant : visage blanc de profil sous le reflet de bord) ; plein sur le
  visage, doux sur le crâne (part au plus 0,8, écart au plus 35°), éteint sous le menton (il garde son
  ombre) ; relief ajouté × 1,2, écart au plus 25° (pas de paliers serrés sur le nez). Même identifiant que
  le crâne : aucun trait d'encre sur le nez ni les lèvres. Visage moins poupon : joues 0,04, mâchoire 0,26,
  menton 0,04 (`../gabarit.js`, `FACE.forme`).
- **Crâne allégé** : `craneGeometry(22, 14, cache)` retire les triangles toujours cachés (sous le visage, à
  0,12 rad de ses bords, et dans la calotte des cheveux à sa taille sous le bob ou la masse de la nuque :
  `sousCalotte` de `../coupes/`) : −267 triangles.
- **Traits peints** sur le visage (`entities/character/face.js`, atlas de 4 × 5 cases : yeux en haut,
  bouches en bas, superposés par le shader, un seul appel de dessin) :
  - **yeux grands mais sobres** (21/11/2026, retours de l'utilisateur) : en amande, coin extérieur relevé,
    ovale 0,102 × 0,12 m du crâne de référence (planches : 0,112 × 0,152), ronds 0,108 × 0,112, en amande
    0,112 × 0,096 ; blanc crème `#fdf8f0`, iris brun en dégradé doux (`#4f3027` → `#c9925f`) dont le haut
    passe sous la paupière, pupille d'encre `#3d3049`, un seul reflet, trait de cils net en haut, rien en
    bas ;
  - sourcils fins et longs, en fuseau, 3 cm au-dessus de l'œil, réglés par expression ;
  - bouche sur le pli entre les lèvres (`MOUTH_Y` −0,176), sourire fin avec la lèvre du bas suggérée ;
    joues rosées plus petites et légères (0,3 ; 0,45 à la joie) ; plus de nez peint (il est modelé).
- Expressions (inchangées dans leur principe) : paupière baissée (endormi, concentré, effort) = l'iris
  descend ; surprise = œil 10 % plus grand et iris à 72 % ; clignement et joie restent des traits.
- Bob : dôme calé sur la calotte de la coupe en pics (centre en z −0,085, échelle 1,2 × 0,74 × 1,24),
  ruban suivi ; plus rien ne le traverse.

Règles communes : `docs/DA.md`.

## Écarts restants

- Triangles (`mesure.mjs`, 21/11/2026) : 9 137 par défaut, pire cas 9 321 (PER-022) ; budget propre des
  fiches de l'avatar 9 500 (`../fiche.js`, hausse accordée par l'utilisateur le 21/11/2026 ; catégorie
  personnage 9 000). Le matin 8 688 : mèches en lame −504, visage sculpté +440, crâne caché −267, plis des
  vêtements +360, lames en ogive +420.
- Yeux plus petits et moins hauts que sur la planche (demande de l'utilisateur : style moins poupon).
- Nez discret de face (style voulu) ; il se lit de 3/4 et de profil.
- Grimpe : la peau devant les yeux entre jusqu'à 7 à 8 cm dans l'écorce au pire moment du scénario de
  `tests/grimpe-pose.test.js` (mesure du 21/11/2026) : position de la tête, à faire vérifier
  (locomotion-physique).
- Le chibi partage le dessin des yeux de `face.js` (yeux en amande de l'aventurier).
- Gabarit du registre relevé le 03/11/2026 (coupe volumineuse) : 0,68 × 1,68 × 0,62 m.
- Bras à 10 côtés : facettes discrètes de près sur la manche (12 côtés avant).
- L'épée de dos est posée sur le sac quand il est porté (`GABARIT.epeeSac`, `../accessoires/FICHE.md`).
- Pas de version allégée (DA § 8), comme avant.
- Contrôle visuel fait sur un rendu logiciel hors jeu (z-buffer, encre aux changements d'identifiant) ;
  captures en jeu à faire (toon, peinture, encre réelle).

## Historique

- 18/10/2026 : fiche créée.
- 21/11/2026 : visage sculpté (nez, arcades, pommettes, lèvres, menton), visage moins poupon, crâne caché
  retiré ; yeux peints en amande, grands mais sobres ; sourcils fins ; bouche plus bas. Essai d'yeux en
  volume (globes, paupières sur os) retiré à la demande de l'utilisateur. Captures
  `captures/visage-avant-*`, `sculpt2-planche.png`, `visage-yeux4-planche-visage.png`.
- 03/11/2026 : personnage 2.0, étape 5 : os à ressort `SCARF_B` et `BAG` ; écharpe à deux pans flottants,
  sac au dos (emplacement « dos »), épée sur le sac ; torse, bassin, cuisses et bottes allégés
  (−312 triangles). Voir `../tenues/FICHE.md` et `../accessoires/FICHE.md`.
- 03/11/2026 : personnage 2.0, étape 4 : bras allégés (1 156 → 860 triangles) pour la coupe
  volumineuse ; oreilles de `tete.js` ; écharpe épaisse (voir `../tenues/FICHE.md`).
- 03/11/2026 : personnage 2.0, étape 2 : `buildAventurier` suit l'avatar et dessine la tenue des
  planches (pull rayé, salopette, bottes de marche PER-027) ; autres tenues portées au gabarit ; crâne
  ovale (`tete.js`, du coordinateur) et cou court sous le menton ; identifiant de contour `trim`.
- 02/11/2026 : corps du gabarit héros (personnage 2.0, étape 3.1) : torse en V, bassin, cou, membres en
  tubes ronds, mains, baskets ; tenues et accessoires ajustés ; oreilles rondes ; le chibi passe dans
  `chibi.js` sans changement (`captures/p2-e1-cat-*.png`, `captures/p2-e1-<tenue>-*.png`,
  `captures/p2-e1-chibi-*.png`).
- 21/10/2026 : yeux repris (blanc visible, iris marron, pupille, trait de cils), même taille apparente ; expressions vérifiées sur l'atlas et en jeu (`captures/atlas-yeux-v2.png`, `captures/yeux-v2-*.png`).
- 21/11/2026 : revue Evis-critique (à reprendre) : tache du nez (volumes plus fins que la grille, normales
  qui sautaient) et mâchoire en dents de scie corrigés (volumes du nez élargis, diagonales en miroir,
  relief borné, `redresse` doux sur le crâne et éteint sous le menton) ; plis des vêtements (voir
  `../tenues/FICHE.md`). Captures `captures/revue4-planche.png`, `captures/vent-plis-planche.png`.
