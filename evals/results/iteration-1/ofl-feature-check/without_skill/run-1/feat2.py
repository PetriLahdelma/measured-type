from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
def lk(f,tag):
    g=f['GSUB'].table; out={}
    for fr in g.FeatureList.FeatureRecord:
        if fr.FeatureTag!=tag: continue
        for li in fr.Feature.LookupListIndex:
            L=g.LookupList.Lookup[li]
            for st in L.SubTable:
                t=st.ExtSubTable if L.LookupType==7 else st
                if hasattr(t,'mapping'): out.update(t.mapping)
    return out
f=TTFont("fonts/SourceSerif4[opsz,wght].ttf"); gs=f.getGlyphSet(); cmap=f.getBestCmap()
def h(gn):
    p=BoundsPen(gs); gs[gn].draw(p); return p.bounds
c2sc=lk(f,'c2sc'); smcp=lk(f,'smcp')
print("c2sc count",len(c2sc),"A-Z covered",all(cmap[ord(c)] in c2sc for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "digits in c2sc", [c for c in "0123456789&" if cmap[ord(c)] in c2sc])
print("smcp a-z covered",all(cmap[ord(c)] in smcp for c in "abcdefghijklmnopqrstuvwxyz"), "smcp len",len(smcp))
print("A",h('A'),"A.sc",h(c2sc['A']),"x",h('x'),"H",h('H'), "onum 5", h(lk(f,'onum')['five']), "five", h('five'))
o=TTFont("fonts/Outfit[wght].ttf"); og=o.getGlyphSet(); hm=o['hmtx']
for lg in ['o_u_t_f_i_t','f_f','t_t']:
    p=BoundsPen(og); og[lg].draw(p); print(lg,hm[lg],p.bounds, 'sum comps', sum(hm[c][0] for c in {'o_u_t_f_i_t':'outfit','f_f':'ff','t_t':'tt'}[lg]))
print("outfit minus", hm['minus'], "zero",hm['zero'],"zero.tf",hm['zero.tf'],"one",hm['one'],"one.tf",hm['one.tf'],"percent",hm['percent'],"period",hm['period'],"comma",hm['comma'], "figurespace", o.getBestCmap().get(0x2007), "thin", o.getBestCmap().get(0x2009),"nbsp",o.getBestCmap().get(0xa0))
ss=f['hmtx']; print("ss4 default zero",ss['zero'],"one",ss['one'])
# kern GPOS check spacing of uppercase in Outfit? skip
