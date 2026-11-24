# Château du Sommet givré — MON-015

Dossier `src/models/monuments/chateau-sommet/` · Monuments · repère central du monde ouvert

| Id | Nom | Statut | Référence | Taille (L × H × P) | Budget |
| --- | --- | --- | --- | --- | --- |
| MON-015 | Château du Sommet givré | Brouillon (v1) | `part:chateau_fondations` | 93 × 201 × 95 m (dont 30 m de talus enterré) | 4 000 (catégorie) |

## DA retenue

- Très grand château fantastique, design original de l'Archipel, sans détail fin (version 1) : pierre crème et
  lavande, toits ardoise pastel, volumes ronds, faces planes chanfreinées.
- Enceinte octogonale de 76 m, courtines de 16 m, soubassement taluté de 30 m qui descend dans la pente ; huit
  tours rondes de 30 à 40 m à toit conique ; portail sous linteau entre les deux plus hautes, tourné vers le
  cœur de l'île.
- Socle surélevé et grand escalier ; logis à toit en pavillon, quatre tourelles de 44 m ; grande tour en trois
  étages, flèche à ~170 m au-dessus de la plate-forme.
- 2 144 triangles.

## Pose et rendu

- Pose de la Grande Île (`world/archipel.js`) au sommet du Sommet givré, monde (−264, −1852) : plate-forme
  aplanie de 46 m de rayon, surélevée de 45 m en butte (raccord de 60 m), `v: 1` (physique seule).
- Dessin permanent, visible de tout le monde : `world/env/chateau.js` (hauteur relue dans le plan de l'île).
- Massif du Sommet givré abaissé pour qu'on le voie du bas (mont 255 → 195 m, chaînes à 30–60 %).

## Écarts restants

- **Physique / forme** en échec (couverture 28 %, débord 18 m) : cour ouverte et talus enterré, voulus.
- Pas de version allégée ni d'intérieur ; aucun chemin d'accès au sommet ; pas de vérification en jeu de la
  butte après le dernier réglage (onglets fermés pendant la capture).

## Historique

- 24/11/2026 : fondations (enceinte, socles de tours, donjon, chantier), puis version 1 complète, haute, repère
  permanent ; massif abaissé.
