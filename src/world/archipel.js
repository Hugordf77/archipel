// L'archipel des souvenirs : seule source de vérité du monde ouvert. Un rectangle de 6 × 4 km tracé
// d'après la carte de référence de l'utilisateur (1 536 × 1 024 pixels, 4 m par pixel), l'île de
// départ en (0, 0), juste au sud de la côte aux villages de la Grande Île. Nord = −Z.
//
// Les îles sont décrites en pixels de la carte de référence (repère : PX, ORIGINE) puis converties en
// mètres : silhouette (côte, polygone) ou cercle, reliefs posés à la main (monts, chaînes, collines,
// plateaux, cuvettes, volcans, pitons, dunes), et zones nommées (étiquettes de la carte, de la minicarte
// et du bandeau d'entrée ; biome, part de forêt et arbres de chaque zone). Le relief détaillé, l'eau
// douce et les arbres sont produits par la chaîne de génération (islands/gen/forme.js, plan.js).
// Étape « bases » : ni lieux, ni villages, ni faune, ni ressources.
// Les identifiants sont stables : ils servent aux sauvegardes, aux récoltes et au journal.

export const PX = 4; // mètres par pixel de la carte de référence
export const ORIGINE = [770, 690]; // pixel de l'île de départ
const m = ([x, y]) => [(x - ORIGINE[0]) * PX, (y - ORIGINE[1]) * PX];

