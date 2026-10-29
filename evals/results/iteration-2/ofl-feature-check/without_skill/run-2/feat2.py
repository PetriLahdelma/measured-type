import sys
from fontTools.ttLib import TTFont
f=TTFont(sys.argv[1]); g=f['GSUB'].table; hm=f['hmtx']
fl=g.FeatureList.FeatureRecord
for tag in ('pnum','onum','lnum','tnum','smcp','c2sc'):
    for fr in fl:
        if fr.FeatureTag==tag:
            print(tag, fr.Feature.LookupListIndex)
            for li in fr.Feature.LookupListIndex:
                L=g.LookupList.Lookup[li]
                for st in L.SubTable:
                    t=st.ExtSubTable if L.LookupType==7 else st
                    if hasattr(t,'mapping') and tag in('pnum','onum','lnum','tnum'):
                        print("  L",li,[(k,v,hm[v][0]) for k,v in list(t.mapping.items())])
            break
