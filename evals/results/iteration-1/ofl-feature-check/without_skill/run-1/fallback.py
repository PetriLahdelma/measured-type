from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
freq={'a':8.2,'b':1.5,'c':2.8,'d':4.3,'e':12.7,'f':2.2,'g':2.0,'h':6.1,'i':7.0,'j':0.15,'k':0.77,'l':4.0,'m':2.4,'n':6.7,'o':7.5,'p':1.9,'q':0.095,'r':6.0,'s':6.3,'t':9.1,'u':2.8,'v':0.98,'w':2.4,'x':0.15,'y':2.0,'z':0.074,' ':18.0}
def avg(f):
    cmap=f.getBestCmap(); hm=f['hmtx']; upm=f['head'].unitsPerEm
    tot=sum(freq.values()); return sum(hm[cmap[ord(c)]][0]*w for c,w in freq.items())/tot/upm
def metrics(f):
    os2=f['OS/2']; upm=f['head'].unitsPerEm
    return os2.sTypoAscender/upm, -os2.sTypoDescender/upm, os2.sTypoLineGap/upm, f['hhea'].ascent/upm, -f['hhea'].descent/upm, f['hhea'].lineGap/upm
ss=instantiateVariableFont(TTFont("fonts/SourceSerif4[opsz,wght].ttf"),{"wght":400,"opsz":19})
ssi=instantiateVariableFont(TTFont("fonts/SourceSerif4-Italic[opsz,wght].ttf"),{"wght":400,"opsz":19})
o6=instantiateVariableFont(TTFont("fonts/Outfit[wght].ttf"),{"wght":600})
o4=instantiateVariableFont(TTFont("fonts/Outfit[wght].ttf"),{"wght":400})
geo=TTFont("/System/Library/Fonts/Supplemental/Georgia.ttf"); geoi=TTFont("/System/Library/Fonts/Supplemental/Georgia Italic.ttf"); ar=TTFont("/System/Library/Fonts/Supplemental/Arial.ttf"); arb=TTFont("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
for name,t,fb in [("SS4 400/19 vs Georgia",ss,geo),("SS4 It vs Georgia It",ssi,geoi),("Outfit400 vs Arial",o4,ar),("Outfit600 vs Arial",o6,ar),("Outfit600 vs Arial Bold",o6,arb)]:
    sa=avg(t)/avg(fb); a,d,g,_,_,_=metrics(t)
    print(name,"avgT %.4f avgF %.4f size-adjust %.1f%% ascent-override %.1f%% descent-override %.1f%% linegap %.1f%%"%(avg(t),avg(fb),sa*100,a/sa*100,d/sa*100,g/sa*100))
print("SS4 x/cap", ss['OS/2'].sxHeight, ss['OS/2'].sCapHeight, "Geo", geo['OS/2'].sxHeight/2048, geo['OS/2'].sCapHeight/2048, "Arial", ar['OS/2'].sxHeight/2048, ar['OS/2'].sCapHeight/2048)