// ---------------------------------------------------------------------------
// Zones nommées. aire : ellipse [x, y, rx, ry] en pixels ; at : point de l'étiquette (centre de
// l'aire par défaut). Les zones d'une île découpée (ile) se partagent son relief : chaque case prend
// la zone la plus proche (distance normalisée à l'ellipse). foret : part des terres en forêt ;
// arbres : table d'arbres [espèce, densité pour 100 m²] (sinon celle du biome) ; palmiers : sur les
// plages ; fleurs : part des prés en champs de fleurs (couleur du sol seulement) ; mer : zone de mer
// (hauts-fonds, bancs), reconnue aussi en bateau ; collines : [hauteur (m), échelle (m)] des collines
// de la zone (sinon celles de son biome) ; decor : décor naturel en plus [espèce, densité], non récoltable.
const ZONES_PX = [
  // Grande Île
  { id: 'sommet-givre', name: 'Le Sommet givré', sous: 'Montagnes enneigées', ile: 'grande-ile', biome: 'pins', foret: 0.45, aire: [700, 225, 150, 80], at: [690, 200], collines: [26, 170], arbres: [['pin', 1.6], ['sapin_neige', 0.7], ['pin_givre', 0.3]], decor: [['rocher', 0.3], ['rocher_mousse', 0.25], ['arbuste', 0.3]] },
  { id: 'foret-des-souvenirs', name: 'La Forêt des souvenirs', sous: 'Arbres-mémoire', ile: 'grande-ile', biome: 'prairie', foret: 0.72, aire: [545, 380, 130, 170], collines: [24, 210], arbres: [['arbre_pompon', 1.6], ['erable', 0.7], ['saule', 0.15], ['arbre_cerisier', 0.1]], decor: [['fougere', 0.8], ['rocher_mousse', 0.2], ['souche', 0.08]] },
  { id: 'lac-celeste', name: 'Le Lac céleste', sous: 'Eau cristalline et îlots', ile: 'grande-ile', biome: 'prairie', foret: 0.3, aire: [990, 365, 95, 75], collines: [10, 220], arbres: [['saule', 0.6], ['arbre_pompon', 0.9], ['erable', 0.5]], decor: [['buisson_fleuri', 0.25], ['arbuste', 0.3], ['rocher_mousse', 0.1]] },
  { id: 'plateau-vente', name: 'Le Plateau venté', sous: 'Prairies et vent du large', ile: 'grande-ile', biome: 'prairie', foret: 0.07, fleurs: 0.12, aire: [925, 480, 105, 65], collines: [8, 140], arbres: [['arbre_pompon', 0.9], ['erable', 0.2]], decor: [['rocher', 0.15], ['lavande', 0.3], ['arbuste', 0.3]] },
  { id: 'cote-aux-villages', name: 'La Côte aux villages', sous: 'Plaine côtière', ile: 'grande-ile', biome: 'prairie', foret: 0.16, fleurs: 0.08, palmiers: true, aire: [745, 590, 200, 60], collines: [7, 160], arbres: [['arbre_pompon', 1.0], ['arbre_fruitier', 0.15], ['arbre_cerisier', 0.3]], decor: [['buisson_fleuri', 0.25], ['arbuste', 0.4]] },
  // nord
  { id: 'ruines-gelees', name: 'Les Ruines gelées', sous: 'Vestiges d’une ancienne civilisation', biome: 'glace', foret: 0.3, aire: [420, 125, 130, 120], arbres: [['sapin_neige', 1.4], ['pin_givre', 0.8]], decor: [['rocher', 0.3]] },
  { id: 'iles-celestes', name: 'Les Îles célestes', sous: 'Îles flottantes et cascades du ciel', biome: 'pins', foret: 0.5, mer: true, aire: [930, 80, 105, 70], at: [940, 156] },
  { id: 'volcan-endormi', name: 'Le Volcan endormi', sous: 'Cratère et coulées refroidies', biome: 'volcan', foret: 0.18, aire: [1180, 195, 175, 115] },
  // ouest
  { id: 'ile-du-silence', name: 'L’Île du silence', sous: 'Le phare oublié', biome: 'pins', foret: 0.25, aire: [150, 215, 60, 50] },
  { id: 'ile-aux-fleurs', name: 'L’Île aux fleurs', sous: 'Forêts enchantées', biome: 'prairie', foret: 0.35, fleurs: 0.5, aire: [215, 365, 130, 85], arbres: [['arbre_cerisier', 1.3], ['arbre_pompon', 0.6], ['arbre_fruitier', 0.12]], decor: [['buisson_fleuri', 0.6], ['lavande', 0.4]] },
  { id: 'archipel-des-tempetes', name: 'L’Archipel des tempêtes', sous: 'Îles changeantes, cieux en colère', biome: 'volcan', foret: 0.14, aire: [365, 485, 110, 85], arbres: [['pin', 0.8], ['bois_mort', 0.5]], decor: [['rocher', 0.4], ['souche', 0.1]] },
  { id: 'grottes-de-cristal', name: 'Les Grottes de cristal', sous: 'Réseaux sous la mer', biome: 'tropical', foret: 0.3, aire: [440, 625, 75, 50], at: [452, 588] },
  { id: 'village-englouti', name: 'Le Village englouti', sous: 'Une ville sous la mer', biome: 'atoll', foret: 0.3, mer: true, aire: [355, 720, 55, 38] },
  { id: 'cascades-sacrees', name: 'Les Cascades sacrées', sous: 'Chutes d’eau et sanctuaires', biome: 'tropical', foret: 0.5, aire: [170, 645, 120, 85], collines: [18, 140], decor: [['fougere', 0.6], ['rocher_mousse', 0.2]] },
  { id: 'ilots-secrets', name: 'Les Îlots secrets', sous: 'Petites îles cachées', biome: 'atoll', foret: 0.4, palmiers: true, aire: [215, 825, 110, 60] },
  // sud
  { id: 'grotte-lumineuse', name: 'La Grotte lumineuse', sous: 'Lacs luminescents', biome: 'tropical', foret: 0.45, aire: [632, 742, 85, 60], at: [626, 806] },
  { id: 'ile-brumeuse', name: 'L’Île brumeuse', sous: 'Brouillard et sous-bois', biome: 'pins', foret: 0.6, aire: [475, 885, 105, 60], arbres: [['pin', 1.8], ['saule', 0.3]], decor: [['fougere', 0.8], ['rocher_mousse', 0.3]] },
  { id: 'place-des-os', name: 'La Place des os', sous: 'Épaves et bancs de sable', biome: 'atoll', foret: 0.2, mer: true, aire: [785, 875, 90, 50], arbres: [['bois_mort', 0.6], ['palmier', 0.3]] },
  // est
  { id: 'ile-aux-lueurs', name: 'L’Île aux lueurs', sous: 'Forêts bioluminescentes', biome: 'champignons', foret: 0.65, aire: [1082, 818, 140, 90], decor: [['champi_petit', 0.6], ['fougere', 0.3]] },
  { id: 'falaises-oubliees', name: 'Les Falaises oubliées', sous: 'Grottes et ponts naturels', biome: 'tropical', foret: 0.25, aire: [1245, 500, 115, 60] },
  { id: 'ocean-sans-fin', name: 'L’Océan sans fin', sous: 'Récifs mystérieux', biome: 'atoll', foret: 0.3, palmiers: true, aire: [1370, 385, 135, 80] },
  { id: 'desert-ile-sechee', name: 'Le Désert de l’île séchée', sous: 'Sables, cendres et vestiges', ile: 'ile-sechee', biome: 'dunes', foret: 0.02, aire: [1240, 655, 110, 75], at: [1232, 700], arbres: [['palmier', 0.35], ['cactus', 0.4], ['cactus_fleur', 0.15]] },
  { id: 'royaume-des-ruines', name: 'Le Royaume des ruines', sous: 'Cité ensevelie', ile: 'ile-sechee', biome: 'dunes', foret: 0.04, aire: [1405, 650, 75, 75], at: [1412, 618], arbres: [['palmier', 0.3], ['bois_mort', 0.3]] },
  { id: 'ile-du-soleil-couchant', name: 'L’Île du soleil couchant', sous: 'Rochers et plages', biome: 'tropical', foret: 0.22, palmiers: true, aire: [1368, 815, 100, 55] },
];

