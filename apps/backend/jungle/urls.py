from django.conf import settings
from django.urls import URLPattern, URLResolver, path

from jungle.api import api

urlpatterns: list[URLPattern | URLResolver] = [path("api/v1/", api.urls)]

if settings.EMERGENCY_ADMIN_ENABLED:
    from jungle.core.admin_site import emergency_admin_site

    urlpatterns.append(path("django-admin/", emergency_admin_site.urls))
