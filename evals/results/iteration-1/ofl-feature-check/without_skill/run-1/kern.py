import sys
from fontTools.ttLib import TTFont
f=TTFont(sys.argv[1]); targets=set(sys.argv[2].split(','))
g=f['GPOS'].table; hits=set()
for fr in g.FeatureList.FeatureRecord:
    if fr.FeatureTag!='kern': continue
    for li in fr.Feature.LookupListIndex:
        L=g.LookupList.Lookup[li]
        for st in L.SubTable:
            t=st.ExtSubTable if L.LookupType==9 else st
            if getattr(t,'Format',None)==1 and hasattr(t,'PairSet'):
                cov=t.Coverage.glyphs
                for i,ps in enumerate(t.PairSet):
                    for pv in ps.PairValueRecord:
                        v=pv.Value1.XAdvance if pv.Value1 and hasattr(pv.Value1,'XAdvance') else 0
                        if v and (cov[i] in targets or pv.SecondGlyph in targets): hits.add((cov[i],pv.SecondGlyph,v))
            elif getattr(t,'Format',None)==2:
                cov=set(t.Coverage.glyphs); c1=t.ClassDef1.classDefs; c2=t.ClassDef2.classDefs
                for gname in targets:
                    if gname in cov:
                        k1=c1.get(gname,0)
                        for c2i,rec in enumerate(t.Class1Record[k1].Class2Record):
                            v=rec.Value1.XAdvance if rec.Value1 and hasattr(rec.Value1,'XAdvance') else 0
                            if v: hits.add((gname,'class%d'%c2i,v))
                    if gname in c2:
                        for k1,r in enumerate(t.Class1Record):
                            v=r.Class2Record[c2[gname]].Value1
                            v=v.XAdvance if v and hasattr(v,'XAdvance') else 0
                            if v: hits.add(('class%d'%k1,gname,v))
print(len(hits), sorted(hits)[:30])
