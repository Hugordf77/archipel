# Coupes — PER-026 (PER-002 à PER-007 retirées)

Dossier `src/models/personnage/coupes/` · Personnage · famille

| Identifiant | Nom | Statut | Référence du jeu | Taille (m) | Budget |
| --- | --- | --- | --- | --- | --- |
| PER-026 | Coupe : En pics | Validé | `hair:pics` | 0,77 × 1,67 × 0,78 | 9 000 (personnage) |
| PER-002 | Coupe : Bol court | Retiré | `hair:bol` | — | — |
| PER-003 | Coupe : Carré frangé | Retiré | `hair:carre` | — | — |
| PER-004 | Coupe : Queue haute | Retiré | `hair:queue` | — | — |
| PER-005 | Coupe : Deux macarons | Retiré | `hair:macarons` | — | — |
| PER-006 | Coupe : Boucles | Retiré | `hair:boucles` | — | — |
| PER-007 | Coupe : Longs lisses | Retiré | `hair:longs` | — | — |

Les coupes retirées gardent leur numéro (règle du registre) et montrent l'avatar d'aujourd'hui ; une
sauvegarde qui en porte une retombe sur la coupe en pics (`sanitizeAvatar`, `entities/character/avatar.js` ;
test `tests/cheveux.test.js`). Le miroir ne propose plus de coupe, seulement la couleur.

## DA retenue

- **Une seule coupe, en pics**, à la manière d'un garçon de film d'animation peint : volume rond (la
  calotte décentrée vers le haut et l'arrière) hérissé de 23 mèches en pics.
- **Mèches** : tubes effilés à bout rond (`limb` du kit, 7 côtés, 3 anneaux, bout en dôme), aplatis
  contre le crâne (épaisseur 0,5 de la largeur) dans un repère propre à chaque mèche : axe = sens du
  coiffé ramené dans le plan de la calotte puis décollé d'un angle, épaisseur = normale de la calotte.
  Pas d'angle vif : la pointe garde un rayon de 10 % de la largeur.
- **Groupes** :
  - frange (5 mèches couchées, larges dès le pied, enfoncées de 3 cm) : pointes en zigzag au-dessus
    des sourcils ; identifiant de contour à part (`ID.limb`) : elle recouvre la calotte, le trait
    d'encre l'en détache (DA, § 5) ;
  - côtés (4 mèches couchées, teinte foncée) : balayés vers l'arrière au-dessus des oreilles, qui
    restent visibles ;
  - couronne (7 pics dressés en feuille, pied fin enfoui à 4,5 cm, os `HAIR_A`) : vers le haut et
    l'arrière, 15 à 16 cm ;
  - arrière (7 mèches dressées, teinte foncée, os `HAIR_B`) : vers l'arrière puis la nuque.
- **Couleurs** : celle choisie au miroir (`HAIR_COLORS`), mèches de côté et d'arrière à 86 %.
- **Physique** : couronne et arrière montés sur ressort (os `HAIR_A`, `HAIR_B`), voir
  `entities/character/Character.js`.

Règles communes : `docs/DA.md`.

## Écarts restants

- La coupe grandit le personnage : 1,48 → 1,67 m hors tout (pics de la couronne) ; voulu, la
  silhouette en pics se lit à 15 m.
- 8 543 triangles pour l'avatar par défaut (+ 600 par rapport au carré), au plus 8 855 selon la tenue :
  sous le budget de 9 000, avec peu de marge pour un futur accessoire de tête.
- Pics de la même famille de couleur que la calotte : sous un ciel couvert, la couronne se lit surtout
  par sa silhouette.

## Historique

- 18/10/2026 : fiche créée.
- 21/10/2026 : six coupes remplacées par une seule coupe en pics (PER-026) ; PER-002 à PER-007 retirées ;
  anciennes sauvegardes migrées (`captures/pics-v6-*.png`).
