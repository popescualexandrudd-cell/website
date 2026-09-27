# Backend image (ADR-0015). Build from the repository root:
#   docker build -f apps/backend/Dockerfile -t jungle-backend .
FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv
WORKDIR /app

# Dependencies first (cached layer)
COPY pyproject.toml uv.lock .python-version ./
COPY apps/backend/pyproject.toml apps/backend/pyproject.toml
COPY packages/league-engine/pyproject.toml packages/league-engine/pyproject.toml
RUN uv sync --frozen --no-dev --package jungle-backend --no-install-workspace

# The league engine (ADR-0008) is a workspace package: installed from its source.
COPY packages/league-engine packages/league-engine
RUN uv sync --frozen --no-dev --package jungle-backend --no-editable

COPY apps/backend apps/backend
RUN useradd --system --uid 10001 jungle && mkdir -p /app/apps/backend/staticfiles \
    && chown -R jungle /app/apps/backend/staticfiles
USER jungle
WORKDIR /app/apps/backend
ENV PATH="/app/.venv/bin:$PATH" DJANGO_SETTINGS_MODULE=jungle.settings
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').status==200 else 1)"
CMD ["gunicorn", "jungle.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
