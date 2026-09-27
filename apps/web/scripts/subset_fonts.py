"""Build the small self-hosted font files in public/fonts (OFL fonts: subsetting is allowed).

Run from apps/web:  uvx --with brotli --from fonttools python scripts/subset_fonts.py
Source: @fontsource-variable/inter (devDependency). Latin + a tiny file
with the Romanian letters (ă ș ț), served with unicode-range; weights limited to those used.
"""

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = "node_modules/@fontsource-variable/{f}/files/{f}-{s}-wght-normal.woff2"
LATIN = [
    *range(0x20, 0x7F),
    *range(0xA0, 0x100),
    0x2013,
    0x2014,
    *range(0x2018, 0x201F),
    0x2022,
    0x2026,
    0x2039,
    0x203A,
    0x20AC,
    0x2192,
    0x2726,
]
ROMANIAN = [0x102, 0x103, 0x15E, 0x15F, 0x162, 0x163, 0x218, 0x219, 0x21A, 0x21B]
WEIGHTS = {"inter": (400, 700)}

for family, (lo, hi) in WEIGHTS.items():
    for part, source, codes in (("latin", "latin", LATIN), ("ro", "latin-ext", ROMANIAN)):
        font = TTFont(SRC.format(f=family, s=source), lazy=False)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=codes)
        sub.subset(font)
        font = instancer.instantiateVariableFont(font, {"wght": (lo, hi)})
        out = f"public/fonts/{family}-{part}.woff2"
        font.flavor = "woff2"
        font.save(out)
        missing = [hex(c) for c in codes if c not in font.getBestCmap()]
        print(out, "missing:", missing[:8])
