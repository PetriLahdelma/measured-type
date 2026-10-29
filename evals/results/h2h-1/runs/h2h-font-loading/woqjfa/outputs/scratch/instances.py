# Make static instances of the variable fonts at the sizes/weights the page uses,
# so the fallback is matched to what actually renders (opsz follows font-size).
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
jobs = {
  "roman-400-opsz18": ("fonts/SourceSerif4[opsz,wght].ttf", 400, 18),
  "roman-700-opsz18": ("fonts/SourceSerif4[opsz,wght].ttf", 700, 18),
  "roman-700-opsz36": ("fonts/SourceSerif4[opsz,wght].ttf", 700, 36),
  "italic-400-opsz18": ("fonts/SourceSerif4-Italic[opsz,wght].ttf", 400, 18),
  "italic-700-opsz18": ("fonts/SourceSerif4-Italic[opsz,wght].ttf", 700, 18),
}
for name, (src, w, o) in jobs.items():
    f = instantiateVariableFont(TTFont(src), {"wght": w, "opsz": o})
    f.save(f"scratch/{name}.ttf")
    print("wrote", name)
