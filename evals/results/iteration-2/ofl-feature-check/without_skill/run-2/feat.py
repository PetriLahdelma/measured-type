import sys
from fontTools.ttLib import TTFont
def subs(f, tag):
    g=f['GSUB'].table; out={}
    idx=[i for i,fr in enumerate(g.FeatureList.FeatureRecord) if fr.FeatureTag==tag]
    lk=set()
    for i in idx: lk.update(g.FeatureList.FeatureRecord[i].Feature.LookupListIndex)
    for li in sorted(lk):
        L=g.LookupList.Lookup[li]
        for st in L.SubTable:
            t=st
            if L.LookupType==7: t=st.ExtSubTable
            if hasattr(t,'mapping'): out.update(t.mapping)
            elif hasattr(t,'alternates'): out.update({k:v[0] for k,v in t.alternates.items()})
            elif hasattr(t,'ligatures'):
                for k,v in t.ligatures.items():
                    for l in v: out[k+'+'+'+'.join(l.Component)]=l.LigGlyph
            else: out['<type%d>'%(t.LookupType if hasattr(t,'LookupType') else L.LookupType)]='ctx'
    return out
for p in sys.argv[1:]:
    f=TTFont(p); cmap=f.getBestCmap(); hm=f['hmtx']
    print("=====",p)
    digits=[cmap[ord(c)] for c in '0123456789']
    print(" default digit names",digits, "advances",[hm[d][0] for d in digits])
    tags=sorted(set(fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord))
    for tag in tags:
        if tag in ('aalt','ccmp','rvrn','mark'): continue
        m=subs(f,tag)
        items=list(m.items())
        dig=[(k,v,hm[v][0] if v in hm.metrics else None) for k,v in items if k in digits]
        print(f" {tag}: {len(m)} subs; sample {items[:8]}")
        if dig: print("    digits->",dig)
