# Métriques d'image du banc de rendu (numpy, scipy, Pillow ; aucune dépendance npm).
#   python3 scripts/rendu/banc/metriques.py serie <série>            → captures/banc/<série>/metriques.json
#   python3 scripts/rendu/banc/metriques.py compare <avant> <après>  → captures/banc/<après>/comparaison.json
#   python3 scripts/rendu/banc/metriques.py --autotest               → contrôle des formules sur des images
#                                                                      synthétiques (tests/rendu-banc.test.js)
# Par image (sRGB 8 bits, luminance Rec. 709 sur les valeurs encodées, comme l'œil lit l'écran) :
#   lum_p1, lum_p50, lum_p99 : percentiles de luminance (0 à 1)
#   noir_pur, blanc_brule : part des pixels dont le canal le plus fort ≤ 3/255, le plus faible ≥ 252/255
#   sat_moy, sat_max : saturation HSV moyenne, et son centile 99,5 (« max » robuste au pixel isolé)
#   contraste_local : écart type moyen de la luminance dans une fenêtre de 9 px
#   hautes_freq : part de l'énergie de la luminance au-dessus d'une coupure (détail visible après la peinture)
#   ombre_soleil : avec la paire A/B « ombres » du banc (<cadrage>--ombres-0 | -1), valeur médiane d'une
#     zone à l'ombre portée rapportée à la même zone au soleil (cible DA : 0,40 à 0,60)
# Comparaison : SSIM par zone (grille 4 × 4) et global, écarts des métriques par cadrage.
import sys, os, json, glob
import numpy as np
from PIL import Image
from scipy import ndimage

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
BANC = os.path.join(RACINE, 'captures', 'banc')
GRILLE = 4


def charger(f):
    return np.asarray(Image.open(f).convert('RGB')).astype(np.float64) / 255.0


def luminance(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def saturation(a):
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)


def contraste_local(lum, k=9):
    m = ndimage.uniform_filter(lum, k)
    m2 = ndimage.uniform_filter(lum * lum, k)
    return float(np.sqrt(np.maximum(m2 - m * m, 0)).mean())