// ---------------------------------------------------------------------------
// Îles. cote : polygone [x, y] en pixels (sens indifférent) ; cercle : [x, y, rayon] en pixels.
// base : hauteur des terres loin du bord (m) et largeur de la montée (m) ; plage (m) ; falaise : part
// des côtes en falaise (0 à 1) ; immerge : haut-fond sous la mer (seuls les reliefs en sortent).
// Reliefs (pixels pour les positions et les rayons, mètres pour les hauteurs) :
//   mont [x, y, r, h] · chaine pts [[x, y, h]…] + l (largeur) · colline [x, y, r, h]
//   plateau [x, y, rx, ry, h] + bord (m) · cuvette [x, y, r, profondeur] · volcan [x, y, r, h] + cratere (px)
//   piton [x, y, r, h] · dunes h + dir (rad)
const ILES_PX = [
  {
    id: 'grande-ile', name: 'La Grande Île', zone: 'foret-des-souvenirs', biome: 'prairie', base: { h: 16, larg: 320 }, plage: 20, falaise: 0.25,
    cote: [[705, 148], [760, 158], [820, 182], [880, 213], [925, 252], [962, 283], [1012, 298], [1060, 322], [1096, 360], [1106, 410], [1093, 455], [1071, 500], [1040, 535], [985, 556], [930, 566], [882, 590], [842, 624], [792, 646], [738, 650], [682, 640], [630, 628], [590, 600], [566, 560], [548, 516], [520, 480], [490, 440], [470, 395], [450, 346], [431, 300], [441, 262], [470, 232], [520, 218], [575, 204], [620, 180], [664, 158]],
    reliefs: [
      { t: 'mont', at: [700, 232, 105, 255] },
      { t: 'chaine', pts: [[612, 205, 150], [662, 222, 205], [700, 232, 250], [752, 220, 205], [812, 236, 150]], l: 26 },
      { t: 'chaine', pts: [[700, 240, 220], [672, 290, 140], [640, 340, 90]], l: 24 },
      { t: 'chaine', pts: [[715, 245, 210], [770, 300, 120], [835, 330, 70]], l: 26 },
      { t: 'colline', at: [520, 300, 55, 42] },
      { t: 'colline', at: [600, 420, 65, 50] },
      { t: 'colline', at: [505, 420, 45, 34] },
      { t: 'colline', at: [860, 380, 55, 40] },
      { t: 'plateau', at: [930, 478, 72, 44, 46], bord: 22 },
      { t: 'cuvette', at: [988, 368, 46, 42] },
      { t: 'colline', at: [978, 360, 17, 49] },
      { t: 'colline', at: [1004, 386, 12, 45] },
    ],
    // lieux posés à la main (repère de l'île, m ; gen/pois.js, poserLieux) : moulins-tours (BAT-013) sur
    // les sites PV-M1 à M3 du plan du Plateau venté (production/fiches/ZONE-ILE-VERTE.json), ailes face au
    // vent (rot = windAngle + π) ; nef effondrée (MON-014) sur la traversée du cercle au Moulin du Large,
    // entrée tournée vers le cercle. r : rayon aplani
    poses: [
      { t: 'moulin_tour', at: [422, 378], rot: 3.68, r: 7.5, nom: 'Moulin de la Corniche' },
      { t: 'moulin_tour', at: [380, 296], rot: 3.68, r: 7.5, nom: 'Moulin du Bord' },
      { t: 'moulin_tour', at: [868, 292], rot: 3.68, r: 7.5, nom: 'Moulin du Large' },
      { t: 'ruines_alternative', at: [756, 312], rot: 3.39, r: 9.5, nom: 'Nef effondrée' },
    ],
    // retouches de relief (repère de l'île, m ; gen/forme.js, terrasser) : montée de la corniche du Vent
    // (PV-T1 et palier PV-T2 du plan du Plateau venté, BRF-PV-02) le long de la face ouest de l'escarpement,
    // du pied P0 (monde 350, −936) à l'arrivée A (432, −728) sur le rebord ; points de
    // production/fiches/ZONE-ILE-VERTE.json#plan_plateau_vente.montee.points, arrondis par terrasser
    terrassements: [
      {
        t: 'corniche', nom: 'Montée de la corniche du Vent', zone: 'plateau-vente', demi: 6, talus: 8, palier: 6,
        h: [20.9, 66.3],
        pts: [[354, 228], [370, 230], [378, 242], [371, 256], [361, 272], [350, 284], [346, 300], [351, 316], [365, 332], [377, 344], [389, 360], [393, 376], [398, 392], [411, 408], [420, 424], [436, 436]],
      },
    ],
  },
  {
    id: 'ruines-gelees', name: 'Les Ruines gelées', zone: 'ruines-gelees', biome: 'glace', base: { h: 14, larg: 160 }, plage: 12, falaise: 0.45,
    cote: [[330, 60], [390, 30], [470, 35], [520, 70], [530, 130], [500, 180], [440, 200], [380, 190], [330, 150], [315, 100]],
    reliefs: [{ t: 'mont', at: [430, 95, 62, 85] }, { t: 'colline', at: [360, 150, 30, 26] }, { t: 'plateau', at: [470, 150, 32, 22, 30], bord: 10 }],
  },
  { id: 'ilot-givre', name: 'Îlot du givre', zone: 'ruines-gelees', biome: 'glace', ilot: true, cercle: [330, 238, 13], reliefs: [{ t: 'colline', at: [330, 238, 10, 14] }] },
  {
    id: 'ile-du-silence', name: 'L’Île du silence', zone: 'ile-du-silence', biome: 'pins', base: { h: 10, larg: 60 }, plage: 8, falaise: 0.7,
    cote: [[115, 195], [155, 180], [190, 198], [188, 232], [150, 248], [117, 232]],
    reliefs: [{ t: 'colline', at: [152, 212, 26, 34] }],
  },
  {
    id: 'ile-aux-fleurs', name: 'L’Île aux fleurs', zone: 'ile-aux-fleurs', biome: 'prairie', base: { h: 9, larg: 160 }, plage: 16, falaise: 0.1,
    cote: [[95, 320], [150, 290], [230, 295], [300, 305], [335, 340], [320, 390], [270, 425], [200, 435], [140, 420], [100, 385]],
    reliefs: [{ t: 'colline', at: [200, 350, 40, 28] }, { t: 'colline', at: [282, 380, 30, 20] }, { t: 'colline', at: [140, 380, 25, 14] }],
  },
  { id: 'ilot-des-pins', name: 'Îlot des pins', zone: 'ile-aux-fleurs', biome: 'pins', ilot: true, cercle: [285, 258, 11], reliefs: [{ t: 'colline', at: [285, 258, 9, 12] }] },
  {
    id: 'ile-des-tempetes', name: 'L’Île des tempêtes', zone: 'archipel-des-tempetes', biome: 'volcan', base: { h: 12, larg: 120 }, plage: 8, falaise: 0.6,
    cote: [[305, 440], [355, 415], [415, 425], [445, 460], [435, 510], [395, 540], [340, 535], [305, 500]],
    reliefs: [{ t: 'mont', at: [372, 470, 48, 80] }, { t: 'chaine', pts: [[330, 500, 40], [372, 470, 70], [420, 450, 45]], l: 14 }],
  },
  { id: 'recif-des-tempetes', name: 'Récif des tempêtes', zone: 'archipel-des-tempetes', biome: 'volcan', ilot: true, cercle: [272, 455, 13], reliefs: [{ t: 'piton', at: [272, 455, 8, 26] }] },
  { id: 'roc-des-tempetes', name: 'Roc des tempêtes', zone: 'archipel-des-tempetes', biome: 'volcan', ilot: true, cercle: [285, 560, 11], reliefs: [{ t: 'piton', at: [285, 560, 7, 20] }] },
  {
    id: 'ile-des-cristaux', name: 'L’Île des cristaux', zone: 'grottes-de-cristal', biome: 'tropical', base: { h: 8, larg: 80 }, plage: 8, falaise: 0.7,
    cote: [[405, 605], [445, 592], [480, 610], [478, 645], [445, 662], [410, 650]],
    reliefs: [{ t: 'plateau', at: [442, 626, 28, 22, 26], bord: 8 }],
  },
  { id: 'ilot-des-cristaux', name: 'Îlot des cristaux', zone: 'grottes-de-cristal', biome: 'tropical', ilot: true, cercle: [378, 652, 12], reliefs: [{ t: 'piton', at: [378, 652, 8, 22] }] },
  {
    id: 'haut-fond-englouti', name: 'Le Haut-fond englouti', zone: 'village-englouti', biome: 'atoll', immerge: true, base: { h: 2, larg: 80 },
    cote: [[315, 705], [350, 690], [395, 700], [405, 728], [380, 750], [335, 748], [310, 728]],
    reliefs: [{ t: 'colline', at: [345, 712, 7, 4.5] }, { t: 'colline', at: [388, 735, 5, 3.5] }],
  },
  {
    id: 'cascades-sacrees', name: 'Les Cascades sacrées', zone: 'cascades-sacrees', biome: 'tropical', base: { h: 12, larg: 120 }, plage: 12, falaise: 0.55,
    cote: [[80, 600], [140, 575], [210, 580], [265, 610], [275, 660], [240, 705], [170, 720], [110, 705], [70, 660]],
    reliefs: [{ t: 'plateau', at: [168, 642, 72, 46, 78], bord: 30 }, { t: 'mont', at: [150, 630, 34, 120] }, { t: 'colline', at: [215, 690, 22, 16] }],
  },
  { id: 'ilot-secret-1', name: 'Îlot secret', zone: 'ilots-secrets', biome: 'atoll', ilot: true, cercle: [172, 802, 22], reliefs: [{ t: 'colline', at: [172, 802, 14, 7] }] },
  { id: 'ilot-secret-2', name: 'Îlot secret', zone: 'ilots-secrets', biome: 'atoll', ilot: true, cercle: [215, 840, 15], reliefs: [{ t: 'colline', at: [215, 840, 10, 5] }] },
  { id: 'ilot-secret-3', name: 'Îlot secret', zone: 'ilots-secrets', biome: 'tropical', ilot: true, cercle: [262, 800, 18], reliefs: [{ t: 'colline', at: [262, 800, 12, 14] }] },
  { id: 'ilot-secret-4', name: 'Îlot secret', zone: 'ilots-secrets', biome: 'atoll', ilot: true, cercle: [295, 852, 12], reliefs: [{ t: 'colline', at: [295, 852, 8, 4] }] },
  { id: 'ilot-secret-5', name: 'Îlot secret', zone: 'ilots-secrets', biome: 'atoll', ilot: true, cercle: [138, 852, 14], reliefs: [{ t: 'colline', at: [138, 852, 9, 5] }] },
  {
    id: 'grotte-lumineuse', name: 'L’Île de la grotte lumineuse', zone: 'grotte-lumineuse', biome: 'tropical', base: { h: 10, larg: 100 }, plage: 14, falaise: 0.35,
    cote: [[565, 705], [615, 690], [670, 695], [705, 725], [695, 770], [650, 790], [595, 785], [560, 755]],
    reliefs: [{ t: 'mont', at: [628, 738, 40, 58] }, { t: 'colline', at: [675, 760, 18, 14] }],
  },
  {
    id: 'ile-brumeuse', name: 'L’Île brumeuse', zone: 'ile-brumeuse', biome: 'pins', base: { h: 12, larg: 120 }, plage: 12, falaise: 0.3,
    cote: [[390, 860], [450, 840], [520, 845], [565, 870], [555, 915], [500, 935], [430, 930], [385, 900]],
    reliefs: [{ t: 'colline', at: [470, 882, 42, 44] }, { t: 'colline', at: [530, 900, 22, 20] }],
  },
  { id: 'banc-des-os-1', name: 'Banc des os', zone: 'place-des-os', biome: 'atoll', ilot: true, base: { h: 1.5, larg: 30 }, plage: 30, cercle: [742, 860, 18] },
  { id: 'banc-des-os-2', name: 'Banc des os', zone: 'place-des-os', biome: 'atoll', ilot: true, base: { h: 1.5, larg: 30 }, plage: 30, cercle: [802, 892, 14] },
  { id: 'banc-des-os-3', name: 'Banc des os', zone: 'place-des-os', biome: 'atoll', ilot: true, base: { h: 1.2, larg: 20 }, plage: 20, cercle: [842, 858, 10] },
  {
    id: 'ile-aux-lueurs', name: 'L’Île aux lueurs', zone: 'ile-aux-lueurs', biome: 'champignons', base: { h: 10, larg: 160 }, plage: 14, falaise: 0.2,
    cote: [[965, 770], [1030, 740], [1110, 745], [1180, 770], [1210, 820], [1190, 870], [1120, 900], [1040, 895], [980, 860], [955, 815]],
    reliefs: [{ t: 'colline', at: [1080, 815, 50, 38] }, { t: 'colline', at: [1150, 840, 30, 28] }, { t: 'cuvette', at: [1030, 840, 14, 12] }],
  },
  {
    id: 'falaise-oubliee-1', name: 'La Grande Falaise', zone: 'falaises-oubliees', biome: 'tropical', base: { h: 8, larg: 60 }, plage: 6, falaise: 0.85,
    cote: [[1150, 475], [1200, 465], [1235, 490], [1225, 530], [1180, 540], [1148, 520]],
    reliefs: [{ t: 'plateau', at: [1190, 502, 34, 28, 52], bord: 8 }],
  },
  { id: 'falaise-oubliee-2', name: 'Falaise oubliée', zone: 'falaises-oubliees', biome: 'tropical', falaise: 0.9, cercle: [1282, 478, 27], reliefs: [{ t: 'plateau', at: [1282, 478, 22, 22, 44], bord: 6 }] },
  { id: 'falaise-oubliee-3', name: 'Falaise oubliée', zone: 'falaises-oubliees', biome: 'tropical', ilot: true, falaise: 0.9, cercle: [1332, 520, 17], reliefs: [{ t: 'piton', at: [1332, 520, 12, 38] }] },
  {
    id: 'ile-des-recifs', name: 'L’Île des récifs', zone: 'ocean-sans-fin', biome: 'atoll', base: { h: 6, larg: 60 }, plage: 18, falaise: 0.3,
    cote: [[1240, 350], [1275, 335], [1305, 350], [1305, 388], [1275, 402], [1242, 390]],
    reliefs: [{ t: 'plateau', at: [1272, 368, 18, 16, 22], bord: 8 }],
  },
  { id: 'recif-1', name: 'Récif', zone: 'ocean-sans-fin', biome: 'atoll', ilot: true, base: { h: 2, larg: 30 }, plage: 30, cercle: [1420, 332, 22] },
  { id: 'recif-2', name: 'Récif', zone: 'ocean-sans-fin', biome: 'atoll', ilot: true, base: { h: 2, larg: 30 }, plage: 30, cercle: [1462, 420, 17] },
  { id: 'recif-3', name: 'Récif', zone: 'ocean-sans-fin', biome: 'atoll', ilot: true, base: { h: 1.5, larg: 20 }, plage: 20, cercle: [1378, 432, 11] },
  {
    id: 'ile-sechee', name: 'L’Île séchée', zone: 'desert-ile-sechee', biome: 'dunes', base: { h: 8, larg: 200 }, plage: 26, falaise: 0.15,
    cote: [[1150, 612], [1210, 582], [1300, 578], [1390, 586], [1460, 616], [1470, 670], [1430, 720], [1350, 735], [1260, 725], [1190, 700], [1150, 660]],
    reliefs: [{ t: 'dunes', h: 6, dir: 0.5 }, { t: 'cuvette', at: [1232, 640, 16, 10] }, { t: 'plateau', at: [1398, 652, 50, 40, 42], bord: 14 }],
  },
  {
    id: 'ile-du-soleil-couchant', name: 'L’Île du soleil couchant', zone: 'ile-du-soleil-couchant', biome: 'tropical', base: { h: 7, larg: 90 }, plage: 22, falaise: 0.35,
    cote: [[1290, 790], [1345, 770], [1415, 775], [1455, 805], [1440, 845], [1375, 860], [1310, 850], [1280, 820]],
    reliefs: [{ t: 'colline', at: [1395, 810, 25, 26] }, { t: 'piton', at: [1440, 828, 7, 22] }],
  },
  {
    id: 'volcan-endormi', name: 'Le Volcan endormi', zone: 'volcan-endormi', biome: 'volcan', base: { h: 14, larg: 200 }, plage: 12, falaise: 0.35,
    cote: [[1015, 170], [1070, 120], [1150, 95], [1240, 100], [1310, 130], [1345, 185], [1330, 245], [1270, 285], [1180, 295], [1090, 280], [1030, 240]],
    reliefs: [{ t: 'volcan', at: [1180, 188, 118, 200], cratere: 22 }],
  },
  // îlots entre les îles
  { id: 'ilot-nord', name: 'Îlot', biome: 'pins', ilot: true, cercle: [562, 128, 11], reliefs: [{ t: 'colline', at: [562, 128, 8, 10] }] },
  { id: 'ilot-ouest', name: 'Îlot', biome: 'tropical', ilot: true, cercle: [58, 482, 14], reliefs: [{ t: 'colline', at: [58, 482, 10, 12] }] },
  { id: 'ilot-cascades', name: 'Îlot', biome: 'tropical', ilot: true, cercle: [62, 768, 11], reliefs: [{ t: 'piton', at: [62, 768, 7, 18] }] },
  { id: 'ilot-brumeux', name: 'Îlot', biome: 'pins', ilot: true, cercle: [598, 845, 11], reliefs: [{ t: 'colline', at: [598, 845, 8, 9] }] },
  { id: 'ilot-de-la-baleine', name: 'Îlot de la baleine', biome: 'tropical', ilot: true, cercle: [885, 735, 13], reliefs: [{ t: 'colline', at: [885, 735, 10, 11] }] },
  { id: 'ilot-du-plateau', name: 'Îlot', biome: 'prairie', ilot: true, cercle: [1005, 640, 14], reliefs: [{ t: 'colline', at: [1005, 640, 10, 10] }] },
  { id: 'ilot-est', name: 'Îlot', biome: 'atoll', ilot: true, cercle: [1495, 505, 12], reliefs: [{ t: 'colline', at: [1495, 505, 8, 6] }] },
  { id: 'ilot-sud-est', name: 'Îlot', biome: 'tropical', ilot: true, cercle: [1482, 905, 11], reliefs: [{ t: 'colline', at: [1482, 905, 8, 8] }] },
];

