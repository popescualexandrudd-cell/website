"""The printable card (R-021): one CR80 page (85.60 × 53.98 mm) per card, in the club's
"Night & Brass" identity, with the QR code, the name and the card number. The club prints
it on its own card printer.

Colours come from packages/design-tokens (B4); `tests/test_cards.py` checks they match.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path

import segno
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

CARD_SIZE = (85.60 * mm, 53.98 * mm)
NIGHT_900 = "#0A1320"
NIGHT_600 = "#1E3148"
BONE_50 = "#EEE7DA"
BONE_400 = "#9AA6B3"
BRASS_400 = "#C6A15B"

FONTS = Path(__file__).parent / "fonts"
_registered = False


def _fonts() -> None:
    global _registered
    if not _registered:
        pdfmetrics.registerFont(TTFont("Card-Medium", str(FONTS / "InstrumentSans-Medium.ttf")))
        pdfmetrics.registerFont(TTFont("Card-Bold", str(FONTS / "InstrumentSans-Bold.ttf")))
        _registered = True


def qr(token: str) -> segno.QRCode:
    """Error correction M: still readable with a scratch on a plastic card."""
    return segno.make_qr(token, error="m")


def qr_svg(token: str) -> str:
    buffer = io.BytesIO()
    qr(token).save(
        buffer, kind="svg", scale=8, border=2, dark="#000000", light="#FFFFFF", xmldecl=False
    )
    return buffer.getvalue().decode()


@dataclass(frozen=True)
class PrintableCard:
    first_name: str
    last_name: str
    number: str
    token: str
    subtitle: str = "Membru"  # e.g. "Diamant · Jaguar" for a Diamond card (R-024)


def _fit(text: str, font: str, size: float, width: float) -> float:
    """The font size that makes `text` fit in `width` (long names shrink, never overflow)."""
    while size > 6 and pdfmetrics.stringWidth(text, font, size) > width:
        size -= 0.5
    return size


def _draw(c: canvas.Canvas, card: PrintableCard) -> None:
    width, height = CARD_SIZE
    c.setFillColor(NIGHT_900)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(BRASS_400)
    c.rect(0, height - 2.2 * mm, width, 1.0 * mm, stroke=0, fill=1)

    c.setFillColor(BONE_50)
    c.setFont("Card-Bold", 10)
    c.drawString(5 * mm, height - 9 * mm, "JUNGLE PADEL")
    c.setFillColor(BRASS_400)
    c.setFont("Card-Medium", 6.5)
    c.drawString(5 * mm, height - 13 * mm, card.subtitle.upper())

    text_width = width - 5 * mm - 33 * mm
    name_font = _fit(card.first_name, "Card-Bold", 12, text_width)
    c.setFillColor(BONE_50)
    c.setFont("Card-Bold", name_font)
    c.drawString(5 * mm, 15 * mm, card.first_name)
    last_font = _fit(card.last_name, "Card-Bold", 12, text_width)
    c.setFont("Card-Bold", last_font)
    c.drawString(5 * mm, 10 * mm, card.last_name)
    c.setFillColor(BONE_400)
    c.setFont("Card-Medium", 6.5)
    c.drawString(5 * mm, 5 * mm, card.number)

    # The QR code on a white square (scanners need the contrast).
    code = qr(card.token)
    size = 28 * mm
    x0, y0 = width - size - 4 * mm, (height - size) / 2 - 2 * mm
    c.setFillColor("#FFFFFF")
    c.roundRect(
        x0 - 1.2 * mm, y0 - 1.2 * mm, size + 2.4 * mm, size + 2.4 * mm, 1.2 * mm, stroke=0, fill=1
    )
    matrix = list(code.matrix)
    cell = size / len(matrix)
    c.setFillColor("#000000")
    for row_index, row in enumerate(matrix):
        for col_index, dark in enumerate(row):
            if dark:
                c.rect(
                    x0 + col_index * cell,
                    y0 + size - (row_index + 1) * cell,
                    cell,
                    cell,
                    stroke=0,
                    fill=1,
                )
    c.setStrokeColor(NIGHT_600)
    c.setLineWidth(0.3)
    c.line(5 * mm, 20.5 * mm, width - size - 8 * mm, 20.5 * mm)


def cards_pdf(cards: list[PrintableCard]) -> bytes:
    """One page per card, CR80 size, fonts embedded (ă, â, î, ș, ț print correctly)."""
    if not cards:
        raise ValueError("nothing to print")
    _fonts()
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=CARD_SIZE, invariant=1)
    c.setTitle("Jungle Padel — carduri de membru")
    c.setAuthor("Jungle Padel")
    for card in cards:
        _draw(c, card)
        c.showPage()
    c.save()
    return buffer.getvalue()
