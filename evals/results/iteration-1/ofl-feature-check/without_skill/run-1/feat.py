import sys
from fontTools.ttLib import TTFont
p=sys.argv[1]; want=sys.argv[2].split(',')
f=TTFont(p); g=f['GSUB'].table; cmap=f.getBestCmap(); n=f['name']
for fr in g.FeatureList.FeatureRecord:
    if fr.FeatureTag not in want: continue
    fp=fr.Feature.FeatureParams
    label=''
    if fp is not None and hasattr(fp,'UINameID'): label=n.getDebugName(fp.UINameID)
    out={}
    for li in fr.Feature.LookupListIndex:
        lk=g.LookupList.Lookup[li]
        for st in lk.SubTable:
            t=st
            if lk.LookupType==7: t=st.ExtSubTable
            if hasattr(t,'mapping'): out.update(t.mapping)
            elif hasattr(t,'alternates'): out.update({k:v for k,v in t.alternates.items()})
            elif hasattr(t,'ligatures'):
                for k,v in t.ligatures.items():
                    for l in v: out[k+'+'+'+'.join(l.Component)]=l.LigGlyph
    print(fr.FeatureTag, label, len(out), list(out.items())[:40])
