import sys, re, html
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
W=sys.argv[1]
G='/System/Library/Fonts/Supplemental/'
txt=open(W+'/article.html').read()
body=re.sub(r'<[^>]+>',' ',txt.split('<body>')[1]); body=html.unescape(re.sub(r'\s+',' ',body)).strip()
# English letter frequencies (per 1000 chars incl. space), general prose
freq={' ':182,'e':102,'t':75,'a':65,'o':62,'i':57,'n':57,'s':53,'r':50,'h':50,'l':33,'d':33,'u':23,'c':22,'m':20,'f':18,'w':17,'g':16,'p':15,'y':15,'b':12,',':10,'.':9,'v':8,'k':6,'T':3,'I':3,'A':2,'S':2,'x':1,'j':1,'q':1,'z':1,'’':2,'-':1}
def avg(font, weights):
    cmap=font.getBestCmap(); hm=font['hmtx']; upm=font['head'].unitsPerEm
    tot=0;n=0
    for ch,w in weights.items():
        g=cmap.get(ord(ch))
        if g is None: continue
        tot+=hm[g][0]/upm*w; n+=w
    return tot/n
def counts(s):
    d={}
    for c in s: d[c]=d.get(c,0)+1
    return d
cases=[('regular',W+'/fonts/SourceSerif4[opsz,wght].ttf',400,18,'Georgia.ttf'),
       ('italic',W+'/fonts/SourceSerif4-Italic[opsz,wght].ttf',400,18,'Georgia Italic.ttf'),
       ('bold',W+'/fonts/SourceSerif4[opsz,wght].ttf',700,36,'Georgia Bold.ttf'),
       ('bolditalic',W+'/fonts/SourceSerif4-Italic[opsz,wght].ttf',700,36,'Georgia Bold Italic.ttf')]
for name,src,wg,op,gf in cases:
    f=instancer.instantiateVariableFont(TTFont(src),{'wght':wg,'opsz':op})
    g=TTFont(G+gf)
    for label,wts in (('freq',freq),('article',counts(body))):
        a=avg(f,wts); b=avg(g,wts)
        print(name,label,'ss4=%.4f georgia=%.4f size-adjust=%.2f%%'%(a,b,a/b*100))
