#!/usr/bin/env python3
"""Metric-matched fallback @font-face for a web font, from the font files.

While a web font loads, text renders in a local fallback; when the web font
arrives, every line reflows if the two differ in width or vertical metrics.
This script reads both files and prints a fallback @font-face whose
size-adjust matches the web font's average character width (English letter
frequencies, word spaces included) and whose ascent, descent and line-gap
overrides reproduce the web font's line box.

Usage:
  python3 scripts/fallback-metrics.py fonts/Body.woff2 --fallback /System/Library/Fonts/Supplemental/Georgia.ttf --name Georgia
  python3 scripts/fallback-metrics.py Body.ttf --fallback Arial.ttf --name Arial --family "Body Fallback"

The fallback may be a collection (.ttc, as most macOS system faces are):
--font-number picks its face (default 0), and the output names the face used.

Then put the fallback family right after the web font:
  font-family: "Body", "Body Fallback", Georgia, serif;

Safari applies size-adjust but, as of 2026, not the ascent, descent and
line-gap overrides, so vertical metrics there stay the fallback's own.
Verify the result in a browser (scripts/test/fallback-metrics.test.js shows how).

Requires: pip install fonttools brotli   (brotli only for .woff2)
"""

import argparse
import os
import sys

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("fontTools is missing: pip install fonttools brotli")


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

# Relative frequency of letters in English text, plus the word space
# (about one character in six). Used to weight advance widths.
LETTERS = {
    "e": 12.7, "t": 9.1, "a": 8.2, "o": 7.5, "i": 7.0, "n": 6.7, "s": 6.3,
    "h": 6.1, "r": 6.0, "d": 4.3, "l": 4.0, "c": 2.8, "u": 2.8, "m": 2.4,
    "w": 2.4, "f": 2.2, "g": 2.0, "y": 2.0, "p": 1.9, "b": 1.5, "v": 0.98,
    "k": 0.77, "j": 0.15, "x": 0.15, "q": 0.095, "z": 0.074,
}
SPACE_SHARE = 0.18


def load(path, number=0):
    """(font, number, count); exits with a message when the file cannot be read."""
    if not os.path.exists(path):
        sys.exit(f"{path}: file not found")
    try:
        return open_face(path, number)
    except Exception as err:  # not a font, unreadable, or a face the collection lacks
        sys.exit(f"{path}: {err}")


def average_width(font):
    """Average advance of English text in em, at the font's default instance."""
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    total = sum(LETTERS.values())
    letters = 0.0
    for ch, weight in LETTERS.items():
        glyph = cmap.get(ord(ch))
        if glyph is None:
            sys.exit(f"{font.reader.file.name}: no glyph for {ch!r}")
        letters += hmtx[glyph][0] * weight / total
    space = hmtx[cmap[0x20]][0]
    return ((1 - SPACE_SHARE) * letters + SPACE_SHARE * space) / upm


def vertical_metrics(font):
    """Ascent, descent and line gap in em, as browsers read them."""
    upm = font["head"].unitsPerEm
    os2 = font["OS/2"]
    if os2.fsSelection & (1 << 7):  # USE_TYPO_METRICS
        asc, desc, gap = os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap
    else:
        hhea = font["hhea"]
        asc, desc, gap = hhea.ascent, hhea.descent, hhea.lineGap
    return asc / upm, abs(desc) / upm, gap / upm


def family_name(font):
    name = font["name"]
    return name.getDebugName(16) or name.getDebugName(1) or "Web font"


def pct(x):
    return f"{float(f'{x * 100:.4f}'):g}%"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("webfont", help="the web font file (.ttf, .otf, .woff, .woff2)")
    ap.add_argument("--fallback", required=True, help="the local fallback font file to match")
    ap.add_argument("--name", required=True, help="the fallback's local() name, for example Georgia")
    ap.add_argument("--family", help='name of the generated family (default: "<web font> Fallback")')
    ap.add_argument("--font-number", type=int, default=0, metavar="N",
                    help="face of the fallback to read when it is a .ttc or .otc collection (default 0)")
    args = ap.parse_args()

    web, _, _ = load(args.webfont)
    fallback, number, count = load(args.fallback, args.font_number)
    face = f" (face {number} of {count} in {os.path.basename(args.fallback)}: {family_name(fallback)})" if count > 1 else ""

    size_adjust = average_width(web) / average_width(fallback)
    ascent, descent, gap = vertical_metrics(web)
    family = args.family or f"{family_name(web)} Fallback"

    print(f"""/* Metric-matched fallback for {family_name(web)} using {args.name}{face}.
   size-adjust matches the average character width; the overrides reproduce
   the web font's line box. Safari applies size-adjust only. */
@font-face {{
  font-family: "{family}";
  src: local("{args.name}");
  size-adjust: {pct(size_adjust)};
  ascent-override: {pct(ascent / size_adjust)};
  descent-override: {pct(descent / size_adjust)};
  line-gap-override: {pct(gap / size_adjust)};
}}""")


if __name__ == "__main__":
    main()
