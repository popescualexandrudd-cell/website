"""Settings for the automated test suite."""

from jungle.settings import *  # noqa: F403

JUNGLE_ENV = "test"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
# Fast hashing in tests only; production hashers are asserted in test_settings.py.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
WEB_BASE_URL = "https://www.example.test"
API_DOCS_ENABLED = True
EMERGENCY_ADMIN_ENABLED = True