// ---------------------------------------------------------------------------
// Îles célestes : îles flottantes au-dessus de la mer, au nord de la Grande Île (gen ciel.js).
// at : [x, y, rayon] en pixels ; alt : hauteur du dessus (m) ; arbres [espèce, densité pour 100 m²] ;
// cascade : angle (rad) du bord d'où l'eau tombe dans le vide, sinon aucune.
const CIEL_PX = [
  { id: 'ciel-grand-jardin', name: 'Le Grand Jardin du ciel', at: [962, 96, 27], alt: 118, cascade: 2.4, arbres: [['arbre_cerisier', 1.2], ['arbre_pompon', 1.0], ['pin', 0.4]] },
  { id: 'ciel-pinede', name: 'La Pinède suspendue', at: [880, 66, 21], alt: 152, cascade: 0.6, arbres: [['pin', 2.0], ['sapin_neige', 0.5]] },
  { id: 'ciel-belvedere', name: 'Le Belvédère des nuées', at: [930, 30, 15], alt: 196, arbres: [['arbre_pompon', 0.9], ['erable', 0.5]] },
  { id: 'ciel-ilot-vert', name: 'L’Îlot des vents', at: [906, 128, 12], alt: 92, arbres: [['saule', 0.8], ['arbre_pompon', 0.6]] },
  { id: 'ciel-cime', name: 'La Cime céleste', at: [1010, 40, 13], alt: 228, cascade: 4.1, arbres: [['erable', 1.0], ['arbre_cerisier', 0.6]] },
];

