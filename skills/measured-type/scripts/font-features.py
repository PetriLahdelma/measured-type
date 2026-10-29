#!/usr/bin/env python3
"""List the OpenType features a font really has and what they cover.

A feature tag in GSUB is not proof that the feature does anything useful:
a font can ship `case` that remaps three combining marks, or `smcp` that
covers A-Z but no accented letters. This script lists the tags per table
and, for the features that matter in text typesetting, counts the glyphs
each one substitutes and which characters those glyphs belong to.

Usage:
  python3 scripts/font-features.py path/to/font.woff2 [more fonts...]
  python3 scripts/font-features.py font.ttf --check smcp=abcdefghijklmnopqrstuvwxyzäöå
  python3 scripts/font-features.py font.ttf --json

Requires: pip install fonttools brotli   (brotli only for .woff2)
"""

import argparse
import json
import sys

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("fontTools is missing: pip install fonttools brotli")

# Features worth reporting in detail, with what to look for in the coverage.
DETAIL = {
    "onum": "oldstyle figures: should cover 0-9",
    "lnum": "lining figures: should cover 0-9 if the default figures are oldstyle",
    "tnum": "tabular figures: should cover 0-9",
    "pnum": "proportional figures",
    "smcp": "small caps from lowercase: should cover a-z and accented letters",
    "c2sc": "small caps from capitals: should cover A-Z and accented capitals",
    "case": "case-sensitive forms: should cover ( ) [ ] { } - and similar",
    "zero": "slashed zero",
    "frac": "fractions",
    "sups": "superscripts",
    "subs": "subscripts",
    "ordn": "ordinals",
    "liga": "standard ligatures",
    "dlig": "discretionary ligatures",
    "ss01": "stylistic set 1",
}


def unwrap(subtable):
    """Extension lookups (type 7) wrap the real subtable."""
    return getattr(subtable, "ExtSubTable", subtable)


def lookup_inputs(gsub, lookup_index, seen=None):
    """Glyph names a GSUB lookup substitutes, plus a flag if it is contextual."""
    seen = seen if seen is not None else set()
    if lookup_index in seen:
        return set(), False
    seen.add(lookup_index)
    lookup = gsub.LookupList.Lookup[lookup_index]
    glyphs, contextual = set(), False
    for st in lookup.SubTable:
        st = unwrap(st)
        kind = st.LookupType if hasattr(st, "LookupType") else lookup.LookupType
        if kind == 1:  # single
            glyphs |= set((st.mapping or {}).keys())
        elif kind == 2:  # multiple
            glyphs |= set((st.mapping or {}).keys())
        elif kind == 3:  # alternate
            glyphs |= set((st.alternates or {}).keys())
        elif kind == 4:  # ligature: first glyph of each ligature
            glyphs |= set((st.ligatures or {}).keys())
        elif kind in (5, 6, 8):  # contextual, chaining, reverse chaining
            contextual = True
            # Follow nested lookups so their substitutions count too.
            nested = set()
            for rule_set_attr in ("SubRuleSet", "ChainSubRuleSet"):
                for rs in getattr(st, rule_set_attr, None) or []:
                    for rule in (getattr(rs, "SubRule", None) or getattr(rs, "ChainSubRule", None) or []):
                        for rec in rule.SubstLookupRecord:
                            nested.add(rec.LookupListIndex)
            for rec in getattr(st, "SubstLookupRecord", None) or []:
                nested.add(rec.LookupListIndex)
            for cs_attr in ("SubClassSet", "ChainSubClassSet"):
                for cs in getattr(st, cs_attr, None) or []:
                    if cs is None:
                        continue
                    for rule in (getattr(cs, "SubClassRule", None) or getattr(cs, "ChainSubClassRule", None) or []):
                        for rec in rule.SubstLookupRecord:
                            nested.add(rec.LookupListIndex)
            for li in nested:
                g, _ = lookup_inputs(gsub, li, seen)
                glyphs |= g
            if kind == 8:
                glyphs |= set(getattr(st.Coverage, "glyphs", []) or [])
    return glyphs, contextual


