# Dirigeable — NAV-012

Dossier `src/models/bateaux/dirigeable/` · Bateaux et épaves · décor du ciel : vole vers 400 m au-dessus
de l'archipel (`src/world/ciel/Dirigeables.js`), vu surtout de loin. Aucune référence d'image.

| Identifiant | Nom | Statut | Référence du jeu | Taille (m, forme 0) | Budget |
| --- | --- | --- | --- | --- | --- |
| NAV-012 | Dirigeable | Créé le 02/11/2026, sans revue Evis-critique | `part:dirigeable` | 21,7 × 26,45 × 60,47 | 4 500 (bateaux) ; 4 420 de près, 2 160 allégé |

## DA retenue

- **Repère** : pied sous la nacelle, nez du ballon vers +Z. Type de lieu `dirigeable` (`src/models/lieux.js`),
  rangé en DIRZ.
- **Ballon** : 60 m de long, rayon 9 m, profil tourné (nez rond, poupe effilée), crème, deux bandes peintes
  (même identifiant de contour : pas de trait d'encre aux raccords), pointe de cuivre au nez.
- **Ailerons** : quatre ovales (ellipsoïdes aplatis), en croix à la poupe, enfoncés dans le ballon.
- **Nacelle** : coque de bois arrondie (15 m), cabine crème, toit à la couleur des bandes, quatre hublots
  par flanc ; six câbles du toit au ventre du ballon.
- **Moteurs** : deux nacelles de cuivre sur bras de bois, hélices à trois pales animées (tableau `anim`,
  axe Z, sens opposés).
- **Formes** : 0 bandes terracotta `#e39a78` et ailerons bleus `#7fb0cc` ; 1 l'inverse, ballon pêche.
- **Forme 2, ballon du navire volant** (élément 18 de `src/world/plateau/forteresse-navire.js`) : ballon seul de
  96 m, rayon 14 m, dans le repère du navire (origine sous la quille, proue vers +Z), ventre 6 m au-dessus des
  mâts (31,4 m) ; six câbles du ventre aux lisses (z −24, −6, 14 ; `NAVIRE` de `physique.js`). 1 360
  triangles, 692 allégé, pris sur le budget de la forteresse-navire (60 000, test du navire volant).
- **Version allégée** (`v: 1`) : ballon à 10 côtés et moins de rangées, ni hublots ni pointe, quatre câbles.

## Mesures (`node scripts/modeles/mesure.mjs NAV-012 --json`)

| Mesure | Valeur | Règle | ok |
| --- | --- | --- | --- |
| Triangles | 4 420 fin · budget 4 500 (allégé 2 160) | ≤ budget ; au-delà de 4 000, version allégée | oui |
| Gabarit | 21,7 × 26,45 × 60,47 m (registre identique) | ± 25 % du registre | oui |
| Couleurs | aucun noir | jamais de noir pur | oui |
| Physique / forme | aucun obstacle | passage voulu : il vole à 400 m | voulu |

## Écarts restants

- Pas de revue Evis-critique ni de planche 6 vues ; contrôle en jeu de loin seulement.
- Version fine à 4 420 triangles : au-delà de 4 000, la version allégée est vue au-delà de 500 m.

## Historique

- 02/11/2026 : création (demande de l'utilisateur : un dirigeable en plus du navire volant, très haut).
- 02/11/2026 : forme 2, ballon du navire volant (demande de l'utilisateur : « rajoute le ballon dirigeable » au navire).
