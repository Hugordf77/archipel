# Planches du personnage à partir des captures de scripts/rendu/personnage.js.
# python3 scripts/rendu/planche_perso.py <préfixe> [<préfixe2>]
#   → captures/<préfixe>-planche-vues.png, -planche-visage.png, -planche-jeu.png
#   deux préfixes : chaque planche montre les deux séries l'une sous l'autre (avant / après),
#   rangées sous le nom du second préfixe.
import sys
from PIL import Image, ImageDraw, ImageFont

VUES = ['face', 'dos', 'profil-g', 'profil-d', '34-avant', '34-arriere']
EXPRESSIONS = ['neutre', 'clignement', 'joie', 'surpris', 'endormi', 'pensif', 'determine', 'effort']
DISTANCES = ['3m', '8m', '15m']
HEURES = ['8', '12', '18h5', '23']
PAPIER = (243, 230, 207)
ENCRE = (91, 74, 99)

try:
    POLICE = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
except OSError:
    POLICE = ImageFont.load_default()


def charge(nom, w, h, recadre=None):
    im = Image.open(f'captures/{nom}.png').convert('RGB')
    if recadre:
        # recadre = (part gardée en largeur, en hauteur), centrée
        kw, kh = recadre
        W, H = im.size
        cw, ch = int(W * kw), int(H * kh)
        im = im.crop(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2))
    return im.resize((w, h), Image.LANCZOS)


def grille(lignes, w, h, titre):
    # lignes : [(légende de ligne, [(légende, nom, recadre)])]
    cols = max(len(c) for _, c in lignes)
    marge = 150
    out = Image.new('RGB', (marge + cols * w, 50 + len(lignes) * (h + 34)), PAPIER)
    d = ImageDraw.Draw(out)
    d.text((14, 12), titre, fill=ENCRE, font=POLICE)
    for r, (lr, cellules) in enumerate(lignes):
        y = 50 + r * (h + 34)
        d.text((10, y + h // 2), lr, fill=ENCRE, font=POLICE)
        for c, (lc, nom, rec) in enumerate(cellules):
            x = marge + c * w
            out.paste(charge(nom, w - 8, h, rec), (x, y))
            d.text((x + 4, y + h + 4), lc, fill=ENCRE, font=POLICE)
    return out


def planches(prefixes):
    sortie = prefixes[-1]
    vues = [(p, [(v, f'{p}-vue-{v}', (0.42, 0.95)) for v in VUES]) for p in prefixes]
    grille(vues, 300, 520, 'Personnage : 6 vues (12 h)').save(f'captures/{sortie}-planche-vues.png')
    visage = [(p, [(e, f'{p}-visage-{e}', (0.46, 0.62)) for e in EXPRESSIONS]) for p in prefixes]
    grille(visage, 300, 280, 'Visage : expressions').save(f'captures/{sortie}-planche-visage.png')
    jeu = []
    for p in prefixes:
        for dist in DISTANCES:
            jeu.append((f'{p}\n{dist}', [(f'{h} h'.replace('h5 h', ' h 30'), f'{p}-jeu-{dist}-{h}', None) for h in HEURES]))
    grille(jeu, 400, 300, 'En jeu : 3 m, 8 m, 15 m × 8 h, 12 h, 18 h 30, 23 h').save(f'captures/{sortie}-planche-jeu.png')


if __name__ == '__main__':
    planches(sys.argv[1:] or ['p2-avant'])
