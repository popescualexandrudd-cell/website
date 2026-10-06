"""ADR-0016, Stage 14B: every backup is written down; a failure, a missing backup or a missing
restore test reaches the managers and admins at once (`staff.backup_failed`, once per thing), and
a backup that worked sends the monitoring's heartbeat."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from io import StringIO
from typing import Any

import pytest
from django.core.management import call_command

from jungle.accounts.models import User
from jungle.conftest import grant
from jungle.core.permissions import Role
from jungle.locations.models import Location
from jungle.notifications.models import Notification
from jungle.scheduler import backups, schedule
from jungle.scheduler.models import JobRun

pytestmark = pytest.mark.django_db
NOW = "2027-03-15T09:00:00+02:00"


@pytest.fixture
def manager(location: Location, make_user: Callable[..., User]) -> User:
    user = make_user()
    grant(user, Role.MANAGER, location)
    return user


def alerts() -> list[Notification]:
    return list(Notification.objects.filter(event="staff.backup_failed", channel="email"))


def test_a_failed_backup_is_written_down_and_reaches_the_managers(
    manager: User, time_machine: Any, settings: Any
) -> None:
    time_machine.move_to(NOW, tick=False)
    settings.BACKUP_HEARTBEAT_URL = ""
    run = backups.record("full", False, "P00 ERROR: [049]: unable to open\nrepo1 not reachable\n")
    assert (run.job, run.ok) == ("backup.full", False)
    [message] = alerts()
    assert message.user == manager
    assert message.context["detail"] == "repo1 not reachable"
    assert message.context["when"] == "15.03.2027 09:00"
    backups.record("diff", False, "")  # no output: the kind stands for the detail
    assert [m.context["detail"] for m in alerts()][-1] == "diff"
    with pytest.raises(ValueError, match="unknown backup kind"):
        backups.record("weekly", True, "")


def test_a_backup_that_worked_sends_the_heartbeat(
    manager: User, monkeypatch: pytest.MonkeyPatch, settings: Any
) -> None:
    pings: list[str] = []
    monkeypatch.setattr(backups, "heartbeat", pings.append)
    settings.BACKUP_HEARTBEAT_URL = "https://status.example.test/api/push/b"
    started = datetime.fromisoformat("2027-03-15T02:00:00+02:00")
    run = backups.record("full", True, "backup complete", started_at=started)
    assert run.started_at == started and run.ok and not alerts()
    assert pings == [settings.BACKUP_HEARTBEAT_URL]
    settings.BACKUP_HEARTBEAT_URL = ""
    backups.record("diff", True, "")
    assert len(pings) == 1


def test_the_daily_check_raises_the_alarm_for_what_is_missing(
    manager: User, settings: Any, time_machine: Any
) -> None:
    time_machine.move_to(NOW, tick=False)
    settings.BACKUPS_EXPECTED = False
    assert backups.check() == []  # this server takes no backups (development, tests)
    settings.BACKUPS_EXPECTED = True
    assert backups.check() == ["backup", "restore-test"]
    assert len(alerts()) == 2
    assert backups.check() == ["backup", "restore-test"]  # the same day: not twice
    assert len(alerts()) == 2

    def ran(job: str, when: str) -> None:
        moment = datetime.fromisoformat(when)
        JobRun.objects.create(job=job, started_at=moment, finished_at=moment, ok=True)

    ran("backup.diff", "2027-03-14T08:00:00+02:00")  # 25 hours ago
    ran("backup.restore-test", "2027-02-10T03:00:00+02:00")  # 33 days ago
    assert backups.missing() == []
    time_machine.move_to("2027-03-15T10:30:00+02:00", tick=False)
    assert backups.missing() == ["backup"]  # 26.5 hours
    time_machine.move_to("2027-03-17T09:00:00+02:00", tick=False)
    ran("backup.full", "2027-03-17T02:00:00+02:00")
    assert backups.missing() == ["restore-test"]  # 35 days and 6 hours


def test_the_commands(
    manager: User, monkeypatch: pytest.MonkeyPatch, settings: Any, time_machine: Any
) -> None:
    time_machine.move_to(NOW, tick=False)
    settings.BACKUP_HEARTBEAT_URL = ""
    monkeypatch.setattr("sys.stdin", StringIO("restore: 42 migrations, as live\n"))
    out = StringIO()
    call_command("backup_report", "--kind", "restore-test", "--ok", stdout=out)
    assert out.getvalue().strip() == "backup.restore-test: ok"
    assert JobRun.objects.get().output == "restore: 42 migrations, as live\n"

    class Terminal(StringIO):
        def isatty(self) -> bool:
            return True

    monkeypatch.setattr("sys.stdin", Terminal())
    out = StringIO()
    call_command("backup_report", "--kind", "full", "--failed", stdout=out)
    assert out.getvalue().strip() == "backup.full: EȘUAT" and len(alerts()) == 1

    settings.BACKUPS_EXPECTED = True
    out = StringIO()
    call_command("check_backups", stdout=out)
    assert out.getvalue().strip() == "Backup: lipsă backup."
    JobRun.objects.create(job="backup.full", started_at=datetime.fromisoformat(NOW), ok=True)
    out = StringIO()
    call_command("check_backups", stdout=out)
    assert out.getvalue().strip() == "Backup: totul la zi."
    assert any(job.name == "check_backups" for job in schedule.JOBS)
