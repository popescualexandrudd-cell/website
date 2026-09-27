"""Bookings (§5): courts, lessons, the event room, Pilates classes and waiting lists.

Overlaps are impossible in the database itself (R-043, ADR-0004): exclusion constraints on
(resource, time range) and (coach, time range) for active bookings, and on (studio, time
range) for classes. Times are stored in UTC; grid, hours and days follow club time (ADR-0010).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import DateTimeRangeField, RangeOperators
from django.db import models


class TsTzRange(models.Func):
    function = "TSTZRANGE"
    output_field = DateTimeRangeField()


class SessionType(models.TextChoices):
    """R-044: shown on the court screen; changeable until check-in (Q29)."""

    OFFICIAL_MATCH = "official_match", "Meci oficial de ligă"
    TRAINING = "training", "Antrenament / amical"
    LESSON = "lesson", "Lecție cu antrenor"
    TOURNAMENT = "tournament", "Turneu"
    CHALLENGE = "challenge", "Provocare"
    FREE_RENTAL = "free_rental", "Închiriere liberă"
    EVENT = "event", "Eveniment"


class BookingStatus(models.TextChoices):
    CONFIRMED = "confirmed", "Confirmată"
    CANCELLED = "cancelled", "Anulată"
    COMPLETED = "completed", "Încheiată"
    NO_SHOW = "no_show", "Neprezentare"


class Source(models.TextChoices):
    ONLINE = "online", "Online"
    RECEPTION = "reception", "Recepție"
    KIOSK = "kiosk", "Chioșc"
    WAITLIST = "waitlist", "Lista de așteptare"
    EVENT_REQUEST = "event_request", "Cerere de eveniment"


class CancellationOutcome(models.TextChoices):
    """R-070 / R-071: what a cancellation means for the customer (money is Stage 4)."""

    FREE = "free", "Gratuită (eligibilă pentru recuperare)"
    CHARGED = "charged", "Se plătește"
    WAIVED = "waived", "Scutită de personal (cu motiv)"


class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    resource = models.ForeignKey(
        "locations.Resource", on_delete=models.PROTECT, related_name="bookings"
    )
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings"
    )
    coach = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="coached_bookings",
    )
    starts_at = models.DateTimeField("început")
    ends_at = models.DateTimeField("sfârșit")
    session_type = models.CharField("tip sesiune", max_length=20, choices=SessionType.choices)
    status = models.CharField(
        max_length=12, choices=BookingStatus.choices, default=BookingStatus.CONFIRMED
    )
    source = models.CharField(max_length=15, choices=Source.choices, default=Source.ONLINE)
    customer_type = models.CharField(max_length=12, default="standard")
    price_total = models.PositiveIntegerField("preț (bani)")
    price_breakdown = models.JSONField(default=dict)
    price_provisional = models.BooleanField(default=False, help_text="Tarif DE_STABILIT (Q21).")
    promoted_at = models.DateTimeField(null=True, blank=True, help_text="Intrat de pe listă.")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_outcome = models.CharField(
        max_length=10, choices=CancellationOutcome.choices, blank=True
    )
    cancellation_reason = models.CharField(max_length=250, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]
        verbose_name = "rezervare"
        verbose_name_plural = "rezervări"
        indexes = [models.Index(fields=["location", "starts_at"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")), name="booking_positive"
            ),
            ExclusionConstraint(
                name="booking_no_overlap",
                expressions=[
                    ("resource", RangeOperators.EQUAL),
                    (TsTzRange("starts_at", "ends_at"), RangeOperators.OVERLAPS),
                ],
                condition=~models.Q(status=BookingStatus.CANCELLED),
            ),
            ExclusionConstraint(
                name="booking_coach_no_overlap",
                expressions=[
                    ("coach", RangeOperators.EQUAL),
                    (TsTzRange("starts_at", "ends_at"), RangeOperators.OVERLAPS),
                ],
                condition=models.Q(coach__isnull=False) & ~models.Q(status=BookingStatus.CANCELLED),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.resource_id} {self.starts_at:%Y-%m-%d %H:%M}"


class WaitStatus(models.TextChoices):
    WAITING = "waiting", "În așteptare"
    PROMOTED = "promoted", "Intrat automat"
    CANCELLED = "cancelled", "Retras"
    EXPIRED = "expired", "Expirat"


class SlotWaitlistEntry(models.Model):
    """R-074: someone waiting for an exact slot of a resource."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    resource = models.ForeignKey("locations.Resource", on_delete=models.CASCADE)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    session_type = models.CharField(max_length=20, choices=SessionType.choices)
    priority = models.PositiveSmallIntegerField(
        default=0, help_text="Q4: abonații pot avea prioritate."
    )
    status = models.CharField(max_length=10, choices=WaitStatus.choices, default=WaitStatus.WAITING)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-priority", "created_at"]
        verbose_name = "loc pe lista de așteptare"
        verbose_name_plural = "lista de așteptare (terenuri)"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "resource", "starts_at"],
                condition=models.Q(status="waiting"),
                name="slot_waitlist_one_per_user",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.resource_id} {self.starts_at:%Y-%m-%d %H:%M} ({self.status})"


