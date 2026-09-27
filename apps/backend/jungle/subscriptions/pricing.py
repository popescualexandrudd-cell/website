"""The package price (R-084, ADR-0009 §6), in pure integer arithmetic.

price = Σ(monthly price of each sport at its intensity) × months
        × (1 − bundle discount) × (1 − period discount) × (1 − corporate discount)

Discounts are whole percents applied one after another (multiplicatively). The result is
rounded once, at the end, to the nearest whole leu (50 bani and above round up). No float
is ever involved: the exact value is kept as a fraction until the rounding.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PackagePrice:
    monthly_sum: int  # bani, Σ of the sports' monthly prices
    months: int
    gross: int  # bani, before discounts
    discounts: tuple[int, ...]  # whole percents, in the order applied
    total: int  # bani, rounded to a whole leu
    rounding: int  # total − exact value, in bani (between −50 and +50)


def round_to_leu(numerator: int, denominator: int) -> int:
    """The fraction numerator/denominator (bani) rounded to whole lei, half up, in bani."""
    if numerator < 0 or denominator <= 0:
        raise ValueError("prices are non-negative")
    return (numerator + 50 * denominator) // (100 * denominator) * 100


def package_price(monthly_prices: list[int], months: int, discounts: list[int]) -> PackagePrice:
    if months < 1 or any(p < 0 for p in monthly_prices) or any(not 0 <= d <= 90 for d in discounts):
        raise ValueError("invalid package")
    monthly_sum = sum(monthly_prices)
    gross = monthly_sum * months
    numerator, denominator = gross, 1
    for d in discounts:
        numerator *= 100 - d
        denominator *= 100
    total = round_to_leu(numerator, denominator)
    # The rounding difference, itself rounded to whole bani for display.
    rounding = (total * denominator - numerator + denominator // 2) // denominator
    return PackagePrice(monthly_sum, months, gross, tuple(discounts), total, rounding)
