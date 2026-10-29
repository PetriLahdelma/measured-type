import sys
from fontTools.ttLib import TTFont
for p in sys.argv[1:]:
    f=TTFont(p)
    print("=====",p)
    print("name:",f['name'].getDebugName(1),f['name'].getDebugName(2),"ver",f['name'].getDebugName(5))
    if 'fvar' in f:
        for a in f['fvar'].axes: print(" axis",a.axisTag,a.minValue,a.defaultValue,a.maxValue)
        for i in f['fvar'].instances: print("  inst",f['name'].getDebugName(i.subfamilyNameID),i.coordinates)
    if 'STAT' in f: print(" STAT present")
    for t in ('GSUB','GPOS'):
        if t in f and f[t].table.FeatureList:
            tags=sorted(set(fr.FeatureTag for fr in f[t].table.FeatureList.FeatureRecord))
            print(" ",t,tags)
            sl=f[t].table.ScriptList
            for sr in sl.ScriptRecord:
                langs=[lr.LangSysTag for lr in sr.Script.LangSysRecord]
                print("   script",sr.ScriptTag,"langs",langs)
    os2=f['OS/2']; hh=f['hhea']; head=f['head']
    print(" upm",head.unitsPerEm,"typo",os2.sTypoAscender,os2.sTypoDescender,os2.sTypoLineGap,"win",os2.usWinAscent,os2.usWinDescent,"hhea",hh.ascent,hh.descent,hh.lineGap,"useTypo",bool(os2.fsSelection & (1<<7)))
    print(" xHeight",getattr(os2,'sxHeight',None),"capH",getattr(os2,'sCapHeight',None))
    cmap=f.getBestCmap()
    print(" glyphs",len(f.getGlyphOrder()),"cmap",len(cmap))
    chk={'en dash':0x2013,'em dash':0x2014,'curly quote':0x2019,'ellipsis':0x2026,'minus':0x2212,'nbsp':0xa0,'thin space':0x2009,'narrow nbsp':0x202f,'figure space':0x2007,'multiplication':0xd7,'percent':0x25,'euro':0x20ac,'ä':0xe4,'ö':0xf6,'å':0xe5,'š':0x161,'ž':0x17e}
    print(" missing:",[k for k,v in chk.items() if v not in cmap])
    print(" fsType",os2.fsType, "license:", (f['name'].getDebugName(13) or '')[:80])
