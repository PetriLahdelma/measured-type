# Estimate size-adjust: ratio of Source Serif 4 advance width to Georgia's over the article's own text
import re, html, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
src = open('article.html', encoding='utf-8').read()
art = re.search(r'<article[^>]*>(.*)</article>', src, re.S).group(1)
h1 = html.unescape(re.sub('<[^>]+>', '', re.search(r'<h1>(.*?)</h1>', art).group(1)))
em = ' '.join(re.findall(r'<em>(.*?)</em>', art))
ps = [html.unescape(re.sub('<[^>]+>', '', p)) for p in re.findall(r'<p>(.*?)</p>', art, re.S)]
body = ' '.join(ps)
G = '/System/Library/Fonts/Supplemental/'
def width(font, text):
    cmap = font.getBestCmap(); hm = font['hmtx']; upm = font['head'].unitsPerEm
    return sum(hm[cmap[ord(c)]][0] for c in text if ord(c) in cmap) / upm
def inst(path, wght, opsz):
    return instantiateVariableFont(TTFont(path), {'wght': wght, 'opsz': opsz})
cases = [
  ('regular body 18px', inst('fonts/SourceSerif4[opsz,wght].ttf', 400, 18), TTFont(G+'Georgia.ttf'), body),
  ('italic em 18px', inst('fonts/SourceSerif4-Italic[opsz,wght].ttf', 400, 18), TTFont(G+'Georgia Italic.ttf'), em),
  ('italic body-text 18px', inst('fonts/SourceSerif4-Italic[opsz,wght].ttf', 400, 18), TTFont(G+'Georgia Italic.ttf'), body),
  ('bold h1 36px', inst('fonts/SourceSerif4[opsz,wght].ttf', 700, 36), TTFont(G+'Georgia Bold.ttf'), h1),
  ('bold body-text 36px', inst('fonts/SourceSerif4[opsz,wght].ttf', 700, 36), TTFont(G+'Georgia Bold.ttf'), body),
]
for name, ss, g, text in cases:
    a, b = width(ss, text), width(g, text)
    print(f'{name:24s} ss={a:.3f} georgia={b:.3f} size-adjust={a/b*100:.2f}%')
print('--- opsz sensitivity')
for opsz in (18, 36):
    for wg, fn, gn in ((700, 'fonts/SourceSerif4[opsz,wght].ttf', 'Georgia Bold.ttf'), (700, 'fonts/SourceSerif4-Italic[opsz,wght].ttf', 'Georgia Bold Italic.ttf')):
        a = width(inst(fn, wg, opsz), body); b = width(TTFont(G+gn), body)
        print(f'{fn.split("/")[1][:22]} w{wg} opsz{opsz} vs {gn}: {a/b*100:.2f}%')
print('--- regular weights at opsz 36')
for fn, gn in (('fonts/SourceSerif4[opsz,wght].ttf', 'Georgia.ttf'), ('fonts/SourceSerif4-Italic[opsz,wght].ttf', 'Georgia Italic.ttf')):
    a = width(inst(fn, 400, 36), body); b = width(TTFont(G+gn), body)
    print(f'{gn} w400 opsz36: {a/b*100:.2f}%')
