"""LP rounding (§6.6, invariant 9): to the nearest integer, halves away from zero.

Python's built-in round() rounds halves to even (round(2.5) == 2), so it is never used for LP.
"""

from decimal import ROUND_HALF_UP, Decimal


def round_half_away(value: float) -> int:
    """2.5 → 3, -2.5 → -3, 2.4 → 2. Works on the exact binary value of the float."""
    return int(Decimal(value).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def round_one_decimal(value: float) -> float:
    """Displayed level (§6.3): one decimal, halves away from zero."""
    return float(Decimal(repr(value)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
