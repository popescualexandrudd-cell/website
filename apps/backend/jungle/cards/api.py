"""Card endpoints: the member's own card (QR, replacement, Diamond emblem) and the staff
tools (reissue, block, print queue and the CR80 PDF)."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest, HttpResponse
from ninja import Field, Router, Schema, Status

from jungle.cards import services, wallet_apple, wallet_google
from jungle.cards.models import MemberCard, PhysicalCardRequest, PrintStatus
from jungle.cards.printing import qr_svg
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import errors
from jungle.core.security import session_auth

me_router = Router(tags=["cards"], auth=session_auth)
public_router = Router(tags=["cards"])
staff_router = Router(tags=["staff: cards"], auth=session_auth)


class CardOut(Schema):
    id: uuid.UUID
    number: str
    status: str
    issued_at: datetime
    qr_svg: str = Field(description="Codul QR (SVG). Conține doar un cod aleatoriu (R-022).")
    apple_wallet: bool = Field(description="Apple Wallet e activ (certificatul clubului, Q24)")
    google_wallet: bool = Field(description="Google Wallet e activ (emitentul clubului, Q24)")


class GoogleWalletOut(Schema):
    url: str


class DiamondOut(Schema):
    request_id: uuid.UUID
    emblem: str
    status: str


class EmblemIn(Schema):
    emblem: str = Field(min_length=1, max_length=30)


class EmblemsOut(Schema):
    emblems: list[str]


class ReissueIn(Schema):
    user_id: uuid.UUID
    location_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=250)
    print_card: bool = True


class StaffCardOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    number: str
    status: str
    issued_at: datetime
    revoked_at: datetime | None
    revoke_reason: str


class BlockIn(Schema):
    location_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=250)


class QueueItemOut(Schema):
    id: uuid.UUID
    card_number: str
    name: str
    reason: str
    emblem: str
    status: str
    created_at: datetime


class PrintIn(Schema):
    location_id: uuid.UUID
    request_ids: list[uuid.UUID] = Field(min_length=1, max_length=200)


class PrintStatusIn(Schema):
    location_id: uuid.UUID
    status: PrintStatus


def card_out(card: MemberCard) -> CardOut:
    return CardOut(
        id=card.id,
        number=card.number,
        status=card.status,
        issued_at=card.issued_at,
        qr_svg=qr_svg(card.token),
        apple_wallet=wallet_apple.enabled(),
        google_wallet=wallet_google.enabled(),
    )


def queue_item(row: PhysicalCardRequest) -> QueueItemOut:
    user = row.card.user
    return QueueItemOut(
        id=row.id,
        card_number=row.card.number,
        name=f"{user.first_name} {user.last_name}",
        reason=row.reason,
        emblem=row.emblem,
        status=row.status,
        created_at=row.created_at,
    )


# ---------------------------------------------------------------- the member
@me_router.get("/mine", response={200: CardOut, **errors(401)})
def my_card(request: HttpRequest) -> CardOut:
    """R-020: the member's card; created on the first visit."""
    return card_out(services.my_card(request))


@me_router.post("/mine/replace", response={201: CardOut, **errors(401)})
def replace(request: HttpRequest) -> Status[CardOut]:
    """R-022: lost card — the old code is blocked at once and a new card is issued."""
    return Status(201, card_out(services.replace_my_card(request)))


@me_router.get("/mine/apple.pkpass", response={200: bytes, **errors(401, 503)})
def apple_pass(request: HttpRequest) -> HttpResponse:
    """R-020: the card for Apple Wallet (opens "Add to Wallet" on an iPhone)."""
    if not wallet_apple.enabled():
        raise DomainError(ErrorCode.WALLET_UNAVAILABLE, status=503)
    card = services.my_card(request)
    response = HttpResponse(wallet_apple.build_pkpass(card), content_type=wallet_apple.CONTENT_TYPE)
    response["Content-Disposition"] = 'attachment; filename="jungle-padel.pkpass"'
    response["Cache-Control"] = "no-store"
    return response


@me_router.get("/mine/google", response={200: GoogleWalletOut, **errors(401, 503)})
def google_link(request: HttpRequest) -> GoogleWalletOut:
    """R-020: the "Add to Google Wallet" link."""
    if not wallet_google.enabled():
        raise DomainError(ErrorCode.WALLET_UNAVAILABLE, status=503)
    return GoogleWalletOut(url=wallet_google.save_url(services.my_card(request)))


@me_router.get("/mine/diamond", response={200: DiamondOut | None, **errors(401)})
def my_diamond(request: HttpRequest) -> DiamondOut | None:
    offer = services.my_diamond_offer(request)
    return DiamondOut(**offer.__dict__) if offer else None


@me_router.post("/mine/emblem", response={200: DiamondOut, **errors(400, 401, 404, 422)})
def choose_emblem(request: HttpRequest, payload: EmblemIn) -> DiamondOut:
    """R-024, Q1: the Diamond card's jungle emblem, from the predefined list."""
    row = services.choose_emblem(request, payload.emblem)
    return DiamondOut(request_id=row.id, emblem=row.emblem, status=row.status)


@public_router.get("/emblems", response=EmblemsOut, auth=None)
def emblems(request: HttpRequest) -> EmblemsOut:
    return EmblemsOut(emblems=services.emblems())


# ---------------------------------------------------------------- staff
@staff_router.post(
    "/cards/reissue", response={201: StaffCardOut, **errors(400, 401, 403, 404, 422)}
)
def reissue(request: HttpRequest, payload: ReissueIn) -> Status[StaffCardOut]:
    card = services.staff_reissue(
        request, payload.user_id, payload.location_id, payload.reason, payload.print_card
    )
    return Status(201, StaffCardOut.from_orm(card))


@staff_router.post(
    "/cards/{card_id}/block", response={200: StaffCardOut, **errors(400, 401, 403, 404, 422)}
)
def block(request: HttpRequest, card_id: uuid.UUID, payload: BlockIn) -> StaffCardOut:
    return StaffCardOut.from_orm(
        services.block_card(request, card_id, payload.location_id, payload.reason)
    )


@staff_router.get("/cards/print-queue", response={200: list[QueueItemOut], **errors(401, 403, 422)})
def print_queue(request: HttpRequest, location_id: uuid.UUID) -> list[QueueItemOut]:
    return [queue_item(row) for row in services.print_queue(request, location_id)]


@staff_router.post("/cards/print.pdf", response={200: bytes, **errors(401, 403, 409, 422)})
def print_pdf(request: HttpRequest, payload: PrintIn) -> HttpResponse:
    """R-021: one CR80 page per card (85.60 × 53.98 mm), ready for the club's card printer."""
    pdf = services.print_pdf(request, payload.location_id, payload.request_ids)
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="carduri-jungle-padel.pdf"'
    response["Cache-Control"] = "no-store"
    return response


@staff_router.post(
    "/cards/print-queue/{request_id}/status",
    response={200: QueueItemOut, **errors(401, 403, 404, 409, 422)},
)
def set_status(request: HttpRequest, request_id: uuid.UUID, payload: PrintStatusIn) -> QueueItemOut:
    row = services.set_print_status(request, request_id, payload.location_id, payload.status)
    return queue_item(row)
