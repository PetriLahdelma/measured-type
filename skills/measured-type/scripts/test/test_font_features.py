#!/usr/bin/env python3
"""Regression checks for font-features.py, run against the OFL test fonts in
evals/ofl-feature-check/files/fonts. Skips when the fonts are not there (an
installed copy of the skill has no evals folder).

    python3 scripts/test/test_font_features.py
"""

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "font-features.py")
FONTS = os.path.join(HERE, "..", "..", "..", "..", "evals", "ofl-feature-check", "files", "fonts")
ROMAN = os.path.join(FONTS, "SourceSerif4[opsz,wght].ttf")
ITALIC = os.path.join(FONTS, "SourceSerif4-Italic[opsz,wght].ttf")
OUTFIT = os.path.join(FONTS, "Outfit[wght].ttf")

failed = 0


def run(*args):
    return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True)


def report(font, *checks):
    out = run(font, "--json", *(f"--check={c}" for c in checks))
    if out.returncode:
        sys.exit(out.stderr.strip())
    [result] = json.loads(out.stdout)
    return result, {c["feature"]: c for c in result["checks"]}


def check(name, ok, detail=""):
    global failed
    print(f"{'ok  ' if ok else 'FAIL'} {name}" + ("" if ok else f"\n     {detail}"))
    failed += not ok


if not os.path.exists(ROMAN):
    print(f"skipped: test fonts not found in {os.path.normpath(FONTS)}")
    sys.exit(0)
try:
    import fontTools  # noqa: F401
except ImportError:
    sys.exit("fontTools is missing: pip install fonttools brotli")

roman, rc = report(ROMAN, "ss02=agy", "kern=AVTo", "tnum=0123456789", "smcp=abcxyzäöå")
check("a GSUB tag outside the detail list is present", rc["ss02"]["present"] and rc["ss02"]["table"] == "GSUB", rc["ss02"])
check("a GPOS tag is present with its coverage", rc["kern"]["present"] and rc["kern"]["covered"] == "AVTo", rc["kern"])
check("default digits are read as tabular lining",
      roman["default_figures"]["tabular"] and roman["default_figures"]["style"] == "lining", roman["default_figures"])
check("tnum on tabular defaults is reported as not needed", rc["tnum"]["default_already"] is True, rc["tnum"])
check("roman smcp covers accented letters", rc["smcp"]["present"] and not rc["smcp"]["missing"], rc["smcp"])

_, ic = report(ITALIC, "smcp=abc", "onum=0123456789")
check("italic has no smcp", ic["smcp"]["present"] is False, ic["smcp"])
check("italic onum covers the digits", ic["onum"]["present"] and not ic["onum"]["missing"], ic["onum"])

outfit, oc = report(OUTFIT, "tnum=0123456789", "onum=0123456789")
check("Outfit default digits are proportional", outfit["default_figures"]["tabular"] is False, outfit["default_figures"])
check("Outfit tnum covers the digits", oc["tnum"]["present"] and not oc["tnum"]["missing"], oc["tnum"])
check("Outfit has no onum", oc["onum"]["present"] is False, oc["onum"])

bad = run(ROMAN, "--check", "tnum")
check("a --check without = exits nonzero", bad.returncode != 0, bad.stderr)
missing = run(os.path.join(FONTS, "missing.ttf"))
check("a missing file exits nonzero with a message", missing.returncode != 0 and "missing.ttf" in missing.stderr, missing.stderr)

print(f"\n{failed} failed" if failed else "\nall passed")
sys.exit(1 if failed else 0)
