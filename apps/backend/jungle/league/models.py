"""The league in the database (§6, ADR-0008).

The league engine (`packages/league-engine`) is a pure function. Here it becomes durable:

- every change to the league is an append-only `LeagueEvent` (a player registers, a match is
  applied, a bonus, a day of decay, a match cancelled);
- the engine state after the events is cached in `LeagueSnapshot`; it can always be rebuilt
  from the season's base state and its events (replay, §6.16), with an identical result;
- each computation produces immutable `RatingRecord` rows (values before and after);
- `Standing` is a projection for fast reading, rewritten after every change.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class SeasonStatus(models.TextChoices):
    PLANNED = "planned", "Planificat"
    ACTIVE = "active", "În desfășurare"
    CLOSED = "closed", "Încheiat"


class LeagueSeason(models.Model):
    """§6.13: three months by default; "Season 0 – Calibration" has no prizes (Q27)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="league_seasons"
    )
    number = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=120)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(
        max_length=10, choices=SeasonStatus.choices, default=SeasonStatus.PLANNED
    )
    is_calibration = models.BooleanField(default=False, help_text="Sezonul 0: fără premii (Q27).")
    config = models.JSONField(
        default=dict, help_text="Valorile ligii fixate la începutul sezonului."
    )
    base_state = models.JSONField(null=True, blank=True, help_text="Starea ligii la început.")
    rewards = models.JSONField(
        default=dict, blank=True, help_text="Regulile recompenselor, fixate la început (LG-122)."
    )
    activated_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
        verbose_name = "sezon"
        verbose_name_plural = "sezoane"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")), name="season_positive"
            ),
            models.UniqueConstraint(
                fields=["location"], condition=models.Q(status="active"), name="one_active_season"
            ),
            models.UniqueConstraint(fields=["location", "number"], name="season_number_once"),
        ]

    def __str__(self) -> str:
        return self.name


class LevelQuestionnaire(models.Model):
    """R-003, §6.4: the level questionnaire, validated by a coach before the first match."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="questionnaires"
    )
    answers = models.JSONField()
    estimated_level = models.DecimalField(max_digits=3, decimal_places=2)
    submitted_at = models.DateTimeField()
    validated_level = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    validated_sigma = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    validated_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "chestionar de nivel"
        verbose_name_plural = "chestionare de nivel"

    def __str__(self) -> str:
        return f"{self.user_id} {self.estimated_level}"


class PlayerStatus(models.TextChoices):
    ACTIVE = "active", "În ligă"
    WITHDRAWN = "withdrawn", "Retras"


class LeaguePlayer(models.Model):
    """A person in the league: adult, validated level, league consent signed (R-006, R-010)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        primary_key=True,
        related_name="league_player",
    )
    status = models.CharField(
        max_length=10, choices=PlayerStatus.choices, default=PlayerStatus.ACTIVE
    )
    joined_at = models.DateTimeField()
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "jucător de ligă"
        verbose_name_plural = "jucători de ligă"

    def __str__(self) -> str:
        return str(self.user_id)


class EventKind(models.TextChoices):
    REGISTER = "register", "Jucător înscris"
    MATCH = "match", "Meci aplicat"
    BONUS = "bonus", "Bonus LP (turneu)"
    DECAY = "decay", "Decay zilnic"
    CANCEL = "cancel", "Meci anulat"


class LeagueEvent(models.Model):
    """Append-only (§6.16). `at` orders the replay: a match counts at its end time."""

    id = models.BigAutoField(primary_key=True)
    season = models.ForeignKey(LeagueSeason, on_delete=models.PROTECT, related_name="events")
    kind = models.CharField(max_length=10, choices=EventKind.choices)
    at = models.DateTimeField()
    ref = models.CharField(max_length=80, help_text="Meciul sau jucătorul la care se referă.")
    payload = models.JSONField(default=dict)
    actor = models.JSONField(default=dict)
    reason = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["at", "id"]
        verbose_name = "eveniment de ligă"
        verbose_name_plural = "evenimente de ligă"
        indexes = [models.Index(fields=["season", "at", "id"])]
        constraints = [
            models.UniqueConstraint(
                fields=["season", "kind", "ref"],
                condition=models.Q(kind__in=["match", "cancel"]),
                name="league_event_match_once",
            )
        ]

    def __str__(self) -> str:
        return f"{self.kind} {self.ref}"


