"""A flag or a setting changed (from the panel, the technical admin or a command): the website is
told after the commit (`configuration.web`)."""

from __future__ import annotations

from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from jungle.configuration import web
from jungle.configuration.models import ConfigVersion, FeatureFlag


@receiver(post_save, sender=FeatureFlag, dispatch_uid="configuration.flag_changed")
def flag_changed(sender: type[FeatureFlag], **kwargs: Any) -> None:
    web.revalidate_after_commit([web.FLAGS_TAG])


@receiver(post_save, sender=ConfigVersion, dispatch_uid="configuration.config_published")
def config_published(sender: type[ConfigVersion], **kwargs: Any) -> None:
    web.revalidate_after_commit([web.CONFIG_TAG])
