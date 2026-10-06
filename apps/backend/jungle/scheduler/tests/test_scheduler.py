"""ADR-0024: the scheduler runs each job when it is due, once per club day for the daily ones
(also after a stop), writes every run down, keeps going when one fails, and tells the monitoring
only when every due job worked."""

from __future__ import annotations

import threading
import urllib.request
from datetime import datetime, time, timedelta
from io import StringIO
from typing import Any

import pytest
from django.core.management import call_command, get_commands

from jungle.scheduler import schedule
from jungle.scheduler.models import JobRun
from jungle.scheduler.schedule import JOBS, Job, is_due, run_job, run_once

pytestmark = pytest.mark.django_db


def at(text: str) -> datetime:
    return datetime.fromisoformat(text)


def ran(job: str, when: str, ok: bool = True) -> JobRun:
    return JobRun.objects.create(job=job, started_at=at(when), finished_at=at(when), ok=ok)


def test_every_job_is_a_real_command_with_one_kind_of_schedule() -> None:
    commands = get_commands()
    for job in JOBS:
        assert job.command in commands, job
        assert (job.every_minutes is None) != (job.at is None), job
        # no daily job in the hour skipped in March and repeated in October (ADR-0010)
        assert job.at is None or not time(3) <= job.at < time(4), job
    assert len({job.name for job in JOBS}) == len(JOBS)


def test_a_periodic_job_runs_when_its_last_start_is_old_enough() -> None:
    job = Job("send_notifications", every_minutes=5)
    now = at("2027-03-15T10:00:00+02:00")
    assert is_due(job, now)  # never ran
    ran("send_notifications", "2027-03-15T09:56:00+02:00")
    assert not is_due(job, now)
    assert is_due(job, now + timedelta(seconds=40))  # a tick a little early still counts


def test_a_daily_job_runs_once_per_club_day_even_after_a_stop() -> None:
    job = Job("league_daily", at=time(0, 5))
    assert not is_due(job, at("2027-03-15T00:04:00+02:00"))
    assert is_due(job, at("2027-03-15T00:05:00+02:00"))
    ran("league_daily", "2027-03-14T00:05:00+02:00")  # yesterday's run
    assert is_due(job, at("2027-03-15T07:30:00+02:00"))  # the server was down at 00:05
    ran("league_daily", "2027-03-15T07:30:00+02:00")
    assert not is_due(job, at("2027-03-15T23:59:00+02:00"))
    # the night the clocks go forward (28.03.2027): the club day starts at 00:00 local
    ran("league_daily", "2027-03-27T00:05:00+02:00")
    assert is_due(job, at("2027-03-28T00:05:00+02:00"))
    with pytest.raises(ValueError, match="neither an interval nor a time"):
        is_due(Job("broken"), at("2027-03-15T10:00:00+02:00"))


def test_a_run_is_written_down_and_a_failure_does_not_stop_the_others() -> None:
    def fine(command: str, *args: Any, stdout: Any, stderr: Any) -> None:
        stdout.write("Trimise: 3.")

    def broken(command: str, *args: Any, stdout: Any, stderr: Any) -> None:
        raise RuntimeError("no database")

    now = at("2027-03-15T10:00:00+02:00")
    good = run_job(Job("a", every_minutes=1), now, call=fine)
    bad = run_job(Job("b", every_minutes=1), now, call=broken)
    assert (good.ok, good.output, good.finished_at is not None) == (True, "Trimise: 3.", True)
    assert bad.ok is False and "RuntimeError: no database" in bad.output
    assert str(good).endswith("ok") and str(bad).endswith("eșuat")
    assert str(JobRun(job="c", started_at=now)).endswith("…")