// ---------------------------------------------------------------------------
// Conversion en mètres
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function zoneM(z) {
  const [cx, cz] = m(z.aire);
  const [lx, lz] = m(z.at || z.aire);
  const { aire, at, ...rest } = z;
  return { ...rest, x: cx, z: cz, rx: aire[2] * PX, rz: aire[3] * PX, lx, lz };
}
export const ZONES = ZONES_PX.map(zoneM);
export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));

// zone d'une île sans zone attitrée : la plus proche (distance normalisée à son aire)
function nearestZone(x, z) {
  let best = null;
  for (const zn of ZONES) {
    if (zn.ile) continue;
    const d = Math.hypot((x - zn.x) / zn.rx, (z - zn.z) / zn.rz);
    if (!best || d < best.d) best = { d, id: zn.id };
  }
  return best.id;
}

function relief(r, ox, oz) {
  const pos = (p) => [(p[0] - ORIGINE[0]) * PX - ox, (p[1] - ORIGINE[1]) * PX - oz];
  const out = { t: r.t };
  if (r.at) {
    const [x, z] = pos(r.at);
    Object.assign(out, { x, z });
    if (r.t === 'plateau') Object.assign(out, { rx: r.at[2] * PX, rz: r.at[3] * PX, h: r.at[4], bord: r.bord ?? 12 });
    else if (r.t === 'cuvette') Object.assign(out, { r: r.at[2] * PX, p: r.at[3] });
    else Object.assign(out, { r: r.at[2] * PX, h: r.at[3] });
    if (r.cratere) out.cratere = r.cratere * PX;
  }
  if (r.pts) {
    out.pts = r.pts.map((p) => [...pos(p), p[2]]);
    out.l = (r.l ?? 20) * PX;
  }
  if (r.t === 'dunes') Object.assign(out, { h: r.h, dir: r.dir ?? 0 });
  return out;
}

