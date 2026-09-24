# Backup container: pg_dump + media archive every night, kept 14 days, optionally copied off-site
# with rclone (binary taken from the official rclone image; postgres:16-alpine already has tzdata).
FROM rclone/rclone:1.71 AS rclone

FROM postgres:16-alpine
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
COPY --chmod=755 backup.sh restore.sh schedule.sh /usr/local/bin/
# /media belongs to the app user (uid 1001), whichever container first creates the shared volume.
RUN mkdir -p /backups /media && chown postgres:postgres /backups && chown 1001:1001 /media
USER postgres
WORKDIR /backups
CMD ["schedule.sh"]
