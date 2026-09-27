"""Build the static TTF used on the printable card (R-021): Instrument Sans (OFL), the
Latin and Latin-Extended (ă â î ș ț) files merged, at weights 500 and 700.

Run from the repository root (needs the web app's node_modules):
    uvx --with brotli --from fonttools python apps/backend/scripts/build_card_font.py
"""

from __future__ import annotations

from pathlib import Path

from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = Path("apps/web/node_modules/@fontsource-variable/instrument-sans/files")
OUT = Path("apps/backend/jungle/cards/fonts")


def build(weight: int, name: str) -> None:
    parts = []
    for part in ("latin", "latin-ext"):
        font = TTFont(SRC / f"instrument-sans-{part}-wght-normal.woff2")
        axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
        axes["wght"] = weight
        static = instancer.instantiateVariableFont(font, axes)
        static.flavor = None
        path = OUT / f"_{part}.ttf"
        static.save(path)
        parts.append(str(path))
    merged = Merger().merge(parts)
    merged.save(OUT / name)
    for p in parts:
        Path(p).unlink()


build(500, "InstrumentSans-Medium.ttf")
build(700, "InstrumentSans-Bold.ttf")
