import sys
from fontTools.ttLib import TTFont
for p in sys.argv[1:]:
    f=TTFont(p); h=f['hhea']; o=f['OS/2']; u=f['head'].unitsPerEm
    print(p.split('/')[-1], 'upm',u,'hhea',h.ascent,h.descent,h.lineGap,'typo',o.sTypoAscender,o.sTypoDescender,o.sTypoLineGap,'win',o.usWinAscent,o.usWinDescent,'useTypo',bool(o.fsSelection&128),'xh',getattr(o,'sxHeight',None),'cap',getattr(o,'sCapHeight',None))
    if 'fvar' in f:
        for a in f['fvar'].axes: print(' axis',a.axisTag,a.minValue,a.defaultValue,a.maxValue)
    print(' name', f['name'].getDebugName(1), f['name'].getDebugName(4))