class LeagueSnapshot(models.Model):
    """The engine state after the season's events (a cache: `store.rebuild` recreates it)."""

    season = models.OneToOneField(
        LeagueSeason, on_delete=models.CASCADE, primary_key=True, related_name="snapshot"
    )
    state = models.JSONField()
    last_event_id = models.BigIntegerField(default=0)
    last_at = models.DateTimeField(null=True, blank=True)
    computation = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField()

    class Meta:
        verbose_name = "starea ligii"
        verbose_name_plural = "starea ligii"

    def __str__(self) -> str:
        return f"{self.season_id} #{self.computation}"


class RatingRecord(models.Model):
    """Append-only: the values before and after of one event, for one computation (§6.16)."""

    id = models.BigAutoField(primary_key=True)
    season = models.ForeignKey(LeagueSeason, on_delete=models.PROTECT, related_name="+")
    computation = models.PositiveIntegerField()
    event = models.ForeignKey(LeagueEvent, on_delete=models.PROTECT, related_name="records")
    payload = models.JSONField()
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["id"]
        verbose_name = "calcul de rating"
        verbose_name_plural = "calcule de rating"
        indexes = [models.Index(fields=["season", "computation"])]

    def __str__(self) -> str:
        return f"{self.event_id} #{self.computation}"


class Ladder(models.TextChoices):
    """LG-001."""

    DOUBLES = "doubles", "Dublu"
    SINGLES = "singles", "Simplu"
    PAIRS = "pairs", "Perechi"