function ileM(isl) {
  let pts;
  if (isl.cote) pts = isl.cote.map(m);
  else {
    const [cx, cz] = m(isl.cercle);
    const rr = isl.cercle[2] * PX;
    pts = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
    }
  }
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const [x, z] of pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  }
  // centre sur un multiple de 4 m (grille de 4 m alignée sur le monde)
  const x = Math.round((x0 + x1) / 8) * 4;
  const z = Math.round((z0 + z1) / 8) * 4;
  const local = pts.map(([px, pz]) => [px - x, pz - z]);
  const r = Math.max(...local.map(([a, b]) => Math.hypot(a, b)));
  const rEq = Math.sqrt(((x1 - x0) * (z1 - z0)) / Math.PI);
  const sous = ZONES.filter((zn) => zn.ile === isl.id).map((zn) => ({ id: zn.id, x: zn.x - x, z: zn.z - z, rx: zn.rx, rz: zn.rz }));
  const zone = isl.zone || nearestZone(x, z);
  return {
    id: isl.id,
    name: isl.name,
    x,
    z,
    r,
    biome: isl.biome,
    seed: hash(isl.id),
    ilot: !!isl.ilot,
    zone,
    ...(isl.poses ? { poses: isl.poses } : {}),
    ...(isl.terrassements ? { terrassements: isl.terrassements } : {}),
    forme: {
      cote: local,
      rEq,
      base: { h: isl.base?.h ?? Math.min(10, 2 + rEq * 0.08), larg: isl.base?.larg ?? Math.max(20, rEq * 0.5) },
      plage: isl.plage ?? Math.min(14, 4 + rEq * 0.08),
      falaise: isl.falaise ?? 0.3,
      immerge: !!isl.immerge,
      reliefs: (isl.reliefs || []).map((rl) => relief(rl, x, z)),
      // zones de l'île (une seule si elle n'est pas découpée)
      zones: sous.length ? sous : [{ id: zone, x: 0, z: 0, rx: r, rz: r }],
    },
  };
}

