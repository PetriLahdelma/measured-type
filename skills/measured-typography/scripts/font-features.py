#!/usr/bin/env python3
"""List the OpenType features a font really has and what they cover.

A feature tag in GSUB is not proof that the feature does anything useful:
a font can ship `case` that remaps three combining marks, or `smcp` that
covers A-Z but no accented letters. This script lists the tags per table
and, for the features that matter in text typesetting, counts the glyphs
each one substitutes and which characters those glyphs belong to.

`--check TAG=CHARS` works for any GSUB or GPOS tag (`smcp`, `ss02`, `kern`).
For figure features it first reports the default figures, because `tnum` on
a font whose default digits are already tabular has nothing left to do.

Usage:
  python3 scripts/font-features.py path/to/font.woff2 [more fonts...]
  python3 scripts/font-features.py font.ttf --check smcp=abcdefghijklmnopqrstuvwxyzäöå
  python3 scripts/font-features.py font.ttf --json
  python3 scripts/font-features.py /System/Library/Fonts/Menlo.ttc --font-number 1
  python3 scripts/font-features.py text.woff2 heading.woff2 --metrics

`--metrics` adds each face's proportions per em (x-height, cap height,
ascender, descender, average a-z width) and the matching font-size-adjust;
with several files it compares each to the first, the anchor (spec 0032).

A collection (.ttc, .otc) is read at face 0 unless --font-number picks another;
the report names the face it used.

Requires fontTools: pip install fonttools brotli in a virtual environment (brotli only for .woff2)
"""

import argparse
import json
import sys

try:
    from fontTools.ttLib import TTFont
except ImportError as err:  # spec 0025 R9: say what failed, and how to install without a bare pip
    sys.exit(
        f"fontTools is missing or broken for {sys.executable} ({err}). Install it in a virtual environment: "
        "python3 -m venv .venv && .venv/bin/pip install fonttools brotli, then run this script with "
        ".venv/bin/python (and set MT_PYTHON to it for the tests)"
    )


def collection_size(path):
    """Faces in a .ttc/.otc collection, or None for a single font."""
    with open(path, "rb") as fh:
        if fh.read(4) != b"ttcf":
            return None
    from fontTools.ttLib import TTCollection
    return len(TTCollection(path, lazy=True).fonts)


def open_face(path, number=0, **kw):
    """The font at path; in a collection, face `number` (default 0). Returns (font, number, count)."""
    count = collection_size(path)
    if count is None:
        if number:
            raise ValueError(f"not a font collection, so --font-number {number} does not apply")
        return TTFont(path, **kw), 0, 1
    if not 0 <= number < count:
        raise ValueError(f"the collection has {count} faces; --font-number must be 0 to {count - 1}")
    return TTFont(path, fontNumber=number, **kw), number, count

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


def coverage_glyphs(cov):
    return set(getattr(cov, "glyphs", None) or []) if cov is not None else set()


def gpos_inputs(gpos, lookup_index, seen=None):
    """Glyph names a GPOS lookup positions (first glyph of pairs, marks and bases)."""
    seen = seen if seen is not None else set()
    if lookup_index in seen:
        return set()
    seen.add(lookup_index)
    lookup = gpos.LookupList.Lookup[lookup_index]
    glyphs = set()
    for st in lookup.SubTable:
        st = unwrap(st)
        kind = st.LookupType if hasattr(st, "LookupType") else lookup.LookupType
        if kind in (1, 2, 3):  # single, pair, cursive
            glyphs |= coverage_glyphs(getattr(st, "Coverage", None))
        elif kind in (4, 5, 6):  # mark to base, ligature, mark
            for attr in ("MarkCoverage", "BaseCoverage", "LigatureCoverage", "Mark1Coverage", "Mark2Coverage"):
                glyphs |= coverage_glyphs(getattr(st, attr, None))
        elif kind in (7, 8):  # contextual, chaining: follow nested lookups
            for li in nested_lookups(st, "PosLookupRecord"):
                glyphs |= gpos_inputs(gpos, li, seen)
    return glyphs


