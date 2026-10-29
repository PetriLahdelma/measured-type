import sys
from fontTools.ttLib import TTFont
for p in sys.argv[1:]:
    f=TTFont(p)
    print("=====",p)
    n=f['name']
    for i in (1,2,4,5,16,17):
        r=n.getName(i,3,1,0x409)
        if r: print(i,r.toUnicode())
    if 'fvar' in f:
        for a in f['fvar'].axes: print("axis",a.axisTag,a.minValue,a.defaultValue,a.maxValue)
        for inst in f['fvar'].instances: print(" inst",n.getDebugName(inst.subfamilyNameID),inst.coordinates)
    if 'STAT' in f: print("STAT present")
    os2=f['OS/2']; hh=f['hhea']; head=f['head']
    print("upm",head.unitsPerEm,"asc/desc/gap hhea",hh.ascent,hh.descent,hh.lineGap,"typo",os2.sTypoAscender,os2.sTypoDescender,os2.sTypoLineGap,"win",os2.usWinAscent,os2.usWinDescent,"xH",getattr(os2,'sxHeight',None),"capH",getattr(os2,'sCapHeight',None),"fsSelection",bin(os2.fsSelection))
    for t in ('GSUB','GPOS'):
        if t in f:
            tb=f[t].table
            feats=sorted(set(fr.FeatureTag for fr in tb.FeatureList.FeatureRecord))
            scripts=[(s.ScriptTag,[l.LangSysTag for l in s.Script.LangSysRecord]) for s in tb.ScriptList.ScriptRecord]
            print(t,feats); print(" scripts",scripts)
    cmap=f.getBestCmap()
    print("glyphs",len(f.getGlyphOrder()),"cmap",len(cmap))
    for ch in "ﬁﬂ0123456789½⅓→—–‘’“”…%€$·×−":
        print(ch, cmap.get(ord(ch)), end=' | ')
    print()