def test_a_round_runs_the_due_jobs_cleans_up_and_sends_the_heartbeat(
    monkeypatch: pytest.MonkeyPatch, settings: Any
) -> None:
    called: list[str] = []
    pings: list[str] = []
    monkeypatch.setattr(
        schedule, "call_command", lambda name, *a, stdout, stderr: called.append(name)
    )
    monkeypatch.setattr(schedule, "heartbeat", pings.append)
    settings.SCHEDULER_HEARTBEAT_URL = "https://status.example.test/api/push/x"
    old = ran("send_notifications", "2027-01-01T10:00:00+02:00")
    now = at("2027-03-15T10:00:00+02:00")
    jobs = (Job("send_notifications", every_minutes=1), Job("league_daily", at=time(0, 5)))
    runs = run_once(now, jobs)
    assert runs is not None and [r.job for r in runs] == ["send_notifications", "league_daily"]
    assert called == ["send_notifications", "league_daily"]
    assert not JobRun.objects.filter(pk=old.pk).exists()  # older than 30 days
    assert pings == [settings.SCHEDULER_HEARTBEAT_URL]
    assert run_once(now + timedelta(seconds=10), jobs) == []  # nothing due yet
    assert len(pings) == 2

    def broken(name: str, *a: Any, stdout: Any, stderr: Any) -> None:
        raise RuntimeError("down")

    monkeypatch.setattr(schedule, "call_command", broken)
    assert [r.ok for r in run_once(now + timedelta(minutes=1), jobs) or []] == [False]
    assert len(pings) == 2  # no heartbeat after a failure: the monitoring raises the alert
    settings.SCHEDULER_HEARTBEAT_URL = ""
    monkeypatch.setattr(schedule, "call_command", lambda name, *a, stdout, stderr: None)
    run_once(now + timedelta(minutes=2), jobs)
    assert len(pings) == 2


def test_only_one_scheduler_works_at_a_time(monkeypatch: pytest.MonkeyPatch) -> None:
    assert schedule._locked()  # the lock can be taken (again) by this connection
    monkeypatch.setattr(schedule, "_locked", lambda: False)
    assert run_once(at("2027-03-15T10:00:00+02:00")) is None
    out = StringIO()
    call_command("run_scheduler", "--once", stdout=out)
    assert "Alt planificator rulează deja" in out.getvalue()


def test_the_heartbeat_never_breaks_a_round(monkeypatch: pytest.MonkeyPatch) -> None:
    opened: list[str] = []

    class Answer:
        def __enter__(self) -> Answer:
            return self

        def __exit__(self, *exc: object) -> None:
            return None

    def urlopen(url: str, timeout: int) -> Answer:
        opened.append(url)
        if "down" in url:
            raise OSError("unreachable")
        return Answer()

    monkeypatch.setattr(urllib.request, "urlopen", urlopen)
    schedule.heartbeat("https://status.example.test/up")
    schedule.heartbeat("https://status.example.test/down")
    assert opened == ["https://status.example.test/up", "https://status.example.test/down"]


def test_the_command_runs_one_round(monkeypatch: pytest.MonkeyPatch, time_machine: Any) -> None:
    time_machine.move_to("2027-03-15T10:00:00+02:00", tick=False)
    monkeypatch.setattr(schedule, "JOBS", (Job("purge_waitlist", every_minutes=1),))
    monkeypatch.setattr(schedule, "run_once", lambda: run_once(jobs=schedule.JOBS))
    from jungle.scheduler.management.commands import run_scheduler

    monkeypatch.setattr(run_scheduler, "run_once", lambda: run_once(jobs=schedule.JOBS))
    out = StringIO()
    call_command("run_scheduler", "--once", stdout=out)
    assert out.getvalue().strip() == "purge_waitlist: ok"
    assert JobRun.objects.get().ok is True


def test_the_command_keeps_going_every_minute_until_it_is_stopped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from jungle.scheduler.management.commands import run_scheduler

    rounds: list[int] = []
    waits: list[float] = []

    class Event:
        def set(self) -> None:
            return None

        def wait(self, pause: float) -> bool:
            waits.append(pause)
            return len(waits) == 2  # stopped (SIGTERM) during the second pause

    def one_round() -> list[JobRun]:
        rounds.append(1)
        return []

    monkeypatch.setattr(threading, "Event", Event)
    monkeypatch.setattr(run_scheduler, "run_once", one_round)
    call_command("run_scheduler", stdout=StringIO())
    assert len(rounds) == 2 and all(0 < pause <= 60 for pause in waits)


def test_every_job_has_a_name_in_the_panel() -> None:
    """The panel's system status lists every job and backup by a name people read (RO and EN)."""
    import json

    from django.conf import settings

    from jungle.scheduler.backups import KINDS

    for language in ("ro", "en"):
        catalogue = settings.REPO_ROOT / "packages" / "i18n" / "messages" / f"{language}.json"
        names = json.loads(catalogue.read_text())["admin"]["system"]["jobNames"]
        expected = {job.name for job in JOBS} | {f"backup_{kind}" for kind in KINDS}
        assert set(names) == expected, language
