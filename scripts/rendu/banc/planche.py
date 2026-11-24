# Planche du banc de rendu : une ligne par cadrage, avant | après (ou la série seule), métriques clés
# sous chaque image, SSIM entre les deux.
#   python3 scripts/rendu/banc/planche.py <série>                → captures/banc/<série>/planche.png
#   python3 scripts/rendu/banc/planche.py <avant> <après>        → captures/banc/<après>/planche.png
# Lit metriques.json (et comparaison.json) produits par metriques.py ; les calcule s'ils manquent.
import sys, os, json, subprocess
from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
BANC = os.path.join(ICI, '..', '..', '..', 'captures', 'banc')
W, H, BANDE = 640, 360, 58


def police(t):
    for f in ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, t)
    return ImageFont.load_default()


def metriques(serie):
    f = os.path.join(BANC, serie, 'metriques.json')
    if not os.path.exists(f):
        subprocess.run([sys.executable, os.path.join(ICI, 'metriques.py'), 'serie', serie], check=True, stdout=subprocess.DEVNULL)
    return json.load(open(f))


def legende(m):
    os_ = m.get('ombre_soleil')
    return [
        f"lum p1 {m['lum_p1']:.2f} · p50 {m['lum_p50']:.2f} · p99 {m['lum_p99']:.2f}   noir {m['noir_pur'] * 100:.2f} %   brûlé {m['blanc_brule'] * 100:.2f} %",
        f"sat moy {m['sat_moy']:.2f} · max {m['sat_max']:.2f}   contraste {m['contraste_local']:.3f}   détail {m['hautes_freq']:.3f}" + (f"   ombre/soleil {os_:.2f}" if isinstance(os_, (int, float)) else ''),
    ]


def planche(series):
    ms = [metriques(s) for s in series]
    cads = [c for c in ms[-1] if all(c in m for m in ms)]
    comp = {}
    if len(series) == 2:
        subprocess.run([sys.executable, os.path.join(ICI, 'metriques.py'), 'compare', series[0], series[1]], check=True, stdout=subprocess.DEVNULL)
        comp = json.load(open(os.path.join(BANC, series[1], 'comparaison.json')))['cadrages']
    f_titre, f_txt = police(22), police(14)
    P = Image.new('RGB', (W * len(series), 44 + (H + BANDE) * len(cads)), (250, 246, 238))
    d = ImageDraw.Draw(P)
    d.text((12, 10), ' | '.join(series), fill=(60, 50, 70), font=f_titre)
    for i, cad in enumerate(cads):
        y = 44 + i * (H + BANDE)
        for j, s in enumerate(series):
            im = Image.open(os.path.join(BANC, s, f'{cad}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
            P.paste(im, (j * W, y))
            for k, ligne in enumerate(legende(ms[j][cad])):
                d.text((j * W + 8, y + H + 6 + k * 18), ligne, fill=(50, 45, 60), font=f_txt)
        titre = cad + (f"   SSIM {comp[cad]['ssim']:.3f}" if cad in comp and 'ssim' in comp[cad] else '')
        d.rectangle((0, y, 8 + len(titre) * 9, y + 22), fill=(250, 246, 238))
        d.text((6, y + 3), titre, fill=(60, 50, 70), font=f_txt)
    out = os.path.join(BANC, series[-1], 'planche.png')
    P.save(out)
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if not 1 <= len(a) <= 2:
        print('usage : planche.py <série> | <avant> <après>')
        sys.exit(2)
    print(planche(a))
