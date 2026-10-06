"""The club's scheduled jobs (ADR-0024, replacing Celery Beat from ADR-0006): each is a Django
command that is idempotent and checks time itself (ADR-0006 points 2–4 stay), run by one
scheduler process (`manage.py run_scheduler`, the `scheduler` service in production).

- A job "every N minutes" runs when its last start is N minutes old (or it never ran).
- A daily job runs once per club day (`Europe/Bucharest`), at or after its time: if the server was
  down at that moment, it runs as soon as it is back the same day. No daily job is set between
  03:00 and 04:00, the hour that is skipped in March and repeated in October (ADR-0010).
- Only one scheduler works at a time (a PostgreSQL advisory lock): a second one waits.
- Each run is written down (`JobRun`), kept for 30 days; after a round in which every due job
  worked, a heartbeat goes to the monitoring (`SCHEDULER_HEARTBEAT_URL`, Uptime Kuma, ADR-0017).
"""

from __future__ import annotations

import io
import logging
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.conf import settings
from django.core.management import call_command
from django.db import connection

from jungle.core import clock
from jungle.scheduler.models import JobRun

log = logging.getLogger(__name__)

LOCK_ID = 20270328  # any constant, the same in every scheduler process
KEEP_DAYS = 30
OUTPUT_LIMIT = 4000
SLACK = timedelta(seconds=30)  # a minute's tick may arrive a little early


@dataclass(frozen=True)
class Job:
    name: str
    every_minutes: int | None = None
    at: time | None = None  # club time, once a day
    args: tuple[str, ...] = ()

    @property
    def command(self) -> str:
        return self.name


JOBS: tuple[Job, ...] = (
    Job("send_notifications", every_minutes=1),  # §11: the messages that are due, the retries
    Job("process_no_shows", every_minutes=5),  # R-072, R-073
    Job("expire_league_matches", every_minutes=5),  # LG-095, LG-096, LG-111, LG-112
    Job("league_daily", at=time(0, 5)),  # decay, its warnings, the Match of the day
    Job("purge_waitlist", at=time(2, 30)),  # unconfirmed sign-ups
    Job("notifications_daily", at=time(8, 0)),  # expiring subscriptions, the NPS question
    Job("check_backups", at=time(9, 0)),  # a backup or a restore test missing (ADR-0016)
)


def _local_midnight(moment: datetime) -> datetime:
    day = clock.local(moment).date()
    return datetime.combine(day, time(0), tzinfo=clock.BUSINESS_TZ)


def is_due(job: Job, now: datetime) -> bool:
    last = JobRun.objects.filter(job=job.name).order_by("-started_at").first()
    if job.every_minutes is not None:
        return last is None or now - last.started_at >= timedelta(minutes=job.every_minutes) - SLACK
    if job.at is None:
        raise ValueError(f"job {job.name!r} has neither an interval nor a time")
    if clock.local(now).time() < job.at:
        return False
    return last is None or last.started_at < _local_midnight(now)


def run_job(job: Job, now: datetime, call: Callable[..., object] | None = None) -> JobRun:
    run = JobRun.objects.create(job=job.name, started_at=now)
    out = io.StringIO()
    try:
        (call or call_command)(job.command, *job.args, stdout=out, stderr=out)
    except Exception as error:  # a job's failure must not stop the others
        log.exception("scheduled job %s failed", job.name)
        run.ok = False
        out.write(f"\n{type(error).__name__}: {error}")
    else:
        run.ok = True
    run.finished_at = clock.now()
    run.output = out.getvalue()[-OUTPUT_LIMIT:]
    run.save(update_fields=["ok", "finished_at", "output"])
    return run


def _locked() -> bool:
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_try_advisory_lock(%s)", [LOCK_ID])
        row = cursor.fetchone()
    return bool(row and row[0])


def heartbeat(url: str) -> None:
    try:
        with urllib.request.urlopen(url, timeout=10):  # noqa: S310 (an address from .env)
            pass
    except OSError:
        log.warning("scheduler heartbeat not delivered")


def run_once(now: datetime | None = None, jobs: tuple[Job, ...] = JOBS) -> list[JobRun] | None:
    """One round: every due job, in order. None when another scheduler holds the lock."""
    if not _locked():
        return None
    now = now or clock.now()
    runs = [run_job(job, now) for job in jobs if is_due(job, now)]
    JobRun.objects.filter(started_at__lt=now - timedelta(days=KEEP_DAYS)).delete()
    url = settings.SCHEDULER_HEARTBEAT_URL
    if url and all(run.ok for run in runs):
        heartbeat(url)
    return runs