def hautes_freq(lum, coupure=0.25):
    # énergie spectrale (moyenne retirée) au-delà de coupure × fréquence de Nyquist
    f = np.fft.fftshift(np.fft.fft2(lum - lum.mean()))
    p = np.abs(f) ** 2
    h, w = lum.shape
    yy, xx = np.mgrid[-h // 2:h - h // 2, -w // 2:w - w // 2]
    r = np.sqrt((yy / (h / 2)) ** 2 + (xx / (w / 2)) ** 2)
    tot = p.sum()
    return float(p[r > coupure].sum() / tot) if tot > 0 else 0.0


def ombre_soleil(sans, avec):
    # pixels assombris par l'ombre portée : nettement plus sombres avec les ombres que sans
    ls = luminance(sans)
    la = luminance(avec)
    masque = (ls > 0.05) & (la < ls * 0.9)
    if masque.mean() < 0.002:
        return None, float(masque.mean())
    return float(np.median(la[masque] / ls[masque])), float(masque.mean())


def metriques_image(a):
    lum = luminance(a)
    sat = saturation(a)
    return {
        'lum_p1': round(float(np.percentile(lum, 1)), 4),
        'lum_p50': round(float(np.percentile(lum, 50)), 4),
        'lum_p99': round(float(np.percentile(lum, 99)), 4),
        'noir_pur': round(float((a.max(axis=2) <= 3 / 255).mean()), 5),
        'blanc_brule': round(float((a.min(axis=2) >= 252 / 255).mean()), 5),
        'sat_moy': round(float(sat.mean()), 4),
        'sat_max': round(float(np.percentile(sat, 99.5)), 4),
        'contraste_local': round(contraste_local(lum), 4),
        'hautes_freq': round(hautes_freq(lum), 4),
    }


def ssim(x, y, sigma=1.5):
    # SSIM de Wang et al. (fenêtre gaussienne), sur la luminance ; carte complète
    C1, C2 = 0.01 ** 2, 0.03 ** 2
    g = lambda v: ndimage.gaussian_filter(v, sigma)
    mx, my = g(x), g(y)
    sxx = g(x * x) - mx * mx
    syy = g(y * y) - my * my
    sxy = g(x * y) - mx * my
    return ((2 * mx * my + C1) * (2 * sxy + C2)) / ((mx * mx + my * my + C1) * (sxx + syy + C2))


def ssim_zones(a, b, n=GRILLE):
    carte = ssim(luminance(a), luminance(b))
    h, w = carte.shape
    zones = [[round(float(carte[i * h // n:(i + 1) * h // n, j * w // n:(j + 1) * w // n].mean()), 4) for j in range(n)] for i in range(n)]
    return round(float(carte.mean()), 4), zones


def images_cadrages(dossier):
    return sorted(f for f in glob.glob(os.path.join(dossier, '*.png')) if '--' not in os.path.basename(f) and os.path.basename(f) != 'planche.png')


def serie(nom):
    dossier = os.path.join(BANC, nom)
    out = {}
    for f in images_cadrages(dossier):
        cad = os.path.basename(f)[:-4]
        out[cad] = metriques_image(charger(f))
        s0 = os.path.join(dossier, f'{cad}--ombres-0.png')
        s1 = os.path.join(dossier, f'{cad}--ombres-1.png')
        if os.path.exists(s0) and os.path.exists(s1):
            r, part = ombre_soleil(charger(s0), charger(s1))
            out[cad]['ombre_soleil'] = None if r is None else round(r, 4)
            out[cad]['part_ombre'] = round(part, 4)
    with open(os.path.join(dossier, 'metriques.json'), 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    return out


def compare(avant, apres):
    da, db = os.path.join(BANC, avant), os.path.join(BANC, apres)
    ma = serie(avant)
    mb = serie(apres)
    out = {'avant': avant, 'apres': apres, 'cadrages': {}}
    for cad in sorted(set(ma) & set(mb)):
        a = charger(os.path.join(da, f'{cad}.png'))
        b = charger(os.path.join(db, f'{cad}.png'))
        if a.shape != b.shape:
            out['cadrages'][cad] = {'erreur': f'tailles différentes {a.shape} / {b.shape}'}
            continue
        g, zones = ssim_zones(a, b)
        delta = {k: round(mb[cad][k] - ma[cad][k], 4) for k in mb[cad] if k in ma[cad] and isinstance(mb[cad][k], (int, float)) and isinstance(ma[cad][k], (int, float))}
        out['cadrages'][cad] = {'ssim': g, 'ssim_zones': zones, 'avant': ma[cad], 'apres': mb[cad], 'delta': delta}
    with open(os.path.join(db, 'comparaison.json'), 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    return out


def autotest():
    rng = np.random.default_rng(7)
    h, w = 120, 160
    # 1. image grise uniforme : luminance connue, pas de noir, pas de saturation, pas de détail
    gris = np.full((h, w, 3), 0.5)
    m = metriques_image(gris)
    assert abs(m['lum_p50'] - 0.5) < 1e-3 and m['noir_pur'] == 0 and m['sat_max'] == 0 and m['contraste_local'] < 1e-6
    # 2. un quart noir pur, un quart blanc brûlé
    nb = gris.copy()
    nb[: h // 2, : w // 2] = 0
    nb[h // 2:, w // 2:] = 1
    m = metriques_image(nb)
    assert abs(m['noir_pur'] - 0.25) < 1e-3 and abs(m['blanc_brule'] - 0.25) < 1e-3
    # 3. rouge pur : saturation 1
    rouge = np.zeros((h, w, 3))
    rouge[..., 0] = 0.8
    assert metriques_image(rouge)['sat_max'] == 1
    # 4. bruit fin : plus de hautes fréquences qu'un dégradé lisse
    bruit = np.repeat(rng.random((h, w, 1)), 3, axis=2)
    lisse = np.repeat(np.linspace(0, 1, w)[None, :, None].repeat(h, 0), 3, axis=2)
    assert metriques_image(bruit)['hautes_freq'] > 0.5 > metriques_image(lisse)['hautes_freq']
    # 5. ombre portée à 50 % sur un tiers de l'image : ratio 0,5
    sans = np.full((h, w, 3), 0.6)
    avec = sans.copy()
    avec[:, : w // 3] *= 0.5
    r, part = ombre_soleil(sans, avec)
    assert abs(r - 0.5) < 1e-3 and abs(part - 1 / 3) < 0.01
    # 6. SSIM : 1 pour deux images identiques, plus bas dans la seule zone modifiée
    g, zones = ssim_zones(bruit, bruit)
    assert g > 0.999
    b2 = bruit.copy()
    b2[: h // 4, : w // 4] = 0.5
    g, zones = ssim_zones(bruit, b2)
    assert zones[0][0] < 0.5 and min(zones[i][j] for i in range(4) for j in range(4) if (i, j) != (0, 0)) > 0.9
    print(json.dumps({'autotest': 'ok'}))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['--autotest']:
        autotest()
    elif a[:1] == ['serie'] and len(a) == 2:
        print(json.dumps(serie(a[1]), ensure_ascii=False, indent=2))
    elif a[:1] == ['compare'] and len(a) == 3:
        r = compare(a[1], a[2])
        print(json.dumps({k: {'ssim': v.get('ssim'), 'delta': v.get('delta')} for k, v in r['cadrages'].items()}, ensure_ascii=False, indent=2))
    else:
        print('usage : metriques.py serie <série> | compare <avant> <après> | --autotest')
        sys.exit(2)
