"""Django settings for the Jungle Padel backend.

All environment-specific values come from environment variables (see `.env.example`).
Production (`JUNGLE_ENV=staging|prod`) refuses to start without real secrets.
"""

from __future__ import annotations

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent.parent


def env(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name, default)


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    return default if value is None else int(value)


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


JUNGLE_ENV = env("JUNGLE_ENV", "dev") or "dev"
IS_PRODUCTION_LIKE = JUNGLE_ENV in {"staging", "prod"}


def secret(name: str, dev_default: str) -> str:
    value = env(name)
    if value:
        return value
    if IS_PRODUCTION_LIKE:
        raise ImproperlyConfigured(f"{name} must be set when JUNGLE_ENV={JUNGLE_ENV}")
    return dev_default


DEBUG = env_bool("DJANGO_DEBUG", JUNGLE_ENV == "dev")
SECRET_KEY = secret("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key-change-me-0123456789")
# Key material for encrypting secrets at rest (TOTP secrets). Any long random string.
FIELD_ENCRYPTION_KEY = secret("FIELD_ENCRYPTION_KEY", "dev-only-insecure-field-encryption-key")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "corsheaders",
    "jungle.core",
    "jungle.locations",
    "jungle.accounts",
    "jungle.devices",
    "jungle.audit",
    "jungle.configuration",
    "jungle.legal",
    "jungle.notifications",
    "jungle.waitlist",
    "jungle.pricing",
    "jungle.bookings",
    "jungle.attendance",
    "jungle.ledger",
    "jungle.subscriptions",
    "jungle.rewards",
    "jungle.cafe",
    "jungle.cards",
    "jungle.privacy",
    "jungle.league",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "jungle.core.middleware.RequestIdMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "jungle.urls"
WSGI_APPLICATION = "jungle.wsgi.application"
ASGI_APPLICATION = "jungle.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL", "postgres://jungle:jungle@localhost:5432/jungle") or "",
        conn_max_age=60,
    )
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REDIS_URL = env("REDIS_URL")
CACHES = {
    "default": (
        {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}
        if REDIS_URL
        else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    )
}

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend"]
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
# Password-reset and account-claim links: single use, valid 24 hours.
PASSWORD_RESET_TIMEOUT = 24 * 3600

# Language and time (ADR-0010, ADR-0018)
LANGUAGE_CODE = "ro"
LANGUAGES = [("ro", "Română"), ("en", "English")]
TIME_ZONE = "Europe/Bucharest"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Sessions and CSRF (ADR-0011). Cookies are shared between www.<domain> and api.<domain>.
SESSION_COOKIE_AGE = 14 * 24 * 3600
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = IS_PRODUCTION_LIKE
SESSION_COOKIE_DOMAIN = env("SESSION_COOKIE_DOMAIN")
CSRF_COOKIE_HTTPONLY = False  # the web apps read it to send the X-CSRFToken header
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = IS_PRODUCTION_LIKE
CSRF_COOKIE_DOMAIN = env("CSRF_COOKIE_DOMAIN")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_CREDENTIALS = True

# Security headers (§12.1). TLS is terminated by Caddy (ADR-0015).
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
if IS_PRODUCTION_LIKE:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# Number of trusted reverse proxies in front of the app (for the client IP in audit logs).
TRUSTED_PROXY_COUNT = env_int("TRUSTED_PROXY_COUNT", 1 if IS_PRODUCTION_LIKE else 0)

# Email (adapter = Django email backend; provider still to be chosen, Q24)
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend"
    if JUNGLE_ENV == "dev"
    else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", "localhost")
# Only for the file-based backend (end-to-end tests): where emails are written.
EMAIL_FILE_PATH = env("EMAIL_FILE_PATH")
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
# DE_CONFIRMAT: the real sender address depends on the domain (Q39).
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "Jungle Padel <no-reply@example.invalid>")

# Public website base URL, used in links inside emails.
# Fiscal cash register (R-066): "simulator" until the model is bought (Q23); an adapter per
# model is added then. Receipts from the simulator are marked as such and are not fiscal.
FISCAL_PRINTER = env("FISCAL_PRINTER", "simulator") or "simulator"

# Apple Wallet (R-020, Q24): needs the club's Apple Developer account. Certificates are files
# on the server, referenced here; never in git.
APPLE_WALLET_ENABLED = env_bool("APPLE_WALLET_ENABLED", False)
APPLE_PASS_TYPE_ID = env("APPLE_PASS_TYPE_ID", "") or ""
APPLE_TEAM_ID = env("APPLE_TEAM_ID", "") or ""
APPLE_PASS_CERT_FILE = env("APPLE_PASS_CERT_FILE", "") or ""
APPLE_PASS_KEY_FILE = env("APPLE_PASS_KEY_FILE", "") or ""
APPLE_PASS_KEY_PASSWORD = env("APPLE_PASS_KEY_PASSWORD", "") or ""
APPLE_WWDR_CERT_FILE = env("APPLE_WWDR_CERT_FILE", "") or ""
APPLE_WALLET_WEB_SERVICE_URL = env("APPLE_WALLET_WEB_SERVICE_URL", "") or ""
APPLE_APNS_HOST = env("APPLE_APNS_HOST", "https://api.push.apple.com") or ""

# Google Wallet (R-020, Q24): needs the club's Google Wallet issuer and a service account.
GOOGLE_WALLET_ENABLED = env_bool("GOOGLE_WALLET_ENABLED", False)
GOOGLE_WALLET_ISSUER_ID = env("GOOGLE_WALLET_ISSUER_ID", "") or ""
GOOGLE_WALLET_SERVICE_ACCOUNT_FILE = env("GOOGLE_WALLET_SERVICE_ACCOUNT_FILE", "") or ""

WEB_BASE_URL = (env("WEB_BASE_URL", "http://localhost:3000") or "").rstrip("/")

# Emergency Django admin (§8.6): Admin role + 2FA only.
EMERGENCY_ADMIN_ENABLED = env_bool("EMERGENCY_ADMIN_ENABLED", True)
API_DOCS_ENABLED = env_bool("API_DOCS_ENABLED", not IS_PRODUCTION_LIKE)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
}