def nested_lookups(st, record_attr):
    found = set()
    for attr in ("PosRuleSet", "ChainPosRuleSet", "SubRuleSet", "ChainSubRuleSet",
                 "PosClassSet", "ChainPosClassSet", "SubClassSet", "ChainSubClassSet"):
        for rs in getattr(st, attr, None) or []:
            if rs is None:
                continue
            for rule_attr in ("PosRule", "ChainPosRule", "SubRule", "ChainSubRule",
                              "PosClassRule", "ChainPosClassRule", "SubClassRule", "ChainSubClassRule"):
                for rule in getattr(rs, rule_attr, None) or []:
                    for rec in getattr(rule, record_attr, None) or []:
                        found.add(rec.LookupListIndex)
    for rec in getattr(st, record_attr, None) or []:
        found.add(rec.LookupListIndex)
    return found


def default_figures(font, cmap):
    """How the default digits 0-9 are drawn: tabular or proportional, lining or oldstyle."""
    names = [cmap.get(ord(d)) for d in "0123456789"]
    if not all(names):
        return None
    hmtx = font["hmtx"]
    widths = {hmtx[n][0] for n in names}
    from fontTools.pens.boundsPen import BoundsPen
    glyphset = font.getGlyphSet()
    tops, bottoms = [], []
    for n in names:
        pen = BoundsPen(glyphset)
        glyphset[n].draw(pen)
        if pen.bounds:
            tops.append(pen.bounds[3])
            bottoms.append(pen.bounds[1])
    os2 = font["OS/2"]
    cap = getattr(os2, "sCapHeight", 0) or 0
    style = None
    if cap and tops:
        # Lining figures stand near cap height and sit on the baseline; oldstyle
        # figures vary: 0 1 2 at x-height, 3 4 5 7 9 descending, 6 8 ascending.
        spread = max(tops) - min(tops) + max(bottoms) - min(bottoms)
        style = "oldstyle" if spread > 0.25 * cap else "lining"
    return {"tabular": len(widths) == 1, "style": style, "advances": sorted(widths)}


FIGURE_DEFAULTS = {
    "tnum": lambda f: f["tabular"],
    "pnum": lambda f: not f["tabular"],
    "lnum": lambda f: f["style"] == "lining",
    "onum": lambda f: f["style"] == "oldstyle",
}


def analyse(path, number=0):
    font, number, count = open_face(path, number, lazy=False)
    cmap = font.getBestCmap() or {}
    glyph_to_chars = {}
    for code, name in cmap.items():
        glyph_to_chars.setdefault(name, []).append(chr(code))

    result = {"file": path, "tables": {}, "features": {}}

    name_table = font["name"]
    family = name_table.getDebugName(16) or name_table.getDebugName(1)
    style = name_table.getDebugName(17) or name_table.getDebugName(2)
    result["name"] = f"{family} {style}".strip()
    result["face"] = {"number": number, "count": count, "name": result["name"]}

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

    result["positioning"] = {}
    if "GPOS" in font:
        gpos = font["GPOS"].table
        by_tag = {}
        for rec in gpos.FeatureList.FeatureRecord:
            by_tag.setdefault(rec.FeatureTag, set()).update(rec.Feature.LookupListIndex)
        for tag, lookups in sorted(by_tag.items()):
            glyphs = set()
            for li in lookups:
                glyphs |= gpos_inputs(gpos, li)
            chars = sorted({ch for g in glyphs for ch in glyph_to_chars.get(g, [])})
            result["positioning"][tag] = {"glyphs": len(glyphs), "chars": "".join(chars)}

    result["default_figures"] = default_figures(font, cmap)
    return result, cmap, font


