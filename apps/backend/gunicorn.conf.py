"""The backend's web server in production (ADR-0015): as many workers as the server can carry.

Workers: 2 × the processor cores + 1 (gunicorn's own advice), each with a few threads, so a
slow answer never holds the others. On the server both can be changed in /etc/jungle/prod.env:
GUNICORN_WORKERS (workers) and GUNICORN_THREADS.
"""

import multiprocessing
import os

bind = "0.0.0.0:8000"
workers = int(os.environ.get("GUNICORN_WORKERS") or multiprocessing.cpu_count() * 2 + 1)
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS") or 4)
accesslog = "-"