export const ARCHIPEL = {
  // emprise (m) : la carte et le brouillard de découverte s'y arrêtent (6 × 4 km)
  bounds: { minX: -3000, maxX: 3000, minZ: -2800, maxZ: 1200 },
  // limite du monde, en mètres au-delà de l'emprise : brume du large dès 100 m avant le bord, courant
  // qui ramène à partir du bord, demi-tour à 250 m au-delà
  limit: { mist: 0, turn: 250 },
  home: { id: 'home', name: 'Ton île', x: 0, z: 0, r: 34 },
  islands: ILES_PX.map(ileM),
  // îles flottantes (rayon, hauteur du dessus en m ; graine tirée de l'identifiant)
  ciel: CIEL_PX.map((c) => {
    const [x, z] = m(c.at);
    return { id: c.id, name: c.name, zone: 'iles-celestes', x, z, r: c.at[2] * PX, alt: c.alt, cascade: c.cascade ?? null, arbres: c.arbres, seed: hash(c.id) };
  }),
  // éléments de la mer (algues, récifs, bouteilles, caisses…) : retirés à l'étape « bases »
  marine: [],
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Limite du monde au point (x, z). d : distance (m) au-delà du bord de l'emprise (négative dedans) ;
// mist 0 → 1 de 100 m avant le bord à 250 m au-delà (brume du large), pull 0 → 1 du bord à 250 m
// (courant qui ramène vers le centre), turn au-delà (demi-tour), et la direction du centre (ux, uz).
export function worldLimit(x, z) {
  const { mist, turn } = ARCHIPEL.limit;
  const B = ARCHIPEL.bounds;
  const cx = (B.minX + B.maxX) / 2;
  const cz = (B.minZ + B.maxZ) / 2;
  const d = Math.max(Math.abs(x - cx) - (B.maxX - B.minX) / 2, Math.abs(z - cz) - (B.maxZ - B.minZ) / 2);
  const len = Math.hypot(x - cx, z - cz);
  const inv = len > 1e-6 ? 1 / len : 0;
  return {
    d,
    mist: smooth(mist - 100, turn, d),
    pull: smooth(mist, turn, d),
    turn: d > turn,
    ux: (cx - x) * inv,
    uz: (cz - z) * inv,
  };
}
