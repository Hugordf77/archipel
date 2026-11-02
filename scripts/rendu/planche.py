# Planche de comparaison des captures de rendu et relevé des sombres (pipette).
# python3 scripts/rendu/planche.py [--ciel] <préfixe> [<préfixe2>] : grille lieux × heures (deux préfixes :
# côte à côte). --ciel : cadrages tournés vers le ciel (LIEUX_CIEL et HEURES_CIEL de serie.js).
import sys, json
from PIL import Image, ImageDraw
import numpy as np

args = sys.argv[1:]
CIEL = '--ciel' in args
args = [a for a in args if a != '--ciel']
if CIEL:
    LIEUX = ['ouest-coucher', 'est-lever', 'zenith-nuit', 'horizon-marin']
    HEURES = ['5h5', '6h75', '18h25', '19h5', '20h5', '23', '2']
else:
    LIEUX = ['depart', 'grande-ile', 'volcan']
    HEURES = ['8', '12', '18h5', '23']
prefixes = args or ['avant']
W = 480
cell = None
stats = {}
rows = []
for l in LIEUX:
    for pre in prefixes:
        row = []
        for h in HEURES:
            im = Image.open(f'captures/{pre}-{l}-{h}.png').convert('RGB')
            a = np.asarray(im).astype(np.float32) / 255
            lum = a @ np.array([0.299, 0.587, 0.114])
            flat = a.reshape(-1, 3)
            # 0,1 % les plus sombres : couleur moyenne et teinte (bleu > rouge ?)
            k = max(1, flat.shape[0] // 1000)
            idx = np.argpartition(lum.ravel(), k)[:k]
            dk = flat[idx].mean(0)
            p = np.percentile(lum, [1, 5, 50, 95, 99])
            stats[f'{pre}-{l}-{h}'] = {
                'lum_p1': round(float(p[0]), 3), 'p5': round(float(p[1]), 3), 'med': round(float(p[2]), 3),
                'p95': round(float(p[3]), 3), 'p99': round(float(p[4]), 3),
                'contraste_p5_p95': round(float(p[3] - p[1]), 3),
                'min': round(float(lum.min()), 3),
                'sombre_rgb': [int(round(c * 255)) for c in dk],
                'noir_lt_0.08': round(float((lum < 0.08).mean() * 100), 4),
            }
            # garde-fou DA : pas de noir (plus de 8 px sous 0,08) ni de sombres gris (sans teinte)
            st = stats[f'{pre}-{l}-{h}']
            alertes = []
            if (lum < 0.08).sum() > 8:
                alertes.append(f'noir : {(lum < 0.08).sum()} px sous 0,08')
            if dk.max() - dk.min() < 0.035 and float(dk @ np.array([0.299, 0.587, 0.114])) < 0.2:
                alertes.append(f'sombres gris {st["sombre_rgb"]}')
            st['alertes'] = alertes
            t = im.resize((W, int(W * im.height / im.width)))
            d = ImageDraw.Draw(t)
            d.rectangle([0, 0, 150, 16], fill=(255, 255, 255))
            d.text((4, 2), f'{pre} {l} {h}', fill=(60, 50, 70))
            row.append(t)
        rows.append(row)
cw, ch = rows[0][0].size
sheet = Image.new('RGB', (cw * len(HEURES), ch * len(rows)), (250, 246, 238))
for j, row in enumerate(rows):
    for i, t in enumerate(row):
        sheet.paste(t, (i * cw, j * ch))
name = ('ciel-' if CIEL else '') + '-'.join(prefixes)
sheet.save(f'captures/planche-{name}.jpg', quality=88)
json.dump(stats, open(f'captures/stats-{name}.json', 'w'), indent=1)
for k, v in stats.items():
    print(k, v)
for k, v in stats.items():
    for a in v['alertes']:
        print('ALERTE', k, a)