class ClassKind(models.TextChoices):
    """R-101."""

    BEGINNER = "beginner", "Începători"
    INTERMEDIATE = "intermediate", "Intermediar"
    ADVANCED = "advanced", "Avansat"
    PRIVATE = "private", "Ședință privată"
    DUO = "duo", "Duo"
    GROUP = "group", "Grup"
    RACKET_PLAYERS = "racket_players", "Reformer pentru jucători de tenis/padel"
    MOTHERS = "mothers", "Reformer pentru mămici"


class ClassStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Programată"
    CANCELLED = "cancelled", "Anulată"


class ClassSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    studio = models.ForeignKey(
        "locations.Resource", on_delete=models.PROTECT, related_name="class_sessions"
    )
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="taught_classes"
    )
    kind = models.CharField(max_length=20, choices=ClassKind.choices)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    capacity = models.PositiveSmallIntegerField()
    price_total = models.PositiveIntegerField("preț pe persoană (bani)")
    price_provisional = models.BooleanField(default=False)
    status = models.CharField(
        max_length=10, choices=ClassStatus.choices, default=ClassStatus.SCHEDULED
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]
        verbose_name = "clasă"
        verbose_name_plural = "clase"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")), name="class_positive"
            ),
            models.CheckConstraint(condition=models.Q(capacity__gte=1), name="class_capacity"),
            ExclusionConstraint(
                name="class_studio_no_overlap",
                expressions=[
                    ("studio", RangeOperators.EQUAL),
                    (TsTzRange("starts_at", "ends_at"), RangeOperators.OVERLAPS),
                ],
                condition=~models.Q(status=ClassStatus.CANCELLED),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.kind} {self.starts_at:%Y-%m-%d %H:%M}"


class EnrollmentStatus(models.TextChoices):
    ENROLLED = "enrolled", "Înscris"
    WAITLISTED = "waitlisted", "Pe lista de așteptare"
    CANCELLED = "cancelled", "Anulat"
    ATTENDED = "attended", "Prezent"
    NO_SHOW = "no_show", "Neprezentare"


ACTIVE_ENROLLMENT = (EnrollmentStatus.ENROLLED, EnrollmentStatus.WAITLISTED)


class ClassEnrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name="enrollments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(max_length=12, choices=EnrollmentStatus.choices)
    promoted_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_outcome = models.CharField(
        max_length=10, choices=CancellationOutcome.choices, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "înscriere la clasă"
        verbose_name_plural = "înscrieri la clase"
        constraints = [
            models.UniqueConstraint(
                fields=["session", "user"],
                condition=models.Q(status__in=["enrolled", "waitlisted", "attended", "no_show"]),
                name="class_one_active_enrollment",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.session_id} {self.user_id} ({self.status})"


class EventRequestStatus(models.TextChoices):
    PENDING = "pending", "În așteptare"
    APPROVED = "approved", "Aprobată"
    DECLINED = "declined", "Respinsă"


class EventRequest(models.Model):
    """Q34: the event room is requested online and confirmed by the manager."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    room = models.ForeignKey("locations.Resource", on_delete=models.PROTECT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    guests = models.PositiveSmallIntegerField()
    message = models.TextField(max_length=2000, blank=True)
    status = models.CharField(
        max_length=10, choices=EventRequestStatus.choices, default=EventRequestStatus.PENDING
    )
    booking = models.OneToOneField(Booking, on_delete=models.PROTECT, null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]
        verbose_name = "cerere de eveniment"
        verbose_name_plural = "cereri de evenimente"

    def __str__(self) -> str:
        return f"{self.room_id} {self.starts_at:%Y-%m-%d %H:%M} ({self.status})"