class Standing(models.Model):
    """A projection of the engine state for reading (rewritten after every change)."""

    id = models.BigAutoField(primary_key=True)
    season = models.ForeignKey(LeagueSeason, on_delete=models.CASCADE, related_name="standings")
    ladder = models.CharField(max_length=10, choices=Ladder.choices)
    competitor_id = models.CharField(max_length=80)
    player_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    player_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    mu = models.FloatField()
    sigma = models.FloatField()
    level = models.FloatField()
    rank_index = models.PositiveSmallIntegerField(null=True, blank=True)
    tier = models.CharField(max_length=10, blank=True)
    division = models.CharField(max_length=3, blank=True)
    lp = models.PositiveIntegerField(default=0)
    total_lp = models.PositiveIntegerField(default=0)
    placement_left = models.PositiveSmallIntegerField(default=0)
    matches_played = models.PositiveIntegerField(default=0)
    position = models.PositiveIntegerField(null=True, blank=True)
    eligible = models.BooleanField(default=False)
    last_match_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["season", "ladder", "position"]
        verbose_name = "clasament"
        verbose_name_plural = "clasamente"
        constraints = [
            models.UniqueConstraint(
                fields=["season", "ladder", "competitor_id"], name="standing_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.ladder} {self.position} {self.competitor_id}"


# ---------------------------------------------------------------- matches (§6.9)
class MatchStatus(models.TextChoices):
    """LG-090. Before a score is proposed the phase follows the clock (scheduled, in progress,
    score window open); "confirmed by all" and "validated" are passed through in one step and
    kept in the transition log."""

    PROPOSED = "proposed", "Scor propus"
    AWAITING_PAYMENT = "awaiting_payment", "Așteaptă plata"
    APPLIED = "applied", "Aplicat"
    DISPUTED = "disputed", "Disputat"
    EXPIRED = "expired", "Expirat"
    CANCELLED = "cancelled", "Anulat"
    TRAINING = "training", "Convertit în antrenament"


OPEN_STATUSES = (MatchStatus.PROPOSED, MatchStatus.AWAITING_PAYMENT)


class MatchKind(models.TextChoices):
    """§6.14: the matches that count for the league."""

    OFFICIAL = "official", "Oficial de ligă"
    CHALLENGE = "challenge", "Provocare"
    TOURNAMENT = "tournament", "Turneu"


class LeagueMatch(models.Model):
    """A match on a court booking, from the proposed score to its application (§6.9)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    season = models.ForeignKey(LeagueSeason, on_delete=models.PROTECT, related_name="matches")
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="league_matches",
    )
    kind = models.CharField(max_length=12, choices=MatchKind.choices, default=MatchKind.OFFICIAL)
    status = models.CharField(max_length=20, choices=MatchStatus.choices)
    score = models.JSONField()
    finished_at = models.DateTimeField(help_text="Finalul meciului: ordinea în ligă.")
    window_closes_at = models.DateTimeField()
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    proposed_at = models.DateTimeField()
    payment_deadline = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    event = models.OneToOneField(
        LeagueEvent, on_delete=models.PROTECT, null=True, blank=True, related_name="match"
    )
    note = models.CharField(max_length=500, blank=True)
    reopened_until = models.DateTimeField(
        null=True, blank=True, help_text="Adminul a redeschis fereastra: scorul se reintroduce."
    )
    challenge = models.ForeignKey(
        "Challenge", on_delete=models.PROTECT, null=True, blank=True, related_name="matches"
    )
    fixture = models.ForeignKey(
        "Fixture", on_delete=models.PROTECT, null=True, blank=True, related_name="league_matches"
    )

    class Meta:
        ordering = ["-finished_at"]
        verbose_name = "meci de ligă"
        verbose_name_plural = "meciuri de ligă"
        indexes = [models.Index(fields=["status", "window_closes_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["booking"],
                condition=~models.Q(status="cancelled"),
                name="one_live_match_per_booking",
            ),
            models.UniqueConstraint(
                fields=["fixture"],
                condition=~models.Q(status="cancelled"),
                name="one_live_match_per_fixture",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.get_status_display()} {self.finished_at:%Y-%m-%d %H:%M}"

    @property
    def ref(self) -> str:
        """The match's reference in the league's event store."""
        return f"match:{self.pk}"


class Side(models.TextChoices):
    A = "a", "Echipa A"
    B = "b", "Echipa B"


class Response(models.TextChoices):
    PENDING = "pending", "Așteaptă"
    CONFIRMED = "confirmed", "Confirmat"
    DISPUTED = "disputed", "Contestat"


class MatchPlayer(models.Model):
    """LG-094: each player scans the card and confirms (or disputes) the score shown."""

    id = models.BigAutoField(primary_key=True)
    match = models.ForeignKey(LeagueMatch, on_delete=models.PROTECT, related_name="players")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    side = models.CharField(max_length=1, choices=Side.choices)
    response = models.CharField(max_length=10, choices=Response.choices, default=Response.PENDING)
    responded_at = models.DateTimeField(null=True, blank=True)
    device = models.ForeignKey(
        "devices.Device", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )

    class Meta:
        ordering = ["match", "side", "id"]
        verbose_name = "jucător în meci"
        verbose_name_plural = "jucători în meci"
        constraints = [models.UniqueConstraint(fields=["match", "user"], name="match_player_once")]

    def __str__(self) -> str:
        return f"{self.match_id} {self.side} {self.user_id}"


class MatchTransition(models.Model):
    """Append-only (LG-098): every step of a match with the checks made for it."""

    id = models.BigAutoField(primary_key=True)
    match = models.ForeignKey(LeagueMatch, on_delete=models.PROTECT, related_name="transitions")
    status = models.CharField(max_length=20)
    at = models.DateTimeField()
    actor = models.JSONField(default=dict)
    device = models.ForeignKey(
        "devices.Device", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    checks = models.JSONField(default=dict)
    reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "pas al meciului"
        verbose_name_plural = "pașii meciurilor"

    def __str__(self) -> str:
        return f"{self.match_id} {self.status}"


# ---------------------------------------------------------------- challenges (§6.11)
class ChallengeStatus(models.TextChoices):
    PENDING = "pending", "Așteaptă răspunsul"
    ACCEPTED = "accepted", "Acceptată"
    REFUSED = "refused", "Refuzată"
    EXPIRED = "expired", "Expirată"
    PLAYED = "played", "Jucată"
    CANCELLED = "cancelled", "Anulată"


class Challenge(models.Model):
    """LG-110 … LG-113. A player (singles) or a pair (doubles) challenges an opponent at most
    one division above. Issued and answered at the League Kiosk; seen on the website."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    season = models.ForeignKey(LeagueSeason, on_delete=models.PROTECT, related_name="challenges")
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    ladder = models.CharField(max_length=10, choices=Ladder.choices)
    challenger_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    challenger_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    target_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    target_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    challenger_rank = models.PositiveSmallIntegerField()
    target_rank = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=10, choices=ChallengeStatus.choices, default=ChallengeStatus.PENDING
    )
    created_at = models.DateTimeField()
    respond_by = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    play_by = models.DateTimeField(null=True, blank=True)
    refusal_outcome = models.CharField(max_length=15, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "provocare"
        verbose_name_plural = "provocări"
        indexes = [models.Index(fields=["status", "respond_by"])]

    def __str__(self) -> str:
        return f"{self.get_status_display()} {self.created_at:%Y-%m-%d}"

    @property
    def challengers(self) -> list[uuid.UUID]:
        return [self.challenger_a_id, *([self.challenger_b_id] if self.challenger_b_id else [])]

    @property
    def targets(self) -> list[uuid.UUID]:
        return [self.target_a_id, *([self.target_b_id] if self.target_b_id else [])]


class DecayWarning(models.Model):
    """LG-107: a warning sent once, three days before the decay starts."""

    id = models.BigAutoField(primary_key=True)
    season = models.ForeignKey(LeagueSeason, on_delete=models.CASCADE, related_name="+")
    day = models.DateField()
    ladder = models.CharField(max_length=10, choices=Ladder.choices)
    competitor_id = models.CharField(max_length=80)
    sent_at = models.DateTimeField()

    class Meta:
        verbose_name = "avertizare de decay"
        verbose_name_plural = "avertizări de decay"
        constraints = [
            models.UniqueConstraint(
                fields=["season", "day", "ladder", "competitor_id"], name="decay_warning_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.day} {self.ladder} {self.competitor_id}"


# ---------------------------------------------------------------- season end (§6.12, §6.13)
class AwardKind(models.TextChoices):
    KING = "king", "Rege al Junglei (top 3)"
    TIER_TOP = "tier_top", "Top 3 în rang"


class SeasonAward(models.Model):
    """The Hall of Fame (LG-134) and what each winner received (LG-120 … LG-122)."""

    id = models.BigAutoField(primary_key=True)
    season = models.ForeignKey(LeagueSeason, on_delete=models.PROTECT, related_name="awards")
    kind = models.CharField(max_length=10, choices=AwardKind.choices)
    ladder = models.CharField(max_length=10, choices=Ladder.choices)
    tier = models.CharField(max_length=10)
    position = models.PositiveSmallIntegerField(help_text="1–3 în clasamentul final al rangului.")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    competitor_id = models.CharField(max_length=80)
    vouchers = models.JSONField(default=list, blank=True)
    choice = models.CharField(
        max_length=30, blank=True, help_text="Opțiunea aleasă în cont (Q6); gol: încă nealeasă."
    )
    chosen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["season", "kind", "tier", "position"]
        verbose_name = "premiu de sezon"
        verbose_name_plural = "premii de sezon"
        constraints = [
            models.UniqueConstraint(
                fields=["season", "kind", "ladder", "tier", "user"], name="season_award_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.season_id} {self.kind} {self.tier} {self.position}"


class Badge(models.Model):
    """§6.15: badges, private (shown in the player's own account)."""

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="league_badges"
    )
    code = models.CharField(max_length=30)
    key = models.CharField(
        max_length=60, blank=True, help_text="Sezonul, săptămâna sau gol (o dată în viață)."
    )
    season = models.ForeignKey(
        LeagueSeason, on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    awarded_at = models.DateTimeField()
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-awarded_at"]
        verbose_name = "insignă"
        verbose_name_plural = "insigne"
        constraints = [models.UniqueConstraint(fields=["user", "code", "key"], name="badge_once")]

    def __str__(self) -> str:
        return f"{self.code} {self.key}"


class MatchOfTheDay(models.Model):
    """§6.15: the admin's choice for a day (without one, the stake score decides)."""

    id = models.BigAutoField(primary_key=True)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    day = models.DateField()
    booking = models.ForeignKey("bookings.Booking", on_delete=models.PROTECT, related_name="+")
    chosen_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    reason = models.CharField(max_length=250)
    created_at = models.DateTimeField()

    class Meta:
        verbose_name = "meciul zilei"
        verbose_name_plural = "meciurile zilei"
        constraints = [
            models.UniqueConstraint(fields=["location", "day"], name="match_of_the_day_once")
        ]

    def __str__(self) -> str:
        return f"{self.day} {self.booking_id}"


# ---------------------------------------------------------------- tournaments (§6.14)
class TournamentFormat(models.TextChoices):
    KNOCKOUT = "knockout", "Eliminatoriu"
    GROUPS_KNOCKOUT = "groups_knockout", "Grupe + eliminatoriu"
    ROUND_ROBIN = "round_robin", "Fiecare cu fiecare"
    AMERICANO = "americano", "Americano"
    MEXICANO = "mexicano", "Mexicano"
    KING_OF_THE_COURT = "king_of_the_court", "King of the Court"


# Players register alone and change partners every round.
INDIVIDUAL_FORMATS = (TournamentFormat.AMERICANO, TournamentFormat.MEXICANO)


class TournamentStatus(models.TextChoices):
    REGISTRATION = "registration", "Înscrieri deschise"
    IN_PROGRESS = "in_progress", "În desfășurare"
    FINISHED = "finished", "Încheiat"
    CANCELLED = "cancelled", "Anulat"


class Seeding(models.TextChoices):
    RANK = "rank", "După rang (LP)"
    RANDOM = "random", "Tragere la sorți"


class Tournament(models.Model):
    """§6.14: the system makes the draw, the admin puts the matches on courts; the paid
    entry fee is the payment condition of its matches; LP × 1.5 and phase bonuses."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    season = models.ForeignKey(LeagueSeason, on_delete=models.PROTECT, related_name="tournaments")
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    name = models.CharField(max_length=120)
    format = models.CharField(max_length=20, choices=TournamentFormat.choices)
    team_size = models.PositiveSmallIntegerField(help_text="Jucători pe echipă în meci: 1 sau 2.")
    status = models.CharField(
        max_length=15, choices=TournamentStatus.choices, default=TournamentStatus.REGISTRATION
    )
    starts_at = models.DateTimeField()
    registration_closes_at = models.DateTimeField()
    entry_fee = models.PositiveIntegerField(help_text="Taxa de participare, în bani.")
    fee_provisional = models.BooleanField(default=True, help_text="DE_STABILIT (Q21).")
    max_entries = models.PositiveSmallIntegerField()
    seeding = models.CharField(max_length=10, choices=Seeding.choices, default=Seeding.RANK)
    draw_seed = models.CharField(max_length=40, blank=True)
    group_size = models.PositiveSmallIntegerField(default=4)
    advance = models.PositiveSmallIntegerField(default=2, help_text="Calificați din fiecare grupă.")
    rounds = models.PositiveSmallIntegerField(default=5, help_text="Mexicano, King of the Court.")
    phase_bonuses = models.JSONField(default=dict, help_text="LP pe fază, fixate la creare.")
    created_at = models.DateTimeField()
    drawn_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-starts_at"]
        verbose_name = "turneu"
        verbose_name_plural = "turnee"

    def __str__(self) -> str:
        return self.name

    @property
    def individual(self) -> bool:
        return self.format in INDIVIDUAL_FORMATS


class EntryStatus(models.TextChoices):
    REGISTERED = "registered", "Înscris"
    WITHDRAWN = "withdrawn", "Retras"


class TournamentEntry(models.Model):
    """A pair (or a player) in the tournament; its entry fee is a payable item."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.PROTECT, related_name="entries")
    player_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    player_b = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    status = models.CharField(
        max_length=10, choices=EntryStatus.choices, default=EntryStatus.REGISTERED
    )
    seed = models.PositiveSmallIntegerField(null=True, blank=True)
    registered_at = models.DateTimeField()
    position = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Locul final.")
    bonus_lp = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["tournament", "seed", "registered_at"]
        verbose_name = "înscriere la turneu"
        verbose_name_plural = "înscrieri la turnee"

    def __str__(self) -> str:
        return f"{self.tournament_id} {self.seed}"

    @property
    def players(self) -> list[uuid.UUID]:
        return [self.player_a_id, *([self.player_b_id] if self.player_b_id else [])]


class FixtureStatus(models.TextChoices):
    WAITING = "waiting", "Așteaptă echipele"
    READY = "ready", "De jucat"
    FINISHED = "finished", "Terminat, se introduce scorul"
    DONE = "done", "Rezultat înregistrat"
    BYE = "bye", "Calificare directă"


class Fixture(models.Model):
    """One match of the draw. Teams are lists of player ids (partners change in Americano)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.PROTECT, related_name="fixtures")
    phase = models.CharField(max_length=20, help_text="group:A, round, semifinal, final …")
    round = models.PositiveSmallIntegerField()
    slot = models.PositiveSmallIntegerField()
    team_a = models.JSONField(default=list, blank=True)
    team_b = models.JSONField(default=list, blank=True)
    entry_a = models.ForeignKey(
        TournamentEntry, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    entry_b = models.ForeignKey(
        TournamentEntry, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    next_fixture = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    next_side = models.CharField(max_length=1, blank=True)
    booking = models.ForeignKey(
        "bookings.Booking", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    status = models.CharField(
        max_length=10, choices=FixtureStatus.choices, default=FixtureStatus.WAITING
    )
    finished_at = models.DateTimeField(null=True, blank=True)
    winner = models.CharField(max_length=1, blank=True)
    score = models.JSONField(default=dict, blank=True)
    games_a = models.PositiveSmallIntegerField(default=0)
    games_b = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["tournament", "round", "slot"]
        verbose_name = "meci de turneu"
        verbose_name_plural = "meciuri de turneu"
        constraints = [
            models.UniqueConstraint(
                fields=["tournament", "phase", "round", "slot"], name="fixture_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.phase} {self.round}.{self.slot}"