def face_metrics(font, cmap):
    """Proportions per em from the outlines (spec 0032 N3): x-height, cap height, ascender, descender
    from the bounds of x, H, d and p, and the average advance of a to z."""
    from fontTools.pens.boundsPen import BoundsPen

    upm = font["head"].unitsPerEm
    glyphs = font.getGlyphSet()

    def bounds(ch):
        name = cmap.get(ord(ch))
        if not name or name not in glyphs:
            return None
        pen = BoundsPen(glyphs)
        glyphs[name].draw(pen)
        return pen.bounds

    def edge(ch, i):
        b = bounds(ch)
        return round(b[i] / upm, 3) if b else None

    widths = [glyphs[cmap[ord(c)]].width for c in "abcdefghijklmnopqrstuvwxyz" if ord(c) in cmap]
    m = {
        "x_height": edge("x", 3),
        "cap_height": edge("H", 3),
        "ascender": edge("d", 3),
        "descender": edge("p", 1),
        "avg_lowercase_width": round(sum(widths) / len(widths) / upm, 3) if widths else None,
    }
    m["x_to_cap"] = round(m["x_height"] / m["cap_height"], 3) if m["x_height"] and m["cap_height"] else None
    return m


PAIR_LABELS = {"matched": "matched", "contrasted": "contrasted", "neither": "neither matched nor contrasted"}


def pairing(anchor, other):
    """Each proportion against the anchor face, and the x-height relation in MT-PAIR-XHEIGHT's bands."""
    diff = {}
    for key in ("x_height", "cap_height", "ascender", "descender", "avg_lowercase_width"):
        a, b = anchor["metrics"].get(key), other["metrics"].get(key)
        diff[key] = round((b / a - 1) * 100) if a and b else None
    x = abs(diff["x_height"]) if diff["x_height"] is not None else None
    relation = None if x is None else "matched" if x <= 5 else "contrasted" if x >= 15 else "neither"
    return {"anchor": anchor["name"], "x_height": relation, "percent": diff}


def check(result, font, cmap, spec):
    """--check TAG=CHARS: report which of these characters the feature covers."""
    tag, sep, wanted = spec.partition("=")
    if not sep or not tag:
        sys.exit(f"--check needs TAG=CHARS, got {spec!r}")
    feature = result["features"].get(tag) or result["positioning"].get(tag)
    covered = set(feature["chars"]) if feature else set()
    figures = result.get("default_figures")
    by_default = None
    if tag in FIGURE_DEFAULTS and figures and figures["style"] is not None:
        by_default = FIGURE_DEFAULTS[tag](figures)
    return {
        "feature": tag,
        "table": "GSUB" if tag in result["features"] else "GPOS" if tag in result["positioning"] else None,
        "present": feature is not None,
        "default_already": by_default,
        "covered": "".join(ch for ch in wanted if ch in covered),
        "missing": "".join(ch for ch in wanted if ch not in covered),
        "not_in_font": "".join(ch for ch in wanted if ord(ch) not in cmap),
    }


