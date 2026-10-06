# Backend image (ADR-0015). Build from the repository root:
#   docker build -f apps/backend/Dockerfile -t jungle-backend .
# PYTHON_IMAGE: another base only for a build behind a filtering proxy (its CA inside).
ARG PYTHON_IMAGE=python:3.13-slim
FROM ${PYTHON_IMAGE} AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
RUN pip install --no-cache-dir uv==0.8.17
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
HEALTHCHECK --interval=30s --timeout=5s CMD ["python", "healthcheck.py"]
CMD ["gunicorn", "jungle.wsgi:application", "--config", "gunicorn.conf.py"]
