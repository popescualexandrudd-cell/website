# The database image (ADR-0016): PostgreSQL 17 with pgBackRest, which archives the transaction
# log (WAL) continuously and takes the backups. Build from the repository root:
#   docker build -f deploy/backup/postgres/Dockerfile -t jungle-db .
# POSTGRES_IMAGE: another base only for a build behind a filtering proxy (its CA inside).
ARG POSTGRES_IMAGE=postgres:17
FROM ${POSTGRES_IMAGE}
# (A base that already has pgBackRest skips the install.)
RUN (command -v pgbackrest || (apt-get update \
        && apt-get install -y --no-install-recommends pgbackrest \
        && rm -rf /var/lib/apt/lists/*)) \
    && mkdir -p /etc/pgbackrest \
    && mkdir -p /var/lib/pgbackrest /var/spool/pgbackrest /var/log/pgbackrest /tmp/pgbackrest \
    && chown -R postgres:postgres /var/lib/pgbackrest /var/spool/pgbackrest /var/log/pgbackrest /tmp/pgbackrest
COPY deploy/backup/postgres/pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
COPY deploy/backup/postgres/restore-check /usr/local/bin/restore-check
# The transaction log goes to the backup at least every 5 minutes (RPO, Q72), even when quiet.
CMD ["postgres", \
     "-c", "wal_level=replica", \
     "-c", "archive_mode=on", \
     "-c", "archive_command=pgbackrest --stanza=jungle archive-push %p", \
     "-c", "archive_timeout=300", \
     "-c", "max_wal_senders=3"]
