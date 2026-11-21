# Corps et visage — PER-001

Dossier `src/models/personnage/corps/` · Personnage · modèle vedette

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-001 | Corps et visage | Validé | `avatar` | 0,56 × 1,66 × 0,53 (coiffé) | 9 000 (personnage) |

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
- **Visage peint** sur une calotte posée sur l'os de la tête (`entities/character/face.js`, atlas
  1024 × 1024 de 4 × 4 cases : yeux en haut, bouches en bas, superposés par le shader).
- **Yeux à la manière des films d'animation peints** (21/10/2026) : petits, à l'emprise de l'ancien œil
  d'encre réduite de 8 % (`SIZE` 0,92 : le blanc se lit comme une partie de l'œil) ; blanc crème
  `#fdf8f0` ; iris marron (anneau `#5c3a2b`, cœur `#8a5a3c`) de 44 % de la largeur de l'œil, allongé
  comme l'œil, placé haut sous la paupière (un liseré de blanc sur les côtés, un croissant dessous) ;
  pupille d'encre `#3d3049`, un reflet blanc ; trait de cils épais en haut (11 → 13 mm), contour fin
  ailleurs, ombre douce de la paupière. Trois formes au choix du joueur (ovales, ronds, en amande).
- Expressions : paupière baissée (endormi, concentré, effort) = l'iris descend pour qu'on en voie la
  moitié basse ; surprise = œil 12 % plus grand et iris à 82 % (plus de blanc) ; clignement et joie
  restent des traits.
- Bob : dôme calé sur la calotte de la coupe en pics (centre en z −0,085, échelle 1,2 × 0,74 × 1,24),
  ruban suivi ; plus rien ne le traverse.

Règles communes : `docs/DA.md`.

## Écarts restants

- Triangles (`mesure.mjs`, visage 440 et épée 160 compris, étape 5) : 8 688 par défaut, écharpe et sac
  portés (géométrie 8 088 : tête, oreilles et cheveux 3 360 ; torse, salopette et cou 1 728 avec le sac,
  1 824 sans, au lieu de 2 004 ; écharpe 536 ; sac 380 ; bras 860 ; jambes et bottes 1 416 au lieu de
  1 548) ; pire cas : lunettes 8 872 ; budget 9 000.
- Gabarit du registre relevé le 03/11/2026 (coupe volumineuse) : 0,68 × 1,68 × 0,62 m.
- Bras à 10 côtés : facettes discrètes de près sur la manche (12 côtés avant).
- L'épée de dos est posée sur le sac quand il est porté (`GABARIT.epeeSac`, `../accessoires/FICHE.md`).
- Pas de version allégée (DA § 8), comme avant.
- Contrôle visuel fait sur un rendu logiciel hors jeu (z-buffer, encre aux changements d'identifiant) ;
  captures en jeu à faire (toon, peinture, encre réelle).

## Historique

- 18/10/2026 : fiche créée.
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
