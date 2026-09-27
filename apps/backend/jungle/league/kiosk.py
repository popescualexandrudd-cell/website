"""Invariant 1 (§4.1, §12.1, ADR-0012): scores are entered and confirmed EXCLUSIVELY at a
registered League Kiosk, and the server checks it every time: the device (a League Kiosk,
active, of the booking's club) and the network it calls from. Any other source (website,
phone, admin, AI, another device) is refused and the attempt is logged.

The kiosk's own authentication (client certificate and device token) is added in Stage 7;
the device reaches these services already identified.
"""

from __future__ import annotations

import ipaddress
import uuid

from django.http import HttpRequest

from jungle.audit import services as audit
from jungle.configuration.services import get_config
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip
from jungle.devices.models import Device, DeviceKind


def in_club_network(ip: str) -> bool:
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(
        address in ipaddress.ip_network(network) for network in get_config("league.kiosk_networks")
    )


def _problem(device: Device | None, ip: str, location_id: uuid.UUID | None) -> str:
    if device is None:
        return "no_device"
    if device.kind != DeviceKind.LEAGUE_KIOSK:
        return "not_a_league_kiosk"
    if not device.is_active:
        return "device_inactive"
    if location_id is not None and device.location_id != location_id:
        return "other_club"
    if not in_club_network(ip):
        return "outside_club_network"
    return ""


def check(
    request: HttpRequest, device: Device | None, location_id: uuid.UUID | None, action: str
) -> Device:
    """Returns the kiosk, read again from the database (a deactivation counts at once)."""
    current = Device.objects.filter(pk=device.pk).first() if device is not None else None
    ip = client_ip(request) or ""
    problem = _problem(current, ip, location_id)
    if problem or current is None:
        audit.record(
            audit.actor_from_request(request),
            "league.score_refused",
            after={
                "action": action,
                "problem": problem or "no_device",
                "device": str(device.pk) if device is not None else None,
                "ip": ip,
            },
        )
        raise DomainError(ErrorCode.LEAGUE_SCORE_KIOSK_ONLY, status=403)
    return current