def analyse(path):
    font = TTFont(path, lazy=False)
    cmap = font.getBestCmap() or {}
    glyph_to_chars = {}
    for code, name in cmap.items():
        glyph_to_chars.setdefault(name, []).append(chr(code))

    result = {"file": path, "tables": {}, "features": {}}

    name_table = font["name"]
    family = name_table.getDebugName(16) or name_table.getDebugName(1)
    style = name_table.getDebugName(17) or name_table.getDebugName(2)
    result["name"] = f"{family} {style}".strip()

    if "fvar" in font:
        result["axes"] = {
            a.axisTag: [a.minValue, a.defaultValue, a.maxValue] for a in font["fvar"].axes
        }
    else:
        result["axes"] = None
    result["italic"] = bool(font["OS/2"].fsSelection & 1) or font["post"].italicAngle != 0

    for table in ("GSUB", "GPOS"):
        if table not in font:
            result["tables"][table] = []
            continue
        records = font[table].table.FeatureList.FeatureRecord
        result["tables"][table] = sorted({r.FeatureTag for r in records})

    if "GSUB" in font:
        gsub = font["GSUB"].table
        by_tag = {}
        for rec in gsub.FeatureList.FeatureRecord:
            by_tag.setdefault(rec.FeatureTag, set()).update(rec.Feature.LookupListIndex)
        for tag, lookups in sorted(by_tag.items()):
            if tag not in DETAIL:
                continue
            glyphs, contextual = set(), False
            for li in lookups:
                g, c = lookup_inputs(gsub, li)
                glyphs |= g
                contextual = contextual or c
            chars = sorted({ch for g in glyphs for ch in glyph_to_chars.get(g, [])})
            unmapped = sorted(g for g in glyphs if g not in glyph_to_chars)
            result["features"][tag] = {
                "glyphs": len(glyphs),
                "chars": "".join(chars),
                "unencoded_inputs": len(unmapped),
                "contextual": contextual,
            }
    return result, cmap, font


def check(result, font, cmap, spec):
    """--check smcp=abc...: report which of these characters the feature covers."""
    tag, _, wanted = spec.partition("=")
    feature = result["features"].get(tag)
    covered = set(feature["chars"]) if feature else set()
    missing = [ch for ch in wanted if ch not in covered]
    absent_from_font = [ch for ch in wanted if ord(ch) not in cmap]
    return {
        "feature": tag,
        "present": feature is not None,
        "covered": "".join(ch for ch in wanted if ch in covered),
        "missing": "".join(missing),
        "not_in_font": "".join(absent_from_font),
    }


def print_report(result, checks):
    print(f"# {result['name']}  ({result['file']})")
    if result["axes"]:
        axes = ", ".join(f"{t} {lo:g}-{hi:g} (default {d:g})" for t, (lo, d, hi) in result["axes"].items())
        print(f"axes: {axes}")
    else:
        print("axes: static font")
    print(f"italic: {'yes' if result['italic'] else 'no'}")
    for table, tags in result["tables"].items():
        print(f"{table}: {' '.join(tags) if tags else '(none)'}")
    print()
    print("Coverage of text features (substituted glyphs -> characters they belong to):")
    for tag, note in DETAIL.items():
        f = result["features"].get(tag)
        if f is None:
            if tag in ("onum", "lnum", "tnum", "smcp", "c2sc", "case"):
                print(f"  {tag}: ABSENT  ({note})")
            continue
        sample = f["chars"] if len(f["chars"]) <= 60 else f["chars"][:60] + "..."
        extra = []
        if f["unencoded_inputs"]:
            extra.append(f"{f['unencoded_inputs']} unencoded input glyphs")
        if f["contextual"]:
            extra.append("contextual")
        tail = f"  [{', '.join(extra)}]" if extra else ""
        print(f"  {tag}: {f['glyphs']} glyphs  {sample!s}{tail}")
    for c in checks:
        status = "absent" if not c["present"] else ("complete" if not c["missing"] else "incomplete")
        print()
        print(f"check {c['feature']}: {status}")
        print(f"  covered: {c['covered'] or '(nothing)'}")
        if c["missing"]:
            print(f"  missing: {c['missing']}")
        if c["not_in_font"]:
            print(f"  not in the font at all: {c['not_in_font']}")
    print()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fonts", nargs="+", help=".ttf, .otf, .woff or .woff2 files")
    ap.add_argument("--check", action="append", default=[], metavar="TAG=CHARS",
                    help="report which of CHARS the feature TAG covers, e.g. smcp=abcxyz")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    out = []
    for path in args.fonts:
        result, cmap, font = analyse(path)
        checks = [check(result, font, cmap, spec) for spec in args.check]
        if args.json:
            result["checks"] = checks
            out.append(result)
        else:
            print_report(result, checks)
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
