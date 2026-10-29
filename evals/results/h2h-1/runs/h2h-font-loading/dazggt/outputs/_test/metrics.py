import sys
from fontTools.ttLib import TTFont
def info(path, loc=None):
    f = TTFont(path)
    if loc and 'fvar' in f:
        from fontTools.varLib.instancer import instantiateVariableFont
        f = instantiateVariableFont(f, loc)
    upm = f['head'].unitsPerEm
    os2 = f['OS/2']; hh = f['hhea']
    cmap = f.getBestCmap(); hmtx = f['hmtx']
    # English letter frequency weighted average width (lowercase + space)
    freq = {'a':8.2,'b':1.5,'c':2.8,'d':4.3,'e':12.7,'f':2.2,'g':2.0,'h':6.1,'i':7.0,'j':0.15,'k':0.77,'l':4.0,'m':2.4,'n':6.7,'o':7.5,'p':1.9,'q':0.095,'r':6.0,'s':6.3,'t':9.1,'u':2.8,'v':0.98,'w':2.4,'x':0.15,'y':2.0,'z':0.074,' ':18.0}
    tot = sum(freq.values())
    avg = sum(hmtx[cmap[ord(c)]][0]*w for c,w in freq.items())/tot/upm
    fsSel = os2.fsSelection
    useTypo = bool(fsSel & (1<<7))
    return dict(upm=upm, hasc=hh.ascent, hdesc=hh.descent, hgap=hh.lineGap, tasc=os2.sTypoAscender, tdesc=os2.sTypoDescender, tgap=os2.sTypoLineGap, winA=os2.usWinAscent, winD=os2.usWinDescent, useTypo=useTypo, xh=os2.sxHeight/upm, cap=os2.sCapHeight/upm, avg=avg)
for p, loc in [(sys.argv[1], {'wght':400,'opsz':18}), (sys.argv[2], {'wght':400,'opsz':18}), (sys.argv[3],None), (sys.argv[4],None)]:
    print(p.split('/')[-1], info(p, loc))
