"""What the backups report to the club (ADR-0016, Stage 14B). The backups themselves run on the
server, outside Django (deploy/scripts/backup, from systemd timers); after each one the script
tells the backend how it went (`manage.py backup_report`):

- every run is written down like a scheduled job (`JobRun`, `backup.full`, `backup.diff`,
  `backup.restore-test`), so the panel and the monitoring see them;
- a failure goes at once to the managers and admins (`staff.backup_failed`, email and push);
- after a run that worked, a heartbeat goes to the monitoring (`BACKUP_HEARTBEAT_URL`);
- every day `check_backups` (a scheduled job) also raises the alarm when a backup is missing:
  none that worked in the last 26 hours, or no restore test that worked in the last 35 days,
  because a backup that never ran never reports a failure either.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from django.conf import settings

from jungle.core import clock
from jungle.locations.models import Location
from jungle.notifications.services import notify_staff
from jungle.scheduler.models import JobRun
from jungle.scheduler.schedule import OUTPUT_LIMIT, heartbeat

KINDS = ("full", "diff", "restore-test")
BACKUP_EVERY = timedelta(hours=26)
RESTORE_TEST_EVERY = timedelta(days=35)


def _when(moment: datetime) -> str:
    return clock.local(moment).strftime("%d.%m.%Y %H:%M")


def alert(subject: str, when: datetime, detail: str) -> None:
    """To the managers and admins of every location (once per subject and person)."""
    for location_id in Location.objects.values_list("id", flat=True):
        notify_staff(
            location_id,
            "staff.backup_failed",
            {"when": _when(when), "detail": detail[:300]},
            subject=subject,
        )


def record(kind: str, ok: bool, detail: str, started_at: datetime | None = None) -> JobRun:
    if kind not in KINDS:
        raise ValueError(f"unknown backup kind {kind!r}")
    now = clock.now()
    run = JobRun.objects.create(
        job=f"backup.{kind}",
        started_at=started_at or now,
        finished_at=now,
        ok=ok,
        output=detail[-OUTPUT_LIMIT:],
    )
    if not ok:
        last_line = detail.strip().splitlines()[-1] if detail.strip() else kind
        alert(f"backup-run-{run.pk}", run.started_at, last_line)
    elif settings.BACKUP_HEARTBEAT_URL:
        heartbeat(settings.BACKUP_HEARTBEAT_URL)
    return run


def _last_ok(jobs: tuple[str, ...]) -> datetime | None:
    run = JobRun.objects.filter(job__in=jobs, ok=True).order_by("-started_at").first()
    return run.started_at if run else None


def missing(now: datetime | None = None) -> list[str]:
    """What is missing right now ([] when all is well, or when this server takes no backups)."""
    if not settings.BACKUPS_EXPECTED:
        return []
    now = now or clock.now()
    gaps: list[str] = []
    backup = _last_ok(("backup.full", "backup.diff"))
    if backup is None or now - backup > BACKUP_EVERY:
        gaps.append("backup")
    test = _last_ok(("backup.restore-test",))
    if test is None or now - test > RESTORE_TEST_EVERY:
        gaps.append("restore-test")
    return gaps


def check(now: datetime | None = None) -> list[str]:
    """The daily check: an alert for each gap, once per club day."""
    now = now or clock.now()
    gaps = missing(now)
    day = clock.local(now).date().isoformat()
    texts = {
        "backup": "niciun backup reușit în ultimele 26 de ore",
        "restore-test": "niciun test de restaurare reușit în ultimele 35 de zile",
    }
    for gap in gaps:
        alert(f"backup-missing-{gap}-{day}", now, texts[gap])
    return gaps
