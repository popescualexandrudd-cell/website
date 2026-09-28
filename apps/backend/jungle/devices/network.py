"""The club's network (ADR-0012): the kiosks work only from it. The networks are the setting
`league.kiosk_networks` (restricted to the club's network at installation); in development
and the end-to-end tests `KIOSK_ALLOW_LOOPBACK` also allows this machine."""

from __future__ import annotations

import ipaddress

from django.conf import settings

from jungle.configuration.services import get_config


def in_club_network(ip: str) -> bool:
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False
    if settings.KIOSK_ALLOW_LOOPBACK and address.is_loopback:
        return True  # development and end-to-end tests only (refused in production)
    return any(
        address in ipaddress.ip_network(network) for network in get_config("league.kiosk_networks")
    )