def print_report(result, checks):
    print(f"# {result['name']}  ({result['file']})")
    if result["face"]["count"] > 1:
        print(f"face {result['face']['number']} of {result['face']['count']} in the collection (--font-number picks another)")
    if result["axes"]:
        axes = ", ".join(f"{t} {lo:g}-{hi:g} (default {d:g})" for t, (lo, d, hi) in result["axes"].items())
        print(f"axes: {axes}")
    else:
        print("axes: static font")
    print(f"italic: {'yes' if result['italic'] else 'no'}")
    fig = result.get("default_figures")
    if fig:
        print(f"default figures: {'tabular' if fig['tabular'] else 'proportional'} {fig['style'] or '(style unknown)'}")
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
    others = [t for t in result["features"] if t not in DETAIL]
    if others:
        print("  other substitutions: " + ", ".join(f"{t} {result['features'][t]['glyphs']}" for t in others))
    if result["positioning"]:
        print("Positioning (GPOS, glyphs adjusted): "
              + ", ".join(f"{t} {p['glyphs']}" for t, p in result["positioning"].items()))
    for c in checks:
        if not c["present"]:
            status = "absent"
        elif not c["missing"]:
            status = "complete"
        else:
            status = "incomplete"
        if c["default_already"] and status != "complete":
            status = f"not needed: the default figures already are what {c['feature']} selects"
        elif c["default_already"] is False and c["feature"] in FIGURE_DEFAULTS and status == "absent":
            status = "absent, and the default figures are not what it would select"
        print()
        print(f"check {c['feature']}: {status}" + (f"  ({c['table']})" if c["table"] else ""))
        if c["default_already"]:
            print(f"  the default glyphs for {c['covered'] + c['missing']} already have this form")
            continue
        print(f"  covered: {c['covered'] or '(nothing)'}")
        if c["missing"]:
            print(f"  missing: {c['missing']}")
            if c["present"]:
                f = result["features"].get(c["feature"]) or result["positioning"].get(c["feature"])
                maps = f["chars"] or "no encoded characters"
                print(f"  the feature maps: {maps if len(maps) <= 60 else maps[:60] + '...'}")
        if c["not_in_font"]:
            print(f"  not in the font at all: {c['not_in_font']}")
    print()


def print_metrics(result):
    m = result["metrics"]
    fmt = lambda v: "n/a" if v is None else f"{v:.3f}"
    print(f"  metrics per em: x-height {fmt(m['x_height'])}, cap height {fmt(m['cap_height'])}, ascender {fmt(m['ascender'])}, "
          f"descender {fmt(m['descender'])}, average a-z width {fmt(m['avg_lowercase_width'])}")
    if m["x_height"]:
        print(f"  x-height / cap height {fmt(m['x_to_cap'])}; to match this x-height in another face: font-size-adjust: ex-height {m['x_height']:.3f}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fonts", nargs="+", help=".ttf, .otf, .woff or .woff2 files")
    ap.add_argument("--check", action="append", default=[], metavar="TAG=CHARS",
                    help="report which of CHARS the feature TAG covers, e.g. smcp=abcxyz")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--metrics", action="store_true",
                    help="proportions per em, compared to the first file when there are several")
    ap.add_argument("--font-number", type=int, default=0, metavar="N",
                    help="face to read in a .ttc or .otc collection (default 0)")
    args = ap.parse_args()

    out = []
    for path in args.fonts:
        try:
            result, cmap, font = analyse(path, args.font_number)
        except Exception as err:  # unreadable or not a font
            sys.exit(f"{path}: {err}")
        checks = [check(result, font, cmap, spec) for spec in args.check]
        if args.metrics:
            result["metrics"] = face_metrics(font, cmap)
            if out:
                result["pairing"] = pairing(out[0], result)
        out.append(result)
        if args.json:
            result["checks"] = checks
        else:
            print_report(result, checks)
            if args.metrics:
                print_metrics(result)
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    elif args.metrics and len(out) > 1:
        print(f"\nCompared to the anchor, {out[0]['name']} (the text face goes first):")
        for r in out[1:]:
            p = r["pairing"]
            sign = lambda n: "n/a" if n is None else f"{'+' if n >= 0 else '−'}{abs(n)}%"
            pct = p["percent"]
            relation = PAIR_LABELS.get(p["x_height"], "not measured")
            print(f"  {r['name']}: x-height {relation} ({sign(pct['x_height'])}), cap height {sign(pct['cap_height'])}, "
                  f"ascender {sign(pct['ascender'])}, descender {sign(pct['descender'])}, average a-z width {sign(pct['avg_lowercase_width'])}")
        print("  x-height bands as MT-PAIR-XHEIGHT: within 5% matched, 15% or more contrasted; between them reads as a mistake.")


if __name__ == "__main__":
    main()
